import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {combineConfiguredTurns,jumpTarget,timelineDisplaySteps} from '../src/gmww-night-turn-rules.js';
import {defaultPriorityFirst,artifactCycleKey,reserveArtifactActivation} from '../src/gmww-game-scene-rules.js';

// Execute the real DO methods against isolated, clone-on-read storage. No network
// or production credentials; method bodies are not copied into the fixture.
const source=fs.readFileSync('src/index.js','utf8');
const methods=source.slice(source.indexOf('  nightRuntimeKey('),source.indexOf('  async gmRename('));
const activate=source.slice(source.indexOf('  async playerArtifactActivate('),source.indexOf('  async playerSeatSwap('));
const cycleHelper=source.slice(source.indexOf('function currentArtifactCycleKey('),source.indexOf('function gameLabelKey('));
const normalizeLoginId=x=>String(x||'').trim().toLowerCase();
const Room=vm.runInNewContext(cycleHelper+'; (class { '+methods+activate+' })',{
  Date,JSON,Response,crypto:webcrypto,combineConfiguredTurns,jumpTarget,defaultPriorityFirst,
  artifactCycleKey,reserveArtifactActivation,normalizeLoginId,
  j:(data,status=200)=>Response.json(data,{status}),publicRoom:x=>structuredClone(x),publicPlayer:x=>x
});
const clone=x=>x===undefined?undefined:structuredClone(x);
function harness({artifact=true,auto=false,singleUse=false}={}){
  const data=new Map(),room=new Room(),events=[];
  const storage={get:async key=>clone(data.get(key)),put:async(key,value)=>data.set(key,clone(value)),setAlarm:async()=>{},transaction:async fn=>{
    const before=new Map([...data].map(([k,v])=>[k,clone(v)]));
    try{return await fn(storage)}catch(e){data.clear();for(const [k,v] of before)data.set(k,v);throw e}
  }};
  room.ctx={storage};room.broadcast=x=>events.push(clone(x));room.roomExpiryDue=()=>Date.now()+86400000;
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
  const jump=async kind=>{const rt=await runtime();return room.gmTurn(null,{action:'jump',targetIndex:rt.queue.findIndex(x=>x.kind===kind)})};
  const act=async overrides=>{const rt=await runtime();return room.gmInteraction(null,{turnId:rt.currentId,artifactId:'mirror',actorId:'alice',actionId:'copy',actionNonce:'nonce-1',targetIds:['bob'],loginId:'bob',type:'effect_notice',night:1,clientEventId:'nonce-1:bob',...overrides})};
  return{data,room,events,storage,meta,runtime,jump,act};
}
async function result(response){return {status:response.status,...await response.json()}}

test('empty Artifact window remains once; configured roles group owners and do not add redundant Artifact turns',async()=>{
  const h=harness({artifact:false}),rt=await h.runtime();
  assert.deepEqual(Array.from(rt.queue,x=>x.kind),['wolf-introduction','early-artifact-window','role','role','village-wakeup']);
  assert.equal(rt.queue[1].actions.length,0);
  const h2=harness(),r2=await h2.runtime();
  assert.equal(r2.queue[2].loginIds.length,2);assert.equal(r2.queue[2].artifacts[0].loginId,'alice');
  assert.equal(h2.data.has('artifactUse:alice:mirror'),false);
  assert.equal(timelineDisplaySteps(r2.queue).filter(x=>x.kind==='early-artifact-window').length,1);
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
  const payload=vm.runInNewContext('const state={actions:{artifacts:[]}};'+definition+'; playArtifactCardPayload');
  const card=payload({id:'stone',name:'Đá Đổi Vai Trò',functions:[{actionId:'swap',targetCount:2,noSelf:false,allowDead:true}]});
  assert.equal(card.actions[0].targetCount,2);
  assert.equal(card.actions[0].noSelf,false);
  assert.equal(card.actions[0].allowDead,true);
  const sanitizeSource=source.slice(source.indexOf('function sanitizePlayerArtifactCard('),source.indexOf('function privateArtifact('));
  const sanitize=vm.runInNewContext(sanitizeSource+'; sanitizePlayerArtifactCard',{defaultPriorityFirst});
  const delivered=sanitize(card);
  assert.equal(delivered.actions[0].targetCount,2);
  assert.equal(delivered.actions[0].noSelf,false);
  assert.equal(delivered.actions[0].allowDead,true);
});
test('Artifact card sanitizer retains explicit target restrictions for the server',()=>{
  const sanitizer=source.slice(source.indexOf('function sanitizePlayerArtifactCard('),source.indexOf('function privateArtifact('));
  const sanitize=vm.runInNewContext(sanitizer+'; sanitizePlayerArtifactCard',{defaultPriorityFirst});
  const result=sanitize({name:'Tráng Gương',actions:[{id:'copy',targetCount:2,noSelf:true,allowDead:false},{id:'legacy'}]});
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
