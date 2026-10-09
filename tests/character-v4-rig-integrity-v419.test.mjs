import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {validateRigInventory,V419_REQUIRED_LAYERS} from '../assets/characters/v4/rig-integrity-v419.mjs';
import {V416_SLOTS} from '../assets/characters/v4/artwork-v416.mjs';
import {V414_LAYERS} from '../assets/characters/v4/skin-v414.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/characters/v4/artwork-v416-manifest.json',import.meta.url)));
test('V4.19 current four HD views cannot publish',()=>{const x=validateRigInventory(manifest);assert.equal(x.masters,4);assert.equal(x.rigLayers,0);assert.equal(x.canPublish,false);assert.equal(V419_REQUIRED_LAYERS,136);});
test('reject duplicate and invalid layer files',()=>{const entry={characterId:'character-01',direction:'front',layer:V414_LAYERS[0],sha256:'a'.repeat(64)};const x=validateRigInventory(manifest,[entry,entry,{...entry,layer:'fake'}]);assert.equal(x.rigLayers,1);assert.equal(x.errors.length,2);assert.equal(x.canPublish,false);});
test('136 complete rig files still require eight master images and owner approval',()=>{const rig=V416_SLOTS.flatMap(s=>V414_LAYERS.map(layer=>({characterId:s.id.slice(0,12),direction:s.id.slice(13),layer,sha256:createHash('sha256').update(s.id+'/'+layer).digest('hex')})));const x=validateRigInventory(manifest,rig,V416_SLOTS.map(s=>s.id));assert.equal(x.rigLayers,136);assert.equal(x.completeViews.length,8);assert.equal(x.canPublish,false);});

const hash=s=>createHash('sha256').update(s).digest('hex');
const completeManifest=()=>({drafts:V416_SLOTS.map(s=>({id:s.id.slice(0,12),direction:s.id.slice(13),sha256:hash(s.id)})),limitations:{individualRigLayersAvailable:true,importedIntoRepository:true,motionRigged:true,ownerApproved:true,productionSkinEnabled:true}});
const completeRig=()=>V416_SLOTS.flatMap(s=>V414_LAYERS.map(layer=>({characterId:s.id.slice(0,12),direction:s.id.slice(13),layer,sha256:hash(s.id+'/'+layer)})));
const approvals=V416_SLOTS.map(s=>s.id);
test('complete distinct metadata requires every release prerequisite',()=>{
 assert.equal(validateRigInventory(completeManifest(),completeRig(),approvals).canPublish,true);
 for(const flag of Object.keys(completeManifest().limitations)){
  const m=completeManifest();m.limitations[flag]=false;
  assert.equal(validateRigInventory(m,completeRig(),approvals).canPublish,false,flag);
 }
 assert.equal(validateRigInventory(completeManifest(),completeRig(),approvals.slice(1)).canPublish,false);
});
test('relabelled duplicate pixels and whole master used as a limb are rejected',()=>{
 const m=completeManifest(),rig=completeRig();
 rig[1].sha256=rig[0].sha256;
 rig[2].sha256=m.drafts[0].sha256;
 const result=validateRigInventory(m,rig,approvals);
 assert.equal(result.rigLayers,134);assert.equal(result.errors.length,2);assert.equal(result.canPublish,false);
});
test('duplicated master content cannot pass by renaming views',()=>{
 const m=completeManifest();m.drafts[1].sha256=m.drafts[0].sha256;
 const result=validateRigInventory(m,completeRig(),approvals);
 assert.ok(result.errors.includes('DUPLICATE_MASTER_CONTENT'));assert.equal(result.canPublish,false);
});
test('invalid inventory collections fail explicitly',()=>{
 assert.throws(()=>validateRigInventory(manifest,null),/INVALID_RIG_INVENTORY/);
 assert.throws(()=>validateRigInventory(manifest,[],null),/INVALID_RIG_INVENTORY/);
});
