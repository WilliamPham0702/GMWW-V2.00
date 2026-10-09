import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skeletonPose,SKELETON_ACTIONS,SKELETON_DIRECTIONS} from '../assets/characters/v4/skeleton-rig.mjs';
import {V414_SKIN_VERSION,V414_CHARACTERS,V414_DIRECTIONS,V414_LAYERS,skinBinding,drawV414Skin} from '../assets/characters/v4/skin-v414.mjs';
const root=new URL('../assets/characters/v4/',import.meta.url);
function fakeContext(){
 const calls={scale:0,fill:0,stroke:0,clearRect:0};
 const ctx={save(){},restore(){},translate(){},rotate(){},scale(){calls.scale++},
  beginPath(){},closePath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},
  bezierCurveTo(){},ellipse(){},arc(){},fill(){calls.fill++},stroke(){calls.stroke++},
  clearRect(){calls.clearRect++},
  createLinearGradient(){return {addColorStop(){}}}};
 return {ctx,calls};
}
test('V4.14 unique 17 skeletal layers: each physical limb has only one pair of attached joints',()=>{
 assert.match(V414_SKIN_VERSION,/4\.14/);
 assert.equal(V414_LAYERS.length,17);
 assert.equal(new Set(V414_LAYERS).size,17);
 assert.deepEqual(V414_DIRECTIONS,SKELETON_DIRECTIONS);
 assert.deepEqual(V414_CHARACTERS,['character-01','character-02']);
 for(const characterId of V414_CHARACTERS)for(const action of SKELETON_ACTIONS)for(const direction of SKELETON_DIRECTIONS){
  const pose=skeletonPose({action,direction,elapsedMs:650,progress:.63});
  const b=skinBinding(pose,characterId);
  assert.equal(Object.keys(b.parts).length,17);
  assert.deepEqual(b.parts.upper_arm_left,[pose.leftArm[0],pose.leftArm[1]]);
  assert.deepEqual(b.parts.forearm_left,[pose.leftArm[1],pose.leftArm[2]]);
  assert.deepEqual(b.parts.thigh_right,[pose.rightLeg[0],pose.rightLeg[1]]);
  assert.deepEqual(b.parts.shin_right,[pose.rightLeg[1],pose.rightLeg[2]]);
  assert.equal(b.headTiltDeg,0);
 }
});
test('draw every skin layer ONCE for 9 actions × 4 directions × 2 characters, 2 result variants',()=>{
 for(const characterId of V414_CHARACTERS)for(const direction of V414_DIRECTIONS)
  for(const action of SKELETON_ACTIONS)for(const outcome of action==='result'?['win','lose']:['win']){
   const pose=skeletonPose({action,direction,elapsedMs:650,progress:.7,outcome});
   const {ctx,calls}=fakeContext();
   const result=drawV414Skin(ctx,pose,{characterId,width:240,height:360,showAnchors:true});
   assert.equal(result.previewOnly,true);
   assert.equal(result.skinApplied,true);
   assert.equal(result.headTiltDeg,0);
   assert.equal(result.layersDrawn.length,17);
   assert.deepEqual(new Set(result.layersDrawn),new Set(V414_LAYERS));
   assert.equal(calls.clearRect,1);
   assert.ok(calls.fill>12);
  }
});
test('invalid skin input rejected; live Player Web/IPA not wired to V4.14',()=>{
 const pose=skeletonPose({action:'walk'});
 assert.throws(()=>skinBinding(pose,'character-17'),/UNKNOWN_CHARACTER/);
 assert.throws(()=>skinBinding({...pose,headTiltDeg:10}),/INVALID_SKIN_SKELETON/);
 assert.throws(()=>skinBinding({...pose,leftLeg:[pose.leftLeg[0]]}),/INVALID_LIMB_JOINTS/);
 const preview=fs.readFileSync(new URL('skin-preview-v414.html',root),'utf8');
 assert.match(preview,/skin-v414\.mjs/);
 assert.match(preview,/skeleton-rig\.mjs/);
 assert.match(preview,/requestAnimationFrame/);
 assert.match(preview,/CHƯA NGHIỆM THU/);
 assert.ok(!preview.includes('/api/rooms'));
 const spec=JSON.parse(fs.readFileSync(new URL('skin-art-spec.json',root),'utf8'));
 assert.equal(spec.deliveryGate.productionSkinEnabled,false);
 assert.equal(spec.deliveryGate.ownerApproved,false);
 const live=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
 const ipa=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(live,/skin-v414/);
 assert.doesNotMatch(ipa,/skin-v414/);
});
