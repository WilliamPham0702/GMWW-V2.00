import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV396Delta} from '../src/gmww-ota-delta.js';

const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.96/';
const files=['GMWW.html','app.js','style.css'];
const manifest=()=>({
  releaseVersion:'3.96',runtimeVersion:'3.96',shellVersion:'3.17',
  releaseType:'runtime',delete:[],
  runtime:{files:files.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}
});

test('V3.95 -> V3.96 delivers only verified UI runtime, preserving accounts and game data',()=>{
  const patch=selectVerifiedRuntimeV396Delta(manifest(),'3.95');
  assert.equal(patch?.upgradeMode,'verified-overlay');
  assert.equal(patch?.optimizedFromVersion,'3.95');
  assert.deepEqual(patch?.delete,[]);
  assert.deepEqual(patch?.runtime.files.map(x=>x.path),files);
});
test('V3.96 rejects wrong installed versions, altered asset links, missing asset or deletion',()=>{
  assert.equal(selectVerifiedRuntimeV396Delta(manifest(),'3.94'),null);
  const bad=manifest();bad.runtime.files[0].sha256='invalid';assert.equal(selectVerifiedRuntimeV396Delta(bad,'3.95'),null);
  const missing=manifest();missing.runtime.files.pop();assert.equal(selectVerifiedRuntimeV396Delta(missing,'3.95'),null);
  const external=manifest();external.runtime.files[0].url='https://wrong.example/app.js';assert.equal(selectVerifiedRuntimeV396Delta(external,'3.95'),null);
  const deleted=manifest();deleted.delete=['member-data'];assert.equal(selectVerifiedRuntimeV396Delta(deleted,'3.95'),null);
});
test('Worker V3.104 keeps the V3.96 migration available for older installs',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(worker,/VERSION="V3.120",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3120"/);
  assert.match(app,/const VERSION='3.120'/);
  assert.match(html,/<title>GMWW V3.120<\/title>/);
  assert.equal(worker.split('selectVerifiedRuntimeV396Delta(').length-1,2);
  assert.equal(worker.split('selectVerifiedRuntimeV397Delta(').length-1,2);
  assert.match(worker,/selectVerifiedRuntimeV397Delta\(manifest,url\.searchParams\.get\("current"\)\)\|\|selectVerifiedRuntimeV396Delta/);
});
