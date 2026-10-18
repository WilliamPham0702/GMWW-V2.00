#!/usr/bin/env node
// Fail-closed Production regression for real iPhone IPA V3.110 OTA manifests.
// Audit the exact small file set from immutable Production V3.137/V3.138
// inventories, and independently download/hash each delta byte.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ORIGIN='https://gmww-v2-00.williampham0702.workers.dev';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function validateV3140Delta(response,target,base,installed){
  if(response?.ok!==true||response?.releaseType!=='runtime'||
    response.releaseVersion!=='3.140'||response.runtimeVersion!=='3.140'||
    response.shellVersion!=='3.110'||response.deltaFrom!==installed||
    target?.releaseVersion!=='3.140'||base?.releaseVersion!==installed||
    !Array.isArray(response?.runtime?.files)||response.runtime.files.length===0||
    (response.delete||[]).length!==0)return false;
  const source=new Map(base.runtime.files.map(f=>[f.path,f.sha256]));
  const expected=target.runtime.files.filter(f=>source.get(f.path)!==f.sha256);
  if(expected.length!==response.runtime.files.length||expected.length>10)return false;
  const actual=new Map(response.runtime.files.map(f=>[f.path,f]));
  if(actual.size!==expected.length)return false;
  return expected.every(f=>{
    const item=actual.get(f.path);
    return item?.sha256===f.sha256&&item?.url===f.url&&
      /^[a-f0-9]{64}$/.test(item.sha256)&&item.url===ORIGIN+'/updates/runtime/V3.140/'+item.path.split('/').map(encodeURIComponent).join('/');
  });
}

async function fetchWithRetries(url){
  let error;
  for(let attempt=0;attempt<4;attempt++){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'cache-control':'no-cache'}});
      if(!response.ok)throw Error('HTTP '+response.status+' '+url);
      return response;
    }catch(e){error=e; if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)))}
  }
  throw error;
}
export async function verifyV3140Production(origin=ORIGIN){
  if(origin!==ORIGIN)throw Error('Cannot verify noncanonical OTA origin');
  const latest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'));
  const pinned=JSON.parse(fs.readFileSync('update-system/verified-ota-baselines-v3140.json','utf8'));
  if(latest.releaseVersion!=='3.140'||pinned.baselines.length!==3)throw Error('Invalid expected release or audit baseline');
  for(const version of ['3.137','3.138','3.139']){
    const row=pinned.baselines.find(x=>x.version===version);
    if(!row)throw Error('Missing verified base '+version);
    const url=origin+'/api/update/manifest?current='+version+'&iphone-v3140='+Date.now();
    const response=await fetchWithRetries(url);
    const manifest=await response.json();
    if(!validateV3140Delta(manifest,latest,row.manifest,version))
      throw Error('V'+version+' -> V3.140 manifest is not the verified SHA-256 delta');
    for(const f of manifest.runtime.files){
      const fileResponse=await fetchWithRetries(f.url+'?iphone-sha-verify='+Date.now());
      const bytes=Buffer.from(await fileResponse.arrayBuffer());
      if(sha(bytes)!==f.sha256)throw Error('Production OTA SHA mismatch: '+f.path);
      console.log('Production V'+version+' -> V3.140 '+f.path+' verified '+bytes.length+' bytes');
    }
    console.log('SUCCESS: iPhone shell V3.110 Runtime V'+version+' -> V3.140 immutable delta: '+manifest.runtime.files.length+' files');
  }
  return true;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  verifyV3140Production(process.argv[2]||ORIGIN).catch(e=>{console.error(e);process.exitCode=1});
}
