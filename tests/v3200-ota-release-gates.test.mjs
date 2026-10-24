import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyOtaVersionAdvance,compareReleaseVersions} from '../.github/scripts/verify-ota-version-advance.mjs';

const read=path=>fs.readFileSync(path,'utf8');
const base='https://gmww-v2-00.williampham0702.workers.dev';
const fileNames=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'];
const make=(version,hash)=>({
 releaseVersion:version,runtimeVersion:version,releaseType:'runtime',
 shellVersion:'3.110',minimumShellVersion:'3.110',delete:[],
 runtime:{files:fileNames.map(path=>({
  path,sha256:hash,url:base+'/updates/runtime/V'+version+'/'+path
 }))}
});

test('V3.200 phát hành sau V3.199 và chặn ghi đè khi bytes thay đổi',()=>{
 const live=make('3.199','a'.repeat(64));
 const candidate=make('3.200','b'.repeat(64));
 assert.equal(compareReleaseVersions(candidate.releaseVersion,live.releaseVersion),1);
 const accepted=verifyOtaVersionAdvance(candidate,live,['server-game/current/app.js']);
 assert.equal(accepted.runtimeChanged,true);
 assert.equal(accepted.candidateVersion,'3.200');
 assert.throws(()=>verifyOtaVersionAdvance(make('3.199','b'.repeat(64)),live,['server-game/current/app.js']),/does not advance/);
 assert.throws(()=>verifyOtaVersionAdvance(make('3.199','b'.repeat(64)),
  {releaseVersion:'3.199',source:'verified-live-health-fallback'},
  ['server-game/current/app.js']),/does not advance/);
 assert.throws(()=>verifyOtaVersionAdvance(make('3.199','b'.repeat(64)),live,['tests/ci-browser-scope.test.mjs']),/does not advance/);
});

test('V3.200 giữ shell và lưu đầy đủ thay đổi PR #457 trong release notes',()=>{
 const notes=read('.github/scripts/prepare-update-channel.mjs');
 const html=read('server-game/current/GMWW.html');
 const worker=read('src/index.js');
 const layout=read('assets/village/village-layout.js');
 assert.match(notes,/releaseNotes:\["V3\.200: PR #457/);
 assert.match(notes,/Giãn cách 70–135%/);
 assert.match(notes,/🔄 khôi phục/i);
 assert.match(worker,/VERSION="V3\.200",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3200"/);
 assert.match(html,/<title>GMWW V3\.200<\/title>/);
 assert.match(html,/data-seat-shift="reset"/);
 for(const direction of ['left','right','up','down'])assert.doesNotMatch(html,new RegExp('data-seat-shift="'+direction+'"'));
 assert.match(layout,/function resolveSeatOffset\(/);
 assert.match(layout,/const margin=2;/);
 assert.doesNotMatch(layout.slice(layout.indexOf('function resolveSeatOffset('),layout.indexOf('function positions(')),/fireClear\(|inside\(/);
});

test('CI tạo SHA-256 trên thực tế, đối chiếu live version và tuyệt đối không triển khai',()=>{
 const workflow=read('.github/workflows/prepare-runtime-v3200-candidate.yml');
 const verify=read('.github/scripts/verify-prepared-runtime.mjs');
 assert.match(workflow,/GMWW V3\.200 OTA Candidate SHA-256/);
 assert.match(workflow,/prepare-update-channel\.mjs runtime/);
 assert.match(workflow,/verify-prepared-runtime\.mjs 3\.200/);
 assert.match(workflow,/verify-ota-version-advance\.mjs/);
 assert.match(workflow,/GMWW-V3\.200-OTA-CANDIDATE-SHA256-NO-DEPLOY/);
 assert.doesNotMatch(workflow,/\bwrangler deploy\b|\bgh release create\b|\bworkflow_dispatch\b/);
 assert.match(verify,/createHash\('sha256'\)/);
 assert.match(verify,/entry\.sha256!==sha/);
 assert.match(verify,/manifest\.delete\?\.length/);
});
