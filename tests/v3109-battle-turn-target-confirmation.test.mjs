import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');

test('V3.109 marks the active role and every member of a grouped turn',()=>{
  assert.match(app,/Array\.isArray\(t\?\.roles\)\?t\.roles\.flatMap/);
  assert.match(app,/is-battle-actor/);
  assert.match(css,/battle-orbit/);
  assert.match(app,/is-active/);
  assert.match(css,/play-battle-step\.is-active/);
});

test('V3.109 retains valid tap and drag target selection before confirmation',()=>{
  assert.match(app,/battlePickTargetWithAudio\(x\.dataset\.playPlayerId\)/);
  assert.match(app,/if\(action&&battleState\.targets\.length===action\.targetCount\)battleOpenTargetSheet\(battleState\.actionId,'drag'\)/);
  assert.match(app,/battleResolveDropTarget\(e\.clientX,e\.clientY,nodes,allowed\)/);
  assert.match(app,/targetAllowed/);
  assert.ok(app.includes("battleOpenTargetSheet(d.id,'list',hit.ambiguous)"));
});

test('V3.109 target sheet reduces the final panel to OK while preserving selection cancellation',()=>{
  assert.match(app,/picker\.classList\.toggle\('is-confirm-only'/);
  assert.match(app,/candidates\.hidden=targetReady/);
  assert.match(app,/pickerOK\.disabled=battleState\.busy\|\|battleState\.syncPending\|\|!targetReady/);
  assert.match(css,/battleTargetSheet\.is-confirm-only>header/);
  assert.match(css,/battleTargetSheet\.is-confirm-only>#battleTargetPrompt/);
  assert.match(html,/id="battleTargetCancel">HỦY<\/button><button type="button" id="battleTargetConfirm" title="Chạm để xác nhận · Giữ và kéo để di chuyển">OK<\/button>/);
});
