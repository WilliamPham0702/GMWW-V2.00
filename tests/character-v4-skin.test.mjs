import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {skeletonPose,SKELETON_ACTIONS,SKELETON_DIRECTIONS} from '../assets/characters/v4/skeleton-rig.mjs';

const root=new URL('../assets/characters/v4/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const spec=JSON.parse(read('skin-art-spec.json'));
const preview=read('skin.html');

test('reject Skin V4.13 fully, disable all body-overlay renderers and keep active preview skeleton-only',()=>{
 assert.equal(spec.rejectedSkinVersion,'4.13-skeleton-skin-review');
 assert.equal(spec.skinStatus,'rejected-awaiting-redesign');
 assert.equal(spec.deliveryGate.productionSkinEnabled,false);
 assert.equal(spec.deliveryGate.ownerApproved,false);
 assert.ok(!fs.existsSync(new URL('skeleton-skin.mjs',root)),'blocky renderer removed from repository');
 assert.match(preview,/Skin 4\.13 đã bị loại/);
 assert.match(preview,/KHÔNG ĐẠT NGHIỆM THU/);
 assert.match(preview,/skeleton-rig\.mjs/);
 assert.match(preview,/drawSkeleton\(ctx,pose\)/);
 assert.doesNotMatch(preview,/approved-two-characters\.avif/);
 assert.doesNotMatch(preview,/skeleton-skin\.mjs/);
 assert.doesNotMatch(preview,/renderV4Skin/);
 assert.doesNotMatch(preview,/data-mode="skin"/);
 assert.ok(!preview.includes('/api/rooms'));
 const live=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
 const ipa=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(live,/skeleton-skin\.mjs|renderV4Skin/);
 assert.doesNotMatch(ipa,/skeleton-skin\.mjs|renderV4Skin/);
});

test('new skin contract demands coherent 4-view high-resolution rig layers before publication',()=>{
 assert.deepEqual(spec.directions,['front','left','right','back']);
 assert.deepEqual(spec.riggedActions,SKELETON_ACTIONS);
 assert.deepEqual(spec.artDirection.minimumMasterViewSizePx,[1024,1536]);
 assert.equal(spec.characters.length,2);
 assert.equal(spec.mandatoryLayers.length,17);
 assert.ok(spec.mandatoryLayers.includes('upper_arm_left'));
 assert.ok(spec.mandatoryLayers.includes('forearm_right'));
 assert.ok(spec.mandatoryLayers.includes('thigh_left'));
 assert.ok(spec.mandatoryLayers.includes('foot_right'));
 assert.equal(spec.deliveryGate.allLayerAssetsReady,false);
 assert.equal(spec.deliveryGate.jointAnchorsReviewed,false);
 assert.equal(spec.deliveryGate.mobileMotionReviewed,false);
 assert.equal(spec.referenceUse.includes('not accepted as final layered skin'),true);
 assert.ok(spec.artDirection.disallowed.some(v=>v.includes('pixelated static avatar head')));
});

test('preserve approved skeleton movements after reverting bad skin',()=>{
 for(const action of SKELETON_ACTIONS)for(const direction of SKELETON_DIRECTIONS){
  const pose=skeletonPose({action,direction,elapsedMs:550,progress:.65});
  assert.equal(pose.leftArm.length,3);
  assert.equal(pose.rightArm.length,3);
  assert.equal(pose.leftLeg.length,3);
  assert.equal(pose.rightLeg.length,3);
  assert.equal(pose.skinApplied,false);
 }
 const s=skeletonPose({action:'sit'});
 assert.ok(s.leftLeg[2].x>s.rightLeg[2].x);
 const walkLeft=skeletonPose({action:'walk',direction:'front',elapsedMs:0});
 const walkRight=skeletonPose({action:'walk',direction:'front',elapsedMs:Math.PI/.010});
 assert.ok(walkLeft.leftLeg[2].y<walkLeft.rightLeg[2].y);
 assert.ok(walkRight.rightLeg[2].y<walkRight.leftLeg[2].y);
});

test('Cloudflare verifies withdrawn Skin status and exact served files',()=>{
 const yaml=fs.readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');
 for(const name of ['skeleton.html','skeleton-rig.mjs','skin.html','skin-art-spec.json'])
  assert.ok(yaml.includes(name),'deployment verifies '+name);
 assert.match(yaml,/EXPECTED_HASH=/);
 assert.match(yaml,/LIVE_HASH=/);
 assert.match(yaml,/skinverify=/);
 assert.match(yaml,/KHÔNG ĐẠT NGHIỆM THU/);
 assert.match(yaml,/skin-art-spec\.json/);
 assert.doesNotMatch(yaml,/node --check \/tmp\/v4-skeleton-skin\.mjs/);
});
