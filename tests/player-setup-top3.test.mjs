import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const worker = read('src/index.js');
const part = read('src/player-web-src/20-village-and-profile.part');

test('Worker: /api/members/top3 công khai, cache 60s, chỉ trả dữ liệu tối giản', () => {
  assert.match(worker, /\/api\/members\/top3/);
  assert.match(worker, /\/members\/top3/);
  assert.match(worker, /max-age=60/);
  const method = worker.slice(worker.indexOf('async memberTop3()'));
  const body = method.slice(0, method.indexOf('\n  }\n'));
  assert.match(body, /\.slice\(0,3\)/);
  assert.doesNotMatch(body, /history|password|email/i);
  assert.match(body, /b\.games-a\.games/); // cùng thứ tự xếp hạng với GM
});

test('Player Web: bục Top 3 chỉ nằm trong màn setup (#gmwwRoomSetup)', () => {
  assert.match(part, /function renderSetupTop3\(\)/);
  assert.match(part, /for\(const idx of \[1,0,2\]\)/);       // thứ tự 02 – 01 – 03
  assert.match(part, /el\.appendChild\(box\)/);               // gắn vào overlay setup, không gắn vào game
  assert.match(part, /renderSetupTop3\(\);el\.classList\.toggle\('open'/);
  assert.match(part, /gameCharacterImageUrl\(cid\)/);         // Character thật
  assert.match(part, /\.place1 \.top3-podium/);
});

test('Player Web: không còn Top 3 khi vào ván', () => {
  const closeFn = part.slice(part.indexOf('function closeRoomSetup()'));
  assert.match(closeFn.slice(0, 200), /classList\.remove\('open'\)/);
  assert.match(part, /#gmwwRoomSetup\{position:fixed;inset:0;z-index:82;display:none/);
});

test('Player Web: bản đóng gói khớp nguồn', async () => {
  const packaged = read('src/gmww-members-live.js');
  assert.match(packaged, /renderSetupTop3/);
});
