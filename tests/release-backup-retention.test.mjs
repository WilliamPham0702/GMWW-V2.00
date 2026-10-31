import test from 'node:test';
import assert from 'node:assert/strict';
import { planRetention, POLICY } from '../.github/scripts/release-backup-retention.mjs';

const now = Date.parse('2026-10-31T08:00:00Z');
let assetId = 100;
function release(type, version, published = '2026-10-01T00:00:00Z', opts = {}) {
  const tag = opts.tag || (type === 'ipa' ? 'gmww-v' : 'gmww-runtime-v') + version;
  const ext = type === 'ipa' ? '.ipa' : '.gmwwupdate';
  const name = (type === 'ipa' ? 'GMWW-V' : 'GMWW-Runtime-V') + version + ext;
  const asset = { id: assetId++, name, size: 100000000, digest: 'sha256:' + 'a'.repeat(64) };
  if (opts.digest === false) asset.digest = null;
  return { tag_name: tag, published_at: published, assets: [asset], draft: !!opts.draft };
}
function plan(releases, extra = {}) { return planRetention(releases, { now, ...extra }); }

test('keeps five newest Runtime versions and three newest IPA versions', () => {
  const runtime = [280, 279, 278, 277, 276, 275, 274].map(n => release('runtime', '3.' + n));
  const ipa = [275, 264, 257, 202, 201].map(n => release('ipa', '3.' + n));
  const result = plan([...runtime, ...ipa]);
  assert.deepEqual(result.deletions.map(x => x.version), ['3.275', '3.274', '3.202', '3.201']);
  assert.equal(result.backups.length, 2);
  assert.equal(result.potentialBytes, 400000000);
});
test('keeps both published links for recent Runtime versions', () => {
  const items = [release('runtime', '3.280', undefined, { tag: 'gmww-v3.280' }),
    release('runtime', '3.280')];
  for (const v of [279, 278, 277, 276, 275]) items.push(release('runtime', '3.' + v));
  assert.deepEqual(plan(items).deletions.map(x => x.version), ['3.275']);
});
test('does not remove pinned native baselines, source references, or legacy release', () => {
  const items = [release('ipa', '3.275'), release('ipa', '3.264'),
    release('ipa', '3.257'), release('ipa', '3.200'), release('ipa', '3.197'),
    release('ipa', '3.196'), release('ipa', '3.110')];
  const result = plan(items, { referencedTags: ['gmww-v3.197'] });
  assert.deepEqual(result.deletions.map(x => x.version), ['3.196', '3.110']);
});
test('does not prune young, unverifiable, draft, or unrelated artifacts', () => {
  const items = [280, 279, 278, 277, 276].map(n => release('runtime', '3.' + n));
  items.push(release('runtime', '3.275', '2026-10-30T00:00:00Z'));
  items.push(release('runtime', '3.274', undefined, { digest: false }));
  items.push(release('runtime', '3.273', undefined, { draft: true }));
  items.push({ tag_name: 'arena3d-qa', published_at: '2026-10-01T00:00:00Z',
    assets: [{ id: assetId++, name: 'GMWW-Arena3D-QA.ipa', size: 100000000 }] });
  assert.equal(plan(items).deletions.length, 0);
});
test('selects one monthly restore snapshot for each type', () => {
  const releases = [280, 279, 278, 277, 276, 275, 274].map(n => release('runtime', '3.' + n));
  const result = plan(releases);
  assert.equal(result.backups.length, 1);
  assert.equal(result.backups[0].version, '3.280');
  assert.equal(result.backups[0].type, 'runtime');
});
test('caps deletion count for safe incremental cleanup', () => {
  const items = [];
  for (let n = 280; n >= 240; n--) items.push(release('runtime', '3.' + n));
  const result = plan(items);
  assert.equal(result.deletions.length, POLICY.maxDeletesPerRun);
  assert.equal(result.potentialBytes, POLICY.maxDeletesPerRun * 100000000);
});
