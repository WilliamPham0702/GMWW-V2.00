import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');

test('GM dùng đúng bốn emoji không khung và không khóa vào thanh dưới',()=>{
  const html=read('server-game/current/GMWW.html');
  const css=read('server-game/current/style.css');
  const controls=[
    ['battleFactionStatsToggle','🌈'],
    ['battleDayNoticeToggle','🏖️'],
    ['battleDayGallowsToggle','⛱️'],
    ['battleDemoCollapse','🐦‍🔥']
  ];
  for(const [id,emoji] of controls){
    assert.ok(html.includes('id="'+id+'"'),id);
    const pos=html.indexOf('id="'+id+'"');
    assert.ok(html.slice(pos,pos+450).includes(emoji),id+' không đúng emoji');
  }
  assert.match(css,/\.gmww-free-icon\{/);
  assert.match(css,/border:0!important[\s\S]*background:transparent!important/);
  assert.match(css,/#battleFactionStatsFloat\.gmww-free-icon/);
  assert.match(css,/#battleDayNoticeFloat\.gmww-free-icon/);
  assert.match(css,/#battleDayGallowsFloat\.gmww-free-icon/);
});

test('Bốn icon dùng cùng drag pointer, được lưu vị trí riêng tại thiết bị',()=>{
  const gm=read('server-game/src/40-battle-and-timeline.part');
  const app=read('server-game/current/app.js');
  const start=gm.indexOf('const GMWW_BATTLE_ICON_POSITIONS='),end=gm.indexOf('function renderPlayBattle(){',start);
  assert.ok(start>0&&end>start);
  const fn=gm.slice(start,end);
  for(const id of ['battleFactionStatsFloat','battleDayNoticeFloat','battleDayGallowsFloat','battleDemoObserver'])
    assert.ok(fn.includes("'"+id+"'"),id);
  assert.match(fn,/shell\.appendChild\(panel\)/);
  assert.match(fn,/setPointerCapture\(event\.pointerId\)/);
  assert.match(fn,/addEventListener\('pointermove'/);
  assert.match(fn,/addEventListener\('pointerup'/);
  assert.match(fn,/Math\.hypot\(dx,dy\)<8/);
  assert.match(fn,/localStorage\.setItem\(GMWW_BATTLE_ICON_POSITIONS/);
  assert.match(fn,/stopImmediatePropagation\(\)/);
  assert.match(fn,/visualViewport\?\.addEventListener\('resize'/);
  assert.doesNotMatch(fn,/playRoomApi\(|fetch\(|assignments\s*=/);
  assert.ok(app.includes(fn),'runtime app.js phải đồng bộ với source module');
});

test('Chạm vẫn mở Thống kê phe và trả lại nội dung Server, không chỉ đổi màu nút',()=>{
  const gm=read('server-game/src/40-battle-and-timeline.part');
  const html=read('server-game/current/GMWW.html');
  const css=read('server-game/current/style.css');
  assert.match(gm,/battleFactionStatsToggle'\)\?\.addEventListener\('click'/);
  assert.match(gm,/panel\.hidden=!panel\.hidden/);
  assert.match(gm,/battleRenderFactionStats\(\)/);
  assert.match(gm,/playSceneRuntime\.assignments/);
  assert.match(html,/id="battleFactionStats"[^>]*role="dialog"/);
  assert.match(css,/#battleFactionStats\{\s*pointer-events:auto!important/);
  assert.match(gm,/if\(stats&&stats\.parentElement!==shell\)shell\.appendChild\(stats\)/);
});

test('DEMO mặc định là icon; chạm mở nhật ký, vẫn kéo bằng tiêu đề khi mở rộng',()=>{
  const gm=read('server-game/src/30-village-and-setup.part');
  const controls=read('server-game/src/40-battle-and-timeline.part');
  const css=read('server-game/current/style.css');
  assert.match(gm,/let collapsed=true;try\{collapsed=localStorage\.getItem\(GMWW_DEMO_OBSERVER_COMPACT_KEY\)!=='0'/);
  assert.match(gm,/button\.addEventListener\('click'/);
  assert.match(controls,/battleBindAuxiliaryDrag\('battleDemoObserver','header'\)/);
  assert.match(css,/#battleDemoObserver\.gmww-free-icon\.is-collapsed #battleDemoCollapse/);
});
