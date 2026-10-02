#!/usr/bin/env node
/**
 * GMWW V2 local-only room readiness smoke test.
 * Creates an isolated temporary room, joins 30 guest clients, marks them ready,
 * checks heartbeat and room state, then leaves. No card/Artifact/gameplay writes.
 * Node.js >= 22. Run against LOCAL Wrangler only.
 */
import assert from 'node:assert/strict';

const base = new URL(process.env.GMWW_TEST_BASE || 'http://127.0.0.1:8787');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) {
  throw new Error('Safety guard: only local Wrangler is allowed; never run this against production.');
}
const count = Number(process.env.GMWW_TEST_PLAYERS || 30);
if (!Number.isInteger(count) || count < 1 || count > 30) throw new Error('GMWW_TEST_PLAYERS must be 1..30');
const url = path => new URL(path, base);
const request = async (path, method = 'GET', body) => {
  const res = await fetch(url(path), {
    method, headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json().catch(() => ({}));
  assert.ok(res.ok && data.ok !== false, `${method} ${path}: HTTP ${res.status}, ${JSON.stringify(data).slice(0,300)}`);
  return data;
};
let roomCode;
const joined = [];
try {
  const health = await request('/api/health');
  assert.equal(health.project, 'GMWW-V2.00');
  const catalog = await request('/api/avatars');
  assert.ok(Array.isArray(catalog.avatars) && catalog.avatars.length, 'No usable avatar found');
  const avatarId = catalog.avatars.find(a => a.id)?.id;
  assert.ok(avatarId);
  const created = await request('/api/rooms', 'POST', { roomName: 'LOCAL CI 30-player readiness' });
  roomCode = created.roomCode;
  assert.match(roomCode, /^[A-Z0-9]+$/);
  console.log(`Local room ${roomCode}: joining ${count} guests`);
  // Sequential joins isolate correctness from transport saturation; ready checks are concurrent.
  for (let i = 0; i < count; i++) {
    const guest = { displayName: `Test ${String(i + 1).padStart(2, '0')}`, avatarId, guestId: `local-smoke-${roomCode}-${i}` };
    const result = await request(`/api/rooms/${roomCode}/join`, 'POST', { guest });
    assert.ok(result.player?.participantId);
    joined.push(result.player.participantId);
  }
  assert.equal(new Set(joined).size, count, 'Participant IDs must be unique');
  let state = await request(`/api/rooms/${roomCode}`);
  assert.equal(state.players.length, count, 'All joined guests should appear in room');
  await Promise.all(joined.map(participantId =>
    request(`/api/rooms/${roomCode}/ready`, 'POST', { participantId, ready: true })
  ));
  state = await request(`/api/rooms/${roomCode}`);
  assert.equal(state.players.filter(p => p.ready).length, count, 'All guests should be ready');
  const hb = await request(`/api/rooms/${roomCode}/heartbeat`, 'POST', { participantId: joined[0], ready: true });
  assert.equal(hb.player?.participantId, joined[0]);
  console.log(`PASS: ${count} guests joined, ready, visible, and heartbeat works`);
} finally {
  if (roomCode) {
    const outcomes = await Promise.allSettled(joined.map(id =>
      request(`/api/rooms/${roomCode}/leave`, 'POST', { participantId: id })
    ));
    const failures = outcomes.filter(x => x.status === 'rejected');
    if (failures.length) console.warn(`Cleanup warning: ${failures.length} guest leave requests failed`);
    else console.log('Cleanup: all test guests left the local room');
  }
}
