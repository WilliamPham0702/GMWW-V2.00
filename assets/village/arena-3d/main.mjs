// GMWW Arena 3D: local, synthetic-only technical preview.
// No live room fetching, no side effects, no private events or game rules.
import * as THREE from '../../characters/v5/vendor/three.module.min.js';
import {createPublicRendererFrame,rendererCommands,projectAuthorizedVisualEvents} from '../dual-renderer-core.mjs';
const canvas=document.querySelector('#stage'),metrics=document.querySelector('#metrics'),notice=document.querySelector('#notice');
const scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const camera=new THREE.PerspectiveCamera(42,1,0.1,100);
let azimuth=0.45,elevation=0.85,radius=19,night=false,count=12,selected=null,frame=null;
const sunlight=new THREE.DirectionalLight(0xffffff,2.3);
sunlight.position.set(-5,12,7);scene.add(sunlight);
scene.add(new THREE.AmbientLight(0xbbe9f5,1.4));
const ground=new THREE.Mesh(new THREE.CylinderGeometry(11,11,0.35,80),new THREE.MeshStandardMaterial({color:'#e9ca94',roughness:0.95}));
ground.position.y=-0.2;scene.add(ground);
const grass=new THREE.Mesh(new THREE.TorusGeometry(10.1,0.65,7,80),new THREE.MeshStandardMaterial({color:'#378c74'}));
grass.rotation.x=Math.PI/2;grass.position.y=-0.08;scene.add(grass);
const fireRing=new THREE.Mesh(new THREE.TorusGeometry(0.68,0.12,8,24),new THREE.MeshStandardMaterial({color:'#92806e'}));
fireRing.rotation.x=Math.PI/2;fireRing.position.set(0,0.02,1.4);scene.add(fireRing);
const flame=new THREE.Mesh(new THREE.ConeGeometry(0.42,1,9),new THREE.MeshStandardMaterial({color:'#ffb13f',emissive:'#e26609',emissiveIntensity:1.9}));
flame.position.set(0,0.57,1.4);scene.add(flame);
const firelight=new THREE.PointLight(0xffaa4e,16,6);firelight.position.set(0,1,1.4);scene.add(firelight);
const bodyGeo=new THREE.CapsuleGeometry(0.24,0.45,4,8);
const headGeo=new THREE.SphereGeometry(0.29,12,8);
const eyeGeo=new THREE.SphereGeometry(0.03,6,4);
const bodyMaterials=['#197d86','#7952ad','#df9d3f','#e4767e','#327da7','#549e64'].map(color=>new THREE.MeshStandardMaterial({color,roughness:0.8}));
const skin=new THREE.MeshStandardMaterial({color:'#ffdbbb',roughness:0.9});
const black=new THREE.MeshStandardMaterial({color:'#1b2a36'});
const group=new THREE.Group();scene.add(group);let actors=[];
const readPosition=(p)=>p.position||{x:0,y:0,z:1.4};
function disposeActors(){
  for(const actor of actors){group.remove(actor.group);actor.group.clear();}
  actors=[];
}
function createActor(p,index){
  const root=new THREE.Group();
  const torso=new THREE.Mesh(bodyGeo,bodyMaterials[index%bodyMaterials.length]);torso.position.y=0.48;root.add(torso);
  const head=new THREE.Mesh(headGeo,skin);head.position.y=1.11;root.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(0.30,12,8),bodyMaterials[(index+2)%bodyMaterials.length]);
  hair.scale.set(1,0.45,1);hair.position.y=1.28;root.add(hair);
  for(const eyeX of [-0.105,0.105]){const eye=new THREE.Mesh(eyeGeo,black);eye.position.set(eyeX,1.15,0.255);root.add(eye);}
  const pos=readPosition(p);root.position.set(pos.x,0,pos.z);
  group.add(root);actors.push({id:p.id,group:root,index});
}
function makeDemoState(n){
  const players=Array.from({length:n},(_,i)=>{
    const angle=-Math.PI/2+2*Math.PI*i/n;
    return {participantId:'demo-'+(i+1),displayName:'Player '+(i+1),
      gameCharacterId:'character-'+String(i+1).padStart(2,'0'),seatId:i+1,
      positionX:50+Math.cos(angle)*Math.min(35,22+(n-6)*0.54),
      positionY:64+Math.sin(angle)*Math.min(25,15+(n-6)*0.35),online:true};
  });
  return createPublicRendererFrame({room:{code:'DEMO3D',matchId:'demo-1',phase:'running',gmStage:'battle',seatCount:n,seatLayout:'circle',matchRevision:1},players});
}
function refreshActors(){
  disposeActors();frame=makeDemoState(count);
  const visual=rendererCommands(frame,'3d');
  visual.players.forEach(createActor);
  document.querySelectorAll('[data-count]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.count)===count)));
  selected=actors[0]||null;
  showMessage('Bản 3D và bộ chiếu 2D cùng nhận '+rendererCommands(frame,'2d').players.length+' người từ một frame công khai.');
}
function showMessage(message){notice.textContent=message;}
function setNight(value){
  night=value;scene.background=new THREE.Color(night?'#091e38':'#80cadb');
  ground.material.color.set(night?'#827b75':'#e9ca94');
  sunlight.intensity=night?0.35:2.3;firelight.intensity=night?26:16;
  document.querySelector('#day').setAttribute('aria-pressed',String(!night));
  document.querySelector('#night').setAttribute('aria-pressed',String(night));
}
function showPublicEffect(kind){
  if(!selected)return;
  const projected=projectAuthorizedVisualEvents([
    {eventId:'preview-'+kind,matchId:'demo-1',kind,visibility:'public',released:true,targetId:selected.id,label:kind==='protect'?'Bảo vệ':'Bỏ phiếu'}
  ],{matchId:'demo-1'});
  if(!projected.length)return;
  const material=selected.group.children[0].material;
  material.emissive=new THREE.Color(kind==='protect'?'#12dbdf':'#f6cf61');
  material.emissiveIntensity=0.65;
  showMessage(projected[0].label+' — '+selected.id+' (sự kiện công khai giả lập).');
}
function resetEffects(){for(const actor of actors){actor.group.children[0].material=bodyMaterials[actor.index%bodyMaterials.length];}showMessage('Đã đặt lại hiệu ứng hiển thị.');}
function orbitCamera(){
  camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,Math.cos(azimuth)*Math.cos(elevation)*radius+1.4);
  camera.lookAt(0,0,1.4);
}
function resize(){
  const rect=canvas.getBoundingClientRect();
  const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
  camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
}
let pointer=null;
canvas.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{
  if(!pointer)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
  if(Math.abs(dx)+Math.abs(dy)>2)pointer.moved=true;
  azimuth-=dx*0.007;elevation=Math.min(1.4,Math.max(0.24,elevation+dy*0.005));
  pointer.x=event.clientX;pointer.y=event.clientY;
});
canvas.addEventListener('pointerup',event=>{
  if(!pointer)return;
  if(!pointer.moved){
    const rect=canvas.getBoundingClientRect(),mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
    const hits=ray.intersectObjects(actors.map(a=>a.group),true);
    if(hits.length){let obj=hits[0].object;while(obj.parent&&obj.parent!==group)obj=obj.parent;selected=actors.find(a=>a.group===obj)||selected;if(selected){selected.group.rotation.y+=Math.PI/2;showMessage(selected.id+' đã xoay 90°. Chạm thêm để xoay đủ 360°.');}}
  }
  pointer=null;
});
canvas.addEventListener('wheel',event=>{event.preventDefault();radius=Math.max(10,Math.min(30,radius+Math.sign(event.deltaY)));},{passive:false});
window.addEventListener('resize',resize);
document.querySelectorAll('[data-count]').forEach(button=>button.addEventListener('click',()=>{count=Number(button.dataset.count);refreshActors();}));
document.querySelector('#day').addEventListener('click',()=>setNight(false));
document.querySelector('#night').addEventListener('click',()=>setNight(true));
document.querySelector('#effect-protect').addEventListener('click',()=>showPublicEffect('protect'));
document.querySelector('#effect-vote').addEventListener('click',()=>showPublicEffect('vote'));
document.querySelector('#effect-reset').addEventListener('click',resetEffects);
let frames=0,last=performance.now(),fps=0;
function render(now){
  if(!document.hidden){
    resize();orbitCamera();
    flame.scale.y=0.9+0.08*Math.sin(now/250);
    renderer.render(scene,camera);frames++;
    if(now-last>=1000){fps=Math.round(frames*1000/(now-last));frames=0;last=now;metrics.textContent=count+' nhân vật · '+fps+' FPS · '+renderer.info.render.calls+' drawcalls · Dùng GPU '+(renderer.capabilities.isWebGL2?'WebGL2':'WebGL');}
  }
  requestAnimationFrame(render);
}
setNight(false);refreshActors();resize();requestAnimationFrame(render);
