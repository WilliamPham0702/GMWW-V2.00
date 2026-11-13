import {workerSource,workerModuleSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const index=workerSource();
const observerApi=workerModuleSource('http/gm-observer-api.js');
const part=read('src/player-web-src/36-gm-observer.part');

test('GM observer edge route only accepts the GM0702 member session', () => {
  assert.ok(index.includes('gm-observer\\/(state|action|interaction|day-action|chat-mute|auto)'));
  assert.match(index, /const GM_OBSERVER_LOGIN_ID="gm0702"/);
  const body = observerApi.slice(observerApi.indexOf('async function gmObserverApi'));
  assert.match(body, /members\/session/);
  assert.match(body, /!==GM_OBSERVER_LOGIN_ID\)return j\(\{ok:false,error:"GM_OBSERVER_FORBIDDEN"\},403\)/);
  // The member session check must come before the sync token is attached.
  assert.ok(body.indexOf('GM_OBSERVER_FORBIDDEN') < body.indexOf('GM_SYNC_TOKEN'));
});

test('GM observer forwards only the whitelisted GM handlers', () => {
  const from = index.indexOf('const GM_OBSERVER_ROUTES');
  const block = index.slice(from, index.indexOf('\n', from));
  for (const p of ['/gm/state', '/gm/battle-action', '/gm/interaction', '/gm/day-action', '/gm/chat/moderate', '/gm/auto']) {
    assert.ok(block.includes(p), p);
  }
  for (const p of ['/gm/reset', '/gm/delete', '/gm/kick', '/gm/end', '/gm/start']) assert.ok(!block.includes(p), p);
});

test('GM observer does not write the member into the room players roster', () => {
  const body = observerApi.slice(observerApi.indexOf('async function gmObserverApi'));
  assert.ok(!/\/join/.test(body));
  assert.ok(!/storage\.put\("players"/.test(body));
});

test('Player Web GM bar is gated to GM0702 and uses the observer routes', () => {
  assert.match(part, /const GM_LOGIN='gm0702'/);
  assert.match(part, /if\(obs\.mounted\|\|!isGmObserver\(\)\)return/);
  for (const op of ['state', 'interaction', 'chat-mute', 'auto']) assert.ok(part.includes("'" + op + "'"), op);
  assert.match(part, /type:'dead'/);
  assert.match(part, /type:'clear_state'/);
  assert.ok(!/\/join/.test(part));
});

test('Player Web bundle contains the GM observer part', () => {
  const live = read('src/gmww-members-live.js');
  assert.ok(live.includes('gmwwGmObserver'));
});

test('GM0702 can never become a player: join and GM roster setup both refuse it', () => {
  assert.match(index, /normalizeLoginId\(body\.member\.loginId\)===GM_OBSERVER_LOGIN_ID\)return j\(\{ok:false,error:"GM_OBSERVER_NOT_PLAYER"/);
  const from = index.indexOf('async gmParticipants');
  const block = index.slice(from, from + 1800);
  assert.match(block, /loginId===GM_OBSERVER_LOGIN_ID\)continue/);
});

test('Player Web GM bar picks the live room itself and has no room-code input', () => {
  assert.match(part, /api\('\/api\/rooms'\)/);
  assert.ok(!/createElement\('input'\)|el\('input'\)/.test(part));
  assert.ok(!/Mã phòng/.test(part));
});
