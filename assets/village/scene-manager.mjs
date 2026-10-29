function createVillageLocalCache(base){
 const scope=new URL(base).origin;
 const valid=x=>x&&x.record&&Number.isFinite(x.record.revision)&&x.images&&['day','night'].every(k=>x.record[k]?typeof x.images[k]==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(x.images[k]):x.images[k]===null);
 function transaction(value){
  return new Promise((resolve,reject)=>{
   let db,done=false;
   const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);if(db)db.close();error?reject(error):resolve(result)};
   const timer=setTimeout(()=>finish(Error('Không mở được kho ảnh local')),2500);
   try{
    const open=indexedDB.open('GMWW_VILLAGE_LOCAL_V1',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('scenes');
    open.onerror=()=>finish(open.error);
    open.onsuccess=()=>{
     db=open.result;if(done){db.close();return}
     const tx=db.transaction('scenes',value?'readwrite':'readonly'),store=tx.objectStore('scenes');
     const request=store.get(scope);let result=null;
     request.onsuccess=()=>{
      result=request.result;
      // A slower request/tab must never overwrite a newer saved pair.
      if(value&&(!valid(result)||value.record.revision>=result.record.revision)){store.put(value,scope);result=value}
     };
     tx.oncomplete=()=>finish(null,result);
     tx.onerror=()=>finish(tx.error||Error('Không lưu được ảnh local'));
     tx.onabort=()=>finish(tx.error||Error('Giao dịch ảnh local bị hủy'));
    };
   }catch(error){finish(error)}
  });
 }
 async function imageBytes(src){
  if(!src)return null;
  if(/^data:image\/(png|jpeg|webp);base64,/.test(src))return src;
  const response=await fetch(new URL(src,base).href,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Không tải được ảnh nền: HTTP '+response.status);
  const blob=await response.blob();
  if(!/^image\/(png|jpeg|webp)$/.test(blob.type))throw Error('Ảnh nền không hợp lệ');
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error('Không đọc được ảnh nền'));reader.readAsDataURL(blob)});
 }
 return {
  async restore(){try{const saved=await transaction();return valid(saved)?saved:null}catch{return null}},
  async prepare(record,previous){
   const images={};
   await Promise.all(['day','night'].map(async k=>{images[k]=valid(previous)&&previous.record[k]===record[k]?previous.images[k]:await imageBytes(record[k])}));
   const next={record:{revision:Number(record.revision)||0,day:record.day||null,night:record.night||null,fireAnchors:record.fireAnchors||{},gallowsAnchors:record.gallowsAnchors||{}},images};
   if(!valid(next))throw Error('Không lưu được cặp ảnh nền hợp lệ');
   return next;
  },
  save:transaction
 };
}
// End village local cache
// Read-only Player Web consumer. Only Server GM can publish or roll back.
const panel=document.getElementById('villageSceneManager');
const status=document.getElementById('sceneManagerStatus');
const scene=document.querySelector('.stage');
const game=document.getElementById('game');
const embedded=new URLSearchParams(location.search).has('embed');
const editor=!embedded&&new URLSearchParams(location.search).get('sceneEditor')==='preview';
const state={published:{revision:0,day:null,night:null},draft:{day:null,night:null},ready:false};
const boot=document.getElementById('sceneBootStatus');
const localCache=createVillageLocalCache(location.href);
let lastGallowsAnchorKey='';
let localSnapshot=null;
async function restoreLocal(){
 const saved=await localCache.restore();if(!saved)return;
 try{
  await Promise.all([preloadSceneImage(saved.images.day),preloadSceneImage(saved.images.night)]);
  localSnapshot=saved;state.published=saved.record;state.ready=true;apply();
 }catch{}
}
const localBoot=restoreLocal();
const setStatus=t=>{if(status)status.textContent=t};
function apply(){
 if(!state.ready)return;
 const key=game?.classList.contains('night')?'night':'day';
 // Scene metadata is shared globally; players never write it.
 const anchors=state.published.gallowsAnchors||{},signature=key+':'+JSON.stringify(anchors);
 globalThis.GMWW_VILLAGE_GALLOWS_ANCHORS=anchors;
 if(signature!==lastGallowsAnchorKey){
   lastGallowsAnchorKey=signature;
   if(typeof Event==='function'&&typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('gmww:village-gallows-anchor'));
 }
 const image=(editor&&state.draft[key])||localSnapshot?.images[key];
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
  await localBoot;
  const r=await fetch('/api/village-scene',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json(),next=data.scene;
  if(!data.ok||!next)throw Error('Cấu hình bối cảnh không hợp lệ');
  if(!state.ready||next.revision!==state.published.revision||next.day!==state.published.day||next.night!==state.published.night){
   // Atomic reveal: no original background, blue frame, or late overlay flash.
   const saved=await localCache.prepare(next,localSnapshot);
   await Promise.all([preloadSceneImage(saved.images.day),preloadSceneImage(saved.images.night)]);
   localSnapshot=saved;
   state.published=next;state.ready=true;apply();
   try{await localCache.save(saved)}catch{setStatus('Chưa lưu được ảnh local. Kiểm tra dung lượng thiết bị.')}
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
void sync();setInterval(()=>{if(!document.hidden)void sync()},5000);
