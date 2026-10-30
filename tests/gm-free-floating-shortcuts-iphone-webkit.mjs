// PR #501: real WebKit layout and PointerEvent regression, isolated from Production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webkit} from 'playwright';

const app=readFileSync('server-game/current/app.js','utf8');
const start=app.indexOf('/* GM shortcuts: independent iPhone-friendly free icons; position is local-only. */');
const end=app.indexOf('/* Local-only magnetic layout:',start);
assert.ok(start>0&&end>start,'Locate actual GM floating-icon + DEMO helper source');
const helper=app.slice(start,end);
const browser=await webkit.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  const page=await context.newPage();
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head>
  <body class="play-immersive"><section id="start"><div id="playShell" data-step="battle" data-battle-phase="day">
    <section id="battleBottomControls">
      <section id="battleFactionStatsFloat" class="battle-faction-stats-float"><button id="battleFactionStatsToggle" aria-pressed="false">⚖️</button></section>
      <section id="battleDayNoticeFloat" class="battle-day-icon-float"><button id="battleDayNoticeToggle"><svg class="gmww-footer-icon" viewBox="0 0 48 48" aria-hidden="true"></svg></button></section>
      <section id="battleDayGallowsFloat" class="battle-day-icon-float"><button id="battleDayGallowsToggle"><svg class="gmww-footer-icon" viewBox="0 0 48 48" aria-hidden="true"></svg></button></section>
    </section>
    <section id="playBattleDock">
      <aside id="battleDemoObserver" aria-label="Quan sát DEMO">
        <header><strong>DEMO</strong><button type="button" id="battleDemoCollapse">🐦‍🔥<span id="battleDemoCount"></span></button></header>
        <small id="battleDemoEventTurn">Đêm 1</small><p id="battleDemoEvent">Sói cắn</p>
        <details id="battleDemoHistory"><summary>Lịch sử DEMO</summary></details><p id="battleDemoObserverError"></p>
      </aside>
    </section>
    <section id="battleFactionStats" role="dialog" hidden><header>THỐNG KÊ PHE</header><div data-faction-counts></div></section>
  </div></section></body></html>`;
  await page.route('https://gmww-pr501.test/**',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
  await page.goto('https://gmww-pr501.test/');
  await page.addStyleTag({content:readFileSync('server-game/current/style.css','utf8')});
  await page.addScriptTag({content:`${helper}
    gmwwSetupFreeBattleIcons();initDemoPanel();
    let opened=0;
    document.getElementById('battleFactionStatsToggle').addEventListener('click',()=>{
      const panel=document.getElementById('battleFactionStats');
      panel.hidden=!panel.hidden;
      if(!panel.hidden)opened++;
    });
    window.pr501={getOpened:()=>opened,setup:gmwwSetupFreeBattleIcons};`});

  // Only ⚖️ and DEMO remain independently floating; Notice and Gallows live in the fixed footer.
  for(const [id,kind,free] of [['battleFactionStatsToggle','⚖️',true],['battleDayNoticeToggle','svg',false],['battleDayGallowsToggle','svg',false],['battleDemoCollapse','🐦‍🔥',true]]){
    const node=page.locator('#'+id);
    if(kind==='svg')assert.equal(await node.locator('svg.gmww-footer-icon').count(),1,id+' must use the current unboxed SVG artwork');
    else assert.equal((await node.textContent()).trim().includes(kind),true,id+' incorrect icon');
    const shape=await node.evaluate(el=>{
      const style=getComputedStyle(el),r=el.getBoundingClientRect();
      return {width:r.width,height:r.height,background:style.backgroundColor,border:style.borderTopWidth,
        parent:el.closest('.gmww-free-icon')?.parentElement?.id,
        footer:!!el.closest('#battleBottomControls')};
    });
    const maxWidth=id==='battleDemoCollapse'?130:free?56:90;
    assert.ok(shape.width>=44&&shape.height>=44&&shape.width<=maxWidth,id+' touch size: '+JSON.stringify(shape));
    assert.equal(shape.background,'rgba(0, 0, 0, 0)',id+' must have no box background');
    assert.equal(shape.border,'0px',id+' must have no box border');
    if(free)assert.equal(shape.parent,'playShell',id+' must float above the village');
    else {assert.equal(shape.parent,undefined,id+' must not be draggable');assert.equal(shape.footer,true,id+' stays in fixed footer');}
  }
  assert.equal(await page.locator('#battleDemoObserver').evaluate(x=>x.classList.contains('is-collapsed')),true);
  await page.locator('#battleDemoCollapse').click();
  assert.equal(await page.locator('#battleDemoObserver').evaluate(x=>x.classList.contains('is-collapsed')),false);
  await page.locator('#battleDemoCollapse').click();
  assert.equal(await page.locator('#battleDemoObserver').evaluate(x=>x.classList.contains('is-collapsed')),true);

  const moved=await page.evaluate(()=>{
    const icon=document.getElementById('battleFactionStatsToggle'),wrapper=document.getElementById('battleFactionStatsFloat');
    const old=wrapper.getBoundingClientRect();
    const fire=(type,x,y)=>icon.dispatchEvent(new PointerEvent(type,
      {bubbles:true,cancelable:true,pointerType:'touch',button:0,pointerId:5,clientX:x,clientY:y}));
    fire('pointerdown',old.left+25,old.top+25);
    fire('pointermove',old.left+145,old.top+160);
    fire('pointerup',old.left+145,old.top+160);
    const now=wrapper.getBoundingClientRect();
    icon.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    return {before:{x:old.left,y:old.top},after:{x:now.left,y:now.top},
      saved:JSON.parse(localStorage.getItem('gmww_battle_free_icons_v1')||'{}').battleFactionStatsFloat,
      opened:window.pr501.getOpened()};
  });
  assert.ok(moved.after.x>moved.before.x+80&&moved.after.y>moved.before.y+80,
    'Touch drag must move the free icon: '+JSON.stringify(moved));
  assert.ok(Number.isFinite(moved.saved?.x)&&Number.isFinite(moved.saved?.y),'Relative position must persist');
  assert.equal(moved.opened,0,'Drag must not activate faction stats');
  await page.waitForTimeout(490); // iOS drops the synthetic click after a drag for 450 ms.
  await page.locator('#battleFactionStatsToggle').click();
  assert.equal(await page.locator('#battleFactionStats').isVisible(),true,'Tap must open stats');
  assert.equal(await page.evaluate(()=>window.pr501.getOpened()),1,'Tap must register exactly once');
  await page.locator('#battleFactionStatsToggle').click();
  assert.equal(await page.locator('#battleFactionStats').isVisible(),false,'Second tap closes stats');

  await page.evaluate(()=>window.pr501.setup());
  const persisted=await page.locator('#battleFactionStatsFloat').evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {x:r.left,y:r.top};
  });
  assert.ok(Math.abs(persisted.x-moved.after.x)<2&&Math.abs(persisted.y-moved.after.y)<2,'Rerender must not reset position');
  await page.screenshot({path:'/tmp/gmww-pr501-iphone-webkit-icons.png'});
  console.log('PASS GM 390x844 iPhone WebKit: fixed SVG footer, floating ⚖️ and DEMO, touch drag, persistence and stats tap');
}finally{await browser.close()}
