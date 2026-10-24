import test from 'node:test';
import assert from 'node:assert/strict';
import {selectPublishedIpa} from '../.github/scripts/published-ipa.mjs';
const proof={version:'3.161',sha256:'a'.repeat(64),size:80000000};
test('published IPA advances download independently of minimum OTA shell',()=>{
 const ipa=selectPublishedIpa(proof,'3.161','3.110');
 assert.equal(ipa.version,'3.161');assert.equal(ipa.sha256,proof.sha256);
 assert.equal(ipa.url,'https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v3.161/GMWW-V3.161.ipa');
});
test('missing, invalid or future release evidence retains supported shell download',()=>{
 for(const p of [null,{...proof,sha256:''},{...proof,size:0},{...proof,version:'3.162'},{...proof,version:'../../x'}])assert.equal(selectPublishedIpa(p,'3.161','3.110').version,'3.110');
});

test('the published download proof selects an available compatible IPA',async()=>{
 const fs=await import('node:fs');
 const record=JSON.parse(fs.readFileSync('update-system/published-ipa.json','utf8'));
 const runtime=fs.readFileSync('server-game/current/app.js','utf8').match(/const VERSION='([^']+)'/)[1];
 const ipa=selectPublishedIpa(record,runtime,'3.110');
 assert.equal(ipa.version,record.version);assert.equal(ipa.sha256,record.sha256);
 assert.match(record.sourceCommit,/^[a-f0-9]{40}$/);
});

test('official V3.197 release evidence updates the Server download library without changing OTA shell',async()=>{
 const fs=await import('node:fs');
 const proof=JSON.parse(fs.readFileSync('update-system/published-ipa.json','utf8'));
 const current=fs.readFileSync('server-game/current/app.js','utf8').match(/const VERSION='([^']+)'/)?.[1];
 const compare=(a,b)=>a.localeCompare(b,undefined,{numeric:true});
 assert.ok(compare(proof.version,'3.179')>=0,'Do not regress the verified V3.179 IPA download');
 assert.ok(compare(proof.version,current)<=0,'Published IPA cannot exceed available Runtime');
 assert.equal(proof.version,'3.197','Server download must match published GMWW V3.196');
 assert.equal(proof.sha256,'74aa218c9081c92caf596a8adccb96d992aea3ff964598cc7add32569dc380a7');
 assert.equal(proof.size,136084529);
 assert.equal(proof.sourceCommit,'6b887ce739380a1cdc06a11ac16b1f3fd6a8d5c7');
 assert.equal(proof.buildRun,'https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40034743719');
 assert.equal(proof.releaseUrl,'https://github.com/WilliamPham0702/GMWW-V2.00/releases/tag/gmww-v3.197');
 const ipa=selectPublishedIpa(proof,current,'3.110');
 assert.equal(ipa.version,proof.version);
 assert.equal(ipa.fileName,'GMWW-V'+proof.version+'.ipa');
 assert.equal(ipa.sha256,proof.sha256);
 assert.equal(ipa.size,proof.size);
});

test('GMWW V3.200 runtime advertises the verified V3.197 IPA without raising minimum shell',async()=>{
 const fs=await import('node:fs');
 const record=JSON.parse(fs.readFileSync('update-system/published-ipa.json','utf8'));
 const runtime=fs.readFileSync('server-game/current/app.js','utf8').match(/const VERSION='([^']+)'/)?.[1];
 const worker=fs.readFileSync('src/index.js','utf8');
 assert.equal(runtime,'3.200');
 assert.match(worker,/VERSION="V3\.200"/);
 assert.match(worker,/UPDATE_CHANNEL_REV="runtime-3200"/);
 const download=selectPublishedIpa(record,runtime,'3.110');
 assert.equal(download.version,'3.197');
 assert.equal(download.fileName,'GMWW-V3.197.ipa');
 assert.equal(download.sha256,record.sha256);
 assert.equal(download.size,record.size);
 assert.equal(download.url,'https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v3.197/GMWW-V3.197.ipa');
 assert.match(fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8'),/ipa:selectPublishedIpa\(publishedIpa,version,isNative\?version:shell\)/);
});


test('V3.197 release notes describe PR #439 and downloaded IPA V3.197', async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
 assert.match(source,/V3\.197: PR #439/);
 assert.match(source,/handleSeatSwapRequests/);
 assert.match(source,/IPA V3\.197 đã được phát hành chính thức/);
 const record=JSON.parse(fs.readFileSync('update-system/published-ipa.json','utf8'));
 assert.equal(selectPublishedIpa(record,'3.197','3.110').version,'3.197');
});
