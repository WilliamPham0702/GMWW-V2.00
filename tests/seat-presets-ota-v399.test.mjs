import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV3100Delta} from '../src/gmww-ota-delta.js';

const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.100/';
const files=['GMWW.html','app.js','style.css','village-layout.js'];
const manifest=()=>({
  releaseVersion:'3.100',runtimeVersion:'3.100',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:files.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}
});

test('V3.99 -> V3.100 updates Seat geometry with the GM app, preserving all client data',()=>{
  const patch=selectVerifiedRuntimeV3100Delta(manifest(),'3.99');
  assert.equal(patch?.upgradeMode,'verified-overlay');
  assert.equal(patch?.optimizedFromVersion,'3.99');
  assert.deepEqual(patch?.delete,[]);
  assert.deepEqual(patch?.runtime?.files.map(f=>f.path),files);
});

test('V3.100 rejects unsafe OTA payloads',()=>{
  assert.equal(selectVerifiedRuntimeV3100Delta(manifest(),'3.98'),null);
  const bad=manifest();bad.runtime.files[3].sha256='invalid';assert.equal(selectVerifiedRuntimeV3100Delta(bad,'3.99'),null);
  const absent=manifest();absent.runtime.files.pop();assert.equal(selectVerifiedRuntimeV3100Delta(absent,'3.99'),null);
  const other=manifest();other.runtime.files[0].url='https://different.example/GMWW.html';assert.equal(selectVerifiedRuntimeV3100Delta(other,'3.99'),null);
  const deleted=manifest();deleted.delete=['session'];assert.equal(selectVerifiedRuntimeV3100Delta(deleted,'3.99'),null);
});

test('V3.100 patch remains available for old V3.99 installs',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.equal(worker.split('selectVerifiedRuntimeV3100Delta(').length-1,2);
  assert.match(worker,/selectVerifiedRuntimeV3101Delta/);
});
