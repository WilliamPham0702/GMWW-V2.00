import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CORE_ROLE_CATALOG,CORE_ACTION_CATALOG,catalogCoverage} from '../assets/village/arena-3d/stage11-core-catalog.mjs';
import {CORE_ACTION_FAMILY,coreActionFamily,coreCastingKind,coreRoleForActor,catalogAnimationCoverage} from '../assets/village/arena-3d/stage11-core-action-bridge.mjs';
import {resolveRoleAnimation} from '../assets/village/arena-3d/stage10-role-animations.mjs';
import {stageCastingCue,publicCastingState,classifyCastingAction} from '../assets/village/arena-3d/casting-choreography.mjs';
import {normalizeRitualCue} from '../assets/village/arena-3d/stage8-ritual-director.mjs';
import {createMatchSyncGate,publicMatchView} from '../assets/village/arena-3d/stage9-match-sync.mjs';
test('GĐ11 actual builtin source: exactly 28 roles, 26 actions; none unclassified',()=>{
 const src=readFileSync('server-game/src/00-core-and-library.part','utf8');
 const roles=new Set([...src.matchAll(/\bid\s*:\s*['"](role_[a-z0-9_]+)['"]/g)].map(x=>x[1]));
 const actions=new Set([...src.matchAll(/\bid\s*:\s*['"](action_[a-z0-9_]+)['"]/g)].map(x=>x[1]));
 assert.equal(CORE_ROLE_CATALOG.length,roles.size);
 assert.equal(CORE_ACTION_CATALOG.length,actions.size);
 assert.deepEqual(new Set(CORE_ROLE_CATALOG.map(x=>x.id)),roles);
 assert.deepEqual(new Set(CORE_ACTION_CATALOG.map(x=>x.id)),actions);
 for(const role of CORE_ROLE_CATALOG)for(const action of role.actionIds)assert.ok(actions.has(action));
 assert.deepEqual(catalogAnimationCoverage().unmapped,[]);
 assert.equal(catalogCoverage().builtinRoles,28);
 assert.equal(catalogCoverage().builtinActions,26);
});
test('GĐ11 wolf bite, freeze, witch save/kill, seer aura and standard actions use real Core IDs',()=>{
 const cases=[
  ['action_wolf_bite','wolf','attack','spectral-wolf-head'],
  ['action_snow_wolf_freeze','curse','attack','shadow-rune'],
  ['action_witch_save','heal','heal','sea-lotus'],
  ['action_witch_kill','attack','attack','lunar-spark'],
  ['action_aura_read','oracle','inspect','oracle-ray'],
  ['action_seer','oracle','inspect','oracle-ray'],
  ['action_protect','shield','shield','pearl-shield'],
  ['action_revive','heal','heal','sea-lotus'],
  ['action_transfer_bite','wand','inspect','arcane-ribbon']
 ];
 for(const [id,family,kind,projectile] of cases){
  assert.equal(coreActionFamily(id),family);
  assert.equal(coreCastingKind(id),kind);
  assert.equal(classifyCastingAction(id),kind);
  const p=resolveRoleAnimation({kind,roleId:'role_witch',actionId:id});
  assert.equal(p.family,family);assert.equal(p.projectile,projectile);
 }
 assert.equal(coreActionFamily('action_user_custom'),null);
 assert.equal(coreCastingKind('action_user_custom'),null);
 assert.equal(resolveRoleAnimation({kind:'attack',roleId:'role_snow_wolf',actionId:'action_wolf_bite'}).projectile,'spectral-wolf-head');
});
test('GĐ11 Core-authorized role from current turn actor, not user supplied role',()=>{
 const control={roleId:'role_witch',actorIds:['member:witch'],
  roles:[{roleId:'role_snow_wolf',actorIds:['member:wolf']}]};
 assert.equal(coreRoleForActor(control,'wolf'),'role_snow_wolf');
 assert.equal(coreRoleForActor(control,'witch'),'role_witch');
 assert.equal(coreRoleForActor(control,'intruder'),'');
 assert.equal(coreRoleForActor({roleId:'role_evil_forged',actorIds:['member:a']},'a'),'');
});
test('GĐ11 secret cast survives normalization only in authenticated GM cue',()=>{
 const now=Date.now(),room={matchId:'match-one',cycleKey:'night-2',phase:'running',cyclePhase:'night'};
 const cue=stageCastingCue({matchId:room.matchId,cycleKey:room.cycleKey,phase:'night',turnId:'t1',
  actorIds:['member:wolf'],targetIds:['member:victim'],actionId:'action_wolf_bite',
  roleId:'role_snow_wolf',kind:'attack',createdAt:now-100,expiresAt:now+3500},now);
 assert.equal(publicCastingState(room,cue,{authorizedGM:false}),null);
 assert.equal(publicCastingState({...room,cycleKey:'night-3'},cue,{authorizedGM:true}),null);
 const authorized=publicCastingState(room,cue,{authorizedGM:true});
 const clean=normalizeRitualCue(authorized,['member:wolf','member:victim'],now);
 assert.equal(clean.cast.roleId,'role_snow_wolf');
 assert.equal(clean.cast.actionId,'action_wolf_bite');
 assert.deepEqual(clean.cast.targetIds,['member:victim']);
});
test('GĐ11 staging worker captures only confirmed actions and keeps them GM-only after turn advance',()=>{
 const src=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 assert.match(src,/if\(result\?\.ok!==true\|\|result\?\.idempotent===true\)return response/);
 assert.match(src,/if\(saved\?\.phase==='night'/);
 assert.match(src,/const roleId=stageAuthorizedRoleId\(control,String\(body\?\.actorId\|\|''\)\)/);
 assert.match(src,/if\(!auth\.ok\)return auth\.response/);
 assert.match(src,/redactStagingPublicBroadcast\(payload\)/);
 assert.match(src,/familyForConfirmedAction\(\{actionId,type:body\?\.type,card,/);
});

test('GĐ11 regression: Phát Vai từ Core phải chuyển lobby -> role_delivery ngay, không mất vì duplicate gate',()=>{
 const gate=createMatchSyncGate(),players=[{id:'member:a',seatId:1,online:true}];
 const lobby={room:{code:'ABC123',matchId:'m1',phase:'lobby'},players};
 const delivered={room:{...lobby.room,phase:'role_delivery'},players};
 assert.equal(gate.accept(lobby,{source:'snapshot',now:100}).accepted,true);
 const next=gate.accept(delivered,{source:'realtime',now:200});
 assert.equal(next.accepted,true,'real role delivery must not be dropped as duplicate lobby');
 assert.equal(next.view.phase,'role_delivery');
 assert.equal(publicMatchView(delivered).phase,'role_delivery');
});
