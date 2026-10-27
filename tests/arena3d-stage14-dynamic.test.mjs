import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CORE_ACTION_CATALOG} from '../assets/village/arena-3d/stage11-core-catalog.mjs';
import {familyForConfirmedAction,matchConfiguredAction,stageAuthorizedRoleId,verifiedPrivateCard,artifactVisualSnapshot,ARENA_FAMILIES} from '../assets/village/arena-3d/stage14-dynamic-actions.mjs';
import {stageCastingCue,publicCastingState} from '../assets/village/arena-3d/casting-choreography.mjs';
import {normalizeRitualCue} from '../assets/village/arena-3d/stage8-ritual-director.mjs';
import {resolveRoleAnimation} from '../assets/village/arena-3d/stage10-role-animations.mjs';
test('GĐ14 all builtin actions still yield known family, action ID takes priority',()=>{
 for(const action of CORE_ACTION_CATALOG){
  const cue=familyForConfirmedAction({actionId:action.id,card:null,type:'effect_notice'});
  assert.equal(cue.actionId,action.id);
  assert.ok(ARENA_FAMILIES.includes(cue.family));assert.ok(cue.kind);
 }
 const witch=familyForConfirmedAction({actionId:'action_witch_kill',card:{
   functions:[{actionId:'action_witch_kill',arenaVfxFamily:'heal'}]}});
 assert.equal(witch.family,'attack','A spoofed card cannot override canonical Core action');
});
test('GĐ14 custom role, 3-target Artifact and explicit valid effect families are bounded',()=>{
 const roleCard={functions:[{actionId:'action_custom_oracle',effectIds:['effect_aura_read'],targetCount:3}]};
 const item=familyForConfirmedAction({actionId:'action_custom_oracle',type:'effect_notice',card:roleCard});
 assert.deepEqual([item.family,item.kind,item.confirmedBy],['oracle','inspect','core-configured']);
 const artifact={actions:[{id:'action_pearl_ward',vfxFamily:'shield',targetCount:3}]};
 const fx=familyForConfirmedAction({actionId:'action_pearl_ward',card:artifact,type:'effect_notice'});
 assert.equal(fx.family,'shield');
 const invalid={actions:[{id:'action_custom',vfxFamily:'__proto__'}]};
 assert.equal(familyForConfirmedAction({actionId:'action_custom',type:'effect_notice',card:invalid}).family,'scout');
 assert.equal(familyForConfirmedAction({actionId:'action_missing',card:artifact}),null);
 assert.equal(familyForConfirmedAction({actionId:'<img>',card:artifact}),null);
 assert.equal(matchConfiguredAction(artifact,'action_unknown'),null);
});
test('GĐ14 private role/Artifact must belong to this actor, current match and verified Core turn',()=>{
 const card={functions:[{actionId:'action_custom_oracle'}]};
 const roles=[{loginId:'p01',roleId:'role_custom',matchId:'m1',roleCard:card}];
 const artifact={loginId:'p01',artifactId:'artifact_pearl',matchId:'m1',artifactCard:{actions:[{id:'action_pearl_ward'}]}};
 assert.equal(verifiedPrivateCard({actorId:'p01',roleId:'role_custom',roles,matchId:'m1'}),card);
 assert.equal(verifiedPrivateCard({actorId:'p02',roleId:'role_custom',roles,matchId:'m1'}),null);
 assert.equal(verifiedPrivateCard({actorId:'p01',roleId:'role_custom',roles,matchId:'m2'}),null);
 assert.equal(verifiedPrivateCard({actorId:'p01',artifactId:'artifact_pearl',artifact,matchId:'m1'}),artifact.artifactCard);
 assert.equal(verifiedPrivateCard({actorId:'p02',artifactId:'artifact_pearl',artifact,matchId:'m1'}),null);
 const control={actorIds:['member:p01'],roleId:'role_custom',roles:[{roleId:'role_other',actorIds:['member:p02']}]};
 assert.equal(stageAuthorizedRoleId(control,'p01'),'role_custom');
 assert.equal(stageAuthorizedRoleId(control,'p02'),'role_other');
 assert.equal(stageAuthorizedRoleId(control,'p03'),'');
});
test('GĐ14 custom VFX survives sanitized GM-only cue, rejected for anonymous viewer',()=>{
 const now=Date.now(),room={matchId:'m1',cycleKey:'night-2',phase:'running',cyclePhase:'night'};
 const cue=stageCastingCue({...room,phase:'night',turnId:'t1',actorIds:['member:p01'],
  targetIds:['member:p02','member:p03','member:p04'],
  kind:'shield',actionId:'action_pearl_ward',roleId:'role_custom',
  visualFamily:'shield',createdAt:now-200,expiresAt:now+3600},now);
 assert.equal(publicCastingState(room,cue,{authorizedGM:false}),null);
 const normalized=normalizeRitualCue(publicCastingState(room,cue,{authorizedGM:true}),
   ['member:p01','member:p02','member:p03','member:p04'],now);
 assert.equal(normalized.cast.visualFamily,'shield');
 assert.equal(normalized.cast.targetIds.length,3);
 assert.equal(resolveRoleAnimation({kind:normalized.cast.kind,actionId:normalized.cast.actionId,
  authorizedFamily:normalized.cast.visualFamily}).projectile,'pearl-shield');
 assert.equal(stageCastingCue({...cue,visualFamily:'__proto__'},now).cast,null);
 const source=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 assert.match(source,/const card=verifiedPrivateCard\(/);
 assert.match(source,/const visual=familyForConfirmedAction\(/);
 assert.match(source,/if\(!auth\.ok\)return auth\.response/);
 assert.match(source,/if\(!visual\)return response/);
 assert.doesNotMatch(source,/this\.broadcast\(\{[^}]*visualFamily/);
});

test('GĐ14 regression: GM-assigned artifact retained VFX before Core sanitizes functions/effectIds',()=>{
 const matchId='m-custom',loginId='guest01',artifactId='artifact_pearl',actionId='action_pearl_restore';
 // The actual Core private-card sanitizer keeps actions[].id, but strips
 // functions[].effectIds. The stage-only visual snapshot must bridge this.
 const incoming=[{loginId,artifact:{artifactId,artifactCard:{
  actions:[{id:actionId}],functions:[{id:actionId,actionId,
    phase:'night',effectIds:['effect_revive'],targetCount:1}]}}}];
 const delivered={guest01:{loginId,matchId,artifactId,artifactCard:{
  actions:[{id:actionId,targetCount:1}]}}};
 const snapshot=artifactVisualSnapshot(incoming,delivered,{matchId});
 const flattened=[{loginId,artifactId,artifactCard:incoming[0].artifact.artifactCard}];
 assert.equal(artifactVisualSnapshot(flattened,delivered,{matchId})[loginId+':'+artifactId+':'+actionId],'heal');
 assert.equal(snapshot[loginId+':'+artifactId+':'+actionId],'heal');
 assert.equal(familyForConfirmedAction({actionId,type:'effect_notice',card:delivered.guest01.artifactCard,
  stagingFamily:snapshot[loginId+':'+artifactId+':'+actionId]}).family,'heal');
 assert.equal(artifactVisualSnapshot(incoming,{guest01:{...delivered.guest01,matchId:'other'}},{matchId})[loginId+':'+artifactId+':'+actionId],undefined);
 const worker=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 assert.match(worker,/async gmAssign\(request,body\)/);
 assert.match(worker,/row\?\.artifact\|\|row\?\.artifactId/);
 assert.match(worker,/const response=await super\.gmAssign\(request,body\)/);
 assert.match(worker,/const visual=artifactVisualSnapshot\(roles,owned,\{matchId\}\)/);
 assert.match(worker,/await this\.ctx\.storage\.put\('arena:artifact-vfx:'\+matchId,visual\)/);
 assert.match(worker,/await this\.ctx\.storage\.delete\('arena:artifact-vfx:'\+matchId\)/);
});

// GĐ26–28 chạy trong suite Arena dynamic sẵn có: không mở CI ngoài phạm vi.
import './arena3d-stage26-28.test.mjs';
import './arena3d-stage29-31.test.mjs';
