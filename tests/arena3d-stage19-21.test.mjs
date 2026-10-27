import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArenaMobileDiagnostics,ARENA_STAGE19_VERSION}
 from '../assets/village/arena-3d/stage19-mobile-diagnostics.mjs';

const sample=(tracker,at,extra={})=>tracker.sample({at,paintCpuMs:5,drawCalls:43,targetHz:30,characters:30,pixelRatio:1.1,...extra});
test('GĐ19: bounded real paint measurements and percentile CPU do not pretend to be GPU time',()=>{
 const q=createArenaMobileDiagnostics({capacity:10});
 assert.equal(ARENA_STAGE19_VERSION,'gmww.arena.mobile-qa.19-21');
 for(let i=0;i<14;i++)sample(q,100+i*50,{paintCpuMs:i+1});
 let r=q.snapshot();
 assert.equal(r.sampleCount,10);
 assert.equal(r.totalFrames,14);
 assert.equal(r.characterCount,30);
 assert.equal(r.drawCalls,43);
 assert.equal(r.paintIntervalMedianMs,50);
 assert.equal(r.measuredPaintFps,20);
 assert.equal(r.paintCpuP95Ms,14);
 assert.equal(r.thermalCelsius,null);
 assert.equal(r.batteryDrainPercent,null);
 assert.equal(r.measurements,'browser-cpu-and-paint-cadence-only');
 q.reset();
 assert.equal(q.snapshot().sampleCount,0);
});
test('GĐ20: hidden tab and WebGL loss stop capture, resume ignores long gap',()=>{
 const q=createArenaMobileDiagnostics();
 sample(q,100);sample(q,150);
 q.visibility(true);sample(q,200);
 q.visibility(false);sample(q,10000);
 sample(q,10050);
 q.lost();sample(q,10100);q.lost();
 assert.equal(q.snapshot().contextLosses,1);
 assert.equal(q.snapshot().webglContextLost,true);
 q.restored();sample(q,13000);sample(q,13050);
 const r=q.snapshot();
 assert.equal(r.contextRestores,1);
 assert.equal(r.contextLosses,1);
 assert.equal(r.hidden,false);
 assert.equal(r.webglContextLost,false);
 assert.equal(r.paintIntervalP95Ms,50,'sleep and WebGL restore cannot pollute performance samples');
});
test('GĐ21: report only allowlisted metrics; never includes GM or player identifiers',()=>{
 const q=createArenaMobileDiagnostics();
 sample(q,100);
 const report=q.report();
 assert.deepEqual(JSON.parse(report).version,'gmww.arena.mobile-qa.19-21');
 assert.doesNotMatch(report,/roomCode|roomId|loginId|actorId|roleId|artifactId|token|private|authorization|userAgent|navigator/i);
 const s=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const html=readFileSync('assets/village/arena-3d/live.html','utf8');
 assert.match(s,/canvas\.addEventListener\('webglcontextlost'/);
 assert.match(s,/canvas\.addEventListener\('webglcontextrestored'/);
 assert.match(s,/document\.addEventListener\('visibilitychange'/);
 assert.match(s,/paintScheduler\.shouldPaint\(now,frameHz,\{paused:webglLost\}\)/);
 assert.match(s,/mobileQa\.sample\(\{at:now,paintCpuMs:/);
 assert.match(s,/await navigator\.clipboard\.writeText\(JSON\.stringify\(report,null,2\)\)/);
 assert.match(html,/id="arena-mobile-diagnostics"/);
 assert.match(html,/id="arena-diag-refresh"/);
 assert.match(html,/id="arena-diag-copy"/);
 assert.doesNotMatch(s,/localStorage|sessionStorage/);
});

import {createArenaSessionTrend} from '../assets/village/arena-3d/stage23-25-mobile-budget.mjs';

test('GĐ25: 90 minutes of simulated 30-character frames retain max 30 minute windows',()=>{
 const trend=createArenaSessionTrend({maxMinutes:30});
 for(let minute=0;minute<90;minute++){
  for(let i=0;i<120;i++)trend.observe({
   at:minute*60000+i*500,drawCalls:37,paintCpuMs:4,
   intervalMs:500,targetHz:12,characters:30,active:i%3===0
  });
 }
 const s=trend.summary();
 assert.equal(s.minutesObserved,89,'89 finished minutes + current minute');
 assert.equal(s.storedWindows,30,'ring buffer remains 30 maximum');
 assert.equal(s.windowCapacity,30);
 assert.equal(s.maxCharacters,30);
 assert.equal(s.maxPaintCpuMs,4);
 assert.equal(s.thermalCelsius,null);
 assert.equal(s.batteryDrainPercent,null);
 assert.deepEqual(Object.keys(s).filter(x=>/token|role|target|room|actor|member|code/i.test(x)),[]);
});

test('GĐ25: background and WebGL loss close session window without retaining user records',()=>{
 const trend=createArenaSessionTrend({maxMinutes:6});
 const point=(at,chars=6)=>trend.observe({
  at,drawCalls:42,paintCpuMs:2,intervalMs:85,targetHz:12,characters:chars,active:false
 });
 point(1000);point(1050);trend.suspend(true);point(2000,30);
 assert.equal(trend.summary().maxCharacters,6);
 trend.suspend(false);trend.gpuLost();point(5000,30);
 assert.equal(trend.summary().maxCharacters,6);
 trend.gpuRestored();point(9000,12);
 assert.equal(trend.summary().maxCharacters,12);
 trend.reset();
 assert.equal(trend.summary().storedWindows,0);
 assert.equal(trend.summary().observedFrames,0);
});

test('GĐ25: browser reports session aggregate privately, without changing Core traffic',()=>{
 const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(live,/sessionTrend\.observe\(\{at:now/);
 assert.match(live,/sessionTrend\.suspend\(document\.hidden\)/);
 assert.match(live,/sessionTrend\.gpuLost\(\)/);
 assert.match(live,/sessionTrend\.gpuRestored\(\)/);
 assert.match(live,/report\.sessionTrend=sessionTrend\.summary\(\)/);
 assert.match(live,/JSON\.stringify\(report,null,2\)/);
 assert.match(live,/refreshPrivateGmEffects\(\)/);
 assert.doesNotMatch(live,/localStorage|sessionStorage/);
});
