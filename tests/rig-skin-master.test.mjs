import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ACTION_GROUPS,ACTION_CATALOG,BONES,SKIN_SLOTS,MASTER_RIG,SAMPLE_SKINS,
  basePose,clipDuration,isLoopingAction,sampleRigAction,sampleSynchronizedAction,validateSkin
} from '../assets/village/rig-skin-core.mjs';

test('39 signed-off features are present, separated into 33 actions + 6 systems',()=>{
  assert.deepEqual(ACTION_GROUPS.map(g=>g.actions.length),[6,4,9,1,13,6]);
  assert.equal(ACTION_CATALOG.length,39);
  assert.equal(new Set(ACTION_CATALOG.map(x=>x.id)).size,39);
  assert.equal(ACTION_CATALOG.filter(x=>x.type==='motion').length,33);
  assert.equal(ACTION_CATALOG.filter(x=>x.type==='system').length,6);
  assert.ok(ACTION_CATALOG.every(x=>x.label.length>3));
});
test('real joint hierarchy has independent upper/lower arms and legs plus attachment slots',()=>{
  for(const part of ['torso','head','upperArmL','forearmL','upperArmR','forearmR','thighL','shinL','footL','thighR','shinR','footR']){
    assert.ok(BONES.includes(part),part);
  }
  assert.equal(MASTER_RIG.id,'rig-humanoid-muscular-v1');
  assert.ok(SKIN_SLOTS.includes('cloth'));
  const renderer=fs.readFileSync(new URL('../assets/village/rig-skin-renderer.mjs',import.meta.url),'utf8');
  assert.match(renderer,/data-joint="shinL"/);
  assert.match(renderer,/data-joint="forearmR"/);
  assert.match(renderer,/data-joint="footL"/);
  assert.doesNotMatch(renderer,/clip-path:polygon/);
  assert.doesNotMatch(renderer,/frame\/1/);
});
test('action sampling remains bounded and finite for all signed-off features',()=>{
  for(const feature of ACTION_CATALOG){
    for(const t of [0,123,1700,100000]){
      const pose=sampleRigAction(feature.id,t);
      assert.deepEqual(Object.keys(pose),Object.keys(basePose()));
      for(const [k,v] of Object.entries(pose))assert.ok(Number.isFinite(v),feature.id+':'+k);
    }
  }
});
test('walking lifts alternating knees and moves individual limbs',()=>{
  const a=sampleRigAction('walk',175),b=sampleRigAction('walk',525);
  assert.ok(a.thighL>0 && a.thighR<0);
  assert.ok(b.thighL<0 && b.thighR>0);
  assert.notEqual(a.upperArmL,a.upperArmR);
  assert.notEqual(a.shinL,b.shinL);
});
test('running has greater stride and speed-up is functional',()=>{
  const walk=sampleRigAction('walk',175);
  const run=sampleRigAction('run',106.25);
  assert.ok(Math.abs(run.thighL)>Math.abs(walk.thighL));
  assert.notDeepEqual(sampleRigAction('walk',125,{speed:1}),sampleRigAction('walk',125,{speed:1.5}));
});
test('cross-legged sitting and transition are different from standing',()=>{
  const sit=sampleRigAction('sit',0),standing=basePose();
  assert.ok(sit.rootY>30);
  assert.ok(sit.thighL>60 && sit.thighR< -60);
  assert.ok(Math.abs(sit.shinL)>100 && Math.abs(sit.shinR)>100);
  const half=sampleRigAction('sit-down',500);
  assert.ok(half.rootY>standing.rootY && half.rootY<sit.rootY);
  assert.deepEqual(sampleRigAction('stand-up',2000).rootY,standing.rootY);
});
test('transition mixing uses preceding pose, then reaches target',()=>{
  const prev=sampleRigAction('walk',0);
  const start=sampleRigAction('sit',0,{previousAction:'walk',transitionElapsedMs:0,blendMs:200});
  assert.deepEqual(start,prev);
  const end=sampleRigAction('sit',0,{previousAction:'walk',transitionElapsedMs:200,blendMs:200});
  assert.deepEqual(end,sampleRigAction('sit',0));
});
test('secondary physics, local step compensation, personality are configurable',()=>{
  const hairOn=sampleRigAction('idle',345,{secondaryMotion:true});
  const hairOff=sampleRigAction('idle',345,{secondaryMotion:false});
  assert.notEqual(hairOn.hair,hairOff.hair);
  assert.notEqual(sampleRigAction('walk',175,{footLock:true}).footCompR,0);
  assert.equal(sampleRigAction('walk',175,{footLock:false}).footCompR,0);
  assert.notEqual(sampleRigAction('walk',175,{personality:'bold'}).thighL,
                  sampleRigAction('walk',175,{personality:'calm'}).thighL);
});
test('one-shot actions complete instead of looping forever',()=>{
  assert.equal(isLoopingAction('die'),false);
  assert.equal(isLoopingAction('walk'),true);
  assert.ok(clipDuration('run')<clipDuration('walk'));
  assert.deepEqual(sampleRigAction('die',999999),sampleRigAction('die',3000));
});
test('skin palette can be switched without touching rig output',()=>{
  assert.notEqual(SAMPLE_SKINS[0].top,SAMPLE_SKINS[1].top);
  for(const skin of SAMPLE_SKINS)assert.equal(validateSkin(skin).id,skin.id);
  assert.throws(()=>validateSkin({...SAMPLE_SKINS[0],top:'javascript:alert(1)'}),/INVALID_SKIN_COLOR/);
  assert.deepEqual(sampleRigAction('walk',420),sampleRigAction('walk',420));
});
test('same timestamp from GM and Player Web yields the same pose command',()=>{
  const command={actionId:'walk',startedAt:10000,speed:1,personality:'bold'};
  const gm=sampleSynchronizedAction(command,10600,0);
  const player=sampleSynchronizedAction(command,10540,60);
  assert.deepEqual(gm,player);
  const poses=Array.from({length:30},(_,i)=>sampleRigAction(i%3===0?'walk':i%3===1?'idle':'sit',i*173));
  assert.equal(poses.length,30);
  assert.ok(poses.every(p=>Object.values(p).every(Number.isFinite)));
});
test('demo remains isolated from currently deployed player and GM renderers',()=>{
  const demo=fs.readFileSync(new URL('../assets/village/rig-skin-demo.html',import.meta.url),'utf8');
  assert.match(demo,/rig-skin-core\.mjs/);
  assert.match(demo,/rig-skin-renderer\.mjs/);
  const live=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(live,/rig-skin-renderer\.mjs/);
});
