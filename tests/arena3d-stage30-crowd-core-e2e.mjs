// GĐ30: 30-player authoritative Core session on isolated Arena3D Worker.
// Deliberately create only temporary STAGING test room/members; never production.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
assert.equal(new URL(base).hostname,'gmww-arena3d-stage14-staging.williampham0702.workers.dev');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'vi-VN'});
const gm=await context.newPage(),viewer=await context.newPage(),errors=[];
for(const page of [gm,viewer])page.on('pageerror',e=>errors.push(e.message));
const wait=(page,check,arg,timeout=60000)=>page.waitForFunction(check,arg,{timeout});
try{
 await gm.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:60000});
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null);
 await gm.locator('[data-roster="30"]').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===30,null);
 await gm.locator('#create').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='authorized',null);
 const code=await gm.locator('#room').inputValue();
 assert.match(code,/^[A-Z0-9]{4,12}$/);
 await viewer.goto(base+'/village/arena-3d/live.html?room='+code,{waitUntil:'domcontentloaded',timeout:60000});
 await wait(viewer,c=>window.__GMWW_ARENA_STAGE_READONLY?.().room===c,code);
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gmConsole,'read-only');
 await gm.locator('#seed').click();
 await wait(gm,()=>document.getElementById('log')?.textContent?.includes('Đã bổ sung 30 người'),null,240000);
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===30,null);
 await wait(viewer,()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===30,null,90000);
 // GĐ42: 30-person crowd must use the actual Player 3D public scene,
 // not only the authorized GM preview. This viewer has no GM credentials.
 const crowdPlayer=await context.newPage();
 crowdPlayer.on('pageerror',e=>errors.push(e.message));
 const crowdRequests=[];
 crowdPlayer.on('request',request=>{
  if(new URL(request.url()).pathname.startsWith('/api/gm/'))crowdRequests.push(request.url());
 });
 await crowdPlayer.goto(base+'/village/arena-3d/player.html?room='+code,
  {waitUntil:'domcontentloaded',timeout:60000});
 await wait(crowdPlayer,()=>window.__GMWW_ARENA_PLAYER_READONLY?.().count===30,null,90000);
 const crowdState=await crowdPlayer.evaluate(()=>window.__GMWW_ARENA_PLAYER_READONLY());
 assert.equal(crowdState.pixelRatio,.85,'30 players must use capped framebuffer density');
 assert.equal(crowdState.room,code);
 assert.deepEqual(crowdRequests,[],'anonymous 3D Player never calls GM APIs');
 await crowdPlayer.locator('#open-card').click();
 await wait(crowdPlayer,()=>window.__GMWW_ARENA_PLAYER_READONLY?.().renderPaused===true,null);
 await crowdPlayer.locator('#close-card').click();
 await wait(crowdPlayer,()=>window.__GMWW_ARENA_PLAYER_READONLY?.().renderPaused===false,null);
 await crowdPlayer.close();
 await gm.locator('#lock').click();
 await wait(gm,()=>document.getElementById('log')?.textContent?.includes('Đã khóa Seat'),null);
 await gm.locator('#deal').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery',null);
 await wait(viewer,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery',null);
 await viewer.reload({waitUntil:'domcontentloaded',timeout:60000});
 await wait(viewer,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery'&&
  window.__GMWW_ARENA_STAGE_READONLY?.().count===30,null,90000);
 await gm.locator('#start').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='running',null);
 await gm.locator('#night').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='night',null);
 await wait(viewer,()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='night',null);
 const noRoleLeaks=await viewer.evaluate(async c=>{
  const response=await fetch('/api/arena-staging/rooms/'+c+'/gm-visuals',{cache:'no-store'});
  return {http:response.status,state:window.__GMWW_ARENA_STAGE_READONLY()};
 },code);
 assert.ok([401,403].includes(noRoleLeaks.http));
 assert.equal(noRoleLeaks.state.privateOverlayCount,0);
 assert.equal(noRoleLeaks.state.count,30);
 await gm.locator('#day').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='morning',null);
 await wait(viewer,()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='morning',null);
 await gm.locator('#nominate').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().ballot==='nominating',null);
 await gm.getByRole('tab',{name:'Phòng'}).click();
 await gm.locator('.gm-seat-grid button[data-seat-id="6"]').click();
 await gm.locator('#vote').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().ballot==='voting',null);
 // GĐ38: both authorized GM and public viewer must render the SAME public
 // suspended candidate in the 3D InstancedMesh scene (not merely Core vote state).
 await wait(gm,()=>String(window.__GMWW_ARENA_STAGE_READONLY?.().gallowsActorId||'').startsWith('member:'),null);
 await wait(viewer,()=>String(window.__GMWW_ARENA_STAGE_READONLY?.().gallowsActorId||'').startsWith('member:'),null);
 const gmGallows=(await gm.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gallowsActorId;
 const viewerGallows=(await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gallowsActorId;
 assert.equal(gmGallows,viewerGallows,'the GM and the public 3D scene use one Core candidate');
 // Full-match acceptance must exercise the REAL 3D GM UI instead of
 // bypassing it with a direct /api/gm/end request. Core must emit lobby to 2 clients.
 const gmEnds=[];
 gm.on('request',request=>{
   if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/gm/rooms/'+code+'/end')
     gmEnds.push({method:request.method(),path:new URL(request.url()).pathname});
 });
 await gm.locator('#winner-faction').selectOption('Phe Dân');
 gm.once('dialog',async dialog=>{
   assert.match(dialog.message(),/Xác nhận kết thúc ván/);
   await dialog.accept();
 });
 await gm.locator('#end-match').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='lobby',null,90000);
 assert.deepEqual(gmEnds,[{method:'POST',path:'/api/gm/rooms/'+code+'/end'}]);
 await gm.locator('#refresh').click();
 await wait(gm,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='lobby',null);
 await wait(viewer,()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='lobby',null);
 assert.equal((await gm.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gallowsActorId,null,
   'ending the Core match returns the suspended candidate to its Seat');
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 assert.deepEqual(errors,[]);
 console.log('STAGE30_CROWD_CORE_PASS',JSON.stringify({players:30,dealReconnect:true,
  fullCoreMatch:true,player3dCrowdPixelRatio:.85,night:true,morning:true,gallows:'nominating-to-voting',
  end:true,viewerDenied:noRoleLeaks.http,production:false,physicalIphone:false}));
}finally{await context.close();await browser.close()}
