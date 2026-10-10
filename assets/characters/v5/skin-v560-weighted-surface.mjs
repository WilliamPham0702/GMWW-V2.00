// GMWW Character V5.60 — isolated 3D skinning construction test.
// The reference Unity IPA contains playerskins/playerskinsui bundles, NOT a reusable GMWW skin.
// This module creates actual UV-mapped, weighted 3D geometry; never cuts a full-body PNG
// into moving 2D cards. The current original V4.17 high-resolution artwork is NOT a UV atlas.
// Do not enable this technical fallback as approved production artwork.
import * as THREE from './vendor/three.module.min.js';
export const V560_SKIN_VERSION='5.60-weighted-garment-prototype';
export const V560_REFERENCE_KIND='Unity reference pipeline / independently modeled GMWW geometry';
const chest=2,hips=1;
function fabricTexture(){
 const cv=document.createElement('canvas');cv.width=512;cv.height=512;
 const ctx=cv.getContext('2d');
 const bg=ctx.createLinearGradient(0,0,512,512);
 bg.addColorStop(0,'#0067a4');bg.addColorStop(.55,'#0783c5');bg.addColorStop(1,'#063c83');
 ctx.fillStyle=bg;ctx.fillRect(0,0,512,512);
 // Floral motifs are a clearly-marked temporary procedural FABRIC study, NOT
 // the original image itself. Replace with an artist-built original UV atlas.
 for(let k=0;k<18;k++){
  const x=((k*139+47)%534)-10,y=((k*211+81)%534)-10,r=15+(k%4)*5;
  ctx.save();ctx.translate(x,y);ctx.rotate(k*.58);
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5;
   ctx.save();ctx.rotate(a);
   ctx.beginPath();ctx.ellipse(0,-r*.67,r*.35,r*.8,0,0,Math.PI*2);
   ctx.fillStyle=k%3===0?'#ffe6a0':'#f2fcff';ctx.fill();
   ctx.strokeStyle='#b0d7fa';ctx.lineWidth=1.1;ctx.stroke();ctx.restore();
  }
  ctx.beginPath();ctx.arc(0,0,r*.20,0,Math.PI*2);
  ctx.fillStyle='#facf64';ctx.fill();ctx.restore();
 }
 const t=new THREE.CanvasTexture(cv);
 t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;
 t.anisotropy=4;
 return t;
}
function weightedGarmentGeometry(){
 // Real curved, open-front 3D shirt shell, 32 circumferential slices and 14 rows.
 // Natural shirt opening at +Z exposes existing chest; no sprites/rectangular cutouts.
 const g=new THREE.CylinderGeometry(.72,.625,1.08,40,14,true,.40,2*Math.PI-.80);
 g.scale(1,1,.76);g.translate(0,1.91,0);
 const pos=g.getAttribute('position'),ids=[],weights=[];
 let blends=0,mixed=0;
 for(let i=0;i<pos.count;i++){
  const y=pos.getY(i);
  const upper=Math.min(1,Math.max(0,(y-1.50)/.62));
  // Smoothly blend deformation between torso and pelvis; do not rigidly
  // assign the entire panel to one bone like the old cutout prototype.
  const w=upper*upper*(3-2*upper);
  ids.push(chest,hips,0,0);weights.push(w,1-w,0,0);
  blends++;
  if(w>.001&&w<.999)mixed++;
 }
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 g.computeVertexNormals();
 return {geometry:g,blendedVertices:mixed,vertices:blends};
}
function makeFlowerBoneAttachment(headBone){
 const bloom=new THREE.Group();bloom.name='flower-ornament-rigged-to-head';
 // Head follows the HEAD bone, never floats as a camera-facing PNG.
 bloom.position.set(.43,.88,.48);
 const ivory=new THREE.MeshStandardMaterial({color:'#fff9ec',roughness:.62,side:THREE.DoubleSide});
 const aqua=new THREE.MeshStandardMaterial({color:'#04aff1',roughness:.49});
 const gold=new THREE.MeshStandardMaterial({color:'#ffdc7c',roughness:.45,metalness:.23});
 const petal=new THREE.SphereGeometry(1,12,8);
 for(let i=0;i<5;i++){
  const a=2*Math.PI*i/5;
  const m=new THREE.Mesh(petal,i%2?ivory:aqua);
  m.position.set(.10*Math.cos(a),.10*Math.sin(a),.01);
  m.scale.set(.085,.117,.026);m.rotation.z=a-Math.PI/2;
  bloom.add(m);
 }
 const middle=new THREE.Mesh(new THREE.SphereGeometry(.058,12,8),gold);
 middle.position.z=.055;bloom.add(middle);
 headBone.add(bloom);
 return bloom;
}
export function addV560WeightedSkin(rig,{texture=null,debug=false}={}){
 if(!rig||!rig.mesh?.isSkinnedMesh||rig.bones?.length!==16)
  throw Error('V560_REQUIRES_V510_REAL_16_BONE_SKINNED_MESH');
 const {geometry,vertices,blendedVertices}=weightedGarmentGeometry();
 const map=texture||fabricTexture();
 const material=new THREE.MeshStandardMaterial({
  map,side:THREE.DoubleSide,roughness:.81,metalness:.015,transparent:false
 });
 const surface=new THREE.SkinnedMesh(geometry,material);
 surface.name='GMWW Chàng Biển — REAL WEIGHTED 3D UV SHIRT (TECH PREVIEW)';
 surface.frustumCulled=false;
 surface.bindMode='detached';
 // Reuse the exact same 16-bone skeleton & bind matrices as V5.10,
 // not a second skeleton that would drift relative to animations.
 surface.skeleton=rig.mesh.skeleton;
 surface.bindMatrix.copy(rig.mesh.bindMatrix);
 surface.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);
 rig.root.add(surface);
 const flower=makeFlowerBoneAttachment(rig.bones[3]);
 const result={
  version:V560_SKIN_VERSION,
  source:V560_REFERENCE_KIND,
  uvMapped:true,
  skinnedMesh:surface.isSkinnedMesh,
  rigShared:surface.skeleton===rig.mesh.skeleton,
  bones:surface.skeleton.bones.length,
  vertexCount:vertices,
  blendedVertices,
  originalV417UVAtlasReady:false,
  gameIntegrated:false,
  surface,flower
 };
 if(debug)surface.material.wireframe=true;
 rig.userDataSkinV560=result;
 return result;
}
export function removeV560WeightedSkin(rig){
 const s=rig.userDataSkinV560;
 if(!s)return;
 rig.root.remove(s.surface);
 rig.bones[3].remove(s.flower);
 s.surface.geometry.dispose();s.surface.material.dispose();
 if(s.surface.material.map)s.surface.material.map.dispose();
 rig.userDataSkinV560=null;
}
