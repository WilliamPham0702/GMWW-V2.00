import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const dock=html.split('<section id="playBattleDock"')[1]?.split('<nav class="gm-top-menu-v293')[0]||'';
const top=html.split('<section id="playBattleTop"')[1]?.split('</section>')[0]||'';
test('battle top keeps back, Timeline and next with no exit controls',()=>{
 for(const id of ['battleBack','battleTimeline','battleAdvance'])assert.match(top,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(top,/battleInfoToggle|battleForceEnd/);
});
test('floating timer replaces bottom bar; GM wolf owns controls',()=>{
 const float=html.split('id="playBattleClockFloat"')[1]?.split('id="playBattleDock"')[0]||'';
 for(const id of ['battleClockButton','battleCountdown'])assert.match(float,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(dock,/battle-menu-row-top/);
 const menu=dock.split('id="battleWolfMenu"')[1]?.split('id="battleDetails"')[0]||'';
 for(const id of ['battleGMAudio','battleGMAuto','battleExit','battleForceEnd','battleQuickRevive','battleQuickKill'])
   assert.equal((menu.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(css,/#playBattleClockFloat\.battle-clock-float-v396/);
 assert.match(css,/#playBattleDock\.battle-float-v396/);
});
test('wolf actions keep confirmation and do not mutate game state on menu open',()=>{
 for(const id of ['battleExit','battleForceEnd','battleGMAudio','battleQuickRevive','battleQuickKill','battleGMAuto'])
  assert.match(app,new RegExp("getElementById\\('"+id+"'\\)\\?\\.addEventListener"));
 assert.doesNotMatch(html,/id="battleWolfClose"/);
 assert.match(app,/if\(battleState.wolfOpen&&!inside\('#battleWolfMenu,\.play-core-pearl'\)\)/);
 assert.match(app,/function initBattleFloatingClock\(/);
 assert.match(app,/function battleToggleWolfMenu\(/);
 assert.match(app,/async function battleQuickApply\(loginId\)/);
 assert.match(app,/confirm\('GM xác nhận '/);
 assert.match(app,/playRoomApi\('\/interaction'/);
});
