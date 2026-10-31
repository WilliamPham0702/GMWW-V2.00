import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '../.github/scripts/update-runtime-download-catalog.mjs';

const repo = 'WilliamPham0702/GMWW-V2.00';
function release(version, channel = 'gmww-v', valid = true) {
  const tag = channel + version;
  const prefix = 'https://github.com/' + repo + '/releases/download/' + tag + '/';
  const base = 'GMWW-Runtime-V' + version + '.gmwwupdate';
  return {
    tag_name: tag, draft: false, prerelease: false,
    assets: [
      { name: base, browser_download_url: valid ? prefix + base : 'https://invalid.example/' + base },
      { name: base + '.sha256', browser_download_url: prefix + base + '.sha256' }
    ]
  };
}
test('one canonical original download per version, prefer production', () => {
  const docs = buildCatalog([
    release('3.280','gmww-runtime-v'),
    release('3.279'),
    release('3.280'),
    release('3.278','gmww-runtime-v')
  ]);
  assert.match(docs, /\*\*3 phiên bản Runtime duy nhất/);
  assert.ok(docs.indexOf('V3.280') < docs.indexOf('V3.279'));
  assert.ok(docs.includes('releases/download/gmww-v3.280/GMWW-Runtime-V3.280.gmwwupdate'));
  assert.ok(!docs.includes('releases/download/gmww-runtime-v3.280/GMWW-Runtime-V3.280.gmwwupdate'));
  assert.ok(docs.includes('GMWW-Runtime-V3.280.gmwwupdate.sha256'));
});
test('do not display drafts, prereleases, other file hosts, or missing binaries', () => {
  const draft = release('3.275'); draft.draft = true;
  const pre = release('3.274'); pre.prerelease = true;
  const docs = buildCatalog([draft, pre, release('3.276','gmww-v',false), release('3.277')]);
  assert.match(docs, /\*\*1 phiên bản Runtime duy nhất/);
  assert.ok(!docs.includes('V3.275'));
  assert.ok(!docs.includes('V3.276'));
  assert.ok(docs.includes('V3.277'));
});
test('reject non-repository scope and invalid input', () => {
  assert.throws(() => buildCatalog([], '../evil'));
  assert.throws(() => buildCatalog(null));
});

test('production and Runtime OTA guards include only the catalog file set', async () => {
  const { readFileSync } = await import('node:fs');
  const production = readFileSync(new URL('../.github/workflows/deploy-production.yml', import.meta.url), 'utf8');
  const ota = readFileSync(new URL('../.github/workflows/github-runtime-ota.yml', import.meta.url), 'utf8');
  for (const scope of [production, ota]) {
    assert.ok(scope.includes("'.github/workflows/runtime-download-catalog.yml'"));
    assert.ok(scope.includes("'.github/scripts/update-runtime-download-catalog.mjs'"));
    assert.ok(scope.includes("'tests/runtime-download-catalog.test.mjs'"));
    assert.ok(scope.includes('CATALOG_ONLY'));
  }
  assert.match(production, /SHOULD_DEPLOY=false\s+echo 'Runtime download catalog links only/);
  assert.match(ota, /SKIP_AUTO_RELEASE=true\s+echo 'Download catalog only/);
});
