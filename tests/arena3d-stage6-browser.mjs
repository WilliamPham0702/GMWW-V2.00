// STAGING-only iPhone-size QA. No Production endpoint, no real iPhone FPS claims.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://gmww-arena3d-core-staging.williampham0702.workers.dev';
assert.match(new URL(base).host,/^gmww-arena3d-core-staging\.[^.]+\.workers\.dev$/);
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().artVersion==='gmww.arena.art.sea-chibi.6',null,{timeout:35000});
  const rows=[];
  for(const n of [6,12,20,30]){
    await page.locator('[data-roster="'+n+'"]').click();
    await page.waitForFunction(v=>window.__GMWW_ARENA_STAGE_READONLY?.().count===v,n,{timeout:30000});
    await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().fps>0,null,{timeout:35000});
    const data=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
    assert.equal(data.drawBudget,37);
    assert.ok(data.drawCalls>0&&data.drawCalls<=57);
    rows.push({players:n,drawCalls:data.drawCalls,softwareFps:data.fps});
  }
  await page.locator('[data-gallery="1"]').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().galleryPage===1);
  assert.match(await page.locator('#log').innerText(),/11–40/);
  await page.screenshot({path:'/tmp/arena3d-stage6-gallery-390.png'});
  for(const [kind,motif] of Object.entries({
    shield:'pearl-shell-ward',inspect:'star-oracle',heal:'sea-lotus',
    attack:'lunar-wave',vote:'golden-sigil'
  })){
    await page.locator('[data-fx="'+kind+'"]').click();
    await page.waitForFunction(m=>window.__GMWW_ARENA_STAGE_READONLY?.().ritualMotif===m,motif,{timeout:9000});
    await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:10000});
    // The "casting" signal is synchronous; WebGL VFX appears on the next frame.
    await page.waitForFunction(k=>window.__GMWW_ARENA_STAGE_READONLY?.().spellVfx===k,
      kind,{timeout:9000});
  }
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='returning',null,{timeout:12000});
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='seated',null,{timeout:12000});
  await page.screenshot({path:'/tmp/arena3d-stage6-ritual-390.png'});
  assert.deepEqual(errors,[],'WebGL no uncaught JS exceptions');
  const player=await page.request.get(base+'/join/NOTAREALROOM');
  assert.ok([200,404].includes(player.status()),'isolated Player Web path remains reachable');
  console.log('ARENA_STAGE6_BROWSER_PASS',JSON.stringify({rows,art:'40-chibi',rituals:5,
    scene:'staging-only',physicalIphone:false,playerWebStatus:player.status()}));
}finally{await browser.close()}
