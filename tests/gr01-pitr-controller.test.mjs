import test from 'node:test';
import assert from 'node:assert/strict';
import controller from '../tools/gr01-pitr-controller-worker.mjs';
import { authorizedPitr } from '../src/gr01-pitr-auth.js';

const TOKEN = 'gr01-controller-' + 'a'.repeat(64);
const INTERNAL = 'gr01-internal-' + 'b'.repeat(64);
const ids = ['a'.repeat(64), 'b'.repeat(64)];
const memory = () => {
 const values = new Map();
 const env = {
  GR01_CONTROLLER_TOKEN: TOKEN, GR01_INTERNAL_PITR_TOKEN: INTERNAL,
  GR01_NAMESPACE_LABEL: 'isolated-unit-fixture',
  SOURCE: {
   idFromString(id) { if (!ids.includes(id)) throw Error('unknown object'); return id; },
   get(id) {
    return { async fetch(url, opts) {
     assert.equal(new URL(url).pathname, '/__gr01/pitr/bookmark');
     assert.equal(opts.headers.authorization, 'Bearer ' + INTERNAL);
     return Response.json({ ok: true, bookmark: '0000-' + id.slice(0, 8), databaseSize: 450, recordedAt: '2026-10-11T00:00:00Z' });
    } };
   }
  },
  GR01_MARKERS: { async put(key, value) { values.set(key, value); }, async get(key) { return values.get(key); } }
 };
 return { env, values };
};
const call = (path, body, token = TOKEN) => new Request('https://isolated' + path, {
 method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
 body: JSON.stringify(body)
});
test('internal bookmark authorization fails closed', async () => {
 const request = new Request('https://isolated', { headers: { authorization: 'Bearer ' + INTERNAL } });
 assert.equal(await authorizedPitr(request, INTERNAL), true);
 assert.equal(await authorizedPitr(request, ''), false);
 assert.equal(await authorizedPitr(request, 'different' + INTERNAL), false);
 assert.equal(await authorizedPitr(new Request('https://isolated'), INTERNAL), false);
});
test('controller captures two read-only recovery markers and verifies immutable manifest', async () => {
 const { env, values } = memory();
 const capture = await controller.fetch(call('/capture', { ids }), env);
 assert.equal(capture.status, 200); const data = await capture.json();
 assert.equal(data.ok, true); assert.equal(data.sourceCount, 2);
 assert.equal(data.productionRestoreEnabled, false);
 assert.equal(values.size, 1);
 const verify = await controller.fetch(call('/verify', { backupId: data.backupId }), env);
 assert.equal(verify.status, 200); assert.equal((await verify.json()).integrity, 'VERIFIED');
});
test('controller never publishes unauthorized backup data', async () => {
 const { env, values } = memory();
 const response = await controller.fetch(call('/capture', { ids }, 'WRONG'), env);
 assert.equal(response.status, 404);
 assert.equal(values.size, 0);
});
test('controller rejects duplicates, invalid IDs and extra Production restore routes', async () => {
 const { env, values } = memory();
 for (const list of [[ids[0], ids[0]], ['invalid'], []]) {
  const response = await controller.fetch(call('/capture', { ids: list }), env);
  assert.equal(response.status, 400);
 }
 assert.equal((await controller.fetch(call('/restore', { ids }), env)).status, 404);
 assert.equal(values.size, 0);
});
test('controller detects corrupt saved manifest', async () => {
 const { env, values } = memory();
 const first = await (await controller.fetch(call('/capture', { ids }), env)).json();
 const key = [...values.keys()][0]; const corrupt = JSON.parse(values.get(key));
 corrupt.records[0].bookmark = 'tampered'; values.set(key, JSON.stringify(corrupt));
 const response = await controller.fetch(call('/verify', { backupId: first.backupId }), env);
 assert.equal(response.status, 500);
 assert.equal((await response.json()).integrity, 'FAILED');
});
