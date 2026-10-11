import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVerifiedRuntimeV397Delta} from '../src/gmww-ota-delta.js';

const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.97/';
const files=['GMWW.html','app.js','style.css','village-layout.js'];
const manifest=()=>({
 releaseVersion:'3.97',runtimeVersion:'3.97',shellVersion:'3.17',releaseType:'runtime',delete:[],
 runtime:{files:files.map(path=>({path,url:root+path,sha256:'b'.repeat(64)}))}
});

test('V3.96 -> V3.97 overlays the shared seat-layout script and UI without deleting data',()=>{
 const patch=selectVerifiedRuntimeV397Delta(manifest(),'3.96');
 assert.equal(patch?.upgradeMode,'verified-overlay');
 assert.equal(patch?.optimizedFromVersion,'3.96');
 assert.deepEqual(patch?.delete,[]);
 assert.deepEqual(patch?.runtime.files.map(x=>x.path),files);
 assert.ok(patch.runtime.files.some(x=>x.path==='village-layout.js'));
});

test('Seat Mẫu OTA fails closed for tampered SHA, URL, missing coordinate file or shell mismatch',()=>{
 assert.equal(selectVerifiedRuntimeV397Delta(manifest(),'3.95'),null);
 const wrong=manifest();wrong.runtime.files[3].sha256='broken';assert.equal(selectVerifiedRuntimeV397Delta(wrong,'3.96'),null);
 const external=manifest();external.runtime.files[0].url='https://wrong.example/app.js';assert.equal(selectVerifiedRuntimeV397Delta(external,'3.96'),null);
 const missing=manifest();missing.runtime.files.pop();assert.equal(selectVerifiedRuntimeV397Delta(missing,'3.96'),null);
 const deletion=manifest();deletion.delete=['member-data'];assert.equal(selectVerifiedRuntimeV397Delta(deletion,'3.96'),null);
 const shell=manifest();shell.shellVersion='3.18';assert.equal(selectVerifiedRuntimeV397Delta(shell,'3.96'),null);
});
