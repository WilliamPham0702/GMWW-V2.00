import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
async function req(p,b,t){const r=await fetch(base+p,{method:b?'POST':'GET',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,...await r.json()}}
const ok=d=>{assert.equal(d.ok,true,JSON.stringify(d));return d};
const serial=Date.now().toString(36),ids=[],tokens=[],matchId='disable-'+serial;
const room=ok(await req('/api/rooms',{roomName:'Disable Artifact '+serial,seatCount:8,gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:5}}));
const gm=(p,b)=>req('/api/gm/rooms/'+room.roomCode+p,b,room.gmToken);
try{
 for(let i=0;i<6;i++){
  const loginId='z'+i+serial;ids.push(loginId);ok(await req('/api/members/register',{loginId,displayName:'Z'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=['role_villager','role_villager','role_thug','role_seer','role_wolf','role_wolf'][i],card=cards.find(c=>c.id===roleId),artifact=cards.find(c=>c.id==='artifact_06');
  return {loginId,roleId,roleName:card.name,faction:i>=4?'wolf':'village',roleCard:card,...(i<2?{artifact:{artifactId:artifact.id,artifactName:artifact.name,artifactCard:{...artifact,singleUse:true}}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 const blocked=async i=>ok(await gm('')).activeEffects.some(x=>x.loginId===ids[i]&&x.type==='status'&&x.statusId==='disabled_permanent');
 assert.ok((await me(2)).onlineActions.some(x=>x.actionId==='action_stab'));
 const offer=(await me(0)).onlineActions.find(x=>x.artifactId==='artifact_06');assert.ok(offer,'both-phase Artifact must be offered');
 const used=ok(await req('/api/rooms/'+room.roomCode+'/action',{matchId,cycleKey:'morning-1',actionKey:offer.key,targetIds:[ids[2]]},tokens[0]));
 assert.ok(used.result.message);assert.deepEqual((await me(2)).onlineActions,[]);
 assert.equal((await req('/api/rooms/'+room.roomCode+'/action',{matchId,cycleKey:'morning-1',actionKey:offer.key,targetIds:[ids[2]]},tokens[0])).status,409);
 assert.equal((await req('/api/rooms/'+room.roomCode+'/action',{matchId,cycleKey:'morning-1',actionKey:offer.key,targetIds:[ids[2]]},tokens[2])).status,409);
 assert.equal(await blocked(2),true);
 assert.equal((await gm('/day-action',{matchId,cycleKey:'morning-1',actorId:ids[2],roleId:'role_thug',actionId:'action_stab',targetIds:[ids[4]],clientEventId:'disabled-thug'})).error,'DAY_ACTOR_BLOCKED');
 ok(await gm('/cycle',{phase:'night',night:2,cycleKey:'night-2'}));
 let state=ok(await gm('')),index=state.nightRuntime.queue.findIndex(x=>x.artifactId==='artifact_06'&&(x.loginId===ids[1]||(x.loginIds||[]).includes(ids[1])));
 assert.ok(index>=0,'owned night Artifact turn exists');ok(await gm('/turn',{action:'jump',targetIndex:index}));state=ok(await gm(''));
 const payload={matchId,cycleKey:'night-2',night:2,turnId:state.nightRuntime.currentId,actorId:ids[1],artifactId:'artifact_06',actionId:'artifact_action_disable_function',targetIds:[ids[3]],type:'effect_notice',clientEventId:'disable-night'};
 const action=ok(await gm('/battle-action',payload));
 assert.equal(await blocked(3),true);
 assert.equal(ok(await gm('/battle-action',payload)).idempotent,true);
 const exhausted=await gm('/battle-action',{...payload,clientEventId:'disable-night-new-request'});
 assert.equal(exhausted.error,'BATTLE_ACTION_ABORTED');assert.equal(exhausted.detail,'ARTIFACT_ALREADY_USED');
 ok(await gm('/battle-undo',{undoToken:action.undoToken}));
 assert.equal(await blocked(3),false);
 const resumed=(await me(1)).artifact;assert.equal(resumed.usedAt,null);
 ok(await gm('/battle-action',{...payload,clientEventId:'disable-night-after-undo'}));
 assert.equal(await blocked(3),true);
 assert.equal(await blocked(2),true,'permanent block persists across day/night');
 console.log('PASS: Village Seal real day Player action, permanent power block, Night executor, retry, undo and reconnect');
}finally{await gm('/end',{force:true}).catch(()=>{})}
