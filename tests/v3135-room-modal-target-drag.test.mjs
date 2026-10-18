import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');

test('V3.135: Create Room outer panel is compact while multiple room tiles stay swipeable',()=>{
  const css=read('server-game/current/style.css'),block=css.slice(css.lastIndexOf('/* V3.135:'));
  assert.match(block,/#playCreateRoomSheet>\.play-room-page-card\{[\s\S]*?width:min\(280px,calc\(100vw - 28px\)\)!important/);
  assert.match(block,/#playCreateRoomSheet \.play-room-step\{[\s\S]*?width:max-content!important/);
  assert.match(block,/\.play-room-strip\{[^}]*overflow-x:auto!important/);
  assert.match(block,/\.play-room-created-list\{min-width:max-content!important\}/);
  const old=css.slice(css.lastIndexOf('/* V3.134:'),css.lastIndexOf('/* V3.135:'));
  assert.match(old,/\.play-room-control-row>\.play-room-step-next\{[\s\S]*?flex:0 0 42px!important/);
});

test('V3.135: affected-character picker can move without invoking an action or closing it',()=>{
  const part=read('server-game/src/40-battle-and-timeline.part'),html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css');
  assert.match(html,/id="battleTargetGrip" title="Giữ và kéo/);
  assert.match(part,/function battleBindTargetSheetDrag\(\)/);
  assert.match(part,/grip\.addEventListener\('pointerdown'/);
  assert.match(part,/e\.target\.closest\('button'\)/);
  assert.match(part,/grip\.addEventListener\('pointermove'/);
  assert.match(part,/battlePlaceTargetSheet\(sheet,drag\.left/);
  assert.match(part,/battleBindTargetSheetDrag\(\);battleBindConfirmDrag\(\)/);
  assert.match(css,/#battleTargetGrip\{[\s\S]*?touch-action:none!important/);
  assert.match(part,/ignoreConfirmClickUntil=Date\.now\(\)\+400/);
  assert.match(part,/const picker=document\.getElementById\('battleTargetSheet'\)/);
});

test('V3.135: target box dragging stays bounded within a phone viewport',()=>{
  const source=read('server-game/src/40-battle-and-timeline.part');
  const start=source.indexOf('function battleTargetClampPosition('),end=source.indexOf('function battlePlaceTargetSheet(',start);
  assert.ok(start>=0&&end>start);
  const ctx={};
  vm.runInNewContext(source.slice(start,end)+';globalThis.bound=battleTargetClampPosition;',ctx);
  const pairs=[[-80,-25,6,6],[1000,1000,244,658],[150,220,150,220]];
  for(const [x,y,left,top] of pairs){
    const p=ctx.bound(140,180,x,y,390,844);
    assert.equal(p.left,left);assert.equal(p.top,top);
  }
});

test('V3.135: package, Worker, source runtime and HTML remain synchronized',()=>{
  const v=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
  assert.equal(v,'3.135');
  assert.ok(read('src/index.js').includes('VERSION="V'+v+'"'));
  assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='"+v+"'"));
  assert.ok(read('server-game/current/GMWW.html').includes('<title>GMWW V'+v+'</title>'));
  assert.ok(read('server-game/current/GMWW.html').includes('style.css?v='+v+'-compact-room'));
  assert.ok(read('server-game/current/GMWW.html').includes('app.js?v='+v+'-compact-room'));
});
