// Arena 3D Player Web smoke: same-isolated Worker, public-only 3D scene,
// secret cards remain inside existing Player Web iframe. Never use Production.
import assert from 'node:assert/strict';
import {chromium,webkit,devices} from 'playwright';
const base='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
assert.equal(new URL(base).hostname,'gmww-arena3d-stage14-staging.williampham0702.workers.dev');
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=name==='chromium'
  ?await engine.launch({headless:true,executablePath:'/usr/bin/google-chrome',
    args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']})
  :await engine.launch({headless:true});
 const context=await browser.newContext(name==='webkit'?
  {...devices['iPhone 13'],locale:'vi-VN'}:
  {viewport:{width:390,height:844},deviceScaleFactor:1,locale:'vi-VN'});
 try{
  const response=await context.request.post(base+'/api/rooms',{
    data:{roomName:'Arena 3D Player E2E',roomMode:'online',seatCount:6,seatMoveMode:'instant'},
    timeout:45000});
  assert.equal(response.status(),201,'POST /api/rooms tạo phòng Core mới trả 201 Created');
  const created=await response.json(),roomCode=String(created.roomCode||'');
  assert.match(roomCode,/^[A-Z0-9]{4,12}$/);
  const page=await context.newPage(),pageErrors=[],unsafeRequests=[];
  page.on('pageerror',e=>pageErrors.push(String(e.message)));
  page.on('request',r=>{
   const path=new URL(r.url()).pathname;
   if(path.startsWith('/api/gm/')||path.includes('/gm-visuals'))unsafeRequests.push(path);
  });
  const pageResponse=await page.goto(base+'/village/arena-3d/player.html?room='+roomCode,
   {waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(pageResponse.status(),200);
  await page.waitForFunction(code=>window.__GMWW_ARENA_PLAYER_READONLY?.().room===code,
   roomCode,{timeout:45000});
  assert.equal((await page.evaluate(()=>window.__GMWW_ARENA_PLAYER_READONLY())).count,0);
  assert.equal(await page.locator('#player-core').getAttribute('src'),null);
  await page.locator('#open-card').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_PLAYER_READONLY?.().cardOpen===true&&
   window.__GMWW_ARENA_PLAYER_READONLY?.().renderPaused===true);
  const before=await page.evaluate(()=>window.__GMWW_ARENA_PLAYER_READONLY().paintFrames);
  await page.waitForTimeout(280);
  assert.equal((await page.evaluate(()=>window.__GMWW_ARENA_PLAYER_READONLY())).paintFrames,before,
   'WebGL must not paint under the Core role-card iframe');
  const src=await page.locator('#player-core').getAttribute('src');
  assert.equal(src,'/join/'+roomCode);
  await page.locator('#close-card').click();
  await page.waitForFunction(n=>window.__GMWW_ARENA_PLAYER_READONLY?.().renderPaused===false&&
    window.__GMWW_ARENA_PLAYER_READONLY?.().paintFrames>n,before,{timeout:30000});
  assert.equal((await page.evaluate(()=>window.__GMWW_ARENA_PLAYER_READONLY())).cardOpen,false);
  assert.deepEqual(unsafeRequests,[],'Player 3D cannot request GM endpoints');
  assert.deepEqual(pageErrors,[]);
  console.log('ARENA3D_PLAYER_PUBLIC_'+name.toUpperCase()+'_PASS',JSON.stringify({
    anonymous:true,publicProjection:true,cardUrl:true,gmLeaks:0,physicalIphone:false}));
 }finally{await context.close();await browser.close()}
}
