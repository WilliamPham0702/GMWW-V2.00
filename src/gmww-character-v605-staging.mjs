// Opt-in staging adapter for Character 21 V6.05. NEVER imported by live game until full release approval.
import approved from '../assets/characters/overhaul-v600/character-21-v605-accepted.json' with {type:'json'};
const DIRECTIONS=Object.freeze(['front','front-right','right','back-right','back','back-left','left','front-left']);
const MOTIONS=Object.freeze({idle:'Idle',stand:'Idle',walk:'Walk',walking:'Walk',run:'Run',running:'Run',result:'Result',celebrate:'Result'});
export const CHARACTER21_V605_STAGING=Object.freeze({
 characterId:approved.characterId,
 modelUrl:'/characters/overhaul-v600/character-21/skin.glb',
 version:'V6.05',rigJointCount:16,directionCount:8,clips:Object.freeze([...approved.actions]),
 approvedOnIphone:true,stagingOnly:true,productionEnabled:false
});
export function character21V605PreviewAsset(characterId,{enableStaging=false}={}){
 if(!enableStaging||characterId!==approved.characterId)return null;
 return CHARACTER21_V605_STAGING;
}
export function character21V605Motion(action='idle',direction='front'){
 const i=DIRECTIONS.indexOf(direction);
 return {characterId:approved.characterId,clip:MOTIONS[String(action||'').toLowerCase()]||'Idle',direction:i<0?'front':direction,directionIndex:Math.max(0,i),stagingOnly:true};
}
export function character21V605DirectionRange(gltf,direction='front'){
 const i=typeof direction==='number'?direction:DIRECTIONS.indexOf(direction);
 if(!Number.isInteger(i)||i<0||i>=8)throw Error('INVALID_CHARACTER_DIRECTION');
 const ranges=gltf?.meshes?.[0]?.extras?.directionalPrimitiveIndexRanges;
 const r=ranges?.[i];
 if(!r||r.direction!==i||r.indexCount<=0||r.firstIndex<0)throw Error('MISSING_APPROVED_DIRECTION_RANGE');
 return {firstIndex:r.firstIndex,indexCount:r.indexCount};
}
