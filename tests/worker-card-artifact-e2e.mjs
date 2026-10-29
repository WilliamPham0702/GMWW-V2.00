// Actual HTTP + Durable Object storage, canonical cards; local mutations only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='artifact-'+serial;
const cases=[['artifact_09','role_villager','village'],['artifact_24','role_destroyer','third'],['artifact_29','role_alpha_wolf','wolf'],['artifact_39','role_seer','village']];
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
function ok(r){assert.equal(r.ok,true,JSON.stringify(r));return r}
const room=ok(await req('/api/rooms',{roomName:'Artifact inspection '+serial,seatCount:8,gameConfig:{artifactLimitPerCycle:10,artifactsEnabled:true}}));
const gm=(route,body)=>req('/api/gm/rooms/'+room.roomCode+route,body,room.gmToken);
const ids=[],sessions=[];
try{
 for(let i=0;i<8;i++){
  const loginId='a'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'A'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));sessions.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=i<4?'role_villager':cases[i-4][1],role=catalog.find(c=>c.id===roleId);
  const artifact=i<4?catalog.find(c=>c.id===cases[i][0]):null;
  return {loginId,roleId,roleName:role.name,faction:i<4?'village':cases[i-4][2],roleCard:{...role,factionId:i<4?'village':cases[i-4][2]},...(artifact?{artifact:{artifactId:artifact.id,artifactName:artifact.name,singleUse:true,artifactCard:artifact}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 for(let i=0;i<4;i++){
  const [artifactId]=cases[i],card=catalog.find(c=>c.id===artifactId);
  const payload={matchId,cycleKey:'morning-1',actorId:ids[i],artifactId,actionId:card.functions[0].actionId,targetIds:[ids[i+4]],clientEventId:'inspect-'+i};
  assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',payload,sessions[i])).status,401,'member cannot impersonate GM');
  const wrongOwner=await gm('/day-action',{...payload,actorId:ids[(i+1)%4],clientEventId:'wrong-'+i});
  assert.equal(wrongOwner.error,'DAY_ARTIFACT_NOT_OWNED');
  const answer=ok(await gm('/day-action',payload));
  assert.equal(answer.result.private,true);
  if(i<3)assert.equal(answer.result.confirmed,true);else assert.equal(answer.result.roleId,'role_seer');
  assert.equal(ok(await gm('/day-action',payload)).idempotent,true);
  assert.equal((await gm('/day-action',{...payload,targetIds:[ids[7-i]]})).error,'REQUEST_ID_CONFLICT');
  assert.equal((await gm('/day-action',{...payload,clientEventId:'exhausted-'+i})).error,'DAY_ARTIFACT_SINGLE_USE_EXHAUSTED');
  const reconnect=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,sessions[i]));
  assert.equal(reconnect.artifact.artifactId,artifactId);
 }
 const publicState=ok(await req('/api/rooms/'+room.roomCode));
 for(const artifactId of cases.map(x=>x[0]))assert.equal(JSON.stringify(publicState).includes(artifactId),false,'private Artifact leaked');
 console.log('PASS: four real day Artifact inspections, ownership, GM authentication, private results, retries, quota and reconnect');
}finally{await gm('/end',{force:true}).catch(()=>{})}
