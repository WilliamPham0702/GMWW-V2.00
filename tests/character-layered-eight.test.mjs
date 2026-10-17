import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
test('layered sample has eight independently illustrated direction sets',async()=>{
 assert.ok(existsSync(new URL('../assets/characters/v5/skin-layered-eight.mjs',import.meta.url)),'missing direction artwork renderer');
 const {mountLayeredEight}=await import('../assets/characters/v5/skin-layered-eight.mjs');
 const {createSkinnedChibi}=await import('../assets/characters/v5/character-rig-v510.mjs');
 const rig=createSkinnedChibi(),textures=Array.from({length:8},(_,i)=>({id:i}));
 const skin=mountLayeredEight(rig,textures);
 assert.equal(skin.directionSets.length,8);assert.equal(skin.sideBackReference,'inferred');
 for(let i=0;i<8;i++){
 skin.update(i*Math.PI/4);assert.equal(skin.directionIndex,i);
 const visible=skin.meshes.filter(m=>m.visible);assert.ok(visible.length>8);
 assert.ok(visible.every(m=>m.material.map===textures[i]));assert.ok(visible.every(m=>m.skeleton===rig.mesh.skeleton));
 }
});
