// Arena Stage 5 browser acceptance. STAGING host only; never contacts Production.
// Chromium software GPU FPS is diagnostic, not measured iPhone FPS.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base='https://gmww-arena3d-core-staging.williampham0702.workers.dev';
assert.match(new URL(base).hostname,/^gmww-arena3d-core-staging\.[^.]+\.workers\.dev$/);
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:55000});
  const stats=()=>page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  const samples=[];
  for(const n of [6,12,20,30]){
    await page.locator('[data-roster="'+n+'"]').click();
    await page.waitForFunction(num=>window.__GMWW_ARENA_STAGE_READONLY?.().count===num,n,{timeout:40000});
    await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().fps>0,null,{timeout:40000});
    const data=await stats();
    assert.ok(data.drawCalls>0&&data.drawCalls<=55,'fixed instanced scene budget at '+n);
    assert.equal(data.autoQualityEnabled,true);
    samples.push({characters:n,softwareFps:data.fps,drawCalls:data.drawCalls,pixelRatio:data.pixelRatio});
    // Stand -> step out -> cast -> return -> sit works for each roster size.
    await page.locator('#sample-cast').click();
    await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='standing',null,{timeout:10000});
    await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:12000});
    await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='returning',null,{timeout:12000});
    await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='seated',null,{timeout:12000});
  }
  await page.locator('#quality-auto').click();
  assert.equal((await stats()).autoQualityEnabled,false);
  await page.locator('#quality-auto').click();
  assert.equal((await stats()).autoQualityEnabled,true);
  const room30=readFileSync('/tmp/gmww-arena3d-stage-room30.txt','utf8').trim();
  await page.goto(base+'/village/arena-3d/live.html?room='+room30,{waitUntil:'domcontentloaded',timeout:55000});
  await page.waitForFunction(code=>window.__GMWW_ARENA_STAGE_READONLY?.().room===code &&
    window.__GMWW_ARENA_STAGE_READONLY?.().count===30,room30,{timeout:45000});
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().connected==='connected',null,{timeout:45000});
  const before=await stats();
  await page.locator('#refresh').click();
  await page.waitForTimeout(1600);
  const after=await stats();
  assert.equal(after.sceneRebuilds,before.sceneRebuilds,'identical Core snapshot must not re-create actors');
  assert.equal(after.count,30);
  assert.equal(after.privateOverlayCount,0);
  const player=await page.request.get(base+'/join/'+room30);
  assert.equal(player.status(),200,'Player Web shares the isolated STAGING host and room');
  assert.deepEqual(errors,[],'no browser page errors');
  await page.screenshot({path:'/tmp/arena3d-stage5-30-iphone390.png'});
  console.log('STAGE5_BROWSER_PASS',JSON.stringify({samples,room30,sceneRebuilds:after.sceneRebuilds,
    cachedOnRefresh:true,playerWebHttp:player.status(),physicalIphone:false}));
}finally{await browser.close()}
