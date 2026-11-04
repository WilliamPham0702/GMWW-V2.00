import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const player=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');

test('Account avatar removed from top bar; status and GM timeline remain',()=>{
  const section=player.slice(player.indexOf('function ensurePlayerTopMenu(){'),player.indexOf('function ensureVillageHud(){'));
  assert.ok(section.includes('gmww-player-menu-info'));
  assert.doesNotMatch(section,/<button class="gmww-player-menu-account"/);
  const updater=player.slice(player.indexOf('function updatePlayerTopMenu(){'),player.indexOf('/* One private dock only'));
  assert.doesNotMatch(updater,/gameCharacterImageUrl\(/);
  assert.doesNotMatch(updater,/\.gmww-player-menu-account/);
  assert.match(player,/function renderPlayerTimeline\(/);
});

test('Double-tap on the current player character opens the existing account screen',()=>{
  assert.match(village,/gmww:own-character-doubletap/);
  assert.match(village,/setupState.viewerParticipantId/);
  assert.match(village,/now-Number\(button\._gmwwOwnTapAt\|\|0\)<380/);
  assert.match(player,/if\(d\.type==='gmww:own-character-doubletap'\)\{openVillageProfile\(\);return\}/);
  assert.match(player,/function openVillageProfile\(\)/);
  assert.match(village,/gmww:player-click/,'Other character targeting is retained');
});

test('No extra thumbnail loading or animation timer for removed account icon',()=>{
  const updater=player.slice(player.indexOf('function updatePlayerTopMenu(){'),player.indexOf('/* One private dock only'));
  assert.doesNotMatch(updater,/avatar\.src/);
  assert.doesNotMatch(updater,/ensureCharacterPreviewTicker\(\)/);
  assert.match(updater,/menu\.hidden=!state\.member/);
});
