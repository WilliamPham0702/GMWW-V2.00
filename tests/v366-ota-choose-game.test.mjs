import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV366Delta} from '../src/gmww-ota-delta.js';

const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.66/';
const paths=['GMWW.html','app.js','style.css'],hash='a'.repeat(64);
const fixture=()=>({
  releaseVersion:'3.66',runtimeVersion:'3.66',shellVersion:'3.17',releaseType:'runtime',delete:[],
  runtime:{files:paths.map(path=>({path,url:origin+path,sha256:hash}))}
});

test('IPA V3.65 gets exact GM game chooser files without deleting game data or artwork',()=>{
  const overlay=selectVerifiedRuntimeV366Delta(fixture(),'3.65');
  assert.equal(overlay?.upgradeMode,'verified-overlay');
  assert.equal(overlay?.optimizedFromVersion,'3.65');
  assert.deepEqual(overlay?.runtime?.files.map(f=>f.path),paths);
  assert.deepEqual(overlay?.delete,[]);
});

test('V3.66 OTA rejects unexpected versions, unsafe files, invalid digests and deletions',()=>{
  for(const from of ['3.17','3.64','3.66','3.63',''])assert.equal(selectVerifiedRuntimeV366Delta(fixture(),from),null);
  for(const mutate of [
    x=>{x.releaseVersion='3.65'},
    x=>{x.runtimeVersion='3.65'},
    x=>{x.shellVersion='3.66'},
    x=>{x.releaseType='native'},
    x=>{x.delete=['artwork']},
    x=>{x.runtime.files[0].sha256='bad'},
    x=>{x.runtime.files[1].url='https://example.com/app.js'},
    x=>{x.runtime.files.pop()},
    x=>{x.runtime.files.push({...x.runtime.files[0]})}
  ]){const m=fixture();mutate(m);assert.equal(selectVerifiedRuntimeV366Delta(m,'3.65'),null)}
});

test('Both online update endpoints choose V3.66 overlay before older selectors',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  for(const k of ['versioned','manifest']){
    assert.ok(worker.includes('selectVerifiedRuntimeV366Delta('+k+',url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta'));
  }
  assert.match(worker,/VERSION="V3\.66",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-366"/);
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(html,/<title>GMWW V3\.66<\/title>/);
  assert.match(html,/app\.js\?v=3\.66-choose-game/);
});
