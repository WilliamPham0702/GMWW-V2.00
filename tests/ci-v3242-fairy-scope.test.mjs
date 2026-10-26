import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBrowserScope,isFairy3242Scope,isFairy3242PolicyScope} from '../.github/scripts/ci-browser-scope.mjs';
const allowed=[
'.github/scripts/ci-browser-scope.mjs',
'.github/workflows/check-player-web.yml',
'.github/workflows/check-gallows-redesign.yml',
'.github/workflows/check-gm-free-icons-501.yml',
'.github/workflows/prepare-runtime-v3202-candidate.yml',
'.github/workflows/build-server-game-ipa.yml',
'.github/workflows/deploy-production.yml',
'tests/ci-v3242-fairy-scope.test.mjs',
'docs/releases/ci-v3242-fairy-scope-20261027.md'
];
const policy=allowed.map(path=>({path,status:path.startsWith('tests/')||path.startsWith('docs/')?'A':'M',before:'',after:'CI only'}));
test('exact V3.242 policy-only commit stays focused and does not publish runtime',()=>{
 assert.equal(isFairy3242PolicyScope(policy),true);
 assert.equal(classifyBrowserScope(policy),'fairy-ci-policy');
 assert.equal(classifyBrowserScope([...policy,{path:'src/index.js',status:'M',after:'unexpected'}]),'full');
});
test('V3.242 Fairy/audio scope fails closed if files, byte hashes or paths differ',()=>{
 const pretend=[{path:'server-game/src/40-battle-and-timeline.part',status:'M',after:'unexpected'}];
 assert.equal(isFairy3242Scope(pretend),false);
 assert.equal(isFairy3242Scope([...policy,{path:'src/index.js',status:'M',after:'unapproved'}]),false);
 assert.equal(classifyBrowserScope(pretend),'full');
});
