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

test('Character trên bục là ảnh nguyên thân thực tế và có fallback',()=>{
  const code=app.slice(app.indexOf('function gmwwHomeRenderTop3'),app.indexOf('function gmwwHomeOpenMemberRanking'));
  assert.match(code,/gmww-home-podium-stage-v3211/);
  assert.match(code,/gmww-home-podium-character-v3211/);
  assert.match(code,/characters\/gmww40\/originals\//);
  assert.match(code,/image\.src=memberAvatarUrl\(avatarId\)/);
  assert.match(code,/fullBodyId=avatarId==='character-41'/);
  assert.match(code,/image\.loading='lazy'/);
  assert.match(code,/image\.decoding='async'/);
  assert.match(code,/stage\.append\(glow,character,rim\)/);
  assert.doesNotMatch(code,/button\.append\(crown,badge,avatar/);
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
  assert.match(html,/<title>GMWW V3\.211<\/title>/);
});
