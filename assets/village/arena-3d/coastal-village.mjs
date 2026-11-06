// GMWW Arena 3D — sea village in the style of the painted 2D village: stone plaza with a blue ring,
// timber houses with blue roofs, striped market stalls, lanterns, banners, flowers, palms and sea.
// One shared stage for Day and Night. Everything is instanced; the plaza/banner/awning/sky textures are
// drawn once on a small canvas (no network fetch). Without a canvas (tests) plain colours are used.
export const COASTAL_VILLAGE_VERSION='coastal-day-night-v2-painted';
const PI=Math.PI, TAU=PI*2;
const canvasOk=()=>typeof document!=='undefined'&&typeof document.createElement==='function';
function paintCanvas(size,w,h,draw){
  const c=document.createElement('canvas');c.width=w||size;c.height=h||size;
  const g=c.getContext('2d');if(!g)return null;draw(g,c.width,c.height);return c;
}
// Stone plaza: pale paving, radial brick joints, two blue/gold ring bands and four compass diamonds.
function plazaCanvas(){
  return paintCanvas(1024,1024,1024,(g,W)=>{
    const C=W/2,R=W/2;
    g.fillStyle='#ecd9ab';g.fillRect(0,0,W,W);
    for(let i=0;i<5200;i++){const a=Math.random()*TAU,r=Math.sqrt(Math.random())*R;
      g.fillStyle=Math.random()<.5?'rgba(190,160,110,.10)':'rgba(255,248,226,.14)';
      g.fillRect(C+Math.cos(a)*r,C+Math.sin(a)*r,10+Math.random()*16,8+Math.random()*12)}
    g.strokeStyle='rgba(150,120,78,.45)';g.lineWidth=2;
    for(let r=.07;r<=1.001;r+=.06){g.beginPath();g.arc(C,C,r*R,0,TAU);g.stroke();
      const n=Math.max(8,Math.floor(TAU*r*R/46)),off=(Math.round(r*100)%2)*.5;
      for(let i=0;i<n;i++){const a=(i+off)/n*TAU;g.beginPath();
        g.moveTo(C+Math.cos(a)*(r-.06)*R,C+Math.sin(a)*(r-.06)*R);
        g.lineTo(C+Math.cos(a)*r*R,C+Math.sin(a)*r*R);g.stroke()}}
    const band=(r0,r1)=>{
      g.lineWidth=(r1-r0)*R;g.strokeStyle='#8fa9d6';g.setLineDash([R*.22,R*.05]);
      g.beginPath();g.arc(C,C,(r0+r1)/2*R,0,TAU);g.stroke();g.setLineDash([]);
      g.lineWidth=5;g.strokeStyle='#e0b25a';
      for(const r of [r0,r1]){g.beginPath();g.arc(C,C,r*R,0,TAU);g.stroke()}};
    band(.36,.41);band(.64,.69);
    g.lineWidth=6;g.strokeStyle='#e0b25a';g.beginPath();g.arc(C,C,.96*R,0,TAU);g.stroke();
    for(let k=0;k<4;k++){const a=k*PI/2,x=C+Math.cos(a)*.665*R,y=C+Math.sin(a)*.665*R,s=R*.075;
      g.save();g.translate(x,y);g.rotate(PI/4);g.fillStyle='#e0b25a';g.fillRect(-s,-s,2*s,2*s);
      g.fillStyle='#6f93cf';g.fillRect(-s*.7,-s*.7,1.4*s,1.4*s);g.restore()}
    // soft fall-off to the sand rim
    const grd=g.createRadialGradient(C,C,R*.9,C,C,R);
    grd.addColorStop(0,'rgba(236,217,171,0)');grd.addColorStop(1,'rgba(214,186,130,.55)');
    g.fillStyle=grd;g.fillRect(0,0,W,W);
  });
}
function bannerCanvas(){
  return paintCanvas(0,128,256,(g,W,H)=>{
    g.fillStyle='#2f5fb4';g.fillRect(0,0,W,H);
    g.fillStyle='#e0b25a';g.fillRect(0,0,W,10);g.fillRect(0,H-10,W,10);
    g.translate(W/2,H/2);g.fillStyle='#eef6ff';
    for(let k=0;k<8;k++){g.rotate(PI/4);g.beginPath();g.moveTo(0,-8);g.lineTo(-7,-W*.32);g.lineTo(0,-W*.46);g.lineTo(7,-W*.32);g.closePath();g.fill()}
  });
}
function awningCanvas(){
  return paintCanvas(0,128,64,(g,W,H)=>{
    for(let i=0;i<8;i++){g.fillStyle=i%2?'#f4efe2':'#3d6fc4';g.fillRect(i*W/8,0,W/8,H)}
  });
}
function skyCanvas(top,mid,low){
  return paintCanvas(0,8,256,(g,W,H)=>{
    const grd=g.createLinearGradient(0,0,0,H);grd.addColorStop(0,top);grd.addColorStop(.55,mid);grd.addColorStop(1,low);
    g.fillStyle=grd;g.fillRect(0,0,W,H);
  });
}
export function createCoastalVillage(THREE,scene){
  const root=new THREE.Group();root.name='arena-tropical-village';scene.add(root);
  const resources=new Set(),materials=[],meshes=[],textures=[];
  const tex=(canvas,repeat)=>{
    if(!canvas)return null;
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
    if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping}
    textures.push(t);return t;
  };
  const material=(hex,{emissive,transparent=false,opacity=1,map=null}={})=>{
    const m=new THREE.MeshLambertMaterial({color:hex,...(emissive?{emissive}:{}),transparent,opacity,...(map?{map}:{})});
    materials.push(m);return m;
  };
  const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1,rotate=0)=>{
    resources.add(geo);
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
    o.rotation.y=rotate;o.frustumCulled=false;root.add(o);meshes.push(o);return o;
  };
  const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),axis=new THREE.Vector3(0,1,0);
  const batch=(geo,mat,transforms,colors)=>{
    resources.add(geo);
    const inst=new THREE.InstancedMesh(geo,mat,transforms.length);
    inst.frustumCulled=false;
    const tint=new THREE.Color();
    for(let i=0;i<transforms.length;i++){
      const [x,y,z,sx=1,sy=1,sz=1,angle=0]=transforms[i];
      p.set(x,y,z);sc.set(sx,sy,sz);q.setFromAxisAngle(axis,angle);
      matrix.compose(p,q,sc);inst.setMatrixAt(i,matrix);
      if(colors)inst.setColorAt(i,tint.set(colors[i%colors.length]));
    }
    inst.instanceMatrix.needsUpdate=true;
    if(colors&&inst.instanceColor)inst.instanceColor.needsUpdate=true;
    root.add(inst);meshes.push(inst);return inst;
  };
  const useTex=canvasOk();
  const plazaMap=useTex?tex(plazaCanvas()):null,bannerMap=useTex?tex(bannerCanvas()):null,awningMap=useTex?tex(awningCanvas()):null;
  const daySky=useTex?tex(skyCanvas('#3f9be6','#8fd0f5','#e6f6ff')):null,nightSky=useTex?tex(skyCanvas('#070f26','#13294f','#2b4a76')):null;
  // Materials (pooled). Day/night only tints these; geometry never changes.
  const sand=material('#efd19b'),sea=material('#2fb6cf'),foam=material('#c4fbef',{transparent:true,opacity:.85}),
    cliff=material('#cdb58c'),foliage=material('#2fa86f'),trunk=material('#8f6240'),
    roof=material('#3d68bf'),wall=material('#f7e3c2'),wood=material('#7b5738'),beam=material('#5d4029'),
    stone=material('#c4baa6'),paving=material('#ffffff',{map:plazaMap}),
    banner=material('#ffffff',{map:bannerMap}),awning=material('#ffffff',{map:awningMap}),
    flowers=material('#ffffff'),hillGreen=material('#4aa56e'),
    fireMat=material('#ffa043',{emissive:'#ff9419'}),lantern=material('#ffe6a5',{emissive:'#ffd279'}),
    moonMat=new THREE.MeshBasicMaterial({color:'#fff2c2'}),starMat=new THREE.MeshBasicMaterial({color:'#c4e8ff'});
  materials.push(moonMat,starMat);
  const ocean=add(new THREE.CylinderGeometry(125,125,.06,64),sea,0,-.43,-20);
  const beach=add(new THREE.CylinderGeometry(11.6,11.9,.37,56),sand,0,-.23,0);
  const plaza=add(new THREE.CircleGeometry(11,72),paving,0,-.035,0);
  plaza.rotation.x=-PI/2;
  const rim=batch(new THREE.TorusGeometry(11.55,.1,4,72),foam,[[0,-.02,0,1,1,1,0]]);
  // Rocky shore and distant islands.
  const rocks=[];
  for(let i=0;i<14;i++){const a=TAU*i/14;rocks.push([11.9*Math.cos(a),-.07,11.9*Math.sin(a),.6,.34,.66,a])}
  rocks.push([-14,-.2,-20,3.4,3.4,2.8,0],[17,-.3,-26,5.6,4.8,3.6,.5]);
  batch(new THREE.IcosahedronGeometry(1,0),cliff,rocks);
  // Stone fire pit (fire stays at the same coordinates in Day/Night).
  batch(new THREE.SphereGeometry(.4,6,5),stone,
    Array.from({length:17},(_,i)=>{const a=TAU*i/17;return [1.7*Math.cos(a),.05,1.8*Math.sin(a),1,.55,1,a]}));
  const fire=add(new THREE.ConeGeometry(.34,.88,7),fireMat,0,.47,1.8);
  batch(new THREE.CylinderGeometry(.11,.14,1.18,5),wood,[[-.24,.09,1.8,1,1,1,1.2],[.24,.09,1.8,1,1,1,-1.1]]);
  // Low stone wall around the plaza with gaps for the pier (north) and the stairs (south).
  const wallSeg=[],pillars=[];
  for(let i=0;i<54;i++){
    const th=TAU*i/54,x=Math.cos(th)*11.0,z=Math.sin(th)*11.0;
    if(z<-7.5&&Math.abs(x+2.8)<3.4)continue;
    if(z>7.5&&Math.abs(x)<2.9)continue;
    const a=-th-PI/2;
    wallSeg.push([x,.24,z,1.35,.55,.42,a]);
    if(i%6===0)pillars.push([x,.46,z,.5,1,.5,a]);
  }
  batch(new THREE.BoxGeometry(1,1,1),stone,wallSeg);
  batch(new THREE.BoxGeometry(1,1,1),stone,pillars);
  // Stairs to the south sea edge and the timber pier to the north.
  const stairs=[];
  for(let i=0;i<4;i++)stairs.push([0,.0-.05*i,11.3+i*.5,5.4-i*.5,.14,.55,0]);
  // Timber houses (white walls, dark beams, blue roofs) behind the plaza.
  const houses=[[-12.6,-5.2,2.3,.55],[12.8,-4.4,2.5,-.55],[-9.4,-11.2,2,.25],[9.8,-10.8,2.1,-.25],
    [-13.6,3.6,2.1,1.25],[13.7,4.4,2.2,-1.25],[-14.4,-11.5,1.8,.4],[14.8,-11,1.9,-.4]];
  batch(new THREE.BoxGeometry(1,1,1),wall,houses.map(([x,z,w,a])=>[x,1.1,z,w,2.2,w*.8,a]));
  batch(new THREE.ConeGeometry(1,1,4),roof,houses.map(([x,z,w,a])=>[x,2.75,z,w*1.12,.95,w*.9,PI/4+a]));
  const beams=[];
  for(const [x,z,w,a] of houses){
    const c=Math.cos(a),s=Math.sin(a);
    for(const [dx,dz] of [[-.5,-.4],[.5,-.4],[-.5,.4],[.5,.4]]){
      const lx=dx*w,lz=dz*w;beams.push([x+lx*c+lz*s,1.12,z-lx*s+lz*c,.14,2.26,.14,a]);
    }
    beams.push([x,1.8,z,w*1.02,.1,w*.82,a]);
  }
  batch(new THREE.BoxGeometry(1,1,1),beam,beams);
  // Pier.
  const planks=[],posts=[];
  for(let i=0;i<11;i++){
    const z=-11.2-i*1.12;
    planks.push([-2.8,.13,z,3.4,.13,.95]);
    if(i%2===0)posts.push([-4.5,-.04,z,.22,.68,.24],[-1.1,-.04,z,.22,.68,.24]);
  }
  batch(new THREE.BoxGeometry(1,1,1),wood,planks.concat(stairs));
  batch(new THREE.CylinderGeometry(.5,.5,1,6),wood,posts);
  // Market stalls with striped awnings, counters and posts, facing the fire.
  const stalls=[[-10.2,6.4],[10.1,7.2],[-6.6,10.3],[6.9,10.7],[-11.2,-1],[11.4,-0.4]];
  const awn=[],counter=[],stallPosts=[];
  for(const [x,z] of stalls){
    const a=Math.atan2(-x,-z),c=Math.cos(a),s=Math.sin(a);
    awn.push([x,1.75,z,2.5,.09,1.5,a]);counter.push([x,.45,z,2.2,.9,.7,a]);
    for(const [dx,dz] of [[-1.15,-.65],[1.15,-.65],[-1.15,.65],[1.15,.65]])
      stallPosts.push([x+dx*c+dz*s,.88,z-dx*s+dz*c,.1,1.76,.1,a]);
  }
  batch(new THREE.BoxGeometry(1,1,1),awning,awn);
  batch(new THREE.BoxGeometry(1,1,1),wood,counter);
  batch(new THREE.BoxGeometry(1,1,1),beam,stallPosts);
  // Planters: barrels with flowers near houses and stalls.
  const barrels=[],bloom=[];
  const planterSpots=[[-8.6,-8],[8.8,-7.6],[-11.6,-8.6],[11.8,-8.2],[-10.6,9],[10.4,9.6],[-4.8,11.6],[4.8,11.8],[-12.2,0.8],[12.6,1.2],[-7.8,-11.8],[7.8,-12]];
  const palette=['#ff6f91','#ffd166','#ff8a3d','#f7f3ea','#e63946','#ffb3c7'];
  planterSpots.forEach(([x,z],i)=>{
    barrels.push([x,.3,z,.4,.6,.4,0]);
    for(let k=0;k<5;k++){const a=k*TAU/5+i;bloom.push([x+Math.cos(a)*.26,.72+(k%2)*.08,z+Math.sin(a)*.26,.15,.15,.15,0])}
  });
  batch(new THREE.CylinderGeometry(1,.85,1,8),wood,barrels);
  batch(new THREE.SphereGeometry(1,6,5),flowers,bloom,palette);
  // Lantern posts around the plaza.
  const lampPositions=[],lampPosts=[];
  for(let i=0;i<10;i++){
    const th=TAU*(i+.5)/10,x=Math.cos(th)*10.3,z=Math.sin(th)*10.3;
    if(z<-7.5&&Math.abs(x+2.8)<3.6)continue;
    lampPosts.push([x,1.05,z,.08,2.1,.08,0]);lampPositions.push([x,2.15,z]);
  }
  batch(new THREE.CylinderGeometry(1,1.3,1,6),wood,lampPosts);
  batch(new THREE.SphereGeometry(.22,7,5),lantern,lampPositions.map(([x,y,z])=>[x,y,z]));
  // Compass banners at four posts.
  const banners=[[0,-10.8],[0,11.4],[-11.4,.6],[11.4,.6]].map(([x,z])=>[x,2.5,z,1,1,1,Math.atan2(-x,-z)]);
  batch(new THREE.BoxGeometry(.85,1.5,.04),banner,banners);
  batch(new THREE.CylinderGeometry(.05,.05,1,5),wood,banners.map(([x,,z])=>[x,1.8,z,1,3.1,1,0]));
  // Palms: tall trunks and fan leaves (cone leaves pointing outward from the crown).
  const palms=[[-14.2,-1.6,3.4],[14.6,-.4,3.7],[-12.6,9,3],[12.8,8.8,3.4],[-9.2,-14,2.8],[10.6,-14.5,3.2],[-5.4,13.6,3],[5.8,13.8,3.2]];
  batch(new THREE.CylinderGeometry(.11,.22,1,6),trunk,palms.map(([x,z,h])=>[x,h/2,z,1,h,1,.1]));
  const leaves=[];
  for(const [x,z,h] of palms){for(let j=0;j<7;j++){const a=TAU*j/7+x;leaves.push([x,h,z,.55,.12,1.9,a])}}
  const leafGeo=new THREE.ConeGeometry(.5,1,4);leafGeo.rotateX(PI/2);leafGeo.translate(0,0,.5);
  batch(leafGeo,foliage,leaves);
  // Distant hills and a small town with blue roofs and a lighthouse tower (never inside the seat ring).
  batch(new THREE.SphereGeometry(1,10,6),hillGreen,[[-30,-1,-44,16,8,9,0],[26,-1,-48,18,9,10,0],[-6,-2,-60,22,7,9,0]]);
  const farHouses=[[-30,-38,2.2],[-26,-40,1.8],[-22,-37,2],[24,-42,2.1],[28,-44,2.4],[21,-45,1.8],[-8,-54,2.2],[-3,-56,2.5]];
  batch(new THREE.BoxGeometry(1,1,1),wall,farHouses.map(([x,z,w])=>[x,5.4+w*.4,z,w,w*.9,w,0]));
  batch(new THREE.ConeGeometry(1,1,4),roof,farHouses.map(([x,z,w])=>[x,5.4+w*.4+w*.85,z,w*.9,w*.7,w*.9,PI/4]));
  batch(new THREE.BoxGeometry(1,1,1),stone,[[18,3,-30,1.8,6,1.8,0]]);
  batch(new THREE.ConeGeometry(1,1,6),roof,[[18,7.3,-30,1.5,1.7,1.5,0]]);
  // One moon and a few stars: night only.
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
    sea.color.set(night?'#0a3156':'#2fb6cf');
    sand.color.set(night?'#998f9c':'#efd19b');
    foam.color.set(night?'#4e91a7':'#c4fbef');
    foliage.color.set(night?'#1c5a53':'#2fa86f');
    roof.color.set(night?'#26407a':'#3d68bf');
    wall.color.set(night?'#947f78':'#f7e3c2');
    cliff.color.set(night?'#526178':'#cdb58c');
    paving.color.set(night?'#7e86b3':'#ffffff');
    awning.color.set(night?'#8088b0':'#ffffff');banner.color.set(night?'#8088b0':'#ffffff');
    hillGreen.color.set(night?'#1d4a4a':'#4aa56e');
    sunlight.intensity=night?.25:1.8;
    ambient.intensity=night?.54:1.55;
    fireLight.intensity=night?16:5;
    lantern.emissive.set(night?'#ffc168':'#322217');
    lantern.color.set(night?'#ffdf9f':'#bca878');
    moon.visible=night;starMesh.visible=night&&!lowPower;
    fireMat.emissiveIntensity=night?1.6:.8;
    const sky=night?nightSky:daySky;
    scene.background=sky||new THREE.Color(night?'#10233f':'#8bd5f0');
  }
  function setQuality(reduced){lowPower=reduced===true;starMesh.visible=night&&!lowPower}
  function animate(now){
    if(lowPower)return;
    fire.scale.y=.91+.08*Math.sin(now*.004);
    fire.rotation.y=now*.0005;
    ocean.position.y=-.43+Math.sin(now*.0011)*.012;
    rim.scale.setScalar(1+Math.sin(now*.0013)*.006);
  }
  function dispose(){
    scene.remove(root);
    for(const m of materials)m.dispose();
    for(const g of resources)g.dispose();
    for(const t of textures)t.dispose();
  }
  setNight(false);
  return {setNight,setQuality,animate,dispose,get night(){return night},
    get staticDrawBudget(){return meshes.length},get lanternCount(){return lampPositions.length},
    get sky(){return night?'night':'day'},get nightLightCount(){return fireLight?1:0},
    get textured(){return useTex}};
}
