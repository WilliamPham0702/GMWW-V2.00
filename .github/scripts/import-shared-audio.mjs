#!/usr/bin/env node
// Strict, manual GitHub Release importer. Never modifies Worker/IPA/Runtime/DO.
import {execFileSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validPath,hash,prepareCatalog,validateCatalog,TAG} from './audio-catalog-core.mjs';

const REPO='WilliamPham0702/GMWW-V2.00';
const API='https://api.github.com/repos/'+REPO;
const TOKEN=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
const mode=process.argv.includes('--publish')?'publish':process.argv.includes('--rollback')?'rollback':'validate';
const temp=await mkdtemp(path.join(tmpdir(),'gmww-audio-'));
function required(ok,msg){if(!ok)throw Error(msg);}
function isNotFound(err){return String(err.message).includes('GITHUB_HTTP_404');}
async function api(uri,{method='GET',data=null,accept='application/vnd.github+json'}={}){
  required(TOKEN,'GITHUB_TOKEN_REQUIRED');
  const url=uri.startsWith('https://')?uri:API+uri;
  const headers={'accept':accept,'authorization':'Bearer '+TOKEN,'x-github-api-version':'2022-11-28'};
  if(data&&!(data instanceof Uint8Array)){headers['content-type']='application/json';data=JSON.stringify(data);}
  if(data instanceof Uint8Array)headers['content-type']='application/octet-stream';
  const res=await fetch(url,{method,headers,body:data,redirect:'follow'});
  if(!res.ok)throw Error('GITHUB_HTTP_'+res.status+' '+method+' '+url+' '+(await res.text()).slice(0,240));
  if(method==='DELETE')return null;
  const type=res.headers.get('content-type')||'';
  return accept==='application/octet-stream'?Buffer.from(await res.arrayBuffer()):
    type.includes('json')?await res.json():await res.text();
}
async function releases(){return await api('/releases?per_page=100');}
async function assetBytes(asset){
  required(asset.size>0&&asset.size<=256*1024*1024,'INVALID_RELEASE_ASSET_SIZE: '+asset.name);
  const bytes=await api('/releases/assets/'+asset.id,{accept:'application/octet-stream'});
  required(bytes.length===asset.size,'RELEASE_ASSET_SIZE_MISMATCH: '+asset.name);
  return bytes;
}
function assetByName(release,name){return release?.assets?.find(x=>x.name===name);}
function readZip(filename){
  const names=execFileSync('unzip',['-Z','-1',filename],{encoding:'utf8',maxBuffer:1024*1024})
    .split(/\r?\n/).filter(Boolean).filter(x=>!x.endsWith('/'));
  required(names.length<=310,'ZIP_TOO_MANY_FILES');
  const found=new Map();
  for(const name of names){
    required(validPath(name),'ZIP_UNSAFE_PATH: '+name);
    required(!found.has(name),'ZIP_DUPLICATE: '+name);
    const maxBuffer=name.endsWith('.mp3')?2*1024*1024+1024:256*1024;
    const bytes=execFileSync('unzip',['-p',filename,name],{maxBuffer});
    required(bytes.length<=maxBuffer,'ZIP_ENTRY_TOO_LARGE: '+name);
    found.set(name,bytes);
  }
  return found;
}
async function sourceEntries(source){
  required(source.draft===true&&source.tag_name.startsWith('gmww-audio-import-'),'SOURCE_MUST_BE_AUDIO_IMPORT_DRAFT');
  required(source.assets?.length>0,'SOURCE_RELEASE_HAS_ZERO_ASSETS');
  const entries=new Map();
  for(const asset of source.assets){
    const name=asset.name;
    required(validPath(name),'UNSAFE_SOURCE_ASSET_NAME: '+name);
    const bytes=await assetBytes(asset);
    let files;
    if(name.endsWith('.zip')){
      const local=path.join(temp,'input-'+asset.id+'.zip');
      await writeFile(local,bytes);
      files=readZip(local);
    }else if(name.endsWith('.mp3')||name==='audio-map.json'||name==='manifest.json'){
      files=new Map([[name,bytes]]);
    }else throw Error('UNSUPPORTED_RELEASE_ASSET: '+name);
    for(const [file,content] of files){
      required(!entries.has(file),'INPUT_DUPLICATE_NAME: '+file);
      entries.set(file,content);
    }
  }
  return entries;
}
async function readExisting(release){
  if(!release)return null;
  required(release.immutable!==true,'RELEASE_IMMUTABLE');
  const asset=assetByName(release,'manifest.json');
  required(asset,'EXISTING_RELEASE_MISSING_MANIFEST');
  const bytes=await assetBytes(asset);
  return {raw:validateCatalog(JSON.parse(bytes.toString('utf8'))),bytes};
}
function assertWriteAllowed(){
  required(process.env.GITHUB_REF==='refs/heads/main','PUBLISH_REQUIRES_MAIN');
  required(process.env.GITHUB_EVENT_NAME==='workflow_dispatch','PUBLISH_REQUIRES_MANUAL_DISPATCH');
  required(process.env.AUDIO_PUBLISH_APPROVED==='YES','PUBLISH_NOT_APPROVED');
  required(process.env.GITHUB_REPOSITORY===REPO,'WRONG_REPOSITORY');
}
async function upload(release,name,bytes,mime='application/octet-stream'){
  const url='https://uploads.github.com/repos/'+REPO+'/releases/'+release.id+'/assets?name='+encodeURIComponent(name);
  const res=await fetch(url,{method:'POST',headers:{
    authorization:'Bearer '+TOKEN,accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28','content-type':mime,'content-length':String(bytes.length)
  },body:bytes});
  if(!res.ok)throw Error('UPLOAD_FAILED: '+name+' HTTP '+res.status+' '+(await res.text()).slice(0,220));
  const asset=await res.json();
  required(asset.size===bytes.length,'UPLOAD_SIZE_MISMATCH: '+name);
  return asset;
}
async function verifyUploaded(asset,bytes){
  const actual=await assetBytes(asset);
  required(hash(actual)===hash(bytes),'UPLOADED_SHA256_MISMATCH: '+asset.name);
}
async function deleteAsset(asset){
  if(asset)await api('/releases/assets/'+asset.id,{method:'DELETE'});
}
async function replaceManifest(release,oldAsset,newBytes,oldBytes){
  try{
    await deleteAsset(oldAsset);
    const published=await upload(release,'manifest.json',newBytes,'application/json');
    await verifyUploaded(published,newBytes);
  }catch(err){
    if(oldBytes){
      try{
        const latest=await api('/releases/'+release.id);
        await deleteAsset(assetByName(latest,'manifest.json'));
        const restored=await upload(release,'manifest.json',oldBytes,'application/json');
        await verifyUploaded(restored,oldBytes);
      }catch(restoreError){
        throw Error('MANIFEST_RESTORE_FAILED; manual intervention required: '+String(restoreError)+'; original error: '+err);
      }
    }
    throw err;
  }
}
function nextSnapshot(release,n){
  const name='manifest-r'+String(n).padStart(4,'0')+'.json';
  required(!assetByName(release,name),'SNAPSHOT_ALREADY_EXISTS: '+name);
  return name;
}
try{
  const all=await releases();
  let dest=all.find(r=>r.tag_name===TAG)||null;
  const previous=await readExisting(dest);
  if(mode==='rollback'){
    assertWriteAllowed();
    required(previous,'NO_EXISTING_CATALOG_TO_ROLLBACK');
    const revision=Number(process.env.ROLLBACK_REVISION||0);
    required(Number.isInteger(revision)&&revision>=1&&revision<previous.raw.revision,'INVALID_ROLLBACK_REVISION');
    const historical=assetByName(dest,'manifest-r'+String(revision).padStart(4,'0')+'.json');
    required(historical,'ROLLBACK_SNAPSHOT_NOT_FOUND');
    const historic=validateCatalog(JSON.parse((await assetBytes(historical)).toString('utf8')));
    const restored=validateCatalog({...historic,revision:previous.raw.revision+1});
    const bytes=Buffer.from(JSON.stringify(restored,null,2)+'\n');
    const snap=nextSnapshot(dest,restored.revision);
    const asset=await upload(dest,snap,bytes,'application/json');
    await verifyUploaded(asset,bytes);
    await replaceManifest(dest,assetByName(dest,'manifest.json'),bytes,previous.bytes);
    console.log(JSON.stringify({ok:true,mode,revision:restored.revision,restoredFrom:revision,clips:Object.keys(restored.clips).length}));
  }else{
    const sourceId=Number(process.env.SOURCE_RELEASE_ID||445512358);
    required(Number.isSafeInteger(sourceId)&&sourceId>0,'INVALID_SOURCE_RELEASE_ID');
    const source=await api('/releases/'+sourceId);
    const entries=await sourceEntries(source);
    const candidate=prepareCatalog(entries,previous?.raw||null);
    const manifestBytes=Buffer.from(candidate.text);
    await writeFile('audio-candidate-manifest.json',manifestBytes);
    await writeFile('audio-import-report.json',JSON.stringify({
      sourceReleaseId:sourceId,tag:TAG,revision:candidate.revision,addedTargets:candidate.added,
      newAssets:candidate.newFiles.size,sha256:hash(manifestBytes),mode
    },null,2)+'\n');
    console.log(JSON.stringify({mode,sourceReleaseId:sourceId,addedTargets:candidate.added,
      totalTargets:Object.keys(candidate.manifest.clips).length,revision:candidate.revision,
      newFiles:candidate.newFiles.size,manifestSha256:hash(manifestBytes)}));
    if(mode==='publish'){
      assertWriteAllowed();
      if(!dest){
        dest=await api('/releases',{method:'POST',data:{
          tag_name:TAG,name:'GMWW Shared Audio '+TAG,draft:true,prerelease:false,
          target_commitish:'main',body:'Shared content-addressed MP3 library. Manifest revisions are retained for rollback.'
        }});
      }
      for(const [name,bytes] of candidate.newFiles){
        const found=assetByName(dest,name);
        if(found){
          await verifyUploaded(found,bytes);
          continue;
        }
        const created=await upload(dest,name,bytes,'audio/mpeg');
        await verifyUploaded(created,bytes);
      }
      const snapshot=nextSnapshot(dest,candidate.revision);
      const snapAsset=await upload(dest,snapshot,manifestBytes,'application/json');
      await verifyUploaded(snapAsset,manifestBytes);
      await replaceManifest(dest,assetByName(dest,'manifest.json'),manifestBytes,previous?.bytes||null);
      if(dest.draft)dest=await api('/releases/'+dest.id,{method:'PATCH',data:{draft:false,prerelease:false}});
      console.log(JSON.stringify({ok:true,published:true,tag:TAG,revision:candidate.revision,release:dest.html_url}));
    }
  }
}catch(err){console.error('AUDIO_IMPORT_FAILED:',err.message);process.exitCode=1;}
finally{await rm(temp,{recursive:true,force:true});}
