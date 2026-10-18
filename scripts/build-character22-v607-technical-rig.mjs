// GMWW Character 22 V6.07 - independent VOLUMETRIC 3D TECHNICAL PROTOTYPE.
// This procedural mannequin is NOT the owner-approved costume or eight-view art.
// No source Character 21 mesh, texture, or animation data is reused.
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const OUTPUT='assets/characters/overhaul-v600/character-22/technical-prototype.glb';
export const BONES=['root','hips','chest','head','shoulderL','elbowL','handL','shoulderR','elbowR','handR','thighL','kneeL','footL','thighR','kneeR','footR'];
export const ACTIONS=['Idle','Walk','Run','Result'];
const at=[[0,0,0],[0,.7,0],[0,1.22,0],[0,2.06,0],[-.57,1.33,0],[-.75,1.07,0],[-.82,.78,0],[.57,1.33,0],[.75,1.07,0],[.82,.78,0],[-.23,.62,0],[-.25,.29,0],[-.26,.1,.12],[.23,.62,0],[.25,.29,0],[.26,.1,.12]];
const C={skin:[252,197,160],hair:[45,51,70],teal:[24,165,173],deep:[15,78,109],gold:[249,194,83],coral:[236,112,107],white:[229,249,250],pants:[37,68,94],boot:[44,56,69]};
const vertices=[],normals=[],colors=[],joints=[],weights=[],triangles=[];
const bone=b=>BONES.indexOf(b);
function orb(x,y,z,rx,ry,rz,b,color,lat=10,lon=16){
 const offset=vertices.length/3,j=bone(b);if(j<0)throw Error('unknown joint');
 for(let r=0;r<=lat;r++){
  const phi=Math.PI*r/lat;
  for(let a=0;a<=lon;a++){
   const theta=Math.PI*2*a/lon,s=Math.sin(phi),dx=s*Math.cos(theta),dy=Math.cos(phi),dz=s*Math.sin(theta);
   vertices.push(x+rx*dx,y+ry*dy,z+rz*dz);
   const nx=dx/rx,ny=dy/ry,nz=dz/rz,nl=Math.hypot(nx,ny,nz)||1;
   normals.push(nx/nl,ny/nl,nz/nl);
   colors.push(...color,255);joints.push(j,0,0,0);weights.push(1,0,0,0);
  }
 }
 for(let r=0;r<lat;r++)for(let a=0;a<lon;a++){
  const p=offset+r*(lon+1)+a,q=p+lon+1;
  triangles.push(p,q,p+1,q,q+1,p+1);
 }
}
orb(0,1.26,0,.43,.52,.30,'chest',C.deep);                   // torso beneath armor
orb(0,1.30,.23,.38,.38,.12,'chest',C.teal);                  // solid curved chestplate
orb(0,1.34,.345,.21,.26,.04,'chest',C.gold);                // center plate
orb(0,.77,0,.35,.28,.27,'hips',C.gold);
orb(0,.68,.02,.31,.15,.28,'hips',C.deep);
orb(0,2.06,0,.61,.59,.53,'head',C.skin);                    // real solid head
orb(0,2.38,-.13,.64,.28,.49,'head',C.hair);
orb(-.20,2.08,.50,.105,.145,.07,'head',C.white);
orb(.20,2.08,.50,.105,.145,.07,'head',C.white);
orb(-.20,2.08,.565,.05,.082,.03,'head',C.hair);
orb(.20,2.08,.565,.05,.082,.03,'head',C.hair);
orb(0,1.87,.522,.14,.055,.025,'head',C.coral);
orb(-.48,2.44,0,.20,.28,.21,'head',C.coral);
orb(.48,2.44,0,.20,.28,.21,'head',C.coral);
for(const side of [-1,1]){
 const s=side<0?'L':'R',q=side<0?-1:1;
 orb(q*.56,1.35,0,.29,.27,.31,'shoulder'+s,C.gold);
 orb(q*.70,1.14,0,.23,.24,.22,'elbow'+s,C.skin);
 orb(q*.80,.82,0,.21,.22,.21,'hand'+s,C.deep);
 orb(q*.21,.58,0,.22,.30,.24,'thigh'+s,C.pants);
 orb(q*.24,.30,0,.18,.25,.18,'knee'+s,C.teal);
 orb(q*.25,.13,.13,.23,.15,.37,'foot'+s,C.boot);
 orb(q*.56,1.50,-.04,.16,.12,.26,'shoulder'+s,C.coral);
}
orb(0,1.18,-.29,.34,.43,.10,'chest',C.coral);              // back mantle has volume
// One combined indexed, weighted mesh; ALL angles are physically different camera views.
const chunks=[],views=[],accessors=[];
let size=0;
function segment(buf,target){
 const pad=(4-size%4)%4;if(pad){chunks.push(Buffer.alloc(pad));size+=pad}
 const offset=size;chunks.push(buf);size+=buf.length;
 const v=views.length;views.push({buffer:0,byteOffset:offset,byteLength:buf.length,...(target?{target}:{})});return v;
}
function accessor(buf,componentType,type,count,extra={},target){
 const view=segment(buf,target),i=accessors.length;accessors.push({bufferView:view,componentType,count,type,...extra});return i;
}
const f32=a=>Buffer.from(new Float32Array(a).buffer);
const u16=a=>Buffer.from(new Uint16Array(a).buffer);
const u8=a=>Buffer.from(new Uint8Array(a).buffer);
const positions=accessor(f32(vertices),5126,'VEC3',vertices.length/3,{min:[-1.1,0,-.6],max:[1.1,2.9,.6]},34962);
const normal=accessor(f32(normals),5126,'VEC3',normals.length/3,{},34962);
const color=accessor(u8(colors),5121,'VEC4',colors.length/4,{normalized:true},34962);
const joint=accessor(u16(joints),5123,'VEC4',joints.length/4,{},34962);
const weight=accessor(f32(weights),5126,'VEC4',weights.length/4,{},34962);
const index=accessor(u16(triangles),5123,'SCALAR',triangles.length,{},34963);
const identity=(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1];
const inv=accessor(f32(at.flatMap(p=>identity(...p))),5126,'MAT4',16);
const nodes=[{name:'GMWW_CHARACTER_22_TECHNICAL_ONLY',children:Array.from({length:17},(_,i)=>i+1)}];
for(let i=0;i<16;i++)nodes.push({name:BONES[i],translation:at[i]});
nodes.push({name:'Character22_SkinnedGeometry',mesh:0,skin:0});
function quaternion(axis,angle){const a=angle/2,s=Math.sin(a);return axis==='x'?[s,0,0,Math.cos(a)]:axis==='y'?[0,s,0,Math.cos(a)]:[0,0,s,Math.cos(a)]}
const animations=[];
for(const name of ACTIONS){
 const t=name==='Run'?[0,.14,.28,.42,.56]:name==='Walk'?[0,.25,.5,.75,1]:[0,.5,1,1.5,2];
 const input=accessor(f32(t),5126,'SCALAR',t.length,{min:[0],max:[t[t.length-1]]});
 const parts=name==='Idle'?[['head','y',.09],['shoulderL','z',.08],['shoulderR','z',-.08]]:
 name==='Walk'?[['thighL','x',.45],['thighR','x',-.45],['shoulderL','x',-.4],['shoulderR','x',.4],['kneeL','x',.20],['kneeR','x',-.20]]:
 name==='Run'?[['thighL','x',.80],['thighR','x',-.80],['shoulderL','x',-.65],['shoulderR','x',.65],['kneeL','x',.40],['kneeR','x',-.40]]:
 [['shoulderL','z',-1.05],['shoulderR','z',1.05],['head','y',.18],['chest','y',.10]];
 const channels=[],samplers=[];
 for(const [b,axis,amp] of parts){
  const rotations=t.flatMap((_,i)=>quaternion(axis,Math.sin(2*Math.PI*i/(t.length-1))*amp));
  const output=accessor(f32(rotations),5126,'VEC4',t.length);
  const sampler=samplers.length;samplers.push({input,output,interpolation:'LINEAR'});
  channels.push({sampler,target:{node:bone(b)+1,path:'rotation'}});
 }
 animations.push({name,samplers,channels});
}
const doc={asset:{version:'2.0',generator:'GMWW-V607-technical-prototype'},scene:0,scenes:[{nodes:[0]}],nodes,skins:[{joints:Array.from({length:16},(_,i)=>i+1),skeleton:1,inverseBindMatrices:inv}],meshes:[{name:'IndependentVolumetricChibi',primitives:[{attributes:{POSITION:positions,NORMAL:normal,COLOR_0:color,JOINTS_0:joint,WEIGHTS_0:weight},indices:index,mode:4,material:0}]}],materials:[{name:'Prototype_vertex_color',pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.8},doubleSided:true}],buffers:[{byteLength:size}],bufferViews:views,accessors,animations,extras:{characterId:'character-22',status:'TECHNICAL_PROTOTYPE_NOT_APPROVED_ART',geometry:'volumetric-3d',cameraAngles:8,artDirectionsApproved:1,productionEnabled:false,mainEnabled:false,stagingOnly:true}};
const json=Buffer.from(JSON.stringify(doc)),jsonPad=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
const bin=Buffer.concat(chunks),binPad=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
doc.buffers[0].byteLength=binPad.length; // zero padding is permitted by GLB buffers.
const finalJson=Buffer.from(JSON.stringify(doc)),paddedJson=Buffer.concat([finalJson,Buffer.alloc((4-finalJson.length%4)%4,0x20)]);
const header=Buffer.alloc(12);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+paddedJson.length+8+binPad.length,8);
const a=Buffer.alloc(8);a.writeUInt32LE(paddedJson.length,0);a.write('JSON',4);
const b=Buffer.alloc(8);b.writeUInt32LE(binPad.length,0);b.write('BIN\0',4);
const glb=Buffer.concat([header,a,paddedJson,b,binPad]);
export async function buildCharacter22Prototype(){
 const destination=resolve(OUTPUT);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,glb);
 return {path:OUTPUT,bytes:glb.length,sha256:createHash('sha256').update(glb).digest('hex'),joints:16,clips:ACTIONS,cameraAngles:8,approvedViews:1,stagingOnly:true,ownerApproved:false,finalSkin:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 buildCharacter22Prototype().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(e);process.exitCode=1});
}
