import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RIG_SKIN_VERSION,ACTION_GROUPS,ACTION_CATALOG,BONES,SKIN_SLOTS,MASTER_RIG,SAMPLE_SKINS,
  basePose,clipDuration,isLoopingAction,sampleRigAction,sampleSynchronizedAction,validateSkin
} from '../assets/village/rig-skin-core.mjs';
import {svgMarkup} from '../assets/village/rig-skin-renderer.mjs';
import {sampleVillageRoute,ROUTE_DIRECTIONS,TURN_MS,WALK_SEGMENT_MS} from '../assets/village/rig-skin-navigation.mjs';
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
  // Cropping the official HEAD image is valid; clipping the whole body to fabricate limbs is not.
  assert.match(markup,/clipPath id="character01-original-head-clip"/);
  assert.doesNotMatch(markup,/clip-path="url\(#skinBody/);
  const renderer=fs.readFileSync(new URL('../assets/village/rig-skin-renderer.mjs',import.meta.url),'utf8');
  assert.ok(!renderer.includes('200+pose.root.x'), 'double root translation would clip the Character outside the SVG frame');
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
  assert.equal(sit.sitBlend,1);
  assert.equal(stand.sitBlend,0);
  assert.ok(sampleRigAction('sit-down',450).sitBlend>0&&sampleRigAction('sit-down',450).sitBlend<1);
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
  assert.ok(demo.includes('id="smallActor"'));
  assert.ok(demo.includes('sampleVillageRoute(elapsed'));
  assert.ok(!demo.includes('pose.worldX*scale'));
  assert.ok(demo.includes('id="direction"'));
  assert.doesNotMatch(live,/rig-skin-renderer\.mjs/);
  assert.ok(isLoopingAction('sit'));
  assert.equal(isLoopingAction('vote'),false);
});

test('four-direction travel rotates BEFORE translation and never slides sideways',()=>{
  assert.deepEqual(ROUTE_DIRECTIONS,['right','up','left','down']);
  const segmentMs=TURN_MS+WALK_SEGMENT_MS;
  const origin=sampleVillageRoute(0);
  const turningRight=sampleVillageRoute(TURN_MS*.85);
  const walkingRight=sampleVillageRoute(TURN_MS+WALK_SEGMENT_MS*.5);
  assert.equal(turningRight.direction,'right');
  assert.equal(turningRight.turning,true);
  assert.ok(turningRight.headingDeg>0&&turningRight.headingDeg<90);
  assert.equal(turningRight.animation,'idle');
  assert.deepEqual(turningRight.position,origin.position);
  assert.equal(walkingRight.animation,'walk');
  assert.ok(walkingRight.position.x>origin.position.x);
  assert.equal(walkingRight.position.y,origin.position.y);
  const turnUp=sampleVillageRoute(segmentMs+TURN_MS*.6);
  const goUp=sampleVillageRoute(segmentMs+TURN_MS+WALK_SEGMENT_MS*.7);
  assert.equal(turnUp.direction,'up');
  assert.equal(turnUp.turning,true);
  assert.ok(turnUp.headingDeg>90&&turnUp.headingDeg<180);
  assert.deepEqual(turnUp.position,sampleVillageRoute(segmentMs).position);
  assert.ok(goUp.position.y<turnUp.position.y);
  assert.equal(goUp.position.x,turnUp.position.x);
  const left=sampleVillageRoute(2*segmentMs+TURN_MS+500);
  const down=sampleVillageRoute(3*segmentMs+TURN_MS+500);
  assert.equal(left.direction,'left');
  assert.equal(down.direction,'down');
  assert.ok(left.position.x<sampleVillageRoute(2*segmentMs).position.x);
  assert.ok(down.position.y>sampleVillageRoute(3*segmentMs).position.y);
});
test('manual direction is fixed, no world movement until turn completes or after arrival',()=>{
  for(const direction of ['left','right','up','down']){
    const turn=sampleVillageRoute(120,{mode:direction});
    const step=sampleVillageRoute(TURN_MS+200,{mode:direction});
    const complete=sampleVillageRoute(5000,{mode:direction});
    assert.equal(turn.turning,true);
    assert.ok(Math.abs(turn.headingDeg)>0||direction==='down');
    assert.deepEqual(turn.position,{x:0,y:0});
    assert.equal(step.direction,direction);
    assert.equal(step.moving,true);
    assert.equal(complete.moving,false);
    assert.equal(complete.animation,'idle');
  }
  assert.ok(sampleVillageRoute(TURN_MS+500,{mode:'left'}).position.x<0);
  assert.ok(sampleVillageRoute(TURN_MS+500,{mode:'right'}).position.x>0);
  assert.ok(sampleVillageRoute(TURN_MS+500,{mode:'up'}).position.y<0);
  assert.ok(sampleVillageRoute(TURN_MS+500,{mode:'down'}).position.y>0);
  assert.throws(()=>sampleVillageRoute(100,{mode:'diagonal'}),/UNKNOWN_DIRECTION/);
});
test('official full outfit uses source artwork for face vest flower shorts and sandals',()=>{
  const markup=svgMarkup(SAMPLE_SKINS[0]);
  for(const slot of ['original-head','original-vest-image','original-shorts-image','original-sandal-l','original-sandal-r','profile-vest','rear-torso'])assert.match(markup,new RegExp('data-'+slot));
  assert.match(markup,/character01-original-vest-clip/);
  assert.match(markup,/character01-original-shorts-clip/);
});
test('head remains perfectly level for all nine actions and result variations',()=>{
  for(const action of ACTION_CATALOG)for(const time of [0,70,220,560,1000,1950,4900]){
    for(const outcome of ['win','lose']){
      assert.equal(sampleRigAction(action.id,time,{outcome}).headTilt,0,action.id+'@'+time);
      assert.equal(sampleRigAction(action.id,time,{outcome,previousAction:'idle',transitionElapsedMs:65}).headTilt,0);
    }
  }
  const renderSource=fs.readFileSync(new URL('../assets/village/rig-skin-renderer.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(renderSource,/rotate\(\$\{n\(pose\.headTilt\)\}\)/);
});
test('renderer actually contains separate rear and side appearances',()=>{
  const markup=svgMarkup(SAMPLE_SKINS[0]);
  assert.match(markup,/data-rear-head/);
  assert.match(markup,/data-profile-face/);
  assert.match(markup,/data-rear-torso/);
  const source=fs.readFileSync(new URL('../assets/village/rig-skin-renderer.mjs',import.meta.url),'utf8');
  assert.ok(source.includes("set(b['rear-head'],'opacity',n(back/weights))"));
  assert.ok(source.includes('headingDeg'));
  assert.ok(source.includes("b.svg.dataset.facing=valid"));
  assert.match(markup,/data-original-head/);
  assert.match(markup,/data-seated-legs/);
  assert.match(markup,/chibi-01\.webp/);
});
