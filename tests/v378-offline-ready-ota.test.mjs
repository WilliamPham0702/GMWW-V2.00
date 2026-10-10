import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV378Delta} from '../src/gmww-ota-delta.js';
const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.78/';
const files=['GMWW.html','app.js','style.css'],hash='f'.repeat(64);
const manifest=()=>({releaseVersion:'3.78',runtimeVersion:'3.78',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:files.map(path=>({path,url:origin+path,sha256:hash}))}});
test('V3.78 IPA gets only GM UI files without changing game data, artwork or native shell',()=>{
 const result=selectVerifiedRuntimeV378Delta(manifest(),'3.77');
 assert.equal(result?.upgradeMode,'verified-overlay');
 assert.deepEqual(result?.runtime?.files.map(x=>x.path),files);
 assert.deepEqual(result?.delete,[]);
});
test('V3.78 rejects partial or tampered packages and wrong base versions',()=>{
 for(const version of ['3.17','3.76','3.78',''])assert.equal(selectVerifiedRuntimeV378Delta(manifest(),version),null);
 for(const modify of [m=>{m.releaseVersion='3.77'},m=>{m.runtimeVersion='3.77'},m=>{m.shellVersion='3.78'},m=>{m.delete=['artwork']},m=>{m.runtime.files.pop()},m=>{m.runtime.files[1].url='https://unsafe.invalid/app.js'},m=>{m.runtime.files[0].sha256='bad'},m=>{m.runtime.files.push({...m.runtime.files[0]})}]){const m=manifest();modify(m);assert.equal(selectVerifiedRuntimeV378Delta(m,'3.77'),null)}
});
test('V3.84 metadata and both OTA endpoints are aligned',()=>{
 const app=fs.readFileSync('server-game/current/app.js','utf8'),html=fs.readFileSync('server-game/current/GMWW.html','utf8'),worker=fs.readFileSync('src/index.js','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 assert.equal(pkg.version,'3.84.0');
 assert.match(app,/const VERSION='3\.84'/);
 assert.match(html,/<title>GMWW V3\.84<\/title>/);
 assert.match(html,/app\.js\?v=3\.84-ai-support/);
 assert.match(worker,/VERSION="V3\.84",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-384"/);
 for(const kind of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV378Delta('+kind+',url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta'));
});
