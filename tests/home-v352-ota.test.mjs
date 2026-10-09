import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV352Delta} from '../src/gmww-ota-delta.js';
const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.52/';
const paths=['GMWW.html','app.js','style.css','home-art/home-sea-portal-v352.svg'];
const original={releaseVersion:'3.52',runtimeVersion:'3.52',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}};
test('V3.51 -> V3.52 verified 4-file OTA',()=>{
 const delta=selectVerifiedRuntimeV352Delta(original,'3.51');
 assert.equal(delta.optimizedFromVersion,'3.51');
 assert.deepEqual(delta.runtime.files.map(f=>f.path),paths);
 assert.equal(delta.upgradeMode,'verified-overlay');
});
test('OTA rejects wrong version, deletion, missing or duplicated file',()=>{
 assert.equal(selectVerifiedRuntimeV352Delta(original,'3.50'),null);
 assert.equal(selectVerifiedRuntimeV352Delta({...original,delete:['x']},'3.51'),null);
 assert.equal(selectVerifiedRuntimeV352Delta({...original,runtime:{files:original.runtime.files.slice(1)}},'3.51'),null);
 assert.equal(selectVerifiedRuntimeV352Delta({...original,runtime:{files:[...original.runtime.files,original.runtime.files[0]]}},'3.51'),null);
});
test('Five banner zones and new artwork linked',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const home=html.slice(html.indexOf('<section class="page active" id="home"'),html.indexOf('<section class="page" id="members"'));
 for(const key of ['gmww-home-scene-v351','gmww-home-enter-banner-v352','gmww-home-discover-banner-v352','gmww-home-stats-v350','gmww-home-activity-v350'])assert.ok(home.includes(key));
 assert.equal((home.match(/id="gmwwHomeEnterVillage"/g)||[]).length,1);
 assert.ok(fs.existsSync('server-game/current/home-art/home-sea-portal-v352.svg'));
 assert.ok(home.includes('src="home-art/home-sea-portal-v354.svg"'));
});
