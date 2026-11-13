import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import * as gallowsRules from '../src/gmww-gallows-rules.js';
import {serverDemoActive,nextServerDemoDue,runServerDemo,stopServerDemo} from '../src/gmww-demo-runner.js';
import {projectDemoClock,nextDemoClock} from '../src/gmww-demo-clock.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {combineConfiguredTurns,groupConfiguredRoleTurns,jumpTarget,timelineDisplaySteps} from '../src/gmww-night-turn-rules.js';
import {defaultPriorityFirst,artifactCycleKey,reserveArtifactActivation} from '../src/gmww-game-scene-rules.js';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage,appendBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';
import {pruneInteractions} from '../src/gmww-interaction-retention.js';
import {isBattleActorBlocked} from '../src/gmww-battle-actor-eligibility.js';
import {expireCycleEffects} from '../src/gmww-cycle-effect-expiry.js';
import {resolveWolfNight,readNightAssignments,isNightImmune,resolveNightReveal,resolveMaidenNight,canSnowWolfBite} from '../src/gmww-wolf-night-resolution.js';
import {wolfPackMembers,shouldWakeWolfPack,privateWolfRecognition} from '../src/gmww-wolf-recognition.js';
import {oldWitchActionCheck} from '../src/gmww-old-witch-rules.js';
import {isWolfRole,packMembers,alphaPackState,previousNightTargets,arrangeNightRoles} from '../src/gmww-pack-night-rules.js';
import {partitionNightSpecialRoles,witchSaveTargetAllowed} from '../src/gmww-witch-drunk-clone-rules.js';
import {inheritedRolePlans} from '../src/gmww-role-inheritance-rules.js';
import {drunkDeadCards,drunkDeckView,isPassiveInformationAction} from '../src/gmww-drunk-draw-rules.js';
import {buildPrivateDeliverySnapshot,privateDeliveryArtifact} from '../src/gmww-delivery-snapshot.js';
import {STATUS_DEFS as PRODUCTION_STATUS_DEFS} from '../src/gmww-public-room-contract.js';
import {sanitizePlayerArtifactCard} from '../src/gmww-private-card-contract.js';
import {insertMirrorSteps,buildMirrorLink,mirrorLinkKey,mirrorLinkPrefix,mirrorFunctions} from '../src/gmww-mirror-rules.js';
import {needsStorageArtifact,unissuedArtifactIds,pickRandom,aliveNeighbors,awakeLastNight} from '../src/gmww-artifact-rules.js';

// Execute the real DO methods against isolated, clone-on-read storage. No network
// or production credentials; method bodies are not copied into the fixture.
const source=workerSource();
const demoMethods=source.slice(source.indexOf('  async demoClockContext(meta){'),source.indexOf('  async gmAuto(request,body){'));
const methods=source.slice(source.indexOf('  nightRuntimeKey('),source.indexOf('  async gmRename('));
const drawMethod=source.slice(source.indexOf('  async playerDrunkDraw(body){'),source.indexOf('  async playerDeliveryReceived(body){'));
const gallowsMethods=source.slice(source.indexOf('  async gallowsState(meta){'),source.indexOf('  async gmState(request){'));
const alarmMethods=source.slice(source.indexOf('  async alarm(){'),source.indexOf('  async gmDelete(request){'));
const activate=source.slice(source.indexOf('  async playerArtifactActivate('),source.indexOf('  async playerSeatSwap('));
const cycleHelper=source.slice(source.indexOf('function currentArtifactCycleKey('),source.indexOf('function gameLabelKey('));
const normalizeLoginId=x=>String(x||'').trim().toLowerCase();
// Run the exact production status policy rather than extracting JS text.
const STATUS_DEFS=PRODUCTION_STATUS_DEFS;


const Room=vm.runInNewContext(cycleHelper+'; (class { '+demoMethods+gallowsMethods+methods+alarmMethods+activate+drawMethod+' })',{
  ...gallowsRules,ROOM_IDLE_TTL:86400000,Date,JSON,Response,Request,projectDemoClock,nextDemoClock,serverDemoActive,nextServerDemoDue,runServerDemo,stopServerDemo,crypto:webcrypto,combineConfiguredTurns,groupConfiguredRoleTurns,jumpTarget,defaultPriorityFirst,
  artifactCycleKey,reserveArtifactActivation,normalizeLoginId,pruneInteractions,isBattleActorBlocked,expireCycleEffects,resolveWolfNight,readNightAssignments,isNightImmune,resolveNightReveal,resolveMaidenNight,canSnowWolfBite,STATUS_DEFS,
  resolveRoleActionPolicy,checkBattleRoleActionUsage,appendBattleRoleActionUsage,wolfPackMembers,shouldWakeWolfPack,privateWolfRecognition,oldWitchActionCheck,
  isWolfRole,packMembers,alphaPackState,previousNightTargets,arrangeNightRoles,
  partitionNightSpecialRoles,witchSaveTargetAllowed,inheritedRolePlans,buildPrivateDeliverySnapshot,
  drunkDeadCards,drunkDeckView,isPassiveInformationAction,
  gameLabelKey:vm.runInNewContext(source.match(/function gameLabelKey\(v\)\{[^\n]+/)[0]+";gameLabelKey"),
  insertMirrorSteps,buildMirrorLink,mirrorLinkKey,mirrorLinkPrefix,mirrorFunctions,needsStorageArtifact,unissuedArtifactIds,pickRandom,aliveNeighbors,awakeLastNight,sanitizePlayerArtifactCard,
  j:(data,status=200)=>Response.json(data,{status}),publicRoom:x=>structuredClone(x),publicPlayer:x=>x
});
const clone=x=>x===undefined?undefined:structuredClone(x);
async function result(response){return {status:response.status,...await response.json()}}
const MIRROR_CARD={name:'Tráng Gương',functions:[{actionId:'mirror_copy',phase:'night',targetCount:1,noSelf:true}]};
const ROLE_X={roleId:'role_x',roleName:'Vai X',matchId:'test-match',roleCard:{name:'Vai X',functions:[
  {actionId:'action_x_scan',phase:'night',targetCount:1,noSelf:true,usageMode:'eachNight',usageCount:1},
  {actionId:'action_x_passive',passive:true,phase:'night'},
  {actionId:'action_wolf_bite',phase:'night',targetCount:1}]}};
function harness({role=ROLE_X,artifactId='artifact_23',card=MIRROR_CARD,extraAssign=[]}={}){
  const data=new Map(),room=new Room(),events=[];
  const storage={get:async key=>clone(data.get(key)),put:async(key,value)=>data.set(key,clone(value)),delete:async key=>data.delete(key),
    list:async({prefix=''}={})=>new Map([...data].filter(([key])=>String(key).startsWith(prefix)).map(([key,value])=>[key,clone(value)])),
    setAlarm:async()=>{},transaction:async fn=>{const before=new Map([...data].map(([k,v])=>[k,clone(v)]));
      try{return await fn(storage)}catch(e){data.clear();for(const [k,v] of before)data.set(k,v);throw e}}};
  room.ctx={storage,blockConcurrencyWhile:async fn=>fn()};room.broadcast=x=>events.push(clone(x));room.roomExpiryDue=()=>Date.now()+86400000;
  room.gmAuthorized=async()=>({ok:true,meta:await storage.get('meta')});
  data.set('meta',{matchId:'test-match',phase:'running',cyclePhase:'night',cycleNight:1,cycleKey:'night-1',autoGM:false,code:'ROOM'});
  data.set('players',Object.fromEntries(['alice','bob','carol','dave'].map(loginId=>['member:'+loginId,{loginId}])));
  data.set('gameConfig',{roles:[{roleId:'role_x',order:1},{roleId:'role_wolf',order:2}],artifactLimitPerCycle:3,timing:{defaultActionSec:1,wolfDiscussionSec:1,artifactActionSec:1}});
  data.set('assignments',[
    {loginId:'alice',roleId:'role_villager',roleName:'Dân Làng',faction:'village',artifactId,artifactName:card.name,artifactPriorityFirst:true,artifactSingleUse:true},
    {loginId:'bob',roleId:role?.roleId||'role_villager',roleName:role?.roleName||'Dân Làng',faction:'village'},
    {loginId:'carol',roleId:'role_wolf',roleName:'Sói',faction:'wolf'},...extraAssign]);
  if(role)data.set('roles:bob',[role]);
  data.set('artifact:alice',{loginId:'alice',matchId:'test-match',artifactId,artifactName:card.name,priorityFirst:true,singleUse:true,artifactCard:card});
  const meta=()=>storage.get('meta');
  const runtime=async(n=1)=>room.getNightRuntime(await meta(),n,true);
  const useArtifact=async(extra={})=>{const rt=await runtime(),m=await meta();
    return result(await room.gmBattleAction(null,{turnId:rt.currentId,actorId:'alice',artifactId,actionId:card.functions[0].actionId,type:'effect_notice',targetIds:['bob'],
      matchId:m.matchId,cycleKey:m.cycleKey,clientEventId:'art-'+Math.random(),...extra}))};
  return{data,room,events,storage,meta,runtime,useArtifact};
}
const kinds=rt=>Array.from(rt.queue,s=>s.mirror?'mirror':s.kind==='role'?s.roleId:s.kind);

test('REPRO Tráng Gương ban đêm: dùng xong phải có liên kết và lượt "Tráng Gương" sau lượt vai bị sao chép',async()=>{
  const h=harness();const first=await h.runtime();
  assert.equal(first.queue[0].kind,'early-artifact-window');
  const r=await h.useArtifact();
  assert.equal(r.ok,true,JSON.stringify(r));
  const link=h.data.get('mirrorLink:test-match:alice');
  assert.ok(link,'phải lưu liên kết Tráng Gương');
  assert.equal(link.roleId,'role_x');assert.equal(link.targetId,'bob');
  assert.deepEqual(link.roleCard.functions.map(f=>f.actionId),['action_x_scan'],'chỉ chép chức năng chủ động, không chép Cắn của Bầy Sói');
  const rt=await h.runtime();
  const order=kinds(rt),at=order.indexOf('role_x');
  assert.equal(order[at+1],'mirror');
  const step=rt.queue[at+1];
  assert.deepEqual(step.loginIds,['alice']);assert.equal(step.label,'Tráng Gương');
  assert.equal(rt.currentId,first.currentId,'con trỏ lượt không bị xê dịch');
  assert.ok(h.data.get('artifactUse:alice:artifact_23'),'artifact đã tiêu hao một lần');
});

test('Tráng Gương: chủ dùng được hành động của vai B ở lượt mới, mỗi đêm một lần theo luật vai B',async()=>{
  const h=harness();await h.runtime();await h.useArtifact();
  let rt=await h.runtime();
  const idx=rt.queue.findIndex(s=>s.mirror);
  const m=await h.meta();await h.room.gmTurn(null,{action:'jump',targetIndex:idx});
  rt=await h.runtime();
  const act=async id=>result(await h.room.gmBattleAction(null,{turnId:rt.currentId,actorId:'alice',actionId:'action_x_scan',type:'effect_notice',targetIds:['carol'],
    matchId:'test-match',cycleKey:'night-1',clientEventId:id}));
  const ok=await act('mirror-use-1');assert.equal(ok.ok,true,JSON.stringify(ok));
  const again=await act('mirror-use-2');assert.equal(again.ok,false);
  const forged=await result(await h.room.gmBattleAction(null,{turnId:rt.currentId,actorId:'alice',actionId:'action_wolf_bite',type:'effect_notice',targetIds:['carol'],matchId:'test-match',cycleKey:'night-1',clientEventId:'bite'}));
  assert.equal(forged.ok,false,'Cắn của Bầy Sói không được sao chép');
  const other=await result(await h.room.gmBattleAction(null,{turnId:rt.currentId,actorId:'dave',actionId:'action_x_scan',type:'effect_notice',targetIds:['carol'],matchId:'test-match',cycleKey:'night-1',clientEventId:'x'}));
  assert.equal(other.ok,false,'người khác không dùng được lượt Tráng Gương');
});

test('Tráng Gương 1B: các đêm sau vẫn gọi chủ sau vai B, kể cả khi chủ đã chết',async()=>{
  const h=harness();await h.runtime();await h.useArtifact();
  h.data.set('interactions',[{id:'d1',loginId:'alice',matchId:'test-match',type:'dead',effectActive:true,night:1}]);
  const m=await h.meta();m.cycleNight=2;m.cycleKey='night-2';await h.storage.put('meta',m);
  const rt2=await h.runtime(2),order=kinds(rt2);
  assert.equal(order[order.indexOf('role_x')+1],'mirror');
  assert.equal(order.filter(x=>x==='mirror').length,1);
  assert.equal(rt2.queue[0].kind==='early-artifact-window',false,'artifact một lần đã dùng không mở lại cửa sổ đầu đêm');
});

test('Tráng Gương: mục tiêu không có chức năng chủ động -> báo lỗi và KHÔNG trừ lượt',async()=>{
  const h=harness({role:null});h.data.set('roles:bob',[{roleId:'role_villager',roleName:'Dân Làng',matchId:'test-match',roleCard:{name:'Dân Làng',functions:[]}}]);await h.runtime();
  const r=await h.useArtifact();
  assert.equal(r.ok,false);assert.equal(r.detail||r.error,'NOTHING_TO_COPY');
  assert.equal(h.data.has('artifactUse:alice:artifact_23'),false);
  assert.equal(h.data.has('mirrorLink:test-match:alice'),false);
  assert.equal((h.data.get('artifact:alice')||{}).usedAt,undefined);
});

test('Artifact lưu trữ ban đêm (Hắc Ngọc Hủy Diệt) thật sự loại Artifact chưa lật của mục tiêu',async()=>{
  const card={name:'Hắc Ngọc Hủy Diệt',functions:[{actionId:'artifact_action_destroy',phase:'night',targetCount:1,noSelf:true}]};
  const h=harness({artifactId:'artifact_25',card});
  const a=h.data.get('assignments');a[1].artifactId='artifact_99';a[1].artifactName='Lá X';h.data.set('assignments',a);
  h.data.set('artifact:bob',{loginId:'bob',matchId:'test-match',artifactId:'artifact_99',artifactName:'Lá X',singleUse:true,artifactCard:{name:'Lá X',functions:[]}});
  await h.runtime();
  const r=await h.useArtifact();assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(h.data.get('artifact:bob').removedFromMatch,true);
  assert.equal(h.data.get('assignments')[1].artifactId,null);
  assert.ok(r.revelation?.message);
});

test('Artifact lưu trữ ban đêm không hợp lệ: không trừ lượt, không ghi gì',async()=>{
  const card={name:'Hắc Ngọc Hủy Diệt',functions:[{actionId:'artifact_action_destroy',phase:'night',targetCount:1,noSelf:true}]};
  const h=harness({artifactId:'artifact_25',card});await h.runtime();
  const r=await h.useArtifact();
  assert.equal(r.ok,false);assert.equal(r.detail||r.error,'TARGET_ARTIFACT_NOT_ELIGIBLE');
  assert.equal(h.data.has('artifactUse:alice:artifact_25'),false);
  assert.equal(h.data.has('interactions'),false);
});

test('insertMirrorSteps: không chèn trước con trỏ và không trùng',()=>{
  const q=[{id:'a',kind:'early-artifact-window'},{id:'r',kind:'role',roleId:'role_x'},{id:'v',kind:'village-wakeup'}];
  const link={ownerId:'alice',roleId:'role_x'};
  assert.equal(insertMirrorSteps(q,[link],{minIndex:2}),0);
  assert.equal(insertMirrorSteps(q,[link],{minIndex:1}),1);
  assert.equal(insertMirrorSteps(q,[link],{minIndex:1}),0);
  assert.deepEqual(q.map(s=>s.id),['a','r','mirror:alice:role_x','v']);
});
