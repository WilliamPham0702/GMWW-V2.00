import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectVerifiedRuntimeV358Delta} from '../src/gmww-ota-delta.js';
const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.58/';
const paths=['GMWW.html','app.js','style.css'];
const sha='a'.repeat(64);
const manifest=()=>({
 releaseVersion:'3.58',runtimeVersion:'3.58',shellVersion:'3.17',releaseType:'runtime',
 delete:[],runtime:{files:[...paths.map(path=>({path,url:root+path,sha256:sha})),{path:'gm/gm-white-wolf.webp',url:root+'gm/gm-white-wolf.webp',sha256:sha}]}
});
test('Installed V3.57 updates only three UI files to V3.58, preserving artwork and data',()=>{
 const result=selectVerifiedRuntimeV358Delta(manifest(),'3.57');
 assert.equal(result.optimizedFromVersion,'3.57');
 assert.equal(result.upgradeMode,'verified-overlay');
 assert.deepEqual(result.runtime.files.map(f=>f.path),paths);
 assert.deepEqual(result.delete,[]);
 assert.equal(manifest().runtime.files.length,4);
});
test('Invalid hashes/URLs, missing files, duplicates and wrong base version fall back to full update',()=>{
 for(const from of ['3.56','3.58','3.17',''])assert.equal(selectVerifiedRuntimeV358Delta(manifest(),from),null);
 const badHash=manifest();badHash.runtime.files[0].sha256='bad';assert.equal(selectVerifiedRuntimeV358Delta(badHash,'3.57'),null);
 const badUrl=manifest();badUrl.runtime.files[0].url='https://other.invalid/GMWW.html';assert.equal(selectVerifiedRuntimeV358Delta(badUrl,'3.57'),null);
 const missing=manifest();missing.runtime.files.splice(1,1);assert.equal(selectVerifiedRuntimeV358Delta(missing,'3.57'),null);
 const duplicate=manifest();duplicate.runtime.files.push({...duplicate.runtime.files[0]});assert.equal(selectVerifiedRuntimeV358Delta(duplicate,'3.57'),null);
 const deleted=manifest();deleted.delete=['storage'];assert.equal(selectVerifiedRuntimeV358Delta(deleted,'3.57'),null);
});
test('Worker uses verified V3.58 delta on both manifest routes',()=>{
 const s=readFileSync('src/index.js','utf8');
 assert.ok(s.includes('selectVerifiedRuntimeV358Delta(versioned,url.searchParams.get("current"))'));
 assert.ok(s.includes('selectVerifiedRuntimeV358Delta(manifest,url.searchParams.get("current"))'));
 const html=readFileSync('server-game/current/GMWW.html','utf8');
 assert.match(html,/<title>GMWW V3\.81<\/title>/);
 assert.match(html,/app\.js\?v=3\.81-artifact-sea/);
 assert.match(html,/style\.css\?v=3\.81-artifact-sea/);
});
