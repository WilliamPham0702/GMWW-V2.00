import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionNightSpecialRoles,witchVisibleBiteTargets,witchSaveTargetAllowed}
  from '../src/gmww-witch-drunk-clone-rules.js';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';

const matchId='witch-night';
const players=Object.fromEntries(['alice','bob','carol'].map((loginId,i)=>
  ['member:'+loginId,{loginId,seatId:i+1}]));
const bite=(to,night=3)=>({matchId,night,type:'effect_notice',actionId:'action_wolf_bite',loginId:to});
const notice=(actionId,to,night=3)=>({matchId,night,type:'effect_notice',actionId,loginId:to});
const resolve=(interactions,assignments=[])=>
  resolveWolfNight({matchId,night:3,interactions,assignments,players});

test('Drunk only wakes night 3 before Old Witch; Clone only selects night 1',()=>{
  const roles=['role_witch','role_clone','role_old_witch','role_drunk','role_fairy','role_seer']
    .map(roleId=>({roleId}));
  const n1=partitionNightSpecialRoles(roles,1),n2=partitionNightSpecialRoles(roles,2),
    n3=partitionNightSpecialRoles(roles,3),n4=partitionNightSpecialRoles(roles,4);
  assert.equal(n1.drunk,null);assert.ok(n1.remaining.some(x=>x.roleId==='role_clone'));
  assert.equal(n2.drunk,null);assert.ok(!n2.remaining.some(x=>x.roleId==='role_clone'));
  assert.equal(n3.drunk?.roleId,'role_drunk');
  assert.equal(n3.oldWitch?.roleId,'role_old_witch');
  assert.equal(n3.witch?.roleId,'role_witch');
  assert.ok(!n3.remaining.some(x=>x.roleId==='role_witch'));
  assert.equal(n4.drunk,null);
});
test('Witch sees final Fairy shifted bite even when Guard protects it',()=>{
  const interactions=[bite('alice'),notice('action_protect','bob'),
    {...notice('action_transfer_bite','carol'),direction:'left'}];
  const intel=resolve(interactions);
  assert.deepEqual(witchVisibleBiteTargets(intel),['bob']);
  assert.equal(witchSaveTargetAllowed(intel,'bob'),true);
  assert.equal(witchSaveTargetAllowed(intel,'alice'),false);
});
test('Witch sees a bite on night-immune character even though it is not lethal',()=>{
  const assignments=[{loginId:'bob',roleId:'role_destroyer',
    roleCard:{flags:{nightImmune:true},factionId:'third'}}];
  const intel=resolve([bite('bob')],assignments);
  assert.deepEqual(intel.victims,[]);
  assert.deepEqual(witchVisibleBiteTargets(intel),['bob']);
});
test('Frozen Alpha hides the bite; saving that target is not legal',()=>{
  const assignments=[{roleId:'role_alpha_wolf',loginId:'alice'}];
  const intel=resolve([bite('bob'),{matchId,night:3,type:'frozen',loginId:'alice',effectActive:true}],assignments);
  assert.equal(intel.packDisabled,true);
  assert.deepEqual(witchVisibleBiteTargets(intel),[]);
  assert.equal(witchSaveTargetAllowed(intel,'bob'),false);
});
test('Witch Save and Kill use separate once-per-match ledgers in the same night',()=>{
  const card={flags:{allowMultipleActions:true},functions:[
    {id:'save',actionId:'action_witch_save',usageMode:'onceGame',usageCount:1},
    {id:'kill',actionId:'action_witch_kill',usageMode:'onceGame',usageCount:1}]};
  const save=resolveRoleActionPolicy(card,'role_witch','action_witch_save');
  const kill=resolveRoleActionPolicy(card,'role_witch','action_witch_kill');
  assert.equal(save.singleActionPerNight,false);assert.equal(kill.singleActionPerNight,false);
  const used=[{matchId,night:3,roleId:'role_witch',actorId:'witch',actionId:'action_witch_save'}];
  assert.equal(checkBattleRoleActionUsage(used,{matchId,night:3,roleId:'role_witch',actorId:'witch',
    actionId:'action_witch_kill',policy:kill}).ok,true);
  assert.equal(checkBattleRoleActionUsage(used,{matchId,night:3,roleId:'role_witch',actorId:'witch',
    actionId:'action_witch_save',policy:save}).ok,false);
});
