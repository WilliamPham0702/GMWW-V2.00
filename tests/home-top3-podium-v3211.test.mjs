import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');

test('Bảng vinh danh Top 3 dùng API xếp hạng cũ và thứ tự 02–01–03',()=>{
  const code=app.slice(app.indexOf('function gmwwHomeTop3Ranked'),app.indexOf('function gmwwHomeOpenMemberRanking'));
  assert.match(code,/stats\.games>0/);
  assert.match(code,/\.sort\(\(left,right\)=>/);
  assert.match(code,/\.slice\(0,3\)/);
  assert.match(code,/for\(const index of \[1,0,2\]\)/);
  assert.match(code,/rate=Math\.round\(100\*stats\.w\/stats\.games\)/);
  assert.match(code,/gmwwHomeOpenMemberRanking\(\)/);
  assert.match(html,/id="gmwwHomeTop3"/);
  assert.match(html,/id="gmwwHomeTop3Ranking"/);
});

test('Top 3 chỉ hiển thị Character Idle đúng ID đang lưu trong hồ sơ',()=>{
  const code=app.slice(app.indexOf('function gmwwHomeRenderTop3'),app.indexOf('function gmwwHomeOpenMemberRanking'));
  assert.match(code,/member\.gameCharacterId/);
  assert.match(code,/api\/game-characters\//);
  assert.match(code,/image\?rev=c40-4/);
  assert.match(code,/image\.dataset\.memberCharacterId=characterId/);
  assert.doesNotMatch(code,/gmww40\/originals\//);
  assert.doesNotMatch(code,/member\.gameCharacterId\|\|member\.avatarId/);
  assert.match(code,/image\.loading='lazy'/);
  assert.match(code,/image\.decoding='async'/);
  assert.match(code,/button\.append\(stage,podium,details\)/);
});

test('V3.213: Nhân vật đứng trên bục rắn; tên và tỷ lệ thắng bên dưới',()=>{
  assert.match(css,/V3\.213 — Bục đứng thật/);
  assert.match(css,/gmww-home-podium-platform-v3213::before/);
  assert.match(css,/gmww-home-podium-info-v3213/);
  assert.match(css,/background:transparent!important;box-shadow:none!important;overflow:visible!important/);
  assert.match(css,/position:relative!important;left:auto!important;top:auto!important/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html,/<title>GMWW V3\.214<\/title>/);
});

test('Bục 2.5D vàng–bạc–đồng, Character phóng 3 lần và hiệu ứng ăn mừng an toàn iPhone',()=>{
  assert.match(css,/V3\.211 — Top 3 podium/);
  assert.match(css,/gmww-home-podium-v3211\[data-rank="1"\]/);
  assert.match(css,/gmww-home-podium-v3211\[data-rank="2"\]/);
  assert.match(css,/gmww-home-podium-v3211\[data-rank="3"\]/);
  assert.match(css,/gmww-home-podium-stage-v3211/);
  assert.match(css,/width:clamp\(168px,47vw,202px\)/);
  assert.match(css,/@keyframes gmwwVictoryDance3211/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important/);
  assert.match(html,/<title>GMWW V3\.214<\/title>/);
});
