import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';
const source=fs.readFileSync('.github/scripts/ci-browser-scope.mjs','utf8');
const begin=source.indexOf('const gmCardOutside3275Paths=new Set(['),end=source.indexOf(']);',begin);
assert.ok(begin>0&&end>begin);
const paths=[...source.slice(begin,end).matchAll(/'([^']+)'/g)].map(x=>x[1]);
function scoped(){return paths.map(path=>({path,status:fs.existsSync(path)?'M':'A'}));}
test('PR628 exact GM UI release routes to focused check on PR and main',()=>{
 assert.equal(paths.length,18);
 assert.equal(classifyBrowserScope(scoped()),'gm-card-outside-3275');
 assert.match(source,/GMWW_CI_EVENT==='push'\?'HEAD\^1'/);
});
test('PR628 fail closed for unrecognized Worker, Player, deletion or missing files',()=>{
 assert.equal(classifyBrowserScope([...scoped(),{path:'src/gmww-members-live.js',status:'M'}]),'full');
 assert.equal(classifyBrowserScope(scoped().map((x,i)=>i===0?{...x,status:'D'}:x)),'full');
 assert.equal(classifyBrowserScope(scoped().slice(1)),'full');
});
test('PR628 checks immutable bundle and all versions, no Native change',()=>{
 assert.match(source,/bundle===assembly/);
 assert.match(source,/NATIVE_SHELL_VERSION="3\.264"/);
 assert.match(source,/V3\.275 PR628:/);
 assert.match(fs.readFileSync('.github/workflows/check-player-web.yml','utf8'),/node --test tests\/artifact-preview-horizontal-centering-20261029\.test\.mjs tests\/gm-card-fit-outside-dismiss-20261029\.test\.mjs/);
});
