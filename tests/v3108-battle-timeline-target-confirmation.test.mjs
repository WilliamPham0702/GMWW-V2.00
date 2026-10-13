import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('battle timeline updates when the active turn changes and marks exactly the active step',()=>{
  assert.match(app,/signature=JSON\.stringify\(steps\.map\(x=>\[x\.id,x\.status,x\.active,x\.displayNumber\]\)\)/);
  assert.match(app,/play-battle-step is-'\+playEsc\(s\.status\)\+\(s\.active\?' is-active':''\)/);
  assert.match(app,/aria-current="'\+\(s\.active\?'step':'false'\)/);
  assert.match(app,/active\.scrollIntoView\(\{block:'nearest',inline:'center'\}\)/);
});

test('drag target confirmation keeps only Cancel and OK and names the selected target',()=>{
  assert.match(app,/targetReady=!!act&&battleState\.targets\.length===act\.targetCount/);
  assert.match(app,/pickerClose\.hidden=battleState\.targetMode==='drag'&&targetReady/);
  assert.match(app,/targetReady&&battleState\.targetMode==='drag'\?'Mục tiêu: '\+selected\.join\(', '\)/);
  assert.match(html,/<button type="button" id="battleTargetCancel">HỦY<\/button><button type="button" id="battleTargetConfirm">OK<\/button>/);
  assert.match(css,/#start #playShell\[data-step="battle"\] #battleTargetSheet>footer>button/);
});

test('target eligibility is still checked before a target can be selected or action confirmed',()=>{
  assert.match(app,/battleRules\(\)\?\.targetAllowed\(a,m,playPlayerEffect\(id\)\)/);
  assert.match(app,/if\(!confirmed&&!confirm\('Xác nhận '/);
});
