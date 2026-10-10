import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {combineConfiguredTurns,jumpTarget,isAlreadyUsedArtifact} from '../src/gmww-night-turn-rules.js';
await import('../server-game/current/battle-controls.js');
const battle=globalThis.GMWW_BATTLE_CONTROLS;
test('roles and Artifacts share numeric configured order, but no hardcoded artifact position',()=>{
  const roles=[{kind:'role',id:'seer',order:3},{kind:'role',id:'guard',order:1}];
  const artifacts=[{kind:'artifact-main',id:'mirror',order:2},{kind:'artifact-main',id:'stone',order:4}];
  assert.deepEqual(combineConfiguredTurns(roles,artifacts).map(t=>t.id),['guard','mirror','seer','stone']);
  assert.deepEqual(combineConfiguredTurns([{id:'r',order:1}],[{id:'a'}]).map(t=>t.id),['r','a']);
});
test('only a valid configured turn index may be requested',()=>{
  const q=[{id:'wolf-introduction'},{id:'role:seer'},{id:'artifact:x'}];
  assert.equal(jumpTarget(q,1)?.id,'role:seer');
  assert.equal(jumpTarget(q,4),null);
  assert.equal(jumpTarget(q,-1),null);
  assert.equal(jumpTarget(q,1.5),null);
  assert.equal(jumpTarget(q,NaN),null);
});
test('used early-priority Artifact is blocked in its regular slot and hidden from timeline',()=>{
  const used=[{artifactId:'mirror',playerId:'member:a'}],start={kind:'early-artifact',artifactId:'mirror',playerId:'member:a'};
  const main={...start,kind:'artifact-main'};
  assert.equal(isAlreadyUsedArtifact(used,main),true);
  assert.equal(battle.artifactUsed(used,main),true);
  assert.equal(battle.artifactUsed(used,{...main,playerId:'member:b'}),false);
  const t=battle.timeline('night',{queue:[{kind:'wolf-introduction',id:'wolf'},{...start,id:'early'},{...main,id:'main'}],cursor:2,completed:false},1,used);
  assert.deepEqual(t.slice(0,3).map(v=>v.status),['completed','used','used']);
});
test('countdown follows persisted per-turn duration and authoritative server deadline',()=>{
  const now=Date.parse('2026-10-10T10:00:00Z');
  const rt={queue:[{id:'r',kind:'role',durationSec:30,startedAt:'2026-10-10T09:59:50Z'}],cursor:0,completed:false,deadlineAt:'2026-10-10T10:00:20Z'};
  assert.equal(battle.remainingSeconds(rt,now),20);
  assert.equal(battle.remainingSeconds(rt,now+21000),0);
  assert.equal(battle.formatTime(125),'02:05');
  rt.deadlineAt=null;rt.autoPausedRemainingMs=11000;
  assert.equal(battle.remainingSeconds(rt,now),11);
  rt.autoPausedRemainingMs=0;
  assert.equal(battle.remainingSeconds(rt,now),20);
  assert.equal(battle.remainingSeconds({...rt,queue:[{id:'r',kind:'role',durationSec:0}]},now),null);
});
test('GM server rejects stale/invalid navigation and reused artifact effects',()=>{
  const server=fs.readFileSync('src/index.js','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8'),html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(server,/combineConfiguredTurns\(roleTurns,artifactTurns\)/);
  assert.match(server,/action==="jump"/);
  assert.match(server,/expectedTurnId/);
  assert.match(server,/ARTIFACT_ALREADY_USED/);
  assert.match(server,/this\.artifactUsedInNight\(meta,next\)/);
  assert.match(app,/data-battle-index/);
  assert.match(app,/battleNavigateRelative/);
  assert.match(app,/battleNavigateIndex/);
  assert.match(app,/battleTickCountdown/);
  assert.match(app,/battleUsed\(t\)\?'Artifact đã sử dụng/);
  assert.match(html,/id="battleCountdown"/);
});
