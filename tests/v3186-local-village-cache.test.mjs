import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
const paths=['server-game/src/00-core-and-library.part','assets/village/scene-manager.mjs'];
function cacheSource(path){const s=fs.readFileSync(path,'utf8');return s.slice(s.indexOf('function createVillageLocalCache('),s.indexOf('// End village local cache'));}
function setup(path,indexedDB=new IDBFactory(),online=true){
 const source=cacheSource(path);assert.ok(source.includes('function createVillageLocalCache('),'persistent local image cache must exist');
 let calls=0;
 const ctx={indexedDB,URL,Blob,AbortSignal,setTimeout,clearTimeout,fetch:async()=>{calls++;if(!online)throw Error('offline');return {ok:true,blob:async()=>new Blob(['picture'],{type:'image/png'})}},FileReader:class{readAsDataURL(){this.result='data:image/png;base64,cGljdHVyZQ==';queueMicrotask(()=>this.onload())}}};
 vm.createContext(ctx);vm.runInContext(source+';this.cache=createVillageLocalCache("https://game.example");',ctx);
 return {cache:ctx.cache,calls:()=>calls,indexedDB};
}
for(const path of paths){
 test(path+': restart offline restores actual image bytes without HTTP',async()=>{
  const first=setup(path),record={revision:7,day:'/day?v=7',night:'/night?v=7'};
  const saved=await first.cache.prepare(record);await first.cache.save(saved);
  assert.equal(first.calls(),2);
  const reopened=setup(path,first.indexedDB,false),restored=await reopened.cache.restore();
  assert.equal(restored.record.revision,7);assert.match(restored.images.day,/^data:image\/png/);assert.equal(reopened.calls(),0);
  await reopened.cache.prepare(record,restored);assert.equal(reopened.calls(),0);
 });
 test(path+': failed update retains previous pair; reset persists null backgrounds',async()=>{
  const first=setup(path),old=await first.cache.prepare({revision:1,day:'/a',night:'/b'});await first.cache.save(old);
  const offline=setup(path,first.indexedDB,false);
  await assert.rejects(offline.cache.prepare({revision:2,day:'/c',night:'/d'},old));
  assert.equal((await offline.cache.restore()).record.revision,1);
  await offline.cache.save(await offline.cache.prepare({revision:3,day:null,night:null},old));
  const reset=await first.cache.restore();assert.equal(reset.record.revision,3);assert.equal(reset.images.day,null);assert.equal(reset.images.night,null);
 });
}
test('same local cache implementation ships in GM and Player',()=>assert.equal(cacheSource(paths[0]),cacheSource(paths[1])));
for(const path of paths){
 test(path+': startup paints cached day/night while server is unreachable',async()=>{
  const first=setup(path);await first.cache.save(await first.cache.prepare({revision:8,day:'/day',night:'/night'}));
  const properties=new Map(),classes=new Set(['scene-awaiting','gmww-scene-awaiting']);let phase='day';
  const world={style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k)},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}};
  const boot={hidden:false};const shell={dataset:{phase:'day'}};
  const ctx={indexedDB:first.indexedDB,URL,URLSearchParams,AbortSignal,setTimeout,clearTimeout,setInterval:()=>0,location:{href:'https://game.example/village/',search:''},window:{},Image:class{set src(value){assert.match(value,/^data:image\//);queueMicrotask(()=>this.onload())}},fetch:async()=>{throw Error('offline')},MutationObserver:class{observe(){}},document:{getElementById:id=>id==='playWorld'?world:id==='playShell'?shell:id==='game'?{classList:{contains:()=>phase==='night'}}:id.includes('BootStatus')?boot:null,querySelector:()=>world,addEventListener(){}}};
  vm.createContext(ctx);
  const text=fs.readFileSync(path,'utf8');
  if(path.startsWith('server-game')){
   vm.runInContext(text.slice(text.indexOf('function createVillageLocalCache('),text.indexOf('// V2.82 runtime:'))+';const GMWW_SERVER_BASE="https://game.example";this.start=restoreGMVillageLocal;this.apply=applyGMVillageScene;',ctx);
   await ctx.start();shell.dataset.phase='night';ctx.apply();
  }else{
   vm.runInContext(text+';this.bootPromise=localBoot;this.apply=apply;',ctx);await ctx.bootPromise;phase='night';ctx.apply();
  }
  assert.equal(boot.hidden,true);assert.equal(classes.has(path.startsWith('server')?'gmww-scene-awaiting':'scene-awaiting'),false);
  assert.match([...properties.values()][0],/data:image\/png/);
 });
}
test('public scene image bytes are readable from IPA file origin, including errors',async()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 const route=worker.slice(worker.indexOf('  const sceneImagePath='),worker.indexOf('  if(url.pathname==="/api/gm/village-scene"'));
 for(const status of [200,404]){
 const run=new Function('memberStore','Response','return async function(url,request,env){'+route+'}')(()=>({fetch:async()=>new Response('pixels',{status,headers:{'content-type':'image/png'}})}),Response);
 const response=await run(new URL('https://game.example/api/village-scene/image/day?revision=7'),new Request('https://game.example',{headers:{Origin:'null'}}),{});
 assert.equal(response.headers.get('access-control-allow-origin'),'*');
 assert.equal(response.headers.get('content-type'),'image/png');assert.equal(await response.text(),'pixels');assert.equal(response.status,status);
 }
});
