// Real, isolated GMWW V2 Core e2e. NEVER point this test at Production.
// The returned room URL is safe (public DTO only); GM token never printed/stored.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base='https://gmww-arena3d-core-staging.williampham0702.workers.dev';
assert.match(new URL(base).hostname,/^gmww-arena3d-core-staging\.[^.]+\.workers\.dev$/);
const suffix=Math.random().toString(36).slice(2,8);
const json=async(path,body,gmToken)=>{
  const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{accept:'application/json',
    ...(body===undefined?{}:{'content-type':'application/json'}),
    ...(gmToken?{Authorization:'Bearer '+gmToken}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{throw Error(path+' HTTP '+r.status+' '+text.slice(0,180))}
  if(!r.ok||data.ok===false)throw Error(path+' HTTP '+r.status+' '+JSON.stringify(data).slice(0,300));
  return data;
};
const sleep=n=>new Promise(ok=>setTimeout(ok,n));
const health=await json('/api/arena-staging/health');
assert.equal(health.isolated,true);assert.equal(health.durableObjects,'staging-only');
const game=await json('/api/health');
assert.equal(game.project,'GMWW-V2.00');
for(const p of ['/village/arena-3d/live.html','/village/arena-3d/live.mjs','/village/arena-3d/room-realtime.mjs']){
  const response=await fetch(base+p);assert.equal(response.status,200,p);
}
assert.equal((await fetch(base+'/api/update/manifest')).status,404,'staging never issues Runtime');
const created=await json('/api/rooms',{roomName:'Arena 3D E2E '+suffix,roomMode:'online',seatCount:6,seatMoveMode:'instant'});
const code=created.roomCode,gmToken=created.gmToken;
assert.ok(/^[A-Z0-9]+$/.test(code)&&gmToken);
const path='/api/gm/rooms/'+code+'/';
const gmEffectsPath='/api/arena-staging/rooms/'+code+'/gm-visuals';
const anonymousEffectResponse=await fetch(base+gmEffectsPath);
assert.equal(anonymousEffectResponse.status,401,'anonymous viewer must be denied private GM effects');
const forgedEffectResponse=await fetch(base+gmEffectsPath,{headers:{Authorization:'Bearer FORGED-GM'}});
assert.equal(forgedEffectResponse.status,401,'forged GM token must be denied');
const allowedEffectResponse=await fetch(base+gmEffectsPath,{headers:{Authorization:'Bearer '+gmToken}});
assert.equal(allowedEffectResponse.status,200,'authorized GM allowed');
const gmEffects=await allowedEffectResponse.json();
assert.ok(gmEffects.ok&&Array.isArray(gmEffects.effects));

const members=[];
for(let i=0;i<6;i++){
  const loginId='arst'+suffix+'p'+String(i+1);
  const account=await json('/api/members/register',{loginId,displayName:'Core '+suffix+' '+(i+1),
    gameCharacterId:'character-'+String(i+1).padStart(2,'0')});
  const joined=await json('/api/rooms/'+code+'/join',{token:account.token});
  assert.equal(joined.ok,true);
  const playerId=joined.player?.participantId;assert.ok(playerId,'server created roster entry');
  await json(path+'seat',{participantId:playerId,seatId:i+1},gmToken);
  members.push({loginId,token:account.token,participantId:playerId});
  await sleep(140);
}
const pub=await json('/api/rooms/'+code);
assert.equal(pub.players.length,6);assert.equal(pub.room.seatCount,6);
assert.ok(pub.players.every(p=>p.seatId>=1&&p.seatId<=6));
assert.ok(!JSON.stringify(pub).includes(gmToken),'GM token must not leak in public roster');
await json(path+'seat-lock',{locked:true},gmToken);
const matchId='arena-e2e-'+suffix;
await json(path+'config',{matchId,matchRevision:1,
  gameConfig:{id:'arena-phase2-e2e',name:'Làng Ma Sói Arena Thử Nghiệm',playerCount:6,
    roles:[{roleId:'villager-stage',roleName:'Dân Làng',faction:'village',count:6}],
    artifactsEnabled:false,timing:{autoAdvance:false,villageDiscussionSec:300,gallowsNominationSec:60,gallowsVoteSec:60}}},gmToken);
const dealt=await json(path+'assignments',{matchId,assignments:members.map(m=>({
  loginId:m.loginId,roleId:'villager-stage',roleName:'Dân Làng',faction:'village',
  roleCard:{name:'Dân Làng',faction:'village',information:'Vai thử nghiệm nội bộ'}}))},gmToken);
const afterDeal=await json('/api/rooms/'+code);
assert.equal(afterDeal.room.phase,'role_delivery');
assert.equal(afterDeal.players.length,6);
const pubStr=JSON.stringify(afterDeal);
assert.ok(!pubStr.includes('Vai thử nghiệm nội bộ'),'public room does not leak Role text');
await json(path+'start',{matchId},gmToken);
const night=await json(path+'cycle',{phase:'night',night:1,cycleKey:'night-1'},gmToken);
const duringNight=await fetch(base+gmEffectsPath,{headers:{Authorization:'Bearer '+gmToken}});
assert.equal(duringNight.status,200);
const privateNightPayload=await duringNight.json();
assert.equal(privateNightPayload.matchId,matchId);
assert.ok(Array.isArray(privateNightPayload.effects));
const nightPublic=await json('/api/rooms/'+code);
assert.ok(!JSON.stringify(nightPublic).includes('Vai thử nghiệm nội bộ'),'night public state does not contain secret role cards');
assert.equal(night.phase,'night');
const morning=await json(path+'cycle',{phase:'morning',night:1,cycleKey:'morning-1'},gmToken);
assert.equal(morning.phase,'morning');
const postCycle=await json('/api/rooms/'+code);
assert.equal(postCycle.room.cyclePhase,'morning');
const gallows=await json(path+'gallows',{command:'open'},gmToken);
assert.ok(gallows.gallows||gallows.ok);

const proposed=await json('/api/rooms/'+code+'/gallows',{command:'nominate',targetId:members[1].loginId},members[0].token);
assert.equal(proposed.gallows?.nominationTotals?.[0]?.votes,1);
await json(path+'gallows',{command:'begin',targetId:members[1].loginId},gmToken);
const save=await json('/api/rooms/'+code+'/gallows',{command:'vote',choice:'👍'},members[2].token);
const kill=await json('/api/rooms/'+code+'/gallows',{command:'vote',choice:'👎'},members[3].token);
assert.equal(save.gallows?.voteTotals?.save,1);
assert.equal(kill.gallows?.voteTotals?.kill,1);
const replay=await json('/api/arena-staging/rooms/'+code+'/gallows');
assert.equal(replay.gallows.voteTotals.save,1);
assert.equal(replay.gallows.voteTotals.kill,1);
assert.ok(!('votes' in replay.gallows));
assert.ok(!('nominations' in replay.gallows));
assert.ok(!('eligible' in replay.gallows));
const day=await json('/api/rooms/'+code);
assert.equal(day.players.length,6);
assert.equal(day.room.matchId,matchId);
// Independent 30-seat staging room: verify live roster at 6, 12, 20 and 30
// on the SAME real Cloudflare Core (no synthetic 3D fixture in this test).
const large=await json('/api/rooms',{roomName:'Arena 3D 30 E2E '+suffix,roomMode:'online',seatCount:30,seatMoveMode:'instant'});
const bigCode=large.roomCode;assert.ok(bigCode&&large.gmToken);
for(let i=0;i<30;i++){
  const id='ar30'+suffix+'p'+String(i+1);
  const account=await json('/api/members/register',{loginId:id,displayName:'30 Arena '+suffix+' '+(i+1),
    gameCharacterId:'character-'+String(i+1).padStart(2,'0')});
  const joined=await json('/api/rooms/'+bigCode+'/join',{token:account.token});
  assert.ok(joined.player?.participantId,'real staging member joined');
  await json('/api/gm/rooms/'+bigCode+'/seat',{participantId:joined.player.participantId,seatId:i+1},large.gmToken);
  if([5,11,19,29].includes(i)){
    const live=await json('/api/rooms/'+bigCode);
    assert.equal(live.players.length,i+1,'Core roster count at '+(i+1));
    assert.equal(new Set(live.players.map(p=>p.seatId)).size,i+1);
    assert.ok(live.players.every(p=>p.seatId>=1&&p.seatId<=30));
    console.log('PASS REAL CORE ROSTER',i+1);
  }
  await sleep(60);
}
writeFileSync('/tmp/gmww-arena3d-stage-room30.txt',bigCode+'\n');
writeFileSync('/tmp/gmww-arena3d-stage-room.txt',code+'\n');
console.log('PASS: Core staging REAL 6-member game, seat, lock, role release, GM-only private effects (401/200), running night/day, nomination, 👍/👎 and voter-safe replay.');
console.log('ACCEPTANCE_PREVIEW='+base+'/village/arena-3d/live.html?room='+code);
console.log('PLAYER_WEB='+base+'/join/'+code);
console.log('ACCEPTANCE_30='+base+'/village/arena-3d/live.html?room='+bigCode);
