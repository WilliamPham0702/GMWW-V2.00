import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoRunner } from '../src/gmww-demo-runner.js';

test('refuses to start against a live room', () => {
  const adapter = { snapshot() {}, legalActions() {}, apply() {}, advance() {} };
  assert.throws(() => createDemoRunner(adapter, { roomCode: 'REAL', isDemoRoom: false }), /isolated demo/);
});
test('chooses an allowed action and completes without touching other rooms', async () => {
  const played = [];
  let finished = false;
  const adapter = {
    snapshot: async () => ({ roomCode: 'DEMO1', isDemoRoom: true, finished }),
    legalActions: async () => [{ id: 'heal' }, { id: 'bite' }],
    apply: async action => { played.push(action.id); finished = true; },
    advance: async () => assert.fail('advance should not run when legal actions exist'),
  };
  const runner = createDemoRunner(adapter, { roomCode: 'DEMO1', isDemoRoom: true, random: () => 0.9, wait: async () => {} });
  runner.resume();
  await runner.pending;
  assert.deepEqual(played, ['bite']);
  assert.equal(runner.info().status, 'finished');
  assert.equal(runner.info().steps, 1);
});
test('no legal action advances to the next stage', async () => {
  let moves = 0;
  const runner = createDemoRunner({
    snapshot: async () => ({ roomCode: 'DEMO2', isDemoRoom: true, finished: moves > 0 }),
    legalActions: async () => [],
    apply: async () => assert.fail('unexpected action'),
    advance: async () => { moves++; }
  }, { roomCode: 'DEMO2', isDemoRoom: true, wait: async () => {} });
  runner.resume();
  await runner.pending;
  assert.equal(moves, 1);
  assert.equal(runner.info().status, 'finished');
});
test('pausing prevents subsequent steps; resume continues', async () => {
  let ticks = 0, didPause = false, runner;
  const adapter = {
    snapshot: async () => ({ roomCode: 'DEMO3', isDemoRoom: true, finished: ticks >= 2 }),
    legalActions: async () => [],
    apply: async () => {},
    advance: async () => { ticks++; }
  };
  runner = createDemoRunner(adapter, {
    roomCode: 'DEMO3', isDemoRoom: true,
    wait: async () => { if (!didPause) { didPause = true; runner.pause(); } }
  });
  runner.resume();
  await runner.pending;
  assert.equal(ticks, 1);
  assert.equal(runner.info().status, 'paused');
  runner.resume();
  await runner.pending;
  assert.equal(ticks, 2);
  assert.equal(runner.info().status, 'finished');
});
test('rejects a mismatched adapter snapshot before executing actions', async () => {
  let called = false;
  const runner = createDemoRunner({
    snapshot: async () => ({ roomCode: 'LIVE', isDemoRoom: false }),
    legalActions: async () => { called = true; return []; },
    apply: async () => {},
    advance: async () => {}
  }, { roomCode: 'DEMO4', isDemoRoom: true, wait: async () => {} });
  runner.resume();
  await runner.pending;
  assert.equal(called, false);
  assert.equal(runner.info().status, 'error');
  assert.match(runner.info().lastError, /boundary violation/);
});
