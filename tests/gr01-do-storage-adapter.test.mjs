import test from 'node:test';
import assert from 'node:assert/strict';
import { exportDoStorage, restoreDoStorage } from '../tools/gr01-do-storage-adapter.mjs';

class FakeDoStorage {
 constructor(data = []) { this.data = new Map(data); this.failOnKey = null; this.bookmark = 0; }
 async list() { return new Map(this.data); }
 async get(k) { return this.data.get(k); }
 async put(k, v) {
  if (k === this.failOnKey) throw Error('Simulated disk error');
  this.data.set(k, v); this.bookmark += 1;
 }
 async getCurrentBookmark() { return this.bookmark; }
 async transaction(callback) {
  const tx = new FakeDoStorage([...this.data]);
  tx.failOnKey = this.failOnKey;
  const result = await callback(tx);
  this.data = new Map(tx.data);
  this.bookmark = tx.bookmark;
  return result;
 }
}
const env = 'gr01-isolated-staging';
test('DO storage interface exports and verifies atomic isolated restore', async () => {
 const source = new FakeDoStorage([['meta', { phase: 'night' }], ['players', [{ id: 'a' }]], ['artifactUse:1', { used: true }]]);
 const backup = await exportDoStorage(source, { environment: env, instanceId: 'fixture-room' });
 const dest = new FakeDoStorage();
 await restoreDoStorage(backup, dest, { environment: env });
 assert.equal((await dest.list()).size, 0);
 assert.deepEqual(await restoreDoStorage(backup, dest, { environment: env, dryRun: false }), { count: 3, dryRun: false, verified: true });
 assert.deepEqual(await dest.list(), await source.list());
});
test('production environment blocked', async () => {
 await assert.rejects(() => exportDoStorage(new FakeDoStorage(), { environment: 'production', instanceId: 'x' }), /Only isolated/);
 await assert.rejects(() => restoreDoStorage({}, new FakeDoStorage(), { environment: 'production' }), /Only isolated/);
});
test('nonempty target rejected', async () => {
 const b = await exportDoStorage(new FakeDoStorage([['meta', 1]]), { environment: env, instanceId: 'x' });
 await assert.rejects(() => restoreDoStorage(b, new FakeDoStorage([['existing', 1]]), { environment: env, dryRun: false }), /empty/);
});
test('transaction rollback preserves empty target on write failure', async () => {
 const b = await exportDoStorage(new FakeDoStorage([['a', 1], ['b', 2]]), { environment: env, instanceId: 'x' });
 const target = new FakeDoStorage();
 target.failOnKey = 'b';
 await assert.rejects(() => restoreDoStorage(b, target, { environment: env, dryRun: false }), /Simulated disk error/);
 assert.equal((await target.list()).size, 0);
});
test('refuse unsafe, non-transactional target', async () => {
 const b = await exportDoStorage(new FakeDoStorage([['a', 1]]), { environment: env, instanceId: 'x' });
 const nonAtomic = { list: async () => new Map(), put: async () => {} };
 await assert.rejects(() => restoreDoStorage(b, nonAtomic, { environment: env, dryRun: false }), /Transactional restore/);
});
test('concurrent write detected during export', async () => {
 const source = new FakeDoStorage([['a', 1]]);
 const baseList = source.list.bind(source);
 source.list = async () => { const snapshot = await baseList(); source.bookmark += 1; return snapshot; };
 await assert.rejects(() => exportDoStorage(source, { environment: env, instanceId: 'x' }), /changed during export/);
});
