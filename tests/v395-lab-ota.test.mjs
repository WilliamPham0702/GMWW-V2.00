import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV395Delta} from '../src/gmww-ota-delta.js';
const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.95/';
const paths=['GMWW.html','app.js','style.css'];
const valid=()=>({releaseVersion:'3.95',runtimeVersion:'3.95',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:origin+path,sha256:'f'.repeat(64)}))}});
test('V3.94 -> V3.95 preserves data in a SHA-pinned OTA overlay',()=>{
 const x=selectVerifiedRuntimeV395Delta(valid(),'3.94');
 assert.equal(x?.optimizedFromVersion,'3.94');
 assert.equal(x?.upgradeMode,'verified-overlay');
 assert.deepEqual(x?.runtime.files.map(v=>v.path),paths);
 assert.deepEqual(x?.delete,[]);
});
test('Reject missing files, bad URLs/hashes, deletions and wrong installed version',()=>{
 assert.equal(selectVerifiedRuntimeV395Delta(valid(),'3.93'),null);
 for(const change of ['missing','url','hash','delete']){
  const x=valid();
  if(change==='missing')x.runtime.files.pop();
  if(change==='url')x.runtime.files[0].url='https://bad.example/GMWW.html';
  if(change==='hash')x.runtime.files[0].sha256='invalid';
  if(change==='delete')x.delete=['data'];
  assert.equal(selectVerifiedRuntimeV395Delta(x,'3.94'),null,change);
 }
});
test('Worker V3.95 serves both OTA branches, native shell remains V3.17',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.match(s,/VERSION="V3\.95",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-395"/);
 assert.equal((s.match(/selectVerifiedRuntimeV395Delta\((?:manifest|versioned),url\.searchParams\.get\("current"\)\)/g)||[]).length,2);
});
