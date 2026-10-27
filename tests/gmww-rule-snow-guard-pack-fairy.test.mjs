import test from 'node:test';
import assert from 'node:assert/strict';
import {previousNightTargets,arrangeNightRoles,packMembers,alphaPackState} from '../src/gmww-pack-night-rules.js';
import {canSnowWolfBite,resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';

const matchId='rule-check';
const usage=(roleId,actionId,night,targetIds,actorId='snow')=>({matchId,roleId,actionId,night,targetIds,actorId});
test('Snow Wolf: night N target is barred at N+1 but legal at N+2',()=>{
  const history=[usage('role_snow_wolf','action_snow_wolf_freeze',1,['p1'])];
  const args={matchId,roleId:'role_snow_wolf',actionId:'action_snow_wolf_freeze',actorId:'snow'};
  assert.deepEqual(previousNightTargets(history,{...args,night:2}),['p1']);
  assert.deepEqual(previousNightTargets(history,{...args,night:3}),[]);
  assert.deepEqual(previousNightTargets(history,{...args,night:1}),[]);
});
test('Guard: same target cannot be guarded two consecutive nights, but returns after gap',()=>{
  const history=[usage('role_guard','action_protect',4,['p2'],'guard')];
  const args={matchId,roleId:'role_guard',actionId:'action_protect',actorId:'guard'};
  assert.deepEqual(previousNightTargets(history,{...args,night:5}),['p2']);
  assert.deepEqual(previousNightTargets(history,{...args,night:6}),[]);
});
test('Snow Wolf, Guard, shared bite, other wolves and Fairy order is partitioned',()=>{
  const roles=[{roleId:'role_fairy',order:1},{roleId:'role_wolf_seer',faction:'wolf',order:6},
    {roleId:'role_guard',order:50},{roleId:'role_snow_wolf',order:99},
    {roleId:'role_seer',order:4},{roleId:'role_alpha_wolf',faction:'wolf',order:2}];
  const plan=arrangeNightRoles(roles);
  assert.deepEqual(plan.fixed.map(x=>x.roleId),['role_snow_wolf','role_guard']);
  assert.deepEqual(plan.wolves.map(x=>x.roleId),['role_alpha_wolf','role_wolf_seer']);
  assert.equal(plan.fairy.roleId,'role_fairy');
  assert.deepEqual(plan.rest.map(x=>x.roleId),['role_seer']);
});
test('shared wolf turn includes Snow Wolf even when it cannot bite',()=>{
  const assignments=[{roleId:'role_snow_wolf',loginId:'snow',faction:'wolf'},
    {roleId:'role_alpha_wolf',loginId:'alpha',faction:'wolf'}];
  assert.deepEqual(packMembers(assignments,[],matchId).map(x=>x.loginId),['snow','alpha']);
  assert.equal(canSnowWolfBite({assignments,matchId}),false);
  const dead=[{matchId,type:'dead',loginId:'alpha',effectActive:true}];
  assert.equal(canSnowWolfBite({assignments,interactions:dead,matchId}),true);
});
test('frozen Alpha disables lethal bite; bite intent remains counted',()=>{
  const assignments=[{roleId:'role_alpha_wolf',loginId:'alpha',faction:'wolf'}];
  const interactions=[{matchId,night:2,type:'frozen',loginId:'alpha',effectActive:true},
    {matchId,night:2,type:'effect_notice',actionId:'action_wolf_bite',loginId:'p1'}];
  assert.deepEqual(alphaPackState(assignments,interactions,matchId,2),{frozen:true,expelled:false});
  const result=resolveWolfNight({matchId,night:2,assignments,interactions,
    players:{'member:p1':{loginId:'p1',seatId:1}}});
  assert.equal(result.packDisabled,true);
  assert.equal(result.biteCount,1);
  assert.deepEqual(result.victims,[]);
});
test('Fairy moves to next living seat; without a choice bite does not move',()=>{
  const players=Object.fromEntries(['a','b','c','d'].map((loginId,i)=>['member:'+loginId,{loginId,seatId:i+1}]));
  const bite={matchId,night:2,type:'effect_notice',actionId:'action_wolf_bite',loginId:'a'};
  const dead={matchId,night:1,type:'dead',loginId:'b',effectActive:true};
  const transfer={matchId,night:2,type:'effect_notice',actionId:'action_transfer_bite',direction:'left',loginId:'a'};
  const moved=resolveWolfNight({matchId,night:2,players,interactions:[bite,dead,transfer]});
  assert.deepEqual(moved.victims,['c']);
  assert.deepEqual(moved.transfers,[{from:'a',to:'c',direction:'left'}]);
  const unchanged=resolveWolfNight({matchId,night:2,players,interactions:[bite,dead]});
  assert.deepEqual(unchanged.victims,['a']);
});
