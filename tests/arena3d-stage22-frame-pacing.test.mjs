import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArenaPaintScheduler,ARENA_STAGE22_VERSION} from '../assets/village/arena-3d/render-optimization.mjs';

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
