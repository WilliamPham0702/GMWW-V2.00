import {assertCurrentRelease} from './release-metadata-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync('src/index.js','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const live=fs.readFileSync('src/gmww-members-live.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');

test('GM online presence remains authenticated and independently displayed',()=>{
  assert.match(server,/GM_PRESENCE_TTL=75000/);
  assert.match(server,/\/api\/gm-presence/);
  assert.match(server,/\/api\/gm\/presence/);
  assert.match(app,/gmwwSendGmPresence/);
  assert.match(app,/setInterval\(\(\)=>\{if\(document\.visibilityState!=='hidden'\)gmwwSendGmPresence\(true\)\},20000\)/);
  assert.match(live,/async function refreshGmPresence\(/);
  assert.match(live,/startGmPresencePoll/);
});
test('Removing Sói GM never alters room/lobby admission or seating rules',()=>{
  assert.match(server,/roomCode:isValidRoomCode\(roomCode\)\?roomCode:""/);
  assert.ok(app.includes("roomCode:online!==false&&isLivePlayRoom()?String(playSceneState.roomCode||''):null"));
  assert.ok(app.includes("if(saved.step==='members')saved.step='seats'"));
  assert.doesNotMatch(app,/PLAY_STEPS=\[[^\]]*'members'/);
  assert.match(live,/const publicPlayers=villagePublicPlayers\(/);
});
test('V3.143: neither GM view nor Player Web creates the wolf rider or patrol',()=>{
  assert.doesNotMatch(app,/function renderPlayGmToken\(/);
  assert.doesNotMatch(app,/gmwwGmActorAt\(/);
  assert.doesNotMatch(app,/gmwwMoveGmCharacter\(/);
  assert.doesNotMatch(live,/function gmVillagePlayer\(/);
  assert.doesNotMatch(live,/GM_VILLAGE_MOVE_MS/);
  assert.doesNotMatch(live,/gmMotionTimer/);
  assert.doesNotMatch(live,/publicPlayers\.push\(gmPlayer\)/);
});
test('GM campfire control is kept and no IPA rebuild is required',()=>{
  assertCurrentRelease();
  assert.ok(app.includes("document.querySelector('.play-core-pearl')?.addEventListener('click',()=>{if(playSceneState.step==='battle'){battleToggleWolfMenu();return}openPlayCreateRoomSheet()});"));
  assert.match(html,/id="battleWolfMenu"/);
  assert.match(deploy,/Native IPA version does not match releaseVersion/);
  assert.match(deploy,/verify-ota-version-advance\.mjs/);
});
test('OTA releases retain manifest security and cache busting',()=>{
  assertCurrentRelease();
  assert.match(server,/UPDATE_CHANNEL_REV="runtime-3143"/);
  assert.match(server,/channel="\+encodeURIComponent\(UPDATE_CHANNEL_REV\)/);
  assert.match(server,/latestLostRuntime/);
});
