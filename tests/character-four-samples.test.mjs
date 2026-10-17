import test from 'node:test';import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
test('four standalone techniques have distinct render geometry',async()=>{
 assert.ok(existsSync(new URL('../assets/characters/v5/skin-four-samples.mjs',import.meta.url)),'missing separate techniques');
 const {mountSample}=await import('../assets/characters/v5/skin-four-samples.mjs');
 const {createSkinnedChibi}=await import('../assets/characters/v5/character-rig-v510.mjs');
 const stats=[];for(let mode=1;mode<=4;mode++){
 const rig=createSkinnedChibi(),skin=mountSample(rig,null,mode);stats.push(skin);
 assert.equal(rig.bones.length,16);assert.ok(skin.meshes.every(m=>m.skeleton===rig.mesh.skeleton));
 skin.update(Math.PI/2);skin.wireframe(true);
 }
 assert.equal(stats[0].base.length,0);assert.equal(stats[1].base.length,0);assert.equal(stats[2].layers.length,0);assert.equal(stats[3].base.length,0);
 assert.ok(stats[0].layers.every(m=>{const w=m.geometry.getAttribute('skinWeight');return w.array.every((x,i)=>i%4===0?x===1:x===0);}));
 assert.ok(stats[1].layers.some(m=>m.geometry.getAttribute('skinWeight').array.some(x=>x>0&&x<1)));
 assert.equal(stats[3].directionIndex,2);
 assert.throws(()=>mountSample(createSkinnedChibi(),null,5));
});
