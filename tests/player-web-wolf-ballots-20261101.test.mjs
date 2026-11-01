import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
import {playerOfferedActions} from '../src/gmww-demo-runner.js';

const assignments=[
 {loginId:'alpha',roleId:'role_alpha_wolf',factionId:'wolf'},
 {loginId:'wolf1',roleId:'role_wolf',factionId:'wolf'},
 {loginId:'wolf2',roleId:'role_wolf',factionId:'wolf'},
 {loginId:'wolf3',roleId:'role_wolf',factionId:'wolf'}
];
const players=Object.fromEntries(['alpha','wolf1','wolf2','wolf3','a','b','c'].map((loginId,i)=>['member:'+loginId,{loginId,seatId:i+1}]));
const vote=(actorId,loginId)=>({type:'effect_notice',actionId:'action_wolf_bite',matchId:'M1',night:1,actorId,loginId});
const resolve=(rows,extra={})=>resolveWolfNight({matchId:'M1',night:1,players,assignments,interactions:rows,...extra});
test('Alpha Wolf bite wins regardless of voting/confirmation order',()=>{
 for(const rows of [
  [vote('alpha','a'),vote('wolf1','b'),vote('wolf2','b')],
  [vote('wolf1','b'),vote('wolf2','b'),vote('alpha','a')]
 ]){const result=resolve(rows);assert.deepEqual(result.victims,['a']);assert.equal(result.biteCount,3)}
});
test('Without an Alpha bite, highest vote count chooses only one victim',()=>{
 const result=resolve([vote('wolf1','a'),vote('wolf2','a'),vote('wolf3','b')]);
 assert.deepEqual(result.victims,['a']);assert.equal(result.biteCount,3);
});
test('Without Alpha, split tied votes do not invent a victim',()=>{
 const result=resolve([vote('wolf1','a'),vote('wolf2','b')]);
 assert.deepEqual(result.victims,[]);assert.equal(result.tied,true);assert.equal(result.biteCount,2);
});
test('Absent Alpha vote lets regular wolf choose a target',()=>{
 assert.deepEqual(resolve([vote('wolf1','b')]).victims,['b']);
});
test('Each wolf gets one final ballot even if a historical retry carried two notices',()=>{
 const result=resolve([vote('wolf1','a'),vote('wolf1','b'),vote('wolf2','b')]);
 assert.deepEqual(result.victims,['b']);assert.equal(result.biteCount,2);
});
test('Ignore fake non-wolf ballot and inactive/undone bite notices',()=>{
 const result=resolve([
  vote('stranger','a'),{...vote('wolf1','a'),undone:true},
  {...vote('wolf2','a'),effectActive:false},vote('wolf3','b')
 ]);
 assert.deepEqual(result.victims,['b']);assert.equal(result.biteCount,1);
});
test('Alpha special blocked-pack rule remains in force when frozen',()=>{
 const result=resolve([vote('wolf1','a'),{matchId:'M1',night:1,type:'frozen',loginId:'alpha',effectActive:true}]);
 assert.equal(result.packDisabled,true);assert.deepEqual(result.victims,[]);
});
test('Player and GM share campfire icons; each wolf can act independently, never twice',async()=>{
 const server=readFileSync('src/index.js','utf8');
 const demo=readFileSync('src/gmww-demo-runner.js','utf8');
 const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
 assert.match(server,/x\?\.actionId==="action_wolf_bite"&&normalizeLoginId\(x\?\.actorId\)===actorId/);
 assert.match(demo,/x\.actorId===actorId/);
 assert.match(demo,/\['role-group','wolf-pack-bite'\]\.includes\(turn\.kind\)/);
 assert.match(player,/gmwwOnlinePlaceAtFire\(dock\)/);
 assert.match(player,/function gmwwOnlineTargetAt\(/);
 assert.match(player,/gmwwOnlineTarget\(target\)/);
 assert.match(player,/id='gmwwPlayerRestore'/);
 const usage=[];
 const queue={queue:[{kind:'wolf-pack-bite',id:'wolf-pack-bite',
   loginIds:['wolf1','wolf2'],biteActorIds:['wolf1','wolf2'],
   roles:[{roleId:'role_wolf',loginIds:['wolf1','wolf2']}]}],cursor:0,completed:false};
 const store=new Map([['assignments',assignments],['players',players],['interactions',[]],
  ['gameConfig',{}],['battleRoleUsage:M1',usage]]);
 const room={ctx:{storage:{get:async key=>store.get(key)}},getNightRuntime:async()=>queue};
 const meta={phase:'running',roomMode:'online',demo:false,matchId:'M1',cyclePhase:'night',cycleNight:1};
 const offer1=await playerOfferedActions(room,meta,'wolf1');
 const offer2=await playerOfferedActions(room,meta,'wolf2');
 assert.equal(offer1[0]?.actionId,'action_wolf_bite');
 assert.equal(offer2[0]?.actionId,'action_wolf_bite');
 store.set('battleRoleUsage:M1',[{matchId:'M1',night:1,actorId:'wolf1',roleId:'role_wolf',actionId:'action_wolf_bite'}]);
 assert.equal((await playerOfferedActions(room,meta,'wolf1')).length,0);
 assert.equal((await playerOfferedActions(room,meta,'wolf2')).length,1);
});

test('Restore only permits the authenticated owner of latest Online night action',async()=>{
 const src=readFileSync('src/index.js','utf8');
 const start=src.indexOf('  async playerPhaseUndo(body){');
 const end=src.indexOf('  async playerGallows(',start);
 assert.ok(start>0&&end>start);
 const {default:vm}=await import('node:vm');
 const C=vm.runInNewContext('(class Room {'+src.slice(start,end)+'})',{
  normalizeLoginId:v=>String(v||'').trim().toLowerCase().replace(/^member:/,''),
  j:(data,status=200)=>({...data,status})
 });
 const last={token:'undo-secret',actorId:'wolf1',source:'online-human',undone:false};
 const state=new Map([
  ['meta',{matchId:'M1',cycleKey:'night:1',phase:'running',cyclePhase:'night',roomMode:'online',demo:false}],
  ['players',players],['battleLastAction:M1',last]
 ]);
 let calls=0;const room=new C();
 room.ctx={storage:{get:async key=>state.get(key)}};
 room.demoInternalRequest=()=>({internal:true});
 room.gmBattleUndo=async(_request,data)=>{calls++;assert.equal(data.undoToken,last.token);return {ok:true}};
 const args={loginId:'wolf1',matchId:'M1',cycleKey:'night:1'};
 assert.equal((await room.playerPhaseUndo({...args,loginId:'wolf2'})).error,'ONLINE_UNDO_NOT_OWNER');
 assert.equal((await room.playerPhaseUndo({...args,cycleKey:'night:2'})).error,'ONLINE_UNDO_STALE');
 state.set('battleLastAction:M1',{...last,source:'gm'});
 assert.equal((await room.playerPhaseUndo(args)).error,'ONLINE_UNDO_NOT_OWNER');
 assert.equal(calls,0);
 state.set('battleLastAction:M1',last);
 assert.equal((await room.playerPhaseUndo(args)).undone,true);
 assert.equal(calls,1);
 const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
 assert.match(player,/\/undo-action/);
 assert.match(player,/gmwwOnlineClearPositions\(\)/);
 assert.match(player,/gmwwOnlineCanRestore/);
});
