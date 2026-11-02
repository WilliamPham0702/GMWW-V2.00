/**
 * Cloudflare B only: disposable synthetic login, session, room, chat and WebSocket probe.
 * No production imports, credentials, room/user data, routing or failover.
 */
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gmww-environment':'b-staging-synthetic'};
const HOST=/^gmww-b-staging-synthetic\.[a-z0-9-]+\.workers\.dev$/;
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TTL=15*60*1000;
const now=()=>Date.now();
const response=(body,status=200)=>new Response(JSON.stringify({environment:'cloudflare-b',syntheticOnly:true,productionSwitchAllowed:false,...body}),{status,headers:HEADERS});
const deny=(error,status=403)=>response({ok:false,error},status);
const makeToken=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const roomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>ALPHABET[b%ALPHABET.length]).join('');
function parseToken(req){const auth=req.headers.get('authorization')||'';return /^Bearer syn_[a-f0-9]{64}$/.test(auth)?auth.slice(7):null;}
async function parse(req){const text=await req.text();if(text.length>4096)throw Error('PAYLOAD_TOO_LARGE');const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_JSON');return body;}
const inRoom=(room,token)=>!!room&&room.members.includes(token);
const validMessage=x=>typeof x==='string'&&x.length>=1&&x.length<=160&&/^[^\u0000-\u001f]*$/.test(x);
function sessionOf(state,req){const token=parseToken(req),record=token&&state.sessions[token];return record&&record.expires>now()?{token,...record}:null;}
function upgrade(req){return (req.headers.get('upgrade')||'').toLowerCase()==='websocket';}
export class Stage3SyntheticState {
  constructor(state){this.state=state;}
  async load(){return (await this.state.storage.get('gmww-b-stage3'))||{sessions:{},rooms:{},tickets:{}};}
  async save(data){await this.state.storage.put('gmww-b-stage3',data);}
  async fetch(request){
    const url=new URL(request.url),path=url.pathname;
    if(path==='/qa/ws'){
      if(!upgrade(request))return deny('WEBSOCKET_UPGRADE_REQUIRED',426);
      const state=await this.load(),ticket=url.searchParams.get('ticket'),entry=ticket&&state.tickets[ticket];
      if(!entry||entry.expires<=now()||!state.sessions[entry.token]||state.sessions[entry.token].expires<=now()||
          !inRoom(state.rooms[entry.room],entry.token))return deny('INVALID_OR_EXPIRED_TICKET',401);
      delete state.tickets[ticket];await this.save(state);
      const sockets=new WebSocketPair();const [client,server]=Object.values(sockets);
      this.state.acceptWebSocket(server);
      server.serializeAttachment({token:entry.token,room:entry.room});
      return new Response(null,{status:101,webSocket:client});
    }
    if(path==='/qa/login'&&request.method==='POST'){
      let body;try{body=await parse(request)}catch{return deny('INVALID_SYNTHETIC_BODY',400);}
      if(body.fixtureOnly!==true||!['gm','player'].includes(body.persona))return deny('SYNTHETIC_PERSONA_ONLY',400);
      const state=await this.load();
      if(Object.keys(state.sessions).length>=64)return deny('FIXTURE_CAP_REACHED',429);
      const token='syn_'+makeToken();
      state.sessions[token]={persona:body.persona,expires:now()+TTL};
      await this.save(state);return response({ok:true,persona:body.persona,token,expiresInSeconds:TTL/1000});
    }
    const state=await this.load(),session=sessionOf(state,request);
    if(!session)return deny('SESSION_REQUIRED',401);
    if(path==='/qa/reset'&&request.method==='POST'){
      if(session.persona!=='gm')return deny('GM_FIXTURE_ONLY');
      let body;try{body=await parse(request)}catch{return deny('INVALID_SYNTHETIC_BODY',400);}
      if(body.fixtureOnly!==true)return deny('SYNTHETIC_ONLY',400);
      await this.save({sessions:{},rooms:{},tickets:{}});
      return response({ok:true,syntheticStateCleared:true});
    }
    if(path==='/qa/rooms'&&request.method==='POST'){
      if(session.persona!=='gm')return deny('GM_FIXTURE_ONLY');
      if(Object.keys(state.rooms).length>=24)return deny('ROOM_FIXTURE_CAP_REACHED',429);
      let code;do{code=roomCode()}while(state.rooms[code]);
      state.rooms[code]={owner:session.token,members:[session.token],messages:[]};
      await this.save(state);return response({ok:true,roomCode:code},201);
    }
    if(path==='/qa/join'&&request.method==='POST'){
      let body;try{body=await parse(request)}catch{return deny('INVALID_SYNTHETIC_BODY',400);}
      const room=state.rooms[body.roomCode];
      if(!room)return deny('UNKNOWN_SYNTHETIC_ROOM',404);
      if(!room.members.includes(session.token)){
        if(room.members.length>=8)return deny('FIXTURE_ROOM_FULL',429);
        room.members.push(session.token);await this.save(state);
      }
      return response({ok:true,roomCode:body.roomCode});
    }
    if(path==='/qa/chat'&&request.method==='POST'){
      let body;try{body=await parse(request)}catch{return deny('INVALID_SYNTHETIC_BODY',400);}
      const room=state.rooms[body.roomCode];
      if(!inRoom(room,session.token))return deny('ROOM_MEMBER_REQUIRED',403);
      if(!validMessage(body.message))return deny('INVALID_SYNTHETIC_MESSAGE',400);
      const item={type:'chat',persona:session.persona,message:body.message,at:now()};
      room.messages.push(item);room.messages=room.messages.slice(-30);
      await this.save(state);return response({ok:true,item});
    }
    if(path==='/qa/messages'&&request.method==='GET'){
      const code=url.searchParams.get('roomCode'),room=state.rooms[code];
      if(!inRoom(room,session.token))return deny('ROOM_MEMBER_REQUIRED');
      return response({ok:true,roomCode:code,messages:room.messages});
    }
    if(path==='/qa/ws-ticket'&&request.method==='POST'){
      let body;try{body=await parse(request)}catch{return deny('INVALID_SYNTHETIC_BODY',400);}
      if(!inRoom(state.rooms[body.roomCode],session.token))return deny('ROOM_MEMBER_REQUIRED');
      const ticket=makeToken();state.tickets[ticket]={token:session.token,room:body.roomCode,expires:now()+30000};
      await this.save(state);return response({ok:true,ticket,expiresInSeconds:30});
    }
    return deny('SYNTHETIC_ROUTE_ONLY',404);
  }
  async webSocketMessage(ws,message){
    const attach=ws.deserializeAttachment();
    const state=await this.load(),room=state.rooms[attach?.room];
    if(!attach||!state.sessions[attach.token]||state.sessions[attach.token].expires<=now()||!inRoom(room,attach.token)){
      ws.close(1008,'SYNTHETIC_SESSION_REQUIRED');return;
    }
    let payload;try{payload=JSON.parse(String(message))}catch{ws.send(JSON.stringify({ok:false,error:'INVALID_JSON'}));return;}
    if(payload.type==='ping'){ws.send(JSON.stringify({type:'pong',syntheticOnly:true}));return;}
    if(payload.type!=='chat'||!validMessage(payload.message)){ws.send(JSON.stringify({ok:false,error:'INVALID_SYNTHETIC_MESSAGE'}));return;}
    const item={type:'chat',persona:state.sessions[attach.token].persona,message:payload.message,at:now()};
    room.messages.push(item);room.messages=room.messages.slice(-30);await this.save(state);
    for(const socket of this.state.getWebSockets()){
      if(socket.deserializeAttachment()?.room===attach.room)socket.send(JSON.stringify(item));
    }
  }
}
export async function handleBStage3(request,env){
  const url=new URL(request.url);
  if(!HOST.test(url.hostname))return deny('STAGING_HOST_REQUIRED');
  if(!url.pathname.startsWith('/qa/'))return deny('SYNTHETIC_ROUTE_ONLY',404);
  if(!env?.STAGE3_SYNTHETIC_ROOM||typeof env.GMWW_B_SYNTHETIC_ADMIN_KEY!=='string'||
      env.GMWW_B_SYNTHETIC_ADMIN_KEY.length<32)return deny('STAGING_TEST_KEY_NOT_CONFIGURED',503);
  if(url.pathname!=='/qa/ws'&&request.headers.get('x-gmww-b-fixture-key')!==env.GMWW_B_SYNTHETIC_ADMIN_KEY)
    return deny('STAGING_FIXTURE_KEY_REQUIRED',401);
  const id=env.STAGE3_SYNTHETIC_ROOM.idFromName('gmww-b-stage3-only');
  return env.STAGE3_SYNTHETIC_ROOM.get(id).fetch(request);
}
