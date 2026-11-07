import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load({withObserver=true}={}) {
  const storage=new Map(),els=new Map(),listeners=new Map();
  for(const id of ['gmwwPerfMode','gmwwPerfEffects','gmwwPerfIdle','gmwwPerfGuard','gmwwPerfStatus','gmwwPerfFps','gmwwPerfSlow','gmwwPerfTimers','gmwwPerfLong','gmwwPerfHeap','gmwwPerfLite'])
    els.set(id,{value:'auto',checked:false,dataset:{},textContent:'',addEventListener:(e,cb)=>listeners.set(id+':'+e,cb)});
  let now=100000,nextId=1;const cleared=[],raw=[];
  const document={hidden:false,readyState:'complete',documentElement:{dataset:{}},
    getElementById:id=>id==='start'?{classList:{contains:v=>v==='active'}}:id==='settings'?{classList:{contains:v=>v==='active'}}:els.get(id)||null};
  const observers=[];
  const ctx={document,Date:{now:()=>now},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
    setInterval:(fn,ms)=>{raw.push([fn,ms]);return nextId++},clearInterval:id=>cleared.push(id),
    performance:{memory:{usedJSHeapSize:52*1048576}}};
  if(withObserver)ctx.PerformanceObserver=class{static supportedEntryTypes=['longtask'];constructor(cb){observers.push(cb)}observe(){}};
  vm.runInNewContext(fs.readFileSync('server-game/current/gmww-performance.js','utf8'),ctx);
  return {api:ctx.GMWW_PERFORMANCE,ctx,els,listeners,storage,raw,cleared,observers,tick:ms=>now+=ms};
}

test('setInterval/clearInterval keep returning ids and the live-interval count tracks them',()=>{
  const x=load();
  const a=x.ctx.setInterval(()=>{},1000),b=x.ctx.setInterval(()=>{},500);
  assert.equal(typeof a,'number');assert.notEqual(a,b);
  assert.equal(x.api.snapshot().timers,2);
  x.ctx.clearInterval(a);
  assert.equal(x.api.snapshot().timers,1);assert.deepEqual(x.cleared,[a]);
});
test('fps counts only the last 5 seconds of render frames; slow percent comes from observed frames',()=>{
  const x=load();
  for(let i=0;i<10;i++){x.api.observeFrame(66,66,true);x.tick(500)}
  assert.equal(x.api.snapshot().fps,2); // 10 frames over 5s window
  x.tick(6000);
  assert.equal(x.api.snapshot().fps,0);
  x.api.observeFrame(900,66,true);
  assert.ok(x.api.snapshot().slowPercent>0);
});
test('heap and long tasks degrade to null when the browser lacks support (iOS Safari)',()=>{
  const x=load({withObserver:false});
  assert.equal(x.api.snapshot().longTasks60s,null);
  const y=load();
  assert.equal(y.api.snapshot().heapMb,52);assert.equal(y.api.snapshot().longTasks60s,0);
  y.observers[0]({getEntries:()=>[{duration:120}]});
  assert.equal(y.api.snapshot().longTasks60s,1);
});
test('lite mode saves previous mode, forces saving settings, and restores on second press',()=>{
  const x=load();
  x.api.set({mode:'high'});
  assert.equal(x.api.lite().mode,'save');
  assert.equal(x.api.get().effects,true);assert.equal(x.api.get().idle,true);assert.equal(x.api.reduced(),true);
  assert.equal(x.api.lite().mode,'high');
});
test('lite button is bound and changes the visible label; metrics paint only while Settings is open',()=>{
  const x=load();
  x.listeners.get('gmwwPerfLite:click')();
  assert.equal(x.els.get('gmwwPerfLite').textContent,'KHÔI PHỤC CHẾ ĐỘ');
  assert.equal(x.els.get('gmwwPerfTimers').textContent.includes('bộ đếm'),true);
  assert.equal(x.els.get('gmwwPerfHeap').textContent,'52 MB');
  assert.equal(x.raw.filter(([,ms])=>ms===2000).length,1); // single paint timer
});
test('GM page ships the metric cells and lite button',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  for(const id of ['gmwwPerfFps','gmwwPerfSlow','gmwwPerfTimers','gmwwPerfLong','gmwwPerfHeap','gmwwPerfLite'])
    assert.ok(html.includes('id="'+id+'"'),id);
});
