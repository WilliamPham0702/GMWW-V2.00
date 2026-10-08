import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/build-server-game-ipa.yml',import.meta.url),'utf8');

test('V3.17 runtime keeps offline/online room flow with GM-only seating',()=>{
  assert.ok(app.includes("const VERSION='3.34';"));
  assert.ok(html.includes('GMWW V3.34'));
  assert.match(app,/roomMode:playSceneState\.roomMode,enabled:playSceneState\.roomEnabled===true,seatMoveMode:'instant',seatCount:playSceneState\.seatCount/);
  assert.match(html,/id="playRoomModeToggle"/);
  assert.doesNotMatch(html,/data-play-room-mode=/);
  assert.match(html,/id="playCreateRoomName"/);
  assert.doesNotMatch(html,/id="playCreateRoomSeatCount"/);
  assert.doesNotMatch(html,/data-play-seat-move=/);
  assert.match(app,/seatMoveMode:'instant'/);
});

test('IPA renders fixed seat IDs and prefers game characters over legacy avatars',()=>{
  assert.match(app,/bySeat=new Map\(\(previewNew\?\[\]:playLiveMembers\(\)\)\.filter\(m=>Number\(m\?\.seatId\|\|0\)>0\)\.map\(m=>\[Number\(m\.seatId\),m\]\)\)/);
  assert.match(app,/play-player-over/);
  assert.match(app,/play-player-role/);
  assert.match(app,/playCharacterUrl\(m\.gameCharacterId\)/);
  assert.match(app,/memberAvatarUrl\(m\.gameCharacterId\|\|m\.avatarId\)/);
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
  assert.match(server,/async playerMove\(body\)/);
  assert.match(server,/async playerMoveComplete\(body\)/);
  assert.match(server,/moveTargetSeatId/);
  assert.match(server,/seatClaimConflict/);
});

test('Server keeps compatibility fields and room directory settings',()=>{
  assert.match(server,/avatarId:m\.avatarId,gameCharacterId:/);
  assert.match(server,/roomMode:normalizeRoomMode\(body\?\.roomMode\|\|old\?\.roomMode\)/);
  assert.match(server,/seatCount:normalizeSeatCount\(body\?\.seatCount,old\?\.seatCount\|\|12\)/);
  assert.match(server,/for\(const p of Object\.values\(players\)\)\{p\.ready=playerSetupComplete\(meta,p\);p\.reservedByGM=true\}/);
});

test('2D play surface uses detailed day/night assets bundled with every character',()=>{
  assert.match(css,/#start\.play-page \.play-shell,#start\.play-page \.play-shell \*\{backdrop-filter:none!important/);
  assert.match(css,/url\("gmww-village-coast\.svg"\)/);
  assert.doesNotMatch(css,/\.play-sky-glow[^\n]*filter:blur/);
  assert.doesNotMatch(css,/\.play-cloud[^\n]*filter:blur/);
  assert.match(workflow,/cp server-game\/current\/gmww-village-coast\.svg/);
  assert.match(workflow,/test -s "\$APP\/Web\/gmww-village-coast\.svg"/);
  assert.match(css,/url\("gmww-village-day-v260\.webp"\)/);
  assert.match(css,/url\("gmww-village-night-v260\.webp"\)/);
  assert.match(workflow,/cp assets\/characters\/v253\/chibi-\*\.webp/);
  assert.match(css,/#start \.play-island-back[^}]+display:none/s);
  assert.match(css,/object-fit:contain;border-radius:0;display:block;background:transparent/);
});

test('Player Web card preview keeps V2.52 art-title-info layout and compact faction badge',()=>{
  const art=html.indexOf('card-zone card-zone-art');
  const head=html.indexOf('card-zone card-zone-head');
  const info=html.indexOf('card-zone card-zone-info');
  assert.ok(art>=0&&head>art&&info>head);
  assert.match(html,/id="playerDisplay" width="3072" height="2560"/);
  assert.match(css,/grid-template-rows:8fr 1fr 3fr/);
  assert.match(css,/\.player-faction-badge\{[^}]*width:34px;[^}]*height:34px/s);
  assert.match(app,/badge\.textContent=f\.icon;badge\.setAttribute\('aria-label',f\.label\)/);
  assert.doesNotMatch(app,/badge\.textContent=f\.icon\+' '\+f\.label/);
});


test('GM Play uses the seven-stage village flow with a lobby and no Member tab',()=>{
  assert.match(app,/PLAY_STEPS=\['lobby','room','seats','game','roles','deal','battle'\]/);
  assert.match(app,/function setPlayStep\(step\)\{if\(step==='members'\)step='seats'/);
  assert.match(html,/id="playExitVillage"/);
  assert.match(html,/data-play-step="seats"/);
  assert.match(css,/body\.play-immersive #bottomNav\{display:none!important\}/);
  assert.match(css,/gmwwCampfireFlicker/);
  assert.match(app,/playVillageMembers/);
  assert.match(app,/playRandomSeatRemaining/);
});

test('position stage preserves occupied positions, supports swap/random remainder and position lock',()=>{
  assert.match(app,/remaining=playLiveMembers\(\)\.filter\(m=>!Number\(m\?\.seatId\|\|0\)\)/);
  assert.match(app,/updateSelectedPlayerSeat\(\{seatId:Number\(m\.seatId\),swap:true\}\)/);
  assert.match(app,/\/seats\/randomize-remaining/);
  assert.match(server,/async gmRandomizeRemainingSeats\(request\)/);
  assert.match(server,/remaining=entries\.filter\(\(\[,player\]\)=>!normalizeSeatId\(player\?\.seatId,seatCount\)&&!player\?\.moveTargetSeatId\)/);
  assert.match(server,/gmRandomSeatsRoute/);
  assert.match(server,/seatsRandomized:true/);
  assert.match(app,/\/seat-lock/);
  assert.match(app,/play-seat-leaf-art/);
  assert.doesNotMatch(app,/🪑/);
  assert.match(server,/async gmSeatLock\(/);
  assert.match(server,/meta\.seatsLocked/);
  assert.match(server,/error:"SEATS_LOCKED"/);
});

test('saved game templates are precompiled on server but remain GM-only until role delivery',()=>{
  assert.match(server,/gameTemplateUpsert/);
  assert.match(server,/gameTemplateList/);
  assert.match(server,/\/api\/gm\/game-templates/);
  assert.match(server,/preloadedAt/);
  assert.match(server,/defaultActionSec/);
  assert.match(server,/actionDurationSec/);
  assert.match(app,/\/api\/gm\/game-templates/);
  assert.match(html,/playVillageDiscussionSec/);
  assert.match(html,/playWolfDiscussionSec/);
  assert.match(html,/playDefaultActionSec/);
  const start=server.indexOf('async publicState()'),end=server.indexOf('async gmAuthorized',start),publicState=server.slice(start,end);
  assert.doesNotMatch(publicState,/gameConfig|gameTemplate/);
});

test('V1.09 preservation contract keeps existing engine and local settings while changing Play flow',()=>{
  assert.match(app,/OLD_STATE_KEYS=\['GMWW_V257_STATE','GMWW_V256_STATE'/);
  assert.match(app,/GMWW_V109_STATE/);
  assert.match(app,/GMWW_V1_09_PREFS/);
  assert.match(app,/DB_NAME='GMWW_V208_THEME_ASSETS'/);
  assert.match(app,/LEGACY_V1_ASSET_DBS=\['GMWW_ASSETS_921','GMWW_THEME_ASSETS_946','GMWW_THEME_UI_987','GMWW_MATCH_CACHE_933','GMWW_AUDIO_LIBRARY'\]/);
  assert.match(app,/async function migrateLegacyV1Assets\(\)/);
  assert.match(app,/await migrateLegacyV1Assets\(\)/);
  assert.match(app,/auditLocalData/);
  assert.match(app,/clearSafeRuntimeCache/);
  assert.match(app,/applyActiveThemeUi/);
  assert.match(app,/audio_card_role_wolf/);
});

// V3.22 lobby-first flow assertions synchronized for CI.
