import test from 'node:test';
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
import {resolveWolfNight,resolveNightReveal,resolveMaidenNight,canSnowWolfBite} from '../src/gmww-wolf-night-resolution.js';
import {STATUS_DEFS as PRODUCTION_STATUS_DEFS} from '../src/gmww-public-room-contract.js';
import {sanitizePlayerArtifactCard} from '../src/gmww-private-card-contract.js';

// Execute the real DO methods against isolated, clone-on-read storage. No network
// or production credentials; method bodies are not copied into the fixture.
const source=fs.readFileSync('src/index.js','utf8');
const methods=source.slice(source.indexOf('  nightRuntimeKey('),source.indexOf('  async gmRename('));
const activate=source.slice(source.indexOf('  async playerArtifactActivate('),source.indexOf('  async playerSeatSwap('));
const cycleHelper=source.slice(source.indexOf('function currentArtifactCycleKey('),source.indexOf('function gameLabelKey('));
const normalizeLoginId=x=>String(x||'').trim().toLowerCase();
// Run the exact production status policy rather than extracting JS text.
const STATUS_DEFS=PRODUCTION_STATUS_DEFS;


const Room=vm.runInNewContext(cycleHelper+'; (class { '+methods+activate+' })',{
  Date,JSON,Response,crypto:webcrypto,combineConfiguredTurns,groupConfiguredRoleTurns,jumpTarget,defaultPriorityFirst,
  artifactCycleKey,reserveArtifactActivation,normalizeLoginId,pruneInteractions,isBattleActorBlocked,expireCycleEffects,resolveWolfNight,resolveNightReveal,resolveMaidenNight,canSnowWolfBite,STATUS_DEFS,
  resolveRoleActionPolicy,checkBattleRoleActionUsage,appendBattleRoleActionUsage,
  j:(data,status=200)=>Response.json(data,{status}),publicRoom:x=>structuredClone(x),publicPlayer:x=>x
});
const clone=x=>x===undefined?undefined:structuredClone(x);
function harness({artifact=true,auto=false,singleUse=false}={}){
  const data=new Map(),room=new Room(),events=[];
  const storage={get:async key=>clone(data.get(key)),put:async(key,value)=>data.set(key,clone(value)),delete:async key=>data.delete(key),setAlarm:async()=>{},transaction:async fn=>{
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


test('roles with identical wake order share a single server turn and keep both owners',async()=>{
  const h=harness({artifact:false});
  h.data.set('gameConfig',{roles:[{roleId:'regular-wolf',order:6},{roleId:'alpha-wolf',order:6}],
    timing:{wolfDiscussionSec:30,earlyArtifactSec:60,defaultActionSec:35}});
  h.data.set('assignments',[
    {loginId:'alice',roleId:'regular-wolf',roleName:'Sói Thường'},
    {loginId:'bob',roleId:'alpha-wolf',roleName:'Sói Trùm'}
  ]);
  const rt=await h.runtime(),group=rt.queue.find(x=>x.kind==='role-group');
  assert.ok(group);assert.equal(group.order,6);
  assert.deepEqual([...group.loginIds].sort(),['alice','bob']);
  assert.deepEqual(group.roles.map(r=>r.label),['Sói Thường','Sói Trùm']);
  assert.equal(rt.queue.filter(x=>x.kind==='role').length,0);
  assert.equal(rt.queue[0].durationSec,30);
  assert.equal(rt.queue[1].durationSec,60);
});

test('batched GM action reverses both targets and one Artifact use on server',async()=>{
  const h=harness({artifact:true,singleUse:true});
  await h.jump('early-artifact-window');
  const meta=await h.meta(),rt=await h.runtime();
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
  i.push({id:'freeze-owner',loginId:'carol',type:'frozen',effectActive:true,matchId:'test-match'});
  h.data.set('interactions',i);
  const next=await result(await h.room.gmBattleAction(null,{...p,actorId:'carol',turnId:(await h.runtime()).currentId,clientEventId:'tx-frozen'}));
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
  const wolfIndex=current.queue.findIndex(row=>
    ['role','role-group'].includes(row.kind)&&(row.loginIds||[]).includes('carol'));
  assert.ok(wolfIndex>=0,'wolf waking step exists on night 2');
  await h.room.gmTurn(null,{action:'jump',targetIndex:wolfIndex});
  const wolf=await h.room.getNightRuntime(await h.meta(),2,false);
  const denied=await result(await h.room.gmBattleAction(null,{...payload,actorId:'carol',
    turnId:wolf.currentId,cycleKey:meta2.cycleKey,clientEventId:'g4-dead-wolf-denied',night:2}));
  assert.equal(denied.error,'ACTOR_CANNOT_ACT','death must persist across night transitions');
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
