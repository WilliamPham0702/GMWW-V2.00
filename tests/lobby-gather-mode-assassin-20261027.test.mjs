import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('server-game/current/GMWW.html');
const gm=read('server-game/current/app.js');
const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
test('app source and packaged runtime match',()=>{
  assert.equal(gm,parts.map(n=>read('server-game/src/'+n)).join(''));
});
test('room creation step is not exposed and gathering follows lobby',()=>{
  assert.doesNotMatch(html,/data-play-step="room"/);
  assert.equal((html.match(/data-play-step="/g)||[]).length,6);
  assert.match(gm,/const PLAY_STEPS=\['lobby','seats','game','roles','deal','battle'\]/);
  assert.match(gm,/async function playEnsureGatherRoom/);
});
test('one mode toggle in gathering with existing server protection',()=>{
  assert.equal((html.match(/id="playRoomModeToggle"/g)||[]).length,1);
  assert.match(html,/<div class="play-gather-mode-row"[\s\S]*?id="playRoomModeToggle"/);
  assert.match(gm,/PLAY_ROOM_MODE_CYCLE=\['offline','online','demo'\]/);
  assert.match(gm,/async function flushPlayRoomMode/);
  assert.match(gm,/ROOM_MODE_REQUIRES_EMPTY_RESET/);
});
test('assassin uses a shared confirmation beside the thumbs',()=>{
  assert.match(html,/data-assassin-choice="👍"/);
  assert.match(html,/data-assassin-choice="👎"/);
  assert.match(gm,/destination\.appendChild\(pickerOK\)/);
  assert.match(gm,/assassin&&!\['👍','👎'\]\.includes\(battleState\.assassinChoice\)/);
});

test('V3.244 six stages share equal-width centered top menu cells',()=>{
  const css=read('server-game/current/style.css');
  const section=css.slice(css.indexOf('/* GMWW lobby stage: compact steps'));
  const activeColumns=section.match(/grid-template-columns:repeat\((?:6|7),minmax\(0,1fr\)\)!important/g)||[];
  assert.ok(activeColumns.length>=2,'Expected responsive timeline grid declarations');
  assert.ok(activeColumns.every(x=>x==='grid-template-columns:repeat(6,minmax(0,1fr))!important'),'No seven-column timeline rules may remain');
  assert.match(css,/body\.play-immersive #start #playSetupStrip\.play-setup-strip>button\{[\s\S]*?align-items:center!important;justify-content:center!important;/);
  assert.equal((html.match(/data-play-step="/g)||[]).length,6);
});
