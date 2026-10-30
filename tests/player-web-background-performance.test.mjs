import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('village FPS reporter samples only in gmwwPerf=1 diagnostics and pauses when hidden',()=>{
  const source=read('assets/village/village-performance.mjs').replace('export function','function')+'\n;globalThis.startVillagePerformanceReporter=startVillagePerformanceReporter;';
  const frames=new Map(),listeners=new Map();let nextFrame=0;
  const document={hidden:false,getElementsByTagName:()=>[] ,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener(){}};
  const context={
    window:{parent:null,location:{origin:'https://game.example',search:'?gmwwPerf=1'},GMWWVillageRenderMetrics:{}},document,
    performance:{now:()=>0,memory:null},innerWidth:390,innerHeight:844,devicePixelRatio:3,Date,URLSearchParams,
    requestAnimationFrame(fn){const id=++nextFrame;frames.set(id,fn);return id},
    cancelAnimationFrame(id){frames.delete(id)},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,
    PerformanceObserver:class{observe(){} disconnect(){}}
  };
  context.window.parent=context.window;context.globalThis=context;
  vm.runInNewContext(source,context);
  const stop=context.startVillagePerformanceReporter({target:context.window});
  assert.equal(frames.size,1);
  document.hidden=true;listeners.get('visibilitychange')();
  assert.equal(frames.size,0,'hidden page must cancel the FPS frame loop');
  document.hidden=false;listeners.get('visibilitychange')();
  assert.equal(frames.size,1,'visible page must resume exactly one FPS frame loop');
  stop();assert.equal(frames.size,0);
});


test('PR648 normal village has no idle FPS animation but keeps interval telemetry and cleanup',()=>{
  const source=read('assets/village/village-performance.mjs').replace('export function','function')+'\n;globalThis.startVillagePerformanceReporter=startVillagePerformanceReporter;';
  const frames=new Map(),listeners=new Map(),messages=[];
  let nextFrame=0,intervalReport=null;
  const document={hidden:false,getElementsByTagName:()=>[],addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener(){}};
  const receiver={postMessage:payload=>messages.push(payload)};
  const context={
    window:{parent:receiver,location:{origin:'https://game.example',search:''},GMWWVillageRenderMetrics:{}},
    document,performance:{now:()=>0,memory:null},innerWidth:390,innerHeight:844,devicePixelRatio:3,Date,URLSearchParams,
    requestAnimationFrame(fn){const id=++nextFrame;frames.set(id,fn);return id},
    cancelAnimationFrame(id){frames.delete(id)},
    setInterval(fn){intervalReport=fn;return 1},clearInterval(){},setTimeout:()=>2,
    PerformanceObserver:class{observe(){} disconnect(){}}
  };
  context.globalThis=context;
  vm.runInNewContext(source,context);
  const stop=context.startVillagePerformanceReporter({target:receiver});
  assert.equal(frames.size,0,'normal iPhone foreground must not schedule 60Hz FPS sampling');
  intervalReport();
  assert.equal(messages.length,1,'interval telemetry remains available');
  assert.equal(messages[0].type,'gmww:village-perf');
  assert.equal(messages[0].fps,null,'FPS is unavailable unless diagnostic mode is enabled');
  document.hidden=true;listeners.get('visibilitychange')();
  document.hidden=false;listeners.get('visibilitychange')();
  assert.equal(frames.size,0,'returning to foreground must not start FPS sampling');
  stop();intervalReport();
  assert.equal(messages.length,1,'cleanup must prevent further reporting');
});

test('Player Web background network timers are visibility guarded',()=>{
  const rooms=read('src/player-web-src/30-rooms-and-realtime.part');
  const runtime=read('src/player-web-src/50-privacy-and-runtime.part');
  const scene=read('assets/village/scene-manager.mjs');
  assert.match(rooms,/state\.presenceTimer=setInterval\(\(\)=>\{if\(document\.hidden\)return;/);
  assert.match(runtime,/gmwwWebUpdateTimer=setInterval\(\(\)=>\{if\(!document\.hidden\)checkWebUpdate\(\)\},60000\)/);
  assert.match(scene,/setInterval\(\(\)=>\{if\(!document\.hidden\)void sync\(\)\},5000\)/);
});
