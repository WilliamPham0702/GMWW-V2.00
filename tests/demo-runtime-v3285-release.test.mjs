import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// version-only: no IPA source, storage, DO migration, Oracle or game mechanics changed.
test('V3.285 Runtime and Worker versions align with unchanged native shell',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  const worker=fs.readFileSync('src/index.js','utf8');
  const gm=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.equal(pkg.version,'3.285.0');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(worker.includes('VERSION="V3.285",NATIVE_SHELL_VERSION="3.264"'));
  assert.ok(gm.includes("const VERSION='3.285';"));
  assert.ok(html.includes('<title>GMWW V3.285</title>'));
  assert.ok(worker.includes('const roomMode=desiredDemo?"online":'));
  assert.ok(worker.includes('roomMode=b?.demo===true?"online":normalizeRoomMode(b?.roomMode)'));
  assert.ok(fs.readFileSync('server-game/src/30-village-and-setup.part','utf8').includes("roomMode:(target==='online'||target==='demo')?'online':'offline'"));
});
test('V3.285 package preserves OTA integrity, release notes and rollback',()=>{
  const notes=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.ok(notes.includes('V3.285 PR677/PR694: Chuyển chế độ DEMO'));
  assert.ok(notes.includes('rollback Runtime V3.280'));
  assert.ok(workflow.includes('sha256sum --check "$NAME.sha256"'));
  assert.ok(workflow.includes('gh release create "$TAG"'));
  assert.ok(deploy.includes('node .github/scripts/verify-incremental-ota.mjs'));
  assert.ok(fs.readFileSync('docs/releases/GMWW-RUNTIME-V3.285-DEMO-ONLINE-20261031.md','utf8').includes('Rollback'));
});
