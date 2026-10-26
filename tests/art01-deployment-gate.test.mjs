import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const paths=[
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/deploy-production.yml',
 'tests/art01-deployment-gate.test.mjs'
];
const changes=()=>paths.map(path=>({
 path,status:path.startsWith('tests/')?'A':'M',
 before:path.startsWith('tests/')?null:'existing content',
 after:fs.readFileSync(path,'utf8')
}));

test('ART-01 release gate focused CI recognizes only the exact four-file policy recovery',()=>{
 assert.equal(classifyBrowserScope(changes()),'art01-deploy-gate');
 assert.equal(classifyBrowserScope([...changes(),{path:'src/index.js',status:'M',before:'',after:''}]),'full');
 assert.equal(classifyBrowserScope(changes().filter(x=>x.path!==paths[3])),'full');
 const changed=changes();
 changed.find(x=>x.path==='.github/workflows/deploy-production.yml').after='unrelated release change';
 assert.equal(classifyBrowserScope(changed),'full');
});

test('ART-01 Production gate is scoped to server Core plus same-SHA CI, preserves V3.238 Runtime gates',()=>{
 const workflow=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
 assert.match(workflow,/ART-01 server-only deployment gate/);
 assert.match(workflow,/ART01_SCOPE=\$\(GMWW_CI_EVENT=push node /);
 assert.match(workflow,/tests\/artifact-priority-first\.test\.mjs tests\/v389-night-runtime-integration\.test\.mjs/);
 assert.match(workflow,/CI_STATE.*gh api /s);
 assert.match(workflow,/test "\$CI_STATE" = 'success'/);
 assert.match(workflow,/test -s docs\/releases\/GMWW-V3\.238-uniform-gm-controls/);
 assert.match(workflow,/npx wrangler deploy/);
 const worker=fs.readFileSync('src/index.js','utf8');
 assert.match(worker,/ART-01: Night 1 always opens the Artifact stage/);
});
