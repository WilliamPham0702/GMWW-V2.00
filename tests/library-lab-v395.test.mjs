import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

test('V3.177 removes the legacy Lab UI, its script and simulated controls completely',()=>{
  for(const id of ['gmww-lab-script','lib-lab','gmwwLabRun','gmwwLabLog','gmwwLabNights','gmwwLabScenario']){
    assert.ok(!html.includes(id),id+' must not be accessible');
  }
  assert.doesNotMatch(html,/data-lib="lab"|MÔ PHỎNG THAM CHIẾU|<h2>Lab<\/h2>/);
  assert.match(html,/<button class="libtab active" data-lib="cards"/);
  assert.match(html,/<section class="libpane active" id="lib-cards"/);
});

test('Removing Lab preserves real role, Artifact and Ván Mẫu libraries',()=>{
  for(const section of ['lib-cards','lib-artifacts','lib-templates'])assert.ok(html.includes('id="'+section+'"'));
  assert.match(html,/id="playGameTemplateAdd"/);
  assert.match(app,/function openLibraryGameTemplate\(id=''/);
  assert.match(app,/function renderGameTemplateLibrary\(\)/);
});
