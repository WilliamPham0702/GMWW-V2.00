// Character 21 V6.05 - SHA-pinned approved binary vendor for the isolated draft branch only.
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

export const APPROVED_PREVIEW_URL='https://gmww-character21-v605-preview.williampham0702.workers.dev/?v=605';
export const APPROVED_SOURCE_SHA256='0afe6ec92d6f3aa483234a148cca33603b97702fd528a0cd4dd81a087219b378';
export const ACCEPTED_CHARACTER_ID='character-21';
export const APPROVED_AVATAR_SHA256='b195b8f6090b8ca6e059f756ae604939ba3887ade7d6691d9b4b075a5658c801';
export const DEST='assets/characters/overhaul-v600/character-21/skin.glb';
export const JOINTS=Object.freeze(['root','hips','chest','head','shoulderL','elbowL','handL','shoulderR','elbowR','handR','thighL','kneeL','footL','thighR','kneeR','footR']);
export const CLIPS=Object.freeze(['Idle','Walk','Run','Result']);
export const sha256=buf=>createHash('sha256').update(buf).digest('hex');

export function extractGlbFromReviewHtml(html){
 const m=/const G='([A-Za-z0-9+/=]+)'/.exec(html);
 if(!m)throw Error('MISSING_V605_BASE64_GLB');
 const buf=Buffer.from(m[1],'base64');
 if(sha256(buf)!==APPROVED_SOURCE_SHA256)throw Error('APPROVED_GLB_SHA256_MISMATCH');
 return buf;
}
export function extractAvatarFromReviewHtml(html){
 const m=/const FALLBACK=\["data:image\/webp;base64,([A-Za-z0-9+/=]+)"/.exec(html);
 if(!m)throw Error('MISSING_APPROVED_FRONT_VIEW_AVATAR');
 const data=Buffer.from(m[1],'base64');
 if(sha256(data)!==APPROVED_AVATAR_SHA256)throw Error('APPROVED_AVATAR_SHA256_MISMATCH');
 if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WEBP')throw Error('INVALID_AVATAR_WEBP');
 return data;
}
export function parseGlb(glb){
 if(glb.length<28||glb.toString('ascii',0,4)!=='glTF'||glb.readUInt32LE(4)!==2||glb.readUInt32LE(8)!==glb.length)throw Error('INVALID_GLTF2_CONTAINER');
 let offset=12,json=null,bin=null;
 while(offset+8<=glb.length){
  const length=glb.readUInt32LE(offset),type=glb.toString('ascii',offset+4,offset+8);
  if(offset+8+length>glb.length)throw Error('INVALID_GLB_CHUNK');
  const data=glb.subarray(offset+8,offset+8+length);
  if(type==='JSON')json=JSON.parse(data.toString('utf8'));
  if(type==='BIN\0')bin=Buffer.from(data);
  offset+=8+length;
 }
 if(offset!==glb.length||!json||!bin)throw Error('MISSING_GLB_CHUNKS');
 return {json,bin};
}
export function validateCharacter21(doc){
 const actual=doc.skins?.[0]?.joints?.map(i=>doc.nodes?.[i]?.name)||[];
 if(JSON.stringify(actual)!==JSON.stringify(JOINTS))throw Error('JOINTS_NOT_V510_16');
 for(const name of CLIPS){
  const clip=doc.animations?.find(c=>c.name===name);
  if(!clip?.channels?.length||!clip?.samplers?.length)throw Error('MISSING_CLIP_'+name);
 }
 const ranges=doc.meshes?.[0]?.extras?.directionalPrimitiveIndexRanges;
 if(!Array.isArray(ranges)||ranges.length!==8||ranges.some((x,i)=>x.direction!==i||x.indexCount<=0))throw Error('INVALID_8_VIEW_MESH');
 const attrs=doc.meshes?.[0]?.primitives?.[0]?.attributes;
 if(!attrs||['POSITION','TEXCOORD_0','JOINTS_0','WEIGHTS_0'].some(k=>attrs[k]===undefined))throw Error('INVALID_SKIN_MESH');
 if(!doc.images?.length||!doc.textures?.length)throw Error('MISSING_TEXTURE_ATLAS');
 return {joints:16,directions:8,clips:[...CLIPS]};
}
export function retargetCharacter21(source){
 if(sha256(source)!==APPROVED_SOURCE_SHA256)throw Error('APPROVED_GLB_SHA256_MISMATCH');
 const {json:doc,bin}=parseGlb(source);
 const validation=validateCharacter21(doc);
 doc.nodes[0].name='GMWW_CHARACTER_21_V605_APPROVED';
 doc.nodes[0].extras={...doc.nodes[0].extras,gmwwSkin:{
  characterId:ACCEPTED_CHARACTER_ID,rig:'V5.10-16-BONE',version:'V6.05',
  artDirections:8,artReference:'V6.04-owner-approved',
  iphoneAcceptance:'user-confirmed-2026-10-18',
  releaseStatus:'STAGING_ONLY_NOT_MAIN_PRODUCTION',sourceGlbSHA256:APPROVED_SOURCE_SHA256
 }};
 doc.extras={...(doc.extras||{}),gmwwCharacterSkin:{
  characterId:ACCEPTED_CHARACTER_ID,version:'V6.05',sourceSha256:APPROVED_SOURCE_SHA256,
  meshType:'directional-2.5D',directionCount:8,rigJointCount:16,
  approvedOnIphone:true,approvedForMain:false,approvedForProduction:false
 }};
 const bytes=Buffer.from(JSON.stringify(doc));
 const padded=Buffer.concat([bytes,Buffer.alloc((4-bytes.length%4)%4,0x20)]);
 const header=Buffer.alloc(20);
 header.write('glTF',0,'ascii');header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+8+bin.length,8);
 header.writeUInt32LE(padded.length,12);header.write('JSON',16,'ascii');
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.write('BIN\0',4,'ascii');
 const output=Buffer.concat([header,padded,binHeader,bin]);
 validateCharacter21(parseGlb(output).json);
 if(sha256(parseGlb(output).bin)!==sha256(bin))throw Error('SKIN_MESH_ANIMATION_BINARY_CHANGED');
 return {output,validation,outputSHA256:sha256(output),binarySHA256:sha256(bin)};
}
async function main(){
 const res=await fetch(APPROVED_PREVIEW_URL,{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw Error('SOURCE_HTTP_'+res.status);
 const html=await res.text();
 const source=extractGlbFromReviewHtml(html), avatar=extractAvatarFromReviewHtml(html);
 const result=retargetCharacter21(source);
 const dest=resolve(process.cwd(),DEST);
 await mkdir(dirname(dest),{recursive:true});await writeFile(dest,result.output);
 const avatarPath=resolve(process.cwd(),'assets/characters/overhaul-v600/character-21/avatar.webp');
 await writeFile(avatarPath,avatar);
 console.log(JSON.stringify({file:DEST,bytes:result.output.length,...result.validation,sourceSHA256:APPROVED_SOURCE_SHA256,outputSHA256:result.outputSHA256,binarySHA256:result.binarySHA256,avatarBytes:avatar.length,avatarSHA256:APPROVED_AVATAR_SHA256,productionChanged:false},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){main().catch(e=>{console.error(e);process.exitCode=1})}
