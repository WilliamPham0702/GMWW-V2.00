import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const dock=html.split('<section id="playBattleDock"')[1]?.split('<nav class="gm-top-menu-v293')[0]||'';
const row=dock.split('<div class="battle-menu-row battle-menu-row-top"')[1]?.split('</div>\n          <div id="battleClockPopover"')[0]||'';
test('footer has only countdown number, Info and spinning Auto GM icon',()=>{
 for(const id of ['battleClockButton','battleCountdown','battleInfoToggle','battleGMAuto'])assert.match(row,new RegExp('id="'+id+'"'));
 for(const id of ['battleWolfToggle','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd','battleGMAudio'])assert.doesNotMatch(row,new RegExp('id="'+id+'"'));
 assert.match(row,/<output id="battleCountdown"[^>]*>--:--<\/output>/);
 assert.match(css,/#battleGMAuto\[aria-pressed="true"\] \.battle-auto-spinner\{\s*animation:gmwwBattleAutoSpin 1\.6s linear infinite/);
 assert.match(css,/#battleGMAuto\[aria-pressed="false"\] \.battle-auto-spinner\{\s*animation:none/);
});
test('only moving GM actor opens four tools; no duplicate footer wolf',()=>{
 const rider=app.slice(app.indexOf('function renderPlayGmToken('),app.indexOf('function updatePlayGmToken('));
 assert.match(rider,/if\(playSceneState\.step==='battle'\)\{battleToggleWolfMenu\(\);return\}/);
 assert.match(rider,/data-play-gm-rider/);
 assert.match(dock,/id="battleWolfMenu"[^>]*hidden/);
 const menu=dock.split('id="battleWolfMenu"')[1]?.split('id="battleDetails"')[0]||'';
 for(const id of ['battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])assert.equal((menu.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 for(const id of ['battleInfoToggle','battleGMAudio','battleWolfToggle'])assert.doesNotMatch(menu,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(dock,/id="battleWolfToggle"/);
 assert.equal((html.match(/gm\/gm-white-wolf\.webp/g)||[]).length,0);
});
test('Info retains action details and audio; game data and original action handlers remain untouched',()=>{
 assert.match(dock,/id="battleDetails"[^>]*hidden/);
 assert.match(dock,/id="battleGMAudio"/);
 assert.match(app,/async function battleQuickApply\(loginId\)/);
 assert.match(app,/function battleToggleDetails\(/);
 assert.match(app,/getElementById\('battleInfoToggle'\)\?\.addEventListener/);
 assert.match(app,/getElementById\('battleGMAuto'\)\?\.addEventListener/);
 assert.match(app,/getElementById\('battleQuickRevive'\)\?\.addEventListener/);
 assert.match(app,/getElementById\('battleQuickKill'\)\?\.addEventListener/);
});
