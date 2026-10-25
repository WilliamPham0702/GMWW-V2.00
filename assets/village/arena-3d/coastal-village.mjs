// GMWW Arena 3D — low-poly tropical sea village, one shared stage for Day and Night.
// Static instanced scene pieces, no texture fetches, no separate Day/Night asset download.
export const COASTAL_VILLAGE_VERSION='coastal-day-night-v1';
const PI=Math.PI, TAU=PI*2;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function createCoastalVillage(THREE,scene){
  const root=new THREE.Group();root.name='arena-tropical-village';scene.add(root);
  const resources=new Set(),materials=[],meshes=[];
  const material=(hex,{emissive,transparent=false,opacity=1}={})=>{
    const m=new THREE.MeshLambertMaterial({color:hex,...(emissive?{emissive}:{}) ,transparent,opacity});
    materials.push(m);return m;
  };
  const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1,rotate=0)=>{
    resources.add(geo);
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
    o.rotation.y=rotate;o.frustumCulled=false;root.add(o);meshes.push(o);return o;
  };
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0);
  const batch=(geo,mat,transforms)=>{
    resources.add(geo);
    const inst=new THREE.InstancedMesh(geo,mat,transforms.length);
    inst.frustumCulled=false;
    for(let i=0;i<transforms.length;i++){
      const [x,y,z,sx=1,sy=1,sz=1,angle=0]=transforms[i];
      p.set(x,y,z);sc.set(sx,sy,sz);q.setFromAxisAngle(axis,angle);
      matrix.compose(p,q,sc);inst.setMatrixAt(i,matrix);
    }
    inst.instanceMatrix.needsUpdate=true;
    root.add(inst);meshes.push(inst);return inst;
  };
  // The usable sandy village circle is clear: all 6–30 characters remain visible.
  const sand=material('#efd19b'),sea=material('#30bec9'),foam=material('#b0f7e7',{transparent:true,opacity:.85}),
    cliff=material('#d1b78b'),foliage=material('#34b77f'),trunk=material('#97673f'),roof=material('#42667c'),
    wall=material('#f6ddbb'),wood=material('#876448'),stone=material('#b9b0a0'),
    fireMat=material('#ffa043',{emissive:'#ff9419'}),lantern=material('#ffe6a5',{emissive:'#ffd279'}),
    moonMat=new THREE.MeshBasicMaterial({color:'#fff2c2'}),starMat=new THREE.MeshBasicMaterial({color:'#c4e8ff'});
  materials.push(moonMat,starMat);
  const ocean=add(new THREE.CylinderGeometry(125,125,.06,64),sea,0,-.43,-20);
  const beach=add(new THREE.CylinderGeometry(11.35,11.6,.37,56),sand,0,-.23,0);
  // Background is always outside the central seating circle; dock is toward the sea.
  batch(new THREE.TorusGeometry(10.7,.09,4,64),foam,[[0,-.025,0,1,1,1,0]]);
  // Rocky shores and distant islands; low-poly shapes and pooled materials.
  const rocks=[];
  for(let i=0;i<13;i++){const a=TAU*i/13;rocks.push([11.4*Math.cos(a),-.07,11.4*Math.sin(a),.62, .35,.68,a])}
  rocks.push([-12,-.18,-18,3.1,3.2,2.6,0],[15,-.28,-24,5.2,4.6,3.5,.5]);
  batch(new THREE.IcosahedronGeometry(1,0),cliff,rocks);
  batch(new THREE.SphereGeometry(.4,6,5),stone,
    Array.from({length:17},(_,i)=>{let a=TAU*i/17;return [1.7*Math.cos(a),.04,1.8*Math.sin(a),1,.5,1,a]}));
  // Fire, always fixed at the same coordinates in Day/Night and for the GM menu.
  const fire=add(new THREE.ConeGeometry(.34,.88,7),fireMat,0,.47,1.8);
  batch(new THREE.CylinderGeometry(.11,.14,1.18,5),wood,
    [[-.24,.09,1.8,1,1,1,1.2],[.24,.09,1.8,1,1,1,-1.1]]);
  // Huts / roofs occupy the edges and upper slope instead of hiding characters.
  const houses=[[-9.4,0,-6.6,1.9], [9.3,0,-6.1,2.2],[-8.5,0,-10,1.6],[8.9,0,-9,1.6]];
  batch(new THREE.BoxGeometry(1,1,1),wall,houses.map(([x,y,z,w])=>[x,.8,z,w,1.5,w*.77]));
  batch(new THREE.ConeGeometry(1,1,4),roof,houses.map(([x,y,z,w])=>[x,1.95,z,w*.91,.98,w*.80,PI/4]));
  // Stilt pier across the beach toward the sea (northern edge of the illustration).
  const planks=[],posts=[];
  for(let i=0;i<11;i++){
    const z=-10.5-i*1.12;
    planks.push([-2.8,.13,z,3.4,.13,.95]);
    if(i%2===0)posts.push([-4.5,-.04,z,.22,.68,.24],[-1.1,-.04,z,.22,.68,.24]);
  }
  batch(new THREE.BoxGeometry(1,1,1),wood,planks);
  batch(new THREE.CylinderGeometry(.5,.5,1,6),wood,posts);
  // Palms: grouped geometry and three-dimensional leaves, placed outside seat radius.
  const palms=[[-10.1,-4.4,2.8],[10.4,-2.7,3],[-9.6,7.2,2.4],[10,6.4,2.9],
    [-7.8,-11.5,2.2],[8.9,-11.5,2.6],[-11,10,2.9],[11.2,10.6,2.4]];
  batch(new THREE.CylinderGeometry(.11,.21,1,6),trunk,
    palms.map(([x,z,h])=>[x,h/2,z,1,h,1,.1]));
  const leaves=[];
  for(const [x,z,h] of palms){for(let j=0;j<5;j++){
    const a=TAU*j/5;
    leaves.push([x+Math.cos(a)*.85,h+.1,z+Math.sin(a)*.85,.24,.07,1.2,a]);
  }}
  batch(new THREE.SphereGeometry(1,6,4),foliage,leaves);
  // Lanterns by pier and hut. Visible at night without per-object point lights.
  const lampPositions=[[-4.35,.74,-11.1],[-1.1,.74,-18],[8.2,.8,-6.2],[-8.5,.9,-6.8],[-8.7,.7,7.4],[8.9,.7,6.7]];
  const lampMesh=batch(new THREE.SphereGeometry(.22,7,5),lantern,
    lampPositions.map(([x,y,z])=>[x,y,z]));
  // One moon and a few stars: night only, no particle system, low heat budget.
  const moon=add(new THREE.SphereGeometry(1.15,12,8),moonMat,2.5,14,-37);
  const stars=[];
  for(let i=0;i<22;i++){stars.push([-25+(i*19%50),13+(i*11%13),-32-(i%5),.035,.035,.035])}
  const starMesh=batch(new THREE.SphereGeometry(1,5,4),starMat,stars);
  const fireLight=new THREE.PointLight('#ffac61',10,6);fireLight.position.set(0,1.05,1.8);root.add(fireLight);
  const sunlight=new THREE.DirectionalLight('#fff5d5',1.8);sunlight.position.set(-8,14,5);root.add(sunlight);
  const ambient=new THREE.AmbientLight('#d3ecff',1.55);root.add(ambient);
  let night=null,lowPower=false;
  function setNight(next){
    const desired=next===true;
    if(night===desired)return; // GĐ18: same public frame must not upload unchanged materials.
    night=desired;
    sea.color.set(night?'#0a3156':'#30bec9');
    sand.color.set(night?'#998f9c':'#efd19b');
    foam.color.set(night?'#4e91a7':'#b0f7e7');
    foliage.color.set(night?'#1c5a53':'#34b77f');
    roof.color.set(night?'#263f65':'#42667c');
    wall.color.set(night?'#947f78':'#f6ddbb');
    cliff.color.set(night?'#526178':'#d1b78b');
    sunlight.intensity=night?.25:1.8;
    ambient.intensity=night?.54:1.55;
    fireLight.intensity=night?16:5;
    lantern.emissive.set(night?'#ffc168':'#322217');
    lantern.color.set(night?'#ffdf9f':'#bca878');
    moon.visible=night;starMesh.visible=night;
    fireMat.emissiveIntensity=night?1.6:.8;
    scene.background=new THREE.Color(night?'#10233f':'#8bd5f0');
  }
  function setQuality(reduced){lowPower=reduced===true;starMesh.visible=night&&!lowPower}
  function animate(now){
    if(lowPower)return;
    fire.scale.y=.91+.08*Math.sin(now*.004);
    fire.rotation.y=now*.0005;
  }
  function dispose(){
    scene.remove(root);
    for(const m of materials)m.dispose();
    for(const g of resources)g.dispose();
  }
  setNight(false);
  return {setNight,setQuality,animate,dispose,get night(){return night},
    get staticDrawBudget(){return meshes.length},get lanternCount(){return lampPositions.length},
    get sky(){return night?'night':'day'},get nightLightCount(){return fireLight?1:0}};
}
