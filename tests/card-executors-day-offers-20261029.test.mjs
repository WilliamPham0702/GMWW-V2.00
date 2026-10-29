import test from 'node:test';
import assert from 'node:assert/strict';
import {playerOfferedActions} from '../src/gmww-demo-runner.js';
const meta={phase:'running',roomMode:'online',matchId:'offers',cyclePhase:'morning',cycleNight:2};
function fixture({phase='both',singleUse=false,used=false,blocked=false}={}){
 const artifactId='artifact_35',roleId='role_villager',loginId='alice';
 const data=new Map([
  ['players',{'member:alice':{loginId}}],
  ['assignments',[{loginId,roleId,artifactId}]],
  ['roles:alice',[{roleId,roleCard:{functions:[]}}]],
  ['artifact:alice',{artifactId,singleUse,artifactCard:{functions:[{actionId:'action_protect',phase,targetCount:1,usageMode:'onceGame'}]}}],
  ['interactions',blocked?[{loginId,type:'status',statusId:'disabled_2n',effectActive:true,matchId:'offers'}]:[]]
 ]);
 if(used)data.set('artifactUse:alice:'+artifactId,{usedAt:'2026-10-29'});
 return {ctx:{storage:{get:async key=>data.get(key)}},gallowsState:async()=>({ballot:{stage:'ready'}})};
}
test('Player Online and DEMO offer a configured both-phase Artifact during the day',async()=>{
 const room=fixture();
 assert.equal((await playerOfferedActions(room,meta,'alice')).length,1);
 const demoRoom=fixture();
 const oldGet=demoRoom.ctx.storage.get;
 demoRoom.ctx.storage.get=async key=>key==='players'?{'member:alice':{loginId:'alice',humanControlled:true}}:oldGet(key);
 assert.equal((await playerOfferedActions(demoRoom,{...meta,demo:true},'alice')).length,1);
});
test('Single-use Artifact spent last cycle is never offered again',async()=>{
 assert.deepEqual(await playerOfferedActions(fixture({phase:'day',singleUse:true,used:true}),meta,'alice'),[]);
});
test('A disabled role actor receives no day powers that the Server will reject',async()=>{
 assert.deepEqual(await playerOfferedActions(fixture({phase:'day',blocked:true}),meta,'alice'),[]);
});
test('A stale Night turn cannot re-offer an Artifact spent in an earlier cycle',async()=>{
 const room=fixture({phase:'both',singleUse:true,used:true});
 room.getNightRuntime=async()=>({cursor:0,completed:false,queue:[{
  id:'artifact-turn',kind:'artifact-main',artifactId:'artifact_35',loginId:'alice'
 }]});
 assert.deepEqual(await playerOfferedActions(room,{...meta,cyclePhase:'night'},'alice'),[]);
});
