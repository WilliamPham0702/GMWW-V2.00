import * as THREE from './vendor/three.module.min.js';
// Independent full-volume renderer. Front face is observed artwork; rear design inferred.
const C={hair:'#182039',hairHi:'#3c4665',skin:'#ffd2b9',gold:'#d5af62',teal:'#24b6cb',navy:'#172b51'};
function wrappedMap(kind,image){
 if(typeof document==='undefined')return null;
 const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const ctx=cv.getContext('2d');
 const bg=ctx.createLinearGradient(0,0,0,512);
 const colors=kind==='hair'?['#30364f','#101b32']:kind==='skin'||kind==='face'?['#ffe1c9','#edb49d']:kind==='shorts'||kind==='sandal'?['#183969','#0d2144']:['#d7f4ef','#027ead'];
 bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,1024,512);
 if(kind==='shirt'||kind==='shorts'){
 // Authored continuous rear/side wave textile, inspired by approved front; NOT observed rear art.
 for(let row=0;row<4;row++)for(let n=-1;n<9;n++){
 const x=n*150+row*61,y=170+row*96;
 ctx.strokeStyle=row%2?'#b5f6ee':'#e9fff8';ctx.lineWidth=12;
 ctx.beginPath();ctx.moveTo(x-68,y+30);ctx.bezierCurveTo(x-20,y-46,x+62,y-40,x+52,y+4);ctx.bezierCurveTo(x+34,y+24,x+17,y-14,x+41,y-13);ctx.stroke();
 }
 ctx.strokeStyle=C.gold;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(0,492);ctx.lineTo(1024,492);ctx.stroke();
 if(kind==='shirt')for(const [x,y] of [[224,190],[740,212],[930,360]]){
 ctx.save();ctx.translate(x,y);for(let i=0;i<5;i++){ctx.rotate(2*Math.PI/5);ctx.fillStyle='#fff9e9';ctx.beginPath();ctx.ellipse(0,-21,13,24,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 }
 if(kind==='hair'){
 for(let n=0;n<64;n++){
 const x=n*17;ctx.strokeStyle=n%5?'#43506c':'#547c91';ctx.globalAlpha=n%5?.35:.6;ctx.lineWidth=n%5?2:4;ctx.beginPath();ctx.moveTo(x-80,-20);ctx.bezierCurveTo(x+20,120,x-45,300,x+24,540);ctx.stroke();
 }ctx.globalAlpha=1;
 }
 if(kind==='sandal'){ctx.strokeStyle=C.gold;ctx.lineWidth=18;for(let n=-1;n<6;n++){ctx.beginPath();ctx.moveTo(n*230,0);ctx.lineTo(n*230+250,512);ctx.stroke();}ctx.strokeStyle='#33bace';ctx.lineWidth=33;ctx.beginPath();ctx.moveTo(0,210);ctx.lineTo(1024,270);ctx.stroke();}
 if(image&&(kind==='face'||kind==='shirt')){
 // Bake observed front into the front half of a cylindrical/spherical unwrap.
 // u=.25 faces +Z; back half retains the fully authored continuous material above.
 const src=document.createElement('canvas');src.width=image.width;src.height=image.height;const sc=src.getContext('2d',{willReadFrequently:true});sc.drawImage(image,0,0);const pixels=sc.getImageData(0,0,src.width,src.height).data;
 const dst=ctx.getImageData(0,0,1024,512),d=dst.data;
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
 const phi=x/1024*Math.PI*2,nx=-Math.cos(phi),nz=Math.sin(phi),ny=Math.cos(y/511*Math.PI);
 const sx=kind==='face'?550+nx*211:548+nx*182;
 const sy=kind==='face'?405-ny*133:725-(.5-y/512)*385;
 const ix=Math.max(0,Math.min(src.width-1,Math.round(sx))),iy=Math.max(0,Math.min(src.height-1,Math.round(sy))),k=(iy*src.width+ix)*4,o=(y*1024+x)*4;
 const white=pixels[k]>239&&pixels[k+1]>239&&pixels[k+2]>239;
 const blend=Math.min(1,Math.max(0,(nz-.20)/.42))*(white?0:1);
 for(let channel=0;channel<3;channel++)d[o+channel]=d[o+channel]*(1-blend)+pixels[k+channel]*blend;
 }
 ctx.putImageData(dst,0,0);
 }
 const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=4;return t;
}
function weightGeometry(g,bone,aux=bone,blendFn=null){
 const p=g.getAttribute('position'),ids=[],ws=[];
 for(let i=0;i<p.count;i++){const w=blendFn?Math.max(0,Math.min(1,blendFn(p.getY(i)))):0;ids.push(bone,aux,0,0);ws.push(1-w,w,0,0);}
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(ids,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(ws,4));return g;
}
export function mountVolume360(rig,sourceTexture){
 const source=sourceTexture?.image,materials={},meshes=[];
 for(const kind of ['face','skin','hair','shirt','shorts','sandal'])materials[kind]=new THREE.MeshStandardMaterial({map:wrappedMap(kind,source),color:source?'#ffffff':kind==='hair'?C.hair:kind==='skin'||kind==='face'?C.skin:kind==='shirt'?C.teal:C.navy,roughness:.8,metalness:0,side:THREE.DoubleSide});
 materials.gold=new THREE.MeshStandardMaterial({color:C.gold,roughness:.45,metalness:.3});materials.white=new THREE.MeshStandardMaterial({color:'#fff8e7',roughness:.7});materials.teal=new THREE.MeshStandardMaterial({color:C.teal,roughness:.65});
 const add=(name,g,kind,bone,aux=bone,blend=null)=>{
 weightGeometry(g,bone,aux,blend);const mesh=new THREE.SkinnedMesh(g,materials[kind]);mesh.name=name;mesh.skeleton=rig.mesh.skeleton;mesh.bindMode='detached';mesh.bindMatrix.copy(rig.mesh.bindMatrix);mesh.bindMatrixInverse.copy(rig.mesh.bindMatrixInverse);mesh.frustumCulled=false;rig.root.add(mesh);meshes.push(mesh);return mesh;
 };
 const ellipsoid=(name,bone,kind,x,y,z,sx,sy,sz,rz=0,aux=bone,blend=null)=>{
 const g=new THREE.SphereGeometry(1,32,24);g.scale(sx,sy,sz);g.rotateZ(rz);g.translate(x,y,z);return add(name,g,kind,bone,aux,blend);
 };
 const tube=(name,bone,kind,x,y,z,top,bottom,height,depth=1,rz=0,aux=bone,blend=null)=>{
 const g=new THREE.CylinderGeometry(top,bottom,height,40,12,false);const uv=g.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)+.25);g.scale(1,1,depth);g.rotateZ(rz);g.translate(x,y,z);return add(name,g,kind,bone,aux,blend);
 };
 // Face/chin volume, neck and ears remain solid from every angle.
 ellipsoid('head-face-volume',3,'face',0,3.13,.04,.655,.565,.50);
 ellipsoid('neck',2,'skin',0,2.54,0,.17,.22,.16);
 for(const side of [-1,1])ellipsoid('ear-'+side,3,'skin',side*.636,3.105,.005,.105,.155,.09);
 // Rear scalp has geometry and its own full unwrap; no projection of eyes onto back.
 const cap=new THREE.SphereGeometry(1,40,28,Math.PI,Math.PI);cap.scale(.695,.65,.535);cap.translate(0,3.35,-.035);add('hair-back-cap',cap,'hair',3);
 const top=new THREE.SphereGeometry(1,40,18,0,Math.PI*2,0,Math.PI*.41);top.scale(.70,.65,.55);top.translate(0,3.35,-.035);add('hair-crown',top,'hair',3);
 // Solid tapered curved hair locks around both sides and rear; rooted into scalp.
 function lock(name,points,radius,kind='hair'){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=new THREE.TubeGeometry(curve,14,radius,10,false),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const row=Math.floor(i/11),t=row/14,center=curve.getPointAt(t);const f=1-.96*t*t;p.setXYZ(i,center.x+(p.getX(i)-center.x)*f,center.y+(p.getY(i)-center.y)*f,center.z+(p.getZ(i)-center.z)*f);}g.computeVertexNormals();add(name,g,kind,3);
 }
 for(let i=0;i<11;i++){
 const a=Math.PI+(i/10)*Math.PI,x=Math.cos(a)*.53,z=Math.sin(a)*.46;
 lock('rear-hair-lock-'+i,[[x*.65,3.79,z*.7],[x*1.13,3.43,z*1.18],[x*1.16,2.99,z*1.17],[x*.98,2.82,z*.85]],.12);
 }
 for(const side of [-1,1]){
 lock('side-lock-'+side,[[side*.45,3.77,.22],[side*.66,3.42,.28],[side*.67,3.08,.22],[side*.54,2.93,.19]],.13);
 }
 for(let i=0;i<6;i++){
 const x=-.46+i*.177;
 lock('front-fringe-'+i,[[x*.75,3.83,.17],[x,3.63,.43],[x+.06,3.40,.51],[x+.12,3.31,.47]],.12);
 }
 lock('top-curl',[[0,3.82,-.04],[-.03,4.02,-.03],[.17,4.05,.02],[.28,3.93,.06]],.055);
 // Continuous closed garment surfaces, tapered to body rather than separate colored balls.
 tube('shirt-closed-shell',2,'shirt',0,1.97,0,.54,.61,.99,.72,0,1,y=>Math.max(0,(1.84-y)/.7));
 ellipsoid('pelvis',1,'shorts',0,1.39,0,.50,.22,.34);
 tube('belt',1,'gold',0,1.50,0,.50,.50,.045,.72);
 for(const side of [-1,1]){
 const s=side<0?4:7,e=side<0?5:8,h=side<0?6:9,t=side<0?10:13,k=side<0?11:14,f=side<0?12:15;
 tube('sleeve-'+side,s,'shirt',side*.58,2.095,0,.24,.29,.44,.92,side*.07,2,y=>Math.max(0,(y-2.14)*1.7));
 tube('sleeve-hem-'+side,s,'gold',side*.60,1.885,0,.285,.29,.026,.92);
 ellipsoid('arm-upper-'+side,s,'skin',side*.60,1.91,0,.145,.23,.145,0,e,y=>Math.max(0,(1.98-y)/.25));
 ellipsoid('arm-fore-'+side,e,'skin',side*.615,1.65,0,.143,.25,.14,0,h,y=>Math.max(0,(1.57-y)/.24));
 ellipsoid('hand-'+side,h,'skin',side*.615,1.34,.02,.155,.17,.125);
 ellipsoid('thumb-'+side,h,'skin',side*.49,1.35,.09,.055,.10,.056,side*.4);
 tube('bracelet-'+side,h,'sandal',side*.615,1.51,0,.16,.16,.075,.95);
 tube('shorts-'+side,t,'shorts',side*.27,1.13,0,.27,.285,.55,1.07,0,1,y=>Math.max(0,(y-1.16)*1.8));
 tube('shorts-hem-'+side,t,'gold',side*.27,.86,0,.285,.285,.028,1.07);
 ellipsoid('thigh-'+side,t,'skin',side*.27,.76,0,.175,.23,.17,0,k,y=>Math.max(0,(.78-y)/.25));
 ellipsoid('calf-'+side,k,'skin',side*.27,.405,.015,.155,.29,.15,0,f,y=>Math.max(0,(.28-y)/.23));
 ellipsoid('foot-'+side,f,'skin',side*.27,.145,.17,.195,.12,.30);
 ellipsoid('sandal-sole-'+side,f,'sandal',side*.27,.065,.17,.23,.066,.34);
 ellipsoid('sandal-strap-'+side,f,'sandal',side*.27,.201,.20,.205,.037,.15,side*.28);
 }
 // Sculpted ornaments have depth at side/back viewing angles, not texture-only cutouts.
 for(const [cx,cy,cz,b] of [[.47,3.62,.42,3],[.36,2.18,.37,2]]){
 for(let i=0;i<5;i++){const a=i*2*Math.PI/5;ellipsoid('flower-petal-'+b+'-'+i,b,'white',cx+Math.cos(a)*.095,cy+Math.sin(a)*.095,cz,.075,.11,.028,a);}
 ellipsoid('flower-center-'+b,b,'gold',cx,cy,cz+.045,.045,.045,.035);
 }
 ellipsoid('pendant',2,'gold',0,2.14,.405,.068,.09,.032);
 rig.mesh.visible=false;
 return {mode:3,layers:[],base:meshes,meshes,productionSkin:false,uvMode:'continuous-360',sideBackReference:'inferred',update(){},wireframe(on){for(const m of meshes)m.material.wireframe=on;}};
}
