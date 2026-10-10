import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/gmww-members-live.js','utf8');
const live=JSON.parse(source.slice(source.indexOf(' = ')+3).trim().replace(/;$/,''));
const patch=fs.readFileSync('src/gmww-player-private-card-patch.js','utf8');

test('No extra Làng/Vai Trò navigation box is created on Player Web',()=>{
  const start=live.indexOf('function ensureVillageGameView(){');
  const end=live.indexOf('function setGameViewPane(',start);
  assert.ok(start>=0&&end>start);
  const setup=live.slice(start,end);
  assert.match(setup,/\$\('#gmwwGameViewTabs'\)\?\.remove\(\)/);
  assert.doesNotMatch(setup,/createElement\('button'\)/);
  assert.doesNotMatch(setup,/tabs\.append\(village,role\)/);
  assert.match(setup,/shell\.dataset\.initialized='1';setGameViewPane\('village'/);
});

test('Role viewer and private-card tap still work without legacy tabs',()=>{
  const pane=live.slice(live.indexOf('function setGameViewPane('),live.indexOf('const GM_VILLAGE_MOVE_MS',live.indexOf('function setGameViewPane(')));
  assert.match(pane,/const shell=\$\('#gmwwVillageShell'\),role=\$\('#game \.role-stage'\);if\(!shell\|\|!role\)return/);
  assert.match(pane,/role\.hidden=pane!=='role'/);
  assert.doesNotMatch(pane,/!tabs\)return/);
  assert.match(patch,/setGameViewPane\('role',\{persist:false\}\)/);
  assert.match(patch,/if\(kind==='role'\)toggleRole\(\);else toggleArtifact\(\)/);
  assert.match(patch,/armPrivateCardIdle\(\)/);
});
