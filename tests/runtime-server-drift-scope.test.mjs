import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isRuntimeDriftScope,restoreRuntimeDrift} from '../.github/scripts/runtime-server-drift-scope.mjs';
const paths=[
 'server-game/current/app.js',
 'server-game/src/10-library-and-settings.part',
 'server-game/src/20-members-and-roster.part',
 'tests/runtime-server-version-drift.test.mjs',
 '.github/scripts/runtime-server-drift-scope.mjs',
 '.github/scripts/ci-browser-scope.mjs',
 '.github/workflows/check-player-web.yml',
 '.github/workflows/check-runtime-server-version-drift.yml',
 'tests/runtime-server-drift-scope.test.mjs',
 'docs/releases/GMWW-RUNTIME-SERVER-DRIFT-20261031.md'
];
const indices={'server-game/current/app.js':[0,1,2,3,4,5],
 'server-game/src/10-library-and-settings.part':[0,1,2,3],
 'server-game/src/20-members-and-roster.part':[4,5]};
function fixture(){
 return paths.map(path=>{
  const after=fs.readFileSync(path,'utf8');
  const ids=indices[path];
  return{path,status:ids?'M':path.endsWith('.part')?'M':path==='server-game/current/app.js'?'M':
    path==='tests/runtime-server-version-drift.test.mjs'||path==='tests/runtime-server-drift-scope.test.mjs'||
    path==='.github/scripts/runtime-server-drift-scope.mjs'||path==='.github/workflows/check-runtime-server-version-drift.yml'||path.startsWith('docs/')?'A':'M',
   before:ids?restoreRuntimeDrift(after,ids):null,after};
 });
}
test('PR659 exact audited update-only scope passes, bundle must match',()=>{
 const changes=fixture();
 assert.equal(changes.filter(x=>!x.before&&indices[x.path]).length,0);
 assert.equal(isRuntimeDriftScope(changes),true);
});
test('PR659 fail closed on changed runtime, deleted file or unrelated source',()=>{
 const changes=fixture();
 assert.equal(isRuntimeDriftScope([...changes,{path:'src/index.js',status:'M',before:'x',after:'y'}]),false);
 assert.equal(isRuntimeDriftScope(changes.slice(1)),false);
 assert.equal(isRuntimeDriftScope(changes.map((c,i)=>i===0?{...c,status:'D'}:c)),false);
 assert.equal(isRuntimeDriftScope(changes.map((c,i)=>i===1?{...c,after:c.after+'\n// unrelated behavior'}:c)),false);
 assert.equal(isRuntimeDriftScope(changes.map((c,i)=>i===2?{...c,after:c.after.replace("gmwwUpdateAlignment(runtime,serverVersion,updateVersion)==='synchronized'","true")}:c)),false);
});
