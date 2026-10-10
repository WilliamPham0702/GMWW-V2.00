import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV370Delta} from '../src/gmww-ota-delta.js';
const host='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.70/';
const paths=['GMWW.html','app.js','style.css'],sha='c'.repeat(64);
const manifest=()=>({releaseVersion:'3.70',runtimeVersion:'3.70',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:host+path,sha256:sha}))}});
test('V3.70 installs only the verified three UI files on IPA Runtime V3.69',()=>{
 const patch=selectVerifiedRuntimeV370Delta(manifest(),'3.69');
 assert.equal(patch?.upgradeMode,'verified-overlay');
 assert.deepEqual(patch?.runtime?.files?.map(f=>f.path),paths);
 assert.deepEqual(patch?.delete,[]);
});
test('V3.70 overlay fails closed on tampering or unsupported base',()=>{
 for(const previous of ['3.17','3.68','3.70','3.60',''])assert.equal(selectVerifiedRuntimeV370Delta(manifest(),previous),null);
 for(const change of [
 x=>{x.releaseVersion='3.69'},x=>{x.runtimeVersion='3.69'},x=>{x.shellVersion='3.70'},
 x=>{x.delete=['game-data']},x=>{x.runtime.files.pop()},x=>{x.runtime.files[1].sha256='invalid'},
 x=>{x.runtime.files[1].url='https://invalid.example/app.js'},x=>{x.runtime.files.push({...x.runtime.files[0]})}
 ]){const x=manifest();change(x);assert.equal(selectVerifiedRuntimeV370Delta(x,'3.69'),null)}
});
test('Worker and IPA Runtime V3.79 declarations are aligned and retain native shell V3.17',()=>{
 const worker=fs.readFileSync('src/index.js','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8');
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 for(const type of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV376Delta('+type+',url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta'));
 assert.match(worker,/VERSION="V3\.79",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-379"/);
 assert.match(app,/const VERSION='3\.79'/);
 assert.match(html,/<title>GMWW V3\.79<\/title>/);
 assert.match(html,/app\.js\?v=3\.79-battle-swap/);
 assert.equal(pkg.version,'3.79.0');
});
