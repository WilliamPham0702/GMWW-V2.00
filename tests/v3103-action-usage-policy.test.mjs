import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage,appendBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';
const context=(more={})=>({matchId:'match-1',night:2,actorId:'witch',roleId:'role_old_witch',actionId:'action_exile',...more});
const role={flags:{allowMultipleActions:false},functions:[
 {id:'exile',actionId:'action_exile',usageMode:'eachNight',usageCount:1},
 {id:'revive',actionId:'action_revive',usageMode:'onceGame',usageCount:1}]};
test('Old Witch: confirming exile blocks revival and another exile during the same night',()=>{
 let rows=[];const first=context({card:role});
 assert.equal(checkBattleRoleActionUsage(rows,first).ok,true);
 rows=appendBattleRoleActionUsage(rows,{...first,eventId:'confirmed-exile'});
 assert.equal(checkBattleRoleActionUsage(rows,context({...first,actionId:'action_revive'})).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
 assert.equal(checkBattleRoleActionUsage(rows,first).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
 assert.equal(checkBattleRoleActionUsage(rows,context({...first,night:3})).ok,true);
});
test('Old Witch legacy cards still enforce one action per night, even without flags',()=>{
 const previous=[{...context(),eventId:'legacy-action'}];
 assert.equal(checkBattleRoleActionUsage(previous,context({actionId:'action_revive'})).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
 assert.equal(checkBattleRoleActionUsage(previous,context({night:3})).ok,true);
});
test('Revival is once per game; a permitted alternative role may have multiple functions',()=>{
 const allowed={flags:{allowMultipleActions:true},functions:role.functions};
 const first=context({actorId:'a',roleId:'custom-witch',actionId:'action_revive',card:allowed});
 const next=appendBattleRoleActionUsage([],{...first,eventId:'revive'});
 assert.equal(checkBattleRoleActionUsage(next,{...first,night:3}).error,'ACTION_GAME_LIMIT_REACHED');
 assert.equal(checkBattleRoleActionUsage(next,{...first,actionId:'action_exile'}).ok,true);
});
test('Use ledger isolates players, roles and matches; undo snapshot rollback restores usage',()=>{
 const entry=context({eventId:'test'});
 const rows=appendBattleRoleActionUsage([],entry);
 assert.equal(checkBattleRoleActionUsage(rows,context({actorId:'another'})).ok,true);
 assert.equal(checkBattleRoleActionUsage(rows,context({matchId:'match-2'})).ok,true);
 assert.equal(checkBattleRoleActionUsage(rows,context({roleId:'another-role'})).ok,true);
 assert.equal(checkBattleRoleActionUsage([],entry).ok,true);
});
test('Server refuses forged action IDs for cards that provide explicit function definitions',()=>{
 const card={flags:{allowMultipleActions:false},functions:role.functions};
 const p=resolveRoleActionPolicy(card,'role_old_witch','action_invented');
 assert.equal(p.knownAction,false);
 assert.equal(checkBattleRoleActionUsage([],context({actionId:'action_invented',policy:p})).error,'INVALID_ROLE_ACTION_FOR_TURN');
});
