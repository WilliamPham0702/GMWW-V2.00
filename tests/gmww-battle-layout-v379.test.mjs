import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../server-game/current/battle-controls.js');
const get=(path)=>fs.readFileSync(path,'utf8');
test('Vào Trận swaps both menus without altering pre-game step menus',()=>{
  const css=get('server-game/current/style.css');
  const swap=css.slice(css.lastIndexOf('/* V3.79: In battle'));
  assert.match(swap,/\#playShell\[data-step="battle"\] \#playBattleDock\{[^}]*top:calc\(env\(safe-area-inset-top\) \+ 7px\);[^}]*bottom:auto;/);
  assert.match(swap,/\#playShell\[data-step="battle"\] \#playBattleTop\{[^}]*top:auto;[^}]*bottom:calc\(env\(safe-area-inset-bottom\) \+ 7px\);/);
  assert.ok(!swap.includes('playSetupStrip'), 'Setup timeline remains in original position');
  assert.match(swap,/max-height:min\(44dvh,420px\)/);
});
test('Back button shows just one icon and keeps accessible label',()=>{
  const html=get('server-game/current/GMWW.html');
  const back=html.match(/<button id="battleBack"[^>]*>[\s\S]*?<\/button>/)?.[0]||'';
  assert.match(back,/aria-label="Quay về Trang Chủ, giữ trận đang chơi"/);
  assert.match(back,/<span aria-hidden="true">←<\/span>/);
  assert.doesNotMatch(back,/>Quay về</);
  assert.ok(html.includes('battle-controls.js?v=battle-380'));
});
test('Wolf introduction is named Bầy sói in current turn and the timeline without changing server step id',()=>{
  const rules=globalThis.GMWW_BATTLE_CONTROLS;
  const serverTurn={id:'wolf-introduction',kind:'wolf-introduction',label:'Bầy Sói ơi dậy đi nhìn mặt nhau'};
  assert.equal(rules.displayLabel(serverTurn),'Bầy sói');
  assert.equal(rules.timeline('night',{queue:[serverTurn],cursor:0,completed:false},1)[0].label,'Bầy sói');
  assert.equal(rules.currentTurn('night',{queue:[serverTurn],cursor:0,completed:false},1).id,'wolf-introduction');
  const app=get('server-game/current/app.js');
  assert.match(app,/battleRules\(\)\.displayLabel\(t,'Lượt chơi'\)/);
});
