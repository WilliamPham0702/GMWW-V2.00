// Stage 9 only: smoke test against its dedicated research Worker, NEVER Production or accepted Stage 6.
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
const base='https://gmww-arena3d-stage9-staging.williampham0702.workers.dev';
assert.equal(new URL(base).hostname,'gmww-arena3d-stage9-staging.williampham0702.workers.dev');
async function check(engine,kind){
 const browser=kind==='chromium'
  ?await engine.launch({headless:true,executablePath:'/usr/bin/google-chrome',
   args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']})
  :await engine.launch({headless:true});
 try{
  const ctx=await browser.newContext(kind==='webkit'?{...devices['iPhone 13'],locale:'vi-VN'}:
   {viewport:{width:390,height:844},deviceScaleFactor:1,locale:'vi-VN'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  const res=await page.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(res.status(),200);
  await page.waitForFunction(()=>document.body.dataset.gmwwStage9==='gmww.arena.full-match-sync.9'&&
    window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null,{timeout:45000});
  const roster=[];
  for(const n of [6,12,20,30]){
   if(n!==6)await page.locator('[data-roster="'+n+'"]').click();
   await page.waitForFunction(n=>window.__GMWW_ARENA_STAGE_READONLY?.().count===n,n,{timeout:30000});
   await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().fps>0,null,{timeout:45000});
   const state=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
   assert.equal(state.artVersion,'gmww.arena.art.sea-chibi.6');
   assert.equal(await page.locator('body').getAttribute('data-gmww-stage9'),'gmww.arena.full-match-sync.9');
   assert.ok(state.drawCalls>0&&state.drawCalls<=57,'30 actors share the expected draw-call budget');
   assert.ok(state.pixelRatio<=1.75,'Stage7 mobile pixel-ratio budget');
   assert.equal(state.privateOverlayCount,0,'synthetic demo must not show GM-private effects');
   roster.push({players:n,drawCalls:state.drawCalls,fps:state.fps,pixelRatio:state.pixelRatio});
  }
  await page.locator('#sample-cast').click();
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:12000});
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='seated',null,{timeout:18000});
  assert.deepEqual(errors,[],kind+' uncaught browser errors');
  console.log('STAGE9_'+kind.toUpperCase()+'_PASS',JSON.stringify({roster,physicalIphone:false,staging:base}));
  await ctx.close();
 }finally{await browser.close()}
}
await check(chromium,'chromium');
await check(webkit,'webkit');
