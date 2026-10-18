// Character 22: staging candidate verifier. A verified candidate is NOT an owner-accepted skin.
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {JOINTS,CLIPS,parseGlb} from './vendor-character21-v605.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const DIRECTIONS=Object.freeze(['front','front-right','right','back-right','back','back-left','left','front-left']);
const root='assets/characters/overhaul-v600/';
async function exists(path){try{await access(path);return true}catch{return false}}
export async function verifyCharacter22Candidate(){
 const base=root+'character-22/';
 const file=base+'skin.glb',review=base+'rig-staging-review.json';
 const hasFile=await exists(file),hasReview=await exists(review);
 if(!hasFile&&!hasReview)return {status:'PORTRAIT_ONLY',readyForStaging:false};
 if(!hasFile||!hasReview)throw Error('CHAR22_PARTIAL_CANDIDATE');
 const raw=await readFile(file), config=JSON.parse(await readFile(review,'utf8'));
 if(raw.toString('ascii',0,4)!=='glTF'||raw.readUInt32LE(4)!==2||raw.readUInt32LE(8)!==raw.length)throw Error('CHAR22_BAD_GLB');
 if(config.characterId!=='character-22'||config.stagingOnly!==true||config.productionEnabled!==false||config.mainEnabled!==false)throw Error('CHAR22_ISOLATION_REQUIRED');
 if(config.sha256!==sha(raw))throw Error('CHAR22_MODEL_HASH_MISMATCH');
 const original=await readFile(root+'character-21/skin.glb');
 if(sha(original)===sha(raw))throw Error('CHAR22_COPIED_CHARACTER21_GLB');
 const {json,bin}=parseGlb(raw);
 if(!bin?.length||!json.meshes?.length||!json.skins?.length)throw Error('CHAR22_EMPTY_SKIN');
 const bones=json.skins[0].joints.map(i=>json.nodes?.[i]?.name);
 if(JSON.stringify(bones)!==JSON.stringify(JOINTS))throw Error('CHAR22_BAD_16_BONES');
 for(const name of CLIPS){
  const clip=json.animations?.find(a=>a.name===name);
  if(!clip?.channels?.length||!clip?.samplers?.length)throw Error('CHAR22_MISSING_ANIMATION_'+name);
 }
 const prim=json.meshes[0].primitives?.[0];
 if(!prim?.attributes||['POSITION','TEXCOORD_0','JOINTS_0','WEIGHTS_0'].some(k=>prim.attributes[k]===undefined))throw Error('CHAR22_UNSKINNED_MESH');
 const ranges=json.meshes[0].extras?.directionalPrimitiveIndexRanges;
 if(!Array.isArray(ranges)||ranges.length!==8||ranges.some((x,i)=>x.direction!==i||x.indexCount<=0))throw Error('CHAR22_MISSING_EIGHT_DIRECTION_GEOMETRY');
 if(!Array.isArray(config.directionArtwork)||config.directionArtwork.length!==8)throw Error('CHAR22_MISSING_ART_REFERENCES');
 const seen=new Set();
 for(let i=0;i<8;i++){
  const d=config.directionArtwork[i];
  if(d.direction!==DIRECTIONS[i]||!/^([a-f0-9]{64})$/.test(d.sha256))throw Error('CHAR22_INVALID_ART_REFERENCE_'+i);
  if(!/^(front|front-right|right|back-right|back|back-left|left|front-left)\.(png|webp)$/.test(d.filename))throw Error('CHAR22_INVALID_ART_FILENAME_'+i);
  const p=base+'direction-art/'+d.filename, data=await readFile(p);
  if(sha(data)!==d.sha256||data.length<1000)throw Error('CHAR22_BAD_DIRECTION_ART_'+i);
  if(seen.has(d.sha256))throw Error('CHAR22_DUPLICATE_DIRECTION_ART_'+i);
  seen.add(d.sha256);
 }
 if(config.rigJointCount!==16||JSON.stringify(config.actions)!==JSON.stringify(CLIPS)||JSON.stringify(config.directions)!==JSON.stringify(DIRECTIONS))throw Error('CHAR22_BAD_RIG_METADATA');
 if(config.ownerAcceptedOnIphone===true)throw Error('CHAR22_STAGING_CANDIDATE_CANNOT_SELF_CERTIFY_ACCEPTANCE');
 return {status:'STAGING_RIG_CANDIDATE',readyForStaging:true,sha256:sha(raw),directions:8,clips:4,joints:16,ownerAccepted:false,productionEnabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 verifyCharacter22Candidate().then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(e);process.exitCode=1});
}
