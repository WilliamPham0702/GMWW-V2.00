// Build an immutable GitHub Release from a sanitized audio-only export.
// Usage: node scripts/audio/package-gmww-audio.mjs <safe-pack.json> <output-dir> [release-tag]
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const REPO='WilliamPham0702/GMWW-V2.00';
const TARGET=/^(cards|system|artifacts|actions):[A-Za-z0-9_.:-]{1,120}$/;
const RELEASE=/^gmww-audio-v[1-9]\d{0,3}$/;
const EXT={'audio/mpeg':'mp3','audio/mp4':'m4a','audio/ogg':'ogg','audio/wav':'wav'};
function mediaType(b){
 const s=(i,n)=>b.subarray(i,i+n).toString('ascii');
 if(s(0,3)==='ID3'||b[0]===255&&(b[1]&224)===224)return 'audio/mpeg';
 if(s(4,4)==='ftyp')return 'audio/mp4';
 if(s(0,4)==='OggS')return 'audio/ogg';
 if(s(0,4)==='RIFF'&&s(8,4)==='WAVE')return 'audio/wav';
 return '';
}
export function packageGmwwAudioPack(pack,{tag='gmww-audio-v1'}={}){
 if(!RELEASE.test(tag))throw Error('INVALID_RELEASE_TAG');
 if(pack?.format!=='gmww-audio-pack-v1'||!Array.isArray(pack.clips)||!pack.clips.length||pack.clips.length>300)throw Error('INVALID_PACK');
 const clips={},files=new Map(),targets=new Set();
 for(const x of pack.clips){
  const target=String(x?.target||'');
  if(!TARGET.test(target)||targets.has(target))throw Error('INVALID_OR_DUPLICATE_TARGET:'+target);
  targets.add(target);
  if(typeof x.base64!=='string'||x.base64.length>2796208||!/^[A-Za-z0-9+/]*={0,2}$/.test(x.base64))throw Error('INVALID_BASE64:'+target);
  const bytes=Buffer.from(x.base64,'base64');
  if(!bytes.length||bytes.length>2*1024*1024||bytes.toString('base64')!==x.base64)throw Error('INVALID_BYTES:'+target);
  const mime=mediaType(bytes);
  if(!mime||mime!==x.mime||bytes.length!==x.size)throw Error('AUDIO_MISMATCH:'+target);
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const name=sha256+'.'+EXT[mime],url='https://github.com/'+REPO+'/releases/download/'+tag+'/'+name;
  const previous=files.get(name);
  if(previous&&!previous.equals(bytes))throw Error('HASH_COLLISION');
  files.set(name,bytes);
  clips[target]={sha256,mime,size:bytes.length,file:name,url};
 }
 return {manifest:{format:'gmww-shared-audio-v1',version:1,releaseTag:tag,clips},files};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [,,input,out,tag='gmww-audio-v1']=process.argv;
 if(!input||!out)throw Error('Usage: node scripts/audio/package-gmww-audio.mjs <pack.json> <out> [gmww-audio-vN]');
 const {manifest,files}=packageGmwwAudioPack(JSON.parse(readFileSync(input,'utf8')),{tag});
 mkdirSync(out,{recursive:true});
 for(const [name,bytes]of files)writeFileSync(join(out,name),bytes,{flag:'wx'});
 writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 process.stdout.write('SHA-256 verified: '+Object.keys(manifest.clips).length+' targets, '+files.size+' unique files.\n');
}
