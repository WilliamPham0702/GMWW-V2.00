import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const server=fs.readFileSync('src/index.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
test('One approved binary icon exists at direct and OTA source with exact SHA-256',()=>{
 const a=fs.readFileSync('server-game/current/action-icons/v3/51_yeu_tinh_three_way.webp');
 const b=fs.readFileSync('assets/action-icons/v3/51_yeu_tinh_three_way.webp');
 assert.deepEqual(a,b);assert.equal(createHash('sha256').update(a).digest('hex'),'7e6a3bc3fc63993c4b9ebe0da8bf39099b5a5d8a9f2f4a02dad95778a8320c9a');
});
test('Composite Fairy uses one icon and three hit regions, preserving drag-only moves',()=>{
 assert.match(battle,/assetId:'51_yeu_tinh_three_way.png'/);assert.match(battle,/is-fairy-triptych/);
 assert.match(battle,/fairyDirection:battleIsTransfer\(action\)\?/);
 assert.match(battle,/\.33\?'left'/);assert.match(battle,/\.67\?'right':'none'/);
 assert.match(battle,/battleState\.transferDir=d\.fairyDirection\|\|'none'/);
 assert.match(battle,/if\(!moved\)\{/);assert.match(css,/\.battle-fire-icon\.is-fairy-triptych/);
 assert.equal((battle.match(/assetId:'51_yeu_tinh_three_way.png'/g)||[]).length,1);
});
test('Audio happens on icon tap; Fairy confirmation bypasses targetCount and Server validates direction',()=>{
 assert.match(battle,/if\(!playAudioMuted\(\)\)void battlePlayConfiguredAudio\('actions',a\.actionId,a\.name\)/);
 assert.match(battle,/\(!transferAct&&battleState\.targets\.length!==a\.targetCount\)/);
 assert.match(battle,/\['left','none','right'\]\.includes\(battleState\.transferDir\)/);
 assert.match(server,/INVALID_FAIRY_DIRECTION/);assert.match(server,/targets\.length!==1\|\|targets\[0\]!==actorId/);
 assert.ok(app.includes('fairyDirection:battleIsTransfer(action)'));
});
