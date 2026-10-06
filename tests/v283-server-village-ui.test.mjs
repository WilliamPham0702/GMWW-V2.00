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

test('V2.92 GM lobby uses websocket-first realtime with fallback polling',()=>{
  assert.match(app,/ensurePlayRealtimePoll/);
  assert.match(app,/playSceneRuntime\.socket\.readyState!==WebSocket\.OPEN\)\)playSyncRoom\(false\)\},750\)/);
  assert.match(app,/connectPlaySocket\(\);ensurePlayRealtimePoll\(\)/);
});

test('V2.92 top menu mirrors bottom colors and auto-hides after 20 seconds',()=>{
  const auto=html.indexOf('id="playAutoGM"'),gm=html.indexOf('id="playRoomButton"'),info=html.indexOf('id="playPhasePill"'),refresh=html.indexOf('id="playRefreshServer"'),audio=html.indexOf('id="playAudioTop"');
  assert.ok(auto>=0&&gm>auto&&info>gm&&refresh>info&&audio>refresh);
  assert.match(html,/class="gm-top-menu-v292"/);
  assert.match(html,/gm-top-auto-v292/);
  assert.match(html,/gm-top-gm-v292/);
  assert.match(html,/gm-top-info-v292/);
  assert.match(html,/gm-top-realtime-v292/);
  assert.match(html,/gm-top-audio-v292/);
  assert.match(css,/V2\.92 TOP MENU — color-mirrored to bottom bar \+ 20s auto-hide/);
  assert.match(css,/grid-template-columns:52px 52px minmax\(0,1fr\) 52px 56px!important/);
  assert.match(css,/\.gm-top-auto-v292\{[\s\S]*background:rgba\(89,40,47,\.78\)!important/);
  assert.match(css,/\.gm-top-gm-v292,[\s\S]*\.gm-top-realtime-v292\{[\s\S]*background:rgba\(7,48,65,\.82\)!important/);
  assert.match(css,/\.gm-top-info-v292\{[\s\S]*linear-gradient\(180deg,rgba\(21,131,161,\.94\),rgba\(8,84,116,\.92\)\)!important/);
  assert.match(css,/\.gm-top-audio-v292\{[\s\S]*background:rgba\(82,63,25,\.78\)!important/);
  assert.match(css,/\.gm-top-menu-v292\.is-auto-hidden\{[\s\S]*translateY\(calc\(-100% \+ 8px\)\)/);
  assert.match(app,/const PLAY_TOP_MENU_IDLE_MS=20000/);
  assert.match(app,/function resetPlayTopMenuIdle\(\)/);
  assert.match(app,/setTimeout\(\(\)=>\{if\(document\.body\.classList\.contains\('play-immersive'\)\)setPlayTopMenuHidden\(true\)\},PLAY_TOP_MENU_IDLE_MS\)/);
  assert.match(app,/document\.addEventListener\('pointerdown',reveal/);
  assert.match(app,/document\.addEventListener\('touchstart',reveal/);
  assert.match(app,/document\.addEventListener\('keydown',reveal/);
  assert.match(app,/querySelector\('\.gm-top-icon-audio-v292'\)/);
});
test('GM player labels keep name and status above character, role below, all scaled with character',()=>{
  assert.match(app,/<div class="play-player-over"><b>'\+playEsc\(name\)\+'<\/b><small>'\+playEsc\(statusLabel\)/);
  assert.match(app,/play-player-role/);
  assert.match(css,/\.play-player-over\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.match(css,/\.play-player-role\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
  assert.match(css,/play-player-avatar img\{[^}]*scale\(var\(--gmww-character-scale,1\)\)/s);
});

test('bottom menu is a five-control game bar and pre-game panels are centered closable popups',()=>{
  assert.match(css,/body\.play-immersive #start \.play-control-bar\{/);
  assert.match(css,/grid-template-columns:52px 52px minmax\(0,1fr\) 52px 56px!important/);
  assert.match(css,/play-context-panel\.is-setup-popup\{[\s\S]*left:50%!important;[\s\S]*top:50%!important;[\s\S]*translate\(-50%,-50%\)/);
  assert.match(app,/play-context-close/);
  assert.match(app,/setupPopupClosed=true/);
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

test('Player Web mirrors scalable name/status above character and own role below',()=>{
  assert.match(village,/statusLabel:safeText\(p\.statusLabel/);
  assert.match(village,/roleName:safeText\(p\.roleName/);
  assert.match(village,/className="player-over"/);
  assert.match(village,/className="player-role"/);
  assert.match(villageCss,/\.player \.player-over[\s\S]*scale\(var\(--gmww-character-scale,1\)\)/);
  assert.match(villageCss,/\.player \.player-role[\s\S]*scale\(var\(--gmww-character-scale,1\)\)/);
});
