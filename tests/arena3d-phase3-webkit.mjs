// WebKit engine smoke at mobile viewport. This is NOT physical Safari on a real iPhone.
import assert from 'node:assert/strict';
import {webkit,devices} from 'playwright';
const base='https://gmww-arena3d-core-staging.williampham0702.workers.dev';
const browser=await webkit.launch({headless:true});
try{
  const ctx=await browser.newContext({...devices['iPhone 13'],locale:'vi-VN'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  await page.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:55000});
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===6,{timeout:40000});
  await page.waitForFunction(()=>Number(document.body.dataset.gmwwStageFps)>0,{timeout:45000});
  const six=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.equal(six.count,6);
  assert.equal(six.sky,'day');
  assert.equal(six.village,'coastal-day-night-v1');
  assert.ok(six.drawCalls>0&&six.drawCalls<=55,'instanced chibi budget');
  await page.locator('[data-fx="shield"]').click();
  assert.match(await page.locator('#log').innerText(),/Mẫu.*Bảo vệ/);
  await page.locator('#sample-daynight').click();
  assert.equal((await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).sky,'night');
  await page.locator('#sample-daynight').click();
  assert.equal((await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).sky,'day');
  await page.locator('#sample-cast').click();
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='standing',null,{timeout:7000});
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:10000});
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='seated',null,{timeout:12000});
  await page.locator('[data-roster="30"]').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===30,{timeout:30000});
  const thirty=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.equal(thirty.count,30);
  assert.ok(thirty.drawCalls<=55,'30 actors do not multiply GPU drawcalls');
  assert.equal(thirty.privateOverlayCount,0,'never expose GM-only visuals to a public observer');
  assert.ok(thirty.pixelRatio<=1.35);
  await page.screenshot({path:'/tmp/arena3d-phase3-webkit.png',fullPage:true});
  assert.deepEqual(errors,[],'No unhandled JS exception in WebKit');
  console.log('PASS WebKit iPhone-emulation Phase3',JSON.stringify({six,thirty,physicalIphone:false}));
}finally{
  await browser.close();
}
