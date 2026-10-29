// Artifact #32 copying Artifact #35: one real day activation, protection set for next night.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='echo-shield-'+serial;
async function req(route,body,token){
 const response=await fetch(base+route,{method:body?'POST':'GET',
 headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
 body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:response.status,...await response.json()};
}
const ok=x=>{assert.equal(x.ok,true,JSON.stringify(x));return x};
const room=ok(await req('/api/rooms',{roomName:'Echo protection '+serial,roomMode:'online',seatCount:8,
 gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:10}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='e'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'E'+i+serial,gameCharacterId:'character-01'}));
  tokens.push(ok(await req('/api/members/login',{loginId})).token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:tokens[i]}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=i===7?'role_wolf':'role_villager',role=cards.find(x=>x.id===roleId);
  const aid=i===0?'artifact_32':i===1?'artifact_35':null,
   artifact=aid?cards.find(x=>x.id===aid):null;
  return {loginId,roleId,roleName:role.name,faction:i===7?'wolf':'village',roleCard:role,
   ...(artifact?{artifact:{artifactId:aid,artifactName:artifact.name,
     singleUse:i===0,artifactCard:artifact}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));
 ok(await gm('/auto',{enabled:false}));ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 const linked=ok(await gm('/day-action',{matchId,cycleKey:'morning-1',actorId:ids[0],
  artifactId:'artifact_32',actionId:'artifact_action_link',
  targetIds:[ids[1]],clientEventId:'echo-link'}));
 assert.equal(linked.result.artifactLinked,true);
 assert.equal((await me(0)).linkedArtifact.available,false);
 ok(await req('/api/rooms/'+room.roomCode+'/artifact/viewed',{},tokens[1]));
 ok(await gm('/cycle',{phase:'morning',night:2,cycleKey:'morning-2'}));
 const owner=await me(0),donor=await me(1),stranger=await me(3);
 assert.equal(owner.linkedArtifact.available,true);
 assert.equal(donor.artifact.artifactId,'artifact_35');
 assert.equal(stranger.linkedArtifact,null);
 const power=owner.onlineActions.find(x=>x.artifactId==='artifact_32'&&x.actionId==='action_protect');
 assert.ok(power,'Owner must receive copied shield offer on next morning');
 const shield=ok(await req('/api/rooms/'+room.roomCode+'/action',{
  matchId,cycleKey:'morning-2',actionKey:power.key,targetIds:[ids[2]]
 },tokens[0]));
 assert.equal(shield.result.message.includes('đêm kế tiếp'),true);
 const state=ok(await gm(''));
 const status=state.interactions.find(x=>x.loginId===ids[2]&&
  x.statusId==='artifact_next_night_protect'&&x.effectActive!==false);
 assert.ok(status,'copied ability must write real protection to Server interaction ledger');
 assert.equal(status.protectNight,3);
 assert.equal((await me(0)).onlineActions.some(x=>x.key===power.key),false,'copied once-use quota exhausted');
 assert.equal((await me(1)).artifact.artifactId,'artifact_35');
 assert.equal(JSON.stringify(ok(await req('/api/rooms/'+room.roomCode))).includes('linkedArtifact'),false);
 console.log('PASS: #32 echo #35 protection to next night, owned quota, donor intact, private delivery');
}finally{await gm('/end',{force:true}).catch(()=>{})}
