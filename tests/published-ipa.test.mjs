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
