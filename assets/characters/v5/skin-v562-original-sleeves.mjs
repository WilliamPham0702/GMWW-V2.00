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


// Character V5.63 visual rebuild: full coherent 3D SEA-STYLE concept skin.
// This is a sculpted, skinned Three.js surface, NOT a cropped flat image,
// disconnected sprite planes, or a complete conversion of the approved PNG.
// The illustration requires original all-side texture UV unwrapping for a
// pixel-accurate match. This is a playable 3D silhouette for GM approval.
export const V563_VERSION='5.63-cohesive-ocean-chibi-3d-concept';
export const V563_SKIN_PARTS=Object.freeze([
 'head-face','navy-teal-hair','floral-hairpin','torso-undershirt',
 'patterned-sea-shirt','joined-3d-sleeves','hands-and-bracelets',
 'layered-sea-shorts','legs','gold-blue-sandals','shells-pearls-charms'
]);
export function createV563OceanBodyGeometry(){
 const pos=[],normals=[],colors=[],uv=[],indices=[],boneIds=[],boneWeights=[];
 const sphere=new THREE.SphereGeometry(1,16,12);
 const pearl=new THREE.SphereGeometry(1,10,8);
 const cylinder=new THREE.CylinderGeometry(1,1,1,18,3);
 const cone=new THREE.ConeGeometry(1,1,12,2);
 const palette=Object.freeze({
  hair:'#152440',hairBright:'#273b63',teal:'#27c2d9',skin:'#ffd8c2',
  skinShade:'#e7a996',blush:'#f2ab9e',navy:'#192d59',blue:'#075caa',
  ocean:'#0787bc',aqua:'#4cd3e7',ice:'#d7faff',white:'#fff7e8',
  gold:'#e6bd76',deepGold:'#9c7137',iris:'#007ebc',eye:'#06284d'
 });
 const C=x=>palette[x]||x;
 const add=(kind,bone,color,x,y,z,sx,sy,sz,rz=0,rx=0,ry=0,auxBone=bone,auxWeight=0)=>{
  const base=kind==='pearl'?pearl:kind==='cylinder'?cylinder:kind==='cone'?cone:sphere;
  const g=base.clone();
  const mat=new THREE.Matrix4().compose(
   new THREE.Vector3(x,y,z),
   new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'XYZ')),
   new THREE.Vector3(sx,sy,sz)
  );
  g.applyMatrix4(mat);
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),
    texture=g.getAttribute('uv'),idx=g.getIndex(),
    rgb=new THREE.Color(C(color)),offset=pos.length/3;
  for(let i=0;i<p.count;i++){
   pos.push(p.getX(i),p.getY(i),p.getZ(i));
   normals.push(n.getX(i),n.getY(i),n.getZ(i));
   colors.push(rgb.r,rgb.g,rgb.b);
   uv.push(texture?texture.getX(i):0,texture?texture.getY(i):0);
   boneIds.push(bone,auxBone,0,0);
   boneWeights.push(1-auxWeight,auxWeight,0,0);
  }
  if(idx)for(let i=0;i<idx.count;i++)indices.push(offset+idx.getX(i));
  else for(let i=0;i<p.count;i++)indices.push(offset+i);
  g.dispose();
 };
 const orb=(bone,color,x,y,z,w,h,d,rz=0,rx=0,ry=0,aux=bone,blend=0)=>
  add('sphere',bone,color,x,y,z,w,h,d,rz,rx,ry,aux,blend);
 const dot=(bone,color,x,y,z,r)=>
  add('pearl',bone,color,x,y,z,r,r,r);
 // Unified shaded head and face. All elements belong to the SAME skeleton.
 orb(3,'skin',0,3.07,.02,.67,.63,.54);
 orb(3,'skin',-.64,3.09,0,.115,.19,.11);
 orb(3,'skin', .64,3.09,0,.115,.19,.11);
 orb(3,'skinShade',0,2.88,.52,.11,.085,.055);
 orb(3,'blush',-.38,2.94,.50,.17,.052,.018);
 orb(3,'blush', .38,2.94,.50,.17,.052,.018);
 // Ocean-blue eyes, actual curved 3D ocular volumes—not pasted sprites.
 for(const side of [-1,1]){
  const x=side*.254;
  orb(3,'white',x,3.145,.502,.166,.19,.071);
  orb(3,'iris',x,3.145,.562,.119,.145,.042);
  orb(3,'eye',x,3.14,.599,.077,.109,.022);
  dot(3,'white',x-.038,3.21,.62,.039);
  dot(3,'ice',x+.044,3.09,.61,.018);
  orb(3,'hair',x,3.375,.489,.152,.033,.032,side*.12);
 }
 orb(3,'skinShade',0,2.839,.520,.063,.024,.020);
 // Layered navy sculpted hairstyle; bangs taper over forehead.
 orb(3,'hair',0,3.50,-.095,.70,.32,.575);
 orb(3,'hairBright',0,3.61,-.19,.60,.23,.45);
 orb(3,'hair',0,3.25,-.49,.57,.38,.17);
 for(let i=0;i<8;i++){
  const x=-.57+i*.162;
  const y=3.57+.080*Math.cos(i*.83);
  add('cone',3,i%3?'hair':'hairBright',x,y,.385,.122,.37,.20,
      (i-3.6)*.085,0,(i-3.6)*.07);
 }
 for(const side of [-1,1]){
  orb(3,'hairBright',side*.59,3.32,.06,.16,.38,.35,side*.21);
  orb(3,'teal',side*.40,3.57,.425,.13,.028,.045,side*.33);
 }
 // Spiraled top curl of hair, attached to bone 3, bending together.
 add('cone',3,'hair',-.03,3.81,-.10,.13,.32,.14,-.35);
 // Five-petal flower + golden sea ornament at right temple.
 for(let i=0;i<5;i++){
  const a=2*Math.PI*i/5;
  orb(3,i%2?'ice':'white',.47+Math.cos(a)*.13,3.55+Math.sin(a)*.13,.51,
      .11,.145,.045,a-Math.PI/2);
 }
 dot(3,'gold',.47,3.55,.567,.075);
 dot(3,'white',.47,3.55,.626,.037);
 for(let i=0;i<3;i++){
  dot(3,'gold',.64+i*.035,3.41-i*.11,.515,.029);
  dot(3,'ice',.67+i*.035,3.34-i*.13,.52,.040);
 }
 // Torso and matching undershirt, with coherent visible neck opening.
 orb(2,'skin',0,2.395,0,.17,.27,.16);
 orb(2,'ice',0,1.905,.028,.575,.555,.38);
 orb(2,'aqua',0,2.09,.385,.25,.115,.026);
 orb(2,'navy',0,1.52,-.01,.48,.22,.38);
 // Open sea-coat front seams, pale blue lapels with matching gold piping.
 for(const side of [-1,1]){
  orb(2,'white',side*.26,2.21,.390,.16,.35,.060,side*.33);
  orb(2,'gold',side*.397,2.18,.405,.032,.31,.023,side*.33);
  orb(2,'aqua',side*.47,1.73,.36,.08,.34,.052,side*.16);
  orb(2,'gold',side*.52,1.73,.381,.023,.32,.025,side*.16);
 }
 // Three-dimensional necklaces and shell pendant; chest-bone attached.
 for(let i=0;i<9;i++){
  const a=Math.PI*(.12+i/8*.76);
  dot(2,i%3===0?'gold':'blue',Math.cos(a)*.26,2.48-Math.sin(a)*.24,.42,.032);
 }
 orb(2,'gold',0,2.15,.445,.095,.105,.036);
 dot(2,'ice',0,2.11,.485,.054);
 dot(2,'ocean',0,2.026,.49,.042);
 // Waist belt, pearl shells, front star charm.
 orb(1,'navy',0,1.36,.025,.50,.26,.39);
 orb(1,'gold',0,1.42,.39,.36,.040,.034);
 for(let a=0;a<5;a++){
  const t=a*2*Math.PI/5;
  orb(1,'gold',Math.cos(t)*.08,1.32+Math.sin(t)*.08,.43,.035,.095,.02,t);
 }
 dot(1,'ice',0,1.32,.47,.052);
 // Navy shorts are one visually continuous pair with a sea-wave hem.
 for(const side of [-1,1]){
  const thigh=side<0?10:13,knee=side<0?11:14,foot=side<0?12:15;
  orb(thigh,'navy',side*.265,1.105,.01,.295,.38,.34);
  orb(thigh,'ocean',side*.27,.855,.025,.291,.085,.35);
  orb(thigh,'gold',side*.27,.79,.048,.278,.026,.315);
  // Decorative wave-foam scroll on both shorts; real 3D raised details.
  orb(thigh,'ice',side*.26,1.03,.313,.17,.056,.021,side*.30);
  orb(thigh,'aqua',side*.38,.97,.325,.11,.040,.021,side*.41);
  // Legs have knee and ankle deformation on the shared 16-bone rig.
  orb(thigh,'skin',side*.27,.69,.01,.193,.30,.192,0,0,0,knee,.36);
  orb(knee,'skin',side*.27,.405,.025,.180,.30,.172,0,0,0,foot,.13);
  orb(foot,'skin',side*.27,.14,.175,.207,.13,.32);
  orb(foot,'navy',side*.27,.074,.195,.255,.079,.35);
  orb(foot,'blue',side*.27,.169,.255,.24,.035,.27);
  orb(foot,'gold',side*.27,.19,.235,.043,.047,.272,side*.3);
  orb(foot,'ice',side*.27,.215,.23,.079,.037,.095);
  dot(foot,'gold',side*.27,.23,.283,.035);
 }
 // Upper arms join shirts, elbows follow sculpted motion, matched gold cuffs.
 for(const side of [-1,1]){
  const upper=side<0?4:7,elbow=side<0?5:8,hand=side<0?6:9;
  orb(upper,'aqua',side*.62,2.08,.04,.245,.30,.253,side*.20);
  orb(upper,'gold',side*.63,1.846,.065,.233,.036,.231);
  orb(elbow,'skin',side*.615,1.635,.005,.174,.27,.167);
  orb(hand,'skin',side*.615,1.39,.025,.178,.174,.145);
  // Decorative bracelets matched to the blue/gold sea outfit.
  orb(hand,'blue',side*.615,1.55,.028,.179,.06,.170);
  orb(hand,'gold',side*.615,1.54,.06,.182,.029,.173);
  dot(hand,'ice',side*.615,1.575,.197,.048);
  dot(hand,'gold',side*.615,1.50,.191,.028);
 }
 // Sea-foam flower clasp and cascading shell ornaments at torso.
 for(let i=0;i<5;i++){
  const a=i*2*Math.PI/5;
  orb(2,i%2?'ice':'white',.38+Math.cos(a)*.115,2.12+Math.sin(a)*.115,.482,
      .11,.15,.036,a);
 }
 dot(2,'gold',.38,2.12,.533,.064);
 dot(2,'aqua',.38,2.12,.587,.032);
 for(let i=0;i<3;i++){
  dot(2,'gold',.47,1.95-i*.11,.44,.024);
  dot(2,'ice',.47,1.90-i*.11,.46,.041);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(boneIds,4));
 geo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(boneWeights,4));
 geo.setIndex(indices);geo.computeBoundingSphere();
 sphere.dispose();pearl.dispose();cylinder.dispose();cone.dispose();
 return {geometry:geo,vertices:pos.length/3,triangles:indices.length/3};
}
export function addV563FullOceanSkinToRig(rig,options={}){
 if(!rig?.mesh?.isSkinnedMesh||rig.bones?.length!==16)
  throw Error('V563_REQUIRES_EXISTING_16_BONE_3D_RIG');
 const coat=addV562OriginalFabricSleevesToRig(rig,options);
 const fullBody=createV563OceanBodyGeometry();
 const material=new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:.77,metalness:.035,
  side:THREE.DoubleSide
 });
 const character=new THREE.SkinnedMesh(fullBody.geometry,material);
 character.name='GMWW V5.63 cohesive 3D sea-outfit body and face';
 character.frustumCulled=false;
 character.bindMode='detached';
 character.skeleton=rig.mesh.skeleton;
 character.bindMatrix.copy(rig.mesh.bindMatrix);
 character.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);
 rig.root.add(character);
 // Hide the early mismatched procedural character and its isolated flower;
 // body/face/limbs are now one matching UV-ready 3D skinned surface.
 rig.mesh.visible=false;
 if(coat.flower)coat.flower.visible=false;
 const dispose=()=>{
  rig.root.remove(character);fullBody.geometry.dispose();material.dispose();
  rig.mesh.visible=true;
  coat.disposeSleeves();
 };
 return {
  ...coat,
  version:V563_VERSION,previewVersion:V563_VERSION,
  fullBody:character,fullBodyVertices:fullBody.vertices,
  fullBodyTriangles:fullBody.triangles,
  fullBodyMeshesAreRealSkinned:character.isSkinnedMesh,
  fullBodySharesSkeleton:character.skeleton===rig.mesh.skeleton,
  visuallyCompleteBodyParts:V563_SKIN_PARTS,
  // Important: the exact artwork is a 2D reference. This mesh is sculpted
  // from its design palette; it is not falsely described as the same pixels.
  userApprovedIllustrationBakedToFullUvAtlas:false,
  characterArtworkFrontOnly:true,
  fullSkin3DConcept:true,
  gameIntegrated:false,
  disposeFullSeaSkin:dispose
 };
}
