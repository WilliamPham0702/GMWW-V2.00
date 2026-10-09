#!/usr/bin/env node
/** Verify that IPA V3.17 installed on Runtime V3.50 can install V3.51 quickly.
 * This check fetches the actual deployed manifest and all three runtime files,
 * verifying their SHA-256 before declaring Production SUCCESS.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const url=process.argv[2],version=process.argv[3];
if(!['3.51','3.52','3.54'].includes(version)){console.log('Incremental OTA test skipped '+version);process.exit(0)}
if(!/^https:\/\/gmww-v2-00\.williampham0702\.workers\.dev$/.test(url||''))throw Error('Untrusted Production origin');
const installed=version==='3.54'?'3.53':version==='3.52'?'3.51':'3.50';
// Cloudflare asset deployment is eventually consistent across edge locations.
// Retry only transient 404/503/502/504 or a stale manifest. Never accept an
// incorrect version, invalid checksum, or incomplete release as successful.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readLiveManifest(){
  let last='';
  for(let attempt=1;attempt<=14;attempt++){
    try{
      const target=url+'/api/update/manifest?current='+installed+'&verify-lean='+Date.now()+'&attempt='+attempt;
      const response=await fetch(target,{signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache'}});
      if(response.ok){
        const data=await response.json();
        if(data.ok===true&&data.releaseVersion===version&&data.upgradeMode==='verified-overlay')return data;
        last='stale or incomplete manifest: '+String(data.releaseVersion||'unknown')+'/'+String(data.upgradeMode||'none');
      }else{
        last='manifest HTTP '+response.status;
        if(![404,429,500,502,503,504].includes(response.status))throw Error(last);
      }
    }catch(error){
      last=String(error?.message||error);
      if(!/fetch failed|timeout|aborted|manifest HTTP/.test(last))throw error;
    }
    if(attempt<14)await pause(1000+attempt*200);
  }
  throw Error('V'+installed+' → V'+version+' OTA manifest unavailable after retries: '+last);
}
async function fetchImmutableAsset(assetUrl,path){
  let last='';
  for(let attempt=1;attempt<=12;attempt++){
    try{
      const separator=assetUrl.includes('?')?'&':'?';
      const res=await fetch(assetUrl+separator+'verify-lean='+Date.now()+'&attempt='+attempt,{signal:AbortSignal.timeout(20000),headers:{'cache-control':'no-cache'}});
      if(res.ok)return res;
      last='HTTP '+res.status;
      if(![404,429,500,502,503,504].includes(res.status))throw Error(path+': '+last);
    }catch(error){
      last=String(error?.message||error);
      if(!/fetch failed|timeout|aborted|HTTP/.test(last))throw error;
    }
    if(attempt<12)await pause(950+attempt*200);
  }
  throw Error('Immutable OTA file unavailable after retries: '+path+' ('+last+')');
}
const manifest=await readLiveManifest();
assert.equal(manifest.ok,true);
assert.equal(manifest.releaseVersion,version);
assert.equal(manifest.releaseType,'runtime');
assert.equal(manifest.optimizedFromVersion,installed);
assert.equal(manifest.upgradeMode,'verified-overlay');
const expected=['GMWW.html','app.js','style.css'];
if(version==='3.52')expected.push('home-art/home-sea-portal-v352.svg');
if(version==='3.54')expected.push('home-art/home-sea-portal-v354.svg','home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg');
assert.deepEqual(manifest.runtime.files.map(x=>x.path),expected);
assert.deepEqual(manifest.delete,[]);
let total=0;
for(const f of manifest.runtime.files){
  assert.equal(f.url,url+'/updates/runtime/V'+version+'/'+f.path);
  const res=await fetchImmutableAsset(f.url,f.path);
  assert.equal(res.status,200,'File unavailable '+f.path);
  const data=Buffer.from(await res.arrayBuffer());
  const hash=crypto.createHash('sha256').update(data).digest('hex');
  assert.equal(hash,f.sha256,'Integrity mismatch '+f.path);
  const local=fs.readFileSync('server-game/current/'+f.path);
  if(f.path!=='GMWW.html')assert.equal(hash,crypto.createHash('sha256').update(local).digest('hex'),'Unexpected build content '+f.path);
  if(f.path==='GMWW.html')assert.match(data.toString('utf8'),new RegExp('<title>GMWW V'+version.replace('.','\\.')+'<\\/title>'));
  if(f.path==='app.js')assert.match(data.toString('utf8'),new RegExp("const VERSION='"+version.replace('.','\\.')+"'"));
  total+=data.length;
  console.log('IPA V3.17 overlay integrity PASS '+f.path+' ('+data.length+' bytes)');
}
console.log('V'+installed+' → V'+version+' '+expected.length+'-file OTA PASS, total bytes '+total);
