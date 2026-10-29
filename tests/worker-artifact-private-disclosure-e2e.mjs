// Artifact #27: server-authoritative recipient-only role disclosure, reconnect and privacy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='pendant-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=x=>{assert.equal(x.ok,true,JSON.stringify(x));return x};
const room=ok(await req('/api/rooms',{roomName:'Private pendant '+serial,roomMode:'online',
 seatCount:8,gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:10}}));
const gm=(route,body)=>req('/api/gm/rooms/'+room.roomCode+route,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='p'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'P'+i+serial,gameCharacterId:'character-01'}));
  tokens.push(ok(await req('/api/members/login',{loginId})).token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:tokens[i]}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=i===0?'role_guard':i===7?'role_wolf':'role_villager',
    role=catalog.find(x=>x.id===roleId),
    card=i===0?catalog.find(x=>x.id==='artifact_27'):null;
  return {loginId,roleId,roleName:role.name,
   faction:i===7?'wolf':'village',roleCard:role,
   ...(card?{artifact:{artifactId:card.id,artifactName:card.name,singleUse:true,
    artifactCard:card}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));
 ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],artifactId:'artifact_27',
  actionId:'action-ghost-message',targetIds:[ids[1]],clientEventId:'pendant-once'};
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',action,tokens[0])).status,401);
 assert.equal((await gm('/day-action',{...action,actorId:ids[2],clientEventId:'not-owner'})).error,'DAY_ARTIFACT_NOT_OWNED');
 assert.equal((await gm('/day-action',{...action,targetIds:[ids[0]],clientEventId:'self'})).error,'DAY_SELF_TARGET_FORBIDDEN');
 assert.equal((await me(1)).privateRoleDisclosures.length,0,'no notification before action');
 const sent=ok(await gm('/day-action',action));
 assert.equal(sent.result.delivered,true);
 assert.equal(sent.result.roleId,undefined,'action response must not contain role identity');
 assert.equal((await gm('/day-action',action)).idempotent,true);
 assert.notEqual((await gm('/day-action',{...action,clientEventId:'retry-new'})).ok,true,'quota must block second use');
 const recipient=await me(1),other=await me(2),sender=await me(0);
 assert.equal(recipient.privateRoleDisclosures.length,1);
 assert.equal(recipient.privateRoleDisclosures[0].roleId,'role_guard');
 assert.equal(recipient.privateRoleDisclosures[0].actorId,ids[0]);
 assert.equal(recipient.privateRoleDisclosures[0].matchId,matchId);
 assert.equal(other.privateRoleDisclosures.length,0,'not visible to unrelated player');
 assert.equal(sender.privateRoleDisclosures.length,0,'not part of public chat');
 assert.equal((await me(1)).privateRoleDisclosures.length,1,'reconnect/poll retains exactly one notice');
 assert.equal(JSON.stringify(ok(await req('/api/rooms/'+room.roomCode))).includes('privateRoleDisclosures'),false);
 assert.equal(JSON.stringify(ok(await req('/api/rooms/'+room.roomCode))).includes('Người gửi Mặt Dây'),false);
 console.log('PASS: #27 private role disclosure, owner/recipient, idempotency, quota, reconnect and public privacy');
}finally{await gm('/end',{force:true}).catch(()=>{})}
