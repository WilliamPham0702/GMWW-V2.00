// Ngọc Ghen Tuông (#17): real Worker/SQLite HTTP E2E, isolated, no Production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='steal-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r};
const room=ok(await req('/api/rooms',{roomName:'Artifact steal '+serial,seatCount:8,
 gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:10,
  artifacts:[{artifactId:'artifact_17'},{artifactId:'artifact_16'},{artifactId:'artifact_35'}]}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='t'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'T'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 // A replacement must come from the configured catalog; not a fabricated card.
 const newCard=cards.find(c=>c.id==='artifact_35');
 ok(await gm('/role-assets',{roles:[{roleId:'artifact:artifact_35',roleCard:newCard}]}));
 const assignments=ids.map((loginId,i)=>{
  const roleId=i===7?'role_wolf':'role_villager',role=cards.find(c=>c.id===roleId);
  const artifactId=i===0?'artifact_17':i===1||i===2?'artifact_16':null,
    artifact=artifactId?cards.find(c=>c.id===artifactId):null;
  return {loginId,roleId,roleName:role.name,faction:i===7?'wolf':'village',
   roleCard:{...role,factionId:i===7?'wolf':'village'},
   ...(artifact?{artifact:{artifactId,artifactName:artifact.name,artifactCard:artifact,singleUse:i===0}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));
 ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 ok(await req('/api/rooms/'+room.roomCode+'/artifact/viewed',{},tokens[2]));
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],artifactId:'artifact_17',
  actionId:'artifact_action_steal',targetIds:[ids[1]],clientEventId:'steal-once'};
 const wrong=await gm('/day-action',{...action,actorId:ids[3],clientEventId:'not-owner'});
 assert.equal(wrong.error,'DAY_ARTIFACT_NOT_OWNED');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[0]],clientEventId:'self'})).error,
  'ARTIFACT_STEAL_TARGET_INVALID');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[2]],clientEventId:'revealed'})).error,
  'ARTIFACT_STEAL_TARGET_INVALID');
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',action,tokens[0])).status,401);
 const done=ok(await gm('/day-action',action));
 assert.equal(done.result.artifactTransferred,true);
 assert.equal(ok(await gm('/day-action',action)).idempotent,true);
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[2]]})).error,
  'REQUEST_ID_CONFLICT');
 const owner=await me(0),target=await me(1),other=await me(2);
 assert.equal(owner.artifact?.artifactId,'artifact_16','owner received unrevealed Artifact');
 assert.equal(target.artifact?.artifactId,'artifact_35','target received actual catalog replacement');
 assert.equal(other.artifact?.artifactId,'artifact_16','unrelated viewed Artifact is preserved');
 assert.equal(owner.role?.roleId,'role_villager');
 assert.equal(target.role?.roleId,'role_villager');
 assert.equal(target.artifact?.viewedAt,null,'new card is unflipped');
 const publicState=ok(await req('/api/rooms/'+room.roomCode));
 for(const id of ['artifact_16','artifact_17','artifact_35'])
  assert.equal(JSON.stringify(publicState).includes(id),false,'hidden Artifact leaked in public API');
 console.log('PASS: #17 unflipped steal, configured replacement, private reconnect, access control and retries');
}finally{await gm('/end',{force:true}).catch(()=>{})}
