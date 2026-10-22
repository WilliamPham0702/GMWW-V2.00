import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {webkit}=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/runner.js')('playwright'):require('playwright');
const browser=await webkit.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<!doctype html><body class="play-immersive"><main id="start"><div id="playWorld" style="position:relative;width:390px;height:844px"><div id="playPlayerRing" class="play-player-ring"></div></div></main>');
 await page.addStyleTag({path:'server-game/current/style.css'});
 // Demonstrate the original failure with the production load order before testing the fix.
 const oldRule=await page.addStyleTag({content:'.gmww-sv-stage,.gmww-sv-target{position:relative;isolation:isolate}'});
 await page.evaluate(()=>{const el=document.createElement('button');el.className='play-player-token gmww-sv-stage';document.getElementById('playPlayerRing').append(el)});
 assert.equal(await page.locator('.play-player-token').evaluate(el=>getComputedStyle(el).position),'relative','baseline must reproduce the original cascade defect');
 await oldRule.evaluate(el=>el.remove());
 await page.addStyleTag({path:'server-game/current/status-visuals.css'});
 await page.addScriptTag({path:'assets/village/village-layout.js'});
 for(let n=6;n<=30;n++)for(const shape of ['circle','diamond','rectangle']){
  const result=await page.evaluate(({n,shape})=>{
   const ring=document.getElementById('playPlayerRing');ring.replaceChildren();
   const box=ring.getBoundingClientRect(),layout=GMWW_VILLAGE_LAYOUT;
   const points=layout.positions(n,shape).map(p=>layout.toScreen(p,box.width,box.height));
   const tokens=points.map(p=>{const el=document.createElement('button');el.className='play-player-token gmww-sv-stage';el.style.left=p.x+'%';el.style.top=p.y+'%';el.innerHTML='<div class="play-player-avatar"></div>';ring.append(el);return el});
   return tokens.map((el,i)=>({position:getComputedStyle(el).position,errorX:Math.abs(el.offsetLeft-box.width*points[i].x/100),errorY:Math.abs(el.offsetTop-box.height*points[i].y/100)}));
  },{n,shape});
  assert.ok(result.every(p=>p.position==='absolute'&&p.errorX<=1&&p.errorY<=1),`${n} ${shape}: status CSS displaced seat anchors: ${JSON.stringify(result)}`);
 }
 console.log('PASS: WebKit rendered seat anchors, 6–30 players, circle/diamond/rectangle, production CSS cascade');
}finally{await browser.close()}
