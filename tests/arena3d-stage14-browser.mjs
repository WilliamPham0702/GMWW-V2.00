// Stage 14 isolated research: browser smoke + synthetic role-specific VFX test against its dedicated research Worker, NEVER Production or accepted Stage 6.
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
const base='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
assert.equal(new URL(base).hostname,'gmww-arena3d-stage14-staging.williampham0702.workers.dev');
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
  await page.waitForFunction(()=>document.body.dataset.gmwwStage10==='gmww.arena.role-animation.10'&&
    window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null,{timeout:45000});
  // GĐ23: lock Smooth to measure real crowd LOD, not auto-eco (headless
  // software WebGL may independently decide to save power).
  await page.getByRole('tab',{name:'Hiệu năng'}).click();
  await page.getByRole('button',{name:'Mượt',exact:true}).click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().autoQualityEnabled===false);
  const roster=[];
  for(const n of [6,12,20,30]){
   if(n!==6)await page.locator('[data-roster="'+n+'"]').click();
   await page.waitForFunction(n=>{
     const state=window.__GMWW_ARENA_STAGE_READONLY?.();
     return state?.count===n&&state.crowdTier===(n>=24?'crowd30':n>=20?'crowd20':'full');
   },n,{timeout:30000});
   await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().fps>0,null,{timeout:45000});
   if(n>=20){
     const oldCalls=roster.at(-1).drawCalls;
     await page.waitForFunction(oldCalls=>
       window.__GMWW_ARENA_STAGE_READONLY?.().drawCalls<oldCalls,
       oldCalls,{timeout:20000});
   }
   const state=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
   assert.equal(state.artVersion,'gmww.arena.art.sea-chibi.6');
   assert.equal(await page.locator('body').getAttribute('data-gmww-stage10'),'gmww.arena.role-animation.10');
   assert.ok(state.drawCalls>0&&state.drawCalls<=57,'30 actors share the expected draw-call budget');
   assert.ok(state.pixelRatio<=1.75,'Stage7 mobile pixel-ratio budget');
   if(n===20)assert.ok(state.pixelRatio<=1,'20-player GM GPU crowd budget');
   if(n>=24)assert.ok(state.pixelRatio<=.85,'24–30-player GM GPU crowd budget');
   assert.equal(state.privateOverlayCount,0,'synthetic demo must not show GM-private effects');
   roster.push({players:n,drawCalls:state.drawCalls,fps:state.fps,
     pixelRatio:state.pixelRatio,crowdTier:state.crowdTier});
  }
  // Stage23: with fixed Smooth quality, GPU sees fewer mesh calls at 20/30.
  assert.ok(roster[2].drawCalls<roster[1].drawCalls,
    '20 Character must have fewer draw calls than 12');
  assert.ok(roster[3].drawCalls<roster[2].drawCalls,
    '30 Character must have fewer draw calls than 20');

  // GĐ18: verify a real WebGL scene loses draw calls in eco mode, not
  // merely a badge claiming lower power. Keep Character/seat counts intact.
  await page.getByRole('tab',{name:'Hiệu năng'}).click();
  await page.getByRole('button',{name:'Mượt',exact:true}).click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().lowPower===false,null,{timeout:15000});
  const qualityDraws=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY().drawCalls);
  await page.getByRole('button',{name:'Tiết kiệm pin'}).click();
  await page.waitForFunction(full=>{
    const state=window.__GMWW_ARENA_STAGE_READONLY?.();
    return state?.lowPower===true&&state.paintTargetHz===8&&state.drawCalls<full;
  },qualityDraws,{timeout:30000});
  const eco=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.equal(eco.count,30);
  assert.ok(eco.drawCalls<qualityDraws,'eco mode must reduce actual GPU draw calls');
  await page.getByRole('button',{name:'Mượt',exact:true}).click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().lowPower===false,null,{timeout:15000});
  // GĐ19–21: Browser telemetry is local and safe; don't upload tokens/IDs.
  await page.locator('#arena-mobile-diagnostics').evaluate(el=>{el.open=true});
  await page.locator('#arena-diag-refresh').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().mobileQa?.sampleCount>0,
    null,{timeout:12000});
  const diag=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY().mobileQa);
  assert.ok(diag.paintCpuP95Ms>=0,'CPU render stats collected on device');
  assert.ok(diag.drawCalls>0,'GPU draw-call statistics collected');
  assert.equal(diag.thermalCelsius,null,'Safari thermals are not exposed by JS');
  const trend=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY().sessionTrend);
  assert.equal(trend.windowCapacity,30,'GĐ25 local session QA stays bounded');
  assert.ok(trend.storedWindows<=30);
  assert.equal(trend.maxCharacters,30);
  assert.doesNotMatch(JSON.stringify(diag),/gmToken|roleId|artifactId|loginId|roomCode/);
  assert.equal(await page.locator('#arena-diag-copy').count(),1);
  await page.locator('#sample-cast').click();
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:12000});
  await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='seated',null,{timeout:18000});
  assert.equal(await page.locator('#arena-audio-file').count(),1);
  assert.equal(await page.locator('#arena-audio-action').count(),1);
  // Upload a real (test) file into GM-local browser memory; never to Worker.
  await page.locator('#arena-audio-file').setInputFiles({
    name:'arena-preview.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('ID3\\0ARENA_TEST_AUDIO','utf8')
  });
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().loadedVoiceFiles===1,null,{timeout:3000});
  await page.locator('#arena-audio').click();
  assert.equal((await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).soundEnabled,true);
  // Real 3D draw checks: these cues are strictly synthetic, never live Core/GM secrets.
  for(const [role,visible] of [['soi-tuyet','previewWolfHeads'],['phu-thuy','previewImpactRings'],['tien-tri-hao-quang','previewWand'],['bao-ve','previewShieldDomes']]){
    await page.locator('[data-role-fx="'+role+'"]').click();
    await page.waitForFunction(()=>document.body.dataset.gmwwSyntheticCasting==='casting',null,{timeout:6000});
    await page.waitForFunction(key=>Boolean(window.__GMWW_ARENA_STAGE_READONLY?.()[key]),visible,{timeout:4500});
    assert.equal(await page.locator('body').getAttribute('data-gmww-stage10-projectile'),null,'never publish GM-only role animation metadata');
    assert.ok((await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).soundPlays>=1);
  }
  // GĐ24/25 short live stress: repeated seat rosters preserve instancing
  // and LOD without WebGL loss or public exposure of private caster metadata.
  for(const n of [12,30,6,20,30]){
    await page.locator('[data-roster="'+n+'"]').click();
    await page.waitForFunction(n=>{
      const state=window.__GMWW_ARENA_STAGE_READONLY?.();
      return state?.count===n&&state.crowdTier===(n>=24?'crowd30':n>=20?'crowd20':'full');
    },n,{timeout:30000});
  }
  const after=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.equal(after.count,30);
  assert.equal(after.crowdTier,'crowd30');
  assert.equal(after.webglLost,false);
  assert.ok(after.sessionTrend.storedWindows<=30);
  assert.equal(after.privateOverlayCount,0);
  assert.deepEqual(errors,[],kind+' uncaught browser errors');
  console.log('STAGE14_'+kind.toUpperCase()+'_PASS',JSON.stringify({roster,physicalIphone:false,staging:base}));
  await ctx.close();
 }finally{await browser.close()}
}
await check(chromium,'chromium');
await check(webkit,'webkit');
