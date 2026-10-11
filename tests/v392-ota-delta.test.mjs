import test from 'node:test';import assert from 'node:assert/strict';
import {selectVerifiedRuntimeV392Delta} from '../src/gmww-ota-delta.js';
const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.92/';
const names=['GMWW.html','app.js','style.css'];
const make=()=>({releaseVersion:'3.92',runtimeVersion:'3.92',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:names.map(path=>({path,url:base+path,sha256:'a'.repeat(64)}))}});
test('V3.91 receives safe three-file V3.92 wolf controls update',()=>{
 const x=selectVerifiedRuntimeV392Delta(make(),'3.91');assert.equal(x?.upgradeMode,'verified-overlay');assert.deepEqual(x?.runtime.files.map(f=>f.path),names);assert.deepEqual(x?.delete,[]);
});
test('V3.92 refuses destructive or corrupt packages',()=>{
 assert.equal(selectVerifiedRuntimeV392Delta(make(),'3.90'),null);
 const m=make();m.delete=['data'];assert.equal(selectVerifiedRuntimeV392Delta(m,'3.91'),null);
 const n=make();n.runtime.files[0].url='https://evil.invalid';assert.equal(selectVerifiedRuntimeV392Delta(n,'3.91'),null);
 const o=make();o.runtime.files.pop();assert.equal(selectVerifiedRuntimeV392Delta(o,'3.91'),null);
});
