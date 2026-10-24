import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyOtaVersionAdvance,compareReleaseVersions} from '../.github/scripts/verify-ota-version-advance.mjs';
const read=path=>fs.readFileSync(path,'utf8');
const base='https://gmww-v2-00.williampham0702.workers.dev';
const paths=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'];
const make=(version,hash)=>({releaseVersion:version,runtimeVersion:version,
 releaseType:'runtime',shellVersion:'3.110',minimumShellVersion:'3.110',delete:[],
 runtime:{files:paths.map(path=>({path,sha256:hash,url:base+'/updates/runtime/V'+version+'/'+path}))}
});

test('V3.202 increases beyond Production V3.200; same-version changed bytes rejected',()=>{
 const live=make('3.200','a'.repeat(64)),candidate=make('3.202','b'.repeat(64));
 assert.equal(compareReleaseVersions('3.202','3.200'),1);
 assert.equal(verifyOtaVersionAdvance(candidate,live,['server-game/current/app.js']).runtimeChanged,true);
 assert.throws(()=>verifyOtaVersionAdvance(make('3.200','b'.repeat(64)),live,['server-game/current/app.js']),/does not advance/);
 assert.throws(()=>verifyOtaVersionAdvance(make('3.200','b'.repeat(64)),{releaseVersion:'3.200',source:'verified-live-health-fallback'},['server-game/current/app.js']),/does not advance/);
});

test('V3.204 leaves native shell V3.110 and already-published IPA V3.200 unchanged',()=>{
 const notes=read('.github/scripts/prepare-update-channel.mjs');
 const worker=read('src/index.js'),html=read('server-game/current/GMWW.html');
 const proof=JSON.parse(read('update-system/published-ipa.json'));
 assert.match(notes,/releaseNotes:\["V3\.204: Lên Giàn/);
 assert.match(notes,/V3\.200: PR #457/);
 assert.match(notes,/không đổi seat/);
 assert.match(worker,/VERSION="V3\.204",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3204"/);
 assert.match(html,/<title>GMWW V3\.204<\/title>/);
 assert.equal(proof.version,'3.200');
 assert.equal(proof.sha256,'974cefca2dbff129d0f6c4bf50505f883814a9b9813b08199238f8bb4a2f4aa6');
});

test('V3.204 CI builds SHA-256 from actual Runtime bytes without deploying Production',()=>{
 const workflow=read('.github/workflows/prepare-runtime-v3202-candidate.yml');
 const verify=read('.github/scripts/verify-prepared-runtime.mjs');
 assert.match(workflow,/GMWW V3\.204 OTA Candidate SHA-256/);
 assert.match(workflow,/prepare-update-channel\.mjs runtime/);
 assert.match(workflow,/verify-prepared-runtime\.mjs 3\.204/);
 assert.match(workflow,/verify-ota-version-advance\.mjs/);
 assert.match(workflow,/GMWW-V3\.204-OTA-CANDIDATE-SHA256-NO-DEPLOY/);
 assert.doesNotMatch(workflow,/\bwrangler deploy\b|\bgh release create\b|\bworkflow_dispatch\b/);
 assert.match(verify,/createHash\('sha256'\)/);
});
