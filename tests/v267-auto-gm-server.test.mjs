import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.67 moves Auto GM authority to Cloudflare Durable Object alarms',()=>{
  const server=read('src/index.js');
  assert.ok(server.includes('async gmAuto(request,body)'));
  assert.ok(server.includes('async scheduleRoomAlarm(meta=null)'));
  assert.ok(server.includes('async runAutoAdvanceIfDue(meta)'));
  assert.ok(server.includes('await this.runAutoAdvanceIfDue(meta)'));
  assert.ok(server.includes('meta.autoGM=enabled'));
  assert.ok(server.includes('autoGM:m.autoGM!==false'));
  assert.ok(server.includes('/gm/auto'));
  assert.ok(server.includes('/api\\/gm\\/rooms\\/([A-Za-z0-9]+)\\/auto'));
});

test('server auto cycle advances night turns, enters morning, then starts the next night',()=>{
  const server=read('src/index.js');
  assert.ok(server.includes('await this.advanceNightRuntime(meta,"next","auto")'));
  assert.ok(server.includes('await this.applyCycle(fresh,"morning",night,"morning-"+night,"auto")'));
  assert.ok(server.includes('await this.applyCycle(meta,"night",night+1,"night-"+(night+1),"auto")'));
  assert.ok(server.includes('villageDiscussionSec'));
  assert.ok(server.includes('runtime.completed)return Date.now()'));
});

test('manual turn/cycle and Auto GM endpoints are serialized against server alarms',()=>{
  const server=read('src/index.js');
  assert.ok(server.includes("'/gm/cycle','/gm/turn','/gm/auto'"));
  assert.ok(server.includes('return j(await this.applyCycle(meta,phase,night,cycleKey'));
  assert.ok(server.includes('await this.scheduleRoomAlarm(meta)'));
});

test('GM IPA no longer owns live Auto GM timing and syncs the authoritative server toggle',()=>{
  const app=read('server-game/current/app.js');
  const start=app.indexOf('function syncPlayAutoAdvance()'),end=app.indexOf('async function advancePlayPhase()',start),segment=app.slice(start,end);
  assert.ok(segment.includes('Cloudflare Durable Object'));
  assert.doesNotMatch(segment,/setTimeout\(async/);
  assert.ok(app.includes("playRoomApi('/auto'"));
  assert.ok(app.includes("addEventListener('click',togglePlayAutoGM)"));
  assert.ok(app.includes("playSceneState.autoGM=room.autoGM!==false"));
  assert.ok(app.includes("['night_turn','room_cycle','auto_gm'].includes(d.type)"));
});

test('V2.72 metadata is consistent',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V2.72"'));
  assert.ok(app.includes("const VERSION='2.72';"));
  assert.ok(html.includes('GMWW V2.72'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 272;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.72;'));
  assert.equal(pkg.version,'2.72.0');
});
