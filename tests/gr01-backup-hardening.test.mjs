import test from 'node:test';
import assert from 'node:assert/strict';
import { canonical, makeBackup, validateBackup } from '../tools/gr01-backup-core.mjs';

test('canonical JSON is deterministic across key insertion order', () => {
 assert.equal(canonical({ z: [3, 2, 1], a: { y: 1, x: 2 } }), canonical({ a: { x: 2, y: 1 }, z: [3, 2, 1] }));
});
test('fail closed on lossy JSON values and cycles', () => {
 const invalid = [undefined, BigInt(2), NaN, Infinity, -0, new Date(), new Uint8Array([2]), new Map(), [, 2], [undefined]];
 const cycle = { a: 1 }; cycle.self = cycle; invalid.push(cycle);
 for (const value of invalid) assert.throws(() => makeBackup([{ key: 'x', value }]), /Unsupported|Cyclic|Non-JSON|Sparse/);
});
test('makeBackup deep clones source and keeps its checksum stable', () => {
 const value = { nested: { count: 3 } };
 const b = makeBackup([{ key: 'x', value }]); value.nested.count = 9;
 assert.equal(b.entries[0].value.nested.count, 3);
 assert.equal(validateBackup(b), true);
});
test('reject altered metadata with intact record hashes', () => {
 const b = makeBackup([{ key: 'x', value: 1 }]); b.source = 'injected';
 assert.throws(() => validateBackup(b), /checksum mismatch/i);
});
test('reject duplicate metadata records on validation', () => {
 const b = makeBackup([{ key: 'x', value: 1 }]);
 b.entries.push(structuredClone(b.entries[0]));
 assert.throws(() => validateBackup(b), /Duplicate storage key/);
});
