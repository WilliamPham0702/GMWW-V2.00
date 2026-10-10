// GMWW V5.00: isolated WebGL 2.5D Character Master-01.
// The game/room Player Web still uses approved production assets. This is only a lab.
// Three.js r180 vendored locally under MIT; no CDN required for the lab.
import * as THREE from './vendor/three.module.min.js';
import {V500_ACTIONS,V500_DIRECTIONS,V500_WALK_SPEED,V500_RUN_SPEED,
 createMotionState,setAction,setFacing,setDestination,tickMotion,V500_VERSION} from './character-motion-v500.mjs';

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

const C={
 skin:new THREE.MeshStandardMaterial({color:'#f0b992',roughness:.85}),
 shade:new THREE.MeshStandardMaterial({color:'#cf8a67',roughness:.85}),
 shirt:new THREE.MeshStandardMaterial({color:'#137ab7',roughness:.65}),
 shirtLight:new THREE.MeshStandardMaterial({color:'#2ec4dd',roughness:.73}),
 shorts:new THREE.MeshStandardMaterial({color:'#faf0d7',roughness:.9}),
 hair:new THREE.MeshStandardMaterial({color:'#132b50',roughness:.94}),
 hairBright:new THREE.MeshStandardMaterial({color:'#244363',roughness:.9}),
 eye:new THREE.MeshStandardMaterial({color:'#172d3d',roughness:.45}),
 eyeWhite:new THREE.MeshStandardMaterial({color:'#fffdfa',roughness:.6}),
 sole:new THREE.MeshStandardMaterial({color:'#294e69',roughness:.9}),
 accent:new THREE.MeshStandardMaterial({color:'#ffdd87',roughness:.65}),
 flower:new THREE.MeshStandardMaterial({color:'#f7f7de',roughness:.7}),
 shadow:new THREE.MeshBasicMaterial({color:'#144f4d',transparent:true,opacity:.16,depthWrite:false}),
 coral:new THREE.MeshStandardMaterial({color:'#46bba5',roughness:.8}),
 shell:new THREE.MeshStandardMaterial({color:'#ffefe4',roughness:.6})
};
const sphere=new THREE.SphereGeometry(1,14,10);
const tinySphere=new THREE.SphereGeometry(1,8,6);
const cylinder=new THREE.CylinderGeometry(1,1,1,10);
const shadowGeo=new THREE.CircleGeometry(1,20);
function ellip(parent,mat,x,y,z,sx,sy,sz,geo=sphere){
 const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
}
function pivot(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function cylinderPart(parent,mat,x,y,z,r1,r2,length){
 const mesh=new THREE.Mesh(cylinder,mat);mesh.position.set(x,y,z);mesh.scale.set(r1,length,r2);parent.add(mesh);return mesh;
}
function makeChibi(highDetail=true){
 const root=new THREE.Group(),hips=pivot(root,0,1.25,0);
 // Torso, pelvis, neck and articulated head.
 ellip(hips,C.shorts,0,-.035,0,.52,.32,.32);
 const chest=pivot(hips,0,.56,0);
 ellip(chest,C.shirt,0,0,0,.61,.69,.38);
 ellip(chest,C.shirtLight,0,.19,.27,.5,.24,.115);
 ellip(chest,C.skin,0,.57,0,.155,.16,.17,tinySphere);
 const head=pivot(chest,0,.83,0);
 ellip(head,C.skin,0,.49,0,.57,.58,.51);
 ellip(head,C.shade,-.54,.47,0,.13,.19,.12,tinySphere);
 ellip(head,C.shade,.54,.47,0,.13,.19,.12,tinySphere);
 ellip(head,C.hair,0,.91,-.06,.59,.25,.5);
 if(highDetail){
   for(const p of [[-.35,.86,.36],[-.16,.86,.48],[.08,.88,.48],[.35,.85,.29]])ellip(head,C.hairBright,p[0],p[1],p[2],.19,.15,.18,tinySphere);
   for(const x of [-.205,.205]){
     ellip(head,C.eyeWhite,x,.50,.489,.134,.16,.07,tinySphere);
     ellip(head,C.eye,x,.49,.55,.075,.116,.027,tinySphere);
     ellip(head,C.flower,x-.024,.54,.577,.028,.03,.01,tinySphere);
   }
   ellip(head,C.shade,0,.31,.516,.09,.055,.06,tinySphere);
   ellip(head,C.shade,0,.17,.49,.12,.026,.021,tinySphere);
   // Floral islands on the shirt, made from joint-bound decorative geometry.
   for(const [x,y,z] of [[-.34,.03,.34],[.24,.25,.34],[.07,-.21,.31]]){
     ellip(chest,C.accent,x,y,z,.07,.078,.018,tinySphere);
     for(let a=0;a<5;a++){const t=a*Math.PI*2/5;ellip(chest,C.flower,x+Math.cos(t)*.105,y+Math.sin(t)*.105,z+.015,.048,.043,.018,tinySphere);}
   }
 }
 const arms=[],legs=[],knees=[];
 for(const sign of [-1,1]){
   const arm=pivot(chest,sign*.59,.38,0);
   ellip(arm,C.shirt,sign*.035,-.20,0,.235,.28,.23);
   cylinderPart(arm,C.skin,sign*.04,-.47,0,.15,.15,.42);
   ellip(arm,C.skin,sign*.04,-.73,0,.155,.165,.15,tinySphere);
   arms.push(arm);
   const leg=pivot(hips,sign*.27,-.13,0);
   cylinderPart(leg,C.shorts,0,-.18,0,.24,.22,.39);
   const knee=pivot(leg,0,-.45,0);
   cylinderPart(knee,C.skin,0,-.25,0,.16,.15,.48);
   ellip(knee,C.skin,0,-.50,.015,.166,.13,.14,tinySphere);
   ellip(knee,C.sole,0,-.57,.105,.20,.10,.30);
   if(highDetail)ellip(knee,C.accent,0,-.52,.22,.16,.045,.065,tinySphere);
   legs.push(leg);knees.push(knee);
 }
 const oval=new THREE.Mesh(shadowGeo,C.shadow);
 oval.rotation.x=-Math.PI/2;oval.position.y=.012;oval.scale.set(.64,.38,1);
 root.add(oval);
 const body={root,hips,chest,head,arms,legs,knees,oval};
 return body;
}
function animateRig(body,m){
 const p=m.pose;
 body.root.position.set(m.x,0,m.z);
 body.root.rotation.y=m.yaw;
 body.hips.position.y=1.25+p.hipY;
 body.hips.rotation.set(p.hipLean,0,p.hipRoll);
 body.chest.rotation.x=p.bodyTilt;
 body.head.rotation.set(p.headPitch,0,p.headRoll);
 body.arms[0].rotation.set(p.armL,0,p.armLOut);
 body.arms[1].rotation.set(p.armR,0,p.armROut);
 body.legs[0].rotation.x=p.legL;
 body.legs[1].rotation.x=p.legR;
 body.knees[0].rotation.x=p.kneeL;
 body.knees[1].rotation.x=p.kneeR;
 body.oval.scale.set(.64*(1-p.hipY*.6),.38*(1-p.hipY*.2),1);
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
  const rig=makeChibi(i===0);
  scene.add(rig.root);actors.push({m,rig,k:0});
 }
 renderer.setPixelRatio(desiredCount>15?1:pixelRatio);
 $('crowdValue').textContent=desiredCount+' nhân vật';
 $('count').value=String(desiredCount);
 stressMode=desiredCount>1;
 actors.slice(1).forEach(a=>{a.k++;const p=pickDest(a.m,a.k);setDestination(a.m,p.x,p.z,a.k%4===0);});
 status.textContent=desiredCount===1?'Master-01 · Chibi Biển':'Đang thử tải '+desiredCount+' nhân vật 3D';
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
  tickMotion(a.m,dt);animateRig(a.rig,a.m);
 }
 renderer.render(scene,camera);
 frames++;fpsClock+=dt;frameMs=frameMs*.87+dt*1000*.13;
 if(fpsClock>=.8){
  fps=Math.round(frames/fpsClock);frames=0;fpsClock=0;
  const info=renderer.info.render;
  metrics.textContent=fps+' FPS · '+frameMs.toFixed(1)+' ms · '+info.calls+' draw calls · '+actors.length+' nhân vật';
  const s=actors[0].m;
  $('actionState').textContent=s.action.toUpperCase()+' · '+(Math.round(((s.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2)*180/Math.PI))+'°';
  $('perf').textContent=fps>=55?'Mượt':fps>=30?'Đạt mức thử nghiệm':'Cần tối ưu';
  $('perf').dataset.level=fps>=55?'good':fps>=30?'okay':'slow';
 }
}
setCount(1);setDir('front');setMainAction('idle');resize();
notice.hidden=true;
status.textContent='Master-01 WebGL 2.5D · thử nghiệm độc lập';
window.GMWW_MASTER_V500={version:V500_VERSION,getMetrics:()=>({fps,frameMs,actors:actors.length,drawCalls:renderer.info.render.calls}),setCount,actions:V500_ACTIONS};
requestAnimationFrame(frame);
