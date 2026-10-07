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

test('V3.01 has one centered Create Room page and hides generated room code',()=>{
  assert.match(html,/id="playCreateRoomSheet"/);
  assert.equal((html.match(/id="playCreateRoomSheet"/g)||[]).length,1);
  assert.doesNotMatch(html,/id="playCreateRoomCode"/);
  assert.match(html,/id="playCreateRoomName"/);
  assert.match(html,/id="playCreateRoomSeatCount"/);
  assert.match(html,/id="playCreateRoomReset"/);
  assert.match(html,/id="playCreateRoomDelete"/);
  assert.match(html,/data-play-room-mode="online"/);
  assert.match(html,/data-play-room-mode="offline"/);
  assert.match(html,/id="playCreateRoomEnabled"/);
  assert.match(html,/TẠO PHÒNG/);
  assert.match(appCss,/\.play-center-sheet\{[\s\S]*align-items:center!important;[\s\S]*justify-content:center!important/);
});

test('Create Room advances to Member selection before seating',()=>{
  assert.match(app,/playSceneState\.step='members';playSceneState\.activePlayerId=''/);
  assert.match(app,/seatMoveMode:'instant'/);
  assert.match(app,/THỦ CÔNG/);
  assert.match(app,/NGẪU NHIÊN/);
  assert.match(app,/Chọn một Người Chơi rồi chạm dấu \+ để xếp chỗ/);
  assert.match(app,/playRoomApi\('\/seats\/randomize-remaining'/);
  assert.match(app,/playRoomApi\('\/seat'/);
});

test('V3.01 only GM can assign seats',()=>{
  assert.match(server,/GM_SEAT_ASSIGNMENT_REQUIRED/);
  assert.match(server,/Người chơi không thể tự đăng ký ghế/);
  assert.match(server,/Ghế chỉ do GM phân phối/);
  assert.match(server,/async gmSeat\(/);
  assert.match(server,/async gmRandomizeRemainingSeats\(/);
  assert.doesNotMatch(live,/claimVillageSeat/);
  assert.doesNotMatch(live,/gmww:portal-click/);
});

test('V3.01 Player Web has Ready and Leave Seat only after GM assigns a seat',()=>{
  assert.match(live,/RỜI GHẾ/);
  assert.match(live,/SẴN SÀNG/);
  assert.match(live,/async function releaseMySeat\(/);
  assert.match(live,/rb\.hidden=!seated;sb\.hidden=!seated/);
  assert.match(live,/Chờ GM xếp chỗ trước khi Sẵn Sàng/);
});

test('V3.01 removes Mystery Portal completely',()=>{
  assert.doesNotMatch(live,/BÍ CẢNH/);
  assert.doesNotMatch(live,/CỔNG BÍ CẢNH/);
  assert.doesNotMatch(live,/enterOpenRoomPortal/);
  assert.doesNotMatch(village,/gmww:portal-click/);
  assert.match(village,/function renderPortal\(\)\{document\.getElementById\('gmwwPortal'\)\?\.remove\(\)/);
});

test('V3.01 uses clean circular plus markers and assigned players remain seated',()=>{
  assert.match(appCss,/\.play-player-token\.is-empty \.play-player-avatar\{[\s\S]*width:44px!important;height:44px!important;[\s\S]*border:0!important;border-radius:50%!important/);
  assert.match(villageCss,/\.seat-empty \.seat-dot\{[\s\S]*width:44px!important;height:44px!important;border:0!important;border-radius:50%!important/);
  assert.match(village,/return Number\(data\?\.seatId\|\|0\)>0\|\|/);
  assert.match(app,/function playCharacterSitting\([^)]*\)[\s\S]*Number\(member\?\.seatId\|\|0\)>0/);
});
