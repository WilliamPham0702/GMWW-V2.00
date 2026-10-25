// Player Arena 3D: public-only read projection from the SAME authoritative GMWW V2 Core.
// Private role cards, voting, and gameplay actions stay inside the existing Player Web iframe.
// This module never requests GM endpoints, holds GM tokens, or locally infers hidden actions.
import * as THREE from '../../characters/v5/vendor/three.module.min.js';
import {rendererCommands} from '../dual-renderer-core.mjs';
import {connectStagingRoom} from './room-realtime.mjs';
import {createArenaCharacterField} from './character-atelier.mjs';
import {createCoastalVillage} from './coastal-village.mjs';
import {arenaSceneSignature,arenaTargetFrameHz,createArenaPaintScheduler} from './render-optimization.mjs';

const $=id=>document.getElementById(id);
const code=String(new URL(location.href).searchParams.get('room')||'').trim().toUpperCase();
const validCode=/^[A-Z0-9]{4,12}$/.test(code);
const message=(text)=>{$('status').textContent=String(text).slice(0,180)};
const canvas=$('stage'),scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.1));
const camera=new THREE.PerspectiveCamera(42,1,.1,90);
const field=createArenaCharacterField(THREE,scene);
const village=createCoastalVillage(THREE,scene);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
field.setReducedMotion(reducedMotion);
const scheduler=createArenaPaintScheduler();
let orbit=.5,elevation=.75,radius=20,lastSize='',lastSignature='',room=null;
let selected=null,activePointer=null,pinchSize=0,contextLost=false,lastPaintHz=0;
let frameCount=0,fps=0,fpsSince=performance.now(),connection=null;
const pointers=new Map();

function showState(frame){
  const phase=frame.room.cyclePhase==='night'?'🌙 Đêm '+frame.room.cycleNight:
    frame.room.cyclePhase==='morning'?'☀️ Ngày '+frame.room.cycleNight:
    frame.room.phase==='running'?'Đang trong trận':'Tập hợp';
  $('state').textContent='Phòng '+frame.room.code+' · '+phase;
}
function drawFrame(frame){
  // Public DTO: the renderer never receives token, roleId, faction, night actions or private cards.
  const items=rendererCommands(frame,'3d').players;
  const signature=arenaSceneSignature(frame.room,items);
  if(signature!==lastSignature){
    field.setActors(items,{seatCount:frame.room.seatCount,seatLayout:frame.room.seatLayout});
    lastSignature=signature;
  }
  if(room?.matchId!==frame.room.matchId||room?.cycleKey!==frame.room.cycleKey){
    field.clearEffects();
    field.setCastingTurn(null);
  }
  room=frame.room;
  village.setNight(room.cyclePhase==='night');
  showState(frame);
  message('Đã đồng bộ '+items.length+' nhân vật. Để thực hiện hành động hoặc mở lá vai, nhấn “Lá Vai / Hành động”.');
}
function resize(){
  const box=canvas.getBoundingClientRect(),key=box.width+'x'+box.height;
  if(lastSize===key)return;
  lastSize=key;renderer.setSize(Math.max(1,box.width),Math.max(1,box.height),false);
  camera.aspect=Math.max(1,box.width)/Math.max(1,box.height);camera.updateProjectionMatrix();
}
function frame(now){
  const hz=arenaTargetFrameHz({visible:!document.hidden,
    active:field.hasActiveMotion(now),interacting:pointers.size>0,
    lowPower:field.actorCount>=20,reducedMotion});
  if(hz!==lastPaintHz){lastPaintHz=hz;document.body.dataset.arenaPlayerHz=String(hz)}
  if(scheduler.shouldPaint(now,hz,{paused:contextLost})){
    resize();
    camera.position.set(Math.sin(orbit)*Math.cos(elevation)*radius,
      Math.sin(elevation)*radius,Math.cos(orbit)*Math.cos(elevation)*radius+1.5);
    camera.lookAt(0,0,1.2);
    if(!reducedMotion)village.animate(now);
    field.draw(now);
    renderer.render(scene,camera);
    frameCount++;
  }
  if(now-fpsSince>=1000){
    fps=Math.round(frameCount*1000/(now-fpsSince));
    frameCount=0;fpsSince=now;
    field.setQualityFps(fps);
    document.body.dataset.arenaPlayerFps=String(fps);
  }
  requestAnimationFrame(frame);
}
canvas.addEventListener('pointerdown',event=>{
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  activePointer={x:event.clientX,y:event.clientY,moved:false};
  if(pointers.size>=2)pinchSize=0;
});
canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId))return;
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size>=2){
    const [a,b]=[...pointers.values()];
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    if(pinchSize)radius=Math.max(9,Math.min(31,radius*pinchSize/Math.max(1,distance)));
    pinchSize=distance;activePointer=null;return;
  }
  if(!activePointer)return;
  const dx=event.clientX-activePointer.x,dy=event.clientY-activePointer.y;
  orbit-=dx*.007;elevation=Math.max(.25,Math.min(1.45,elevation+dy*.005));
  activePointer.x=event.clientX;activePointer.y=event.clientY;activePointer.moved=true;
});
const endPointer=event=>{pointers.delete(event.pointerId);if(pointers.size<2)pinchSize=0;activePointer=null};
canvas.addEventListener('pointerup',endPointer);
canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',event=>{
  event.preventDefault();radius=Math.max(9,Math.min(31,radius+Math.sign(event.deltaY)));
},{passive:false});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;scheduler.reset();message('Đang khôi phục đồ họa, trận đấu vẫn được giữ trên server.');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;lastSize='';scheduler.reset();message('Đã khôi phục đồ họa.');});
document.addEventListener('visibilitychange',()=>{scheduler.reset();frameCount=0;fpsSince=performance.now()});

let privateLoaded=false;
$('open-card').onclick=()=>{
  if(!validCode){message('Thiếu mã phòng hợp lệ.');return}
  const modal=$('card');
  if(!privateLoaded){
    // Same-origin Core Player Web controls its own identity and secret cards.
    // No token, hidden role or credential is transmitted via postMessage/query.
    $('player-core').src='/join/'+encodeURIComponent(code);
    privateLoaded=true;
  }
  modal.classList.add('open');
  $('close-card').focus();
};
$('close-card').onclick=()=>{
  $('card').classList.remove('open');
  $('open-card').focus();
};
// Diagnostics expose only public room identifier and counts, never private interactions.
window.__GMWW_ARENA_PLAYER_READONLY=()=>({
  room:room?.code||null,count:field.actorCount,phase:room?.phase||null,
  cyclePhase:room?.cyclePhase||null,cardOpen:$('card').classList.contains('open'),
  fps,connection,drawCalls:renderer.info.render.calls
});
requestAnimationFrame(frame);
if(!validCode){$('state').textContent='Thiếu mã phòng';message('Mở trang từ liên kết phòng của GM, hoặc thêm ?room=MÃPHÒNG.');}
else{
  message('Đang kết nối Core của phòng '+code+'…');
  connectStagingRoom({roomCode:code,onFrame:drawFrame,
    onGallows:ballot=>{if(ballot?.stage)message('Lên Giàn: '+ballot.stage+' · xem lá vai để đề cử/bỏ phiếu.');},
    onStatus:s=>{connection=s;if(s==='reconnecting')message('Mất kết nối, đang tự đồng bộ lại…');},
    onError:e=>message('Chưa đồng bộ được phòng: '+String(e?.message||e))});
}
