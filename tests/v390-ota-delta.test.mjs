import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVerifiedRuntimeV390Delta} from '../src/gmww-ota-delta.js';
const origin='https://gmww-v2-00.williampham0702.workers.dev';
const required=['GMWW.html','app.js','battle-controls.js','style.css'];
const manifest=()=>({releaseVersion:'3.90',runtimeVersion:'3.90',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:required.map(path=>({path,url:origin+'/updates/runtime/V3.90/'+path,sha256:'a'.repeat(64)}))}});
test('V3.89 installed IPA receives four-file V3.90 update including battle actions',()=>{
  const selected=selectVerifiedRuntimeV390Delta(manifest(),'3.89');
  assert.equal(selected?.upgradeMode,'verified-overlay');
  assert.equal(selected?.optimizedFromVersion,'3.89');
  assert.deepEqual(selected?.runtime?.files?.map(x=>x.path),required);
  assert.deepEqual(selected?.delete,[]);
});
test('V3.90 overlay is fail-closed for incompatible, missing, corrupt or untrusted manifest',()=>{
  assert.equal(selectVerifiedRuntimeV390Delta(manifest(),'3.88'),null);
  const missing=manifest();missing.runtime.files.pop();assert.equal(selectVerifiedRuntimeV390Delta(missing,'3.89'),null);
  const wrong=manifest();wrong.runtime.files[1].url='https://evil.example/app.js';assert.equal(selectVerifiedRuntimeV390Delta(wrong,'3.89'),null);
  const invalid=manifest();invalid.runtime.files[0].sha256='00';assert.equal(selectVerifiedRuntimeV390Delta(invalid,'3.89'),null);
  const deleting=manifest();deleting.delete=['game-characters'];assert.equal(selectVerifiedRuntimeV390Delta(deleting,'3.89'),null);
});
