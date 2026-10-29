import test from 'node:test';
import assert from 'node:assert/strict';
import {playerOfferedActions} from '../src/gmww-demo-runner.js';
const meta={phase:'running',roomMode:'online',matchId:'mirror-isolation',
 cyclePhase:'morning',cycleNight:1,cycleKey:'morning-1'};
test('A copied power belongs only to its actual Player; another owner of the same Role never inherits it',async()=>{
 const base={name:'Bảo Vệ',functions:[{actionId:'action_protect',phase:'night',
  usageMode:'eachNight',targetCount:1}]};
 const copied={...base,functions:[...base.functions,{id:'copied:stab',
  actionId:'action_stab',phase:'day',usageMode:'onceGame',targetCount:1,
  copiedFromRoleId:'role_thug',noSelf:true}]};
 const rows=[{loginId:'alice',roleId:'role_guard',roleName:'Bảo Vệ'},
  {loginId:'bob',roleId:'role_guard',roleName:'Bảo Vệ'}];
 const db=new Map([
  ['players',{'member:alice':{loginId:'alice'},'member:bob':{loginId:'bob'}}],
  ['assignments',rows],
  ['roles:alice',[{loginId:'alice',roleId:'role_guard',roleCard:copied}]],
  ['roles:bob',[{loginId:'bob',roleId:'role_guard',roleCard:base}]],
  ['interactions',[]],['gameConfig',{artifactLimitPerCycle:5}]
 ]);
 const room={ctx:{storage:{get:async k=>db.get(k)}},
  gallowsState:async()=>({ballot:{stage:'ready',round:1}})};
 const alice=await playerOfferedActions(room,meta,'alice');
 const bob=await playerOfferedActions(room,meta,'bob');
 assert.equal(alice.filter(x=>x.actionId==='action_stab').length,1);
 assert.equal(bob.some(x=>x.actionId==='action_stab'),false);
});
