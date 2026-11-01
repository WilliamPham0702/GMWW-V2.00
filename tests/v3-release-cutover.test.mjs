import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const load=name=>fs.readFileSync('.github/workflows/'+name,'utf8');
const orchestrator=load('gmww-auto-delivery-v3.yml');
const worker=load('gmww-v3-worker-production.yml');
const prod=load('deploy-production.yml');
const ota=load('github-runtime-ota.yml');
const pages=load('deploy-gamemasoi-pages.yml');
const required=load('ci-policy-gate.yml');

test('V3 is the sole release handoff for Worker, Runtime, and Pages',()=>{
 for(const workflow of [worker,prod,ota,pages]){
  assert.match(workflow,/workflows: \["GMWW AUTO-DELIVERY V3\.0"\]/);
  assert.doesNotMatch(workflow,/workflows: \["Check Player Web Worker"\]/);
 }
 assert.match(orchestrator,/workflows: \["Check Player Web Worker"\]/);
 assert.match(orchestrator,/name: V3 Release Gate/);
 assert.match(required,/node --test tests\/v3-release-cutover\.test\.mjs/);
});
test('Worker-only uses same SHA main CI, DO and health checks, rollback, no IPA or OTA',()=>{
 assert.match(worker,/head_branch == 'main'/);
 assert.match(worker,/head_repository\.full_name == github\.repository/);
 assert.match(worker,/test "\$\(git rev-parse origin\/main\)" = "\$TESTED_SHA"/);
 assert.match(worker,/if \[ "\$TARGET" != worker \]/);
 assert.match(worker,/Check Player Web Worker/);
 assert.match(worker,/npx --no-install wrangler deploy --config wrangler\.jsonc/);
 assert.match(worker,/node --check "\$RUNNER_TEMP\/v3-player\.js"/);
 assert.match(worker,/Rollback Worker to last verified version/);
 assert.match(worker,/PREVIOUS_VERSION/);
 assert.match(worker,/versions:\[\{version_id:process\.env\.PREVIOUS_VERSION,percentage:100\}\]/);
});
test('Runtime and Pages stay distinct; CI-only never deploys',()=>{
 assert.match(prod,/none\|blocked\|pages\|worker\)/);
 assert.match(ota,/V3_TARGET" != runtime/);
 assert.match(ota,/SKIP_AUTO_RELEASE=true/);
 assert.match(pages,/Skip unrelated main commits/);
 assert.match(pages,/Check Player Web Worker/);
});
