// Isolated, local-only two-player Online chat and WebSocket reconnect acceptance.
// Never point this test at Production, even accidentally.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const publicUrl=process.env.GMWW_TEST_URL;
const upstreamUrl=process.env.GMWW_WORKER_URL;
assert.ok(publicUrl&&upstreamUrl,'Explicit isolated local Pages and Worker URLs required');
for(const raw of [publicUrl,upstreamUrl]){
  const u=new URL(raw);
  assert.equal(u.protocol,'http:','Only local HTTP development is permitted');
  assert.ok(['127.0.0.1','localhost'].includes(u.hostname),'Production or remote hostname forbidden');
}
assert.notEqual(publicUrl,upstreamUrl,'Must exercise Pages gateway, not direct Worker');
assert.equal(typeof WebSocket,'function','Node.js 22+ native WebSocket required');

const unique='ci'+Date.now().toString(36).slice(-7)+Math.random().toString(36).slice(2,5);
const sockets=[];
const mark='chat-e2e-'+unique;
const pause=ms=>new Promise(r=>setTimeout(r,ms));

async function api(base,path,{method='GET',body,token,allowError=false}={}){
  const res=await fetch(base+path,{method,headers:{
    ...(body===undefined?{}:{'content-type':'application/json'}),
    ...(token?{authorization:'Bearer '+token}:{})
  },body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  let data=await res.json().catch(()=>null);
  if(!allowError)assert.ok(res.ok&&data?.ok,method+' '+path+' HTTP '+res.status+': '+String(data?.error||'unexpected response'));
  return {status:res.status,data};
}
async function eventually(fn,label,ms=7500){
  const deadline=Date.now()+ms;let last;
  do{try{const r=await fn();if(r)return r}catch(e){last=e}await pause(75)}while(Date.now()<deadline);
  throw Error('Timeout '+label+(last?': '+String(last.message):''));
}
function openSocket(code,participantId){
  const url=new URL(publicUrl);
  url.protocol='ws:';url.pathname='/ws/'+code;url.searchParams.set('participantId',participantId);
  const socket=new WebSocket(url.toString());
  const messages=[];let closed=false;
  socket.addEventListener('message',e=>{try{messages.push(JSON.parse(String(e.data)))}catch{}});
  socket.addEventListener('close',()=>{closed=true});
  sockets.push(socket);
  return {socket,messages,has:(type)=>messages.some(m=>m.type===type),closed:()=>closed};
}
async function waitOpen(c){
  await eventually(()=>c.socket.readyState===WebSocket.OPEN||c.socket.readyState===WebSocket.CLOSED&&(()=>{throw Error('Socket closed during handshake')})(),'open WebSocket');
  await eventually(()=>c.has('room_state'),'room_state after handshake');
}
const playerSource=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
assert.match(playerSource,/new WebSocket\(proto\+'\/\/'\+location\.host\+'\/ws\//,'Player Web must connect on current hostname');
assert.match(playerSource,/socket\.onclose=e=>[\s\S]*?setTimeout\(connectWS,1800\)/,'Player Web must reconnect after socket close');
assert.match(playerSource,/d\.type==='chat_tick'[\s\S]*?gmwwChatRefresh\(\)/,'Chat tick must trigger authenticated refresh');

let code,gmToken;
try{
  const health=await api(publicUrl,'/api/health');
  const workerHealth=await api(upstreamUrl,'/api/health');
  assert.equal(health.data.service,'GMWW Online');
  assert.equal(health.data.version,workerHealth.data.version,'Pages and Worker must share runtime');
  const root=await fetch(publicUrl+'/',{redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(root.status,200,'Pages home must not redirect');
  assert.equal(root.headers.has('location'),false,'No redirect to workers.dev');

  const room=(await api(publicUrl,'/api/rooms',{method:'POST',body:{roomName:'Local Pages Chat '+unique}})).data;
  code=room.roomCode;gmToken=room.gmToken;
  assert.match(code,/^[A-Z2-9]{6}$/);
  assert.ok(room.joinUrl.startsWith(publicUrl),'Join link must keep Pages origin');
  assert.ok(room.websocketUrl.startsWith('ws://127.0.0.1:8788/'),'WS link must keep Pages origin');

  const people=[];
  for(const who of ['a','b']){
    const loginId=unique+who;
    await api(publicUrl,'/api/members/register',{method:'POST',body:{loginId,displayName:'CI Player '+who.toUpperCase(),gameCharacterId:who==='a'?'character-01':'character-02'}});
    const signed=(await api(publicUrl,'/api/members/login',{method:'POST',body:{loginId}})).data;
    assert.ok(signed.token);
    const joined=(await api(publicUrl,'/api/rooms/'+code+'/join',{method:'POST',body:{token:signed.token}})).data;
    assert.equal(joined.player.participantId,'member:'+loginId);
    people.push({loginId,token:signed.token,participantId:joined.player.participantId});
  }
  const [alice,bob]=people;
  const wsA=openSocket(code,alice.participantId);
  const wsB=openSocket(code,bob.participantId);
  await Promise.all([waitOpen(wsA),waitOpen(wsB)]);
  wsA.socket.send(JSON.stringify({type:'ping',at:Date.now()}));
  await eventually(()=>wsA.has('pong'),'pong from DO');

  const first='A '+mark;
  const firstSend=(await api(publicUrl,'/api/rooms/'+code+'/chat',{method:'POST',token:alice.token,body:{channel:'room',text:first}})).data;
  assert.ok(firstSend.id);
  await Promise.all([eventually(()=>wsA.has('chat_tick'),'sender chat tick'),eventually(()=>wsB.has('chat_tick'),'receiver chat tick')]);
  assert.ok(!JSON.stringify(wsB.messages).includes(first),'Private chat content must never appear in WS payload');
  const readB=(await api(publicUrl,'/api/rooms/'+code+'/chat?channel=room',{token:bob.token})).data;
  assert.equal(readB.canSend,true);
  assert.equal(readB.messages.filter(m=>m.text===first).length,1,'Receiver must see exactly one first message');
  assert.equal(readB.messages.find(m=>m.text===first).senderId,alice.loginId);

  // Simulate a transport disconnect and a brand-new WebSocket without leaving room.
  wsA.socket.close(4001,'ci-reconnect');
  await eventually(wsA.closed,'transport close');
  const connectedAgain=openSocket(code,alice.participantId);
  await waitOpen(connectedAgain);
  connectedAgain.socket.send(JSON.stringify({type:'ping',at:Date.now()}));
  await eventually(()=>connectedAgain.has('pong'),'pong after reconnect');
  const me=(await api(publicUrl,'/api/rooms/'+code+'/me',{token:alice.token})).data;
  assert.equal(me.room.code,code,'Reconnect must preserve room and authenticated identity');
  assert.equal(me.player.participantId,alice.participantId);

  const second='B '+mark;
  await pause(950);
  await api(publicUrl,'/api/rooms/'+code+'/chat',{method:'POST',token:bob.token,body:{channel:'room',text:second}});
  await eventually(()=>connectedAgain.messages.some(m=>m.type==='chat_tick'),'reconnected receiver chat tick');
  const readA=(await api(publicUrl,'/api/rooms/'+code+'/chat?channel=room',{token:alice.token})).data;
  assert.equal(readA.messages.filter(m=>m.text===second).length,1,'Reconnected player must receive new message exactly once');
  assert.equal(readA.messages.filter(m=>m.text===first).length,1,'Reconnect must not lose prior chat history');
  const publicRoom=(await api(publicUrl,'/api/rooms/'+code)).data;
  assert.ok(!JSON.stringify(publicRoom).includes(mark),'Public room DTO must not leak chat contents');
  const unauth=await api(publicUrl,'/api/rooms/'+code+'/chat?channel=room',{allowError:true});
  assert.ok(unauth.status===401||unauth.status===403,'Chat requires member authentication');
  console.log('PASS: local Pages gateway HTML/API, two logged-in players, WebSocket ticks, chat privacy, reconnect, history and authorization');
}catch(e){
  console.error('FAIL Pages Online E2E: '+String(e.stack||e));
  process.exitCode=1;
}finally{
  for(const x of sockets){try{x.socket.close()}catch{}}
  if(code&&gmToken)await api(publicUrl,'/api/gm/rooms/'+code+'/delete',{method:'POST',token:gmToken,allowError:true}).catch(()=>null);
}
