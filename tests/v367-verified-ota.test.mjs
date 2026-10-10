import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV367Delta} from '../src/gmww-ota-delta.js';

const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.67/';
const paths=['GMWW.html','app.js','style.css'];
const mk=()=>({releaseVersion:'3.67',runtimeVersion:'3.67',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:paths.map(path=>({path,url:base+path,sha256:'a'.repeat(64)}))}});

test('IPA V3.66 updates exactly 3 source UI files without deleting Artwork or storage',()=>{
  const o=selectVerifiedRuntimeV367Delta(mk(),'3.66');
  assert.equal(o?.upgradeMode,'verified-overlay');
  assert.equal(o?.optimizedFromVersion,'3.66');
  assert.deepEqual(o?.runtime?.files.map(x=>x.path),paths);
  assert.deepEqual(o?.delete,[]);
});
test('Reject unsafe V3.67 manifests and unsupported IPA versions',()=>{
 for(const from of ['3.65','3.67','3.17',''])assert.equal(selectVerifiedRuntimeV367Delta(mk(),from),null);
 for(const change of [
  m=>{m.releaseVersion='3.66'},m=>{m.runtimeVersion='3.66'},m=>{m.shellVersion='3.67'},m=>{m.releaseType='native'},
  m=>{m.delete=['data']},m=>{m.runtime.files[0].sha256='invalid'},m=>{m.runtime.files[1].url='https://wrong.invalid'},
  m=>{m.runtime.files.pop()},m=>{m.runtime.files.push({...m.runtime.files[0]})}
 ]){const m=mk();change(m);assert.equal(selectVerifiedRuntimeV367Delta(m,'3.66'),null)}
});
test('Both update manifest routes prioritize verified V3.67 overlay',()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const k of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV367Delta('+k+',url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta'));
 assert.match(worker,/VERSION="V3\.70",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-370"/);
});
