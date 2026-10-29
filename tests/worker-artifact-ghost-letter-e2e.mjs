// Khăn Hồn Ma (#34): real HTTP and SQLite, one private Unicode character.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='ghost-letter-'+serial;
async function req(path,body,token){
 const r=await fetch(base+path,{method:body?'POST':'GET',
  headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=x=>{assert.equal(x.ok,true,JSON.stringify(x));return x};
const room=ok(await req('/api/rooms',{roomName:'Ghost letter '+serial,seatCount:8,
 gameConfig:{artifactsEnabled:true,artifactLimitPerCycle:6}}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],tokens=[];
try{
 for(let i=0;i<8;i++){
  const loginId='h'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'H'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assigned=ids.map((loginId,i)=>{
  const roleId=i>=6?'role_wolf':'role_villager',role=catalog.find(x=>x.id===roleId),
    art=i===0?catalog.find(x=>x.id==='artifact_34'):null;
  return {loginId,roleId,roleName:role.name,roleCard:role,
   faction:i>=6?'wolf':'village',
   ...(art?{artifact:{artifactId:art.id,artifactName:art.name,
     singleUse:true,artifactCard:art}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments:assigned}));
 ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 ok(await gm('/interaction',{type:'dead',loginId:ids[1],night:1,clientEventId:'dead-previous-day'}));
 const action={matchId,cycleKey:'morning-1',actorId:ids[0],
  artifactId:'artifact_34',actionId:'action-ghost-message',
  targetIds:[ids[1]],clientEventId:'too-early'};
 assert.equal((await gm('/day-action',action)).error,'GHOST_LETTER_PREVIOUS_DAY_REQUIRED');
 ok(await gm('/cycle',{phase:'morning',night:2,cycleKey:'morning-2'}));
 const ready={...action,cycleKey:'morning-2',clientEventId:'request-letter'};
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/day-action',ready,tokens[0])).status,401);
 const sent=ok(await gm('/day-action',ready));
 assert.equal(sent.result.letterRequested,true);
 assert.equal(ok(await gm('/day-action',ready)).idempotent,true);
 const me=i=>req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[i]).then(ok);
 const owner=await me(0),target=await me(1),stranger=await me(2);
 assert.equal(owner.ghostLetterInbox.status,'pending');
 assert.equal(target.ghostLetterPrompts.length,1);
 assert.equal(stranger.ghostLetterInbox,null);
 assert.equal(stranger.ghostLetterPrompts.length,0);
 const requestId=target.ghostLetterPrompts[0].requestId,
  route='/api/rooms/'+room.roomCode+'/ghost-letter';
 assert.equal((await req(route,{requestId,letter:'Q'},tokens[2])).status,404);
 assert.equal((await req(route,{requestId,letter:'Sói'},tokens[1])).error,
  'GHOST_LETTER_ONE_CHARACTER_REQUIRED');
 const reply=ok(await req(route,{requestId,letter:'Đ'},tokens[1]));
 assert.equal(reply.status,'responded');
 assert.equal(ok(await req(route,{requestId,letter:'Đ'},tokens[1])).idempotent,true);
 assert.equal((await req(route,{requestId,letter:'X'},tokens[1])).status,409);
 assert.equal((await me(0)).ghostLetterInbox.letter,'Đ');
 assert.equal((await me(2)).ghostLetterInbox,null);
 const publicState=ok(await req('/api/rooms/'+room.roomCode));
 assert.equal(JSON.stringify(publicState).includes('ghostLetterInbox'),false);
 assert.equal(JSON.stringify(publicState).includes('ghostLetterPrompts'),false);
 console.log('PASS: #34 prior-day dead target, private letter, authentication, quota, reconnect and no public leak');
}finally{await gm('/end',{force:true}).catch(()=>{})}
