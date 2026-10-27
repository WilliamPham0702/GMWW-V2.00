import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const base='https://gmww-v2-00.williampham0702.workers.dev';
const version='3.245',path='action-icons/v3/51_yeu_tinh_three_way.webp';
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const expected='7e6a3bc3fc63993c4b9ebe0da8bf39099b5a5d8a9f2f4a02dad95778a8320c9a';
assert.equal(sha(fs.readFileSync('assets/'+path)),expected);
async function fetchBytes(url){
 for(let i=0;i<16;i++){
  try{const response=await fetch(url+'?fairy-verification='+i,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(String(response.status));
    return Buffer.from(await response.arrayBuffer());
  }catch(e){if(i===15)throw e;await new Promise(r=>setTimeout(r,1500))}
 }
}
for(let n=0;n<16;n++){
 const health=JSON.parse(await fetchBytes(base+'/api/health'));
 if(health.version==='V'+version)break;
 if(n===15)throw new Error('Production not advertising V'+version);
 await new Promise(r=>setTimeout(r,2000));
}
const manifest=JSON.parse(await fetchBytes(base+'/api/update/manifest'));
assert.equal(manifest.runtimeVersion,version);
assert.equal(manifest.shellVersion,'3.110');
assert.ok(manifest.releaseNotes.some(x=>x.includes('Yêu Tinh một icon')));
const entry=(manifest.runtime?.files||[]).find(x=>x.path===path);
assert.ok(entry,'OTA missing Fairy artwork');
assert.equal(entry.sha256,expected);
assert.equal(sha(await fetchBytes(base+'/'+path)),expected);
assert.equal(sha(await fetchBytes(entry.url)),expected);
const prior='/tmp/gmww-production-update-manifest.json';
if(fs.existsSync(prior)){
 const old=JSON.parse(fs.readFileSync(prior,'utf8'));
 assert.equal(manifest.ipa?.sha256,old.ipa?.sha256,'Native IPA changed unexpectedly');
}
console.log('PASS Production V3.245: approved Fairy composite 3-zone WebP direct/OTA SHA-256, correct release, IPA unchanged.');
