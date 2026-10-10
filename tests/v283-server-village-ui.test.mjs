import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const app=read('server-game/current/app.js');
const css=read('server-game/current/style.css');
const html=read('server-game/current/GMWW.html');
const server=read('src/index.js');
const live=read('src/gmww-members-live.js');
const village=read('assets/village/village.mjs');
const villageCss=read('assets/village/village.css');
const membersPage=read('src/gmww-members-page.js');

test('V2.93 GM lobby uses websocket-first realtime with fallback polling',()=>{
  assert.match(app,/ensurePlayRealtimePoll/);
  assert.match(app,/playSceneRuntime\.socket\.readyState!==WebSocket\.OPEN\)\)playSyncRoom\(false\)\},750\)/);
  assert.match(app,/connectPlaySocket\(\);ensurePlayRealtimePoll\(\)/);
});

test('V3.25 auto-hides the top timeline and bottom five-control dock after 30 seconds',()=>{
  const ids=['playExitVillage','playAutoGM','playPhasePill','playAudioTop','playEndGame'];
  let cursor=-1;for(const id of ids){const pos=html.indexOf('id="'+id+'"');assert.ok(pos>cursor);cursor=pos}
  assert.match(html,/class="gm-top-menu-v293 gm-bottom-menu-v325(?: gm-stage-dock-v330)?"/);
  assert.match(html,/id="playSetupStrip"/);
  assert.doesNotMatch(html,/<footer class="play-control-bar/);
  assert.match(css,/V3\.25: single seven-step top timeline and frosted five-control bottom dock/);
  assert.match(css,/#playSetupStrip\.play-setup-strip\.is-auto-hidden/);
  assert.match(css,/#gmTopMenu\.gm-top-menu-v293\.is-auto-hidden/);
  assert.ok(css.includes('transform:translateY(calc(100% + env(safe-area-inset-bottom) + 18px))!important;'));
  assert.match(app,/const PLAY_GAME_CHROME_IDLE_MS=30000/);
  assert.ok(app.includes("const top=document.getElementById('playSetupStrip'),bottom=document.getElementById('gmTopMenu')"));
  assert.match(app,/\[top,bottom,gather\]\.forEach/);
  assert.match(app,/setPlayGameChromeHidden\(false\);clearPlayGameChromeIdle\(\)/);
  assert.match(app,/setPlayGameChromeHidden\(true\)/);
  assert.match(app,/document\.addEventListener\('pointerdown',reveal/);
  assert.match(app,/document\.addEventListener\('touchstart',reveal/);
  assert.match(app,/querySelector\('\.gm-top-icon-audio-v293'\)/);
});
test('GM player labels keep name and status fixed while only character artwork scales',()=>{
  assert.match(app,/<div class="play-player-over"><b>'\+playEsc\(name\)\+'<\/b>'\+\(statusLabel\?/);
  assert.match(app,/statusLabel\?'<small>'\+playEsc\(statusLabel\)/);
  assert.match(app,/play-player-role/);
  assert.match(css,/\.play-player-over\{[^}]*transform:translateX\(-50%\)[^}]*\}/s);
  assert.doesNotMatch(css,/\.play-player-over\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.match(css,/\.play-player-role\{[^}]*transform:none!important/s);
  assert.doesNotMatch(css,/\.play-player-role\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.match(css,/play-player-avatar img\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
});

test('V3.25 removes the old three-button footer and retains all core GM actions',()=>{
  assert.doesNotMatch(html,/play-control-bar-three|id="playBack"|id="playPrimaryAction"|id="playNext"/);
  for(const id of ['playExitVillage','playAutoGM','playPhasePill','playAudioTop','playEndGame'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.ok(html.indexOf('id="playSetupStrip"')<html.indexOf('id="gmTopMenu"'));
  assert.match(css,/#gmTopMenu\.gm-top-menu-v293\{/);
  assert.match(app,/handlePlayTimelineStep\(b\.dataset\.playStep\)/);
  assert.doesNotMatch(html,/id="playContextPanel"/);
  assert.doesNotMatch(app,/renderPlayContext\(\);const context=/);
});
test('Player Web uses the full desktop viewport while auth stays compact and mobile remains viewport-native',()=>{
  assert.match(membersPage,/\.app\{width:100%;max-width:none;min-height:100dvh;margin:0/);
  assert.doesNotMatch(membersPage,/\.app\{width:min\(430px,100%\)/);
  assert.match(membersPage,/#login \.panel,#create \.panel,#reset \.panel\{width:min\(100%,430px\);margin-left:auto;margin-right:auto\}/);
  assert.match(membersPage,/\.demo-toggle\{position:fixed;right:max\(12px,calc\(env\(safe-area-inset-right\) \+ 12px\)\)/);
  assert.match(live,/function ensureDesktopResponsiveStyle\(\)/);
  assert.match(live,/@media \(min-width:768px\)\{#profile\.screen\.active\{[^}]*width:100vw!important;[^}]*height:100dvh!important/s);
  assert.match(live,/#profile \.profile-main\{width:min\(92vw,1100px\)!important/);
  assert.match(live,/#rooms\.screen\.active\{[^}]*width:100vw!important;[^}]*height:100dvh!important/s);
  assert.match(live,/#rooms \.room-list\{grid-template-columns:repeat\(auto-fit,minmax\(320px,1fr\)\)!important/);
  assert.match(live,/ensureDesktopResponsiveStyle\(\);\\n  return hud/);
});

test('GM sheet exposes immediate Kill and Revive and server implements revive',()=>{
  assert.match(html,/id="playGMSheet"/);
  assert.match(html,/id="playGMRevive"/);
  assert.match(html,/id="playGMKill"/);
  assert.match(app,/applyPlayPlayerState\('revive'\)/);
  assert.match(app,/applyPlayPlayerState\('dead'\)/);
  assert.match(server,/if\(type==="revive"\)/);
  assert.match(server,/expiredReason="GM_REVIVE"/);
  assert.match(server,/type:"player_revived"/);
});

test('room presence is websocket-authoritative with realtime heartbeat and disconnect state',()=>{
  assert.match(server,/ROOM_PLAYER_TTL=70\*1000/);
  assert.match(server,/async webSocketMessage\(ws,message\)/);
  assert.match(server,/presenceChanged:true/);
  assert.match(server,/async markSocketDisconnected\(ws\)/);
  assert.match(server,/lastHeartbeatAt=0/);
  assert.match(live,/wsPingTimer=setInterval/);
  assert.match(live,/JSON\.stringify\(\{type:'ping'/);
});

test('Player Web keeps name/status and role fixed while character artwork scales',()=>{
  assert.match(village,/statusLabel:safeText\(p\.statusLabel/);
  assert.match(village,/roleName:safeText\(p\.roleName/);
  assert.match(village,/className="player-over"/);
  assert.match(village,/className="player-role"/);
  assert.match(villageCss,/\.player \.portrait\.game-character img\{[^}]*transform:scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.doesNotMatch(villageCss,/\.player \.player-over\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.doesNotMatch(villageCss,/\.player \.player-role\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
});
