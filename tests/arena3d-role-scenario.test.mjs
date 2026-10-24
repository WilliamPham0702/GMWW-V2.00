import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArenaTrialConfig,createArenaTrialAssignments,stagingRoleAction,ARENA_TRIAL_ROLE_COUNT} from '../assets/village/arena-3d/arena-acceptance-scenario.mjs';

test('Full staging scenario 6/12/20/30 people and four assigned role actions',()=>{
  for(const n of [6,12,20,30]){
    const ids=Array.from({length:n},(_,i)=>'stage'+i),config=createArenaTrialConfig(n),
      rows=createArenaTrialAssignments(ids,'m1');
    assert.equal(config.playerCount,n);assert.equal(rows.length,n);
    assert.equal(config.roles.reduce((sum,r)=>sum+r.count,0),n);
    assert.equal(new Set(rows.map(r=>r.loginId)).size,n);
    assert.equal(ARENA_TRIAL_ROLE_COUNT,4);
    assert.deepEqual(rows.slice(0,4).map(r=>r.roleId),['role_guard','role_prophet','role_witch','role_wolf']);
    assert.equal(rows.slice(4).every(r=>r.roleId==='role_villager'),true);
    for(const r of rows.slice(0,4)){
      const action=stagingRoleAction(r.roleId);
      assert.ok(action?.actionId&&action.type==='effect_notice');
      assert.ok(r.roleCard.functions.some(f=>f.actionId===action.actionId));
      assert.equal(r.roleCard.actions[0].actionId,action.actionId);
    }
    assert.equal(stagingRoleAction('role_villager'),null);
  }
  assert.throws(()=>createArenaTrialConfig(31),/6 đến 30/);
  assert.throws(()=>createArenaTrialAssignments(['a'],'x'),/6–30/);
});
test('Stage GM-only private turn state, never in WebSocket public or anonymous paths',()=>{
  const worker=readFileSync('src/arena3d-stage-worker.mjs','utf8');
  const ui=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const board=readFileSync('assets/village/arena-3d/gm-dashboard.mjs','utf8');
  assert.match(worker,/async gmNightControls\(meta\)/);
  assert.match(worker,/nightControl:await this\.gmNightControls\(meta\)/);
  assert.match(worker,/this\.gmAuthorized\(request\)/);
  assert.match(ui,/gm\('battle-action'/);
  assert.match(ui,/gm\('turn'/);
  assert.match(ui,/dashboard\.setNightControl\(data\.nightControl\|\|null\)/);
  assert.match(board,/setNightControl\(next\)/);
  assert.match(board,/if\(!hasGM\)nightControl=null/);
  assert.doesNotMatch(ui,/localStorage|sessionStorage/);
  assert.doesNotMatch(board,/innerHTML/);
});
