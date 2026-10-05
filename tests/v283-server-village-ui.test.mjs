import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
test('V2.83 GM lobby keeps one-second realtime fallback alongside websocket',()=>{assert.match(app,/ensurePlayRealtimePoll/);assert.match(app,/setInterval\(\(\)=>\{if\(document\.visibilityState==='visible'&&\!playSceneRuntime\.busy\)playSyncRoom\(false\)\},1000\)/);assert.match(app,/connectPlaySocket\(\);ensurePlayRealtimePoll\(\)/)});
test('GM player labels show status and large name above character and role below',()=>{assert.match(app,/play-player-over/);assert.match(app,/play-player-role/);assert.match(app,/assignment\?\.roleName/);assert.match(css,/\.play-player-over b\{[^}]*font-size:12px/);assert.match(css,/\.play-player-role\{/)});
test('Lobby header is clean and setup panels are closable centered popups',()=>{assert.match(css,/data-phase="lobby"\] \.play-room-chip/);assert.match(css,/data-phase="lobby"\] \.play-phase-pill/);assert.match(css,/\.play-context-panel\.is-setup-popup\{position:fixed!important;left:50%!important;top:50%!important/);assert.match(app,/play-context-close/);assert.match(app,/setupPopupClosed=true/);assert.match(css,/\.play-setup-strip\{display:none!important\}/)});
test('GM touch targets are enlarged',()=>{assert.match(css,/\.play-control-icon,\.play-primary-control\{min-height:56px\}/);assert.match(css,/\.play-action-chip\{min-height:42px/)});


test('V2.84 lobby keeps only Auto GM in top HUD and doubles lower operation panel',()=>{
  const css=read('server-game/current/style.css');
  assert.ok(css.includes('V2.84 — GM village layout'));
  assert.ok(css.includes('.play-shell[data-phase="lobby"] .play-room-chip'));
  assert.ok(css.includes('.play-shell[data-phase="lobby"] .play-phase-pill'));
  assert.ok(css.includes('width:112px!important'));
  assert.ok(css.includes('height:min(32svh,300px)!important'));
  assert.ok(css.includes('min-height:210px!important'));
  assert.ok(css.includes('grid-template-columns:1fr!important'));
});
