#!/usr/bin/env node
/** Verify that IPA V3.17 installed on Runtime V3.50 can install V3.51 quickly.
 * This check fetches the actual deployed manifest and all three runtime files,
 * verifying their SHA-256 before declaring Production SUCCESS.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const url=process.argv[2],version=process.argv[3];
if(version!=='3.51'){console.log('Incremental OTA test applies only to V3.51; skipped '+version);process.exit(0)}
if(!/^https:\/\/gmww-v2-00\.williampham0702\.workers\.dev$/.test(url||''))throw Error('Untrusted Production origin');
const response=await fetch(url+'/api/update/manifest?current=3.50&verify-lean='+Date.now(),{signal:AbortSignal.timeout(25000),headers:{'cache-control':'no-cache'}});
assert.equal(response.status,200,'V3.50 update manifest must be readable');
const manifest=await response.json();
assert.equal(manifest.ok,true);
assert.equal(manifest.releaseVersion,'3.51');
assert.equal(manifest.releaseType,'runtime');
assert.equal(manifest.optimizedFromVersion,'3.50');
assert.equal(manifest.upgradeMode,'verified-overlay');
const expected=['GMWW.html','app.js','style.css'];
assert.deepEqual(manifest.runtime.files.map(x=>x.path),expected);
assert.deepEqual(manifest.delete,[]);
let total=0;
for(const f of manifest.runtime.files){
  assert.equal(f.url,url+'/updates/runtime/V3.51/'+f.path);
  const res=await fetch(f.url+'?verify-lean='+Date.now(),{signal:AbortSignal.timeout(25000),headers:{'cache-control':'no-cache'}});
  assert.equal(res.status,200,'File unavailable '+f.path);
  const data=Buffer.from(await res.arrayBuffer());
  const hash=crypto.createHash('sha256').update(data).digest('hex');
  assert.equal(hash,f.sha256,'Integrity mismatch '+f.path);
  const local=fs.readFileSync('server-game/current/'+f.path);
  if(f.path!=='GMWW.html')assert.equal(hash,crypto.createHash('sha256').update(local).digest('hex'),'Unexpected build content '+f.path);
  if(f.path==='GMWW.html')assert.match(data.toString('utf8'),/<title>GMWW V3\.51<\/title>/);
  if(f.path==='app.js')assert.match(data.toString('utf8'),/const VERSION='3\.51'/);
  total+=data.length;
  console.log('IPA V3.17 overlay integrity PASS '+f.path+' ('+data.length+' bytes)');
}
console.log('V3.50 → V3.51 3-file OTA PASS, total bytes '+total);
