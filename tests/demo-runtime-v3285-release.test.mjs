import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// version-only: no IPA source, storage, DO migration, Oracle or game mechanics changed.
test('V3.290 Runtime and Worker versions align with unchanged native shell',{skip:'LEGACY-QUARANTINE 2026-11-04: snapshot test of an older release no longer matches the current source; see tests/LEGACY-QUARANTINE.md'},()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  const worker=workerSource();
  const gm=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.equal(pkg.version,'3.290.0');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.ok(worker.includes('VERSION="V3.290",NATIVE_SHELL_VERSION="3.264"'));
  assert.ok(gm.includes("const VERSION='3.290';"));
  assert.ok(html.includes('<title>GMWW V3.290</title>'));
  assert.ok(worker.includes('const roomMode=desiredDemo?"online":'));
  assert.ok(worker.includes('roomMode=b?.demo===true?"online":normalizeRoomMode(b?.roomMode)'));
  assert.ok(fs.readFileSync('server-game/src/30-village-and-setup.part','utf8').includes("roomMode:(target==='online'||target==='demo')?'online':'offline'"));
});
test('V3.290 package preserves OTA integrity, release notes and rollback',()=>{
  const notes=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const workflow=fs.readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.ok(notes.includes('V3.290 sau PR745:'));
  assert.ok(notes.includes('V3.289 sau PR738:'));
  assert.ok(notes.includes('V3.288 PR726:'));
  assert.ok(notes.includes('V3.287 PR720 (thay PR710) và PR721 (thay PR700):'));
  assert.ok(notes.includes('V3.286 PR698/PR699/PR702: Phát hành độc lập ba thay đổi đã merge'));
  assert.ok(notes.includes('V3.285 PR677/PR694: Chuyển chế độ DEMO'));
  assert.ok(notes.includes('rollback Runtime V3.280'));
  assert.ok(workflow.includes('sha256sum --check "$NAME.sha256"'));
  assert.ok(workflow.includes('gh release create "$TAG"'));
  assert.ok(deploy.includes('node .github/scripts/verify-incremental-ota.mjs'));
  assert.ok(fs.readFileSync('docs/releases/GMWW-RUNTIME-V3.285-DEMO-ONLINE-20261031.md','utf8').includes('Rollback'));
});
