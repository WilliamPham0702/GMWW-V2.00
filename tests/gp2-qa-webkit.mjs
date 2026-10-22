import assert from 'node:assert/strict';
import {webkit} from 'playwright';
// GP2 QA only; the live player entry and DO room state are never modified.
const origin=process.env.GMWW_TEST_URL||'http://127.0.0.1:8787';
const browser=await webkit.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const errors=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url())});
 const response=await page.goto(origin+'/village/gp2-qa.html',{waitUntil:'domcontentloaded',timeout:40000});
 assert.equal(response?.status(),200,'GP2 QA page must be separately reachable from the Worker');
 await page.waitForFunction(()=>window.GMWW_GP2_QA?.getState()?.renderedActors===30,{timeout:15000});
 const before=await page.evaluate(()=>window.GMWW_GP2_QA.getState());
 assert.equal(before.seats,30);assert.equal(before.collisions,0);assert.equal(before.scale,1);
 assert.equal(before.renderedActors,30);
 assert.equal(await page.locator('#actors .actor').count(),30);
 assert.equal(await page.locator('#actors [data-character-renderer]').count(),30,
 'Must use 30 real game atlas renderers, not placeholder colored boxes');
 const sizes=await page.locator('.actor .portrait').evaluateAll(nodes=>nodes.map(el=>{
  const r=el.getBoundingClientRect();return {w:r.width,h:r.height};
 }));
 assert.ok(sizes.every(s=>s.w===56&&s.h===74),'Character sizes must stay native: '+JSON.stringify(sizes));
 const transform=await page.locator('#world').evaluate(el=>getComputedStyle(el).transform);
 // Browser-issued pointer events have active pointer IDs; synthetic DOM events
 // cannot call setPointerCapture and would produce a false failure.
 await page.mouse.move(195,696);
 await page.mouse.down();
 await page.mouse.move(260,696,{steps:6});
 await page.mouse.up();
 const afterTransform=await page.locator('#world').evaluate(el=>getComputedStyle(el).transform);
 assert.notEqual(transform,afterTransform,'Touch pan must move world & actors together');
 await page.locator('#night').click();
 assert.equal(await page.locator('#world').getAttribute('data-phase'),'night');
 await page.locator('#day').click();
 assert.equal(await page.locator('#world').getAttribute('data-phase'),'day');
 await page.locator('#center').click();
 assert.equal((await page.evaluate(()=>window.GMWW_GP2_QA.getState())).scale,1);
 await page.locator('.actor[data-seat-id="15"]').click({force:true});
 assert.equal((await page.evaluate(()=>window.GMWW_GP2_QA.getState())).selected,15);
 assert.deepEqual(writes,[],'QA must never POST any data to the server');
 assert.deepEqual(errors,[],'QA page console errors: '+errors.join('; '));
 await page.screenshot({path:'/tmp/gmww-gp2-qa-iphone-30-atlas.png'});
 console.log('PASS GP2 local iPhone WebKit: 30 atlas Character, 56×74, pan, Day/Night, select, no writes');
}finally{await browser.close()}
