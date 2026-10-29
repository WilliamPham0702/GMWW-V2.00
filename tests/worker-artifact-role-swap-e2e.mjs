// Artifact #40 day role swap: real Worker + SQLite + HTTP; not Production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='swap-'+serial;
async function req(route,body,token){
 const response=await fetch(base+route,{method:body?'POST':'GET',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:response.status,...await response.json()};
}
function ok(response){assert.equal(response.ok,true,JSON.stringify(response));return response}
const room=ok(await req('/api/rooms',{roomName:'Role swap '+serial,seatCount:8,
 gameConfig:{artifactLimitPerCycle:10,artifactsEnabled:true}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='s'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'S'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=i===1||i===7?'role_wolf':i===2?'role_guard':'role_villager';
  const role=catalog.find(c=>c.id===roleId);
  const artifact=i===0?catalog.find(c=>c.id==='artifact_40'):
    i===1?catalog.find(c=>c.id==='artifact_16'):null;
  return {loginId,roleId,roleName:role.name,
   faction:i===1||i===7?'wolf':'village',roleCard:{...role,factionId:i===1||i===7?'wolf':'village'},
   ...(artifact?{artifact:{artifactId:artifact.id,artifactName:artifact.name,
     singleUse:i===0,artifactCard:artifact}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));
 ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 assert.equal((await me(0)).role.roleId,'role_villager');
 assert.equal((await me(1)).role.roleId,'role_wolf');
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],
  artifactId:'artifact_40',actionId:'artifact_action_swap_role',
  targetIds:[ids[1]],clientEventId:'role-swap'};
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',action,tokens[0])).status,401);
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[0]],clientEventId:'self'})).error,
  'ROLE_SWAP_INVALID_TARGET');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[3]],actorId:ids[2],clientEventId:'wrong-owner'})).error,
  'DAY_ARTIFACT_NOT_OWNED');
 const moved=ok(await gm('/day-action',action));
 assert.equal(moved.result.roleSwap,true);
 assert.equal(ok(await gm('/day-action',action)).idempotent,true);
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[2]]})).error,'REQUEST_ID_CONFLICT');
 assert.equal((await gm('/day-action',{...action,clientEventId:'try-again'})).error,'DAY_ARTIFACT_SINGLE_USE_EXHAUSTED');
 const a=await me(0),b=await me(1),c=await me(2);
 assert.equal(a.role.roleId,'role_wolf','actor received target Role on private reconnect');
 assert.equal(b.role.roleId,'role_villager','target received actor Role on private reconnect');
 assert.equal(a.artifact.artifactId,'artifact_40','swap never transfers actor Artifact');
 assert.equal(b.artifact.artifactId,'artifact_16','target retained own Artifact');
 assert.equal(c.role.roleId,'role_guard','unrelated Role preserved');
 const publicState=ok(await req('/api/rooms/'+room.roomCode));
 assert.equal(JSON.stringify(publicState).includes('role_wolf'),false,
  'public room must not reveal private swapped Role');
 console.log('PASS: Artifact #40 Day role/faction swap, token auth, idempotency, quota, unaffected Artifacts, reconnect and privacy');
}finally{await gm('/end',{force:true}).catch(()=>{})}
