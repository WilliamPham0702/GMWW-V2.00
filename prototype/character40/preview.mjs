import {ACTIONS,SOURCE15,createMotion,setAction,advance,sampleFrame} from './shared-motion.mjs';
const $=s=>document.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d');
let current,state,atlas,paused=false,last=0,speed=1,serial=0,catalog;
const report=window.__CHARACTER40_REPORT={loaded:false,actions:ACTIONS,source:SOURCE15};
function draw(){
  if(!atlas||!state)return;
  const frame=sampleFrame(state),[sx,sy,sw,sh]=current.frames[frame],scale=300/181;
  ctx.clearRect(0,0,960,540);ctx.fillStyle='#e9f0ee';ctx.fillRect(0,0,960,540);
  ctx.fillStyle='#b8c9bd';ctx.fillRect(0,420,960,120);ctx.fillStyle='#69877b';ctx.fillRect(0,420,960,2);
  const x=$('#travel').checked?480+state.x:480;
  ctx.drawImage(atlas,sx,sy,sw,sh,x-sw*scale/2,420-sh*scale,sw*scale,sh*scale);
  report.frame=frame;report.action=state.action;
  $('#status').textContent=`${current.id} · ${state.action} · ${state.facing} · khung ${frame+1}/48`;
  for(const b of $('#actions').children)b.setAttribute('aria-pressed',String(b.dataset.action===state.action));
}
function tick(ms){advance(state,ms);if(Math.abs(state.x)>300){state.x=Math.sign(state.x)*300;state.facing=state.x>0?'left':'right';}draw();}
async function choose(id){
  const request=++serial;report.loaded=false;current=catalog.characters.find(x=>x.id===id)||catalog.characters[0];$('#character').value=current.id;
  $('#original').src=current.original;$('#atlas').src=current.atlas;$('#title').textContent=current.id;
  const im=new Image();im.src=current.atlas;
  try{await im.decode();if(request!==serial)return;atlas=im;state=createMotion(current);report.loaded=true;report.characterId=current.id;draw();}catch(e){$('#status').textContent=`Lỗi tải ảnh: ${e.message}`;}
}
try{
  const response=await fetch('catalog.json');if(!response.ok)throw Error(`Catalog HTTP ${response.status}`);catalog=await response.json();report.catalogCount=catalog.characters.length;
  for(const c of catalog.characters){$('#character').add(new Option(c.id,c.id));const b=document.createElement('button');const im=document.createElement('img');im.src=c.original;im.alt=c.id;im.loading='lazy';b.append(im,document.createTextNode(c.id));b.onclick=()=>choose(c.id);$('#gallery').append(b);}
  for(const action of ACTIONS){const b=document.createElement('button');b.textContent=action[0].toUpperCase()+action.slice(1);b.dataset.action=action;b.onclick=()=>{if(state){setAction(state,action);draw();}};$('#actions').append(b);}
  $('#character').onchange=e=>choose(e.target.value);$('#left').onclick=()=>{state.facing='left';draw();};$('#right').onclick=()=>{state.facing='right';draw();};
  $('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'Tiếp tục':'Tạm dừng';};$('#step').onclick=()=>{paused=true;$('#pause').textContent='Tiếp tục';tick(90);};$('#speed').onchange=e=>speed=Number(e.target.value);$('#travel').onchange=draw;
  await choose(new URL(location).searchParams.get('id')||'character-01');
  requestAnimationFrame(function loop(now){if(state&&!paused)tick(Math.min(50,now-(last||now))*speed);last=now;requestAnimationFrame(loop);});
}catch(e){$('#status').textContent=e.message;report.error=e.message;}
