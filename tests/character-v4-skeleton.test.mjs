import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {skeletonPose,SKELETON_ACTIONS,SKELETON_DIRECTIONS,drawSkeleton} from '../assets/characters/v4/skeleton-rig.mjs';
test('skeleton-first studio supports all nine actions and four directions without skin',()=>{
 assert.equal(SKELETON_ACTIONS.length,9);assert.equal(SKELETON_DIRECTIONS.length,4);
 for(const action of SKELETON_ACTIONS)for(const direction of SKELETON_DIRECTIONS){
  const p=skeletonPose({action,direction,elapsedMs:300,progress:.7});
  assert.equal(p.leftArm.length,3);assert.equal(p.rightArm.length,3);
  assert.equal(p.leftLeg.length,3);assert.equal(p.rightLeg.length,3);
  assert.equal(p.headTiltDeg,0);assert.equal(p.skinApplied,false);
  for(const limb of [p.leftArm,p.rightArm,p.leftLeg,p.rightLeg])for(const joint of limb){
   assert.ok(Number.isFinite(joint.x)&&Number.isFinite(joint.y));
  }
 }
});
test('sitting is compact with inward crossing feet and distinct transitions',()=>{
 const s=skeletonPose({action:'sit',direction:'front'});
 assert.ok(s.leftLeg[2].x>s.rightLeg[2].x,'feet fold inward/cross');
 assert.ok(s.leftLeg[1].x>20&&s.rightLeg[1].x<80,'knees remain compact');
 assert.ok(s.leftLeg[2].y>=s.leftLeg[1].y);
 assert.ok(skeletonPose({action:'sit-down',progress:.7}).sit>.6);
 assert.ok(skeletonPose({action:'stand-up',progress:.7}).sit<.4);
});
test('wave, vote, walk, run and outcomes visibly change distinct joints',()=>{
 const idle=skeletonPose({action:'idle'});
 const wave=skeletonPose({action:'wave',elapsedMs:300});
 const vote=skeletonPose({action:'vote'});
 assert.ok(wave.rightArm[2].y<idle.rightArm[2].y);
 assert.ok(vote.rightArm[2].y<wave.rightArm[2].y);
 assert.notDeepEqual(skeletonPose({action:'walk',elapsedMs:100}).leftLeg,skeletonPose({action:'walk',elapsedMs:330}).leftLeg);
 assert.notDeepEqual(skeletonPose({action:'run',elapsedMs:100}).rightLeg,skeletonPose({action:'run',elapsedMs:330}).rightLeg);
 assert.notDeepEqual(skeletonPose({action:'result',outcome:'win'}).rightArm,skeletonPose({action:'result',outcome:'lose'}).rightArm);
});
test('web studio is separate from live player and IPA',()=>{
 const html=fs.readFileSync(new URL('../assets/characters/v4/skeleton.html',import.meta.url),'utf8');
 assert.match(html,/skeleton-rig.mjs/);assert.match(html,/Chưa đắp Skin/);
 assert.ok(!html.includes('/api/rooms'));assert.ok(!html.includes('animated-sprite.mjs'));
 const ctx=new Proxy({}, {get:(o,k)=>o[k]||(o[k]=()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
 assert.doesNotThrow(()=>drawSkeleton(ctx,skeletonPose({action:'sit'})));
});

test('front and back gait lifts alternating feet instead of skating sideways',()=>{
 for(const direction of ['front','back']){
  const a=skeletonPose({action:'walk',direction,elapsedMs:0});
  const b=skeletonPose({action:'walk',direction,elapsedMs:Math.PI/.010});
  assert.equal(a.leftLeg[2].x,b.leftLeg[2].x,'front/back feet stay in their own lanes');
  assert.notEqual(a.leftLeg[2].y,b.leftLeg[2].y,'left foot lifts on alternating step');
  assert.notEqual(a.rightLeg[2].y,b.rightLeg[2].y,'right foot lifts on alternating step');
 }
 const a=skeletonPose({action:'walk',direction:'front',elapsedMs:0});
 assert.ok(a.leftLeg[2].y<a.rightLeg[2].y,'left foot airborne while right is planted');
 const b=skeletonPose({action:'walk',direction:'front',elapsedMs:Math.PI/.010});
 assert.ok(b.rightLeg[2].y<b.leftLeg[2].y,'right foot airborne while left is planted');
});

test('idle breathing, run arms, staged vote/wave, win/lose animate without duplicated limbs',()=>{
 const idleA=skeletonPose({action:'idle',elapsedMs:0});
 const idleB=skeletonPose({action:'idle',elapsedMs:500});
 assert.notEqual(idleA.head.y,idleB.head.y,'idle should breathe');
 const run=skeletonPose({action:'run',elapsedMs:200});
 const walk=skeletonPose({action:'walk',elapsedMs:200});
 assert.ok(run.leftArm[2].y<walk.leftArm[2].y,'run elbows stay bent');
 const voteStart=skeletonPose({action:'vote',elapsedMs:0});
 const voteEnd=skeletonPose({action:'vote',elapsedMs:700});
 assert.ok(voteStart.rightArm[2].y>voteEnd.rightArm[2].y,'vote arm rises');
 const waveStart=skeletonPose({action:'wave',elapsedMs:0});
 const waveEnd=skeletonPose({action:'wave',elapsedMs:900});
 assert.notDeepEqual(waveStart.rightArm,waveEnd.rightArm,'wave animates');
 const winStart=skeletonPose({action:'result',outcome:'win',elapsedMs:0});
 const winEnd=skeletonPose({action:'result',outcome:'win',elapsedMs:600});
 assert.ok(winStart.rightArm[2].y>winEnd.rightArm[2].y,'win cheer raises arms');
 const loseStart=skeletonPose({action:'result',outcome:'lose',elapsedMs:0});
 const loseEnd=skeletonPose({action:'result',outcome:'lose',elapsedMs:700});
 assert.ok(loseStart.head.y<loseEnd.head.y,'lose posture slumps');
 for(const pose of [idleA,run,voteEnd,waveEnd,winEnd,loseEnd]){
  assert.equal(pose.leftArm.length,3);assert.equal(pose.rightArm.length,3);
  assert.equal(pose.leftLeg.length,3);assert.equal(pose.rightLeg.length,3);
  assert.equal(pose.skinApplied,false);
 }
});
