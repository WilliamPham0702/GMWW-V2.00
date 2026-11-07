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

const game = read('src/player-web-src/40-cards-and-game.part');

test('Player Web: bục Top 3 nằm trong làng (#game), thứ tự 02 – 01 – 03, Character thật', () => {
  assert.match(part, /function renderSetupTop3\(\)/);
  assert.match(part, /for\(const idx of \[1,0,2\]\)/);
  assert.match(part, /game\.appendChild\(box\)/);
  assert.match(part, /gameCharacterImageUrl\(cid\)/);
  assert.match(part, /\.place1 \.top3-podium/);
});

test('Player Web: chỉ hiện ở các bước setup (lobby), vào trận thì ẩn', () => {
  assert.match(part, /#game:not\(\[data-gmww-player-scene="lobby"\]\) #gmwwSetupTop3[^{]*\{display:none!important\}/);
  assert.match(game, /game\.dataset\.gmwwPlayerScene=policy\.mode;\s*syncSetupTop3\(policy\.mode==='lobby'\)/);
  assert.match(part, /function syncSetupTop3\(active\)\{\s*if\(!active\|\|!state\.member\)return;/);
});

test('Player Web: tải Top 3 có cache 60s và không gọi dồn', () => {
  assert.match(part, /state\.setupTop3Busy/);
  assert.match(part, /<60000/);
});

test('Player Web: bản đóng gói khớp nguồn', async () => {
  const packaged = read('src/gmww-members-live.js');
  assert.match(packaged, /renderSetupTop3/);
});
