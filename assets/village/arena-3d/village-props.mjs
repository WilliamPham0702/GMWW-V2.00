// GMWW Arena 3D - GĐ50: gắn model GLB (ChatGPT dựng) vào làng.
// Mỗi loại model được "nướng" thành 1 geometry (màu vật liệu -> vertex color) + 1 geometry phát sáng,
// rồi vẽ bằng InstancedMesh: mọi bản sao của một loại chỉ tốn 1-2 draw call. Nếu tải lỗi, làng dựng bằng code vẫn giữ nguyên.
import {loadGlb} from './glb-lite.mjs';
export const VILLAGE_PROPS_VERSION='gmww.village-props.1';
const PI=Math.PI,TAU=PI*2;
export const PROP_FILES={house:'house-white-orange-roof',gate:'gate-arch',stairs:'stairs-white',dome:'dome-blue',
  stall:'stall-striped',umbrella:'umbrella-table',lamp:'lantern-post',banner:'banner-compass',planter:'planter-flowers',
  barrel:'barrel-flowers',campfire:'campfire-stone',boat:'sailboat',cypress:'tree-cypress',palm:'tree-palm'};
// Footprint radius (m) per type, used only to keep props from overlapping each other.
const FOOT={house:2.4,gate:2.3,stairs:2.3,dome:1.7,stall:1.9,umbrella:1.7,lamp:.45,banner:.5,planter:1.1,barrel:.5,
  campfire:1.1,boat:1.8,cypress:.7,palm:1.5};
const polar=(deg,r)=>[Math.cos(deg*PI/180)*r,Math.sin(deg*PI/180)*r];
const faceCenter=(x,z)=>Math.atan2(-x,-z); // front of every model is +Z
// Pure layout: no THREE, no DOM. Returns [{type,x,y,z,rot,scale}] with no overlaps and nothing inside the seat/plaza ring.
export function villagePlacements(){
  const out=[],hardFail=[];
  const free=(type,x,z)=>out.every(o=>Math.hypot(o.x-x,o.z-z)>=(FOOT[o.type]+FOOT[type])*.82);
  const put=(type,x,z,{rot=faceCenter(x,z),scale=1,y=0,force=false}={})=>{
    if(!force&&!free(type,x,z)){hardFail.push(type+'@'+x.toFixed(1)+','+z.toFixed(1));return false}
    out.push({type,x:+x.toFixed(3),y,z:+z.toFixed(3),rot:+rot.toFixed(4),scale});return true;
  };
  put('campfire',0,1.8,{rot:0,scale:1,force:true});
  put('gate',-2.8,-11.6,{rot:0,force:true});
  put('stairs',0,12.2,{rot:PI,force:true});
  for(const [deg,r,s] of [[-160,14.8,1.05],[-135,15.4,1.15],[-50,15.4,1.1],[-25,14.8,1.05],[150,14.9,1.1],[30,14.9,1.1]])
    put('house',...polar(deg,r),{scale:s});
  for(const deg of [-70,-112])put('dome',...polar(deg,16.2));
  for(const deg of [12,168,55,125])put('stall',...polar(deg,12.7));
  for(const deg of [72,108])put('umbrella',...polar(deg,13));
  // Lantern posts and banners along the plaza edge (same spots as the painted village).
  for(let i=0;i<10;i++){
    const [x,z]=polar(360*(i+.5)/10,10.3);
    if(z<-7.5&&Math.abs(x+2.8)<3.6)continue; // pier
    if(z>7.5&&Math.abs(x)<3)continue; // stairs
    put('lamp',x,z);
  }
  for(const [x,z] of [[0,-10.8],[-2.6,10.7],[2.6,10.7],[-11.4,.6],[11.4,.6]])put('banner',x,z);
  for(const deg of [35,145,-35,-145])put('planter',...polar(deg,10.9),{scale:.9});
  for(const [x,z] of [[-8.6,-8],[8.8,-7.6],[-10.6,9],[10.4,9.6],[-7.8,-11.8],[6.2,-12.6]])
    put('barrel',x,z,{scale:.85});
  for(const deg of [-15,-165,18,162,-60,-120,90])put('cypress',...polar(deg,17.6),{scale:.95+((deg%3+3)%3)*.06});
  for(const deg of [-8,-172,12,168,-95,-80,100,80])put('palm',...polar(deg,15.8+((Math.abs(deg)%2)*1.1)),{scale:.9+((Math.abs(deg)%4)*.05)});
  put('boat',9,-24,{rot:.6,y:-.36,force:true});put('boat',-13,-30,{rot:-.4,y:-.36,scale:1.2,force:true});
  return {items:out,skipped:hardFail};
}
// Merge one loaded GLB into {solid, glow}: material colour baked into vertex colours.
export function bakeGroup(THREE,group){
  group.updateMatrixWorld(true);
  const buckets={solid:{p:[],n:[],c:[],i:[],count:0},glow:{p:[],n:[],c:[],i:[],count:0,emissive:null}};
  group.traverse(o=>{
    if(!o.isMesh)return;
    const m=o.material,glow=m.userData?.glow===true,b=glow?buckets.glow:buckets.solid;
    const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);
    const pos=g.getAttribute('position'),nor=g.getAttribute('normal'),idx=g.getIndex();
    for(let k=0;k<pos.count;k++){
      b.p.push(pos.getX(k),pos.getY(k),pos.getZ(k));b.n.push(nor.getX(k),nor.getY(k),nor.getZ(k));
      b.c.push(m.color.r,m.color.g,m.color.b);
    }
    if(idx)for(let k=0;k<idx.count;k++)b.i.push(idx.getX(k)+b.count);
    else for(let k=0;k<pos.count;k++)b.i.push(k+b.count);
    b.count+=pos.count;
    if(glow&&!b.emissive)b.emissive=m.emissive.clone();
    g.dispose();
  });
  const make=b=>{
    if(!b.count)return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
    g.setIndex(new THREE.Uint32BufferAttribute(b.i,1));return g;
  };
  return {solid:make(buckets.solid),glow:make(buckets.glow),emissive:buckets.glow.emissive,
    triangles:(buckets.solid.i.length+buckets.glow.i.length)/3};
}
export async function installVillageProps(THREE,village,{base=new URL('./models/village/',import.meta.url).href,onStatus}={}){
  const loaded={},geos=[],mats=[],instances=[];
  const solidMat=new THREE.MeshLambertMaterial({vertexColors:true});
  const glowMat=new THREE.MeshLambertMaterial({vertexColors:true,emissive:new THREE.Color('#ffc168'),emissiveIntensity:.2});
  mats.push(solidMat,glowMat);
  const {items}=villagePlacements();
  const types=[...new Set(items.map(i=>i.type))];
  try{
    await Promise.all(types.map(async type=>{
      const model=await loadGlb(THREE,base+PROP_FILES[type]+'.glb',{name:type});
      loaded[type]=bakeGroup(THREE,model.root);model.dispose();
    }));
  }catch(error){onStatus?.('GLB lỗi, giữ làng dựng bằng code: '+String(error.message||error));
    for(const t of Object.values(loaded)){t.solid?.dispose();t.glow?.dispose()}solidMat.dispose();glowMat.dispose();return null}
  const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scl=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const holder=new THREE.Group();holder.name='arena-village-glb-props';village.root.add(holder);
  let glowSeen=null;
  for(const type of types){
    const list=items.filter(i=>i.type===type),baked=loaded[type];
    for(const [geo,mat] of [[baked.solid,solidMat],[baked.glow,glowMat]]){
      if(!geo)continue;geos.push(geo);
      const inst=new THREE.InstancedMesh(geo,mat,list.length);inst.frustumCulled=false;inst.name='props-'+type;
      list.forEach((it,k)=>{pos.set(it.x,it.y,it.z);quat.setFromAxisAngle(up,it.rot);scl.setScalar(it.scale);
        matrix.compose(pos,quat,scl);inst.setMatrixAt(k,matrix)});
      inst.instanceMatrix.needsUpdate=true;holder.add(inst);instances.push(inst);
    }
    if(baked.emissive&&!glowSeen)glowSeen=baked.emissive;
  }
  if(glowSeen)glowMat.emissive.copy(glowSeen);
  // Replace the procedural stand-ins that now have real models.
  village.hideGroups(['houses','stalls','planters','lamps','banners','palms','campfire']);
  village.onNight(night=>{
    solidMat.color.set(night?'#7f88b4':'#ffffff');
    glowMat.color.set(night?'#c9c3d8':'#ffffff');
    glowMat.emissiveIntensity=night?1.5:.15;
  });
  onStatus?.('Đã nạp '+instances.length+' lớp model GLB cho làng');
  return {instances,triangles:Object.values(loaded).reduce((a,b)=>a+b.triangles,0),
    get drawCalls(){return instances.length},
    dispose(){village.root.remove(holder);for(const g of geos)g.dispose();for(const m of mats)m.dispose()}};
}
