import test from 'node:test';
import assert from 'node:assert/strict';
import {targetsFor} from '../src/gmww-demo-runner.js';
const alice={loginId:'alice'},bob={loginId:'bob'},carol={loginId:'carol'};
const assign=[{loginId:'alice',roleId:'role_guard',artifactId:'artifact_32'},
 {loginId:'bob',roleId:'role_thug',artifactId:'artifact_09'},
 {loginId:'carol',roleId:'role_villager',artifactId:'artifact_35'}];
const fn={actionId:'artifact_action_check_villager',phase:'day',
 targetCount:1,usageMode:'onceGame'};
const ctx={players:{'member:alice':alice,'member:bob':bob,'member:carol':carol},
 assignments:assign,rows:[],artifactOwners:new Map([
 ['alice',{artifactId:'artifact_32',artifactCard:{functions:[]}}],
 ['bob',{artifactId:'artifact_09',artifactCard:{functions:[fn]}}],
 ['carol',{artifactId:'artifact_35',artifactCard:{functions:[{actionId:'action_protect',phase:'day'}]}}]
 ]),roleOwners:new Map([
 ['alice',{functions:[{actionId:'action_protect',phase:'night'}]}],
 ['bob',{functions:[{actionId:'action_stab',phase:'day'}]}],
 ['carol',{functions:[]}]]),cfg:{}};
const meta={matchId:'demo-test',cycleNight:1,cyclePhase:'morning'};
test('DEMO #32 selects real compatible Artifact donor, never an arbitrary living player',()=>{
 const chosen=targetsFor({artifactId:'artifact_32',actionId:'artifact_action_link',
  targetCount:1,noSelf:true},'alice',ctx,meta);
 assert.deepEqual(chosen,['bob']);
});
test('DEMO #23 only selects a source with an implemented copyable power',()=>{
 const x={...ctx,assignments:assign.map(a=>a.loginId==='alice'?{...a,artifactId:'artifact_23'}:a),
 artifactOwners:new Map([...ctx.artifactOwners,['alice',{artifactId:'artifact_23'}]])};
 const chosen=targetsFor({artifactId:'artifact_23',actionId:'artifact_action_copy_function',
 targetCount:1,noSelf:true},'alice',x,meta);
 assert.deepEqual(chosen,['bob']);
});
