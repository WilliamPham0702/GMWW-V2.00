// Local workerd/SQLite only. No browsers, heartbeats or Production mutations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const token=fs.readFileSync('src/index.js','utf8').match(/const GM_SYNC_TOKEN="([^"]+)"/)[1];
const req=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();assert.ok(r.ok,path+': '+JSON.stringify(d));return d};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const serial=Date.now().toString(36),people=Array.from({length:8},(_,i)=>({loginId:'srv'+i+serial,displayName:'Server '+i+' '+serial,seatId:i+1}));
for(const p of people)await req('/api/members/register',{...p,gameCharacterId:'character-01'});
const accountSnapshot=members=>members.filter(x=>people.some(p=>p.loginId===x.loginId)).map(({loginId,stats,history,currentRoomCode,ready,lastHeartbeatAt,lastSeenAt})=>({loginId,stats,history,currentRoomCode,ready,lastHeartbeatAt,lastSeenAt})).sort((a,b)=>a.loginId.localeCompare(b.loginId));
const before=accountSnapshot((await req('/api/gm/members')).members);
const fn=(id,name)=>({id,actionId:id,name,phase:'night',targetCount:1,noSelf:true,usageMode:'eachNight',usageCount:1});
const cards=[{id:'role_werewolf',name:'Sói',faction:'Phe Sói',functions:[fn('action_wolf_bite','Cắn')]},{id:'role_seer',name:'Tiên Tri',faction:'Phe Dân',functions:[fn('action_seer','Soi')]},{id:'role_guard',name:'Bảo Vệ',faction:'Phe Dân',functions:[fn('action_protect','Bảo Vệ')]},{id:'role_witch',name:'Phù Thuỷ',faction:'Phe Dân',flags:{allowMultipleActions:true},functions:[{...fn('action_witch_kill','Giết'),usageMode:'onceGame'}]},{id:'role_villager',name:'Dân',faction:'Phe Dân',functions:[]}];
for(const card of cards)card.actions=card.functions.map(fn=>({id:fn.actionId,name:fn.name}));
const cfg={id:'server-test',name:'DEMO autonomous',playerCount:8,roles:cards.map((c,i)=>({roleId:c.id,roleName:c.name,count:i===4?4:1,order:i+1,actionDurationSec:4})),artifactsEnabled:false,timing:{wolfDiscussionSec:20,defaultActionSec:4,villageDiscussionSec:2,gallowsNominationSec:10,gallowsVoteSec:10}};
const created=await req('/api/rooms',{demo:true,roomName:'Server DEMO',roomMode:'offline',seatCount:8,gameConfig:cfg}),code=created.roomCode,gm=(p,b)=>req('/api/gm/rooms/'+code+p,b),matchId='server-'+serial;
try{
 assert.ok((await req('/api/rooms')).rooms.some(r=>r.code===code&&r.demo===true),'open DEMO is visible in room directory');
 await gm('/participants',{members:people,replace:true});await gm('/seat-lock',{locked:true});
 await gm('/assignments',{matchId,assignments:people.map((p,i)=>({...p,roleId:cards[Math.min(i,4)].id,roleName:cards[Math.min(i,4)].name,faction:cards[Math.min(i,4)].faction,roleCard:cards[Math.min(i,4)]}))});
 await gm('/start',{matchId});
 const started=await gm('');assert.equal(started.demoControl.engine,'server');assert.equal(started.demoControl.running,true);
 // No client requests at all: exceeds the old browser lease's 15 seconds.
 await wait(16500);
 const absent=await gm('');assert.equal(absent.demoControl.running,true);assert.equal(absent.room.cyclePhase,'night');assert.ok(absent.demoControl.clock.remainingMs<5000,'Server clock keeps progressing without heartbeat');
 await gm('/demo',{command:'stop'});const paused=await gm('');await wait(500);assert.equal((await gm('')).demoControl.clock.remainingMs,paused.demoControl.clock.remainingMs);
 await gm('/demo',{command:'speed',speed:10});await gm('/demo',{command:'start'});
 let actions=[],votes=false,winner=false,deadline=Date.now()+45000;
 while(Date.now()<deadline){
  await wait(350);const s=await gm('');assert.equal(s.demoControl.error,'');
  for(const row of s.battleActionUsage||[]){
   if(!actions.includes(row.actionId))actions.push(row.actionId);
   if(row.actionId==='action_witch_kill')
    assert.ok(Number(row.night)>=2,'DEMO Witch must not use the kill potion on night 1');
  }
  votes ||= Object.keys(s.gallows?.votes||{}).length>0;
  if(s.winProposal){winner=true;assert.equal(s.room.phase,'running','GM still confirms completion');let stopped=s,untilStop=Date.now()+5000;while(stopped.demoControl.running&&Date.now()<untilStop){await wait(150);stopped=await gm('')}assert.equal(stopped.demoControl.running,false,'server must stop DEMO within 5 seconds after confirmed winner');break}
 }
 assert.ok(actions.includes('action_wolf_bite'),'wolf bite via real handler');assert.ok(actions.includes('action_seer'),'mandatory seer');assert.ok(actions.includes('action_protect'),'mandatory guard');/* Witch kill is optional; night-one use is forbidden. */assert.ok(winner,'autonomous game reaches winner');
 const end=await gm('/end',{matchId,winnerFaction:(await gm('')).winProposal.winnerFaction});assert.equal(end.ok,true);
 assert.deepEqual(accountSnapshot((await req('/api/gm/members')).members),before,'Demo never changes member stats/history/presence');
 assert.ok(!(await req('/api/rooms')).rooms.some(r=>r.code===code),'ended DEMO is absent from open room directory');
 // Separate day fixture exercises voting regardless of how early the first game ends.
 const dayRoom=await req('/api/rooms',{demo:true,roomName:'Server day test',roomMode:'online',seatCount:8,gameConfig:cfg}),day=(p,b)=>req('/api/gm/rooms/'+dayRoom.roomCode+p,b),dayMatch='day-'+serial;
 try{
  await day('/participants',{members:people,replace:true});await day('/seat-lock',{locked:true});
  await day('/assignments',{matchId:dayMatch,assignments:people.map((p,i)=>({...p,roleId:cards[i===0?0:4].id,roleName:cards[i===0?0:4].name,faction:cards[i===0?0:4].faction,roleCard:cards[i===0?0:4]}))});
  await day('/start',{matchId:dayMatch});await day('/demo',{command:'speed',speed:2});await day('/cycle',{phase:'morning',night:1,cycleKey:'morning-1'});
  // V3.203: Gallows ignores legacy Ván Mẫu timing. Configure the two
  // per-stage 12-second timers through the real GM endpoint for this test.
  await day('/gallows',{command:'set_duration',kind:'nomination',seconds:12});
  await day('/gallows',{command:'set_duration',kind:'vote',seconds:12});
  await day('/gallows',{command:'open'});await day('/gallows',{command:'begin',targetId:people[0].loginId});
  let observedVotes=false,finished=false,manual=false;const until=Date.now()+15000;
  while(Date.now()<until){
   await wait(200);const state=await day('');assert.equal(state.demoControl.error,'');
   if(state.gallows?.stage==='voting'&&Object.keys(state.gallows.votes||{}).length){
    observedVotes=true;
    if(!manual){
     // V3.192: switch into the new GM-only direct verdict (not the old
     // per-voter manual ballot). Player Web must never receive manual ballots.
     await day('/demo',{command:'stop'});
     const switched=await day('/gallows',{command:'mode',mode:'gm'});
     assert.equal(switched.gallows.mode,'gm');
     assert.equal(switched.gallows.stage,'ready');
     assert.deepEqual(switched.gallows.votes,{},'switch must discard automatic receipts');
     const resolved=await day('/gallows',{command:'resolve',targetId:people[0].loginId,outcome:'dead'});
     assert.equal(resolved.gallows.stage,'resolved');
     assert.equal(resolved.gallows.candidateId,people[0].loginId);
     assert.equal(resolved.gallows.outcome,'dead');
     manual=true;
    }
   }
   if(state.winProposal){finished=true;break}
  }
  assert.ok(observedVotes,'server casts actual gallows votes without browser');
  assert.ok(manual,'GM can directly resolve after switching modes');
  assert.ok(finished,'direct GM verdict kills the final wolf and produces a winner');
  assert.deepEqual(accountSnapshot((await req('/api/gm/members')).members),before);
 }finally{await day('/delete',{}).catch(()=>{})}

 console.log('PASS server-owned DEMO: no client for >15s, clocks, pause/resume/speed, mandatory actions, gallows, winner, member isolation');
}finally{await gm('/delete',{}).catch(()=>{})}
