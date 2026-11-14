import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript as script} from '../src/gmww-members-live.js';

const part=playerWebSource('37-player-rooms');

test('shipped Player Web script contains the player-room panel and it parses',()=>{
  assert.ok(script.includes('gmwwPlayerRooms'));
  assert.doesNotThrow(()=>new Function(script));
});
// The existing public artwork endpoint is allowed only as an image src, never as an owner API call.
const artworkSource=/(?:img|image)\.src='\/api\/gm\/template-role-artwork\/'\+encodeURIComponent\(r\.roleId\);/g;
const ownerSource=part.replace(artworkSource,'');
test('panel keeps owner API calls isolated; public artwork is only an image GET',()=>{
  assert.equal([...part.matchAll(artworkSource)].length,2);
  const worker=workerSource();
  assert.ok(worker.includes('if(templateRoleArtwork&&request.method==="GET")'));

  const urls=[...ownerSource.matchAll(/'(\/api\/[^']*)'/g)].map(m=>m[1]);
  assert.ok(urls.length>=2);
  for(const u of urls)assert.match(u,/^\/api\/player-rooms/,u);
  assert.doesNotMatch(ownerSource,/gmToken|gm-observer|\/api\/gm\/|assignments|roleId\b.*assign/);
});
test('owner actions used by the panel are exactly the ones the Worker whitelists',()=>{
  const used=[...part.matchAll(/callOwner\('([a-z-]+)'/g)].map(m=>m[1]);
  const allowed=['template','room-lock','quick-start','seat-lock','seats-randomize','start','kick','end','replay','auto','stage','room-settings','roles-shuffle','close','template-save','template-delete'];
  assert.ok(used.length>=7);for(const u of used)assert.ok(allowed.includes(u),u);
});
test('owner token is kept only under its own storage key and cleared when the room closes',()=>{
  assert.match(part,/KEY='gmwwOwnedRoom'/);assert.match(part,/save\(null\)/);
});
test('assembler lists the new part in order after the GM observer',()=>{
  const a=readFileSync(new URL('../.github/scripts/source-groups.mjs',import.meta.url),'utf8');
  assert.ok(a.indexOf("'36-gm-observer'")>0&&a.indexOf("'36-gm-observer'")<a.indexOf("'37-player-rooms'")&&a.indexOf("'37-player-rooms'")<a.indexOf("'40-cards-and-game'"));
});

test('server bottom bar is bundled from the GM app, the plus button and Top 3 are gone',()=>{
  assert.ok(script.includes('gmTopMenu')&&script.includes('playPhasePill'));
  assert.doesNotMatch(part,/gmww-pr-fab|'＋'/);
  assert.match(part,/#gmwwSetupTop3\{display:none!important\}/);
  assert.match(part,/GMWW_SERVER_MENU\.dock/);
  assert.match(part,/gmwwOpenCreateRoom/);
});

test('creating a room enters the village so the bar shows, and players can join by code',()=>{
  assert.match(part,/await enterVillage\(\)/);
  assert.match(part,/joinByCode/);assert.match(part,/host\.id='gmwwStageStrip'/);assert.match(part,/barScreen/);assert.doesNotMatch(part,/profile-actions-row/);
  const urls=[...ownerSource.matchAll(/'(\/api\/[^']*)'/g)].map(m=>m[1]);for(const u of urls)assert.match(u,/^\/api\/player-rooms/);
});

test('Phòng Game page sits between Sảnh chờ and Tập hợp and offers send + joined list',()=>{
  assert.match(part,/\['lobby','Sảnh chờ'\],\['room','Phòng Game'\],\['seats','Tập hợp'\]/);
  assert.match(part,/Gửi phòng/);assert.match(part,/Sao chép mã/);assert.doesNotMatch(part,/btn\('Tạo phòng riêng'/);assert.match(part,/Vào Game/);assert.match(part,/ĐÃ VÀO PHÒNG/);assert.match(part,/navigator\.share/);
});
test('GM Player Web list shows every room with kind and status; players list no longer shares the rooms container',()=>{
  const gm=playerWebSource('36-gm-observer');
  assert.match(gm,/PHÒNG GAME/);assert.match(gm,/NGƯỜI CHƠI/);assert.match(gm,/gmww-gmobs-players/);
  assert.match(script,/gmww-gmobs-players/);
});

test('Quick Play V2 top bar replaces legacy seven-step menu even before a room exists',()=>{
  assert.match(part,/const quickMode=\(\)=>!state\?\.roomCode/);
  assert.match(part,/const QUICK_ORDER=\[\['lobby','Sảnh Chờ'\],\['room','Tạo Phòng'\],\['game','Ván Mẫu'\],\['deal','Bắt Đầu'\]\]/);
  assert.match(part,/function ensureQuickStrip\(\)/);
  assert.match(part,/host\.id='gmwwQuickStageStrip'/);
  assert.match(part,/nav id="quickSetupStrip" aria-label="Chơi nhanh V2"/);
  assert.match(part,/strip\.hidden=!show\|\|quick\|\|chatTyping;quickStrip\.hidden=!show\|\|!quick\|\|chatTyping/);
  assert.match(part,/return\{top:rect\('gmwwQuickStageStrip','quickSetupStrip'\)\|\|rect\('gmwwStageStrip','playSetupStrip'\)/);
  assert.doesNotMatch(part,/const tabs=el\('nav','gmww-pr-steps gmww-pr-quicksteps'\)/,
    'the setup sheet must not contain a duplicate four-step menu');
});

test('Quick Play V2 removes the old three-section Phòng page from the default flow',()=>{
  assert.match(part,/if\(isQuick\)\{/);
  assert.match(part,/if\(!hasRoom\)viewQuickEntry\(sec\)/);
  assert.match(part,/function viewQuickEntry\(box\)/);
  assert.match(part,/MỞ PHÒNG/);
  assert.match(part,/Nhập mã phòng/);
  assert.doesNotMatch(part,/TẠO PHÒNG RIÊNG/);
  assert.match(part,/MỞ PHÒNG/);
  assert.match(part,/if\(quickMode\(\)\)\{/);
  assert.match(part,/QUICK_ORDER\.some\(s=>s\[0\]===k\)/);
  assert.match(part,/pr\.view=QUICK_ORDER\.some/);
  assert.match(part,/viewRoomHub\(body/,'the advanced, non-quick room still retains legacy controls');
});
test('Quick Play V2 separates four stages, owner-only template selection and atomic start',()=>{
  assert.match(part,/\['lobby','Sảnh chờ'\],\['room','Phòng Game'\]/);
  assert.match(part,/\['lobby','Sảnh Chờ'\],\['room','Tạo Phòng'\],\['game','Ván Mẫu'\],\['deal','Bắt Đầu'\]/);
  assert.match(part,/function renderQuickPlay\(box,players,st\)/);
  assert.match(part,/function viewQuickStart\(box,st,room,players\)/);
  assert.match(part,/function viewQuickRoom\(box,st,room,players\)/);
  assert.match(part,/quickPlayRevision:chosen\.revision/);
  assert.match(part,/if\(!owner\)return;/);
  assert.match(part,/callOwner\('room-lock','POST'/);
  assert.match(part,/callOwner\('quick-start','POST'/);
  assert.match(part,/quickPlayRoster:roster/);
  assert.match(part,/Danh sách vai trò và số lượng/);
  assert.match(part,/Dùng Artifact/);
  assert.match(part,/Cài đặt thời gian \(mặc định ẩn\)/);
  assert.match(part,/if\(!room\.quickPlay\)line2\.append/);
  assert.match(part,/strip\.hidden=!show\|\|quick/);
});

test('Quick Play V2 keyboard keeps chat composer in visible viewport without dock overlap',()=>{
  assert.match(part,/function placeChat\(page\)/);
  assert.match(part,/const vp=window\.visualViewport/);
  assert.match(part,/visibleTop\+\(Number\(vp\?\.height\)\|\|innerHeight\)/);
  assert.match(part,/if\(panel\.id==='gmwwPrChat'\)\{placeChat\(panel\);return\}/);
  assert.match(part,/visualViewport\?\.addEventListener\('resize',replace/);
  assert.match(part,/visualViewport\?\.addEventListener\('scroll',replace/);
  assert.match(part,/dock\.hidden=!show\|\|pr\.chatOpen/);
  assert.match(part,/chatTyping=pr\.chatOpen&&document\.activeElement\?\.id==='gmwwChatText'/);
  assert.match(part,/\.gmww-pr-chatpage #gmwwChatLines\{[^}]*flex:1 1 auto!important/);
  assert.match(part,/\.gmww-pr-chatpage #gmwwChatForm\{[^}]*flex:0 0 auto!important/);
  assert.doesNotMatch(part,/document\.getElementById\('gmwwChatText'\)\?\.focus/);
  assert.match(part,/chatPage\.addEventListener\('focusin',replace\)/);
});

test('Quick Play V2: Copy code + Delete and Room lock + Ván Mẫu share paired action rows',()=>{
  assert.match(part,/const quickRoomActions=el\('div','gmww-pr-quick-actions'\)/);
  assert.match(part,/quickRoomActions\.append\(copyCode,btn\('Xoá phòng',deleteRoom,'gmww-pr-danger'\)\)/);
  assert.match(part,/const nextActions=el\('div','gmww-pr-quick-actions'\)/);
  assert.match(part,/nextActions\.append\([\s\S]*?room\.quickPlayJoinLocked\?'🔒 MỞ KHÓA PHÒNG':'🔓 KHÓA PHÒNG'[\s\S]*?TIẾP: VÁN MẪU →/);
  assert.match(part,/\.gmww-pr-quick-actions\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(part,/\.gmww-pr-quick-actions button\{min-width:0;min-height:48px/);
});
