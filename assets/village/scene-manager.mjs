// Read-only Player Web consumer. Only Server GM can publish or roll back.
const panel=document.getElementById('villageSceneManager');
const status=document.getElementById('sceneManagerStatus');
const scene=document.querySelector('.stage');
const game=document.getElementById('game');
const embedded=new URLSearchParams(location.search).has('embed');
const editor=!embedded&&new URLSearchParams(location.search).get('sceneEditor')==='preview';
const state={published:{revision:0,day:null,night:null},draft:{day:null,night:null},ready:false};
const boot=document.getElementById('sceneBootStatus');
const setStatus=t=>{if(status)status.textContent=t};
function apply(){
 if(!state.ready)return;
 const key=game?.classList.contains('night')?'night':'day';
 const image=(editor&&state.draft[key])||state.published[key];
 if(image){scene.style.setProperty('--gmww-scene-image',`url("${image}")`);scene.classList.add('custom-scene')}
 else{scene.style.removeProperty('--gmww-scene-image');scene.classList.remove('custom-scene')}
 scene.classList.remove('scene-awaiting');
 if(boot)boot.hidden=true;
}
let syncInFlight=false;
function preloadSceneImage(src){
 if(!src)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve();
  img.onerror=()=>reject(new Error('Không tải được ảnh làng đã xuất bản'));
  img.src=src;
 });
}
async function sync(){
 if(syncInFlight)return;
 syncInFlight=true;
 try{
  const r=await fetch('/api/village-scene',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json(),next=data.scene;
  if(!data.ok||!next)throw Error('Cấu hình bối cảnh không hợp lệ');
  if(!state.ready||next.revision!==state.published.revision||next.day!==state.published.day||next.night!==state.published.night){
   // Atomic reveal: no original background, blue frame, or late overlay flash.
   await Promise.all([preloadSceneImage(next.day),preloadSceneImage(next.night)]);
   state.published=next;state.ready=true;apply();
  }
 }catch(error){
  if(editor)setStatus(String(error?.message||error));
  if(!state.ready&&boot)boot.textContent='Không thể tải hình nền làng. Đang kết nối lại…';
 }
 finally{syncInFlight=false}
}
function readFile(file){
 return new Promise((resolve,reject)=>{
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>950000)return reject(new Error('Chỉ PNG/JPEG/WebP dưới 950 KB'));
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Không đọc được ảnh'));reader.readAsDataURL(file);
 });
}
if(editor){
 panel.style.display='block';
 for(const key of ['day','night']){
  document.getElementById(key==='day'?'sceneDayFile':'sceneNightFile').addEventListener('change',async e=>{
   try{state.draft[key]=await readFile(e.target.files?.[0]);apply();setStatus('Đang xem trước. Chưa xuất bản.')}
   catch(error){setStatus(error.message)}
  });
 }
 document.getElementById('scenePreview').addEventListener('click',apply);
 document.getElementById('scenePublish').addEventListener('click',()=>setStatus('Xuất bản chỉ thực hiện trong Cài Đặt → Chủ Đề của Server GM.'));
 document.getElementById('sceneRollback').addEventListener('click',()=>{state.draft={day:null,night:null};apply();setStatus('Đã bỏ bản xem trước.')});
 // Preview sent from GM's selected files, without uploading them to Server.
 window.addEventListener('message',event=>{
  if(event.source!==window.opener||event.data?.type!=='gmww:village-preview')return;
  for(const key of ['day','night']){
   const img=event.data[key];
   state.draft[key]=typeof img==='string'&&/^data:image\/(?:webp|png|jpeg);base64,/.test(img)&&img.length<1800000?img:null;
  }
  apply();setStatus('Đang xem trước ảnh GM vừa chọn. Chưa xuất bản.');
 });
 if(window.opener)window.opener.postMessage({type:'gmww:village-preview-ready'},'*');
}
new MutationObserver(apply).observe(game,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});
void sync();setInterval(sync,5000);
