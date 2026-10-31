import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyBrowserScope,isV3284IntegratedScope} from '../.github/scripts/ci-browser-scope.mjs';
const audited=[
  {path:".github/runtime-release/V3.282-PR654-candidate.md",status:"A"},
  {path:".github/scripts/ci-browser-scope.mjs",status:"M"},
  {path:".github/scripts/prepare-update-channel.mjs",status:"M"},
  {path:".github/scripts/runtime-server-drift-scope.mjs",status:"A"},
  {path:".github/workflows/check-gm-audio-role-day.yml",status:"M"},
  {path:".github/workflows/check-player-web.yml",status:"M"},
  {path:".github/workflows/check-runtime-server-version-drift.yml",status:"A"},
  {path:".github/workflows/deploy-production.yml",status:"M"},
  {path:".github/workflows/github-runtime-ota.yml",status:"M"},
  {path:"docs/RELEASE_NOTES_AUDIO_TEN_VAI_TRO_20261031.md",status:"A"},
  {path:"docs/releases/GMWW-GITHUB-RUNTIME-OTA-20261029.md",status:"M"},
  {path:"docs/releases/GMWW-RUNTIME-SERVER-DRIFT-20261031.md",status:"A"},
  {path:"docs/releases/GMWW-V3.284-AUDIO-RUNTIME-ALIGNMENT-CANDIDATE-20261031.md",status:"A"},
  {path:"package-lock.json",status:"M"},
  {path:"package.json",status:"M"},
  {path:"server-game/current/GMWW.html",status:"M"},
  {path:"server-game/current/app.js",status:"M"},
  {path:"server-game/src/00-core-and-library.part",status:"M"},
  {path:"server-game/src/10-library-and-settings.part",status:"M"},
  {path:"server-game/src/20-members-and-roster.part",status:"M"},
  {path:"server-game/src/30-village-and-setup.part",status:"M"},
  {path:"src/index.js",status:"M"},
  {path:"tests/audio-binding-integrity-20261027.test.mjs",status:"M"},
  {path:"tests/audio-independent-role-name-20261031.test.mjs",status:"A"},
  {path:"tests/audio-role-day-flow-20261027.test.mjs",status:"M"},
  {path:"tests/audio-safe-delete-and-audit-20261031.test.mjs",status:"A"},
  {path:"tests/ci-browser-scope.test.mjs",status:"M"},
  {path:"tests/demo-assassin-gallows-divination.test.mjs",status:"M"},
  {path:"tests/runtime-server-drift-scope.test.mjs",status:"A"},
  {path:"tests/runtime-server-version-drift.test.mjs",status:"A"},
  {path:"tests/v3284-combined-ci-scope.test.mjs",status:"A"},
  {path:"docs/releases/GMWW-V3.284-FOCUSED-CI-20261031.md",status:"A"},
];
test('PR665 V3.284 all 32 paths and pinned source blobs select scoped comprehensive CI',()=>{
  assert.equal(isV3284IntegratedScope(audited),true);
  assert.equal(classifyBrowserScope(audited),'v3284-audio-drift');
});
test('Fail closed on unknown, missing, renamed or mutated release source',()=>{
  assert.equal(isV3284IntegratedScope([...audited,{path:'src/gmww-members-live.js',status:'M'}]),false);
  assert.equal(isV3284IntegratedScope(audited.slice(1)),false);
  assert.equal(isV3284IntegratedScope(audited.map((x,i)=>i===0?{...x,status:'D'}:x)),false);
  assert.equal(isV3284IntegratedScope(audited,(path)=>path==='src/index.js'?'BAD':fs.readFileSync(path,'utf8')),false);
});
test('Merged CI checks full affected Audio, drift, OTA, Worker and source bundle',()=>{
 const y=fs.readFileSync('.github/workflows/check-player-web.yml','utf8');
 for(const needle of ['tests/runtime-server-version-drift.test.mjs','tests/audio-independent-role-name-20261031.test.mjs',
  'tests/audio-safe-delete-and-audit-20261031.test.mjs','tests/gmww-version-guard.test.mjs',
  'tests/production-deploy-architecture-docs.test.mjs','assemble-gm-app.mjs --verify',
  'assemble-player-web.mjs --verify','verify-gmww-versions.mjs','steps.scope.outputs.mode == \'v3284-audio-drift\'']){
  assert.ok(y.includes(needle),'Missing required regression: '+needle);
 }
});
