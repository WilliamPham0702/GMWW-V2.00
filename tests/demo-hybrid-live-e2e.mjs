// Real isolated workerd + Durable Object contract. Never contacts Production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),
  'Hybrid DEMO integration tests must never mutate Production');
const serial=Date.now().toString(36),id='hybrid'+serial,codePrefix='d'+serial;
const localGmSync=readFileSync('src/index.js','utf8').match(/const GM_SYNC_TOKEN="([^"]+)"/)?.[1];
assert.ok(localGmSync,'Local Worker GM test token must be available');
async function req(path,{method='GET',token,body}={}){
 const res=await fetch(base+path,{method,headers:{
  ...(token?{authorization:'Bearer '+token}:{}),
  ...(body!==undefined?{'content-type':'application/json'}:{})},
  ...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const data=await res.json();return {status:res.status,...data};
}
function ok(response,label){assert.equal(response.ok,true,label+': '+JSON.stringify(response));return response}
const room=ok(await req('/api/rooms',{method:'POST',token:localGmSync,body:{roomName:'DEMO hybrid integration '+serial,
  demo:true,seatCount:8,gameConfig:{name:'DEMO test',roles:[{roleId:'role_seer',roleName:'Tiên Tri',order:1},
    {roleId:'role_villager',roleName:'Dân',order:2}],timing:{defaultActionSec:45}}}}),'create');
const code=room.roomCode,gm=async(path='',body)=>req('/api/gm/rooms/'+code+path,{
  method:body===undefined?'GET':'POST',token:room.gmToken,body});
const people=[{loginId:id,seatId:1,displayName:'Real '+serial},
  ...Array.from({length:5},(_,i)=>({loginId:codePrefix+i,seatId:i+2,displayName:'NPC '+i}))];
const roleCard={name:'Tiên Tri',faction:'Phe Dân',actions:[{id:'action_seer',name:'Soi'}],
  functions:[{id:'action_seer',actionId:'action_seer',name:'Soi',phase:'night',
    usageMode:'eachNight',usageCount:1,targetCount:1,noSelf:true}]};
let humanToken='';
try {
 for(const p of people)ok(await req('/api/members/register',{method:'POST',body:{
   loginId:p.loginId,displayName:p.displayName,gameCharacterId:'character-01'}}),'register');
 humanToken=ok(await req('/api/members/login',{method:'POST',
   body:{loginId:id,password:''}}),'login').token;
 assert.equal((await req('/api/rooms/'+code+'/join',{method:'POST',
   body:{guest:{displayName:'Guest User',avatarId:'character-01'}}})).status,403,
   'DEMO must reject unauthenticated guests');
 assert.ok((await req('/api/rooms')).rooms.some(r=>r.code===code&&r.demo),
   'DEMO must be discoverable before the match');
 ok(await req('/api/rooms/'+code+'/join',{method:'POST',
   body:{token:humanToken}}),'human join');
 ok(await gm('/participants',{members:people,replace:true}),'reserve bots and preserve human');
 for(const p of people)ok(await gm('/seat',{loginId:p.loginId,seatId:p.seatId}),'settle '+p.loginId);
 ok(await gm('/seat-lock',{locked:true}),'lock seats');
 const matchId='hybrid-match-'+serial;
 ok(await gm('/assignments',{matchId,assignments:people.map((p,i)=>({
   loginId:p.loginId,roleId:i===0?'role_seer':'role_villager',roleName:i===0?'Tiên Tri':'Dân',
   faction:'Phe Dân',roleCard:i===0?roleCard:{name:'Dân',faction:'Phe Dân',functions:[]}}))}),'assign');
 ok(await gm('/start',{matchId}),'start');
 ok(await gm('/demo',{command:'stop'}),'pause AI while testing live action');
 ok(await gm('/cycle',{phase:'night',night:1,cycleKey:'night-1'}),'night');
 let snapshot=ok(await gm(),'GM state'),q=snapshot.nightRuntime.queue;
 const index=q.findIndex(t=>(t.loginIds||[t.loginId]).includes(id));
 assert.ok(index>=0,'actual player must have a queued role turn');
 ok(await gm('/turn',{action:'jump',targetIndex:index}),'jump role');
 snapshot=ok(await gm(),'GM queued role');
 const own=ok(await req('/api/rooms/'+code+'/me',{token:humanToken}),'private offer');
 assert.equal(own.demoActions.length,1,'receive only owned action');
 assert.equal(own.demoActions[0].actionId,'action_seer');
 assert.ok(!JSON.stringify(own.demoActions).includes(people[1].loginId),
   'private action offer must not reveal unrelated actors');
 const params={matchId,cycleKey:snapshot.room.cycleKey,
   actionKey:own.demoActions[0].key,targetIds:[people[1].loginId]};
 assert.equal((await req('/api/rooms/'+code+'/demo-action',{method:'POST',
   body:params})).status,401,'unsigned API cannot use the human power');
 assert.equal((await req('/api/rooms/'+code+'/demo-action',{method:'POST',
   token:humanToken,body:{...params,matchId:'wrong'}})).status,409,
   'stale match rejected');
 ok(await req('/api/rooms/'+code+'/demo-action',{method:'POST',
   token:humanToken,body:params}),'accepted human action');
 const used=ok(await gm(),'GM used ledger').battleActionUsage;
 assert.equal(used.filter(x=>x.actorId===id&&x.actionId==='action_seer').length,1,
   'human action must appear exactly once in authoritative ledger');
 assert.deepEqual(ok(await req('/api/rooms/'+code+'/me',{token:humanToken}),
   'post-action private state').demoActions,[],'AI must not re-offer a consumed power');
 assert.equal((await req('/api/rooms/'+code+'/demo-action',{method:'POST',
   token:humanToken,body:params})).status,409,'duplicate action must not run twice');
 console.log('PASS hybrid DEMO: discover, authenticated join, private offer, signed live action, no duplicate');
}finally {await gm('/end',{force:true}).catch(()=>{});}
