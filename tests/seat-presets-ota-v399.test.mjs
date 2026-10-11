import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV399Delta} from '../src/gmww-ota-delta.js';

const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.99/';
const files=['GMWW.html','app.js','style.css','village-layout.js'];
const manifest=()=>({
  releaseVersion:'3.99',runtimeVersion:'3.99',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:files.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}
});

test('V3.98 -> V3.99 updates Seat geometry with the GM app, preserving all client data',()=>{
  const patch=selectVerifiedRuntimeV399Delta(manifest(),'3.98');
  assert.equal(patch?.upgradeMode,'verified-overlay');
  assert.equal(patch?.optimizedFromVersion,'3.98');
  assert.deepEqual(patch?.delete,[]);
  assert.deepEqual(patch?.runtime?.files.map(f=>f.path),files);
});

test('V3.99 rejects unsafe OTA payloads',()=>{
  assert.equal(selectVerifiedRuntimeV399Delta(manifest(),'3.97'),null);
  const bad=manifest();bad.runtime.files[3].sha256='invalid';assert.equal(selectVerifiedRuntimeV399Delta(bad,'3.98'),null);
  const absent=manifest();absent.runtime.files.pop();assert.equal(selectVerifiedRuntimeV399Delta(absent,'3.98'),null);
  const other=manifest();other.runtime.files[0].url='https://different.example/GMWW.html';assert.equal(selectVerifiedRuntimeV399Delta(other,'3.98'),null);
  const deleted=manifest();deleted.delete=['session'];assert.equal(selectVerifiedRuntimeV399Delta(deleted,'3.98'),null);
});

test('Worker and GM app advertise V3.99 OTA without updating the native shell',()=>{
  const worker=fs.readFileSync('src/index.js','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(worker,/VERSION="V3\.99",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-399"/);
  assert.match(app,/const VERSION='3\.99'/);
  assert.match(html,/<title>GMWW V3\.99<\/title>/);
  assert.equal(worker.split('selectVerifiedRuntimeV399Delta(').length-1,2);
  assert.match(html,/village-layout\.js\?v=3\.99-fire-seat/);
});
