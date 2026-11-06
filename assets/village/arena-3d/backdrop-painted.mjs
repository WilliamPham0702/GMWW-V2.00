// GĐ52b - Nền "tranh vẽ 2.5D": dùng đúng tranh làng GMWW (ngày/đêm) phủ kín khung như màn 2D, nên ghế 2D khớp 100%.
// Thêm chiều sâu bằng camera phối cảnh lắc nhẹ, ánh lửa nhấp nháy, cánh hoa bay và chuyển Ngày/Đêm mượt.
// Không đọc dữ liệu game; ảnh tranh là ảnh công khai sẵn có của làng.
export const PAINTED_VERSION='gmww.backdrop.painted.1';
export const PAINTED_FIRE={x:50.3,y:49.2}; // vị trí lửa trong tranh mặc định v260 (% khung); app có thể gửi vị trí đã hiệu chỉnh
const DAY='../../backgrounds/gmww-village-day-v260.webp',NIGHT='../../backgrounds/gmww-village-night-v260.webp';
export function createPaintedStage(THREE,scene,renderer){
  const camera=new THREE.PerspectiveCamera(30,1,.1,100),FOV=30;let W=1,H=1,fade=0,target=0,night=false,fire={...PAINTED_FIRE};
  const loader=new THREE.TextureLoader(),max=renderer.capabilities.getMaxAnisotropy?.()||1;
  const load=url=>loader.load(new URL(url,import.meta.url).href,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,max)});
  const day=load(DAY),dark=load(NIGHT);
  const mat=(t,o)=>new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:o,depthWrite:false});
  const dayMat=mat(day,1),nightMat=mat(dark,0);
  const geo=new THREE.PlaneGeometry(1,1),dayMesh=new THREE.Mesh(geo,dayMat),nightMesh=new THREE.Mesh(geo,nightMat);
  nightMesh.position.z=.001;scene.add(dayMesh,nightMesh);
  // ánh lửa
  const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,2,64,64,64);
    r.addColorStop(0,'rgba(255,214,130,.95)');r.addColorStop(.35,'rgba(255,150,60,.45)');r.addColorStop(1,'rgba(255,120,40,0)');g.fillStyle=r;g.fillRect(0,0,128,128);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const glow=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:glowTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.5}));
  glow.position.z=.01;scene.add(glow);
  // cánh hoa bay
  const N=36,pos=new Float32Array(N*3),seed=Array.from({length:N},(_,i)=>({x:(i*.6180339)%1,y:(i*.4142)%1,s:.4+((i*7)%10)/14,p:i}));
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const petalTex=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');g.fillStyle='#ff9fc4';g.beginPath();g.ellipse(16,16,6,11,.6,0,7);g.fill();
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t})();
  const petals=new THREE.Points(pg,new THREE.PointsMaterial({map:petalTex,size:.02,transparent:true,depthWrite:false,sizeAttenuation:true,opacity:.85}));
  petals.position.z=.02;scene.add(petals);
  function layout(){
    const h=2*Math.tan(FOV*Math.PI/360)*5,w=h*W/H; // mặt phẳng tại z=0, camera cách 5
    camera.aspect=W/H;camera.position.z=5;camera.updateProjectionMatrix();
    // hơi lớn hơn khung 5% để lắc camera không lộ mép
    for(const m of [dayMesh,nightMesh])m.scale.set(w*1.05,h*1.05,1);
    glow.scale.set(w*.34,h*.2,1);glow.position.x=(fire.x-50)/100*w*1.05;glow.position.y=(50-fire.y)/100*h*1.05;
    petals.material.size=h*.03;petals.userData={w,h};
  }
  function animate(now,reduced){
    fade+=(target-fade)*.08;dayMat.opacity=1;nightMat.opacity=fade;
    const t=now/1000,sw=reduced?0:1;
    camera.position.x=Math.sin(t*.23)*.05*sw;camera.position.y=Math.cos(t*.19)*.035*sw;camera.lookAt(0,0,0);
    glow.material.opacity=(night?.75:.35)*(.85+.15*Math.sin(t*9)+.05*Math.sin(t*23));
    const {w,h}=petals.userData;
    for(let i=0;i<N;i++){const s=seed[i],k=(t*.03*s.s+s.y)%1;
      pos[i*3]=((s.x+Math.sin(t*.4+s.p)*.03-.5+k*.12)%1)*w;pos[i*3+1]=(.5-k)*h;pos[i*3+2]=0}
    pg.attributes.position.needsUpdate=!reduced||true;petals.visible=!reduced;
  }
  return {glow,camera,animate,resize(w,h){W=w;H=h;layout()},setNight(v){night=!!v;target=night?1:0},setFire(x,y){if(Number.isFinite(x)&&Number.isFinite(y)){fire={x:Math.min(100,Math.max(0,x)),y:Math.min(100,Math.max(0,y))};layout()}},get night(){return night},version:PAINTED_VERSION,
    dispose(){geo.dispose();for(const t of [day,dark,glowTex,petalTex])t.dispose();for(const m of [dayMat,nightMat,glow.material,petals.material])m.dispose()}};
}
