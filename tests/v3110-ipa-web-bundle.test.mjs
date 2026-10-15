import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync('.github/workflows/build-server-game-ipa.yml','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('native IPA bundles battle-controls.js that GMWW.html loads',()=>{
  assert.match(html,/src="battle-controls\.js/);
  assert.match(workflow,/cp server-game\/current\/battle-controls\.js "\$APPDIR\/Web\/battle-controls\.js"/);
  assert.match(workflow,/test -s "\$APPDIR\/Web\/battle-controls\.js"/);
});

test('native IPA bundles seat leaf at the village/ path the app and CSS use',()=>{
  assert.ok(app.includes('village/seat-leaf.webp')||css.includes('village/seat-leaf.webp'));
  assert.match(workflow,/mkdir -p "\$APPDIR\/Web\/village"/);
  assert.match(workflow,/cp assets\/village\/seat-leaf\.webp "\$APPDIR\/Web\/village\/seat-leaf\.webp"/);
  assert.match(workflow,/test -s "\$APPDIR\/Web\/village\/seat-leaf\.webp"/);
});
