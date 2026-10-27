import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(file,'utf8');
function load(initial=null) {
 const storage=new Map(initial?[['GMWW_GM_PERFORMANCE_V1',JSON.stringify(initial)]]:[]);
 const listeners=new Map(),els=new Map();
 for(const id of ['gmwwPerfMode','gmwwPerfEffects','gmwwPerfIdle','gmwwPerfGuard','gmwwPerfStatus'])
   els.set(id,{value:'auto',checked:false,dataset:{},textContent:'',addEventListener:(event,cb)=>listeners.set(id+':'+event,cb)});
 let now=100000;
 const stage={classList:{contains:value=>value==='active'}};
 const document={hidden:false,readyState:'complete',documentElement:{dataset:{}},getElementById:id=>id==='start'?stage:els.get(id)||null};
 const ctx={document,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},Date:{now:()=>now}};
 vm.runInNewContext(read('server-game/current/gmww-performance.js'),ctx);
 return {api:ctx.GMWW_PERFORMANCE,document,els,storage,listeners,tick:ms=>now+=ms,stage};
}
test('GM iPhone auto mode enables approved safeguards by default',()=>{
 const x=load();
 assert.equal(x.api.get().mode,'auto');
 for(const key of ['loopGuard','effects','idle'])assert.equal(x.api.get()[key],true,key);
 assert.equal(x.els.get('gmwwPerfGuard').checked,true);
 assert.equal(x.document.documentElement.dataset.gmwwPerfMode,'auto');
 assert.equal(x.api.canRender(),true);
 x.document.hidden=true;assert.equal(x.api.canRender(),false);
 x.document.hidden=false;
 assert.equal(x.api.frameInterval(false,20),750);
 assert.equal(x.api.freezeIdle(),true);
});
test('loading invalid mode preserves always-on guard; toggles persist locally',()=>{
 const x=load({mode:'invalid',loopGuard:false,idle:false,effects:false});
 assert.equal(x.api.get().mode,'auto');assert.equal(x.api.get().loopGuard,true);
 assert.equal(x.api.get().idle,false);assert.equal(x.api.get().effects,false);
 x.api.set({mode:'save',loopGuard:false,idle:true,effects:true});
 assert.equal(x.api.get().loopGuard,true);assert.equal(x.api.reduced(),true);
 assert.equal(JSON.parse(x.storage.get('GMWW_GM_PERFORMANCE_V1')).mode,'save');
 x.els.get('gmwwPerfMode').value='high';
 x.listeners.get('gmwwPerfMode:change')();
 assert.equal(x.api.get().mode,'high');assert.equal(x.api.reduced(),false);
 assert.equal(x.api.freezeIdle(),false);
});
test('repeated slow frames temporarily reduce effects and automatically recover',()=>{
 const x=load();
 for(let i=0;i<3;i++)x.api.observeFrame(270,66,true);
 assert.equal(x.api.reduced(),true);
 assert.equal(x.document.documentElement.dataset.gmwwPerfReduced,'true');
 assert.match(x.els.get('gmwwPerfStatus').textContent,/khung hình trễ/);
 x.tick(25000);
 for(let i=0;i<12;i++)x.api.observeFrame(66,66,true);
 assert.equal(x.api.reduced(),false);
 assert.equal(x.api.metrics().reducedTransitions,2);
 assert.ok(x.api.frameInterval(true,12)>=60);
});
test('only GM opts into performance policy; shared atlas and OTA remain consistent',()=>{
 const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css'),
 motion=read('server-game/current/gmww-shared-motion.js'),webAtlas=read('assets/characters/gmww40/runtime.js'),
 pack=read('.github/scripts/prepare-update-channel.mjs');
 assert.ok(html.indexOf('gmww-performance.js?v=gm-perf-1')<html.indexOf('gmww-shared-motion.js?v='));
 for(const id of ['gmwwPerfCard','gmwwPerfMode','gmwwPerfGuard','gmwwPerfEffects','gmwwPerfIdle','gmwwPerfStatus'])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/data-gmww-perf-reduced="true"/);
 assert.equal(motion,webAtlas);
 assert.match(motion,/policy\.canRender\(\)/);assert.match(motion,/policy\.frameInterval\(/);
 assert.match(motion,/if\(!raf&&!wake\)schedule\(\)/);
 assert.match(motion,/GMWW_PERFORMANCE\?\.freezeIdle\(\)/);
 assert.ok(pack.includes("copy('server-game/current/gmww-performance.js','gmww-performance.js')"));
 assert.doesNotMatch(read('assets/village/village.mjs'),/gmww-performance\.js/);
});


test('motion scheduler keeps one pending callback for multiple characters and cancels when hidden',()=>{
 const callbacks=new Map(),timeouts=new Map(),events={};
 let nextId=1,framesRequested=0;
 const draw={clearRect(){},drawImage(){}};
 const makeNode=()=>({isConnected:true,dataset:{},style:{},firstElementChild:null,
   append(child){this.firstElementChild??=child;},replaceChildren(){this.firstElementChild=null;},
   setAttribute(){},closest(){return null},getContext(){return draw}});
 const document={hidden:false,createElement:makeNode,addEventListener:(event,cb)=>events[event]=cb};
 const ctx={document,Image:class {constructor(){this.complete=true;this.naturalWidth=2000;}},
   requestAnimationFrame:cb=>{const id=nextId++;framesRequested++;callbacks.set(id,cb);return id;},
   cancelAnimationFrame:id=>callbacks.delete(id),
   setTimeout:(cb,ms)=>{const id=nextId++;timeouts.set(id,{cb,ms});return id;},
   clearTimeout:id=>timeouts.delete(id),
   GMWW_PERFORMANCE:{canRender:()=>!document.hidden,frameInterval:()=>750,observeFrame(){},freezeIdle:()=>true}};
 vm.runInNewContext(read('server-game/current/gmww-shared-motion.js'),ctx);
 const host1=makeNode(),host2=makeNode();
 ctx.GMWW_SHARED_MOTION.mount(host1,{characterId:'character-01'});
 ctx.GMWW_SHARED_MOTION.mount(host2,{characterId:'character-02'});
 assert.equal(callbacks.size,1,'both actors share one pending animation frame');
 const pending=callbacks.values().next().value;
 callbacks.clear();pending(1000);
 assert.equal(timeouts.size,1,'one timer schedules the next batched draw');
 assert.equal(framesRequested,1,'no 60Hz idle RAF spin');
 document.hidden=true;events.visibilitychange();
 assert.equal(timeouts.size,0,'background transition cancels wake timers');
 document.hidden=false;events.visibilitychange();
 assert.equal(callbacks.size,1,'foreground transition resumes a single RAF');
});
