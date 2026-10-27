import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {packMembers,alphaPackState,previousNightTargets,arrangeNightRoles} from '../src/gmww-pack-night-rules.js';
import {resolveWolfNight,canSnowWolfBite} from '../src/gmww-wolf-night-resolution.js';

const matchId='N02',night=2;
const assignments=[
 {loginId:'snow',roleId:'role_snow_wolf',roleName:'Sói Tuyết',faction:'Phe Sói'},
 {loginId:'alpha',roleId:'role_alpha_wolf',roleName:'Sói Trùm',faction:'Phe Sói'},
 {loginId:'wolf',roleId:'role_wolf',roleName:'Sói Thường',faction:'Phe Sói'},
 {loginId:'guard',roleId:'role_guard',faction:'Phe Dân'},
 {loginId:'fairy',roleId:'role_fairy',faction:'Phe Dân'}
];
const players=Object.fromEntries(['snow','alpha','wolf','guard','fairy','victim','previousDead'].map((loginId,i)=>[
 'member:'+loginId,{loginId,seatId:i+1}]));
const notice=(actionId,loginId,opts={})=>({
 matchId,night,type:'effect_notice',loginId,actionId,...opts
});
const dead=(loginId,n=1)=>({matchId,night:n,type:'dead',loginId,effectActive:true});
const resolve=(interactions,other={})=>resolveWolfNight({interactions,players,assignments,matchId,night,...other});

test('NIGHT-02 ordering honors Snow/Guard/pack/Fairy independent of customized order',()=>{
 const roles=[
 {roleId:'role_fairy',order:1},{roleId:'role_seer',order:2},
 {roleId:'role_snow_wolf',order:99},{roleId:'role_guard',order:88},
 {roleId:'role_wolf_seer',order:55},{roleId:'role_alpha_wolf',order:20},
 {roleId:'role_wolf',order:20}];
 const p=arrangeNightRoles(roles);
 assert.deepEqual(p.fixed.map(x=>x.roleId),['role_snow_wolf','role_guard']);
 assert.deepEqual(p.wolves.map(x=>x.roleId),['role_alpha_wolf','role_wolf','role_wolf_seer']);
 assert.equal(p.fairy.roleId,'role_fairy');
 assert.deepEqual(p.rest.map(x=>x.roleId),['role_seer']);
});
test('NIGHT-02 pack includes every living wolf including Snow; solo Snow may bite',()=>{
 assert.deepEqual(packMembers(assignments,[],matchId).map(x=>x.loginId),['snow','alpha','wolf']);
 assert.equal(canSnowWolfBite({assignments,interactions:[],matchId}),false);
 const interactions=[dead('alpha'),dead('wolf')];
 assert.deepEqual(packMembers(assignments,interactions,matchId).map(x=>x.loginId),['snow']);
 assert.equal(canSnowWolfBite({assignments,interactions,matchId}),true);
 assert.equal(canSnowWolfBite({assignments:[assignments[0],{...assignments[0],loginId:'snow2'}],interactions:[],matchId}),false);
});
test('NIGHT-02 froze Alpha: bite intent can be confirmed, nobody dies and Witch sees no victim',()=>{
 const interactions=[notice('action_wolf_bite','victim',{actorId:'wolf'}),
   {matchId,night,type:'frozen',actionId:'action_snow_wolf_freeze',actorId:'snow',loginId:'alpha',effectActive:true}];
 const result=resolve(interactions);
 assert.equal(result.ok,true);assert.equal(result.packDisabled,true);
 assert.equal(result.biteCount,1);
 assert.deepEqual(result.victims,[]);
 assert.deepEqual(result.attacked,[]);
 assert.equal(alphaPackState(assignments,interactions,matchId,night).frozen,true);
});
test('NIGHT-02 expelled Alpha disables shared bite and cannot resurrect dead Alpha effects',()=>{
 const interactions=[notice('action_wolf_bite','victim',{actorId:'wolf'}),
 {matchId,night:1,type:'expelled',loginId:'alpha',effectActive:true}];
 assert.equal(alphaPackState(assignments,interactions,matchId,night).expelled,true);
 assert.deepEqual(resolve(interactions).victims,[]);
});
test('NIGHT-02 Guard only blocks wolf bite, after Fairy redirects to final target',()=>{
 const rows=[notice('action_wolf_bite','victim',{actorId:'wolf'}),
   notice('action_transfer_bite','fairy',{actorId:'fairy',direction:'right'})];
 const unguarded=resolve(rows);
 assert.equal(unguarded.ok,true);
 const to=unguarded.transfers[0].to;
 assert.ok(to);
 const guarded=resolve([...rows,notice('action_protect',to,{actorId:'guard'})]);
 assert.deepEqual(guarded.victims,[]);
 assert.ok(guarded.blocked.includes(to));
});
test('NIGHT-02 Fairy skips anyone already dead when choosing adjacent seat, never invents a victim',()=>{
 const rows=[notice('action_wolf_bite','fairy',{actorId:'wolf'}),
   notice('action_transfer_bite','fairy',{actorId:'fairy',direction:'right'}),dead('guard')];
 const result=resolve(rows);assert.equal(result.ok,true);
 assert.equal(result.transfers[0].from,'fairy');
 assert.notEqual(result.transfers[0].to,'guard');
 assert.equal(result.transfers[0].to,'wolf');
 assert.ok(!result.victims.includes('guard'));
 const noBite=resolve([notice('action_transfer_bite','fairy',{actorId:'fairy',direction:'right'})]);
 assert.equal(noBite.biteCount,0);assert.deepEqual(noBite.victims,[]);
});
test('NIGHT-02 consecutive-night Snow freeze and Guard block only previous target',()=>{
 const usage=[{matchId,night:1,roleId:'role_snow_wolf',actorId:'snow',actionId:'action_snow_wolf_freeze',targetIds:['victim']},
 {matchId,night:1,roleId:'role_guard',actorId:'guard',actionId:'action_protect',targetIds:['fairy']}];
 assert.deepEqual(previousNightTargets(usage,{matchId,night:2,roleId:'role_snow_wolf',actorId:'snow',actionId:'action_snow_wolf_freeze'}),['victim']);
 assert.deepEqual(previousNightTargets(usage,{matchId,night:3,roleId:'role_snow_wolf',actorId:'snow',actionId:'action_snow_wolf_freeze'}),[]);
 assert.deepEqual(previousNightTargets(usage,{matchId,night:2,roleId:'role_guard',actorId:'guard',actionId:'action_protect'}),['fairy']);
});
test('NIGHT-02 GM action bar shows one common wolf bite, never private wolf powers',()=>{
 const context={};vm.runInNewContext(fs.readFileSync('server-game/current/battle-controls.js','utf8'),context);
 const api=context.GMWW_BATTLE_CONTROLS;
 const pack=api.actionsForTurn({kind:'wolf-pack-bite',loginIds:['snow','wolf','alpha']},2,{cards:[]});
 assert.equal(pack.length,1);assert.equal(pack[0].actionId,'action_wolf_bite');
 const snowy={kind:'role',roleId:'role_snow_wolf',loginIds:['snow']};
 const catalog={cards:[{id:'role_snow_wolf',functions:[{actionId:'action_snow_wolf_freeze',phase:'night'}, {actionId:'action_wolf_bite',phase:'night'}]}]};
 assert.deepEqual(Array.from(api.actionsForTurn(snowy,2,catalog),x=>x.actionId),['action_snow_wolf_freeze']);
});
