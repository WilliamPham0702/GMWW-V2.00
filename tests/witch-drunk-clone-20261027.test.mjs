import fs from 'node:fs';
import vm from 'node:vm';
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

test('saved GM cards migrate Witch, Drunk and Clone limits without losing artwork/audio',()=>{
  const source=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
  const start=source.indexOf('function applyWitchDrunkCloneRules(s){');
  const end=source.indexOf('function applyV221AudioGuard(s){',start);
  assert.ok(start>=0&&end>start);
  const migrate=vm.runInNewContext(source.slice(start,end)+'\napplyWitchDrunkCloneRules',{});
  const cards=[
    {id:'role_witch',flags:{allowMultipleActions:false},artworkAssetId:'art-witch',audioLinks:['witch.mp3'],
      functions:[{actionId:'action_witch_save',usageMode:'eachNight'},{actionId:'action_witch_kill',usageMode:'eachNight'}]},
    {id:'role_drunk',functions:[{actionId:'action_drunk_draw',fromNight:1,toNight:null}]},
    {id:'role_clone',functions:[{actionId:'action_clone_target',fromNight:1,toNight:null}]},
    {id:'role_guard',limits:'unchanged'}
  ];
  migrate({cards});
  assert.equal(cards[0].flags.allowMultipleActions,true);
  assert.equal(cards[0].functions[0].usageMode,'onceGame');
  assert.equal(cards[0].functions[1].usageMode,'onceGame');
  assert.match(cards[0].information,/Bảo Vệ hoặc Bất Tử Đêm/);
  assert.equal(cards[0].artworkAssetId,'art-witch');
  assert.deepEqual(cards[0].audioLinks,['witch.mp3']);
  assert.equal(cards[1].functions[0].fromNight,3);
  assert.equal(cards[1].functions[0].toNight,3);
  assert.equal(cards[2].functions[0].fromNight,1);
  assert.equal(cards[2].functions[0].toNight,1);
  assert.equal(cards[3].limits,'unchanged');
});
test('Worker and GM implement authoritative Witch target and do not advance on first potion',()=>{
  const worker=fs.readFileSync('src/index.js','utf8'),
    gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  assert.match(worker,/WITCH_SAVE_TARGET_INVALID/);
  assert.match(worker,/witchSaveTargetAllowed\(finalBite,targets\[0\]\)/);
  assert.match(worker,/partitionNightSpecialRoles\(roleTurns,n\)/);
  assert.match(gm,/turn\.roleId==='role_witch'/);
  assert.match(gm,/const biteTargets=witchAwake/);
  assert.match(gm,/textContent='MỤC TIÊU'/);
});
