// GMWW Character V5.62 — real UV fabric sleeve meshes, not cut-up PNG sprites.
// The original V4.17 artwork is supplied by the SHA-verified V5.61 swatch.
// This is a *partial* garment test: the original complete 3D body Skin and UV atlas
// are not present; no live game/IPA integration is permitted.
import * as THREE from './vendor/three.module.min.js';
import {addV561OriginalArtSwatchToRig} from './skin-v561-original-art-uv.mjs';
export const V562_VERSION='5.62-original-v417-uv-shirt-and-articulated-sleeves';
const SIDE_BONES=Object.freeze({left:[4,5,-1],right:[7,8,1]});
export function createV562SleeveGeometry(side){
 const config=SIDE_BONES[side];
 if(!config)throw new Error('V562_INVALID_SLEEVE_SIDE');
 const [shoulderBone,elbowBone,direction]=config;
 // Curved 3D cloth circumference and length. Separate upper-arm cloth mesh,
 // not a 2D body-part cutout or image plane, sharing the shirt's original UV map.
 const g=new THREE.CylinderGeometry(.245,.220,.49,24,10,true);
 g.translate(direction*.60,2.09,.02);
 const pos=g.getAttribute('position'),ids=[],weights=[];
 let blendedVertices=0,elbowDrivenVertices=0;
 for(let i=0;i<pos.count;i++){
  const t=Math.max(0,Math.min(1,(pos.getY(i)-1.845)/.49));
  // At the shoulder: chest .13 / shoulder .87.
  // At the sleeve hem: chest .05 / shoulder .57 / elbow .38.
  // Adjacent rings share smooth joint deformation; no single rigid panel.
  const shoulder=.57+.30*t,elbow=.38*(1-t),chest=1-shoulder-elbow;
  ids.push(2,shoulderBone,elbowBone,0);
  weights.push(chest,shoulder,elbow,0);
  if(chest>.001 && shoulder>.001)blendedVertices++;
  if(elbow>.001)elbowDrivenVertices++;
 }
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 g.computeVertexNormals();
 return {geometry:g,vertexCount:pos.count,blendedVertices,elbowDrivenVertices,side};
}
export function addV562OriginalFabricSleevesToRig(rig,options={}){
 if(!rig?.mesh?.isSkinnedMesh||rig.bones?.length!==16)
  throw Error('V562_EXPECTS_REAL_V510_16_BONE_SKINNED_MESH');
 const shirt=addV561OriginalArtSwatchToRig(rig,options);
 const sleeves=['left','right'].map(side=>{
  const shape=createV562SleeveGeometry(side);
  // Both sleeves and the shirt use the exact same source texture and material;
  // no regenerated procedural textile or pasted rectangular character pieces.
  const surface=new THREE.SkinnedMesh(shape.geometry,shirt.surface.material);
  surface.name='GMWW V5.62 original floral UV 3D sleeve '+side;
  surface.frustumCulled=false;
  surface.bindMode='detached';
  surface.skeleton=rig.mesh.skeleton;
  surface.bindMatrix.copy(rig.mesh.bindMatrix);
  surface.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);
  rig.root.add(surface);
  return {...shape,surface};
 });
 const dispose=()=>{
  for(const sleeve of sleeves){
   rig.root.remove(sleeve.surface);
   sleeve.geometry.dispose();
  }
  // V5.61 remains the owner of the shared garment material and texture.
  // Do not dispose it while any garment mesh remains in the scene.
 };
 return {
  ...shirt,
  version:V562_VERSION,
  previewVersion:V562_VERSION,
  sleeves:sleeves.map(x=>x.surface),
  sleeveVertexCount:sleeves.reduce((n,s)=>n+s.vertexCount,0),
  sleeveBlendedVertices:sleeves.reduce((n,s)=>n+s.blendedVertices,0),
  sleeveElbowDrivenVertices:sleeves.reduce((n,s)=>n+s.elbowDrivenVertices,0),
  sleeveMeshesAreRealSkinned:sleeves.every(s=>s.surface.isSkinnedMesh),
  sameSkeletonAsV510:sleeves.every(s=>s.surface.skeleton===rig.mesh.skeleton),
  actualOriginalPixelsOnSleeves:true,
  originalV417UVAtlasReady:false,
  isOriginalCompleteSkin:false,
  gameIntegrated:false,
  disposeSleeves:dispose
 };
}
