import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{Stage3SyntheticState} from './b-staging-worker.mjs';
const BASE='https://gmww-b-staging-synthetic.synthetic-b.workers.dev';
const KEY='B-STAGE3-ONLY-FAKE-TEST-KEY-0123456789-VALID';
function setup(){
 const memory=new Map(),sockets=[];
 const state={
   storage:{get:async key=>memory.get(key),put:async (key,value)=>memory.set(key,value)},
   acceptWebSocket:socket=>sockets.push(socket),
   getWebSockets:()=>sockets
 };
 let object=new Stage3SyntheticState(state);
 const env={GMWW_B_SYNTHETIC_ADMIN_KEY:KEY,STAGE3_SYNTHETIC_ROOM:{
   idFromName:name=>name,get:()=>({fetch:req=>object.fetch(req)})}};
 async function api(path,{method='GET',body,token,key=KEY,host=BASE,headers={}}={}){
   const h={...headers};
   if(key!==null)h['x-gmww-b-fixture-key']=key;
   if(token)h.authorization='Bearer '+token;
   if(body!==undefined)h['content-type']='application/json';
   return worker.fetch(new Request(host+path,{
     method,headers:h,body:body===undefined?undefined:JSON.stringify(body)
   }),env);
 }
 const post=(path,body,token)=>api(path,{method:'POST',body,token});
 return {api,post,env,memory,sockets,state,object,replaceObject:()=>{object=new Stage3SyntheticState(state);}};
}
test('Cloudflare B fixture stays separated from A, refuses missing/invalid test key',async()=>{
 const {api,post,env}=setup();
 const health=await api('/health',{key:null});
 assert.equal(health.status,200);
 const healthData=await health.json();
 assert.equal(healthData.productionSwitchAllowed,false);
 assert.equal(healthData.productionDataConnected,false);
 assert.equal(healthData.loginSessionVerified,false);
 assert.equal((await api('/qa/login',{method:'POST',key:null,body:{fixtureOnly:true,persona:'gm'}})).status,401);
 assert.equal((await api('/qa/login',{method:'POST',key:'incorrect',body:{fixtureOnly:true,persona:'gm'}})).status,401);
 assert.equal((await api('/qa/login',{method:'POST',host:'https://gmww-v2-00.williampham0702.workers.dev',body:{fixtureOnly:true,persona:'gm'}})).status,403);
 assert.equal((await post('/qa/login',{fixtureOnly:false,persona:'gm'})).status,400);
 const disabled={...env,GMWW_B_SYNTHETIC_ADMIN_KEY:undefined};
 const req=new Request(BASE+'/qa/login',{method:'POST',body:JSON.stringify({fixtureOnly:true,persona:'gm'})});
 assert.equal((await worker.fetch(req,disabled)).status,503);
});
test('GM and Player synthetic login/session, room, authorization, chat and reconnect state',async()=>{
 const {api,post,replaceObject}=setup();
 const gmRes=await post('/qa/login',{fixtureOnly:true,persona:'gm'});
 assert.equal(gmRes.status,200);
 const gm=(await gmRes.json()).token;
 assert.match(gm,/^syn_[a-f0-9]{64}$/);
 const player=(await (await post('/qa/login',{fixtureOnly:true,persona:'player'})).json()).token;
 assert.equal((await post('/qa/rooms',{},player)).status,403);
 const newRoom=await post('/qa/rooms',{},gm);assert.equal(newRoom.status,201);
 const code=(await newRoom.json()).roomCode;
 assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
 assert.equal((await post('/qa/chat',{roomCode:code,message:'before join'},player)).status,403);
 assert.equal((await post('/qa/join',{roomCode:code},player)).status,200);
 const msg=await post('/qa/chat',{roomCode:code,message:'synthetic chat'},player);
 assert.equal(msg.status,200);
 const messages=await api('/qa/messages?roomCode='+code,{token:gm});
 assert.equal(messages.status,200);
 assert.deepEqual((await messages.json()).messages.map(x=>x.message),['synthetic chat']);
 assert.equal((await api('/qa/messages?roomCode='+code)).status,401);
 assert.equal((await post('/qa/chat',{roomCode:code,message:'<untrusted> '.repeat(90)},gm)).status,400);
 const firstTicket=await post('/qa/ws-ticket',{roomCode:code},gm);
 assert.equal(firstTicket.status,200);
 assert.match((await firstTicket.json()).ticket,/^[a-f0-9]{64}$/);
 assert.equal((await api('/qa/ws?ticket=wrong',{headers:{Upgrade:'websocket'},key:null})).status,401);
 replaceObject();
 const after=await api('/qa/messages?roomCode='+code,{token:player});
 assert.equal(after.status,200);
 assert.equal((await after.json()).messages[0].message,'synthetic chat');
 assert.equal((await post('/qa/ws-ticket',{roomCode:code},player)).status,200);
});
test('synthetic WebSocket ping/pong and room-scoped chat broadcast',async()=>{
 const {post,object,sockets}=setup();
 const gm=(await (await post('/qa/login',{fixtureOnly:true,persona:'gm'})).json()).token;
 const player=(await (await post('/qa/login',{fixtureOnly:true,persona:'player'})).json()).token;
 const code=(await (await post('/qa/rooms',{},gm)).json()).roomCode;
 await post('/qa/join',{roomCode:code},player);
 const receivedGM=[],receivedPlayer=[];
 const makeSocket=(token,send)=>({deserializeAttachment:()=>({token,room:code}),send:x=>send.push(JSON.parse(x)),close(){}});
 const gmSocket=makeSocket(gm,receivedGM),playerSocket=makeSocket(player,receivedPlayer);
 sockets.push(gmSocket,playerSocket);
 await object.webSocketMessage(gmSocket,JSON.stringify({type:'ping'}));
 assert.deepEqual(receivedGM[0],{type:'pong',syntheticOnly:true});
 await object.webSocketMessage(playerSocket,JSON.stringify({type:'chat',message:'WS synthetic'}));
 assert.equal(receivedGM[1].message,'WS synthetic');
 assert.equal(receivedPlayer[0].message,'WS synthetic');
});
test('expired synthetic sessions fail closed (HTTP and WebSocket)',async()=>{
 const {post,api,memory,object}=setup();
 const gm=(await (await post('/qa/login',{fixtureOnly:true,persona:'gm'})).json()).token;
 const code=(await (await post('/qa/rooms',{},gm)).json()).roomCode;
 const data=memory.get('gmww-b-stage3');data.sessions[gm].expires=Date.now()-10;
 await object.save(data);
 assert.equal((await api('/qa/messages?roomCode='+code,{token:gm})).status,401);
 const close=[];
 await object.webSocketMessage({deserializeAttachment:()=>({token:gm,room:code}),close:(...args)=>close.push(args)},'{"type":"ping"}');
 assert.equal(close[0][0],1008);
});
