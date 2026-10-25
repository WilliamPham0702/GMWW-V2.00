// Isolated V3.188 functional iPhone WebKit regression for interactive GM overlays.
// Does not connect to Production, mutate a room, or require real player credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webkit} from 'playwright';

const app=readFileSync('server-game/current/app.js','utf8');
const start=app.indexOf("const GMWW_DEMO_OBSERVER_COMPACT_KEY='gmww_demo_observer_compact_v1'");
const end=app.indexOf('\nfunction demoTurnDescription(',start);
assert.ok(start>0&&end>start,'Locate real DEMO/dock/fire helpers in shipped app');
const helpers=app.slice(start,end);
const browser=await webkit.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  const page=await context.newPage();
  const documentSource=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body class="play-immersive">
  <section id="start"><div id="playShell" data-step="battle" style="height:100dvh;position:relative">
    <div id="playBattleTop" style="position:absolute;top:8px;left:12px;width:calc(100% - 24px);height:52px"></div>
    <div class="play-village-core" style="position:absolute;left:55%;top:53%">
      <button class="play-core-pearl" style="width:52px;height:52px" type="button">🔥</button>
    </div>
    <section id="playBattleDock" style="position:absolute;bottom:8px;left:10px;right:10px;min-height:56px">
      <aside id="battleDemoObserver" aria-label="Quan sát DEMO" style="position:absolute;left:12px;top:-220px;width:280px;min-height:110px">
        <header aria-label="Kéo bảng quan sát"><span class="battle-menu-grip"></span>
          <strong id="battleDemoTurn">Đang chạy · Đêm 1</strong>
          <button type="button" id="battleDemoCollapse" aria-expanded="true" title="Thu gọn thành 🐦‍🔥">🐦‍🔥<span id="battleDemoCount">5</span></button>
        </header>
        <small id="battleDemoEventTurn">MỚI NHẤT</small>
        <p id="battleDemoEvent">Sói đã cắn người chơi</p>
        <details id="battleDemoHistory"><summary id="battleDemoHistoryCount">Lịch sử</summary><ol id="battleDemoHistoryList"></ol></details>
        <p id="battleDemoObserverError"></p>
      </aside>
      <div id="battleWolfMenu" style="position:absolute;left:0;bottom:calc(100% + 10px);width:180px;height:145px">
        <header class="battle-menu-grip">Menu GM</header><div class="battle-wolf-actions"><button type="button">Auto GM</button></div>
      </div>
    </section>
  </div></section></body></html>`;
  await page.route('https://preview-qa.gmww.test/**',route=>route.fulfill({status:200,contentType:'text/html',body:documentSource}));
  await page.goto('https://preview-qa.gmww.test/');
  await page.addStyleTag({content:readFileSync('server-game/current/style.css','utf8')});
  await page.addScriptTag({content:`function battleTargetClampPosition(w,h,x,y){
    return {left:Math.max(8,Math.min(innerWidth-w-8,x)),top:Math.max(8,Math.min(innerHeight-h-8,y))};
  }
  ${helpers}
  globalThis.v3188={initDemoPanel,gmwwSaveDock,gmwwReadDocks,gmwwRestoreDock,gmwwPlaceWolfMenuAtFire};`});

  await page.evaluate(()=>v3188.initDemoPanel());
  const book=page.locator('#battleDemoCollapse');
  assert.equal(await page.locator('#battleDemoObserver').evaluate(el=>el.classList.contains('is-collapsed')),true,'DEMO starts as free phoenix icon on a new device');
  await book.click();
  assert.equal(await page.locator('#battleDemoObserver').evaluate(el=>el.classList.contains('is-collapsed')),false,'First tap expands DEMO event history');
  await book.click();
  const folded=await page.evaluate(()=>{
    const box=document.getElementById('battleDemoObserver').getBoundingClientRect(),
      button=document.getElementById('battleDemoCollapse').getBoundingClientRect();
    return {w:box.width,h:box.height,buttonW:button.width,buttonH:button.height,
      saved:localStorage.getItem('gmww_demo_observer_compact_v1'),
      expanded:document.getElementById('battleDemoCollapse').getAttribute('aria-expanded')};
  });
  assert.equal(folded.saved,'1','Book collapse preference must persist on this device');
  assert.equal(folded.expanded,'false','Screen reader receives collapsed state');
  assert.ok(folded.w<=53&&folded.h<=52,'Folded observer occupies just the 🐦‍🔥 icon: '+JSON.stringify(folded));
  assert.ok(folded.buttonW>=43&&folded.buttonH>=43,'Book control keeps an iPhone-sized touch target');
  // Initialization is intentionally idempotent: do not forge a fresh
  // element by deleting its event-listener guard (which duplicates clicks).
  await page.evaluate(()=>v3188.initDemoPanel());
  assert.equal(await page.locator('#battleDemoObserver').evaluate(el=>el.classList.contains('is-collapsed')),true,'Phoenix collapse survives panel reinit');
  await book.click();
  assert.equal(await page.locator('#battleDemoObserver').evaluate(el=>el.classList.contains('is-collapsed')),false,'Phoenix icon restores event history');
  assert.equal(await page.evaluate(()=>localStorage.getItem('gmww_demo_observer_compact_v1')),'0');

  await page.evaluate(()=>{
    const panel=document.getElementById('battleDemoObserver');
    v3188.gmwwSaveDock(panel,{anchorId:'playBattleTop',edge:'top'});
    panel.style.top='-220px';panel.dataset.gmwwDockApplied='';panel.classList.remove('gmww-dock-snapped');
    if(!v3188.gmwwRestoreDock(panel))throw Error('Saved magnetic docking did not restore');
  });
  const stored=await page.evaluate(()=>{
    const panel=document.getElementById('battleDemoObserver'),anchor=document.getElementById('playBattleTop');
    return {saved:v3188.gmwwReadDocks().battleDemoObserver,
      delta:panel.getBoundingClientRect().top-anchor.getBoundingClientRect().bottom,
      onScreen:panel.getBoundingClientRect().left>=0&&panel.getBoundingClientRect().right<=innerWidth+1};
  });
  assert.deepEqual(stored.saved,{anchorId:'playBattleTop',edge:'top'},'Only relative dock metadata is stored');
  assert.ok(Math.abs(stored.delta-5)<3,'Dock restores beside top GM rail: '+JSON.stringify(stored));
  assert.equal(stored.onScreen,true,'Restored dock remains inside iPhone viewport');
  await page.evaluate(()=>v3188.gmwwSaveDock(document.getElementById('battleDemoObserver'),null));
  assert.equal(await page.evaluate(()=>Object.keys(v3188.gmwwReadDocks()).length),0,'Undock must remove local metadata');

  await page.evaluate(()=>v3188.gmwwPlaceWolfMenuAtFire(document.getElementById('battleWolfMenu')));
  const campfire=await page.evaluate(()=>{
    const fire=document.querySelector('.play-core-pearl').getBoundingClientRect();
    const menu=document.getElementById('battleWolfMenu').getBoundingClientRect();
    return {centerDelta:Math.abs((fire.left+fire.right-menu.left-menu.right)/2),
      verticalGap:Math.min(Math.abs(menu.bottom-fire.top),Math.abs(menu.top-fire.bottom)),
      left:menu.left,right:menu.right,top:menu.top,bottom:menu.bottom,width:innerWidth,height:innerHeight};
  });
  assert.ok(campfire.centerDelta<15,'GM menu must be centered next to 🔥: '+JSON.stringify(campfire));
  assert.ok(campfire.verticalGap<=16,'GM menu must open beside 🔥, not at fixed footer: '+JSON.stringify(campfire));
  assert.ok(campfire.left>=0&&campfire.right<=campfire.width+1&&campfire.top>=0&&campfire.bottom<=campfire.height+1,'GM menu stays inside viewport');
  await page.screenshot({path:'/tmp/gmww-v3188-preview-iphone-webkit.png'});
  console.log('PASS PR501 iPhone WebKit: 🐦‍🔥 default compact, expand/collapse, persistent choice, local dock and campfire menu');
}finally{await browser.close()}
