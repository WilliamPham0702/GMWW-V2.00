import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CORE_ACTION_CATALOG,CORE_ROLE_CATALOG} from '../assets/village/arena-3d/stage11-core-catalog.mjs';
import {arenaActionSignature,arenaSignatureCoverage,ARENA_STAGE26_VERSION}
 from '../assets/village/arena-3d/stage26-action-signatures.mjs';
import {resolveRoleAnimation,authorizedAnimationCue,animationAudioCue}
 from '../assets/village/arena-3d/stage10-role-animations.mjs';
import {familyForConfirmedAction}
 from '../assets/village/arena-3d/stage14-dynamic-actions.mjs';
import {stageCastingCue,publicCastingState}
 from '../assets/village/arena-3d/casting-choreography.mjs';
import {createMatchSyncGate} from '../assets/village/arena-3d/stage9-match-sync.mjs';

test('GĐ26: đối chiếu 28 vai Core và đủ 26 mã hành động với nguồn thật',()=>{
 const coverage=arenaSignatureCoverage();
 assert.equal(ARENA_STAGE26_VERSION,'gmww.arena.action-signatures.26');
 const source=readFileSync('server-game/src/00-core-and-library.part','utf8');
 const sourceRoles=new Set([...source.matchAll(/\bid\s*:\s*['"](role_[a-z0-9_]+)['"]/g)].map(x=>x[1]));
 const sourceActions=new Set([...source.matchAll(/\bid\s*:\s*['"](action_[a-z0-9_]+)['"]/g)].map(x=>x[1]));
 assert.equal(coverage.builtInRoles,CORE_ROLE_CATALOG.length);
 assert.equal(coverage.builtInActions,CORE_ACTION_CATALOG.length);
 assert.deepEqual(coverage.missing,[]);
 assert.deepEqual(new Set(CORE_ROLE_CATALOG.map(x=>x.id)),sourceRoles);
 assert.deepEqual(new Set(CORE_ACTION_CATALOG.map(x=>x.id)),sourceActions);
 const ids=new Set();
 for(const action of CORE_ACTION_CATALOG){
  const signature=arenaActionSignature({actionId:action.id,coreConfirmed:true});
  assert.ok(signature,'missing animation '+action.id);
  assert.ok(!ids.has(signature.signatureId),'duplicate action visual '+action.id);
  ids.add(signature.signatureId);
  const fx=familyForConfirmedAction({actionId:action.id});
  const visual=resolveRoleAnimation({kind:fx.kind,actionId:fx.actionId,authorizedFamily:fx.family});
  assert.equal(visual.signature.signatureId,signature.signatureId);
  assert.ok(visual.projectile&&visual.impact&&visual.motion&&visual.sound);
 }
 for(const role of CORE_ROLE_CATALOG)
  for(const actionId of role.actionIds)assert.ok(sourceActions.has(actionId));
});

test('GĐ26: custom role/Artifact chỉ có chữ ký sau Core xác thực đúng thẻ',()=>{
 const id='action_arena_custom_pearl';
 const card={functions:[{actionId:id,arenaVfxFamily:'heal',targetCount:2}]};
 const resolved=familyForConfirmedAction({actionId:id,card});
 assert.equal(resolved.family,'heal');
 assert.equal(arenaActionSignature({actionId:id,family:'heal',coreConfirmed:false}),null);
 const visual=resolveRoleAnimation({actionId:id,kind:resolved.kind,authorizedFamily:resolved.family});
 assert.equal(visual.signature.actionId,id);
 assert.equal(visual.family,'heal');
 assert.equal(resolveRoleAnimation({actionId:id,kind:'heal'}).signature,null,
  'public/unverified actions must not get authorized custom accents');
 assert.equal(familyForConfirmedAction({actionId:id,card:{functions:[]}}),null);
 assert.equal(arenaActionSignature({actionId:'<script>',family:'heal',coreConfirmed:true}),null);
 assert.equal(arenaActionSignature({actionId:id,family:'__proto__',coreConfirmed:true}),null);
 const now=Date.now(),cue=stageCastingCue({matchId:'m1',cycleKey:'night-1',phase:'night',
  turnId:'turn1',actorIds:['member:one'],targetIds:['member:two'],kind:'heal',
  actionId:id,roleId:'role_custom',visualFamily:'heal',
  createdAt:now-100,expiresAt:now+3000},now);
 const room={phase:'running',cyclePhase:'night',matchId:'m1',cycleKey:'night-1'};
 assert.equal(publicCastingState(room,cue,{authorizedGM:false}),null);
 assert.equal(publicCastingState({...room,cycleKey:'night-2'},cue,{authorizedGM:true}),null);
 assert.ok(authorizedAnimationCue(cue,{gmAuthorized:true}).profile.signature);
 assert.equal(authorizedAnimationCue(cue,{gmAuthorized:false}),null);
 assert.equal(animationAudioCue(visual,false),null,'not autoplay unauthorized audio');
 assert.ok(animationAudioCue(visual,true)?.soundId==='ritual_heal');
});

test('GĐ27: stage public sync survives deal, night, reconnect, vote and match end',()=>{
 const gate=createMatchSyncGate();
 const people=Array.from({length:30},(_,i)=>({id:'member:p'+i,seatId:i+1,online:true,alive:true}));
 const states=[
  {phase:'lobby',cyclePhase:'',gmStage:'seating',cycleKey:''},
  {phase:'role_delivery',cyclePhase:'',gmStage:'role_delivery',cycleKey:''},
  {phase:'running',cyclePhase:'night',gmStage:'playing',cycleKey:'night-1'},
  {phase:'running',cyclePhase:'morning',gmStage:'playing',cycleKey:'morning-1'},
  {phase:'lobby',cyclePhase:'',gmStage:'gathering',cycleKey:''}
 ];
 for(let i=0;i<states.length;i++){
  const frame={revision:i+1,room:{code:'ARENA3D',matchId:'match1',...states[i]},players:people};
  const got=gate.accept(frame,{source:i===2?'snapshot':'realtime',now:1000+i*5000});
  assert.equal(got.accepted,true,JSON.stringify(got));
  assert.equal(got.view.players,30);
  assert.equal(got.view.phase,states[i].phase);
 }
 assert.equal(gate.accept({revision:2,room:{code:'ARENA3D',matchId:'match1',
  ...states[1]},players:people},{source:'snapshot',now:35000}).accepted,false,
  'late role delivery must not rewind an ended game');
});

test('GĐ27/28: end-to-end coverage remains real Core staging with GM/Player roles and reconnect',()=>{
 const e2e=readFileSync('tests/arena3d-stage16-standard-core-e2e.mjs','utf8');
 const dynamic=readFileSync('tests/arena3d-stage16-dynamic-core-e2e.mjs','utf8');
 const stage=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 for(const marker of ["#create","#seed","#lock","#deal","#start","#night","#day","#nominate","#refresh"])
  assert.ok(e2e.includes(marker),'missing Core E2E step '+marker);
 assert.match(e2e,/\/api\/gm\/rooms\/.*?\/end/);
 assert.match(e2e,/viewer\.reload\(/);
 assert.match(e2e,/viewerDenied|deny\.status/);
 assert.match(dynamic,/action_arena_pearl_bloom/);
 assert.match(dynamic,/action_arena_tide_barrier/);
 assert.match(stage,/redactStagingPublicBroadcast\(payload\)/);
 assert.match(stage,/if\(!auth\.ok\)return auth\.response/);
 assert.match(stage,/gmBattleUndo\(request,body\)/);
 const render=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 const spell=readFileSync('assets/village/arena-3d/spell-vfx.mjs','utf8');
 assert.match(render,/signature:profile\.signature/);
 assert.match(spell,/signature\?\.orbitalPhase/);
});

test('GĐ28: scope fence STAGING only; production/update routes not allowed',()=>{
 const worker=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 assert.match(worker,/durableObjects:'staging-only'/);
 assert.match(worker,/productionModified:false/);
 assert.match(worker,/Not available on staging/);
 const workflow=readFileSync('.github/workflows/arena3d-stage14-16-research.yml','utf8');
 assert.match(workflow,/wrangler\.arena3d-stage14-staging\.jsonc/);
 assert.doesNotMatch(workflow,/wrangler\.production/);
});
