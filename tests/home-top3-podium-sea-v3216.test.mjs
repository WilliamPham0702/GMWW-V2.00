import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const render=app.slice(app.indexOf('function gmwwHomeRenderTop3(rows){'),app.indexOf('function gmwwHomeOpenMemberRanking()'));
const sea=css.slice(css.indexOf('/* V3.216 — Top 3 Coastal Pearl'));

test('Bục biển mỏng, trong suốt và cùng trục 50% với Character hiện hành',()=>{
 assert.ok(sea.startsWith('/* V3.216'));
 assert.match(render,/gmww-home-sea-v3216/);
 assert.match(render,/crown\.textContent=String\(place\)/);
 assert.match(render,/member\.gameCharacterId/);
 assert.match(render,/api\/game-characters\//);
 assert.match(render,/image\?rev=c40-4/);
 assert.doesNotMatch(render,/\/originals\//);
 assert.match(sea,/left:50%!important/);
 assert.match(sea,/transform:translateX\(-50%\)!important/);
 assert.match(sea,/object-position:center!important/);
 assert.match(sea,/border-radius:45% 45% 32% 32%/);
 assert.match(sea,/height:39px!important/);
 assert.match(sea,/height:50px!important/);
 assert.match(sea,/content:"✧  🐚  ✧"/);
});
test('Thông tin dưới bục dùng kính mờ, cho thấy nền biển và không che Character',()=>{
 assert.match(render,/details\.append\(badge,name,percent,percentLabel,meter,record\)/);
 assert.match(render,/button\.append\(stage,podium,details\)/);
 assert.match(sea,/gmww-home-podium-info-v3213/);
 assert.match(sea,/background:linear-gradient\(154deg,rgba\(240,255,253,\.53\)/);
 assert.match(sea,/-webkit-backdrop-filter:blur\(8px\)/);
 assert.match(sea,/backdrop-filter:blur\(8px\)/);
 assert.match(sea,/@media\(max-width:390px\)/);
 assert.match(sea,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(sea,/animation:none!important/);
});
test('Phiên bản đúng V3.216, không can thiệp gameplay hay Player Web',()=>{
 assert.match(app,/const VERSION='3\.216';/);
 assert.match(html,/<title>GMWW V3\.216<\/title>/);
 assert.match(css,/gmwwCoastalVictory3216/);
});
