import test from 'node:test';import assert from 'node:assert/strict';import {mountSample} from '../assets/characters/v5/skin-four-samples.mjs';import {createSkinnedChibi} from '../assets/characters/v5/character-rig-v510.mjs';
test('direction-corrected sample uses real eight-view textures including rear',()=>{
 const maps=Array.from({length:8},(_,i)=>({id:i})),skin=mountSample(createSkinnedChibi(),maps,4);assert.equal(skin.directionSets?.length,8);assert.equal(skin.surfaceMode,'eight-view-calibrated');
 for(let i=0;i<8;i++){skin.update(i*Math.PI/4);assert.ok(skin.meshes.filter(m=>m.visible).every(m=>m.material.map===maps[i]));}
});
