// Browser proof: official Core GM state adapter on an isolated QA Worker.
// ?coreMode=live is STAGING-only; never connects Production accounts or rooms.
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
const origin='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=name==='chromium'?
  await engine.launch({headless:true,executablePath:'/usr/bin/google-chrome',
   args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']}):
  await engine.launch({headless:true});
 const context=await browser.newContext(name==='webkit'?
  {...devices['iPhone 13'],locale:'vi-VN'}:{viewport:{width:390,height:844},locale:'vi-VN'});
 try{
  const response=await context.request.post(origin+'/api/rooms',{
   data:{roomName:'Arena GM Core production-mode QA',roomMode:'online',seatCount:6},
   timeout:45000});
  assert.equal(response.status(),201);
  const body=await response.json();
  assert.match(String(body.roomCode||''),/^[A-Z0-9]{4,12}$/);
  assert.equal(typeof body.gmToken,'string');
  const anonymous=await context.request.get(origin+'/api/gm/rooms/'+body.roomCode);
  assert.equal(anonymous.status(),401);
  const page=await context.newPage(),errors=[],paths=[];
  page.on('pageerror',e=>errors.push(String(e.message)));
  page.on('request',r=>paths.push(new URL(r.url()).pathname));
  const loaded=await page.goto(origin+'/village/arena-3d/live.html?room='+body.roomCode+'&coreMode=live',
   {waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(loaded.status(),200);
  // attach() writes the room input before its public HTTP snapshot completes.
  // Wait for the authoritative initial Core connection, or its eventual
  // success notice can overwrite the intentionally denied GM-token notice.
  await page.waitForFunction(c=>
   document.querySelector('#room')?.value===c&&
   document.querySelector('#log')?.textContent?.includes('Đã kết nối phòng '+c),
   body.roomCode,{timeout:45000});
  for(const id of ['seed','deal','sample-vfx','gallery-toolbar']){
   assert.equal(await page.locator('#'+id).isVisible(),false,id+' must be hidden for real-room Core mode');
  }
  assert.equal(await page.locator('header h1').textContent(),'GMWW Arena 3D');
  await page.locator('#gm-key').fill('invalid-invalid-invalid-key');
  await page.locator('#gm-restore').click();
  await page.locator('#log').getByText(/401|không hợp lệ/).waitFor({timeout:20000}).catch(async()=>{
    const value=await page.locator('#log').textContent();
    assert.match(value,/401|không hợp lệ/);
  });
  assert.equal(await page.locator('#gm-copy').isDisabled(),true);
  await page.locator('#gm-key').fill(body.gmToken);
  await page.locator('#gm-restore').click();
  await page.waitForFunction(()=>document.querySelector('#gm-copy')?.disabled===false,{timeout:20000});
  assert.equal(await page.locator('#gm-key').inputValue(),'');
  assert.equal(paths.some(x=>x.includes('/api/arena-staging/')),false);
  assert.deepEqual(errors,[]);
  // Exercise the same-origin authenticated GM iframe bridge in a real browser
  // against the isolated STAGING Core. No Production room/credentials are used.
  await page.close();
  const host=await context.newPage();
  const hostResponse=await host.goto(origin+'/village/arena-3d/ipa.html',
    {waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(hostResponse.status(),200);
  await host.evaluate(({roomCode,gmToken})=>{
    const iframe=document.createElement('iframe');iframe.id='verified-arena-gm';
    window.addEventListener('message',event=>{
      if(event.origin!==location.origin||event.source!==iframe.contentWindow||
         event.data?.kind!=='gmww-arena3d-ready')return;
      iframe.contentWindow.postMessage(
        {kind:'gmww-arena3d-gm-context',roomCode,gmToken},location.origin);
    });
    document.body.replaceChildren(iframe);
    iframe.src='/village/arena-3d/live.html?room='+encodeURIComponent(roomCode)+'&coreMode=live';
  },{roomCode:body.roomCode,gmToken:body.gmToken});
  await host.waitForFunction(()=>{
    const frame=document.querySelector('#verified-arena-gm');
    return frame?.contentWindow?.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='authorized';
  },null,{timeout:60000});
  const handshake=await host.evaluate(()=>{
    const readonly=document.querySelector('#verified-arena-gm')?.contentWindow?.__GMWW_ARENA_STAGE_READONLY?.();
    return {room:readonly?.room,gmConsole:readonly?.gmConsole};
  });
  assert.equal(handshake.room,body.roomCode);
  assert.equal(handshake.gmConsole,'authorized');
  console.log('ARENA3D_GM_LIVE_CORE_'+name.toUpperCase()+'_PASS',JSON.stringify({
   roomCode:body.roomCode,verifiedGM:true,wrongTokenDenied:true,fakeRolesHidden:true,
   production:false,physicalIphone:false}));
 }finally{await context.close();await browser.close()}
}
