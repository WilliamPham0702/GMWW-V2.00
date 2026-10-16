import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync('src/index.js', 'utf8');
const fnText = src.slice(src.indexOf('function pruneInteractions'), src.indexOf('\n}\n', src.indexOf('function pruneInteractions')) + 3);
const { pruneInteractions } = new Function(
  'const INTERACTION_KEEP=600,LIVE_EFFECT_TYPES=new Set(["frozen","expelled","dead","assassin_mark","status"]);' + fnText + '; return { pruneInteractions };'
)();

test('V3.117 interaction storage no longer trims to the last 100 rows', () => {
  assert.doesNotMatch(src, /rows\.slice\(-100\)/);
  assert.match(src, /storage\.put\("interactions",pruneInteractions\(rows\)\)/);
});

test('V3.117 keeps an old live frozen effect when newer history fills the store', () => {
  const rows = [{ id: 'old-frozen', type: 'frozen', effectActive: true, loginId: 'a' }];
  for (let i = 0; i < 700; i++) rows.push({ id: 'h' + i, type: 'thumb_vote', effectActive: true });
  const kept = pruneInteractions(rows);
  assert.ok(kept.some(x => x.id === 'old-frozen'), 'live frozen effect must survive');
  assert.ok(kept.length <= 601, 'history is bounded');
  assert.equal(kept[kept.length - 1].id, 'h699');
});

test('V3.117 drops ended effects and old history beyond the bound', () => {
  const rows = [{ id: 'ended', type: 'dead', effectActive: false }];
  for (let i = 0; i < 700; i++) rows.push({ id: 'h' + i, type: 'thumb_vote' });
  const kept = pruneInteractions(rows);
  assert.ok(!kept.some(x => x.id === 'ended'));
  assert.ok(!kept.some(x => x.id === 'h0'));
  assert.equal(kept.length, 600);
});
