// GMWW Arena 3D - minimal, dependency-free GLB reader for simple static props (GĐ50).
// Supports: glTF 2.0 binary, node tree (matrix or TRS), triangle meshes with POSITION/NORMAL/(COLOR_0)/indices,
// pooled materials (baseColorFactor, emissiveFactor, alpha). It deliberately REFUSES animations, skins, cameras and
// external buffers/URIs so a model file can never pull a network resource or run code. Textures are not read yet.
export const GLB_LITE_VERSION='gmww.glb-lite.1';
const MAGIC=0x46546c67,JSON_CHUNK=0x4e4f534a,BIN_CHUNK=0x004e4942;
const COMP={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const NUM={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
export function parseGlb(buffer,{maxBytes=3*1024*1024,maxTriangles=20000}={}){
  if(!(buffer instanceof ArrayBuffer))throw Error('GLB: cần ArrayBuffer');
  if(buffer.byteLength>maxBytes)throw Error('GLB: file quá lớn');
  const view=new DataView(buffer);
  if(buffer.byteLength<20||view.getUint32(0,true)!==MAGIC||view.getUint32(4,true)!==2)throw Error('GLB: không phải glTF 2.0 binary');
  if(view.getUint32(8,true)!==buffer.byteLength)throw Error('GLB: độ dài không khớp');
  let json=null,bin=null,offset=12;
  while(offset+8<=buffer.byteLength){
    const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true),start=offset+8;
    if(start+length>buffer.byteLength)throw Error('GLB: chunk vượt quá file');
    if(type===JSON_CHUNK&&!json)json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,start,length)));
    else if(type===BIN_CHUNK&&!bin)bin=buffer.slice(start,start+length);
    offset=start+((length+3)&~3);
  }
  if(!json)throw Error('GLB: thiếu JSON');
  for(const banned of ['animations','skins','cameras'])if(Array.isArray(json[banned])&&json[banned].length)throw Error('GLB: không hỗ trợ '+banned);
  if((json.buffers||[]).some(b=>b.uri))throw Error('GLB: không cho phép buffer ngoài (uri)');
  if((json.images||[]).length)throw Error('GLB: texture chưa được hỗ trợ ở bản này');
  return {json,bin};
}
function accessor(json,bin,index){
  const a=json.accessors[index],bv=json.bufferViews[a.bufferView],Type=COMP[a.componentType],n=NUM[a.type];
  if(!Type||!n)throw Error('GLB: accessor không hỗ trợ');
  const bytes=Type.BYTES_PER_ELEMENT,stride=bv.byteStride||bytes*n,start=(bv.byteOffset||0)+(a.byteOffset||0);
  if(start+stride*(a.count-1)+bytes*n>bin.byteLength)throw Error('GLB: accessor vượt buffer');
  const out=new Type(a.count*n);
  if(stride===bytes*n&&start%bytes===0){out.set(new Type(bin,start,a.count*n));return {array:out,itemSize:n,normalized:!!a.normalized}}
  const src=new DataView(bin);
  for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){
    const p=start+i*stride+k*bytes;
    out[i*n+k]=Type===Float32Array?src.getFloat32(p,true):Type===Uint16Array?src.getUint16(p,true):Type===Uint32Array?src.getUint32(p,true):
      Type===Uint8Array?src.getUint8(p):Type===Int16Array?src.getInt16(p,true):src.getInt8(p);
  }
  return {array:out,itemSize:n,normalized:!!a.normalized};
}
// Build a THREE.Group from a parsed GLB. Returns {root,triangles,materials,geometries,dispose}.
export function buildGlbGroup(THREE,{json,bin},{maxTriangles=20000,name='glb'}={}){
  const mats=(json.materials||[]).map((m,i)=>{
    const pbr=m.pbrMetallicRoughness||{},c=pbr.baseColorFactor||[1,1,1,1],e=m.emissiveFactor||[0,0,0];
    const glowing=e.some(v=>v>0);
    const mat=new THREE.MeshLambertMaterial({color:new THREE.Color().setRGB(c[0],c[1],c[2],THREE.LinearSRGBColorSpace),
      emissive:glowing?new THREE.Color().setRGB(e[0],e[1],e[2],THREE.LinearSRGBColorSpace):new THREE.Color(0),
      transparent:c[3]<1||m.alphaMode==='BLEND',opacity:c[3],side:m.doubleSided?THREE.DoubleSide:THREE.FrontSide});
    mat.name=m.name||'material-'+i;if(glowing)mat.userData.glow=true;return mat;
  });
  const fallback=new THREE.MeshLambertMaterial({color:'#cccccc'});
  const geos=[];let triangles=0;
  const root=new THREE.Group();root.name=name;
  const nodes=json.nodes||[];
  const make=index=>{
    const n=nodes[index],obj=new THREE.Group();obj.name=n.name||'node-'+index;
    if(n.matrix)obj.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));
    else{
      if(n.translation)obj.position.fromArray(n.translation);
      if(n.rotation)obj.quaternion.fromArray(n.rotation);
      if(n.scale)obj.scale.fromArray(n.scale);
    }
    if(n.mesh!=null){
      for(const prim of json.meshes[n.mesh].primitives){
        if((prim.mode??4)!==4)throw Error('GLB: chỉ hỗ trợ tam giác');
        const g=new THREE.BufferGeometry(),pos=accessor(json,bin,prim.attributes.POSITION);
        g.setAttribute('position',new THREE.BufferAttribute(pos.array,3));
        if(prim.attributes.NORMAL){const nr=accessor(json,bin,prim.attributes.NORMAL);g.setAttribute('normal',new THREE.BufferAttribute(nr.array,3))}
        if(prim.indices!=null){const ix=accessor(json,bin,prim.indices);g.setIndex(new THREE.BufferAttribute(ix.array,1));triangles+=ix.array.length/3}
        else triangles+=pos.array.length/9;
        if(!prim.attributes.NORMAL)g.computeVertexNormals();
        if(triangles>maxTriangles)throw Error('GLB: quá nhiều tam giác ('+triangles+')');
        geos.push(g);
        const mesh=new THREE.Mesh(g,prim.material!=null?mats[prim.material]:fallback);
        mesh.name=obj.name;obj.add(mesh);
      }
    }
    for(const c of n.children||[])obj.add(make(c));
    return obj;
  };
  const scene=json.scenes?.[json.scene??0];
  for(const i of scene?.nodes||[])root.add(make(i));
  return {root,triangles,materials:mats,geometries:geos,
    dispose(){for(const g of geos)g.dispose();for(const m of mats)m.dispose();fallback.dispose()}};
}
export async function loadGlb(THREE,url,options={}){
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw Error('GLB: không tải được '+url);
  return buildGlbGroup(THREE,parseGlb(await response.arrayBuffer(),options),options);
}
