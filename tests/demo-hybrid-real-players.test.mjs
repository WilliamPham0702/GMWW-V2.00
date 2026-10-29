import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoTaskAt,demoPlayerActions} from '../src/gmww-demo-runner.js';

const worker=readFileSync('src/index.js','utf8');
const web=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const runner=readFileSync('src/gmww-demo-runner.js','utf8');

test('DEMO auto runs bots first and waits for human choices until the final window',()=>{
  const bot={cursor:0,tasks:[{id:'x',humanControlled:false}]};
  const human={cursor:0,tasks:[{id:'x',humanControlled:true}]};
  assert.equal(demoTaskAt(10000,bot),5000);
  assert.equal(demoTaskAt(10000,human),8200);
  assert.ok(demoTaskAt(45000,human)>demoTaskAt(45000,bot));
});

test('only the signed-in human owner receives their current private action',async()=>{
  const roleCard={actions:[{id:'action_seer',name:'Soi xét'}],functions:[
    {actionId:'action_seer',phase:'night',name:'Soi xét',targetCount:1,
     noSelf:true,usageMode:'eachNight',usageCount:1}]};
  const player={loginId:'realplayer',humanControlled:true,displayName:'Người thật'};
  const records=new Map([
    ['players',{'member:realplayer':player,'member:npc':{loginId:'npc'}}],
    ['assignments',[
      {loginId:'realplayer',roleId:'role_seer',roleName:'Tiên Tri',roleCard},
      {loginId:'npc',roleId:'role_guard',roleName:'Bảo Vệ'}]],
    ['roles:realplayer',[{roleId:'role_seer',roleCard}]],
    ['roleCatalog:role_seer',{roleCard}],['interactions',[]],['gameConfig',{}]
  ]);
  const room={
    ctx:{storage:{get:async key=>records.get(key)}},
    getNightRuntime:async()=>({cursor:0,completed:false,
      queue:[{id:'seer-turn',kind:'role',roleId:'role_seer',loginIds:['realplayer'],label:'Tiên Tri'}]}),
    gallowsState:async()=>({ballot:{}})
  };
  const meta={demo:true,phase:'running',cyclePhase:'night',cycleNight:1,matchId:'m1'};
  const offer=await demoPlayerActions(room,meta,'realplayer');
  assert.equal(offer.length,1);
  assert.equal(offer[0].actionId,'action_seer');
  assert.equal(offer[0].targetCount,1);
  assert.ok(!('actorIds' in offer[0]),'Other actors must never be exposed');
  assert.deepEqual(await demoPlayerActions(room,meta,'npc'),[]);
  records.set('battleRoleUsage:m1',[{matchId:'m1',night:1,actorId:'realplayer',
    roleId:'role_seer',actionId:'action_seer',targetIds:['npc'],eventId:'used'}]);
  assert.deepEqual(await demoPlayerActions(room,meta,'realplayer'),[],
    'An action confirmed by a human must disappear before fallback');
});

test('new DEMO action endpoint delegates to the same authoritative GM handlers',()=>{
  assert.match(worker,/async playerDemoAction\(body\)/);
  assert.match(worker,/DEMO_PLAYER_NOT_JOINED/);
  assert.match(worker,/DEMO_ACTION_STALE/);
  assert.match(worker,/await demoPlayerActions\(this,meta,loginId\)/);
  assert.match(worker,/await this\.gmBattleAction\(request,/);
  assert.match(worker,/await this\.gmDayAction\(request,/);
  assert.match(worker,/body:JSON\.stringify\(\{\.\.\.body,loginId:data\.member\.loginId\}\)/);
  assert.match(worker,/if\(meta\.demo===true&&!body\?\.member\?\.loginId\)return j/);
  assert.match(worker,/async playerGallows\(body,authorizedDemo=false\)/);
  assert.match(worker,/DEMO_LOGIN_REQUIRED/);
});

test('DEMO public broadcasts hide secret night action identity',()=>{
  assert.match(runner,/demoEvent:\{id:event\.id,matchId:event\.matchId,/);
  assert.doesNotMatch(runner,/demoEvent:publicEvent/);
  assert.ok(worker.includes('if(meta.demo!==true)this.broadcast({type:"player_interaction",interaction})'));
  assert.ok(worker.includes('if(meta.demo!==true)this.broadcast({type:"player_interaction_response"'));
  assert.doesNotMatch(worker,/notifyPrivateMember/,'WebSocket participantId is not a private authentication token');
  assert.match(worker,/this\.broadcast\(meta\.demo===true\?\{type:"battle_action_confirmed",matchId,serverTime:Date\.now\(\)\}/);
});

test('Player Web lists DEMO and submits only private server-issued offers',()=>{
  assert.match(web,/r\.demo===true\?'DEMO'/);
  assert.match(web,/function renderDemoActions\(/);
  assert.match(web,/\/demo-action/);
  assert.match(web,/actionKey:a\.key,targetIds,direction,assassinChoice/);
  assert.match(web,/state\.demoActions=d\?\.demoActions\|\|\[\]/);
  assert.match(worker,/room\.demo===true\?\[\]:Array\.isArray\(data\?\.memberResults\)/,
    'DEMO must not write member rankings/history');
});
