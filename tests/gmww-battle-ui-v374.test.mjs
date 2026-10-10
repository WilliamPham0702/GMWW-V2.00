import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../server-game/current/battle-controls.js');
const controls=globalThis.GMWW_BATTLE_CONTROLS;
test('first night starts with wolf recognition and ends with village wake-up',()=>{
  const runtime={cursor:0,completed:false,queue:[{id:'wolf-introduction',kind:'wolf-introduction',label:'Bầy Sói ơi dậy đi nhìn mặt nhau'},{id:'early:x',kind:'early-artifact',label:'Tráng Gương'},{id:'role:y',kind:'role',label:'Bảo Vệ'}]};
  assert.deepEqual(controls.timeline('night',runtime,1).map(x=>x.label),['Bầy sói','Tráng Gương','Bảo Vệ','Làng ơi dậy đi']);
  assert.equal(controls.currentTurn('night',runtime)?.id,'wolf-introduction');
  runtime.cursor=2;
  assert.equal(controls.timeline('night',runtime,1)[2].status,'active');
  runtime.completed=true;assert.equal(controls.timeline('night',runtime,1).at(-1).status,'active');
  assert.equal(controls.currentTurn('night',runtime),null);
  assert.equal(controls.timeline('day',null,1)[0].label,'Làng ơi dậy đi');
});
test('action menu derives its functions and constraints from role data, never hardcodes role list',()=>{
  const turn={id:'role:freeze',kind:'role',roleId:'role:freeze',loginIds:['member:actor'],label:'Sói Tuyết'};
  const catalog={cards:[{id:'role:freeze',functions:[{id:'fn1',actionId:'action_freeze',targetCount:2,noSelf:true,phase:'night',effectIds:['effect_freeze']},{id:'fn2',actionId:'action_passive',passive:true}]}],actions:[{id:'action_freeze',name:'Đóng băng'}]};
  const arr=controls.actionsForTurn(turn,2,catalog);
  assert.equal(arr.length,1);assert.equal(arr[0].type,'frozen');assert.equal(arr[0].targetCount,2);
  assert.deepEqual(arr[0].actorIds,['actor']);
  assert.equal(controls.targetAllowed(arr[0],{loginId:'actor'},'alive'),false);
  assert.equal(controls.targetAllowed(arr[0],{loginId:'victim'},'alive'),true);
  assert.equal(controls.targetAllowed(arr[0],{loginId:'victim'},'dead'),false);
  assert.equal(controls.resolvedType({name:'Sói cắn',actionId:'action_bite'}),'effect_notice');
  assert.equal(controls.actionsForTurn({kind:'wolf-introduction'},1,catalog).length,0);
});
test('GM match screen uses separate toolbar and explicit OK before submitting effects',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const js=fs.readFileSync('server-game/current/app.js','utf8');
  const css=fs.readFileSync('server-game/current/style.css','utf8');
  assert.match(html,/id="playBattleTop"/);assert.match(html,/id="playBattleDock"/);assert.match(html,/id="battleConfirm"/);
  assert.match(html,/battle-controls\.js/);assert.match(js,/function battleConfirm\(\)/);assert.match(js,/turnId:t\.id/);
  assert.match(js,/clientEventId:battleState\.nonce/);
  assert.match(css,/data-step="battle"/);
  assert.match(css,/is-battle-actor/);
  assert.match(html,/id="battleGMAuto"/);assert.match(html,/id="battleGMAudio"/);
});
