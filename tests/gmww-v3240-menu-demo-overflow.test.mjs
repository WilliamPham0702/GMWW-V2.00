import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const app=read('server-game/current/app.js');
test('V3.240: 23:39 iPhone vertical DEMO status never occupies a GM tool slot',()=>{
 assert.match(html,/<section id="battleDemoPanel" hidden aria-label="Trạng thái DEMO">/);
 assert.match(html,/id="battleDemoStatus"/);
 assert.match(app,/Đã xác định phe thắng/);
 const final=css.slice(css.lastIndexOf('/* V3.240: fix the 23:39 iPhone GM menu'));
 assert.ok(final.length>500);
 assert.match(final,/#battleWolfMenu #battleDemoPanel:not\(\[hidden\]\)/);
 assert.match(final,/display:none!important;visibility:hidden!important;position:absolute!important/);
 assert.match(final,/pointer-events:none!important;flex:none!important/);
 // DEMO logic and the floating observer remain untouched.
 assert.match(html,/id="battleDemoObserver"/);
});
test('V3.240: GM popup compact single row even at lobby, no vertical text wrapping',()=>{
 const final=css.slice(css.lastIndexOf('/* V3.240: fix the 23:39 iPhone GM menu'));
 assert.match(final, /height:78px!important;min-height:78px!important;max-height:78px!important/);
 assert.match(final, /overflow:hidden!important;padding:7px 8px 8px!important/);
 assert.match(final, /height:52px!important;min-height:52px!important;max-height:52px!important/);
 assert.match(final, /overflow-x:auto!important;overflow-y:hidden!important/);
 assert.match(final, /white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important/);
 assert.match(final, /word-break:normal!important;overflow-wrap:normal!important/);
 assert.match(final, /> :is\(span,section\)\[hidden\]/);
 assert.match(html,/id="battleWolfMenu" class="battle-wolf-menu"/);
});
test('V3.240: packed GM app stays identical to source; Workers and HTML versions agree',()=>{
 const modules=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'];
 assert.equal(app,modules.map(n=>read('server-game/src/'+n+'.part')).join(''));
 assert.match(app,/const VERSION='3\.240'/);
 assert.match(read('src/index.js'),/VERSION="V3\.240"/);
 assert.match(html,/GMWW V3\.240/);
 assert.match(read('package.json'),/"version": "3\.240\.0"/);
});
