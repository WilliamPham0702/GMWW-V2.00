// Visual-only scene management. Never mutates seats, rooms, characters or game state.
const panel=document.getElementById('villageSceneManager');
const status=document.getElementById('sceneManagerStatus');
const day=document.getElementById('sceneDayFile'),night=document.getElementById('sceneNightFile');
let current={day:null,night:null},draft={day:null,night:null},history=[];
const scene=document.querySelector('.stage');
const setStatus=message=>{status.textContent=message};
function apply(){
  const isNight=document.getElementById('game')?.classList.contains('night');
  const url=(isNight?draft.night:draft.day)||(isNight?current.night:current.day);
  if(url){scene.style.setProperty('--gmww-scene-image',`url("${url}")`);scene.classList.add('custom-scene');}
  else{scene.classList.remove('custom-scene');scene.style.removeProperty('--gmww-scene-image');}
}
async function loadFile(input,key){
  const file=input.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){setStatus('Ảnh phải là PNG/JPEG/WebP tối đa 8MB');return}
  const url=URL.createObjectURL(file);if(draft[key]?.startsWith('blob:'))URL.revokeObjectURL(draft[key]);
  draft[key]=url;apply();setStatus('Đã xem trước. Chưa xuất bản.');
}
day.addEventListener('change',()=>loadFile(day,'day'));
night.addEventListener('change',()=>loadFile(night,'night'));
document.getElementById('scenePreview').addEventListener('click',apply);
document.getElementById('scenePublish').addEventListener('click',()=>setStatus('Chưa xuất bản: cần kết nối kho ảnh và quyền GM trên Cloudflare.'));
document.getElementById('sceneRollback').addEventListener('click',()=>{draft={day:null,night:null};apply();setStatus('Đã hủy bản xem trước.');});
const observer=new MutationObserver(apply);observer.observe(document.getElementById('game'),{attributes:true,attributeFilter:['class']});
const params=new URLSearchParams(location.search);
// Never expose upload controls in embedded Player Web or without an explicit GM preview flag.
if(!params.has('embed')&&params.get('sceneEditor')==='preview')panel.style.display='block';
