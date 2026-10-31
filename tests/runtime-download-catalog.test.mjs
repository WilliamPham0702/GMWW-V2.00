import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, buildCatalogs } from '../.github/scripts/update-runtime-download-catalog.mjs';

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
    assert.ok(scope.includes('update-runtime-download-catalog.mjs'));
  }
  assert.match(production, /SHOULD_DEPLOY=false\s+echo 'Runtime download catalog links only/);
  assert.match(ota, /SKIP_AUTO_RELEASE=true\s+echo 'Download catalog only/);
});

test('index shows up to five Runtime and three IPA; old downloads remain in history', () => {
  const releases = [];
  for (const version of ['3.280','3.279','3.278','3.277','3.276','3.275','3.274']) {
    releases.push(release(version));
    const tag = 'gmww-v' + version;
    const name = 'GMWW-V' + version + '.ipa';
    releases.push({
      tag_name: tag,
      assets: [{name, browser_download_url:
        'https://github.com/' + repo + '/releases/download/' + tag + '/' + name}]
    });
  }
  const docs = buildCatalogs(releases);
  assert.match(docs.index, /## 2\. IPA/);
  assert.match(docs.index, /## 3\. BACKUP/);
  assert.ok(docs.index.includes('V3.280'));
  assert.ok(!docs.index.includes('[⬇️ Tải gốc](https://github.com/' +
    repo + '/releases/download/gmww-v3.274/GMWW-Runtime-V3.274.gmwwupdate)'));
  assert.ok(docs.runtimeHistory.includes('GMWW-Runtime-V3.274.gmwwupdate'));
  assert.ok(docs.ipaHistory.includes('GMWW-V3.274.ipa'));
  const rtIndex = docs.index.split('## 2. IPA')[0];
  assert.equal((rtIndex.match(/\[⬇️ Tải gốc\]/g) || []).length, 5);
  const ipaIndex = docs.index.split('## 2. IPA')[1].split('## 3. BACKUP')[0];
  assert.equal((ipaIndex.match(/\[⬇️ Tải gốc\]/g) || []).length, 3);
});
test('monthly backups are links only and are never created by the catalog', () => {
  const tag = 'gmww-backup-2026-10';
  const name = 'GMWW-Backup-ipa-2026-10-V3.275.ipa';
  const docs = buildCatalogs([{
    tag_name: tag, published_at: '2026-10-31T00:00:00Z',
    assets: [{name, browser_download_url:
      'https://github.com/' + repo + '/releases/download/' + tag + '/' + name}]
  }]);
  assert.match(docs.index, /GMWW-Backup-ipa-2026-10-V3\.275\.ipa/);
  assert.match(docs.index, /Runtime backup/);
});

test('new verified QA artifact appears in same catalog without being mislabeled Production', () => {
  const artifact = {
    id: 13030570990, name: 'GMWW-Runtime-V3.284-GitHub-verified',
    expired: false, created_at: '2026-10-31T04:30:02Z',
    expires_at: '2027-01-29T04:28:55Z',
    digest: 'sha256:' + 'a'.repeat(64),
    workflow_run: { id: 41168734658 }
  };
  const docs = buildCatalogs([release('3.280')], repo, [artifact]);
  assert.match(docs.index, /V3\.284 — QA \/ KHÔNG CÀI/);
  assert.match(docs.index, /CHỈ CÀI RUNTIME PRODUCTION/);
  assert.match(docs.index, /KHÔNG dùng \.gmwwupdate QA/);
  assert.ok(docs.index.indexOf('## 4. QA') > docs.index.indexOf('## 3. BACKUP'));
  assert.ok(!docs.index.includes('Gói mới nhất trên GitHub: V3.284'));
  assert.ok(!docs.index.split('## 2. IPA')[0].includes('V3.284'));
  assert.match(docs.index, /actions\/runs\/41168734658\/artifacts\/13030570990/);
  assert.match(docs.index, /V3\.280/);
  assert.ok(docs.index.indexOf('V3.280') < docs.index.indexOf('V3.284'));
  assert.match(docs.index, /chưa phát hành Production/);
  assert.ok(!docs.index.includes('releases/download/gmww-v3.284'));
  assert.ok(!docs.runtimeHistory.includes('3.284'));
});
test('expired, invalid and already released QA artifacts do not appear', () => {
  const make = (version,id,expired=false) => ({
    id, name:'GMWW-Runtime-V' + version + '-GitHub-verified', expired,
    workflow_run: {id: 41168734658}
  });
  const docs = buildCatalogs([release('3.280')],repo,[
    make('3.284',22,true), make('3.283',0), make('3.280',45),
    {...make('3.282',55), workflow_run: {id:0}}, make('3.285',88)
  ]);
  assert.ok(docs.index.includes('V3.285 — QA / KHÔNG CÀI'));
  assert.ok(!docs.index.includes('V3.284 — QA / KHÔNG CÀI'));
  assert.ok(!docs.index.includes('V3.280 — QA / KHÔNG CÀI'));
  assert.ok(!docs.index.includes('V3.283 — QA / KHÔNG CÀI'));
});
test('catalog synchronization triggers on verified Actions completion and refreshes expired links', async () => {
  const { readFileSync } = await import('node:fs');
  const workflow = readFileSync(new URL('../.github/workflows/runtime-download-catalog.yml', import.meta.url), 'utf8');
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/Publish GMWW Runtime on GitHub \(No Cloudflare\)/);
  assert.match(workflow,/workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/actions: read/);
  assert.match(workflow,/schedule:/);
  assert.ok(!workflow.includes('actions/download-artifact'));
});
