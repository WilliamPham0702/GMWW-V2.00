import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');

test('ONLINE and OFFLINE always use one warm amber treatment',()=>{
  const shared=css.match(/#playCreateRoomSheet \.play-room-control-row #playRoomModeToggle,\s*#playCreateRoomSheet \.play-room-control-row #playRoomModeToggle\.is-online\s*\{([^}]*)\}/);
  assert.ok(shared,'Both room modes should share the same CSS declaration');
  assert.match(shared[1],/background:linear-gradient\(180deg,rgba\(204,122,39,\.94\),rgba\(139,72,22,\.96\)\)!important/);
  assert.match(shared[1],/border:1px solid rgba\(255,195,110,\.82\)!important/);
  assert.match(shared[1],/color:#fff4df!important/);
  const dot=css.match(/#playCreateRoomSheet \.play-room-control-row #playRoomModeToggle span,\s*#playCreateRoomSheet \.play-room-control-row #playRoomModeToggle\.is-online span\s*\{([^}]*)\}/);
  assert.ok(dot,'Both modes should use the same amber status dot');
  assert.match(dot[1],/background:#ffd27a!important/);
});

test('Mode selection still changes label without changing room ON/OFF semantics',()=>{
  assert.match(app,/modeToggle\.classList\.toggle\('is-online',online\)/);
  assert.match(app,/b\.textContent=online\?'ONLINE':'OFFLINE'/);
  assert.match(html,/id="playRoomModeToggle"/);
  assert.match(html,/id="playCreateRoomEnabled"/);
  assert.match(css,/#playCreateRoomSheet \.play-room-control-row #playCreateRoomEnabled\.is-on\{/);
  assert.match(css,/#playCreateRoomSheet \.play-room-control-row #playCreateRoomEnabled\{/);
});
