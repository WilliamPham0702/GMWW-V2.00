// Character V4.17: REVIEW-ONLY bitmap rig; source files MUST be independently
// illustrated transparent layers. Full-body static masters are NEVER rig parts.
// No live Player Web, room scene, API or IPA imports.
import {skeletonPose,SKELETON_DIRECTIONS,SKELETON_ACTIONS} from './skeleton-rig.mjs';
import {skinBinding,V414_CHARACTERS,V414_LAYERS,drawV414Skin} from './skin-v414.mjs';
import {parseFilename} from './artwork-intake-v416.mjs';

export const V417_VERSION='4.17-independent-layer-preview';
export const V417_LAYERS=V414_LAYERS;
export const V417_ACTIONS=SKELETON_ACTIONS;
export const V417_DIRECTIONS=SKELETON_DIRECTIONS;
const RENDER_ORDER=Object.freeze([
 'hair_back','thigh_left','shin_left','foot_left',
 'thigh_right','shin_right','foot_right','upper_arm_left','forearm_left',
 'pelvis','torso','head','hair_front','upper_arm_right','forearm_right',
 'hand_left','hand_right'
]);
const K=(id,d,layer)=>id+'/'+d+'/'+layer;
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function layerFilename(characterId,direction,layerName){
 if(!V414_CHARACTERS.includes(characterId)||!SKELETON_DIRECTIONS.includes(direction)||!V414_LAYERS.includes(layerName))
  throw Error('INVALID_LAYER_NAME');
 return characterId+'_'+direction+'_'+layerName+'.png';
}
export function inspectLayerFileName(filename){
 const meta=parseFilename(filename);
 if(!meta||!meta.layer)throw Error('NOT_A_RIG_LAYER');
 return meta;
}
export function rigCoverage(assets,characterId,direction){
 if(!V414_CHARACTERS.includes(characterId)||!SKELETON_DIRECTIONS.includes(direction))throw Error('INVALID_RIG_SELECTION');
 const keys=assets instanceof Map?assets:new Map(assets);
 const missing=V414_LAYERS.filter(layer=>!keys.has(K(characterId,direction,layer)));
 const present=V414_LAYERS.length-missing.length;
 return Object.freeze({characterId,direction,present,total:17,complete:present===17,missing});
}
export function allRigCoverage(assets){
 return V414_CHARACTERS.flatMap(id=>SKELETON_DIRECTIONS.map(d=>rigCoverage(assets,id,d)));
}
export function layerTransform(neutralPose,livePose,characterId,layer){
 if(!V414_LAYERS.includes(layer))throw Error('INVALID_LAYER_NAME');
 const base=skinBinding(neutralPose,characterId),live=skinBinding(livePose,characterId);
 if(base.direction!==live.direction)throw Error('RIG_DIRECTION_MISMATCH');
 const q=base.parts[layer],p=live.parts[layer];
 if(!Array.isArray(q)||!q.every(finite)||!Array.isArray(p)||!p.every(finite)||q.length!==p.length)
  throw Error('INVALID_RIG_JOINTS');
 const angle=a=>Math.atan2(a[1].y-a[0].y,a[1].x-a[0].x);
 const length=a=>Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y);
 // Body layers rotate around their approved anatomical pivot. Hair and head
 // translate but NEVER tilt. All 4 views use distinct source images.
 const turn=q.length===2 && layer!=='head' ? angle(p)-angle(q) : 0;
 const ratio=q.length===2?length(p)/Math.max(.001,length(q)):1;
 const scale=Math.max(.75,Math.min(1.25,ratio));
 return Object.freeze({from:{x:q[0].x,y:q[0].y},to:{x:p[0].x,y:p[0].y},
  angle:Number.isFinite(turn)?turn:0,scale:Number.isFinite(scale)?scale:1,headTiltDeg:0});
}
export function drawLayeredSkin(ctx,pose,assets,{characterId='character-01',width=260,height=416,showAnchors=false}={}){
 if(!ctx||typeof ctx.save!=='function')throw Error('SKIN_CANVAS_REQUIRED');
 const coverage=rigCoverage(assets,characterId,pose?.direction);
 if(!coverage.complete)throw Error('INCOMPLETE_SKIN');
 if(!(width>0&&height>0))throw Error('INVALID_CANVAS_SIZE');
 const neutral=skeletonPose({action:'idle',direction:pose.direction,elapsedMs:0});
 ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/100,height/160);
 for(const layer of RENDER_ORDER){
  const asset=assets.get(K(characterId,pose.direction,layer));
  if(!asset?.image||!asset?.frame)throw Error('INVALID_LAYER_IMAGE');
  const f=asset.frame;
  if(!Number.isFinite(f.x)||!Number.isFinite(f.y)||!(f.w>0&&f.h>0))throw Error('INVALID_LAYER_FRAME');
  const t=layerTransform(neutral,pose,characterId,layer);
  ctx.save();ctx.translate(t.to.x,t.to.y);ctx.rotate(t.angle);ctx.scale(t.scale,t.scale);
  ctx.translate(-t.from.x,-t.from.y);
  ctx.drawImage(asset.image,f.x,f.y,f.w,f.h);
  ctx.restore();
 }
 if(showAnchors){
  for(const chain of [pose.leftArm,pose.rightArm,pose.leftLeg,pose.rightLeg])
   for(const p of chain){ctx.beginPath();ctx.arc(p.x,p.y,1.3,0,Math.PI*2);ctx.fillStyle='#fff49e';ctx.fill();}
 }
 ctx.restore();
 return {skinApplied:true,characterId,direction:pose.direction,layersDrawn:RENDER_ORDER.length,headTiltDeg:0,previewOnly:true};
}
export function drawReviewSkin(ctx,pose,assets,options={}){
 const id=options.characterId||'character-01';
 const coverage=rigCoverage(assets,id,pose.direction);
 if(coverage.complete)return {...drawLayeredSkin(ctx,pose,assets,options),mode:'independent-hd-layers'};
 return {...drawV414Skin(ctx,pose,options),mode:'v414-vector-fallback',missing:coverage.missing};
}
export function countUniqueImportedLayers(assets){
 return allRigCoverage(assets).reduce((n,c)=>n+c.present,0);
}
// Downsample once during import. A 1024x1536 (2:3) source master is
// letterboxed vertically to the existing 5:8 skeleton canvas, never silently
// stretched into an aspect ratio different from the artist's work.
export async function decodeLayerFile(file,{targetWidth=256,maxBytes=14_000_000}={}){
 const parsed=inspectLayerFileName(file?.name);
 if(!file||file.size>maxBytes||file.size<50)throw Error('INVALID_FILE_SIZE');
 if(!['image/png','image/webp'].includes(file.type))throw Error('NOT_PNG_OR_WEBP');
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')throw Error('BROWSER_CANVAS_REQUIRED');
 const source=await createImageBitmap(file);
 try{
  if(source.width<1024||source.height<1536)throw Error('RESOLUTION_TOO_SMALL');
  if(source.width>8192||source.height>8192)throw Error('RESOLUTION_TOO_LARGE');
  const ratio=source.width/source.height;
  if(Math.min(Math.abs(ratio-2/3),Math.abs(ratio-5/8))>.004)throw Error('RATIO_MISMATCH');
  const w=targetWidth,h=Math.round(w*1.6),canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;const g=canvas.getContext('2d',{willReadFrequently:true});
  if(!g)throw Error('CANVAS_UNAVAILABLE');
  const sourceHeight=ratio>0.64?Math.round(w/ratio):h;
  g.clearRect(0,0,w,h);g.drawImage(source,0,Math.round((h-sourceHeight)/2),w,sourceHeight);
  const pixels=g.getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>10){
   if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;
  }
  if(x1<x0||y1<y0)throw Error('EMPTY_TRANSPARENT_LAYER');
  // Reject the opaque rectangle failure mode: transparent art layers only.
  const corners=[pixels[3],pixels[(w-1)*4+3],pixels[((h-1)*w)*4+3],pixels[(h*w-1)*4+3]];
  if(corners.some(a=>a>32))throw Error('BACKGROUND_NOT_TRANSPARENT');
  x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(w-1,x1+2);y1=Math.min(h-1,y1+2);
  const width=x1-x0+1,height=y1-y0+1;
  const thumb=document.createElement('canvas');thumb.width=width;thumb.height=height;
  const tctx=thumb.getContext('2d');if(!tctx)throw Error('CANVAS_UNAVAILABLE');
  tctx.drawImage(canvas,x0,y0,width,height,0,0,width,height);
  const bitmap=await createImageBitmap(thumb);
  return {key:parsed.key,image:bitmap,characterId:parsed.id,direction:parsed.direction,layer:parsed.layer,
   frame:{x:x0*100/w,y:y0*160/h,w:width*100/w,h:height*160/h},
   decodedBytes:width*height*4};
 }finally{source.close?.();}
}
export function disposeLayerSet(assets){
 for(const asset of assets.values())asset.image?.close?.();
 assets.clear();
}
