#!/usr/bin/env node
// Character V6.00 asset admission gate. Read-only; never deletes old assets or releases Production.
// Usage: node tools/check-character-overhaul-v600.mjs [--expect-blocked|--strict]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import manifest from '../assets/characters/overhaul-v600/manifest.json' with {type:'json'};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bones=['root','hips','chest','head','shoulderL','elbowL','handL','shoulderR','elbowR','handR','thighL','kneeL','footL','thighR','kneeR','footR'];
export function inspectGlb(buf){
 const errors=[];
 if(buf.length<80||buf.toString('ascii',0,4)!=='glTF'||buf.readUInt32LE(4)!==2){return ['INVALID_GLB_2_HEADER']}
 if(buf.readUInt32LE(8)!==buf.length)errors.push('INVALID_GLB_LENGTH');
 if(buf.toString('ascii',16,20)!=='JSON')return [...errors,'NO_GLB_JSON_CHUNK'];
 let gltf;
 try{gltf=JSON.parse(buf.toString('utf8',20,20+buf.readUInt32LE(12)))}catch{return [...errors,'INVALID_GLB_JSON']}
 if(!Array.isArray(gltf.skins)||gltf.skins.length<1)errors.push('SKIN_MISSING');
 const nodes=gltf.nodes||[],skin=gltf.skins?.[0],joints=skin?.joints||[];
 if(joints.length!==16)errors.push('EXPECTED_16_BONES');
 else if(bones.some((n,i)=>nodes[joints[i]]?.name!==n))errors.push('BONE_NAMES_ORDER_MISMATCH');
 const skinned=(gltf.meshes||[]).some(mesh=>(mesh.primitives||[]).some(p=>p.attributes?.POSITION!==undefined&&p.attributes?.TEXCOORD_0!==undefined&&p.attributes?.JOINTS_0!==undefined&&p.attributes?.WEIGHTS_0!==undefined&&p.material!==undefined));
 if(!skinned)errors.push('SKINNED_UV_TEXTURED_MESH_MISSING');
 if(!(gltf.images?.length>0&&gltf.textures?.length>0))errors.push('TEXTURE_NOT_EMBEDDED');
 const animationNames=new Set((gltf.animations||[]).map(a=>a.name));
 for(const motion of ['Idle','Walk','Run','Result'])if(!animationNames.has(motion))errors.push('MISSING_CLIP_'+motion.toUpperCase());
 for(const clip of (gltf.animations||[])){
   if(!Array.isArray(clip.channels)||!clip.channels.length||!Array.isArray(clip.samplers)||!clip.samplers.length)errors.push('EMPTY_ANIMATION_CLIP');
 }
 return errors;
}
export function inspectWebp(buf){
 if(buf.length<100||buf.toString('ascii',0,4)!=='RIFF'||buf.toString('ascii',8,12)!=='WEBP')return ['INVALID_WEBP'];
 const kind=buf.toString('ascii',12,16);
 let w=0,h=0;
 if(kind==='VP8X'&&buf.length>30){w=1+buf.readUIntLE(24,3);h=1+buf.readUIntLE(27,3)}
 else if(kind==='VP8L'&&buf.length>25){const b0=buf[21],b1=buf[22],b2=buf[23],b3=buf[24];w=1+(((b1&63)<<8)|b0);h=1+(((b3&15)<<10)|(b2<<2)|((b1&192)>>6))}
 else if(kind==='VP8 '&&buf.length>30){w=buf.readUInt16LE(26)&0x3fff;h=buf.readUInt16LE(28)&0x3fff}
 return w>=384&&h>=384?[]:['AVATAR_UNDER_384PX_OR_UNREADABLE'];
}
function inspectPng(buf){
 if(buf.length<100||!buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['INVALID_PNG'];
 const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);
 return w>=800&&h>=800?[]:['ARTWORK_UNDER_800PX'];
}
export function auditAssets({assetsRoot=path.join(root,'assets'),records=manifest.characters}={}){
 const missing=[],invalid=[],shaSeen=new Map(),accepted=[];
 for(const row of records){
  for(const [kind,key,parser] of [['artwork','artworkPath',inspectPng],['avatar','avatarPath',inspectWebp],['skin','skinPath',inspectGlb]]){
   const relative=String(row[key]||'').replace(/^[/]+/,'');
   if(!relative.startsWith('characters/overhaul-v600/'+row.id+'/')){invalid.push({id:row.id,kind,error:'UNTRUSTED_PATH'});continue}
   const file=path.join(assetsRoot,relative);
   if(!fs.existsSync(file)){missing.push({id:row.id,kind,file:relative});continue}
   const buf=fs.readFileSync(file),digest=createHash('sha256').update(buf).digest('hex');
   for(const error of parser(buf))invalid.push({id:row.id,kind,error});
   const old=shaSeen.get(kind+':'+digest);
   if(old)invalid.push({id:row.id,kind,error:'DUPLICATE_ASSET_WITH_'+old});
   shaSeen.set(kind+':'+digest,row.id);
   accepted.push({id:row.id,kind,bytes:buf.length,sha256:digest});
  }
 }
 return {ready:records.length===30&&missing.length===0&&invalid.length===0&&manifest.readyForMain===true,
    target:records.length*3,accepted:accepted.length,missing,invalid,
    explicitOwnerApprovalRequired:true,gameMainUnchanged:true};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const report=auditAssets(),blocked=process.argv.includes('--expect-blocked');
 console.log(JSON.stringify({...report,missing:report.missing.slice(0,12)},null,2));
 if(blocked){if(report.ready)process.exitCode=1}
 else if(!report.ready)process.exitCode=1;
}
