import * as THREE from './vendor/three.module.min.js';
import {mountVolume360} from './skin-volume-360.mjs';
import {buildHybridGeometry,DIRECTION_CORRECTIONS} from './skin-v570-combined-final.mjs';
export const SAMPLE_NAMES=['2.5D cắt lớp','Mesh từng mảng + texture chuẩn','Full 3D base body','Hiệu chỉnh theo 8 hướng'];
export function mountSample(rig,texture,mode){
 if(![1,2,3,4].includes(mode))throw Error('INVALID_SAMPLE');
 if(mode===3)return mountVolume360(rig,texture);
 const data=buildHybridGeometry(),layers=[],base=[];
 const selected=mode===3?data.base:data.layers;
 for(const part of selected){
 const g=part.geometry,p=g.getAttribute('position'),w=g.getAttribute('skinWeight');
 if(mode===1){
 // Flat articulated layers: rigid joint assignment; no volumetric backing or mesh blending.
 for(let i=0;i<p.count;i++){p.setZ(i,part.part.name==='head'?.50:.36);w.setXYZW(i,1,0,0,0);}
 p.needsUpdate=true;w.needsUpdate=true;g.computeVertexNormals();
 }
 if(mode===4){
 // Directional surface study; independent angle profiles, no closed 3D base body.
 g.userData.rest=new Float32Array(p.array);g.userData.uvRest=new Float32Array(g.getAttribute('uv').array);
 }
 const mesh=new THREE.SkinnedMesh(g,new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.12}));
 mesh.name=part.name;mesh.skeleton=rig.mesh.skeleton;mesh.bindMode='detached';mesh.bindMatrix.copy(rig.mesh.bindMatrix);mesh.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);mesh.frustumCulled=false;
 rig.root.add(mesh);(mode===3?base:layers).push(mesh);
 }
 rig.mesh.visible=false;
 const skin={mode,layers,base,meshes:[...layers,...base],directionIndex:0,productionSkin:false,
 update(yaw){
 if(mode!==4)return;
 const index=((Math.round(yaw/(Math.PI/4))%8)+8)%8;skin.directionIndex=index;
 const correction=DIRECTION_CORRECTIONS[index],side=Math.sin(index*Math.PI/4),back=index>=3&&index<=5;
 for(const mesh of layers){
 const p=mesh.geometry.getAttribute('position'),rest=mesh.geometry.userData.rest,uv=mesh.geometry.getAttribute('uv'),uvRest=mesh.geometry.userData.uvRest;
 const head=mesh.name==='head',width=head?correction.head:1;
 for(let i=0;i<p.count;i++){
 const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
 // Explicit per-angle silhouette/depth offsets, applied to real articulated vertices.
 p.setXYZ(i,x*width+(head?.055:0)*side,y,z*correction.depth);
 if(back){const hair=head,cloth=mesh.name.includes('torso')||mesh.name.includes('sleeve')||mesh.name.includes('shorts')||mesh.name.includes('tail');
 const cx=hair?430:cloth?480:435,cy=hair?175:cloth?949:1154;
 uv.setXY(i,(cx+Math.sin(x*8)*25)/1086,1-(cy+Math.cos(y*8)*25)/1448);
 }else uv.setXY(i,uvRest[i*2],uvRest[i*2+1]);
 }
 p.needsUpdate=true;uv.needsUpdate=true;
 }
 },wireframe(on){for(const m of skin.meshes)m.material.wireframe=on;}};
 return skin;
}
