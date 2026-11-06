// GĐ52 - Nền làng 3D cho màn vận hành 2D của GM. Chỉ vẽ cảnh (không có menu, không có logic game):
// toàn bộ ghế, nút, hành động vẫn là màn 2D của GM do Core điều khiển. Camera trực giao nghiêng nên mặt sàn
// ánh xạ tuyến tính với toạ độ % của vòng ghế 2D -> ghế 2D nằm đúng chỗ trên sàn 3D, không cần đổi logic 2D.
import * as THREE from '../../characters/v5/vendor/three.module.min.js';
import {createCoastalVillage} from './coastal-village.mjs';
import {installVillageProps} from './village-props.mjs';
import {createPaintedStage} from './backdrop-painted.mjs';
import {backdropFrustum,backdropCameraPosition,BACKDROP_TILT_DEG} from './backdrop-camera.mjs';
const canvas=document.getElementById('stage'),scene=new THREE.Scene();
const render=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
render.outputColorSpace=THREE.SRGBColorSpace;
render.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<460?1.5:1.25));
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,200);
const f=backdropFrustum();camera.left=f.left;camera.right=f.right;camera.top=f.top;camera.bottom=f.bottom;
const p=backdropCameraPosition();camera.position.set(p.x,p.y,p.z);camera.up.set(0,1,0);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
const painted=new URLSearchParams(location.search).get('style')!=='village';
const village=painted?null:createCoastalVillage(THREE,scene);
if(village)void installVillageProps(THREE,village).catch(()=>null);
const paint=painted?createPaintedStage(THREE,scene,render):null;
if(paint){camera.removeFromParent?.();}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight);render.setSize(w,h,false);paint?.resize(w,h)}
addEventListener('resize',resize);resize();
// The 2D GM page only sends the day/night phase. No credentials, no game state.
addEventListener('message',event=>{
  const d=event.data;if(!d||d.kind!=='gmww-backdrop-phase')return;
  (village||paint).setNight(d.night===true);
  if(paint&&d.fire)paint.setFire(Number(d.fire.x),Number(d.fire.y));
});
try{parent.postMessage({kind:'gmww-backdrop-ready',tiltDeg:BACKDROP_TILT_DEG},'*')}catch{}
let last=0;
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden||now-last<33)return;last=now;
  if(paint){paint.animate(now,reduced);render.render(scene,paint.camera);return}
  if(!reduced)village.animate(now);
  render.render(scene,camera);
}
requestAnimationFrame(frame);
window.__gmwwBackdrop={village,paint,camera,render};
