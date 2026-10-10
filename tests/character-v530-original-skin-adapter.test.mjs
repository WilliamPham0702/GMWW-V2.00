import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {V414_SKIN_PALETTES,V414_LAYERS,V414_CHARACTERS} from '../assets/characters/v4/skin-v414.mjs';
import {createSkinnedChibi,v510ModelStats,V510_BONES} from '../assets/characters/v5/character-rig-v510.mjs';
const rigSource=fs.readFileSync(new URL('../assets/characters/v5/character-rig-v510.mjs',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../assets/characters/v5/index.html',import.meta.url),'utf8');
const live=fs.readFileSync(new URL('../src/gmww-members-live.js',import.meta.url),'utf8');
const village=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
test('V5.30 obtains original GMWW colors from source of truth V4.14, not invented hard-coded replacement',()=>{
 assert.deepEqual(V414_CHARACTERS,['character-01','character-02']);
 assert.equal(V414_LAYERS.length,17);
 assert.equal(V414_SKIN_PALETTES['character-01'].shirt,'#20bcb7');
 assert.equal(V414_SKIN_PALETTES['character-01'].hair,'#172f41');
 assert.equal(V414_SKIN_PALETTES['character-01'].bottom,'#e6cda1');
 assert.ok(Object.isFrozen(V414_SKIN_PALETTES['character-01']));
 assert.match(rigSource,/V414_SKIN_PALETTES\['character-01'\]/);
 assert.match(rigSource,/SHIRT=original\.shirt/);
 assert.match(rigSource,/HEAD=original\.hair/);
});
test('preserve approved 16-bone SkinnedMesh motion and shared LOD',()=>{
 const actor=createSkinnedChibi(true),crowd=createSkinnedChibi(false);
 assert.equal(actor.mesh.isSkinnedMesh,true);
 assert.equal(actor.bones.length,16);
 assert.equal(V510_BONES.length,16);
 assert.equal(actor.skinLayerCount,17);
 assert.equal(actor.skinSource,'V4.14-color-tokens-procedural-adapter');
 assert.equal(v510ModelStats(true).originalSkinPNGLoaded,false);
 assert.equal(v510ModelStats(true).originalSkinLayers,17);
 assert.notEqual(actor.mesh.geometry,crowd.mesh.geometry);
});
test('do not misrepresent design tokens as imported original PNG artwork',()=>{
 assert.match(page,/chưa phải Skin PNG 17 lớp/);
 assert.match(page,/chưa có trong repository/);
 assert.match(rigSource,/originalSkinPNGLoaded:false/);
});
test('no live-game integration or data migration',()=>{
 assert.doesNotMatch(live,/characters\/v5/);
 assert.doesNotMatch(village,/characters\/v5/);
});
