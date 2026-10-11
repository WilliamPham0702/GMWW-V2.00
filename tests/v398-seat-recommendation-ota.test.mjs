import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV398Delta} from '../src/gmww-ota-delta.js';

const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.98/';
const names=['GMWW.html','app.js','style.css','village-layout.js'];
const manifest=()=>({releaseVersion:'3.98',runtimeVersion:'3.98',shellVersion:'3.17',
  releaseType:'runtime',delete:[],runtime:{files:names.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}});
test('V3.97 -> V3.98 OTA includes fire-centered world positions and keeps user data',()=>{
 const patch=selectVerifiedRuntimeV398Delta(manifest(),'3.97');
 assert.equal(patch?.upgradeMode,'verified-overlay');
 assert.equal(patch?.optimizedFromVersion,'3.97');
 assert.deepEqual(patch?.runtime.files.map(file=>file.path),names);
 assert.deepEqual(patch?.delete,[]);
});
test('Seat layout V3.98 update cannot delete data, accept external URLs or omit center geometry',()=>{
 assert.equal(selectVerifiedRuntimeV398Delta(manifest(),'3.96'),null);
 const x=manifest();x.delete=['member-data'];assert.equal(selectVerifiedRuntimeV398Delta(x,'3.97'),null);
 const y=manifest();y.runtime.files.pop();assert.equal(selectVerifiedRuntimeV398Delta(y,'3.97'),null);
 const z=manifest();z.runtime.files[3].url='https://wrong.example/village-layout.js';
 assert.equal(selectVerifiedRuntimeV398Delta(z,'3.97'),null);
 const bad=manifest();bad.runtime.files[2].sha256='invalid';
 assert.equal(selectVerifiedRuntimeV398Delta(bad,'3.97'),null);
});
test('Worker, GM IPA and Player village all advertise fresh V3.98 cache keys',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const worker=read('src/index.js'),app=read('server-game/current/app.js');
 const html=read('server-game/current/GMWW.html'),player=read('assets/village/village.mjs'),village=read('assets/village/index.html');
 assert.match(worker,/VERSION="V3\.98",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-398"/);
 assert.match(app,/const VERSION='3\.98'/);
 assert.match(html,/<title>GMWW V3\.98<\/title>/);
 assert.match(html,/village-layout\.js\?v=3\.98-fire-center/);
 assert.match(player,/village-layout\.js\?v=seat398/);
 assert.match(village,/village\.mjs\?v=seat398/);
 assert.equal(worker.split('selectVerifiedRuntimeV398Delta(').length-1,2);
});
