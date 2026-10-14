import test from 'node:test';
import assert from 'node:assert/strict';
import { selectVerifiedRuntimeV395Delta } from '../src/gmww-ota-delta.js';
const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.95/';
const paths=['GMWW.html','app.js','style.css'];
const sample=()=>({releaseVersion:'3.95',runtimeVersion:'3.95',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:base+path,sha256:'f'.repeat(64)}))}});
test('V3.94 → V3.95 Lab overlay changes only the verified UI and preserves data',()=>{
  const delta=selectVerifiedRuntimeV395Delta(sample(),'3.94');
  assert.equal(delta?.upgradeMode,'verified-overlay');
  assert.equal(delta?.optimizedFromVersion,'3.94');
  assert.deepEqual(delta?.runtime.files.map(x=>x.path),paths);
  assert.deepEqual(delta?.delete,[]);
});
test('Lab OTA fails closed for unexpected base, modified url, missing file or delete request',()=>{
  assert.equal(selectVerifiedRuntimeV395Delta(sample(),'3.92'),null);
  const x=sample();x.delete=['data'];assert.equal(selectVerifiedRuntimeV395Delta(x,'3.94'),null);
  const y=sample();y.runtime.files.pop();assert.equal(selectVerifiedRuntimeV395Delta(y,'3.94'),null);
  const z=sample();z.runtime.files[0].url='https://invalid.example';assert.equal(selectVerifiedRuntimeV395Delta(z,'3.94'),null);
});

test('Worker publishes V3.109 to both OTA manifest paths and retains shell V3.17',async()=>{
  const fs=await import('node:fs');
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.ok(worker.includes('VERSION="V3.109",NATIVE_SHELL_VERSION="3.17",UPDATE_CHANNEL_REV="runtime-3108"'));
  assert.equal(worker.split('selectVerifiedRuntimeV396Delta(').length-1,2);
});
