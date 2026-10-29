// Hắc Ngọc Hủy Diệt: actual HTTP/SQLite Worker, never Production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='destroy-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
function ok(r){assert.equal(r.ok,true,JSON.stringify(r));return r;}
const room=ok(await req('/api/rooms',{roomName:'Secret artifact '+serial,seatCount:8,
 gameConfig:{artifactLimitPerCycle:10,artifactsEnabled:true}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],sessions=[];
try{
 for(let i=0;i<8;i++){
  const loginId='d'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'D'+i+serial,gameCharacterId:'character-01'}));
  sessions.push(ok(await req('/api/members/login',{loginId})).token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:sessions[i]}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=i===7?'role_wolf':'role_villager',role=catalog.find(c=>c.id===roleId);
  const artifactId=i===0?'artifact_25':[1,2].includes(i)?'artifact_16':null;
  const artifact=artifactId?catalog.find(c=>c.id===artifactId):null;
  return {loginId,roleId,roleName:role.name,faction:i===7?'wolf':'village',
   roleCard:{...role,factionId:i===7?'wolf':'village'},
   ...(artifact?{artifact:{artifactId,artifactName:artifact.name,singleUse:i===0,artifactCard:artifact}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));
 ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 ok(await req('/api/rooms/'+room.roomCode+'/artifact/viewed',{},sessions[2]));
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],
  artifactId:'artifact_25',actionId:'artifact_action_destroy',
  targetIds:[ids[2]],clientEventId:'viewed-target'};
 const notOwner=await gm('/day-action',{...action,actorId:ids[3],clientEventId:'not-owner'});
 assert.equal(notOwner.error,'DAY_ARTIFACT_NOT_OWNED','GM cannot act as non-owner');
 const before=await gm('/day-action',action);
 assert.equal(before.error,'DESTROY_TARGET_NOT_UNREVEALED','a revealed card is not destroyable');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[0]],clientEventId:'self'})).error,
  'DESTROY_TARGET_NOT_UNREVEALED','cannot destroy own card');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[3]],clientEventId:'missing'})).error,
  'DESTROY_TARGET_NOT_UNREVEALED','cannot destroy a missing card');
 const good={...action,targetIds:[ids[1]],clientEventId:'destroy-success'};
 const failedAuth=await req('/api/gm/rooms/'+room.roomCode+'/day-action',good,sessions[0]);
 assert.equal(failedAuth.status,401,'players cannot impersonate GM');
 const success=ok(await gm('/day-action',good));
 assert.equal(JSON.stringify(success.result).includes('artifact_16'),false,'no destroyed-card identity leaks through result');
 assert.equal(ok(await gm('/day-action',good)).idempotent,true);
 assert.equal((await gm('/day-action',{...good,targetIds:[ids[2]]})).error,'REQUEST_ID_CONFLICT');
 assert.equal((await gm('/day-action',{...good,clientEventId:'spend-again'})).error,'DAY_ARTIFACT_SINGLE_USE_EXHAUSTED');
 const target=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,sessions[1]));
 assert.ok(!target.artifact||target.artifact.artifactId!=='artifact_16','removed card does not reappear on reconnect');
 assert.equal((await req('/api/rooms/'+room.roomCode+'/artifact/viewed',{},sessions[1])).error,'ARTIFACT_NOT_FOUND');
 const other=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,sessions[2]));
 assert.equal(other.artifact?.artifactId,'artifact_16','the flipped card was preserved');
 const publicState=ok(await req('/api/rooms/'+room.roomCode));
 assert.equal(JSON.stringify(publicState).includes('artifact_16'),false,'public room cannot see hidden artifact');
 console.log('PASS: secret unflipped Artifact removal, unchanged flipped card, authentication, idempotency, quota, reconnect and privacy');
}finally{await gm('/end',{force:true}).catch(()=>{});}
