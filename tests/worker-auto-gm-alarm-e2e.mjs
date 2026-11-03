// Real Cloudflare workerd + Durable Object SQLite alarm acceptance. Loopback ONLY.
// Run with a local Worker; do NOT use this script against any Production host.
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';

const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'LOCAL WORKER ONLY');
const tag=Date.now().toString(36),trace=[];
async function call(path,body,token){
 const res=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const data=await res.json();
 assert.equal(data.ok,true,JSON.stringify({path,status:res.status,data}));
 return data;
}
const room=await call('/api/rooms',{roomName:'AUTO GM E2E '+tag,roomMode:'online',seatCount:8,
 gameConfig:{name:'AUTO GM Alarm',artifactsEnabled:false,roles:[
 {roleId:'role_seer',roleName:'Tiên Tri',order:1,actionDurationSec:2},
 {roleId:'role_guard',roleName:'Bảo Vệ',order:2,actionDurationSec:2}],
 timing:{defaultActionSec:2,wolfDiscussionSec:0,villageDiscussionSec:120}}});
const code=room.roomCode,token=room.gmToken,gm=(path,body)=>call('/api/gm/rooms/'+code+path,body,token);
const people=['seer','guard'].map((name,i)=>({name,loginId:'autoe2e'+i+tag}));
let ws;
try{
 for(let i=0;i<people.length;i++){
  const p=people[i];
  await call('/api/members/register',{loginId:p.loginId,displayName:p.name+tag,gameCharacterId:'character-01'});
  const session=await call('/api/members/login',{loginId:p.loginId});
  await call('/api/rooms/'+code+'/join',{token:session.token});
  await gm('/seat',{loginId:p.loginId,seatId:i+1});
 }
 const matchId='auto-'+tag;
 const assignments=people.map((p,i)=>({loginId:p.loginId,roleId:i===0?'role_seer':'role_guard',roleName:p.name,
  roleCard:{name:p.name,faction:'Phe Dân',functions:[{actionId:i===0?'action_seer':'action_protect',usageMode:'eachNight',usageCount:1}]}}));
 await gm('/assignments',{matchId,assignments,deliveryVersion:1});
 await gm('/start',{matchId});
 await gm('/cycle',{phase:'night',night:1,cycleKey:'night-1'});
 await gm('/auto',{enabled:true});
 const initial=await gm('');
 assert.equal(initial.room.phase,'running');
 assert.equal(initial.room.cyclePhase,'night');
 assert.equal(initial.room.autoGM,true);
 assert.ok(initial.nightRuntime?.queue?.length>=2,'Night should schedule two timed roles');
 assert.ok(initial.nightRuntime.queue[initial.nightRuntime.cursor].durationSec>=1,'First role timed');
 const initialId=initial.nightRuntime.currentId;
 trace.push({step:'initial',turn:initialId,deadlineAt:initial.nightRuntime.deadlineAt});
 // Heartbeats previously overwrote the ONLY Durable Object alarm. Reproduce it.
 for(let i=0;i<4;i++){
  await sleep(350);
  await call('/api/rooms/'+code+'/heartbeat',{participantId:'member:'+people[i%people.length].loginId});
 }
 // Crucial: public room GET does NOT invoke authenticated GM state recovery.
 // This verifies the real DO alarm executes without GM clicks or polling.
 let beforeGmRecovery=null;
 for(let n=0;n<40;n++){
  await sleep(250);
  const publicRoom=(await call('/api/rooms/'+code)).room;
  if(publicRoom.cyclePhase==='morning'){
   beforeGmRecovery=publicRoom;break;
  }
 }
 trace.push({step:'publicStateBeforeRecovery',room:beforeGmRecovery});
 if(!beforeGmRecovery){
  const publicRoom=(await call('/api/rooms/'+code)).room;
  trace.push({step:'stuckPublicState',room:publicRoom});
  // Collect authenticated state only AFTER checking the unsolicited alarm.
  const gmState=await gm('');
  trace.push({step:'gmStateAfterPublicTimeout',phase:gmState.room.cyclePhase,
   autoGM:gmState.room.autoGM,cursor:gmState.nightRuntime?.cursor,
   currentId:gmState.nightRuntime?.currentId,deadlineAt:gmState.nightRuntime?.deadlineAt});
  console.error('AUTO GM ALARM FAILURE',JSON.stringify(trace));
  assert.fail('DO alarm did not complete the night without a GM fetch');
 }
 console.log('PASS: Real DO advanced timed roles and zero-second village-wakeup through heartbeat without GM polling',JSON.stringify(trace));
}finally{
 if(ws)ws.close();
 await gm('/end',{force:true}).catch(()=>{});
}
