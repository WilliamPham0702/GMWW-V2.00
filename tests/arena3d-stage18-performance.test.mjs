import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arenaTargetFrameHz,ARENA_STAGE18_VERSION,createArenaPaintScheduler,ARENA_STAGE22_VERSION} from '../assets/village/arena-3d/render-optimization.mjs';

test('GĐ18: idle mobile renders fewer frames; active spell/camera remains smooth',()=>{
 assert.equal(ARENA_STAGE18_VERSION,'gmww.arena.mobile-frame-pacing.18');
 for(const active of [false,true]){
  for(const interacting of [false,true]){
   assert.equal(arenaTargetFrameHz({visible:false,active,interacting}),0);
  }
 }
 assert.equal(arenaTargetFrameHz(),12);
 assert.equal(arenaTargetFrameHz({active:true}),30);
 assert.equal(arenaTargetFrameHz({interacting:true}),30);
 assert.equal(arenaTargetFrameHz({lowPower:true}),8);
 assert.equal(arenaTargetFrameHz({lowPower:true,active:true}),20);
 assert.equal(arenaTargetFrameHz({lowPower:true,interacting:true}),20);
 assert.equal(arenaTargetFrameHz({reducedMotion:true}),10);
 assert.equal(arenaTargetFrameHz({reducedMotion:true,active:true}),20);
 assert.equal(arenaTargetFrameHz({lowPower:true,reducedMotion:true,active:true}),20);
});

test('GĐ18: idle pacing does not throttle WebSocket and private GM update network',()=>{
 const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const painting=live.slice(live.indexOf('function loop(now){'));
 assert.match(live,/arenaTargetFrameHz\(\{visible:!document\.hidden/);
 assert.match(live,/active:field\.hasActiveMotion\(now\)/);
 assert.match(live,/interacting:trackedPointers\.size>0/);
 assert.match(painting,/paintScheduler\.shouldPaint\(now,frameHz,\{paused:webglLost\}\)/);
 assert.match(painting,/render\.render\(scene,camera\);frames\+\+/);
 assert.match(live,/setInterval\(\(\)=>\{if\(!document\.hidden&&gmToken\)/);
 assert.ok(live.indexOf('connectStagingRoom(')<live.indexOf('function loop(now){'));
 assert.match(live,/if\(nextSignature!==sceneSignature\)/);
 assert.doesNotMatch(live,/localStorage|sessionStorage/);
});

test('GĐ18: low-power removes cosmetic instanced meshes, preserving heads and gameplay',()=>{
 const src=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 assert.match(src,/function applyVisualBudget\(\)/);
 assert.match(src,/part\.mesh\.visible=!hidden\.has\(part\.name\)/);
 assert.match(src,/if\(!part\.mesh\.visible\)continue/);
 assert.match(src,/function hasActiveMotion\(/);
 assert.match(src,/if\(activeBeam&&time<activeBeam\.until\)return true/);
 assert.match(src,/actor\.walk\|\|actor\.gestureEnd>time\|\|actor\.castUntil>time/);
 assert.match(src,/headMesh=meshes\.find\(p=>p\.name==='head'\)/);
 const eco=arenaCrowdDetailPolicy({characters:30,lowPower:true}).hiddenParts.join(',');
 for(const corePart of ['head','eyeL','eyeR','armL','armR','tunic','skirt','shoeL','shoeR']){
  assert.doesNotMatch(eco,new RegExp("'"+corePart+"'"),corePart+' must remain visible/pickable');
 }
 const village=readFileSync('assets/village/arena-3d/coastal-village.mjs','utf8');
 assert.match(village,/if\(night===desired\)return/);
});

// GĐ22 tests co-located with the existing scoped Stage18 performance suite.
function simulate(displayHz,targetHz,seconds=10){
 const scheduler=createArenaPaintScheduler(),timestamps=[];
 const samples=Math.floor(displayHz*seconds);
 for(let i=0;i<samples;i++){
  const at=i*1000/displayHz;
  if(scheduler.shouldPaint(at,targetHz))timestamps.push(at);
 }
 return timestamps;
}
test('GĐ22: 12 FPS idle target must not quantize to 10 FPS on iPhone 60Hz rAF',()=>{
 assert.equal(ARENA_STAGE22_VERSION,'gmww.arena.deadline-frame-pacing.22');
 const frames=simulate(60,12,10);
 const fps=frames.length/10;
 assert.ok(fps>=11.8&&fps<=12.2,'actual request count 12/s, not 10/s');
 const intervals=frames.slice(1).map((x,i)=>x-frames[i]);
 assert.ok(Math.max(...intervals)<=100.01);
 assert.ok(Math.min(...intervals)>=66.5);
});

test('GĐ22: stable 60Hz and 120Hz requestAnimationFrame schedule for all tiers',()=>{
 for(const refresh of [60,120]){
  for(const target of [8,10,12,20,30]){
   const output=simulate(refresh,target,10);
   assert.ok(Math.abs(output.length-target*10)<=1,
     refresh+'Hz screen must meet '+target+' FPS cadence (actual '+output.length/10+')');
  }
 }
});

test('GĐ22: transitions idle=>casting, eco, reduce motion stay bounded',()=>{
 const scheduler=createArenaPaintScheduler();
 let last=-1,paints=0;
 for(let i=0;i<60*8;i++){
  const now=i*1000/60,active=i>=120&&i<240,eco=i>=300;
  const hz=eco?(active?20:8):active?30:12;
  if(scheduler.shouldPaint(now,hz)){
   assert.ok(now>last,'at most one draw per rAF tick');
   last=now;paints++;
  }
 }
 assert.ok(paints>50&&paints<180);
});

test('GĐ22: lost WebGL, hidden tab, background suspension reset pacing without GPU burst',()=>{
 const s=createArenaPaintScheduler();
 assert.equal(s.shouldPaint(0,12),true);
 assert.equal(s.shouldPaint(15,12),false);
 assert.equal(s.shouldPaint(5000,12,{paused:true}),false);
 assert.equal(s.shouldPaint(8000,12),true,'resume draws exactly once');
 assert.equal(s.shouldPaint(8001,12),false);
 assert.equal(s.shouldPaint(14000,12),true,'long RAF gap resets rather than catching up');
 assert.equal(s.shouldPaint(14000,0),false);
 assert.equal(s.shouldPaint(15000,20),true);
 s.reset();assert.equal(s.shouldPaint(0,12),true);
});
test('GĐ22: no change to Core networking or GM private visibility, only GPU paint schedule',()=>{
 const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const source=readFileSync('assets/village/arena-3d/render-optimization.mjs','utf8');
 assert.match(live,/paintScheduler\.shouldPaint\(now,frameHz,\{paused:webglLost\}\)/);
 assert.match(live,/document\.addEventListener\('visibilitychange'/);
 assert.match(live,/canvas\.addEventListener\('webglcontextlost'/);
 assert.match(live,/canvas\.addEventListener\('webglcontextrestored'/);
 assert.match(live,/render\.render\(scene,camera\);frames\+\+/);
 assert.match(live,/connectStagingRoom\(/);
 assert.match(live,/refreshPrivateGmEffects\(/);
 assert.doesNotMatch(source,/gmToken|roleId|artifactId|privateRole/);
});

import {arenaCrowdDetailPolicy,ARENA_STAGE23_25_VERSION}
 from '../assets/village/arena-3d/stage23-25-mobile-budget.mjs';

test('GĐ23: 6/12/20/30 seats reduce cosmetic GPU draws without removing actor, head, hands or VFX',()=>{
 assert.equal(ARENA_STAGE23_25_VERSION,'gmww.arena.crowd-session.23-25');
 const tiers=[6,12,20,24,30].map(characters=>arenaCrowdDetailPolicy({characters}));
 assert.deepEqual(tiers.map(x=>x.tier),['full','full','crowd20','crowd30','crowd30']);
 assert.deepEqual(tiers.map(x=>x.hiddenCount),[0,0,4,9,9]);
 const essential=['head','eyeL','eyeR','armL','armR','shoeL','shoeR','tunic','skirt','stool'];
 for(const policy of [...tiers,arenaCrowdDetailPolicy({characters:30,lowPower:true})]){
  assert.equal(policy.essentialParts.includes('head'),true);
  for(const p of essential)assert.ok(!policy.hiddenParts.includes(p),p+' remains visible');
  assert.ok(!policy.hiddenParts.includes('shield'),'Core shield/VFX never hidden');
  assert.ok(!policy.hiddenParts.includes('attack'),'Core attack/VFX never hidden');
 }
 assert.equal(arenaCrowdDetailPolicy({characters:30,lowPower:true}).hiddenCount,13);
});

test('GĐ24: crowd budget and stale effects must not reset a caster en route or holding a Core turn',()=>{
 const source=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 assert.match(source,/function applyVisualBudget\(\)/);
 assert.match(source,/applyVisualBudget\(\);\s*draw\(performance\.now\(\),true\)/);
 assert.match(source,/for\(const \[kind,deadline\] of actor\.effects\)/);
 assert.match(source,/if\(actor\.travel\?\.to===0&&time>actor\.travel\.startedAt/);
 assert.match(source,/if\(activeBeam&&time>=activeBeam\.start&&time<activeBeam\.until\)/);
 assert.match(source,/const headMesh=meshes\.find\(p=>p\.name==='head'\)/);
});
