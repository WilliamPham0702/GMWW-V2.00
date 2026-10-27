// GĐ13 isolated full-session Core E2E, TWO clients: authorized GM + anonymous viewer.
// Never uses production or user data. Desktop Chrome is NOT a real iPhone thermal test.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://gmww-arena3d-stage14-staging.williampham0702.workers.dev';
assert.equal(new URL(base).hostname,'gmww-arena3d-stage14-staging.williampham0702.workers.dev');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
 args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,locale:'vi-VN'});
try{
 const gm=await ctx.newPage(),viewer=await ctx.newPage();
 const coreRequests=[];
 gm.on('response',async response=>{
  const pathname=new URL(response.url()).pathname;
  if(!/\/api\/gm\/rooms\/[^/]+\/(?:config|assignments|start)$/.test(pathname))return;
  const data=await response.json().catch(()=>({}));
  coreRequests.push({endpoint:pathname.split('/').at(-1),status:response.status(),ok:data.ok,error:data.error||null,message:String(data.message||'').slice(0,120)});
 });
 const errors=[];gm.on('pageerror',e=>errors.push('gm '+e.message));viewer.on('pageerror',e=>errors.push('viewer '+e.message));
 await gm.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:60000});
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null,{timeout:45000});
 await gm.locator('#create').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='authorized',null,{timeout:35000});
 const code=await gm.locator('#room').inputValue();
 assert.match(code,/^[A-Z0-9]{4,12}$/);
 await viewer.goto(base+'/village/arena-3d/live.html?room='+code,{waitUntil:'domcontentloaded',timeout:60000});
 await viewer.waitForFunction(code=>window.__GMWW_ARENA_STAGE_READONLY?.().room===code,code,{timeout:35000});
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gmConsole,'read-only');
 const deny=await viewer.evaluate(async code=>{
  const r=await fetch('/api/arena-staging/rooms/'+code+'/gm-visuals',{cache:'no-store'});
  return {status:r.status,text:(await r.text()).slice(0,80)};
 },code);
 assert.ok([401,403].includes(deny.status),'anonymous user MUST NOT read role cues');
 await gm.locator('#seed').click();
 await gm.waitForFunction(()=>document.getElementById('log')?.textContent?.includes('Đã bổ sung'),null,{timeout:50000});
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null,{timeout:25000});
 await viewer.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().count===6,null,{timeout:30000});
 await gm.locator('#lock').click();
 await gm.waitForFunction(()=>document.getElementById('log')?.textContent?.includes('Đã khóa Seat'),null,{timeout:25000});
 await gm.locator('#deal').click();
 try{
  await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery',null,{timeout:18000});
 }catch(error){
  throw Error('Core STAGING phát vai chưa đạt: '+JSON.stringify({
   state:await gm.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY?.()),
   uiNotice:await gm.locator('#log').innerText(),coreRequests
  })+'; '+String(error.message).slice(0,100));
 }
 // GĐ27: player enters halfway through deal, disconnect/reconnect and must
 // retain the authoritative public phase without exposing private role data.
 await viewer.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery',
  null,{timeout:35000});
 await viewer.reload({waitUntil:'domcontentloaded',timeout:60000});
 await viewer.waitForFunction(code=>
  window.__GMWW_ARENA_STAGE_READONLY?.().room===code&&
  window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery',
  code,{timeout:45000});
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gmConsole,'read-only');
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 await gm.locator('#start').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='running',null,{timeout:35000});
 await gm.locator('#night').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='night',null,{timeout:35000});
 await viewer.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='night',null,{timeout:35000});
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 await gm.getByRole('tab',{name:'Phòng'}).click();
 await gm.locator('.gm-seat-grid button[data-seat-id="6"]').click();
 await gm.getByRole('tab',{name:'Lượt Đêm'}).click();
 let cast=null;
 for(let attempt=0;attempt<15;attempt++){
  await gm.locator('#gm-console .gm-console-vote').waitFor({timeout:18000});
  const button=gm.getByRole('button',{name:/Thử .*Bảo Vệ/});
  if(await button.count()){
   await button.click();
   await gm.waitForFunction(()=>document.querySelector('#log')?.textContent?.includes('Core đã xác nhận hành động'),null,{timeout:20000});
   cast=await gm.evaluate(async code=>{
    const token=document.getElementById('gm-key').value;
    const r=await fetch('/api/arena-staging/rooms/'+code+'/gm-visuals',{headers:{authorization:'Bearer '+token},cache:'no-store'});
    const d=await r.json();return {status:r.status,actionId:d.casting?.cast?.actionId,kind:d.casting?.cast?.kind,
      roleId:d.casting?.cast?.roleId,targetCount:d.casting?.cast?.targetIds?.length||0};
   },code);
   break;
  }
  const text=await gm.locator('#gm-console .gm-console-vote').innerText();
  await gm.getByRole('button',{name:'Sang lượt tiếp theo'}).click();
  await gm.waitForFunction(prev=>document.querySelector('#gm-console .gm-console-vote')?.textContent!==prev,text,{timeout:18000});
 }
 assert.ok(cast,'must execute an actual Core-authorized Guard action');
 assert.equal(cast.status,200);
 assert.equal(cast.actionId,'action_protect');
 assert.equal(cast.kind,'shield');
 assert.ok(cast.targetCount>=1);
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 await viewer.reload({waitUntil:'domcontentloaded',timeout:60000});
 await viewer.waitForFunction(code=>window.__GMWW_ARENA_STAGE_READONLY?.().room===code&&window.__GMWW_ARENA_STAGE_READONLY?.().count===6,code,{timeout:45000});
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gmConsole,'read-only');
 const reconnectedDenied=await viewer.evaluate(async code=>{
  const response=await fetch('/api/arena-staging/rooms/'+code+'/gm-visuals',{cache:'no-store'});
  return response.status;
 },code);
 assert.ok([401,403].includes(reconnectedDenied),'reconnect must not grant private GM effects');
 await gm.locator('#day').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='morning',null,{timeout:30000});
 await viewer.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='morning',null,{timeout:35000});
 await gm.locator('#nominate').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().ballot==='nominating',null,{timeout:35000});
 await gm.getByRole('tab',{name:'Lên Giàn'}).click();
 await gm.getByRole('button',{name:'Bỏ phiếu cho Seat đã chọn'}).click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().ballot==='voting',null,{timeout:35000});
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 // Finish this isolated match through the real GM V2 end endpoint.
 const ended=await gm.evaluate(async code=>{
  const token=document.getElementById('gm-key').value;
  const matchId=window.__GMWW_ARENA_STAGE_READONLY().matchId;
  const response=await fetch('/api/gm/rooms/'+code+'/end',{method:'POST',cache:'no-store',
   headers:{authorization:'Bearer '+token,'content-type':'application/json'},
   body:JSON.stringify({matchId,winnerFaction:'village',winner:'Dân Làng'})});
  const data=await response.json();return {status:response.status,ok:data.ok,error:data.error||null};
 },code);
 assert.equal(ended.status,200,'real isolated Core must accept GM end-of-match');
 assert.equal(ended.ok,true);
 await gm.locator('#refresh').click();
 await gm.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='lobby',null,{timeout:35000});
 await viewer.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='lobby',null,{timeout:35000});
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).privateOverlayCount,0);
 assert.equal((await viewer.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY())).gmConsole,'read-only');
 assert.deepEqual(errors,[]);
 console.log('STAGE16_STANDARD_CORE_TWO_CLIENT_PASS',JSON.stringify({room:code,
  realCoreAction:cast.actionId,cycle:'night=>morning',gallows:'nominating=>voting',ended:true,
  viewerDenied:deny.status,viewerReconnected:true,dealReconnect:true,
  protectedAfterReconnect:true,production:false,physicalIphone:false}));
}finally{await ctx.close();await browser.close()}

// GĐ30: in the same isolated STAGING workflow, verify 30 real Core seats.
await import('./arena3d-stage30-crowd-core-e2e.mjs');
