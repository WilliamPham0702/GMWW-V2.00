// GMWW Character V5.60 — real weighted 3D skin integration checks.
// No mock sprites: the test instantiates the actual V5.10 SkinnedMesh.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {createSkinnedChibi} from '../assets/characters/v5/character-rig-v510.mjs';
import {addV560WeightedSkin,removeV560WeightedSkin} from '../assets/characters/v5/skin-v560-weighted-surface.mjs';

test('UV garment reuses the actual 16-bone V5.10 skinning skeleton',()=>{
 const rig=createSkinnedChibi(true);
 const texture=new THREE.Texture();
 const s=addV560WeightedSkin(rig,{texture});
 assert.equal(rig.mesh.isSkinnedMesh,true);
 assert.equal(s.skinnedMesh,true);
 assert.equal(s.bones,16);
 assert.equal(s.rigShared,true);
 assert.equal(s.surface.skeleton,rig.mesh.skeleton);
 assert.ok(s.surface.geometry.getAttribute('uv').count>500);
 assert.ok(s.surface.geometry.getIndex().count>1000);
 assert.ok(s.blendedVertices>100,'garment must actually blend multiple bones');
 assert.equal(s.originalV417UVAtlasReady,false,'do not claim unrecovered original UV atlas');
 assert.equal(s.gameIntegrated,false,'do not alter live game');
 const weight=s.surface.geometry.getAttribute('skinWeight');
 const indices=s.surface.geometry.getAttribute('skinIndex');
 const mixed=Array.from({length:weight.count},(_,i)=>i)
  .filter(i=>weight.getX(i)>.001&&weight.getX(i)<.999);
 assert.ok(mixed.length>100);
 for(let i=0;i<weight.count;i++){
  assert.equal(indices.getX(i),2);
  assert.equal(indices.getY(i),1);
  assert.ok(Math.abs(weight.getX(i)+weight.getY(i)-1)<.00001);
 }
 assert.ok(rig.bones[3].children.some(c=>c.name==='flower-ornament-rigged-to-head'));
 removeV560WeightedSkin(rig);
 assert.equal(rig.userDataSkinV560,null);
 assert.equal(rig.mesh.isSkinnedMesh,true,'original rig must remain untouched');
});
