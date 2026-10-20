import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
test('wolf introductions appear only on first night',()=>{
 assert.match(worker,/if\(n===1\)queue\.push\(\{id:"wolf-introduction"/);
});
test('battle dock hides redundant turn title and centers the action strip',()=>{
 assert.match(app,/set\('battleActionTrayTitle',phase==='day'\?'HÀNH ĐỘNG':''\)/);
 assert.match(css,/#battleBottomControls \.battle-action-tray-head\{\s*display:none!important/);
 assert.match(css,/justify-content:center!important;align-items:center!important/);
});
test('effect labels surface frozen and expelled locks, with reactive signature',()=>{
 assert.match(app,/battleActorEffects=actions\.map/);
 assert.match(app,/battle-effect-tag/);
 assert.match(app,/Đóng băng/);
 assert.match(app,/Bị đuổi/);
 assert.match(app,/JSON\.stringify\(battleActorEffects\)/);
});
test('role and action audio remain tied to configured clips and GM mute',()=>{
 assert.match(app,/function battleAudioForTurn\(turn,auto=false\)/);
 assert.match(app,/if\(audio\)await battleWarmAudio\(kind,audio\)/);
 assert.match(app,/await battlePlayConfiguredAudio\(kind,targetId,name,false\)/);
 assert.match(app,/if\(playAudioMuted\(\)\)/);
 assert.match(app,/battlePlayConfiguredAudio\('actions',audioAction\.actionId,audioAction\.name\)/);
});
test('role action ledger guards exhausted and incapacitated actors',()=>{
 assert.match(app,/const onlyOne=card\.flags\?\.allowMultipleActions===false\|\|roleId==='role_old_witch'/);
 assert.match(app,/if\(playPlayerBlocked\(actorId\)\)\{unavailableReason/);
});
