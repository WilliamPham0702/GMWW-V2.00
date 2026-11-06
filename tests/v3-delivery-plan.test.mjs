import test from 'node:test';
import assert from 'node:assert/strict';
import {v3DeliveryPlan} from '../.github/scripts/v3-delivery-plan.mjs';
test('V3: Player Web-only releases Worker without duplicate Runtime OTA',()=>{
 const p=v3DeliveryPlan(['src/player-web-src/35-online-chat.part','src/gmww-members-live.js','tests/player-web-v3-iframe-drag.test.mjs']);
 assert.equal(p.target,'worker');assert.equal(p.risk,'medium');assert.equal(p.hold,false);
 assert.ok(p.tests.includes('tests/player-web-v3-iframe-drag.test.mjs'));
});
test('V3: Runtime/game changes receive high risk checks',()=>{
 const p=v3DeliveryPlan(['server-game/current/app.js','src/index.js']);
 assert.equal(p.target,'runtime');assert.equal(p.risk,'high');
 assert.ok(p.tests.includes('tests/gmww-play-interaction-rules.test.mjs'));
});
test('V3: safe version bump allowed only with Runtime source changes',()=>{
 const p=v3DeliveryPlan(['server-game/current/app.js','src/index.js','package.json','package-lock.json','docs/releases/GMWW-RUNTIME.md']);
 assert.equal(p.target,'runtime');assert.equal(p.hold,false);
 assert.equal(v3DeliveryPlan(['package.json','docs/releases/GMWW-RUNTIME.md']).target,'blocked');
});
test('V3: Pages stays independent of Worker',()=>{
 const p=v3DeliveryPlan(['infra/pages/gamemasoi/_worker.js','tests/gamemasoi-pages-link.test.mjs']);
 assert.equal(p.target,'pages');assert.equal(p.hold,false);
});
test('V3: CI/docs-only updates do not deploy',()=>{
 const p=v3DeliveryPlan(['.github/workflows/gmww-auto-delivery-v3.yml','.github/workflows/deploy-production.yml','.github/workflows/github-runtime-ota.yml','tests/v3-delivery-plan.test.mjs','docs/architecture/GMWW-AUTO-DELIVERY-V3.0.md','AGENTS.md']);
 assert.equal(p.target,'none');assert.equal(p.hold,false);assert.equal(v3DeliveryPlan(['docs/releases/example.md']).target,'none');
});
test('V3: reject unclassified, frozen 3D, Native, sensitive or mixed deployment changes',()=>{
 const cases=['config/secrets.env','../src/index.js','wrangler.jsonc','package-lock.json','assets/village/arena-3d/scene-manager.mjs','server-game/GMWW-Server/GameView.swift'];
 for(const item of cases){const p=v3DeliveryPlan([item]);assert.equal(p.target,'blocked',item);assert.equal(p.hold,true)}
 assert.equal(v3DeliveryPlan(['src/index.js','infra/pages/gamemasoi/_worker.js']).target,'blocked');
});
test('V3: empty diff is no-op, repeated files do not trigger duplicate releases',()=>{
 assert.equal(v3DeliveryPlan([]).target,'none');
 assert.equal(v3DeliveryPlan(['src/index.js','src/index.js']).files.length,1);
});

// PR788: approved native microphone scope is verification-only; never general native auto-release.
test('V3: reviewed PR788 native mic validation passes only within its approved allowlist',()=>{
 const files=[
  'server-game/GMWW-Server/GameView.swift',
  'server-game/GMWW-Server/Info.plist',
  'tests/native-ios-microphone-permission-20261104.test.mjs',
  'docs/releases/GMWW-IOS-NATIVE-MIC-PERMISSION-20261104.md',
  '.github/scripts/ci-browser-scope.mjs',
  '.github/workflows/build-server-game-ipa.yml',
  '.github/workflows/check-player-web.yml',
  '.github/scripts/v3-delivery-plan.mjs',
  'tests/v3-delivery-plan.test.mjs',
  'tests/ci-browser-scope.test.mjs'
 ];
 const plan=v3DeliveryPlan(files);
 assert.equal(plan.target,'native-verify');
 assert.equal(plan.risk,'high');
 assert.equal(plan.hold,false);
 assert.ok(plan.tests.includes('tests/native-ios-microphone-permission-20261104.test.mjs'));
 assert.equal(v3DeliveryPlan(files.slice(1)).target,'blocked');
 assert.equal(v3DeliveryPlan([...files,'src/index.js']).target,'blocked');
 assert.equal(v3DeliveryPlan([...files,'server-game/GMWW-Server/Other.swift']).target,'blocked');
 // The actual PR diff is an 8-file subset of the allowlist (no Player Web workflow/scope test edits).
 const actual=files.filter(f=>f!=='.github/workflows/check-player-web.yml'&&f!=='tests/ci-browser-scope.test.mjs');
 assert.equal(v3DeliveryPlan(actual).target,'native-verify');
 // Core native files remain mandatory.
 for(const core of files.slice(0,4))assert.equal(v3DeliveryPlan(actual.filter(f=>f!==core)).target,'blocked',core);
});

test('V3: Arena 3D deletions pass only with the approved removal marker and an absent 3D tree',()=>{
 const del=['assets/village/arena-3d/live.mjs','wrangler.arena3d-preview.jsonc','src/arena3d-stage-worker.mjs','tests/arena3d-stage51.test.mjs'];
 assert.equal(v3DeliveryPlan(del).target,'blocked');
 const ok=v3DeliveryPlan([...del,'docs/releases/GMWW-RUNTIME-V3.310-REMOVE-ARENA3D-20261106.md','server-game/current/app.js','package.json','src/index.js']);
 assert.equal(ok.hold,false);assert.equal(ok.target,'runtime');
});
