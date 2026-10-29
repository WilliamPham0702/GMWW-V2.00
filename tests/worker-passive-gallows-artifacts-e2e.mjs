import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname));
const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json')).cards;
async function req(p,b,t){const r=await fetch(base+p,{method:b?'POST':'GET',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined,signal:AbortSignal.timeout(15000)});return {status:r.status,...await r.json()}}
const ok=d=>{assert.equal(d.ok,true,JSON.stringify(d));return d};
const serial=Date.now().toString(36),ids=[],tokens=[],matchId='passive-'+serial;
const room=ok(await req('/api/rooms',{roomName:'Passive Gallows '+serial,seatCount:8}));
const gm=(p,b)=>req('/api/gm/rooms/'+room.roomCode+p,b,room.gmToken);
const vote=(i,b)=>req('/api/rooms/'+room.roomCode+'/gallows',b,tokens[i]);
try{
 for(let i=0;i<8;i++){
  const loginId='v'+i+serial;ids.push(loginId);ok(await req('/api/members/register',{loginId,displayName:'V'+i+serial,gameCharacterId:'character-01'}));
  const session=ok(await req('/api/members/login',{loginId}));tokens.push(session.token);ok(await req('/api/rooms/'+room.roomCode+'/join',{token:session.token}));ok(await gm('/seat',{loginId,seatId:i+1}));
 }
 const assignments=ids.map((loginId,i)=>{
  const roleId=[4,5].includes(i)?'role_wolf':'role_villager',card=cards.find(c=>c.id===roleId),art=cards.find(c=>c.id===(i===0?'artifact_43':i===3?'artifact_12':'none'));
  return {loginId,roleId,roleName:card.name,faction:[4,5].includes(i)?'wolf':'village',roleCard:card,...(art?{artifact:{artifactId:art.id,artifactName:art.name,artifactCard:art}}:{})};
 });
 ok(await gm('/assignments',{matchId,assignments}));ok(await gm('/start',{matchId}));ok(await gm('/auto',{enabled:false}));
 ok(await gm('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'}));
 for(const i of [0,1])ok(await gm('/interaction',{loginId:ids[i],type:'dead'}));
 let ballot=ok(await gm('/gallows',{command:'open'})).gallows;
 assert.equal(ballot.eligible.includes(ids[0]),false,'dead holder cannot be nominated');
 assert.equal(ballot.voteEligible.includes(ids[0]),true,'Artifact holder remains a voter');
 assert.equal(ballot.voteEligible.includes(ids[1]),false,'ordinary dead player remains excluded');
 assert.equal((await vote(0,{command:'nominate',targetId:ids[3]})).error,'VOTER_NOT_ELIGIBLE');
 ok(await vote(2,{command:'nominate',targetId:ids[3]}));ok(await gm('/gallows',{command:'close_nomination'}));
 ok(await gm('/gallows',{command:'begin',targetId:ids[3]}));
 ok(await vote(0,{command:'vote',choice:'👍'}));ok(await vote(0,{command:'vote',choice:'👍'}));
 assert.equal(ok(await gm('')).gallows.voteTotals.cast,1,'retry cannot add another vote');
 assert.equal((await vote(1,{command:'vote',choice:'👍'})).error,'VOTER_NOT_ELIGIBLE');
 ok(await gm('/gallows',{command:'restriction',targetId:ids[0],kind:'vote',banned:true}));
 assert.equal((await vote(0,{command:'vote',choice:'👍'})).error,'VOTER_BANNED');
 ok(await gm('/gallows',{command:'restriction',targetId:ids[0],kind:'vote',banned:false}));
 ok(await vote(0,{command:'vote',choice:'👍'}));
 for(const i of [2,4,5])ok(await vote(i,{command:'vote',choice:'👎'}));
 ballot=ok(await gm('/gallows',{command:'close_vote'})).gallows;
 assert.equal(ballot.outcome,'alive','Prince Cloak blocks even a kill-majority forced close');
 assert.equal(ok(await gm('')).activeEffects.some(x=>x.loginId===ids[3]&&x.type==='dead'),false);
 const reconnect=ok(await req('/api/rooms/'+room.roomCode+'/me',undefined,tokens[0]));
 assert.equal(reconnect.gallows.votes[ids[0]],'👍');
 ok(await gm('/gallows',{command:'restore'}));ok(await gm('/gallows',{command:'mode',mode:'gm'}));
 ok(await gm('/gallows',{command:'hang',targetId:ids[3]}));
 ballot=ok(await gm('/gallows',{command:'resolve',targetId:ids[3],outcome:'dead'})).gallows;
 assert.equal(ballot.outcome,'alive','Prince Cloak also blocks direct GM execution');
 assert.ok(ok(await gm('')).activeEffects.some(x=>x.loginId===ids[0]&&x.type==='dead'),'voting does not revive the holder');
 console.log('PASS: Underworld Ballot dead voting without nomination/revival, bans, retries and reconnect; Prince Cloak survives automatic and manual verdicts');
}finally{await gm('/end',{force:true}).catch(()=>{})}
