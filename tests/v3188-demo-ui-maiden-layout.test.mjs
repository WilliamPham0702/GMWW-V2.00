import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');

test('DEMO book button folds observer without blocking server-rendered history',()=>{
  assert.match(html,/id="battleDemoCollapse" aria-expanded="true"/);
  assert.match(html,/id="battleDemoCount"/);
  assert.match(app,/GMWW_DEMO_OBSERVER_COMPACT_KEY/);
  assert.match(app,/panel\.classList\.toggle\('is-collapsed',collapsed\)/);
  assert.match(app,/panel\.classList\.add\('has-unread'\)/);
  assert.match(app,/demoRunner\.history/);
  assert.match(css,/#battleDemoObserver\.is-collapsed/);
});
test('magnetic dock persists only release-time anchor information, reflows across viewports',()=>{
  assert.match(app,/GMWW_DOCK_LAYOUT_KEY/);
  assert.match(app,/function gmwwSaveDock\(panel,snap\)/);
  assert.match(app,/if\(e\.type==='pointerup'\)gmwwSaveDock\(panel,snap\)/);
  assert.match(app,/function gmwwRestoreDock\(panel,force=false\)/);
  assert.match(app,/anchorId:id/);
  assert.match(app,/battleTargetClampPosition\(width,height,left,rawTop\)/);
});
test('GM menu starts next to calibrated campfire and remains draggable',()=>{
  assert.match(app,/function gmwwPlaceWolfMenuAtFire\(menu\)/);
  assert.match(app,/\.play-village-core \.play-core-pearl/);
  assert.match(app,/gmwwPlaceWolfMenuAtFire\(wolfMenu\)/);
  assert.match(app,/panel\.dataset\.gmwwUserMoved='1'/);
  assert.match(app,/villageFirePosition\(\)/);
});
test('sample-game picker remains interactive but uses a compact, readable layout',()=>{
  assert.match(css,/#playGameSheet \.play-game-sheet-card\[data-mode="play"\]/);
  assert.match(css,/width:min\(94vw,440px\)!important/);
  assert.match(css,/min-height:40px/);
  assert.match(html,/id="playGameTemplateSelect"/);
  assert.match(html,/id="playMatchArtifactSettings"/);
});
