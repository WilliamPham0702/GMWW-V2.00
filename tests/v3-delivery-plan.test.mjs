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
