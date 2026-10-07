import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('GM Create Room primary action opens room selector instead of silently advancing',()=>{
  assert.match(app,/playPrimaryAction'\)\?\.addEventListener\('click',\(\)=>\{\s*if\(playSceneState\.step==='room'\)\{openPlayCreateRoomSheet\(\);return\}/);
  assert.match(app,/async function playCreateRoomNext\(\)\{[\s\S]*if\(!isLivePlayRoom\(\)\)\{\s*await openPlayCreateRoomSheet\(\)/);
  assert.doesNotMatch(app,/if\(!isLivePlayRoom\(\)\)\{const ok=await playCreateRoom\(\)/);
});

test('GM new rooms preview exactly 24 leaf markers, and old user rooms keep their seat count',()=>{
  assert.match(app,/seatCount:24,autoGM:true/);
  assert.match(app,/previewNew\?24:playSeatStats\(\)\.seatCount/);
  assert.match(app,/for\(let i=0;i<seatCount;i\+\+\)/);
  assert.match(app,/playSeatPositions\(seatCount\)/);
  assert.match(app,/previewNew\?\[\]:playVillageMembers\(\)/);
  assert.match(app,/src="village\/seat-leaf\.webp\?v=320"/);
});

test('Legacy unnamed rooms are normalized without creating or deleting user rooms',()=>{
  assert.match(app,/function playReadableRoomName\(value\)/);
  assert.match(app,/\/\^\(Phòng GMWW\|Phòng Online\)\$\/i/);
  assert.match(app,/Number\(data\.room\?\.seatCount\)===12&&\!data\.room\?\.seatsLocked&&\!\(data\.players\|\|\[\]\)\.length/);
  assert.match(app,/await playUpdateRoomSettings\(\{seatCount:24\}\)/);
  assert.match(worker,/normalizeRoomName\(b\?\.roomName\)\|\|String\(cfg\?\.name\|\|"Làng Asahi"\)/);
  assert.doesNotMatch(html,/return 'Phòng GMWW'/);
});

test('Every GM game dialog centers its action buttons',()=>{
  assert.match(css,/#playEndSheet \.play-roster-actions\{/);
  assert.match(css,/#playCreateRoomSheet \.play-room-edit-actions/);
  assert.match(css,/justify-content:center!important/);
  assert.match(css,/align-items:center!important/);
  assert.match(css,/text-align:center!important/);
});
