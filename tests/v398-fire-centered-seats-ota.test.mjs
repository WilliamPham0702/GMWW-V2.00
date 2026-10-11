import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV398Delta} from '../src/gmww-ota-delta.js';

const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.98/';
const paths=['GMWW.html','app.js','style.css','village-layout.js'];
const manifest=()=>({
  releaseVersion:'3.98',runtimeVersion:'3.98',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:paths.map(path=>({path,url:base+path,sha256:'a'.repeat(64)}))}
});
test('V3.97 OTA V3.98 includes central campfire world-coordinates for both GM/Player',()=>{
  const res=selectVerifiedRuntimeV398Delta(manifest(),'3.97');
  assert.equal(res.upgradeMode,'verified-overlay');
  assert.equal(res.optimizedFromVersion,'3.97');
  assert.deepEqual(res.delete,[]);
  assert.deepEqual(res.runtime.files.map(x=>x.path),paths);
  const gm=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const player=fs.readFileSync('assets/village/index.html','utf8');
  const loader=fs.readFileSync('assets/village/village.mjs','utf8');
  assert.match(gm,/village-layout\.js\?v=3\.98-seat-fire/);
  assert.match(player,/village\.mjs\?v=seat398/);
  assert.match(loader,/village-layout\.js\?v=seat398/);
});
test('V3.98 OTA rejects wrong origin, version, SHA, deletion, missing seat geometry',()=>{
  assert.equal(selectVerifiedRuntimeV398Delta(manifest(),'3.96'),null);
  const wrongSha=manifest();wrongSha.runtime.files[3].sha256='wrong';
  assert.equal(selectVerifiedRuntimeV398Delta(wrongSha,'3.97'),null);
  const wrongOrigin=manifest();wrongOrigin.runtime.files[0].url='https://invalid.example/GMWW.html';
  assert.equal(selectVerifiedRuntimeV398Delta(wrongOrigin,'3.97'),null);
  const missing=manifest();missing.runtime.files.pop();
  assert.equal(selectVerifiedRuntimeV398Delta(missing,'3.97'),null);
  const deletion=manifest();deletion.delete=['accounts'];
  assert.equal(selectVerifiedRuntimeV398Delta(deletion,'3.97'),null);
});
