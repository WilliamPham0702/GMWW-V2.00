import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const code=app.slice(app.indexOf('function gmwwHomeTop3Ranked'),app.indexOf('function gmwwHomeOpenMemberRanking'));

test('Ranking từ Server vẫn giữ thứ tự 02–01–03 và công thức tỷ lệ thắng',()=>{
 assert.match(code,/stats\.games>0/);
 assert.match(code,/\.sort\(gmwwRankMembers\)/);
 assert.match(code,/\.slice\(0,3\)/);
 assert.match(code,/for\(const index of \[1,0,2\]\)/);
 assert.match(code,/rate=Math\.round\(100\*stats\.w\/stats\.games\)/);
 assert.match(code,/gmwwHomeOpenMemberRanking\(\)/);
 assert.match(html,/id="gmwwHomeTop3"/);
});
test('Top 3 chỉ dùng Character đang được chủ hồ sơ chọn, không dùng avatar cũ',()=>{
 assert.match(code,/member\.gameCharacterId/);
 assert.match(code,/api\/game-characters\//);
 assert.match(code,/image\?rev=c40-4/);
 assert.match(code,/image\.dataset\.memberCharacterId=characterId/);
 assert.match(code,/image\.loading='lazy'/);
 assert.doesNotMatch(code,/member\.gameCharacterId\|\|member\.avatarId|originals/);
});
test('Top 3 V3.219 bỏ bục thật và chuyển toàn bộ chi tiết vào kính mờ bên dưới',()=>{
 const render=code.slice(code.indexOf('function gmwwHomeRenderTop3'));
 assert.match(render,/details\.append\(badge,name,percent,percentLabel,meter,record\)/);
 assert.match(render,/button\.append\(stage,details\)/);
 assert.doesNotMatch(render,/podium\.append|createElement\('span'\);podium/);
 assert.match(css,/V3\.219 — Top 3 không bục/);
 assert.match(css,/gmww-home-top3-glass-v3219/);
 assert.match(html,/<title>GMWW V3\.221<\/title>/);
});
