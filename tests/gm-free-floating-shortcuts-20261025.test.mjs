import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const part=read('server-game/src/30-village-and-setup.part');
const controls=read('server-game/src/40-battle-and-timeline.part');
const css=read('server-game/current/style.css');
const from=part.indexOf('function gmwwSetupFreeBattleIcons(){');
const to=part.indexOf('function battleMorningRows(){',from);
const source=part.slice(from,to);
test('Day footer retains its functional icons and the independent ⚖️ shortcut',()=>{
 for(const id of ['battleFactionStatsToggle','battleDayNoticeToggle','battleDayGallowsToggle']){
  const pos=html.indexOf('id="'+id+'"');
  assert.ok(pos>=0,id+' exists');
  const button=html.slice(pos,html.indexOf('</button>',pos)+9);
  if(id==='battleFactionStatsToggle')assert.match(button,/⚖️/);
  else assert.match(button,/<svg class="gmww-footer-icon"/);
 }
 assert.match(html,/id="battleBottomControls"[^>]+Thanh dưới: Đồng hồ/);
 assert.match(css,/#battleBottomControls #battleDayGallowsFloat/);
});
test('Day shortcuts use fixed dock; only DEMO and the independent ⚖️ shortcut float',()=>{
 assert.match(source,/battleMainActionSlot/);
 assert.match(source,/for\(const id of \['battleDayNoticeFloat','battleDayGallowsFloat'\]\)/);
 assert.match(source,/for\(const id of \['battleDemoObserver','battleFactionStatsFloat'\]\)/);
 assert.match(source,/document\.getElementById\('battleSeaShortcuts'\)\?\.remove\(\)/);
 assert.match(source,/item\.classList\.remove\('gmww-free-icon'\)/);
 assert.match(source,/panel\.classList\.add\('gmww-free-icon'\)/);
});
test('Touch buttons still open original server-backed stats, village notice and gallows',()=>{
 assert.match(controls,/battleFactionStatsToggle'\)\?\.addEventListener\('click'/);
 assert.match(controls,/battleDayNoticeToggle'\)\?\.addEventListener\('click'/);
 assert.match(controls,/battleDayGallowsToggle'\)\?\.addEventListener\('click'/);
 assert.match(source,/if\(stats&&stats\.parentElement!==shell\)shell\.appendChild\(stats\)/);
});
test('DOM source and assembled app retain same bottom grouping',()=>{
 assert.ok(read('server-game/current/app.js').includes(source));
});
