import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVerifiedRuntimeV359Delta} from '../src/gmww-ota-delta.js';
import fs from 'node:fs';

const files=['GMWW.html','app.js','style.css'];
const sha='a'.repeat(64);
const makeManifest=()=>({releaseVersion:'3.59',runtimeVersion:'3.59',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:files.map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.59/'+path,sha256:sha}))}});

test('V3.58 -> V3.59 downloads only the verified three UI files',()=>{
  const v=selectVerifiedRuntimeV359Delta(makeManifest(),'3.58');
  assert.equal(v.upgradeMode,'verified-overlay');
  assert.equal(v.optimizedFromVersion,'3.58');
  assert.deepEqual(v.runtime.files.map(x=>x.path),files);
  assert.deepEqual(v.delete,[]);
});
test('V3.59 OTA fails closed for mismatched version, hash, URL or deletion',()=>{
  assert.equal(selectVerifiedRuntimeV359Delta(makeManifest(),'3.57'),null);
  for(const mutator of [m=>{m.releaseVersion='3.58'},m=>{m.runtime.files[1].sha256='broken'},m=>{m.runtime.files[2].url='https://untrusted.invalid/app.js'},m=>{m.delete=['file']},m=>{m.runtime.files.push(m.runtime.files[0])}]){
    const m=makeManifest();mutator(m);assert.equal(selectVerifiedRuntimeV359Delta(m,'3.58'),null);
  }
});
test('V3.59 version sources and IPA update manifest route are aligned',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.equal(pkg.version,'3.59.0');assert.equal(lock.version,'3.59.0');
  assert.match(app,/const VERSION='3.59'/);assert.match(html,/GMWW V3.59/);
  assert.match(worker,/VERSION="V3.59"/);assert.match(worker,/UPDATE_CHANNEL_REV="runtime-359"/);
  assert.equal(worker.split('selectVerifiedRuntimeV359Delta(versioned,').length,2);
  assert.equal(worker.split('selectVerifiedRuntimeV359Delta(manifest,').length,2);
});
