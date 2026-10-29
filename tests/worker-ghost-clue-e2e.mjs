// Hồn Ma: private pending clue, authenticated actor and GM-only publication.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const catalog=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
const serial=Date.now().toString(36),matchId='ghost-'+serial;
async function req(route,body,token){
 const r=await fetch(base+route,{method:body?'POST':'GET',
 headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
 body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 return {status:r.status,...await r.json()};
}
const ok=x=>{assert.equal(x.ok,true,JSON.stringify(x));return x};
const room=ok(await req('/api/rooms',{roomName:'Ghost clue '+serial,seatCount:8}));
const gm=(path,body)=>req('/api/gm/rooms/'+room.roomCode+path,body,room.gmToken);
const ids=[],sessions=[];
try{
 for(let i=0;i<8;i++){
  const loginId='g'+i+serial;ids.push(loginId);
  ok(await req('/api/members/register',{loginId,displayName:'G'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));sessions.push(session.token);
  ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));
  ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const roles=['role_ghost','role_villager','role_villager','role_villager',
   'role_villager','role_villager','role_wolf','role_wolf'];
 ok(await gm('/assignments',{matchId,assignments:ids.map((loginId,i)=>{
   const role=catalog.find(x=>x.id===roles[i]);
   return {loginId,roleId:role.id,roleName:role.name,roleCard:role,
     faction:i>=6?'wolf':'village'};
 })}));
 ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 const endpoint='/api/rooms/'+room.roomCode+'/ghost-clue';
 assert.equal((await req(endpoint,{text:'Sói'},sessions[1])).error,'GHOST_ROLE_REQUIRED');
 assert.equal((await req(endpoint,{text:'Sói'},sessions[0])).error,'GHOST_MUST_BE_DEAD');
 ok(await gm('/interaction',{type:'dead',loginId:ids[0],clientEventId:'ghost-death'}));
 assert.equal((await req(endpoint,{text:'Hai Sói'},sessions[0])).error,'GHOST_ONE_WORD_ONLY');
 const sent=ok(await req(endpoint,{text:'Sói'},sessions[0]));
 assert.equal(sent.clue.status,'pending');
 assert.equal(ok(await req(endpoint,{text:'Sói'},sessions[0])).idempotent,true);
 assert.equal((await req(endpoint,{text:'Dân'},sessions[0])).error,'GHOST_ALREADY_SENT_TODAY');
 const me=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,sessions[0]));
 assert.equal(me.ghostClue.text,'Sói');
 const stranger=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,sessions[1]));
 assert.equal(stranger.ghostClue,null,'pending clue must be private');
 const publicBefore=ok(await req('/api/rooms/'+room.roomCode));
 assert.equal(JSON.stringify(publicBefore).includes('ghostClue'),false);
 const gmState=ok(await gm(''));
 assert.equal(gmState.ghostClues.some(x=>x.id===sent.clue.id&&x.text==='Sói'),true);
 assert.equal((await req('/api/gm/rooms/'+room.roomCode+'/ghost-clue',{
  actorId:ids[0],day:1,decision:'approve'},sessions[0])).status,401);
 const result=ok(await gm('/ghost-clue',{actorId:ids[0],day:1,decision:'approve'}));
 assert.equal(result.clue.status,'approved');
 assert.equal((await gm('/ghost-clue',{actorId:ids[0],day:1,decision:'approve'})).status,409);
 console.log('PASS: Ghost one-word clue, owner-only draft, GM moderation, daily quota and no public pending leak');
}finally{await gm('/end',{force:true}).catch(()=>{})}
