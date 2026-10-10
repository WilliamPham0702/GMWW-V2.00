import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV365Delta} from '../src/gmww-ota-delta.js';

const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.65/';
const paths=['GMWW.html','app.js','style.css'];
const sha='a'.repeat(64);
const mk=()=>({
 releaseVersion:'3.65',runtimeVersion:'3.65',shellVersion:'3.17',releaseType:'runtime',delete:[],
 runtime:{files:[...paths.map(path=>({path,url:root+path,sha256:sha})),{path:'home-art/home-sea-members-v354.svg',url:root+'home-art/home-sea-members-v354.svg',sha256:sha}]}
});

test('V3.64 IPA -> V3.65 Runtime uses exactly three verified GM files, preserving artwork/data',()=>{
 const out=selectVerifiedRuntimeV365Delta(mk(),'3.64');
 assert.equal(out?.upgradeMode,'verified-overlay');
 assert.equal(out?.optimizedFromVersion,'3.64');
 assert.deepEqual(out?.runtime?.files?.map(x=>x.path),paths);
 assert.deepEqual(out?.delete,[]);
 assert.match(out?.message||'',/V3.65/);
});
test('V3.65 OTA fails closed on missing/wrong hashes, extra deletions or unsupported base',()=>{
 const empty=mk();
 for(const before of ['3.63','3.65','3.17','','3.61'])assert.equal(selectVerifiedRuntimeV365Delta(empty,before),null);
 for(const mutate of [
   x=>{x.releaseVersion='3.64'},
   x=>{x.runtimeVersion='3.64'},
   x=>{x.shellVersion='3.64'},
   x=>{x.delete=['data']},
   x=>{x.runtime.files[0].sha256='invalid'},
   x=>{x.runtime.files[1].url='https://untrusted.invalid/app.js'},
   x=>{x.runtime.files.splice(1,1)},
   x=>{x.runtime.files.push({...x.runtime.files[0]})},
 ]){const x=mk();mutate(x);assert.equal(selectVerifiedRuntimeV365Delta(x,'3.64'),null)}
});
test('Both IPA update-manifest routes run V3.65 fast overlay ahead of older algorithms',()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 for(const v of ['versioned','manifest']){
   const present='selectVerifiedRuntimeV365Delta('+v+',url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta';
   assert.ok(worker.includes(present),'Missing V3.65 selector on '+v);
 }
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const app=fs.readFileSync('server-game/current/app.js','utf8');
 assert.equal(pkg.version,'3.74.0');
 assert.match(html,/<title>GMWW V3\.74<\/title>/);
 assert.match(html,/app\.js\?v=3\.74-delivery-progress/);
 assert.match(app,/const VERSION='3\.74'/);
 assert.match(worker,/VERSION="V3\.74",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-374"/);
});
