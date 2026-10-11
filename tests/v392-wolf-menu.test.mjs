import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const dock=html.split('<section id="playBattleDock"')[1]?.split('<nav class="gm-top-menu-v293')[0]||'';
const head=html.split('<section id="playBattleTop"')[1]?.split('</section>')[0]||'';
test('battle top only exposes back/timeline/next; no giant phase card',()=>{
  assert.match(head,/id="battleBack"/);assert.match(head,/id="battleTimeline"/);assert.match(head,/id="battleAdvance"/);
  assert.doesNotMatch(head,/battleInfoToggle|battleForceEnd/);
});
test('compact bottom bar shows clock icon, clickable wolf and Auto GM icon only',()=>{
  const row=dock.split('<div class="battle-menu-row battle-menu-row-top"')[1]?.split('</div>\n          <div id="battleClockPopover"')[0]||'';
  for(const id of ['battleClockButton','battleWolfToggle','battleGMAuto'])assert.match(row,new RegExp('id="'+id+'"'));
  for(const id of ['battleInfoToggle','battleExit','battleForceEnd','battleGMAudio','battleQuickRevive','battleQuickKill'])assert.doesNotMatch(row,new RegExp('id="'+id+'"'));
  assert.match(row,/battle-menu-wolf/);
  assert.match(row,/id="battleGMAuto"[^>]*><span aria-hidden="true">↻<\/span><\/button>/);
  assert.match(dock,/id="battleClockPopover"[^>]*hidden/);
});
test('wolf menu has exactly six existing GM actions and stays closed until tapped',()=>{
  assert.match(dock,/id="battleWolfMenu"[^>]*hidden/);
  const menu=dock.split('id="battleWolfMenu"')[1]?.split('id="battleDetails"')[0]||'';
  for(const id of ['battleInfoToggle','battleExit','battleForceEnd','battleGMAudio','battleQuickRevive','battleQuickKill']){
    assert.equal((menu.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  assert.match(css,/#battleWolfMenu\[hidden\],/);
});
test('wolf actions retain original callbacks and quick effect confirmation; popup controls do not alter stored game data',()=>{
  for(const id of ['battleWolfToggle','battleWolfClose','battleClockButton','battleInfoToggle','battleExit','battleForceEnd','battleGMAudio','battleQuickRevive','battleQuickKill','battleGMAuto'])
    assert.match(app,new RegExp("getElementById\\('"+id+"'\\)\\?\\.addEventListener"));
  assert.match(app,/function battleToggleWolfMenu\(/);
  assert.match(app,/battleState\.wolfOpen=false/);
  assert.match(app,/battleState\.clockOpen=false/);
  assert.match(app,/async function battleQuickApply\(loginId\)/);
  assert.match(app,/confirm\('GM xác nhận '/);
});
