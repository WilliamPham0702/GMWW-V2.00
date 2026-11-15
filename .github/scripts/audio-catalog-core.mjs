import { createHash } from 'node:crypto';
export const TAG='gmww-audio-v1';
export const BASE='https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/'+TAG+'/';
export const MAX_CLIP=2*1024*1024;
export const MAX_CLIPS=300;
const TARGET=/^(cards|system|artifacts|actions):[A-Za-z0-9_.:-]{1,120}$/;
const SHA=/^[a-f0-9]{64}$/;
const SAFE=/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./-]{1,180}$/;

export function validPath(p){return typeof p==='string'&&SAFE.test(p)&&!p.includes('//')&&!p.includes('\\')&&!p.startsWith('./');}
export function hash(bytes){return createHash('sha256').update(bytes).digest('hex');}
export function looksMp3(bytes){return bytes.length>=4&&((bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)||((bytes[0]===0xff)&&((bytes[1]&0xe0)===0xe0)));}
export function inferredTarget(name){
  const basename=name.split('/').pop();
  const m=/^(cards|system|artifacts|actions)__(.+)\.mp3$/i.exec(basename);
  return m&&TARGET.test(m[1].toLowerCase()+':'+m[2])?m[1].toLowerCase()+':'+m[2]:null;
}
export function validateCatalog(raw){
  if(!raw||raw.format!=='gmww-shared-audio-v1'||raw.version!==1||raw.releaseTag!==TAG||
    !raw.clips||typeof raw.clips!=='object'||Array.isArray(raw.clips))throw Error('INVALID_CATALOG');
  if(!Number.isInteger(raw.revision||1)||(raw.revision||1)<1)throw Error('INVALID_REVISION');
  const pairs=Object.entries(raw.clips);
  if(pairs.length>MAX_CLIPS)throw Error('TOO_MANY_CLIPS');
  for(const [target,clip] of pairs){
    if(!TARGET.test(target)||!clip||!SHA.test(clip.sha256)||!Number.isInteger(clip.size)||
      clip.size<4||clip.size>MAX_CLIP||clip.mime!=='audio/mpeg'||
      clip.file!==clip.sha256+'.mp3'||clip.url!==BASE+clip.file)throw Error('INVALID_CLIP: '+target);
  }
  return raw;
}
export function getMapping(entries){
  const files=new Map(entries);
  const maps=['audio-map.json','manifest.json'].filter(n=>files.has(n));
  if(maps.length>1)throw Error('MULTIPLE_MAPPINGS');
  const mapping={};
  if(maps.length){
    let src;try{src=JSON.parse(files.get(maps[0]).toString('utf8'));}catch{throw Error('INVALID_AUDIO_MAPPING_JSON');}
    if(!src||!src.clips||typeof src.clips!=='object'||Array.isArray(src.clips))throw Error('INVALID_AUDIO_MAPPING');
    for(const [target,row] of Object.entries(src.clips)){
      if(!TARGET.test(target))throw Error('INVALID_TARGET: '+target);
      const file=typeof row==='string'?row:row?.file;
      if(!validPath(file)||!file.endsWith('.mp3'))throw Error('UNSAFE_AUDIO_MAPPING: '+target);
      if(!files.has(file))throw Error('MISSING_AUDIO_FILE: '+file);
      mapping[target]={file,sha256:typeof row==='object'?row.sha256:undefined};
    }
  }else{
    for(const [file] of files){
      if(!file.endsWith('.mp3'))continue;
      const target=inferredTarget(file);
      if(!target||mapping[target])throw Error('EXPLICIT_MAPPING_REQUIRED: '+file);
      mapping[target]={file};
    }
  }
  if(Object.keys(mapping).length===0)throw Error('NO_MAPPED_AUDIO');
  const referenced=new Set(Object.values(mapping).map(x=>x.file));
  for(const [name] of files)if(name.endsWith('.mp3')&&!referenced.has(name))throw Error('UNMAPPED_AUDIO: '+name);
  return mapping;
}
export function prepareCatalog(entries,previous=null){
  const files=new Map(entries);
  if(files.size>MAX_CLIPS+10)throw Error('TOO_MANY_INPUT_FILES');
  for(const [name,bytes] of files){
    if(!validPath(name)||!(bytes instanceof Uint8Array))throw Error('INVALID_INPUT_FILE: '+name);
    if(bytes.length>MAX_CLIP&&name.endsWith('.mp3'))throw Error('CLIP_TOO_LARGE: '+name);
    if(!name.endsWith('.mp3')&&!['audio-map.json','manifest.json','SHA256SUMS','README.txt'].includes(name))throw Error('UNEXPECTED_INPUT_FILE: '+name);
  }
  const previousCatalog=previous?validateCatalog(previous):null;
  const mapping=getMapping(files);
  const clips={...(previousCatalog?.clips||{})}, newFiles=new Map();
  let added=0;
  for(const [target,row] of Object.entries(mapping)){
    const bytes=files.get(row.file);
    if(bytes.length<4||bytes.length>MAX_CLIP||!looksMp3(bytes))throw Error('INVALID_MP3: '+row.file);
    const sha256=hash(bytes);
    if(row.sha256!==undefined&&row.sha256!==sha256)throw Error('SOURCE_SHA_MISMATCH: '+target);
    const file=sha256+'.mp3';
    const clip={sha256,mime:'audio/mpeg',size:bytes.length,file,url:BASE+file};
    if(clips[target]){
      if(JSON.stringify(clips[target])!==JSON.stringify(clip))throw Error('EXISTING_TARGET_IMMUTABLE: '+target);
      continue;
    }
    clips[target]=clip;newFiles.set(file,Buffer.from(bytes));added++;
  }
  if(!added)throw Error('NO_NEW_TARGETS');
  if(Object.keys(clips).length>MAX_CLIPS)throw Error('CATALOG_LIMIT');
  const revision=previousCatalog?(previousCatalog.revision||1)+1:1;
  const sorted=Object.fromEntries(Object.entries(clips).sort(([a],[b])=>a.localeCompare(b,'en')));
  const manifest=validateCatalog({format:'gmww-shared-audio-v1',version:1,revision,releaseTag:TAG,clips:sorted});
  const text=JSON.stringify(manifest,null,2)+'\n';
  return {manifest,text,newFiles,added,revision};
}
