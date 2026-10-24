// Browser smoke: isolated Core STAGING only. Test GM UI actions, never Production/IPA.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base='https://gmww-arena3d-core-staging.williampham0702.workers.dev';
assert.match(new URL(base).host,/^gmww-arena3d-core-staging\.[^.]+\.workers\.dev$/);
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
  await page.goto(base+'/village/arena-3d/live.html',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='read-only');
  await page.getByRole('tab',{name:'Hiệu năng'}).click();
  await page.getByRole('button',{name:'Tiết kiệm pin'}).click();
  let s=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.equal(s.lowPower,true);assert.ok(s.pixelRatio<1.2);
  await page.getByRole('button',{name:'Mượt'}).click();
  await page.locator('#create').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='authorized',{timeout:25000});
  const code=await page.locator('#room').inputValue();
  assert.match(code,/^[A-Z0-9]{4,12}$/);
  await page.locator('#connect').click(); // viewer mode in same room
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='read-only');
  await page.locator('#gm-restore').click(); // token remains ONLY in password input, never localStorage
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().gmConsole==='authorized',{timeout:25000});
  assert.equal(new URL(page.url()).searchParams.has('gmToken'),false);
  await page.locator('#seed').click();
  await page.waitForFunction(()=>document.body.dataset.gmwwLiveCount==='6',null,{timeout:35000});
  await page.waitForFunction(()=>document.getElementById('log')?.textContent?.includes('Đã bổ sung'),null,{timeout:35000});
  await page.getByRole('tab',{name:'Phòng'}).click();
  const first=page.locator('.gm-seat-grid button[data-seat-id="1"]');
  await first.waitFor({timeout:15000});
  await first.click();
  s=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.ok(s.selectedId?.startsWith('member:'));
  await page.locator('#lock').click();
  await page.waitForFunction(()=>document.getElementById('log')?.textContent?.includes('Đã khóa Seat'),null,{timeout:20000});
  await page.locator('#deal').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='role_delivery',{timeout:30000});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().phase==='running',{timeout:25000});
  await page.locator('#night').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='night'&&window.__GMWW_ARENA_STAGE_READONLY?.().sky==='night',null,{timeout:25000});
  await page.screenshot({path:'/tmp/gmww-arena3d-coastal-night-390.png'});
  // FULL UI: GM picks actual Seat 6 target and walks real Core night turns
  // until Guard's assigned owner can execute their own effect (no local fake).
  await page.getByRole('tab',{name:'Phòng'}).click();
  await page.locator('.gm-seat-grid button[data-seat-id="6"]').click();
  await page.getByRole('tab',{name:'Lượt Đêm'}).click();
  let verifiedSpell=false;
  for(let attempt=0;attempt<15;attempt++){
    const notice=page.locator('#gm-console .gm-console-vote');
    await notice.waitFor({timeout:18000});
    const trial=page.getByRole('button',{name:/Thử .*Bảo Vệ/});
    if(await trial.count()){
      await trial.click();
      await page.waitForFunction(()=>document.querySelector('#log')?.textContent?.includes('Core xác nhận lượt thử'),null,{timeout:15000});
      await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().spellVfx==='shield',null,{timeout:12000});
      await page.screenshot({path:'/tmp/gmww-arena3d-real-guard-spell-390.png'});
      verifiedSpell=true;break;
    }
    const previous=await notice.innerText();
    await page.getByRole('button',{name:'Sang lượt tiếp theo'}).click();
    await page.waitForFunction(previous=>
      document.querySelector('#gm-console .gm-console-vote')?.textContent!==previous,
      previous,{timeout:18000});
  }
  assert.equal(verifiedSpell,true,'GM browser must perform real Core-backed Guard action and 3D shield animation');
  await page.locator('#day').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().cyclePhase==='morning'&&window.__GMWW_ARENA_STAGE_READONLY?.().sky==='day',null,{timeout:25000});
  await page.screenshot({path:'/tmp/gmww-arena3d-coastal-day-390.png'});
  await page.locator('#nominate').click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().ballot==='nominating',{timeout:30000});
  await page.getByRole('tab',{name:'Lên Giàn'}).click();
  assert.ok(await page.locator('.gm-console-vote').count()>0);
  await page.getByRole('button',{name:'Bỏ phiếu cho Seat đã chọn'}).click();
  await page.waitForFunction(()=>window.__GMWW_ARENA_STAGE_READONLY?.().ballot==='voting',{timeout:30000});
  s=await page.evaluate(()=>window.__GMWW_ARENA_STAGE_READONLY());
  assert.equal(s.room,code);assert.equal(s.gmConsole,'authorized');
  assert.ok(s.drawCalls>0&&s.drawCalls<=55);
  assert.deepEqual(errors,[],'GM dashboard browser has no script errors');
  await page.screenshot({path:'/tmp/gmww-arena3d-gm-phase4-390.png'});
  console.log('PASS: Phase4 real Core GM dashboard with seat select, authorized GM token restore, battery mode, role deal, night/day, gallows',JSON.stringify({room:code,phase:s.phase,cycle:s.cyclePhase,drawCalls:s.drawCalls,fps:s.fps,model:s.atelier}));
}finally{await browser.close()}
