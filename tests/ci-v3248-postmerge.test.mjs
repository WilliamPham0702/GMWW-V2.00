import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isRuntime248PostMergeScope,classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const allowed=['.github/scripts/ci-browser-scope.mjs','.github/workflows/check-player-web.yml','.github/workflows/deploy-production.yml','tests/ci-v3248-postmerge.test.mjs'];
test('V3.248 CI-only release is fail-closed to the four audited files',()=>{
 const diff=allowed.map(path=>({path,status:path.startsWith('tests/')?'A':'M'}));
 assert.equal(isRuntime248PostMergeScope(diff),true);
 assert.equal(classifyBrowserScope(diff),'runtime-3248-postmerge');
 assert.equal(isRuntime248PostMergeScope(diff.slice(0,3)),false);
 assert.equal(isRuntime248PostMergeScope([...diff,{path:'src/index.js',status:'M'}]),false);
 assert.equal(isRuntime248PostMergeScope(diff.map(c=>({...c,status:'D'}))),false);
});
test('Verified V3.248 Runtime source is unchanged and release gates are present',()=>{
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 const deploy=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
 const workflow=fs.readFileSync('.github/workflows/check-player-web.yml','utf8');
 assert.equal(pkg.version,'3.248.0');
 assert.match(deploy,/id: runtime248_release/);
 assert.match(deploy,/steps.runtime248_release.outputs.approved != 'true'/);
 assert.match(deploy,/runtime-3248-postmerge/);
 assert.match(workflow,/V3.248 — postmerge CI release/);
 assert.match(workflow,/tests\/gmww-v3248-setup-ui-perf.test.mjs/);
});
