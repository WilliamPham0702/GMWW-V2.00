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
test('The three sea shortcuts keep original unboxed emoji',()=>{
 for(const [id,emoji] of [['battleFactionStatsToggle','🌈'],['battleDayNoticeToggle','🏖️'],['battleDayGallowsToggle','⛱️']]){
  const pos=html.indexOf('id="'+id+'"');
  assert.ok(pos>=0&&html.slice(pos,pos+400).includes(emoji),id);
 }
 assert.match(css,/#battleBottomControls #battleSeaShortcuts/);
 assert.match(css,/#battleBottomControls #battleDayGallowsFloat/);
});
test('Shortcuts are docked, no longer free-draggable; only Demo remains floating',()=>{
 assert.match(source,/battleSeaShortcuts/);
 assert.match(source,/battleMainActionSlot/);
 assert.match(source,/for\(const id of \['battleDemoObserver'\]\)/);
 assert.doesNotMatch(source,/for\(const id of \['battleFactionStatsFloat','battleDayNoticeFloat','battleDayGallowsFloat','battleDemoObserver'\]\)/);
 assert.match(source,/item\.classList\.remove\('gmww-free-icon'\)/);
 assert.match(source,/gallows\.classList\.remove\('gmww-free-icon'\)/);
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
