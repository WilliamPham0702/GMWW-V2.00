import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {confirmedCustomVisual,safePrivateVisualFamily,VISUAL_FAMILIES,STAGE14_VERSION} from '../assets/village/arena-3d/stage14-dynamic-visuals.mjs';
import {stageCastingCue,publicCastingState} from '../assets/village/arena-3d/casting-choreography.mjs';
import {normalizeRitualCue} from '../assets/village/arena-3d/stage8-ritual-director.mjs';
import {resolveRoleAnimation} from '../assets/village/arena-3d/stage10-role-animations.mjs';
const actor='arena01',match='match-one';
const assigned=(actionId='custom_protect',effectIds=['effect_protected'])=>[{
 loginId:actor,matchId:match,roleId:'role_custom_sea_guard',
 roleCard:{functions:[{actionId,effectIds,phase:'night'}]}
}];
const artifact=(actionId='custom_wolf_artifact',effectIds=['effect_wolf_bite'])=>({
 loginId:actor,matchId:match,artifactId:'artifact_moon',
 artifactCard:{actions:[{actionId,effectIds,phase:'night'}]}
});
const input=(overrides={})=>({actorId:actor,matchId:match,roleId:'role_custom_sea_guard',
 actionId:'custom_protect',privateRoles:assigned(),phase:'night',...overrides});
test('GĐ14: owner-only custom role actions map from configured exact effect IDs',()=>{
 const shield=confirmedCustomVisual(input());
 assert.equal(shield.visualFamily,'shield');assert.equal(shield.kind,'shield');
 const wolf=confirmedCustomVisual(input({actionId:'custom_wolf_bite',privateRoles:assigned('custom_wolf_bite',['effect_wolf_bite'])}));
 assert.equal(wolf.visualFamily,'wolf');assert.equal(wolf.kind,'attack');
 const freeze=confirmedCustomVisual(input({actionId:'custom_freeze',privateRoles:assigned('custom_freeze',['effect_snow_wolf_freeze'])}));
 assert.equal(freeze.visualFamily,'curse');
 assert.equal(resolveRoleAnimation(wolf).projectile,'spectral-wolf-head');
 assert.equal(resolveRoleAnimation(shield).projectile,'pearl-shield');
 assert.equal(STAGE14_VERSION,'gmww.arena.dynamic-visuals.14');
});
test('GĐ14: Artifact owner + match + confirmed action metadata required',()=>{
 const matchOwned=artifact();
 const action=confirmedCustomVisual(input({artifactId:'artifact_moon',roleId:'',
  actionId:'custom_wolf_artifact',privateRoles:[],ownedArtifact:matchOwned}));
 assert.equal(action.visualFamily,'wolf');
 assert.equal(action.artifactId,'artifact_moon');
 for(const invalid of [
  {ownedArtifact:{...matchOwned,loginId:'intruder'}},
  {ownedArtifact:{...matchOwned,matchId:'old-match'}},
  {ownedArtifact:{...matchOwned,artifactId:'different'}},
  {actionId:'not_on_card'},
  {artifactId:'different'}
 ])assert.equal(confirmedCustomVisual(input({artifactId:'artifact_moon',roleId:'',
  actionId:'custom_wolf_artifact',privateRoles:[],ownedArtifact:matchOwned,...invalid})),null);
});
test('GĐ14: deny spoofed custom roles, unknown actions, inactive card and cross-phase',()=>{
 for(const bad of [
  {roleId:'role_false'},
  {privateRoles:[{...assigned()[0],loginId:'other'}]},
  {privateRoles:[{...assigned()[0],matchId:'old-match'}]},
  {actionId:'not_on_card'},
  {privateRoles:assigned('custom_protect',['effect_protected']).map(row=>({...row,roleCard:{functions:[{actionId:'custom_protect',effectIds:['effect_protected'],phase:'day'}]}}))}
 ])assert.equal(confirmedCustomVisual(input(bad)),null);
 assert.equal(confirmedCustomVisual(input({actionId:'custom_strange',
  privateRoles:assigned('custom_strange',['unknown_effect'])})).visualFamily,'wand',
 'unknown effects never pretend to be wolf; use neutral visual');
 assert.equal(safePrivateVisualFamily('wolf'),'wolf');
 assert.equal(safePrivateVisualFamily('fake-wolf'),'');
 assert.equal(VISUAL_FAMILIES.length,9);
});
test('GĐ14: canonical action wins, never overridden by fabricated custom effect',()=>{
 const visual=confirmedCustomVisual(input({actionId:'action_witch_save',roleId:'role_custom_sea_guard',
  privateRoles:assigned('action_witch_save',['effect_wolf_bite'])}));
 assert.equal(visual.visualFamily,'heal');
 assert.equal(resolveRoleAnimation({...visual,visualFamily:'wolf'}).family,'heal');
});
test('GĐ14: GM-only Core casting pipeline retains whitelisted visualFamily',()=>{
 const now=Date.now(),state={matchId:match,cycleKey:'night-1',phase:'running',cyclePhase:'night'};
 const cue=stageCastingCue({matchId:match,cycleKey:'night-1',phase:'night',
  actorIds:['member:'+actor],turnId:'custom-turn',
  kind:'shield',visualFamily:'shield',actionId:'custom_protect',
  roleId:'role_custom_sea_guard',targetIds:['member:target'],createdAt:now,
  expiresAt:now+3300},now);
 assert.equal(publicCastingState(state,cue,{authorizedGM:false}),null);
 assert.equal(publicCastingState({...state,cycleKey:'night-2'},cue,{authorizedGM:true}),null);
 const authorized=publicCastingState(state,cue,{authorizedGM:true});
 assert.equal(authorized.cast.visualFamily,'shield');
 const clean=normalizeRitualCue(authorized,['member:'+actor,'member:target'],now);
 assert.equal(clean.cast.visualFamily,'shield');
 assert.equal(resolveRoleAnimation(clean.cast).family,'shield');
 const unsafe=stageCastingCue({...cue,visualFamily:'fake-wolf',createdAt:now,expiresAt:now+1200},now);
 assert.equal(unsafe.cast.visualFamily,'');
});
test('GĐ14: runtime effects only after Core success, GM auth; undo clears stale spells',()=>{
 const s=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 assert.match(s,/if\(result\?\.ok!==true\|\|result\?\.idempotent===true\)return response/);
 assert.match(s,/confirmedCustomVisual\(\{/);
 assert.match(s,/const privateRows=await this\.ctx\.storage\.get\('roles:'\+actorId\)/);
 assert.match(s,/const ownedArtifact=body\?\.artifactId\?await this\.ctx\.storage\.get\('artifact:'\+actorId\):null/);
 assert.match(s,/async gmBattleUndo\(request,body\)/);
 assert.match(s,/saved\.undoToken===String\(body\?\.undoToken\|\|''\)/);
 assert.match(s,/if\(!auth\.ok\)return auth\.response/);
 assert.match(s,/redactStagingPublicBroadcast\(payload\)/);
});
