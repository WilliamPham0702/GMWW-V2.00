import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const playerWeb=fs.readFileSync('src/gmww-members-live.js','utf8');

test('V3.143: GM wolf actor, patrol and animation are retired',()=>{
  for(const retired of [/function renderPlayGmToken/,/function updatePlayGmToken/,/gmwwGmActorAt\(/,
    /data-gm-wolf-runtime="1"/,/function gmwwMoveGmCharacter/,/GMWW_GM_AUTO_MOVE_MS/])
    assert.doesNotMatch(app,retired);
  assert.doesNotMatch(html,/id="gmWolfCharacter"/);
  assert.doesNotMatch(playerWeb,/function gmVillagePlayer\(/);
  assert.doesNotMatch(playerWeb,/gmMotionTimer/);
});
test('V3.143: firepit GM menu, GM presence and battle actions remain',()=>{
  assert.match(app,/function openPlayGMSheet\(\)/);
  assert.match(app,/battleToggleWolfMenu\(\)/);
  assert.match(app,/gmwwSendGmPresence/);
  assert.match(html,/id="battleWolfMenu"/);
  for(const id of ['battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
    assert.match(html,new RegExp('id="'+id+'"'));
});
