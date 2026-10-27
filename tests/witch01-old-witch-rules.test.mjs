import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {oldWitchReviveTargets,oldWitchActionCheck} from '../src/gmww-old-witch-rules.js';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage,appendBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';

const players=Object.fromEntries(['witch','victim','other'].map(loginId=>['member:'+loginId,{loginId}]));
const death=(loginId,night,cycleKey='night-'+night)=>({type:'dead',loginId,matchId:'match-1',night,cycleKey,effectActive:true});
const exile=(loginId,actorId,night)=>({type:'expelled',actionId:'action_exile',actorId,loginId,matchId:'match-1',night,effectActive:false});
const inputs=(actionId,targets,night,interactions)=>({actionId,actorId:'witch',targetIds:targets,night,matchId:'match-1',interactions,players});

test('WITCH-01 revival: only alive death records from immediately previous night/day',()=>{
 const rows=[death('victim',1),death('other',1,'morning-1')];
 assert.deepEqual(oldWitchReviveTargets(rows,{matchId:'match-1',night:2,actorId:'witch',players}).sort(),['other','victim']);
 assert.equal(oldWitchReviveTargets(rows,{matchId:'match-1',night:1,actorId:'witch',players}).length,0);
 assert.equal(oldWitchActionCheck(inputs('action_revive',['victim'],2,rows)).ok,true);
 assert.equal(oldWitchActionCheck(inputs('action_revive',['victim'],3,rows)).error,'WITCH_REVIVE_TARGET_INELIGIBLE');
 assert.equal(oldWitchActionCheck(inputs('action_revive',['witch'],2,[...rows,death('witch',1)])).error,'WITCH_SELF_TARGET');
 assert.equal(oldWitchActionCheck(inputs('action_revive',['other'],2,[{...death('other',1),effectActive:false}])).ok,false);
 assert.equal(oldWitchActionCheck(inputs('action_revive',['other'],2,[{...death('other',1),matchId:'other-match'}])).ok,false);
 assert.equal(oldWitchActionCheck(inputs('action_revive',['victim','other'],2,rows)).ok,false);
 assert.equal(oldWitchActionCheck(inputs('action_revive',['victim'],2,[death('victim',1,'night-0')])).ok,false);
});
test('WITCH-01 exile: cannot target self, dead or same person in consecutive nights',()=>{
 assert.equal(oldWitchActionCheck(inputs('action_exile',['witch'],3,[])).error,'WITCH_SELF_TARGET');
 assert.equal(oldWitchActionCheck(inputs('action_exile',['victim'],3,[death('victim',2)])).error,'WITCH_EXILE_DEAD');
 assert.equal(oldWitchActionCheck(inputs('action_exile',['victim'],3,[exile('victim','witch',2)])).error,'WITCH_CONSECUTIVE_EXILE');
 assert.equal(oldWitchActionCheck(inputs('action_exile',['victim'],4,[exile('victim','witch',2)])).ok,true);
 assert.equal(oldWitchActionCheck(inputs('action_exile',['victim'],3,[exile('victim','other',2)])).ok,true);
 assert.equal(oldWitchActionCheck(inputs('action_exile',['victim'],3,[{...exile('victim','witch',2),matchId:'other-match'}])).ok,true);
 assert.equal(oldWitchActionCheck(inputs('action_exile',['victim'],3,[exile('victim','witch',2)] ,[])).ok,false);
});
test('WITCH-01 one action per night and revive once match even with custom flags',()=>{
 const card={flags:{allowMultipleActions:true},functions:[{actionId:'action_revive',usageMode:'unlimited'}, {actionId:'action_exile',usageMode:'eachNight'}]};
 const p=resolveRoleActionPolicy(card,'role_old_witch','action_revive');
 assert.equal(p.singleActionPerNight,true);assert.equal(p.usageMode,'onceGame');
 const rows=appendBattleRoleActionUsage([],{matchId:'m',night:1,actorId:'a',roleId:'role_old_witch',actionId:'action_revive',targetIds:['b'],eventId:'one'});
 assert.deepEqual(rows[0].targetIds,['b']);
 assert.equal(checkBattleRoleActionUsage(rows,{matchId:'m',night:1,actorId:'a',roleId:'role_old_witch',actionId:'action_exile',policy:resolveRoleActionPolicy(card,'role_old_witch','action_exile')}).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
 assert.equal(checkBattleRoleActionUsage(rows,{matchId:'m',night:2,actorId:'a',roleId:'role_old_witch',actionId:'action_revive',policy:p}).error,'ACTION_GAME_LIMIT_REACHED');
 assert.equal(checkBattleRoleActionUsage(rows,{matchId:'m',night:2,actorId:'a',roleId:'role_old_witch',actionId:'action_exile',policy:resolveRoleActionPolicy(card,'role_old_witch','action_exile')}).ok,true);
});
test('WITCH-01 GM target picker hides nonprevious deaths and disabled revive until eligible',()=>{
 const context={};vm.runInNewContext(fs.readFileSync('server-game/current/battle-controls.js','utf8'),context);
 const api=context.GMWW_BATTLE_CONTROLS,action={actionId:'action_revive',roleId:'role_old_witch',type:'revive',noSelf:true,actorIds:['witch']};
 const member=loginId=>({loginId});
 assert.equal(api.targetAllowed(action,member('victim'),'dead',[death('victim',1)],2),true);
 assert.equal(api.targetAllowed(action,member('victim'),'dead',[death('victim',1)],3),false);
 assert.equal(api.targetAllowed(action,member('witch'),'dead',[death('witch',1)],2),false);
 assert.equal(api.targetAllowed(action,member('victim'),'dead',[{...death('victim',1),effectActive:false}],2),false);
 assert.equal(api.targetAllowed({...action,actionId:'action_exile',forbiddenTargets:['victim']},member('victim'),'online',[],2),false);
});
test('WITCH-01 integration source: isolated witch wake before all configured roles, Server validation before effects',()=>{
 const worker=fs.readFileSync('src/index.js','utf8'),gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
 assert.match(worker,/if\(specials\.oldWitch\)queue\.push\(specials\.oldWitch\)/);
 assert.match(worker,/groupConfiguredRoleTurns\(arranged\.rest\)/);
 assert.match(worker,/const checked=oldWitchActionCheck\(/);
 assert.ok(worker.indexOf('const checked=oldWitchActionCheck(')<worker.indexOf('const before=await snapshot()'));
 assert.match(gm,/oldWitchReviveEligible\(action,m,playSceneRuntime\.activeEffects,night\)/);
 assert.match(gm,/forbiddenTargets/);
 assert.match(worker,/WITCH_USE_BATTLE_ACTION/);
});
