// Night transformation artifacts #23/#32/#40 and one-step Undo in real Worker.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='night-tx-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
 headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
 body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=x=>{assert.equal(x.ok,true,JSON.stringify(x));return x};
const room=ok(await req('/api/rooms',{roomName:'Night transformations '+serial,seatCount:8,
 gameConfig:{artifactLimitPerCycle:10,artifactsEnabled:true}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],sessions=[];
try{
 for(let i=0;i<8;i++){
  const loginId='n'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'N'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));sessions.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const roleIds=['role_villager','role_guard','role_guard','role_thug',
  'role_villager','role_villager','role_wolf','role_wolf'],
  artifactIds=['artifact_40',null,'artifact_23',null,'artifact_32','artifact_09',null,null];
 ok(await gm('/assignments',{matchId,assignments:ids.map((loginId,i)=>{
  const card=catalog.find(c=>c.id===roleIds[i]),
    artifact=artifactIds[i]?catalog.find(c=>c.id===artifactIds[i]):null;
  return {loginId,roleId:card.id,roleName:card.name,
   faction:i>=6?'wolf':'village',roleCard:card,
   ...(artifact?{artifact:{artifactId:artifact.id,artifactName:artifact.name,
     singleUse:true,artifactCard:artifact}}:{})};
 })}));
 ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'night',night:1,cycleKey:'night-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,sessions[i]).then(ok);
 const locate=async(actorIndex,artifactId)=>{
  let state=ok(await gm('')),queue=state.nightRuntime.queue||[];
  let index=queue.findIndex(x=>x.kind==='early-artifact-window'&&
   (x.actions||[]).some(a=>a.artifactId===artifactId&&a.loginId===ids[actorIndex]));
  if(index<0)index=queue.findIndex(x=>x.artifactId===artifactId&&x.loginId===ids[actorIndex]||
   (x.artifacts||[]).some(a=>a.artifactId===artifactId&&a.loginId===ids[actorIndex])||
   (x.roles||[]).some(y=>(y.artifacts||[]).some(a=>a.artifactId===artifactId&&a.loginId===ids[actorIndex])));
  assert.ok(index>=0,'Artifact is scheduled for correct owner');
  if(state.nightRuntime.cursor!==index)
   ok(await gm('/turn',{action:'jump',targetIndex:index}));
  state=ok(await gm(''));
  return state.nightRuntime.currentId;
 };
 const action=(actorIndex,artifactId,actionId,targetIndex,turnId,event)=>({
  matchId,cycleKey:'night-1',night:1,turnId,actorId:ids[actorIndex],
  artifactId,actionId,type:'effect_notice',targetIds:[ids[targetIndex]],
  clientEventId:event,effectName:artifactId
 });
 const swapTurn=await locate(0,'artifact_40');
 const swapped=ok(await gm('/battle-action',action(0,'artifact_40',
  'artifact_action_swap_role',1,swapTurn,'night-swap')));
 assert.equal((await me(0)).role.roleId,'role_guard');
 assert.equal((await me(1)).role.roleId,'role_villager');
 assert.equal((await me(0)).artifact.artifactId,'artifact_40');
 assert.equal((await me(1)).artifact,null);
 ok(await gm('/battle-undo',{undoToken:swapped.undoToken}));
 assert.equal((await me(0)).role.roleId,'role_villager','Night Undo restored actor Role');
 assert.equal((await me(1)).role.roleId,'role_guard','Night Undo restored donor Role');
 assert.equal((await me(0)).artifact.usedAt,null,'Night Undo restored Artifact quota');
 const mirrorTurn=await locate(2,'artifact_23');
 const mirror=ok(await gm('/battle-action',action(2,'artifact_23',
  'artifact_action_copy_function',3,mirrorTurn,'night-mirror')));
 assert.equal((await me(2)).role.roleCard.functions.length,2);
 assert.equal((await me(1)).role.roleCard.functions.length,1,'no cross-owner Role contamination');
 ok(await gm('/battle-undo',{undoToken:mirror.undoToken}));
 assert.equal((await me(2)).role.roleCard.functions.length,1,'Night Undo removes copied ability');
 const linkTurn=await locate(4,'artifact_32');
 const link=ok(await gm('/battle-action',action(4,'artifact_32',
  'artifact_action_link',5,linkTurn,'night-link')));
 assert.equal((await me(4)).linkedArtifact.artifactId,'artifact_09');
 assert.equal((await me(5)).artifact.artifactId,'artifact_09','donor retained Artifact');
 ok(await gm('/battle-undo',{undoToken:link.undoToken}));
 assert.equal((await me(4)).linkedArtifact,null,'Night Undo removes private link');
 assert.equal((await me(5)).artifact.artifactId,'artifact_09');
 console.log('PASS: #23/#32/#40 Night real effects and Undo on Worker, private reconnect, unrelated Role isolation');
}finally{await gm('/end',{force:true}).catch(()=>{})}
