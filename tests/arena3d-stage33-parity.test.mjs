// GĐ33 - fail-closed parity audit against the Core source actually checked out.
// This validates catalog identifiers, not the gameplay rule implementation.
// Never assume this test certifies third-party role/artifact libraries or real iPhone FPS.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CORE_ROLE_CATALOG,CORE_ACTION_CATALOG} from '../assets/village/arena-3d/stage11-core-catalog.mjs';
import {CORE_ACTION_FAMILY,coreActionFamily,catalogAnimationCoverage} from '../assets/village/arena-3d/stage11-core-action-bridge.mjs';
import {arenaActionSignature,arenaSignatureCoverage} from '../assets/village/arena-3d/stage26-action-signatures.mjs';
import {resolveRoleAnimation} from '../assets/village/arena-3d/stage10-role-animations.mjs';
import {familyForConfirmedAction} from '../assets/village/arena-3d/stage14-dynamic-actions.mjs';
import {privateTurnActionOptions} from '../assets/village/arena-3d/stage29-gm-actions.mjs';
import {spellActionAccent} from '../assets/village/arena-3d/spell-vfx.mjs';

const ids=(items)=>items.map(item=>item.id);
const sorted=(items)=>[...items].sort();
const source=readFileSync('server-game/src/00-core-and-library.part','utf8');
const coreSourceActions=sorted(new Set([...source.matchAll(/\bactionId:\s*['"](action_[a-z0-9_]+)['"]/gi)].map(x=>x[1])));
const coreSourceRoles=sorted(new Set([...source.matchAll(/\bid:\s*['"](role_[a-z0-9_]+)['"]/gi)].map(x=>x[1])));

test('GĐ33: 26 Core action IDs remain exactly in sync with the checked-out source',()=>{
 const catalog=ids(CORE_ACTION_CATALOG);
 assert.equal(new Set(catalog).size,catalog.length,'Duplicate action IDs in snapshot');
 assert.ok(coreSourceActions.length>0,'Core source action library not found');
 assert.deepEqual(coreSourceActions,sorted(catalog),
  'Core action library changed: update the Arena catalog and visual coverage before a release');
});
test('GĐ33: builtin roles reference real actions; base Core role IDs are covered',()=>{
 const roleIds=ids(CORE_ROLE_CATALOG);
 const actionSet=new Set(ids(CORE_ACTION_CATALOG));
 assert.equal(new Set(roleIds).size,roleIds.length,'Duplicate role IDs');
 for(const role of CORE_ROLE_CATALOG){
   assert.match(role.id,/^role_[a-z0-9_]+$/);
   assert.ok(Array.isArray(role.actionIds));
   assert.equal(new Set(role.actionIds).size,role.actionIds.length,role.id+' duplicate function');
   for(const action of role.actionIds)assert.ok(actionSet.has(action),role.id+' unknown '+action);
 }
 for(const roleId of coreSourceRoles)assert.ok(roleIds.includes(roleId),
   'Core base role missing from Arena snapshot: '+roleId);
});
test('GĐ33: every canonical Core action gets a distinct GM-only visual signature',()=>{
 const canon=ids(CORE_ACTION_CATALOG);
 const coverage=arenaSignatureCoverage();
 assert.equal(coverage.builtInActions,canon.length);
 assert.equal(coverage.mapped,canon.length);
 assert.deepEqual(coverage.missing,[]);
 assert.equal(catalogAnimationCoverage().mapped,canon.length);
 assert.deepEqual(sorted(Object.keys(CORE_ACTION_FAMILY)),sorted(canon));
 const signatures=new Set();
 for(const id of canon){
   const family=coreActionFamily(id);
   assert.ok(family,id+' no family');
   assert.equal(arenaActionSignature({actionId:id,family}),null,
    'Unconfirmed action must have no 3D signature');
   const signature=arenaActionSignature({actionId:id,family,coreConfirmed:true});
   assert.equal(signature.actionId,id);
   assert.equal(signature.family,family);
   signatures.add(signature.signatureId);
   const profile=resolveRoleAnimation({actionId:id,roleId:'',kind:'inspect'});
   assert.equal(profile.family,family);
   assert.equal(profile.signature.signatureId,signature.signatureId);
 }
 assert.equal(signatures.size,canon.length,'Two Core actions share one VFX signature');
});
test('GĐ33: custom Artifact only animates after authorized delivered-card metadata',()=>{
 const custom='action_pearl_shield_custom';
 assert.equal(familyForConfirmedAction({actionId:custom}),null);
 const card={functions:[{actionId:custom,vfxFamily:'shield',targetCount:2,noSelf:true}]};
 const confirmed=familyForConfirmedAction({actionId:custom,card});
 assert.equal(confirmed.family,'shield');
 const unauthorized=privateTurnActionOptions({actorId:'p1',artifactId:'artifact_pearl',
  matchOk:false,turnActorIds:['member:p1'],artifactCard:card});
 assert.deepEqual(unauthorized,[]);
 const authorized=privateTurnActionOptions({actorId:'p1',artifactId:'artifact_pearl',
  matchOk:true,turnActorIds:['member:p1'],artifactCard:card});
 assert.equal(authorized.length,1);
 assert.equal(authorized[0].targetCount,2);
 assert.equal(authorized[0].noSelf,true);
});

test('GĐ33: each Core action has safe sea-colored spell parameters within existing draw budget',()=>{
 const seen=new Set();
 for(const {id} of CORE_ACTION_CATALOG){
   const signature=arenaActionSignature({actionId:id,coreConfirmed:true});
   const accent=spellActionAccent(signature);
   assert.ok(accent.hue>=.47&&accent.hue<.65,id+' hue must stay in sea palette');
   assert.ok(accent.pearls>=5&&accent.pearls<=12,id+' too many spell particles');
   seen.add(signature.signatureId);
 }
 assert.equal(seen.size,CORE_ACTION_CATALOG.length);
 assert.equal(spellActionAccent(null),null);
 assert.equal(spellActionAccent({accentHue:Infinity,streakCount:99}),null);
 assert.equal(spellActionAccent({accentHue:-90,streakCount:99}).pearls,12);
});
