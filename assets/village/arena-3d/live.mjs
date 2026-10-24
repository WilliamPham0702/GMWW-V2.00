// GMWW Arena 3D Phase 2 — actual V2 Core room in an isolated staging DO namespace.
// No hidden actions are read from the WebSocket; all rendered fields are public projection.
import * as THREE from '../../characters/v5/vendor/three.module.min.js';
import {rendererCommands,createPublicRendererFrame} from '../dual-renderer-core.mjs';
import {connectStagingRoom,publicGallowsScene} from './room-realtime.mjs';
const $=id=>document.getElementById(id);
const canvas=$('stage'),scene=new THREE.Scene(),render=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
render.outputColorSpace=THREE.SRGBColorSpace;render.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
const camera=new THREE.PerspectiveCamera(42,1,.1,90);
let orbit=.5,elevation=.75,radius=20,drag=null,focusId=null,rosterSize=6,code='',gmToken='',feed=null,current=null;
let actors=new Map(),resources=[],lastResize='',fps=0,fpsAt=performance.now(),frames=0,ballot=null,synthetic=true;
const floor=new THREE.Mesh(new THREE.CylinderGeometry(11.2,11.2,.25,64),new THREE.MeshStandardMaterial({color:'#e8cc99'}));
floor.position.y=-.2;scene.add(floor);
const rim=new THREE.Mesh(new THREE.TorusGeometry(10.15,.4,7,64),new THREE.MeshStandardMaterial({color:'#459c7f'}));rim.rotation.x=Math.PI/2;scene.add(rim);
const fire=new THREE.Mesh(new THREE.ConeGeometry(.45,1.05,8),new THREE.MeshStandardMaterial({color:'#fda840',emissive:'#c46212',emissiveIntensity:1.6}));
fire.position.set(0,.55,1.8);scene.add(fire);
const sunlight=new THREE.DirectionalLight(0xffffff,2.3);sunlight.position.set(-8,12,6);scene.add(sunlight);
scene.add(new THREE.AmbientLight(0xc2edfd,1.7));
const pointlight=new THREE.PointLight(0xffa442,12,8);pointlight.position.set(0,1.2,1.8);scene.add(pointlight);
const mat=n=>new THREE.MeshStandardMaterial({color:['#1d8493','#b18fdb','#ddab4d','#df8479','#52a486','#4385bd'][n%6],roughness:.74});
const skin=new THREE.MeshStandardMaterial({color:'#f6d3b2'});
const eye=new THREE.MeshStandardMaterial({color:'#111d2b'});
const cap=new THREE.CapsuleGeometry(.26,.48,4,8),head=new THREE.SphereGeometry(.28,12,8),dot=new THREE.SphereGeometry(.03,6,4);
function makeActor(p,index){
  const g=new THREE.Group(),shirt=mat(index);
  const body=new THREE.Mesh(cap,shirt);body.position.y=.48;g.add(body);
  const face=new THREE.Mesh(head,skin);face.position.y=1.12;g.add(face);
  for(const x of [-.09,.09]){const o=new THREE.Mesh(dot,eye);o.position.set(x,1.13,.26);g.add(o);}
  scene.add(g);actors.set(p.id,{g,body,shirt,id:p.id});return g;
}
function resetActors(){
  for(const v of actors.values()){scene.remove(v.g);v.shirt.dispose();}
  actors.clear();
}
function drawFrame(frame){
  current=frame;synthetic=frame.room.code==='SYNTH';const items=rendererCommands(frame,'3d').players;
  const ids=new Set(items.map(x=>x.id));
  for(const [id,v] of actors)if(!ids.has(id)){scene.remove(v.g);v.shirt.dispose();actors.delete(id);}
  items.forEach((p,i)=>{
    const actor=actors.get(p.id)||{g:makeActor(p,i)};
    const v=actors.get(p.id),angle=-Math.PI/2+Math.PI*2*i/Math.max(1,items.length);
    // Seat is an authoritative identity. A missing position gets a deterministic visual fallback.
    const x=p.position?.x??Math.cos(angle)*6.5,z=p.position?.z??Math.sin(angle)*4.8;
    v.g.position.set(x,0,z);
    const tags=p.statusTags||[];
    const dead=tags.some(t=>['dead','expelled'].includes(t.statusId));
    v.shirt.color.set(dead?'#666b74':['#1d8493','#b18fdb','#ddab4d','#df8479','#52a486','#4385bd'][i%6]);
    const protectedTag=tags.some(t=>t.statusId==='protected');
    v.shirt.emissive.set(protectedTag?'#23d0d8':dead?'#4b232c':'#000000');
    v.shirt.emissiveIntensity=protectedTag?.9:dead?.5:0;
    v.g.rotation.y=focusId===p.id?v.g.rotation.y:0;
  });
  const phase=frame.room.phase||'lobby',cycle=frame.room.cyclePhase||'';
  const night=cycle==='night';
  scene.background=new THREE.Color(night?'#10243b':'#85cddd');
  sunlight.intensity=night?.36:2.3;
  floor.material.color.set(night?'#8d8790':'#e8cc99');
  pointlight.intensity=night?24:12;
  $('state').textContent='Phòng '+frame.room.code+' · '+phase+' · '+(night?'Đêm ':cycle==='morning'?'Ngày ':'Vào phòng ')+(frame.room.cycleNight||0);
  $('hud').textContent=items.length+' Character · '+fps+' FPS · '+render.info.render.calls+' Draw Calls';
  document.body.dataset.gmwwLiveCount=String(items.length);
  document.body.dataset.gmwwLivePhase=String(phase);
  document.body.dataset.gmwwLiveCycle=String(cycle);
}
function demo(n){
  const players=Array.from({length:n},(_,i)=>{
    const a=-Math.PI/2+Math.PI*2*i/n;
    return {participantId:'synthetic-'+i,gameCharacterId:'character-'+String(i+1).padStart(2,'0'),
      seatId:i+1,positionX:50+Math.cos(a)*32,positionY:50+Math.sin(a)*29};
  });
  drawFrame(createPublicRendererFrame({room:{code:'SYNTH',phase:'lobby',seatCount:n},players}));
}
function notice(s){$('log').textContent=String(s);}
async function json(url,{method='GET',body,gm=false,token}={}){
  const headers={accept:'application/json'};
  if(body)headers['content-type']='application/json';
  if(gm)headers.Authorization='Bearer '+gmToken;
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetch(url,{method,headers,cache:'no-store',body:body?JSON.stringify(body):undefined});
  let value;try{value=await response.json()}catch{throw Error('HTTP '+response.status);}
  if(!response.ok||value.ok===false)throw Error(value.message||value.error||('HTTP '+response.status));
  return value;
}
function roomUrl(path=''){return '/api/rooms/'+encodeURIComponent(code)+path;}
async function gm(path,body){if(!gmToken)throw Error('Chưa có quyền GM ở tab này. Hãy tạo phòng thử mới.');return json('/api/gm/rooms/'+encodeURIComponent(code)+'/'+path,{method:'POST',body,gm:true});}
function enableGm(){for(const id of ['seed','lock','deal','start','night','day','nominate','vote'])$(id).disabled=!gmToken;}
async function attach(room){
  if(feed)feed.close();
  code=room.trim().toUpperCase();$('room').value=code;
  const state=await json(roomUrl());
  $('joinlink').href='/join/'+encodeURIComponent(code);
  const query=new URL(location.href);query.searchParams.set('room',code);history.replaceState(null,'',query);
  drawFrame(createPublicRendererFrame(state));
  feed=connectStagingRoom({roomCode:code,onFrame:drawFrame,
    onGallows:updated=>{ballot=updated;showBallot(updated);},onStatus:s=>$('connection').textContent=s,
    onError:e=>notice('Lỗi kết nối '+String(e.message||e))});
  notice('Đã kết nối phòng thật '+code+' trên Core V2 STAGING. Mở Player Web 2D tại liên kết phía trên.');
  enableGm();
}
function showBallot(x){
  if(!x){$('ballot').textContent='Lên Giàn: chưa bắt đầu trong ngày hiện tại';document.body.dataset.gmwwLiveBallot='none';return;}
  const scores=(x.nominationTotals||[]).map(t=>t.loginId+': '+t.votes).join(' · ');
  $('ballot').textContent='Lên Giàn '+x.stage+' · '+(x.candidateId||'chưa chọn')+
    ' · '+scores+' · 👍 '+x.save+' / 👎 '+x.kill+(x.outcome?' · '+x.outcome:'');
  document.body.dataset.gmwwLiveBallot=x.stage;
}
async function guarded(label,work){try{notice(label+' ...');await work();}catch(error){notice(label+': '+String(error.message||error));}}
$('create').onclick=()=>guarded('Tạo phòng STAGING',async()=>{
  if(feed)feed.close();feed=null;gmToken='';seeded=[];enableGm();
  const d=await json('/api/rooms',{method:'POST',body:{roomName:'Arena 3D STAGING '+rosterSize,roomMode:'online',seatCount:rosterSize,seatMoveMode:'instant'}});
  gmToken=d.gmToken;await attach(d.roomCode);
});
$('connect').onclick=()=>guarded('Kết nối phòng',()=>{gmToken='';enableGm();return attach($('room').value)});
$('refresh').onclick=()=>guarded('Đồng bộ lại',async()=>{if(feed)await feed.refresh();else if(code)await attach(code);});
let seeded=[];
$('seed').onclick=()=>guarded('Lấp Seat trống bằng thành viên thử',async()=>{
  if(!code||!gmToken)throw Error('Hãy tạo phòng trước');
  await feed?.refresh();
  const room=feed?.state.current?.room,players=feed?.state.current?.players||[];
  if(room?.seatsLocked||room?.phase==='running')throw Error('Phòng đã vào trận');
  const n=Math.min(Number(room?.seatCount)||rosterSize,30),used=new Set(players.map(x=>x.seatId).filter(Boolean));
  const free=Array.from({length:n},(_,i)=>i+1).filter(seat=>!used.has(seat));
  // A real Player Web member may have joined without picking a seat yet:
  // seat these existing people FIRST so creating fake users never crowds them out.
  for(const p of players.filter(x=>!x.seatId)){
    const seatId=free.shift();if(!seatId)throw Error('Không đủ Seat cho thành viên hiện tại');
    await gm('seat',{participantId:p.id,seatId});
  }
  let added=0;
  for(const seatId of free){
    const loginId='ar'+code.toLowerCase()+'p'+String(seatId).padStart(2,'0');
    if(seeded.some(x=>x.loginId===loginId))continue;
    notice('Đăng ký người thử ở Seat '+seatId+'/'+n);
    const account=await json('/api/members/register',{method:'POST',body:{
      loginId,displayName:'Arena '+code+' '+seatId,gameCharacterId:'character-'+String(seatId).padStart(2,'0')
    }});
    const joined=await json(roomUrl('/join'),{method:'POST',body:{token:account.token}});
    const participantId=joined.player?.participantId;
    if(!participantId)throw Error('Thiếu participantId từ Core');
    seeded.push({loginId,participantId,token:account.token});
    await gm('seat',{participantId,seatId});added++;
  }
  await feed?.refresh();notice('Đã bổ sung '+added+' người thử; người đang tham gia Player Web được giữ nguyên và ưu tiên Seat.');
});
$('lock').onclick=()=>guarded('Khóa Seat',async()=>{await gm('seat-lock',{locked:true});await feed?.refresh()});
$('deal').onclick=()=>guarded('Phát Vai thử bằng Core V2',async()=>{
  await feed?.refresh();
  const people=(feed?.state.current?.players||[]).filter(p=>p.id.startsWith('member:'));
  if(!people.length)throw Error('Chưa có thành viên nào trong phòng');
  const matchId='arena-'+crypto.randomUUID();
  const cfg={id:'arena-stage',name:'Ma Sói thử nghiệm Arena',playerCount:people.length,
    roles:[{roleId:'stage-villager',roleName:'Dân Làng',faction:'village',count:people.length}],
    artifactsEnabled:false,timing:{autoAdvance:false,villageDiscussionSec:300,gallowsNominationSec:50,gallowsVoteSec:50}};
  await gm('config',{gameConfig:cfg,matchId,matchRevision:1});
  await gm('assignments',{assignments:people.map(p=>({loginId:p.id.slice(7),roleId:'stage-villager',roleName:'Dân Làng',faction:'village',
    roleCard:{name:'Dân Làng',faction:'village',information:'Bản thử nghiệm phân vai'}})),matchId});
  await feed?.refresh();notice('Core V2 đã Phát Vai tới '+people.length+' thành viên. Người xem 3D không nhận thẻ vai riêng.');
});
$('start').onclick=()=>guarded('Vào Trận',async()=>{
  const room=feed?.state.current?.room;
  await gm('start',{matchId:room?.matchId,matchRevision:room?.matchRevision||1});
  await feed?.refresh();
});
async function cycle(phase){const room=feed?.state.current?.room;
  if(room?.phase!=='running')throw Error('Phải vào trận trước khi chuyển ngày/đêm');
  const n=Math.max(1,Number(room.cycleNight||1));
  await gm('cycle',{phase,night:n,cycleKey:phase+'-'+n,source:'gm'});
  await feed?.refresh();
}
$('night').onclick=()=>guarded('Chuyển Đêm',()=>cycle('night'));
$('day').onclick=()=>guarded('Chuyển Ngày',()=>cycle('morning'));
$('nominate').onclick=()=>guarded('Mở đề cử',async()=>{
  await gm('gallows',{command:'mode',mode:'auto'});
  await gm('gallows',{command:'open'});
  await feed?.refresh();notice('Đã mở đề cử TỰ ĐỘNG. Người chơi trên Player Web STAGING có thể chọn theo luật Core V2.');
});
$('vote').onclick=()=>guarded('Bắt đầu bỏ phiếu',async()=>{
  const candidate=(feed?.state.current?.players||[]).find(p=>p.id.startsWith('member:'))?.id.slice(7);
  if(!candidate)throw Error('Chưa có thành viên hợp lệ');
  await gm('gallows',{command:'begin',targetId:candidate});
  await feed?.refresh();notice('Đã đưa '+candidate+' lên giàn trong Core V2 staging.');
});
for(const button of document.querySelectorAll('[data-roster]'))button.onclick=()=>{
  rosterSize=Number(button.dataset.roster);
  for(const b of document.querySelectorAll('[data-roster]'))b.classList.toggle('active',b===button);
  if(!code)demo(rosterSize);
  else notice('Đã chọn '+rosterSize+' ghế cho phòng MỚI. Phòng hiện tại giữ số Seat Core đã cấp; tạo phòng mới để thử.');
};
document.querySelector('[data-roster="6"]').classList.add('active');
function resize(){
  const rect=canvas.getBoundingClientRect(),key=rect.width+'x'+rect.height;
  if(key!==lastResize){lastResize=key;render.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);
    camera.aspect=Math.max(1,rect.width)/Math.max(1,rect.height);camera.updateProjectionMatrix()}
}
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;
  orbit-=dx*.007;elevation=Math.min(1.45,Math.max(.25,elevation+dy*.005));
  drag.x=e.clientX;drag.y=e.clientY;
});
canvas.addEventListener('pointerup',e=>{
  if(!drag)return;
  if(!drag.moved){
    const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
    const hit=ray.intersectObjects([...actors.values()].map(x=>x.g),true)[0];
    if(hit){let obj=hit.object;while(obj.parent&&obj.parent!==scene)obj=obj.parent;
      const entry=[...actors.values()].find(x=>x.g===obj);
      if(entry){focusId=entry.id;entry.g.rotation.y+=Math.PI/2;notice(entry.id+' xoay 90° — tiếp tục chạm để quay 360°.')}}
  }
  drag=null;
});
canvas.addEventListener('wheel',e=>{e.preventDefault();radius=Math.max(10,Math.min(32,radius+Math.sign(e.deltaY)))},{passive:false});
window.__GMWW_ARENA_STAGE_READONLY=()=>({count:actors.size,room:current?.room.code||null,phase:current?.room.phase||null,
  cyclePhase:current?.room.cyclePhase||null,matchId:current?.room.matchId||null,fps,connected:$('connection').textContent,
  ballot:ballot?.stage||null});
function loop(now){
  resize();
  camera.position.set(Math.sin(orbit)*Math.cos(elevation)*radius,Math.sin(elevation)*radius,
    Math.cos(orbit)*Math.cos(elevation)*radius+1.5);
  camera.lookAt(0,0,1.2);
  fire.scale.y=.94+.07*Math.sin(now/280);
  render.render(scene,camera);frames++;
  if(now-fpsAt>=1000){fps=Math.round(frames*1000/(now-fpsAt));frames=0;fpsAt=now;
    $('hud').textContent=actors.size+' Character · '+fps+' FPS · '+render.info.render.calls+' draw calls';
    document.body.dataset.gmwwStageFps=String(fps);
  }
  requestAnimationFrame(loop);
}
demo(rosterSize);requestAnimationFrame(loop);
const param=new URL(location.href).searchParams.get('room');
if(param)void guarded('Khôi phục trạng thái phòng',()=>attach(param));
