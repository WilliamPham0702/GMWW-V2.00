// Stage6 design-system acceptance on isolated Arena 3D STAGING.
// GPU software statistics are diagnostic only, NOT Safari physical iPhone FPS.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const host='https://gmww-arena3d-core-staging.williampham0702.workers.dev';
assert.match(new URL(host).host,/^gmww-arena3d-core-staging\.[^.]+\.workers\.dev$/);
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:50000});
  const stat=()=>page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  const readings=[];
  for(const n of [6,12,20,30]){
    await page.locator('[data-roster="'+n+'"]').click();
    await page.waitForFunction(n=>window.__GMWW_ARENA_STAGE_READONLY?.().count===n,n,{timeout:30000});
    await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().fps>0,null,{timeout:40000});
    const d=await stat();
    assert.equal(d.artVersion,'arena-ocean-chibi-stage6-v1');
    assert.ok(d.drawCalls>0&&d.drawCalls<=55);
    assert.ok(d.drawBudget<=45);
    readings.push({character:n,fpsSoftwareGPU:d.fps,drawCalls:d.drawCalls});
  }
  await page.locator('#art-collection').click();
  assert.match(await page.locator('#art-collection').innerText(),/11–40/);
  assert.equal((await stat()).count,30);
  await page.locator('#art-collection').click();
  assert.match(await page.locator('#art-collection').innerText(),/01–30/);
  // All five sample effects are available without spoofing Core secret roles.
  for(const kind of ['shield','inspect','heal','attack']){
    await page.locator('[data-fx="'+kind+'"]').click();
    assert.match(await page.locator('#log').innerText(),/Mẫu/);
  }
  await page.locator('#sample-cast').click();
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:12000});
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='seated',null,{timeout:16000});
  await page.screenshot({path:'/tmp/arena3d-stage6-iphone390.png'});
  assert.deepEqual(errors,[]);
  console.log('STAGE6_ART_BROWSER_PASS',JSON.stringify({readings,physicalIphone:false,art:'stage6'}));
}finally{await browser.close()}
