import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const village=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const chat=fs.readFileSync('server-game/src/45-online-chat.part','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const parts=fs.readdirSync('server-game/src').filter(f=>f.endsWith('.part')).sort().map(f=>fs.readFileSync('server-game/src/'+f,'utf8')).join('');

test('V3.321: app.js stays identical to the concatenated parts',()=>assert.equal(app,parts));
test('V3.321: middle slot holds the chat box that opens the GM chat',()=>{
  assert.match(village,/battleChatBox/);
  assert.match(village,/getElementById\('battleGMChatToggle'\)\?\.click\(\)/);
  assert.match(chat,/getElementById\('battleChatBox'\)/);
});
test('V3.321: 💬 float is never shown and the action box needs a day or Artifact action',()=>{
  assert.match(battle,/battleGMChatFloat:false/);
  assert.match(battle,/actionTray\.hidden=!\(actions\.length&&\(phase==='day'\|\|actions\.some\(a=>a\.artifactId\)\)\)/);
  assert.match(css,/#battleGMChatFloat\{display:none!important\}/);
});
test('V3.321: top and bottom bars are centred with the same width',()=>{
  assert.match(css,/#playBattleTop,[\s\S]*?margin-left:auto!important;margin-right:auto!important;[\s\S]*?width:min\(calc\(100% - 14px\),760px\)/);
  assert.match(css,/#battleBottomControls\.battle-bottom-controls-v3104\{[\s\S]*?margin-left:auto!important;margin-right:auto!important/);
});
