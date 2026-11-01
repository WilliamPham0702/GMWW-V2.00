import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8'),server=fs.readFileSync('src/gmww-demo-runner.js','utf8');
test('Aura result is human-readable, not raw JSON or private role metadata',()=>{
 const start=src.indexOf('function gmwwOnlineRevelationText(revelation){'),end=src.indexOf('function gmwwOnlineIconDown(',start);
 assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext('('+src.slice(start,end)+')');
 const result={kind:'aura',message:'Sói Trùm',targets:[{loginId:'070290',roleId:'role_alpha_wolf',functions:['action_wolf_bite']}]};
 assert.equal(fn(result),'Sói Trùm');
 assert.ok(!fn(result).includes('loginId'));
});
test('Player action dock is smaller, keeps drag, and renders every server-offered action',()=>{
 assert.match(src,/48px \* var\(--online-action-scale/);
 assert.match(src,/for\(const action of offers\)/);
 assert.match(src,/gmwwOnlinePlaceAtFire\(dock\)/);
 assert.match(src,/gmwwOnlineIconDown\(e,action\)/);
});
test('Server no longer hides Witch poison action on first night',()=>{
 assert.doesNotMatch(server,/return actions\.filter\(action=>!\(Number\(meta\.cycleNight\)===1&&action\.actionId==='action_witch_kill'/);
 assert.match(server,/return actions\.map\(action=>/);
});
test('Witch bite is resolved privately by server; never in public room payload',()=>{
 assert.match(server,/const witchCanSave=actions\.some/);
 assert.match(server,/resolveWolfNight\(\{assignments:ctx\.assignments/);
 assert.match(server,/a\.actionId==='action_witch_save'&&wolfBiteNotice/);
 assert.match(src,/gmwwOnlinePrivateTurnNotice\(offers\)/);
});
