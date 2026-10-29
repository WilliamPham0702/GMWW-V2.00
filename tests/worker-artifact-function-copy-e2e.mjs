// Tráng Gương (#23): copy one supported Day power; real Worker/SQLite/HTTP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='mirror-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=x=>{assert.equal(x.ok,true,JSON.stringify(x));return x};
const room=ok(await req('/api/rooms',{roomName:'Mirror '+serial,seatCount:8,
 gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:10}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='m'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'M'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const roles=['role_guard','role_thug','role_villager','role_villager',
  'role_villager','role_villager','role_wolf','role_wolf'];
 const assignments=ids.map((loginId,i)=>{
  const role=cards.find(c=>c.id===roles[i]);
  const artifact=i===0?cards.find(c=>c.id==='artifact_23'):null;
  return {loginId,roleId:roles[i],roleName:role.name,
   faction:i>=6?'wolf':'village',
   roleCard:{...role,factionId:i>=6?'wolf':'village'},
   ...(artifact?{artifact:{artifactId:artifact.id,artifactName:artifact.name,
    artifactCard:artifact,singleUse:true}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));
 ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 const before=await me(0);
 assert.equal(before.role.roleCard.functions.length,1);
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],
  artifactId:'artifact_23',actionId:'artifact_action_copy_function',
  targetIds:[ids[1]],clientEventId:'mirror-copy'};
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[0]],clientEventId:'mirror-self'})).error,
  'COPY_FUNCTION_INVALID_TARGET');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[2]],clientEventId:'mirror-villager'})).error,
  'COPY_FUNCTION_NOT_EXECUTABLE');
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',action,tokens[0])).status,401);
 const done=ok(await gm('/day-action',action));
 assert.equal(done.result.roleFunctionCopied,true);
 assert.equal(ok(await gm('/day-action',action)).idempotent,true);
 const after=await me(0);
 assert.equal(after.role.roleId,'role_guard','Mirror must not change Role');
 assert.equal(after.role.roleCard.functions.length,2);
 assert.equal(after.role.roleCard.functions[1].copiedFromRoleId,'role_thug');
 const offered=after.onlineActions.find(x=>x.actionId==='action_stab'&&x.roleId==='role_guard');
 assert.ok(offered,'copied Day function is available on Player Web');
 const stab=ok(await req('/api/rooms/'+room.roomCode+'/action',{
  matchId,cycleKey:'morning-1',actionKey:offered.key,targetIds:[ids[7]]},tokens[0]));
 assert.equal(stab.result.correctlyStabbed,true);
 const state=ok(await gm(''));
 assert.equal(state.activeEffects.some(x=>x.loginId===ids[7]&&x.type==='dead'),true,
  'copied action must execute real Server kill, not a fake acknowledgement');
 const donor=await me(1);
 assert.equal(donor.role.roleId,'role_thug','donor retains own power');
 const publicState=ok(await req('/api/rooms/'+room.roomCode));
 assert.equal(JSON.stringify(publicState).includes('copiedFromRoleId'),false);
 console.log('PASS: #23 day copy, new usage, real Player kill, donor unchanged, private reconnect');
}finally{await gm('/end',{force:true}).catch(()=>{})}
