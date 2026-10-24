// Headless Chromium smoke only. NOT physical iPhone/Safari performance evidence.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=18779;
const host='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','.arena3d-preview-assets'],{stdio:'ignore'});
let browser;
try{
  let connected=false;
  for(let i=0;i<50;i++){
    try{const r=await fetch(host+'/village/arena-3d/index.html');if(r.ok){connected=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  assert.ok(connected,'local static Arena page must be accessible');
  browser=await chromium.launch({
    headless:true,
    executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
    args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']
  });
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  for(const count of [6,12,20,30]){
    await page.goto(host+'/village/arena-3d/index.html?count='+count,{waitUntil:'load',timeout:30000});
    await page.waitForFunction(n=>document.body.dataset.gmwwArenaReady==='true'&&Number(document.body.dataset.gmwwArenaCount)===n,count,{timeout:30000});
    await page.waitForFunction(()=>Number(document.body.dataset.gmwwArenaFps)>0,null,{timeout:30000});
    const result=await page.evaluate(()=>window.__GMWW_ARENA_DIAGNOSTICS());
    assert.equal(result.actorCount,count,'rendered actor count');
    assert.ok(result.fps>0,'frames render');
    assert.ok(result.drawcalls>0,'actual 3D draw calls');
    console.log('Arena 3D Chromium synthetic '+count+' players:',JSON.stringify(result));
  }
  // Interact with real canvas / UI on the simulated mobile viewport.
  await page.locator('[data-count="12"]').click();
  await page.waitForFunction(()=>Number(document.body.dataset.gmwwArenaCount)===12);
  await page.locator('#night').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.gmwwArenaTime),'night');
  await page.locator('#day').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.gmwwArenaTime),'day');
  await page.locator('#effect-protect').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.gmwwArenaEvent),'protect');
  await page.locator('#effect-vote').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.gmwwArenaEvent),'vote');
  await page.locator('#effect-reset').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.gmwwArenaEvent),'none');
  const before=await page.evaluate(()=>window.__GMWW_ARENA_DIAGNOSTICS());
  const point=before.firstActorPoint;
  assert.ok(point&&Number.isFinite(point.x)&&Number.isFinite(point.y),'3D projected actor screen coordinates');
  await page.mouse.click(point.x,point.y);
  const rotated=await page.evaluate(()=>window.__GMWW_ARENA_DIAGNOSTICS());
  assert.ok(Math.abs(rotated.selectedYaw-before.selectedYaw)>0.1,'touch/click character rotates 3D actor');
  const box=await page.locator('canvas').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(box.x+box.width/2+70,box.y+box.height/2+22,{steps:5});await page.mouse.up();
  const after=await page.evaluate(()=>window.__GMWW_ARENA_DIAGNOSTICS());
  assert.ok(Math.abs(after.azimuth-before.azimuth)>0.05,'drag rotates camera');
  await page.screenshot({path:'/tmp/gmww-arena3d-chromium-390.png'});
  assert.deepEqual(errors,[],'browser script has no unhandled page errors');
  console.log('PASS: Arena 3D Chromium 390px preview: 6–30 actors, WebGL FPS, scene, effects, touch rotation, camera orbit.');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
