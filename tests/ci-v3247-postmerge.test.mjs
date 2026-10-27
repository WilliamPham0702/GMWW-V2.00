import test from 'node:test';import assert from 'node:assert/strict';
import {isIcon247PostMergeScope,classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const allow=[".github/scripts/ci-browser-scope.mjs",".github/workflows/check-player-web.yml",".github/workflows/deploy-production.yml","tests/ci-v3247-postmerge.test.mjs"];
test('postmerge V3.247 checks four CI-only paths and unchanged Game Core',()=>{
 const changes=allow.map(path=>({path,status:path.startsWith('tests/')?'A':'M'}));
 assert.equal(isIcon247PostMergeScope(changes),true);
 const tiny=[{path:'.github/scripts/ci-browser-scope.mjs',status:'M'},
   {path:'tests/ci-v3247-postmerge.test.mjs',status:'M'}];
 assert.equal(isIcon247PostMergeScope(tiny),true);
 assert.equal(classifyBrowserScope(tiny),'icon-scale-3247-postmerge');
 assert.equal(isIcon247PostMergeScope(tiny.slice(1)),false);
 assert.equal(classifyBrowserScope(changes),'icon-scale-3247-postmerge');
 assert.equal(isIcon247PostMergeScope(changes.slice(1)),false);
 assert.equal(isIcon247PostMergeScope([...changes,{path:'server-game/current/app.js',status:'M'}]),false);
});
