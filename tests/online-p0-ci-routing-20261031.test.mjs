import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const change=(path,status='M',before='unchanged baseline',after='updated source')=>({path,status,before,after});
const compiled=change('src/gmww-members-live.js','M','old generated bundle','new generated bundle');
const online699=[
  compiled,
  change('src/player-web-src/20-village-and-profile.part','M','if(d.type===\'gmww:village-ready\')','gmwwOnlineTurnEffects(state.onlineActions||[]);'),
  change('src/player-web-src/35-online-chat.part','M','old', 'gmwwOnlineTurnEffects(offers) CHAT_DEAD CHAT_FROZEN gmwwOnlinePlaceAtFire(dock)'),
  change('tests/online-player-fire-turn-dead-ui-20261031.test.mjs','A',null,'fire action offers stay visible')
];
const online700=[
  change('server-game/current/GMWW.html','M','original','battleUndoFloat battleGMChatFloat'),
  change('server-game/current/app.js','M','original','gmwwGmChatDismiss'),
  change('server-game/src/45-online-chat.part','M','original','gmwwGmChatDismiss'),
  change('tests/gm-online-chat-footer-after-undo-20261031.test.mjs','A',null,'GM footer places Chat directly after Restore'),
  change('tests/player-online-realtime-freeze-day-20261030.test.mjs','M','old','new'),
];
const online701=[
  compiled,
  change('src/index.js','M','old','this.broadcast({type:"announcement_ready",serverTime:Date.now()})'),
  change('src/player-web-src/30-rooms-and-realtime.part','M','old',"d.type==='announcement_ready'"),
  change('tests/online-audio-ready-realtime-20261031.test.mjs','A',null,'GM broadcasts only recording availability')
];
const ciOnly=[
  change('.github/scripts/ci-browser-scope.mjs','M','original','function isOnlineP0CiRoutingScope(changes)'),
  change('.github/workflows/check-player-web.yml','M','original',"steps.scope.outputs.mode == 'online-p0-ci-routing'"),
  change('tests/online-p0-ci-routing-20261031.test.mjs','A',null,'Online P0 CI routing rejects extra high-risk changes'),
  change('docs/releases/GMWW-ONLINE-P0-CI-20261031.md','A',null,'Rollback'),
];
test('Online #699 fire icon, own-turn glow and chat notice use focused verified tests',()=>{
  assert.equal(classifyBrowserScope(online699),'online-p0-player-699');
});
test('Online #700 GM footer Chat has separate focused UI validation',()=>{
  assert.equal(classifyBrowserScope(online700),'online-p0-gm-chat-700');
});
test('Online #701 WebSocket audio requires security and realtime regression',()=>{
  assert.equal(classifyBrowserScope(online701),'online-p0-audio-701');
});
test('Online P0 CI routing rejects extra high-risk changes and file deletions',()=>{
  for(const arr of [online699,online700,online701,ciOnly]){
    assert.equal(classifyBrowserScope([...arr,change('src/gmww-online-chat-policy.js')]),'full');
    assert.equal(classifyBrowserScope([...arr,{...arr[0],status:'D'}]),'full');
  }
  assert.equal(classifyBrowserScope(ciOnly),'online-p0-ci-routing');
});
test('Missing required source or review test never opts out of full CI',()=>{
  for(const arr of [online699,online700,online701,ciOnly]){
    assert.equal(classifyBrowserScope(arr.slice(1)),'full');
  }
});
