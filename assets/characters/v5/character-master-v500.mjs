// GMWW V5.00: isolated WebGL 2.5D Character Master-01.
// The game/room Player Web still uses approved production assets. This is only a lab.
// Three.js r180 vendored locally under MIT; no CDN required for the lab.
import * as THREE from './vendor/three.module.min.js';
import {V500_ACTIONS,V500_DIRECTIONS,V500_WALK_SPEED,V500_RUN_SPEED,
 createMotionState,setAction,setFacing,setDestination,tickMotion,V500_VERSION} from './character-motion-v500.mjs';
import {createSkinnedChibi,animateSkinnedChibi,v510ModelStats,V510_RIG_VERSION} from './character-rig-v510.mjs';

const $=id=>document.getElementById(id);
const canvas=$('stage'),notice=$('notice'),metrics=$('metrics'),status=$('status');
const stage=canvas.parentElement,rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{
 renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
}catch(err){throw Error('Thiết bị không khởi tạo được WebGL: '+err.message);}
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.65;
const pixelRatio=Math.min(window.devicePixelRatio||1,1.5);
renderer.setPixelRatio(pixelRatio);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#87d7e7');
scene.fog=new THREE.Fog('#87d7e7',16,32);
const camera=new THREE.OrthographicCamera(-6,6,6,-6,.01,80);
camera.position.set(0,9.5,14.5);camera.lookAt(0,1.3,0);
scene.add(new THREE.HemisphereLight(0xdffaff,0x8d9674,2.55));
const sun=new THREE.DirectionalLight(0xffeed4,2.6);
sun.position.set(-5,11,7);scene.add(sun);
const sea=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({color:'#53bdce'}));
sea.rotation.x=-Math.PI/2;sea.position.y=-.19;scene.add(sea);
const island=new THREE.Mesh(new THREE.CylinderGeometry(7,7.3,.24,48),
 new THREE.MeshLambertMaterial({color:'#f2d49c'}));
island.position.y=-.12;scene.add(island);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(12,9),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
ground.rotation.x=-Math.PI/2;ground.position.y=.025;scene.add(ground);
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();

// Independent decorative meshes; actors themselves are 1 SkinnedMesh + 1 shadow each.
const decoSphere=new THREE.SphereGeometry(1,8,6);
const tinySphere=new THREE.SphereGeometry(1,10,6);
const C={shell:new THREE.MeshStandardMaterial({color:'#fff2df',roughness:.7})};
function ellip(parent,mat,x,y,z,sx,sy,sz,geo=decoSphere){
 const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
}
function decoration(){
 const palmTrunk=new THREE.MeshStandardMaterial({color:'#a66a37',roughness:1});
 const leaf=new THREE.MeshLambertMaterial({color:'#2e9574'});
 for(const [x,z] of [[-5.8,-3.3],[5.6,-3.8],[-5.7,3.2],[5.5,3.6]]){
  const t=new THREE.Group();t.position.set(x,0,z);scene.add(t);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.26,2.3,7),palmTrunk);trunk.position.y=1.14;trunk.rotation.z=x<0?-.1:.1;t.add(trunk);
  for(let i=0;i<5;i++){
    const a=2*Math.PI*i/5,frond=ellip(t,leaf,Math.cos(a)*.7,2.2,Math.sin(a)*.7,.18,.11,1.1,tinySphere);
    frond.rotation.y=-a+Math.PI/2;frond.rotation.z=Math.cos(a)*-.24;
  }
 }
 for(const [x,z] of [[-4.8,-2],[-3.8,3.9],[3.8,3],[4.8,-2.4]])ellip(scene,C.shell,x,.055,z,.22,.09,.14,tinySphere);
}
decoration();
let actors=[],desiredCount=1,last=0,fpsClock=0,frames=0,fps=0,frameMs=0,paused=false,night=false,runOnTap=false,stressMode=false;
const pickDest=(m,k)=>({x:Math.sin(m.seed*7+k*2.29)*4.5,z:Math.cos(m.seed*5+k*1.85)*2.8});
function setCount(n){
 desiredCount=Math.max(1,Math.min(30,Number(n)||1));
 while(actors.length>desiredCount){const a=actors.pop();scene.remove(a.rig.root);}
 while(actors.length<desiredCount){
  const i=actors.length,m=createMotionState('character-01-'+i,
   i===0?0:Math.sin(i*2.399)*(.7+Math.sqrt(i)*.72),
   i===0?1.5:Math.cos(i*2.399)*(.55+Math.sqrt(i)*.43),i*0.71);
  const rig=createSkinnedChibi(i===0);
  scene.add(rig.root);actors.push({m,rig,k:0});
 }
 renderer.setPixelRatio(desiredCount>15?1:pixelRatio);
 $('crowdValue').textContent=desiredCount+' nhân vật';
 $('count').value=String(desiredCount);
 stressMode=desiredCount>1;
 actors.slice(1).forEach(a=>{a.k++;const p=pickDest(a.m,a.k);setDestination(a.m,p.x,p.z,a.k%4===0);});
 status.textContent=desiredCount===1?'Master-01 16 xương · Chàng Biển':'SkinnedMesh '+desiredCount+' nhân vật (LOD)';
}
function setMainAction(a){
 if(!V500_ACTIONS.includes(a))return;
 setAction(actors[0].m,a);
 document.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===a)));
 $('actionState').textContent=a;
}
function setDir(d){
 if(!V500_DIRECTIONS.includes(d))return;
 setFacing(actors[0].m,d);
 document.querySelectorAll('[data-dir]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dir===d)));
}
function resize(){
 const rect=stage.getBoundingClientRect(),w=Math.max(2,rect.width),h=Math.max(2,rect.height);
 renderer.setSize(w,h,false);
 const worldWidth=Number($('zoom').value||11);
 camera.left=-worldWidth/2;camera.right=worldWidth/2;
 camera.top=worldWidth*h/(2*w);camera.bottom=-camera.top;
 camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
window.addEventListener('orientationchange',()=>setTimeout(resize,160));
$('zoom').addEventListener('input',resize);
$('count').addEventListener('input',e=>setCount(e.target.value));
$('runToggle').addEventListener('change',e=>{runOnTap=e.target.checked;});
$('dayToggle').addEventListener('change',e=>{
 night=e.target.checked;scene.background.set(night?'#102b54':'#87d7e7');
 scene.fog.color.set(night?'#102b54':'#87d7e7');
 sun.intensity=night ? 0.8 : 2.6;
});
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>setMainAction(b.dataset.action)));
document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('click',()=>setDir(b.dataset.dir)));
$('reset').addEventListener('click',()=>{
 const m=actors[0].m;m.goal=null;m.x=0;m.z=1.5;m.yaw=0;m.targetYaw=0;m.velocity=0;
 m.seated=false;setMainAction('idle');setDir('front');status.textContent='Master-01 đã quay về vị trí ban đầu';
});
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 const bounds=canvas.getBoundingClientRect();
 pointer.x=((event.clientX-bounds.left)/bounds.width)*2-1;
 pointer.y=-((event.clientY-bounds.top)/bounds.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const groundHit=raycaster.intersectObject(ground)[0];
 if(!groundHit)return;
 const pos=groundHit.point;
 const m=actors[0].m;
 setDestination(m,pos.x,pos.z,runOnTap);
 document.querySelectorAll('[data-action]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===(runOnTap?'run':'walk'))));
 status.textContent='Đang '+(runOnTap?'chạy':'đi')+' tới ('+pos.x.toFixed(1)+', '+pos.z.toFixed(1)+')';
});
const held=new Set();
window.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 const k=e.key.toLowerCase();
 if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){held.add(k);e.preventDefault();}
});
window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>held.clear());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;notice.textContent='WebGL bị ngắt, tải lại trang để khôi phục.';notice.hidden=false;});
document.addEventListener('visibilitychange',()=>{last=0;});
let crowdTime=0;
function frame(now){
 requestAnimationFrame(frame);
 if(paused||document.hidden)return;
 const dt=last?Math.min(.05,(now-last)/1000):.016;last=now;
 if(!actors.length)return;
 const m=actors[0].m;
 const keydx=(held.has('arrowright')||held.has('d')?1:0)-(held.has('arrowleft')||held.has('a')?1:0);
 const keydz=(held.has('arrowdown')||held.has('s')?1:0)-(held.has('arrowup')||held.has('w')?1:0);
 if(keydx||keydz){
  const mag=Math.hypot(keydx,keydz),distance=(runOnTap?V500_RUN_SPEED:V500_WALK_SPEED)*.65;
  setDestination(m,m.x+keydx/mag*distance,m.z+keydz/mag*distance,runOnTap);
 }
 crowdTime+=dt;
 for(let i=0;i<actors.length;i++){
  const a=actors[i];
  if(i>0&&stressMode&&!a.m.goal&&crowdTime>.1){
   const t=pickDest(a.m,++a.k);setDestination(a.m,t.x,t.z,(i+a.k)%6===0);
  }
  tickMotion(a.m,dt);animateSkinnedChibi(a.rig,a.m);
 }
 renderer.render(scene,camera);
 frames++;fpsClock+=dt;frameMs=frameMs*.87+dt*1000*.13;
 if(fpsClock>=.8){
  fps=Math.round(frames/fpsClock);frames=0;fpsClock=0;
  const info=renderer.info.render;
  metrics.textContent=fps+' FPS · '+frameMs.toFixed(1)+' ms · '+info.calls+' draw calls · '+info.triangles.toLocaleString('vi-VN')+' tam giác · '+actors.length+' nhân vật';
  const s=actors[0].m;
  $('actionState').textContent=s.action.toUpperCase()+' · '+(Math.round(((s.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2)*180/Math.PI))+'°';
  $('perf').textContent=fps>=55?'Mượt':fps>=30?'Đạt mức thử nghiệm':'Cần tối ưu';
  $('perf').dataset.level=fps>=55?'good':fps>=30?'okay':'slow';
 }
}
setCount(1);setDir('front');setMainAction('idle');resize();
notice.hidden=true;
document.documentElement.dataset.gmwwV500='ready';
status.textContent='Master-01 SkinnedMesh 16 xương · thử nghiệm độc lập';
window.GMWW_MASTER_V500={version:V510_RIG_VERSION,originalMotionVersion:V500_VERSION,
 getMetrics:()=>({fps,frameMs,actors:actors.length,drawCalls:renderer.info.render.calls,
 triangles:renderer.info.render.triangles,geometry:v510ModelStats(true),crowdGeometry:v510ModelStats(false)}),
 setCount,actions:V500_ACTIONS};
requestAnimationFrame(frame);
