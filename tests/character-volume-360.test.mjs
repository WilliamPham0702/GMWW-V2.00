import test from 'node:test';import assert from 'node:assert/strict';
import {createSkinnedChibi} from '../assets/characters/v5/character-rig-v510.mjs';
import {mountSample} from '../assets/characters/v5/skin-four-samples.mjs';
test('3D sample uses complete wrapped surfaces and modeled rear hair rather than front projection swatches',()=>{
 const rig=createSkinnedChibi(),skin=mountSample(rig,null,3);
 assert.equal(skin.uvMode,'continuous-360');
 assert.ok(skin.meshes.some(m=>m.name==='hair-back-cap'));
 assert.ok(skin.meshes.some(m=>m.name==='shirt-closed-shell'));
 for(const mesh of skin.meshes){
 assert.equal(mesh.skeleton,rig.mesh.skeleton);assert.equal(mesh.material.alphaTest,0);
 const uv=mesh.geometry.getAttribute('uv');assert.ok(uv);
 for(let i=0;i<uv.count;i++){assert.ok(Number.isFinite(uv.getX(i)));assert.ok(Number.isFinite(uv.getY(i)));}
 }
 assert.equal(skin.productionSkin,false);assert.equal(skin.sideBackReference,'inferred');
});
