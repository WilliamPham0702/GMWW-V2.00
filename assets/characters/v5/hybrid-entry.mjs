import * as THREE from './vendor/three.module.min.js';
import {createSkinnedChibi,animateSkinnedChibi} from './character-rig-v510.mjs';
import {createMotionState,setAction,setFacing,tickMotion,V500_DIRECTIONS} from './character-motion-v500.mjs';
import {mountHybrid,HYBRID_ACTIONS} from './skin-v570-combined-final.mjs';
const $=id=>document.getElementById(id),error=e=>{$('state').textContent='Lỗi: '+(e.message||e);document.documentElement.dataset.ready='error';};
window.addEventListener('error',e=>error(e.error||e));window.addEventListener('unhandledrejection',e=>error(e.reason));
async function main(){
const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Không tải được hình chuẩn'));i.src=$('reference').src;});
const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
// Bake exterior white only into alpha. Preserve white flowers and fabric inside silhouette.
const id=ctx.getImageData(0,0,c.width,c.height),d=id.data,seen=new Uint8Array(c.width*c.height),queue=new Int32Array(c.width*c.height);let head=0,tail=0;
const add=n=>{if(n<0||n>=seen.length||seen[n])return;seen[n]=1;const k=n*4;if(d[k]>239&&d[k+1]>239&&d[k+2]>239){queue[tail++]=n;d[k+3]=0;}};
for(let x=0;x<c.width;x++){add(x);add((c.height-1)*c.width+x);}for(let y=0;y<c.height;y++){add(y*c.width);add(y*c.width+c.width-1);}
while(head<tail){const n=queue[head++],x=n%c.width;if(x)add(n-1);if(x<c.width-1)add(n+1);add(n-c.width);add(n+c.width);}ctx.putImageData(id,0,0);
const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b9dfe3');
const camera=new THREE.PerspectiveCamera(32,1,.05,40);camera.position.set(0,2,9);camera.lookAt(0,1.94,0);
const rig=createSkinnedChibi();scene.add(rig.root);const skin=mountHybrid(rig,texture),motion=createMotionState();
const ground=new THREE.Mesh(new THREE.CylinderGeometry(2,2.12,.12,64),new THREE.MeshBasicMaterial({color:'#ead9ae'}));ground.position.y=-.09;scene.add(ground);
function resize(){const r=$('stage').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.z=r.width/r.height<.78?10:8.5;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe($('stage'));resize();
for(const action of HYBRID_ACTIONS){const b=document.createElement('button');b.textContent={idle:'Idle · Đứng',walk:'Walk · Đi',run:'Run · Chạy',result:'Result · Ăn mừng'}[action];b.dataset.action=action;b.onclick=()=>{setAction(motion,action);document.querySelectorAll('[data-action]').forEach(x=>x.classList.toggle('active',x===b));};$('actions').append(b);if(action==='idle')b.classList.add('active');}
const names=['Trước','Trước phải','Phải','Sau phải','Sau','Sau trái','Trái','Trước trái'];
V500_DIRECTIONS.forEach((direction,i)=>{const b=document.createElement('button');b.textContent=names[i];b.dataset.direction=direction;b.onclick=()=>{setFacing(motion,direction);document.querySelectorAll('[data-direction]').forEach(x=>x.classList.toggle('active',x===b));};$('directions').append(b);if(!i)b.classList.add('active');});
$('wire').onchange=e=>skin.wireframe(e.target.checked);
$('pause').onclick=()=>{window.__hybrid.paused=!window.__hybrid.paused;$('pause').textContent=window.__hybrid.paused?'Tiếp tục':'Tạm dừng';};
let frames=0,last=performance.now();
window.__hybrid={rig,skin,motion,renderer,frames:0,paused:false,setAction:a=>{if(!HYBRID_ACTIONS.includes(a))throw Error('ONLY_FOUR_ACTIONS');setAction(motion,a);},setDirection:d=>setFacing(motion,d),snapshot:()=>({frames,bones:rig.bones.length,action:motion.action,yaw:motion.yaw,layers:skin.layers.length,volumes:skin.base.length,productionSkin:false,gameIntegrated:false,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;if(!window.__hybrid.paused)tickMotion(motion,dt);animateSkinnedChibi(rig,motion);skin.update(motion.yaw);renderer.render(scene,camera);frames++;window.__hybrid.frames=frames;if(frames===2){document.documentElement.dataset.ready='true';$('state').textContent='Đang chạy WebGL · 16 xương · texture từ hình chuẩn';}}
$('view').addEventListener('webglcontextlost',e=>{e.preventDefault();error(Error('WebGL bị ngắt. Hãy tải lại trang.'));});
requestAnimationFrame(loop);
}main().catch(error);
