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

test('Worker and GM app advertise V3.100 OTA without updating the native shell',()=>{
  const worker=fs.readFileSync('src/index.js','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(worker,/VERSION="V3\.100",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-3100"/);
  assert.match(app,/const VERSION='3\.100'/);
  assert.match(html,/<title>GMWW V3\.100<\/title>/);
  assert.equal(worker.split('selectVerifiedRuntimeV3100Delta(').length-1,2);
  assert.match(html,/village-layout\.js\?v=3\.100-smart-seat/);
});
