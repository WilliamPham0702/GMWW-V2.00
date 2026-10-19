import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizePlayerRoleCard,sanitizePlayerArtifactCard} from '../src/gmww-private-card-contract.js';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';

test('Day-role function phases and post-death restrictions survive private card sanitization',()=>{
  const card=sanitizePlayerRoleCard({functions:[{id:'fn_thug_stab',actionId:'action_stab',
    phase:'day',usageMode:'onceGame',usageCount:1,targetCount:1,allowDead:false,noSelf:true,
    actorMayBeDead:false,effectIds:['effect_stab']}]});
  const fn=card.functions[0];
  assert.equal(fn.phase,'day');assert.equal(fn.targetCount,1);
  assert.deepEqual(fn.effectIds,['effect_stab']);
  assert.equal(fn.actorMayBeDead,false);
  const art=sanitizePlayerArtifactCard({actions:[{id:'ritual',name:'Ritual',phase:'day',actorMayBeDead:true}]});
  assert.equal(art.actions[0].phase,'day');
  assert.equal(art.actions[0].actorMayBeDead,true);
});
test('nGame rule uses total lifetime quota instead of resetting after each night',()=>{
 const card={functions:[{id:'fn_bear_scan',actionId:'action_bear_scan',usageMode:'nGame',usageCount:2}]};
 const policy=resolveRoleActionPolicy(card,'role_bear','action_bear_scan');
 assert.equal(policy.usageMode,'nGame');
 const one={matchId:'m1',roleId:'role_bear',actorId:'bear',actionId:'action_bear_scan',night:1};
 assert.equal(checkBattleRoleActionUsage([one],{...one,night:2,policy}).ok,true);
 assert.equal(checkBattleRoleActionUsage([one,{...one,night:2}],{...one,night:3,policy}).error,'ACTION_GAME_LIMIT_REACHED');
});
