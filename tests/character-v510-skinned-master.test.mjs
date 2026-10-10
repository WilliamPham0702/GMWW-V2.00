import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 V510_RIG_VERSION,V510_BONES,createSkinnedChibi,animateSkinnedChibi,v510ModelStats,boneIndex
} from '../assets/characters/v5/character-rig-v510.mjs';
import {
 V500_ACTIONS,createMotionState,setDestination,setFacing,setAction,tickMotion
} from '../assets/characters/v5/character-motion-v500.mjs';

function advance(state,seconds){
 for(let i=0;i<Math.ceil(seconds*60);i++)tickMotion(state,1/60);
 return state;
}
test('Character V5.10 creates genuine 16-bone SkinnedMesh instead of a visual pivot-only rig',()=>{
 const rig=createSkinnedChibi(true);
 assert.ok(rig.mesh.isSkinnedMesh);
 assert.equal(rig.bones.length,16);
 assert.equal(rig.mesh.skeleton.bones.length,16);
 assert.deepEqual(rig.bones.map(b=>b.name),[...V510_BONES]);
 assert.equal(rig.mesh.geometry.getAttribute('skinIndex').count,rig.mesh.geometry.getAttribute('position').count);
 assert.equal(rig.mesh.geometry.getAttribute('skinWeight').count,rig.mesh.geometry.getAttribute('position').count);
 assert.equal(rig.mesh.geometry.getAttribute('color').count,rig.mesh.geometry.getAttribute('position').count);
 assert.equal(boneIndex('head'),3);
 assert.throws(()=>boneIndex('not-a-bone'),/INVALID_V510_BONE/);
 assert.ok(rig.mesh.geometry.index.count>2000);
 assert.equal(rig.root.userData.gmwwV510,true);
});
test('V5.10 geometry and material are shared by 30 unique bone rigs for low draw-call overhead',()=>{
 const crowd=Array.from({length:30},()=>createSkinnedChibi(false));
 const hero=createSkinnedChibi(true);
 assert.notEqual(hero.mesh.geometry,crowd[0].mesh.geometry);
 for(let i=1;i<crowd.length;i++){
  assert.equal(crowd[i].mesh.geometry,crowd[0].mesh.geometry);
  assert.notEqual(crowd[i].bones[1],crowd[0].bones[1]);
  assert.equal(crowd[i].mesh.material,crowd[0].mesh.material);
 }
 assert.equal(v510ModelStats(false).sceneObjectsPerActor,2);
 assert.equal(v510ModelStats(true).skinnedMeshesPerActor,1);
 assert.ok(v510ModelStats(true).triangles>v510ModelStats(false).triangles);
 assert.ok(v510ModelStats(false).triangles<18000);
});
test('all nine actions update the actual skeleton without invalid bone transformations',()=>{
 const rig=createSkinnedChibi(true),state=createMotionState();
 for(const action of V500_ACTIONS){
  setAction(state,action);advance(state,.32);animateSkinnedChibi(rig,state);
  rig.root.updateMatrixWorld(true);
  for(const b of rig.bones){
   const a=[b.position.x,b.position.y,b.position.z,b.rotation.x,b.rotation.y,b.rotation.z];
   for(const n of a)assert.ok(Number.isFinite(n),action+': '+b.name+' is not finite');
  }
 }
});
test('walking legs and arm bones counter-swing and upright head resists idle wobble',()=>{
 const rig=createSkinnedChibi(true),state=createMotionState();
 setAction(state,'walk');advance(state,.27);animateSkinnedChibi(rig,state);
 assert.ok(Math.abs(rig.bones[10].rotation.x-rig.bones[13].rotation.x)>.05);
 assert.ok(Math.abs(rig.bones[4].rotation.x-rig.bones[7].rotation.x)>.05);
 assert.ok(Math.abs(rig.bones[3].rotation.z+state.pose.hipRoll*.92)<.00001);
});
test('the same model can turn eight directions and walk to an exact target',()=>{
 const rig=createSkinnedChibi(),s=createMotionState();
 setFacing(s,'back');advance(s,.7);animateSkinnedChibi(rig,s);
 assert.ok(Math.abs(s.yaw)>2);
 setDestination(s,2,-1,false);advance(s,3);animateSkinnedChibi(rig,s);
 assert.equal(s.x,2);assert.equal(s.z,-1);
 assert.equal(rig.root.position.x,2);assert.equal(rig.root.position.z,-1);
});
test('V5.10 is a separate proof-of-concept without any live game, room or IPA imports',()=>{
 const render=fs.readFileSync(new URL('../assets/characters/v5/character-master-v500.mjs',import.meta.url),'utf8');
 const live=fs.readFileSync(new URL('../src/gmww-members-live.js',import.meta.url),'utf8');
 const village=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
 assert.match(render,/createSkinnedChibi/);
 assert.match(render,/animateSkinnedChibi/);
 assert.doesNotMatch(render,/makeChibi\(/);
 assert.doesNotMatch(live,/characters\/v5/);
 assert.doesNotMatch(village,/characters\/v5/);
 assert.equal(V510_RIG_VERSION,'5.10-skinned-master01-review');
});
