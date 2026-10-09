import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('src/index.js', 'utf8');
const wrappedPlayer = fs.readFileSync('src/gmww-members-live.js', 'utf8');
const player = JSON.parse(wrappedPlayer.trim().replace(/^export const gmwwMembersLiveScript = /, '').replace(/;$/, ''));

test('GM invitation immediately sets automatic readiness without requiring a seat', () => {
  const start = worker.indexOf('async gmParticipants(request,body)');
  const end = worker.indexOf('async gmRoomSettings(request,body)', start);
  const block = worker.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(block, /ready:true,reservedByGM:true/);
  assert.match(worker, /if\(p\)\{p.seatId=null;p.ready=p.reservedByGM===true\}continue/);
});

test('GM manual seat and randomized seat retain automatic readiness', () => {
  const start = worker.indexOf('async gmSeat(request,body)');
  const end = worker.indexOf('roomExpiryDue(meta)', start);
  const block = worker.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.equal(block.match(/player.seatId=seatId;player.ready=player.reservedByGM===true/g)?.length, 2);
  assert.match(block, /occupied.ready=occupied.reservedByGM===true/);
});

test('GM invitation readiness cannot be undone by stale heartbeat or join', () => {
  assert.match(worker, /ready:reserved===true\|\|\(players\[key\]\?\.ready\?\?m.ready\?\?false\)/);
  assert.match(worker, /if\(players\[id\]\.reservedByGM===true\)players\[id\]\.ready=true/);
  assert.match(worker, /players\[id\]\.ready=players\[id\]\.reservedByGM===true\|\|!!body.ready/);
});

test('Player Web displays automatic status without manual Sẵn Sàng controls', () => {
  const start = player.indexOf('function ensureVillageReadyDock(){');
  const end = player.indexOf('function syncPlayerSetupState(){', start);
  const dock = player.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(dock, /<button class="ready"/);
  assert.ok(dock.includes("state.ready=!!me.ready"));
  assert.ok(dock.includes("updatePlayerTopMenu();"));
  assert.doesNotMatch(dock, /ĐÃ SẴN SÀNG|RỜI GHẾ|RỜI PHÒNG/);
  assert.doesNotMatch(player, /readyButton|toggleReady\(/);
  assert.match(player, /#gmwwVillageReadyDock \.leave\{display:block\}/);
});
