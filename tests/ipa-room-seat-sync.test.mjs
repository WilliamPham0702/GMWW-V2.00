import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/build-server-game-ipa.yml',import.meta.url),'utf8');

test('IPA V2.50 creates offline/online rooms with a fixed seat count',()=>{
  assert.match(app,/const VERSION='2\.50'/);
  assert.match(html,/GMWW V2\.50/);
  assert.match(app,/roomMode:playSceneState\.roomMode,seatCount:playSceneState\.seatCount/);
  assert.match(html,/data-play-room-mode="offline"/);
  assert.match(html,/data-play-room-mode="online"/);
  assert.match(html,/id="playSeatCount"/);
});

test('IPA renders fixed seat IDs and prefers game characters over legacy avatars',()=>{
  assert.match(app,/bySeat=new Map\(members\.map\(m=>\[Number\(m\?\.seatId\|\|0\),m\]\)\)/);
  assert.match(app,/S'\+seatId\+' · '/);
  assert.match(app,/playCharacterUrl\(m\.gameCharacterId\)/);
  assert.match(app,/memberAvatarUrl\(m\.avatarId\)/);
  assert.match(html,/id="playSeatSheet"/);
  assert.match(app,/\/seat'.*swap:/s);
});

test('Server preserves disconnected seats and exposes GM seat control',()=>{
  assert.match(server,/A disconnected player keeps the same fixed seat/);
  assert.match(server,/async gmSeat\(request,body\)/);
  assert.match(server,/error:"SEAT_TAKEN"/);
  assert.match(server,/body\?\.swap===true/);
  assert.match(server,/body\?\.replace===true/);
  assert.match(server,/gmSeatRoute/);
});

test('Server keeps compatibility fields and room directory settings',()=>{
  assert.match(server,/avatarId:m\.avatarId,gameCharacterId:/);
  assert.match(server,/roomMode:normalizeRoomMode\(body\?\.roomMode\|\|old\?\.roomMode\)/);
  assert.match(server,/seatCount:normalizeSeatCount\(body\?\.seatCount,old\?\.seatCount\|\|12\)/);
  assert.match(server,/for\(const p of Object\.values\(players\)\)\{p\.ready=playerSetupComplete\(meta,p\);p\.reservedByGM=true\}/);
});

test('2D play surface disables blur without replacing the legacy village asset',()=>{
  assert.match(css,/#start\.play-page \.play-shell,#start\.play-page \.play-shell \*\{backdrop-filter:none!important/);
  assert.match(css,/url\("gmww-village-coast\.svg"\)/);
  assert.doesNotMatch(css,/\.play-sky-glow[^\n]*filter:blur/);
  assert.doesNotMatch(css,/\.play-cloud[^\n]*filter:blur/);
  assert.match(workflow,/cp server-game\/current\/gmww-village-coast\.svg/);
  assert.match(workflow,/test -s "\$APP\/Web\/gmww-village-coast\.svg"/);
});
