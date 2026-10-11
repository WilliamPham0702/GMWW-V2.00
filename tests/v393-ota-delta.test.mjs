import test from 'node:test';import assert from 'node:assert/strict';
import {selectVerifiedRuntimeV393Delta} from '../src/gmww-ota-delta.js';
const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.93/';
const paths=['GMWW.html','app.js','style.css'];
const manifest=()=>({releaseVersion:'3.93',runtimeVersion:'3.93',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:base+path,sha256:'a'.repeat(64)}))}});
test('installed V3.92 gets minimal V3.93 GM actor UI update without deleting data',()=>{
 const v=selectVerifiedRuntimeV393Delta(manifest(),'3.92');assert.equal(v?.upgradeMode,'verified-overlay');assert.equal(v?.optimizedFromVersion,'3.92');assert.deepEqual(v?.runtime.files.map(x=>x.path),paths);assert.deepEqual(v?.delete,[])
});
test('invalid V3.93 OTA is rejected',()=>{
 assert.equal(selectVerifiedRuntimeV393Delta(manifest(),'3.91'),null);
 const x=manifest();x.delete=['data'];assert.equal(selectVerifiedRuntimeV393Delta(x,'3.92'),null);
 const y=manifest();y.runtime.files.pop();assert.equal(selectVerifiedRuntimeV393Delta(y,'3.92'),null);
 const z=manifest();z.runtime.files[0].url='https://evil.invalid';assert.equal(selectVerifiedRuntimeV393Delta(z,'3.92'),null)
});
