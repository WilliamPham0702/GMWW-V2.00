import * as THREE from './vendor/three.module.min.js';
import {buildHybridGeometry} from './skin-v570-combined-final.mjs';
function owner(x,y,index){
 const dx=x-.5,left=dx<0,back=index>=3&&index<=5,swap=back?!left:left;
 if(y<.37)return 3;
 if(y>.88)return swap?12:15;
 if(y>.80)return swap?11:14;
 if(y>.73&&Math.abs(dx)<.22)return swap?10:13;
 if(y>.565&&Math.abs(dx)<.20)return swap?10:13;
 if(Math.abs(dx)<.18)return 2;
 if(y>.68)return 2; // trailing coat/ribbons, chest-bound layer
 if(y<.535)return swap?4:7;
 if(y<.59)return swap?5:8;
 return swap?6:9;
}
function gridParts(texture,index){
 const image=texture?.userData?.pixels;if(!image)return buildHybridGeometry().layers.map(p=>{
 const pos=p.geometry.getAttribute('position'),weights=p.geometry.getAttribute('skinWeight');for(let i=0;i<pos.count;i++){pos.setZ(i,.35);weights.setXYZW(i,1,0,0,0);}return p;
 });
 const {width:w,height:h,data}=image,byBone=new Map(),step=4;
 const point=(x,y,z)=>[(x/w-.5)*2.932,(1-y/h)*3.888,z];
 for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
 const x1=Math.min(w,x+step),y1=Math.min(h,y+step),cx=Math.min(w-1,Math.floor((x+x1)/2)),cy=Math.min(h-1,Math.floor((y+y1)/2));
 if(data[(cy*w+cx)*4+3]<12)continue;
 const bone=owner(cx/w,cy/h,index),z=bone===3?.52:bone===2?.31:bone>=10?.33:.38;
 let p=byBone.get(bone);if(!p){p={pos:[],uv:[],ids:[],weights:[],name:'direction-'+index+'-bone-'+bone};byBone.set(bone,p);}
 for(const [px,py] of [[x,y1],[x1,y1],[x,y],[x1,y1],[x1,y],[x,y]]){
 p.pos.push(...point(px,py,z));p.uv.push(px/w,1-py/h);p.ids.push(bone,0,0,0);p.weights.push(1,0,0,0);
 }
 }
 return [...byBone.values()].map(p=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(p.uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(p.ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(p.weights,4));g.computeVertexNormals();return {name:p.name,geometry:g};});
}
export function mountLayeredEight(rig,textures){
 if(textures.length!==8)throw Error('EIGHT_DIRECTION_TEXTURES_REQUIRED');
 const directionSets=[],meshes=[],uniform={value:0};
 for(let index=0;index<8;index++){
 const set=[];
 for(const part of gridParts(textures[index],index)){
 const material=new THREE.MeshBasicMaterial({map:textures[index],side:THREE.DoubleSide,alphaTest:.12});
 material.onBeforeCompile=shader=>{shader.uniforms.uLayerSide=uniform;shader.vertexShader='uniform float uLayerSide;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\ntransformed.x += (transformed.z-position.z)*uLayerSide;\ntransformed.z = position.z;');};
 material.customProgramCacheKey=()=> 'gmww-layered-eight-573';
 const mesh=new THREE.SkinnedMesh(part.geometry,material);mesh.name=part.name;mesh.skeleton=rig.mesh.skeleton;mesh.bindMode='detached';mesh.bindMatrix.copy(rig.mesh.bindMatrix);mesh.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);mesh.frustumCulled=false;mesh.visible=index===0;
 rig.root.add(mesh);meshes.push(mesh);set.push(mesh);
 }directionSets.push(set);
 }
 rig.mesh.visible=false;
 const skin={mode:1,layers:meshes,base:[],meshes,directionSets,directionIndex:0,sideBackReference:'inferred',productionSkin:false,
 update(yaw){const index=((Math.round(yaw/(Math.PI/4))%8)+8)%8;skin.directionIndex=index;directionSets.forEach((set,i)=>set.forEach(m=>m.visible=i===index));uniform.value=Math.sin(yaw);
 // True 2.5D: choose view-specific articulated artwork rather than rotate front cutouts edge-on.
 rig.root.rotation.y=0;
 },wireframe(on){for(const m of meshes)m.material.wireframe=on;}};
 return skin;
}
