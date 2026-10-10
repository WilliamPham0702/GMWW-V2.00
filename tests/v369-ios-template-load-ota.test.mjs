import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV369Delta} from '../src/gmww-ota-delta.js';
const pathNames=['GMWW.html','app.js','style.css'];
const host='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.69/';
const manifest=()=>({releaseVersion:'3.69',runtimeVersion:'3.69',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:pathNames.map(path=>({path,url:host+path,sha256:'a'.repeat(64)}))}});
test('IPA V3.68 upgrades only the three GM UI files and retains native artwork',()=>{
 const x=selectVerifiedRuntimeV369Delta(manifest(),'3.68');
 assert.equal(x?.upgradeMode,'verified-overlay');
 assert.deepEqual(x?.runtime?.files?.map(f=>f.path),pathNames);
 assert.deepEqual(x?.delete,[]);
});
test('V3.69 prevents partial/unsafe IPA patches',()=>{
 for(const from of ['3.17','3.67','3.69','3.60',''])assert.equal(selectVerifiedRuntimeV369Delta(manifest(),from),null);
 for(const mutate of [x=>{x.releaseVersion='3.68'},x=>{x.runtimeVersion='3.68'},x=>{x.shellVersion='3.69'},x=>{x.delete=['artwork']},x=>{x.runtime.files.pop()},x=>{x.runtime.files[0].sha256='invalid'},x=>{x.runtime.files[1].url='https://example.org/app.js'},x=>{x.runtime.files.push({...x.runtime.files[0]})}]){const x=manifest();mutate(x);assert.equal(selectVerifiedRuntimeV369Delta(x,'3.68'),null)}
});
test('Worker newest Runtime selector is V3.82 on both paths',()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const kind of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV376Delta('+kind+',url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta'));
 assert.match(worker,/VERSION="V3\.82",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-382"/);
 const app=fs.readFileSync('server-game/current/app.js','utf8');
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 assert.match(app,/const VERSION='3\.82'/);
 assert.match(html,/<title>GMWW V3\.82<\/title>/);
 assert.match(html,/app\.js\?v=3\.82-presence-dots/);
});
