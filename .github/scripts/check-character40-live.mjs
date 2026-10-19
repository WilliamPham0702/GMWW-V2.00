import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787';
for(const [name,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch(),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/village/?embed=1');
 const results=await page.evaluate(async()=>{
  const renderer=await import('/village/character40-renderer.mjs?v=c40-1');
  const catalog=await (await fetch('/api/game-characters')).json();if(catalog.count!==40)throw Error('Live API must expose 40 characters');
  const host=document.createElement('div');host.style.cssText='width:160px;height:200px;background:white;position:fixed;top:0;left:0;z-index:10000';document.body.append(host);
  const rows=[];const pause=ms=>new Promise(r=>setTimeout(r,ms));
  for(let n=1;n<=42;n++){
   const id='character-'+String(n).padStart(2,'0');const root=renderer.mountCharacterRenderer(host,{characterId:id,command:{state:'idle',motion:'idle',facing:'left'}});
   for(let attempts=0;attempts<100&&root.dataset.loaded!=='true';attempts++)await pause(50);
   if(root.dataset.loaded!=='true')throw Error('Missing atlas '+id);
   for(const [state,motion] of [['idle','idle'],['walking','walk'],['running','run'],['idle','turn']]){
    if(!renderer.updateCharacterRenderer(host,{characterId:id,state,motion,facing:'left'}))throw Error('Update failed '+id);
    const pictures=new Set();for(let k=0;k<6;k++){pictures.add(root.firstElementChild.toDataURL());await pause(100);}
    if(pictures.size<2)throw Error('No real motion '+id+' '+motion);rows.push(id+':'+motion);
   }
   renderer.updateCharacterRenderer(host,{characterId:id,state:'walking',motion:'walk',facing:'right'});
   await pause(650);
   renderer.updateCharacterRenderer(host,{characterId:id,state:'walking',motion:'walk',facing:'left'});
   await pause(70);if(root.dataset.action!=='turn')throw Error('Direction change bypassed Turn '+id);
   await pause(650);if(root.dataset.action!=='walk')throw Error('Turn did not resume Walk '+id);
   host.style.setProperty('--gmww-character-scale','1.5');
   if(!getComputedStyle(root.firstElementChild).transform.includes('1.5'))throw Error('Saved scale lost '+id);
   host.style.setProperty('--gmww-character-scale','1');
  }
  return rows.length;
 });assert.equal(results,168);assert.deepEqual(errors,[]);await browser.close();console.log(name+': live adapter passed 42 identities × 4 actions');
}
