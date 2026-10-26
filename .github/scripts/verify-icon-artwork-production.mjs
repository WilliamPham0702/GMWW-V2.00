import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=(process.argv[2]||'https://gmww-v2-00.williampham0702.workers.dev').replace(/\/$/,'');
const version=JSON.parse(fs.readFileSync('package.json')).version.replace(/\.0$/,'');
const manifest=JSON.parse(fs.readFileSync('assets/action-icons/v3/manifest.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fetchBytes(url){
 for(let i=0;i<5;i++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${r.status} ${url}`);return Buffer.from(await r.arrayBuffer())}
  catch(e){if(i===4)throw e;await new Promise(r=>setTimeout(r,2000))}
 }
}
const health=JSON.parse(await fetchBytes(root+'/api/health'));
assert.equal(health.version,'V'+version);
const ota=JSON.parse(await fetchBytes(root+'/api/update/manifest'));
assert.equal(ota.runtimeVersion,version);assert.equal(ota.manifestSource,'build-verified');
assert.equal(ota.shellVersion,'3.110');
if(fs.existsSync('/tmp/gmww-production-update-manifest.json')){
 const prior=JSON.parse(fs.readFileSync('/tmp/gmww-production-update-manifest.json'));
 assert.equal(ota.ipa?.sha256,prior.ipa?.sha256,'Native IPA must remain unchanged');
}
assert.ok(ota.releaseNotes.some(x=>x.includes('Bộ icon minh họa')));
const files=ota.runtime?.files||[];
const entries=manifest.icons;
assert.equal(entries.length,50);
for(let i=0;i<entries.length;i+=5){
 await Promise.all(entries.slice(i,i+5).map(async icon=>{
  const path='action-icons/v3/'+icon.file,entry=files.find(x=>x.path===path);
  assert.ok(entry,'OTA missing '+path);assert.equal(entry.sha256,icon.sha256);
  for(const url of [root+'/'+path,entry.url])assert.equal(sha(await fetchBytes(url)),icon.sha256,url);
 }));
}
for(const path of ['GMWW.html','app.js','action-icon-library.js']){
 const entry=files.find(x=>x.path===path);assert.ok(entry,path);
 const b=await fetchBytes(entry.url);assert.equal(sha(b),entry.sha256);
 assert.equal(sha(b),sha(fs.readFileSync('server-game/current/'+path)));
}
console.log(`PASS Production V${version}: 50 direct images + 50 OTA image SHA-256, runtime JS/HTML, notes, health, IPA unchanged.`);
