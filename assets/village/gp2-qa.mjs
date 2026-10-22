/* GP2 evaluation-only page. Never calls room APIs or writes to Cloudflare/IPA. */
import {gp2Camera,gp2ActorCollisionPairs,GP2_WORLD_FRAME} from "./gp2-world-camera.mjs";
import {mountCharacterRenderer} from "./character40-renderer.mjs?v=c40-1-mobile2";
const stage=document.getElementById('stage'),world=document.getElementById('world'),actors=document.getElementById('actors');
const message=document.getElementById('message'),fireEl=document.getElementById('fire');
const fire={x:52,y:53.9}; // Candidate artwork, not the live GP2 branch fire {50,64}.
const rowYs=[42,49,62,69,76],rowXs=[[29,37,45,55,63,71],[26,35,44,60,69,78],
 [25,34,43,61,70,79],[27,36,45,55,64,73],[29,37,45,55,63,71]];
const seats=rowYs.flatMap((y,depth)=>rowXs[depth].map((x,column)=>({
 seatId:depth*6+column+1,x,y,depth})));
const collisions=gp2ActorCollisionPairs(seats,{actorWidth:56,actorHeight:74});
if(collisions.length)throw new Error('GP2_QA_SEAT_OVERLAP:'+JSON.stringify(collisions));
const paths={day:'../backgrounds/gmww-village-day-v260.webp',
 night:'../backgrounds/gmww-village-night-v260.webp'};
const owns={day:null,night:null};
let phase='day',pan={x:0,y:0},camera=null,active=null,dragged=false,selected=0;
function report(messageText){
 message.innerHTML='<b>GP2 QA — không ghi dữ liệu.</b> '+String(messageText).replace(/[<&]/g,'');
}
function refreshCamera(){
 camera=gp2Camera({viewportWidth:stage.clientWidth,viewportHeight:stage.clientHeight,
   focus:fire,pan});
 world.style.transform='translate3d('+camera.left+'px,'+camera.top+'px,0)';
 stage.dataset.worldScale=String(camera.scale);
 stage.dataset.visibleSeatCount=String(seats.filter(p=>{
  const v=camera.toViewport(p);return v.x>=-56&&v.x<=stage.clientWidth+56&&v.y>=-74&&v.y<=stage.clientHeight+74;
 }).length);
}
function refreshBackground(){
 world.style.backgroundImage='url("'+paths[phase].replace(/"/g,'')+'")';
 world.dataset.phase=phase;
 document.getElementById('day').setAttribute('aria-pressed',String(phase==='day'));
 document.getElementById('night').setAttribute('aria-pressed',String(phase==='night'));
}
function pick(seat){
 selected=seat;for(const button of actors.children)button.classList.toggle('selected',Number(button.dataset.seatId)===seat);
 report('Đã chọn Character '+String(seat)+'. Tọa độ world và camera được giữ nguyên; không gửi sự kiện đến game thật.');
}
function setupActors(){
 for(const p of seats){
  const button=document.createElement('button');
  button.className='actor';button.type='button';button.dataset.seatId=String(p.seatId);
  button.style.left=p.x+'%';button.style.top=p.y+'%';button.style.zIndex=String(20+Math.round(p.y));
  button.setAttribute('aria-label','Character '+p.seatId+', vị trí '+p.seatId);
  const portrait=document.createElement('span');portrait.className='portrait';
  const label=document.createElement('span');label.className='label';label.textContent=String(p.seatId);
  button.append(portrait,label);actors.append(button);
  const id='character-'+String(p.seatId).padStart(2,'0');
  const renderer=mountCharacterRenderer(portrait,{characterId:id,command:{
    characterId:id,rigId:'rig-male-normal-v1',state:'idle',motion:'idle',facing:'right',paused:true
  }});
  if(!renderer){const img=document.createElement('img');img.src='../characters/gmww40/originals/'+id+'.webp';
    img.alt='';img.style.cssText='width:56px;height:74px;object-fit:contain';portrait.append(img);}
  button.addEventListener('click',e=>{e.stopPropagation();pick(p.seatId)});
 }
 fireEl.style.left=fire.x+'%';fireEl.style.top=fire.y+'%';
 world.dataset.seats=String(seats.length);
 world.dataset.renderer='gmww40-atlas';
 refreshBackground();refreshCamera();
 report('30 Character atlas thật, 0 cặp bbox trùng trong world 864×1536. '+ 
 'Ảnh mặc định đang dùng để kiểm tra camera, chưa phải artwork GP2 được duyệt. Chọn hai ảnh thử để thay ngay trong trang này.');
}
stage.addEventListener('pointerdown',e=>{
 if(e.target.closest('.actor,#top,#bottom'))return;
 active={id:e.pointerId,x:e.clientX,y:e.clientY,pan:{...pan}};dragged=false;
 stage.setPointerCapture?.(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
 if(!active||active.id!==e.pointerId)return;
 const dx=e.clientX-active.x,dy=e.clientY-active.y;
 if(Math.abs(dx)+Math.abs(dy)>7)dragged=true;
 if(!dragged)return;
 pan={x:active.pan.x+dx,y:active.pan.y+dy};refreshCamera();
});
stage.addEventListener('pointerup',e=>{
 if(!active||active.id!==e.pointerId)return;
 if(!dragged){const rect=stage.getBoundingClientRect();
  const p=camera.fromViewport({x:e.clientX-rect.left,y:e.clientY-rect.top});
  report('Chạm mặt đất world ('+p.x.toFixed(1)+', '+p.y.toFixed(1)+') — chỉ hiển thị để hiệu chỉnh, không gửi yêu cầu di chuyển.');}
 active=null;
});
stage.addEventListener('pointercancel',()=>{active=null});
function setFocus(x){pan={x:(fire.x-x)*GP2_WORLD_FRAME.width/100,y:0};refreshCamera()}
document.getElementById('center').addEventListener('click',()=>setFocus(fire.x));
document.getElementById('left').addEventListener('click',()=>setFocus(28));
document.getElementById('right').addEventListener('click',()=>setFocus(72));
for(const type of ['day','night'])document.getElementById(type).addEventListener('click',()=>{phase=type;refreshBackground()});
for(const type of ['day','night'])document.getElementById(type+'file').addEventListener('change',event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(!['image/png','image/webp','image/jpeg'].includes(file.type)||file.size>8*1024*1024){
  report('Ảnh thử phải là PNG/JPEG/WebP tối đa 8 MB. Không có dữ liệu nào được tải lên máy chủ.');return;
 }
 if(owns[type])URL.revokeObjectURL(owns[type]);owns[type]=URL.createObjectURL(file);paths[type]=owns[type];
 refreshBackground();report('Đang xem ảnh '+type+' cục bộ '+file.name+'. Ảnh không được xuất bản hay tải lên server.');
});
window.addEventListener('resize',refreshCamera,{passive:true});
window.GMWW_GP2_QA={getState:()=>({seats:seats.length,collisions:collisions.length,
 scale:camera?.scale,phase,selected,viewport:camera?.visibleWorldBounds,renderedActors:actors.children.length})};
setupActors();
