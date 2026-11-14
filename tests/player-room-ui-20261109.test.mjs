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
  assert.match(part,/Gửi phòng/);assert.match(part,/Sao chép mã/);assert.match(part,/Tạo phòng riêng/);assert.match(part,/Vào Game/);assert.match(part,/ĐÃ VÀO PHÒNG/);assert.match(part,/navigator\.share/);
});
test('GM Player Web list shows every room with kind and status; players list no longer shares the rooms container',()=>{
  const gm=playerWebSource('36-gm-observer');
  assert.match(gm,/PHÒNG GAME/);assert.match(gm,/NGƯỜI CHƠI/);assert.match(gm,/gmww-gmobs-players/);
  assert.match(script,/gmww-gmobs-players/);
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
