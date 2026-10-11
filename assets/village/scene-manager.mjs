// The server GM publishes the scene; Player Web only reads it.
const panel=document.getElementById('villageSceneManager');
const status=document.getElementById('sceneManagerStatus');
const scene=document.querySelector('.stage');
const game=document.getElementById('game');
const embedded=new URLSearchParams(location.search).has('embed');
const editor=!embedded&&new URLSearchParams(location.search).get('sceneEditor')==='preview';
const state={published:{revision:0,day:null,night:null},draft:{day:null,night:null},files:{day:null,night:null}};
const setStatus=t=>{if(status)status.textContent=t};
function apply(){
 const key=game?.classList.contains('night')?'night':'day';
 const image=(editor&&state.draft[key])||state.published[key];
 if(image){scene.style.setProperty('--gmww-scene-image',`url("${image}")`);scene.classList.add('custom-scene')}
 else{scene.style.removeProperty('--gmww-scene-image');scene.classList.remove('custom-scene')}
}
async function sync(){
 try{const r=await fetch('/api/village-scene',{cache:'no-store'});if(!r.ok)return;
  const data=await r.json();if(data.ok&&data.scene&&data.scene.revision!==state.published.revision){state.published=data.scene;apply()}
 }catch{}
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
}
new MutationObserver(apply).observe(game,{attributes:true,attributeFilter:['class']});
sync();setInterval(sync,15000);
