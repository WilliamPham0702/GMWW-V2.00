import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('server-game/current/GMWW.html');
const gm=read('server-game/current/app.js');
const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
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
