// GMWW Character V5.10 — actual Three.js SkinnedMesh/Bone Master-01.
// Independent technical/premium-style model study; NEVER imported by live rooms or IPA.
// Shared GPU geometry across 30 instances; per-character 16-joint skeleton and one draw call.
// The model is procedural geometry, not a final hand-crafted, owner-approved GLB artwork.
import * as THREE from './vendor/three.module.min.js';

export const V510_RIG_VERSION='5.10-skinned-master01-review';
export const V510_BONES=Object.freeze([
 'root','hips','chest','head',
 'shoulderL','elbowL','handL','shoulderR','elbowR','handR',
 'thighL','kneeL','footL','thighR','kneeR','footR'
]);
const HEAD='#152d4a', HAIR_HIGHLIGHT='#315579', SKIN='#f1bc94', SHADE='#d88d71',
 EYE='#21354d', IRIS='#2b7597', WHITE='#fff9ed', SHIRT='#1884bb', LIGHT='#50c6d6',
 DARK='#0e5a89', SHORTS='#eee0c3', SEAM='#bbaa90', SANDAL='#1b5b79',
 GOLD='#f3cb6f', FLOWER='#fff4da', LEAF='#79d5b8';
const BONE_LAYOUT=[
 {n:'root',parent:-1,x:0,y:0,z:0},
 {n:'hips',parent:0,x:0,y:1.33,z:0},
 {n:'chest',parent:1,x:0,y:.59,z:0},
 {n:'head',parent:2,x:0,y:.75,z:0},
 {n:'shoulderL',parent:2,x:-.58,y:.29,z:0},
 {n:'elbowL',parent:4,x:-.02,y:-.41,z:0},
 {n:'handL',parent:5,x:-.015,y:-.32,z:0},
 {n:'shoulderR',parent:2,x:.58,y:.29,z:0},
 {n:'elbowR',parent:7,x:.02,y:-.41,z:0},
 {n:'handR',parent:8,x:.015,y:-.32,z:0},
 {n:'thighL',parent:1,x:-.27,y:-.22,z:0},
 {n:'kneeL',parent:10,x:0,y:-.47,z:0},
 {n:'footL',parent:11,x:0,y:-.47,z:.09},
 {n:'thighR',parent:1,x:.27,y:-.22,z:0},
 {n:'kneeR',parent:13,x:0,y:-.47,z:0},
 {n:'footR',parent:14,x:0,y:-.47,z:.09}
];
const cache=new Map();
const vertexMaterial=new THREE.MeshStandardMaterial({
 vertexColors:true,roughness:.83,metalness:.025,flatShading:false
});
const shadowMaterial=new THREE.MeshBasicMaterial({
 color:'#175463',transparent:true,opacity:.16,depthWrite:false
});
const shadowGeo=new THREE.CircleGeometry(1,18);
function createBones(){
 const bones=BONE_LAYOUT.map(x=>{
  const b=new THREE.Bone();b.name=x.n;b.position.set(x.x,x.y,x.z);return b;
 });
 BONE_LAYOUT.forEach((b,i)=>{if(b.parent>=0)bones[b.parent].add(bones[i]);});
 bones[0].updateMatrixWorld(true);
 return bones;
}
export function boneIndex(name){
 const i=V510_BONES.indexOf(name);
 if(i<0)throw new Error('INVALID_V510_BONE');
 return i;
}
function buildModelGeometry(highDetail){
 // Bind-pose geometry is merged into ONE indexed SkinnedMesh with per-vertex color.
 // Rigid bone weights on overlapping pieces intentionally avoid joint tearing.
 const bones=createBones(),origin=bones.map(b=>b.getWorldPosition(new THREE.Vector3()));
 const positions=[],normals=[],colors=[],uv=[],indices=[],skinIndex=[],skinWeight=[];
 const baseSphere=new THREE.SphereGeometry(1,highDetail?12:8,highDetail?10:6);
 const baseTiny=new THREE.SphereGeometry(1,highDetail?8:6,highDetail?6:5);
 const baseCylinder=new THREE.CylinderGeometry(1,1,1,highDetail?12:8);
 const baseCone=new THREE.ConeGeometry(1,1,highDetail?9:6);
 let parts=0;
 function append(base,bone,color,x,y,z,sx,sy,sz,rz=0,rx=0,ry=0){
  const g=base.clone();
  const m=new THREE.Matrix4().makeTranslation(origin[bone].x+x,origin[bone].y+y,origin[bone].z+z);
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'XYZ'));
  const r=new THREE.Matrix4().compose(new THREE.Vector3(0,0,0),q,new THREE.Vector3(sx,sy,sz));
  m.multiply(r);g.applyMatrix4(m);
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),tc=g.getAttribute('uv'),idx=g.getIndex(),
        c=new THREE.Color(color),offset=positions.length/3;
  for(let i=0;i<p.count;i++){
   positions.push(p.getX(i),p.getY(i),p.getZ(i));
   normals.push(n.getX(i),n.getY(i),n.getZ(i));
   colors.push(c.r,c.g,c.b);
   uv.push(tc?.getX(i)??0,tc?.getY(i)??0);
   skinIndex.push(bone,0,0,0);
   skinWeight.push(1,0,0,0);
  }
  if(idx)for(let i=0;i<idx.count;i++)indices.push(offset+idx.getX(i));
  else for(let i=0;i<p.count;i++)indices.push(offset+i);
  parts++;
  g.dispose();
 }
 const sphere=(b,c,x,y,z,w,h,d,rz=0,rx=0,ry=0)=>append(baseSphere,b,c,x,y,z,w,h,d,rz,rx,ry);
 const tiny=(b,c,x,y,z,w,h,d,rz=0,rx=0,ry=0)=>append(baseTiny,b,c,x,y,z,w,h,d,rz,rx,ry);
 const tube=(b,c,x,y,z,w,h,d,rz=0,rx=0,ry=0)=>append(baseCylinder,b,c,x,y,z,w,h,d,rz,rx,ry);
 // Pelvis / beach shorts, small waist seam and rounded torso.
 sphere(1,SHORTS,0,-.08,0,.56,.30,.40);
 tiny(1,SEAM,0,.1,.1,.54,.035,.32);
 sphere(2,SHIRT,0,-.09,-.03,.63,.61,.40);
 sphere(2,LIGHT,0,.22,.26,.52,.20,.145);
 tube(2,WHITE,0,.07,.372,.026,.44,.028);
 tiny(2,WHITE,-.035,.30,.37,.12,.17,.042,.43);
 tiny(2,WHITE,.035,.30,.37,.12,.17,.042,-.43);
 for(const h of [-.04,-.21])tiny(2,GOLD,0,h,.375,.045,.04,.036);
 // Hawaiian flowers (embroidered physical geometry, not painted on a static body).
 const makeFlower=(x,y,z,back=false)=>{
  const bone=2,sign=back?-1:1;
  tiny(bone,GOLD,x,y,z+sign*.033,.043,.043,.019);
  for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5;
   tiny(bone,FLOWER,x+Math.cos(a)*.090,y+Math.sin(a)*.090,z,.055,.043,.022,a);
  }
  tiny(bone,LEAF,x+.13,y-.09,z,.10,.042,.017,.5);
 };
 for(const [x,y] of [[-.29,.11],[.26,.00],[-.10,-.32],[.29,-.32]])
  makeFlower(x,y,.36*Math.sqrt(Math.max(.3,1-(x/.7)**2-(y/.7)**2))+.02);
 if(highDetail){
  for(const [x,y] of [[-.25,.23],[.24,-.18]])makeFlower(x,y,-.35,true);
  // Tropical pendant at center of collar.
  tiny(2,GOLD,0,.24,.42,.056,.09,.025);
  tiny(2,LIGHT,0,.24,.442,.028,.048,.018);
 }
 // Broad neck, soft facial shape, ears, cheeks and real protruding hair volume.
 sphere(2,SKIN,0,.49,0,.19,.20,.20);
 sphere(3,SKIN,0,.46,.025,.66,.64,.56);
 tiny(3,SHADE,-.66,.42,.01,.13,.18,.15);
 tiny(3,SHADE,.66,.42,.01,.13,.18,.15);
 // Cheek blush, a curved shallow mouth and raised nose.
 tiny(3,SHADE,-.36,.29,.52,.145,.07,.025);
 tiny(3,SHADE,.36,.29,.52,.145,.07,.025);
 tiny(3,SHADE,0,.27,.56,.08,.073,.07);
 for(const [x,y] of [[-.10,.13],[-.04,.10],[.02,.095],[.08,.12]])
  tiny(3,SHADE,x,y,.553,.035,.023,.018);
 // Eyes face +Z, visible from front and quarter directions.
 for(const side of [-1,1]){
  const x=side*.255;
  sphere(3,WHITE,x,.49,.516,.145,.18,.065);
  sphere(3,IRIS,x,.49,.58,.095,.137,.035);
  tiny(3,EYE,x,.49,.608,.051,.11,.028);
  tiny(3,WHITE,x-.034,.54,.629,.032,.04,.015);
  tiny(3,HEAD,x,.71,.54,.17,.045,.05,side*.18);
  if(highDetail)tiny(3,WHITE,x+.043,.46,.633,.018,.025,.009);
 }
 // Back of dark navy hair forms an actual 3D cap, plus asymmetric tufts.
 sphere(3,HEAD,0,.90,-.13,.665,.30,.58);
 sphere(3,HEAD,0,.70,-.45,.58,.39,.22);
 for(const [x,y,z,w,ang] of [[-.46,.88,.31,.19,-.46],[-.27,.93,.48,.20,-.30],[-.03,.93,.54,.22,0],[.22,.92,.49,.17,.42],[.45,.86,.29,.19,.5]]){
  sphere(3,HEAD,x,y,z,w,.20,.16,ang);
  if(highDetail)tiny(3,HAIR_HIGHLIGHT,x-.012,y+.06,z+.10,w*.47,.08,.065,ang);
 }
 if(highDetail)for(const [x,z] of [[-.45,-.39],[-.18,-.54],[.17,-.53],[.43,-.36]])
  tiny(3,HAIR_HIGHLIGHT,x,.67,z,.11,.26,.065);
 // 3D shoulders, elbows and hands actually attached to independent bones.
 for(const side of [-1,1]){
  const left=side<0,shoulder=left?4:7,elbow=left?5:8,hand=left?6:9;
  sphere(shoulder,SHIRT,side*.055,-.14,0,.245,.29,.24);
  tiny(shoulder,LIGHT,side*.05,-.36,.01,.228,.067,.21);
  tube(elbow,SKIN,0,-.18,.0,.16,.34,.16);
  tiny(elbow,SHADE,0,-.02,.01,.167,.13,.17);
  sphere(hand,SKIN,0,-.045,0,.17,.185,.155);
  if(highDetail){
   tiny(hand,SKIN,side*.145,-.07,.07,.066,.12,.072,.28);
   tiny(hand,GOLD,0,.10,.0,.169,.04,.159);
  }
  // Shorts, thighs and rounded knees, skin shin and colored sandals.
  const thigh=left?10:13,knee=left?11:14,foot=left?12:15;
  sphere(thigh,SHORTS,0,-.16,0,.265,.27,.30);
  tiny(thigh,SEAM,0,-.35,.03,.254,.052,.27);
  tube(thigh,SKIN,0,-.38,0,.178,.25,.17);
  sphere(knee,SKIN,0,-.12,.02,.18,.15,.18);
  tube(knee,SKIN,0,-.28,.01,.165,.39,.16);
  sphere(foot,SANDAL,0,-.14,.15,.235,.11,.33);
  tiny(foot,LIGHT,0,-.045,.23,.21,.055,.19,.25);
  tiny(foot,SKIN,0,-.018,.14,.18,.054,.21);
  if(highDetail){
   tiny(foot,GOLD,0,-.005,.29,.057,.05,.035);
   tiny(foot,WHITE,0,-.05,.37,.13,.035,.042);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
 g.setIndex(indices);
 g.computeBoundingBox();g.computeBoundingSphere();
 baseSphere.dispose();baseTiny.dispose();baseCylinder.dispose();baseCone.dispose();
 return Object.freeze({geometry:g,parts,vertices:positions.length/3,triangles:indices.length/3});
}
function getGeometry(highDetail){
 const key=highDetail?'master':'crowd';
 if(!cache.has(key))cache.set(key,buildModelGeometry(highDetail));
 return cache.get(key);
}
export function createSkinnedChibi(highDetail=true){
 const model=getGeometry(highDetail),root=new THREE.Group(),bones=createBones();
 const skinned=new THREE.SkinnedMesh(model.geometry,vertexMaterial);
 skinned.name='Chàng Biển — SkinnedMesh';
 skinned.frustumCulled=false;  // dynamic bound mesh, prevents incorrect pop-in on skinning
 skinned.add(bones[0]);skinned.updateMatrixWorld(true);
 skinned.bind(new THREE.Skeleton(bones));
 root.add(skinned);
 const shadow=new THREE.Mesh(shadowGeo,shadowMaterial);
 shadow.rotation.x=-Math.PI/2;shadow.position.y=.017;shadow.scale.set(.73,.42,1);
 root.add(shadow);
 root.userData.gmwwV510=true;
 return {root,mesh:skinned,bones,shadow,model,highDetail};
}
export function animateSkinnedChibi(rig,motion){
 const p=motion.pose,b=rig.bones;
 rig.root.position.set(motion.x,0,motion.z);
 rig.root.rotation.y=motion.yaw;
 b[1].position.y=1.33+p.hipY;
 b[1].rotation.set(p.hipLean,0,p.hipRoll);
 b[2].rotation.x=p.bodyTilt;
 // Owner specification: keep head upright, never waggle side-to-side while idle.
 b[3].rotation.set(p.headPitch-p.hipLean*.45,0,-p.hipRoll*.92);
 b[4].rotation.set(p.armL,0,p.armLOut);
 b[7].rotation.set(p.armR,0,p.armROut);
 b[5].rotation.x=p.armL< -1.5?-.24:Math.max(0,-p.armL)*.18;
 b[8].rotation.x=p.armR< -1.5?-.24:Math.max(0,-p.armR)*.18;
 b[6].rotation.x=.04;
 b[9].rotation.x=.04;
 b[10].rotation.x=p.legL;
 b[13].rotation.x=p.legR;
 b[11].rotation.x=p.kneeL;
 b[14].rotation.x=p.kneeR;
 b[12].rotation.x=-p.legL*.28-p.kneeL*.43;
 b[15].rotation.x=-p.legR*.28-p.kneeR*.43;
 const yScale=1-Math.max(-.3,Math.min(.3,p.hipY))*.3;
 rig.shadow.scale.set(.73*yScale,.42*yScale,1);
}
export function v510ModelStats(detail=true){
 const model=getGeometry(detail);
 return {version:V510_RIG_VERSION,bones:V510_BONES.length,
  vertices:model.vertices,triangles:model.triangles,
  sceneObjectsPerActor:2,skinnedMeshesPerActor:1,sharedGeometry:true,parts:model.parts};
}
