// LOCAL-ONLY test. Never point this smoke scenario at Production.
import assert from 'node:assert/strict';

const ORIGIN='http://127.0.0.1:8787';
const PLAYERS_PER_ROOM=30;
const ROOM_MODES=['online','offline'];

function localOnly(origin){
  const url=new URL(origin);
  if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname))
    throw new Error('DESTRUCTIVE SIMULATION BLOCKED: use an HTTP localhost Worker only');
  return url.origin;
}

async function api(origin,path,{method='GET',body,token}={}){
  const response=await fetch(origin+path,{
    method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)
  });
  let value={};try{value=await response.json()}catch{}
  assert.ok(response.ok,'HTTP '+response.status+' '+method+' '+path+': '+String(value?.error||value?.message||'unknown'));
  return value;
}

function socketURL(origin,roomCode,participantId){
  const u=new URL(origin);
  return 'ws://'+u.host+'/ws/'+encodeURIComponent(roomCode)+'?participantId='+encodeURIComponent(participantId);
}

async function openMemberSocket(origin,roomCode,participantId){
  if(typeof WebSocket!=='function')throw new Error('Node WebSocket API is required for the realtime integration smoke');
  const socket=new WebSocket(socketURL(origin,roomCode,participantId));
  try{
    await new Promise((resolve,reject)=>{
      const clock=setTimeout(()=>reject(new Error('WebSocket open timeout')),20000);
      socket.addEventListener('open',()=>{clearTimeout(clock);resolve()},{once:true});
      socket.addEventListener('error',()=>{clearTimeout(clock);reject(new Error('WebSocket handshake failed'))},{once:true});
    });
    await new Promise((resolve,reject)=>{
      const clock=setTimeout(()=>reject(new Error('WebSocket heartbeat timeout')),20000);
      const onMessage=event=>{
        let data;try{data=JSON.parse(String(event.data||''))}catch{return}
        if(data.type==='pong'){clearTimeout(clock);socket.removeEventListener('message',onMessage);resolve()}
      };
      socket.addEventListener('message',onMessage);
      socket.send(JSON.stringify({type:'ping',at:Date.now()}));
    });
    return socket;
  }catch(e){socket.close();throw e}
}

export async function runLocalRoomLoad(origin=ORIGIN){
  const base=localOnly(origin),start=performance.now(),sockets=[],rooms=[];
  try{
    const health=await api(base,'/api/health');
    assert.equal(health.project,'GMWW-V2.00');
    for(const mode of ROOM_MODES){
      const created=await api(base,'/api/rooms',{method:'POST',body:{roomName:'CI '+mode+' 30',roomMode:mode,seatCount:30,enabled:true}});
      assert.ok(created.gmToken&&created.roomCode,'GM must receive room token and code');
      const people=[];
      for(let index=1;index<=PLAYERS_PER_ROOM;index+=10){
        const batch=Array.from({length:Math.min(10,PLAYERS_PER_ROOM-index+1)},(_,offset)=>{
          const n=index+offset,part=String(n).padStart(2,'0'),loginId='ci'+mode.slice(0,3)+part;
          return api(base,'/api/members/register',{method:'POST',body:{
            loginId,displayName:'CI '+mode+' '+part,gameCharacterId:'character-'+part
          }}).then(row=>({loginId,token:row.token,participantId:'member:'+loginId}));
        });
        people.push(...await Promise.all(batch));
      }
      assert.equal(people.length,PLAYERS_PER_ROOM);
      assert.ok(people.every(p=>typeof p.token==='string'&&p.token.length>8),'each player must receive a session');
      for(let i=0;i<people.length;i+=10)await Promise.all(people.slice(i,i+10).map(p=>
        api(base,'/api/rooms/'+created.roomCode+'/join',{method:'POST',body:{token:p.token}})
      ));
      const view=await api(base,'/api/rooms/'+created.roomCode);
      assert.equal(view.players.length,PLAYERS_PER_ROOM,mode+' room must retain all members');
      assert.equal(new Set(view.players.map(p=>p.participantId)).size,PLAYERS_PER_ROOM);
      assert.equal(view.room.roomMode,mode);
      rooms.push({mode,code:created.roomCode,gmToken:created.gmToken,people});
    }
    for(const room of rooms){
      for(let start=0;start<room.people.length;start+=10){
        const opened=await Promise.all(room.people.slice(start,start+10).map(p=>openMemberSocket(base,room.code,p.participantId)));
        sockets.push(...opened);
      }
      const view=await api(base,'/api/rooms/'+room.code);
      assert.equal(view.players.length,PLAYERS_PER_ROOM);
      assert.equal(view.connections,PLAYERS_PER_ROOM,room.mode+' must maintain 30 concurrent live sockets');
    }
    for(const room of rooms){
      await api(base,'/api/gm/rooms/'+room.code+'/reset',{method:'POST',token:room.gmToken,body:{
        forceEnd:true,postGame:false,preserveParticipants:false,transactionId:'ci-reset-'+room.mode
      }});
      const cleared=await api(base,'/api/rooms/'+room.code);
      assert.equal(cleared.players.length,0,room.mode+' force reset must evacuate all members');
    }
    const elapsedMs=Math.round(performance.now()-start);
    const result={ok:true,rooms:rooms.length,participants:rooms.length*PLAYERS_PER_ROOM,sockets:sockets.length,elapsedMs};
    console.log('GMWW LOCAL 30-PLAYER GATE: PASS',JSON.stringify(result));
    return result;
  }finally{
    for(const socket of sockets)try{socket.close()}catch{}
  }
}

if(process.argv.includes('--run')){
  runLocalRoomLoad()
    .catch(err=>{console.error('GMWW LOCAL 30-PLAYER GATE: FAIL:',err.message);process.exitCode=1});
}
