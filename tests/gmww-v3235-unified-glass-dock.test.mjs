import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css'),setup=read('server-game/src/30-village-and-setup.part'),battle=read('server-game/src/40-battle-and-timeline.part');
test('V3.235: five daytime text controls and compact clock',()=>{
 assert.match(html,/Đồng hồ · Báo · Hành động · Lên Giàn · Khôi phục/);
 assert.match(html,/class="battle-clock-caption"/);
 assert.match(html,/id="battleDayNoticeToggle"[^>]*>BÁO<\/button>/);
 assert.match(html,/id="battleDayGallowsToggle"[^>]*>LÊN GIÀN<\/button>/);
 assert.match(css,/V3\.235 unified GM/);
 assert.match(css,/#battleBottomControls #battleClockButton\{/);
 assert.match(battle,/battleUndoFloat:!!visible/);
});
test('V3.235: 🌈 independent draggable and local persisted, DEMO preserved',()=>{
 assert.match(setup,/for\(const id of \['battleDemoObserver','battleFactionStatsFloat'\]\)/);
 assert.match(setup,/id==='battleFactionStatsFloat'&&!saved/);
 assert.match(setup,/GMWW_BATTLE_ICON_POSITIONS/);
 assert.match(css,/#battleFactionStatsFloat\.gmww-free-icon/);
 const begin=setup.indexOf('for(const item of [document.getElementById('),end=setup.indexOf('])',begin);
 assert.ok(begin>0&&end>begin);
 assert.doesNotMatch(setup.slice(begin,end),/battleFactionStatsFloat/);
});
test('V3.235: Cloudflare 1-line label and 16 tools',()=>{
 assert.match(html,/gmww-cloudflare-label">CLOUDFLARE<\/b>/);
 assert.doesNotMatch(html,/gmww-cloudflare-label"><span>QUẢN LÝ/);
 assert.match(read('server-game/src/20-members-and-roster.part'),/gmwwCloudflareOpen:'CLOUDFLARE'/);
 const tools=html.slice(html.indexOf('id="settingsToolsRail"'),html.indexOf('id="settingsNoticePanel"'));
 assert.equal([...tools.matchAll(/<button\b[^>]*\bid="[^"]+"/g)].length,16);
});
test('V3.235: assembled app and versions stay aligned',()=>{
 const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'];
 assert.equal(read('server-game/current/app.js'),parts.map(x=>read('server-game/src/'+x+'.part')).join(''));
 assert.match(read('src/index.js'),/VERSION="V3\.235"/);
 assert.match(read('server-game/current/app.js'),/const VERSION='3\.235'/);
 assert.match(read('package.json'),/"version": "3\.235\.0"/);
});
