import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('V3.277.1 synchronized Runtime source only, Native IPA shell unchanged',()=>{
  const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version,'3.277.1');
  assert.equal(lock.version,'3.277.1');
  assert.equal(lock.packages[''].version,'3.277.1');
  assert.ok(read('src/index.js').includes('VERSION="V3.277.1"'));
  assert.ok(read('src/index.js').includes('NATIVE_SHELL_VERSION="3.264"'));
  assert.ok(read('server-game/current/app.js').includes("const VERSION='3.277.1'"));
  assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='3.277.1'"));
  assert.ok(read('server-game/current/GMWW.html').includes('<title>GMWW V3.277.1</title>'));
});
test('PR637 settings shares existing Cloudflare link; unverified aliases stay disabled',()=>{
  const html=read('server-game/current/GMWW.html');
  assert.ok(html.includes('id="gmwwPlayerWebShareSettings"'));
  assert.ok(html.includes('id="gmwwShareLegacy"'));
  assert.ok(html.includes('id="gmwwShareAlias"'));
  assert.ok(html.includes('value="alias" disabled'));
  assert.ok(html.includes('GMWW_PLAYER_WEB_ALIAS_CONFIG'));
  assert.ok(html.includes('gmww-v2-00.williampham0702.workers.dev'));
});
test('GitHub-only release candidate cannot trigger Cloudflare Worker or IPA deploy',()=>{
  const deploy=read('.github/workflows/deploy-production.yml');
  const block=deploy.split('# BEGIN GMWW_PR637_V32771_GITHUB_ONLY_RELEASE')[1]?.split('# END GMWW_PR637_V32771_GITHUB_ONLY_RELEASE')[0];
  assert.ok(block?.includes('SHOULD_DEPLOY=false'));
  assert.ok(block?.includes('Unexpected changes'));
  assert.ok(block?.includes('3.277.1'));
  assert.ok(block?.includes('tests/runtime-32771-github-release.test.mjs'));
  assert.ok(block?.includes('.github/workflows/github-runtime-ota.yml'));
  const ota=read('.github/workflows/github-runtime-ota.yml');
  assert.ok(ota.includes('GMWW-V3.277.1-GITHUB-RUNTIME-PR637-20261030.md'));
  assert.ok(ota.includes('Verify and build manual Runtime without Cloudflare'));
  assert.ok(ota.includes('skip_auto_release'));
  assert.ok(ota.includes('sha256sum --check'));
  assert.ok(ota.includes("github.event_name != 'pull_request'"));
  assert.ok(read('.github/scripts/prepare-update-channel.mjs').includes('V3.277.1 PR637:'));
});

test('CI recognition only for exact version and release metadata, never for gameplay',()=>{
  const scope=read('.github/scripts/ci-browser-scope.mjs');
  assert.ok(scope.includes('BEGIN GMWW_RUNTIME_32771_SCOPED_CI'));
  assert.ok(scope.includes('isGMWWRuntime32771Scope()'));
  assert.ok(scope.includes('rows.length!==expected.size'));
  assert.ok(scope.includes('after!==before.replaceAll(oldText,newText)'));
  assert.ok(scope.includes('Unexpected changes in V3.277.1'));
});

test('unrelated DEMO tests remain scoped out, while syntax and bundle safety remain enforced',()=>{
  for(const file of ['.github/workflows/check-demo-hybrid.yml','.github/workflows/check-demo-player-live-v3271.yml']){
    const yaml=read(file);
    assert.ok(yaml.includes('BEGIN GMWW_RUNTIME_32771_CI_SCOPE'),file);
    assert.ok(yaml.includes("steps.scope.outputs.mode != 'gm-player-web-share-637'"),file);
    assert.ok(yaml.includes('assemble-player-web.mjs --verify'),file);
  }
  const guard=read('.github/workflows/deploy-production.yml');
  assert.ok(guard.includes("'.github/workflows/check-demo-hybrid.yml'"));
  assert.ok(guard.includes("'.github/workflows/check-demo-player-live-v3271.yml'"));
});
