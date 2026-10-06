import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const app=read('server-game/current/app.js');
const appCss=read('server-game/current/style.css');
const server=read('src/index.js');
const live=read('src/gmww-members-live.js');
const village=read('assets/village/village.mjs');
const villageCss=read('assets/village/village.css');
const villageHtml=read('assets/village/index.html');

test('V2.94 Create Room is a centered closable page with the approved fields and controls',()=>{
  assert.match(html,/id="playCreateRoomSheet"/);
  assert.match(html,/class="sheet hidden play-center-sheet"/);
  assert.match(html,/id="playCreateRoomClose"/);
  assert.match(html,/id="playCreateRoomCode"/);
  assert.match(html,/id="playCreateRoomName"/);
  assert.match(html,/id="playCreateRoomReset"/);
  assert.match(html,/id="playCreateRoomDelete"/);
  assert.match(html,/data-play-room-mode="online"/);
  assert.match(html,/data-play-room-mode="offline"/);
  assert.match(html,/id="playCreateRoomEnabled"/);
  assert.match(html,/id="playCreateRoomNext"/);
  assert.doesNotMatch(html,/id="playCreateRoomCapacity"/);
  assert.match(appCss,/\.play-center-sheet\{[\s\S]*align-items:center!important;[\s\S]*justify-content:center!important/);
  assert.match(appCss,/#playCreateRoomSheet \.play-room-page-card/);
});

test('V2.94 GM Create Room uses real Live, rename, reset, delete and next APIs',()=>{
  assert.match(app,/roomEnabled:false/);
  assert.match(app,/function renderPlayCreateRoomSheet\(\)/);
  assert.match(app,/async function playToggleRoomEnabled\(\)/);
  assert.match(app,/playRoomApi\('\/enabled'/);
  assert.match(app,/playRoomApi\('\/rename'/);
  assert.match(app,/playRoomApi\('\/reset'/);
  assert.match(app,/playRoomApi\('\/delete'/);
  assert.match(app,/enabled:playSceneState\.roomEnabled===true/);
  assert.match(app,/seatMoveMode:'walk'/);
  assert.match(app,/playSceneState\.step='members'/);
  assert.match(app,/document\.getElementById\('playCreateRoomNext'\).*playCreateRoomNext/);
});

test('V2.94 server only publishes enabled rooms and gives new joiners a portal-arrival walk',()=>{
  assert.match(server,/enabled=b&&Object\.prototype\.hasOwnProperty\.call\(b,"enabled"\)\?b\.enabled!==false:true/);
  assert.match(server,/enabled:Object\.prototype\.hasOwnProperty\.call\(body,"enabled"\)\?body\.enabled!==false:true/);
  assert.match(server,/if\(!includeDisabled&&r\?\.enabled===false\)continue/);
  assert.match(server,/roomWasEnabled=meta\.enabled!==false/);
  assert.match(server,/meta\.enabled=roomWasEnabled/);
  assert.match(server,/const portalNow=Date\.now\(\),from=\{x:50,y:12\},to=\{x:50,y:23\}/);
  assert.match(server,/player\.villageActivity="portal_arrival"/);
});

test('V2.94 Player Web discovers Live rooms and enters by walking into the Mystery Portal',()=>{
  assert.match(live,/Promise\.all\(\[api\('\/api\/village'\),api\('\/api\/rooms'\)\]\)/);
  assert.match(live,/portalPendingRoomCode/);
  assert.match(live,/async function enterOpenRoomPortal\(/);
  assert.match(live,/Bí cảnh đã mở • Đang đi vào cổng/);
  assert.match(live,/mode:'join'/);
  assert.match(live,/label:'BÍ CẢNH ĐÃ MỞ'/);
  assert.match(live,/mode:'arrival'/);
  assert.match(live,/label:'CỔNG BÍ CẢNH'/);
  assert.match(live,/gmww:portal-click/);
  assert.match(live,/joinRoom\(code\)/);
  assert.match(live,/iframe\.src='\/village\/\?embed=1&v=294'/);
  assert.doesNotMatch(live,/if\(d\.setupRequired\|\|!d\.player\?\.setupComplete\)await openRoomSetup\(\)/);
});

test('V2.94 tapping a plus selects the seat and makes the player Ready automatically',()=>{
  assert.match(villageCss,/\.seat-empty \.seat-dot::before\{content:"\+"/);
  assert.match(live,/function showSeatChoice\(seatId,x,y\)\{[\s\S]*startSeatWalk\(seatId,x,y\)[\s\S]*claimVillageSeat\(seatId\)/);
  assert.match(live,/async function readyAfterSeat\(\)/);
  assert.match(live,/ready:true/);
  assert.match(live,/await readyAfterSeat\(\)/);
  assert.match(live,/Đã chọn vị trí '\+next\.seatId\+' • SẴN SÀNG/);
  assert.match(live,/d\.querySelector\('\.seat'\)\.hidden=true;d\.querySelector\('\.ready'\)\.hidden=true/);
});

test('V2.94 village renders a cyan-gold Mystery Portal at fire and an arrival portal at the stairs',()=>{
  assert.match(village,/function renderPortal\(\)/);
  assert.match(village,/join\?layout\.fire:layout\.clampPoint/);
  assert.match(village,/window\.parent\.postMessage\(\{type:"gmww:portal-click"/);
  assert.match(village,/BÍ CẢNH ĐÃ MỞ/);
  assert.match(village,/gmww-portal-notice/);
  assert.match(villageCss,/V2\.94 Mystery Portal/);
  assert.match(villageCss,/\.gmww-portal \.portal-ring-a/);
  assert.match(villageCss,/rgba\(255,224,126,\.72\)/);
  assert.match(villageHtml,/GMWW V2\.94 · Ngôi làng/);
  assert.match(villageHtml,/village\.mjs\?v=294/);
});
