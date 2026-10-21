import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webkit} from 'playwright';
const css=fs.readFileSync('server-game/current/style.css','utf8');
const browser=await webkit.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:3});
 const markup=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head>
 <body class="play-immersive"><section id="start" class="page active">
 <div id="playShell" data-step="battle" data-battle-phase="night">
 <section id="playBattleTop" class="play-battle-top">
  <button id="battleBack"><b>&lt;Đêm 1</b></button>
  <div id="battleTimeline" class="play-battle-timeline"><button class="play-battle-step is-active"><span class="battle-step-num">3</span><b>Sói Tuyết</b></button><button class="play-battle-step"><b>Bảo Vệ</b></button></div>
  <button id="battleAdvance"><b>Ngày 1&gt;</b></button>
 </section>
 <section id="playBattleDock" class="play-battle-dock battle-float-v396">
 <aside id="battleDemoObserver"><header><span class="battle-menu-grip"></span><strong>Đang chạy · Đêm 1 · Lượt 3/15 · Sói Tuyết</strong></header>
 <small>Hành động · Đêm 1 · Lượt 3/15 · Sói Tuyết</small><p>Đã thực hiện · Nghĩa · Đóng Băng → Bin · Đang đồng bộ kết quả hành động theo thứ tự Vai Trò và Artifact.</p></aside>
 <div id="battleWolfMenu" class="battle-wolf-menu"><header><span class="battle-menu-grip"></span></header>
 <div class="battle-wolf-actions"><button id="battleDemoToggle">↻ DEMO</button><span id="battleDemoSpeedWrap" class="play-demo-speed"><button id="battleDemoSpeed">×1</button></span><button>Artifact</button><button>Vai Trò</button><button>Người Chơi</button></div></div>
 </section>
 <section id="battleBottomControls" class="battle-bottom-controls-v3104">
 <section id="playBattleClockFloat" class="battle-clock-float-v396"><button id="battleClockButton"><output id="battleCountdown">00:14</output></button></section>
 <section id="battleActionTray" class="battle-action-tray-v399"><div class="battle-action-tray-head"><b></b></div><div id="battleActionRail"><div id="battleActionBar" class="battle-action-scroll"><button data-battle-action="freeze">Đóng băng</button><button data-battle-action="bite">Sói Cắn</button></div></div></section>
 <section id="battleUndoFloat" class="battle-undo-float-v399"><button id="battleUndoButton">↶</button></section>
 </section></div></section></body></html>`;
 await page.setContent(markup);
 await page.addStyleTag({content:css});
 const read=()=>page.evaluate(()=>{
  const box=id=>{const node=document.getElementById(id),b=node.getBoundingClientRect(),style=getComputedStyle(node);return{width:b.width,height:b.height,touchAction:style.touchAction,overflowX:style.overflowX,overflowY:style.overflowY}};
  return {top:box('playBattleTop'),timeline:box('battleTimeline'),notice:box('battleDemoObserver'),menu:box('battleWolfMenu'),footer:box('battleBottomControls'),clock:box('playBattleClockFloat'),actions:box('battleActionTray'),undo:box('battleUndoFloat'),demo:box('battleDemoToggle'),speed:box('battleDemoSpeed'),observerGrip:box('battleDemoObserver'),menuGrip:box('battleWolfMenu')};
 });
 const layout=await read();
 assert.ok(layout.top.height<=58,'Timeline panel is too tall: '+JSON.stringify(layout.top));
 assert.ok(layout.notice.height<=108,'Action observer has not compacted: '+JSON.stringify(layout.notice));
 assert.ok(layout.notice.width<=340,'Action observer is too wide: '+JSON.stringify(layout.notice));
 assert.ok(layout.menu.width<=390,'DEMO popover still forced full width: '+JSON.stringify(layout.menu));
 assert.ok(layout.footer.height<=70,'Footer is too tall: '+JSON.stringify(layout.footer));
 assert.ok(layout.clock.height<=54,'Clock tile must fit compact footer');
 assert.ok(layout.undo.height<=54,'Undo tile must fit compact footer');
 assert.ok(layout.actions.height<=65,'Action tray must fit compact footer');
 assert.ok(layout.demo.height>=40 && layout.speed.height>=40,'DEMO controls have too-small tap targets');
 assert.ok(layout.menu.width<layout.top.width,'floating box must be narrower than fixed top rail');
 const touch=await page.evaluate(()=>({a:getComputedStyle(document.querySelector('#battleDemoObserver>header')).touchAction,b:getComputedStyle(document.querySelector('#battleWolfMenu>header')).touchAction}));
 assert.equal(touch.a,'none','DEMO observation retains touch drag');
 assert.equal(touch.b,'none','GM popover retains touch drag');
 await page.screenshot({path:'/tmp/gmww-v3178-iphone-layout.png'});
 console.log('PASS V3.178 iPhone-sized WebKit compact GMWW battle controls:',JSON.stringify(layout));
}finally{await browser.close()}
