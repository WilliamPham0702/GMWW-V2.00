import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV3104Delta,selectVerifiedRuntimeV3103Delta} from '../src/gmww-ota-delta.js';
const paths=['GMWW.html','app.js','style.css'];
const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.104/';
const manifest=()=>({releaseVersion:'3.104',runtimeVersion:'3.104',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}});

test('V3.103->V3.104 only upgrades UI files, verified by SHA, never deletes a saved session',()=>{
 const patch=selectVerifiedRuntimeV3104Delta(manifest(),'3.103');
 assert.equal(patch?.upgradeMode,'verified-overlay');
 assert.equal(patch?.optimizedFromVersion,'3.103');
 assert.deepEqual(patch?.runtime.files.map(x=>x.path),paths);
 assert.deepEqual(patch?.delete,[]);
 for(const v of ['3.102','3.104','3.99',''])assert.equal(selectVerifiedRuntimeV3104Delta(manifest(),v),null);
 const bad=manifest();bad.runtime.files[0].url='https://unsafe.invalid/GMWW.html';assert.equal(selectVerifiedRuntimeV3104Delta(bad,'3.103'),null);
 const checksum=manifest();checksum.runtime.files[1].sha256='invalid';assert.equal(selectVerifiedRuntimeV3104Delta(checksum,'3.103'),null);
 const deletion=manifest();deletion.delete=['localStorage'];assert.equal(selectVerifiedRuntimeV3104Delta(deletion,'3.103'),null);
 const missing=manifest();missing.runtime.files.pop();assert.equal(selectVerifiedRuntimeV3104Delta(missing,'3.103'),null);
});

test('V3.109 retains the V3.104 battle audio and server-enforced action usage implementation',()=>{
 const worker=fs.readFileSync('src/index.js','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8');
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 assert.match(worker,/VERSION="V3.118",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3118"/);
 assert.equal(worker.split('selectVerifiedRuntimeV3104Delta(').length-1,2);
 assert.equal(worker.split('selectVerifiedRuntimeV3103Delta(').length-1,2);
 assert.match(worker,/gmBattleAction/);
 assert.match(app,/battleReplayAudio/);
 assert.match(html,/id="battleAudioReplay"/);
 assert.match(html,/id="battleBottomControls"/);
 const previous=()=>({releaseVersion:'3.103',runtimeVersion:'3.103',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.103/'+path,sha256:'f'.repeat(64)}))}});
 assert.equal(selectVerifiedRuntimeV3103Delta(previous(),'3.102')?.optimizedFromVersion,'3.102');
});
