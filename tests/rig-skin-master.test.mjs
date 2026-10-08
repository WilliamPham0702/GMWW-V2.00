import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RIG_SKIN_VERSION,ACTION_GROUPS,ACTION_CATALOG,BONES,SKIN_SLOTS,MASTER_RIG,SAMPLE_SKINS,
  basePose,clipDuration,isLoopingAction,sampleRigAction,sampleSynchronizedAction,validateSkin
} from '../assets/village/rig-skin-core.mjs';
import {svgMarkup} from '../assets/village/rig-skin-renderer.mjs';
const approx=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,`${a} !== ${b}`);
test('owner-approved catalogue contains precisely 9 actions in four groups',()=>{
  assert.equal(RIG_SKIN_VERSION,'0.2.0');
  assert.deepEqual(ACTION_GROUPS.map(g=>g.actions.length),[3,3,1,2]);
  assert.deepEqual(ACTION_CATALOG.map(a=>a.id),['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
  assert.equal(new Set(ACTION_CATALOG.map(x=>x.id)).size,9);
  assert.ok(ACTION_CATALOG.every(x=>x.type==='motion'));
  for(const omitted of ['freeze','attack','blink','talk','ready','fear','defend','clap','point','cheer']){
    assert.ok(!ACTION_CATALOG.some(x=>x.id===omitted),omitted);
  }
});
test('master rig is a 2D continuous body skeleton with dedicated hand, knee and ankle joints',()=>{
  for(const part of ['shoulderL','elbowL','handL','shoulderR','elbowR','handR','hipL','kneeL','ankleL','hipR','kneeR','ankleR']){
    assert.ok(BONES.includes(part),part);
  }
  assert.equal(MASTER_RIG.id,'gmww-soft-rig-muscular-v2');
  assert.ok(SKIN_SLOTS.includes('shorts'));
  const markup=svgMarkup(SAMPLE_SKINS[0]);
  assert.match(markup,/data-leg-l/);
  assert.match(markup,/data-arm-r/);
  assert.match(markup,/data-shorts/);
  assert.match(markup,/data-sandal-l/);
  assert.match(markup,/data-necklace/);
  assert.doesNotMatch(markup,/clip-path/);
  assert.doesNotMatch(markup,/url\(#skinBody/);
});
test('all nine animation clips return finite smooth pose points',()=>{
  for(const act of ACTION_CATALOG){
    for(const t of [0,77,190,550,1100,4000]){
      const pose=sampleRigAction(act.id,t);
      for(const joint of ['root','hip','shoulder','head']){
        assert.ok(Number.isFinite(pose[joint].x),act.id+' '+joint+'.x');
        assert.ok(Number.isFinite(pose[joint].y),act.id+' '+joint+'.y');
      }
      for(const x of ['elbows','hands','knees','ankles']){
        for(const side of ['L','R'])for(const axis of ['x','y'])assert.ok(Number.isFinite(pose[x][side][axis]),act.id+' '+x);
      }
      assert.ok(Number.isFinite(pose.worldX));
    }
  }
});
test('walking is leg-and-arm articulation, run has greater knee lift and faster cycle',()=>{
  const a=sampleRigAction('walk',195),b=sampleRigAction('walk',585);
  assert.notDeepEqual(a.ankles.L,b.ankles.L);
  assert.notDeepEqual(a.hands.L,b.hands.L);
  const run=sampleRigAction('run',360);
  assert.ok(clipDuration('run')<clipDuration('walk'));
  assert.ok(run.footLift.L>0||run.footLift.R>0);
  assert.ok(run.footLift.L>Math.max(a.footLift.L,a.footLift.R));
});
test('planted foot DOES NOT slide in world coordinates during stance',()=>{
  const d=clipDuration('walk');
  const p0=sampleRigAction('walk',0),p25=sampleRigAction('walk',d*.25);
  assert.equal(p0.contact.L,true);
  assert.equal(p25.contact.L,true);
  approx(p0.worldX+p0.footX.L,p25.worldX+p25.footX.L);
  approx(p0.footY.L,p25.footY.L);
  const p50=sampleRigAction('walk',d*.5),p75=sampleRigAction('walk',d*.75);
  assert.equal(p50.contact.R,true);
  assert.equal(p75.contact.R,true);
  approx(p50.worldX+p50.footX.R,p75.worldX+p75.footX.R);
  const disabled=sampleRigAction('walk',d*.25,{footLock:false});
  assert.notEqual(disabled.worldX+disabled.footX.L,p25.worldX+p25.footX.L);
});
test('sitting is compact and overlapping feet, not the earlier wide bent-knee stance',()=>{
  const sit=sampleRigAction('sit',300),stand=basePose();
  assert.ok(sit.hip.y>stand.hip.y+45);
  assert.ok(Math.abs(sit.knees.L.x)<42);
  assert.ok(Math.abs(sit.knees.R.x)<42);
  assert.ok(sit.ankles.L.x>0&&sit.ankles.R.x<0);
  assert.ok(Math.abs(sit.footX.L-sit.footX.R)<30);
  assert.ok(sit.footY.L>=296&&sit.footY.R>=296);
});
test('sit down and stand up are gradual eased transitions with held endpoint',()=>{
  const a=sampleRigAction('sit-down',0),middle=sampleRigAction('sit-down',450),b=sampleRigAction('sit-down',3000);
  assert.ok(a.hip.y<middle.hip.y&&middle.hip.y<b.hip.y);
  assert.equal(a.hip.y,basePose().hip.y);
  assert.equal(b.hip.y,sampleRigAction('sit',0).hip.y);
  assert.equal(sampleRigAction('stand-up',0).hip.y,b.hip.y);
  assert.equal(sampleRigAction('stand-up',3000).hip.y,a.hip.y);
});
test('wave and vote visibly raise an independently articulated hand',()=>{
  const idle=sampleRigAction('idle',0),wave=sampleRigAction('wave',500),vote=sampleRigAction('vote',1200);
  assert.ok(wave.hands.R.y<idle.hands.R.y-60);
  assert.ok(vote.hands.R.y<wave.hands.R.y+5);
  assert.ok(wave.hands.L.y>180);
});
test('result remains a single selectable action with two visual variants',()=>{
  const win=sampleRigAction('result',1300,{outcome:'win'});
  const lose=sampleRigAction('result',1300,{outcome:'lose'});
  assert.ok(win.hands.R.y<lose.hands.R.y);
  assert.equal(lose.mouth,-1);
  assert.equal(ACTION_CATALOG.filter(x=>x.id==='result').length,1);
});
test('blending does not jump at transition boundaries',()=>{
  const a=sampleRigAction('sit',0,{previousAction:'idle',transitionElapsedMs:0,blendMs:220});
  const b=sampleRigAction('sit',0,{previousAction:'idle',transitionElapsedMs:220,blendMs:220});
  assert.deepEqual(a,sampleRigAction('idle',0));
  assert.deepEqual(b,sampleRigAction('sit',0));
});
test('changing skin does not change rig motion',()=>{
  for(const skin of SAMPLE_SKINS)assert.equal(validateSkin(skin).id,skin.id);
  assert.notEqual(SAMPLE_SKINS[0].vest,SAMPLE_SKINS[1].vest);
  assert.throws(()=>validateSkin({...SAMPLE_SKINS[0],hair:'url(script)'}),/INVALID_SKIN_COLOR/);
  assert.deepEqual(sampleRigAction('walk',300),sampleRigAction('walk',300));
});
test('same motion timestamp produces same GM and Player pose; 30 rigs share one sampler',()=>{
  const cmd={actionId:'walk',startedAt:10000,speed:1,personality:'balanced'};
  assert.deepEqual(sampleSynchronizedAction(cmd,10300,0),sampleSynchronizedAction(cmd,10200,100));
  const crowd=Array.from({length:30},(_,i)=>sampleRigAction(i%3===0?'walk':i%3===1?'idle':'sit',i*219));
  assert.equal(crowd.length,30);
  assert.ok(crowd.every(p=>Number.isFinite(p.ankles.L.y)));
});
test('independent review lab uses original source artwork and never changes live Worker renderer',()=>{
  const demo=fs.readFileSync(new URL('../assets/village/rig-skin-demo.html',import.meta.url),'utf8');
  const live=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
  assert.match(demo,/Chọn Action \(9 hành động\)/);
  assert.match(demo,/chibi-01\.webp/);
  assert.doesNotMatch(live,/rig-skin-renderer\.mjs/);
  assert.ok(isLoopingAction('sit'));
  assert.equal(isLoopingAction('vote'),false);
});
