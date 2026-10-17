import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const modulePath='../assets/characters/v5/skin-v570-combined-final.mjs';
test('hybrid exists as one skinned model using original skeleton', async()=>{
 assert.ok(existsSync(new URL(modulePath,import.meta.url)), 'missing hybrid renderer');
 const {buildHybridGeometry,mountHybrid,PARTS}=await import(modulePath);
 const {createSkinnedChibi,animateSkinnedChibi}=await import('../assets/characters/v5/character-rig-v510.mjs');
 const {createMotionState,setAction,setFacing,tickMotion,V500_DIRECTIONS}=await import('../assets/characters/v5/character-motion-v500.mjs');
 const rig=createSkinnedChibi(); const data=buildHybridGeometry();
 assert.ok(data.layers.length>8);assert.ok(data.base.length>8);
 for(const part of [...data.layers,...data.base]){
 const g=part.geometry;assert.ok(g.getAttribute('uv'));
 const weights=g.getAttribute('skinWeight');
 for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
 }
 const skin=mountHybrid(rig,null);assert.ok([...skin.layers,...skin.base].every(x=>x.skeleton===rig.mesh.skeleton));
 const THREE=await import('../assets/characters/v5/vendor/three.module.min.js');
 const m=createMotionState();let changed=0;const observed=[];
 for(const action of ['idle','walk','run','result'])for(const direction of V500_DIRECTIONS){
 setAction(m,action);setFacing(m,direction);
 for(let i=0;i<120;i++){tickMotion(m,1/60);animateSkinnedChibi(rig,m);rig.root.updateMatrixWorld(true);}
 for(const b of rig.bones)assert.ok(b.matrixWorld.elements.every(Number.isFinite));
 rig.mesh.skeleton.update();skin.update(m.yaw);
 for(const mesh of [...skin.layers,...skin.base]){
 const p=mesh.geometry.getAttribute('position');
 for(let j=0;j<p.count;j+=Math.max(1,Math.floor(p.count/17))){const v=new THREE.Vector3().fromBufferAttribute(p,j);mesh.applyBoneTransform(j,v);assert.ok(v.toArray().every(Number.isFinite));}
 }
 const hand=skin.layers.find(x=>x.name==='hand-left');const v=new THREE.Vector3().fromBufferAttribute(hand.geometry.getAttribute('position'),0);hand.applyBoneTransform(0,v);observed.push(v.toArray());
 if(Math.abs(rig.bones[4].rotation.x)>.05)changed++;
 }
 assert.ok(Math.abs(observed[0][1]-observed[24][1])>.1,'Result must move textured hand vertices');
 assert.equal(rig.bones.length,16);assert.ok(changed>8);assert.ok(PARTS.find(p=>p.name==='head'));
});
