import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNightQueue, reserveArtifactActivation, artifactCycleKey } from '../src/gmww-game-scene-rules.js';
import { combineConfiguredTurns, timelineDisplaySteps, isAlreadyUsedArtifact } from '../src/gmww-night-turn-rules.js';
import { isBattleActorBlocked } from '../src/gmww-battle-actor-eligibility.js';

// Integration audit harness: uses production scheduling/Artifact rule functions.
// The DO integration tests validate real freeze/disable expiry across nights.
// These scheduling tests do not establish protection or Yêu Tinh precedence.
const roles = [
  {kind:'role',name:'Sói Tuyết',playerId:'wolf',order:1},
  {kind:'role',name:'Bảo Vệ',playerId:'guard',order:2},
  {kind:'role',name:'Tiên Tri',playerId:'seer',order:3}
];
const artifact={kind:'artifact-main',name:'Đá Đổi Vai Trò',artifactName:'Đá Đổi Vai Trò',artifactId:'swap',playerId:'seer',order:0};
function runNight(night, owners, accepted=[]) {
  const normalTurns=combineConfiguredTurns(roles,[artifact]);
  const queue=buildNightQueue({night,normalTurns,artifactOwners:owners});
  return {queue,display:timelineDisplaySteps(queue),accepted};
}
test('multi-night: real queue preserves order and early Artifact window each night',()=>{
  for(const night of [1,2,3,4]){
    const owners=[{playerId:'seer',artifactId:'swap',artifactName:'Đá Đổi Vai Trò',priorityFirst:true,used:false}];
    const {queue,display}=runNight(night,owners);
    const introCount=night===1?1:0;
    assert.equal(queue.filter(x=>x.kind==='wolf-introduction').length,introCount,
      'Bầy Sói is introduced on night one only');
    assert.equal(display.filter(x=>x.kind==='wolf-introduction').length,introCount,
      'Timeline projection must not reinsert Bầy Sói on later nights');
    assert.equal(queue[0].kind,night===1?'wolf-introduction':'early-artifact-window');
    assert.equal(queue.filter(x=>x.kind==='early-artifact-window').length,1);
    assert.equal(queue.at(-1).kind,'village-wakeup');
    assert.equal(display.filter(x=>x.kind==='early-artifact-window').length,1);
    assert.equal(display.find(x=>x.kind==='early-artifact-window').actions.length,1);
    assert.deepEqual(queue.filter(x=>x.kind==='role').map(x=>x.playerId),['wolf','guard','seer']);
  }
});
test('multi-night: early Artifact activation is idempotent and isolated by cycle',()=>{
  for(const night of [1,2,3]){
    const cycleKey=artifactCycleKey('simulation-only',night);
    const args={requestId:'req-'+night,playerId:'seer',artifactId:'swap',cycleKey,eligible:true,limit:3};
    const first=reserveArtifactActivation(null,args);
    assert.equal(first.ok,true);
    const duplicate=reserveArtifactActivation(first.state,args);
    assert.equal(duplicate.ok,true);
    assert.equal(duplicate.idempotent,true);
    assert.equal(reserveArtifactActivation(first.state,{...args,requestId:'another'}).error,'ARTIFACT_ALREADY_USED');
    assert.equal(reserveArtifactActivation(first.state,{...args,cycleKey:artifactCycleKey('simulation-only',night+1)}).error,'CYCLE_MISMATCH');
  }
});
test('multi-night: consumed Artifact is omitted from normal queue',()=>{
  const owners=[{playerId:'seer',artifactId:'swap',artifactName:'Đá Đổi Vai Trò',priorityFirst:true,used:true}];
  for(const night of [1,2,3]){
    const {queue}=runNight(night,owners);
    assert.equal(queue.some(x=>x.artifactId==='swap'),false);
    assert.equal(queue.find(x=>x.kind==='early-artifact-window').actions.length,0);
  }
});
test('audit: real policy blocks frozen actors and honours expired effects',()=>{
  const row={type:'frozen',loginId:'seer',matchId:'simulation-only',effectActive:true};
  const args={actorId:'seer',matchId:'simulation-only'};
  assert.equal(isBattleActorBlocked([row],args),true);
  assert.equal(isBattleActorBlocked([{...row,effectActive:false}],args),false);
  // See v389-night-runtime-integration.test.mjs for actual Durable Object
  // confirmation/rollback and multi-night expiration sequence tests.
});

test('Timeline projections of later nights do not manufacture an absent wolf introduction',()=>{
  const withoutIntro=[{kind:'early-artifact-window',label:'Artifact đầu ván',actions:[]},
    {kind:'role',label:'Tiên Tri',playerId:'seer'},{kind:'village-wakeup',label:'Làng ơi dậy đi'}];
  const projected=timelineDisplaySteps(withoutIntro);
  assert.deepEqual(projected.map(x=>x.kind),withoutIntro.map(x=>x.kind));
  assert.equal(projected.filter(x=>x.kind==='village-wakeup').length,1);
});

test('Legacy night-one presentation keeps the Bầy Sói introduction exactly once',()=>{
  const queue=buildNightQueue({night:1,normalTurns:[]});
  const display=timelineDisplaySteps(queue);
  assert.equal(display.filter(x=>x.kind==='wolf-introduction').length,1);
  assert.equal(display.filter(x=>x.kind==='early-artifact-window').length,0);
  assert.equal(display.at(-1).kind,'village-wakeup');
});
