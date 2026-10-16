import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync('src/index.js', 'utf8');
const start = src.indexOf('const INTERACTION_BYTE_BUDGET');
const fnStart = src.indexOf('function pruneInteractions');
const fnText = src.slice(fnStart, src.indexOf('\n}\n', fnStart) + 3);
const { pruneInteractions } = new Function(
  src.slice(start, src.indexOf('function pruneInteractions', start)) + fnText + '; return { pruneInteractions };'
)();
const big = 'x'.repeat(2000);

test('V3.118 interactions are not trimmed to a fixed row count', () => {
  assert.doesNotMatch(src, /rows\.slice\(-100\)/);
  assert.match(src, /storage\.put\("interactions",pruneInteractions\(rows\)\)/);
});

test('V3.118 keeps full history when it fits the byte budget', () => {
  const rows = [];
  for (let i = 0; i < 700; i++) rows.push({ id: 'h' + i, type: 'thumb_vote', effectActive: true });
  assert.equal(pruneInteractions(rows).length, 700);
});

test('V3.118 over budget keeps live effects and the newest history, drops oldest history', () => {
  const rows = [{ id: 'old-frozen', type: 'frozen', effectActive: true, message: big }];
  for (let i = 0; i < 1200; i++) rows.push({ id: 'h' + i, type: 'thumb_vote', message: big });
  const kept = pruneInteractions(rows);
  assert.ok(kept.some(x => x.id === 'old-frozen'), 'live effect must survive');
  assert.equal(kept[kept.length - 1].id, 'h1199', 'newest row kept');
  assert.ok(!kept.some(x => x.id === 'h0'), 'oldest history dropped');
  const bytes = kept.reduce((n, x) => n + JSON.stringify(x).length, 0);
  assert.ok(bytes <= 1500000 + 3000, 'bounded by budget');
});

test('V3.118 ended effects are not kept as live', () => {
  const rows = [{ id: 'ended', type: 'dead', effectActive: false, message: big }];
  for (let i = 0; i < 1200; i++) rows.push({ id: 'h' + i, type: 'thumb_vote', message: big });
  assert.ok(!pruneInteractions(rows).some(x => x.id === 'ended'));
});
