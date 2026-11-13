import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyPublishedRuntimeCatalog} from '../.github/scripts/verify-published-runtime-catalog.mjs';

const sha=n=>String(n).repeat(64).slice(0,64);
const manifest=(over={},files)=>({releaseVersion:'3.321',runtimeVersion:'3.321',shellVersion:'3.264',minimumShellVersion:'3.264',releaseType:'runtime',delete:[],
  runtime:{files:files||[{path:'app.js',url:'https://x/updates/runtime/V3.321/app.js',sha256:sha('a')},{path:'GMWW.html',url:'https://x/updates/runtime/V3.321/GMWW.html',sha256:sha('b')}]},...over});

test('identical published package is accepted regardless of file order',()=>{
  const published=manifest();
  const candidate=manifest({},[...published.runtime.files].reverse());
  assert.deepEqual(verifyPublishedRuntimeCatalog(candidate,published),{version:'3.321',files:2});
});

test('any byte, file-set, URL or identity difference is rejected',()=>{
  const published=manifest();
  const changed=manifest({},[{...published.runtime.files[0],sha256:sha('c')},published.runtime.files[1]]);
  assert.throws(()=>verifyPublishedRuntimeCatalog(changed,published),/differs from the published V3\.321 in 1 file\(s\): app\.js/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({},[published.runtime.files[0]]),published),/GMWW\.html/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({},[{...published.runtime.files[0],url:'https://evil/app.js'},published.runtime.files[1]]),published),/app\.js/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({releaseVersion:'3.322',runtimeVersion:'3.322'}),published),/releaseVersion differs/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({shellVersion:'3.309'}),published),/shellVersion differs/);
});

test('incomplete or non-runtime manifests fail closed',()=>{
  const published=manifest();
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({},[]),published),/no file inventory/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({releaseType:'server_only'}),published),/not a runtime release/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({delete:['old.js']}),published),/deletes files/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(manifest({},[{path:'app.js',sha256:'xyz'}]),published),/Invalid Runtime inventory entry/);
  assert.throws(()=>verifyPublishedRuntimeCatalog(null,published),/no file inventory/);
});

test('Worker-only delivery embeds the catalog only after the published-package proof and rolls back on a broken manifest',()=>{
  const w=fs.readFileSync('.github/workflows/gmww-v3-worker-production.yml','utf8');
  const order=['Revalidate Worker-only Player Web','Rebuild the published Runtime catalog','verify-published-runtime-catalog.mjs','Keep the previous fail-closed catalog','Publish Worker + Player Web','Verify live Worker'];
  let at=-1;for(const marker of order){const next=w.indexOf(marker,at+1);assert.ok(next>at,marker+' is missing or out of order');at=next}
  assert.match(w,/id: catalog\n\s+if: steps\.gate\.outputs\.deploy == 'true'\n\s+continue-on-error: true/);
  assert.match(w,/if: steps\.gate\.outputs\.deploy == 'true' && steps\.catalog\.outcome != 'success'/);
  assert.match(w,/git checkout -- src\/gmww-release-catalog\.js src\/gmww-release-bases\.js assets\/updates\/latest\.json/);
  assert.match(w,/EXPECT_CATALOG: \$\{\{ steps\.catalog\.outcome == 'success' \}\}/);
  assert.match(w,/manifestSource!=='build-verified'/);
  assert.doesNotMatch(w,/gh release (create|upload)/);
});
