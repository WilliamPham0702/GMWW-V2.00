import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.63 exposes 20 selectable chibi while retaining legacy account character IDs',()=>{
  const index=read('src/index.js');
  assert.match(index,/VERSION="V2\.62"/);
  assert.match(index,/const GAME_CHARACTER_COUNT=20;/);
  assert.match(index,/\^character-\(\?:0\[1-9\]\|\[1-3\]\[0-9\]\|4\[0-2\]\)\$/);
});

test('Player Web picker and village animate characters only while moving',()=>{
  const live=read('src/gmww-members-live.js');
  const village=read('assets/village/village.mjs');
  const css=read('assets/village/village.css');
  assert.match(live,/gmwwAvatarWalkPreview/);
  assert.match(live,/\/village\/\?embed=1&v=262/);
  assert.match(village,/position\?\.moving\?" moving":""/);
  assert.match(village,/className="player-meta"/);
  assert.match(css,/\.player\.moving \.portrait\.game-character/);
  assert.match(css,/@keyframes gmwwVillageWalk/);
  assert.match(css,/\.player \.player-meta/);
});

test('GM IPA V2.63 renders full-body chibi and carries build 262',()=>{
  const app=read('server-game/current/app.js');
  const css=read('server-game/current/style.css');
  const html=read('server-game/current/GMWW.html');
  const project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj');
  assert.match(app,/const VERSION='2\.62';/);
  assert.match(css,/\.play-player-token\.is-moving \.play-player-avatar/);
  assert.match(css,/@keyframes gmwwChibiWalk/);
  assert.match(html,/GMWW V2\.62/);
  assert.match(project,/CURRENT_PROJECT_VERSION = 263;/);
  assert.match(project,/MARKETING_VERSION = 2\.62;/);
});
