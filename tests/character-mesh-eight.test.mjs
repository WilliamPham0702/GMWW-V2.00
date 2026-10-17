import test from 'node:test';import assert from 'node:assert/strict';
import {mountSample} from '../assets/characters/v5/skin-four-samples.mjs';
import {createSkinnedChibi} from '../assets/characters/v5/character-rig-v510.mjs';
test('mesh sample has eight view-specific textures on curved weighted patches',()=>{
 const rig=createSkinnedChibi(),textures=Array.from({length:8},(_,i)=>({id:i}));
 const skin=mountSample(rig,textures,2);assert.equal(skin.surfaceMode,'curved-weighted-patches');assert.equal(skin.directionSets.length,8);
 for(let i=0;i<8;i++){skin.update(i*Math.PI/4);const visible=skin.meshes.filter(m=>m.visible);assert.ok(visible.length>8);assert.ok(visible.every(m=>m.material.map===textures[i]));}
 assert.ok(skin.meshes.some(m=>m.geometry.getAttribute('skinWeight').array.some(x=>x>0&&x<1)));
 assert.equal(skin.base.length,0);assert.equal(skin.sideBackReference,'inferred');
});
