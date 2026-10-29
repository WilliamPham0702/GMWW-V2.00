import test from 'node:test';
import assert from 'node:assert/strict';
import {planDayFunctionCopy} from '../src/gmww-artifact-function-copy.js';
const assignment=[{loginId:'alice',roleId:'role_guard'},
 {loginId:'bob',roleId:'role_thug'}];
const guard={loginId:'alice',roleId:'role_guard',roleCard:{name:'Bảo Vệ',
 functions:[{actionId:'action_protect',phase:'night'}]}},
 thug={loginId:'bob',roleId:'role_thug',roleCard:{name:'Du Côn',
 functions:[{id:'fn_thug_stab',actionId:'action_stab',phase:'day',
  usageMode:'onceGame',targetCount:1,noSelf:true}]}};
const args={assignments:assignment,actorId:'alice',targetId:'bob',
 actorRoles:[guard],targetRoles:[thug],now:'2026-10-29T12:00:00Z'};
test('Mirror adds supported day function #2 with fresh usage; original role and faction remain',()=>{
 const copy=planDayFunctionCopy(args);
 assert.equal(copy.ok,true);
 assert.equal(copy.roles[0].roleId,'role_guard');
 assert.equal(copy.roles[0].roleCard.functions.length,2);
 assert.equal(copy.roles[0].roleCard.functions[1].actionId,'action_stab');
 assert.equal(copy.roles[0].roleCard.functions[1].copiedFromRoleId,'role_thug');
 assert.equal(copy.roles[0].roleCard.functions[1].usageMode,'onceGame');
 assert.equal(guard.roleCard.functions.length,1);
});
test('Mirror forbids self, multiple roles, duplicate or unsupported power without side effects',()=>{
 assert.equal(planDayFunctionCopy({...args,targetId:'alice'}).ok,false);
 assert.equal(planDayFunctionCopy({...args,assignments:[...assignment,assignment[0]]}).ok,false);
 assert.equal(planDayFunctionCopy({...args,targetRoles:[{...thug,roleCard:{
  functions:[{actionId:'action_witch_kill',phase:'night'}]}}]}).ok,false);
 assert.equal(planDayFunctionCopy({...args,actorRoles:[{...guard,roleCard:{
  functions:[{actionId:'action_stab',phase:'day'}]}}]}).ok,false);
});
