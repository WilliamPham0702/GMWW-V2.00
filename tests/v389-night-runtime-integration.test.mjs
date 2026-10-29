import {resolveElderBell} from '../src/gmww-elder-bell-rules.js';
import {resolveLinkedDeaths} from '../src/gmww-linked-death-rules.js';
import {hunterLinkedDeaths} from '../src/gmww-hunter-death-rules.js';
import {resolveDayArtifactInspection} from '../src/gmww-day-artifact-inspection.js';
import * as cardNightPassives from '../src/gmww-card-night-passives.js';
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
import {resolveWolfNight,readNightAssignments,isNightImmune,resolveNightReveal,resolveMaidenNight,canSnowWolfBite,resolveStrongmanWolfBite} from '../src/gmww-wolf-night-resolution.js';
import {wolfPackMembers,shouldWakeWolfPack,privateWolfRecognition} from '../src/gmww-wolf-recognition.js';
import {oldWitchActionCheck} from '../src/gmww-old-witch-rules.js';
import {isWolfRole,packMembers,alphaPackState,previousNightTargets,arrangeNightRoles} from '../src/gmww-pack-night-rules.js';
import {partitionNightSpecialRoles,witchSaveTargetAllowed} from '../src/gmww-witch-drunk-clone-rules.js';
import {inheritedRolePlans} from '../src/gmww-role-inheritance-rules.js';
import {drunkDeadCards,drunkDeckView,isPassiveInformationAction} from '../src/gmww-drunk-draw-rules.js';
import {buildPrivateDeliverySnapshot,privateDeliveryArtifact} from '../src/gmww-delivery-snapshot.js';
import {STATUS_DEFS as PRODUCTION_STATUS_DEFS} from '../src/gmww-public-room-contract.js';
import {sanitizePlayerArtifactCard} from '../src/gmww-private-card-contract.js';

// Execute the real DO methods against isolated, clone-on-read storage. No network
// or production credentials; method bodies are not copied into the fixture.
const source=fs.readFileSync('src/index.js','utf8');
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
  resolveElderBell,resolveLinkedDeaths,hunterLinkedDeaths,resolveDayArtifactInspection,resolveStrongmanWolfBite,...cardNightPassives,...gallowsRules,ROOM_IDLE_TTL:86400000,Date,JSON,Response,Request,projectDemoClock,nextDemoClock,serverDemoActive,nextServerDemoDue,runServerDemo,stopServerDemo,crypto:webcrypto,combineConfiguredTurns,groupConfiguredRoleTurns,jumpTarget,defaultPriorityFirst,
  artifactCycleKey,reserveArtifactActivation,normalizeLoginId,pruneInteractions,isBattleActorBlocked,expireCycleEffects,resolveWolfNight,readNightAssignments,isNightImmune,resolveNightReveal,resolveMaidenNight,canSnowWolfBite,STATUS_DEFS,
  resolveRoleActionPolicy,checkBattleRoleActionUsage,appendBattleRoleActionUsage,wolfPackMembers,shouldWakeWolfPack,privateWolfRecognition,oldWitchActionCheck,
  isWolfRole,packMembers,alphaPackState,previousNightTargets,arrangeNightRoles,
  partitionNightSpecialRoles,witchSaveTargetAllowed,inheritedRolePlans,buildPrivateDeliverySnapshot,
  drunkDeadCards,drunkDeckView,isPassiveInformationAction,
  gameLabelKey:vm.runInNewContext(source.match(/function gameLabelKey\(v\)\{[^\n]+/)[0]+";gameLabelKey"),
  j:(data,status=200)=>Response.json(data,{status}),publicRoom:x=>structuredClone(x),publicPlayer:x=>x
});
const clone=x=>x===undefined?undefined:structuredClone(x);
test('card audit: DO self-target refusal leaves ledgers untouched',async()=>{
 const h=harness({artifact:false});await h.jump('role');
 h.data.set('roles:alice',[{roleId:'seer',matchId:'test-match',roleCard:{functions:[{actionId:'inspect',phase:'night',targetCount:1,noSelf:true}]}}]);
 const rt=await h.runtime(),meta=await h.meta();
 const r=await result(await h.room.gmBattleAction(null,{turnId:rt.currentId,actorId:'alice',type:'effect_notice',actionId:'inspect',targetIds:['alice'],matchId:meta.matchId,cycleKey:meta.cycleKey,clientEventId:'audit-self'}));
 assert.equal(r.error,'ACTION_SELF_TARGET_FORBIDDEN');assert.equal(h.data.has('battleRoleUsage:test-match'),false);assert.equal(h.data.has('interactions'),false);
});
test('card audit: Seer validates observed targets, not self-notice recipient',async()=>{
 const h=harness({artifact:false});await h.jump('role');
 h.data.set('roles:alice',[{roleId:'seer',matchId:'test-match',roleCard:{functions:[{actionId:'action_seer',phase:'night',targetCount:1,noSelf:true}]}}]);
 const rt=await h.runtime(),m=await h.meta(),b={turnId:rt.currentId,actorId:'alice',type:'effect_notice',actionId:'action_seer',targetIds:['alice'],revealTargetIds:['alice'],matchId:m.matchId,cycleKey:m.cycleKey,clientEventId:'audit-seer-self'};
 assert.equal((await result(await h.room.gmBattleAction(null,b))).error,'ACTION_SELF_TARGET_FORBIDDEN');
 assert.equal((await result(await h.room.gmBattleAction(null,{...b,revealTargetIds:['bob'],clientEventId:'audit-valid'}))).ok,true);
 assert.deepEqual(Array.from(h.data.get('battleRoleUsage:test-match')[0].targetIds),['bob']);
});
test('card audit: canonical Bear God resolves and obeys two-use game quota',async()=>{
 const h=harness({artifact:false});Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
 h.data.set('assignments',[{loginId:'alice',roleId:'role_bear_god',faction:'village'},{loginId:'bob',roleId:'role_wolf',faction:'wolf'},{loginId:'carol',roleId:'role_villager',faction:'village'}]);
 h.data.set('roles:alice',[{roleId:'role_bear_god',matchId:'test-match',roleCard:{functions:[{actionId:'action_bear_scan',phase:'day',targetCount:2,noSelf:true,usageMode:'custom',usageCount:2}]}}]);
 const b={matchId:'test-match',cycleKey:'morning-1',actorId:'alice',roleId:'role_bear_god',actionId:'action_bear_scan',targetIds:['bob','carol'],clientEventId:'audit-bear'};
 const r=await result(await h.room.gmDayAction(null,b));assert.equal(r.ok,true);assert.equal(r.result.hasWolf,true);
 h.data.set('dayRoleUsage:test-match',[1,2].map(day=>({actorId:'alice',roleId:'role_bear_god',artifactId:'',actionId:'action_bear_scan',day})));
 Object.assign(h.data.get('meta'),{cycleNight:3,cycleKey:'morning-3'});
 assert.equal((await result(await h.room.gmDayAction(null,{...b,cycleKey:'morning-3',clientEventId:'audit-exhausted'}))).error,'DAY_ROLE_QUOTA_REACHED');
});
test('card audit: dead_vote Artifact ID cannot be mistaken for kill or charged',async()=>{
 const h=harness({artifact:false});Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
 h.data.set('artifact:alice',{artifactId:'unknown',matchId:'test-match',artifactCard:{functions:[{actionId:'artifact_action_dead_vote',phase:'day',targetCount:1,noSelf:false}]}});
 const r=await result(await h.room.gmDayAction(null,{matchId:'test-match',cycleKey:'morning-1',actorId:'alice',artifactId:'unknown',actionId:'artifact_action_dead_vote',targetIds:['bob'],clientEventId:'audit-vote'}));
 assert.equal(r.error,'DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED');assert.equal(h.data.has('artifactUse:alice:unknown'),false);assert.equal(h.data.has('interactions'),false);
});
test('card audit: night Artifact checks function phase and self placeholder for no-target',async()=>{
 const h=harness();await h.jump('early-artifact-window');h.data.get('artifact:alice').artifactCard={actions:[{id:'copy',targetCount:0,noSelf:true}],functions:[{actionId:'copy',phase:'day',noTarget:true,targetCount:0,noSelf:true}]};
 assert.equal((await result(await h.act({targetIds:['alice'],loginId:'alice'}))).error,'ARTIFACT_ACTION_WRONG_PHASE');assert.equal(h.data.has('artifactUse:alice:mirror'),false);
 h.data.get('artifact:alice').artifactCard.functions[0].phase='any';assert.equal((await result(await h.act({targetIds:['alice'],loginId:'alice'}))).ok,true);
});
test('card audit: partial legacy functions retain explicit action target rules',async()=>{
 const h=harness();await h.jump('early-artifact-window');h.data.get('artifact:alice').artifactCard=sanitizePlayerArtifactCard({actions:[{id:'copy',targetCount:2,noSelf:false}],functions:[{actionId:'copy'}]});
 assert.equal((await result(await h.act({targetIds:['alice','bob'],loginId:'alice'}))).ok,true);
});
test('card audit: legacy day functions retain action phase and target rules',async()=>{
 const h=harness({artifact:false});Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
 h.data.set('artifact:alice',{artifactId:'legacy',matchId:'test-match',artifactCard:sanitizePlayerArtifactCard({actions:[{id:'action_day_kill',phase:'day',targetCount:1,noSelf:false}],functions:[{actionId:'action_day_kill'}]})});
 const r=await result(await h.room.gmDayAction(null,{matchId:'test-match',cycleKey:'morning-1',actorId:'alice',artifactId:'legacy',actionId:'action_day_kill',targetIds:['bob'],clientEventId:'legacy-day'}));
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(h.data.get('interactions').filter(x=>x.type==='dead'&&x.loginId==='bob').length,1);
});
test('card audit: forged lethal divination is rejected before writes',async()=>{
 const h=harness({artifact:false});await h.jump('role');h.data.set('roles:alice',[{roleId:'seer',matchId:'test-match',roleCard:{functions:[{actionId:'action_seer',phase:'night',targetCount:1,noSelf:true}]}}]);
 const rt=await h.runtime(),m=await h.meta();const r=await result(await h.room.gmBattleAction(null,{turnId:rt.currentId,actorId:'alice',type:'dead',actionId:'action_seer',targetIds:['bob'],matchId:m.matchId,cycleKey:m.cycleKey,clientEventId:'audit-forge'}));
 assert.equal(r.error,'NIGHT_ACTION_TYPE_MISMATCH');assert.equal(h.data.has('interactions'),false);assert.equal(h.data.has('battleRoleUsage:test-match'),false);
});
test('card audit: Destroyer kills listed roles, otherwise itself despite immunity',async()=>{
 for(const targetRole of ['role_guard','role_villager']){
 const h=harness({artifact:false});h.data.set('assignments',[{loginId:'alice',roleId:'role_destroyer',faction:'third'},{loginId:'bob',roleId:targetRole,faction:'village'}]);
 h.data.set('roles:alice',[{roleId:'role_destroyer',matchId:'test-match',roleCard:{flags:{nightImmune:true},functions:[{actionId:'action_destroyer_kill',phase:'night',targetCount:1,noSelf:true}]}}]);h.data.set('gameConfig',{roles:[{roleId:'role_destroyer'}]});
 const first=await h.runtime();await h.room.gmTurn(null,{action:'jump',targetIndex:first.queue.findIndex(x=>x.roleId==='role_destroyer')});const m=await h.meta(),rt=await h.runtime();
 const r=await result(await h.room.gmBattleAction(null,{turnId:rt.currentId,actorId:'alice',type:'dead',actionId:'action_destroyer_kill',targetIds:['bob'],matchId:m.matchId,cycleKey:m.cycleKey,clientEventId:'audit-destroyer'}));
 assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(h.data.get('interactions').filter(x=>x.pendingDeath).map(x=>x.loginId),[targetRole==='role_guard'?'bob':'alice']);}
});
function harness({artifact=true,auto=false,singleUse=false}={}){
  const data=new Map(),room=new Room(),events=[];
  const storage={get:async key=>clone(data.get(key)),put:async(key,value)=>data.set(key,clone(value)),delete:async key=>data.delete(key),
    // Model Durable Object prefix reads; return independent values as the real storage does.
    list:async({prefix='' }={})=>new Map([...data].filter(([key])=>String(key).startsWith(prefix)).map(([key,value])=>[key,clone(value)])),
    setAlarm:async()=>{},transaction:async fn=>{
    const before=new Map([...data].map(([k,v])=>[k,clone(v)]));
    try{return await fn(storage)}catch(e){data.clear();for(const [k,v] of before)data.set(k,v);throw e}
  }};
  room.ctx={storage,blockConcurrencyWhile:async fn=>fn()};room.broadcast=x=>events.push(clone(x));room.roomExpiryDue=()=>Date.now()+86400000;
  room.gmAuthorized=async()=>({ok:true,meta:await storage.get('meta')});
  data.set('meta',{matchId:'test-match',phase:'running',cyclePhase:'night',cycleNight:1,cycleKey:'night-1',autoGM:auto});
  data.set('players',Object.fromEntries(['alice','bob','carol','dave'].map(loginId=>['member:'+loginId,{loginId}])));
  data.set('gameConfig',{roles:[{roleId:'seer',order:1},{roleId:'wolf',order:2}],artifactLimitPerCycle:3,timing:{defaultActionSec:1,wolfDiscussionSec:1,artifactActionSec:1}});
  data.set('assignments',[
    {loginId:'alice',roleId:'seer',roleName:'Tiên Tri',...(artifact?{artifactId:'mirror',artifactName:'Tráng Gương',artifactPriorityFirst:true,artifactSingleUse:singleUse}:{})},
    {loginId:'bob',roleId:'seer',roleName:'Tiên Tri'},
    {loginId:'carol',roleId:'wolf',roleName:'Sói'}
  ]);
  if(artifact)data.set('artifact:alice',{matchId:'test-match',artifactId:'mirror',artifactName:'Tráng Gương',priorityFirst:true,singleUse,artifactCard:{actions:[{id:'copy',name:'Tráng Gương'}]}});
  const meta=()=>storage.get('meta');
  const runtime=async()=>room.getNightRuntime(await meta(),1,true);
  const jump=async kind=>{const rt=await runtime(),index=rt.queue.findIndex(x=>x.kind===kind);
    // Night 1 may begin directly on a Role when WOLF-01 omits the solo-Wolf
    // introduction. In the live room applyCycle initializes this meta pointer.
    if(index===rt.cursor){const m=await meta();m.currentNightTurnId=rt.currentId;await storage.put('meta',m);return rt}
    return room.gmTurn(null,{action:'jump',targetIndex:index});
  };
  const act=async overrides=>{const rt=await runtime();return room.gmInteraction(null,{turnId:rt.currentId,artifactId:'mirror',actorId:'alice',actionId:'copy',actionNonce:'nonce-1',targetIds:['bob'],loginId:'bob',type:'effect_notice',night:1,clientEventId:'nonce-1:bob',...overrides})};
  return{data,room,events,storage,meta,runtime,jump,act};
}
async function result(response){return {status:response.status,...await response.json()}}

test('WITCH-01 real Durable Object: wake Old Witch right after optional Wolf recognition regardless of order',async()=>{
  const h=harness();h.data.set('gameConfig',{roles:[{roleId:'seer',order:1},{roleId:'role_wolf',order:2},{roleId:'role_old_witch',order:99}],timing:{defaultActionSec:30,wolfDiscussionSec:20}});
  h.data.set('assignments',[
    {loginId:'alice',roleId:'role_old_witch',roleName:'Phù Thuỷ Già'},
    {loginId:'bob',roleId:'role_wolf',roleName:'Sói'},
    {loginId:'carol',roleId:'role_wolf',roleName:'Sói'},
    {loginId:'dave',roleId:'seer',roleName:'Tiên Tri'}
  ]);
  const rt=await h.runtime();
  assert.deepEqual(Array.from(rt.queue.slice(0,3),x=>x.kind),['wolf-introduction','role','wolf-pack-bite']);
  assert.equal(rt.queue[1].roleId,'role_old_witch');
  assert.equal(rt.queue[3].roleId,'seer');
  const h2=harness({artifact:false});
  h2.data.set('assignments',[{loginId:'alice',roleId:'role_old_witch',roleName:'Phù Thuỷ Già'},{loginId:'bob',roleId:'seer',roleName:'Tiên Tri'}]);
  h2.data.set('gameConfig',{roles:[{roleId:'seer',order:1},{roleId:'role_old_witch',order:99}],timing:{defaultActionSec:30}});
  const alone=await h2.runtime();
  assert.equal(alone.queue[0].roleId,'role_old_witch');
});

test('WITCH-01 real Durable Object: reject invalid revive before writes and accept prior-night target',async()=>{
  const h=harness({artifact:false});h.data.set('gameConfig',{roles:[{roleId:'role_old_witch',order:99}],timing:{defaultActionSec:30}});
  h.data.set('assignments',[{loginId:'alice',roleId:'role_old_witch',roleName:'Phù Thuỷ Già'}]);
  h.data.set('roles:alice',[{roleId:'role_old_witch',matchId:'test-match',roleCard:{flags:{allowMultipleActions:false},functions:[
    {actionId:'action_revive',usageMode:'onceGame',usageCount:1},{actionId:'action_exile',usageMode:'eachNight',usageCount:1}]}}]);
  h.data.get('meta').cycleNight=2;h.data.get('meta').cycleKey='night-2';
  const rt=await h.room.getNightRuntime(await h.meta(),2,true),m=await h.meta();
  m.currentNightTurnId=rt.currentId;h.data.set('meta',m);
  const act=(targets,nonce,type='revive',actionId='action_revive')=>h.room.gmBattleAction(null,{matchId:'test-match',cycleKey:'night-2',
    turnId:rt.currentId,actorId:'alice',type,actionId,targetIds:targets,clientEventId:nonce});
  assert.equal((await result(await act(['bob'],'no-death'))).error,'WITCH_REVIVE_TARGET_INELIGIBLE');
  assert.equal(h.data.has('battleRoleUsage:test-match'),false);
  h.data.set('interactions',[{id:'death-1',loginId:'bob',matchId:'test-match',type:'dead',effectActive:true,night:1,cycleKey:'night-1'}]);
  assert.equal((await result(await act(['alice'],'self'))).error,'WITCH_SELF_TARGET');
  assert.equal((await result(await act(['bob'],'revive-valid'))).ok,true);
  assert.equal(h.data.get('interactions')[0].effectActive,false);
  assert.equal((await result(await act(['bob'],'revive-again'))).error,'WITCH_REVIVE_TARGET_INELIGIBLE');
  assert.equal((await result(await act(['carol'],'exile-after-revive','expelled','action_exile'))).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
});

test('NIGHT-02 real DO: Snow Guard pack Wolf specials Fairy precede configured village roles',async()=>{
  const h=harness({artifact:false});
  h.data.set('gameConfig',{roles:[
    {roleId:'role_fairy',order:1},{roleId:'seer',order:2},{roleId:'role_wolf_seer',order:5},
    {roleId:'role_guard',order:80},{roleId:'role_snow_wolf',order:99},{roleId:'role_wolf',order:1}],
    timing:{defaultActionSec:35,wolfDiscussionSec:20}});
  h.data.set('assignments',[
    {loginId:'alice',roleId:'role_fairy',roleName:'Yêu Tinh'},
    {loginId:'bob',roleId:'role_guard',roleName:'Bảo Vệ'},
    {loginId:'carol',roleId:'role_snow_wolf',roleName:'Sói Tuyết',faction:'wolf'},
    {loginId:'dave',roleId:'role_wolf',roleName:'Sói Thường',faction:'wolf'},
    {loginId:'eve',roleId:'role_wolf_seer',roleName:'Sói Tiên Tri',faction:'wolf',
      roleCard:{functions:[{actionId:'action_find_seer',phase:'night'}]}},
    {loginId:'frank',roleId:'seer',roleName:'Tiên Tri'}
  ]);
  const rt=await h.runtime();
  const seq=rt.queue.map(x=>x.kind==='role'?x.roleId:x.kind);
  assert.deepEqual(Array.from(seq.slice(0,7)),[
    'wolf-introduction','role_snow_wolf','role_guard','wolf-pack-bite',
    'role_wolf_seer','role_fairy','seer']);
  const bite=rt.queue.find(x=>x.kind==='wolf-pack-bite');
  assert.deepEqual(Array.from(bite.loginIds).sort(),['carol','dave','eve']);
  assert.deepEqual(Array.from(bite.biteActorIds).sort(),['dave','eve']);
});
test('NIGHT-02 real DO: Snow alone is eligible for pack Bite; wolves absent omit pack step',async()=>{
  const h=harness({artifact:false});h.data.set('assignments',[
    {loginId:'alice',roleId:'role_snow_wolf',roleName:'Sói Tuyết',faction:'wolf'},
    {loginId:'bob',roleId:'seer',roleName:'Tiên Tri'}]);
  const rt=await h.runtime(),bite=rt.queue.find(x=>x.kind==='wolf-pack-bite');
  assert.ok(bite);assert.deepEqual(Array.from(bite.biteActorIds),['alice']);
  const none=harness({artifact:false});
  none.data.set('assignments',[{loginId:'alice',roleId:'seer',roleName:'Tiên Tri'}]);
  assert.equal((await none.runtime()).queue.some(x=>x.kind==='wolf-pack-bite'),false);
});
test('no Artifact produces no opening window; configured Artifacts preserve one owned opening window',async()=>{
  const h=harness({artifact:false}),rt=await h.runtime();
  assert.deepEqual(Array.from(rt.queue,x=>x.kind),['wolf-pack-bite','role','village-wakeup']);
  assert.equal(timelineDisplaySteps(rt.queue).filter(x=>x.kind==='early-artifact-window').length,0);
  const h2=harness(),r2=await h2.runtime();
  assert.deepEqual(Array.from(r2.queue.slice(0,2),x=>x.kind),['early-artifact-window','wolf-pack-bite']);
  assert.equal(r2.queue[2].loginIds.length,2);assert.equal(r2.queue[2].artifacts[0].loginId,'alice');
  assert.equal(h2.data.has('artifactUse:alice:mirror'),false);
  assert.equal(timelineDisplaySteps(r2.queue).filter(x=>x.kind==='early-artifact-window').length,1);
});
test('ART-01 skip from night two when priority absent/exhausted; no Artifact mode skips night one',async()=>{
  const h=harness();
  h.data.get('gameConfig').artifactsEnabled=false;
  assert.ok(!(await h.runtime()).queue.some(x=>x.kind==='early-artifact-window'));
  const prioritized=harness({singleUse:true});
  prioritized.data.set('artifactUse:alice:mirror',{usedAt:new Date().toISOString()});
  const second=await prioritized.room.getNightRuntime({...await prioritized.meta(),cycleNight:2},2,true);
  assert.ok(!second.queue.some(x=>x.kind==='early-artifact-window'));
  const reusable=harness();
  const next=await reusable.room.getNightRuntime({...await reusable.meta(),cycleNight:2},2,true);
  assert.equal(next.queue[0].kind,'early-artifact-window');
  const unprioritized=harness();
  unprioritized.data.get('assignments')[0].artifactPriorityFirst=false;
  unprioritized.data.get('artifact:alice').priorityFirst=false;
  const first=await unprioritized.runtime();
  assert.equal(first.queue[0].kind,'early-artifact-window');
  assert.equal(first.queue[0].actions.length,0);
  const later=await unprioritized.room.getNightRuntime({...await unprioritized.meta(),cycleNight:2},2,true);
  assert.equal(later.queue.some(x=>x.kind==='early-artifact-window'),false);
  const audio=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  assert.match(audio,/audio_system_early_artifacts/);
});

test('skipping priority window does not consume Artifact; owner uses it at role turn',async()=>{
  const h=harness();await h.jump('role');
  assert.equal(h.data.has('artifactUse:alice:mirror'),false);
  assert.equal((await result(await h.act())).ok,true);
  assert.equal(h.data.get('artifactCycle:test-match:night:1').accepted.length,1);
  assert.equal((await result(await h.act({actionNonce:'nonce-2',clientEventId:'nonce-2:bob'}))).error,'ARTIFACT_ALREADY_USED');
});
test('priority use cannot be replayed at role turn, but role action remains available',async()=>{
  const h=harness();await h.jump('early-artifact-window');assert.equal((await result(await h.act())).ok,true);
  await h.jump('role');
  assert.equal((await result(await h.act({clientEventId:'second',actionNonce:'nonce-2'}))).error,'ARTIFACT_ALREADY_USED');
  assert.equal((await result(await h.act({artifactId:undefined,actionId:'inspect',clientEventId:'role-action'}))).ok,true);
});
test('server rejects non-owner, stale ownership and unconfigured action without consuming stock',async()=>{
  for(const mode of ['non-owner','stale','action']){
    const h=harness();await h.jump('early-artifact-window');
    if(mode==='stale')h.data.get('artifact:alice').artifactId='other';
    const r=await result(await h.act(mode==='non-owner'?{actorId:'bob'}:mode==='action'?{actionId:'invented'}:{}));
    assert.equal(r.ok,false);assert.equal(h.data.has('artifactUse:alice:mirror'),false);
  }
});
test('one confirmed multi-target action reserves once, retries once, and binds nonce to action/targets',async()=>{
  const h=harness({singleUse:true});await h.jump('early-artifact-window');
  const selection={targetIds:['bob','carol']};
  assert.equal((await result(await h.act(selection))).ok,true);
  assert.equal((await result(await h.act({...selection,loginId:'carol',clientEventId:'nonce-1:carol'}))).ok,true);
  assert.equal((await result(await h.act(selection))).idempotent,true);
  assert.equal(h.data.get('artifactCycle:test-match:night:1').accepted.length,1);
  assert.equal(h.data.get('interactions').length,2);
  assert.equal((await result(await h.act({targetIds:['bob','dave'],loginId:'dave',clientEventId:'nonce-1:dave'}))).error,'ARTIFACT_ALREADY_USED');
  assert.equal((await result(await h.act({...selection,type:'dead',clientEventId:'nonce-1:changed'}))).error,'ARTIFACT_ALREADY_USED');
});
test('invalid multi-target selection leaves Artifact unused',async()=>{
  const h=harness();await h.jump('early-artifact-window');
  assert.equal((await result(await h.act({targetIds:['bob','missing']}))).error,'INVALID_ARTIFACT_TARGET');
  assert.equal(h.data.has('artifactUse:alice:mirror'),false);
});
test('GM delivery preserves configured Artifact target limits through the card payload',()=>{
  const gmSource=fs.readFileSync('server-game/current/app.js','utf8');
  const definition=gmSource.slice(gmSource.indexOf('function playArtifactCardPayload('),gmSource.indexOf('async function playBlobDataUrl('));
  const helper=gmSource.slice(gmSource.indexOf('function playFunctionRulePayload('),gmSource.indexOf('function playRoleCardPayload('));
  const payload=vm.runInNewContext('const state={actions:{artifacts:[]}};'+helper+definition+'; playArtifactCardPayload');
  const card=payload({id:'stone',name:'Đá Đổi Vai Trò',functions:[{actionId:'swap',targetCount:2,noSelf:false,allowDead:true}]});
  assert.equal(card.actions[0].targetCount,2);
  assert.equal(card.actions[0].noSelf,false);
  assert.equal(card.actions[0].allowDead,true);
  const delivered=sanitizePlayerArtifactCard(card);
  assert.equal(delivered.actions[0].targetCount,2);
  assert.equal(delivered.actions[0].noSelf,false);
  assert.equal(delivered.actions[0].allowDead,true);
});
test('Artifact card sanitizer retains explicit target restrictions for the server',()=>{
  const result=sanitizePlayerArtifactCard({name:'Tráng Gương',actions:[{id:'copy',targetCount:2,noSelf:true,allowDead:false},{id:'legacy'}]});
  assert.equal(result.actions[0].targetCount,2);
  assert.equal(result.actions[0].noSelf,true);
  assert.equal(result.actions[0].allowDead,false);
  assert.equal(result.actions[1].targetCount,undefined);
  assert.equal(result.actions[1].noSelf,undefined);
});
test('configured Artifact target count is enforced before consuming stock',async()=>{
  const h=harness();h.data.get('artifact:alice').artifactCard.actions[0].targetCount=2;
  await h.jump('early-artifact-window');
  assert.equal((await result(await h.act())).error,'INVALID_ARTIFACT_TARGET_COUNT');
  assert.equal(h.data.has('artifactUse:alice:mirror'),false);
  assert.equal((await result(await h.act({targetIds:['bob','carol'],clientEventId:'correct-count:bob'}))).ok,true);
  assert.equal(h.data.get('artifactCycle:test-match:night:1').accepted.length,1);
});
test('Artifact cannot target its owner unless configuration explicitly permits',async()=>{
  const h=harness();await h.jump('early-artifact-window');
  const self={loginId:'alice',targetIds:['alice'],clientEventId:'self-target',actionNonce:'self-target'};
  assert.equal((await result(await h.act(self))).error,'ARTIFACT_SELF_TARGET_FORBIDDEN');
  assert.equal(h.data.has('artifactUse:alice:mirror'),false);
  h.data.get('artifact:alice').artifactCard.actions[0].noSelf=false;
  assert.equal((await result(await h.act({...self,clientEventId:'self-allowed',actionNonce:'self-allowed'}))).ok,true);
});
test('single-use exact retry is idempotent; reuse in a later night stays rejected',async()=>{
  const h=harness({singleUse:true});
  const request={loginId:'alice',requestId:'player-1',targetId:'member:bob'};
  assert.equal((await result(await h.room.playerArtifactActivate(request))).ok,true);
  assert.equal((await result(await h.room.playerArtifactActivate(request))).idempotent,true);
  h.data.get('meta').cycleNight=2;
  assert.equal((await result(await h.room.playerArtifactActivate(request))).error,'ARTIFACT_ALREADY_USED');
});
test('Knight last strike queued on previous day resolves once at next dawn, preserving unrelated records',async()=>{
  const h=harness({artifact:false}),now=new Date().toISOString();
  h.data.set('knightPending:test-match:2:bob',{matchId:'test-match',actorId:'alice',targetId:'bob',resolveDay:2,createdAt:now});
  h.data.set('interactions',[{id:'unrelated',loginId:'carol',type:'dead',effectActive:true,matchId:'test-match',createdAt:now}]);
  const result=await h.room.applyCycle(await h.meta(),'morning',2,'morning-2');
  assert.equal(result.ok,true);
  const rows=h.data.get('interactions');
  assert.equal(rows.filter(x=>x.id==='knight-strike:test-match:2:bob').length,1);
  assert.equal(rows.find(x=>x.id==='unrelated').effectActive,true);
  assert.equal(h.data.has('knightPending:test-match:2:bob'),false);
  await h.room.applyCycle(await h.meta(),'morning',2,'morning-2');
  assert.equal(h.data.get('interactions').filter(x=>x.id==='knight-strike:test-match:2:bob').length,1);
});
test('Manual GM completes morning once, expires freeze and preserves deaths and stored game data',async()=>{
  const h=harness();h.data.set('interactions',[{id:'f',loginId:'bob',type:'frozen',effectActive:true,night:1},{id:'d',loginId:'carol',type:'dead',effectActive:true,night:1}]);
  h.data.set('artwork:sentinel',{image:'unchanged'});const config=clone(h.data.get('gameConfig')),players=clone(h.data.get('players'));
  await h.jump('village-wakeup');
  assert.equal((await result(await h.room.gmTurn(null,{action:'next',expectedTurnId:'village-wakeup'}))).ok,true);
  const meta=await h.meta();assert.equal(meta.cyclePhase,'morning');
  assert.equal(h.data.get('interactions')[0].effectActive,false);assert.equal(h.data.get('interactions')[1].effectActive,true);
  const count=h.events.filter(e=>e.type==='room_cycle').length;
  assert.equal((await result(await h.room.gmTurn(null,{action:'next',expectedTurnId:'village-wakeup'}))).error,'NOT_NIGHT_TURN');
  const repeated=await h.room.applyCycle(meta,'morning',1,'morning-1');assert.equal(repeated.idempotent,true);
  assert.equal(h.events.filter(e=>e.type==='room_cycle').length,count);
  assert.deepEqual(h.data.get('gameConfig'),config);assert.deepEqual(h.data.get('players'),players);assert.deepEqual(h.data.get('artwork:sentinel'),{image:'unchanged'});
  assert.ok(h.events.some(e=>e.type==='room_state'&&e.room.cyclePhase==='morning'));
});
test('Auto GM completes zero-duration wakeup instead of stalling forever',async()=>{
  const h=harness({auto:true});await h.jump('village-wakeup');
  assert.equal((await h.runtime()).deadlineAt,null);
  assert.equal(await h.room.runAutoAdvanceIfDue(await h.meta()),true);
  assert.equal((await h.meta()).cyclePhase,'morning');
  assert.equal(await h.room.runAutoAdvanceIfDue(await h.meta()),false);
  assert.equal(h.events.filter(e=>e.type==='room_cycle').length,1);
});
test('timeline navigation rejects stale expected turn; backward navigation never consumes Artifact',async()=>{
  const h=harness();await h.jump('role');
  assert.equal((await result(await h.room.gmTurn(null,{action:'next',expectedTurnId:'wolf-introduction'}))).error,'STALE_TURN');
  await h.jump('early-artifact-window');assert.equal((await h.runtime()).currentId,'early-artifact-window');
  assert.equal(h.data.has('artifactUse:alice:mirror'),false);
});
test('replaying a successful revive does not clear a later death; changed event payload is rejected',async()=>{
  const h=harness();await h.jump('role');
  h.data.set('interactions',[{id:'death-1',loginId:'bob',type:'dead',effectActive:true,night:1}]);
  const request={artifactId:undefined,actionId:'revive',type:'revive',clientEventId:'revive-1'};
  assert.equal((await result(await h.act(request))).ok,true);
  h.data.get('interactions').push({id:'death-2',loginId:'bob',type:'dead',effectActive:true,night:1});
  assert.equal((await result(await h.act(request))).idempotent,true);
  assert.equal(h.data.get('interactions').find(x=>x.id==='death-2').effectActive,true);
  assert.equal((await result(await h.act({...request,type:'clear_state'}))).error,'REQUEST_ID_CONFLICT');
});
test('request-ID collision across owners cannot reserve or impersonate another Artifact',()=>{
  const state={cycleKey:'test:night:1',accepted:[{requestId:'same-id',playerId:'member:alice',artifactId:'mirror'}]};
  const r=reserveArtifactActivation(state,{requestId:'same-id',playerId:'member:bob',artifactId:'stone',cycleKey:state.cycleKey,eligible:true,limit:3});
  assert.equal(r.ok,false);assert.equal(r.error,'REQUEST_ID_CONFLICT');assert.equal(state.accepted.length,1);
});


test('NIGHT-02 bare Wolf roles sharing order only wake in the common pack bite turn',async()=>{
  const h=harness({artifact:false});
  h.data.set('gameConfig',{roles:[{roleId:'regular-wolf',order:6},{roleId:'alpha-wolf',order:6}],
    timing:{wolfDiscussionSec:30,earlyArtifactSec:60,defaultActionSec:35}});
  h.data.set('assignments',[
    {loginId:'alice',roleId:'regular-wolf',roleName:'Sói Thường'},
    {loginId:'bob',roleId:'alpha-wolf',roleName:'Sói Trùm'}
  ]);
  const rt=await h.runtime(),pack=rt.queue.find(x=>x.kind==='wolf-pack-bite');
  assert.ok(pack);assert.equal(pack.order,-1);
  assert.deepEqual([...pack.loginIds].sort(),['alice','bob']);
  assert.deepEqual(pack.roles.map(r=>r.roleId),['regular-wolf','alpha-wolf']);
  assert.equal(rt.queue.filter(x=>['role','role-group'].includes(x.kind)).length,0);
  assert.equal(rt.queue[0].durationSec,30);
  assert.equal(rt.queue[1].durationSec,35);
  assert.ok(!rt.queue.some(x=>x.kind==='early-artifact-window'));
});

test('batched GM action reverses both targets and one Artifact use on server',async()=>{
  const h=harness({artifact:true,singleUse:true});
  await h.jump('early-artifact-window');
  const meta=await h.meta(),rt=await h.runtime();
  // Match applyCycle: it saves the first night turn ID even when the first step
  // is Artifact at index zero (jumping to the same index does not rewrite meta).
  h.data.get('meta').currentNightTurnId=rt.currentId;
  const payload={turnId:rt.currentId,actorId:'alice',artifactId:'mirror',
    type:'frozen',actionId:'copy',effectId:'freeze',effectName:'Đóng Băng',
    targetIds:['bob','carol'],matchId:meta.matchId,cycleKey:meta.cycleKey,
    clientEventId:'tx-freeze-01',night:1};
  const done=await result(await h.room.gmBattleAction(null,payload));
  assert.equal(done.ok,true);
  assert.equal(done.results.length,2);
  assert.equal(h.data.get('interactions').length,2);
  assert.equal(h.data.get('artifactCycle:test-match:night:1').accepted.length,1);
  assert.ok(h.data.has('artifactUse:alice:mirror'));
  const undone=await result(await h.room.gmBattleUndo(null,{undoToken:done.undoToken}));
  assert.equal(undone.ok,true);
  assert.equal(h.data.has('artifactUse:alice:mirror'),false);
  assert.equal(h.data.has('artifactCycle:test-match:night:1'),false);
  assert.equal(h.data.has('interactions'),false);
  assert.equal(h.data.get('artifact:alice').usedAt,undefined);
  assert.equal((await result(await h.room.gmBattleUndo(null,{undoToken:done.undoToken}))).idempotent,true);
  assert.deepEqual(h.data.get('players'),Object.fromEntries(['alice','bob','carol','dave'].map(loginId=>['member:'+loginId,{loginId}])));
});

test('GM undo rejects stale turn and changed state; frozen role owner cannot act',async()=>{
  const h=harness({artifact:false});
  await h.jump('role');
  const meta=await h.meta(),rt=await h.runtime();
  const p={turnId:rt.currentId,actorId:'alice',type:'dead',actionId:'inspect',effectName:'Thử',
    targetIds:['bob'],matchId:meta.matchId,cycleKey:meta.cycleKey,clientEventId:'tx-dead-01',night:1};
  const done=await result(await h.room.gmBattleAction(null,p));assert.equal(done.ok,true);
  h.data.get('interactions').push({id:'external',loginId:'carol',type:'dead',effectActive:true,matchId:'test-match'});
  assert.equal((await result(await h.room.gmBattleUndo(null,{undoToken:done.undoToken}))).error,'UNDO_STATE_CHANGED');
  h.data.get('interactions').pop();
  await h.room.gmTurn(null,{action:'next',expectedTurnId:rt.currentId}); // advance to the next configured role
  assert.equal((await result(await h.room.gmBattleUndo(null,{undoToken:done.undoToken}))).error,'UNDO_STALE_TURN');
  const i=await h.data.get('interactions');
  i.push({id:'freeze-owner',loginId:'alice',type:'frozen',effectActive:true,matchId:'test-match'});
  h.data.set('interactions',i);
  await h.jump('role'); // After the shared pack turn there may be no second bare-Wolf role.
  const next=await result(await h.room.gmBattleAction(null,{...p,actorId:'alice',turnId:(await h.runtime()).currentId,clientEventId:'tx-frozen'}));
  assert.equal(next.error,'ACTOR_CANNOT_ACT');
});

test('partial failure of a multi-target confirmation restores entire interaction snapshot',async()=>{
  const h=harness({artifact:false});await h.jump('role');
  const meta=await h.meta(),rt=await h.runtime();
  const original=h.room.executeGmInteraction.bind(h.room);let count=0;
  h.room.executeGmInteraction=async(...args)=>{
    if(++count===2)return Response.json({ok:false,error:'MOCK_SECOND_TARGET_REJECTED'},{status:409});
    return original(...args);
  };
  const p={turnId:rt.currentId,actorId:'alice',type:'dead',actionId:'inspect',
    targetIds:['bob','carol'],matchId:meta.matchId,cycleKey:meta.cycleKey,
    clientEventId:'tx-fail-02',night:1};
  const failed=await result(await h.room.gmBattleAction(null,p));
  assert.equal(failed.error,'BATTLE_ACTION_ABORTED');
  assert.equal(h.data.has('interactions'),false);
  assert.equal(h.data.has('battleLastAction:test-match'),false);
});

test('G4 engine integration: disabled actor cannot confirm a role action, expired status restores action',async()=>{
  const h=harness({artifact:false});await h.jump('role');
  const meta=await h.meta(),rt=await h.runtime();
  const payload={turnId:rt.currentId,actorId:'alice',type:'effect_notice',actionId:'inspect',
    targetIds:['bob'],matchId:meta.matchId,cycleKey:meta.cycleKey,
    clientEventId:'blocked-actor-g4',night:1};
  h.data.set('interactions',[{id:'locked',loginId:'alice',type:'status',statusId:'disabled_permanent',
    effectActive:true,matchId:meta.matchId}]);
  const denied=await result(await h.room.gmBattleAction(null,payload));
  assert.equal(denied.error,'ACTOR_CANNOT_ACT');
  assert.equal(h.data.has('battleActionReceipt:test-match:blocked-actor-g4'),false);
  assert.equal(h.data.get('interactions').length,1,'rejected action must not write new effects');
  h.data.get('interactions')[0].effectActive=false;
  const allowed=await result(await h.room.gmBattleAction(null,payload));
  assert.equal(allowed.ok,true,'actor must act again once the status expires');
});

test('G4 live DO: frozen actor is blocked on night 1, thawed by morning, acts on night 2; dead actor stays blocked',async()=>{
  const h=harness({artifact:false});await h.jump('role');
  h.data.set('interactions',[
    {id:'freeze-night-one',loginId:'alice',type:'frozen',matchId:'test-match',cycleKey:'night-1',night:1,effectActive:true},
    {id:'dead-night-one',loginId:'carol',type:'dead',matchId:'test-match',cycleKey:'night-1',night:1,effectActive:true}
  ]);
  const meta1=await h.meta(),first=await h.runtime();
  const payload={turnId:first.currentId,actorId:'alice',type:'effect_notice',actionId:'inspect',
    targetIds:['bob'],matchId:meta1.matchId,cycleKey:meta1.cycleKey,
    clientEventId:'g4-night-1-attempt',night:1};
  const blocked=await result(await h.room.gmBattleAction(null,payload));
  assert.equal(blocked.error,'ACTOR_CANNOT_ACT');
  assert.equal(h.data.has('battleActionReceipt:test-match:g4-night-1-attempt'),false);
  const morning=await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(morning.expired.some(x=>x.id==='freeze-night-one'),true);
  assert.equal(h.data.get('interactions').find(x=>x.id==='freeze-night-one').effectActive,false);
  assert.equal(h.data.get('interactions').find(x=>x.id==='dead-night-one').effectActive,true);
  const night2=await h.room.applyCycle(await h.meta(),'night',2,'night-2','lab');
  const seerIndex=night2.nightRuntime.queue.findIndex(row=>
    ['role','role-group'].includes(row.kind)&&(row.loginIds||[]).includes('alice'));
  assert.ok(seerIndex>=0,'seer waking step exists on night 2');
  await h.room.gmTurn(null,{action:'jump',targetIndex:seerIndex});
  const meta2=await h.meta(),current=await h.room.getNightRuntime(meta2,2,false);
  const success=await result(await h.room.gmBattleAction(null,{...payload,night:2,
    turnId:current.currentId,cycleKey:meta2.cycleKey,clientEventId:'g4-night-2-success'}));
  assert.equal(success.ok,true,'once thawed the actor can use their role');
  const wolfIndex=current.queue.findIndex(row=>row.kind==='wolf-pack-bite');
  assert.equal(wolfIndex,-1,'no Pack Bite step remains when the only Wolf is dead');
  const wolf=await h.room.getNightRuntime(await h.meta(),2,false);
  const denied=await result(await h.room.gmBattleAction(null,{...payload,actorId:'carol',
    actionId:'action_wolf_bite',turnId:wolf.currentId,cycleKey:meta2.cycleKey,
    clientEventId:'g4-dead-wolf-denied',night:2}));
  assert.equal(denied.error,'INVALID_ACTOR_FOR_TURN','dead wolf has no pack action authority');
});
test('G4 live DO: two-night disabled status expires at night 3, not night 2',async()=>{
  const h=harness({artifact:false});
  h.data.set('interactions',[{id:'disable-two-nights',type:'status',statusId:'disabled_2n',
    loginId:'alice',matchId:'test-match',cycleKey:'night-1',night:1,effectActive:true,
    duration:'nights',nights:2}]);
  const checkNight=async(n)=>{
    const meta=await h.meta(),runtime=await h.room.getNightRuntime(meta,n,true);
    const idx=runtime.queue.findIndex(row=>['role','role-group'].includes(row.kind)&&(row.loginIds||[]).includes('alice'));
    assert.ok(idx>=0);
    await h.room.gmTurn(null,{action:'jump',targetIndex:idx});
    const m=await h.meta(),turn=await h.room.getNightRuntime(m,n,false);
    return result(await h.room.gmBattleAction(null,{turnId:turn.currentId,actorId:'alice',
      type:'effect_notice',actionId:'inspect',targetIds:['bob'],matchId:m.matchId,
      cycleKey:m.cycleKey,clientEventId:'g4-two-night-'+n,night:n}));
  };
  await h.room.applyCycle(await h.meta(),'night',2,'night-2','lab');
  assert.equal(h.data.get('interactions')[0].effectActive,true);
  assert.equal((await checkNight(2)).error,'ACTOR_CANNOT_ACT');
  const third=await h.room.applyCycle(await h.meta(),'night',3,'night-3','lab');
  assert.equal(third.expired.some(x=>x.id==='disable-two-nights'&&x.reason==='NIGHTS_ELAPSED'),true);
  assert.equal(h.data.get('interactions')[0].effectActive,false);
  assert.equal((await checkNight(3)).ok,true);
});

const g43notice=(actionId,loginId,{actorId='gm',direction=''}={})=>({
  id:'notice:'+actionId+':'+loginId,type:'effect_notice',actionId,actorId,loginId,
  direction,matchId:'test-match',night:1,cycleKey:'night-1',effectActive:false
});
const g43seated=h=>{
  const seats={alice:1,bob:2,carol:3,dave:4};
  for(const p of Object.values(h.data.get('players')))p.seatId=seats[p.loginId];
  return h;
};
test('G4.3 real DO morning: confirmed direct wolf bite produces an active death once',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.set('interactions',[g43notice('action_wolf_bite','bob')]);
  const result=await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(result.ok,true);
  assert.deepEqual(Array.from(h.data.get('interactions').filter(x=>x.type==='dead'&&x.effectActive!==false),x=>x.loginId),['bob']);
  await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(h.data.get('interactions').filter(x=>x.type==='dead').length,1,'replay must not create second death');
});
test('G4.3 real DO morning: Fairy transfers guarded bite, then checks guard on final target',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.set('interactions',[
    g43notice('action_wolf_bite','bob'),g43notice('action_protect','bob'),
    g43notice('action_transfer_bite','carol',{actorId:'carol',direction:'right'})
  ]);
  await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.deepEqual(Array.from(h.data.get('interactions').filter(x=>x.type==='dead'),x=>x.loginId),['alice']);
  const guarded=g43seated(harness({artifact:false}));
  guarded.data.set('interactions',[
    g43notice('action_wolf_bite','bob'),g43notice('action_protect','alice'),
    g43notice('action_transfer_bite','carol',{actorId:'carol',direction:'right'})
  ]);
  await guarded.room.applyCycle(await guarded.meta(),'morning',1,'morning-1','lab');
  assert.equal(guarded.data.get('interactions').filter(x=>x.type==='dead').length,0);
});
test('G4.3 real DO morning: Fairy without a bite cannot create a death',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.set('interactions',[g43notice('action_transfer_bite','carol',{actorId:'carol',direction:'left'})]);
  await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(h.data.get('interactions').filter(x=>x.type==='dead').length,0);
});
test('G4.3 real DO morning: unrelated death survives protection and next-night state',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.set('interactions',[g43notice('action_protect','bob'),{
    id:'witch-death',type:'dead',loginId:'bob',matchId:'test-match',night:1,effectActive:true,
    actionId:'action_witch_kill'
  }]);
  await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(h.data.get('interactions').filter(x=>x.type==='dead'&&x.effectActive!==false).length,1);
  await h.room.applyCycle(await h.meta(),'night',2,'night-2','lab');
  assert.equal(h.data.get('interactions').some(x=>x.id==='witch-death'&&x.effectActive),true);
});


test('G4.4 live DO: Guard protection does not leak into a later night; the later wolf death persists',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.set('interactions',[
    g43notice('action_wolf_bite','bob'),
    g43notice('action_protect','bob')
  ]);
  const dawn1=await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(dawn1.wolfResolution.ok,true);
  assert.deepEqual(Array.from(dawn1.wolfResolution.blocked),['bob']);
  assert.equal(h.data.get('interactions').some(row=>row.type==='dead'),false);

  await h.room.applyCycle(await h.meta(),'night',2,'night-2','lab');
  h.data.get('interactions').push({...g43notice('action_wolf_bite','bob'),id:'bite-on-night-2',night:2,cycleKey:'night-2'});
  const dawn2=await h.room.applyCycle(await h.meta(),'morning',2,'morning-2','lab');
  assert.equal(dawn2.wolfResolution.ok,true);
  assert.deepEqual(Array.from(dawn2.wolfResolution.victims),['bob']);
  const deaths=()=>h.data.get('interactions').filter(row=>row.type==='dead'&&row.effectActive!==false);
  assert.deepEqual(deaths().map(row=>row.loginId),['bob']);
  assert.equal(deaths()[0].night,2,'wolf death must be attributed to the actual night');
  const replay=await h.room.applyCycle(await h.meta(),'morning',2,'morning-2','lab');
  assert.equal(replay.idempotent,true);
  assert.equal(deaths().length,1,'retry must not create a second death');
  await h.room.applyCycle(await h.meta(),'night',3,'night-3','lab');
  assert.equal(deaths().length,1,'wolf death must survive a new night');
});

test('G4.4 live DO: Fairy with ambiguous seating fails closed without killing unrelated members',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.get('players')['member:carol'].seatId=2; // duplicate seat 2, no safe neighbor ordering
  h.data.set('interactions',[
    g43notice('action_wolf_bite','bob'),
    g43notice('action_transfer_bite','carol',{actorId:'carol',direction:'right'}),
    {id:'existing-death',type:'dead',loginId:'dave',matchId:'test-match',night:1,effectActive:true,
      actionId:'action_witch_kill'}
  ]);
  const result=await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(result.wolfResolution.ok,false);
  assert.equal(result.wolfResolution.error,'SEAT_ORDER_UNAVAILABLE');
  assert.deepEqual(h.data.get('interactions').filter(row=>row.type==='dead').map(row=>row.id),['existing-death'],
    'missing seat ordering must not manufacture a new death or erase an unrelated death');
});

test('G4.4 live DO: cross-match wolf actions cannot affect another match at dawn',async()=>{
  const h=g43seated(harness({artifact:false}));
  h.data.set('interactions',[
    {...g43notice('action_wolf_bite','bob'),matchId:'another-match'},
    {...g43notice('action_protect','carol'),matchId:'another-match'},
    {...g43notice('action_transfer_bite','alice',{direction:'left'}),matchId:'another-match'}
  ]);
  const morning=await h.room.applyCycle(await h.meta(),'morning',1,'morning-1','lab');
  assert.equal(morning.wolfResolution.ok,true);
  assert.equal(morning.wolfResolution.biteCount,0);
  assert.deepEqual(Array.from(morning.wolfResolution.victims),[]);
  assert.equal(h.data.get('interactions').some(row=>row.type==='dead'),false);
});

test('G4 acceptance: summarized assignments enforce limits from existing private role cards',async()=>{
  const h=harness({artifact:false});await h.jump('role');
  h.data.set('roles:alice',[{loginId:'alice',roleId:'seer',matchId:'test-match',roleCard:{
    flags:{allowMultipleActions:false},functions:[
      {actionId:'inspect',usageMode:'eachNight',usageCount:1},
      {actionId:'revive',usageMode:'onceGame',usageCount:1}
    ]
  }}]);
  const rt=await h.runtime(),meta=await h.meta();
  const request={turnId:rt.currentId,actorId:'alice',type:'effect_notice',actionId:'inspect',
    targetIds:['bob'],matchId:meta.matchId,cycleKey:meta.cycleKey,night:1,clientEventId:'private-limit'};
  assert.equal((await result(await h.room.gmBattleAction(null,request))).ok,true);
  assert.equal((await result(await h.room.gmBattleAction(null,{...request,actionId:'revive',type:'revive',clientEventId:'other-function'}))).error,'ROLE_NIGHT_ACTION_EXHAUSTED');
  assert.equal(h.data.get('battleRoleUsage:test-match').length,1);
  assert.equal(h.data.get('assignments')[0].roleCard,undefined,'public summary shape stays unchanged');
});

async function serverHarness({artifact=false}={}){
 const h=harness({artifact}),m=await h.meta();m.demo=true;await h.storage.put('meta',m);
 h.room.computeWinProposal=()=>null;h.room.demoInternalRequest=()=>null;
 const cards=[{roleId:'seer',functions:[{id:'protect',actionId:'action_protect',name:'Bảo Vệ',phase:'night',targetCount:1,noSelf:true,usageMode:'eachNight',usageCount:1}],flags:{allowMultipleActions:true}}];
 for(const actor of ['alice','bob'])await h.storage.put('roles:'+actor,[{...cards[0],matchId:m.matchId,roleCard:cards[0]}]);
 const rt=await h.runtime();rt.cursor=rt.queue.findIndex(t=>t.roleId==='seer');rt.currentId=rt.queue[rt.cursor].id;m.currentNightTurnId=rt.currentId;await h.storage.put('meta',m);rt.queue[rt.cursor].durationSec=60;await h.storage.put(h.room.nightRuntimeKey(m,1),rt);
 await h.storage.put('demoLease',{engine:'server',running:true,matchId:m.matchId,speed:1,startedAt:Date.now(),steps:0});
 await h.room.syncDemoClock(m,await h.storage.get('demoLease'));
 return h;
}
test('Server alarm waits for half-time, uses real handler once and ignores duplicate invocations',async()=>{
 const h=await serverHarness();await runServerDemo(h.room,await h.meta());assert.equal((h.data.get('battleRoleUsage:test-match')||[]).length,0);
 let clock=h.data.get('demoClock');clock.remainingMs=30000;clock.at=Date.now();h.data.set('demoClock',clock);
 await runServerDemo(h.room,await h.meta());assert.equal(h.data.get('battleRoleUsage:test-match').length,1);
 await runServerDemo(h.room,await h.meta());assert.equal(h.data.get('battleRoleUsage:test-match').length,1,'duplicate alarm never reapplies action');
 const lease=h.data.get('demoLease');assert.equal(lease.lastEvent.status,'accepted');assert.equal(lease.lastEvent.targetIds.length,1);assert.equal(h.data.get('demoPlan').cursor,1);
});
test('GM action before midpoint satisfies server task and is never duplicated by Auto',async()=>{
 const h=await serverHarness(),rt=await h.runtime();
 const accepted=await result(await h.room.gmBattleAction(null,{matchId:'test-match',cycleKey:'night-1',turnId:rt.currentId,actorId:'alice',actionId:'action_protect',type:'effect_notice',targetIds:['carol'],clientEventId:'manual-first',night:1}));assert.equal(accepted.ok,true);
 const clock=h.data.get('demoClock');clock.remainingMs=30000;clock.at=Date.now();h.data.set('demoClock',clock);
 await runServerDemo(h.room,await h.meta());assert.equal(h.data.get('battleRoleUsage:test-match').length,1);assert.equal(h.data.get('battleRoleUsage:test-match')[0].eventId,'manual-first');
});
test('A failed server alarm rolls effects, receipts and plan back together; retry applies exactly once',async()=>{
 const h=await serverHarness(),clock=h.data.get('demoClock');clock.remainingMs=30000;clock.at=Date.now();h.data.set('demoClock',clock);
 const put=h.storage.put;let fail=true;
 h.storage.put=async(k,v)=>{if(k==='demoPlan'&&v.cursor===1&&fail){fail=false;throw Error('injected storage failure after action')}return put(k,v)};
 await h.room.roomAlarm();assert.equal((h.data.get('battleRoleUsage:test-match')||[]).length,0,'action rolled back');assert.equal([...h.data.keys()].filter(k=>k.startsWith('battleActionReceipt:')).length,0,'receipt rolled back');
 await h.room.roomAlarm();assert.equal(h.data.get('battleRoleUsage:test-match').length,1);assert.equal([...h.data.keys()].filter(k=>k.startsWith('battleActionReceipt:')).length,1);
 await h.room.roomAlarm();assert.equal(h.data.get('battleRoleUsage:test-match').length,1);
});

test('Server Artifact uses existing cycle ledger once and respects configured cap',async()=>{
 const h=await serverHarness({artifact:true});let clock=h.data.get('demoClock');clock.remainingMs=30000;clock.at=Date.now();h.data.set('demoClock',clock);
 await runServerDemo(h.room,await h.meta());clock=h.data.get('demoClock');clock.remainingMs=15000;clock.at=Date.now();h.data.set('demoClock',clock);
 await runServerDemo(h.room,await h.meta());const key='artifactCycle:'+artifactCycleKey('test-match',1);assert.equal(h.data.get(key).accepted.length,1);
 await runServerDemo(h.room,await h.meta());assert.equal(h.data.get(key).accepted.length,1);
});
test('Server safety bound pauses visibly without changing room or member data',async()=>{
 const h=await serverHarness(),lease=h.data.get('demoLease');lease.steps=800;h.data.set('demoLease',lease);
 await runServerDemo(h.room,await h.meta());assert.equal(h.data.get('demoLease').reason,'limit');assert.equal(h.data.get('demoLease').running,false);assert.equal((await h.meta()).phase,'running');assert.equal((h.data.get('battleRoleUsage:test-match')||[]).length,0);
});
test('Manual Undo invalidates server plan so restored role availability is re-evaluated',async()=>{
 const h=await serverHarness(),clock=h.data.get('demoClock');clock.remainingMs=30000;clock.at=Date.now();h.data.set('demoClock',clock);
 await runServerDemo(h.room,await h.meta());const undo=h.data.get('battleLastAction:test-match');assert.ok(undo);
 const undone=await result(await h.room.gmBattleUndo(null,{matchId:'test-match',turnId:undo.turnId,undoToken:undo.token}));assert.equal(undone.ok,true);assert.equal(h.data.has('demoPlan'),false);
 await runServerDemo(h.room,await h.meta());assert.equal(h.data.get('battleRoleUsage:test-match').length,1);
});

test('Delayed alarm never submits expired ballots; it resolves the stage and continues',async()=>{
 const h=await serverHarness(),meta=await h.meta();meta.cyclePhase='morning';meta.cycleKey='morning-1';await h.storage.put('meta',meta);
 const players=await h.storage.get('players');for(const p of Object.values(players))p.kind='member';await h.storage.put('players',players);
 await h.storage.put('gallows:test-match:morning-1',{id:'g1',matchId:'test-match',cycleKey:'morning-1',stage:'voting',candidateId:'carol',votes:{alice:'👍'},eligible:['alice','bob','carol','dave'],mode:'auto',voteDurationSec:10,deadlineAt:Date.now()-1000});
 await h.room.syncDemoClock(meta,await h.storage.get('demoLease'));const clock=h.data.get('demoClock');clock.remainingMs=0;clock.at=Date.now();h.data.set('demoClock',clock);
 await h.storage.put('demoPlan',{key:clock.key,cursor:0,tasks:[{id:'vote:bob',actorId:'bob',kind:'vote'}]});
 await runServerDemo(h.room,meta);assert.equal(h.data.get('gallows:test-match:morning-1').stage,'resolved');assert.equal(h.data.get('demoLease').error||'','');
});

test('Night 3 actual Durable Object opens selected dead Wolf card and refreshes private snapshot',async()=>{
  const h=harness({artifact:false});
  h.data.set('assignments',[
    {assignmentIndex:0,loginId:'alice',roleId:'role_drunk',roleName:'Say Rượu',faction:'village'},
    {assignmentIndex:1,loginId:'bob',roleId:'role_wolf',roleName:'Sói',faction:'wolf'}
  ]);
  h.data.set('roles:alice',[{assignmentIndex:0,loginId:'alice',roleId:'role_drunk',
    roleName:'Say Rượu',faction:'village',matchId:'test-match',roleCard:{functions:[]}}]);
  h.data.set('roles:bob',[{assignmentIndex:1,loginId:'bob',roleId:'role_wolf',
    roleName:'Sói',faction:'wolf',matchId:'test-match',
    roleCard:{factionId:'wolf',functions:[{actionId:'action_wolf_bite',phase:'night'}]}}]);
  h.data.set('interactions',[{matchId:'test-match',night:2,type:'dead',loginId:'bob',effectActive:true}]);
  const meta=await h.meta();meta.cycleNight=3;meta.cycleKey='night-3';
  await h.storage.put('meta',meta);
  const rt=await h.room.getNightRuntime(meta,3,true);
  assert.equal((await h.storage.get('assignments')).find(x=>x.loginId==='alice').roleId,'role_drunk');
  assert.equal(rt.queue[rt.cursor].roleId,'role_drunk');
  const deck=await h.storage.get('drunkDeck:test-match:3:alice');
  assert.equal(deck.cards.length,1);
  assert.equal(drunkDeckView(deck,false).cards[0].roleId,undefined);
  const reply=await result(await h.room.playerDrunkDraw({loginId:'alice',cardId:deck.cards[0].id}));
  assert.equal(reply.ok,true);
  const assigned=await h.storage.get('assignments'),updated=assigned.find(r=>r.loginId==='alice');
  assert.equal(updated.roleId,'role_wolf');
  assert.equal(updated.faction,'wolf');
  assert.equal((await h.storage.get('drunkDeck:test-match:3:alice')).selectedId,deck.cards[0].id);
  assert.equal((await result(await h.room.playerDrunkDraw({loginId:'alice',cardId:deck.cards[0].id}))).error,'DRUNK_ALREADY_CHOSEN');
  const snapshot=await h.storage.get('deliverySnapshot:alice');
  assert.equal(snapshot.roles[0].roleId,'role_wolf');
  assert.equal(snapshot.deliveryVersion,(await h.meta()).deliveryVersion);
});
test('Clone inherits only in next Night after chosen person dies; owner Artifact is unchanged',async()=>{
  const h=harness({artifact:false});
  h.data.set('assignments',[
    {assignmentIndex:0,loginId:'alice',roleId:'role_clone',roleName:'Nhân Bản',faction:'village'},
    {assignmentIndex:1,loginId:'bob',roleId:'role_witch',roleName:'Phù Thuỷ',faction:'village'}]);
  h.data.set('roles:alice',[{assignmentIndex:0,loginId:'alice',roleId:'role_clone',
    roleName:'Nhân Bản',faction:'village',matchId:'test-match',
    artifact:{artifactId:'owner-asset'},roleCard:{functions:[{actionId:'action_clone_target'}]}}]);
  h.data.set('roles:bob',[{assignmentIndex:1,loginId:'bob',roleId:'role_witch',
    roleName:'Phù Thuỷ',faction:'village',matchId:'test-match',
    artifact:{artifactId:'wrong-donor-asset'},
    roleCard:{functions:[{actionId:'action_witch_save'}]}}]);
  h.data.set('interactions',[{matchId:'test-match',night:1,type:'effect_notice',
    actionId:'action_clone_target',actorId:'alice',loginId:'bob'},
    {matchId:'test-match',night:1,type:'dead',loginId:'bob',effectActive:true}]);
  const meta=await h.meta();meta.cycleNight=2;meta.cycleKey='night-2';
  await h.storage.put('meta',meta);
  const rt=await h.room.getNightRuntime(meta,2,true);
  assert.ok(rt.queue.some(x=>x.roleId==='role_witch'));
  const role=await h.storage.get('role:alice');
  assert.equal(role.roleId,'role_witch');
  assert.equal(role.artifact.artifactId,'owner-asset');
  assert.equal(role.inheritedFromRoleId,'role_clone');
});

test('Spiritualist compares factions normally when B was expelled in an earlier night turn',async()=>{
  const h=harness({artifact:false});
  h.data.set('gameConfig',{roles:[{roleId:'role_spiritualist',order:1}],
    timing:{defaultActionSec:30}});
  h.data.set('assignments',[
    {loginId:'alice',roleId:'role_spiritualist',roleName:'Nhà Tinh Thần Học',faction:'village'},
    {loginId:'bob',roleId:'role_wolf',roleName:'Sói',faction:'wolf'},
    {loginId:'carol',roleId:'role_guard',roleName:'Bảo Vệ',faction:'village'}
  ]);
  h.data.set('roles:alice',[{loginId:'alice',roleId:'role_spiritualist',
    matchId:'test-match',roleCard:{flags:{allowMultipleActions:false},functions:[
      {actionId:'action_compare_faction',phase:'night',targetCount:2,usageMode:'eachNight',usageCount:1}
    ]}}]);
  h.data.set('interactions',[{matchId:'test-match',type:'expelled',loginId:'bob',
    night:1,effectActive:true}]);
  const rt=await h.room.getNightRuntime(await h.meta(),1,true);
  const spiritualistIndex=rt.queue.findIndex(x=>x.roleId==='role_spiritualist');
  assert.ok(spiritualistIndex>=0,'Spiritualist turn must exist after shared Wolf bite');
  rt.cursor=spiritualistIndex;rt.currentId=rt.queue[spiritualistIndex].id;
  await h.storage.put(h.room.nightRuntimeKey(await h.meta(),1),rt);
  const answer=await result(await h.room.gmBattleAction(null,{
    matchId:'test-match',cycleKey:'night-1',turnId:rt.currentId,
    actorId:'alice',type:'effect_notice',actionId:'action_compare_faction',
    targetIds:['bob','carol'],revealTargetIds:['bob','carol'],clientEventId:'spiritualist-compare-1'
  }));
  assert.equal(answer.ok,true,JSON.stringify(answer));
  assert.equal(answer.revelation?.same,false);
  assert.equal(answer.revelation?.message?.includes('KHÁC'),true);
  assert.ok((await h.storage.get('interactions')).some(x=>x.type==='expelled'&&x.loginId==='bob'),
    'Exile is still active; only a neutral informational check was permitted');
  assert.equal((await h.storage.get('interactions')).filter(x=>x.actionId==='action_compare_faction').length,0,
    'Faction comparison must not send a harmful effect notification to targets');
});

test('Dream Flask: day Artifact creates a real two-cycle block; disabled actor cannot use day powers',async()=>{
  const h=harness({artifact:false});
  Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
  h.data.set('artifact:alice',{artifactId:'artifact_19',matchId:'test-match',singleUse:true,
    artifactCard:{functions:[{actionId:'artifact_action_lock_function',phase:'both',targetCount:1,noSelf:false,usageMode:'onceGame',usageCount:1}]}});
  // The real handler accepts Bear God scans, not a forged Seer scan.
  h.data.set('assignments',h.data.get('assignments').map(x=>
    x.loginId==='bob'?{...x,roleId:'role_bear_god'}:x));
  h.data.set('roles:bob',[{roleId:'role_bear_god',matchId:'test-match',
    roleCard:{functions:[{actionId:'action_bear_scan',phase:'day',targetCount:2,noSelf:false}]}}]);
  const b={matchId:'test-match',cycleKey:'morning-1',actorId:'alice',
    artifactId:'artifact_19',actionId:'artifact_action_lock_function',
    targetIds:['bob'],clientEventId:'dream-day-1'};
  const first=await result(await h.room.gmDayAction(null,b));
  assert.equal(first.ok,true);
  const lock=h.data.get('interactions').find(x=>x.statusId==='disabled_2n');
  assert.ok(lock);assert.equal(lock.loginId,'bob');assert.equal(lock.activationPhase,'morning');
  const blocked=await result(await h.room.gmDayAction(null,{
    matchId:'test-match',cycleKey:'morning-1',actorId:'bob',roleId:'role_bear_god',
    actionId:'action_bear_scan',targetIds:['alice','carol'],clientEventId:'dream-bob-blocked'}));
  assert.equal(blocked.error,'DAY_ACTOR_BLOCKED');
  assert.equal(h.data.has('dayRoleUsage:test-match'),false);
  assert.equal((await result(await h.room.gmDayAction(null,b))).idempotent,true);
  assert.equal(h.data.get('interactions').filter(x=>x.statusId==='disabled_2n').length,1);
  for(const [phase,night] of [['night',2],['morning',2],['night',3]]){
    const m=await h.meta();await h.room.applyCycle(m,phase,night,phase+'-'+night);
    assert.equal(h.data.get('interactions').find(x=>x.id===lock.id).effectActive,true);
  }
  const m=await h.meta();await h.room.applyCycle(m,'morning',3,'morning-3');
  assert.equal(h.data.get('interactions').find(x=>x.id===lock.id).effectActive,false);
  assert.equal((await result(await h.room.gmDayAction(null,{
    matchId:'test-match',cycleKey:'morning-3',actorId:'bob',roleId:'role_bear_god',
    actionId:'action_bear_scan',targetIds:['alice','carol'],clientEventId:'dream-bob-after'}))).ok,true);
});

test('Dream Flask: target already locked rejects before Artifact use is debited',async()=>{
  const h=harness({artifact:false});Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
  h.data.set('artifact:alice',{artifactId:'artifact_19',matchId:'test-match',singleUse:true,
    artifactCard:{functions:[{actionId:'artifact_action_lock_function',phase:'both',targetCount:1}]}});
  h.data.set('interactions',[{id:'prior-lock',loginId:'bob',matchId:'test-match',
    type:'status',statusId:'disabled_2n',effectActive:true,night:1}]);
  const resultDay=await result(await h.room.gmDayAction(null,{
    matchId:'test-match',cycleKey:'morning-1',actorId:'alice',
    artifactId:'artifact_19',actionId:'artifact_action_lock_function',
    targetIds:['bob'],clientEventId:'dream-refused'}));
  assert.equal(resultDay.error,'DAY_DREAM_ALREADY_LOCKED');
  assert.equal(h.data.has('artifactUse:alice:artifact_19'),false);
  assert.equal(h.data.has('artifactCycle:morning-1'),false);
});

test('Dream Flask: night Artifact turn applies status and GM undo restores actor ability and use',async()=>{
  const h=harness();
  const assigned=h.data.get('assignments')[0];
  assigned.artifactId='artifact_19';assigned.artifactName='Bình Giấc Mơ';
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_19',
    artifactName:'Bình Giấc Mơ',priorityFirst:true,singleUse:true,
    artifactCard:{actions:[{id:'artifact_action_lock_function',name:'Bình Giấc Mơ',phase:'both',targetCount:1}],
      functions:[{actionId:'artifact_action_lock_function',phase:'both',targetCount:1}]}});
  await h.jump('early-artifact-window');
  const rt=await h.runtime(),m=await h.meta();
  const body={matchId:m.matchId,cycleKey:m.cycleKey,turnId:rt.currentId,
    actorId:'alice',artifactId:'artifact_19',actionId:'artifact_action_lock_function',
    type:'effect_notice',targetIds:['bob'],clientEventId:'dream-night-1'};
  const forged=await result(await h.room.gmBattleAction(null,{...body,clientEventId:'dream-forged',type:'dead'}));
  assert.equal(forged.error,'BATTLE_ACTION_ABORTED');
  assert.equal(h.data.has('artifactUse:alice:artifact_19'),false);
  const applied=await result(await h.room.gmBattleAction(null,body));
  assert.equal(applied.ok,true,JSON.stringify(applied));
  assert.equal(h.data.get('interactions').find(x=>x.statusId==='disabled_2n').loginId,'bob');
  assert.equal(isBattleActorBlocked(h.data.get('interactions'),{actorId:'bob',matchId:'test-match',statusDefs:STATUS_DEFS}),true);
  const undo=await result(await h.room.gmBattleUndo(null,{undoToken:applied.undoToken}));
  assert.equal(undo.ok,true,JSON.stringify(undo));
  assert.equal(h.data.get('interactions')?.some(x=>x.statusId==='disabled_2n')||false,false);
  assert.equal(h.data.has('artifactUse:alice:artifact_19'),false);
});

test('Old Breath: day marker kills only after the following night, never on marking day',async()=>{
  const h=harness({artifact:false});
  Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_07',singleUse:true,
    artifactCard:{functions:[{actionId:'action-grudge-designate',phase:'both',targetCount:1}]}});
  const body={matchId:'test-match',cycleKey:'morning-1',actorId:'alice',
    artifactId:'artifact_07',actionId:'action-grudge-designate',
    targetIds:['bob'],clientEventId:'breath-day-1'};
  const recorded=await result(await h.room.gmDayAction(null,body));
  assert.equal(recorded.ok,true,JSON.stringify(recorded));
  assert.equal(h.data.get('interactions')[0].type,'effect_notice');
  assert.equal(h.data.get('interactions')[0].night,2);
  assert.equal(h.data.get('interactions')[0].pendingDeath,true);
  const replay=await result(await h.room.gmDayAction(null,body));
  assert.equal(replay.idempotent,true);
  let meta=await h.meta();await h.room.applyCycle(meta,'night',2,'night-2');
  assert.equal(h.data.get('interactions')[0].type,'effect_notice');
  meta=await h.meta();await h.room.applyCycle(meta,'morning',2,'morning-2');
  const dead=h.data.get('interactions')[0];
  assert.equal(dead.type,'dead');assert.equal(dead.effectActive,true);
  assert.equal(dead.pendingDeath,false);
  meta=await h.meta();await h.room.applyCycle(meta,'morning',2,'morning-2');
  assert.equal(h.data.get('interactions').filter(x=>x.deferredArtifact==='artifact_07').length,1);
});

test('Old Breath: unrelated shared Action ID is not a death executor and does not spend Artifact',async()=>{
  const h=harness({artifact:false});
  Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_05',singleUse:true,
    artifactCard:{functions:[{actionId:'action-grudge-designate',phase:'both',targetCount:1}]}});
  const r=await result(await h.room.gmDayAction(null,{matchId:'test-match',
    cycleKey:'morning-1',actorId:'alice',artifactId:'artifact_05',
    actionId:'action-grudge-designate',targetIds:['bob'],clientEventId:'breath-not07'}));
  assert.equal(r.error,'DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED');
  assert.equal(h.data.has('artifactUse:alice:artifact_05'),false);
});

test('Old Breath: immune target survives next-night resolution without leaking death',async()=>{
  const h=harness({artifact:false});
  h.data.set('roles:bob',[{roleId:'seer',matchId:'test-match',
    roleCard:{flags:{nightImmune:true}}}]);
  Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-1'});
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_07',singleUse:true,
    artifactCard:{functions:[{actionId:'action-grudge-designate',phase:'both',targetCount:1}]}});
  assert.equal((await result(await h.room.gmDayAction(null,{
    matchId:'test-match',cycleKey:'morning-1',actorId:'alice',artifactId:'artifact_07',
    actionId:'action-grudge-designate',targetIds:['bob'],clientEventId:'breath-immune'}))).ok,true);
  let meta=await h.meta();await h.room.applyCycle(meta,'night',2,'night-2');
  meta=await h.meta();await h.room.applyCycle(meta,'morning',2,'morning-2');
  const row=h.data.get('interactions')[0];
  assert.equal(row.pendingDeath,false);assert.equal(row.effectActive,false);
  assert.equal(row.expiredReason,'NIGHT_IMMUNE');
  assert.equal(h.data.get('interactions').some(x=>x.type==='dead'&&x.loginId==='bob'),false);
});

test('Old Breath: night marker is reversible and cannot kill on initial dawn',async()=>{
  const h=harness(),assigned=h.data.get('assignments')[0];
  assigned.artifactId='artifact_07';assigned.artifactName='Hơi Thở Lão Già';
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_07',
    artifactName:'Hơi Thở Lão Già',priorityFirst:true,singleUse:true,
    artifactCard:{actions:[{id:'action-grudge-designate',phase:'both',targetCount:1}],
      functions:[{actionId:'action-grudge-designate',phase:'both',targetCount:1}]}});
  await h.jump('early-artifact-window');
  const rt=await h.runtime(),m=await h.meta();
  const body={matchId:m.matchId,cycleKey:m.cycleKey,turnId:rt.currentId,
    actorId:'alice',artifactId:'artifact_07',actionId:'action-grudge-designate',
    type:'effect_notice',targetIds:['bob'],clientEventId:'breath-night-1'};
  const marked=await result(await h.room.gmBattleAction(null,body));
  assert.equal(marked.ok,true,JSON.stringify(marked));
  let rows=h.data.get('interactions');
  assert.equal(rows.find(x=>x.deferredArtifact==='artifact_07').pendingDeath,true);
  assert.equal(rows.find(x=>x.deferredArtifact==='artifact_07').night,2);
  const undo=await result(await h.room.gmBattleUndo(null,{undoToken:marked.undoToken}));
  assert.equal(undo.ok,true,JSON.stringify(undo));
  rows=h.data.get('interactions')||[];
  assert.equal(rows.some(x=>x.deferredArtifact==='artifact_07'),false);
  assert.equal(h.data.has('artifactUse:alice:artifact_07'),false);
});

test('Kim Cương Phủ Nhận: removes only already-used unlimited Artifact without losing role or historical use',async()=>{
  const h=harness({artifact:false});
  Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-2',cycleNight:2});
  const artifactCard={functions:[{actionId:'action_always',usageMode:'unlimited',phase:'day'}]};
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_15',singleUse:true,
    artifactCard:{functions:[{actionId:'artifact_action_negate',phase:'day',
      usageMode:'onceGame',targetCount:1,noSelf:false}]}});
  h.data.set('artifact:bob',{matchId:'test-match',artifactId:'artifact_20',
    singleUse:false,usedAt:'2026-10-28T07:00:00Z',artifactCard});
  const assignments=h.data.get('assignments');
  assignments.find(x=>x.loginId==='bob').artifactId='artifact_20';
  assignments.find(x=>x.loginId==='bob').artifactName='Trái Tim Vô Tâm';
  const archivedUse={usedAt:'2026-10-28T07:00:00Z',requestId:'prior'};
  h.data.set('artifactUse:bob:artifact_20',archivedUse);
  const b={matchId:'test-match',cycleKey:'morning-2',actorId:'alice',
    artifactId:'artifact_15',actionId:'artifact_action_negate',
    targetIds:['bob'],clientEventId:'negate-diamond-1'};
  const r=await result(await h.room.gmDayAction(null,b));
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(h.data.get('artifact:bob').removedFromMatch,true);
  assert.equal(h.data.get('artifact:bob').removedByArtifactId,'artifact_15');
  const summary=h.data.get('assignments').find(x=>x.loginId==='bob');
  assert.equal(summary.roleId,'seer');
  assert.equal(summary.artifactId,null);
  assert.deepEqual(h.data.get('artifactUse:bob:artifact_20'),archivedUse);
  const snapshot=buildPrivateDeliverySnapshot({matchId:'test-match',roles:[
    {roleId:'seer',artifact:{matchId:'test-match',artifactId:'artifact_20'}}]});
  assert.equal(privateDeliveryArtifact(snapshot,h.data.get('artifact:bob')),null);
  assert.equal((await result(await h.room.playerArtifactActivate({
    loginId:'bob',requestId:'try-removed',targetId:'member:alice'}))).error,
    'ARTIFACT_REMOVED_FROM_MATCH');
  assert.equal((await result(await h.room.gmDayAction(null,b))).idempotent,true);
});

test('Kim Cương Phủ Nhận: unspent and onceGame Artifact cannot be removed, no debit',async()=>{
  for(const [singleUse,usedAt,mode] of [[false,null,'unlimited'],
    [true,'2026-10-28T07:00:00Z','onceGame'],
    [false,'2026-10-28T07:00:00Z','eachNight']]){
    const h=harness({artifact:false});
    Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-2',cycleNight:2});
    h.data.set('artifact:alice',{matchId:'test-match',artifactId:'artifact_15',singleUse:true,
      artifactCard:{functions:[{actionId:'artifact_action_negate',phase:'day',
        targetCount:1,noSelf:false}]}});
    h.data.set('artifact:bob',{matchId:'test-match',artifactId:'artifact_20',
      singleUse,usedAt,artifactCard:{functions:[{actionId:'block_vote',usageMode:mode}]}});
    h.data.get('assignments').find(x=>x.loginId==='bob').artifactId='artifact_20';
    const r=await result(await h.room.gmDayAction(null,{
      matchId:'test-match',cycleKey:'morning-2',actorId:'alice',
      artifactId:'artifact_15',actionId:'artifact_action_negate',
      targetIds:['bob'],clientEventId:'negative-target'}));
    assert.equal(r.error,'NEGATE_TARGET_NOT_ELIGIBLE');
    assert.equal(h.data.has('artifactUse:alice:artifact_15'),false);
    assert.equal(h.data.get('artifact:bob').removedFromMatch,undefined);
  }
});

test('Kim Cương Phủ Nhận: only artifact_15 is executor; snapshot still shows untouched cards',async()=>{
  const h=harness({artifact:false});
  Object.assign(h.data.get('meta'),{cyclePhase:'morning',cycleKey:'morning-2',cycleNight:2});
  h.data.set('artifact:alice',{matchId:'test-match',artifactId:'other',
    artifactCard:{functions:[{actionId:'artifact_action_negate',phase:'day',targetCount:1}]}});
  h.data.set('artifact:bob',{matchId:'test-match',artifactId:'artifact_20',singleUse:false,
    usedAt:'2026-10-28T07:00:00Z',
    artifactCard:{functions:[{actionId:'foo',usageMode:'unlimited'}]}});
  h.data.get('assignments').find(x=>x.loginId==='bob').artifactId='artifact_20';
  const r=await result(await h.room.gmDayAction(null,{
    matchId:'test-match',cycleKey:'morning-2',actorId:'alice',
    artifactId:'other',actionId:'artifact_action_negate',
    targetIds:['bob'],clientEventId:'other-negate'}));
  assert.equal(r.error,'DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED');
  assert.equal(h.data.has('artifactUse:alice:other'),false);
  assert.equal(h.data.get('artifact:bob').removedFromMatch,undefined);
  const snap=buildPrivateDeliverySnapshot({matchId:'test-match',roles:[{
    roleId:'seer',artifact:{matchId:'test-match',artifactId:'artifact_20'}}]});
  assert.equal(privateDeliveryArtifact(snap,h.data.get('artifact:bob')).artifactId,'artifact_20');
});
