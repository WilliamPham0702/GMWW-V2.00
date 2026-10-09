import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V3.17 runtime and native shell are aligned',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V3.54"'));
  assert.ok(app.includes("const VERSION='3.54';"));
  assert.ok(html.includes('GMWW V3.54'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 317;'));
  assert.ok(project.includes('MARKETING_VERSION = 3.17;'));
  assert.equal(pkg.version,'3.54.0');
});

test('Auto GM pause and resume preserves authoritative remaining time',()=>{
  const server=read('src/index.js');
  assert.ok(server.includes('autoPausedRemainingMs'));
  assert.ok(server.includes('runtime.deadlineAt=null;runtime.autoAdvance=false'));
  assert.ok(server.includes('runtime.deadlineAt=remaining>0?new Date(nowMs+Math.max(100,remaining)).toISOString():null'));
  assert.ok(server.includes('meta.cycleStartedAt=new Date(nowMs-Math.max(0,totalMs-remaining)).toISOString()'));
  assert.ok(server.includes('nightRuntime:runtime||null'));
});

test('GM IPA applies WebSocket game snapshots immediately and rejects stale REST state',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes('syncSerial:0'));
  assert.ok(app.includes('const syncSerial=++playSceneRuntime.syncSerial'));
  assert.ok(app.includes('if(syncSerial!==playSceneRuntime.syncSerial)return data'));
  assert.ok(app.includes('if(d.runtime)playSceneRuntime.nightRuntime=d.runtime'));
  assert.ok(app.includes('playSceneRuntime.roomSyncTimer=setTimeout'));
  assert.match(app,/renderPlayScene\(\);\s*if\(playSceneRuntime\.roomSyncTimer\)clearTimeout/);
});

test('Player Web consumes authoritative cycle, turn and Auto GM events with server clock',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes("if(Number.isFinite(Number(d.serverTime)))state.serverClockOffsetMs=Number(d.serverTime)-Date.now()"));
  assert.ok(live.includes("d.type==='night_turn'||d.type==='auto_gm'"));
  assert.ok(live.includes("state.room=d.room||state.room"));
});

test('Native IPA build is isolated to native-shell changes for V3.17',()=>{
  const workflow=read('.github/workflows/build-server-game-ipa.yml');
  assert.ok(workflow.includes('workflow_dispatch:'));
  assert.ok(workflow.includes('test "$IPA_BYTES" -gt 50000000'));
  assert.ok(workflow.includes('RESTORED_COUNT'));
  assert.ok(workflow.includes('walk-v263'));
  assert.ok(workflow.includes('walk-v266-left'));
  assert.ok(workflow.includes('Native build blocked:'));
  assert.ok(workflow.includes('Fast Runtime Snapshot workflow'));
  assert.ok(!workflow.includes('server-game/BUILD_IPA_REQUEST'));
});
