import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const dock=html.split('<section id="playBattleDock"')[1]?.split('<nav class="gm-top-menu-v293')[0]||'';
test('floating countdown stands alone; Auto GM spins only inside wolf menu',()=>{
 const clock=html.split('id="playBattleClockFloat"')[1]?.split('id="playBattleDock"')[0]||'';
 for(const id of ['battleClockButton','battleCountdown'])assert.match(clock,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(dock,/battle-menu-row-top/);
 assert.match(css,/#battleGMAuto\[aria-pressed="true"\] \.battle-auto-spinner\{/);
 assert.match(css,/#battleGMAuto\[aria-pressed="false"\] \.battle-auto-spinner\{/);
});
test('V3.143: campfire alone opens the GM action menu',()=>{
 const setup=app.split("document.querySelector('.play-core-pearl')?.addEventListener('click'")[1]||'';
 assert.match(setup,/battleToggleWolfMenu\(\)/);
 assert.doesNotMatch(app,/data-play-gm-rider/);
 assert.match(dock,/id="battleWolfMenu"[^>]*hidden/);
 const menu=dock.split('id="battleWolfMenu"')[1]?.split('id="battleDetails"')[0]||'';
 for(const id of ['battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
   assert.equal((menu.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.doesNotMatch(dock,/id="battleWolfToggle"/);
});

test('Info retains actions and closes separately, without changing manual effects',()=>{
 assert.match(dock,/id="battleDetails"[^>]*hidden/);
 assert.doesNotMatch(dock,/id="battleDetailsClose"/);
 assert.match(app,/async function battleQuickApply\(loginId\)/);
 assert.match(app,/battleState.details=false;battleState.roster=false;changed=true/);
 for(const id of ['battleGMAuto','battleGMAudio','battleQuickRevive','battleQuickKill'])
   assert.match(app,new RegExp("getElementById\\('"+id+"'\\)\\?\\.addEventListener"));
});
