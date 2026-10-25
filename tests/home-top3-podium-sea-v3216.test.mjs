import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const render=app.slice(app.indexOf('function gmwwHomeRenderTop3(rows){'),app.indexOf('function gmwwHomeOpenMemberRanking()'));
const style=css.slice(css.indexOf('/* V3.219 — Top 3 không bục'),css.indexOf('/* V3.217 — actual audio'));

test('Không tạo bất kỳ bục/đế nào, giữ Character thật ở tâm theo atlas C40',()=>{
 assert.match(render,/for\(const index of \[1,0,2\]\)/);
 assert.match(render,/gmww-home-top3-sea-v3219/);
 assert.match(render,/member\.gameCharacterId/);
 assert.match(render,/api\/game-characters\//);
 assert.match(render,/image\?rev=c40-4/);
 assert.doesNotMatch(render,/originals|member\.avatarId|createElement\('span'\);podium|podium\.append|button\.append\(stage,podium/);
 assert.match(render,/button\.append\(stage,details\)/);
 assert.doesNotMatch(style,/gmww-home-podium-platform-v3213/);
 assert.match(style,/left:50%!important/);
 assert.match(style,/transform:translateX\(-50%\)!important/);
 assert.match(style,/object-position:center!important/);
});
test('Kính mờ mạnh, bán trong suốt và chữ toàn màu trắng nổi bật',()=>{
 assert.match(style,/gmww-home-top3-glass-v3219/);
 assert.match(style,/rgba\(244,255,255,\.20\)/);
 assert.match(style,/-webkit-backdrop-filter:blur\(21px\)/);
 assert.match(style,/backdrop-filter:blur\(21px\)/);
 assert.match(style,/\.gmww-home-top3-name-v377/);
 assert.match(style,/\.gmww-home-top3-percent-v377/);
 assert.match(style,/\.gmww-home-top3-percent-label-v377/);
 assert.match(style,/\.gmww-home-top3-record-v377/);
 assert.match(style,/color:#fff!important/);
 assert.match(style,/rgba\(1,35,53,\.92\)/);
});
test('Nhún nhẹ, ánh sao biển và tôn trọng Reduce Motion trên iPhone',()=>{
 assert.match(style,/@keyframes gmwwSeaChampionDrift3219/);
 assert.match(style,/@keyframes gmwwSeaGlisten3219/);
 assert.match(style,/@media\(max-width:390px\)/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(style,/animation:none!important/);
});
test('Runtime V3.219 chỉ sửa giao diện GM; không dùng ảnh preview thay Character',()=>{
 assert.match(app,/const VERSION='3\.219';/);
 assert.match(html,/<title>GMWW V3\.219<\/title>/);
 assert.match(html,/style\.css\?v=3\.219-top3-glass/);
 assert.doesNotMatch(render,/originals|member\.avatarId/);
});
