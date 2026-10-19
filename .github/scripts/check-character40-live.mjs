import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787';
for(const [name,browserType] of [['webkit',webkit],['chromium',chromium]]){
 const browser=await browserType.launch({headless:false}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error(name+' pageerror: '+e.stack)});
 await page.setContent('<!doctype html><p>Native frame scheduling control</p>');
 await page.evaluate(()=>{window.__nativeFrames=0;const frame=()=>{window.__nativeFrames++;requestAnimationFrame(frame)};requestAnimationFrame(frame)});
 await page.waitForTimeout(1000);
 const nativeFrames=await page.evaluate(()=>window.__nativeFrames);console.log(name+' blank page native frames: '+nativeFrames);
 assert.ok(nativeFrames>1,name+' browser environment must deliver native animation frames before testing product');
 await page.goto(base+'/village/?embed=1');
 await page.evaluate(async()=>{
  const renderer=await import('/village/character40-renderer.mjs?v=c40-1');
  const catalog=await (await fetch('/api/game-characters')).json();if(catalog.count!==40)throw Error('Live API must expose 40 characters');
  const host=document.createElement('div');host.style.cssText='width:160px;height:200px;background:white;position:fixed;top:0;left:0;z-index:10000';document.body.append(host);
  window.__c40Test={renderer,host,root:null,probe:0};requestAnimationFrame(()=>window.__c40Test.probe++);
 });
 // Run rendering between inspector calls instead of holding the suite inside one evaluation.
 await page.waitForTimeout(1000);
 console.log(name+' external rAF probe: '+await page.evaluate(()=>JSON.stringify({probe:window.__c40Test.probe,hidden:document.hidden})));
 const command=async c=>page.evaluate(c=>{const t=window.__c40Test;if(!t.renderer.updateCharacterRenderer(t.host,c))throw Error('Update failed');},c);
 const picture=async()=>page.evaluate(()=>window.__c40Test.root.firstElementChild.toDataURL());
 const diagnostic=async()=>page.evaluate(()=>{const r=window.__c40Test.root;return JSON.stringify({dataset:r.dataset,state:r._gmwwMotion,hidden:document.hidden,connected:r.isConnected});});
 let checked=0;
 for(let n=1;n<=42;n++){
  const id='character-'+String(n).padStart(2,'0');
  await page.evaluate(id=>{const t=window.__c40Test;t.root=t.renderer.mountCharacterRenderer(t.host,{characterId:id,command:{state:'idle',motion:'idle',facing:'left'}});},id);
  await page.waitForFunction(()=>window.__c40Test.root.dataset.loaded==='true',{},{polling:100,timeout:10000});
  for(const [state,motion] of [['idle','idle'],['walking','walk'],['running','run'],['idle','turn']]){
   await command({characterId:id,state,motion,facing:'left'});const pictures=new Set();
   for(let k=0;k<6;k++){pictures.add(await picture());await page.waitForTimeout(100);}
   assert.ok(pictures.size>1,`${name} no real motion ${id} ${motion}: ${await diagnostic()} errors=${JSON.stringify(errors)}`);checked++;
  }
  await command({characterId:id,state:'walking',motion:'walk',facing:'right'});await page.waitForTimeout(650);
  await command({characterId:id,state:'walking',motion:'walk',facing:'left'});await page.waitForTimeout(70);
  assert.equal(await page.evaluate(()=>window.__c40Test.root.dataset.action),'turn',id+' direction change must play Turn');
  await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>window.__c40Test.root.dataset.action),'walk',id+' Turn must resume Walk');
  await page.evaluate(()=>window.__c40Test.host.style.setProperty('--gmww-character-scale','1.5'));
  assert.ok((await page.evaluate(()=>getComputedStyle(window.__c40Test.root.firstElementChild).transform)).includes('1.5'),id+' saved scale');
  await page.evaluate(()=>window.__c40Test.host.style.setProperty('--gmww-character-scale','1'));
  if(id==='character-15'){
   await command({characterId:id,state:'idle',motion:'idle',facing:'left',paused:true});await page.waitForTimeout(80);const frozen=await picture();await page.waitForTimeout(600);assert.equal(await picture(),frozen,'dead actor must stop');
   await command({characterId:id,state:'idle',motion:'idle',facing:'left',paused:false});const living=new Set();for(let k=0;k<6;k++){living.add(await picture());await page.waitForTimeout(150);}assert.ok(living.size>1,'revived actor must resume');
  }
 }
 assert.equal(checked,168);assert.deepEqual(errors,[]);await browser.close();console.log(name+': live adapter passed 42 identities × 4 actions');
}
