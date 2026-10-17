import {assertCurrentRelease} from './release-metadata-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV3101Delta} from '../src/gmww-ota-delta.js';

const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.101/';
const names=['GMWW.html','app.js','style.css','village-layout.js'];
function manifest(){return {releaseVersion:'3.101',runtimeVersion:'3.101',shellVersion:'3.17',
  releaseType:'runtime',delete:[],runtime:{files:names.map(path=>
    ({path,url:origin+path,sha256:'f'.repeat(64)}))}}}

test('V3.100 to V3.101 is a no-delete SHA-verified four-file overlay',()=>{
 const m=selectVerifiedRuntimeV3101Delta(manifest(),'3.100');
 assert.equal(m?.upgradeMode,'verified-overlay');
 assert.equal(m?.optimizedFromVersion,'3.100');
 assert.deepEqual(m?.delete,[]);
 assert.deepEqual(m?.runtime.files.map(f=>f.path),names);
 for(const wrong of ['3.99','3.98','3.101'])assert.equal(selectVerifiedRuntimeV3101Delta(manifest(),wrong),null);
 const bad=manifest();bad.runtime.files[0].url='https://attacker.invalid/GMWW.html';
 assert.equal(selectVerifiedRuntimeV3101Delta(bad,'3.100'),null);
 const invalid=manifest();invalid.runtime.files[2].sha256='unsafe';
 assert.equal(selectVerifiedRuntimeV3101Delta(invalid,'3.100'),null);
 const deleted=manifest();deleted.delete=['localStorage'];
 assert.equal(selectVerifiedRuntimeV3101Delta(deleted,'3.100'),null);
});

test('V3.104 preserves the V3.101 Smart Seat GM/Worker/Player contract together while preserving existing gameplay and assignments',()=>{
 const worker=fs.readFileSync('src/index.js','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8');
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),player=fs.readFileSync('assets/village/village.mjs','utf8');
 assertCurrentRelease();
 assert.match(player,/fire3101/);
 assert.match(worker,/seatLayout:villageLayout\.recommendedSeatShape\(seatCount\)/);
 assert.match(worker,/const locations=villageLayout\.positions\(requested,seatLayout,seatOffset,seatSpacing\)/);
 assert.match(app,/const shape=layout\.recommendedSeatShape\(count\)/);
 assert.match(app,/PLAY_SEAT_PRESET_NAMES=\{circle:'HÌNH TRÒN',ellipse:'ELIP',rectangle:'CHỮ NHẬT'\}/);
});
