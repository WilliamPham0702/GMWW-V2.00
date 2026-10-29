// Lam Ngọc Định Mệnh (#32): link, reveal gate and copied inspection via real Worker.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='link-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
 headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
 body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r};
const room=ok(await req('/api/rooms',{roomName:'Artifact link '+serial,seatCount:8,
 gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:10}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='l'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'L'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=i===7?'role_wolf':'role_villager',role=catalog.find(c=>c.id===roleId);
  const artifactId=i===0?'artifact_32':i===1?'artifact_09':null;
  const artifact=artifactId?catalog.find(c=>c.id===artifactId):null;
  return {loginId,roleId,roleName:role.name,
   faction:i===7?'wolf':'village',
   roleCard:{...role,factionId:i===7?'wolf':'village'},
   ...(artifact?{artifact:{artifactId,artifactName:artifact.name,
     singleUse:true,artifactCard:artifact}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));
 ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],
 artifactId:'artifact_32',actionId:'artifact_action_link',targetIds:[ids[1]],
 clientEventId:'link-once'};
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',action,tokens[0])).status,401);
 assert.equal((await gm('/day-action',{...action,actorId:ids[2],clientEventId:'not-owner'})).error,
  'DAY_ARTIFACT_NOT_OWNED');
 const linked=ok(await gm('/day-action',action));
 assert.equal(linked.result.artifactLinked,true);
 assert.equal(ok(await gm('/day-action',action)).idempotent,true);
 assert.equal((await gm('/day-action',{...action,clientEventId:'link-again'})).status,409);
 let alice=await me(0),bob=await me(1),mallory=await me(2);
 assert.equal(alice.linkedArtifact?.artifactId,'artifact_09');
 assert.equal(alice.linkedArtifact.available,false,'copy unavailable until donor reveals');
 assert.equal(mallory.linkedArtifact,null,'no private linkage for unrelated player');
 assert.equal(bob.artifact.artifactId,'artifact_09','original owner retains Artifact');
 ok(await req('/api/rooms/'+room.roomCode+'/artifact/viewed',{},tokens[1]));
 ok(await gm('/cycle',{phase:'morning',night:2,cycleKey:'morning-2'}));
 alice=await me(0);
 assert.equal(alice.linkedArtifact.available,true);
 const copied=alice.onlineActions.find(x=>x.artifactId==='artifact_32'&&
   x.actionId==='artifact_action_check_villager');
 assert.ok(copied,'copied inspection available only to Lam Ngọc owner');
 assert.equal((await me(2)).onlineActions.some(x=>x.actionId==='artifact_action_check_villager'),false);
 const scan=ok(await req('/api/rooms/'+room.roomCode+'/action',{
  matchId,cycleKey:'morning-2',actionKey:copied.key,targetIds:[ids[3]]},tokens[0]));
 assert.equal(scan.result.confirmed,true);
 assert.equal((await me(0)).onlineActions.some(x=>x.key===copied.key),false,
   'copied action quota is independent and spent once');
 assert.equal((await me(1)).artifact.artifactId,'artifact_09');
 const publicRoom=ok(await req('/api/rooms/'+room.roomCode));
 assert.equal(JSON.stringify(publicRoom).includes('linkedArtifact'),false);
 console.log('PASS: #32 real day link, private owner-only details, donor reveal gate, copied execution, quota, reconnect');
}finally{await gm('/end',{force:true}).catch(()=>{})}
