import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateRigInventory,V419_REQUIRED_LAYERS} from '../assets/characters/v4/rig-integrity-v419.mjs';
import {V416_SLOTS} from '../assets/characters/v4/artwork-v416.mjs';
import {V414_LAYERS} from '../assets/characters/v4/skin-v414.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/characters/v4/artwork-v416-manifest.json',import.meta.url)));
test('V4.19 current four HD views cannot publish',()=>{const x=validateRigInventory(manifest);assert.equal(x.masters,4);assert.equal(x.rigLayers,0);assert.equal(x.canPublish,false);assert.equal(V419_REQUIRED_LAYERS,136);});
test('reject duplicate and invalid layer files',()=>{const entry={characterId:'character-01',direction:'front',layer:V414_LAYERS[0],sha256:'a'.repeat(64)};const x=validateRigInventory(manifest,[entry,entry,{...entry,layer:'fake'}]);assert.equal(x.rigLayers,1);assert.equal(x.errors.length,2);assert.equal(x.canPublish,false);});
test('136 complete rig files still require eight master images and owner approval',()=>{const rig=V416_SLOTS.flatMap(s=>V414_LAYERS.map(layer=>({characterId:s.id.slice(0,12),direction:s.id.slice(13),layer,sha256:'b'.repeat(64)})));const x=validateRigInventory(manifest,rig,V416_SLOTS.map(s=>s.id));assert.equal(x.rigLayers,136);assert.equal(x.completeViews.length,8);assert.equal(x.canPublish,false);});
