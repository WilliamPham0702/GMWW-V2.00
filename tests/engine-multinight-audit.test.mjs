import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNightQueue, reserveArtifactActivation, artifactCycleKey} from '../src/gmww-game-scene-rules.js';
import {combineConfiguredTurns} from '../src/gmww-night-turn-rules.js';
const roles=[{kind:'role',playerId:'wolf',order:1},{kind:'role',playerId:'guard',order:2},{kind:'role',playerId:'seer',order:3}];
const artifact={kind:'artifact-main',playerId:'seer',artifactId:'swap',artifactName:'Đá Đổi Vai Trò',order:0};
test('Production timeline functions build a consistent multi-night queue',()=>{
 for(let night=1;night<=10;night++){
  const owners=[{playerId:'seer',artifactId:'swap',artifactName:'Đá Đổi Vai Trò',priorityFirst:true,used:false}];
  const q=buildNightQueue({night,normalTurns:combineConfiguredTurns(roles,[artifact]),artifactOwners:owners});
  assert.equal(q[0].kind,'wolf-introduction');
  assert.equal(q[1].kind,'early-artifact-window');
  assert.equal(q.at(-1).kind,'village-wakeup');
  assert.deepEqual(q.filter(x=>x.kind==='role').map(x=>x.playerId),['wolf','guard','seer']);
 }
});
test('Artifact reservation is idempotent and isolated between night cycles',()=>{
 for(let night=1;night<=10;night++){
  const cycleKey=artifactCycleKey('lab-only',night);
  const input={requestId:'request-'+night,playerId:'seer',artifactId:'swap',cycleKey,eligible:true,limit:3};
  const first=reserveArtifactActivation(null,input);
  assert.equal(first.ok,true);
  assert.equal(reserveArtifactActivation(first.state,input).idempotent,true);
  assert.equal(reserveArtifactActivation(first.state,{...input,requestId:'another'}).error,'ARTIFACT_ALREADY_USED');
 }
});
