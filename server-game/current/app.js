(()=>{'use strict';

const VERSION='3.279';
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
const villageSceneDraft={day:null,night:null};
const villageSceneDraftAnchors={day:null,night:null};
let villageScenePublished={revision:0,day:null,night:null};
async function villageSceneFile(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12000000)throw Error('Chỉ nhận ảnh PNG/JPEG/WebP tối đa 12 MB');
 // Keep published image bytes small for Durable Objects and iPhone Player Web.
 const objectUrl=URL.createObjectURL(file);
 try{
  const picture=new Image();picture.decoding='async';
  await new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=()=>reject(Error('Không thể mở ảnh'));picture.src=objectUrl});
  if(!picture.naturalWidth||!picture.naturalHeight)throw Error('Ảnh không hợp lệ');
  let scale=Math.min(1,1920/picture.naturalWidth,1080/picture.naturalHeight);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Trình duyệt không hỗ trợ xử lý ảnh');
  for(let attempt=0;attempt<6;attempt++){
   canvas.width=Math.max(320,Math.round(picture.naturalWidth*scale));
   canvas.height=Math.max(180,Math.round(picture.naturalHeight*scale));
   ctx.drawImage(picture,0,0,canvas.width,canvas.height);
   for(const quality of [.86,.74,.62,.50,.40]){
    let result=canvas.toDataURL('image/webp',quality);
    if(!result.startsWith('data:image/webp'))result=canvas.toDataURL('image/jpeg',quality);
    if(result.length<=850000)return result;
   }
   scale*=.82;
  }
  throw Error('Ảnh quá phức tạp để tối ưu. Vui lòng chọn ảnh khác.');
 }finally{URL.revokeObjectURL(objectUrl)}
}
function villageSceneStatus(message){const node=document.getElementById('gmVillageStatus');if(node)node.textContent=message}
async function villageSceneRequest(path,method,body){
 const response=await fetch(GMWW_SERVER_BASE+path,{method,headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},body:method==='GET'?undefined:JSON.stringify(body||{}),cache:'no-store'});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'HTTP '+response.status);return data;
}
let villageSceneReady=false;
let villageSceneNewestRevision=0;
let villageLocalSnapshot=null,villageLocalBoot=null;
let villageLocalCache=null;
async function restoreGMVillageLocal(){
 villageLocalCache=createVillageLocalCache(GMWW_SERVER_BASE);
 const saved=await villageLocalCache.restore();
 if(!saved)return;
 try{
  await Promise.all([preloadGMVillageScene(saved.images.day),preloadGMVillageScene(saved.images.night)]);
  villageLocalSnapshot=saved;villageScenePublished=saved.record;
  villageSceneNewestRevision=saved.record.revision;villageSceneReady=true;applyGMVillageScene();
 }catch{/* A damaged local record can be replaced by the background sync. */}
}
function applyGMVillageScene(){
 const world=document.getElementById('playWorld');if(!world)return;
 if(!villageSceneReady)return;
 const key=document.getElementById('playShell')?.dataset.phase==='night'?'night':'day';
 const image=villageLocalSnapshot?.images[key]||null;
 if(image){
  world.style.setProperty('--gmww-gm-scene-image',`url("${new URL(image,GMWW_SERVER_BASE).href}")`);
  world.classList.add('has-custom-scene');
 }else{
  world.style.removeProperty('--gmww-gm-scene-image');world.classList.remove('has-custom-scene');
 }
 world.classList.remove('gmww-scene-awaiting');
 const loading=document.getElementById('gmVillageBootStatus');if(loading)loading.hidden=true;
}
function villageFirePosition(){
 const key=playSceneState.phase==='night'?'night':'day',point=villageScenePublished.fireAnchors?.[key];
 if(point&&[point.x,point.y].every(Number.isFinite))return [Math.max(0,Math.min(100,point.x)),Math.max(0,Math.min(100,point.y))];
 // Old GP2 y=64 was a seat-layout landmark, not the centre of an imported
 // 100%-stretched picture. On user artwork this made the GM hitbox move down.
 // Centre is temporary only; each imported image must receive its own marker.
 if(villageScenePublished[key])return [50,50];
 const fallback=globalThis.GMWW_VILLAGE_LAYOUT.fire;return playMapDisplay(fallback.x,fallback.y);
}
// Hanging is a separate scene landmark; Seat locations and fire-menu anchor are unchanged.
function villageGallowsPosition(){
 const key=playSceneState.phase==='night'?'night':'day',point=villageScenePublished.gallowsAnchors?.[key];
 if(point&&[point.x,point.y].every(Number.isFinite))return [Math.max(0,Math.min(100,point.x)),Math.max(0,Math.min(100,point.y))];
 const fire=villageFirePosition();return [fire[0],Math.max(0,fire[1]-15)];
}
function villageCalibrateFire(requestedPhase){
 const key=requestedPhase==='night'?'night':requestedPhase==='day'?'day':
   playSceneState.phase==='night'?'night':'day';
 if(document.getElementById('gmFirePicker'))return;
 const image=villageSceneDraft[key]||villageLocalSnapshot?.images?.[key]||null;
 const world=document.getElementById('playWorld');
 const current=key===(playSceneState.phase==='night'?'night':'day');
 const fallback=!image&&current&&world?getComputedStyle(world).backgroundImage:null;
 if(!image&&(!fallback||fallback==='none')){
   villageSceneStatus('Chưa có ảnh '+(key==='day'?'Ngày':'Đêm')+' để định vị 🔥.');return;
 }
 const draft=!!villageSceneDraft[key],revision=villageScenePublished.revision;
 const picker=document.createElement('div');picker.id='gmFirePicker';picker.setAttribute('role','dialog');
 picker.setAttribute('aria-label','Định vị đống lửa nền '+(key==='day'?'Ngày':'Đêm'));
 picker.style.cssText='position:fixed;inset:0;z-index:2147483000;cursor:crosshair;touch-action:manipulation;background:#071825 center/100% 100% no-repeat';
 picker.style.backgroundImage=image?'url("'+image+'")':fallback;
 const tip=document.createElement('div');
 tip.textContent='🔥 CHẠM CHÍNH GIỮA ĐỐNG LỬA · NỀN '+(key==='day'?'NGÀY':'ĐÊM');
 tip.style.cssText='position:absolute;top:max(18px,env(safe-area-inset-top));left:10px;right:10px;z-index:2;padding:12px;text-align:center;border:1px solid #e9cb86;border-radius:14px;background:#092b3ce8;color:#ffe5b2;font-size:13px;font-weight:850;pointer-events:none';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='✕ HỦY';
 cancel.style.cssText='position:absolute;right:12px;bottom:max(86px,env(safe-area-inset-bottom));z-index:3;padding:12px 20px;min-height:44px;border-radius:12px;color:#fff;background:#15465f;border:1px solid #d9be83;font-weight:850';
 cancel.onclick=e=>{e.stopPropagation();picker.remove()};
 picker.append(tip,cancel);document.body.append(picker);
 picker.addEventListener('click',async e=>{
  if(e.target===cancel)return;
  e.preventDefault();e.stopPropagation();
  const rect=picker.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const point={x:Math.round(Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100))*100)/100,
    y:Math.round(Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))*100)/100};
  picker.remove();
  if(draft){
    villageSceneDraftAnchors[key]=point;
    villageSceneStatus('Đã chọn 🔥 nền '+(key==='day'?'Ngày':'Đêm')+' ('+point.x+'%, '+point.y+'%). Nhấn ÁP DỤNG để lưu cùng ảnh.');
    return;
  }
  try{
    const data=await villageSceneRequest('/api/gm/village-scene','PUT',{expectedRevision:revision,fireAnchors:{[key]:point}});
    await setGMVillageScenePublished(data.scene);renderPlayScene();
    villageSceneStatus('Đã lưu 🔥 nền '+(key==='day'?'Ngày':'Đêm')+' tại '+point.x+'%, '+point.y+'%.');
  }catch(error){playFlashError('Không lưu được vị trí đống lửa: '+error.message)}
 },{once:true});
}
// Same fullscreen touch picker as the GM fire marker, but saved independently.
function villageCalibrateGallows(requestedPhase='day'){
 const key=requestedPhase==='night'?'night':'day';
 if(document.getElementById('gmGallowsPicker')||document.getElementById('gmFirePicker'))return;
 const world=document.getElementById('playWorld'),image=villageLocalSnapshot?.images?.[key]||null;
 const picker=document.createElement('div');picker.id='gmGallowsPicker';picker.setAttribute('role','dialog');
 picker.setAttribute('aria-label','Đặt vị trí treo Lên Giàn trên nền '+(key==='day'?'Ngày':'Đêm'));
 picker.style.cssText='position:fixed;inset:0;z-index:2147483000;cursor:crosshair;touch-action:manipulation;background:rgba(2,20,31,.16) center/100% 100% no-repeat';
 if(image)picker.style.backgroundImage='url("'+image+'")';
 else if(world){
   const style=getComputedStyle(world),pseudo=getComputedStyle(world,'::before');
   const background=style.backgroundImage!=='none'?style.backgroundImage:pseudo.backgroundImage;
   if(background&&background!=='none')picker.style.backgroundImage=background;
 }
 const tip=document.createElement('div');tip.textContent='⚖ CHẠM ĐÚNG VỊ TRÍ MUỐN TREO NHÂN VẬT · NỀN '+(key==='day'?'NGÀY':'ĐÊM');
 tip.style.cssText='position:absolute;top:max(18px,env(safe-area-inset-top));left:10px;right:10px;z-index:2;padding:12px;text-align:center;border:1px solid #e9cb86;border-radius:14px;background:#092b3ce8;color:#ffe5b2;font-size:13px;font-weight:850;pointer-events:none';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='✕ HỦY';
 cancel.style.cssText='position:absolute;right:12px;bottom:max(86px,env(safe-area-inset-bottom));z-index:3;padding:12px 20px;min-height:44px;border-radius:12px;color:#fff;background:#15465f;border:1px solid #d9be83;font-weight:850';
 cancel.onclick=e=>{e.stopPropagation();picker.remove()};
 picker.append(tip,cancel);document.body.append(picker);
 picker.addEventListener('click',async e=>{
   if(e.target===cancel)return;e.preventDefault();e.stopPropagation();
   const rect=picker.getBoundingClientRect();if(!rect.width||!rect.height)return;
   const point={x:Math.round(Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100))*100)/100,
     y:Math.round(Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))*100)/100};
   picker.remove();
   try{
     await villageLocalBoot;
     const latest=await refreshVillageScenePublished();
     const data=await villageSceneRequest('/api/gm/village-scene','PUT',
       {expectedRevision:latest.scene.revision,gallowsAnchors:{[key]:point}});
     await setGMVillageScenePublished(data.scene);
     renderPlayScene();
     villageSceneStatus('Đã lưu vị trí treo Lên Giàn. Player Web tự đồng bộ.');
   }catch(error){playFlashError('Không lưu được vị trí treo: '+error.message)}
 },{once:true});
}
function preloadGMVillageScene(src){
 if(!src)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=resolve;
  image.onerror=()=>reject(Error('Không tải được ảnh nền đã lưu'));
  image.src=new URL(src,GMWW_SERVER_BASE).href;
 });
}
async function setGMVillageScenePublished(record){
 if(!record)throw Error('Server không trả về cấu hình hình nền.');
 const revision=Math.max(0,Number(record.revision)||0);
 if(revision<villageSceneNewestRevision)return;
 villageSceneNewestRevision=revision;
 // Never display the bundled art while waiting for the active custom image.
 const saved=await villageLocalCache.prepare(record,villageLocalSnapshot);
 await Promise.all([preloadGMVillageScene(saved.images.day),preloadGMVillageScene(saved.images.night)]);
 if(revision<villageSceneNewestRevision)return;
 villageLocalSnapshot=saved;villageScenePublished=record;
 villageSceneReady=true;applyGMVillageScene();
 try{await villageLocalCache.save(saved)}catch{throw Error('Ảnh đã hiển thị nhưng chưa lưu được local. Kiểm tra dung lượng thiết bị rồi nhấn ÁP DỤNG lại.')}
}
async function refreshVillageScenePublished(){
 await villageLocalBoot;
 const data=await villageSceneRequest('/api/village-scene','GET');
 if(data.scene&&!villageSceneReady || data.scene&&(data.scene.revision!==villageScenePublished.revision||data.scene.day!==villageScenePublished.day||data.scene.night!==villageScenePublished.night))
  await setGMVillageScenePublished(data.scene);
 return data;
}
function initVillageSceneManager(){
 const day=document.getElementById('gmVillageDay');if(!day||day.dataset.bound)return;day.dataset.bound='1';
 villageLocalBoot=restoreGMVillageLocal();
 for(const key of ['day','night'])document.getElementById(key==='day'?'gmVillageDay':'gmVillageNight').addEventListener('change',async e=>{
  try{
   villageSceneStatus('Đang tối ưu ảnh '+(key==='day'?'ban ngày':'ban đêm')+'...');
   villageSceneDraft[key]=await villageSceneFile(e.target.files?.[0]);
   villageSceneDraftAnchors[key]=null;
   villageSceneStatus('Ảnh '+(key==='day'?'ban ngày':'ban đêm')+' đã sẵn sàng. Nhấn ĐỊNH VỊ 🔥, sau đó ÁP DỤNG.');
  }catch(error){villageSceneDraft[key]=null;villageSceneStatus(error.message)}
 });
 for(const key of ['day','night'])document.getElementById(key==='day'?'gmVillageFireDay':'gmVillageFireNight')?.addEventListener('click',()=>villageCalibrateFire(key));
 const publish=document.getElementById('gmVillagePublish');
 publish.addEventListener('click',async()=>{
  if(!villageSceneDraft.day&&!villageSceneDraft.night){villageSceneStatus('Hãy chọn ảnh Ngày hoặc Đêm trước.');return}
  if(publish.disabled)return;
  publish.disabled=true;villageSceneStatus('Đang áp dụng ảnh làng lên Server...');
  try{
   await villageLocalBoot;
   for(const key of ['day','night'])if(villageSceneDraft[key]&&!villageSceneDraftAnchors[key])
     throw Error('Hãy ĐỊNH VỊ 🔥 trên ảnh '+(key==='day'?'Ngày':'Đêm')+' trước khi ÁP DỤNG.');
   const fireAnchors=Object.fromEntries(Object.entries(villageSceneDraftAnchors).filter(([key,p])=>!!villageSceneDraft[key]&&!!p));
   const data=await villageSceneRequest('/api/gm/village-scene','PUT',
     {...villageSceneDraft,...(Object.keys(fireAnchors).length?{fireAnchors}:{})});
   await setGMVillageScenePublished(data.scene);
   if(Number(villageScenePublished.revision)!==Number(data.scene?.revision))throw Error('Server chưa xác nhận phiên bản mới. Vui lòng kiểm tra lại.');
   villageSceneDraft.day=null;villageSceneDraft.night=null;
   villageSceneDraftAnchors.day=null;villageSceneDraftAnchors.night=null;
   document.getElementById('gmVillageDay').value='';
   document.getElementById('gmVillageNight').value='';
   villageSceneStatus('Đã áp dụng hình nền mới. Player Web sẽ tự đồng bộ.');
  }catch(error){villageSceneStatus('Lỗi áp dụng: '+error.message)}
  finally{publish.disabled=false}
 });
 const rollback=document.getElementById('gmVillageRollback');
 rollback.addEventListener('click',async()=>{
  if(rollback.disabled||!confirm('Khôi phục cả ảnh Ngày và Đêm về bối cảnh mặc định ban đầu cho Server GM và Player Web?'))return;
  rollback.disabled=true;villageSceneStatus('Đang khôi phục bối cảnh mặc định...');
  try{
   await villageLocalBoot;
   const data=await villageSceneRequest('/api/gm/village-scene','PUT',{resetToDefault:true});
   await setGMVillageScenePublished(data.scene);
   if(Number(villageScenePublished.revision)!==Number(data.scene?.revision)||villageScenePublished.day||villageScenePublished.night)throw Error('Server chưa xác nhận khôi phục mặc định.');
   villageSceneDraft.day=null;villageSceneDraft.night=null;
   villageSceneDraftAnchors.day=null;villageSceneDraftAnchors.night=null;
   document.getElementById('gmVillageDay').value='';
   document.getElementById('gmVillageNight').value='';
   villageSceneStatus('Đã khôi phục bối cảnh mặc định ban đầu. Player Web sẽ tự đồng bộ.');
  }catch(error){villageSceneStatus('Lỗi khôi phục: '+error.message)}
  finally{rollback.disabled=false}
 });
  refreshVillageScenePublished().then(data=>villageSceneStatus(data.scene?.day||data.scene?.night?'Đang sử dụng bối cảnh tùy chỉnh.':'Đang sử dụng bối cảnh mặc định ban đầu.')).catch(error=>villageSceneStatus('Không nạp được bối cảnh: '+error.message));
 setInterval(()=>{void refreshVillageScenePublished().catch(()=>{})},5000);
}
document.addEventListener('DOMContentLoaded',initVillageSceneManager);

// V2.82 runtime: stable Player session restore + seated idle animation.
// Retain the existing storage namespace: this release changes presentation only.
const STATE_KEY='GMWW_V258_STATE';
const PREF_KEY='GMWW_V258_PREFS';
const PLAY_AUDIO_MUTED_KEY='GMWW_V289_PLAY_AUDIO_MUTED';
const OLD_STATE_KEYS=['GMWW_V257_STATE','GMWW_V256_STATE','GMWW_V255_STATE','GMWW_V254_STATE','GMWW_V253_STATE','GMWW_V252_STATE','GMWW_V251_STATE','GMWW_V250_STATE','GMWW_V247_STATE','GMWW_V246_STATE','GMWW_V245_STATE','GMWW_V244_STATE','GMWW_V243_STATE','GMWW_V242_STATE','GMWW_V241_STATE','GMWW_V240_STATE','GMWW_V239_STATE','GMWW_V238_STATE','GMWW_V237_STATE','GMWW_V236_STATE','GMWW_V235_STATE','GMWW_V234_STATE','GMWW_V233_STATE','GMWW_V232_STATE','GMWW_V231_STATE','GMWW_V230_STATE','GMWW_V229_STATE','GMWW_V228_STATE','GMWW_V227_STATE','GMWW_V226_STATE','GMWW_V225_STATE','GMWW_V224_STATE','GMWW_V223_STATE','GMWW_V222_STATE','GMWW_V221_STATE','GMWW_V220_STATE','GMWW_V219_STATE','GMWW_V218_STATE','GMWW_V217_STATE','GMWW_V216_STATE','GMWW_V215_STATE','GMWW_V214_STATE','GMWW_V213_STATE','GMWW_V212_STATE','GMWW_V211_STATE','GMWW_V210_STATE','GMWW_V209_STATE','GMWW_V208_STATE','GMWW_V207_STATE','GMWW_V206_STATE','GMWW_V205_STATE','GMWW_V109_STATE','GMWW_V1_09_STATE','GMWW_V108_STATE'];
const OLD_PREF_KEYS=['GMWW_V257_PREFS','GMWW_V256_PREFS','GMWW_V255_PREFS','GMWW_V254_PREFS','GMWW_V253_PREFS','GMWW_V252_PREFS','GMWW_V251_PREFS','GMWW_V250_PREFS','GMWW_V247_PREFS','GMWW_V246_PREFS','GMWW_V245_PREFS','GMWW_V244_PREFS','GMWW_V243_PREFS','GMWW_V242_PREFS','GMWW_V241_PREFS','GMWW_V240_PREFS','GMWW_V239_PREFS','GMWW_V238_PREFS','GMWW_V237_PREFS','GMWW_V236_PREFS','GMWW_V235_PREFS','GMWW_V234_PREFS','GMWW_V233_PREFS','GMWW_V232_PREFS','GMWW_V231_PREFS','GMWW_V230_PREFS','GMWW_V229_PREFS','GMWW_V228_PREFS','GMWW_V227_PREFS','GMWW_V226_PREFS','GMWW_V225_PREFS','GMWW_V224_PREFS','GMWW_V223_PREFS','GMWW_V222_PREFS','GMWW_V221_PREFS','GMWW_V220_PREFS','GMWW_V219_PREFS','GMWW_V218_PREFS','GMWW_V217_PREFS','GMWW_V216_PREFS','GMWW_V215_PREFS','GMWW_V214_PREFS','GMWW_V213_PREFS','GMWW_V212_PREFS','GMWW_V211_PREFS','GMWW_V210_PREFS','GMWW_V209_PREFS','GMWW_V208_PREFS','GMWW_V207_PREFS','GMWW_V206_PREFS','GMWW_V205_PREFS','GMWW_V109_PREFS','GMWW_V1_09_PREFS','GMWW_V108_PREFS'];
const DB_NAME='GMWW_V208_THEME_ASSETS';
const DB_STORE='assets';
const LEGACY_V1_ASSET_DBS=['GMWW_ASSETS_921','GMWW_THEME_ASSETS_946','GMWW_THEME_UI_987','GMWW_MATCH_CACHE_933','GMWW_AUDIO_LIBRARY'];

const THEME_UI_GROUPS=[
  // Only publish controls with an actual consumer in applyActiveThemeUi.
  {id:'background',title:'🌌 Hình nền đang sử dụng',slots:[
    ['bg.home','Nền Trang Chủ'],['bg.play','Nền Chơi'],
    ['bg.library','Nền Thư Viện'],['bg.settings','Nền Cài Đặt']
  ]},
  {id:'home',title:'🏝️ Hình ảnh Trang Chủ',slots:[
    ['banner.home','Banner Làng Biển'],
    ['ui.homePortal','Hình Nút Vào Làng'],
    ['ui.exploreDeck','Khám Phá • Bộ Bài'],
    ['ui.exploreMembers','Khám Phá • Thành Viên'],
    ['ui.exploreTemplates','Khám Phá • Ván Mẫu'],
    ['ui.bottomNavArt','Hình Thanh Điều Hướng']
  ]}
];

const DEFAULT_STATE={
  version:VERSION,
  cards:[
    {
      id:'role_old_witch',legacyId:'source-18',name:'Phù Thuỷ Già',factionId:'village',
      information:'Mỗi đêm bạn có thể Đuổi 1 người ra khỏi làng. Tất cả các tác động lên người đó đều không có tác dụng.\n\nHoặc bạn có thể Hồi Sinh 1 người bị chết từ ngày hoặc đêm hôm trước.\n\nMỗi đêm chỉ được chọn sử dụng 1 trong 2 chức năng: Đuổi hoặc Hồi Sinh.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'Mỗi đêm chỉ dùng Đuổi hoặc Hồi Sinh, không dùng cả hai.',conditions:'',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[
        {id:'fn_old_witch_exile',actionId:'action_exile',description:'Mỗi đêm Đuổi 1 người ra khỏi làng. Không được Đuổi cùng một người 2 đêm liên tiếp.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_exile']},
        {id:'fn_old_witch_revive',actionId:'action_revive',description:'Hồi Sinh 1 người chết từ ngày hôm trước hoặc đêm hôm trước. Chỉ dùng 1 lần trong ván.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:true,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:true,perUserLimit:0,effectIds:['effect_revive']}
      ]
    },
    {
      id:'role_fairy',legacyId:'source-19',name:'Yêu Tinh',factionId:'village',
      information:'Mỗi đêm bạn thức dậy và di chuyển vết Sói Cắn sang trái hoặc sang phải. Bạn không được biết vết Sói Cắn đang ở đâu. Trường hợp không có vết Sói Cắn, bạn vẫn được gọi dậy và kích hoạt chức năng bình thường nhưng hành động không có tác dụng.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'Luôn được gọi dậy mỗi đêm, kể cả khi không có vết Sói Cắn.',attributes:'Không được biết vị trí vết Sói Cắn.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_fairy_transfer',actionId:'action_transfer_bite',description:'Chọn hướng Trái hoặc Phải để dịch chuyển vết Sói Cắn. Nếu không có vết cắn, hành động vẫn ghi nhận nhưng không tạo tác động.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:0,noSelf:false,allowDead:false,noTarget:true,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_transfer_bite']}]
    },
    {
      id:'role_assassin',legacyId:'source-20',name:'Sát Thủ',factionId:'third',
      information:'Mỗi đêm bạn được gọi dậy, chọn một người và đánh dấu lên họ Like 👍 hoặc Dislike 👎. Sáng hôm sau, người đó được gọi dậy và chọn dấu của họ. Nếu dấu của họ cùng với bạn, họ sống. Nếu dấu của họ khác với bạn, họ chết.\n\nĐiều kiện thắng: Khi tất cả các Sói và Kẻ Hủy Diệt (nếu có trong ván) chết hết, bạn sẽ thắng.',
      lives:1,flags:{useDay:true,useNight:true,nightImmune:true,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Khi tất cả các Sói và Kẻ Hủy Diệt (nếu có trong ván) chết hết, Sát Thủ thắng.',
      limits:'Mỗi đêm 1 mục tiêu.',conditions:'Mục tiêu hợp lệ theo trạng thái đầu đêm; người bị tác động chết/Đuổi trong chính đêm vẫn có thể được chọn.',attributes:'Bất tử ban đêm.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_assassin_mark',actionId:'action_assassin_mark',description:'Chọn 1 người và bí mật đánh dấu Like 👍 hoặc Dislike 👎. Sáng hôm sau mục tiêu chọn dấu; cùng dấu sống, khác dấu chết. Nếu mục tiêu đã bị Đuổi trong chính đêm đó, không gọi lại sáng hôm sau và Sát Thủ mất lượt.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_assassin_mark']}]
    },
    {
      id:'role_maiden',legacyId:'source-17',name:'Thiếu Nữ',factionId:'village',
      information:'Mỗi đêm bạn có thể Thăm Nhà một người khác. Nếu mục tiêu là Sói thì bạn chết.\n\nNếu người được thăm bị tác động chết thì bạn cũng chết theo.\n\nNếu bạn không đi Thăm Nhà người khác và bạn bị tác động chết thì bạn cũng chết.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'Mục tiêu hợp lệ theo trạng thái đầu đêm.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_maiden_visit',actionId:'action_visit_house',description:'Chọn 1 người khác để Thăm Nhà. Nếu mục tiêu là Sói thì Thiếu Nữ chết; nếu người được thăm bị tác động chết trong đêm thì Thiếu Nữ chết theo. Nếu không đi thăm và bị tác động chết thì chết bình thường.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_visit_house']}]
    },
    {
      id:'role_snow_wolf',legacyId:'source-46',name:'Sói Tuyết',factionId:'wolf',
      information:'Mỗi đêm bạn chọn 1 người để Đóng Băng. Người bị Đóng Băng không thể thực hiện chức năng trong đêm đó.\n\nNếu Đóng Băng trúng Sói Trùm, vết Cắn của bầy Sói trong đêm đó không có tác dụng.\n\nBạn không được tham gia Cắn khi bầy Sói còn sống. Bạn chỉ được thực hiện chức năng Cắn khi bầy Sói chỉ còn một mình bạn.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'Không Đóng Băng cùng một người 2 đêm liên tiếp.',conditions:'Chức năng Cắn chỉ kích hoạt khi Sói Tuyết là Sói duy nhất còn sống.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[
        {id:'fn_snow_wolf_freeze',actionId:'action_snow_wolf_freeze',description:'Mỗi đêm Đóng Băng 1 người. Nếu trúng Sói Trùm, vết Cắn của Bầy Sói đêm đó không có tác dụng.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:1,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_snow_wolf_freeze']},
        {id:'fn_snow_wolf_bite',actionId:'action_wolf_bite',description:'Chỉ Cắn khi Sói Tuyết là Sói duy nhất còn sống.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,requiresNoOtherLivingWolf:true,usesPackBite:true,allowFriendlyFaction:true,effectIds:['effect_wolf_bite']}
      ]
    },
    {
      id:'role_guard',legacyId:'source-4',name:'Bảo Vệ',factionId:'village',
      information:'Mỗi đêm, bạn được chọn một người để bảo vệ họ khỏi vết Sói Cắn.\n\nNgười được bảo vệ sẽ không chết bởi vết Sói Cắn trực tiếp hoặc vết Sói Cắn được dịch chuyển vào họ.\n\nBảo Vệ không có tác dụng trước bình của Phù Thủy hoặc các tác động gây chết khác.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'Không được bảo vệ cùng một người hai đêm liên tiếp.',conditions:'',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_guard_protect',actionId:'action_protect',description:'Bảo vệ 1 người khỏi tác động gây chết có nguồn gốc wolf_bite, gồm Cắn trực tiếp và vết Cắn dịch chuyển. Không chặn bình Phù Thủy hay tác động chết khác.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:1,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_protected']}]
    },
    {
      id:'role_alpha_wolf',legacyId:'source-44',name:'Sói Trùm',factionId:'wolf',
      information:'Phe Sói. Sói Trùm tham gia Cắn cùng đàn. Tiên Tri soi Sói Trùm cho kết quả KHÔNG PHẢI SÓI. Nếu Sói Trùm bị Sói Tuyết Đóng Băng, toàn bộ vết Cắn của đàn trong đêm đó bị hủy.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'',attributes:'Tiên Tri soi cho kết quả KHÔNG PHẢI SÓI.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:true,actionId:'action_wolf_bite',scope:'shared',blockOn:['expelled','blocked']},
      functions:[{id:'fn_alpha_wolf_bite',actionId:'action_wolf_bite',description:'Thức dậy cùng Bầy Sói và tham gia Cắn chung.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,usesPackBite:true,allowFriendlyFaction:true,effectIds:['effect_wolf_bite']}]
    },
    {
      id:'role_wolf',legacyId:'source-43',name:'Sói Thường',factionId:'wolf',
      information:'Mỗi đêm, bạn thức dậy cùng Bầy Sói tham gia Cắn.',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'',limits:'',conditions:'Mục tiêu hợp lệ theo trạng thái đầu đêm.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'action_wolf_bite',scope:'shared',blockOn:[]},
      functions:[{id:'fn_wolf_bite',actionId:'action_wolf_bite',description:'Mỗi đêm thức dậy cùng Bầy Sói và tham gia Cắn. Được chọn bản thân và người cùng Phe; không chọn người đã chết/bị Đuổi từ trước khi đêm bắt đầu.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,usesPackBite:true,allowFriendlyFaction:true,effectIds:['effect_wolf_bite']}]
    }
    ,{id:'role_witch',legacyId:'source-5',name:'Phù Thủy',factionId:'village',information:'Mỗi đêm bạn được gọi dậy và biết người bị Sói cắn. Bạn có 1 bình Cứu và 1 bình Giết. Bình Cứu dùng để cứu người bị Sói cắn; Bình Giết dùng để chọn một người chết. Mỗi bình chỉ được sử dụng 1 lần trong cả ván.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:true,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Mỗi bình chỉ dùng 1 lần trong cả ván.',conditions:'Hai bình hoạt động độc lập.',attributes:'Không có thuộc tính đặc biệt.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_witch_save',actionId:'action_witch_save',description:'Cứu người nhận vết Sói cắn cuối cùng.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_witch_save']},{id:'fn_witch_kill',actionId:'action_witch_kill',description:'Chọn 1 người để Giết bằng bình Giết.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_kill']}]},
    {id:'role_hunter',legacyId:'source-3',name:'Thợ Săn',factionId:'village',information:'Bạn nghi ngờ ai là Sói thì hãy đặt thuốc nổ vào nhà họ. Nếu bạn chết, người đó sẽ chết theo. Bạn không thể săn người thuộc Phe Ba.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Không giới hạn số lần sử dụng Săn.',conditions:'Mục tiêu không được là Phe Ba.',attributes:'Khi Thợ Săn chết, mục tiêu đang được Săn chết theo.',passiveRule:{enabled:true,type:'source_death',onDeath:true,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_hunter_hunt',actionId:'action_hunt',description:'Chọn 1 người để đặt thuốc nổ. Nếu Thợ Săn chết, mục tiêu đã Săn chết theo. Không săn được Phe Ba.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'on_actor_death',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_hunted_death']}]},
    {id:'role_spiritualist',legacyId:'source-31',name:'Nhà Tinh Thần Học',factionId:'village',information:'Bạn là Nhà Tinh Thần Học lỗi lạc của làng. Mỗi đêm, bạn được chọn 2 người để biết họ cùng Phe hay khác Phe. Bạn được sử dụng chức năng tối đa 4 lần trong 5 đêm đầu.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Tối đa 4 lần trong 5 đêm đầu; mỗi đêm tối đa 1 lần.',conditions:'Hai mục tiêu phải khác nhau.',attributes:'So sánh bằng Phe hiện tại / Faction ID chuẩn hóa.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_spiritualist_compare',actionId:'action_compare_faction',description:'Chọn 2 người để kiểm tra Cùng Phe hoặc Khác Phe.',phase:'night',usageMode:'custom',usageCount:4,fromNight:1,toNight:5,cooldownNights:0,targetCount:2,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_compare_faction']}]},
    {id:'role_drunk',legacyId:'source-33',name:'Say Rượu',factionId:'village',information:'Bạn là một bợm nhậu của làng. Vì uống quá chén nên 2 đêm đầu bạn ngủ quên, không thức dậy thực hiện chức năng. Từ Đêm 3, bạn thức dậy đầu tiên và sẽ nhận Lá Vai Trò của một trong những người đã chết. Trường hợp không có người chết, bạn trở thành Dân Làng và không có chức năng.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Chỉ kích hoạt 1 lần ở Đêm 3.',conditions:'Đêm 1 và 2 ngủ quên; Đêm 3 thức dậy đầu tiên.',attributes:'Action Say và trạng thái Tỉnh Rượu là hai entity riêng.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_drunk_sober',actionId:'action_drunk_draw',description:'Đêm 3 bốc Lá Vai Trò của một trong những người đã chết. Không có người chết thì trở thành Dân Làng và không có chức năng.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:3,toNight:3,cooldownNights:0,targetCount:0,noSelf:false,allowDead:false,noTarget:true,allowConsecutive:true,passive:false,activation:'night_3_first',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_sober']}]},
    {id:'role_cursed',legacyId:'source-59',name:'Kẻ Bị Nguyền',factionId:'village',information:'Bạn là một người dân lương thiện nhưng bị trúng lời nguyền của một Phù Thủy độc ác. Khi bị Sói cắn, bạn không chết và sẽ trở thành Sói vào đêm tiếp theo. Nếu được Bảo Vệ khỏi vết Sói cắn hoặc được Phù Thủy cứu, lời nguyền không kích hoạt và bạn vẫn là Dân Làng.',lives:1,flags:{useDay:false,useNight:false,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng khi chưa biến đổi; sau khi trở thành Sói Thường thì thắng cùng Phe Sói.',limits:'Không có Action chủ động.',conditions:'Chỉ kích hoạt khi vết Sói cắn có hiệu lực; Bảo Vệ hoặc Phù Thủy cứu thành công thì không kích hoạt.',attributes:'Bị vết Sói cắn có hiệu lực: không chết, sang đêm tiếp theo trở thành Sói Thường.',passiveRule:{enabled:true,type:'source_death',onDeath:false,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]},
    {id:"role_thug",legacyId:"source-thug",name:"Du Côn",factionId:"village",information:"Vào buổi sáng sớm, bạn nghi ngờ ai là Sói hoặc Phe Ba thì lật Lá Vai Trò và Đâm họ. Đúng Phe Sói/Phe Ba: mục tiêu chết; nhầm Dân Làng: bạn chết.",lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Dân Làng.",limits:"Đâm tối đa 1 lần cả ván; sau khi Đâm mất chức năng.",conditions:"",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_thug_stab',actionId:'action_stab',description:'morning_reveal_and_stab',phase:'day',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'morning_reveal_and_stab',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_stab']}]},
    {id:"role_bigfoot",legacyId:"source-bigfoot",name:"Chân To",factionId:"village",information:"Ban đầu bạn thuộc Phe Dân. Nếu ngày đầu tiên không có ai bị treo cổ, bạn trở thành Sói và tham gia Sói Cắn từ đêm tiếp theo.",lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:"Thắng theo Phe hiện tại.",limits:"",conditions:"Chỉ xét ngày đầu; nếu không có ai bị treo cổ, chuyển Vai Trò/Phe thành Sói và tham gia Sói Cắn từ đêm 2.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]},
    {id:"role_piper",legacyId:"source-62",name:"Kẻ Thổi Sáo",factionId:"village",information:"Trong 3 đêm đầu, mỗi đêm chọn 3 người còn sống; trò chơi cho biết trong nhóm có Sói hay không. Được chọn bản thân.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Dân Làng.",limits:"Mỗi đêm một lần trong 3 đêm đầu.",conditions:"",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_piper_scan',actionId:'action_scan_three',description:'return_contains_wolf_boolean',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:3,cooldownNights:0,targetCount:3,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'return_contains_wolf_boolean',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_scan_three']}]},
    {id:"role_wolf_seer",legacyId:"source-51",name:"Sói Tiên Tri",factionId:"wolf",information:"Mỗi đêm chọn một người còn sống khác bản thân để biết họ có phải Tiên Tri hay không. Không tham gia Sói Cắn cho tới khi là con Sói cuối cùng trong bầy.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Sói.",limits:"",conditions:"Chỉ tham gia Sói Cắn khi là Sói cuối cùng trong bầy.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_wolf_seer',actionId:'action_find_seer',description:'return_is_seer_boolean',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'return_is_seer_boolean',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_find_seer']}]},
    {id:"role_wolf_cub",legacyId:"source-49",name:"Sói Con",factionId:"wolf",information:"Bạn là đứa con của Sói Trùm. Nếu bạn chết, đêm hôm sau Bầy Sói được Cắn hai người.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Sói.",limits:"",conditions:"Khi chết, đêm kế tiếp Bầy Sói được Cắn hai mục tiêu; chỉ một đêm.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_wolf_cub_bite',actionId:'action_wolf_bite',description:'',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_wolf_bite']}]},
    {id:"role_wolf_hunter",legacyId:"source-54",name:"Sói Thợ Săn",factionId:"wolf",information:"Đêm đầu tiên của ván game, chọn một người còn sống khác bản thân. Nếu bạn chết, người đó chết theo. Nếu mục tiêu chết trước, được chọn lại vào đêm tiếp theo.",lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:"Thắng cùng Phe Sói.",limits:"",conditions:"Nếu mục tiêu chết trước thì chọn lại đêm tiếp theo.",attributes:"",passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_wolf_hunter_bite',actionId:'action_wolf_bite',description:'',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_wolf_bite']},{id:'fn_wolf_hunter_mark',actionId:'action_hunter_mark',description:'night_one_or_after_marked_target_death',phase:'night',usageMode:'unlimited',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'night_one_or_after_marked_target_death',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_hunter_mark']}]},
    {id:'role_seer',legacyId:'source-2',name:'Tiên Tri',factionId:'village',information:'Mỗi đêm, bạn được chọn 1 người còn sống khác bản thân để Soi. Kết quả là SÓI hoặc KHÔNG PHẢI SÓI. Sói Trùm là ngoại lệ: Tiên Tri luôn nhận kết quả KHÔNG PHẢI SÓI.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Mỗi đêm 1 lần; được chọn lại cùng mục tiêu ở đêm sau.',conditions:'Không chọn bản thân; không chọn người chết.',attributes:'Sói Trùm cho kết quả KHÔNG PHẢI SÓI.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_seer',actionId:'action_seer',description:'Soi 1 người để biết có thuộc Phe Sói hay không.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_seer']}]},
        {id:'role_villager',legacyId:'source-1',name:'Dân Làng',factionId:'village',information:'Bạn là Dân Làng. Bạn không có chức năng đặc biệt.',lives:1,flags:{useDay:false,useNight:false,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Không có Action chủ động.',conditions:'Đêm 1 có thể gọi để xác thực Vai Trò; từ Đêm 2 không gọi dậy và không phát Audio nếu không phát sinh chức năng khác.',attributes:'',passiveRule:{enabled:true,type:'identity_only',onDeath:false,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]},
        {id:'role_destroyer',legacyId:'source-23',name:'Kẻ Huỷ Diệt',factionId:'third',information:'Bạn thuộc Phe Ba và Bất Tử Ban Đêm. Mỗi đêm chỉ được chọn một trong hai chức năng: Soi hoặc Giết. Soi đọc tên Vai Trò của mục tiêu, không đọc Phe. Giết chỉ thành công với Tiên Tri, Phù Thủy, Thợ Săn, Bảo Vệ hoặc Sát Thủ; chọn sai thì mục tiêu sống và bạn chết.',lives:1,flags:{useDay:false,useNight:true,nightImmune:true,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng khi Tiên Tri, Phù Thủy, Thợ Săn, Bảo Vệ và Sát Thủ nếu có trong ván đều đã chết. Vai Trò không có trong ván không được tính.',limits:'Mỗi đêm chỉ dùng Soi hoặc Giết, không dùng cả hai.',conditions:'Giết sai khiến Kẻ Huỷ Diệt chết và phản phệ này bỏ qua Bất Tử Ban Đêm.',attributes:'Bất Tử Ban Đêm.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:true,actionId:'destroyer_choice',scope:'self',blockOn:['action_destroyer_scry','action_destroyer_kill']},functions:[{id:'fn_destroyer_scry',actionId:'action_destroyer_scry',description:'Soi 1 người; đọc tên Vai Trò, không đọc Phe.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'choose_one_of_two',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_destroyer_scry']},{id:'fn_destroyer_kill',actionId:'action_destroyer_kill',description:'Giết đúng nhóm Vai Trò mục tiêu; chọn sai thì Kẻ Huỷ Diệt chết.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'choose_one_of_two',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_destroyer_kill']}]},
        {id:'role_clone',legacyId:'source-24',name:'Nhân Bản',factionId:'village',information:'Ban đầu bạn thuộc Phe Dân. Đêm 1 chọn 1 người còn sống khác bản thân. Khi người đó chết bởi bất kỳ lý do nào, bạn giữ tên và Avatar của mình nhưng nhận toàn bộ chức năng của Vai Trò mục tiêu, chuyển sang Phe hiện tại của mục tiêu và từ đó thắng theo Phe mới.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:true,soloWolfOnly:false},winCondition:'Trước khi kế thừa: thắng cùng Phe Dân Làng. Sau khi kế thừa: thắng theo Phe hiện tại của Vai Trò mục tiêu.',limits:'Chọn đúng 1 mục tiêu ở Đêm 1; không được chọn lại.',conditions:'Mục tiêu phải còn sống, không phải bản thân. Khi kế thừa phải lưu dấu Trước đây: Nhân Bản; Action kế thừa chạy tại Box nguồn của Vai Trò nhận được.',attributes:'Giữ tên và Avatar gốc của Người Chơi.',passiveRule:{enabled:true,type:'target_death_inherit',onDeath:false,skipDead:true},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_clone_target',actionId:'action_clone_target',description:'Đêm 1 chọn 1 người để liên kết Nhân Bản.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:1,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'night_1',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_clone_watch']}]},
        {id:'role_aura_seer',legacyId:'source-34',name:'Tiên Tri Hào Quang',factionId:'village',information:'Trong 4 đêm đầu tiên, bạn có tổng cộng 2 lần sử dụng chức năng để đọc chức năng của một Người Chơi.',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'Thắng cùng Phe Dân Làng.',limits:'Chỉ dùng từ Đêm 1 đến hết Đêm 4; tổng tối đa 2 lần cả ván; mỗi đêm tối đa 1 lần.',conditions:'Chọn 1 Người Chơi; được chọn bản thân; không chọn người chết.',attributes:'Kết quả đọc các chức năng của mục tiêu.',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[{id:'fn_aura_read',actionId:'action_aura_read',description:'Đọc chức năng của 1 Người Chơi.',phase:'night',usageMode:'nGame',usageCount:2,fromNight:1,toNight:4,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,perNightLimit:1,effectIds:['effect_aura_read']}]},
    {id:'role_knight',legacyId:'source-13',name:'Hiệp Sĩ',factionId:'village',
      information:'Nếu bạn bị chết do treo cổ bạn vẫn chết nhưng sẽ được chọn một người chết vào sáng hôm sau.',
      lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Thắng cùng Phe Dân Làng.',limits:'Chỉ kích hoạt 1 lần trong cả ván.',conditions:'Chỉ kích hoạt khi Hiệp Sĩ bị vote treo cổ. Trước khi Hiệp Sĩ chết, chọn 1 người còn sống khác bản thân; mục tiêu sẽ chết vào sáng hôm sau.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_knight_last_strike',actionId:'action_knight_last_strike',description:'Khi bị vote treo cổ, trước khi chết chọn 1 người còn sống khác bản thân để chết vào sáng hôm sau.',phase:'day',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'on_lynched_before_death',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_knight_last_strike']}]},
    {id:'role_fox',legacyId:'source-14',name:'Hồ Ly',factionId:'village',
      information:'Mỗi đêm bạn được chọn 3 người và Quản trò sẽ báo cho bạn biết trong nhóm đó có Sói hay không?',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Thắng cùng Phe Dân Làng.',limits:'Mỗi đêm chọn đúng 3 người còn sống.',conditions:'Không được chọn bản thân hoặc người chết.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_fox_scan',actionId:'action_fox_scan',description:'Mỗi đêm chọn 3 người còn sống. Trả CÓ SÓI nếu có ít nhất 1 người thuộc Phe Sói, ngược lại trả KHÔNG CÓ SÓI.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:3,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_fox_scan']}]},
    {id:'role_bear_god',legacyId:'source-15',name:'Thần Gấu',factionId:'village',
      information:'Mỗi sáng bạn được chọn 2 người nếu trong 2 người đó có Sói, Quản trò sẽ báo cho bạn biết trong nhóm đó có sói không. Được dùng 2 lần/ ván',
      lives:1,flags:{useDay:true,useNight:false,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Thắng cùng Phe Dân Làng.',limits:'Tối đa 2 lần trong cả ván; mỗi sáng tối đa 1 lần.',conditions:'Chọn 2 người còn sống; không chọn bản thân hoặc người chết.',attributes:'',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_bear_scan',actionId:'action_bear_scan',description:'Mỗi sáng chọn 2 người còn sống. Trả CÓ SÓI nếu có ít nhất 1 người thuộc Phe Sói, ngược lại trả KHÔNG CÓ SÓI. Tối đa 2 lần/ván.',phase:'day',usageMode:'nGame',usageCount:2,fromNight:1,toNight:null,cooldownNights:0,targetCount:2,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'morning',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_bear_scan']}]},
    {id:'role_thief',legacyId:'source-16',name:'Kẻ Trộm',factionId:'village',
      information:'Từ đêm 3 được chọn 1 lá Vai Trò trong bộ bài để đổi vai trò hoặc không đổi, khi đổi thì các thông tin chức năng, điều kiện thắng thay đổi theo vai trò mới',
      lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
      winCondition:'Theo Phe hiện tại sau khi đổi Vai Trò.',limits:'Chỉ được quyết định 1 lần trong cả ván, từ Đêm 3 trở đi.',conditions:'Chọn 1 Lá Vai Trò trong bộ bài để đổi hoặc chọn không đổi.',attributes:'Khi đổi Vai Trò, Phe, chức năng và điều kiện thắng thay đổi theo Vai Trò mới.',
      passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},
      functions:[{id:'fn_thief_change_role',actionId:'action_thief_change_role',description:'Từ Đêm 3, chọn 1 Lá Vai Trò trong bộ bài để đổi Vai Trò hoặc không đổi. Nếu đổi, nhận Vai Trò, Phe, chức năng và điều kiện thắng của Vai Trò mới.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:3,toNight:null,cooldownNights:0,targetCount:0,noSelf:false,allowDead:false,noTarget:true,allowConsecutive:true,passive:false,activation:'choose_role_card_or_keep',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0,effectIds:['effect_thief_change_role']}]}

  ],
  artifacts:[],
  actions:{
    role:[

      {id:'action_seer',legacyId:'9',name:'Soi Xét',description:'Soi 1 người còn sống khác bản thân để nhận kết quả SÓI / KHÔNG PHẢI SÓI; Sói Trùm trả KHÔNG PHẢI SÓI.',effectIds:['effect_seer']},
      {id:'action_destroyer_scry',legacyId:'action-destroyer-scry',name:'Soi Vai Trò',description:'Soi 1 người và đọc tên Vai Trò, không đọc Phe.',effectIds:['effect_destroyer_scry']},
      {id:'action_destroyer_kill',legacyId:'action-destroyer-kill',name:'Giết Mục Tiêu Huỷ Diệt',description:'Giết đúng Tiên Tri, Phù Thủy, Thợ Săn, Bảo Vệ hoặc Sát Thủ; chọn sai thì nguồn chết.',effectIds:['effect_destroyer_kill']},
      {id:'action_clone_target',legacyId:'action-clone-target',name:'Chọn Người Nhân Bản',description:'Đêm 1 chọn 1 người sống khác bản thân; khi mục tiêu chết thì nhận chức năng và chuyển theo Phe của họ.',effectIds:['effect_clone_watch']},
      {id:'action_aura_read',legacyId:'action-g7-aura-read',name:'Đọc Chức Năng',description:'Trong Đêm 1–4, chọn 1 Người Chơi để đọc các chức năng của họ; tối đa 2 lần/ván và 1 lần/đêm.',effectIds:['effect_aura_read']},
      {id:'action_stab',name:'Đâm',effectIds:['effect_stab']},
      {id:'action_scan_three',name:'Soi Nhóm Ba Người',effectIds:['effect_scan_three']},
      {id:'action_find_seer',name:'Soi Tiên Tri',effectIds:['effect_find_seer']},
      {id:'action_hunter_mark',name:'Đánh Dấu Săn',effectIds:['effect_hunter_mark']},
      {id:'action_exile',legacyId:'1',name:'Đuổi Người',description:'Đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',legacyAudioFile:'duoi_nguoi.mp3',effectIds:['effect_exile']},
      {id:'action_revive',legacyId:'2',name:'Hồi Sinh',description:'Hồi Sinh một người chết hợp lệ.',legacyAudioFile:'hoi_sinh.mp3',effectIds:['effect_revive']},
      {id:'action_transfer_bite',legacyId:'6',name:'Dịch Chuyển Vết Cắn',description:'Dịch chuyển vết Sói Cắn sang trái hoặc phải; không có vết cắn vẫn thực hiện nhưng không tạo tác động.',effectIds:['effect_transfer_bite']},
      {id:'action_assassin_mark',legacyId:'12',name:'Đánh Dấu',description:'Đánh dấu bí mật Like/Dislike và giải quyết vào sáng hôm sau.',effectIds:['effect_assassin_mark']},
      {id:'action_visit_house',legacyId:'19',name:'Thăm Nhà',description:'Thiếu Nữ Thăm Nhà một Người Chơi khác trong đêm.',effectIds:['effect_visit_house']},
      {id:'action_snow_wolf_freeze',legacyId:'action-snow-wolf-freeze',name:'Đóng Băng',description:'Đóng Băng chức năng 1 người trong đêm; nếu trúng Sói Trùm thì vô hiệu vết Cắn của Bầy Sói đêm đó.',effectIds:['effect_snow_wolf_freeze']},
      {id:'action_protect',legacyId:'4',name:'Bảo Vệ',description:'Bảo vệ 1 người khỏi tác động chết có nguồn gốc Sói Cắn.',effectIds:['effect_protected']},
      {id:'action_wolf_bite',legacyId:'action-wolf-bite',name:'Sói Cắn',description:'Vết Cắn chung của Bầy Sói.',effectIds:['effect_wolf_bite'],allowFriendlyFaction:true}
      ,{id:'action_witch_save',legacyId:'action-witch-save',name:'Cứu',description:'Cứu người nhận vết Sói cắn cuối cùng; 1 lần trong ván.',effectIds:['effect_witch_save']},{id:'action_witch_kill',legacyId:'action-witch-kill',name:'Giết',description:'Dùng bình Giết lên 1 người; 1 lần trong ván.',effectIds:['effect_kill']},{id:'action_hunt',legacyId:'action-hunt',name:'Săn',description:'Đặt thuốc nổ vào 1 người; khi Thợ Săn chết, mục tiêu chết theo. Không săn được Phe Ba.',effectIds:['effect_hunted_death']},{id:'action_compare_faction',legacyId:'action-compare-faction',name:'So Sánh Phe',description:'Chọn 2 người và trả kết quả Cùng Phe hoặc Khác Phe.',effectIds:['effect_compare_faction']},{id:'action_drunk_draw',legacyId:'action-drunk-draw',name:'Say',description:'Đêm 3 bốc Lá Vai Trò của một trong những người đã chết.',effectIds:['effect_sober']},
      {id:'action_knight_last_strike',legacyId:'action-knight-last-strike',name:'Hiệp Sĩ Chọn Người Chết',description:'Khi Hiệp Sĩ bị vote treo cổ, trước khi chết chọn 1 người còn sống khác bản thân để chết vào sáng hôm sau.',effectIds:['effect_knight_last_strike']},
      {id:'action_fox_scan',legacyId:'7',name:'Hồ Ly Soi Nhóm',description:'Mỗi đêm chọn 3 người còn sống để kiểm tra trong nhóm có Sói hay không.',effectIds:['effect_fox_scan']},
      {id:'action_bear_scan',legacyId:'action-bear-scan',name:'Thần Gấu Soi Nhóm',description:'Mỗi sáng chọn 2 người còn sống để kiểm tra trong nhóm có Sói hay không; tối đa 2 lần/ván.',effectIds:['effect_bear_scan']},
      {id:'action_thief_change_role',legacyId:'16',name:'Kẻ Trộm Đổi Vai Trò',description:'Từ Đêm 3 chọn 1 Lá Vai Trò trong bộ bài để đổi hoặc giữ nguyên; chỉ 1 lần/ván.',effectIds:['effect_thief_change_role']}

    ],
    artifacts:[]
  },
  effects:[

    {id:'effect_seer',name:'Tiên Tri',primitive:'REVEAL_FACTION',duration:'instant',description:'Trả kết quả SÓI / KHÔNG PHẢI SÓI; Sói Trùm luôn trả KHÔNG PHẢI SÓI.',params:{mode:'isWolf',noSelf:true,targetDeathPolicy:'alive_only',falseRoleNames:['Sói Trùm']},webTemplate:{eventType:'seer_result',emoji:'',title:'KẾT QUẢ TIÊN TRI',requireAck:false,requireResponse:false}},
    {id:'effect_destroyer_scry',name:'Soi Vai Trò',primitive:'REVEAL_ROLE',duration:'instant',description:'Hiển thị tên Vai Trò mục tiêu, không hiển thị Phe.',params:{phase:'night',reveal:'role_name_only',noSelf:true,revealRole:true,revealFaction:false},webTemplate:{eventType:'destroyer_scry',emoji:'',title:'KẾT QUẢ SOI',requireAck:false,requireResponse:false}},
    {id:'effect_destroyer_kill',name:'Giết Kẻ Huỷ Diệt',primitive:'KILL',duration:'instant',description:'Chỉ giết nhóm Vai Trò mục tiêu; chọn sai thì Kẻ Huỷ Diệt chết và phản phệ bỏ qua Bất Tử Ban Đêm.',params:{phase:'night',noSelf:true,validRoleNames:['Tiên Tri','Phù Thủy','Thợ Săn','Bảo Vệ','Sát Thủ'],onInvalid:'kill_source',invalidBypassesNightImmune:true,validTargetBypassesNightImmuneRoleNames:['Sát Thủ']},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_clone_watch',name:'Liên Kết Nhân Bản',primitive:'MARK_TARGET',duration:'game',description:'Đêm 1 liên kết 1 mục tiêu; khi mục tiêu chết, Nhân Bản nhận toàn bộ chức năng và Phe hiện tại của mục tiêu.',params:{phase:'night',night:1,noSelf:true,targetAlive:true,oncePerGame:true,persistent:true,onTargetDeath:['COPY_ACTION','CHANGE_FACTION'],copyAllActions:true,factionFromTarget:true,preservePlayerIdentity:true,rememberOriginalRole:'Nhân Bản'},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_aura_read',name:'Đọc Chức Năng',primitive:'REVEAL_FUNCTIONS',duration:'instant',description:'Đọc các chức năng của 1 Người Chơi; chỉ hoạt động Đêm 1–4, tối đa 2 lần/ván và 1 lần/đêm.',params:{nightFrom:1,nightTo:4,minTargets:1,maxTargets:1,noSelf:false,targetAlive:true,reveal:'functions'},webTemplate:{eventType:'aura_read',emoji:'',title:'KẾT QUẢ HÀO QUANG',requireAck:false,requireResponse:false}},
    {id:'effect_stab',name:'Đâm',primitive:'CONDITIONAL_KILL',duration:'instant',description:"Nếu mục tiêu thuộc Phe Sói hoặc Phe Ba thì mục tiêu chết, nếu Dân Làng thì Du Côn chết.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_scan_three',name:'Soi Nhóm Ba Người',primitive:'SCAN_GROUP',duration:'instant',description:"Trả kết quả CÓ SÓI / KHÔNG CÓ SÓI trong nhóm ba người.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_find_seer',name:'Soi Tiên Tri',primitive:'CHECK_ROLE',duration:'instant',description:"Trả kết quả PHẢI TIÊN TRI / KHÔNG PHẢI TIÊN TRI.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_hunter_mark',name:'Đánh Dấu Săn',primitive:'DEATH_LINK',duration:'instant',description:"Nếu Sói Thợ Săn chết, mục tiêu đã đánh dấu chết theo.",webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_exile',name:'Đuổi',primitive:'EXPEL',duration:'nextDay',description:'Đuổi người chơi ra khỏi làng; vô hiệu các tác động lên người bị Đuổi trong thời hạn hiệu lực.',webTemplate:{eventType:'EXPEL',emoji:'🚪',title:'BỊ ĐUỔI KHỎI LÀNG',requireAck:true,requireResponse:false}},
    {id:'effect_revive',name:'Hồi Sinh',primitive:'REVIVE',duration:'instant',description:'Hồi sinh người chơi hợp lệ.',webTemplate:{eventType:'REVIVE',emoji:'✨',title:'ĐƯỢC HỒI SINH',requireAck:false,requireResponse:false}},
    {id:'effect_transfer_bite',name:'Chuyển',primitive:'TRANSFER_EFFECT',duration:'instant',description:'Dịch chuyển tác động wolf_bite theo hướng đã chọn; nếu không có wolf_bite thì không tạo tác động.',params:{scope:'wolf_bite',allowSelf:true,autoSkipWithoutWolfBite:false},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_assassin_mark',name:'Đánh Dấu',primitive:'MARK_TARGET',duration:'nextDay',description:'Lưu dấu Like/Dislike bí mật; sáng hôm sau mục tiêu chọn dấu. Cùng dấu sống, khác dấu chết.',params:{choices:['👍','👎'],resolve:'morning_compare',same:'alive',different:'kill'},webTemplate:{eventType:'ASSASSIN_MARK',emoji:'🎯',title:'BỊ ĐÁNH DẤU',requireAck:false,requireResponse:true}},
    {id:'effect_visit_house',name:'Thăm Nhà',primitive:'MARK_TARGET',duration:'night',description:'Liên kết Thiếu Nữ với người được thăm trong đêm.',params:{dieIfWolf:true,dieIfTargetDies:true,allowConsecutive:true,noSelf:true},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_snow_wolf_freeze',name:'Đóng Băng',primitive:'BLOCK',duration:'night',description:'Chặn chức năng mục tiêu trong đêm; nếu mục tiêu là Sói Trùm thì vô hiệu vết Cắn chung của Bầy Sói đêm đó.',params:{ifTargetRole:'source-44',cancelPackBite:true,noSelf:true,noConsecutiveTarget:true},webTemplate:{eventType:'BLOCK',emoji:'❄️',title:'BẠN BỊ ĐÓNG BĂNG',requireAck:true,requireResponse:false}},
    {id:'effect_protected',name:'Bảo Vệ',primitive:'PROTECT',duration:'night',description:'Chỉ chặn tác động chết có nguồn gốc wolf_bite, kể cả vết Cắn dịch chuyển; không chặn bình Phù Thủy hay tác động chết khác.',params:{scope:'wolf_bite'},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_wolf_bite',name:'Sói Cắn',primitive:'KILL',duration:'instant',description:'Tác động Sói Cắn chung của Bầy Sói.',params:{scope:'wolf_bite',sharedPackBite:true},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_witch_save',name:'Cứu',primitive:'BLOCK_DEATH',duration:'night',description:'Chặn cái chết từ vết Sói cắn cuối cùng cho mục tiêu được cứu.',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},{id:'effect_kill',name:'Chết',primitive:'KILL',duration:'instant',description:'Làm mục tiêu chết.',webTemplate:{eventType:'DEAD',emoji:'💀',title:'ĐÃ CHẾT',requireAck:false,requireResponse:false}},{id:'effect_hunted_death',name:'Săn',primitive:'MARK_TARGET',duration:'game',description:'Ghi nhận mục tiêu Săn; khi Thợ Săn chết, mục tiêu nhận Chết.',params:{trigger:'actor_death',excludeFaction:'third',result:'kill'},webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},{id:'effect_compare_faction',name:'So Sánh Phe',primitive:'COMPARE_FACTION',duration:'instant',description:'So sánh Faction ID hiện tại của 2 mục tiêu và trả Cùng Phe hoặc Khác Phe.',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},{id:'effect_sober',name:'Tỉnh Rượu',primitive:'ROLE_TRANSITION',duration:'game',description:'Đêm 3 nhận Lá Vai Trò từ một người đã chết; nếu không có người chết thì trở thành Dân Làng không chức năng.',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}},
    {id:'effect_knight_last_strike',name:'Hiệp Sĩ Chọn Người Chết',primitive:'KILL',duration:'queued',description:'Chỉ khi Hiệp Sĩ bị vote treo cổ: trước khi nguồn chết, chọn 1 mục tiêu còn sống khác bản thân; xử lý mục tiêu chết vào sáng hôm sau.',params:{trigger:'source_lynched',selectBeforeSourceDeath:true,resolveAt:'next_morning',noSelf:true,targetAlive:true,oncePerGame:true},webTemplate:{eventType:'knight_last_strike',emoji:'',title:'HIỆP SĨ',requireAck:false,requireResponse:true}},
    {id:'effect_fox_scan',name:'Hồ Ly Soi Nhóm',primitive:'REVEAL_FACTION_GROUP',duration:'instant',description:'Kiểm tra đúng 3 người còn sống và chỉ trả CÓ SÓI / KHÔNG CÓ SÓI.',params:{minTargets:3,maxTargets:3,noSelf:true,targetAlive:true,mode:'any_wolf',positive:'CÓ SÓI',negative:'KHÔNG CÓ SÓI'},webTemplate:{eventType:'fox_scan',emoji:'',title:'KẾT QUẢ HỒ LY',requireAck:false,requireResponse:false}},
    {id:'effect_bear_scan',name:'Thần Gấu Soi Nhóm',primitive:'REVEAL_FACTION_GROUP',duration:'instant',description:'Mỗi sáng kiểm tra đúng 2 người còn sống và chỉ trả CÓ SÓI / KHÔNG CÓ SÓI; tối đa 2 lần/ván.',params:{phase:'day',timing:'morning',minTargets:2,maxTargets:2,noSelf:true,targetAlive:true,mode:'any_wolf',positive:'CÓ SÓI',negative:'KHÔNG CÓ SÓI',maxUses:2},webTemplate:{eventType:'bear_scan',emoji:'',title:'KẾT QUẢ THẦN GẤU',requireAck:false,requireResponse:false}},
    {id:'effect_thief_change_role',name:'Kẻ Trộm Đổi Vai Trò',primitive:'CHANGE_ROLE_FROM_DECK',duration:'game',description:'Từ Đêm 3, Kẻ Trộm chọn 1 Lá Vai Trò trong bộ bài để đổi hoặc không đổi. Nếu đổi, toàn bộ Vai Trò, Phe, chức năng và điều kiện thắng chuyển theo Vai Trò mới.',params:{fromNight:3,oncePerGame:true,selectionType:'role_card_from_deck',allowKeepCurrent:true,copyRole:true,copyFaction:true,copyFunctions:true,copyWinCondition:true,preservePlayerIdentity:true},webTemplate:{eventType:'thief_change_role',emoji:'',title:'KẺ TRỘM',requireAck:false,requireResponse:true}}

  ],
  audio:{
    cards:[
      {id:'audio_card_role_witch',name:'Phù Thủy',targetId:'role_witch',fileName:'',verifiedBinary:false},{id:'audio_card_role_hunter',name:'Thợ Săn',targetId:'role_hunter',fileName:'',verifiedBinary:false},{id:'audio_card_role_spiritualist',name:'Nhà Tinh Thần Học',targetId:'role_spiritualist',fileName:'',verifiedBinary:false},{id:'audio_card_role_drunk',name:'Say Rượu',targetId:'role_drunk',fileName:'',verifiedBinary:false},{id:'audio_card_role_cursed',name:'Kẻ Bị Nguyền',targetId:'role_cursed',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_old_witch',name:'Phù Thuỷ Già',targetId:'role_old_witch',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_fairy',name:'Yêu Tinh',targetId:'role_fairy',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_assassin',name:'Sát Thủ',targetId:'role_assassin',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_maiden',name:'Thiếu Nữ',targetId:'role_maiden',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_snow_wolf',name:'Sói Tuyết',targetId:'role_snow_wolf',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_guard',name:'Bảo Vệ',targetId:'role_guard',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_alpha_wolf',name:'Sói Trùm',targetId:'role_alpha_wolf',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_wolf',name:'Sói Thường',targetId:'role_wolf',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_knight',name:'Hiệp Sĩ',targetId:'role_knight',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_fox',name:'Hồ Ly',targetId:'role_fox',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_bear_god',name:'Thần Gấu',targetId:'role_bear_god',fileName:'',verifiedBinary:false},
      {id:'audio_card_role_thief',name:'Kẻ Trộm',targetId:'role_thief',fileName:'',verifiedBinary:false}
    ],
    artifacts:[],
    actions:[
      {id:'audio_action_witch_save',name:'Cứu',targetId:'action_witch_save',fileName:'',verifiedBinary:false},{id:'audio_action_witch_kill',name:'Giết',targetId:'action_witch_kill',fileName:'',verifiedBinary:false},{id:'audio_action_hunt',name:'Săn',targetId:'action_hunt',fileName:'',verifiedBinary:false},{id:'audio_action_compare_faction',name:'So Sánh Phe',targetId:'action_compare_faction',fileName:'',verifiedBinary:false},{id:'audio_action_drunk_draw',name:'Say',targetId:'action_drunk_draw',fileName:'',verifiedBinary:false},
      {id:'audio_action_exile',name:'Đuổi Người',targetId:'action_exile',fileName:'',verifiedBinary:false},
      {id:'audio_action_revive',name:'Hồi Sinh',targetId:'action_revive',fileName:'',verifiedBinary:false},
      {id:'audio_action_transfer_bite',name:'Dịch Chuyển Vết Cắn',targetId:'action_transfer_bite',fileName:'',verifiedBinary:false},
      {id:'audio_action_assassin_mark',name:'Đánh Dấu',targetId:'action_assassin_mark',fileName:'',verifiedBinary:false},
      {id:'audio_action_visit_house',name:'Thăm Nhà',targetId:'action_visit_house',fileName:'',verifiedBinary:false},
      {id:'audio_action_snow_wolf_freeze',name:'Đóng Băng',targetId:'action_snow_wolf_freeze',fileName:'',verifiedBinary:false},
      {id:'audio_action_protect',name:'Bảo Vệ',targetId:'action_protect',fileName:'',verifiedBinary:false},
      {id:'audio_action_wolf_bite',name:'Sói Cắn',targetId:'action_wolf_bite',fileName:'',verifiedBinary:false},
      {id:'audio_action_knight_last_strike',name:'Hiệp Sĩ Chọn Người Chết',targetId:'action_knight_last_strike',fileName:'',verifiedBinary:false},
      {id:'audio_action_fox_scan',name:'Hồ Ly Soi Nhóm',targetId:'action_fox_scan',fileName:'',verifiedBinary:false},
      {id:'audio_action_bear_scan',name:'Thần Gấu Soi Nhóm',targetId:'action_bear_scan',fileName:'',verifiedBinary:false},
      {id:'audio_action_thief_change_role',name:'Kẻ Trộm Đổi Vai Trò',targetId:'action_thief_change_role',fileName:'',verifiedBinary:false}
    ],
    system:[
      {id:'audio_system_confirm',name:'Xác nhận',fileName:'',verifiedBinary:false},
      {id:'audio_system_countdown',name:'Đếm ngược 30 giây cuối',fileName:'',verifiedBinary:false},
      {id:'audio_system_time_up',name:'Hết giờ',fileName:'',verifiedBinary:false}
    ]
  },
  themes:{
    activeId:'theme-sea',selectedEditorId:'theme-sea',
    list:[
      {id:'theme-default',name:'Mặc định',builtin:true,locked:true,ui:{},mappings:{}},
      {id:'theme-sea',name:'Biển',builtin:true,locked:false,ui:{},mappings:{}}
    ]
  }
};
const DEFAULT_PREFS={
  cards:{
    role_snow_wolf:{starred:true,starOrder:1,hidden:false},
    role_guard:{starred:true,starOrder:2,hidden:false},
    role_alpha_wolf:{starred:true,starOrder:3,hidden:false},
    role_wolf:{starred:true,starOrder:4,hidden:false},
    role_witch:{starred:true,starOrder:5,hidden:false},
    role_seer:{starred:true,starOrder:6,hidden:false},
    role_hunter:{starred:true,starOrder:7,hidden:false},
    role_villager:{starred:true,starOrder:8,hidden:false},
    role_destroyer:{starred:true,starOrder:9,hidden:false},
    role_clone:{starred:true,starOrder:10,hidden:false},
    role_spiritualist:{starred:true,starOrder:11,hidden:false},
    role_drunk:{starred:true,starOrder:12,hidden:false},
    role_aura_seer:{starred:true,starOrder:13,hidden:false},
    role_cursed:{starred:true,starOrder:14,hidden:false},
    role_thug:{starred:true,starOrder:15,hidden:false},
    role_bigfoot:{starred:true,starOrder:16,hidden:false},
    role_piper:{starred:true,starOrder:17,hidden:false},
    role_wolf_seer:{starred:true,starOrder:18,hidden:false},
    role_wolf_cub:{starred:true,starOrder:19,hidden:false},
    role_wolf_hunter:{starred:true,starOrder:20,hidden:false},
    role_old_witch:{starred:true,starOrder:21,hidden:false},
    role_fairy:{starred:true,starOrder:22,hidden:false},
    role_maiden:{starred:true,starOrder:23,hidden:false},
    role_assassin:{starred:true,starOrder:24,hidden:false},
    role_knight:{starred:true,starOrder:25,hidden:false},
    role_fox:{starred:true,starOrder:26,hidden:false},
    role_bear_god:{starred:true,starOrder:27,hidden:false},
    role_thief:{starred:true,starOrder:28,hidden:false}
  },
  artifacts:{}
}

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function formatInformation(v){return String(v??'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>x?x.charAt(0).toLocaleUpperCase('vi-VN')+x.slice(1):x).join('\n')}
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
function deepMerge(base,raw){if(!raw||typeof raw!=='object')return base;for(const k of Object.keys(raw)){if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k]))deepMerge(base[k],raw[k]);else base[k]=raw[k]}return base}
function normFaction(v){if(v==='wolf'||v==='Sói')return'wolf';if(v==='third'||v==='Phe Ba')return'third';return'village'}
function normalizeFunction(f={}){
  const legacyTo=(f.nightToEnabled===false)?null:(f.nightTo??null);
  const target=Number(f.targetCount??f.maxTargets??f.minTargets??1);
  return{
    id:f.id||uid('fn'),actionId:f.actionId||(f.actionIds&&f.actionIds[0])||'',phase:f.phase||'night',
    usageMode:f.usageMode||f.usage||((f.limitEnabled&&Number(f.perGame)===1)?'onceGame':(f.limitEnabled?'nGame':'unlimited')),
    usageCount:Number(f.usageCount||f.perGame||1),
    fromNight:Number(f.fromNight??(f.nightFromEnabled?f.nightFrom:1)??1),
    toNight:f.toNight!==undefined?f.toNight:legacyTo,
    cooldownNights:Number(f.cooldownNights||0),targetCount:Number.isFinite(target)?Math.max(0,target):1,
    noSelf:f.noSelf!==undefined?!!f.noSelf:(f.selfTarget==='no'),allowDead:!!f.allowDead,noTarget:!!f.noTarget,
    allowConsecutive:f.allowConsecutive!==undefined?!!f.allowConsecutive:(f.allowConsecutive==='yes'),
    passive:!!f.passive,activation:f.activation||f.trigger||'',pushToPlayerWeb:!!f.pushToPlayerWeb,
    targetPreviousCycleOnly:!!f.targetPreviousCycleOnly,perUserLimit:Number(f.perUserLimit||0),
    description:f.description||f.desc||'',
    systemRequired:!!f.systemRequired,usesPackBite:!!f.usesPackBite,requiresNoOtherLivingWolf:!!f.requiresNoOtherLivingWolf,
    actorMayBeDead:!!f.actorMayBeDead,allowFriendlyFaction:!!f.allowFriendlyFaction,replacesWolfBite:!!f.replacesWolfBite,
    effectIds:Array.isArray(f.effectIds)?f.effectIds.slice():[]
  };
}
function normalizeEntity(e,kind){
  const x=clone(e||{});
  x.id=x.id||uid(kind==='cards'?'role':'artifact');x.name=x.name||'Chưa đặt tên';x.information=x.information||x.description||x.desc||'';
  if(kind==='cards')x.factionId=normFaction(x.factionId||x.faction);
  const oldFlags=x.flags||x.systemFlags||x.setup?.systemFlags||{};
  x.lives=Math.max(1,Number(x.lives??oldFlags.lives??1)||1);
  x.flags={
    useDay:!!(oldFlags.useDay??x.useDay),useNight:!!(oldFlags.useNight??x.useNight),
    nightImmune:!!(oldFlags.nightImmune??x.nightImmune),
    allowMultipleActions:!!(oldFlags.allowMultipleActions||oldFlags.multiTask||oldFlags.multiNightActions||x.multiTask||x.multiNightActions),
    passive:!!(oldFlags.passive??x.passive),soloWolfOnly:!!(oldFlags.soloWolfOnly??x.soloWolfOnly)
  };
  x.winCondition=x.winCondition||'';
  x.passiveRule=Object.assign({enabled:false,type:'stake_survive',firstTime:'',nextTime:'',onDeath:false,skipIfTargetAlreadyDead:false},x.passiveRule||{},x.passiveRules||{});
  x.groupActionGate=Object.assign({enabled:false,actionId:'',scope:'self',blockOn:[]},x.groupActionGate||{},Array.isArray(x.groupActionGates)&&x.groupActionGates[0]||{});
  x.specialRules=Object.assign({systemRequired:false,usesPackBite:false,requiresNoOtherLivingWolf:false,actorMayBeDead:false,allowFriendlyFaction:false,replacesWolfBite:false},x.specialRules||{});
  x.limits=x.limits||x.setup?.limits||'';
  x.conditions=x.conditions||x.setup?.conditions||'';
  x.attributes=x.attributes||x.setup?.attributes||'';
  const fs=x.functions||x.abilities||[];
  x.functions=fs.map(normalizeFunction);
  if(kind==='artifacts'){
    const raw=x.artifact||{},folded=String(x.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
    const defaultPriority=['da doi vai tro','da hoan doi','doi vai tro','trang guong','mat tien tri'].includes(folded);
    x.artifact=Object.assign({ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:'',priorityFirst:defaultPriority},raw);
    x.artifact.priorityFirst=raw.priorityFirst===undefined?(x.priorityFirst===undefined?defaultPriority:x.priorityFirst===true):raw.priorityFirst===true;
  }
  return x;
}
function migrateOld(raw){
  const s=clone(DEFAULT_STATE);if(!raw)return s;
  if(Array.isArray(raw.cards)&&raw.cards.length)s.cards=raw.cards.map(x=>normalizeEntity(x,'cards'));
  if(Array.isArray(raw.artifacts)&&raw.artifacts.length)s.artifacts=raw.artifacts.map(x=>normalizeEntity(x,'artifacts'));
  else if(Array.isArray(raw.atifats)&&raw.atifats.length)s.artifacts=raw.atifats.map(x=>normalizeEntity(x,'artifacts'));
  if(raw.actions){if(Array.isArray(raw.actions.role))s.actions.role=raw.actions.role.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}));const aa=raw.actions.artifacts||raw.actions.artifact;if(Array.isArray(aa))s.actions.artifacts=aa.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}))}
  if(Array.isArray(raw.effects))s.effects=raw.effects.map(e=>({id:e.id,name:e.name,primitive:e.primitive||e.type||'CUSTOM',duration:e.duration||'instant',description:e.description||e.desc||'',webTemplate:e.webTemplate||e.webInteraction||{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}}));
  if(raw.audio){
    if(Array.isArray(raw.audio)){for(const a of raw.audio){const scope=String(a.scope||'').toLowerCase();const k=scope.includes('artifact')?'artifacts':scope.includes('action')?'actions':scope.includes('system')?'system':'cards';s.audio[k].push(a)}}
    else if(typeof raw.audio==='object')s.audio=deepMerge(s.audio,raw.audio);
  }
  if(raw.themes)s.themes=deepMerge(s.themes,raw.themes);
  s.version=VERSION;return s;
}
function applyV210Rules(s){
  const preferLinked=rows=>rows.find(a=>a.url)||rows.find(a=>a.fileName||a.verifiedBinary)||rows[0];
  const witch=(s.cards||[]).find(x=>x.id==='role_old_witch'||x.legacyId==='source-18');
  if(witch){
    const oldInfo='Phe Dân. Mỗi đêm chọn Đuổi 1 người hoặc Hồi Sinh 1 người, không được làm cả hai. Hồi Sinh chỉ áp dụng cho người chết ở ngày trước hoặc đêm trước theo luật.';
    if(!witch.information||witch.information===oldInfo)witch.information=DEFAULT_STATE.cards[0].information;
    const exile=(witch.functions||[]).find(f=>f.id==='fn_old_witch_exile'||f.actionId==='action_exile'||String(f.actionId)==='1');
    if(exile){if(!String(exile.description||'').trim())exile.description=DEFAULT_STATE.cards[0].functions[0].description;exile.phase='night';exile.usageMode='eachNight';exile.usageCount=1;exile.targetCount=1;exile.noSelf=true;exile.allowDead=false;exile.allowConsecutive=false;exile.pushToPlayerWeb=true}
    const revive=(witch.functions||[]).find(f=>f.id==='fn_old_witch_revive'||f.actionId==='action_revive'||String(f.actionId)==='2');
    if(revive){if(!String(revive.description||'').trim())revive.description=DEFAULT_STATE.cards[0].functions[1].description;revive.phase='night';revive.usageMode='onceGame';revive.usageCount=1;revive.targetCount=1;revive.noSelf=true;revive.allowDead=true;revive.allowConsecutive=false;revive.pushToPlayerWeb=true;revive.targetPreviousCycleOnly=true}
  }
  const cardAudio=(s.audio&&s.audio.cards)||[];
  const witchAudio=cardAudio.filter(a=>a.targetId==='role_old_witch'||a.sourceKey==='ROLE:source-18'||a.name==='Phù Thuỷ Già');
  const keepCard=preferLinked(witchAudio)||{};
  Object.assign(keepCard,{id:keepCard.id||'audio_role_old_witch',name:'Phù Thuỷ Già',targetId:'role_old_witch',sourceKey:keepCard.sourceKey||'ROLE:source-18',fileName:keepCard.fileName||'Phù Thuỷ Già.mp3',verifiedBinary:keepCard.verifiedBinary!==false});
  s.audio.cards=[keepCard,...cardAudio.filter(a=>String(a.id)!==String(keepCard.id))];

  const actionAudio=(s.audio&&s.audio.actions)||[];
  const canonicalActions=[
    {id:'audio_action_exile',name:'Đuổi Người',targetId:'action_exile',sourceKey:'ACTION:1',fileName:'duoi_nguoi.mp3',verifiedBinary:false},
    {id:'audio_action_revive',name:'Hồi Sinh',targetId:'action_revive',sourceKey:'ACTION:2',fileName:'hoi_sinh.mp3',verifiedBinary:false}
  ];
  const canonicalActionRows=canonicalActions.map(slot=>{
    const previous=preferLinked(actionAudio.filter(a=>a.id===slot.id||a.targetId===slot.targetId||a.sourceKey===slot.sourceKey||a.name===slot.name));
    return {...slot,...(previous||{}),targetId:slot.targetId};
  });
  // IndexedDB media is keyed by the AUDIO row ID: dropping a duplicate metadata
  // row silently loses its user-uploaded audio after OTA.
  const usedActionIds=new Set(canonicalActionRows.map(a=>String(a.id)));
  s.audio.actions=[...canonicalActionRows,...actionAudio.filter(a=>!usedActionIds.has(String(a.id)))];

  const currentCards=s.audio.cards||[];
  const wolfCandidates=currentCards.filter(a=>a.id==='audio_group_wolves'||a.sourceKey==='GROUP:WOLVES'||a.name==='Bầy Sói'||a.name==='Sói thức dậy');
  const wolfKeep=preferLinked(wolfCandidates)||{};
  Object.assign(wolfKeep,{id:wolfKeep.id||'audio_group_wolves',targetId:'audio_group_wolves',name:'Bầy Sói',targetGroup:'wolves',sourceKey:wolfKeep.sourceKey||'GROUP:WOLVES',fileName:wolfKeep.fileName||'gmww-wolf-pack.m4a',verifiedBinary:wolfKeep.verifiedBinary!==false});
  s.audio.cards=[...s.audio.cards.filter(a=>!wolfCandidates.includes(a)),wolfKeep];

  const systemAudio=(s.audio&&s.audio.system)||[];
  const canonicalSystem=[
    {id:'audio_system_confirm',name:'Xác nhận',sourceKey:'SYSTEM:CONFIRM_TARGET',fileName:'gmww-confirm.m4a',verifiedBinary:true},
    {id:'audio_system_countdown',name:'Đếm ngược',sourceKey:'SYSTEM:DAY_COUNTDOWN_30',fileName:'gmww-countdown-30.m4a',verifiedBinary:true},
    {id:'audio_system_day_wakeup',name:'Làng ơi dậy đi',targetId:'audio_system_day_wakeup',fileName:'',verifiedBinary:false},
    // Optional historical-style cues: upload from Cài đặt → Thư viện âm thanh → Hệ thống.
    {id:'audio_system_gallows_day_long',name:'Lên Giàn · Ngày dài rồi',targetId:'audio_system_gallows_day_long',fileName:'',verifiedBinary:false},
    {id:'audio_system_gallows_open_nomination',name:'Lên Giàn · Mở đề cử',targetId:'audio_system_gallows_open_nomination',fileName:'',verifiedBinary:false},
    {id:'audio_system_gallows_open_vote',name:'Lên Giàn · Mở bỏ phiếu',targetId:'audio_system_gallows_open_vote',fileName:'',verifiedBinary:false},
    {id:'audio_system_gallows_nomination_result',name:'Lên Giàn · Công bố người bị đề cử',targetId:'audio_system_gallows_nomination_result',fileName:'',verifiedBinary:false},
    {id:'audio_system_gallows_vote_result',name:'Lên Giàn · Công bố số phiếu',targetId:'audio_system_gallows_vote_result',fileName:'',verifiedBinary:false},
    {id:'audio_system_gallows_result_dead',name:'Lên Giàn · Kết quả Giết',targetId:'audio_system_gallows_result_dead',fileName:'',verifiedBinary:false},
    {id:'audio_system_gallows_result_saved',name:'Lên Giàn · Kết quả Cứu',targetId:'audio_system_gallows_result_saved',fileName:'',verifiedBinary:false},
    // Morning announcement segments: uploaded clips are preserved during subsequent OTAs.
    {id:'audio_system_morning_expelled',name:'Đêm qua người chơi này đã bị đuổi khỏi làng',targetId:'audio_system_morning_expelled',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_marked',name:'Sát Thủ đã chọn người chơi này',targetId:'audio_system_morning_marked',fileName:'',verifiedBinary:false},
    {id:'audio_system_assassin_correct',name:'Sát Thủ · Chọn đúng',targetId:'audio_system_assassin_correct',fileName:'',verifiedBinary:false},
    {id:'audio_system_assassin_wrong',name:'Sát Thủ · Chọn sai',targetId:'audio_system_assassin_wrong',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_maiden_wolf',name:'Thiếu Nữ chết vì thăm nhà Sói',targetId:'audio_system_morning_maiden_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_maiden_follow',name:'Thiếu Nữ chết theo người được thăm',targetId:'audio_system_morning_maiden_follow',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_frozen',name:'Người chơi bị đóng băng',targetId:'audio_system_morning_frozen',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_silenced',name:'Người chơi bị câm',targetId:'audio_system_morning_silenced',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_infected',name:'Người chơi bị nhiễm bệnh',targetId:'audio_system_morning_infected',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_protected',name:'Người chơi được bảo vệ',targetId:'audio_system_morning_protected',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_saved',name:'Người chơi đã được cứu',targetId:'audio_system_morning_saved',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_healed',name:'Người chơi đã được hồi phục',targetId:'audio_system_morning_healed',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_revived',name:'Người chơi đã hồi sinh',targetId:'audio_system_morning_revived',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_blessed',name:'Người chơi đã được chúc phúc',targetId:'audio_system_morning_blessed',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_shielded',name:'Người chơi đã nhận khiên',targetId:'audio_system_morning_shielded',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_poisoned',name:'Người chơi đã bị đầu độc',targetId:'audio_system_morning_poisoned',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_wolf_bite',name:'Người chơi đã bị Sói cắn',targetId:'audio_system_morning_wolf_bite',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_cursed',name:'Người chơi đã bị nguyền rủa',targetId:'audio_system_morning_cursed',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_deaths_intro',name:'Đêm qua làng chúng ta có',targetId:'audio_system_morning_deaths_intro',fileName:'',verifiedBinary:false},
    {id:'audio_system_morning_dead_noun',name:'Người chết',targetId:'audio_system_morning_dead_noun',fileName:'',verifiedBinary:false},
    ...Array.from({length:31},(_,i)=>({id:'audio_system_morning_number_'+i,name:String(i),targetId:'audio_system_morning_number_'+i,fileName:'',verifiedBinary:false})),

    {id:'audio_system_early_artifacts',name:'Artifact đầu ván',targetId:'audio_system_early_artifacts',fileName:'',verifiedBinary:false},
    {id:'audio_system_seer_wolf',name:'Tiên Tri · Người bạn soi là Sói',targetId:'audio_system_seer_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_seer_not_wolf',name:'Tiên Tri · Người bạn soi không phải là Sói',targetId:'audio_system_seer_not_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_time_up',name:'Hết giờ',targetId:'audio_system_time_up',fileName:'',verifiedBinary:false},
    {id:'audio_system_aura_read',name:'Người bạn soi là',targetId:'audio_system_aura_read',fileName:'',verifiedBinary:false},
    {id:'audio_system_destroyer_role',name:'Kẻ Hủy Diệt · Kết Quả Soi Vai Trò',targetId:'audio_system_destroyer_role',fileName:'',verifiedBinary:false},
    {id:'audio_system_fox_wolf',name:'Hồ Ly · Có Sói',targetId:'audio_system_fox_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_fox_no_wolf',name:'Hồ Ly · Không Có Sói',targetId:'audio_system_fox_no_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_bear_wolf',name:'Thần Gấu · Có Sói',targetId:'audio_system_bear_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_bear_no_wolf',name:'Thần Gấu · Không Có Sói',targetId:'audio_system_bear_no_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_piper_wolf',name:'Kẻ Thổi Sáo · Có Sói',targetId:'audio_system_piper_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_piper_no_wolf',name:'Kẻ Thổi Sáo · Không Có Sói',targetId:'audio_system_piper_no_wolf',fileName:'',verifiedBinary:false},
    {id:'audio_system_find_seer_yes',name:'Sói Tiên Tri · Có Tiên Tri',targetId:'audio_system_find_seer_yes',fileName:'',verifiedBinary:false},
    {id:'audio_system_find_seer_no',name:'Sói Tiên Tri · Không Phải Tiên Tri',targetId:'audio_system_find_seer_no',fileName:'',verifiedBinary:false},
    {id:'audio_system_compare_same',name:'Nhà Tinh Thần Học · Cùng Phe',targetId:'audio_system_compare_same',fileName:'',verifiedBinary:false},
    {id:'audio_system_compare_different',name:'Nhà Tinh Thần Học · Khác Phe',targetId:'audio_system_compare_different',fileName:'',verifiedBinary:false}
  ];
  const systemAliases=new Set(['audio_system_wolf','Sói thức dậy']);
  // Preserve GM-linked audio URLs and locally uploaded IDs across Runtime upgrades.
  const canonicalSystemRows=canonicalSystem.map(slot=>{
    const previous=preferLinked(systemAudio.filter(x=>x.id===slot.id||(slot.targetId&&x.targetId===slot.targetId)
      ||x.name===slot.name||(slot.sourceKey&&x.sourceKey===slot.sourceKey)));
    return {...slot,...(previous||{}),id:previous?.id||slot.id,targetId:slot.targetId||previous?.targetId||slot.id,name:slot.name};
  });
  const canonicalIds=new Set(canonicalSystemRows.map(x=>String(x.id)));
  // Never delete a separately uploaded media row simply because its NAME
  // matches a canonical placeholder. Runtime chooses a verified source by ID.
  s.audio.system=[...canonicalSystemRows,...systemAudio.filter(a=>!canonicalIds.has(String(a.id))
    &&!systemAliases.has(a.id)&&!systemAliases.has(a.name))];

  const exileAction=(s.actions?.role||[]).find(a=>a.id==='action_exile'||String(a.legacyId)==='1');
  if(exileAction)Object.assign(exileAction,{legacyId:'1',name:'Đuổi Người',description:'Bà phù thủy già đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',legacyAudioFile:'duoi_nguoi.mp3'});
  const reviveAction=(s.actions?.role||[]).find(a=>a.id==='action_revive'||String(a.legacyId)==='2');
  if(reviveAction)Object.assign(reviveAction,{legacyId:'2',name:'Hồi Sinh',description:'Cứu sống một người đã chết.',legacyAudioFile:'hoi_sinh.mp3'});
  return s;
}
function applyV226Catalog(s,migrating=false){
  const upsert=(arr,item,keys=['id'])=>{
    arr=Array.isArray(arr)?arr:[];
    if(!item||typeof item!=='object')return arr;
    const idx=arr.findIndex(x=>keys.some(k=>item[k]&&x&&x[k]===item[k]));
    if(idx>=0)arr[idx]=Object.assign({},arr[idx],clone(item));else arr.push(clone(item));
    return arr;
  };
  for(const c of DEFAULT_STATE.cards)s.cards=upsert(s.cards,c,['id','legacyId']);
  s.artifacts=Array.isArray(s.artifacts)?s.artifacts:[];
  s.actions=s.actions||{role:[],artifacts:[]};
  for(const a of DEFAULT_STATE.actions.role)s.actions.role=upsert(s.actions.role,a,['id','legacyId']);
  s.actions.artifacts=Array.isArray(s.actions.artifacts)?s.actions.artifacts:[];
  s.effects=Array.isArray(s.effects)?s.effects:[];
  for(const e of DEFAULT_STATE.effects)s.effects=upsert(s.effects,e,['id']);
  s.audio=s.audio||{cards:[],artifacts:[],actions:[],system:[]};
  for(const k of ['cards','artifacts','actions','system'])s.audio[k]=Array.isArray(s.audio[k])?s.audio[k]:[];

  if(migrating){
    const removedArtifacts=new Set(['artifact_mirror','artifact_role_swap','artifact_wake_with_seer']);
    const removedArtifactLegacy=new Set(['atifat-1789042413093','atifat-1789042448651','atifat-wake-with-seer']);
    s.artifacts=s.artifacts.filter(x=>!removedArtifacts.has(x.id)&&!removedArtifactLegacy.has(x.legacyId));
    const removedArtifactActions=new Set(['action_mirror','action_role_swap','action_wake_with_seer']);
    s.actions.artifacts=s.actions.artifacts.filter(x=>!removedArtifactActions.has(x.id));
    const removedEffects=new Set(['effect_copy_functions','effect_swap_roles']);
    s.effects=s.effects.filter(x=>!removedEffects.has(x.id));
    s.audio.artifacts=s.audio.artifacts.filter(x=>!removedArtifacts.has(x.targetId));
    s.audio.cards=s.audio.cards.filter(x=>x.id!=='audio_group_wolves'&&x.sourceKey!=='GROUP:WOLVES'&&x.targetGroup!=='wolves');
    for(const t of (s.themes?.list||[]))t.mappings={};
  }

  const syncAudio=(kind,target,idPrefix)=>{
    const list=s.audio[kind];
    let a=list.find(x=>x.targetId===target.id);
    if(!a){a={id:idPrefix+target.id,name:target.name,targetId:target.id,fileName:'',verifiedBinary:false};list.push(a)}
    if(migrating){a.name=target.name;a.fileName='';a.verifiedBinary=false;delete a.sourceKey;delete a.url}
  };
  for(const c of s.cards)syncAudio('cards',c,'audio_card_');
  for(const c of s.artifacts)syncAudio('artifacts',c,'audio_artifact_');
  // Role and Artifact actions share the same action audio catalog.
  for(const a of [...(s.actions.role||[]),...(s.actions.artifacts||[])])
    syncAudio('actions',a,'audio_action_');
  if(!s.audio.system.some(x=>x.id==='audio_system_confirm'))s.audio.system.push({id:'audio_system_confirm',name:'Xác nhận',fileName:'',verifiedBinary:false});
  if(!s.audio.system.some(x=>x.id==='audio_system_countdown'))s.audio.system.push({id:'audio_system_countdown',name:'Đếm ngược',fileName:'',verifiedBinary:false});
  if(migrating)for(const a of s.audio.system){a.fileName='';a.verifiedBinary=false;delete a.sourceKey;delete a.url}
  s.version=VERSION;
  return s;
}
function applyV226Prefs(p,migrating=false){
  p=p||{cards:{},artifacts:{}};
  p.cards=Object.assign({},DEFAULT_PREFS.cards,p.cards||{});
  p.artifacts=Object.assign({},p.artifacts||{});
  if(migrating)for(const id of ['artifact_mirror','artifact_role_swap','artifact_wake_with_seer'])delete p.artifacts[id];
  return p;
}

function loadState(){
  try{const cur=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(cur){const s=deepMerge(clone(DEFAULT_STATE),cur);s.cards=s.cards.map(x=>normalizeEntity(x,'cards'));s.artifacts=s.artifacts.map(x=>normalizeEntity(x,'artifacts'));return applyApprovedRoleSettings(applyV226Catalog(applyWitchDrunkCloneRules(applyNight02Rules(applyV210Rules(s))),false))}}catch(_){}
  for(const k of OLD_STATE_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const s=applyApprovedRoleSettings(applyV226Catalog(applyWitchDrunkCloneRules(applyNight02Rules(applyV210Rules(migrateOld(raw)))),true));localStorage.setItem(STATE_KEY,JSON.stringify(s));return s}}catch(_){}}
  return applyApprovedRoleSettings(applyV226Catalog(applyWitchDrunkCloneRules(applyNight02Rules(clone(DEFAULT_STATE))),false));
}
function loadPrefs(){
  try{const cur=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(cur)return applyV226Prefs(deepMerge(clone(DEFAULT_PREFS),cur),false)}catch(_){}
  for(const k of OLD_PREF_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const p=clone(DEFAULT_PREFS);if(raw.cards)p.cards=raw.cards;if(raw.artifacts)p.artifacts=raw.artifacts;const out=applyV226Prefs(p,true);localStorage.setItem(PREF_KEY,JSON.stringify(out));return out}}catch(_){}}
  return applyV226Prefs(clone(DEFAULT_PREFS),false);
}

/* NIGHT-02: migrate only the five approved role contracts in previously
 * saved GM card libraries; preserve all artwork, audio links and other cards. */
function applyNight02Rules(s){
  for(const card of s.cards||[]){
    const role=String(card.id||'');
    if(card.factionId==='wolf'){
      card.flags={...(card.flags||{}),allowMultipleActions:true};
      card.specialRules={...(card.specialRules||{}),usesPackBite:true,
        ...(role==='role_snow_wolf'?{requiresNoOtherLivingWolf:true}:{})};
    }
    if(role==='role_snow_wolf'){
      card.limits='Đóng Băng không được chọn cùng một người hai đêm liên tiếp.';
      card.conditions='Ưu tiên Đóng Băng; chỉ Cắn chung khi Sói Tuyết là Sói duy nhất còn sống.';
      const freeze=(card.functions||[]).find(f=>f.actionId==='action_snow_wolf_freeze');
      if(freeze)Object.assign(freeze,{usageMode:'eachNight',usageCount:1,phase:'night',
        cooldownNights:1,allowConsecutive:false,noSelf:true,allowDead:false});
      const bite=(card.functions||[]).find(f=>f.actionId==='action_wolf_bite');
      if(bite)Object.assign(bite,{usageMode:'eachNight',usageCount:1,
        requiresNoOtherLivingWolf:true,usesPackBite:true});
    }else if(role==='role_guard'){
      card.limits='Không Bảo Vệ cùng một người hai đêm liên tiếp.';
      card.conditions='Chỉ chặn vết Cắn của Sói, kể cả khi Yêu Tinh đã dịch chuyển.';
      const protect=(card.functions||[]).find(f=>f.actionId==='action_protect');
      if(protect)Object.assign(protect,{usageMode:'eachNight',usageCount:1,
        cooldownNights:1,allowConsecutive:false,allowDead:false,effectIds:['effect_protected']});
    }else if(role==='role_alpha_wolf'){
      card.conditions='Khi Sói Trùm bị Đóng Băng: vết Cắn chung vô hiệu, Phù Thủy không nhận thông tin nạn nhân. Khi Sói Trùm bị Đuổi: không thể thực hiện Sói Cắn.';
    }else if(role==='role_wolf_seer'){
      card.conditions='Sói Tiên Tri tham gia lượt Sói Cắn chung, sau đó thức riêng để tìm Tiên Tri theo thứ tự cấu hình.';
      card.information=String(card.information||'').replace('Không tham gia Sói Cắn cho tới khi là con Sói cuối cùng trong bầy.','Tham gia Sói Cắn chung cùng Phe Sói.');
    }else if(role==='role_fairy'){
      card.conditions='Sau khi Bầy Sói Cắn và mọi vai Sói đã thức. Chọn dịch Trái, Phải hoặc Không dịch; bỏ qua người chết từ các chu kỳ trước.';
      const transfer=(card.functions||[]).find(f=>f.actionId==='action_transfer_bite');
      if(transfer)Object.assign(transfer,{phase:'night',usageMode:'eachNight',
        usageCount:1,allowConsecutive:true});
    }
  }
  return s;
}
/* Witch/Drunk/Clone contracts for existing saved role libraries. Only the
 * three selected cards are normalized; all artwork/audio and unrelated cards stay intact. */
function applyWitchDrunkCloneRules(s){
  for(const card of s.cards||[]){
    const role=String(card?.id||'');
    if(role==='role_witch'){
      card.flags={...(card.flags||{}),allowMultipleActions:true};
      card.information='Mỗi đêm biết người nhận vết Sói Cắn cuối cùng sau Yêu Tinh, kể cả khi được Bảo Vệ hoặc Bất Tử Đêm. Không thấy vết Cắn khi Sói Trùm bị Đóng Băng hoặc Đuổi khỏi làng. Có thể dùng bình Cứu và bình Giết trong cùng một đêm.';
      card.limits='Mỗi bình chỉ dùng 1 lần trong ván. Dùng một bình không tự kết thúc lượt Phù Thuỷ.';
      card.conditions='Bình Cứu chỉ chọn người nhận vết Sói Cắn cuối cùng; bình Giết độc lập.';
      for(const fn of card.functions||[])if(['action_witch_save','action_witch_kill'].includes(fn?.actionId))
        Object.assign(fn,{phase:'night',usageMode:'onceGame',usageCount:1});
    }else if(role==='role_drunk'){
      card.limits='Bốc Vai Trò 1 lần duy nhất vào Đêm 3; Đêm 1–2 không thức.';
      card.conditions='Đêm 3 ưu tiên trước Phù Thuỷ Già. Bốc ngẫu nhiên từ những người đã chết trước đó; không ai chết thì trở thành Dân Làng. Chuyển Phe theo lá bốc.';
      const fn=(card.functions||[]).find(x=>x.actionId==='action_drunk_draw');
      if(fn)Object.assign(fn,{phase:'night',usageMode:'onceGame',usageCount:1,fromNight:3,toNight:3});
    }else if(role==='role_clone'){
      card.limits='Chỉ chọn 1 mục tiêu còn sống ở Đêm 1, không chọn lại.';
      card.conditions='Nếu người được chọn chết, kế thừa Vai Trò, Phe và chức năng từ đêm kế tiếp. Nếu chưa chết, Nhân Bản là Dân Làng.';
      const fn=(card.functions||[]).find(x=>x.actionId==='action_clone_target');
      if(fn)Object.assign(fn,{phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:1,noSelf:true,allowDead:false});
    }
  }
  return s;
}
/* Approved role rules must be written to the actual card editor AFTER the
 * default catalog is merged; that merge otherwise restores outdated fields.
 * Restrict edits to rules, action settings and the named cards, not media/theme. */
function applyApprovedRoleSettings(s){
  const cards=Array.isArray(s.cards)?s.cards:[];
  const byId=new Map(cards.map(c=>[String(c?.id||''),c]));
  const update=(id,fields,actions=[])=>{
    const c=byId.get(id);if(!c)return;
    for(const [key,value] of Object.entries(fields)){
      if(key==='flags')c.flags={...(c.flags||{}),...value};
      else c[key]=value;
    }
    c.functions=Array.isArray(c.functions)?c.functions:[];
    for(const [actionId,contract] of actions){
      let fn=c.functions.find(f=>f.actionId===actionId);
      if(!fn){
        const base=DEFAULT_STATE.cards.find(row=>row.id===id);
        const orig=base?.functions?.find(f=>f.actionId===actionId);
        if(!orig)continue;
        fn=clone(orig);c.functions.push(fn);
      }
      Object.assign(fn,contract);
    }
  };
  // User ruling 28/10: Aura reads the Role name (V1.11), not function names.
  update('role_aura_seer',{
    information:'Trong 4 đêm đầu tiên, bạn có tổng cộng 2 lần sử dụng chức năng để đọc tên Vai Trò của một Người Chơi.',
    limits:'Tối đa 2 lần trong 4 đêm đầu.',
    conditions:'Kết quả là tên Vai Trò của người được soi, theo luật V1.11 đã chốt.'
  },[['action_aura_read',{description:'Đọc tên Vai Trò của người được soi.'}]]);
  // User rulings 28/10: these are authoritative descriptions, NOT an executor.
  // Keep the original Artwork, function Action ID and usage ledger unchanged.
  update('role_elder',{
    information:'Già Làng có 2 mạng. Trong 4 đêm đầu, mỗi lần Rung Chuông vô hiệu mọi tác động gây chết của đêm đó và Già Làng mất 1 mạng. Nếu số mạng về 0, Già Làng chết.',
    limits:'Rung Chuông tối đa 1 lần mỗi đêm trong 4 đêm đầu; mỗi lần mất 1 mạng (ban đầu có 2 mạng).',
    conditions:'Rung Chuông ngăn toàn bộ tác động chết trong đêm kích hoạt. Khi Già Làng hết mạng, Già Làng chết.'
  },[['18',{description:'Rung Chuông: chặn mọi tác động gây chết đêm này; trừ 1 mạng Già Làng và chết nếu còn 0 mạng.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:4,targetCount:0,noTarget:true}]]);
  const artifactRulings={
    artifact_07:{
      information:'Hơi Thở Lão Già đánh dấu một người; người bị đánh dấu sẽ chết vào đêm hôm sau.',
      limits:'1 lần trong cả ván.',
      conditions:'Cái chết được lên lịch cho đêm kế tiếp, không xảy ra ngay trong đêm đánh dấu.',
      action:'action-grudge-designate',
      description:'Đánh dấu một người để chết vào đêm hôm sau.'
    },
    artifact_13:{
      information:'Đồng Xu Tuổi Trẻ yêu cầu người giữ công bố Vai Trò thật mỗi ngày; nếu không công bố thì chết.',
      conditions:'Hậu quả của việc không công bố Vai Trò thật là chết; thời điểm xử lý cần được gắn với vòng ngày/đêm.',
      action:'artifact_action_reveal_role',
      description:'Công bố Vai Trò thật mỗi ngày; nếu không công bố thì chết.'
    },
    artifact_15:{
      information:'Kim Cương Phủ Nhận loại bỏ khỏi ván một Artifact loại dùng mãi mãi đã được sử dụng.',
      limits:'1 lần trong cả ván.',
      conditions:'Chỉ nhắm Artifact dùng mãi mãi đã sử dụng, không loại Artifact chưa dùng hoặc loại chỉ dùng một lần.',
      action:'artifact_action_negate',
      description:'Loại khỏi ván một Artifact dùng mãi mãi đã được sử dụng.'
    },
    artifact_19:{
      information:'Bình Giấc Mơ khóa chức năng đặc biệt của một người trong 2 ngày đêm.',
      limits:'1 lần trong cả ván; hiệu lực khóa kéo dài 2 ngày đêm.',
      conditions:'Hết 2 ngày đêm, chức năng được mở lại; cần quản lý mốc bắt đầu/kết thúc khóa.',
      action:'artifact_action_lock_function',
      description:'Khóa chức năng đặc biệt của mục tiêu trong 2 ngày đêm.'
    },
    artifact_23:{
      information:'Sao chép chức năng của một người, bổ sung thành chức năng số 2. Người nhận được cấp lại đầy đủ lượt sử dụng mới cho chức năng sao chép.'
    },
    artifact_30:{
      information:'Trượng Luân Hồi được dùng khi chủ sở hữu chết để hồi sinh, tiếp tục sống với chính Vai Trò trước khi chết.',
      limits:'1 lần trong cả ván.',
      conditions:'Chỉ dùng khi chủ sở hữu chết; không bốc hay đổi sang Vai Trò mới.',
      action:'action-maid-inherit',
      description:'Khi bị chết, hồi sinh với đúng Vai Trò trước khi chết.'
    },
    artifact_32:{
      information:'Lam Ngọc Định Mệnh sao chép Artifact của một người chơi khác; người sử dụng Lam Ngọc có thể cùng sử dụng Artifact được sao chép.',
      limits:'1 lần trong cả ván.',
      conditions:'Sao chép để cùng sử dụng, không cướp hoặc chuyển quyền sở hữu Artifact gốc.',
      action:'artifact_action_link',
      description:'Sao chép Artifact của một người khác để cùng sử dụng.'
    },
    artifact_40:{
      information:'Hoán đổi vai trò của bản thân với một người chơi khác. Người nhận Vai Trò được cấp lại đầy đủ lượt sử dụng mới.'
    },
    artifact_42:{
      information:'Hư Không Vô Tận là Artifact sáng tạo do GM trực tiếp giao luật và giải quyết thủ công khi chơi Offline.',
      limits:'1 lần trong cả ván; GM tự điều phối Offline.',
      conditions:'Không tự động suy diễn tác động. Chỉ GM trực tiếp giao và xử lý theo luật tùy chỉnh Offline.',
      action:'artifact_action_custom',
      description:'GM giao luật và xử lý thủ công khi chơi Offline.'
    }
  };
  for(const a of Array.isArray(s.artifacts)?s.artifacts:[]){
    const rule=artifactRulings[a?.id];if(!rule)continue;
    for(const field of ['information','limits','conditions'])
      if(Object.prototype.hasOwnProperty.call(rule,field))a[field]=rule[field];
    if(rule.action && Array.isArray(a.functions))
      for(const fn of a.functions)if(fn?.actionId===rule.action)fn.description=rule.description;
  }
  update('role_old_witch',{
    information:'Mỗi đêm sau Bầy Sói nhận diện, Phù Thuỷ Già được chọn một trong hai: Đuổi hoặc Hồi Sinh. Đuổi người khiến các tác động lên họ không có hiệu lực. Hồi Sinh chỉ được dùng một lần cả ván, cho người chết ngày hoặc đêm liền trước và không được tự cứu.',
    limits:'Mỗi đêm chỉ thực hiện Đuổi hoặc Hồi Sinh, không cả hai. Hồi Sinh 1 lần trong ván.',
    conditions:'Thức ngay sau Bầy Sói nhận diện (hoặc Artifact nếu không có lượt nhận diện). Không được tự Đuổi; không Đuổi cùng người hai đêm liên tiếp. Hồi Sinh không tự cứu và chỉ chọn người chết ngày/đêm trước.',
    flags:{allowMultipleActions:false}
  },[
    ['action_exile',{description:'Mỗi đêm Đuổi một người khác bản thân, không cùng mục tiêu hai đêm liên tiếp.',phase:'night',usageMode:'eachNight',usageCount:1,targetCount:1,noSelf:true,allowDead:false,allowConsecutive:false,cooldownNights:1}],
    ['action_revive',{description:'Hồi Sinh một người khác bản thân chết trong ngày hoặc đêm trước; một lần/ván.',phase:'night',usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:true,allowDead:true,targetPreviousCycleOnly:true}]
  ]);
  update('role_snow_wolf',{
    information:'Mỗi đêm ưu tiên Đóng Băng một người. Không Đóng Băng cùng một người hai đêm liên tiếp (đêm thứ ba được chọn lại). Nếu Sói Trùm bị Đóng Băng, vết Sói Cắn chung vô hiệu và Phù Thuỷ không được báo mục tiêu. Sói Tuyết thức cùng bầy, nhưng chỉ tự Cắn khi là Sói duy nhất còn sống.',
    limits:'Đóng Băng mỗi đêm tối đa một lần; không cùng mục tiêu hai đêm liên tiếp. Đêm thứ ba có thể chọn lại.',
    conditions:'Đóng Băng trước Bảo Vệ và lượt Sói Cắn chung. Khi có Sói khác sống chỉ dùng Đóng Băng; khi là Sói cuối cùng được cả Đóng Băng và Cắn.',
    flags:{allowMultipleActions:true}
  },[
    ['action_snow_wolf_freeze',{description:'Đóng Băng 1 người, cấm cùng người hai đêm liên tiếp; Sói Trùm trúng Đóng Băng khiến Sói Cắn chung vô hiệu.',phase:'night',usageMode:'eachNight',usageCount:1,targetCount:1,noSelf:true,allowDead:false,cooldownNights:1,allowConsecutive:false}],
    ['action_wolf_bite',{description:'Tham gia lượt Bầy Sói; chỉ Cắn khi là Sói cuối cùng còn sống.',phase:'night',usageMode:'eachNight',usageCount:1,requiresNoOtherLivingWolf:true,usesPackBite:true}]
  ]);
  update('role_guard',{
    information:'Mỗi đêm Bảo Vệ chọn một người chống vết Sói Cắn trực tiếp hoặc đã được Yêu Tinh dịch chuyển. Không chặn bình Giết của Phù Thuỷ và các nguyên nhân chết khác.',
    limits:'Mỗi đêm 1 người; không bảo vệ cùng người hai đêm liên tiếp (đêm thứ ba được chọn lại).',
    conditions:'Thức sau Sói Tuyết, trước Bầy Sói Cắn. Chỉ ngăn cái chết do Sói Cắn; Phù Thuỷ vẫn nhìn thấy mục tiêu bị cắn dù đã bảo vệ.'
  },[
    ['action_protect',{description:'Bảo Vệ khỏi Sói Cắn kể cả vết cắn dịch chuyển, không chống bình Giết; không chọn cùng người hai đêm liên tiếp.',phase:'night',usageMode:'eachNight',usageCount:1,targetCount:1,allowDead:false,cooldownNights:1,allowConsecutive:false}]
  ]);
  update('role_alpha_wolf',{
    information:'Sói Trùm cùng thức trong Bầy Sói để thực hiện Sói Cắn chung. Khi bị Đóng Băng hoặc bị Đuổi khỏi làng, vết Sói Cắn không có hiệu lực và Phù Thuỷ không thấy mục tiêu. Tiên Tri soi Sói Trùm cho kết quả KHÔNG PHẢI SÓI.',
    limits:'Mỗi đêm tối đa một lượt Sói Cắn chung; không có lượt Cắn riêng khi đang bị Đóng Băng hoặc Đuổi.',
    conditions:'Sói Trùm cùng bầy thức khi có Sói còn sống. Nếu bị Đóng Băng hoặc bị Đuổi thì Sói Cắn chung vô hiệu; năng lực chuyên biệt của Sói khác thức sau Sói Cắn.',
    flags:{allowMultipleActions:true}
  },[
    ['action_wolf_bite',{description:'Tham gia lựa chọn Sói Cắn chung với toàn Bầy Sói; bị Đóng Băng/Đuổi thì vết Cắn vô hiệu.',usesPackBite:true}]
  ]);
  update('role_fairy',{
    information:'Yêu Tinh thức sau toàn bộ hành động của Bầy Sói và các Sói đặc biệt. Có thể chọn Trái, Phải hoặc Không Dịch vết Sói Cắn mà không được biết người đang bị cắn. Khi dịch, phải bỏ qua người đã chết từ ngày hoặc đêm trước; không có vết cắn thì không tạo tác động.',
    limits:'Mỗi đêm tối đa 1 lần; không chọn hướng đồng nghĩa Không Dịch.',
    conditions:'Sau tất cả vai Sói, trước Phù Thuỷ. Dịch vết cắn theo người còn sống kế bên (bỏ qua người đã chết); có thể chọn Không Dịch.'
  },[
    ['action_transfer_bite',{description:'Chọn Trái/Phải để dịch vết cắn qua người sống; chọn giữa hoặc không chọn thì không dịch; bỏ qua người chết trước đó.',phase:'night',usageMode:'eachNight',usageCount:1,targetCount:0,noTarget:true}]
  ]);
  update('role_witch',{
    information:'Phù Thuỷ thức sau Yêu Tinh, được báo người nhận vết Sói Cắn cuối cùng (MỤC TIÊU trên Character), kể cả khi đã được Bảo Vệ hoặc Bất Tử Ban Đêm. Nếu Sói Trùm bị Đóng Băng/Đuổi khiến cắn vô hiệu thì không báo mục tiêu. Có thể dùng Cứu và Giết trong cùng một đêm.',
    limits:'Bình Cứu 1 lần/ván, bình Giết 1 lần/ván; có thể dùng cả hai cùng đêm. Dùng một bình không tự kết thúc lượt.',
    conditions:'Bình Cứu chỉ áp dụng cho người nhận vết Sói Cắn cuối cùng sau Yêu Tinh; bình Giết chọn độc lập. Không có vết cắn hợp lệ thì không được cứu.',
    flags:{allowMultipleActions:true}
  },[
    ['action_witch_save',{description:'Cứu đúng người nhận vết Sói Cắn cuối cùng, kể cả đã được Bảo Vệ hoặc Bất Tử Ban Đêm.',phase:'night',usageMode:'onceGame',usageCount:1,targetCount:1}],
    ['action_witch_kill',{description:'Dùng bình Giết chọn một người; độc lập với bình Cứu, có thể dùng cùng đêm.',phase:'night',usageMode:'onceGame',usageCount:1,targetCount:1}]
  ]);
  update('role_spiritualist',{
    information:'Mỗi đêm Nhà Tinh Thần Học chọn hai người để biết CÙNG PHE hoặc KHÁC PHE. Người đang bị Đuổi khỏi làng vẫn được soi so sánh phe; Đuổi chỉ miễn nhiễm với các tác động gây hại như Cắn/Giết hoặc bình Giết.',
    limits:'Tối đa bốn lượt trong năm đêm đầu; mỗi đêm tối đa một lần.',
    conditions:'Soi chính xác hai người khác nhau. Vẫn nhận kết quả khi một hoặc cả hai mục tiêu bị Đuổi khỏi làng. Không thông báo vai trò cụ thể của người bị soi.'
  },[
    ['action_compare_faction',{description:'Chọn hai người để biết CÙNG PHE hay KHÁC PHE; mục tiêu bị Đuổi vẫn cho kết quả.',phase:'night',targetCount:2,usageMode:'custom',usageCount:4,fromNight:1,toNight:5}]
  ]);
  update('role_drunk',{
    information:'Say Rượu ngủ đêm 1 và 2. Đầu đêm 3, trước Phù Thuỷ Già, các lá Vai Trò đã chết hiện úp trên Player Web và GM. Say Rượu tự nhấn mở đúng một lá, các lá còn lại lập tức vô hiệu. Nhận Vai Trò/Phe/năng lực của lá chọn; GM được báo kết quả. Nếu không ai chết, trở thành Dân Làng không chức năng.',
    winCondition:'Trước đêm 3 thắng cùng Phe Dân; từ lúc nhận lá đêm 3 thắng theo Phe của Vai Trò đã bốc.',
    limits:'Bốc đúng một lần duy nhất ở Đêm 3; không thức đêm 1, 2 hoặc bốc lại.',
    conditions:'Đêm 3 trước Phù Thuỷ Già: Say Rượu tự mở một lá úp của người đã chết trên Player Web. Sau khi chọn không bốc lại. Nếu nhận Sói thì tham gia Sói Cắn chung và chức năng riêng theo timeline.'
  },[
    ['action_drunk_draw',{description:'Đêm 3 Say Rượu nhấn chọn duy nhất một lá úp của người đã chết trên Player Web; Server khóa các lá còn lại. Nếu không ai chết thành Dân.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:3,toNight:3,targetCount:0,noTarget:true}]
  ]);
  update('role_clone',{
    information:'Nhân Bản thuộc Phe Dân và Đêm 1 chọn một người còn sống khác bản thân để liên kết. Nếu mục tiêu chưa chết, Nhân Bản vẫn là Dân thường không có năng lực đặc biệt. Khi mục tiêu chết, từ đêm tiếp theo Nhân Bản nhận Vai Trò, Phe và chức năng của mục tiêu; nếu là Sói, thức cùng Bầy Sói.',
    winCondition:'Trước khi kế thừa: theo Phe Dân. Sau khi mục tiêu chết và kế thừa: theo Phe của Vai Trò nhận được.',
    limits:'Chọn một mục tiêu đúng Đêm 1, không được chọn lại.',
    conditions:'Mục tiêu còn sống, không phải bản thân. Chuyển Vai Trò/Phe/Năng lực từ đêm tiếp sau khi mục tiêu chết; giữ tên, Character và Artifact gốc.'
  },[
    ['action_clone_target',{description:'Đêm 1 chọn một người còn sống khác bản thân; chỉ khi mục tiêu chết mới kế thừa vào đêm sau.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:1,targetCount:1,noSelf:true,allowDead:false}]
  ]);
  update('role_wolf_seer',{
    information:'Sói Tiên Tri thức cùng Bầy Sói để chọn Sói Cắn chung, sau đó thức riêng theo thứ tự để tìm Tiên Tri. Mỗi đêm chọn một người sống khác bản thân và nhận kết quả Có/Không là Tiên Tri.',
    limits:'Sói Cắn chỉ được chọn trong lượt chung của Bầy Sói; năng lực tìm Tiên Tri tối đa 1 lần mỗi đêm.',
    conditions:'Thức cùng tất cả Sói trong lượt Cắn chung; sau đó dùng năng lực riêng tìm Tiên Tri. Không phải chờ trở thành Sói cuối cùng mới được tham gia Cắn.',
    flags:{allowMultipleActions:true}
  },[
    ['action_find_seer',{description:'Sau lượt Sói Cắn chung, chọn một người còn sống khác mình để tìm Tiên Tri.',phase:'night',usageMode:'eachNight',usageCount:1,targetCount:1,noSelf:true,allowDead:false}]
  ]);
  update('role_wolf',{
    information:'Sói Thường thức với toàn Bầy Sói khi còn ít nhất một Sói sống, cùng chọn một Sói Cắn chung mỗi đêm.',
    conditions:'Thức chung cùng Bầy Sói và thực hiện Sói Cắn chung. Không có hành động đặc biệt ngoài lượt Cắn.',
    flags:{allowMultipleActions:true}
  },[
    ['action_wolf_bite',{description:'Cùng toàn Bầy Sói chọn một mục tiêu Sói Cắn chung; không Cắn riêng.',usesPackBite:true,allowFriendlyFaction:true}]
  ]);
  for(const c of cards){
    if(c?.factionId!=='wolf'||!c.id)continue;
    c.specialRules={...(c.specialRules||{}),usesPackBite:true};
    c.flags={...(c.flags||{}),allowMultipleActions:true};
    for(const fn of c.functions||[])if(fn?.actionId==='action_wolf_bite')
      Object.assign(fn,{usesPackBite:true,allowFriendlyFaction:true});
    const extra='Bầy Sói thức chung để chọn Sói Cắn khi còn ít nhất một Vai Trò Sói sống. Năng lực riêng của từng Sói được gọi sau lượt Sói Cắn chung (Sói Tuyết ưu tiên Đóng Băng trước Bầy Sói).';
    if(!String(c.conditions||'').includes('Bầy Sói thức chung để chọn Sói Cắn'))
      c.conditions=[String(c.conditions||'').trim(),extra].filter(Boolean).join(' ');
  }
  return s;
}
function applyV221AudioGuard(s){
  const keep='ROLE:source-18';
  for(const kind of ['cards','artifacts','actions','system'])for(const a of (s.audio?.[kind]||[])){
    if(a.sourceKey&&a.sourceKey!==keep){delete a.sourceKey;a.verifiedBinary=false}
  }
  return s;
}
const DEFAULT_ROLE_ID_SET=new Set((DEFAULT_STATE.cards||[]).map(x=>String(x.id||'')));
let state=loadState(),prefs=loadPrefs();
saveState();
let currentKind='cards',currentId='role_old_witch',editDraft=null,cardFilter='all',artifactFilter='all',actionKind='role',audioKind='cards',editContext=null,lastTouchMap=new WeakMap(),defaultThumb='',objectUrls=new Map();

function saveState(){state.version=VERSION;localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
function entityList(kind){return kind==='artifacts'?state.artifacts:state.cards}
function entityById(kind,id){return entityList(kind).find(x=>x.id===id)||null}
function actionList(kind){return kind==='artifacts'?state.actions.artifacts:state.actions.role}
function actionById(id){return [...state.actions.role,...state.actions.artifacts].find(x=>String(x.id)===String(id))||null}
function effectById(id){return state.effects.find(x=>String(x.id)===String(id))||null}
function prefFor(kind,id){prefs[kind]=prefs[kind]||{};prefs[kind][id]=prefs[kind][id]||{starred:false,starOrder:null,hidden:false};return prefs[kind][id]}
function factionMeta(id){if(id==='wolf')return{id:'wolf',label:'Phe Sói',icon:'🐾'};if(id==='third')return{id:'third',label:'Phe Ba',icon:'🔥'};return{id:'village',label:'Phe Dân Làng',icon:'🍃'}}
function selectOptions(items,selected){return items.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(v)===String(selected)?'selected':'')+'>'+esc(l)+'</option>').join('')}
function numOptions(min,max,selected){const a=[];for(let i=min;i<=max;i++)a.push([String(i),String(i)]);return selectOptions(a,String(selected))}
function themeById(id){return state.themes.list.find(x=>x.id===id)||state.themes.list[0]}

function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(DB_STORE))q.result.createObjectStore(DB_STORE,{keyPath:'key'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function dbPut(key,blob){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({key,blob,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function dbGet(key){const db=await openDb();const out=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const q=tx.objectStore(DB_STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)});db.close();return out}
async function dbDelete(key){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function migrateLegacyV1Assets(){
  const marker='GMWW_V1_ASSET_MIGRATION_V258';if(localStorage.getItem(marker)==='done'||typeof indexedDB?.databases!=='function')return;
  const names=new Set((await indexedDB.databases()).map(x=>String(x?.name||'')));let copied=0;
  for(const name of LEGACY_V1_ASSET_DBS){if(!names.has(name))continue;let legacy;
    try{legacy=await new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});for(const storeName of Array.from(legacy.objectStoreNames)){const rows=await new Promise((resolve,reject)=>{const tx=legacy.transaction(storeName,'readonly'),store=tx.objectStore(storeName),values=store.getAll(),keys=store.getAllKeys();tx.oncomplete=()=>resolve({values:values.result||[],keys:keys.result||[]});tx.onerror=()=>reject(tx.error)});for(let i=0;i<rows.values.length;i++){const value=rows.values[i],key=String(value?.key??rows.keys[i]??'');const blob=value instanceof Blob?value:value?.blob instanceof Blob?value.blob:null;if(key&&blob&&!(await dbGet(key))){await dbPut(key,blob);copied++}}}}catch(e){console.warn('V1 asset migration skipped',name,e)}finally{try{legacy?.close()}catch(_){}}
  }
  localStorage.setItem(marker,'done');localStorage.setItem(marker+'_COUNT',String(copied));
}
function cardBlobKey(themeId,kind,id,assetKind){return 'v225|'+themeId+'|'+kind+'|'+id+'|'+assetKind}
function uiBlobKey(themeId,slotId){return themeId+'|ui|'+slotId}
async function blobUrlFor(key){if(objectUrls.has(key))return objectUrls.get(key);try{const rec=await dbGet(key);if(rec&&rec.blob){const u=URL.createObjectURL(rec.blob);objectUrls.set(key,u);return u}}catch(_){}return''}
function imageToThumb(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>{const sw=im.naturalWidth||1024,sh=im.naturalHeight||936,tries=[[300,275,.72],[260,238,.66],[220,202,.58],[180,165,.52]];let last='';for(const [w,h,q] of tries){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,w,h);const scale=Math.max(w/sw,h/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);last=c.toDataURL('image/webp',q);if(last.length<=100000){resolve(last);return}}resolve(last)};im.onerror=()=>resolve('');im.src=src})}
async function ensureDefaultThumb(){if(defaultThumb)return defaultThumb;defaultThumb='default-artwork.webp';return defaultThumb}
function builtinRoleArtwork(id,assetKind){
  const item=window.GMWW_BUILTIN_ROLE_ARTWORK?.[String(id)];
  if(!item)return '';
  if(assetKind==='thumb')return item.thumb;
  if(assetKind==='delivery')return item.delivery||item.display;
  return item.display;
}
async function resolveArtwork(kind,id,assetKind){
  const builtIn=kind==='cards'?builtinRoleArtwork(id,assetKind):'';
  if(builtIn)return builtIn;
  // Built-in Vai Trò must never fall back to old persisted artwork. If the clean
  // canonical package is missing, show the neutral placeholder instead of a stale card.
  if(kind==='cards'&&DEFAULT_ROLE_ID_SET.has(String(id))){
    if(assetKind==='thumb')return await ensureDefaultThumb();
    return 'default-artwork.webp';
  }
  const active=state.themes.activeId||'theme-sea';
  if(active!=='theme-default'){
    const local=await blobUrlFor(cardBlobKey(active,kind,id,assetKind));if(local)return local;
    if(assetKind==='thumb'||assetKind==='full'){
      const displayLocal=await blobUrlFor(cardBlobKey(active,kind,id,'display'));if(displayLocal)return displayLocal;
    }
  }
  if(assetKind==='thumb')return await ensureDefaultThumb();
  return 'default-artwork.webp';
}

async function resolveUiSlot(themeId,slotId){const local=await blobUrlFor(uiBlobKey(themeId,slotId));if(local)return local;const t=themeById(themeId),u=String(t.ui?.[slotId]?.url||'').trim();return u}

// Exactly these slots have image consumers. Hidden legacy slot values are
// preserved in state/IndexedDB; only nonfunctional *controls* disappear.
const ACTIVE_THEME_BACKGROUND_TARGETS={
  'bg.home':'#home',
  'bg.play':'#start',
  'bg.library':'#library',
  'bg.settings':'#settings'
};
const ACTIVE_THEME_IMAGE_TARGETS={
  'banner.home':'#home .gmww-home-scene-image-v350',
  'ui.homePortal':'#gmwwHomeEnterVillage .gmww-home-portal-art-v352',
  'ui.exploreDeck':'#home [data-home-library-tab="cards"] img',
  'ui.exploreMembers':'#home [data-home-destination="members"] img',
  'ui.exploreTemplates':'#home [data-home-library-tab="templates"] img'
};
const ACTIVE_THEME_NAV_TARGETS={'ui.bottomNavArt':'#bottomNav'};
let activeThemeApplyToken=0;
// Decorative navigation artwork must be wide enough for the dock; phone screenshots
// or exported UI posters include duplicated interactive icons and must not be applied.
function navArtworkHasCorrectRatio(src){
  return new Promise(resolve=>{
    const image=new Image();let complete=false;
    const settle=ok=>{if(complete)return;complete=true;clearTimeout(timeout);resolve(ok);};
    const timeout=setTimeout(()=>settle(false),1500);
    image.onload=()=>settle(image.naturalHeight>0&&image.naturalWidth/image.naturalHeight>=6&&image.naturalWidth/image.naturalHeight<=12);
    image.onerror=()=>settle(false);
    image.src=src;
  });
}
function themeImageUrl(value){return 'url("'+String(value).replace(/["\\\n\r]/g,'')+'")'}
function defaultThemeSlotPreview(slot){
  const selector=ACTIVE_THEME_IMAGE_TARGETS[slot];
  if(!selector)return '';
  const img=document.querySelector(selector);
  return img?.dataset.themeDefaultSrc||img?.getAttribute('src')||'';
}
async function applyActiveThemeUi(){
  const id=state.themes.activeId||'theme-sea',token=++activeThemeApplyToken;
  const targets=[
    ...Object.keys(ACTIVE_THEME_BACKGROUND_TARGETS),
    ...Object.keys(ACTIVE_THEME_IMAGE_TARGETS),
    ...Object.keys(ACTIVE_THEME_NAV_TARGETS)
  ];
  const assets=await Promise.all(targets.map(async slot=>[slot,await resolveUiSlot(id,slot)]));
  if(token!==activeThemeApplyToken)return;
  for(const [slot,src] of assets){
    const selector=ACTIVE_THEME_BACKGROUND_TARGETS[slot];
    if(selector){
      const el=$(selector);if(!el)continue;
      // Several Home/Settings CSS backgrounds are !important: a plain inline
      // style silently loses the cascade, making the editor appear disconnected.
      if(src){
        el.style.setProperty('background-image','linear-gradient(rgba(3,12,21,.50),rgba(3,12,21,.70)),'+themeImageUrl(src),'important');
        el.style.setProperty('background-size','cover','important');
        el.style.setProperty('background-position','center','important');
      }else{
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
      }
      continue;
    }
    const imageSelector=ACTIVE_THEME_IMAGE_TARGETS[slot];
    if(imageSelector){
      const img=$(imageSelector);if(!img)continue;
      if(!img.dataset.themeDefaultSrc)img.dataset.themeDefaultSrc=img.getAttribute('src')||'';
      img.setAttribute('src',src||img.dataset.themeDefaultSrc);
      continue;
    }
    const navSelector=ACTIVE_THEME_NAV_TARGETS[slot];
    if(navSelector){
      const el=$(navSelector);if(!el)continue;
      // Reject narrow screenshot-like artwork (which can already contain nav labels/icons).
      // The navigation itself is rendered by real, accessible buttons.
      const usable=src ? await navArtworkHasCorrectRatio(src) : false;
      if(token!==activeThemeApplyToken)return;
      if(usable){
        el.style.setProperty('background-image',themeImageUrl(src),'important');
        el.style.setProperty('background-size','100% 100%','important');
        el.style.setProperty('background-position','center','important');
        el.removeAttribute('data-nav-art-rejected');
      }else{
        el.style.removeProperty('background-image');
        el.style.removeProperty('background-size');
        el.style.removeProperty('background-position');
        if(src)el.setAttribute('data-nav-art-rejected','wrong-ratio');
        else el.removeAttribute('data-nav-art-rejected');
      }
    }
  }
}

function entityTileHtml(kind,e){
  const p=prefFor(kind,e.id),sub=kind==='cards'?(factionMeta(e.factionId).icon+' '+factionMeta(e.factionId).label):'✦ ARTIFACTS';
  return '<article class="role-tile '+(p.hidden?'hidden-pref':'')+'" data-kind="'+kind+'" data-id="'+esc(e.id)+'"><div class="tile-actions"><button class="star '+(p.starred?'on':'')+'" data-pref="star">'+(p.starred?'★':'☆')+'</button></div><img data-thumb-kind="'+kind+'" data-thumb-id="'+esc(e.id)+'" alt=""><h3>'+esc(e.name)+'</h3><small>'+esc(sub)+(p.hidden?' • Tạm ẩn':'')+'</small></article>'
}
function bindEntityTiles(kind,root,list){
  list.forEach(async e=>{const im=$('[data-thumb-kind="'+kind+'"][data-thumb-id="'+CSS.escape(e.id)+'"]',root);if(im)im.src=await resolveArtwork(kind,e.id,'thumb')});
  Array.from(root.querySelectorAll('[data-kind="'+kind+'"][data-id]')).forEach(tile=>tile.onclick=ev=>{const pref=ev.target.closest('[data-pref]');if(pref){ev.stopPropagation();togglePref(kind,tile.dataset.id,pref.dataset.pref);return}openEntityEditor(kind,tile.dataset.id)});
}
function ensureAudioPlaceholder(kind,target){
  const bucket=kind==='cards'?'cards':kind==='artifacts'?'artifacts':'actions';
  state.audio[bucket]=state.audio[bucket]||[];
  let a=state.audio[bucket].find(x=>x.targetId===target.id);
  if(!a){a={id:uid('audio'),name:target.name,targetId:target.id,fileName:'',verifiedBinary:false};state.audio[bucket].push(a)}else a.name=target.name;
  return a;
}
function createEntity(kind){
  const isCard=kind==='cards',id=uid(isCard?'role':'artifact');
  const raw={id,name:isCard?'Vai Trò Mới':'ARTIFACT Mới',information:'',lives:1,flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},winCondition:'',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',scope:'self',blockOn:[]},functions:[]};
  if(isCard)raw.factionId='village';else raw.artifact={ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''};
  const e=normalizeEntity(raw,kind);entityList(kind).unshift(e);prefFor(kind,id);ensureAudioPlaceholder(kind,e);saveState();savePrefs();renderEntityGrid(kind);openEntityEditor(kind,id);
}
function renderEntityGrid(kind){
  const grid=$(kind==='cards'?'#cardGrid':'#artifactGrid'),favGrid=$(kind==='cards'?'#cardFavoriteGrid':'#artifactFavoriteGrid'),filter=kind==='cards'?cardFilter:artifactFilter;
  const all=entityList(kind);
  const favorites=all.filter(e=>{const p=prefFor(kind,e.id);return p.starred&&!p.hidden}).sort((a,b)=>(prefFor(kind,a.id).starOrder||999999)-(prefFor(kind,b.id).starOrder||999999));
  const visibleTotal=all.filter(e=>!prefFor(kind,e.id).hidden).length;
  const countEl=$(kind==='cards'?'#cardFaceCount':'#artifactFaceCount');if(countEl){countEl.textContent=favorites.length+' / '+visibleTotal;countEl.setAttribute('aria-label',(kind==='cards'?'Thường dùng '+favorites.length+' Vai Trò, tổng '+visibleTotal+' Vai Trò':'Thường dùng '+favorites.length+' Artifact, tổng '+visibleTotal+' Artifact'))}
  favGrid.innerHTML=favorites.length?favorites.map(e=>entityTileHtml(kind,e)).join(''):'<div class="favorite-empty">Chưa có Vai Trò được đánh ★</div>';
  if(favorites.length)bindEntityTiles(kind,favGrid,favorites);
  let list=all.filter(e=>{const p=prefFor(kind,e.id);if(filter==='hidden')return p.hidden;return !p.hidden&&!p.starred});
  list.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'vi'));
  const add='<button class="role-tile entity-add-tile" data-add-entity="'+kind+'" aria-label="Thêm"><span>＋</span><b>'+(kind==='cards'?'Thêm Vai Trò':'Thêm ARTIFACT')+'</b></button>';
  grid.innerHTML=add+list.map(e=>entityTileHtml(kind,e)).join('');
  bindEntityTiles(kind,grid,list);
  const addBtn=$('[data-add-entity="'+kind+'"]',grid);if(addBtn)addBtn.onclick=()=>createEntity(kind);
}

function togglePref(kind,id,type){const p=prefFor(kind,id);if(type==='star'){if(p.starred){p.starred=false;p.starOrder=null}else{p.hidden=false;p.starred=true;const orders=Object.values(prefs[kind]||{}).filter(x=>x.starred).map(x=>Number(x.starOrder)||0);p.starOrder=Math.max(0,...orders)+1}}else{p.hidden=!p.hidden;if(p.hidden){p.starred=false;p.starOrder=null}}savePrefs();renderEntityGrid(kind)}

/* Artwork imported from older Artifact packs can include a dark empty gutter on
   only one side. Detect asymmetric *empty* gutters in a tiny canvas sample;
   never crop persisted artwork, rename files or touch role cards. */
function artifactArtworkSideMargins(data,width,height){
  if(!data||!Number.isFinite(width)||!Number.isFinite(height)||width<60||height<60)return null;
  const firstY=Math.floor(height*.12),lastY=Math.ceil(height*.88);
  const columns=new Uint16Array(width);
  let samples=0;
  for(let y=firstY;y<lastY;y+=2){
    samples++;
    for(let x=0;x<width;x++){
      const p=(y*width+x)*4;
      if(data[p+3]<128)continue;
      const red=data[p],green=data[p+1],blue=data[p+2];
      const hi=Math.max(red,green,blue),lo=Math.min(red,green,blue);
      const luminance=.2126*red+.7152*green+.0722*blue;
      if(luminance>86||(hi>75&&hi-lo>27))columns[x]++;
    }
  }
  if(!samples)return null;
  const threshold=Math.max(3,Math.ceil(samples*.22)); // Ignore isolated bright specks in dark artwork gutters.
  const present=x=>columns[x]>=threshold;
  // A minimum two-column run rejects isolated sparkles/noise in black padding.
  let left=0;
  while(left<width-2&&!(present(left)&&present(left+1)))left++;
  let right=width-1;
  while(right>1&&!(present(right)&&present(right-1)))right--;
  if(right<=left)return null;
  const l=left/width,r=(width-1-right)/width;
  // Be conservative: real dark artwork must not be auto-cropped.
  if(l+r>.14||Math.max(l,r)>.12||Math.abs(l-r)<.025)return null;
  return{left:l,right:r};
}
function alignArtifactPreviewArtwork(img){
  if(!img?.naturalWidth||!img?.naturalHeight)return;
  try{
    const sample=document.createElement('canvas');
    sample.width=240;sample.height=200;
    const context=sample.getContext('2d',{willReadFrequently:true});
    if(!context)return;
    context.drawImage(img,0,0,sample.width,sample.height);
    const margins=artifactArtworkSideMargins(context.getImageData(0,0,sample.width,sample.height).data,sample.width,sample.height);
    if(!margins)return;
    // Center the visible artwork without stretching or changing its aspect ratio.
    // In CSS percentage transforms, the offset is relative to the image width.
    const offsetPercent=50*(margins.right-margins.left);
    if(Math.abs(offsetPercent)<.25)return;
    img.style.transform='translate3d('+offsetPercent.toFixed(2)+'%,0,0)';
  }catch(_){
    // A non-readable external image retains the safe, centered CSS fallback.
  }
}

async function renderEntityFront(){
  const e=editDraft;if(!e)return;const kind=currentKind,card=$('#playerCard'),badge=$('#playerFactionBadge');
  card.className='player-card '+(kind==='artifacts'?'artifact':(e.factionId||'village'));
  $('#playerName').textContent=(e.name||'').toUpperCase();
  if(kind==='cards'){const f=factionMeta(e.factionId);badge.textContent=f.icon;badge.setAttribute('aria-label',f.label)}else{badge.textContent='✦';badge.setAttribute('aria-label','Artifacts')}
  $('#playerInformation').textContent=formatInformation(e.information||'');
  const img=$('#playerDisplay'),src=await resolveArtwork(kind,e.id,'display');
  // Opening another card during an async asset read must not show the old card.
  if(currentKind!==kind||editDraft?.id!==e.id)return;
  img.style.removeProperty('transform');
  img.onload=()=>{if(kind==='artifacts'&&currentKind===kind&&editDraft?.id===e.id)alignArtifactPreviewArtwork(img)};
  img.onerror=()=>img.style.removeProperty('transform');
  img.src=src;
  if(img.complete&&img.naturalWidth)img.onload();
  fitPlayerCardTitle();fitPlayerCardInformation();
}
function fitPlayerCardTitle(){
  const title=$('#playerName');if(!title)return;
  title.style.fontSize='';
  if(typeof requestAnimationFrame!=='function')return;
  // Fit BOTH lines and height, not just nowrap width. Long Vietnamese Artifact
  // titles must remain readable on iPhone instead of overflowing the card edge.
  const expected=title.textContent;
  requestAnimationFrame(()=>{
    if(title.textContent!==expected)return;
    const head=title.parentElement;
    if(!head)return;
    const styles=typeof getComputedStyle==='function'?getComputedStyle(head):null;
    const verticalPadding=(parseFloat(styles?.paddingTop)||0)+(parseFloat(styles?.paddingBottom)||0);
    const available=Math.max(0,head.clientHeight-verticalPadding-2);
    let size=Math.min(23,parseFloat(typeof getComputedStyle==='function'?getComputedStyle(title).fontSize:23)||23);
    title.style.fontSize=size+'px';
    while(size>12.5&&(title.scrollWidth>title.clientWidth+1||title.scrollHeight>available+1)){
      size=Math.max(12.5,size-.5);title.style.fontSize=size+'px';
    }
  });
}
function fitPlayerCardInformation(){
  const box=$('#playerInformation');if(!box)return;
  box.style.fontSize='';
  if(typeof requestAnimationFrame!=='function')return;
  requestAnimationFrame(()=>{let size=14.5;while(size>12&&box.scrollHeight>box.clientHeight+1){size=Math.max(12,size-.5);box.style.fontSize=size+'px'}});
}
function actionOptions(selected){const k=currentKind==='artifacts'?'artifacts':'role';return actionList(k).map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(selected)?'selected':'')+'>'+esc(a.name)+'</option>').join('')}
function functionHtml(fn,index){
  const to=fn.toNight===null||fn.toNight===''?'end':String(fn.toNight);
  return '<div class="function-card" data-fn-index="'+index+'"><div class="function-head"><b>Hành Động #'+(index+1)+'</b><button data-remove-fn="'+index+'" aria-label="Xoá">×</button></div>'+
    '<div class="function-grid">'+
      '<label class="full">Hành Động<select data-f="actionId">'+actionOptions(fn.actionId)+'</select></label>'+
      '<label class="full">Mô tả riêng trên Lá<textarea class="function-description" data-t="description">'+esc(fn.description||'')+'</textarea></label>'+
      '<label>Phase<select data-f="phase">'+selectOptions([['night','Ban Đêm'],['day','Ban Ngày'],['any','Ngày và Đêm'],['both','Ngày và Đêm (cũ)'],['setup','Đầu Ván / Setup'],['trigger','Theo sự kiện']],fn.phase||'night')+'</select></label>'+
      '<label>Giới hạn sử dụng<select data-f="usageMode">'+selectOptions([['unlimited','Không giới hạn'],['eachNight','Mỗi đêm'],['eachDay','Mỗi ngày'],['onceGame','1 lần / ván'],['nGame','N lần / ván'],['custom','N lần trong khoảng đêm'],['nPerNight','N lần / đêm']],fn.usageMode||'unlimited')+'</select></label>'+
      '<label>Số lần<select data-f="usageCount">'+numOptions(1,10,fn.usageCount||1)+'</select></label>'+
      '<label>Cooldown (đêm)<select data-f="cooldownNights">'+numOptions(0,10,fn.cooldownNights||0)+'</select></label>'+
      '<label>Số mục tiêu<select data-f="targetCount">'+numOptions(0,8,fn.targetCount??1)+'</select></label>'+
      '<label>Giới hạn mỗi người<select data-f="perUserLimit">'+numOptions(0,5,fn.perUserLimit||0)+'</select></label>'+
      '<div class="range-row"><label>Từ đêm<select data-f="fromNight">'+numOptions(1,20,fn.fromNight||1)+'</select></label><label>Đến đêm<select data-f="toNight"><option value="end" '+(to==='end'?'selected':'')+'>Hết ván</option>'+numOptions(1,20,to)+'</select></label></div>'+
      '<label class="full">Kích hoạt khi<select data-f="activation">'+selectOptions([['','Chủ động / Theo lượt'],['stake_execution','Bị Treo Cổ'],['SOURCE_DEATH','Nguồn chết'],['morning','Buổi sáng'],['night_start','Bắt đầu đêm'],['day_start','Bắt đầu ngày']],fn.activation||'')+'</select></label>'+
    '</div>'+
    '<div class="function-checks">'+
      checkHtml('noSelf','Không được chọn bản thân',fn.noSelf)+
      checkHtml('allowDead','Cho phép chọn người đã chết',fn.allowDead)+
      checkHtml('noTarget','Không cần chọn mục tiêu',fn.noTarget)+
      checkHtml('allowConsecutive','Cho phép chọn cùng mục tiêu liên tiếp',fn.allowConsecutive)+
      checkHtml('passive','Hành Động thụ động',fn.passive)+
      checkHtml('targetPreviousCycleOnly','Chỉ mục tiêu chu kỳ trước',fn.targetPreviousCycleOnly)+
      checkHtml('pushToPlayerWeb','Đẩy xuống Player Web',fn.pushToPlayerWeb)+
      checkHtml('systemRequired','Yêu cầu Hệ Thống',fn.systemRequired)+
      checkHtml('usesPackBite','Dùng Sói Cắn chung',fn.usesPackBite)+
      checkHtml('requiresNoOtherLivingWolf','Chỉ khi không còn Sói khác sống',fn.requiresNoOtherLivingWolf)+
      checkHtml('actorMayBeDead','Người thực hiện có thể đã chết',fn.actorMayBeDead)+
      checkHtml('allowFriendlyFaction','Cho phép chọn cùng Phe',fn.allowFriendlyFaction)+
      checkHtml('replacesWolfBite','Thay thế Sói Cắn',fn.replacesWolfBite)+
    '</div></div>';
}
function checkHtml(key,label,checked){return '<label class="check"><input type="checkbox" data-b="'+key+'" '+(checked?'checked':'')+'><span>'+esc(label)+'</span></label>'}
function renderEntityBack(){
  const e=editDraft;if(!e)return;
  $('#entitySettingsTitle').textContent=currentKind==='cards'?'Cài đặt Vai Trò':'Cài đặt ARTIFACTS';
  $('#entityName').value=e.name||'';$('#entityInformation').value=e.information||'';
  $('#factionBlock').classList.toggle('hidden',currentKind!=='cards');$('#livesField').classList.toggle('hidden',currentKind!=='cards');
  if(currentKind==='cards')$$('#factionSeg button').forEach(b=>b.classList.toggle('active',b.dataset.faction===e.factionId));
  $('#entityLives').value=Math.max(1,Number(e.lives||1));
  const f=e.flags||{};$('#flagUseDay').checked=!!f.useDay;$('#flagUseNight').checked=!!f.useNight;$('#flagNightImmune').checked=!!f.nightImmune;$('#flagAllowMultipleActions').checked=!!f.allowMultipleActions;$('#flagPassive').checked=!!f.passive;$('#flagSoloWolfOnly').checked=!!f.soloWolfOnly;$('#winCondition').value=e.winCondition||'';
  $('#passiveRuleEnabled').checked=!!e.passiveRule?.enabled;$('#passiveRuleType').value=e.passiveRule?.type||'stake_survive';
  $('#passiveFirstTime').value=e.passiveRule?.firstTime||'';$('#passiveNextTime').value=e.passiveRule?.nextTime||'';$('#passiveOnDeath').checked=!!e.passiveRule?.onDeath;$('#passiveSkipDead').checked=!!e.passiveRule?.skipIfTargetAlreadyDead;
  $('#groupGateEnabled').checked=!!e.groupActionGate?.enabled;$('#groupGateAction').innerHTML='<option value="">Chọn Hành Động</option>'+actionList(currentKind==='artifacts'?'artifacts':'role').map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(e.groupActionGate?.actionId)?'selected':'')+'>'+esc(a.name)+'</option>').join('');
  $('#groupGateScope').value=e.groupActionGate?.scope||'self';$('#gateExpelled').checked=(e.groupActionGate?.blockOn||[]).includes('expelled');$('#gateBlocked').checked=(e.groupActionGate?.blockOn||[]).includes('blocked');
  const sr=e.specialRules||{};$('#ruleSystemRequired').checked=!!sr.systemRequired;$('#ruleUsesPackBite').checked=!!sr.usesPackBite;$('#ruleRequiresSoloWolf').checked=!!sr.requiresNoOtherLivingWolf;$('#ruleActorMayBeDead').checked=!!sr.actorMayBeDead;$('#ruleAllowFriendlyFaction').checked=!!sr.allowFriendlyFaction;$('#ruleReplacesWolfBite').checked=!!sr.replacesWolfBite;
  $('#specialLimits').value=typeof e.limits==='string'?e.limits:JSON.stringify(e.limits||'');$('#specialConditions').value=typeof e.conditions==='string'?e.conditions:JSON.stringify(e.conditions||'');$('#specialAttributes').value=typeof e.attributes==='string'?e.attributes:JSON.stringify(e.attributes||'');
  $('#artifactSpecific').classList.toggle('hidden',currentKind!=='artifacts');
  if(currentKind==='artifacts'){const a=e.artifact||{};$('#artifactOwnerSelection').checked=!!a.ownerSelection;$('#artifactPersistentOwner').checked=!!a.persistentOwner;$('#artifactRevealFollow').checked=!!a.revealFollowTargetOnly;$('#artifactPriorityFirst').checked=!!a.priorityFirst;$('#artifactWakeRole').innerHTML='<option value="">Không</option><option value="source-2" '+(a.wakeWithRoleId==='source-2'?'selected':'')+'>Tiên Tri</option>';$('#artifactWakeAction').innerHTML='<option value="">Không</option>'+state.actions.role.map(x=>'<option value="'+esc(x.id)+'" '+(String(a.wakeWithActionId)===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('')}
  $('#functionList').innerHTML=(e.functions||[]).map(functionHtml).join('');bindFunctionControls();
}
function bindFunctionControls(){
  $$('#functionList .function-card').forEach(row=>{const idx=Number(row.dataset.fnIndex),fn=editDraft.functions[idx];
    $$('select[data-f]',row).forEach(s=>s.onchange=()=>{const k=s.dataset.f;if(k==='toNight')fn[k]=s.value==='end'?null:Number(s.value);else if(['usageCount','cooldownNights','targetCount','fromNight','perUserLimit'].includes(k))fn[k]=Number(s.value);else fn[k]=s.value;if(k==='targetCount'&&fn.targetCount>0)fn.noTarget=false;renderEntityFront()});
    $$('textarea[data-t]',row).forEach(t=>t.oninput=()=>{fn[t.dataset.t]=t.value});
    $$('input[data-b]',row).forEach(c=>c.onchange=()=>{const k=c.dataset.b;fn[k]=c.checked;if(k==='noTarget'&&c.checked)fn.targetCount=0;if(k==='noTarget'&&!c.checked&&fn.targetCount===0)fn.targetCount=1;renderEntityBack()});
  });
  $$('[data-remove-fn]').forEach(b=>b.onclick=()=>{editDraft.functions.splice(Number(b.dataset.removeFn),1);renderEntityBack()});
}
let editBackRendered=false;
function updateEntityHideButton(){const b=$('#hideEntity');if(!b||!currentId)return;const hidden=!!prefFor(currentKind,currentId).hidden;b.textContent=hidden?'◉':'◌';b.title=hidden?'Hiện lại':'Ẩn';b.setAttribute('aria-label',hidden?'Hiện lại':'Ẩn');b.classList.toggle('on',hidden)}
function toggleCurrentEntityHidden(){if(!currentId)return;togglePref(currentKind,currentId,'hide');updateEntityHideButton()}
function openEntityEditor(kind,id){currentKind=kind;currentId=id;const src=entityById(kind,id);if(!src)return;editDraft=normalizeEntity(src,kind);editBackRendered=false;$('#libraryHome').classList.add('hidden');$('#entityEditor').classList.remove('hidden');updateEntityHideButton();setFace('front');renderEntityFront();$('#library').scrollTop=0}
function closeEntityEditor(){editDraft=null;$('#entityEditor').classList.add('hidden');$('#libraryHome').classList.remove('hidden');renderEntityGrid(currentKind);$('#library').scrollTop=0}
function saveEntity(){if(!editDraft)return;const kind=currentKind,id=String(currentId);const list=entityList(kind),i=list.findIndex(x=>x.id===currentId);if(i>=0)list[i]=clone(editDraft);ensureAudioPlaceholder(kind,editDraft);saveState();renderEntityGrid(kind);closeEntityEditor();if(kind==='artifacts')void playSyncSharedArtifactLibrary({onlyIds:[id],forceIds:[id]})}
function deleteEntity(){if(!editDraft)return;if(!confirm('Xoá "'+(editDraft.name||'Lá này')+'"?'))return;const list=entityList(currentKind),i=list.findIndex(x=>x.id===currentId);if(i>=0)list.splice(i,1);if(prefs[currentKind])delete prefs[currentKind][currentId];const bucket=currentKind==='cards'?'cards':'artifacts';state.audio[bucket]=(state.audio[bucket]||[]).filter(a=>a.targetId!==currentId);saveState();savePrefs();closeEntityEditor()}
function setFace(face){if(face==='back'&&!editBackRendered){renderEntityBack();editBackRendered=true}Array.from(document.querySelectorAll('.face-switch button')).forEach(b=>b.classList.toggle('active',b.dataset.face===face));Array.from(document.querySelectorAll('.face')).forEach(f=>f.classList.toggle('active',f.id===(face==='front'?'entityFront':'entityBack')))}
let faceTouchStart=null;
function bindFaceSwipe(){
  const editor=$('#entityEditor');
  editor.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];faceTouchStart={x:t.clientX,y:t.clientY,edge:t.clientX<30}},{passive:true});
  editor.addEventListener('touchend',e=>{if(!faceTouchStart||!e.changedTouches.length)return;const t=e.changedTouches[0],dx=t.clientX-faceTouchStart.x,dy=t.clientY-faceTouchStart.y;const edge=faceTouchStart.edge;faceTouchStart=null;if(Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.25)return;if(edge&&dx>70){closeEntityEditor();return}const front=$('#entityFront').classList.contains('active');if(dx<0&&front)setFace('back');else if(dx>0&&!front)setFace('front')},{passive:true});
}

function renderActions(){const q=($('#actionSearch').value||'').toLowerCase().trim(),list=actionList(actionKind).filter(a=>!q||String(a.name).toLowerCase().includes(q));$('#actionGrid').innerHTML='<button class="compact-entry add-only" id="addActionBox" aria-label="Thêm">＋</button>'+list.map(a=>'<article class="compact-entry" data-action-id="'+esc(a.id)+'"><b>'+esc(a.name)+'</b></article>').join('');$$('[data-action-id]').forEach(el=>bindDouble(el,()=>openActionEditor(el.dataset.actionId)));$('#addActionBox').onclick=createAction}
function renderEffects(){const q=($('#effectSearch').value||'').toLowerCase().trim(),list=state.effects.filter(e=>!q||String(e.name).toLowerCase().includes(q));$('#effectGrid').innerHTML='<button class="compact-entry add-only" id="addEffectBox" aria-label="Thêm">＋</button>'+list.map(e=>'<article class="compact-entry" data-effect-id="'+esc(e.id)+'"><b>'+esc(e.name)+'</b></article>').join('');$$('[data-effect-id]').forEach(el=>bindDouble(el,()=>openEffectEditor(el.dataset.effectId)));$('#addEffectBox').onclick=createEffect}
function bindDouble(el,cb){el.addEventListener('dblclick',cb);el.addEventListener('touchend',()=>{const now=Date.now(),prev=lastTouchMap.get(el)||0;if(now-prev<420){lastTouchMap.set(el,0);cb()}else lastTouchMap.set(el,now)},{passive:true})}
function showSheet(title,html,ctx){editContext=ctx;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#editSheet').classList.remove('hidden')}
function closeSheet(){$('#editSheet').classList.add('hidden');editContext=null}
function openActionEditor(id){const a=actionById(id);if(!a)return;showSheet('Hành Động • '+a.name,'<div class="form-grid"><label class="full">ID<input id="editActionId" value="'+esc(a.id)+'" readonly></label><label class="full">Tên<input id="editActionName" value="'+esc(a.name)+'"></label><label class="full">Mô tả<textarea id="editActionDescription">'+esc(a.description||'')+'</textarea></label><label class="full">Hiệu Ứng liên kết<select id="editActionEffect"><option value="">Không</option>'+state.effects.map(e=>'<option value="'+esc(e.id)+'" '+((a.effectIds||[]).includes(e.id)?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label></div>',{type:'action',id})}
function openEffectEditor(id){const e=effectById(id);if(!e)return;const w=e.webTemplate||{};showSheet('Hiệu Ứng • '+e.name,'<div class="form-grid"><label class="full">ID<input id="editEffectId" value="'+esc(e.id)+'" readonly></label><label class="full">Tên<input id="editEffectName" value="'+esc(e.name)+'"></label><label>Primitive<select id="editPrimitive">'+selectOptions([['EXPEL','EXPEL'],['REVIVE','REVIVE'],['KILL','KILL'],['PROTECT','PROTECT'],['BLOCK','BLOCK'],['TRANSFER_EFFECT','TRANSFER_EFFECT'],['REVEAL_FACTION','REVEAL_FACTION'],['REVEAL_ROLE','REVEAL_ROLE'],['COPY_FUNCTIONS','COPY_FUNCTIONS'],['CUSTOM','CUSTOM']],e.primitive)+'</select></label><label>Thời lượng<select id="editDuration">'+selectOptions([['instant','Tức thời'],['night','Đêm đó'],['nextDay','Đến hết sáng hôm sau'],['untilRemoved','Đến khi gỡ']],e.duration)+'</select></label><label class="full">Mô tả Engine<textarea id="editEffectDescription">'+esc(e.description||'')+'</textarea></label><label>Event type<input id="webEventType" value="'+esc(w.eventType||'')+'"></label><label>Emoji<input id="webEmoji" value="'+esc(w.emoji||'')+'"></label><label class="full">Tiêu đề Player Web<input id="webTitle" value="'+esc(w.title||'')+'"></label></div><div class="check-grid" style="margin-top:8px"><label class="check"><input type="checkbox" id="webRequireAck" '+(w.requireAck?'checked':'')+'><span>Yêu cầu xác nhận</span></label><label class="check"><input type="checkbox" id="webRequireResponse" '+(w.requireResponse?'checked':'')+'><span>Yêu cầu phản hồi</span></label></div>',{type:'effect',id})}
function createAction(){const a={id:uid(actionKind==='role'?'action':'artifact_action'),name:'Hành Động Mới',description:'',effectIds:[]};actionList(actionKind).push(a);ensureAudioPlaceholder('actions',a);saveState();renderActions();openActionEditor(a.id)}
function createEffect(){const e={id:uid('effect'),name:'Hiệu Ứng Mới',primitive:'CUSTOM',duration:'instant',description:'',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}};state.effects.push(e);saveState();renderEffects();openEffectEditor(e.id)}
function saveSheet(){if(!editContext)return;if(editContext.type==='action'){const a=actionById(editContext.id);a.name=($('#editActionName').value||'').trim()||a.name;a.description=$('#editActionDescription').value||'';a.effectIds=$('#editActionEffect').value?[$('#editActionEffect').value]:[];ensureAudioPlaceholder('actions',a);saveState();renderActions()}else if(editContext.type==='effect'){const e=effectById(editContext.id);e.name=($('#editEffectName').value||'').trim()||e.name;e.primitive=$('#editPrimitive').value;e.duration=$('#editDuration').value;e.description=$('#editEffectDescription').value||'';e.webTemplate={eventType:$('#webEventType').value||'',emoji:$('#webEmoji').value||'',title:$('#webTitle').value||'',requireAck:$('#webRequireAck').checked,requireResponse:$('#webRequireResponse').checked};saveState();renderEffects()}closeSheet()}

function renderThemeSeg(){const holder=$('#themeSeg');holder.innerHTML=state.themes.list.map(t=>'<button data-theme="'+esc(t.id)+'" class="'+(t.id===state.themes.selectedEditorId?'active':'')+'">'+esc(t.name)+'</button>').join('');$$('[data-theme]',holder).forEach(b=>b.onclick=()=>{state.themes.selectedEditorId=b.dataset.theme;state.themes.activeId=b.dataset.theme;saveState();renderTheme();applyActiveThemeUi();renderEntityGrid('cards');renderEntityGrid('artifacts')})}
async function renderTheme(){
  renderThemeSeg();const themeId=state.themes.selectedEditorId||state.themes.activeId||'theme-sea';
  const sections=$('#themeUiSections');sections.innerHTML='';
  for(const group of THEME_UI_GROUPS){const sec=document.createElement('details');sec.className='theme-section theme-collapsible';sec.innerHTML='<summary class="theme-section-head"><h3>'+esc(group.title)+'</h3></summary><div class="theme-slot-list"></div>';sections.appendChild(sec);const list=$('.theme-slot-list',sec);for(const [slotId,label] of group.slots){const src=await resolveUiSlot(themeId,slotId);const row=document.createElement('div');row.className='theme-slot';row.dataset.slotId=slotId;row.innerHTML='<img class="theme-slot-preview" alt=""><div class="theme-slot-main"><b>'+esc(label)+'</b><input type="url" placeholder="Link ảnh (không bắt buộc)" value="'+esc(themeById(themeId).ui?.[slotId]?.url||'')+'"></div><div class="theme-slot-actions"><button data-upload-slot="'+esc(slotId)+'" title="Tải ảnh">↑</button><button data-clear-slot="'+esc(slotId)+'" title="Mặc định">↺</button></div>';$('.theme-slot-preview',row).src=src||defaultThemeSlotPreview(slotId)||'';$('.theme-slot-preview',row).title=src?'Ảnh đang áp dụng':'Ảnh mặc định (đã liên kết)';list.appendChild(row);$('input',row).onchange=()=>saveUiSlotUrl(themeId,slotId,$('input',row).value);$('[data-upload-slot]',row).onclick=()=>pickUiSlotFile(themeId,slotId);$('[data-clear-slot]',row).onclick=()=>clearUiSlot(themeId,slotId)}}
  await renderThemeEntityRows(themeId,'cards',$('#themeCardRows'));
  await renderThemeEntityRows(themeId,'artifacts',$('#themeArtifactRows'));
}
async function renderThemeEntityRows(themeId,kind,holder){
  if(!holder)return;holder.innerHTML='';
  for(const c of entityList(kind)){
    const src=await resolveArtwork(kind,c.id,'thumb');
    const row=document.createElement('div');row.className='theme-card-row theme-card-row-simple';
    row.innerHTML='<img alt=""><div class="theme-card-name"><b>'+esc(c.name)+'</b></div><div class="theme-slot-actions"><button data-theme-upload title="Upload Artwork">↑</button><button data-theme-clear title="Reset">↺</button></div>';
    $('img',row).src=src;holder.appendChild(row);
    $('[data-theme-upload]',row).onclick=()=>pickEntityThemeArtwork(themeId,kind,c.id);
    $('[data-theme-clear]',row).onclick=()=>clearEntityTheme(themeId,kind,c.id);
  }
}

async function saveUiSlotUrl(themeId,slotId,url){const t=themeById(themeId);t.ui=t.ui||{};t.ui[slotId]=t.ui[slotId]||{};t.ui[slotId].url=String(url||'').trim();saveState();await renderTheme();await applyActiveThemeUi()}
function pickFile(cb){const i=document.createElement('input');i.type='file';i.accept='image/*';i.hidden=true;document.body.appendChild(i);i.onchange=()=>{const f=i.files?.[0];i.remove();if(f)cb(f)};i.click()}
function pickUiSlotFile(themeId,slotId){pickFile(async f=>{await dbPut(uiBlobKey(themeId,slotId),f);objectUrls.delete(uiBlobKey(themeId,slotId));await renderTheme();await applyActiveThemeUi()})}
async function clearUiSlot(themeId,slotId){const t=themeById(themeId);if(t.ui)delete t.ui[slotId];await dbDelete(uiBlobKey(themeId,slotId)).catch(()=>{});objectUrls.delete(uiBlobKey(themeId,slotId));saveState();await renderTheme();await applyActiveThemeUi()}
function thumbBlobFromFile(file){return new Promise(resolve=>{const u=URL.createObjectURL(file),im=new Image();const done=v=>{try{URL.revokeObjectURL(u)}catch(_){}resolve(v||file)};im.onload=()=>{try{const c=document.createElement('canvas');c.width=360;c.height=330;const g=c.getContext('2d');if(!g)return done(file);g.fillStyle='#071421';g.fillRect(0,0,360,330);const sw=im.naturalWidth||1064,sh=im.naturalHeight||1478,scale=Math.max(360/sw,330/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(360-dw)/2,(330-dh)/2,dw,dh);c.toBlob(b=>done(b||file),'image/webp',.9)}catch(_){done(file)}};im.onerror=()=>done(file);im.src=u})}
function pickEntityThemeArtwork(themeId,kind,entityId){pickFile(async f=>{const dk=cardBlobKey(themeId,kind,entityId,'display'),tk=cardBlobKey(themeId,kind,entityId,'thumb');await dbPut(dk,f);await dbPut(tk,await thumbBlobFromFile(f));objectUrls.delete(dk);objectUrls.delete(tk);saveState();memberAdminState.loaded=false;await renderTheme();renderEntityGrid(kind)})}
async function clearEntityTheme(themeId,kind,entityId){const t=themeById(themeId);t.mappings=t.mappings||{};delete t.mappings[entityId];for(const k of ['display','thumb']){await dbDelete(cardBlobKey(themeId,kind,entityId,k)).catch(()=>{});objectUrls.delete(cardBlobKey(themeId,kind,entityId,k))}saveState();await renderTheme();renderEntityGrid(kind)}

function addTheme(){const name=prompt('Tên Chủ Đề mới');if(!String(name||'').trim())return;const id='theme-'+Date.now().toString(36),src=themeById(state.themes.activeId);state.themes.list.push({id,name:String(name).trim(),builtin:false,locked:false,ui:clone(src.ui||{}),mappings:clone(src.mappings||{})});state.themes.selectedEditorId=id;state.themes.activeId=id;saveState();renderTheme()}

function audioBlobKey(kind,id){return 'audio|'+kind+'|'+id}
// Original Old Witch voice from V2.16; bundled with the OTA application.
const gmwwBundledLegacyAudio={ "ROLE:source-18":{type:"audio/mpeg",base64:"SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAzAAAAAAAAAAAAAAD/84TAAAAAAAAAAAAASW5mbwAAAA8AAABgAAAkwAAHCg0PEhQXGhwfISQnKSwvMTQ2OTw+QUNGRklLTlBTVlhbXmBjZWhrbXBydXh6fYCChYWHio2PkpSXmpyfoaSnqayvsbS2uby+wcPDxsnLztDT1tjb3uDj5ejr7fDy9fj6/f8AAAAATGF2YzYxLjE5AAAAAAAAAAAAAAAAJAPAAAAAAAAAJMD2ifO7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80TEAA4ABhGfQhgAAJAgLOOLAWfBAEAQB83WHsQBgH8/+Jwffgh5c/5SJwfB9H4Pg+BAQBB3/lwfB///+UBAEHXg++8hsa3g6Hbfbydf+5n5Kcv+qKv/s7jwjX7T3NP/80TEGxgLKkQBi1AAzyQbiGCyNzz3beqEpzuPhwEMQwcE8Wtl+p4/LEZOmKolBRBmJAilR////zyBh+YzmMeY3///7WbyZiUiY0gNJSAVxmKiqhP0H4BgAnr//9/8jKf/80TEDRUrFnBVwigBS8/jGdXZFSQ5+khz0O3JYhCloyoRv+mdX7+fujSE7SmshliaHWlbyVkGEe41yKNRkGueRUOjlO6sdRcPi5yoqGKHAAAcxR7FUkkkkkjkkUHhZPX/80TECxUxmtJeSYaSBMVvRyQBQMY2NdtGOen4gwgQAARne7/oiO7u4s/L3eEiHERE9Hd+m7uIRPmhP+7u7oggIvcGBOIHA45//ggIAwH1bG6/P/D8Qa27bbba1JtE8wf/80TECRQgtspY3pg0AwAVG8TRxicIh0w4w30Axw04SodOmrQhyN+Idl05QM8RUlqQ6p2d8mryxtrFjakPDVqxGXJseesAQVPBWEdYietXXzf1HfkVh4hn/12twMOINqz/80TECxO5Zxb41wQ7DNrjlZRACAIU0uqCQDGDRoaVk5lYIIxLxv0SlCABlyV5hUEqgba6ta+8biUtDKsbEgdQ6lUxZHm/95v21/T9HsjB1CSIVo2rRAIe6zImVTTJFWn/80TEDxMwctT+w9ZCVgAyHt09BNsg4LtA9CZ1qoKsLsFhwaE25oCQHDpJB1KkvNGH6zQULMcoALA4YOAC37fX//w+HAWnSweDqK4NS2gUMIbrOKPWpeFwoZdeICQgEpr/80TEFRIgjrR808ZoCBEdtdb5MR+tSgWUDCXCtbyMDB4TgsWAB5wZAcHhEAkPJO/0gqho613////+txGeDBk8miC4ipda3gJRq5dkKyG2w1CuJ8qRYnzIqcBmi0gG8QH/80TEHxEAmuZeeUyGwSLvxGsgliCjWIW4DgN/+rGvAoH0FSGPBMz////7FOdHgMnp6AAokXbbBcHRZjJ4hbGhC2xjhVKiXKXxXDQ+lw6wx5qv9jLOmRl/30FEHALEbi//80TELhKROuJeekZKW6xGMLEbv5YFX61N7EzhQcpsz//6FDhaRGmbuqoAN1S79ycDAKEJCMIFsI6Pwkxu4bDjZX2txY1c6tvFvXJhUb1+kVQKBnohnPjkYrygDNOWD2H/80TENhKA5q5fTxgAAwYN7JVgxlgp////1Dzoq6mW1ZbQ5nS6zMRNJsLNjQQABVtcIWudSi00d8rsAzONvr/Ri87xPUo4MhphMyJBMo+k0sAxwbnVDjPBPWs4fH4mzHf/80TEPyG66s5fmFgA5yXw8sMSNNzpU8mVkys487Q7S+dmSgxNDQ7LzjGX9ljx2T3sg7U0jcL1////Vsm5eyPvj5lkM2z//////L3vNKaf2Kr+0o8fX9CwIAgIwxIE9D7/80TECxHoprz32DAAYGAiGrtd89D8QmZf3PPf4d3hhzDW+/+sWJGgyJ2GlW7tbyINLMO+CoNA08jv4lDX6rBVxvb///2Lp0ofcgDrQ4DAJmLjEbE38LupxO4YjC/W9Zz/80TEFhJ49sGUyZJ8DyA2upSVwIeDn8/M3z/quWZk3DIMTvRayyiK4G0kAYD6/6xYEJT//Tkb///1HYAQPegv3QAHJLFJHaGAhwiOoacUFlJzFZWQk6Z+1KHm2pZ/XU//80TEHxG57v5eOkVGLwoUQghpM4Jy2ggb1Td96JO76UFmC1DvJ2ev//5YMyhriKf//+s7MAAo77kARqEB8EfMZpsQRCzaYTkyxQfTiEaEEyXpbekpw/711EKIczK1zMH/80TEKxI5atZeeMSQQmRiVeffux3KFg5rSuj6xEaMjSQwh///51hlb2oVACcl0iJFgQH5gx8jBQs3VjLjDFx2FZCclQEsWLc6Z68Vk1b5VAkM++21Wg1UxVFsx773O7X/80TENRJp8upeeMR2q40lEb+pHK6ugLHRMyh///+MRaxKZK3//8qUogG4KSZSw5bWlhwmA8IzBGqPmTsUlLh5t8XvyqXXVkNY31Lo9CVarGU4kpW0f/8lmcBIIAiwGpP/80TEPhJx3v5eYMRefX//61KC4MgM8oYuMTWEeHh5i5AwK7YSVxbLofybwVQvxDdIUfhBzTsqmWpVfKUqXykXsdLiNysraf/mYy9DaGX//qUqoYwEEhwd/nf/9T4iHgr/80TERxJR1uMeeMSW5KRqQTuV2aPrJJALS+HsfF9d2wNJwhOe7+oNDpW8+kO7y13R/90hW3MSJGwaFU7Kz7+znndJQYYR1OZ9KwYSQcr/zhf3l/f3lzSKagAZRaLbbbb/80TEUBIRRtJ+YYR+gaAoYpQSGIK5CNFf9X76f63fmK9DRHFh5kzPR+m/3xkgsJysBwseVx0ZgUawnseR3SLX15na6/9ssyr+GCdYdj8Ph+mGqQZjSazzP6nWbO2LIGj/80TEWh369upeOw2LMg5jJsg29628ys+v2RZsM30ixk4H2VZ7+tCDpAAvfSHJeY9Ls2Bgg29QEo3ExUQVPHIYu7qUnM926T18vP7/fPzOTv9feYos5DJ8B6lXRPt/sv7/80TENRy6zrgAywTdcxFGy0lVhYLSepH5ErZH59lcz8M3jUR4ZmEdyihfv0ps6u1GdnNBWVkn7NoY7Xf/0r2tTaiElFsYGDqzP/YALTTbWBDuETcK/i0qjpVU1oBij8r/80TEFRFBGuJSwkyULly8owywSLeFbCsRzg2rTeTQo5oRWjiGyQ2GCBuSqvc35T10EdUEWiw7/uJWK//okZKKckYGIOKLEmHvQH0oYLAOJZkyvMXDhlxy7nFwuZFn3QP/80TEIxIYxtx+awY0ugIgFFjSYhIAAESx4Gms+QjHiUVOgqCX/PFj6LvrPAEld/+uMRUIAf7w+uQzf3BMkfToEZZ/FtnSa+sJ6Jpyzvr5Dy2y2RJGAUiBosVXbe1f9jr/80TELRIY/sVUwwwwzKNcaLCUs+utTWX2knN/8iVu9Aq4GjZ5P/7Cqk42a6ktstA1CGIYzWQpaPxHQDNhHTru4lhG8uMT21FnBXKnlStGrsJjSKPpOQhzMj0p8rt2SlL/80TENxF5jvI+eMpWIJOf/mRZC9Q8Okr//9MfH9BNuStwD4LlElMSKLsqFRNofHVktseDx66712REEiUQVBUG3QzgmYSwAAhw9HqVz10//dTkeqgjgMA4m/+9iOYLGDj/80TERBJBjuGeekRK1f/7NA4wO7w7dChYfkivVmCx9RunixmrSZYHEadCzaa9nWoskzUOq3Cj9j+mt92BC0ZzscW4oXt+YjCcPl//qvS+PYWTJf/4qhUMAQ4tNtgPoLD/80TEThERHsS0wwQ8dUA0SIVWznTQHwFFD30O2uabt4GmMtKjbWtc0z5t9oEtbEdtUdEm+ZUWjllsBAU8mtP9QkDV7WvebbO//yFCVgZOJtysBzTQkkO1Ms9S6WaAEyL/80TEXBHpjtmeSgRc5HJmcai9kMVjGx26uupS3brsQIiokP3dUT/9mllaUqB4///LLDVZ2oOqER6ZN/9TEA+D4nN1vdq/9//e2/1pAC7jr6+2oVhC4KvKdNEzaS+WMub/80TEZxJZitWfRigCJhqXxLBmHwhMYjgDYC8C3H4XAmYwCQ9x6LL93kiiguimYtnTIcpQZCQQ5R1JbJh3Mi8ynss+mm6CkDv1InyW6q1HS+j9Ny1JtJJjJJFmqV7pGjP/80TEcCI7EtB/j2gBJvVrQa/1oq/Z0nV/UgyZukXzNM0Qb9ecioAACgNX56CBiGvA5GTKJKex3KFuOdAT1rvHz/6Y28qDhQXHN7nGmd7f7a6qQ5XEaXVktOv7qyvnUhz/80TEOhJx1tpfzygAE2/pU4wTHDAbpf///+KVKmCHEg5VGoExWxdAO7KGBp9oFjRCj+KdresPCaDJV9jQTvVrvRGVqPT+r0M51Kxf//saVpv//1Y7BiH///55MBWHC33/80TEQxDZ4u5eY8RmVQCI0QpFGcY/hgJpj6XIRhYrKG4eD9OBG5J75U8MZyQkCwCYRwp9yCHsh0dGKmrf0KX0330/9H///+qlEhOv///5JZ6mrs71RQUqSlmrgbFEpBD/80TEUhGh3tpcegqSwbTNCWMMkeTeZKnVZJnMIPzUAhjUAyd6fVrInS9UOre77//+mtf/9pDnCARaf///////S5mNUWQOEbTCepUAETh27VDDWBrCD1LI0Pofk4PWLgz/80TEXhISyu5eiwQyx/lI3P6JpVTXuXQOSYqHJEAYtP/zkIJMDOCND3MaL8suUiwXd/Exs8L////xcUEMto36VQAncyK1qERB+dRrRSnL71UVHSQpeqq2v1TOc/FxBPL/80TEaBIRAtY8gsSSmo/rT94rniIRQD4rXHwwG+4/2ZyXYWa07/9X/FQ6Ev//+j6m7Sg76IWrd7HJfIHxgyGh8QxcQ8fqU1a/KlQv2bhNljVC7CPoCP0KL1DARkTIL/D/80TEchHA+sZeykSwN7Q50goQYgnnPp4kOpBT/EgBCf///9VhtzgEL63ZRUCvmAoAmIgQWcsG8mfUXg6LTZjAU2UDahY7cuhBbYz7bRIeXK2IixySlsYt4BjrEfq3////80TEfhJg+vJeC8Ya//yCA8TF2b/1gQh/6uvHrKuabOIi6QC7ddqnK23R/iCIxXwBFBez8Ly5Mlouf4n9kEqoskdGXO1JH9aMZmZJdgyByGt///7f/7KodAF2f2XsPM//80TEhxKB2rGcDooI+tq1h5JdUwAepUYqAEV2uoBqhjWkK1gG7UoUnggV9oYnBWbCeuVoRmhmZkzdZkjNarr/IY8v3RVFKP/3T/zr//urBAYwO/ZVMtO//ZTPAFn1UuX/80TEkBIJ1uJeeYR2VQANnmZlyZ9ZjWUMNR3ltv+02WU8u6GdbKZlg5SWpTokrbOye1fqkxn26zCAxBYaExpyA6veUUf+qsKh1L/a9KDv/1JQ4WeBkO/1KgAJd/8EYGn/80TEmhHJyrZayMR0LkpAOwKCXUjTVZwvFtpHiDa01SwEblWWlM1pQyL3dC/1Qz7HM7FmAjmb/RLf3NZP//Wihlnf8f//sExUiFauPvpqBAmV3hShWtALV46PswLEOVr/80TEpRKJIsZ8wMRwXRKNdtf0wCXI3uawJjAm/NfsViFEpWMQWKiR3v+VZU9BMO3/xcJHhF/6GCnf8rhsiIsSmQVy1RgXgAoFogag7dH0rrfBxozDFLTdsbU//P6hQvz/80TErRIR2qpcyMR0mv9xU4WOG1NQ1OQNEgLnq4blY/a6mo/Y6dr///v4a9u82B5IrwcU+EdiVS3JgUSGR9kZZdJj4FAwB4GNKcjQsbPJivLKag8hEXKYk+h8XJvY7RL/80TEtxHZcpp+wEqcYuP+P+7JB0WFromiriBUPVCFSR3/v/+ymFVWMaIJputGT1gYJD5YCQ1OdaQAHDBXkl1JFMdc5enaWlEiSwVDASPIOy23X7xuTh6jEBYcGgoBzlz/80TEwhGx5mA0wFCVSb+YfVuQMtkuxFNRAX+zSjTZ7PwsAhScWIhedSSY0TBwBDi1ZA6AXtmwZXRJ+RlNK/XuqVtMSD0EztzImtNM6RYSpRz7lem1/f6dBr9XyK02f1f/80TEzhBxIjAA5lAo7qLbUMuhINtnsRpAKw32a8AQCKgdR6ox36GPA4oIwlrYl7EExwxjUKjWm4/C8E0kGpSisIDEEsiB711LsnTYaOOPsjnHAUY/K2oFJZmNEu1DUIL/80TE3xN45hwA5kYw4VDM2s25zfTCB23eCZeSRz96AKW5lX+ry3vW7uAkODQMrkDKHrWPLrMHg2jCa1zEzj67WKmXXaxhtJU0OCjjSmx5VACGOQRF4VdhBcIw9cl8Ver/80TE5A/wghwE5hIiPE4ADDDDSsRgAGA2A2SgAGFmJqZFYuJhimXmkmQEXQdwmCODgEDBMAOMKEDG3bMAIAJvCEA1qDZoyYN8ALAwRXptg3jDVYyYghdb6CbqIoWhzyD/80TE9xOAfhwM0YpEZE6lc0bxbCcJwZsg5X+pD9i4XDwzZPm+q7fvt9MzTNEG1f+r7emuXC4gbh8EAGnqrqc9lBeD4IHIIGU1AUaBCSSgDIaiczPBV1ZqNDGCOaaAKgH/80TE/BXwhhwNWRgAgSNE4IiZMSAzHGMAMBiO/Y4EFdESVHhATSdBpB02ZFaC6KJwwLBuhWqpbsQ1NjNQtItinqMhShohomzMmdLaJwuGxxVzguMdCBqmOMRUQhA5sLP/80TE9yMaWkRXnoAAgcYTf/T/xXBOgtAaoKhSFaDQFkf///sghL5VN9QCISJohph5l5fayu73+egCGKE9Tl2OX5Nvu6OTgFB0rwqBgaoXEdF3BuIZQoCwPAoC+qqVPUT/80TEvSG6YnF5nJABwvuw8wDEm/gP7/Q67qCOUK+8YJhNadj7/SZZXv+hHPHRnULg4Io1eSQkEDr7mOv4F7LIkeaseQFoRC3K67///7v/7QR0JKFxABqDYGw35McCFQP/80TEiSHa6x8fjEECeEWGoBiI/LAY9g7TROASaFItBu2OMhp6elrxPb0pnvZHbdvC1wlygdiB8OEOTiQRjsD40Vj8iHwRGuKgUJY7BEMzyDGMpNsFBMyfCQ9qjyTmjwT/80TEVCIq7sXV2FgBex6dRNa05p1I3HEjekjuj/////xckbKYlb76+K/pnPLbv+f//6/+K/555m9m5H1tVk7fPGIADSXZglW5YYhBJFqAFmzQgMomQcagM8l8DHqpKxn/80TEHhlaMtpeegaYTMXjLY+YHSISMX9SvPki5Qb7vy6d2BmA0SGYpSPpVmMtaUVThloy////+UnmphgyU4350vIxg0DwuCX2DSC/LJURCoRX2FX1AYc9tICc2cH0I0v/80TECxVCMtZeeMScCTMJfcSwQRNWEyVnTDrBLBNCgKGP06eli/fKSggwMiTy4ZrKK6rGT3rtTCVaV67///6FPOcZ+u7KVRLhiRwHhK7/2bzpJMGhZGkAhfbeEyW1gfj/80TECRKRGtpeewYomsy7KXg1WhwMnm+5qCKqTlro1ZialgmPbz9sukJOQmONqTqYlBKWYbFLmoWl7E/8qtwTCxlSTxAbd//tSp72kEqVAAA6h3YyW/AgPYByuZorG8X/80TEERKJHsseeYZoifhJoWSvwS5TLzit0q6vLr0bn/9LnVQBNjpVtG10HhMSljbUKuIp0nv8VUoy4mXXOL//9zCRYWfIqhEUeP/85dbrx7AVuxS2QyQjtxK25qRwnSP/80TEGRHR4vr+SES2C0IYCiuYsXN/ObQNQxLVyym35KMpkI8iIpv//+dwY7AMkvNs3BV3/HL6hti/5aoQADj2+BOmoOTUQO42PuEISKQXbA0I8jxBvyOehEWZoQA41Hn/80TEJBJw9rr8wMR063lb9iHChwRhGk0oHU03XxL/8EAGkm1L1OLW4H//wOHhwDSWJk4AEVxRAZAG60vL0AceVSQv+hRaqWjPL/3uHSKju5i5Vb4r+krn+iw8EAIBwMP/80TELRIZ2rZUygR8mY6knv//7f//64GdlAEOgguAvWn//9qFDIl99SA9rdYVK7aBMwCgDz/JTEPmUl0VgG32YyDCs1nUZqarOk1ajfK8ylaxm+yG//0crVR//6FR2mH/80TENxGp1uJeYMSWUMAntnZbZI//gqmeInUqeiHNdtq7tvwBEpABdMGE4ZrSsMBOSazopLXu8ze1Iu8ZELwjI0PZncdEB2f+XqIFVcMpkwOOJX1HChmJ30csSYpjTJH/80TEQxIBAs5fTxgC8xm9n5UACqqiCSSEogAqkjHDVMz6tQKVP5afiiFk61zDOg5/hyNS1UrCdeiEamUDApfvWilQbRFUkOs/pWeJEV5K0UgH8r4Io1IlIl79zRhlyob/80TETiIR3qmVmngAK+yoJ6fUv1nfzuztoVauVrkcV9ZzWX63v7vv9xnjVw1NG/r3phwVt3fhg+WdUACj7P+hZQuXNH90uiogB22wUDbAK2XNBWpmx0DCZmC/VZM656b/80TEGBHy0vZXzCgDNXeqLil4DE1N/5SiJOjdaopP//////+b089lZVVnpIIE7W////cjPWqIcXF7yO5uEAAL+uQHxLNEqzpIDMSkWDpPd8RuwrH9T7pyyAGYz+WtO9D/80TEIxpK1sL+ygTsi75IEWSZBHUkFMT9p5Iq+oggsMntulWKJcGgENcpVtWn99f+VGlHEnOioSqX/0lIc6IWREa///+0hSiCI7nQiEAFi4g791UAACuGZEDBHMsZcFr/80TEDBTxxr8Swwp0RT+QROGQZBLKxHU4EMPRicjqdu14cd7kwR/ktL/2auZFFNBmweAd3bJoKZEFyv/////0Qx2aMcXYJLPMrIKcCY7/9DDbRRJFUWNqh3dZcJLAKLD/80TECxQpGwMeU8o2yDdyYRrhtLflsugdO3m2ok8bN8Ku7wFGSYMjbe+iHfCQDnso7h4aLqURDDxX//vEQLjwkNF/kyouxYDWj/F1LNi4fL+PcmFSh5l3aTByTjVI/hH/80TEDRVpGwMeeUzyXlerGluQe1mOkDb1nLWTg45PKsCBs0IgATAUAxfRycr9hM6OQXehlbUwQoHmb//8WDASPsc73hMUoAhj/xkIB8wxqi1KGDBJRcdPXl4WOBOThlb/80TEChRyyvp+ewrm5c4azuEVh+46E2eH8uvnezXnzRXCcV76sj5vcXRqitl9X5QGH0k9PQLF///////UjZVf/21Im8l////W0pRzEmKMFEhGEOypQEKHeHdU5T0Gr6//80TECxIJIu8cepMOQkpYHKmD2wca8xKUpNXtUvDhekITp3q2XheaoRg6W5V+vqV6GDuk7rBQXm9mj//XhHdmhgAP1//9jnHHSSpQg7jLu3SoOQU8DJsCjIMr2ZsO2Kj/80TEFRGhGtsceYSQ68ITncHHhMODpAFKCAQPVkAgIFWW7Ps5f6uCN/xSAn//+owfSJ2X7gE+Kf/7ZMYqNqpFqaGZmjgcbw1IhADKlgOACa7F0tDAFUZQOpVIZQmqveH/80TEIRE44u5+akYyy0r8/8gIWIyubewVGf//UeIrYADDhe8Chwm2//+sHSyyJ3/VUACLuotynnLAOR15xCdNWdpoi/K0NQJTY2Q4uVq4Uu1SZN6xi+7zwc1vB04Li7L/80TELxIAoscewYZIp2usPnvqesGpF+lTyTzWIv+iehsGkmEWnQAbld4YSvw2+hi0AtQqQymHHmmf1GUTLquZN01zvkypC8pkN+6IcldcqOgIy0Vk6f+/BzJ+n5TAwQL/80TEOhHx1qZ0wMR0bm2riJ//+yFFg1LZlj0AWBlAIU+agbIBAEoHSyoOjpcXTxOVH5VQ7Lv//o5juq/VUxKGfzIUpgprm+pn+uh0FBgoZ+RSXCoCJTqqbb1hiz+rWtz/80TERRIJhpZ2wwQICsbPKhwBDhnah4WgBcswStgqGXccl/aRnPmghCuIRMRP//x+NPD0TFKNltVtAHAyBR4qcLWtc/Nftft601lMqr/9evH/kqSbng4jkdNhalRiqEf/80TETxI57lgM0FB4MmxlZILB7FIZn4PsUtPYzEc4X586Ot5fO5b5kMyGLJNLENRTJSwNBUlihPFRjP8FXU4luK5ZVerIIxx4DhqRQOXNycJg1LJo0KArGNZt6WUNmVv/80TEWQ7xIjQA2FKURdP37vmnHhO5n+NtSiHgN2NTTuPK1PTMiqdrPf7fXr2p/sR61Qt6hTGswYZuIGRgVMsiJhiCsZdFKFQOWES0tFg7O1lirAXS4+PSVTW25rSAszj/80TEcBBREhwA0Ix4vuzSxigsuho5bnYvfcWr7+jQlQdbY1CJqVJOjm7wXh4rC5kGRItacw2++0QtRFliRC6VqedA0sUHKdExkGXpcZHG3KMDi5gNEGviB6iiTVjSLkr/80TEgRAgLhgAfhIAj65+AXP6YuoghSlAD3sInw5GrWDUOpQLNOj3qcmvO6jQdkEWWElkcwSfPM8RO7LpUYV9ou5ba/3t0Ow4MA1TjyIjVzPKi/hBBCGRpChk58h1znn/80TEkxHYRhQAekYEl6JQOLeTcC4fQByG8H5FUQGjkMJYOFj4fOKlBgqKFhYjECz6WETj3q34vsa267ouZ1oqQCSaAGHrQJQqa5eTQm2Iv7QYal7ibz9C163VKRmakNr/80TEng4wChy2eEYAV1yrjTi5ulhcL1qoWkh6jPb+/pGXVopAuALzbpQHJyrYJQSoio3n1EqXYxyTR+aGbAIZScaOEaErcUHBHovUVRFnA4dXZYIWMyChdFq3gb9+5Yr/80TExg2gshiuaEQcs7dzCL39+nA2rjTv07r7LRZeMAYBqAZ5GnREwxE1UMp0iKBvReEzaGqpNUoh3RyyFS6kZu81n5xW/+hv6Psauo9JxVCm+r8/Qkt6/Cf5mSMu5qv/80TE4g+AshgMaEQco02z73fnqbKExQMBkU0pnJ3RPJZXdpKhGJp8Wudr6TdALD77nROGYyzCdJbqtx6d3v5BirFMosidaU9n46y3X7TlotLe7/rd4vkepdxSc3ppfVf/80TE9xizBgQAwZAdMz3jxXJC7zg9BoyTxddrbTBa2AMKewWQbizLv2+SZHYXzzYqWsS95mfFFAZjxKgk10NQ4C5oQBRR6TNWitppwsoYbAI1yHFdrw4hTVxfoIWjaLj/80TE5xKp5hVUgEodV7gFcDcskKoB8XkUJvQOJBNIh0KqqTZr0GUCZxzDN0EX20y9ogEKEmCV1jCjkRNxkJma0NGFEZFacz6KXaZX/8N0nJmIx1V0V05DzDiQrEMKJOr/80TE7xZ6aggEmNA8RopMuhvU3y5DKkSGf/7nM1UgwIPZnSVFpVYkwAz55IEJkKHvpMCjF0rlZsOtNsAbC18cVavaeAxwnTJPDM2RwKpXPwHopTpcy1bVSNxxxG/qasz/80TE6BG46hgMaEYA0CcaHpcAiR1DmIhsmbOKm4J65SIWeCItTkIW7ywQSDBBPpsqNZM05wfCUOchWEXMLxKzqxzon+3aKD5AZAiraeY9GLUjeqaDZRcskQ73X2cQwqr/80TE9BjzBgy0gEYF0WSu6bfDx6Hu56++oLc3dbmRdRjYyZl2CeLzb3WjX35OPxK+1QF8vpumhdqmdJrqppIGy6KS6tyUmKZxjYUAjrBYklbBV7SQEa4x3OMy5MVMPan/80TE4w94ChmWaMQAUJCy0hxTjXsBBL+dVarrodb+pC0RTjrFMkN1Gg8PJ5v+tRKf49ETcc/31TIeg8ycOT1vU6lxyGqBeJELX20C7OssxLRxhbBKB/GWIwLdafWZvLD/80TE+B27BfwAyYwB2UmlOmyh6hewq4VAjBuAjgKQMHoNV0NkVLLhoa1UnL45yYUCTHKMYKoQBJA3DXq/u3+v/yXNDY8bkuZEoaGZufA1E0mnlQzGQ0QAL5j9OHL6jNb/80TE1BBwshQBTRAAijxzRpjMF5Jf5gxFCKE3MlE0Rb5IDmJj4LQuReoyJr8LXgDgFIhww94dgVYmTySyZJ0hv8A5AxQAcQWKEVBtULDgRYOcVTIxQLyy6c/8tJD2VyD/80TE5SAjIjABjWgBghOMUkSGkKSIufMS6TKy6Xa0TH/8hhULhmkfMFmiKYX4N5uSTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr/80TEtyHqmnj9gZABqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr/80TEggAAA0gBwAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo="} };
function bundledAudioBlob(a){const src=a?.sourceKey&&(window.GMWW_V1_AUDIO?.[a.sourceKey]||gmwwBundledLegacyAudio[a.sourceKey]);if(!src?.base64)return null;try{const raw=atob(src.base64),u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);return new Blob([u8],{type:src.type||'audio/mpeg'})}catch(_){return null}}
async function audioBindingStatus(a,kind=audioKind){
  if(!a)return 'missing';
  const rec=await dbGet(audioBlobKey(kind,a.id)).catch(()=>null);
  if(rec?.blob instanceof Blob&&rec.blob.size>0)return 'local';
  const bundled=a.sourceKey&&(window.GMWW_V1_AUDIO?.[a.sourceKey]?.base64||gmwwBundledLegacyAudio[a.sourceKey]?.base64);
  if(typeof bundled==='string'&&bundled.length>100)return 'bundled';
  if(typeof a.url==='string'&&/^(https?:\/\/|data:audio\/)/i.test(a.url.trim()))return 'remote';
  return 'missing';
}
async function audioHasFile(a,kind=audioKind){return (await audioBindingStatus(a,kind))!=='missing'}

function gmwwAudioHasNameCut(a){return Number.isFinite(Number(a?.roleNameEnd))&&Number(a.roleNameEnd)>Number(a?.roleNameStart||0)}
async function gmwwOpenAudioNameEditor(a){
  if(!a||audioKind!=='cards')return;
  const rec=await dbGet(audioBlobKey('cards',a.id)).catch(()=>null);
  const blob=(rec?.blob instanceof Blob?rec.blob:null)||bundledAudioBlob(a);
  const ownBlob=!!blob,src=blob?URL.createObjectURL(blob):String(a.url||'');
  if(!src){alert('Vai trò '+a.name+' chưa được gắn file Audio. Vui lòng tải file trước khi cắt Tên.');return}
  const overlay=document.createElement('div');overlay.className='gmww-audio-cut-backdrop';
  overlay.innerHTML='<section class="gmww-audio-cut-dialog" role="dialog" aria-modal="true" aria-label="Chọn đoạn tên vai trò">'+
    '<h3>✂ CẮT TÊN: '+esc(a.name)+'</h3><p>Chọn đoạn chỉ đọc tên vai trò, bỏ phần “ơi dậy đi”. Chạm đúp vào ô Tên để chỉnh lại.</p>'+
    '<canvas width="520" height="95" aria-label="Sóng âm thanh"></canvas>'+
    '<div class="gmww-audio-cut-values"><label>Bắt đầu <output id="gmwwNameStartLabel"></output><input type="range" id="gmwwNameStart" min="0" max="30" step="0.05"></label>'+
    '<label>Kết thúc <output id="gmwwNameEndLabel"></output><input type="range" id="gmwwNameEnd" min="0.05" max="30" step="0.05"></label></div>'+
    '<div class="gmww-audio-cut-actions"><button type="button" data-preview>▶ NGHE ĐOẠN TÊN</button><button type="button" data-save>LƯU ĐOẠN TÊN</button><button type="button" data-close>ĐÓNG</button></div>'+
    '</section>';
  document.body.append(overlay);
  const audio=new Audio(src);audio.preload='metadata';
  const $cut=id=>overlay.querySelector('#'+id),from=$cut('gmwwNameStart'),to=$cut('gmwwNameEnd');
  let duration=30;
  const drawSelection=()=>{
    $cut('gmwwNameStartLabel').textContent=Number(from.value).toFixed(2)+'s';
    $cut('gmwwNameEndLabel').textContent=Number(to.value).toFixed(2)+'s';
    const canvas=overlay.querySelector('canvas'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#17475b';ctx.fillRect(0,0,w,h);
    if(canvas._peaks){ctx.fillStyle='#67d4df';canvas._peaks.forEach((v,i)=>ctx.fillRect(i*w/canvas._peaks.length,(1-v)*h/2,Math.max(1,w/canvas._peaks.length),h*v));}
    ctx.fillStyle='rgba(255,213,92,.28)';ctx.fillRect(Number(from.value)/duration*w,0,Math.max(2,(Number(to.value)-Number(from.value))/duration*w),h);
    ctx.strokeStyle='#ffdd78';ctx.lineWidth=2;
    [Number(from.value),Number(to.value)].forEach(v=>{ctx.beginPath();ctx.moveTo(v/duration*w,0);ctx.lineTo(v/duration*w,h);ctx.stroke()});
  };
  const clamp=changed=>{
    if(changed==='start'&&Number(from.value)>=Number(to.value))to.value=Math.min(duration,Number(from.value)+0.05);
    if(changed==='end'&&Number(to.value)<=Number(from.value))from.value=Math.max(0,Number(to.value)-0.05);
    drawSelection();
  };
  from.value=String(Math.max(0,Number(a.roleNameStart)||0));
  to.value=String(Math.max(Number(from.value)+.05,Number(a.roleNameEnd)||5));
  from.addEventListener('input',()=>clamp('start'));to.addEventListener('input',()=>clamp('end'));
  audio.onloadedmetadata=()=>{
    if(Number.isFinite(audio.duration)&&audio.duration>.05)duration=audio.duration;
    from.max=String(duration);to.max=String(duration);
    from.value=String(Math.min(Number(from.value),duration-.05));
    to.value=String(Math.min(Number(to.value),duration));
    drawSelection();
  };
  audio.ontimeupdate=()=>{if(audio.currentTime>=Number(to.value))audio.pause()};
  audio.onerror=()=>{overlay.querySelector('[data-preview]').textContent='⚠ Audio không thể phát';};
  const ac=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(ac){(async()=>{let ctx;try{
    ctx=new ac();
    const bytes=blob?await blob.arrayBuffer():await (await fetch(src,{mode:'cors'})).arrayBuffer();
    const decoded=await ctx.decodeAudioData(bytes),data=decoded.getChannelData(0),count=130,chunk=Math.max(1,Math.floor(data.length/count));
    overlay.querySelector('canvas')._peaks=Array.from({length:count},(_,i)=>{let max=0;for(let j=i*chunk;j<Math.min(data.length,(i+1)*chunk);j+=8)max=Math.max(max,Math.abs(data[j]));return max});
    if(overlay.isConnected)drawSelection();
   }catch(_){ /* Audio remains editable even if remote CORS blocks waveform decoding. */ }
   finally{if(ctx)void ctx.close().catch(()=>{})}
  })();}
  drawSelection();
  const close=()=>{try{audio.pause();audio.removeAttribute('src');audio.load()}catch{}if(ownBlob)URL.revokeObjectURL(src);overlay.remove()};
  overlay.querySelector('[data-close]').onclick=close;
  overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.querySelector('[data-preview]').onclick=()=>{
    try{audio.pause();audio.currentTime=Number(from.value);void audio.play().catch(()=>alert('Không thể phát đoạn tên.'))}catch{alert('Không thể phát đoạn tên.')}
  };
  overlay.querySelector('[data-save]').onclick=()=>{
    if(Number(to.value)<=Number(from.value)){alert('Điểm kết thúc phải sau điểm bắt đầu.');return}
    a.roleNameStart=Number(from.value);a.roleNameEnd=Number(to.value);
    saveState();close();renderAudio();
  };
}
async function renderAudio(){
  const kind=audioKind,list=state.audio[kind]||[];
  const resolved=await Promise.all(list.map(async a=>({a,status:typeof audioBindingStatus==='function'?await audioBindingStatus(a,kind):await audioHasFile(a,kind)?'local':'missing'})));
  if(kind!==audioKind)return; // Ignore late DB reads when user changed tab.
  const sourceStatus=id=>{
    const rows=resolved.filter(({a})=>String(a.targetId||a.id||'')===String(id));
    return rows.some(x=>['local','bundled'].includes(x.status))?'ready':
      rows.some(x=>x.status==='remote')?'remote':'missing';
  };
  const required=kind==='cards'?(state.cards||[]).map(x=>({id:x.id,name:x.name})):
    kind==='artifacts'?(state.artifacts||[]).map(x=>({id:x.id,name:x.name})):
    kind==='actions'?[...(state.actions?.role||[]),...(state.actions?.artifacts||[])]
      .map(x=>({id:x.id,name:x.name})):
    list.map(x=>({id:x.targetId||x.id,name:x.name}));
  const missing=required.filter(item=>sourceStatus(item.id)==='missing');
  const remote=required.filter(item=>sourceStatus(item.id)==='remote');
  const category=kind==='cards'?'Vai trò':kind==='artifacts'?'Artifact':kind==='actions'?'Hành động':'Hệ thống';
  const missingHtml='<div class="gmww-missing-role-audio"><b>Đối chiếu Audio '+category+': '+missing.length+' chưa có nguồn, '+remote.length+' URL chưa thử phát</b>'+
    (missing.length?'<details><summary>File thực còn thiếu ('+missing.length+')</summary><p>'+
      missing.map(item=>esc(item.name)+' ('+esc(item.id)+')').join(' · ')+'</p></details>':'')+
    (remote.length?'<details><summary>URL chưa xác minh ('+remote.length+')</summary><p>'+
      remote.map(item=>esc(item.name)+' ('+esc(item.id)+')').join(' · ')+'</p></details>':'')+
    (!missing.length&&!remote.length?'<p>Tìm thấy file cục bộ hoặc bản kèm ứng dụng cho mọi mục.</p>':'')+
    '<small>Tên file, dấu verifiedBinary và URL chưa được phát thử KHÔNG được tính là file hợp lệ. Nguồn thực phải được thử nghe trên iPhone. URL bên ngoài chưa được kiểm tra.</small></div>';
  // Dedicated SYSTEM audio shortcuts: the verdict's sounds are NOT part of the
  // Gallows controls and must not be saved under Vai Trò or Hành Động.
  const systemSlots=[
    ['audio_system_day_wakeup','LÀNG ƠI DẬY ĐI'],
    ['audio_system_gallows_day_long','NGÀY DÀI RỒI'],
    ['audio_system_gallows_vote_result','CÔNG BỐ PHIẾU'],
    ['audio_system_gallows_result_saved','👍 CHỐT SỐNG'],
    ['audio_system_gallows_result_dead','👎 CHỐT CHẾT']
  ];
  const systemShortcuts=audioKind==='system'?
    '<section class="gmww-system-sound-links" aria-label="Âm thanh Ngày và Lên Giàn">'+
      '<strong>🔊 ÂM THANH NGÀY / LÊN GIÀN</strong>'+
      '<p>Chạm đúng tên để gán file Audio từ máy. SỐNG và CHẾT là hai file riêng biệt.</p>'+
      '<div>'+systemSlots.map(([id,label])=>{
        const linked=resolved.find(x=>String(x.a?.targetId||x.a?.id)===id&&['local','bundled'].includes(x.status));
        const online=resolved.some(x=>String(x.a?.targetId||x.a?.id)===id&&x.status==='remote');
        return '<button type="button" data-system-sound-slot="'+esc(id)+'">'+
          esc(label)+' <small>'+(linked?'✓ CÓ FILE':online?'! URL CHƯA THỬ':'＋ CHƯA GÁN')+'</small></button>';
      }).join('')+'</div></section>':'';
  $('#audioGrid').innerHTML=missingHtml+systemShortcuts+'<button class="audio-add-row" id="addAudioBox" aria-label="Thêm">＋</button>'+
    resolved.map(({a,status})=>{
      const file=String(a.fileName||'').trim(),verified=status==='local'||status==='bundled';
      const evidence=verified?'CÓ FILE THỰC':status==='remote'?'URL CHƯA KIỂM TRA':'THIẾU FILE';
      const meta=(file?file+' • ':'')+evidence;
      const nameBox=audioKind==='cards'?
        '<button type="button" class="audio-name-cut" data-audio-name title="Nhấn đúp để chọn đoạn âm thanh chỉ đọc tên">Tên '+(gmwwAudioHasNameCut(a)?Number(a.roleNameStart||0).toFixed(1)+'–'+Number(a.roleNameEnd).toFixed(1)+'s':'· Chưa cắt')+'</button>':'';
      return '<article class="audio-row" data-audio-id="'+esc(a.id)+'"><div class="audio-row-main"><b>'+esc(a.name)+'</b><small>'+esc(meta)+'</small>'+nameBox+'</div><div class="audio-row-actions"><button data-audio-play title="Phát">▶</button><button class="replace-audio" data-audio-replace title="Thay thế">Thay thế</button><button class="delete-audio" data-audio-delete title="Xoá">🗑</button></div></article>';
    }).join('');
  $('#addAudioBox').onclick=()=>{const name=prompt('Tên Âm Thanh');if(!String(name||'').trim())return;list.unshift({id:uid('audio'),name:String(name).trim(),fileName:'',verifiedBinary:false});saveState();renderAudio()};
  $$('[data-audio-id]').forEach(row=>{
    const a=list.find(x=>String(x.id)===String(row.dataset.audioId));
    $('[data-audio-play]',row).onclick=()=>playAudioItem(a);
    $('[data-audio-replace]',row).onclick=()=>replaceAudioItem(a);
    $('[data-audio-delete]',row).onclick=()=>deleteAudioItem(a);
    const button=$('[data-audio-name]',row);
    if(button){
      let lastTap=0;button.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();lastTap=0;void gmwwOpenAudioNameEditor(a)});
      button.addEventListener('click',()=>{const now=Date.now();if(now-lastTap<400){lastTap=0;void gmwwOpenAudioNameEditor(a)}else lastTap=now});
    }
  });
  $$('[data-system-sound-slot]').forEach(button=>button.onclick=()=>{
    const id=String(button.dataset.systemSoundSlot||'');
    const item=(state.audio.system||[]).find(x=>String(x.targetId||x.id)===id);
    if(item)replaceAudioItem(item,'system');
    else playFlashError('Chưa tìm được ô Audio Hệ Thống '+id);
  });
}
async function playAudioItem(a){
  if(!a)return;
  const kind=audioKind;
  const rec=await dbGet(audioBlobKey(kind,a.id)).catch(()=>null);
  const blob=(rec?.blob instanceof Blob&&rec.blob.size?rec.blob:null)||bundledAudioBlob(a);
  const localUrl=!!blob,src=blob?URL.createObjectURL(blob):String(a.url||'');
  if(!src){alert('Audio chưa có file thực. Hãy gán file vào đúng mục.');return}
  const au=new Audio(src);au.preload='auto';
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;if(localUrl)URL.revokeObjectURL(src)};
  au.onended=cleanup;
  au.onerror=()=>{cleanup();alert('File đã gán không phát được. Cần thay đúng file Audio.')};
  try{await au.play()}catch(e){cleanup();alert('Không phát được file Audio này. Kiểm tra quyền phát trên iPhone và file gốc.')}
}
function replaceAudioItem(a,category=audioKind){
  if(!a)return;
  // Freeze the category while iOS Files picker is open. The old global audioKind
  // could change before onchange, silently saving CHỐT SỐNG into a wrong tab.
  const kind=String(category||'system');
  const i=document.createElement('input');i.type='file';i.accept='audio/*';i.hidden=true;
  document.body.appendChild(i);
  i.onchange=async()=>{
    const file=i.files?.[0];i.remove();if(!file)return;
    try{
      await dbPut(audioBlobKey(kind,a.id),file);
      battleInvalidateAudioCache(kind,a.id);
      a.fileName=file.name;a.verifiedBinary=true;delete a.status;saveState();
      if(document.getElementById('library')?.classList.contains('active')&&audioKind===kind)void renderAudio();
      const names={audio_system_gallows_result_saved:'CHỐT SỐNG',audio_system_gallows_result_dead:'CHỐT CHẾT'};
      if(names[a.targetId||a.id])playFlashError('Đã gán Audio '+names[a.targetId||a.id]+': '+file.name);
    }catch(err){playFlashError('Không lưu được Audio: '+String(err.message||err))}
  };
  i.click()
}
async function deleteAudioItem(a){if(!a||!confirm('Xoá Âm Thanh "'+(a.name||'')+'"?'))return;const list=state.audio[audioKind]||[],i=list.findIndex(x=>String(x.id)===String(a.id));if(i>=0)list.splice(i,1);await dbDelete(audioBlobKey(audioKind,a.id)).catch(()=>{});battleInvalidateAudioCache(audioKind,a.id);saveState();renderAudio()}

function bindCore(){
  $$('.nav').forEach(n=>n.onclick=()=>{$$('.page').forEach(p=>p.classList.toggle('active',p.id===n.dataset.page));$$('.nav').forEach(x=>x.classList.toggle('active',x===n));const p=$('#'+n.dataset.page);if(p)p.scrollTop=0});
  $$('.libtab').forEach(b=>b.onclick=()=>{$$('.libtab').forEach(x=>x.classList.toggle('active',x===b));$$('.libpane').forEach(p=>p.classList.toggle('active',p.id==='lib-'+b.dataset.lib));$('#library').scrollTop=0;if(b.dataset.lib==='themes')renderTheme();if(b.dataset.lib==='audio')renderAudio();if(b.dataset.lib==='templates')loadPlayGameTemplates()});
  $$('[data-filter-kind]').forEach(row=>$$('.filter',row).forEach(b=>b.onclick=()=>{$$('.filter',row).forEach(x=>x.classList.toggle('active',x===b));if(row.dataset.filterKind==='cards')cardFilter=b.dataset.filter;else artifactFilter=b.dataset.filter;renderEntityGrid(row.dataset.filterKind)}));
  const addGameTemplateBtn=$('#addGameTemplate');if(addGameTemplateBtn)addGameTemplateBtn.onclick=()=>openLibraryGameTemplate('');const exportLocalBtn=$('#exportLocalData');if(exportLocalBtn)exportLocalBtn.onclick=()=>exportLocalGameData();
  const topBack=$('#topBackEntity');if(topBack)topBack.onclick=closeEntityEditor;$('#backEntity').onclick=closeEntityEditor;$('#saveEntity').onclick=saveEntity;$('#hideEntity').onclick=toggleCurrentEntityHidden;$('#deleteEntity').onclick=deleteEntity;
  $$('.face-switch button').forEach(b=>b.onclick=()=>setFace(b.dataset.face));
  $('#entityName').oninput=()=>{if(editDraft){editDraft.name=$('#entityName').value;renderEntityFront()}};
  $('#entityInformation').oninput=()=>{if(editDraft){editDraft.information=$('#entityInformation').value;renderEntityFront()}};
  $('#entityLives').oninput=()=>{if(editDraft)editDraft.lives=Math.max(1,Number($('#entityLives').value||1))};
  $$('#factionSeg button').forEach(b=>b.onclick=()=>{if(!editDraft||currentKind!=='cards')return;editDraft.factionId=b.dataset.faction;renderEntityBack();renderEntityFront()});
  const flagMap={flagUseDay:'useDay',flagUseNight:'useNight',flagNightImmune:'nightImmune',flagAllowMultipleActions:'allowMultipleActions',flagPassive:'passive',flagSoloWolfOnly:'soloWolfOnly'};
  for(const [id,k] of Object.entries(flagMap))$('#'+id).onchange=()=>{if(editDraft)editDraft.flags[k]=$('#'+id).checked};
  $('#winCondition').oninput=()=>{if(editDraft)editDraft.winCondition=$('#winCondition').value};
  $('#passiveRuleEnabled').onchange=()=>{if(editDraft)editDraft.passiveRule.enabled=$('#passiveRuleEnabled').checked};$('#passiveRuleType').onchange=()=>{if(editDraft)editDraft.passiveRule.type=$('#passiveRuleType').value};
  $('#passiveFirstTime').onchange=()=>{if(editDraft)editDraft.passiveRule.firstTime=$('#passiveFirstTime').value};$('#passiveNextTime').onchange=()=>{if(editDraft)editDraft.passiveRule.nextTime=$('#passiveNextTime').value};$('#passiveOnDeath').onchange=()=>{if(editDraft)editDraft.passiveRule.onDeath=$('#passiveOnDeath').checked};$('#passiveSkipDead').onchange=()=>{if(editDraft)editDraft.passiveRule.skipIfTargetAlreadyDead=$('#passiveSkipDead').checked};
  $('#groupGateEnabled').onchange=()=>{if(editDraft)editDraft.groupActionGate.enabled=$('#groupGateEnabled').checked};$('#groupGateAction').onchange=()=>{if(editDraft)editDraft.groupActionGate.actionId=$('#groupGateAction').value};$('#groupGateScope').onchange=()=>{if(editDraft)editDraft.groupActionGate.scope=$('#groupGateScope').value};
  for(const id of ['gateExpelled','gateBlocked'])$('#'+id).onchange=()=>{if(!editDraft)return;const arr=[];if($('#gateExpelled').checked)arr.push('expelled');if($('#gateBlocked').checked)arr.push('blocked');editDraft.groupActionGate.blockOn=arr};
  const specialMap={ruleSystemRequired:'systemRequired',ruleUsesPackBite:'usesPackBite',ruleRequiresSoloWolf:'requiresNoOtherLivingWolf',ruleActorMayBeDead:'actorMayBeDead',ruleAllowFriendlyFaction:'allowFriendlyFaction',ruleReplacesWolfBite:'replacesWolfBite'};for(const [id,k] of Object.entries(specialMap))$('#'+id).onchange=()=>{if(editDraft)editDraft.specialRules[k]=$('#'+id).checked};
  $('#specialLimits').oninput=()=>{if(editDraft)editDraft.limits=$('#specialLimits').value};$('#specialConditions').oninput=()=>{if(editDraft)editDraft.conditions=$('#specialConditions').value};$('#specialAttributes').oninput=()=>{if(editDraft)editDraft.attributes=$('#specialAttributes').value};
  for(const [id,k] of [['artifactOwnerSelection','ownerSelection'],['artifactPersistentOwner','persistentOwner'],['artifactRevealFollow','revealFollowTargetOnly'],['artifactPriorityFirst','priorityFirst']])$('#'+id).onchange=()=>{if(editDraft?.artifact)editDraft.artifact[k]=$('#'+id).checked};
  $('#artifactWakeRole').onchange=()=>{if(editDraft?.artifact)editDraft.artifact.wakeWithRoleId=$('#artifactWakeRole').value};$('#artifactWakeAction').onchange=()=>{if(editDraft?.artifact)editDraft.artifact.wakeWithActionId=$('#artifactWakeAction').value};
  $('#addFunction').onclick=()=>{if(!editDraft)return;const list=actionList(currentKind==='artifacts'?'artifacts':'role'),a=list[0];editDraft.functions.push({id:uid('fn'),actionId:a?.id||'',phase:'night',usageMode:'unlimited',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,description:'',systemRequired:false,usesPackBite:false,requiresNoOtherLivingWolf:false,actorMayBeDead:false,allowFriendlyFaction:false,replacesWolfBite:false,effectIds:[]});renderEntityBack()};
  $$('#actionKindSeg button').forEach(b=>b.onclick=()=>{$$('#actionKindSeg button').forEach(x=>x.classList.toggle('active',x===b));actionKind=b.dataset.actionKind;renderActions()});$('#actionSearch').oninput=renderActions;$('#effectSearch').oninput=renderEffects;
  $('#sheetClose').onclick=closeSheet;$('#sheetCancel').onclick=closeSheet;$('#sheetSave').onclick=saveSheet;$('#editSheet').onclick=e=>{if(e.target===$('#editSheet'))closeSheet()};
  $('#addTheme').onclick=addTheme;
  $$('#audioKindSeg button').forEach(b=>b.onclick=()=>{$$('#audioKindSeg button').forEach(x=>x.classList.toggle('active',x===b));audioKind=b.dataset.audioKind;renderAudio()});
}
async function seedBundledV1Audio(){try{const a=window.GMWW_V1_AUDIO?.['ROLE:source-18'];if(!a?.base64)return;const key=audioBlobKey('cards','audio_role_old_witch'),stamp='V1.08|ROLE:source-18|'+a.base64.length;if(localStorage.getItem('GMWW_V1_AUDIO_SEED_SOURCE18')===stamp&&await dbGet(key))return;const raw=atob(a.base64),u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);await dbPut(key,new Blob([u8],{type:a.type||'audio/mpeg'}));localStorage.setItem('GMWW_V1_AUDIO_SEED_SOURCE18',stamp)}catch(e){console.warn('V1 audio seed failed',e)}}
async function boot(){try{await migrateLegacyV1Assets()}catch(e){console.warn('V1 settings migration failed',e)}bindCore();bindFaceSwipe();renderEntityGrid('cards');renderEntityGrid('artifacts');renderActions();renderEffects();renderAudio();try{await ensureDefaultThumb()}catch(e){console.warn('Default artwork init failed',e)}try{await renderTheme()}catch(e){console.warn('Theme render failed',e)}try{await applyActiveThemeUi()}catch(e){console.warn('Theme apply failed',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

/* V2.76 — discrete actor-only character scale; UI geometry stays fixed */
const CHARACTER_SCALE_OPTIONS=[75,100,125,150,175,200];
function normalizeCharacterScale(value,fallback=100){
  const n=Number(value);if(!Number.isFinite(n))return fallback;
  return CHARACTER_SCALE_OPTIONS.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,CHARACTER_SCALE_OPTIONS[0])
}
function applyCharacterScale(value){
  const n=normalizeCharacterScale(value,100),root=document.documentElement;
  root?.style?.setProperty('--gmww-background-dim','0');
  root?.style?.setProperty('--gmww-character-scale',String(n/100));
  document.querySelectorAll('[data-character-scale]').forEach(btn=>{
    const active=Number(btn.dataset.characterScale)===n;
    btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',active?'true':'false')
  });
  const out=document.getElementById('characterScaleValue');if(out)out.textContent=n+'%';
  return n
}
async function saveCharacterScale(value){
  const n=applyCharacterScale(value);
  try{
    const res=await fetch(GMWW_SERVER_BASE+'/api/gm/ui-settings',{method:'PUT',headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},body:JSON.stringify({characterScale:n}),cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
  }catch(err){console.warn('GMWW_CHARACTER_SCALE_SAVE',err)}
}
async function initCharacterScaleSetting(){
  const choices=document.getElementById('characterScaleChoices');if(!choices)return;
  let n=100;
  try{const res=await fetch(GMWW_SERVER_BASE+'/api/ui-settings?ts='+Date.now(),{cache:'no-store'}),d=await res.json();if(res.ok&&Number.isFinite(Number(d?.characterScale)))n=Number(d.characterScale)}catch(err){console.warn('GMWW_CHARACTER_SCALE_LOAD',err)}
  applyCharacterScale(n);
  choices.addEventListener('click',event=>{const btn=event.target.closest('[data-character-scale]');if(btn)saveCharacterScale(btn.dataset.characterScale)});
}
setTimeout(initCharacterScaleSetting,0);

/* GMWW V3.247: device-local icon size uses the same six Character steps. */
const ACTION_ICON_SCALE_STORAGE_KEY='GMWW_GM_ACTION_ICON_SCALE_V1';
const ACTION_ICON_SCALE_OPTIONS=[25,50,75,100,125,150];
function normalizeActionIconScale(value){
 const n=Number(value);if(!Number.isFinite(n))return 100;
 return ACTION_ICON_SCALE_OPTIONS.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,100);
}
function applyActionIconScale(value){
 const n=normalizeActionIconScale(value);
 document.documentElement?.style?.setProperty('--gmww-action-icon-scale',String(n/100));
 document.querySelectorAll('[data-action-icon-scale]').forEach(btn=>{
  const active=Number(btn.dataset.actionIconScale)===n;
  btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
 });
 const label=document.getElementById('actionIconScaleValue');if(label)label.textContent=n+'%';
 const dock=document.getElementById('battleFireIconDock');if(dock)delete dock.dataset.sig;
 return n;
}
async function saveActionIconScale(value){
 const n=applyActionIconScale(value);
 try{localStorage.setItem(ACTION_ICON_SCALE_STORAGE_KEY,String(n))}
 catch(err){console.warn('GMWW_ICON_SCALE_SAVE',err)}
 try{
  const response=await fetch(GMWW_SERVER_BASE+'/api/gm/ui-settings',{
   method:'PUT',headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},
   body:JSON.stringify({actionIconScale:n}),cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
 }catch(err){console.warn('GMWW_ICON_SCALE_SYNC',err)}
}
function initActionIconScaleSetting(){
 const choices=document.getElementById('actionIconScaleChoices');if(!choices)return;
 let n=100;
 try{const v=localStorage.getItem(ACTION_ICON_SCALE_STORAGE_KEY);if(v!==null)n=normalizeActionIconScale(v)}
 catch(err){console.warn('GMWW_ICON_SCALE_LOAD',err)}
 applyActionIconScale(n);
 choices.addEventListener('click',event=>{
  const btn=event.target.closest('[data-action-icon-scale]');
  if(btn)saveActionIconScale(btn.dataset.actionIconScale);
 });
}
setTimeout(initActionIconScaleSetting,0);


/* V2.22 — Server Health in Cài Đặt */
const GMWW_SERVER_BASE='https://gmww-v2-00.williampham0702.workers.dev';
const GMWW_GM_AUTH="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";
setTimeout(initVillageSceneManager,0);
let gmwwGmPresenceTimer=null,gmwwGmPresenceState=null;
async function gmwwSendGmPresence(online=true){
  try{
    const res=await fetch(GMWW_SERVER_BASE+'/api/gm/presence',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},body:JSON.stringify({online:online!==false,roomCode:online!==false&&isLivePlayRoom()?String(playSceneState.roomCode||''):null}),cache:'no-store',keepalive:true}),d=await res.json();if(res.ok){
      gmwwGmPresenceState=d?.gm||null;
      const generation=Math.max(0,Number(d?.lobbyGeneration||0));
      if(generation>Number(playSceneState.lobbyGeneration||0)&&!playSceneRuntime.busy){
        const mustReturn=isLivePlayRoom()||playSceneState.step!=='lobby';
        playApplyLobbyStage(generation);
        if(mustReturn)gmwwSendGmPresence(true);
      }
      if(typeof renderPlayPlayers==='function'&&document.getElementById('playPlayerRing'))renderPlayPlayers();
    }
  }catch(_){}
}
function gmwwStartGmPresence(){
  gmwwSendGmPresence(true);
  if(gmwwGmPresenceTimer)clearInterval(gmwwGmPresenceTimer);
  gmwwGmPresenceTimer=setInterval(()=>{if(document.visibilityState!=='hidden')gmwwSendGmPresence(true)},20000);
}
setTimeout(gmwwStartGmPresence,0);
window.addEventListener('pagehide',()=>{gmwwSendGmPresence(false)});

/* UPDATE MANAGER V1 — prepared off-main */
let gmwwUpdateManifest=null,gmwwUpdateBusy=false,gmwwUpdateSlowTimer=null;

/* Chỉ hiển thị phần trăm đã xác nhận; iOS cũ không trả tiến độ theo byte. */
function gmwwSetUpdateProgress(status='idle',percent=null,label=''){
  const root=document.getElementById('updateProgress'),fill=document.getElementById('updateProgressFill'),
        value=document.getElementById('updateProgressPercent'),title=document.getElementById('updateProgressTitle');
  if(!root)return;
  const valid=typeof percent==='number'&&Number.isFinite(percent);
  const n=valid?Math.max(0,Math.min(100,Math.round(percent))):null;
  root.dataset.state=status;
  if(valid){root.setAttribute('aria-valuenow',String(n));root.removeAttribute('aria-valuetext')}
  else{root.removeAttribute('aria-valuenow');root.setAttribute('aria-valuetext','Đang tải, chưa có dữ liệu phần trăm thực tế')}
  if(fill)fill.style.width=valid?n+'%':'0%';
  if(value)value.textContent=valid?n+'%':'—';
  if(title)title.textContent=label||({idle:'Chưa bắt đầu',running:'Đang thực hiện…',done:'Đã hoàn tất',error:'Có lỗi khi thực hiện'}[status]||'');
}
const gmwwRuntimeVersion=()=>String(VERSION||'').replace(/^V/i,'');
const gmwwShellVersion=()=>String(window.GMWW_NATIVE_SHELL_VERSION||VERSION||'').replace(/^V/i,'');
function gmwwVersionParts(v){return String(v||'').replace(/^V/i,'').split('.').map(x=>Math.max(0,Number.parseInt(x,10)||0))}
function gmwwVersionCompare(a,b){const aa=gmwwVersionParts(a),bb=gmwwVersionParts(b),n=Math.max(aa.length,bb.length);for(let i=0;i<n;i++){const d=(aa[i]||0)-(bb[i]||0);if(d)return d>0?1:-1}return 0}
function gmwwNativePost(action,payload={}){
  try{const h=window.webkit?.messageHandlers?.gmwwUpdater;if(!h)return false;h.postMessage({action,...payload});return true}catch(e){console.warn('GMWW_NATIVE_UPDATE_BRIDGE',e);return false}
}
function setUpdateUi(kind,status,message,detail=''){
  const dot=document.getElementById('updateDot'),pill=document.getElementById('updateStatus'),msg=document.getElementById('updateMessage'),det=document.getElementById('updateDetail');
  if(dot)dot.className='update-dot '+kind;
  if(pill){pill.className='update-pill '+kind;pill.textContent=status}
  if(msg)msg.textContent=message||'';
  if(det){const repeated=/^(?:Bản cập nhật|Có gì mới)\s*:/.test(String(detail||''));det.textContent=repeated?'':detail||'';det.hidden=repeated||!detail;}
  const put=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  put('updateShellVersion','V'+gmwwShellVersion());
  put('updateRuntimeVersion','V'+gmwwRuntimeVersion());
}
function setUpdateAction(kind,context={}){
  const runtime=document.getElementById('installRuntimeUpdate'),ipa=document.getElementById('downloadNewIPA'),web=document.getElementById('syncPlayerWebUpdate');
  const title=document.getElementById('updateDecisionTitle'),hint=document.getElementById('updateDecisionHint');
  const buttons=[runtime,ipa,web];buttons.forEach(x=>{if(!x)return;x.classList.remove('recommended');x.disabled=false;x.removeAttribute('aria-disabled')});
  const enable=x=>{if(!x)return;x.disabled=false;x.removeAttribute('aria-disabled');x.classList.add('recommended')};
  const shell=String(context.shell||gmwwShellVersion()),runtimeV=String(context.runtime||gmwwRuntimeVersion()),latest=String(context.latest||runtimeV),ipaV=String(context.ipaVersion||'').replace(/^V/i,'');
  if(kind==='runtime'){enable(runtime);if(title)title.textContent='Cần cập nhật Runtime lên V'+latest;if(hint)hint.textContent='Nhấn TỰ ĐỘNG. Không cần tải IPA mới.'}
  else if(kind==='native'){enable(ipa);if(title)title.textContent='Bắt buộc cài IPA V'+latest;if(hint)hint.textContent='Nhấn TẢI IPA. Cập nhật Runtime không thay thế được phiên bản ứng dụng này.'}
  else if(kind==='server_only'){enable(web);if(title)title.textContent='Chỉ Player Web/Server cần đồng bộ';if(hint)hint.textContent='Ứng dụng GM không cần cập nhật hoặc tải IPA.'}
  else if(kind==='compatible'){if(title)title.textContent='GMWW đang ở phiên bản mới nhất.';if(hint)hint.textContent='Không cần làm gì • Ứng dụng V'+shell+' vẫn tương thích với Runtime/Server V'+runtimeV+'.'}
  else if(kind==='restart'){if(title)title.textContent='Chỉ cần khởi động lại ứng dụng';if(hint)hint.textContent='IPA V'+shell+' đã có sẵn; không tải lại IPA.'}
  else if(kind==='pending'){if(title)title.textContent='Server đang phát hành bản cập nhật.';if(hint)hint.textContent='Chưa có gói Runtime sẵn sàng. Không cần nhấn Cập nhật lúc này.'}
  else if(kind==='unverified'){if(title)title.textContent='Chưa xác minh được phiên bản mới nhất.';if(hint)hint.textContent='Không kết luận đã cập nhật xong khi Server hoặc gói cập nhật chưa phản hồi. Nhấn ↻ để kiểm tra lại.'}
  else {if(title)title.textContent='GMWW đang ở phiên bản mới nhất.';if(hint)hint.textContent='Không cần làm gì • Hệ thống đang ở trạng thái phù hợp.'}
}
function installManualRuntimeUpdate(){
  if(gmwwUpdateBusy)return false;
  if(!window.GMWW_NATIVE_MANUAL_RUNTIME){
    setUpdateUi('warn','CẦN NÂNG IPA','Cập nhật thủ công cần IPA hỗ trợ chọn file.','Cài IPA có tính năng Thủ Công một lần, sau đó chọn file .gmwwupdate trong Tệp.');
    return false;
  }
  gmwwUpdateBusy=true;
  if(!gmwwNativePost('pickRuntimePackage')){gmwwUpdateBusy=false;return false}
  gmwwSetUpdateProgress('running',null,'Chọn file cập nhật trong Tệp');
  return true;
}
async function installRuntimeUpdate(){
  if(gmwwUpdateBusy||!gmwwUpdateManifest)return false;
  const files=gmwwUpdateManifest?.runtime?.files;
  if(!Array.isArray(files)||!files.length){setUpdateUi('warn','KHÔNG CÓ GÓI DỮ LIỆU','Không có gói Runtime cần cài.','Nếu cần bản ứng dụng mới, chọn TẢI FILE IPA.');return false}
  gmwwUpdateBusy=true;gmwwSetUpdateProgress('running',null,'Đang tải Runtime • chờ dữ liệu thực tế');setUpdateUi('checking','ĐANG CẬP NHẬT','Đang tải và kiểm tra dữ liệu phiên bản mới…','Không tắt ứng dụng trong lúc cập nhật.');
  // IPA V3.110 provides no byte-progress events; advisory only. Never
  // fabricate percent complete or cancel a still-valid native transfer.
  if(gmwwUpdateSlowTimer)clearTimeout(gmwwUpdateSlowTimer);
  gmwwUpdateSlowTimer=setTimeout(()=>{
    gmwwUpdateSlowTimer=null;
    if(!gmwwUpdateBusy)return;
    gmwwSetUpdateProgress('running',null,'Đang tải chậm • chờ iOS xác minh SHA-256');
    setUpdateUi('warn','ĐANG TẢI CHẬM','iOS chưa trả kết quả tải Runtime.','Giữ ứng dụng mở và chờ kết quả; Runtime cũ và dữ liệu game chưa bị thay đổi.');
  },45000);
  if(!gmwwNativePost('installRuntime',{manifest:gmwwUpdateManifest})){
    gmwwUpdateBusy=false;if(gmwwUpdateSlowTimer)clearTimeout(gmwwUpdateSlowTimer);gmwwUpdateSlowTimer=null;gmwwSetUpdateProgress('error',null,'Ứng dụng chưa hỗ trợ cập nhật');setUpdateUi('bad','KHÔNG HỖ TRỢ','Bản ứng dụng hiện tại chưa có Update Manager.','Chọn TẢI FILE IPA để cài bản có Update Manager.');return false
  }
  return true
}
function downloadUpdateIPA(){
  const manifestIpa=gmwwUpdateManifest?.ipa||{},version=String(manifestIpa.version||'').replace(/^V/i,''),url=String(manifestIpa.url||'').trim(),fileName=String(manifestIpa.fileName||'').trim();
  if(!version||!url||!fileName){
    setUpdateUi('warn','CHƯA CÓ IPA','Server chưa công bố file IPA mới để tải.','Không tải lại IPA cũ trong máy.');
    return false;
  }
  gmwwSetUpdateProgress('running',null,'Đang tải IPA • chờ dữ liệu thực tế');
  setUpdateUi('checking','ĐANG TẢI IPA','Đang tải IPA V'+version,'');
  if(!gmwwNativePost('downloadIPA',{url,fileName,version}))window.location.assign(url);
  return true;
}
let gmwwGithubInstallRequested=false;
let gmwwGithubNotifyRequested=false;
async function updateDataNow(){
  const btn=document.getElementById('installRuntimeUpdate');if(btn)btn.disabled=true;
  try{
    gmwwGithubInstallRequested=Boolean(window.GMWW_NATIVE_GITHUB_OTA);
    const d=await checkAppUpdate({notify:false});if(!d)return;
    gmwwGithubInstallRequested=false;
    const latest=String(d.releaseVersion||d.runtimeVersion||d.serverVersion||'').replace(/^V/i,''),type=String(d.releaseType||'server_only').toLowerCase(),newer=gmwwVersionCompare(latest,gmwwRuntimeVersion())>0;
    if(newer&&type==='runtime'){await installRuntimeUpdate();return}
    if(newer&&type==='native'){setUpdateAction('native',{latest});setUpdateUi('warn','CẦN FILE IPA','Phiên bản V'+latest+' cần cài ứng dụng mới.','Chọn TẢI FILE IPA.');return}
    gmwwSetUpdateProgress('running',0,'Đang cập nhật dữ liệu thành viên và máy chủ');
    memberAdminState.loaded=false;await loadMembers(true);await checkServerHealth();
    gmwwSetUpdateProgress('done',100,'Dữ liệu đã cập nhật');
    setUpdateUi('ok','DỮ LIỆU ĐÃ CẬP NHẬT','Dữ liệu Server hiện tại đã được tải lại.','Không cần cài lại IPA.');
  }catch(e){console.warn('GMWW_UPDATE_DATA',e);gmwwSetUpdateProgress('error',null,'Không thể cập nhật dữ liệu');setUpdateUi('bad','CẬP NHẬT LỖI','Không cập nhật được dữ liệu.',String(e?.message||'Vui lòng thử lại.'))}
  finally{if(btn&&!gmwwUpdateBusy)btn.disabled=false}
}
async function syncPlayerWebUpdate(){
  const btn=document.getElementById('syncPlayerWebUpdate');if(btn)btn.disabled=true;
  gmwwSetUpdateProgress('running',0,'Đang gửi yêu cầu đồng bộ Web');
  setUpdateUi('checking','ĐANG ĐỒNG BỘ','Đang gửi tín hiệu đồng bộ tới Player Web…','');
  try{
    const stamp=Date.now();
    const res=await fetch(GMWW_SERVER_BASE+'/api/gm/web-sync?ts='+stamp,{
      method:'POST',
      headers:{'content-type':'application/json',Authorization:'Bearer '+GMWW_GM_AUTH},
      body:JSON.stringify({source:'GM_APP',runtimeVersion:gmwwRuntimeVersion()}),
      cache:'no-store'
    });
    let d={};try{d=await res.json()}catch{}
    if(!res.ok||d.ok!==true)throw new Error(d.message||d.error||('HTTP '+res.status));
    const webVersion=String(d.webVersion||d.version||'').replace(/^V/i,'');
    const serverEl=document.getElementById('updateServerVersion');if(serverEl&&webVersion)serverEl.textContent='V'+webVersion;
    gmwwSetUpdateProgress('done',100,'Máy chủ đã xác nhận đồng bộ Web');
    setUpdateAction('none');setUpdateUi('ok','WEB ĐÃ ĐỒNG BỘ','Player Web đã nhận tín hiệu đồng bộ V'+(webVersion||'—')+'.','Người chơi đang mở web cũ sẽ được yêu cầu tải lại trang.');
  }catch(e){console.warn('GMWW_SYNC_PLAYER_WEB',e);gmwwSetUpdateProgress('error',null,'Đồng bộ Web không thành công');setUpdateUi('bad','ĐỒNG BỘ LỖI','Không đồng bộ được Player Web.',String(e?.message||'Vui lòng thử lại.'))}
  finally{if(btn)btn.disabled=false}
}
/* Validate both release metadata and Worker health before claiming "latest". */
let gmwwUpdateCheckSerial=0;
async function gmwwUpdateProbe(path){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
    try{
      const res=await fetch(GMWW_SERVER_BASE+path,{method:'GET',cache:'no-store',signal:controller.signal});
      let body=null;try{body=await res.json()}catch{}
      if(!res.ok||!body||body.ok!==true){
        const error=new Error(String(body?.error||body?.message||('HTTP '+res.status)));
        error.code=String(body?.error||'');error.status=res.status;
        throw error;
      }
      return body;
    }catch(error){lastError=error}
    finally{clearTimeout(timer)}
    if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350));
  }
  throw lastError||new Error('Không nhận được phản hồi');
}
function gmwwVersionVerified(v){return /^\d+\.\d+(?:\.\d+)?$/.test(String(v||'').replace(/^V/i,''))}
function gmwwReleaseNotesList(manifest){
  const notes=Array.isArray(manifest?.releaseNotes)
    ?manifest.releaseNotes.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean):[];
  const current=gmwwRuntimeVersion(), latest=String(manifest?.releaseVersion||manifest?.runtimeVersion||'').replace(/^V/i,'');
  if(!latest)return ['Chưa có thông tin phiên bản.'];
  if(gmwwVersionCompare(latest,current)<=0)return notes.length?notes.slice(0,6):['Phiên bản V'+latest+' đang sử dụng; chưa có ghi chú cập nhật.'];
  const previous=String(manifest?.previousVersion||manifest?.fromVersion||'').replace(/^V/i,'');
  if(previous&&gmwwVersionCompare(previous,current)!==0)return ['Phiên bản V'+latest+' có bản cập nhật mới. Chưa có ghi chú riêng cho bước nâng cấp từ V'+current+'.'];
  return notes.length?notes.slice(0,6):['Có bản cập nhật V'+latest+'. Chưa có ghi chú thay đổi riêng cho phiên bản này.'];
}
function gmwwReleaseNotesText(manifest){return gmwwReleaseNotesList(manifest).join(' • ')}
function gmwwRenderReleaseNotes(manifest){
  const box=document.getElementById('updateReleaseNotes');if(!box)return;
  const title=document.createElement('b');title.className='update-release-title';title.textContent='Có gì mới';
  const list=document.createElement('ul');list.className='update-release-list';
  for(const note of gmwwReleaseNotesList(manifest)){
    const item=document.createElement('li');item.textContent=note;list.appendChild(item);
  }
  box.replaceChildren(title,list);
}
async function checkAppUpdate({notify=false,skipGithub=false}={}){
  if(!skipGithub&&window.GMWW_NATIVE_GITHUB_OTA){
    if(gmwwUpdateBusy)return null;
    gmwwUpdateBusy=true;gmwwGithubNotifyRequested=notify;
    setUpdateAction("unverified");
    setUpdateUi("checking","GITHUB OTA","Đang kiểm tra bản Runtime trên GitHub…","Cloudflare là kênh dự phòng.");
    if(gmwwNativePost("checkGithubRuntime"))return null;
    gmwwUpdateBusy=false;gmwwGithubInstallRequested=false;
  }
  if(gmwwUpdateBusy)return null;
  const serial=++gmwwUpdateCheckSerial,retry=document.getElementById('retryUpdateCheck'),serverEl=document.getElementById('updateServerVersion');
  if(retry){retry.disabled=true;retry.setAttribute('aria-busy','true')}
  if(serverEl)serverEl.textContent='V—';
  setUpdateAction('unverified');
  setUpdateUi('checking','ĐANG KIỂM TRA','Đang đối chiếu Server và gói cập nhật…','');
  try{
    const stamp=Date.now(),[manifestResult,healthResult]=await Promise.allSettled([
      gmwwUpdateProbe('/api/update/manifest?current='+encodeURIComponent(gmwwRuntimeVersion())+'&ts='+stamp),
      gmwwUpdateProbe('/api/health?update='+stamp)
    ]);
    if(serial!==gmwwUpdateCheckSerial)return null;
    const manifest=manifestResult.status==='fulfilled'?manifestResult.value:null;
    const health=healthResult.status==='fulfilled'?healthResult.value:null;
    const server=String(health?.serverVersion||health?.version||'').replace(/^V/i,'');
    const latest=String(manifest?.releaseVersion||manifest?.runtimeVersion||'').replace(/^V/i,'');
    const serverValid=health?.project==='GMWW-V2.00'&&gmwwVersionVerified(server);
    const manifestValid=gmwwVersionVerified(latest)&&['runtime','native','server_only'].includes(String(manifest?.releaseType||'').toLowerCase());
    if(serverEl)serverEl.textContent=serverValid?'V'+server:'V—';
    // Never retain a previously fetched manifest after a failed version check.
    gmwwUpdateManifest=null;
    if(!serverValid||!manifestValid){
      const publishing=serverValid&&manifestResult.status==='rejected'&&
        ['RUNTIME_MANIFEST_NOT_READY','UPDATE_MANIFEST_NOT_FOUND'].includes(String(manifestResult.reason?.code||''));
      if(publishing){
        setUpdateAction('pending');
        setUpdateUi('checking','ĐANG PHÁT HÀNH','Server V'+server+' đã chạy nhưng gói cập nhật chưa sẵn sàng.','Chưa cần nhấn Cập nhật. Hệ thống sẽ kiểm tra lại khi bạn mở ứng dụng hoặc bấm ↻.');
        return null;
      }
      const cause=!serverValid?'Chưa xác minh được kết nối Server.':'Chưa đọc được gói cập nhật Runtime.';
      const retryInfo=!serverValid?healthResult.reason:manifestResult.reason;
      console.warn('GMWW_UPDATE_UNVERIFIED',cause,retryInfo||'');
      setUpdateAction('unverified');
      setUpdateUi('warn','CẦN KIỂM TRA LẠI',cause,'Phiên bản Runtime V'+gmwwRuntimeVersion()+' đang chạy. Nhấn ↻ để thử lại; chưa thể kết luận đây là bản mới nhất.');
      return null;
    }
    const manifestServer=String(manifest.serverVersion||latest).replace(/^V/i,'');
    if(!gmwwVersionVerified(manifestServer)||gmwwVersionCompare(manifestServer,server)!==0){
      setUpdateAction('unverified');
      setUpdateUi('warn','SERVER CHƯA ĐỒNG BỘ','Server V'+server+' và kênh cập nhật V'+manifestServer+' chưa khớp.','Nhấn ↻ kiểm tra lại sau khi hệ thống đồng bộ.');
      return null;
    }
    gmwwUpdateManifest=manifest;
    gmwwRenderReleaseNotes(manifest);
    const type=String(manifest.releaseType).toLowerCase(),runtime=gmwwRuntimeVersion(),shell=gmwwShellVersion();
    const newer=gmwwVersionCompare(latest,runtime)>0,shellCurrent=gmwwVersionCompare(shell,latest)>=0;
    if(shellCurrent&&gmwwVersionCompare(runtime,shell)<0){
      setUpdateAction('restart',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('warn','CẦN KHỞI ĐỘNG LẠI','Ứng dụng V'+shell+' đã cài nhưng Runtime V'+runtime+' vẫn đang mở.','Đóng hẳn ứng dụng rồi mở lại một lần.');
      return manifest
    }
    if(!newer){
      setUpdateAction(gmwwVersionCompare(shell,runtime)<0?'compatible':'none',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('ok','ĐÃ ĐỒNG BỘ','Game Runtime V'+runtime+' · Server V'+server+'.','');
      return manifest
    }
    if(type==='native'&&shellCurrent){
      setUpdateAction('none',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('ok','ĐÃ CÀI IPA','Đã cài IPA V'+shell,'Phiên bản IPA hiện tại.');
      return manifest
    }
    if(type==='native'){
      setUpdateAction('native',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('warn','CẦN IPA MỚI','Có IPA V'+latest+' mới.','Nhấn TẢI IPA để cài phiên bản ứng dụng.');
    }else if(type==='runtime'){
      setUpdateAction('runtime',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('warn','CÓ CẬP NHẬT','Có GMWW V'+latest+' mới.','Cập nhật Game Runtime để nhận thay đổi.');
    }else{
      setUpdateAction('server_only',{shell,runtime,latest,ipaVersion:manifest.ipa?.version});
      setUpdateUi('ok','SERVER ĐÃ CẬP NHẬT','Server/Player Web đã lên V'+latest+'.','Tải lại Player Web để xem thay đổi.');
    }
    if(notify&&newer){
      const key='GMWW_UPDATE_NOTIFIED_'+latest+'_'+type;
      if(!sessionStorage.getItem(key)){
        sessionStorage.setItem(key,'1');
        if(type==='runtime'){
          if(confirm('Có phiên bản GMWW V'+latest+' mới.\n\n'+gmwwReleaseNotesText(manifest)+'\n\nCập nhật ngay?'))installRuntimeUpdate();
        }else if(type==='native'){
          if(confirm('Có phiên bản IPA V'+latest+' mới.\n\n'+gmwwReleaseNotesText(manifest)+'\n\nTải IPA V'+latest+' ngay?'))downloadUpdateIPA();
        }else{
          if(confirm('Player Web/Server V'+latest+' đã cập nhật.\n\n'+gmwwReleaseNotesText(manifest)+'\n\nĐồng bộ ngay?'))syncPlayerWebUpdate();
        }
      }
    }
    return manifest
  }catch(e){
    if(serial!==gmwwUpdateCheckSerial)return null;
    gmwwUpdateManifest=null;setUpdateAction('unverified');
    setUpdateUi('warn','CẦN KIỂM TRA LẠI','Chưa xác nhận được bản cập nhật.','Kiểm tra kết nối rồi nhấn ↻ để thử lại. Game hiện tại vẫn có thể hoạt động.');
    console.warn('GMWW_UPDATE_CHECK',e);
    return null
  }finally{
    if(serial===gmwwUpdateCheckSerial&&retry){retry.disabled=false;retry.removeAttribute('aria-busy')}
  }
}
window.GMWWUpdateNative={
  onProgress(event={}){
    // Đọc tiến độ thật chỉ khi trình tải bản địa cung cấp dữ liệu hợp lệ.
    if(!['installRuntime','downloadIPA'].includes(String(event.action||'')))return;
    const percent=Number(event.percent);
    if(!Number.isFinite(percent)||event.percent===null||event.percent===undefined)return;
    gmwwSetUpdateProgress('running',percent,event.action==='installRuntime'?'Đang cài Runtime':'Đang tải IPA');
  },
  onResult(result={}){
    if(result.action==="checkGithubRuntime"){
      const status=String(result.status||"");
      if(status==="available"){
        gmwwUpdateBusy=true;
        setUpdateAction("runtime",{latest:result.version});
        setUpdateUi("warn","GITHUB OTA","Đã tìm thấy GMWW Runtime V"+result.version+".","Xác nhận trên iPhone để tải và kiểm tra SHA-256.");
        return;
      }
      if(status==="installing"){
        gmwwGithubInstallRequested=false;gmwwUpdateBusy=true;
        gmwwSetUpdateProgress("running",null,"Đang tải Runtime từ GitHub và kiểm tra SHA-256");
        setUpdateUi("checking","ĐANG CẬP NHẬT","Đang tải gói Runtime chính thức từ GitHub…","Không tắt ứng dụng khi đang cài.");
        return;
      }
      gmwwUpdateBusy=false;
      if(result.cancelled){
        gmwwGithubInstallRequested=false;
        gmwwSetUpdateProgress("idle",null,"Đã hoãn cập nhật GitHub");
        setUpdateUi("warn","CÓ CẬP NHẬT","GitHub Runtime V"+String(result.version||"mới")+" đã sẵn sàng.","Nhấn TỰ ĐỘNG khi muốn cài.");
        return;
      }
      if(result.ok&&["fallback","current"].includes(status)){
        const requested=gmwwGithubInstallRequested,notify=gmwwGithubNotifyRequested;
        gmwwGithubInstallRequested=false;gmwwGithubNotifyRequested=false;
        void checkAppUpdate({notify,skipGithub:true}).then(manifest=>{
          if(requested&&manifest?.releaseType==="runtime"&&gmwwVersionCompare(manifest.releaseVersion,gmwwRuntimeVersion())>0)
            void installRuntimeUpdate();
        });
        return;
      }
      gmwwGithubInstallRequested=false;gmwwGithubNotifyRequested=false;
      gmwwSetUpdateProgress("error",null,"Không thể xác minh gói GitHub");
      setUpdateUi("bad",result.integrityFailure?"GÓI KHÔNG AN TOÀN":"GITHUB OTA LỖI",
        String(result.error||"Không thể tải gói GitHub."),
        result.integrityFailure?"Đã chặn cập nhật; không chuyển sang nguồn khác để bỏ qua kiểm tra SHA-256.":"Runtime hiện tại vẫn được giữ nguyên.");
      return;
    }
    gmwwUpdateBusy=false;
    if(gmwwUpdateSlowTimer)clearTimeout(gmwwUpdateSlowTimer);gmwwUpdateSlowTimer=null;
    if(result.cancelled){gmwwSetUpdateProgress('idle',null,'Đã hủy chọn file');return}
    if(result.ok&&result.action==='installRuntime'){
      gmwwSetUpdateProgress('done',100,'Đã tải và cài Runtime');
      const v=String(result.version||gmwwUpdateManifest?.releaseVersion||'mới');
      setUpdateUi('ok','ĐÃ CẬP NHẬT','Đã cài GMWW V'+String(v).replace(/^V/i,'')+'.','Có gì mới: '+gmwwReleaseNotesText(gmwwUpdateManifest));
      setTimeout(()=>{if(!gmwwNativePost('restartRuntime'))window.location.reload()},300);
      return
    }
    if(result.ok&&result.action==='downloadIPA'){
      gmwwSetUpdateProgress('done',100,'Đã tải xong IPA');
      setUpdateUi('ok','ĐÃ TẢI IPA','File IPA đã sẵn sàng.','Chọn Lưu vào Tệp hoặc ứng dụng cài đặt trong bảng chia sẻ.');
      return
    }
    if(result.ok===false){gmwwSetUpdateProgress('error',null,'Tác vụ không thành công');setUpdateUi('bad','CẬP NHẬT LỖI','Không thể hoàn tất cập nhật.',String(result.error||'Đã giữ nguyên phiên bản hiện tại.'));}
  }
};

let serverHealthBusy=false;
function setServerHealthState(kind,text,detail,data={}){
  const pill=document.getElementById('serverHealthPill'),dot=document.getElementById('serverHealthDot');
  if(pill){pill.className='health-pill '+kind;pill.textContent=kind==='ok'?'HOẠT ĐỘNG TỐT':kind==='warn'?'CÓ CẢNH BÁO':kind==='bad'?'MẤT KẾT NỐI':'ĐANG KIỂM TRA'}
  if(dot)dot.className='health-dot '+kind;
  const put=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  put('serverHealthText',text);put('serverHealthDetail',detail);
  put('healthPlayerWeb',data.web||'—');put('healthApi',data.api||'—');put('healthLatency',data.latency||'—');put('healthVersion',data.version||'—');
  put('healthCheckedAt',new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}));
  gmwwSettingsNoticeFromActive(['checkServerHealth','refreshServerData','settingsRunHealth','quickRepairSystem'],kind,String(text||'')+(detail?' · '+detail:''));
}
async function checkServerHealth(){
  if(serverHealthBusy)return; serverHealthBusy=true;
  const btn=document.getElementById('checkServerHealth');if(btn){btn.disabled=true;btn.setAttribute('aria-busy','true');btn.classList.add('is-busy')}
  setServerHealthState('checking','Đang kiểm tra…','Đang kiểm tra Server và Player Web');
  const started=performance.now();
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000),stamp=Date.now();
    const [healthRes,webRes]=await Promise.all([
      fetch(GMWW_SERVER_BASE+'/api/health?ipa='+stamp,{method:'GET',cache:'no-store',signal:controller.signal}),
      fetch(GMWW_SERVER_BASE+'/api/web-sync?health='+stamp,{method:'GET',cache:'no-store',signal:controller.signal})
    ]);
    clearTimeout(timer);
    const latency=Math.max(1,Math.round(performance.now()-started));
    let body={},web={};try{body=await healthRes.json()}catch{}try{web=await webRes.json()}catch{}
    if(!healthRes.ok||body.ok!==true)throw new Error('HTTP '+healthRes.status);
    const webOk=webRes.ok&&web.ok===true,slow=latency>800,level=webOk&&!slow?'ok':'warn';
    setServerHealthState(level,level==='ok'?'Hoạt động tốt':slow?'Phản hồi chậm':'Player Web cần kiểm tra',
      webOk?(slow?'Server + Player Web Online • phản hồi đang chậm':'Server + Player Web sẵn sàng'):'Server Online • chưa xác nhận được Player Web',
      {web:webOk?'Online':'Cảnh báo',api:'Online',latency:latency+' ms',version:body.version||'—'});
  }catch(err){
    const latency=Math.max(1,Math.round(performance.now()-started));
    setServerHealthState('bad','Mất kết nối','Không xác nhận được Server/Player Web',{web:'—',api:'Offline',latency:latency+' ms',version:'—'});
  }finally{serverHealthBusy=false;if(btn){btn.disabled=false;btn.removeAttribute('aria-busy');btn.classList.remove('is-busy')}}
}
const retryUpdateCheck=document.getElementById('retryUpdateCheck');
if(retryUpdateCheck)retryUpdateCheck.addEventListener('click',()=>{void checkAppUpdate({notify:false})});
const refreshServerData=document.getElementById('refreshServerData');
if(refreshServerData)refreshServerData.addEventListener('click',async()=>{refreshServerData.disabled=true;try{memberAdminState.loaded=false;await loadMembers(true);await checkServerHealth()}finally{refreshServerData.disabled=false}});
const openPlayerWeb=document.getElementById('openPlayerWeb');
if(openPlayerWeb)openPlayerWeb.addEventListener('click',()=>window.location.assign(GMWW_SERVER_BASE+'/'));
const healthButton=document.getElementById('checkServerHealth');
if(healthButton)healthButton.addEventListener('click',checkServerHealth);
document.getElementById('installManualRuntimeUpdate')?.addEventListener('click',installManualRuntimeUpdate);
const installRuntimeUpdateBtn=document.getElementById('installRuntimeUpdate');if(installRuntimeUpdateBtn)installRuntimeUpdateBtn.addEventListener('click',updateDataNow);
const downloadNewIPA=document.getElementById('downloadNewIPA');if(downloadNewIPA)downloadNewIPA.addEventListener('click',downloadUpdateIPA);
const syncPlayerWebUpdateBtn=document.getElementById('syncPlayerWebUpdate');if(syncPlayerWebUpdateBtn)syncPlayerWebUpdateBtn.addEventListener('click',syncPlayerWebUpdate);
setTimeout(()=>checkAppUpdate({notify:true}),1400);
// Settings navigation stays lightweight; diagnostics and the GitHub board are loaded on demand.
document.querySelectorAll('[data-page="settings"]').forEach(el=>el.addEventListener('click',()=>gmwwSettingsHubHealth('idle','Chọn HEALTHY CHECK để kiểm tra')));
window.addEventListener('online',()=>{checkAppUpdate({notify:true});if(document.getElementById('settings')?.classList.contains('active')){checkServerHealth();if(gmwwOpsAutoEnabled())setTimeout(()=>gmwwOpsRun({kind:'all',silent:true}),330)}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){gmwwSendGmPresence(true);setTimeout(()=>checkAppUpdate({notify:true}),250)}});

function setMaintenanceState(kind,text,detail){
  const pill=document.getElementById('maintenanceStatus'),dot=document.getElementById('maintenanceDot'),msg=document.getElementById('maintenanceDetail');
  if(pill){pill.className='maintenance-pill '+kind;pill.textContent=text}
  if(dot)dot.className='maintenance-dot '+kind;
  if(msg)msg.textContent=detail||'';
  gmwwSettingsNoticeFromActive(['auditLocalData','clearRuntimeCache','settingsRunHealth','quickRepairSystem'],kind,String(text||'')+(detail?' · '+detail:''));
}
function auditLocalData(){
  const btn=document.getElementById('auditLocalData');if(btn)btn.disabled=true;
  try{
    const issues=[];
    const buckets=[['Vai Trò',state.cards],['Artifact',state.artifacts],['Hành Động Vai Trò',state.actions?.role],['Hành Động Artifact',state.actions?.artifacts],['Hiệu Ứng',state.effects]];
    for(const [label,list] of buckets){
      if(!Array.isArray(list)){issues.push(label+' lỗi cấu trúc');continue}
      const ids=list.map(x=>String(x?.id||'')).filter(Boolean),dupes=ids.filter((id,i)=>ids.indexOf(id)!==i);
      if(dupes.length)issues.push(label+' trùng ID');
    }
    const total=(state.cards?.length||0)+(state.artifacts?.length||0)+(state.effects?.length||0);
    if(issues.length)setMaintenanceState('warn','CẦN KIỂM TRA',issues.slice(0,2).join(' • '));
    else setMaintenanceState('ok','ỔN','Dữ liệu hợp lệ • '+total+' mục chính');
  }catch(_){setMaintenanceState('bad','LỖI','Không thể kiểm tra dữ liệu.')}
  finally{if(btn)btn.disabled=false}
}
async function clearSafeRuntimeCache(){
  const btn=document.getElementById('clearRuntimeCache');if(btn)btn.disabled=true;
  setMaintenanceState('checking','ĐANG DỌN','Đang giải phóng cache tạm…');
  try{
    let released=0;
    for(const u of objectUrls.values()){try{URL.revokeObjectURL(u);released++}catch(_){}}
    objectUrls.clear();defaultThumb='';
    if('caches' in window){try{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)))}catch(_){}}
    renderEntityGrid('cards');renderEntityGrid('artifacts');await applyActiveThemeUi();
    setMaintenanceState('ok','ĐÃ DỌN','Đã dọn cache tạm • giữ nguyên Artwork, Audio và dữ liệu game.');
  }catch(_){setMaintenanceState('warn','CHƯA XONG','Không dọn được toàn bộ cache tạm.')}
  finally{if(btn)btn.disabled=false}
}
const auditLocalDataBtn=document.getElementById('auditLocalData');if(auditLocalDataBtn)auditLocalDataBtn.addEventListener('click',auditLocalData);
const clearRuntimeCacheBtn=document.getElementById('clearRuntimeCache');if(clearRuntimeCacheBtn)clearRuntimeCacheBtn.addEventListener('click',clearSafeRuntimeCache);
const reloadAppBtn=document.getElementById('reloadApp');if(reloadAppBtn)reloadAppBtn.addEventListener('click',()=>window.location.reload());

/* V2.97 — self diagnostics for Server + Player Web */
let gmwwDiagnosticBusy=false,gmwwRuntimeErrors=[];
/* GMWW Runtime Warning Diagnostics — không tính lỗi tải ảnh là lỗi JavaScript. */
const GMWW_RUNTIME_RECENT_MS=15*60*1000;
const gmwwRuntimePromiseIssues=new WeakMap();
function gmwwRecentRuntimeIssues(now=Date.now()){
  gmwwRuntimeErrors=gmwwRuntimeErrors.filter(item=>Number.isFinite(item?.at)&&item.at<=now&&now-item.at<GMWW_RUNTIME_RECENT_MS);
  const seen=new Set();
  return gmwwRuntimeErrors.filter(item=>{
    const signature=item.kind+'\u0000'+item.message;
    if(seen.has(signature))return false;
    seen.add(signature);return true;
  });
}
function gmwwCaptureRuntimeIssue(kind,message){
  const raw=String(message??'').replace(/\s+/g,' ').trim();
  // iOS/WebKit phát 'error' cho ảnh/tài nguyên thiếu message; request bị hủy là bình thường.
  if(!raw||/^(?:AbortError\b|The operation was aborted\b|The user aborted a request\b)/i.test(raw))return null;
  const text=raw.replace(/https?:\/\/[^\s"'<>]+/gi,'[URL đã ẩn]')
    .replace(/\b(?:token|api[_-]?key|password|authorization)\s*[:=]\s*[^\s,;&]+/gi,'[thông tin ẩn]')
    .slice(0,180);
  const item={kind:String(kind||'javascript'),message:text,at:Date.now()};
  gmwwRuntimeErrors.unshift(item);
  gmwwRuntimeErrors=gmwwRuntimeErrors.slice(0,8);
  if(document.getElementById('settings')?.classList.contains('active'))
    setDiagnosticState('warn','PHÁT HIỆN LỖI','Đã ghi nhận lỗi Runtime',text);
  return item;
}
window.addEventListener('error',event=>{
  const message=event?.message||event?.error?.message;
  if(!message){
    // Chỉ thiếu script mới tác động logic; lỗi image/link đơn lẻ không phải crash Runtime.
    if(String(event?.target?.tagName||'').toUpperCase()==='SCRIPT')
      gmwwCaptureRuntimeIssue('javascript','Không tải được tệp JavaScript');
    return;
  }
  gmwwCaptureRuntimeIssue('javascript',message);
});
window.addEventListener('unhandledrejection',event=>{
  const reason=event?.reason;
  if(reason?.name==='AbortError')return;
  const item=gmwwCaptureRuntimeIssue('promise',typeof reason==='string'?reason:reason?.message||reason?.name||'');
  if(item&&event?.promise&&(typeof event.promise==='object'||typeof event.promise==='function'))
    gmwwRuntimePromiseIssues.set(event.promise,item);
});
window.addEventListener('rejectionhandled',event=>{
  const promise=event?.promise;
  if(!promise)return;
  const item=gmwwRuntimePromiseIssues.get(promise);
  if(!item)return;
  gmwwRuntimePromiseIssues.delete(promise);
  gmwwRuntimeErrors=gmwwRuntimeErrors.filter(issue=>issue!==item);
});

function setDiagnosticState(kind,status,summary,detail=''){
  const dot=document.getElementById('diagnosticDot'),pill=document.getElementById('diagnosticStatus'),sum=document.getElementById('diagnosticSummary'),hint=document.getElementById('diagnosticHint'),det=document.getElementById('diagnosticDetail');
  if(dot)dot.className='diagnostic-dot '+kind;
  if(pill){pill.className='diagnostic-pill '+kind;pill.textContent=status}
  if(sum)sum.textContent=summary||'';
  if(hint)hint.textContent=kind==='ok'?'Server và Player Web đang hoạt động bình thường.':kind==='checking'?'Đang kiểm tra từng thành phần…':'Hệ thống đã khoanh vùng mục cần xử lý.';
  if(det)det.textContent=detail||'';
  gmwwSettingsNoticeFromActive(['runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow','settingsRunHealth'],kind,String(status||'')+' · '+String(summary||'')+(detail?' · '+detail:''));
}
function renderDiagnosticItem(key,kind,text){
  const row=document.querySelector('#diagnosticList [data-diagnostic="'+key+'"]');if(!row)return;
  row.className=kind||'';const out=row.querySelector('b');if(out)out.textContent=text||'—';
}
async function gmwwJsonProbe(path,validate=()=>true,timeout=7000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout),started=performance.now();
  try{
    const res=await fetch(GMWW_SERVER_BASE+path,{cache:'no-store',signal:controller.signal});
    let data={};try{data=await res.json()}catch{}
    const valid=res.ok&&validate(data,res)!==false;
    return{ok:valid,status:res.status,data,latency:Math.max(1,Math.round(performance.now()-started)),error:valid?'':String(data?.error||data?.message||('HTTP '+res.status))}
  }catch(err){return{ok:false,status:0,data:{},latency:Math.max(1,Math.round(performance.now()-started)),error:String(err?.name==='AbortError'?'Timeout':err?.message||'Network error')}}
  finally{clearTimeout(timer)}
}
async function runSystemDiagnostics({silent=false}={}){
  if(gmwwDiagnosticBusy)return null;gmwwDiagnosticBusy=true;
  const btn=document.getElementById('runSystemDiagnostics');if(btn){btn.disabled=true;btn.classList.add('is-busy')}
  if(!silent)setDiagnosticState('checking','ĐANG QUÉT','Đang quét Server + Player Web…','5 nhóm kiểm tra');
  ['server','player','update','characters','settings'].forEach(k=>renderDiagnosticItem(k,'','…'));
  try{
    if(navigator.onLine===false){
      ['server','player','update','characters','settings'].forEach(k=>renderDiagnosticItem(k,'bad','OFFLINE'));
      setDiagnosticState('bad','MẤT MẠNG','Thiết bị đang Offline.','Kết nối mạng rồi chạy lại Health Check.');
      return{ok:false,offline:true}
    }
    const stamp=Date.now();
    const [server,player,update,characters,settings]=await Promise.all([
      gmwwJsonProbe('/api/health?diag='+stamp,d=>d?.ok===true&&d?.project==='GMWW-V2.00'),
      gmwwJsonProbe('/api/web-sync?diag='+stamp,d=>d?.ok===true),
      gmwwJsonProbe('/api/update/manifest?diag='+stamp,d=>d?.ok===true&&!!d?.releaseVersion),
      gmwwJsonProbe('/api/game-characters?diag='+stamp,d=>Array.isArray(d?.characters)&&d.characters.length>=20),
      gmwwJsonProbe('/api/ui-settings?diag='+stamp,()=>true)
    ]);
    const probes={server,player,update,characters,settings};
    for(const [key,result] of Object.entries(probes))renderDiagnosticItem(key,result.ok?'ok':'bad',result.ok?'OK':(result.error||'LỖI').slice(0,18));
    const failures=Object.entries(probes).filter(([,v])=>!v.ok);
    const warnings=[];
    const m=update.data||{},runtime=String(m.runtimeVersion||''),shell=String(m.shellVersion||''),type=String(m.releaseType||'');
    if(update.ok&&runtime&&shell&&runtime!==shell&&type!=='runtime')warnings.push('Kênh cập nhật chưa đúng loại Runtime');
    if(server.ok&&server.latency>800)warnings.push('Server phản hồi chậm '+server.latency+' ms');
    const recentRuntimeIssues=gmwwRecentRuntimeIssues();
    if(recentRuntimeIssues.length)warnings.push('Runtime: '+recentRuntimeIssues.length+' lỗi gần đây · '+recentRuntimeIssues[0].message);
    if(failures.length){
      setDiagnosticState('bad','PHÁT HIỆN LỖI',failures.length+' thành phần chưa đạt',failures.map(([k,v])=>k+': '+(v.error||'Lỗi')).slice(0,2).join(' • '));
      return{ok:false,failures,warnings,probes}
    }
    if(warnings.length){
      setDiagnosticState('warn','CÓ CẢNH BÁO','5/5 thành phần kết nối được',warnings.slice(0,2).join(' • '));
      return{ok:true,warnings,probes}
    }
    setDiagnosticState('ok','HỆ THỐNG TỐT','5/5 kiểm tra đạt','Health Check hoàn tất • '+server.latency+' ms');
    return{ok:true,warnings:[],probes}
  }finally{gmwwDiagnosticBusy=false;if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function quickRepairSystem(){
  if(gmwwDiagnosticBusy)return;
  const btn=document.getElementById('quickRepairSystem');if(btn){btn.disabled=true;btn.classList.add('is-busy')}
  setDiagnosticState('checking','ĐANG SỬA','Đang thực hiện sửa lỗi an toàn…','Dọn cache tạm • tải lại dữ liệu • đồng bộ Player Web');
  try{
    await clearSafeRuntimeCache();
    memberAdminState.loaded=false;
    try{await loadMembers(true)}catch(_){}
    await syncPlayerWebUpdate();
    await checkAppUpdate({notify:false});
    await checkServerHealth();
    // Không xóa lỗi thật chỉ để Health Check báo xanh; giữ cho đến khi hết hạn.
    const result=await runSystemDiagnostics({silent:true});
    if(result?.ok)setDiagnosticState(result.warnings?.length?'warn':'ok',result.warnings?.length?'CÒN CẢNH BÁO':'ĐÃ SỬA XONG',result.warnings?.length?'Các kết nối đã phục hồi, còn cảnh báo cần theo dõi.':'Server + Player Web đã được kiểm tra lại.',result.warnings?.slice(0,2).join(' • ')||'Không xoá dữ liệu game.');
  }catch(err){setDiagnosticState('bad','SỬA LỖI THẤT BẠI','Không hoàn tất được sửa nhanh.',String(err?.message||'Vui lòng thử lại.'))}
  finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function checkPlayerWebNow(){
  const btn=document.getElementById('checkPlayerWebNow');if(btn){btn.disabled=true;btn.classList.add('is-busy')}
  try{
    await syncPlayerWebUpdate();
    await runSystemDiagnostics({silent:false});
  }finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
const runSystemDiagnosticsBtn=document.getElementById('runSystemDiagnostics');if(runSystemDiagnosticsBtn)runSystemDiagnosticsBtn.addEventListener('click',()=>runSystemDiagnostics({silent:false}));
const quickRepairSystemBtn=document.getElementById('quickRepairSystem');if(quickRepairSystemBtn)quickRepairSystemBtn.addEventListener('click',quickRepairSystem);
const checkPlayerWebNowBtn=document.getElementById('checkPlayerWebNow');if(checkPlayerWebNowBtn)checkPlayerWebNowBtn.addEventListener('click',checkPlayerWebNow);
setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('settings')?.classList.contains('active')){if(gmwwOpsAutoEnabled())gmwwOpsRun({kind:'all',silent:true});false /* Workboard refreshes only when requested */}},120000);


/* GMWW Settings: one continuous scrolling screen with consistent health status. */
/* GMWW V3.230 — thông báo thống nhất cho 16 công cụ Kiểm tra & bảo trì. */
const GMWW_SETTINGS_TOOL_LABELS=Object.freeze({
  settingsRunHealth:'HEALTHY CHECK',settingsOptimizeDO:'TỐI ƯU DO',
  auditLocalData:'KIỂM TRA',clearRuntimeCache:'DỌN CACHE',reloadApp:'TẢI LẠI',
  gmwwCloudflareOpen:'CLOUDFLARE',gmwwServerTrashOpen:'DỌN RÁC SERVER',
  opsRunFullAudit:'KIỂM TRA TỔNG',opsCheckRoom:'PHÒNG & REALTIME',opsCheckRelease:'PHIÊN BẢN',
  checkServerHealth:'KIỂM TRA SERVER',refreshServerData:'ĐỒNG BỘ SERVER',openPlayerWeb:'MỞ WEB',
  runSystemDiagnostics:'QUÉT LỖI',quickRepairSystem:'SỬA NHANH',checkPlayerWebNow:'CHECK WEB'
});
const gmwwSettingsNoticeHistory=[];
let gmwwSettingsNoticeActive='',gmwwSettingsNoticeActiveAt=0;
function pushSettingsNotice(toolId,kind,message){
  const panel=document.getElementById('settingsNoticePanel'),list=document.getElementById('settingsNoticeList');
  if(!panel||!list||!GMWW_SETTINGS_TOOL_LABELS[toolId])return;
  const level={ok:'ok',success:'ok',warn:'warn',bad:'bad',error:'bad',checking:'checking',info:'info'}[kind]||'info';
  const content=String(message||'').replace(/\s+/g,' ').trim().slice(0,430);
  if(!content)return;
  const last=gmwwSettingsNoticeHistory[0];
  if(last&&last.toolId===toolId&&last.level===level&&last.message===content&&Date.now()-last.timestamp<1000)return;
  const entry={toolId,level,message:content,timestamp:Date.now()};
  gmwwSettingsNoticeHistory.unshift(entry);
  if(gmwwSettingsNoticeHistory.length>12)gmwwSettingsNoticeHistory.length=12;
  const item=document.createElement('li');
  item.className='settings-notice-entry '+level;
  const symbol=document.createElement('span');symbol.className='settings-notice-symbol';
  symbol.textContent={ok:'✓',warn:'!',bad:'×',checking:'◷',info:'•'}[level];
  const body=document.createElement('div');body.className='settings-notice-entry-text';
  const title=document.createElement('b');title.textContent=GMWW_SETTINGS_TOOL_LABELS[toolId];
  const detail=document.createElement('p');detail.textContent=content;
  body.append(title,detail);
  const time=document.createElement('time');time.dateTime=new Date(entry.timestamp).toISOString();
  time.textContent=new Date(entry.timestamp).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
  item.append(symbol,body,time);
  list.prepend(item);
  while(list.children.length>12)list.lastElementChild.remove();
  const empty=document.getElementById('settingsNoticeEmpty');if(empty)empty.hidden=true;
  const count=document.getElementById('settingsNoticeCount');if(count)count.textContent=String(gmwwSettingsNoticeHistory.length)+' thông báo';
}
function gmwwSettingsNoticeFromActive(allowed,kind,message){
  const id=gmwwSettingsNoticeActive;
  if(!id||!allowed.includes(id)||Date.now()-gmwwSettingsNoticeActiveAt>120000)return;
  const button=document.getElementById(id);
  if(!button?.disabled)return; // avoid old/stale background refreshes
  pushSettingsNotice(id,kind,message);
}
function gmwwInitSettingsNoticePanel(){
  const rail=document.getElementById('settingsToolsRail');
  rail?.addEventListener('click',event=>{
    const button=event.target?.closest?.('button[id]');
    if(!button||!rail.contains(button)||button.disabled||!GMWW_SETTINGS_TOOL_LABELS[button.id])return;
    gmwwSettingsNoticeActive=button.id;gmwwSettingsNoticeActiveAt=Date.now();
    const navigation=['reloadApp','openPlayerWeb'].includes(button.id);
    const openPanel=['gmwwCloudflareOpen','gmwwServerTrashOpen'].includes(button.id);
    pushSettingsNotice(button.id,navigation||openPanel?'info':'checking',
      navigation?'Đang mở trang…':openPanel?'Đang mở công cụ quản lý bên dưới…':'Đang thực hiện, kết quả sẽ hiển thị tại đây.');
  },true);
  document.getElementById('opsAutoCheck')?.addEventListener('change',event=>{
    pushSettingsNotice('opsRunFullAudit','info',event.target.checked?
      'Đã bật tự kiểm tra mỗi 2 phút.':'Đã tắt tự kiểm tra định kỳ.');
  });
  document.getElementById('settingsNoticeClear')?.addEventListener('click',()=>{
    gmwwSettingsNoticeHistory.length=0;
    const list=document.getElementById('settingsNoticeList');if(list)list.replaceChildren();
    const empty=document.getElementById('settingsNoticeEmpty');if(empty)empty.hidden=false;
    const count=document.getElementById('settingsNoticeCount');if(count)count.textContent='0 thông báo';
  });
  // The Cloudflare management module is independent of GM runtime: mirror its final status.
  const cf=document.getElementById('gmwwCfState');
  if(cf&&typeof MutationObserver==='function'){
    let previous=cf.textContent?.trim()||'';
    new MutationObserver(()=>{
      const value=cf.textContent?.trim()||'';
      if(!value||value===previous)return;
      previous=value;
      if(!['gmwwCloudflareOpen','gmwwServerTrashOpen'].includes(gmwwSettingsNoticeActive))return;
      const bad=/LỖI|THẤT BẠI|KHÔNG THỂ/.test(value);
      pushSettingsNotice(gmwwSettingsNoticeActive,bad?'bad':'info','Cloudflare: '+value);
    }).observe(cf,{childList:true,characterData:true,subtree:true});
  }
}
gmwwInitSettingsNoticePanel();
/* END GMWW SETTINGS NOTICES V3.230 */

function gmwwSettingsHubHealth(kind,message){
  const box=document.getElementById('settingsHubMiniHealth'),label=document.getElementById('settingsHubMiniText');
  if(box)box.dataset.status=kind||'idle';
  if(label)label.textContent=message||'Chưa kiểm tra';
}

/* GMWW Operations Center — Cài Đặt. Read-only health, room & release checks; no credential exposure. */
const GMWW_OPS_AUTO_KEY='GMWW_OPS_AUTO_CHECK_V1';
let gmwwOpsBusy=false,gmwwOpsSnapshot=null;
function gmwwOpsAutoEnabled(){
  try{return localStorage.getItem(GMWW_OPS_AUTO_KEY)==='1'}catch{return false}
}
function gmwwOpsLine(key,kind,label,note){
  const el=document.querySelector('#opsReport [data-ops-check="'+key+'"]');
  if(!el)return;
  el.className=kind||'idle';
  const badge=el.querySelector('b'),caption=el.querySelector('small');
  if(badge)badge.textContent=label||'—';
  if(caption)caption.textContent=note||'';
}
function gmwwOpsTop(key,value,kind){
  const el=document.getElementById(key);
  if(el){el.textContent=value||'—';el.dataset.status=kind||'idle'}
}
function gmwwOpsResult(kind,label,note,extra={}){
  return {kind,label,note,...extra};
}
function gmwwOpsServerPart(server,deep){
  const v=String(server?.data?.version||'');
  if(!server?.ok)return gmwwOpsResult('bad','LỖI SERVER','Không thể truy cập Cloudflare Worker.',{http:server?.status||0});
  if(!deep?.ok||deep?.data?.checks?.memberStorage!=='ready')
    return gmwwOpsResult('bad','LỖI DỮ LIỆU','Durable Objects chưa sẵn sàng.',{http:deep?.status||0,version:v});
  return gmwwOpsResult('ok','ỔN ĐỊNH','Worker '+v+' • phản hồi '+server.latency+' ms',{http:server.status,latencyMs:server.latency,version:v});
}
function gmwwOpsRoomSnapshot(){
  const selected=typeof isLivePlayRoom==='function'&&isLivePlayRoom();
  if(!selected||!playSceneState?.roomCode)
    return {room:gmwwOpsResult('idle','CHƯA CHỌN','Chưa có phòng được chọn trong Trang Chơi.'),
      realtime:gmwwOpsResult('idle','CHƯA KẾT NỐI','Chưa có phòng để đo kết nối realtime.'),
      players:0,seats:0,online:0};
  const room=playSceneRuntime?.room||{},members=Array.isArray(playSceneRuntime?.players)?playSceneRuntime.players:[],
    online=members.filter(p=>p?.online!==false).length,
    seatCount=Math.max(0,Math.min(30,Number(room?.seatCount||playSceneState?.seatCount||0))),
    socket=playSceneRuntime?.socket,
    socketOpen=!!socket&&socket.readyState===1,
    lastSync=Number(playSceneRuntime?.lastSyncAt||0),
    syncAgeSec=lastSync>0?Math.max(0,Math.floor((Date.now()-lastSync)/1000)):null,
    mode=String(room?.roomMode||playSceneState?.roomMode||'').toUpperCase(),
    enabled=room?.enabled!==false;
  return {
    room:gmwwOpsResult(enabled?'ok':'warn',enabled?'PHÒNG ON':'PHÒNG OFF',
      mode+' • '+members.length+'/'+seatCount+' vị trí • '+online+' online',
      {mode,enabled,participants:members.length,seats:seatCount,online}),
    realtime:socketOpen?gmwwOpsResult(syncAgeSec!==null&&syncAgeSec>90?'warn':'ok',syncAgeSec!==null&&syncAgeSec>90?'CHẬM ĐỒNG BỘ':'ĐÃ KẾT NỐI',
      'WebSocket đang mở'+(syncAgeSec===null?'':' • cập nhật '+syncAgeSec+' giây trước'),{socketOpen,syncAgeSec})
      :gmwwOpsResult('warn','CHƯA KẾT NỐI','Mở Trang Chơi để kết nối realtime; không tự reset phòng.',{socketOpen:false,syncAgeSec})
  };
}
function gmwwOpsDraw(snapshot){
  if(!snapshot)return;
  const states=snapshot.checks||{};
  for(const [key,value] of Object.entries(states))gmwwOpsLine(key,value.kind,value.label,value.note);
  gmwwOpsTop('opsServerState',states.server?.label,states.server?.kind);
  gmwwOpsTop('opsStorageState',states.storage?.label,states.storage?.kind);
  gmwwOpsTop('opsRealtimeState',states.realtime?.label,states.realtime?.kind);
  gmwwOpsTop('opsReleaseState',states.update?.label,states.update?.kind);
  const values=Object.values(states),failed=values.filter(v=>v?.kind==='bad'),
    warned=values.filter(v=>v?.kind==='warn'),
    overall=failed.length?'bad':warned.length?'warn':'ok',
    label=failed.length?'PHÁT HIỆN LỖI':warned.length?'CẦN CHÚ Ý':'HỆ THỐNG ỔN';
  const dot=document.getElementById('opsDot'),pill=document.getElementById('opsOverall'),advice=document.getElementById('opsAdvice'),
    time=document.getElementById('opsLastChecked');
  if(dot)dot.className='ops-dot '+overall;
  if(pill){pill.className='ops-pill '+overall;pill.textContent=label}
  if(advice)advice.textContent=failed.length?'Có '+failed.length+' mục gặp lỗi. Xem chi tiết bên dưới; có thể sử dụng SỬA NHANH ở mục Tự chẩn đoán.'
    :warned.length?'Có '+warned.length+' cảnh báo. Kiểm tra trạng thái phòng và phiên bản trước khi chơi.'
    :'Kiểm tra đạt. Không cần xoá cache, reset phòng hoặc cài lại IPA.';
  if(time)time.textContent='Lần kiểm tra: '+new Date(snapshot.checkedAt).toLocaleString('vi-VN')+' • Chỉ đọc, không thay đổi dữ liệu game.';
  if(typeof gmwwSettingsHubHealth==='function')gmwwSettingsHubHealth(overall,
    failed.length?failed.length+' lỗi cần kiểm tra':warned.length?warned.length+' cảnh báo':'Server & game hoạt động tốt');
}
async function gmwwOpsRun({kind='all',silent=false}={}){
  if(gmwwOpsBusy)return gmwwOpsSnapshot;
  gmwwOpsBusy=true;
  const buttonId=kind==='room'?'opsCheckRoom':kind==='release'?'opsCheckRelease':'opsRunFullAudit';
  const button=document.getElementById(buttonId);
  if(button)button.disabled=true;
  const overall=document.getElementById('opsOverall');
  if(overall&&!silent){overall.textContent='ĐANG KIỂM TRA';overall.className='ops-pill checking'}
  try{
    const checks={...(gmwwOpsSnapshot?.checks||{})},stamp=Date.now();
    const runAll=kind==='all',runRoom=runAll||kind==='room',runRelease=runAll||kind==='release';
    let server=null,deep=null,manifest=null;
    if(runAll||runRelease){
      const jobs=[
        gmwwJsonProbe('/api/health?ops='+stamp,d=>d?.ok===true&&d?.project==='GMWW-V2.00'),
        gmwwJsonProbe('/api/health/deep?ops='+stamp,d=>d?.ok===true&&d?.checks?.memberStorage==='ready'),
        gmwwJsonProbe('/api/update/manifest?ops='+stamp,d=>d?.ok===true&&!!d?.releaseVersion)
      ];
      if(runAll)jobs.push(gmwwJsonProbe('/api/web-sync?ops='+stamp,d=>d?.ok===true),
        gmwwJsonProbe('/api/game-characters?ops='+stamp,d=>Array.isArray(d?.characters)&&d.characters.length>=20));
      const results=await Promise.all(jobs);
      [server,deep,manifest]=results;
      const combination=gmwwOpsServerPart(server,deep);
      checks.server=server?.ok?gmwwOpsResult('ok','ONLINE','Cloudflare Worker '+String(server.data?.version||'')+' • '+server.latency+' ms',
        {http:server.status,latencyMs:server.latency,version:String(server.data?.version||'')})
        :gmwwOpsResult('bad','OFFLINE','Server không phản hồi hoặc sai cấu hình.',{http:server?.status||0});
      checks.storage=deep?.ok?gmwwOpsResult('ok','SẴN SÀNG','Durable Objects phản hồi • chỉ đọc dữ liệu.',
        {http:deep.status}):gmwwOpsResult('bad','KHÔNG SẴN SÀNG','Kiểm tra lưu trữ thất bại.',{http:deep?.status||0});
      const serverVersion=String(server?.data?.version||'').replace(/^V/i,'');
      const updateVersion=String(manifest?.data?.releaseVersion||'').replace(/^V/i,'');
      const aligned=manifest?.ok&&server?.ok&&serverVersion===updateVersion;
      const shell=typeof gmwwShellVersion==='function'?gmwwShellVersion():'—';
      const runtime=typeof gmwwRuntimeVersion==='function'?gmwwRuntimeVersion():'—';
      checks.update=aligned?gmwwOpsResult('ok','ĐỒNG BỘ','Server '+serverVersion+' • Runtime '+runtime+' • IPA '+shell,
        {serverVersion,releaseVersion:updateVersion,runtimeVersion:runtime,shellVersion:shell,http:manifest.status})
        :gmwwOpsResult('warn','KIỂM TRA LẠI','Server và kênh cập nhật chưa khớp, xem Cập Nhật Hệ Thống.',
          {serverVersion,releaseVersion:updateVersion,runtimeVersion:runtime,shellVersion:shell,http:manifest?.status||0});
      if(runAll){
        const [player,characters]=results.slice(3);
        checks.player=player?.ok?gmwwOpsResult('ok','HOẠT ĐỘNG','Player Web và trạng thái đồng bộ phản hồi • '+player.latency+' ms',
          {http:player.status,latencyMs:player.latency})
          :gmwwOpsResult('bad','LỖI KẾT NỐI','Player Web không phản hồi.',{http:player?.status||0});
        const count=Array.isArray(characters?.data?.characters)?characters.data.characters.length:0;
        checks.characters=characters?.ok?gmwwOpsResult('ok','SẴN SÀNG',count+' nhân vật trong manifest.',
          {http:characters.status,count}):gmwwOpsResult('warn','THIẾU DỮ LIỆU','Không đọc được đầy đủ danh sách nhân vật.',{http:characters?.status||0,count});
      }
    }
    if(runRoom){
      const state=gmwwOpsRoomSnapshot();
      checks.room=state.room;checks.realtime=state.realtime;
      if(state.room.kind!=='idle'&&playSceneState?.roomCode){
        const roomCheck=await gmwwJsonProbe('/api/rooms/'+encodeURIComponent(playSceneState.roomCode)+'?ops='+stamp,
          d=>d?.ok===true&&!!d?.room);
        if(!roomCheck.ok)checks.room=gmwwOpsResult('bad','KHÔNG ĐỒNG BỘ','Không truy xuất được phòng đã chọn.',{http:roomCheck.status});
        else{
          const actual=roomCheck.data;
          const participants=Array.isArray(actual?.players)?actual.players.length:0;
          const online=Array.isArray(actual?.players)?actual.players.filter(p=>p?.online!==false).length:0;
          const seatCount=Math.max(0,Math.min(30,Number(actual?.room?.seatCount)||0));
          checks.room=gmwwOpsResult(actual?.room?.enabled===false?'warn':'ok',actual?.room?.enabled===false?'PHÒNG OFF':'PHÒNG ON',
            String(actual?.room?.roomMode||'').toUpperCase()+' • '+participants+'/'+seatCount+' vị trí • '+online+' online',
            {http:roomCheck.status,mode:String(actual?.room?.roomMode||''),enabled:actual?.room?.enabled!==false,
              participants,seats:seatCount,online});
        }
      }
    }
    if(runAll){
      const recentRuntimeIssues=gmwwRecentRuntimeIssues(),errorCount=recentRuntimeIssues.length;
      checks.runtime=gmwwOpsResult(errorCount?'warn':'ok',errorCount?errorCount+' CẢNH BÁO':'KHÔNG LỖI',
        errorCount?'Thiết bị ghi nhận '+errorCount+' lỗi JavaScript/Promise: '+recentRuntimeIssues[0].message:'Chưa ghi nhận lỗi JavaScript gần đây.',
        {count:errorCount});
    }
    gmwwOpsSnapshot={checkedAt:new Date().toISOString(),checks};
    gmwwOpsDraw(gmwwOpsSnapshot);
    if(!silent){
      const values=Object.values(checks),errors=values.filter(v=>v?.kind==='bad').length,
        warnings=values.filter(v=>v?.kind==='warn').length;
      const targetId=gmwwSettingsNoticeActive==='settingsRunHealth'?'settingsRunHealth':buttonId;
      pushSettingsNotice(targetId,errors?'bad':warnings?'warn':'ok',errors?
        'Đã kiểm tra · '+errors+' lỗi cần xử lý.':warnings?
        'Đã kiểm tra · '+warnings+' cảnh báo cần theo dõi.':'Đã kiểm tra · Không ghi nhận lỗi trong các mục được quét.');
    }
    return gmwwOpsSnapshot;
  }catch(_){
    if(!silent)pushSettingsNotice(gmwwSettingsNoticeActive==='settingsRunHealth'?'settingsRunHealth':buttonId,
      'bad','Không hoàn tất được kiểm tra vận hành. Vui lòng kiểm tra mạng rồi thử lại.');
    const advice=document.getElementById('opsAdvice');
    if(advice)advice.textContent='Không hoàn tất được chẩn đoán. Kiểm tra mạng rồi thử lại.';
    if(overall){overall.className='ops-pill bad';overall.textContent='KHÔNG KIỂM TRA ĐƯỢC'}
    return null;
  }finally{gmwwOpsBusy=false;if(button)button.disabled=false}
}
function gmwwOpsSafeReport(snapshot){
  if(!snapshot)return null;
  const fields=['kind','label','http','latencyMs','version','serverVersion','releaseVersion','runtimeVersion',
    'shellVersion','mode','enabled','participants','seats','online','socketOpen','syncAgeSec','count'];
  const checks={};
  for(const [key,row] of Object.entries(snapshot.checks||{})){
    checks[key]={};
    for(const f of fields)if(Object.prototype.hasOwnProperty.call(row,f))checks[key][f]=row[f];
  }
  return {project:'GMWW-V2.00',type:'read-only-operations-report',checkedAt:snapshot.checkedAt,
    clientVersion:String(VERSION||''),checks,
    privacy:'No names, login IDs, player positions, room codes, IPs, tokens, or card roles included.'};
}
function gmwwOpsInitialize(){
  const auto=document.getElementById('opsAutoCheck');
  if(auto){auto.checked=gmwwOpsAutoEnabled();auto.addEventListener('change',()=>{
    try{localStorage.setItem(GMWW_OPS_AUTO_KEY,auto.checked?'1':'0')}catch(_){}
    if(auto.checked)gmwwOpsRun({kind:'all',silent:true});
  })}
  document.getElementById('opsRunFullAudit')?.addEventListener('click',()=>gmwwOpsRun({kind:'all'}));
  document.getElementById('opsCheckRoom')?.addEventListener('click',()=>gmwwOpsRun({kind:'room'}));
  document.getElementById('opsCheckRelease')?.addEventListener('click',()=>gmwwOpsRun({kind:'release'}));
  document.getElementById('settingsRunHealth')?.addEventListener('click',async()=>{
    const button=document.getElementById('settingsRunHealth');
    if(button?.disabled)return;if(button)button.disabled=true;
    try{
      auditLocalData();
      const operations=await gmwwOpsRun({kind:'all'});
      await checkServerHealth();
      const diagnostics=await runSystemDiagnostics();
      const bad=!operations||diagnostics?.ok!==true;
      pushSettingsNotice('settingsRunHealth',bad?'warn':diagnostics?.warnings?.length?'warn':'ok',
        bad?'Đã kiểm tra nhưng còn mục chưa xác nhận. Xem chi tiết kết quả vận hành.':
        diagnostics.warnings?.length?'Đã kiểm tra · Còn '+diagnostics.warnings.length+' cảnh báo.':
        'Hoàn tất Health Check và chẩn đoán Server/Player Web.');
    }catch(e){pushSettingsNotice('settingsRunHealth','bad','Không hoàn tất: '+String(e?.message||'Vui lòng thử lại.'))}
    finally{if(button)button.disabled=false}
  });
}
gmwwOpsInitialize();

/* GMWW 3.230 — báo cáo DO vào Thông báo hệ thống, không còn chữ trong lưới. */
document.getElementById('settingsOptimizeDO')?.addEventListener('click',async()=>{
  const button=document.getElementById('settingsOptimizeDO');
  if(button?.disabled)return;
  if(button)button.disabled=true;
  try{
    const data=await gmApi('/api/gm/storage-optimizer',{method:'GET'});
    if(!data?.ok||data.enabled!==true)throw new Error('Chính sách tối ưu chưa hoạt động');
    const count=Number(data.avoidedWrites||0);
    pushSettingsNotice('settingsOptimizeDO','ok','ĐANG BẬT TỰ ĐỘNG · Đã bỏ qua '+
      count.toLocaleString('vi-VN')+' lượt ghi trùng trong phiên Server hiện tại. Không xóa phòng hoặc dữ liệu. Đây không phải số liệu hóa đơn Cloudflare.');
  }catch(error){
    pushSettingsNotice('settingsOptimizeDO','bad','Chưa xác minh được công cụ trên Server: '+String(error?.message||error));
  }finally{if(button)button.disabled=false;}
});

/* V2.97 — Thành Viên dùng Bộ 42 Nhân Vật game, không dùng thumbnail Artwork */
/* V2.29 — V1 Member management + Ranking + History */
const memberAdminState={members:[],avatars:[],busy:false,loaded:false,tab:'directory',filter:'all',query:'',historyResult:'all',historyLogin:'',sheetMode:'',sheetMember:null,selectedAvatarId:'',characterPreviewTimer:null};

function gmHeaders(extra={}){return {...extra,Authorization:'Bearer '+GMWW_GM_AUTH}}
async function gmApi(path,opts={}){
  const {timeoutMs=10000,...requestOptions}=opts;
  const headers=gmHeaders(requestOptions.headers||{});
  if(requestOptions.body!==undefined&&!headers['content-type'])headers['content-type']='application/json';
  // Image uploads and room preloads are intentionally slower than ordinary API calls.
  const controller=new AbortController(),limit=Math.max(1000,Math.min(90000,Number(timeoutMs)||10000)),timer=setTimeout(()=>controller.abort(),limit);
  try{
    const res=await fetch(GMWW_SERVER_BASE+path,{...requestOptions,headers,cache:'no-store',signal:controller.signal});
    let data={};try{data=await res.json()}catch{}
    if(!res.ok){const err=new Error(data.message||data.error||('HTTP '+res.status));err.status=res.status;err.code=data.error||'';throw err}
    return data;
  }catch(err){
    if(controller.signal.aborted)throw new Error('Server phản hồi quá thời gian chờ. Vui lòng nhấn thử lại; dữ liệu đã lưu không bị xóa.');
    throw err;
  }finally{clearTimeout(timer)}
}
const MEMBER_CHARACTER_COUNT=40;
const MEMBER_ANIMATED_CHARACTER_COUNT=0;
function memberCharacterCatalog(serverRows=[]){
  const source=new Map((Array.isArray(serverRows)?serverRows:[]).map(x=>[String(x?.id||''),x]));
  return Array.from({length:MEMBER_CHARACTER_COUNT},(_,i)=>{
    const n=String(i+1).padStart(2,'0'),id='character-'+n,remote=source.get(id)||{};
    return{id,name:String(remote.name||('Nhân vật '+n)),imageUrl:GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(id)+'/image?rev=c40-2',frameCount:i<MEMBER_ANIMATED_CHARACTER_COUNT?6:1,source:'game-character'};
  });
}
function memberCharacterFrameUrl(id,frame=1){
  const raw=String(id||''),m=raw.match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/),f=Math.max(1,Math.min(6,Number(frame)||1));
  if(!m)return memberAvatarUrl(raw);
  return Number(m[1])<=MEMBER_ANIMATED_CHARACTER_COUNT
    ?GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(raw)+'/frame/'+f
    :GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(raw)+'/image?rev=c40-2';
}
function memberSelectedCharacterId(m){
  const direct=String(m?.gameCharacterId||m?.avatarId||'');
  if(/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(direct))return direct;
  const legacy=String(m?.avatarId||'').match(/^avatar-cut-(\d{3})$/i),n=legacy?Number(legacy[1]):0;
  if(n>=1&&n<=42)return 'character-'+String(n).padStart(2,'0');
  return memberAdminState.avatars[0]?.id||'character-01';
}
function ensureMemberCharacterPreviewStyle(){
  if(document.getElementById('gmwwMemberCharacterPreviewStyle'))return;
  const st=document.createElement('style');st.id='gmwwMemberCharacterPreviewStyle';
  st.textContent='@keyframes gmwwMemberCharacterFloat{from{transform:translateY(1px)}to{transform:translateY(-3px)}}#memberAvatarGrid .member-avatar-choice img{object-fit:contain!important}#memberAvatarGrid .member-avatar-choice img.member-character-static{animation:gmwwMemberCharacterFloat .7s ease-in-out infinite alternate}';
  document.head.appendChild(st);
}
function ensureMemberCharacterPreviewTicker(){
  if(memberAdminState.characterPreviewTimer)return;
  memberAdminState.characterPreviewTimer=setInterval(()=>{
    const frame=(Math.floor(performance.now()/120)%6)+1;
    document.querySelectorAll('#memberAvatarGrid img[data-member-character]').forEach(img=>{
      const id=String(img.dataset.memberCharacter||'');if(!id)return;
      const key=id+':c40-1';if(img.dataset.memberFrame===key)return;
      img.dataset.memberFrame=key;img.src=memberCharacterFrameUrl(id,frame);
    });
  },95);
}
function memberEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
function memberTitleCase(v){return String(v||'').trim().replace(/\s+/g,' ').split(' ').map(w=>w?w.charAt(0).toLocaleUpperCase('vi-VN')+w.slice(1):w).join(' ')}
function memberAvatarUrl(id){const raw=String(id||'');return /^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(raw)?GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(raw)+'/image?rev=c40-2':GMWW_SERVER_BASE+'/api/avatars/'+encodeURIComponent(raw)+'/image?rev=c40-2'}
function memberDate(v,withTime=false){
  if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';
  return d.toLocaleString('vi-VN',withTime?{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit',year:'numeric'});
}
function memberStats(m){const s=m?.stats||{},w=Number(s.wins||0),l=Number(s.losses||0),games=w+l,rate=games?Math.round(w*100/games):0;return{w,l,games,rate}}
// GMWW V3.221: xếp hạng nhiều ván trước, nếu bằng ván mới xét phần trăm thắng.
function gmwwRankMembers(a,b){
  const A=memberStats(a),B=memberStats(b);
  return B.games-A.games
    ||B.w*A.games-A.w*B.games
    ||String(a.displayName||a.loginId||'').localeCompare(String(b.displayName||b.loginId||''),'vi');
}

function setMemberBusy(on){
  memberAdminState.busy=!!on;
  const refresh=document.getElementById('refreshMembers');if(refresh){refresh.disabled=!!on;refresh.classList.toggle('is-busy',!!on)}
  const add=document.getElementById('addMember');if(add)add.disabled=!!on;
}
async function loadMembers(force=false){
  if(memberAdminState.busy)return;
  if(memberAdminState.loaded&&!force){renderMembersAll();return}
  setMemberBusy(true);
  const list=document.getElementById('memberDirectoryList');if(list)list.innerHTML='<div class="member-empty">Đang đồng bộ Thành Viên…</div>';
  try{
    const [dir,characters]=await Promise.all([
      gmApi('/api/gm/members'),
      fetch(GMWW_SERVER_BASE+'/api/game-characters?gm='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.json():({characters:[]})).catch(()=>({characters:[]}))
    ]);
    memberAdminState.members=Array.isArray(dir?.members)?dir.members:[];
    memberAdminState.avatars=memberCharacterCatalog(characters?.characters);
    memberAdminState.loaded=true;
    renderMembersAll();
  }catch(err){
    if(list)list.innerHTML='<div class="member-empty member-error">'+memberEsc(err.message||'Không tải được Thành Viên.')+'</div>';
  }finally{setMemberBusy(false)}
}
function renderMembersAll(){renderMemberSummary();renderMemberDirectory();renderMemberRanking();renderMemberHistory();renderHistoryMemberOptions()}
function renderMemberSummary(){
  const rows=memberAdminState.members,put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
  const online=rows.filter(m=>m.online).length,resets=rows.filter(m=>m.resetRequestedAt).length,games=rows.reduce((n,m)=>n+memberStats(m).games,0);
  put('memberTotal',rows.length);put('memberOnline',online);put('memberResetRequests',resets);put('memberGames',games);
}
function filteredMembers(){
  const q=memberAdminState.query.trim().toLocaleLowerCase('vi'),f=memberAdminState.filter;
  return memberAdminState.members.filter(m=>{
    const hit=!q||String(m.displayName||'').toLocaleLowerCase('vi').includes(q)||String(m.loginId||'').toLowerCase().includes(q);
    const status=f==='all'||(f==='online'&&m.online)||(f==='offline'&&!m.online)||(f==='reset'&&m.resetRequestedAt);
    return hit&&status;
  });
}
function renderMemberDirectory(){
  const box=document.getElementById('memberDirectoryList');if(!box)return;
  const rows=filteredMembers();box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="member-empty">Không có Thành Viên phù hợp.</div>';return}
  for(const m of rows){
    const s=memberStats(m),card=document.createElement('article');card.className='member-card';
    card.innerHTML=
      '<img class="member-avatar" alt="">'+
      '<div class="member-card-main"><div class="member-name-row"><div><b></b><small></small></div><span class="member-status"></span></div>'+
      '<div class="member-meta"><span class="member-room"></span><span>'+s.w+' Thắng</span><span>'+s.l+' Thua</span><span>'+s.rate+'%</span></div>'+
      '<div class="member-flags"></div></div>'+
      '<div class="member-card-actions">'+
      '<button data-act="reset" type="button" aria-label="Đặt lại mật khẩu thành viên" title="Đặt lại mật khẩu">↻</button><button data-act="delete" class="danger-mini" type="button" aria-label="Xóa thành viên" title="Xóa tài khoản">✕</button></div>';
    const img=card.querySelector('.member-avatar');img.src=memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    card.querySelector('.member-card-main b').textContent=m.displayName||m.loginId;
    card.querySelector('.member-card-main small').textContent='@'+m.loginId;
    const status=card.querySelector('.member-status');status.textContent='';status.classList.toggle('online',!!m.online);
    status.setAttribute('aria-label',m.online?'Trực tuyến':'Ngoại tuyến');status.title=m.online?'Trực tuyến':'Ngoại tuyến';
    card.querySelector('.member-room').textContent=m.currentRoomCode?('Phòng '+m.currentRoomCode+(m.ready?' • Sẵn sàng':'')):'Chưa vào phòng';
    const flags=card.querySelector('.member-flags');
    if(m.resetRequestedAt)flags.innerHTML+='<span class="member-flag reset">YÊU CẦU ĐẶT LẠI</span>';
    if(m.source)flags.innerHTML+='<span class="member-flag">'+memberEsc(m.source)+'</span>';
    const bindAction=(btn,handler)=>{if(!btn)return;btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(memberAdminState.busy)return;handler()}};
    bindAction(card.querySelector('[data-act="reset"]'),()=>resetMemberPassword(m));
    bindAction(card.querySelector('[data-act="delete"]'),()=>deleteMember(m));
    // Edit only by double-tap / double-click on the member card body.
    card.ondblclick=e=>{if(e.target.closest('.member-card-actions'))return;if(e.detail>=2&&matchMedia('(pointer:fine)').matches){e.preventDefault();openMemberSheet('edit',m)}};
    let lastTap=0;
    card.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'||e.target.closest('.member-card-actions'))return;const now=Date.now();if(now-lastTap<450){e.preventDefault();lastTap=0;openMemberSheet('edit',m)}else lastTap=now},{passive:false});
    box.appendChild(card);
  }
}
function renderMemberRanking(){
  const box=document.getElementById('memberRankingList');if(!box)return;
  const rows=[...memberAdminState.members].sort(gmwwRankMembers);
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="member-empty">Chưa có dữ liệu xếp hạng.</div>';return}
  rows.forEach((m,i)=>{
    const s=memberStats(m),row=document.createElement('article');row.className='ranking-row'+(i<3?' podium':'');
    row.innerHTML='<div class="rank-no"></div><img class="rank-avatar" alt=""><div class="rank-main"><b></b><small></small></div><div class="rank-stats"><b>'+s.w+'</b><small>Thắng</small></div><div class="rank-stats"><b>'+s.rate+'%</b><small>Tỷ lệ</small></div><div class="rank-stats"><b>'+s.games+'</b><small>Ván</small></div>';
    row.querySelector('.rank-no').textContent=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
    const img=row.querySelector('.rank-avatar');img.src=memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    row.querySelector('.rank-main b').textContent=m.displayName||m.loginId;
    row.querySelector('.rank-main small').textContent=s.l+' Thua'+(m.online?' • Online':'');
    box.appendChild(row);
  });
}
function allHistoryRows(){
  const out=[];
  for(const m of memberAdminState.members){
    for(const h of (Array.isArray(m.history)?m.history:[]))out.push({...h,loginId:m.loginId,displayName:m.displayName||m.loginId,avatarId:m.avatarId,gameCharacterId:m.gameCharacterId});
  }
  return out.sort((a,b)=>(Date.parse(b.playedAt||0)||0)-(Date.parse(a.playedAt||0)||0));
}
function renderHistoryMemberOptions(){
  const sel=document.getElementById('historyMemberFilter');if(!sel)return;
  const value=memberAdminState.historyLogin||'';
  sel.innerHTML='<option value="">Tất cả Thành Viên</option>'+memberAdminState.members.map(m=>'<option value="'+memberEsc(m.loginId)+'">'+memberEsc(m.displayName||m.loginId)+'</option>').join('');
  sel.value=value;
}
function renderMemberHistory(){
  const box=document.getElementById('memberHistoryList');if(!box)return;
  const member=memberAdminState.historyLogin,result=memberAdminState.historyResult;
  const rows=allHistoryRows().filter(h=>(!member||h.loginId===member)&&(result==='all'||h.result===result));
  box.innerHTML='';
  if(!rows.length){box.innerHTML='<div class="member-empty">Chưa có lịch sử chơi phù hợp.</div>';return}
  for(const h of rows){
    const row=document.createElement('article');row.className='history-row';
    const win=h.result==='win';
    row.innerHTML='<img class="history-avatar" alt=""><div class="history-main"><div class="history-title"><b></b><span class="history-result '+(win?'win':'lose')+'">'+(win?'THẮNG':'THUA')+'</span></div><small class="history-sub"></small><small class="history-detail"></small></div><time></time>';
    const img=row.querySelector('.history-avatar');img.src=memberAvatarUrl(h.gameCharacterId||h.avatarId);img.onerror=()=>{img.style.visibility='hidden'};
    row.querySelector('.history-title b').textContent=h.displayName||h.loginId;
    row.querySelector('.history-sub').textContent=[h.roomName||h.gameName||'Ván GMWW',h.roleName||'',h.faction||''].filter(Boolean).join(' • ');
    row.querySelector('.history-detail').textContent=[h.winnerFaction?('Thắng: '+h.winnerFaction):'',h.roomCode?('Phòng '+h.roomCode):''].filter(Boolean).join(' • ');
    row.querySelector('time').textContent=memberDate(h.playedAt,true);
    box.appendChild(row);
  }
}
function switchMemberTab(tab){
  // Trang Thành Viên luôn hiện đủ các nhóm; không còn chia tab ẩn nội dung.
  memberAdminState.tab=tab;
  if(tab==='history')renderMemberHistory();
  if(tab==='ranking')renderMemberRanking();
  const target=document.getElementById(tab==='ranking'?'memberGroupRanking':'memberGroupDirectory');
  if(target&&tab!=='directory')target.scrollIntoView({behavior:'smooth',block:'start'});
}
function openMemberSheet(mode,m=null){
  memberAdminState.sheetMode=mode;memberAdminState.sheetMember=m;
  if(!memberAdminState.avatars.length)memberAdminState.avatars=memberCharacterCatalog();
  memberAdminState.selectedAvatarId=memberSelectedCharacterId(m);
  const sheet=document.getElementById('memberSheet'),title=document.getElementById('memberSheetTitle'),body=document.getElementById('memberSheetBody'),save=document.getElementById('memberSheetSave');
  if(!sheet||!body)return;
  {
    const editing=mode==='edit';
    title.textContent=editing?'Sửa Thành Viên':'Thêm Thành Viên';
    body.innerHTML='<div class="member-form">'+
      '<label>Tên đăng nhập<input id="memberLoginId" '+(editing?'disabled':'')+' value="'+memberEsc(m?.loginId||'')+'" maxlength="20" placeholder="Vui lòng nhập tên đăng nhập" autocomplete="username"></label>'+
      '<label>Tên Hiển Thị<input id="memberDisplayName" value="'+memberEsc(m?.displayName||'')+'" maxlength="24" placeholder="Bạn mong muốn người chơi khác thấy tên gì?" autocomplete="name"></label>'+
      (editing?'':'<div class="member-password-optional"><button class="member-password-toggle" id="memberPasswordToggle" type="button" aria-expanded="false">＋ Đặt mật khẩu cho tài khoản nếu muốn</button><label class="hidden" id="memberPasswordWrap">Mật khẩu<input id="memberPassword" type="password" minlength="4" autocomplete="new-password" placeholder="Tối thiểu 4 ký tự"></label></div>')+
      '<div class="member-avatar-picker"><div class="member-form-label">Nhân Vật</div><div class="member-avatar-library-head"><b>🎭 Bộ 40 Nhân Vật</b><span id="memberAvatarLibraryCount"></span><button type="button" id="memberAvatarRefresh">↻ Đồng bộ Nhân vật</button></div><div class="member-avatar-grid" id="memberAvatarGrid"></div></div></div>';
    renderMemberAvatarPicker();
    if(!editing){const toggle=document.getElementById('memberPasswordToggle'),wrap=document.getElementById('memberPasswordWrap');if(toggle&&wrap)toggle.onclick=()=>{const open=wrap.classList.contains('hidden');wrap.classList.toggle('hidden',!open);toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'− Không đặt mật khẩu':'＋ Đặt mật khẩu cho tài khoản nếu muốn';if(open)setTimeout(()=>document.getElementById('memberPassword')?.focus(),30)}}
    document.getElementById('memberDisplayName')?.addEventListener('blur',e=>{e.target.value=memberTitleCase(e.target.value)});
    document.getElementById('memberAvatarRefresh').onclick=async()=>{
      const btn=document.getElementById('memberAvatarRefresh');btn.disabled=true;btn.textContent='Đang đồng bộ…';
      try{await refreshAvatarLibrary();renderMemberAvatarPicker()}catch(e){alert('Không cập nhật được Bộ Nhân Vật: '+e.message)}
      finally{btn.disabled=false;btn.textContent='↻ Đồng bộ Nhân vật'}
    };
    save.textContent=editing?'LƯU THAY ĐỔI':'TẠO THÀNH VIÊN';
  }
  sheet.classList.remove('hidden');
  refreshAvatarLibrary().then(()=>{memberAdminState.selectedAvatarId=memberSelectedCharacterId(m);renderMemberAvatarPicker()}).catch(err=>console.warn('Bộ Nhân Vật:',err.message));
}
async function refreshAvatarLibrary(){
  const response=await fetch(GMWW_SERVER_BASE+'/api/game-characters?gm='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('Không tải được Bộ Nhân Vật từ server');
  const data=await response.json();
  memberAdminState.avatars=memberCharacterCatalog(data?.characters);
  const count=document.getElementById('memberAvatarLibraryCount');if(count)count.textContent=MEMBER_CHARACTER_COUNT+' nhân vật';
}
function renderMemberAvatarPicker(){
  const box=document.getElementById('memberAvatarGrid');if(!box)return;box.innerHTML='';
  ensureMemberCharacterPreviewStyle();
  const count=document.getElementById('memberAvatarLibraryCount');if(count)count.textContent=MEMBER_CHARACTER_COUNT+' nhân vật';
  for(const a of memberAdminState.avatars){
    const b=document.createElement('button');b.type='button';b.className='member-avatar-choice';b.classList.toggle('selected',String(a.id)===String(memberAdminState.selectedAvatarId));
    b.innerHTML='<img alt=""><small></small>';
    const img=b.querySelector('img'),num=Number(String(a.id).slice(-2));
    img.alt=a.name||a.id;img.src=memberCharacterFrameUrl(a.id,1);
    if(num<=MEMBER_ANIMATED_CHARACTER_COUNT)img.dataset.memberCharacter=a.id;else img.classList.add('member-character-static');
    img.onerror=()=>{img.onerror=null;img.src=memberAvatarUrl(a.id)};
    b.querySelector('small').textContent=a.name||a.id;
    b.onclick=()=>{memberAdminState.selectedAvatarId=a.id;renderMemberAvatarPicker()};box.appendChild(b);
  }
  if(!memberAdminState.avatars.length)box.innerHTML='<div class="member-empty">Không tải được Bộ Nhân Vật.</div>';
  ensureMemberCharacterPreviewTicker();
}
function closeMemberSheet(){
  const s=document.getElementById('memberSheet');if(s)s.classList.add('hidden');
  if(memberAdminState.characterPreviewTimer){clearInterval(memberAdminState.characterPreviewTimer);memberAdminState.characterPreviewTimer=null}
  memberAdminState.sheetMode='';memberAdminState.sheetMember=null;
}
async function saveMemberSheet(){
  const btn=document.getElementById('memberSheetSave');if(btn?.disabled)return;
  const mode=memberAdminState.sheetMode,m=memberAdminState.sheetMember;
  try{
    if(btn){btn.disabled=true;btn.classList.add('is-busy')}
    {
      const loginId=document.getElementById('memberLoginId')?.value.trim()||m?.loginId||'',displayName=memberTitleCase(document.getElementById('memberDisplayName')?.value||''),gameCharacterId=memberAdminState.selectedAvatarId,avatarId=gameCharacterId;
      if(displayName.length<2)throw new Error('Tên Hiển Thị phải có ít nhất 2 ký tự.');
      if(!gameCharacterId)throw new Error('Vui lòng chọn Nhân Vật.');
      if(mode==='edit'){
        await gmApi('/api/gm/members/edit',{method:'POST',body:JSON.stringify({loginId,displayName,avatarId,gameCharacterId})});
      }else{
        const password=document.getElementById('memberPassword')?.value||'';if(password&&password.length<4)throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
        await gmApi('/api/gm/members/create',{method:'POST',body:JSON.stringify({loginId,displayName,avatarId,gameCharacterId,password})});
      }
    }
    closeMemberSheet();memberAdminState.loaded=false;await loadMembers(true);
  }catch(err){alert(err.message||'Không thể lưu Thành Viên.')}
  finally{if(btn){btn.disabled=false;btn.classList.remove('is-busy')}}
}
async function resetMemberPassword(m){
  if(!m)return;
  const yes=window.confirm('Bạn có muốn reset mật khẩu của "'+(m.displayName||m.loginId)+'" về 0000 không?\n\nNhấn OK để xác nhận.');
  if(!yes)return;
  let ok=false;
  try{setMemberBusy(true);await gmApi('/api/gm/members/reset-password',{method:'POST',body:JSON.stringify({loginId:m.loginId})});memberAdminState.loaded=false;ok=true}
  catch(err){alert(err.message||'Không thể reset mật khẩu.')}
  finally{setMemberBusy(false)}
  if(ok){alert('Đã reset mật khẩu về 0000.');await loadMembers(true)}
}
async function resetRanking(){
  if(!confirm('Xếp hạng lại từ đầu?\nThao tác này sẽ đưa Thắng/Thua về 0 và xoá toàn bộ lịch sử cũ của tất cả Thành Viên.'))return;
  try{setMemberBusy(true);await gmApi('/api/gm/members/reset-ranking',{method:'POST'});memberAdminState.loaded=false;setMemberBusy(false);await loadMembers(true);switchMemberTab('ranking')}
  catch(err){alert(err.message||'Không thể xếp hạng lại.')}finally{setMemberBusy(false)}
}
async function clearMemberHistory(){
  if(!confirm('Xoá toàn bộ Lịch Sử?\nThống kê Thắng/Thua hiện tại sẽ được giữ nguyên.'))return;
  try{setMemberBusy(true);await gmApi('/api/gm/members/history',{method:'DELETE'});memberAdminState.loaded=false;setMemberBusy(false);await loadMembers(true);switchMemberTab('history')}
  catch(err){alert(err.message||'Không thể xoá lịch sử.')}finally{setMemberBusy(false)}
}
async function deleteMember(m){
  if(!m)return;
  const yes=window.confirm('Bạn có muốn xoá Thành Viên "'+(m.displayName||m.loginId)+'" không?\n\nNhấn OK để xác nhận.');
  if(!yes)return;
  let ok=false;
  try{setMemberBusy(true);await gmApi('/api/gm/members/'+encodeURIComponent(m.loginId),{method:'DELETE'});memberAdminState.loaded=false;ok=true}
  catch(err){alert(err.message||'Không thể xoá Thành Viên.')}
  finally{setMemberBusy(false)}
  if(ok){alert('Đã xoá Thành Viên.');await loadMembers(true)}
}
const memberTabsEl=document.getElementById('memberTabs');if(memberTabsEl)memberTabsEl.addEventListener('click',e=>{const b=e.target.closest('[data-member-tab]');if(b)switchMemberTab(b.dataset.memberTab)});
const memberSearchEl=document.getElementById('memberSearch');if(memberSearchEl)memberSearchEl.addEventListener('input',()=>{memberAdminState.query=memberSearchEl.value;renderMemberDirectory()});
const memberFilterRow=document.getElementById('memberFilterRow');if(memberFilterRow)memberFilterRow.addEventListener('click',e=>{const b=e.target.closest('[data-member-filter]');if(!b)return;memberAdminState.filter=b.dataset.memberFilter;memberFilterRow.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMemberDirectory()});
const historyResultFilter=document.getElementById('historyResultFilter');if(historyResultFilter)historyResultFilter.addEventListener('click',e=>{const b=e.target.closest('[data-history-result]');if(!b)return;memberAdminState.historyResult=b.dataset.historyResult;historyResultFilter.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderMemberHistory()});
const historyMemberFilter=document.getElementById('historyMemberFilter');if(historyMemberFilter)historyMemberFilter.addEventListener('change',()=>{memberAdminState.historyLogin=historyMemberFilter.value;renderMemberHistory()});
const refreshMembers=document.getElementById('refreshMembers');if(refreshMembers)refreshMembers.addEventListener('click',()=>{memberAdminState.loaded=false;loadMembers(true)});
const addMember=document.getElementById('addMember');if(addMember)addMember.addEventListener('click',()=>openMemberSheet('create'));
const resetRankingBtn=document.getElementById('resetRanking');if(resetRankingBtn)resetRankingBtn.addEventListener('click',resetRanking);
const clearHistoryBtn=document.getElementById('clearHistory');if(clearHistoryBtn)clearHistoryBtn.addEventListener('click',clearMemberHistory);
const memberSheetClose=document.getElementById('memberSheetClose');if(memberSheetClose)memberSheetClose.addEventListener('click',closeMemberSheet);
const memberSheetCancel=document.getElementById('memberSheetCancel');if(memberSheetCancel)memberSheetCancel.addEventListener('click',closeMemberSheet);
const memberSheetSave=document.getElementById('memberSheetSave');if(memberSheetSave)memberSheetSave.addEventListener('click',saveMemberSheet);
const memberSheet=document.getElementById('memberSheet');if(memberSheet)memberSheet.addEventListener('click',e=>{if(e.target===memberSheet)closeMemberSheet()});
document.querySelectorAll('[data-page="members"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>loadMembers(false),40)));

/* V3.36 — Trang Chủ: cảm hứng bố cục V1, tất cả số liệu dựa trên máy chủ thật. */
let gmwwHomeBusy=false,gmwwHomeLastLoaded=0,gmwwHomeAllRecent=false,gmwwHomeCachedRows=[];
function gmwwHomeText(id,text){
  const node=document.getElementById(id);
  if(node)node.textContent=String(text??'—');
}

function gmwwHomeTop3Ranked(rows){
  return (Array.isArray(rows)?rows:[]).filter(member=>{
    const stats=memberStats(member);
    return stats.games>0&&stats.w>=0&&stats.l>=0&&Number.isFinite(stats.games);
  }).sort(gmwwRankMembers).slice(0,3);
}
function gmwwHomeRenderTop3(rows){
  const target=document.getElementById('gmwwHomeTop3');
  const status=document.getElementById('gmwwHomeTop3Status');
  if(!target)return;
  target.replaceChildren();
  const best=gmwwHomeTop3Ranked(rows);
  if(status){
    status.hidden=best.length>0;
    status.textContent=!Array.isArray(rows)?'Không tải được xếp hạng. Nhấn làm mới để thử lại.'
      :'Chưa có người chơi hoàn tất ván để xếp hạng.';
  }
  // Không dựng bục hay dùng ảnh mẫu: Character thực tế theo gameCharacterId của hồ sơ.
  // Thứ tự Top 3 là 02–01–03; giữ nguyên phép tính tỷ lệ từ Server.
  for(const index of [1,0,2]){
    const member=best[index];
    if(!member)continue;
    const stats=memberStats(member),place=index+1,rate=Math.round(100*stats.w/stats.games);
    const button=document.createElement('button');
    button.type='button';button.className='gmww-home-top3-card-v377 gmww-home-top3-sea-v3219';
    button.dataset.rank=String(place);
    button.setAttribute('aria-label','Hạng '+place+': '+String(member.displayName||member.loginId||'Thành viên')+', '+rate+' phần trăm thắng, '+stats.w+' thắng trong '+stats.games+' ván. Mở xếp hạng.');
    const stage=document.createElement('span');stage.className='gmww-home-top3-stage-v3219';
    const glow=document.createElement('span');glow.className='gmww-home-top3-halo-v3219';glow.setAttribute('aria-hidden','true');
    const character=document.createElement('span');character.className='gmww-home-top3-character-v3219';
    const characterId=String(member.gameCharacterId||'').trim();
    // Cùng endpoint ảnh Character Idle C40 với làng; không fallback sang avatarId cũ.
    if(/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(characterId)){
      const image=document.createElement('img');
      image.src=GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(characterId)+'/image?rev=c40-4';
      image.alt='';image.loading='lazy';image.decoding='async';
      image.dataset.memberCharacterId=characterId;
      image.onerror=()=>{image.remove();character.textContent='✦';character.classList.add('gmww-home-character-unavailable-v3219')};
      character.append(image);
    }else{
      character.textContent='✦';
      character.classList.add('gmww-home-character-unavailable-v3219');
    }
    stage.setAttribute('aria-hidden','true');stage.append(glow,character);
    const details=document.createElement('span');details.className='gmww-home-top3-glass-v3219';
    const badge=document.createElement('span');badge.className='gmww-home-top3-rank-v377';badge.textContent='HẠNG '+String(place).padStart(2,'0');
    const name=document.createElement('strong');name.className='gmww-home-top3-name-v377';
    name.textContent=String(member.displayName||member.loginId||'Thành viên');
    const percent=document.createElement('span');percent.className='gmww-home-top3-percent-v377';percent.textContent=rate+'%';
    const percentLabel=document.createElement('span');percentLabel.className='gmww-home-top3-percent-label-v377';percentLabel.textContent='TỶ LỆ THẮNG';
    const meter=document.createElement('span');meter.className='gmww-home-top3-meter-v377';
    const fill=document.createElement('span');fill.style.width=Math.max(0,Math.min(100,rate))+'%';meter.append(fill);
    const record=document.createElement('small');record.className='gmww-home-top3-record-v377';
    record.textContent=stats.w+' thắng / '+stats.games+' ván';
    details.append(badge,name,percent,percentLabel,meter,record);
    button.append(stage,details);
    button.addEventListener('click',()=>gmwwHomeOpenMemberRanking());
    target.append(button);
  }
}
function gmwwHomeOpenMemberRanking(){
  const section=document.getElementById('memberGroupRanking');
  if(section)section.open=true;
  gmwwHomeNavigate('members');
}

function gmwwHomeRenderExtras(rows,ranking,leader){
  const totalLeader=document.getElementById('gmwwHomeLeaderWins');
  if(totalLeader)totalLeader.textContent=leader?String(memberStats(leader).w):'—';
  const label=document.getElementById('gmwwHomeLeaderboard');
  if(label)label.textContent=leader?String(leader.displayName||leader.loginId||'Thành viên'):'Chưa xếp hạng';
  const target=document.getElementById('gmwwHomeRecentRows');
  const status=document.getElementById('gmwwHomeRecentResult');
  if(!target)return;
  target.replaceChildren();
  gmwwHomeCachedRows=rows;
  const recent=rows.flatMap(m=>(Array.isArray(m.history)?m.history:[]).map(h=>({...h,member:m})))
    .filter(h=>Number.isFinite(Date.parse(h.playedAt||'')))
    .sort((a,b)=>Date.parse(b.playedAt)-Date.parse(a.playedAt)).slice(0,gmwwHomeAllRecent?50:3);
  const more=document.getElementById('gmwwHomeOpenRanking');if(more)more.textContent=gmwwHomeAllRecent?'Thu gọn ❮':'Xem tất cả ❯';
  if(status)status.hidden=recent.length>0;
  const ago=t=>{
    const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(t))/60000));
    if(minutes<60)return minutes+' phút trước';
    const hours=Math.floor(minutes/60);
    if(hours<24)return hours+' giờ trước';
    return Math.floor(hours/24)+' ngày trước';
  };
  for(const h of recent){
    const button=document.createElement('button');
    button.type='button';button.className='gmww-home-recent-row';button.dataset.result=h.result==='win'?'win':h.result==='loss'?'loss':'played';
    button.setAttribute('aria-label','Mở Thành Viên: '+String(h.member.displayName||h.member.loginId||''));
    const avatar=document.createElement('div');avatar.className='gmww-home-recent-avatar';
    const avatarId=String(h.member.gameCharacterId||h.member.avatarId||'');
    if(/^(?:character-(?:0[1-9]|[1-3][0-9]|4[0-2])|avatar-[A-Za-z0-9_-]+)$/.test(avatarId)){
      const image=document.createElement('img');image.src=memberAvatarUrl(avatarId);image.alt='';image.loading='lazy';
      image.onerror=()=>{image.remove();avatar.textContent='♟'};
      avatar.append(image);
    }else avatar.textContent='♟';
    const name=document.createElement('b');name.textContent=String(h.member.displayName||h.member.loginId||'Thành viên');
    const action=document.createElement('span');action.textContent=h.result==='win'?'Đã thắng một ván':h.result==='loss'?'Đã kết thúc ván':'Tham gia ván chơi';
    const time=document.createElement('small');time.textContent=ago(h.playedAt);
    const arrow=document.createElement('i');arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
    const marker=document.createElement('span');marker.className='gmww-home-recent-marker-v377';marker.textContent=h.result==='win'?'✦':h.result==='loss'?'·':'◦';marker.setAttribute('aria-hidden','true');
    button.append(marker,avatar,name,action,time,arrow);
    button.addEventListener('click',()=>gmwwHomeNavigate('members'));
    target.append(button);
  }
}

function gmwwHomeRenderMembers(rows){
  if(!Array.isArray(rows))return;
  gmwwHomeRenderTop3(rows);
  gmwwHomeText('gmwwHomeMemberCount',rows.length);
  gmwwHomeText('gmwwHomeOnlineCount',rows.filter(m=>m?.online).length);
  const played=rows.reduce((sum,m)=>sum+memberStats(m).games,0);
  const matches=new Set(rows.flatMap(m=>Array.isArray(m.history)?m.history:[]).map(h=>String(h.matchId||'')).filter(Boolean));
  gmwwHomeText('gmwwHomePlaysCount',matches.size||played);
  const ranking=[...rows].sort(gmwwRankMembers);
  const leader=ranking.find(m=>memberStats(m).games>0);
  gmwwHomeText('gmwwHomeLeaderboard',leader
    ?'Dẫn đầu: '+String(leader.displayName||leader.loginId||'Thành viên')+' · '+memberStats(leader).games+' ván · '+memberStats(leader).rate+'% thắng'
    :'Chưa có kết quả để xếp hạng.');
  const last=rows.flatMap(m=>(Array.isArray(m.history)?m.history:[]).map(h=>({...h,memberName:m.displayName||m.loginId})))
    .filter(h=>Number.isFinite(Date.parse(h.playedAt||'')))
    .sort((a,b)=>Date.parse(b.playedAt)-Date.parse(a.playedAt))[0];
  gmwwHomeText('gmwwHomeRecentResult',last
    ?String(last.memberName||'Thành viên')+' · '+(last.result==='win'?'Thắng':last.result==='loss'?'Thua':'Đã tham gia')+' · '+memberDate(last.playedAt,true)
    :'Chưa có lịch sử ván được ghi nhận.');  gmwwHomeRenderExtras(rows,ranking,leader);
}

async function gmwwHomeRefresh(force=false){
  const home=document.getElementById('home');
  if(!home||gmwwHomeBusy||(!force&&gmwwHomeLastLoaded&&Date.now()-gmwwHomeLastLoaded<60000))return;
  gmwwHomeBusy=true;
  const badge=document.getElementById('gmwwHomeServerState');
  if(badge){badge.dataset.status='checking';const label=badge.querySelector('span');if(label)label.textContent='Đang kết nối'}
  gmwwHomeText('gmwwHomeVersion','GMWW V'+VERSION);
  try{
    const [health,members]=await Promise.allSettled([
      fetch(GMWW_SERVER_BASE+'/api/health?home='+Date.now(),{cache:'no-store'})
        .then(async r=>{const data=await r.json();if(!r.ok||data.ok!==true)throw new Error('Server không phản hồi');return data}),
      gmApi('/api/gm/members')
    ]);
    if(badge){const ok=health.status==='fulfilled';badge.dataset.status=ok?'online':'offline';
      const label=badge.querySelector('span');if(label)label.textContent=ok?'Server kết nối':'Mất kết nối'}
    if(members.status==='fulfilled'&&Array.isArray(members.value?.members))
      gmwwHomeRenderMembers(members.value.members);
    else{
      gmwwHomeRenderTop3(null);
      gmwwHomeText('gmwwHomeMemberCount','—');
      gmwwHomeText('gmwwHomeOnlineCount','—');
      gmwwHomeText('gmwwHomePlaysCount','—');
      gmwwHomeText('gmwwHomeLeaderboard','Chưa kết nối được dữ liệu thành viên.');
      gmwwHomeText('gmwwHomeLeaderWins','—');
      document.getElementById('gmwwHomeRecentRows')?.replaceChildren();
      const msg=document.getElementById('gmwwHomeRecentResult');if(msg)msg.hidden=false;
      gmwwHomeText('gmwwHomeRecentResult','Không tải được lịch sử. Nhấn Làm mới để thử lại.');
    }
    gmwwHomeLastLoaded=Date.now();
  }finally{gmwwHomeBusy=false}
}
function gmwwHomeNavigate(target){
  if(!['start','members','library','settings'].includes(target))return;
  const nav=document.querySelector('#bottomNav .nav[data-page="'+target+'"]');
  if(nav)nav.click();
}
document.getElementById('gmwwHomeEnterVillage')?.addEventListener('click',()=>gmwwHomeNavigate('start'));
document.querySelectorAll('[data-home-destination]').forEach(button=>button.addEventListener('click',()=>{gmwwHomeNavigate(button.dataset.homeDestination);const tab=button.dataset.homeLibraryTab;if(tab&&button.dataset.homeDestination==='library')document.querySelector('#library .libtab[data-lib="'+tab+'"]')?.click()}));
document.getElementById('gmwwHomeOpenRanking')?.addEventListener('click',()=>{
  gmwwHomeAllRecent=!gmwwHomeAllRecent;
  if(gmwwHomeCachedRows.length)gmwwHomeRenderMembers(gmwwHomeCachedRows);
});
document.getElementById('gmwwHomeTop3Ranking')?.addEventListener('click',gmwwHomeOpenMemberRanking);
document.getElementById('gmwwHomeRefresh')?.addEventListener('click',()=>gmwwHomeRefresh(true));
document.querySelectorAll('#bottomNav .nav[data-page="home"]').forEach(el=>el.addEventListener('click',()=>setTimeout(()=>gmwwHomeRefresh(false),35)));
setTimeout(()=>{if(document.getElementById('home')?.classList.contains('active'))gmwwHomeRefresh()},150);



/* GMWW V2.57 — immersive 2D village GM flow */
const GMWW_PLAY_SCENE_KEY='GMWW_V264_PLAY_SCENE';
const GMWW_OLD_PLAY_SCENE_KEYS=['GMWW_V263_PLAY_SCENE','GMWW_V257_PLAY_SCENE','GMWW_V256_PLAY_SCENE','GMWW_V255_PLAY_SCENE','GMWW_V250_PLAY_SCENE','GMWW_V247_PLAY_SCENE','GMWW_V246_PLAY_SCENE'];
const PLAY_STEPS=['lobby','seats','game','roles','deal','battle'];
let playGatherToolsDismissed=false;
let playSeatPresetOpen=false;
const PLAY_STEP_COPY={
  lobby:{k:'SẢNH CHỜ',t:'Tập Hợp',x:'Mọi người tập trung tại làng. Nhấn Tiếp tục để vào Tập Hợp; hệ thống tự kết nối phòng.',a:'TẬP HỢP'},
  room:{k:'TẠO PHÒNG',t:'Tạo Phòng',x:'Chọn ONLINE hoặc OFFLINE rồi tạo Phòng.',a:'TẠO PHÒNG'},
  game:{k:'CHỌN VÁN MẪU',t:'Chọn Ván Mẫu',x:'Server chuẩn bị sẵn cấu hình Ván Mẫu; Player Web chưa nhận Vai Trò.',a:'CHỌN VÁN MẪU'},
  seats:{k:'TẬP HỢP DÂN LÀNG',t:'Tập Hợp Dân Làng',x:'Gọi thành viên vào làng, sắp ngẫu nhiên ưu tiên 8 vị trí vòng trong hoặc GM bố trí thủ công.',a:'CHỐT VỊ TRÍ'},
  roles:{k:'PHÂN VAI',t:'Phân Vai',x:'Vai Trò và Artifact được phân nội bộ, chưa gửi xuống Player Web.',a:'PHÂN VAI'},
  deal:{k:'PHÁT VAI',t:'Phát Vai',x:'Chỉ tại bước này Server mới gửi Vai Trò/Artifact riêng xuống Player Web.',a:'PHÁT VAI'},
  battle:{k:'VÀO TRẬN',t:'Vào Trận',x:'Tiếp tục điều khiển toàn bộ trận ngay trong Làng 2D.',a:'BẮT ĐẦU ĐÊM 1'}
};
let playSceneState=(()=>{
  const base={step:'lobby',lobbyGeneration:0,roomMode:'online',roomEnabled:false,seatMoveMode:'instant',seatCount:24,autoGM:true,phase:'lobby',night:0,artifactCount:0,roomCode:'—',gmToken:'',selectedMemberIds:[],activePlayerId:'',roleId:'',artifactId:'',rolePlan:{},roleDurations:{},assignmentsPreview:[],gameName:'Ván GMWW',gameTemplateId:'',gameTiming:{villageDiscussionSec:300,gallowsNominationSec:10,gallowsVoteSec:10,wolfDiscussionSec:30,earlyArtifactSec:30,defaultActionSec:30,artifactActionSec:30,autoAdvance:true},artifactLimitPerCycle:3,matchId:'',artifactsEnabled:false};
  try{let raw=localStorage.getItem(GMWW_PLAY_SCENE_KEY),migratedFrom='';if(!raw)for(const key of GMWW_OLD_PLAY_SCENE_KEYS){raw=localStorage.getItem(key);if(raw){migratedFrom=key;break}}const saved=Object.assign(base,JSON.parse(raw||'{}'));saved.roomMode=saved.roomMode==='online'?'online':'offline';saved.roomEnabled=saved.roomEnabled===true;saved.seatMoveMode=saved.seatMoveMode==='walk'?'walk':'instant';saved.seatCount=Math.max(1,Math.min(30,Number(saved.seatCount)||12));if(saved.step==='members')saved.step='seats';if(saved.step==='room')saved.step='lobby';saved.lobbyGeneration=Math.max(0,Number(saved.lobbyGeneration||0));if(migratedFrom){saved.roomCode='—';saved.gmToken='';saved.roomEnabled=false;saved.selectedMemberIds=[];saved.assignmentsPreview=[];saved.activePlayerId='';saved.roleId='';saved.artifactId='';saved.matchId='';saved.gameTemplateId='';saved.rolePlan={};saved.roleDurations={};saved.step='lobby';saved.phase='lobby';saved.night=0;saved.artifactCount=0}if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(saved.roomCode||''))&&!['lobby','room'].includes(saved.step))saved.step='lobby';if(['lobby','room'].includes(saved.step)&&!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(saved.roomCode||''))){saved.roomCode='—';saved.gmToken='';saved.selectedMemberIds=[];saved.activePlayerId=''}return saved}catch{return base}
})();
const playSceneRuntime={room:null,players:[],assignments:[],battleActionUsage:[],gameConfig:null,gameTemplates:[],artifactCycle:{count:0,max:3},nightRuntime:null,battleUndo:null,winProposal:null,activeEffects:[],selectedWinnerFaction:'',busy:false,pollTimer:0,villagePollTimer:0,moveTicker:0,autoTurnTimer:0,autoTurnKey:'',roomSyncTimer:0,syncSerial:0,lastSyncAt:0,lastError:'',serverClockOffsetMs:0,socket:null,socketRoomCode:'',socketReconnect:0,setupPopupStep:'',setupPopupClosed:false};
function savePlayScene(){try{localStorage.setItem(GMWW_PLAY_SCENE_KEY,JSON.stringify(playSceneState))}catch{}}
function isLivePlayRoom(){return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(playSceneState.roomCode||''))}
function playLiveMembers(){
  if(Array.isArray(playSceneRuntime.players)&&playSceneRuntime.players.length)return playSceneRuntime.players.filter(p=>p?.kind==='member');
  const rows=Array.isArray(memberAdminState?.members)?memberAdminState.members:[],wanted=new Set((playSceneState.selectedMemberIds||[]).map(String));
  if(wanted.size)return rows.filter(m=>wanted.has(String(m.loginId)));
  return [];
}
function playVillageMembers(){
  const live=playLiveMembers(),onlineSelection=!isLivePlayRoom()&&playSceneState.roomMode==='online',byId=new Map(onlineSelection?[]:live.map(m=>[String(m.loginId),m]));
  if(onlineSelection){
    const liveById=new Map(live.map(m=>[String(m.loginId),m]));
    for(const m of (memberAdminState.members||[]).filter(x=>x?.online&&x?.loginId&&!x.currentRoomCode)){
      const id=String(m.loginId),old=liveById.get(id)||{};
      byId.set(id,{...m,...old,kind:'member',loginId:id,online:true});
    }
    for(const m of live){
      const id=String(m?.loginId||String(m?.participantId||'').replace(/^member:/,''));
      if(id&&!byId.has(id))byId.set(id,{...m,kind:'member',loginId:id,online:true});
    }
  }
  return [...byId.values()];
}
function playRoamPoint(id){const p=globalThis.GMWW_VILLAGE_LAYOUT.spawn('member:'+id);return[p.x,p.y]}
function playMapDisplay(x,y){const world=document.getElementById('playWorld'),p=globalThis.GMWW_VILLAGE_LAYOUT.toScreen({x,y},world?.clientWidth||864,world?.clientHeight||1536);return[p.x,p.y]}
// V3.113 · Danh mục trạng thái. Ba mục đầu dùng luồng cũ (frozen/expelled/dead); các mục còn lại gửi type "status" + statusId.
const STATUS_UI={
  expelled:{label:'Bị đuổi khỏi làng',icon:'↗',blocks:true,chip:'Đuổi',legacy:true,duration:'Đến đêm sau'},
  frozen:{label:'Bị đóng băng',icon:'❄',blocks:true,chip:'Đóng băng',legacy:true,duration:'Đến sáng sau'},
  dead:{label:'Bị chết',icon:'✕',blocks:true,chip:'Chết',legacy:true,duration:'Đến khi Hồi Sinh'},
  wolf_bitten:{label:'Bị sói cắn',icon:'🐺',blocks:false,chip:'Sói cắn',duration:'Đến sáng sau'},
  marked:{label:'Bị đánh dấu',icon:'🎯',blocks:false,chip:'Đánh dấu',duration:'Đến sáng sau'},
  infected:{label:'Bị nhiễm bệnh',icon:'🦠',blocks:false,chip:'Nhiễm bệnh',duration:'Đến khi gỡ'},
  mute:{label:'Bị câm',icon:'🤐',blocks:false,chip:'Câm',duration:'Đến khi gỡ'},
  vote_ban:{label:'Artifact cấm bỏ phiếu',icon:'🎴',blocks:false,chip:'Cấm Vote',duration:'Đến hết ngày'},
  disabled_permanent:{label:'Mất năng lực vĩnh viễn',icon:'⛔',blocks:true,chip:'Vĩnh viễn',duration:'Đến khi gỡ'},
  disabled_2n:{label:'Mất năng lực 2 đêm',icon:'⏳',blocks:true,chip:'2 đêm',duration:'2 đêm'}
};
const STATUS_CHIP_IDS=['wolf_bitten','marked','infected','mute','disabled_permanent','disabled_2n'];
function playPlayerStatuses(loginId){
  const now=playNow(),id=String(loginId||''),out=[];
  for(const x of (playSceneRuntime.activeEffects||[])){
    if(String(x?.loginId||'')!==id||x?.effectActive===false||x?.type!=='status')continue;
    if(x.expiresAt&&Date.parse(x.expiresAt)<=now)continue;
    const d=STATUS_UI[x.statusId];if(d&&!d.legacy)out.push({statusId:x.statusId,label:d.label,icon:d.icon,blocks:d.blocks,chip:d.chip});
  }
  return out;
}
function playPlayerBlocked(loginId){return ['dead','frozen','expelled'].includes(playPlayerEffect(loginId))||playPlayerStatuses(loginId).some(x=>x.blocks)}
function playBlockReason(loginId){const e=playPlayerEffect(loginId);if(e==='dead')return'Người thực hiện đã chết.';if(e==='frozen')return'Người thực hiện đang bị Đóng băng.';if(e==='expelled')return'Người thực hiện đã bị Đuổi khỏi làng.';const st=playPlayerStatuses(loginId).find(x=>x.blocks);return st?'Người thực hiện đang: '+st.label+'.':'Người thực hiện không thể hành động.'}
function playPlayerEffect(loginId){
  const now=playNow(),rows=(playSceneRuntime.activeEffects||[]).filter(x=>String(x?.loginId||'')===String(loginId||'')&&x?.effectActive!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>now)),types=new Set(rows.map(x=>String(x?.type||'')));
  if(types.has('dead'))return'dead';if(types.has('frozen'))return'frozen';if(types.has('expelled'))return'expelled';return'alive'
}
function playDeliveryLabel(member){
  const a=(playSceneRuntime.assignments||[]).find(x=>String(x?.loginId||'')===String(member?.loginId||''));if(!member?.online)return'MẤT KẾT NỐI';if(!a)return playSceneState.step==='deal'||playSceneState.step==='battle'?'CHƯA PHÁT':(member?.ready?'SẴN SÀNG':'ONLINE');
  if(!a.receivedAt)return'ĐANG NHẬN VAI';if(a.viewedAt&&(!a.artifactId||a.artifactViewedAt))return'ĐÃ XEM';if(a.viewedAt&&a.artifactId)return'ĐÃ XEM VAI';return'ĐÃ NHẬN'
}
function playDeliveryProgress(){
  // Only server-confirmed deliveries and per-player view acknowledgements count.
  const assignments=Array.isArray(playSceneRuntime.assignments)?playSceneRuntime.assignments:[];
  const preview=Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[];
  const members=playLiveMembers();
  const expected=new Set([...members,...preview].map(p=>String(p?.loginId||'')).filter(Boolean));
  const delivered=new Set(assignments.filter(a=>a?.loginId&&a?.roleId&&a?.deliveredAt).map(a=>String(a.loginId)));
  const received=new Set(assignments.filter(a=>a?.loginId&&a?.roleId&&a?.deliveredAt&&a?.receivedAt).map(a=>String(a.loginId)));
  const viewed=new Set(assignments.filter(a=>a?.loginId&&a?.roleId&&a?.deliveredAt&&a?.viewedAt).map(a=>String(a.loginId)));
  const total=Math.max(expected.size,delivered.size);
  const serverConfirmed=!!playSceneRuntime.room?.roleDeliveredAt&&['role_delivery','running','started','game','playing'].includes(String(playSceneRuntime.room?.phase||'').toLowerCase());
  return{total,delivered:delivered.size,received:received.size,viewed:viewed.size,success:serverConfirmed&&total>0&&delivered.size===total};
}
function renderPlayDeliveryProgress(){
  // Delivery receipt belongs in the existing bottom-center action, not a floating overlay.
  const dock=document.getElementById('playPhasePill'),title=document.getElementById('playPhaseTitle'),hint=document.getElementById('playPhaseHint');
  if(!dock||!title||!hint)return;
  const p=playDeliveryProgress(),confirmed=playSceneState.step==='deal'&&p.success;
  const allReceived=confirmed&&p.received===p.total;
  dock.classList.toggle('is-delivery-confirmed',allReceived);
  if(confirmed){
    title.textContent=allReceived?'✓ ĐÃ PHÁT VAI THÀNH CÔNG '+p.received+'/'+p.total:'ĐÃ PHÁT '+p.delivered+'/'+p.total+' · CHỜ NHẬN '+p.received+'/'+p.total;
    hint.textContent='Đã nhận đủ: '+p.received+'/'+p.total+' · Đã xem Vai Trò: '+p.viewed+'/'+p.total+' · Vào Trận';
    dock.setAttribute('aria-label','Đã phát '+p.delivered+'/'+p.total+', đã nhận đủ '+p.received+'/'+p.total+', đã xem '+p.viewed+'/'+p.total+'. Chạm để Vào Trận');
  }else hint.textContent='CHẠM ĐỂ TIẾP';
}
async function applyPlayPlayerState(type){
  if(playSceneState.step!=='battle'){playFlashError('Chỉ được thực hiện tác động sau khi vào trận.');return false}
  const loginId=String(playSceneState.activePlayerId||'');if(!loginId){playFlashError('Hãy chọn Người Chơi trên sân trước.');return false}
  if(String(type).startsWith('status:')){
    const statusId=String(type).slice(7),active=!playPlayerStatuses(loginId).some(x=>x.statusId===statusId);
    playSetBusy(true);try{await playRoomApi('/interaction',{method:'POST',body:JSON.stringify({loginId,type:'status',statusId,active,matchId:playSceneRuntime.room?.matchId||playSceneState.matchId||'',cycleKey:playSceneRuntime.room?.cycleKey||''})});await playSyncRoom(true);return true}
    catch(err){playFlashError(err.message);return false}finally{playSetBusy(false)}
  }
  const member=playLiveMembers().find(x=>String(x?.loginId||'')===loginId),label=member?.displayName||loginId;
  const question=type==='dead'?'Giết '+label+' ngay lập tức?':type==='revive'?'Hồi Sinh '+label+' ngay lập tức?':type==='expelled'?'Đuổi '+label+' khỏi làng?':'';
  if(question&&!confirm(question))return false;
  playSetBusy(true);try{
    await playRoomApi('/interaction',{method:'POST',body:JSON.stringify({loginId,type,matchId:playSceneRuntime.room?.matchId||playSceneState.matchId||'',night:Number(playSceneState.night||0),cycleKey:playSceneRuntime.room?.cycleKey||''})});await playSyncRoom(true);return true
  }catch(err){playFlashError(err.message);return false}finally{playSetBusy(false)}
}
const GMWW_STATUS_DISPLAY_DRAFT_KEY='gmww-status-display-draft-v3126';
function playStatusDisplayDraft(){
  try{const value=JSON.parse(localStorage.getItem(GMWW_STATUS_DISPLAY_DRAFT_KEY)||'{}');
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
  catch{return{}}
}
function playStoreStatusDisplayDraft(value){
  try{localStorage.setItem(GMWW_STATUS_DISPLAY_DRAFT_KEY,JSON.stringify(value))}catch{}
}
async function playSyncStatusDisplayDraft(){
  if(!isLivePlayRoom())return;
  const draft=playStatusDisplayDraft(),visuals=globalThis.GMWW_STATUS_VISUALS;
  const items=Object.entries(draft).filter(([id,v])=>visuals?.byId[id]&&typeof v==='boolean')
    .map(([statusId,visible])=>({statusId,visible}));
  if(!items.length)return;
  // One authorized, atomic settings update; never expose private targets by default.
  const answer=await playRoomApi('/interaction',{method:'POST',
    body:JSON.stringify({type:'status_display_batch',items})});
  if(answer?.ok!==true)throw new Error(answer?.message||answer?.error||'STATUS_DRAFT_SYNC_FAILED');
  if(playSceneRuntime.room)playSceneRuntime.room.statusDisplay=answer.statusDisplay||{};
  try{localStorage.removeItem(GMWW_STATUS_DISPLAY_DRAFT_KEY)}catch{}
}
function renderStatusLibrary(){
  const grid=document.getElementById('statusLibraryGrid'),visuals=globalThis.GMWW_STATUS_VISUALS;if(!grid||!visuals)return;
  const display=playSceneRuntime.room?.statusDisplay||{},isLive=isLivePlayRoom(),draft=playStatusDisplayDraft();
  const previewMember={gameCharacterId:'character-01'},avatarSrc=playCharacterVisualUrl(previewMember,1,'right');
  grid.classList.add('gmww-sv-library');
  grid.innerHTML=visuals.entries.map((item,index)=>{
    const id=item.id,defaultVisible=item.playerWeb===true&&['frozen','expelled','dead'].includes(id);
    const visible=Object.prototype.hasOwnProperty.call(draft,id)?draft[id]===true:
      Object.prototype.hasOwnProperty.call(display,id)?display[id]===true:defaultVisible;
    const instant=item.type==='instant';
    return '<article class="status-card" data-status-preview="'+visuals.safe(id)+'"><div class="status-card-header"><span class="status-card-icon" aria-hidden="true">'+item.icon+'</span><div class="status-card-copy"><h3>'+visuals.safe(item.name)+'</h3></div><span class="status-card-index">'+String(index+1).padStart(2,'0')+'/'+visuals.entries.length+'</span></div>'+
      '<div class="gmww-sv-preview"><span class="gmww-sv-target gmww-sv-stage"><img class="gmww-sv-avatar" alt="" src="'+visuals.safe(avatarSrc)+'">'+visuals.overlay([id])+'</span></div>'+
      '<small>'+visuals.safe(item.description)+'</small><span class="gmww-sv-preview-note">'+(instant?'Hiệu ứng tức thời · Preview chạy lặp':'Trạng thái duy trì · Chỉ gỡ khi dữ liệu thay đổi')+'</span>'+
      '<label class="status-card-toggle"><span>Hiển thị Player Web</span><input type="checkbox" data-status-display="'+visuals.safe(id)+'"'+(visible?' checked':'')+' aria-label="Hiển thị '+visuals.safe(item.name)+' trên Player Web"></label></article>';
  }).join('');
  grid.querySelectorAll('[data-status-display]').forEach(input=>input.onchange=async()=>{
    const id=input.dataset.statusDisplay,value=input.checked;
    if(!isLivePlayRoom()){
      playStoreStatusDisplayDraft({...playStatusDisplayDraft(),[id]:value});
      input.title='Đã lưu lựa chọn; tự đồng bộ khi kết nối Phòng Online';
      return;
    }
    input.disabled=true;
    try{
      const result=await playRoomApi('/interaction',{method:'POST',
        body:JSON.stringify({type:'status_display',statusId:id,visible:value})});
      if(result?.ok!==true)throw new Error(result?.message||result?.error||'Không lưu được');
      if(playSceneRuntime.room)playSceneRuntime.room.statusDisplay=result.statusDisplay||{};
      const d=playStatusDisplayDraft();
      if(Object.prototype.hasOwnProperty.call(d,id)){delete d[id];playStoreStatusDisplayDraft(d)}
    }catch(err){playFlashError(err.message);input.checked=!value}
    finally{input.disabled=false}
  });
}
document.querySelector('[data-lib="statuses"]')?.addEventListener('click',()=>setTimeout(renderStatusLibrary,0));
function bindPlayPlayerStateActions(){
  document.querySelectorAll('[data-play-player-state]').forEach(b=>b.onclick=()=>applyPlayPlayerState(String(b.dataset.playPlayerState||'')))
}
function closePlayGMSheet(){document.getElementById('playGMSheet')?.classList.add('hidden')}
function openPlayGMSheet(){
  // Only the shared in-match GM menu is available. No interventions in Setup.
  if(playSceneState.step!=='battle')return;
  battleToggleWolfMenu();
}
function setPlayRealtimeState(state='idle'){
  const btn=document.getElementById('playRefreshServer');if(!btn)return;
  btn.classList.toggle('is-live',state==='live');btn.classList.toggle('is-reconnecting',state==='connecting');btn.classList.toggle('is-offline',state==='offline');
  btn.dataset.realtimeState=state;
  const label=state==='live'?'Realtime đang kết nối':state==='connecting'?'Đang kết nối realtime':'Realtime mất kết nối';
  btn.setAttribute('aria-label',label);btn.title=label;
}
function playAudioMuted(){try{return localStorage.getItem(PLAY_AUDIO_MUTED_KEY)==='1'}catch{return false}}

// Battle audio must be tied to a real action or wake-up event, not just a
// library Preview button. IndexedDB tracks user-supplied audio per category.
const battleAudioReady=new Map(),battleAudioLoading=new Map();
let battleActiveAudio=null,battleAudioLast={key:'',at:0,turn:''},battleAudioRequestId=0;
function battleInvalidateAudioCache(kind,id){
  const key=String(kind||'')+':'+String(id||''),url=battleAudioReady.get(key);
  if(String(url||'').startsWith('blob:'))try{URL.revokeObjectURL(url)}catch{}
  battleAudioReady.delete(key);battleAudioLoading.delete(key);
}
function battleFindAudioCandidates(kind,targetId,name){
  const list=Array.isArray(state?.audio?.[kind])?state.audio[kind]:[];
  // Audio IDs are authoritative. Never guess a clip by a shared label:
  // "Hết giờ", "Xác nhận", "Cứu" and "Giết" are different events.
  const original=String(targetId||'').trim();
  const target=kind==='cards'&&original==='source-18'?'role_old_witch':original;
  if(!target)return [];
  const found=list.filter(a=>
    String(a?.targetId||'')===target||
    (String(a?.id||'')===target&&!a?.targetId)||
    (kind==='cards'&&target==='role_old_witch'&&a?.sourceKey==='ROLE:source-18'));
  const score=a=>Number(!!a?.url)+Number(!!(a?.fileName&&a?.verifiedBinary))+
    2*Number(!!(a?.sourceKey&&(
      (typeof window!=='undefined'&&window.GMWW_V1_AUDIO?.[a.sourceKey]?.base64)||
      (typeof gmwwBundledLegacyAudio!=='undefined'&&gmwwBundledLegacyAudio?.[a.sourceKey]?.base64))));
  return found.sort((a,b)=>score(b)-score(a));
}
function battleFindAudio(kind,targetId,name){
  // Keep legacy callers/tests that extract only this function functional.
  // The canonical production path uses exhaustive exact-target candidates.
  if(typeof battleFindAudioCandidates==='function')
    return battleFindAudioCandidates(kind,targetId,name)[0]||null;
  const target=kind==='cards'&&String(targetId)==='source-18'?'role_old_witch':String(targetId||'');
  return (state?.audio?.[kind]||[]).find(item=>String(item.targetId||'')===target||
    (kind==='cards'&&target==='role_old_witch'&&item.sourceKey==='ROLE:source-18'))||null;
}
async function battleWarmAudio(kind,item){
  if(!item)return null;
  const key=kind+':'+String(item.id||'');
  if(battleAudioReady.has(key))return battleAudioReady.get(key);
  if(battleAudioLoading.has(key))return battleAudioLoading.get(key);
  const promise=(async()=>{
    const rec=await dbGet(audioBlobKey(kind,item.id)).catch(()=>null);
    // Legacy role_old_witch has one canonical bundled ROLE:source-18 sound;
    // never let a stale filename or a mismatched local audio ID silence it.
    const fallback=kind==='cards'&&String(item.targetId||'')==='role_old_witch'?
      bundledAudioBlob({sourceKey:'ROLE:source-18'}):null;
    const blob=(rec?.blob instanceof Blob&&rec.blob.size>0?rec.blob:null)||bundledAudioBlob(item)||fallback;
    const url=blob?URL.createObjectURL(blob):(typeof item.url==='string'&&/^(https?:|data:audio\/)/i.test(item.url)?item.url:'');
    if(url)battleAudioReady.set(key,url);
    return url||null
  })();
  battleAudioLoading.set(key,promise);
  try{return await promise}finally{battleAudioLoading.delete(key)}
}
function battleSpeakCue(message,showError=false,onFinished=null){
  const speech=globalThis.speechSynthesis,Voice=globalThis.SpeechSynthesisUtterance;
  const phrase=String(message||'').trim();
  if(!phrase||!speech||!Voice){if(showError)playFlashError('Chưa có file Audio hoặc giọng tiếng Việt cho '+phrase+'.');onFinished?.();return false}
  try{
    const voices=typeof speech.getVoices==='function'?speech.getVoices():[];
    const vi=voices.find(v=>/^vi(?:-|$)/i.test(String(v.lang||'')));
    // iOS sometimes returns an empty voices list until voices load. If the
    // returned list has ONLY another language, refuse gibberish pronunciation.
    if(voices.length&&!vi){
      if(showError)playFlashError('iPhone chưa có giọng tiếng Việt. Hãy nạp file Audio đúng hoặc cài giọng tiếng Việt.');
      onFinished?.();return false;
    }
    speech.cancel();const cue=new Voice(phrase);cue.lang='vi-VN';
    if(vi)cue.voice=vi;
    cue.rate=.95;cue.onend=()=>onFinished?.();cue.onerror=()=>onFinished?.();
    speech.speak(cue);return true;
  }catch{if(showError)playFlashError('Không phát được Audio. Kiểm tra âm lượng iPhone và Thư Viện → Âm Thanh.');onFinished?.();return false}
}
let battleUnlockedAudioContext=null;
function battleUnlockAudioFromGesture(){
  if(playAudioMuted())return;
  try{
    const Ctx=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Ctx)return;
    if(!battleUnlockedAudioContext)battleUnlockedAudioContext=new Ctx();
    const context=battleUnlockedAudioContext;
    if(context.state!=='running')void context.resume().catch(()=>{});
    const silent=context.createBufferSource();
    silent.buffer=context.createBuffer(1,1,context.sampleRate);
    silent.connect(context.destination);silent.start();
  }catch(_){}
}
async function battlePlayWebAudioFallback(src,onFinished=null,requestId=battleAudioRequestId,excerpt=null){
  const ctx=battleUnlockedAudioContext;
  if(!ctx||ctx.state!=='running')return false;
  try{
    const response=await fetch(src);if(!response.ok)return false;
    const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
    if(requestId!==battleAudioRequestId){onFinished?.();return true} // Old decode must release its sequence, never play over the new turn.
    const source=ctx.createBufferSource();source.buffer=buffer;
    globalThis.gmwwBattleBufferSource=source;source.onended=()=>{if(globalThis.gmwwBattleBufferSource===source){globalThis.gmwwBattleBufferSource=null;onFinished?.()}};
    source.connect(ctx.destination);
    if(excerpt){const start=Math.max(0,Math.min(buffer.duration,Number(excerpt.start)||0)),end=Math.min(buffer.duration,Number(excerpt.end)||buffer.duration);source.start(0,start,Math.max(.02,end-start));}
    else source.start();
    return true;
  }catch(_){return false}
}
async function battlePlayConfiguredAudio(kind,targetId,name,showError=false,onFinished=null,maxSeconds=0){
  if(playAudioMuted()){if(showError)playFlashError('Audio đang tắt. Hãy bật Audio trên Sói GM.');onFinished?.();return false}
  let row=battleFindAudio(kind,targetId,name);
  const key=kind+':'+String(targetId||name),now=Date.now();
  if(!showError&&battleAudioLast.key===key&&battleAudioLast.turn===String(battleState?.key||'')&&now-battleAudioLast.at<350){onFinished?.();return false}
  battleAudioLast={key,at:now,turn:String(battleState?.key||'')};
  const requestId=++battleAudioRequestId;
  if(battleActiveAudio){try{battleActiveAudio.onended=null;battleActiveAudio.onerror=null;battleActiveAudio.pause();battleActiveAudio.currentTime=0}catch{}battleActiveAudio=null}
  if(globalThis.gmwwBattleBufferSource){try{globalThis.gmwwBattleBufferSource.onended=null;globalThis.gmwwBattleBufferSource.stop()}catch{}globalThis.gmwwBattleBufferSource=null}
  globalThis.speechSynthesis?.cancel();
  // IndexedDB bytes are indexed by row.id, not row.targetId. Iterate all
  // exact-ID candidate rows so a stale "verifiedBinary" placeholder cannot
  // mask a real GM upload under an older alternate audio ID.
  const candidates=typeof battleFindAudioCandidates==='function'
    ?battleFindAudioCandidates(kind,targetId,name):[row].filter(Boolean);
  // Name-only revelation must prefer the SAME audio row on which GM saved
  // the complete Tên crop. Stale duplicate IDs often have an older/short cut.
  if(Number(maxSeconds)>0)candidates.sort((a,b)=>
    Number(Number(b.roleNameEnd)>Number(b.roleNameStart||0))-
    Number(Number(a.roleNameEnd)>Number(a.roleNameStart||0)));
  let src=null;
  for(const candidate of candidates){
    const found=battleAudioReady.get(kind+':'+String(candidate.id||''))||
      await battleWarmAudio(kind,candidate);
    if(requestId!==battleAudioRequestId){onFinished?.();return false}
    if(found){row=candidate;src=found;break}
  }
  // The caller label is not a routing key. Never play an unrelated audio row
  // based solely on similar names. Missing media falls back to the EXACT cue.
  const safeSpeech=(()=>{
    if(kind==='cards'){
      if(targetId==='audio_group_wolves')return 'Bầy sói ơi dậy đi';
      const canonical=targetId==='source-18'?'role_old_witch':targetId;
      const card=(state.cards||[]).find(c=>String(c.id)===String(canonical));
      if(Number(maxSeconds)>0)return String(name||card?.name||'').trim();
      return card?card.name+' ơi dậy đi':String(name||'');
    }
    if(kind==='actions'){
      const action=[...(state.actions?.role||[]),...(state.actions?.artifacts||[])].find(a=>a.id===targetId);
      return String(action?.name||name||'').trim();
    }
    if(kind==='artifacts'){
      const art=(state.artifacts||[]).find(a=>a.id===targetId);
      return String(art?.name||name||'').trim();
    }
    if(kind!=='system')return '';
    const systemScripts={
      audio_system_confirm:'Xác nhận',
      audio_system_countdown:'Còn ba mươi giây',
      audio_system_time_up:'Hết giờ',
      audio_system_day_wakeup:'Làng ơi dậy đi',
      audio_system_gallows_day_long:'Ngày dài rồi',
      audio_system_gallows_open_nomination:'Bắt đầu đề cử',
      audio_system_gallows_open_vote:'Bắt đầu bỏ phiếu',
      audio_system_gallows_nomination_result:'Công bố kết quả đề cử',
      audio_system_gallows_vote_result:'Công bố kết quả bỏ phiếu',
      audio_system_gallows_result_saved:'Người bị treo được cứu sống',
      audio_system_gallows_result_dead:'Người bị treo đã chết',
      audio_system_morning_expelled:'Đêm qua có người bị đuổi khỏi làng',
      audio_system_morning_marked:'Người chơi bị Sát Thủ chọn',
      audio_system_assassin_correct:'Sát Thủ đã chọn đúng, người chơi được sống',
      audio_system_assassin_wrong:'Sát Thủ đã chọn sai, người chơi đã chết',
      audio_system_morning_maiden_wolf:'Thiếu Nữ chết vì thăm nhà Sói',
      audio_system_morning_maiden_follow:'Thiếu Nữ chết theo người được thăm',
      audio_system_morning_frozen:'Người chơi bị đóng băng',
      audio_system_morning_silenced:'Người chơi bị câm',
      audio_system_morning_infected:'Người chơi bị nhiễm bệnh',
      audio_system_morning_protected:'Người chơi được bảo vệ',
      audio_system_morning_saved:'Người chơi đã được cứu',
      audio_system_morning_healed:'Người chơi đã được hồi phục',
      audio_system_morning_revived:'Người chơi đã hồi sinh',
      audio_system_morning_blessed:'Người chơi được chúc phúc',
      audio_system_morning_shielded:'Người chơi đã nhận khiên',
      audio_system_morning_poisoned:'Người chơi bị đầu độc',
      audio_system_morning_wolf_bite:'Người chơi bị Sói cắn',
      audio_system_morning_cursed:'Người chơi bị nguyền rủa',
      audio_system_morning_deaths_intro:'Đêm qua làng chúng ta có',
      audio_system_morning_dead_noun:'người chết',
      audio_system_early_artifacts:'Artifact đầu ván',
      audio_system_seer_wolf:'Người bạn soi là Sói',
      audio_system_seer_not_wolf:'Người bạn soi không phải là Sói',
      audio_system_aura_read:'Người bạn soi là',
      audio_system_destroyer_role:'Kết quả soi Vai Trò',
      audio_system_fox_wolf:'Hồ Ly phát hiện có Sói',
      audio_system_fox_no_wolf:'Hồ Ly không phát hiện Sói',
      audio_system_bear_wolf:'Thần Gấu phát hiện có Sói',
      audio_system_bear_no_wolf:'Thần Gấu không phát hiện Sói',
      audio_system_piper_wolf:'Kẻ Thổi Sáo phát hiện có Sói',
      audio_system_piper_no_wolf:'Kẻ Thổi Sáo không phát hiện Sói',
      audio_system_find_seer_yes:'Có Tiên Tri',
      audio_system_find_seer_no:'Không có Tiên Tri',
      audio_system_compare_same:'Hai người cùng phe',
      audio_system_compare_different:'Hai người khác phe'
    };
    const number=String(targetId||'').match(/^audio_system_morning_number_(\d+)$/);
    if(number)return String(Math.max(0,Math.min(30,Number(number[1]))));
    // Approved event ID is mandatory; a free-form label is never an audio route.
    return Object.prototype.hasOwnProperty.call(systemScripts,targetId)?
      String(name||'').trim()||systemScripts[targetId]:'';
  })();
  if(!src){if(!row&&showError)playFlashError('Chưa gắn file Audio: '+targetId);
    return safeSpeech?battleSpeakCue(safeSpeech,showError,onFinished):(onFinished?.(),false)}
  // Exact name clip: prefer decoded WebAudio with explicit offset and duration.
  // WKWebView HTMLAudioElement timeupdate is not guaranteed to fire while hidden.
  const nameStart=Math.max(0,Number(row.roleNameStart)||0);
  const nameEnd=Number(row.roleNameEnd);
  const hasExactCut=Number.isFinite(nameEnd)&&nameEnd>nameStart;
  // Never read an arbitrary first five seconds as a ROLE NAME. The V1 wake-up
  // clip may start with music, silence or "ơi dậy đi".
  if(Number(maxSeconds)>0&&!hasExactCut){
    return battleSpeakCue(String(name||'').trim(),showError,onFinished);
  }
  const requestedCut=Number(maxSeconds)>0?{start:nameStart,end:nameEnd}:null;
  if((requestedCut||targetId==='role_old_witch'||targetId==='source-18'||targetId==='audio_system_day_wakeup')&&
     battleUnlockedAudioContext?.state==='running'){
    if(await battlePlayWebAudioFallback(src,onFinished,requestId,requestedCut))return true;
  }
  if(battleActiveAudio){try{battleActiveAudio.pause();battleActiveAudio.currentTime=0}catch{}}
  const player=new Audio(src);player.muted=playAudioMuted();player.preload='auto';
  // Fast DEMO must not retain a long, real-time clip after the Server has
  // already advanced. Keep cropped role names intelligible at normal speed.
  const demoRate=typeof demoRunner!=='undefined'&&demoRunner.running&&playSceneRuntime.room?.demo===true?
    Math.max(1,Math.min(2,Number(demoRunner.speed)||1)):1;
  player.playbackRate=Number(maxSeconds)>0?1:demoRate;
  // WKWebView can reject media that has not yet left the pending state.
  // The user-unlocked WebAudio channel is the fallback, then Vietnamese speech.
  let fallbackStarted=false;
  const recover=async()=>{
    if(fallbackStarted||requestId!==battleAudioRequestId)return;
    fallbackStarted=true;
    if(await battlePlayWebAudioFallback(src,onFinished,requestId,requestedCut))return;
    battleSpeakCue(safeSpeech,showError||String(targetId)==='role_old_witch',onFinished);
  };
  let cutTimer=null,finished=false;
  const finish=()=>{if(finished)return;finished=true;if(cutTimer!==null)clearTimeout(cutTimer);
    if(battleActiveAudio===player)battleActiveAudio=null;onFinished?.()};
  battleActiveAudio=player;player.onended=finish;
  player.onerror=()=>{if(finished||requestId!==battleAudioRequestId)return;
    finished=true;if(cutTimer!==null)clearTimeout(cutTimer);
    if(battleActiveAudio===player)battleActiveAudio=null;
    void recover()};
  // A missing 'playing' event on iPhone is not successful playback.
  // Avoid leaving a silent turn indefinitely when play() resolved on 'canplay'.
  let began=false;
  player.addEventListener('playing',()=>{began=true},{once:true});
  const startupTimer=setTimeout(()=>{
    if(!began&&!finished&&requestId===battleAudioRequestId){
      try{player.pause()}catch(_){}
      if(battleActiveAudio===player)battleActiveAudio=null;
      finished=true;void recover();
    }
  },2400);
  player.addEventListener('playing',()=>clearTimeout(startupTimer),{once:true});
  player.addEventListener('ended',()=>clearTimeout(startupTimer),{once:true});
  player.addEventListener('error',()=>clearTimeout(startupTimer),{once:true});
  // Named V1.11 segment: the editor stores its start/end on the EXISTING
  // role wake-up audio, without duplicating binary data or changing its source.
  const excerpt=requestedCut;
  if(excerpt){
    const stop=()=>{if(finished||battleActiveAudio!==player)return;
      try{player.pause()}catch(_){}finish()};
    const seek=()=>{const end=Math.min(Number.isFinite(player.duration)?player.duration:excerpt.end,excerpt.end);
      if(excerpt.start>=end){stop();return}
      try{if(Math.abs(player.currentTime-excerpt.start)>.07)player.currentTime=excerpt.start}catch(_){}
    };
    player.onloadedmetadata=seek;
    player.addEventListener('playing',()=>{
      if(cutTimer!==null)clearTimeout(cutTimer);
      // A seek/buffer delay must not truncate the final syllable of a name.
      // Playback timeupdate is authoritative; timer is only a generous failsafe.
      cutTimer=setTimeout(stop,Math.max(500,Math.ceil((excerpt.end-excerpt.start)*1000)+1800));
    },{once:true});
    player.ontimeupdate=()=>{if(player.currentTime>=excerpt.end-.02)stop()};
    if(player.readyState>=1)seek();
  }
  try{await player.play();return true}
  catch(err){
    clearTimeout(startupTimer);
    if(fallbackStarted)return true; // onerror/watchdog already owns recovery
    fallbackStarted=true;finished=true;
    if(battleActiveAudio===player)battleActiveAudio=null;
    if(await battlePlayWebAudioFallback(src,onFinished,requestId,excerpt))return true;
    return battleSpeakCue(safeSpeech,showError||['role_old_witch','source-18'].includes(String(targetId)),onFinished)
  }
}
function battleTurnAudioCue(turn){
  if(!turn)return null;
  const roles=turn.kind==='role-group'?(turn.roles||[]):[turn],
    wolfPack=turn.kind==='wolf-introduction'||turn.kind==='wolf-pack-bite'||roles.some(r=>['role_wolf','role_alpha_wolf'].includes(String(r?.roleId||'')));
  if(wolfPack)return {kind:'cards',targetId:'audio_group_wolves',name:'Bầy sói ơi dậy đi'};
  if(turn.kind==='village-wakeup')return {kind:'system',targetId:'audio_system_day_wakeup',name:'Làng ơi dậy đi'};
  if(turn.kind==='early-artifact-window')return {kind:'system',targetId:'audio_system_early_artifacts',name:'Artifact đầu ván'};
  const role=roles[0]||turn;
  if(['artifact-main','early-artifact'].includes(turn.kind))
    return {kind:'artifacts',targetId:turn.artifactId,name:String(turn.artifactName||turn.label||'Artifact')};
  return {kind:'cards',targetId:role.roleId||'',name:String(role.label||turn.label||'Lượt vai trò')};
}
function battleAudioCuesForTurn(turn){
  if(!turn)return [];
  if(turn.kind!=='role-group')return [battleTurnAudioCue(turn)].filter(Boolean);
  const roles=Array.isArray(turn.roles)?turn.roles:[],cues=[],seen=new Set();
  const wolves=roles.some(r=>['role_wolf','role_alpha_wolf'].includes(String(r?.roleId||'')));
  if(wolves){cues.push({kind:'cards',targetId:'audio_group_wolves',name:'Bầy sói ơi dậy đi'});seen.add('audio_group_wolves')}
  for(const role of roles){
    const id=String(role?.roleId||'');
    if(!id||seen.has(id)||(wolves&&['role_wolf','role_alpha_wolf'].includes(id)))continue;
    cues.push({kind:'cards',targetId:id,name:String(role?.label||role?.roleName||id)});
    seen.add(id);
  }
  return cues.length?cues:[battleTurnAudioCue(turn)].filter(Boolean);
}
function battlePlayTurnAudioSequence(cues,expectedKey,showError=false,automatic=false){
  let index=0;
  const next=()=>{
    if(battleState.key!==expectedKey||playSceneState.step!=='battle'||playSceneState.phase!=='night')return;
    const cue=cues[index++];if(!cue)return;
    const first=index===1;
    void Promise.resolve(battlePlayConfiguredAudio(cue.kind,cue.targetId,cue.name,showError,next)).then(started=>{
      if(first&&automatic&&battleState.key===expectedKey){
        battleState.audioPendingTurnKey='';
        // A failed iPhone play() is not a played turn. Permit a later reattempt.
        if(started||playAudioMuted())battleState.lastAudioTurnKey=expectedKey;
        else {
          const retries=battleState.audioRetryCount||(battleState.audioRetryCount=new Map());
          retries.set(expectedKey,(retries.get(expectedKey)||0)+1);
          if(retries.get(expectedKey)<=2)setTimeout(()=>{
            if(battleState.key===expectedKey&&battleState.lastAudioTurnKey!==expectedKey)
              battleAudioForTurn(battleTurn(),true);
          },850);
          else playFlashError('Audio '+cue.name+' chưa phát được. Chạm 🔊 để phát lại hoặc kiểm tra file.');
        }
      }
    }).catch(error=>{
      if(first&&automatic&&battleState.key===expectedKey)battleState.audioPendingTurnKey='';
      console.warn('GMWW wake-up cue failed',cue.targetId,error)
    });
  };
  next();
}
function battleAudioForTurn(turn,auto=false){
  const cues=battleAudioCuesForTurn(turn),cue=cues[0];if(!cue)return;
  const {kind,targetId,name}=cue;
  const audio=battleFindAudio(kind,targetId,name);
  // Preload all unique role clips, not just the first role in a grouped turn.
  const configured=battleRules()?.actionsForTurn(turn,Math.max(1,Number(playSceneState.night)||1),
    state,playSceneRuntime.artifactCycle?.accepted)||[];
  for(const action of configured){
    const entry=battleFindAudio('actions',action.actionId,action.name);
    if(entry)void battleWarmAudio('actions',entry);
  }
  for(const clip of cues){
    const row=battleFindAudio(clip.kind,clip.targetId,clip.name);
    if(row)void battleWarmAudio(clip.kind,row);
  }
  const rt=playSceneRuntime.nightRuntime,queue=rt?.queue||[],cursor=Number(rt?.cursor);
  if(Number.isInteger(cursor)&&queue[cursor]?.id===turn.id&&queue[cursor+1]){
    for(const nextCue of battleAudioCuesForTurn(queue[cursor+1])){
      const nextAudio=battleFindAudio(nextCue.kind,nextCue.targetId,nextCue.name);
      if(nextAudio)void battleWarmAudio(nextCue.kind,nextAudio);
    }
  }
  if(auto){
    const expectedKey=battleState.key;
    if(battleState.audioPendingTurnKey===expectedKey)return;
    if(battleState.key===expectedKey&&playSceneState.step==='battle'&&playSceneState.phase==='night'){
      battleState.audioPendingTurnKey=expectedKey;
      battlePlayTurnAudioSequence(cues,expectedKey,false,true);
    }
  }
}
function battleReplayAudio(){
  const selected=battleAction();
  if(selected){void battlePlayConfiguredAudio('actions',selected.actionId,selected.name,true);return}
  battlePlayTurnAudioSequence(battleAudioCuesForTurn(battleTurn()),battleState.key,true);
}

function applyPlayAudioState(){
  const muted=playAudioMuted(),btn=document.getElementById('playAudioTop'),glyph=btn?.querySelector('.gm-top-icon-audio-v293');
  document.querySelectorAll('audio').forEach(a=>{a.muted=muted});
  if(btn){btn.classList.toggle('is-muted',muted);btn.setAttribute('aria-pressed',String(!muted));btn.setAttribute('aria-label',muted?'Âm thanh đang tắt':'Âm thanh đang bật');btn.title=muted?'Audio: Tắt':'Audio: Bật'}
  if(glyph)glyph.textContent=muted?'🔇':'🔊';
}
function togglePlayAudio(){
  const muted=!playAudioMuted();try{localStorage.setItem(PLAY_AUDIO_MUTED_KEY,muted?'1':'0')}catch{}
  applyPlayAudioState();
  // Battle clips are created from local blobs and are not document <audio> tags.
  if(battleActiveAudio)battleActiveAudio.muted=muted;
}
async function refreshPlayServerRealtime(){
  const btn=document.getElementById('playRefreshServer');if(!btn||btn.dataset.syncing==='1')return;
  btn.dataset.syncing='1';btn.classList.remove('is-ok','is-error');btn.classList.add('is-syncing');setPlayRealtimeState('connecting');
  try{
    if(isLivePlayRoom()){
      disconnectPlaySocket();
      await playSyncRoom(true);
      connectPlaySocket();ensurePlayRealtimePoll();renderPlayPlayers();syncPlayMovementTicker();
    }else{try{await loadMembers(false)}catch{}await playSyncGlobalVillageMotion(true);renderPlayScene()}
    btn.classList.add('is-ok');setTimeout(()=>btn.classList.remove('is-ok'),850)
  }catch(err){setPlayRealtimeState('offline');btn.classList.add('is-error');playFlashError('Không cập nhật được realtime từ server. '+(err?.message||''));setTimeout(()=>btn.classList.remove('is-error'),1100)}
  finally{delete btn.dataset.syncing;btn.classList.remove('is-syncing')}
}
let playSeatSpacingPreview=null,playSeatOffsetPreview=null;
function playGatherSpacing(){
  const layout=globalThis.GMWW_VILLAGE_LAYOUT;
  return layout.normalizeSeatSpacing(playSeatSpacingPreview??playSceneRuntime.room?.seatSpacing??100)/100;
}
function playSeatPositions(count){
  const room=playSceneRuntime.room||{},layout=globalThis.GMWW_VILLAGE_LAYOUT;
  return layout.positions(count,room.seatLayout,typeof playSeatOffsetPreview==='undefined'?room.seatOffset:(playSeatOffsetPreview??room.seatOffset),playGatherSpacing()*100).map(p=>[p.x,p.y]);
}
function playEsc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
function playActiveCharacterId(gameCharacterId){const id=String(gameCharacterId||'');return /^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(id)?id:'character-01'}
function playWalkDirection(member){const dx=Number(member?.moveToX)-Number(member?.moveFromX);return Number.isFinite(dx)&&dx<-.01?'left':'right'}
function playCharacterFrameUrl(gameCharacterId,frame=1,direction='right'){return GMWW_SERVER_BASE+'/api/game-characters/'+encodeURIComponent(playActiveCharacterId(gameCharacterId))+'/image?rev=c40-2'}
function playCharacterUrl(gameCharacterId){return playCharacterFrameUrl(gameCharacterId,1,'right')}
const PLAY_SEATED_CHARACTER01_URL="data:image/webp;base64,"+["UklGRoQeAABXRUJQVlA4WAoAAAAQAAAAiwAArgAAQUxQSCoMAAABDARt2ybhD/t7t+kHEBETwF89M+sd7wELxAXNAcsJE98wXSAgFOiAhN5o2zY2Sdu2udY+Aqmybdu2bdu2bdtMFBNlZZZt265KFRORcW7OH+cZZ0Qdx47r59UiYgLs2LatWlv1RWQ0IlJqQOwSWgg1oJFTDacIpITuksF7L3V3d7dz9hxzB3vttdc+3ytAREwA/n9z+Z8CpjcTVZFm+hYwvVhDU2gjGXD5WjC9liy8/AIzGAAoBECBA9NBML2UyMZvcMxbQw5dAoARQGcYz5NgegltRrQwKhhwKUl2Pnf0zMCs7dAXE/eC9g5QaaQFut45uM5E/nJy29TnzYcH6ScsJpo/wSzrAlIURaFAn3VPufPBpx4ZePqyh030wVvyzfm2+nH6eziFD0GlF2j/+OYF0XChCz6PbBzf+D2FGIPlr/N9PHAYXawtjml2k8zB4Fz+/ewVRx948j1/k8Fa55y1kYwNLd8byb9TsLxQZnprekjeVOYcl9jY+ti1D41iIANjdHwJW/hloAAkX9Cb5/p5HOdxitomBOrf6fc2l9VCjUHO7rh54WhsV//6pfxtAOpn75srMbi565Fvd23D/7Zp1JyLLbLcNoNvbtWsSFcKLPvy1/4nrugQJ0/qnFLjv4tIXqCNDGa47fk3vtuY2juIkUwx/rEykJX2FqgRgcGKH5x38o+7LhNDCLHzx4FLQyQXgqnvXQUABCuMWu8a9jaxuWQiJ55TQDMBxTPx3i1nbdMFXtt2OJ2YmqlzWop+CvnwVJBMFDiQ5D/f+uJX//1bPyn0QqF77aa3+XJflTwIZhjtLHvv9MYtiFOeX303OwSaBxgczU7fmhC4gA0G","HCM7Npjr151h8iBaPMVOYrtgo22comNtofkH9ZE8QGTGD9miK3tkdPy2fbmFIHmAyjS3uZXZVcAk1ng5+sNIFkQx31Uo48Ge2WXzECYvDAEkA6I48G+KpbTtGs+i5cUo1t9B1VROcTVTjc12STbEP+9+f/wSAqiplsHp/GxKvPVk5/pA353PbZGqKADFOjzyzhhuiT3zfsyQIU9+x8NQVAVqtOj/5PrrMsSr20Ge9e/3E6lI6xIAMOtSU/+SfNlsCoPr4ITloKim6sDhWy697I5XjmOIPWzXURr4wzpQVLTAbqS1JH0sXXG4dnYoKisD3o8+eRtiz3HpkI5FC6qrWDP6k632lWLgljDVgeIY+tAGm3UVeOb4TotUCIp9/9n7DvKarjgRatwCpkJS4L43fo/KVquyZBwKrVD9He+4XUxFniMf4uipIZXR6Vrnff5bvfH/If049dFuOTFVURz++7+9n1xY7HS8HEdvhsqKFJek3rsvYQ9bU/TxtKmnk1lMRepXvufXiZPzEFOM/Pn5L/cTrYwCfVb6NoUG3rLXQQyuk7y9RaQ6gllepo95IPnn0aiwoO3AH+jjf2jvswlD+vzR0+aDSlUEs90wmuzsGftynncDUFRXWlYfNJZkT9hcZh4cH1+mTSpUP8tWhz6YfA+QspfsCpJM52il1AB4ja47Zm7ja8jjfv74zt1mRMULsyudDT2GsSm0l2oc2t6G6iuGp06yOafq7VxiGj0dCiMVE7R8Sg57gC1zzYXkvmBcURRVF/T7iUfhOh5VNkgLBmzSIW2y08S1kYOWX86ADOO5R0gzG7ziuDd2WRxSOaDlkHYt3ueholFhaxLGZmBlf4NcqizcYXvXJcBUem6DIhNicAP5gx+jjF0wUhziv7NDM6HY","c8Knl848ItV6jAE2WA6EIpey9HytwOtkaIIFJAZirViOmUvyAUB0Hf5yr2vKTqUlpJS3/GdDKPIpqu3nXz7zWgxN7JTIkx8sB4O8qgFWCbEkyiT/+Qn9oMhui0wzJvnuSTM7AgkUYow2/rR6H0CRYYObWetebJPUGATyG6AQ5Fhk5u9Zq2Jt5O0f8nAxyLNi6Z8YrfVNaGR14l0a07f/bjsY5Fox5xBPMgbfDLGUApFxFPKuwDKnDnzOk2ELoH71S/ylrxYmYxAFcCI/vzBlFCy2/hNgh/uXRkshGQNMscSI4/vi8X4GoBL5NxcftO7ScxYATM4gQN8NT36Hxt5OMvz53qD954FkTLDl4xNIis2y1ieS/PtkSLYMDiXpreeSwVuXuA9MpkTv/i3/E1e28aVsteLZfrDoXSF2LALNkmKh79JydkY10adP54dmSLHGr10skBTVjq+1S34Us47mwS103Eg0O0Z3ouU2+rQxWnIjBfZOPmVfJaRrp4LmRRRHjA2hyt4SAz9YDJoTUVzOFOKiHWgbZ//N0tCMGJzJmo9d2xmJ/f/rH0+tkg3F6t752AzZnKo4eBVMRkbRhtBEXpIAAxprFDsWgmZCsZyLsUdsQJK2YXkmTCYKnEgbQ4wRKRdGY53k0ksikgfFINrYUGQdKCG1ib3kOXpaZEIwsqukY6DC8UxS4OQF8vFBPzcgMRnBMUkppM7FoHkweL0fK4YEKx7JQeCEOSG5eK6fK+SmEjOWPD9py8dTvWXsgDVEGLD0jgjyqObTflawhmYGOxV92gUmCwbb9EbadlUcscKvBojkQOS5foIkRWDwSBGhnYqO+6DIgGKRDrRCwB6TDy49J5KBAgfwUMhFo8UQQupYBJqDS/m/SNeTBimE6LgriuoZ","3MpDEoFy9jYQgEKMlifloMAlPJAYdYnSBhflYXeeTEVoe59zse7EHCgW6fAstHFMuSsc98sBIK/1lhsDyj14xXNbmAwYDO6HVMG1HXfMxMB+MFXg8GKWZ6LIgOCZ3lICcyUp8BwJqZ5g+tFdkWIAm83GjggDx88EqZzK9ON6CzQn6SobDEhikuwy0GppoQCu9FmXdAEonE2YXYxIdVQBtM+0+F7/tAaYSCs26zaQcrwD9cZINQyw+IkPfzmuM4p5zgku4NPXSy6w0FzTKgAjFTBY5N5OkkwxHTG3c45sQo2EIY3+dUrHhNFv3bLr7IApnWK/vzrH2aSECQdp4gE8MmGagT7/42v3wJTM4GSmQyzawTjBtifYNmCSExsUtvPs/Ve7wJRKsTetZ912QhqYTA1OjR5JH50nw5RIZY5xwcXSAhYAs43muAu0PAZXsxYbasxMJeYpm1Kz7uMfc4iWRTDXn8GHINAOKWDiwSWljlfDlKXAUayFZgFJSqExih05IQVOSYBE9Onn/pCSKIYl2w1NUYZFE1CjMaMYY1wVWhIU79PHZlaDYpsUU01zjrvClEPQ+lm3mDSpNRU4sClRLq47AEU5APMufaxPMGmDtOKIhVD5lOf2MCVRPJhsD40V8ysltwS0JAWOZ6NQkBsLDHgXM6JP77YISqqYbXT0TcQL44oBvKQ0acd9YMoCg4Nou8WaNDGj7et4ftQuUhoxMpS2kWYgqBk92DilEQlJ5B23gEF5Rab7iL4rKRpz0sy2qaq0vB8GZVYsODb5uvoUSGKmBLWi1PLTGVRKBYNNXPRdFK5d2vL3haEoucGugbbHuJDtXHD8YDEoSm+w69/0LvRQvMue2VGw5PDpYVBBg8VGksk6JWzAiXobPBLbBmQjf90d","UFTSAFuMrJEdJ8arsNbpb50TKqioCrDkKaP+EtkwANhbbELbDrCR/3rb8oBBhY0AmPV8+ma4oJnadjC2xwAVVFuLFpxG20WcUhPeeu9CN5wAMnpQC1TfyL10dawFG1mfrG+OZRs4+9MwGRA83qDZRt6R/t0rttl6WAfpfRcu8OSZTDzTyJ40DORPV65SAMBi531FukYsOQT58Uw81mjRxy/2nxZAYYwC/Xb6nO5s7VQBDPJxLzQDBoNpuxVq5OqAUQEALYAZh3L0Kdawrf7LOyEZKHByXYp44h355+5oEXQtBbD7B9/7xuf/6T7PpoSJTr95o8igwZopxJhSahBcIH++eiHoTV4EaGvFao9PIpmsCzF1lVKKjgehyAGk7WPaGFOMKXpH8tW9pwUMlo0AAixw+NCvLUnvfGycUvRx/MyQLBhszVRz9ZH8c8iGAhhFT4pABUCfZU54eAzJaK0P9dbxQCjyaLDfRDZ0rx01G4BC8B9qoQAww3aDvvZs8nQocqlY9PR7Hhx+x/ErCmAM/nPRQgD0W/mI257/cWJt0s9DN4Qin4qujaCkYgzq+8696DwDAEVOtVBRU6igzKKFQUM1KC1WUDggNBIAABBFAJ0BKowArwA+lUCYSKWkIiEuO0p4sBKJaADXGG3TpJUsj+0/rfA1m2tt/671PfpL2Bedl5kP21/Y73dP9t+1Xu8/wXqAf3nqPvQL/arrXv7N5zOagdj/+v8Gfx36F/Qf2/z08e/XRqfdu+LH68eL/yL1AvYvnWfSdpnar0Bfb/7j4Bmpl4P/5PuAcCZ5z+uvwC/nP9hPdr/v//j/pvP79Sf/H/XfAN/Ov7X/1v8B7cvs2/bv2Y/2LRN30ZcQsZPpzS3gIrw8TjEXojOjBj2mmr82l8m9","yXL2nFZ2EOcQSJVYcxTBW+ims3X6WMVbv7C0uAh1L7lukg5cz5tUAeJh53XjwBjbsvIFXFbZXzGfZnBccDnZAVMaFIasj5fufuBMb2nDt8e+I4kC7TLCiBmkz9zbEv02ix4XvXhwj9UaNkdjcyN5qtkMoDinLhblxQlvmGmQIruXJGgtFoddaCMpSZid2AS8Y7CrcPo4MU+3+Gs9qE3yFk+q9TEnecmjEE3YVMl4LWjr9kx8Ox8EN+W3+NEJj6s4weRJcGQbc63Exzmzjq6RL2GcjchSd5yJnTzF6Da0ymZIp4ZgsG/wiymVWoEo40UVYD5v4Dm7ehhd970ljA7/8fS653OmN0PYm8huvJmnPiznFi+BWzZCW15BlCqf8JSwj13oFOVPFrP3MDTf6ZtMa0OMTuV33bL5mbVvhM9w7gGP0aduaCQvlGbs5p3nnBzNs0x/pxj+uGEwgAD+/FzQAeJ54MXZuZxQjKrE5o1VKXeudd+fu864MAT+73r3zaK4Z8UkXBU8Zg5dgjhm9nxnAqU9QVC86N8qMvsTBGh0rqwrdwnTUWg9LK/rVeT3f5GmjyLwJL72lHHbROcUdGXBScAepe/CmQdSo6A/0PsL+FIbPu40U4wSntvQPkAILtLx5WUnAABvM99zIQjuApq4ak78BfPHFMdFm07FhJRB5AcwTE+hmSwy9Og4JrOZFspa5xH5C5D0HjpJ5jg2yTxY54Dh3ihP+FbvF+pq/4WvO39BP75uuuYefLeiivtyGIaAisa93OAgJKEIR2o07UssuRumd8jP4TtWmjeEIbb1jqh+1hnb1DsIK2k32ScrqKIWfbXGBuRQ80G9+R2kHFceX36437Q2LUkzTklNRhEIDV9Y3TYPRpIKrmux2RUE7j6jmquF","z9rHCyqZwMqQX6QP4jijKkYydHmPxXbcWTolGby0BfKg41mFN4fqTn13wLJW6ytos59Jt3Efzsa1hHYoK7Nzx0iFI3oZnjV/ylH/1l6Wgm0xCZMRUvWhz6Sg7CitzAIOKTJjCCR8vSrKPD0+qvqk2SziN7buawYIksQnMFtS87ra/XVsNF3Wwodo9YxmQ1w7OlsNcelUPcJz8vC8MDF4qTclO+H2LE81P4A/GfCelgSZcWshz0BZhAAh+6CRm5Ch1cEkBCN+KJj7K2FVe0ETZrqaJWrOhV16T0v6WJd4W3ASdcp21bJkP16NcqNlLFBcCZj9w9m081Nyw6eboM21BUVblnLXHUcCdwNJqOZCVAsOpgKcekaiJCTreNV1VWPzuGZOhcInlLaNj2rjf1jQ+C92fbHvE93V6nuzFtJ4mUgAIA5lGRCJRDb3FWF2sZfahoVA2teuOgVCwoABC+AtUqMZAciTQOOhkfohXpIW54FScPoNHA8vaA2P740WTuvz2SmgAlbKFKkfpSQIN+FWi9nkUw1XFmo5fIMhf/Yfo+eKMshHpPz5w1iUQQ+V8eAshVcv49JCMzs/2wWPpczSDuchoTEP9BMNp/hpzfzprJoXiT5L5e3UBU2Pp7k0NgETFiH/r6GOfcwjLwbmI4z9MlGUQ70VB03PVivfDksxHNsBkOWTN45wTSPE6jexLAUdq9Ex9freHu2kVd8kAmXK9Fer+roicj6EICmTxkx5bwClD8gZ9vYD9xtsAzMGn0F2rw16nCKZwKDbiIT1ueN3Wixx64eLNDgjGReSnIk1kTI8J951oC49Ny8oAPscUFsCjzhlBqUbQzQYYoqItubr3bPn91o3W6u8qOwl8Ahdqpg/33mccW5yZYvNblh8/VQ+A5Ls","kNzv/OiJ+wYCMrk6dka9OMmu9611vBV1cxKsKZAUxXuulPT5ildvF7A9gRhYgdj2COW0WM3BY3SQh74BpSXxF3z7nygF9MUXt3fqrX836U1qJ8X+8PiwVx5CfAxGZMxqGBtD7ynVyFB9MhcGP7WJq6jr+e/a7l4aE8t8zWav//EvLXloEDhb9APkV8pz11a6b3/qvDraRFQ0PNl7SbqjWJWmnIy3KbDOwHCRrO/sciUbHWtXv5DgtOxzN+4QDcJAhi2cp6uOnZi+cp79CYtBK7mNfEKNnWDlRO/ygzdjyCbwtPR1hR79VQDtwQMq8lEXKt/9d7BRQMn0rS/vMSEQhXJFnKOhWnP0US58WJX1tVmh/CjNsOYSvrjdov2xAEwVY+FZhejdhQbahM/bmaxbo8YzwJ/c5iuLozupQ6z+Li9mmGokCbjYUGzMTXRJLD4Vf8N1n2JGBPYfmRqjTvZQM5kfdWALoISMm2PO6sKKyNOXPUGXwnXAWyS5qIjhkzEOKl6gA07KVqRQNigmcXN3QcMC7l6tbYTK2IDEo6Ve9yt8+EyI42awPeMGiCqG9dJq7EleTd/uhTlOdEaOCc9os7kG7I30HI5Z9HPK1M6uJJVC+Es/QGqVnYnHaojg3kV99ejwxweh83+gnR+3WvQ88+lHlJ/Kyj/r+21GbokkS9hevM8nH14w5y6kil3MBqCP00X93MwonAflWjm+FBLm6a+TNlY9aMkgQL5GF+PP+41PIn9lz+UPELYXVxT0/YdD3NxA195IST4Un3Dy071EepAwnrgE6CiQVkLf2jKiJaIKp+AUlXn8OPix/6b3tIb0Vk06e+2bbQzUH5d18k0tJmJduFiZTrTvTgaRP87qKwdh018blZUvlQdyOgLaeA5XMFF7","7Z5HhjFEXeo6ElivqWNqkFV5MwGILLZDSG+uGn6gJEGYAlfKnLeI9413gBncGGmbLlQkXxvuICfevcrc6VJET1WvbxB+FbLHAlGbUfcTNLUnK8WW2chYnanTRbj+1JyRu6Qo5riQqEpuvAHsVmZGWzcK6D5Dc3cBxNwdpqsrO8vDEWZ/MMnR0/4p+Eo999iiIKWFcNcCfnQ/ul2ta2cI0kdBIQQAPqBTUGSgxP3pVaGpL3XsQbV3cKTIgI+fcJe2BO//koaXf/8aJdatmi7IwhpPCqDgXK9huLtDsjhqL1xHNHDm+t9OErGg0muDfoJwbaOA9Lgb59XGLyldQcFC7x1/uCgc26vdzKlPInvU41lfyy9H2OgEaGAI79dRLVqmCdcUnZykEg2kRVNJuT/+eHb7Cq7+sHI1BZtP7CyxyOlrnrYT0GlgHNGaicH6gJ25t0Noi8/qih2QivO6Mp3+5pHGI5dLDHaC5T0/f6eKEdVSbDQl6c9JW0uK4lxZyBcz+UYP97zb7LgRQuamcQP8ok9/4GX97TwI66KOLcSibWZC/kbLSkSC/JlF6GwfzClwslgFUdn18BsbmkvGLkU9Vf82TgzdIdk/0PcoSXRcAV/xg9QW9n/bKwRmO+4TsCcG+4LxMPmkiokqjLxCykK74OZdnzKqg9Y7PmtT3kdiQ0JeL0n3PQHzMMOMVKOF+bWrKWMueqVhqz45QkRN2SYXfcu5+vgi7FglY8JVMmomFiqo2wvJl9HGzu5RxsT09IvwCiDIIEU0kgVqCnCD5+09xpMKDNRHFV5uM7ySCvGjaxsdbT/EGkIHInbqdMLcmuDqeCmSlVkLGgI78si5e3BkKP2L5lbjSVw6L6nm1ng9v5hgqUZdH1nr/r8bPTzlx1ebEvvv","wGjAdsr+/MO4lQ/vApgy4WJeZMEZHPyO9XVvM2eztPU+EqGrgWjsfbKtsY14UzI8hDrbhaK1exkSRf8MvYr9ux2cZkTsgKjetMNKN3u0/888TUCYvgdoXradZLPyvWPEEB1avtqUx11NPrKFxWOuxIa8tv005gnV7cgXr2S2CIkwtl71gZ2On/Vd/k1G8zL/04Lk/m4h+cUhJEf56nsNu9wJ09P3h4khc+FhtZCf/ZY/5rcuWn3oeYAGoaxqnsiH4p9PLD7WjECAatK88yx+ZtTwoKsqRTbpCbu9QmAQxmexcDVk+N65D/ZwgPckrAmgma2cdOTdhcZTgduDGnhepTsRnVyF/zPuUAjqPxXyjeVSQx66C5WsT/9ukOBgrrtx47Q2HOLbEDJMyZq5PyGsfeDNUGI9eUE05h4WJBgnBjPW/vvHn4vk20CD/01up5O8hkdiumV6Vc/w5WlfS4ED7sUo5Ria1w3zpHSFS4ncG6YDRs/DD8FlKinJdFhoA1EA/FRvLLwjU+jFyqiJAh+jJWgilsSfrfWM+nj/NOBq7GUNLAz/+SjB3TBo/a2RwuYDiJ0JXaHATU2fY91rPCLT7AB0X8rwlxltckR/g2Gvp0wcDDb4mHcVdNVME2cwGqoZDyaYDuqWmBHVcXeT2gJKCH81XPM2C39PUG1hzwDFMNqEmjio6CVphToLS0r6nbrhVBw4ZqIg/yDtQSAql2gxIugdKvo04jkTA5SIw7MQC6Axo4He0qIN/L5IJBdGoFD2L3fXAp/r4x9Qs3ueC6E82z6CA5Lxbajj6o0Re68F3kfxLqRGelcSFOSdCfJFYqAxuL9fOkC+jxr++vTrxFROi9D2sj6N19pezy0449q4o1HKjPVf8lmzjahNiE/4uMihCR7s","eqv5L54Um/nUg/q6OkRcoL37SpU05JEUYvPJnV9ruwEExWGi4JFiK4vevQmGmhqukoJj3kpyy5EFmJRFZZOKf0DPl2HqWkvNb52FY/1DWFaX4yCD01fZAIIhJTcc+U9IuHL6KaXXA1wF0Eu0m8TSPbLAFxXkRbtn/wIhKmluLeNxWAxYxF005RguzvhdUhdzorqJISvQm/kQgjWJmly5WMsf8Ud6DfQctuSe+/g1Bi2yp/3f9WxXO9aQ6uMaTQLN05P7bca2WDlCqTlzKowAFCwVqHMr60Ju3d0wbr4CJlWLZivoR7uG4v/VWpdL7HXLmVNun61dPd1FUt+MRUszaWp6RFiymXlG9/7hNwXd4kTIRfpzs4PZA24HLjw864Bflyn4hZV8pfIpdzHjSTa7sg8QT6LI206ozokmkMAcO7wjtsHkkf4dlnDU1gMSq7K+/2qk7jiBhIWFBzLTzxetWlpl4hPQZTGcMBAJNCMGzRczUeJP+HFU/FAL8Rt46pGiVv+96ANX7mQUNOa4B/cgAsDu/M52z2p0Cy26sAaFBu5O5YV0rIB+1NdrvDP6+/hAptLhwn7bWq8NUTA26l7NCd+co9tSyo84uxU9Jhzwoqn3SJoq/2i65ZVj80xH5O6lwzVToti9ls9igP88Y91IF7NhWRWeQNft5dstmR0vnw+lt6FDRtnqKoZcjV/HEkbPGp3sEi6n2NExs73cvejTBFwuMvSl8ffbLO6fMmD9q4UHLUWajsgxQT/IypliOMQL2wdlhR4g8eBlDbYHdfI9fxJbVKViqNXQVrSC8spTsNGe34/Z985tiXuh87oB68vq/FhYswLI5iisU9asCHkax5Ex46mQR1IpLc4MHCqy8dua5HTowN9xQpk4IngDWQMezbbS","UUnDloCKywkV5mEQzAl70iSFi/rOCo3G2pM7DE2OfZnGel7KCo2667CnHgwidINSSBPQxfJ7ulFxfcZ2BA3IXLN6ZCfxPH7J2cOR8mruPE23Ouy6i/LfAO/46R8rG/mt8Vl86BL2UW1bTKzh5FPde5k+lnnqL7qkp18Uo4ovL4DZXmBGNHbVAtfiXtwqMjiBpkfpGeqdxcnUBTveM1/LjxvXJx9WirpxyBeLkBfDuyfR9PiYIGQIlnxDtay+yODR81v4d++b+BxuOfff/0JoTFuqhH69dTJiCCUcl1oMAUfQ8iQs46SgdGcxSa5FQQaSR3Vkx0okmiHsxSi2/ue5k4B7hL6Rmp7h5bWCStaBMrLpYah7AooAFaBy4bkF4LJfJ1+BkPSiafXCbDf00KlfavgC3yjlS5aM9w9l2lCHjgG7o/Y4ESIjfZY3X5TAf3+KDHSJmuulDo6Mce22D9zpmDWpEhmp20PeuFuzvGKwPf2Na/MlmoYAxtFamPmqEoxH/ek06n8gAqncAAA="].join("");
const PLAY_SEATED_CHARACTER_URLS=Object.freeze({'character-01':PLAY_SEATED_CHARACTER01_URL,'character-02':GMWW_SERVER_BASE+'/characters/seated-v296/character-02/front.webp','character-03':GMWW_SERVER_BASE+'/characters/seated-v297/character-03/front.webp' ,'character-04':GMWW_SERVER_BASE+'/characters/seated-v300/character-04/front.webp'});
function playCharacterSitting(member,now=playNow()){return Number(member?.seatId||0)>0||(member?.villageActivity==='sitting'&&Number(member?.sitUntil||0)>now)}
function playCharacterVisualUrl(member,frame=1,direction='right',now=playNow()){const id=playActiveCharacterId(member?.gameCharacterId),seatedUrl='';return playCharacterSitting(member,now)&&seatedUrl?seatedUrl:playCharacterFrameUrl(id,frame,direction)}
function playCharacterRendererApi(){return window.GMWW_CHARACTER_RENDERER||null}
function playCharacterAnimationCommand(member,{moving=false,sitting=false,effect='alive',hanging=false,battleTargetRunning=false,battleTurnTravel='',battleTurnFacing=''}={}){
  const base=member?.characterAnimation&&typeof member.characterAnimation==='object'?member.characterAnimation:{};
  const battleStatic=playSceneState.step==='battle';
  // Client-only GM effects; neither Seat nor authoritative Server/Player Web coordinates change.
  const eligible=!['dead','expelled','frozen'].includes(effect);
  const travel=battleStatic&&eligible&&['out','back'].includes(battleTurnTravel)?battleTurnTravel:'';
  const runTarget=battleStatic&&battleTargetRunning&&eligible&&!travel;
  const state=hanging?'walking':travel==='back'?'running':travel==='out'?'walking':runTarget?'running':!battleStatic&&moving?(base.state==='running'?'running':'walking'):'idle';
  const motion=state==='running'?'run':state==='walking'?'walk':'idle';
  return {...base,characterId:playActiveCharacterId(member?.gameCharacterId),state,motion,
    facing:(travel||battleTurnTravel==='hold')?(battleTurnFacing==='left'?'left':'right'):moving?playWalkDirection(member):(base.facing==='left'?'left':'right'),activity:motion,
    paused:effect==='dead'||(battleStatic&&!hanging&&!runTarget&&!travel),lowPower:battleStatic};
}
function playRigTextureUrl(characterId,facing='right'){return playCharacterFrameUrl(characterId,1,facing)}
function playMountCharacterRig(host,member,{moving=false,sitting=false,effect='alive'}={}){const id=playActiveCharacterId(member?.gameCharacterId),api=window.GMWW_SHARED_MOTION;if(!api?.supports(id))return false;api.mount(host,{characterId:id,command:playCharacterAnimationCommand(member,{moving,sitting,effect}),assetBase:location.protocol==='file:'?new URL('.',document.baseURI).href:GMWW_SERVER_BASE});return true}
function playUpdateCharacterRig(host,member,{moving=false,sitting=false,effect='alive',hanging=false,battleTargetRunning=false,battleTurnTravel='',battleTurnFacing=''}={}){return window.GMWW_SHARED_MOTION?.update(host,playCharacterAnimationCommand(member,{moving,sitting,effect,hanging,battleTargetRunning,battleTurnTravel,battleTurnFacing}))||false}
function playNow(){return Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0)}
function playWalkFrame(member,now=playNow()){if(member?.movementStatus!=='moving'||!member?.moveStartedAt)return 1;return (Math.floor(Math.max(0,now-Number(member.moveStartedAt))/95)%6)+1}
function playSeatStats(){
  const players=playLiveMembers(),configured=Number(playSceneRuntime.room?.seatCount||playSceneState.seatCount)||24,highestSeat=Math.max(0,...players.map(p=>Number(p?.seatId)||0)),seatCount=Math.min(30,Math.max(1,configured,players.length,highestSeat)),occupied=new Set(players.map(p=>Number(p?.seatId||0)).filter(n=>n>=1&&n<=seatCount));
  return{seatCount,occupied:occupied.size,available:Math.max(0,seatCount-occupied.size)}
}
function playSetBusy(on){
  playSceneRuntime.busy=!!on;
  for(const id of ['playPrimaryAction','playNext','playBack','playEndGame','playExitVillage']){const el=document.getElementById(id);if(el)el.disabled=!!on}
  renderPlayGatherToolbar(); // Restore button interactivity immediately when a request completes.
  renderPlayRoleAssignmentPanel(); // Restore draft approval interactivity after config save.
}
function playGameStatus(message,kind='info'){
  const status=document.getElementById('playGameStatus');
  if(!status)return;
  status.textContent=String(message||'');
  status.hidden=!message;
  status.dataset.kind=kind;
}
function playFlashError(message){
  playSceneRuntime.lastError=String(message||'Không thể thực hiện thao tác.');
  if(!document.getElementById('playGameSheet')?.classList.contains('hidden'))playGameStatus(playSceneRuntime.lastError,'error');
  const title=document.getElementById('playPhaseTitle');
  if(title)title.textContent=playSceneRuntime.lastError;
  setTimeout(()=>renderPlayRealtimeHeader(),1800);
}
async function playRoomApi(path='',opts={}){
  if(!isLivePlayRoom())throw new Error('Chưa có Phòng Online.');
  // While the Demo bot owns a lease, all its writes carry the same owner ID.
  const headers=playSceneRuntime.room?.demo===true&&typeof demoRunner!=='undefined'&&demoRunner.owner&&demoRunner.roomCode===String(playSceneState.roomCode)
    ?{...(opts.headers||{}),'x-gmww-demo-owner':demoRunner.owner}:opts.headers;
  return gmApi('/api/gm/rooms/'+encodeURIComponent(playSceneState.roomCode)+path,{...opts,headers});
}
function disconnectPlaySocket(){if(playSceneRuntime.socketReconnect){clearTimeout(playSceneRuntime.socketReconnect);playSceneRuntime.socketReconnect=0}if(playSceneRuntime.roomSyncTimer){clearTimeout(playSceneRuntime.roomSyncTimer);playSceneRuntime.roomSyncTimer=0}if(playSceneRuntime.pollTimer){clearInterval(playSceneRuntime.pollTimer);playSceneRuntime.pollTimer=0}try{playSceneRuntime.socket?.close(1000,'GM_ROOM_CHANGED')}catch{}playSceneRuntime.socket=null;playSceneRuntime.socketRoomCode=''}
function stopPlayGlobalVillagePoll(){if(playSceneRuntime.villagePollTimer){clearInterval(playSceneRuntime.villagePollTimer);playSceneRuntime.villagePollTimer=0}}
async function playSyncGlobalVillageMotion(forceRender=false){
  if(isLivePlayRoom())return null;
  try{
    const before=playPlayerRenderSignature(),res=await fetch(GMWW_SERVER_BASE+'/api/village?ts='+Date.now(),{cache:'no-store'}),d=await res.json();
    if(!res.ok||d?.ok===false)throw new Error(d?.message||d?.error||('HTTP '+res.status));
    if(Number.isFinite(Number(d?.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(d.serverTime)-Date.now();
    const rows=(Array.isArray(d?.players)?d.players:[]).map(p=>{const participantId=String(p?.participantId||''),loginId=String(p?.loginId||participantId.replace(/^member:/,''));return{...p,participantId:participantId||('member:'+loginId),kind:'member',loginId,online:p?.online!==false}});
    playSceneRuntime.players=rows;playSceneRuntime.lastSyncAt=Date.now();setPlayRealtimeState('live');
    const changed=before!==playPlayerRenderSignature();
    if(forceRender||changed)renderPlayPlayers();else syncPlayMovementTicker();
    renderPlayRealtimeHeader();return d
  }catch(err){setPlayRealtimeState('offline');return null}
}
function ensurePlayGlobalVillagePoll(){
  if(isLivePlayRoom()){stopPlayGlobalVillagePoll();return}
  if(playSceneRuntime.villagePollTimer)return;
  playSyncGlobalVillageMotion(true);
  playSceneRuntime.villagePollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&!playSceneRuntime.busy)playSyncGlobalVillageMotion(false)},1500)
}
function ensurePlayRealtimePoll(){if(!isLivePlayRoom()){if(playSceneRuntime.pollTimer){clearInterval(playSceneRuntime.pollTimer);playSceneRuntime.pollTimer=0}ensurePlayGlobalVillagePoll();return}stopPlayGlobalVillagePoll();if(playSceneRuntime.pollTimer)return;playSceneRuntime.pollTimer=setInterval(()=>{if(document.visibilityState==='visible'&&!playSceneRuntime.busy&&(!playSceneRuntime.socket||playSceneRuntime.socket.readyState!==WebSocket.OPEN))playSyncRoom(false)},2500)}
function playPlayerRenderSignature(players=playSceneRuntime.players){return (Array.isArray(players)?players:[]).map(p=>[String(p?.loginId||p?.participantId||''),Number(p?.seatId||0),String(p?.gameCharacterId||''),String(p?.movementStatus||''),String(p?.villageActivity||''),String(p?.moveId||''),String(p?.characterAnimation?.state||''),String(p?.characterAnimation?.motion||''),String(p?.characterAnimation?.facing||''),p?.online===false?'0':'1',p?.ready?'1':'0'].join(':')).sort().join('|')+':status:'+JSON.stringify((playSceneRuntime.activeEffects||[]).filter(x=>x?.effectActive!==false).map(x=>[x.loginId,x.type,x.statusId,x.expiresAt]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))}
function connectPlaySocket(){
  if(!isLivePlayRoom()){disconnectPlaySocket();setPlayRealtimeState('offline');return}
  const code=String(playSceneState.roomCode);
  if(playSceneRuntime.socket&&playSceneRuntime.socketRoomCode===code&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(playSceneRuntime.socket.readyState)){
    setPlayRealtimeState(playSceneRuntime.socket.readyState===WebSocket.OPEN?'live':'connecting');return
  }
  disconnectPlaySocket();setPlayRealtimeState('connecting');
  const base=String(GMWW_SERVER_BASE||'').replace(/^http:/,'ws:').replace(/^https:/,'wss:').replace(/\/$/,'');let ws;
  try{ws=new WebSocket(base+'/ws/'+encodeURIComponent(code))}catch{setPlayRealtimeState('offline');return}
  playSceneRuntime.socket=ws;playSceneRuntime.socketRoomCode=code;
  ws.onopen=()=>{if(playSceneRuntime.socket===ws){playSceneRuntime.socketFailures=0;setPlayRealtimeState('live');ensurePlayRealtimePoll()}};
  ws.onmessage=e=>{try{
    const d=JSON.parse(e.data||'{}');
    if(['demo_event','demo_control','demo_winner'].includes(d.type)&&String(playSceneState.roomCode)===code){void playSyncRoom(true);return}
    if(d.type==='gallows_updated'&&String(playSceneState.roomCode)===code){
      if(Number.isFinite(Number(d.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(d.serverTime)-Date.now();
      playSceneRuntime.gallows=d.gallows||null;
      battleState.gallowsClosedShown=false;
      if(playSceneState.step==='battle'&&playSceneState.phase==='day')battleGallowsRender('day');
      return;
    }
    const movementEvent=d.type==='player_move'||d.type==='player_move_complete',gameEvent=['night_turn','room_cycle','auto_gm'].includes(d.type);
    if(!['room_state','player_move','player_move_complete','night_turn','room_cycle','auto_gm','role_progress','artifact_progress','delivery_progress'].includes(d.type)||String(playSceneState.roomCode)!==code)return;
    if(d.type==='role_progress'||d.type==='artifact_progress'||d.type==='delivery_progress'){
      // The durable object stores acknowledgement timestamps; refresh from it,
      // rather than assuming a websocket notification means the card was viewed.
      if(playSceneRuntime.roomSyncTimer)clearTimeout(playSceneRuntime.roomSyncTimer);
      playSceneRuntime.roomSyncTimer=setTimeout(()=>{playSceneRuntime.roomSyncTimer=0;void playSyncRoom(true)},200);
      return;
    }
    setPlayRealtimeState('live');
    const beforePlayerSig=playPlayerRenderSignature();
    if(Number.isFinite(Number(d.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(d.serverTime)-Date.now();
    if(gameEvent){
      const room=d.room||playSceneRuntime.room;
      if(room){playSceneRuntime.room=room;if(Object.prototype.hasOwnProperty.call(room,'autoGM'))playSceneState.autoGM=room.autoGM!==false;const serverPhase=String(room.phase||'lobby').toLowerCase(),cyclePhase=String(room.cyclePhase||d.phase||'').toLowerCase(),cycleNight=Math.max(0,Number(room.cycleNight||d.night)||0);if(['running','started','game','playing'].includes(serverPhase)){playSceneState.step='battle';if(cyclePhase==='night'){playSceneState.phase='night';playSceneState.night=Math.max(1,cycleNight)}else if(cyclePhase==='morning'||cyclePhase==='day'){playSceneState.phase='day';playSceneState.night=Math.max(1,cycleNight)}}}
      if(d.runtime)playSceneRuntime.nightRuntime=d.runtime;else if(d.nightRuntime)playSceneRuntime.nightRuntime=d.nightRuntime;
      if(Array.isArray(d.players))playSceneRuntime.players=d.players;
      playSceneRuntime.lastSyncAt=Date.now();savePlayScene();renderPlayScene();
      if(playSceneRuntime.roomSyncTimer)clearTimeout(playSceneRuntime.roomSyncTimer);
      playSceneRuntime.roomSyncTimer=setTimeout(()=>{playSceneRuntime.roomSyncTimer=0;playSyncRoom(true)},180);return
    }
    const previousGmStage=playSceneRuntime.room?.gmStage;
    playSceneRuntime.room=d.room||playSceneRuntime.room;
    if(Array.isArray(d.players))playSceneRuntime.players=d.players;
    if(d.room?.gmStage&&d.room.gmStage!==previousGmStage&&!playStagePublishPending&&['room','seats','game','roles','deal'].includes(d.room.gmStage)&&['lobby','waiting'].includes(String(d.room.phase||'lobby'))){
      playSceneState.step=d.room.gmStage;savePlayScene();renderPlayScene();return;
    }
    playSceneRuntime.lastSyncAt=Date.now();
    if(d.room&&Object.prototype.hasOwnProperty.call(d.room,'autoGM'))playSceneState.autoGM=d.room.autoGM!==false;
    const playerRenderChanged=beforePlayerSig!==playPlayerRenderSignature();
    // Room-state heartbeats can contain an in-flight move too. Keep the player layer hot
    // instead of rebuilding the whole scene, so GM sees the same smooth movement as Player Web.
    if(movementEvent||d.type==='room_state'){if(playerRenderChanged)renderPlayPlayers();syncPlayMovementTicker();renderPlayRealtimeHeader()}
    else renderPlayScene()
  }catch{}};
  ws.onclose=()=>{if(playSceneRuntime.socket===ws){playSceneRuntime.socket=null;playSceneRuntime.socketRoomCode='';setPlayRealtimeState('connecting');if(isLivePlayRoom()&&String(playSceneState.roomCode)===code){const failures=Math.min(5,Number(playSceneRuntime.socketFailures||0)+1);playSceneRuntime.socketFailures=failures;playSceneRuntime.socketReconnect=setTimeout(connectPlaySocket,Math.min(10000,750*2**failures))}}};
  ws.onerror=()=>{if(playSceneRuntime.socket===ws)setPlayRealtimeState('offline')};
}
function playRoomDisplayName(){
  if(!isLivePlayRoom())return'SẢNH CHỜ';
  const runtimeName=String(playSceneRuntime.room?.roomName||'').trim();if(runtimeName)return playReadableRoomName(runtimeName);
  const hit=playRoomRegistry().find(x=>String(x?.roomCode||'')===String(playSceneState.roomCode||''));
  return playReadableRoomName(hit?.roomName)
}
function playReadableRoomName(value){const name=String(value||'').trim();return !name||/^(Phòng GMWW|Phòng Online)$/i.test(name)?'Làng Asahi':name}
function playVisibleStageLabel(){
  if(playSceneState.phase==='night')return 'Đêm '+Math.max(1,Number(playSceneState.night)||1);
  if(playSceneState.phase==='day')return 'Ngày '+Math.max(1,Number(playSceneState.night)||1);
  // The top timeline is the single authoritative label for all seven setup stages.
  const key=PLAY_STEPS.includes(playSceneState.step)?playSceneState.step:'lobby';
  const timelineButton=Array.from(document.querySelectorAll('[data-play-step]')).find(el=>el.dataset?.playStep===key);
  return String(timelineButton?.querySelector('b')?.textContent||PLAY_STEP_COPY[key]?.t||'Sảnh chờ').trim();
}
function renderPlayRealtimeHeader(){
  // Room-state / presence websocket events must never replace the current stage with the room name.
  const label=playVisibleStageLabel(),title=document.getElementById('playPhaseTitle');
  if(title)title.textContent=label;
  const next=document.getElementById('playPhasePill');
  if(next)next.setAttribute('aria-label','Bước hiện tại '+label+' · Chạm để tiếp tục');
}
function clearStalePlayRoom(){disconnectPlaySocket();playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.roomEnabled=false;playSceneState.selectedMemberIds=[];playSceneState.step='lobby';playSceneState.phase='lobby';playSceneRuntime.room=null;playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;savePlayScene();gmwwSendGmPresence(true);renderPlayScene()}
const PLAY_ROOM_REGISTRY_KEY='gmww_v306_room_registry';
const playRoomUiState={stage:'rooms',selectedCode:'',editorMode:'',lastTapCode:'',lastTapAt:0,modeTouched:false,pendingMode:'',modeSaving:false};
const PLAY_ROOM_MODE_CYCLE=['offline','online','demo'];
function nextPlayRoomMode(current,hasSelected=true){
  if(!hasSelected)return 'offline'; // First touch explicitly selects Offline.
  const at=PLAY_ROOM_MODE_CYCLE.indexOf(current);
  return PLAY_ROOM_MODE_CYCLE[(at+1)%PLAY_ROOM_MODE_CYCLE.length];
}
function playRoomRegistry(){try{const v=JSON.parse(localStorage.getItem(PLAY_ROOM_REGISTRY_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function savePlayRoomRegistry(rows){try{localStorage.setItem(PLAY_ROOM_REGISTRY_KEY,JSON.stringify((rows||[]).slice(0,30)))}catch{}}
function rememberPlayRoom(roomCode,gmToken,room={}){
  roomCode=String(roomCode||'');gmToken=String(gmToken||'');if(!roomCode||!gmToken)return;
  const rows=playRoomRegistry().filter(x=>String(x.roomCode)!==roomCode);
  rows.unshift({roomCode,gmToken,roomName:playReadableRoomName(room.roomName||document.getElementById('playCreateRoomName')?.value),roomMode:room.demo===true?'demo':room.roomMode==='offline'?'offline':'online',seatCount:Math.max(1,Math.min(30,Number(room.seatCount)||playSceneState.seatCount||12)),demo:room.demo===true,enabled:room.enabled!==false,updatedAt:Date.now()});savePlayRoomRegistry(rows)
}
function forgetPlayRoom(roomCode){savePlayRoomRegistry(playRoomRegistry().filter(x=>String(x.roomCode)!==String(roomCode||'')))}
function setPlayRoomUiStage(stage){playRoomUiState.stage=stage;renderPlayCreateRoomSheet()}
async function selectPlayExistingRoom(r){
  if(typeof demoStop==='function')await demoStop('room_change');
  playRoomUiState.selectedCode=String(r.roomCode||'');playRoomUiState.editorMode='';playRoomUiState.stage='mode';playRoomUiState.modeTouched=true;
  playSceneState.roomCode=String(r.roomCode);playSceneState.gmToken=String(r.gmToken);playSceneState.roomMode=r.demo===true?'demo':r.roomMode==='offline'?'offline':'online';playSceneState.seatCount=Math.max(1,Math.min(30,Number(r.seatCount)||12));playSceneState.roomEnabled=r.enabled!==false;savePlayScene();gmwwSendGmPresence(true);renderPlayCreateRoomSheet();
  const data=await playSyncRoom(true);
  if(!data){if(!isLivePlayRoom()){forgetPlayRoom(r.roomCode);playRoomUiState.selectedCode='';playRoomUiState.stage='rooms'}renderPlayCreateRoomSheet();return}
  // Repair only legacy auto-generated rooms; never change intentionally sized rooms.
  const legacy=/^(Phòng GMWW|Phòng Online)$/i.test(String(data.room?.roomName||'').trim());
  const idle=['lobby','waiting'].includes(String(data.room?.phase||'lobby').toLowerCase());
  if(legacy&&idle){
    if(Number(data.room?.seatCount)===12&&!data.room?.seatsLocked&&!(data.players||[]).length){
      await playUpdateRoomSettings({seatCount:24});
    }
    try{const renamed=await playRoomApi('/rename',{method:'POST',body:JSON.stringify({roomName:'Làng Asahi'})});playSceneRuntime.room=renamed.room||playSceneRuntime.room}catch(err){playFlashError(err.message)}
    rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
    renderPlayScene();
  }
  // Local room badges must be reconciled even when no legacy rename ran.
  rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||data.room||{});
  renderPlayCreateRoomSheet()
}
function renderPlayCreatedRooms(){
  const list=document.getElementById('playCreatedRoomList');if(!list)return;
  list.replaceChildren();
  playRoomRegistry().forEach(r=>{
    const b=document.createElement('button');b.type='button';b.className='play-created-room'+(String(r.roomCode)===String(playRoomUiState.selectedCode)?' active':'');
    b.innerHTML='<span><b>'+playEsc(playReadableRoomName(r.roomName))+'</b><small>'+playEsc(r.demo===true?'DEMO':(r.roomMode||'online').toUpperCase())+'</small></span><i class="'+(r.enabled!==false?'on':'')+'">'+(r.enabled!==false?'ON':'OFF')+'</i>';
    b.onclick=async()=>{
      const now=Date.now(),code=String(r.roomCode),doubleTap=playRoomUiState.lastTapCode===code&&(now-playRoomUiState.lastTapAt)<480;
      playRoomUiState.lastTapCode=code;playRoomUiState.lastTapAt=now;
      if(doubleTap){if(String(playSceneState.roomCode)!==code)await selectPlayExistingRoom(r);openPlayRoomEditor(false);return}
      await selectPlayExistingRoom(r);
    };
    list.appendChild(b);
  });
}
/* Demo controls now live at the top of the GM campfire menu. */
function demoPanelTouch(){}
const GMWW_DEMO_OBSERVER_COMPACT_KEY='gmww_demo_observer_compact_v1';
/* GM shortcuts: independent iPhone-friendly free icons; position is local-only. */
const GMWW_BATTLE_ICON_POSITIONS='gmww_battle_free_icons_v1';
function gmwwSetupFreeBattleIcons(){
  const shell=document.getElementById('playShell');if(!shell)return;
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(GMWW_BATTLE_ICON_POSITIONS)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}};
  const clamp=(node,left,top)=>{
    const width=node.offsetWidth||48,height=node.offsetHeight||48;
    return {left:Math.max(6,Math.min(Math.max(6,innerWidth-width-6),left)),
      top:Math.max(6,Math.min(Math.max(6,innerHeight-height-6),top))};
  };
  const place=(node,left,top)=>{
    const p=clamp(node,left,top);
    for(const [name,value] of Object.entries({left:p.left+'px',top:p.top+'px',right:'auto',bottom:'auto',transform:'none'}))
      node.style.setProperty(name,value,'important');
    return p;
  };
  // V3.235: five text slots; 🌈 is now a floating shortcut like DEMO.
  const rail=document.getElementById('battleBottomControls');
  if(rail){
    let actionSlot=document.getElementById('battleMainActionSlot');
    if(!actionSlot){actionSlot=document.createElement('div');actionSlot.id='battleMainActionSlot';actionSlot.className='battle-main-action-slot';}
    for(const id of ['battleDayActionFloat','battleActionTray']){
      const item=document.getElementById(id);if(item)actionSlot.appendChild(item);
    }
    for(const id of ['battleDayNoticeFloat','battleDayGallowsFloat']){
      const item=document.getElementById(id);if(!item)continue;
      item.classList.remove('gmww-free-icon');
      for(const css of ['left','top','right','bottom','transform','width','height'])item.style.removeProperty(css);
    }
    for(const item of [document.getElementById('playBattleClockFloat'),
      document.getElementById('battleDayNoticeFloat'),actionSlot,
      document.getElementById('battleDayGallowsFloat')])
      if(item)rail.appendChild(item);
    document.getElementById('battleSeaShortcuts')?.remove();
    const undo=document.getElementById('battleUndoFloat');
    if(undo){rail.appendChild(undo);undo.hidden=true;}
  }
  // DEMO and rainbow keep independent, local-only floating positions.
  for(const id of ['battleDemoObserver','battleFactionStatsFloat']){
    const panel=document.getElementById(id);if(!panel)continue;
    if(panel.parentElement!==shell)shell.appendChild(panel);
    const saved=read()[id];
    if(!panel.dataset.gmwwFreeRestored&&saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
      const width=panel.offsetWidth||48,height=panel.offsetHeight||48;
      place(panel,saved.x*Math.max(0,innerWidth-width),saved.y*Math.max(0,innerHeight-height));
    }
    if(id==='battleFactionStatsFloat'&&!saved&&!panel.dataset.gmwwFreeRestored){
      place(panel,innerWidth-64,Math.max(118,Math.min(innerHeight-80,Math.round(innerHeight*.23))));
    }
    panel.dataset.gmwwFreeRestored='1';
    if(panel.dataset.gmwwFreeReady)continue;
    panel.dataset.gmwwFreeReady='1';
    panel.classList.add('gmww-free-icon');
    const button=panel.querySelector(id==='battleDemoObserver'?'#battleDemoCollapse':'#battleFactionStatsToggle');
    if(!button)continue;
    let drag=null,blockClickUntil=0;
    const movable=()=>id!=='battleDemoObserver'||panel.classList.contains('is-collapsed');
    button.addEventListener('pointerdown',event=>{
      if(panel.hidden||!movable()||(event.button!==0&&event.pointerType!=='touch'))return;
      const rect=panel.getBoundingClientRect();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
      try{button.setPointerCapture(event.pointerId)}catch{}
    });
    button.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)<8)return;
      drag.moved=true;
      place(panel,drag.left+dx,drag.top+dy);
      event.preventDefault();
    });
    const finish=event=>{
      if(!drag||drag.id!==event.pointerId)return;
      if(drag.moved){
        blockClickUntil=Date.now()+450;
        if(event.type==='pointerup'){
          const rect=panel.getBoundingClientRect();
          const saved=read();
          saved[id]={x:Math.max(0,Math.min(1,rect.left/Math.max(1,innerWidth-rect.width))),
            y:Math.max(0,Math.min(1,rect.top/Math.max(1,innerHeight-rect.height)))};
          try{localStorage.setItem(GMWW_BATTLE_ICON_POSITIONS,JSON.stringify(saved))}catch{}
        }
        event.preventDefault();
      }
      drag=null;try{button.releasePointerCapture(event.pointerId)}catch{}
    };
    button.addEventListener('pointerup',finish);
    button.addEventListener('pointercancel',finish);
    button.addEventListener('click',event=>{
      if(Date.now()<blockClickUntil){event.preventDefault();event.stopImmediatePropagation()}
    },true);
    const keepVisible=()=>{
      if(!panel.hidden&&panel.style.left)place(panel,panel.getBoundingClientRect().left,panel.getBoundingClientRect().top);
    };
    window.addEventListener('resize',keepVisible,{passive:true});
    window.visualViewport?.addEventListener('resize',keepVisible,{passive:true});
  }
  // Escape old pointer-events:none dock; keep the statistics dialog interactive.
  const stats=document.getElementById('battleFactionStats');
  if(stats&&stats.parentElement!==shell)shell.appendChild(stats);
}
function battleMorningRows(){
  const night=arguments.length?Math.max(1,Number(arguments[0])||1):Math.max(1,Number(playSceneState.night)||1),
    timeOfDay=arguments[1]||'night';
  const match=String(playSceneRuntime.room?.matchId||'');
  const entries=Array.isArray(playSceneRuntime.villageHistory)?playSceneRuntime.villageHistory:
    Array.isArray(playSceneRuntime.recentInteractions)?playSceneRuntime.recentInteractions:[];
  const labels={dead:'đã chết',expelled:'đã bị đuổi khỏi làng',
    assassin_mark:'đã bị Sát Thủ chọn',marked:'đã bị đánh dấu',frozen:'đã bị đóng băng',
    silenced:'đã bị câm',infected:'đã bị nhiễm bệnh',protected:'được bảo vệ',
    saved:'đã được cứu',healed:'đã được hồi phục',revived:'đã hồi sinh',
    blessed:'đã được chúc phúc',shielded:'đã nhận khiên',poisoned:'đã bị đầu độc'};
  const negative=new Set(['dead','expelled','assassin_mark','marked','frozen','silenced','infected','poisoned','wolf_bite','cursed']);
  const rows=[],seen=new Set();
  for(const entry of entries){
    if(!entry||Number(entry.night)!==night||
       (entry.matchId&&String(entry.matchId)!==match)||
       (entry.effectActive===false&&/UNDO|RESTORE|REVERT|GM_CLEAR/i.test(String(entry.expiredReason||''))))continue;
    const type=String(entry.type||'');
    // The Assassin mark is recorded at NIGHT; its verified response is a DAY
    // event and must be announced once as a verdict, without leaking the GM sign.
    const resolvedAssassin=type==='assassin_mark'&&entry.status==='responded'&&
      ['👍','👎'].includes(String(entry.response||''))&&
      ['👍','👎'].includes(String(entry.gmChoice||''));
    const isDay=['gallows','day-action'].includes(String(entry.source||''))||
      ['morning','day'].includes(String(entry.cyclePhase||entry.phase||'').toLowerCase());
    if(timeOfDay==='day'?!(isDay||resolvedAssassin):isDay)continue;
    const assassinCorrect=resolvedAssassin&&entry.response===entry.gmChoice;
    const key=resolvedAssassin&&timeOfDay==='day'?(assassinCorrect?'assassin_correct':'assassin_wrong'):
      (type==='status'?String(entry.statusId||'status'):type);
    if(!key||['pending','responded'].includes(key))continue;
    const id=String(entry.id||entry.clientEventId||'')||key+':'+String(entry.loginId||'')+':'+String(entry.createdAt||'');
    if(seen.has(id))continue;seen.add(id);
    const loginId=String(entry.loginId||entry.playerId||'').replace(/^member:/,'');
    const member=loginId?battleMember(loginId):null;
    const maidenDeath=type==='dead'&&(String(entry.source||'')==='maiden-night-engine'||String(entry.actionId||'')==='action_visit_house');
    const rawLabel=key==='assassin_correct'?'đã chọn đúng dấu Sát Thủ · SỐNG':
      key==='assassin_wrong'?'đã chọn sai dấu Sát Thủ · CHẾT':
      maidenDeath?String(entry.message||'Thiếu Nữ đã chết vì Thăm Nhà').replace(/^Thiếu Nữ\s*/i,''):
      labels[key]||String(entry.effectName||entry.message||entry.actionId||key).trim();
    const targetRole=(playSceneRuntime.assignments||[]).find(a=>String(a.loginId)===loginId);
    const sourceId=String(entry.actorId||entry.sourceActorId||entry.causedBy||'').replace(/^member:/,'');
    const sourceMember=sourceId?battleMember(sourceId):null;
    const sourceRole=(playSceneRuntime.assignments||[]).find(a=>String(a.loginId)===sourceId);
    const targetName=String(member?.displayName||member?.name||loginId||'Người chơi');
    const role=String(targetRole?.roleName||targetRole?.roleCard?.name||targetRole?.roleId||'Vai Trò');
    const actor=sourceId?(String(sourceRole?.roleName||sourceRole?.roleCard?.name||sourceRole?.roleId||'Vai Trò')+
      ' ('+String(sourceMember?.displayName||sourceId)+')'):'';
    const isNegative=negative.has(key)||key==='assassin_wrong';
    const badAction=(type==='dead'&&!maidenDeath&&
      /wolf_bite|kill|poison|assassin_mark|stab|exile/i.test(String(entry.actionId||'')+' '+String(entry.effectId||'')))||
      (type==='poisoned'&&!!entry.actionId);
    rows.push({id,kind:key,name:targetName,role,actor,label:rawLabel,negative:isNegative,badAction,
      at:String(entry.respondedAt||entry.createdAt||''),day:isDay||resolvedAssassin});
  }
  return rows.sort((a,b)=>Number(b.negative)-Number(a.negative)||b.at.localeCompare(a.at));
}
function battleMorningShow(){
  const panel=document.getElementById('battleMorningReport'),
    body=document.getElementById('battleMorningList'),
    history=document.getElementById('battleVillageHistoryList');
  if(!panel||!body||playSceneState.phase!=='day')return;
  const currentNight=Math.max(1,Number(playSceneState.night)||1),
    key=String(playSceneRuntime.room?.matchId||'')+':'+currentNight,
    rows=battleMorningRows(currentNight,'night'),
    deaths=rows.filter(x=>x.kind==='dead').length,
    historyRows=Array.from({length:currentNight},(_,i)=>({
      night:i+1,nightRows:battleMorningRows(i+1,'night'),dayRows:battleMorningRows(i+1,'day')
    })),
    signature=key+':'+JSON.stringify(rows)+':'+JSON.stringify(historyRows);
  if(battleState.morningDayKey!==key){
    battleState.morningDayKey=key;battleState.morningOpen=true;battleState.morningSig='';
    if(battleState.morningAutoHideTimer)clearTimeout(battleState.morningAutoHideTimer);
    // Only the automatic daybreak bulletin closes after ten seconds;
    // history remains accessible on manual reopen through the toolbar.
    battleState.morningAutoHideTimer=setTimeout(()=>{
      if(battleState.morningDayKey!==key||playSceneState.phase!=='day')return;
      battleState.morningOpen=false;
      const sheet=document.getElementById('battleMorningReport');
      if(sheet)sheet.hidden=true;
    },10000);
  }
  const appendRows=(host,notices)=>{
    for(const row of notices){
      const line=document.createElement('p'),name=document.createElement('strong');
      line.className='battle-morning-line'+(row.negative?' is-critical':'')+(row.badAction?' is-bad-action':'');
      name.textContent=row.name+' ('+row.role+')';
      const action=String(row.label||'').trim();
      const sentence=action.startsWith('đã ')?' '+action:
        action.startsWith('chết ')||action.startsWith('đã chết ')?' '+action:
        ' '+action;
      const wording=sentence+(row.actor?' bởi '+row.actor:'');
      line.append(name,document.createTextNode(wording+(wording.trim().endsWith('.')?'':'.')));
      host.append(line);
    }
  };
  if(battleState.morningSig!==signature){
    battleState.morningSig=signature;body.replaceChildren();
    const summary=document.createElement('p');
    summary.className='battle-morning-summary';
    summary.textContent='ĐÊM '+currentNight+' · '+(deaths?'Làng có '+deaths+' người chết':
      rows.length?'Các tác động được ghi nhận':'Không ghi nhận tác động');
    body.append(summary);appendRows(body,rows);
    if(history){
      history.replaceChildren();
      for(const group of historyRows){
        const nightTitle=document.createElement('h4');nightTitle.textContent='ĐÊM '+group.night;
        const nightRows=document.createElement('div');appendRows(nightRows,group.nightRows);
        if(!group.nightRows.length)nightRows.textContent='Không ghi nhận tác động.';
        const dayTitle=document.createElement('h4');dayTitle.textContent='NGÀY '+group.night;
        const dayRows=document.createElement('div');appendRows(dayRows,group.dayRows);
        if(!group.dayRows.length)dayRows.textContent='Chưa có tác động được ghi nhận.';
        history.append(nightTitle,nightRows,dayTitle,dayRows);
      }
    }
  }
  panel.hidden=!battleState.morningOpen;
  if(battleState.morningAudioKey!==key){
    battleState.morningAudioKey=key;battleMorningPlayAudio();
  }
  // Assassin responses arrive after the morning announcement. Speak each
  // committed verdict exactly once when GM sync sees the response.
  const heard=battleState.morningVerdictsHeard||(battleState.morningVerdictsHeard=new Set());
  for(const row of battleMorningRows(currentNight,'day')){
    if(!['assassin_correct','assassin_wrong'].includes(row.kind))continue;
    const verdictId=key+':'+row.id+':'+row.kind;
    if(heard.has(verdictId))continue;
    heard.add(verdictId);
    const cue=row.kind==='assassin_correct'?'audio_system_assassin_correct':'audio_system_assassin_wrong';
    battleQueueDayAudio([[cue,row.name+(row.kind==='assassin_correct'?' đã chọn đúng · SỐNG':' đã chọn sai · CHẾT')]]);
  }
}
function battleRenderFactionStats(){
  const panel=document.getElementById('battleFactionStats');if(!panel||panel.hidden)return;
  const rows=Array.isArray(playSceneRuntime.assignments)?playSceneRuntime.assignments:[],
    groups=new Map([['Phe Dân',{total:0,alive:0}],['Phe Sói',{total:0,alive:0}],['Phe Ba',{total:0,alive:0}]]);
  for(const a of rows){
    const id=String(a?.loginId||''),card=(state.cards||[]).find(r=>String(r.id)===String(a.roleId||'')),
      raw=String(a?.roleCard?.factionId||card?.factionId||a?.factionId||a?.faction||'').toLowerCase();
    const fac=raw==='wolf'||raw.includes('sói')||raw.includes('soi')?'Phe Sói':
      raw==='third'||raw.includes('ba')?'Phe Ba':raw==='village'||raw.includes('dân')||raw.includes('dan')?'Phe Dân':'Phe Khác';
    const stat=groups.get(fac)||{total:0,alive:0};stat.total++;
    if(!['dead','expelled'].includes(playPlayerEffect(id)))stat.alive++;
    groups.set(fac,stat);
  }
  const summary=panel.querySelector('[data-faction-counts]');
  if(summary)summary.innerHTML=[...groups].filter(([,x])=>x.total>0).map(([name,v])=>
    '<div class="battle-faction-row"><span>'+playEsc(name)+'</span><b>'+v.alive+' / '+v.total+'</b>'+
    '<i style="--faction-progress:'+Math.round(100*v.alive/Math.max(1,v.total))+'%"></i></div>').join('')||'<p>Chưa phân vai.</p>';
  const preview=panel.querySelector('[data-faction-forecast]');
  const known=playSceneRuntime.winProposal;
  if(preview){
    const day=Math.max(1,Number(playSceneState.night)||1),wolf=groups.get('Phe Sói')?.alive||0,
      other=[...groups].filter(([name])=>name!=='Phe Sói').reduce((n,[,g])=>n+g.alive,0),
      villager=groups.get('Phe Dân')?.alive||0;
    if(known)preview.textContent='Server xác định: '+String(known.winnerFaction||'Phe thắng')+' · Ngày '+day+'.';
    else if(!rows.length)preview.textContent='Chưa có dữ liệu phe để dự báo.';
    else{
      const favored=wolf>=other?'Phe Sói':wolf===0?'Phe Dân':villager>=wolf?'Phe Dân':'Phe Sói';
      const estimate=wolf>=other||wolf===0?day:day+Math.max(1,Math.ceil(Math.abs(other-wolf)/2));
      preview.textContent='Dự báo tham khảo theo quân số: '+favored+' · khoảng ngày '+estimate+
        '. Đây là giả định, không tính tác động vai trò/Artifact và không phải kết quả Server.';
    }
  }
}
function initDemoPanel(){
  const panel=document.getElementById('battleDemoObserver'),button=document.getElementById('battleDemoCollapse');
  if(!panel||!button||button.dataset.ready)return;
  button.dataset.ready='1';
  const toggle=collapsed=>{
    panel.classList.toggle('is-collapsed',collapsed);
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'Mở bảng hành động DEMO':'Thu gọn bảng hành động DEMO');
    button.title=collapsed?'Mở lịch sử DEMO':'Thu gọn thành 🐦‍🔥';
    if(!collapsed)panel.classList.remove('has-unread');
  };
  let collapsed=true;try{collapsed=localStorage.getItem(GMWW_DEMO_OBSERVER_COMPACT_KEY)!=='0'}catch{}
  toggle(collapsed);
  button.addEventListener('click',e=>{
    e.stopPropagation();
    const next=!panel.classList.contains('is-collapsed');toggle(next);
    try{localStorage.setItem(GMWW_DEMO_OBSERVER_COMPACT_KEY,next?'1':'0')}catch{}
  });
}
/* Local-only magnetic layout: retain a relative anchor, not absolute pixels.
   A write happens only at pointerup; no new Server traffic during a match. */
const GMWW_DOCK_LAYOUT_KEY='gmww_saved_overlay_docks_v1';
function gmwwReadDocks(){
  try{const value=JSON.parse(localStorage.getItem(GMWW_DOCK_LAYOUT_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}
}
function gmwwSaveDock(panel,snap){
  if(!panel?.id)return;
  const value=gmwwReadDocks();
  if(snap?.anchorId&&['top','bottom'].includes(snap.edge))value[panel.id]={anchorId:snap.anchorId,edge:snap.edge};
  else delete value[panel.id];
  try{localStorage.setItem(GMWW_DOCK_LAYOUT_KEY,JSON.stringify(value))}catch{}
}
function gmwwRestoreDock(panel,force=false){
  if(!panel||panel.hidden)return false;
  if(!force&&panel.dataset.gmwwDockApplied==='1')return panel.classList.contains('gmww-dock-snapped');
  panel.dataset.gmwwDockApplied='1';
  const saved=gmwwReadDocks()[panel.id],allowed=['playSetupStrip','playBattleTop','gmTopMenu','battleBottomControls'];
  if(!saved||!allowed.includes(saved.anchorId)||!['top','bottom'].includes(saved.edge))return false;
  const bar=document.getElementById(saved.anchorId);
  if(!bar||bar.hidden||!bar.getClientRects()?.length)return false;
  const anchor=bar.getBoundingClientRect(),width=Math.min(anchor.width,innerWidth-16),height=panel.offsetHeight;
  if(width<40||!height)return false;
  const rawTop=saved.edge==='bottom'?anchor.top-height-5:anchor.bottom+5;
  const left=anchor.left+(anchor.width-width)/2;
  const p=battleTargetClampPosition(width,height,left,rawTop);
  const origin=panel.offsetParent?.getBoundingClientRect()||{left:0,top:0};
  panel.style.setProperty('left',(p.left-origin.left)+'px','important');
  panel.style.setProperty('top',(p.top-origin.top)+'px','important');
  panel.style.setProperty('right','auto','important');
  panel.style.setProperty('bottom','auto','important');
  panel.style.setProperty('transform','none','important');
  panel.style.setProperty('--gmww-dock-width',width+'px');
  panel.classList.add('gmww-dock-snapped');panel.dataset.dockEdge=saved.edge;
  return true;
}
/* Position the menu against the *rendered* campfire marker, not a guessed
   centre of the village or a hard-coded coordinate for one background.
   Evaluate above/below/side placements before clamping to the iPhone viewport. */
function gmwwPlaceWolfMenuAtFire(menu){
  const fire=document.querySelector('.play-village-core .play-core-pearl');
  if(!menu||menu.hidden||!fire?.getClientRects().length)return false;
  // This menu also opens from renderPlayBattle(), outside renderPlayScene().
  // Synchronise the fire hitbox with the CURRENT Day/Night image first, so
  // neither the popup nor the tap target can stay at the previous phase's fire.
  const core=fire.closest('.play-village-core');
  if(core&&typeof villageFirePosition==='function'){
    const [x,y]=villageFirePosition();
    core.style.left=x+'%';
    core.style.top=y+'%';
    core.dataset.gmwwFirePhase=playSceneState.phase==='night'?'night':'day';
  }
  const point=fire.getBoundingClientRect(),width=menu.offsetWidth,height=menu.offsetHeight;
  if(!width||!height)return false;
  const cx=(point.left+point.right)/2,cy=(point.top+point.bottom)/2,gap=8;
  const candidates=[
    {left:cx-width/2,top:point.top-height-gap},
    {left:cx-width/2,top:point.bottom+gap},
    {left:point.right+gap,top:cy-height/2},
    {left:point.left-width-gap,top:cy-height/2}
  ];
  let best=null;
  for(const candidate of candidates){
    const p=battleTargetClampPosition(width,height,candidate.left,candidate.top);
    const horizontal=Math.max(0,p.left-point.right,point.left-(p.left+width));
    const vertical=Math.max(0,p.top-point.bottom,point.top-(p.top+height));
    const overlaps=p.left<point.right&&p.left+width>point.left&&p.top<point.bottom&&p.top+height>point.top;
    const distortion=Math.hypot(p.left-candidate.left,p.top-candidate.top);
    const score=Math.hypot(horizontal,vertical)+distortion*1.6+(overlaps?10000:0);
    if(!best||score<best.score)best={...p,score};
  }
  if(!best)return false;
  const parent=menu.offsetParent,origin=parent?.getBoundingClientRect()||{left:0,top:0},
    sx=parent?.offsetWidth?origin.width/parent.offsetWidth:1,
    sy=parent?.offsetHeight?origin.height/parent.offsetHeight:1;
  // A scaled village or CSS zoom must not move the popup off the calibrated fire.
  menu.style.setProperty('left',((best.left-origin.left)/(sx||1))+'px','important');
  menu.style.setProperty('top',((best.top-origin.top)/(sy||1))+'px','important');
  menu.style.setProperty('right','auto','important');
  menu.style.setProperty('bottom','auto','important');
  menu.style.setProperty('transform','none','important');
  return true;
}

function demoTurnDescription(){
  const phase=playSceneState.phase,night=Math.max(1,Number(playSceneState.night)||1),rt=playSceneRuntime.nightRuntime;
  if(phase==='night')return 'Đêm '+night+' · '+(rt?.completed?'Hết lượt đêm':'Lượt '+(Math.max(0,Number(rt?.cursor)||0)+1)+'/'+(rt?.queue?.length||1)+' · '+String(battleTurn()?.label||'Đang đồng bộ'));
  const stages={ready:'Thảo luận',nominating:'Đề cử',selecting:'Chọn người lên giàn',voting:'Bỏ phiếu',closed:'Chốt phiếu',resolved:'Kết quả Lên Giàn'};
  return 'Ngày '+night+' · '+(stages[playSceneRuntime.gallows?.stage||'ready']||'Lên Giàn');
}
function demoActorIdentity(loginId){
  const id=String(loginId||'').replace(/^member:/,'');
  if(!id)return 'Không rõ Vai Trò (không rõ người chơi)';
  const member=playLiveMembers().find(m=>String(m.loginId)===id);
  const assignment=(playSceneRuntime.assignments||[]).find(row=>String(row.loginId)===id);
  const role=String(assignment?.roleName||assignment?.roleCard?.name||assignment?.roleId||'Vai Trò');
  const name=String(member?.displayName||member?.name||id);
  return role+' ('+name+')';
}
function demoActionLabel(event){
  const text=String(event?.action||event?.actionName||event?.actionId||'hành động').trim();
  const known=(playSceneRuntime.gameConfig?.roles||[]).flatMap(r=>r.functions||[]);
  return known.find(f=>[f.actionId,f.id].includes(text))?.name||text;
}
function demoObserve(action,actorId='',targetIds=[],status='accepted'){
  demoRunner.lastEvent={matchId:String(playSceneRuntime.room?.matchId||''),turn:demoTurnDescription(),
    action:String(action),actorId,actor:demoActorIdentity(actorId),targetIds:targetIds.slice(),
    targets:targetIds.map(demoActorIdentity),status};
  demoRenderObserver();
}
function demoRenderObserver(){
  const panel=document.getElementById('battleDemoObserver');if(!panel)return;
  const day=playSceneState.phase==='day';
  panel.hidden=day||!(playSceneRuntime.room?.demo===true&&playSceneState.step==='battle');
  if(panel.hidden)return;
  const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};
  const matchId=String(playSceneRuntime.room?.matchId||''),night=Math.max(1,Number(playSceneState.night)||1);
  const belongsToNight=event=>event&&String(event.matchId||'')===matchId&&
    (String(event.cycleKey||'')==='night-'+night||
     String(event.turn||'')==='Đêm '+night||
     String(event.turn||'').startsWith('Đêm '+night+' '));
  const records=(Array.isArray(demoRunner.history)?demoRunner.history:[])
    .filter(belongsToNight).slice().sort((a,b)=>Number(a.at||0)-Number(b.at||0));
  const last=belongsToNight(demoRunner.lastEvent)?demoRunner.lastEvent:null;
  const event=last||records[records.length-1]||null;
  const others=records.filter(row=>!event||String(row.id)!==String(event.id)).reverse();
  const actionText=row=>{
    const actor=row?.actorId?demoActorIdentity(row.actorId):String(row?.actor||'Hệ thống');
    const targets=row?.targetIds?.length?row.targetIds.map(demoActorIdentity):row?.targets||[];
    const action=demoActionLabel(row);
    const verb=row?.status==='pending'?'Đang thực hiện: ':row?.status==='skipped'?'Bỏ qua: ':'';
    return verb+actor+' đã thực hiện hành động ('+action+')'+(targets.length?' đến '+targets.join(', '):'');
  };
  set('battleDemoTurn',(demoRunner.running?'Đang chạy':demoRunner.paused?'Tạm dừng':'Đã dừng')+' · '+demoTurnDescription());
  set('battleDemoEventTurn',event?'MỚI NHẤT · '+String(event.turn||''):'');
  set('battleDemoEvent',event?actionText(event):'Chưa có hành động được xác nhận trong đêm này.');
  const action=event?demoActionLabel(event):'';
  panel.dataset.resultTone=!event?'neutral':/cắn|giết|đầu độc|đóng băng|trục xuất|bị đuổi|chết|câm|nhiễm|phạt/i.test(action)?'negative':'positive';
  const history=document.getElementById('battleDemoHistory');
  const list=document.getElementById('battleDemoHistoryList');
  const label=document.getElementById('battleDemoHistoryCount');
  if(history&&list){
    history.hidden=others.length===0;
    if(label)label.textContent='LỊCH SỬ ĐÊM '+night+' · '+others.length+' hành động trước';
    // Replace only when the Server ledger changes; keep the user's open/scroll state.
    const signature=matchId+':'+night+':'+others.map(row=>String(row.id||'')+':'+String(row.status||'')).join('|');
    if(typeof list.replaceChildren==='function'&&typeof document.createElement==='function'&&list.dataset.signature!==signature){
      list.dataset.signature=signature;list.replaceChildren();
      for(const row of others){
        const item=document.createElement('li'),turn=document.createElement('small'),detail=document.createElement('span');
        turn.textContent=String(row.turn||'').replace(/^Đêm \d+\s*·\s*/,'');
        detail.textContent=actionText(row);
        if(/cắn|giết|đầu độc|đóng băng|trục xuất|bị đuổi|chết|câm|nhiễm|phạt/i.test(demoActionLabel(row)))item.classList.add('is-critical');
        item.append(turn,detail);list.append(item);
      }
    }
  }
  const demoCount=document.getElementById('battleDemoCount');
  if(demoCount)demoCount.textContent=records.length?String(records.length):'';
  const rendered=String(event?.id||'');
  if(panel.dataset.lastRenderedDemoEvent&&rendered!==panel.dataset.lastRenderedDemoEvent&&panel.classList.contains('is-collapsed'))
    panel.classList.add('has-unread');
  panel.dataset.lastRenderedDemoEvent=rendered;
  set('battleDemoObserverError',demoRunner.error||'');
}
function demoNightPlanKey(t){return [playSceneRuntime.room?.matchId,playSceneRuntime.room?.cycleKey,t.id].join(':')}
function demoNightAlreadyUsed(action){
  const roleIds=action.roleIds?.length?action.roleIds:action.roleId?[action.roleId]:String(action.id||'').startsWith('role:')?[action.id.split(':')[1]]:[];
  return !action.artifactId&&(playSceneRuntime.battleActionUsage||[]).some(row=>String(row.matchId)===String(playSceneRuntime.room?.matchId)&&Number(row.night)===Number(playSceneState.night)&&String(row.actionId)===String(action.actionId)&&(!row.roleId||!roleIds.length||roleIds.includes(String(row.roleId)))&&(action.actorIds||[]).includes(String(row.actorId)));
}
async function demoRunNight(t,epoch){
  const key=demoNightPlanKey(t),active=()=>demoRunner.running&&epoch===demoRunner.epoch&&battleTurn()?.id===t.id&&demoNightPlanKey(t)===key&&demoRunner.roomCode===playSceneState.roomCode;
  if(!active())return;
  const clock=playSceneRuntime.demoControl?.clock||{durationMs:0,remainingMs:0};
  if(demoRunner.nightPlan?.key!==key){
    const all=battleActions(),tasks=all.filter(a=>!a.unavailable&&a.actorIds?.length&&!demoNightAlreadyUsed(a)),optional=tasks.find(a=>a.actionId==='action_witch_save'&&!a.artifactId);
    demoRunner.nightPlan={key,ids:tasks.map(a=>a.id),cursor:0,declined:optional&&Math.random()>=.5?optional.id:''};
    if(!tasks.length)demoObserve(all.map(a=>a.unavailableReason).filter(Boolean).join(' · ')||'Không có chức năng chủ động còn hợp lệ', '', [], 'skipped');
  }
  const plan=demoRunner.nightPlan,total=Math.max(1,plan.ids.length),
    duration=Math.max(0,Number(clock.durationMs)||0),remaining=Math.max(0,Number(clock.remainingMs)||0),
    elapsed=Math.max(0,duration-remaining),halfway=duration/2;
  // First half of each turn is exclusively GM-controlled. Schedule actions in the
  // second half and respect existing GM receipts/usage before automatic execution.
  if(duration>0&&elapsed<halfway)return;
  while(plan.cursor<plan.ids.length&&active()&&elapsed>=halfway+(duration-halfway)*plan.cursor/total){
    const id=plan.ids[plan.cursor],action=battleActions().find(a=>a.id===id),signature=key+':'+id;
    if(demoRunner.pending.has(signature))throw Error('Kết quả giao dịch lượt này chưa rõ. GM cần kiểm tra trước khi chạy tiếp.');
    if(!demoRunner.completed.has(signature)&&action&&!demoNightAlreadyUsed(action)){
      if(plan.declined===id)demoObserve('Phù Thuỷ chọn không Cứu','',[],'skipped');
      else if(action.unavailable)demoObserve(action.name+' · '+(action.unavailableReason||'Không còn hợp lệ'),'',[],'skipped');
      else if(action.artifactId&&Number(playSceneRuntime.artifactCycle?.count||0)>=Number(playSceneRuntime.artifactCycle?.max??3))demoObserve(action.name+' · Đã đạt giới hạn Artifact trong chu kỳ','',[],'skipped');
      else await demoExecuteNight(action,demoPick(action.actorIds),t,signature,epoch);
    }
    plan.cursor++;
    if(!active())return;
    const beforeSync=Number(playSceneRuntime.syncSerial||0);
    if(!await playSyncRoom(true)){if(Number(playSceneRuntime.syncSerial)>beforeSync+1)return;throw Error('Chưa đồng bộ được kết quả hành động.')}
  }
  if(!active()||Number(clock.remainingMs)>0)return;
  const response=await playRoomApi('/turn',{method:'POST',body:JSON.stringify({action:'next',expectedTurnId:t.id,source:'demo'})});
  if(response?.ok!==true)throw Error(response?.message||response?.error||'Không thể chuyển lượt.');
  demoRunner.visual=null;demoRunner.steps++;
  document.getElementById('battleResultPopup')?.setAttribute('hidden','');
}
function demoVisualCurrent(){
  const v=demoRunner.visual;
  return playSceneRuntime.room?.demo===true&&playSceneState.step==='battle'&&v&&v.matchId===String(playSceneRuntime.room.matchId||'')&&v.cycleKey===String(playSceneRuntime.room.cycleKey||'')&&v.turnId===String(battleTurn()?.id||playSceneState.phase)?v:null;
}
function demoFocus(action,actorId,targets){
  demoRunner.visual={matchId:String(playSceneRuntime.room?.matchId||''),cycleKey:String(playSceneRuntime.room?.cycleKey||''),turnId:String(battleTurn()?.id||playSceneState.phase),actionId:action.id,actorId,targetIds:[...targets]};
  demoRenderVisual();if(typeof battleMarkPlayers==='function')battleMarkPlayers();
}
function demoRenderVisual(){
  const v=demoVisualCurrent();
  const manual=playSceneRuntime.room?.demo===true&&typeof battleState!=='undefined'&&battleState.targets.length?battleState.actionId:'';
  document.querySelectorAll('[data-battle-action],[data-day-action]').forEach(node=>node.classList.toggle('demo-action-active',!!(manual||v?.actionId)&&(node.dataset.battleAction||node.dataset.dayAction)===(manual||v?.actionId)));
  document.getElementById('battleDemoEvent')?.classList.toggle('demo-action-active',!!v);
}
function openPlayRoomEditor(isNew=false){
  const ed=document.getElementById('playRoomEditor');if(!ed)return;
  playRoomUiState.editorMode=isNew?'new':'existing';playRoomUiState.stage='edit';playRoomUiState.modeTouched=!isNew;playRoomUiState.pendingMode='';
  if(isNew){
    playRoomUiState.selectedCode='';playSceneState.seatCount=24;playSceneState.roomMode='offline';playSceneState.roomEnabled=true;savePlayScene();
    const n=document.getElementById('playCreateRoomName');if(n)n.value='';
  }else{
    playRoomUiState.selectedCode=String(playSceneState.roomCode||'');
    const n=document.getElementById('playCreateRoomName');if(n)n.value=String(playSceneRuntime.room?.roomName||playRoomRegistry().find(x=>String(x.roomCode)===playRoomUiState.selectedCode)?.roomName||'Làng Asahi')
  }
  renderPlayCreateRoomSheet();renderPlayScene();setTimeout(()=>document.getElementById('playCreateRoomName')?.focus(),40)
}
async function savePlayRoomEditor(){
  if(playSceneRuntime.busy)return;
  if(playRoomUiState.editorMode==='new'){
    // Always create a standard room first; switching modes is a separate action.
    playSceneState.seatCount=24;playSceneState.roomMode='offline';playSceneState.roomEnabled=true;savePlayScene();
    const ok=await playCreateRoom(false);if(!ok)return;
    playRoomUiState.selectedCode=String(playSceneState.roomCode||'');playRoomUiState.editorMode='';playRoomUiState.stage='mode';playRoomUiState.modeTouched=false;
  }else{
    if(!isLivePlayRoom())return;
    if(!(await playSaveRoomName()))return;
    rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
    playRoomUiState.selectedCode=String(playSceneState.roomCode||'');playRoomUiState.editorMode='';playRoomUiState.stage='mode'
  }
  renderPlayCreateRoomSheet();renderPlayScene()
}
function renderPlayRoomModeControl(){
  const modeToggle=document.getElementById('playRoomModeToggle');if(!modeToggle)return;
  const live=isLivePlayRoom(),room=playSceneRuntime.room||{},roomReady=live&&String(playRoomUiState.selectedCode)===String(playSceneState.roomCode);
  const mode=playRoomUiState.pendingMode||(room.demo===true?'demo':playSceneState.roomMode);
  const selected=!roomReady||!playRoomUiState.modeTouched?'choose':mode;
  modeToggle.dataset.mode=selected;
  modeToggle.disabled=!roomReady||!!playSceneRuntime.busy||!!room.seatsLocked||
    ['running','started','game','playing'].includes(String(room.phase||'lobby').toLowerCase());
  const labels={choose:'CHẾ ĐỘ',offline:'📴 OFFLINE',online:'🌐 ONLINE',demo:'🎮 DEMO'};
  const label=modeToggle.querySelector('b');if(label)label.textContent=labels[selected]||labels.choose;
  modeToggle.setAttribute('aria-label','Hình thức chơi: nhấn để chuyển Offline, Online, Demo theo vòng');
  modeToggle.setAttribute('aria-pressed',String(roomReady&&playRoomUiState.modeTouched));
}
function renderPlayCreateRoomSheet(){
  const live=isLivePlayRoom(),room=playSceneRuntime.room||{},stage=playRoomUiState.stage;
  const name=document.getElementById('playCreateRoomName'),seatCount=document.getElementById('playCreateRoomSeatCount'),toggle=document.getElementById('playCreateRoomEnabled'),reset=document.getElementById('playCreateRoomReset'),del=document.getElementById('playCreateRoomDelete');
  if(seatCount&&document.activeElement!==seatCount)seatCount.value=String(playSceneState.seatCount||12);
  if(name&&live&&playRoomUiState.editorMode!=='new'&&document.activeElement!==name)name.value=String(room.roomName||name.value||'Làng Asahi');
  renderPlayRoomModeControl();
  const enabled=playSceneState.roomEnabled===true;if(toggle){toggle.classList.toggle('is-on',enabled);toggle.setAttribute('aria-pressed',String(enabled));const b=toggle.querySelector('b');if(b)b.textContent=enabled?'ON':'OFF'}
  document.getElementById('playRoomModeStep')?.classList.toggle('hidden',!(['mode','settings'].includes(stage)&&!!playRoomUiState.selectedCode));
  document.getElementById('playRoomSettingsStep')?.classList.add('hidden');
  document.getElementById('playRoomEditor')?.classList.toggle('hidden',stage!=='edit');
  if(reset)reset.disabled=false;if(del)del.disabled=false;renderPlayCreatedRooms();
}
async function playToggleRoomEnabled(){
  if(playSceneRuntime.busy)return;
  const enabled=playSceneState.roomEnabled!==true;
  if(!isLivePlayRoom()){playSceneState.roomEnabled=enabled;savePlayScene();renderPlayCreateRoomSheet();return}
  playSetBusy(true);
  try{const data=await playRoomApi('/enabled',{method:'POST',body:JSON.stringify({enabled})});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneState.roomEnabled=data?.room?.enabled!==false;if(!playSceneState.roomEnabled){playSceneRuntime.players=[];playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';playSceneState.step='room'}savePlayScene();rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});renderPlayCreateRoomSheet();renderPlayScene()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playResetCreatedRoom(){
  if(playSceneRuntime.busy)return;
  if(playRoomUiState.editorMode==='new'){const n=document.getElementById('playCreateRoomName');if(n){n.value='';n.focus()}return}
  if(!isLivePlayRoom())return;
  if(!confirm('RESET Phòng '+playSceneState.roomCode+'?\nToàn bộ người chơi, vị trí và dữ liệu ván trong phòng sẽ được làm mới.'))return;
  const keepEnabled=playSceneState.roomEnabled===true;
  playSetBusy(true);
  try{
    const body={transactionId:'room-page-'+Date.now(),expectedResetVersion:Number(playSceneRuntime.room?.resetVersion||0)};
    const data=await playRoomApi('/reset',{method:'POST',body:JSON.stringify(body)});
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;playSceneState.selectedMemberIds=[];playSceneState.step='room';playSceneState.phase='lobby';
    if((data?.room?.enabled!==false)!==keepEnabled){const en=await playRoomApi('/enabled',{method:'POST',body:JSON.stringify({enabled:keepEnabled})});playSceneRuntime.room=en.room||playSceneRuntime.room}
    playSceneState.roomEnabled=keepEnabled;savePlayScene();await playSyncRoom(true);renderPlayCreateRoomSheet()
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playDeleteCreatedRoom(){
  if(playSceneRuntime.busy)return;
  if(playRoomUiState.editorMode==='new'){const n=document.getElementById('playCreateRoomName');if(n)n.value='';playRoomUiState.editorMode='';playRoomUiState.stage='rooms';renderPlayCreateRoomSheet();return}
  if(!isLivePlayRoom())return;
  if(!confirm('XOÁ Phòng '+playSceneState.roomCode+'?\nPhòng sẽ biến mất khỏi Player Web và không thể tham gia lại.'))return;
  playSetBusy(true);
  try{const oldCode=playSceneState.roomCode;await playRoomApi('/delete',{method:'POST',body:'{}'});forgetPlayRoom(oldCode);clearStalePlayRoom();playRoomUiState.selectedCode='';playRoomUiState.editorMode='';playRoomUiState.stage='rooms';renderPlayCreateRoomSheet()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playSaveRoomName(){
  if(!isLivePlayRoom())return true;
  const input=document.getElementById('playCreateRoomName'),name=input?.value.trim()||'Làng Asahi',old=String(playSceneRuntime.room?.roomName||'');
  if(name===old)return true;
  try{const data=await playRoomApi('/rename',{method:'POST',body:JSON.stringify({roomName:name})});playSceneRuntime.room=data.room||playSceneRuntime.room;return true}
  catch(err){playFlashError(err.message);return false}
}
async function playCreateRoom(isDemo=false){
  if(playSceneRuntime.busy)return false;
  if(typeof demoStop==='function')await demoStop('room_change');
  playSetBusy(true);
  try{
    const response=await fetch(GMWW_SERVER_BASE+'/api/rooms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({roomName:document.getElementById('playCreateRoomName')?.value.trim()||'Làng Asahi',demo:false,roomMode:'offline',enabled:playSceneState.roomEnabled===true,seatMoveMode:'instant',seatCount:playSceneState.seatCount})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data?.roomCode)throw new Error(data?.message||data?.error||'Không tạo được Phòng.');
    playSceneState.roomCode=String(data.roomCode);playSceneState.gmToken=String(data.gmToken||'');playSceneState.seatMoveMode='instant';playSceneState.selectedMemberIds=[];playSceneState.step='lobby';playSceneState.phase='lobby';playSceneState.night=0;playSceneState.artifactCount=0;savePlayScene();gmwwSendGmPresence(true);
    await playSyncRoom(true);rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||data||{});try{memberAdminState.loaded=false;await loadMembers(false)}catch{}renderPlayCreateRoomSheet();renderPlayScene();return true
  }catch(err){playFlashError(err.message);return false}
  finally{playSetBusy(false)}
}
// The UI has no room-creation step, but the Durable Object Room remains authoritative.
async function playEnsureGatherRoom(){
  if(playSceneRuntime.busy)return false;
  const canGather=room=>room&&['lobby','waiting'].includes(String(room.phase||'lobby').toLowerCase());
  const enter=async()=>{
    if(!isLivePlayRoom()||!canGather(playSceneRuntime.room))return false;
    if(playSceneRuntime.room.enabled===false){
      // Reuse a disabled, empty lobby instead of allocating a new Room/DO.
      if((playSceneRuntime.players||[]).length||playSceneRuntime.room.seatsLocked)return false;
      try{const result=await playRoomApi('/enabled',{method:'POST',body:JSON.stringify({enabled:true})});
        playSceneRuntime.room=result.room||playSceneRuntime.room;playSceneState.roomEnabled=true;
      }catch(err){playFlashError(err?.message||'Không mở được phòng cũ.');return false}
    }
    playRoomUiState.selectedCode=String(playSceneState.roomCode);
    playRoomUiState.modeTouched=true;playRoomUiState.pendingMode='';
    playSceneState.roomMode=playSceneRuntime.room.demo===true?'demo':playSceneRuntime.room.roomMode==='offline'?'offline':'online';
    playSceneState.roomEnabled=true;playGatherToolsDismissed=false;playSceneState.step='seats';
    playSceneState.activePlayerId='';savePlayScene();
    rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room);
    const published=await playPublishStage('seats');
    if(!published){playSceneState.step='lobby';savePlayScene();renderPlayScene();return false}
    renderPlayScene();return true;
  };
  if(isLivePlayRoom()){
    const active=await playSyncRoom(true);
    if(canGather(active?.room)&&await enter())return true;
    if(active?.room&&!canGather(active.room)){
      playFlashError('Phòng đang trong ván. Không chuyển sang Tập Hợp để tránh mất trạng thái.');return false;
    }
  }
  // Restore only an idle room from the saved registry; never delete or reset history.
  for(const saved of playRoomRegistry().slice(0,5)){
    if(!saved.roomCode||!saved.gmToken||String(saved.roomCode)===String(playSceneState.roomCode))continue;
    await selectPlayExistingRoom(saved);
    if(canGather(playSceneRuntime.room)&&await enter())return true;
  }
  playSceneState.seatCount=24;playSceneState.roomEnabled=true;savePlayScene();
  if(!(await playCreateRoom(false)))return false;
  const created=await playSyncRoom(true);if(!canGather(created?.room))return false;
  return enter();
}
async function playCreateRoomNext(){
  if(playSceneRuntime.busy)return;
  if(!isLivePlayRoom()){
    await openPlayCreateRoomSheet();
    playFlashError('Hãy chọn một phòng có thật hoặc nhấn MỚI, đặt tên và LƯU trước khi tiếp tục.');
    return;
  }
  const sheet=document.getElementById('playCreateRoomSheet');
  if(sheet&&!sheet.classList.contains('hidden')&&String(playRoomUiState.selectedCode)!==String(playSceneState.roomCode)){
    playFlashError('Chọn một phòng trong danh sách trước khi tiếp tục.');
    return;
  }
  if(!playSceneRuntime.room){
    const checked=await playSyncRoom(true);
    if(!checked?.room){await openPlayCreateRoomSheet();return}
  }
  if(!(await playSaveRoomName()))return;
  rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
  playGatherToolsDismissed=false;playSceneState.step='seats';playSceneState.activePlayerId='';savePlayScene();void playPublishStage('seats');
  playRoomUiState.stage='rooms';playRoomUiState.editorMode='';
  document.getElementById('playCreateRoomSheet')?.classList.add('hidden');
  renderPlayScene();
}
function playSetupSyncFingerprint(){
  // Ignore heartbeat timestamps: only rebuild a setup scene when visible state changes.
  const room=playSceneRuntime.room||{},players=playSceneRuntime.players||[];
  return JSON.stringify([
    playSceneState.step,playSceneState.phase,playSceneState.roomMode,
    room.gmStage,room.phase,room.cyclePhase,room.matchId,room.seatsLocked,room.seatCount,
    room.mode,room.roomMode,room.roleDealLocked,room.demo,room.statusDisplay,
    players.map(p=>[p.loginId,p.participantId,p.seatId,p.ready,p.online,p.gameCharacterId,p.villageActivity,p.movementStatus,p.moveId,p.roleId]),
    (playSceneRuntime.assignments||[]).map(p=>[p.loginId,p.roleId,p.artifactId,p.id]),
    playSceneRuntime.gameConfig,playSceneRuntime.artifactCycle?.count
  ]);
}
async function playSyncRoom(force=false){
  if(!isLivePlayRoom())return null;
  if((playSceneRuntime.busy||playSceneRuntime.roomSyncInFlight)&&!force)return null;
  playSceneRuntime.roomSyncInFlight=true;
  const beforeRenderKey=playSceneState.step==='battle'?'':playSetupSyncFingerprint();
  const syncSerial=++playSceneRuntime.syncSerial;
  try{
    const data=await playRoomApi('');
    if(syncSerial!==playSceneRuntime.syncSerial)return data;
    if(Number.isFinite(Number(data?.serverTime)))playSceneRuntime.serverClockOffsetMs=Number(data.serverTime)-Date.now();
    playSceneRuntime.room=data.room||null;playSceneRuntime.players=Array.isArray(data.players)?data.players:[];playSceneRuntime.assignments=Array.isArray(data.assignments)?data.assignments:[];playSceneRuntime.battleActionUsage=Array.isArray(data.battleActionUsage)?data.battleActionUsage:[];playSceneRuntime.demoControl=data.demoControl||null;playSceneRuntime.gameConfig=data.gameConfig||null;playSceneRuntime.artifactCycle=data.artifactCycle||{count:0,max:3};playSceneRuntime.nightRuntime=data.nightRuntime||null;playSceneRuntime.drunkDraws=Array.isArray(data.drunkDraws)?data.drunkDraws:[];playSceneRuntime.battleUndo=data.battleUndo||null;playSceneRuntime.nightIntel=data.nightIntel||null;playSceneRuntime.winProposal=data.winProposal||null;playSceneRuntime.activeEffects=Array.isArray(data.activeEffects)?data.activeEffects:[];playSceneRuntime.recentInteractions=Array.isArray(data.interactions)?data.interactions:[];playSceneRuntime.villageHistory=Array.isArray(data.villageHistory)?data.villageHistory:playSceneRuntime.recentInteractions;playSceneRuntime.gallows=data.gallows||null;playSceneRuntime.dayActionUsage=Array.isArray(data.dayActionUsage)?data.dayActionUsage:[];playSceneRuntime.lastSyncAt=Date.now();playSceneRuntime.lastError='';
    const syncedServerPhase=String(data?.room?.phase||'lobby').toLowerCase();playSceneState.artifactCount=['running','started','game','playing'].includes(syncedServerPhase)?Math.max(0,Math.min(Number(playSceneRuntime.artifactCycle?.max??3),Number(playSceneRuntime.artifactCycle?.count||0))):0;const serverMemberIds=playSceneRuntime.players.filter(p=>p?.kind==='member'&&p?.loginId).map(p=>String(p.loginId));if(serverMemberIds.length||playSceneState.step!=='members'||playSceneState.roomMode!=='online')playSceneState.selectedMemberIds=serverMemberIds;
    const room=data.room||{},serverPhase=String(room.phase||'lobby').toLowerCase(),cyclePhase=String(room.cyclePhase||'').toLowerCase(),cycleNight=Math.max(0,Number(room.cycleNight)||0);playSceneState.autoGM=room.autoGM!==false;playSceneState.roomEnabled=room.enabled!==false;playSceneState.roomMode=room.demo===true?'demo':room.roomMode==='offline'?'offline':'online';playSceneState.seatMoveMode=room.seatMoveMode==='walk'?'walk':'instant';playSceneState.seatCount=Math.max(1,Math.min(30,Number(room.seatCount)||playSceneState.seatCount||12));
    if(!playStagePublishPending&&['room','seats','game','roles','deal'].includes(room.gmStage))playSceneState.step=room.gmStage==='room'?'lobby':room.gmStage;
    if(['running','started','game','playing'].includes(serverPhase)){
      playSceneState.step='battle';
      if(cyclePhase==='night'){playSceneState.phase='night';playSceneState.night=Math.max(1,cycleNight)}
      else if(cyclePhase==='morning'||cyclePhase==='day'){playSceneState.phase='day';playSceneState.night=Math.max(1,cycleNight)}
      else{playSceneState.phase='lobby';playSceneState.night=Math.max(0,cycleNight)}
    }else if(serverPhase==='role_delivery'){
      if(PLAY_STEPS.indexOf(playSceneState.step)<PLAY_STEPS.indexOf('deal'))playSceneState.step='deal';
      playSceneState.phase='lobby';
    }else if(serverPhase==='lobby'||serverPhase==='waiting'){
      playSceneState.phase='lobby';
      if(playSceneState.step==='battle')playSceneState.step=data.assignments?.length?'deal':'lobby';
    }
    try{await playSyncStatusDisplayDraft()}catch(error){console.warn('Status permissions will retry on next room sync',error)}
    if(typeof demoApplyServerControl==='function')demoApplyServerControl(data.demoControl);
    savePlayScene();connectPlaySocket();ensurePlayRealtimePoll();
    if(force||playSceneState.step==='battle'||beforeRenderKey!==playSetupSyncFingerprint())renderPlayScene();
    else renderPlayRealtimeHeader();
    await playWatchCompletion(data);return data;
  }catch(err){
    if(syncSerial!==playSceneRuntime.syncSerial)return null;
    playSceneRuntime.lastError=String(err.message||err);
    if([401,403,404].includes(Number(err?.status))){forgetPlayRoom(playSceneState.roomCode);clearStalePlayRoom();if(force)playFlashError('Phòng cũ không còn tồn tại. Đã trả GM về Làng hiện tại.');return null}
    if(force)playFlashError('Không đồng bộ được Phòng '+playSceneState.roomCode+'. '+playSceneRuntime.lastError);
    return null;
  }finally{if(syncSerial===playSceneRuntime.syncSerial)playSceneRuntime.roomSyncInFlight=false}
}
function playMovementPoint(m,pos,now=playNow()){if(m?.movementStatus!=='moving')return pos;const p=globalThis.GMWW_VILLAGE_LAYOUT.interpolate(m,now);return[p.x,p.y]}
function stopPlayMovementTicker(){if(playSceneRuntime.moveTicker){cancelAnimationFrame(playSceneRuntime.moveTicker);playSceneRuntime.moveTicker=0}}
// GM wolf character removed. Firepit menu remains the sole GM action entry.
function playMovementFrame(){
  if(playSceneState.step==='battle'){stopPlayMovementTicker();return}
  // The online GM can be idle indefinitely; avoid full DOM/rig reads at 60 FPS.
  // Keep ~30 FPS motion while preserving CSS-only status orbits independently.
  if(document.visibilityState==='hidden'){playSceneRuntime.moveTicker=0;return}
  const motionNow=performance.now();
  const sceneMoving=playVillageMembers().some(p=>p?.movementStatus==='moving'||p?.villageActivity==='sitting');
  const interval=sceneMoving?33:220;
  if(motionNow-Number(playSceneRuntime.lastMotionPaintAt||0)<interval){
    playSceneRuntime.moveTicker=requestAnimationFrame(playMovementFrame);return
  }
  playSceneRuntime.lastMotionPaintAt=motionNow;
  const rows=playVillageMembers().filter(p=>playSeatMovementActive(p)||p?.villageActivity==='sitting');
  const now=playNow(),ring=document.getElementById('playPlayerRing');if(!ring){playSceneRuntime.moveTicker=0;return}let active=false;
  for(const m of rows){
    const id=String(m?.loginId||m?.participantId||''),el=ring.querySelector('[data-play-player-id="'+CSS.escape(id)+'"]');if(!el)continue;
    const effect=playPlayerEffect(m.loginId),moving=effect!=='dead'&&playSeatMovementActive(m),sitting=effect!=='dead'&&playCharacterSitting(m,now);active=active||moving||sitting;
    if(moving){const point=playMovementPoint(m,null,now),pt=playMapDisplay(point[0],point[1]);el.style.left=pt[0]+'%';el.style.top=pt[1]+'%';el.style.zIndex=String(10+Math.round(pt[1]))}
    const host=el.querySelector('.play-player-avatar'),rigUpdated=host?playUpdateCharacterRig(host,m,{moving,sitting,effect}):false,im=rigUpdated?null:host?.querySelector('img'),direction=moving?playWalkDirection(m):'right',frame=moving?playWalkFrame(m,now):1,src=playCharacterVisualUrl(m,frame,direction,now),key=(sitting?'sit':direction)+':'+frame;
    el.dataset.walkDir=direction;el.classList.toggle('is-moving',moving);el.classList.toggle('is-sitting',sitting);if(im&&im.dataset.walkKey!==key){im.dataset.walkKey=key;im.src=src}
    // Movement stays visible on the character itself; do not reintroduce a second label below the name.
  }
  if(active)playSceneRuntime.moveTicker=requestAnimationFrame(playMovementFrame);else playSceneRuntime.moveTicker=0
}
function syncPlayMovementTicker(){
  if(playSceneState.step==='battle'){stopPlayMovementTicker();return}
  const active=playVillageMembers().some(p=>playPlayerEffect(p.loginId)!=='dead'&&(playSeatMovementActive(p)||p?.villageActivity==='sitting'));
  if(active&&!playSceneRuntime.moveTicker)playSceneRuntime.moveTicker=requestAnimationFrame(playMovementFrame);
  else if(!active)stopPlayMovementTicker()
}
function playSeatMovementActive(member){
  // Battle characters are stationary, including stale server movement records.
  if(playSceneState.step==='battle')return false;
  if(member?.movementStatus!=='moving')return false;
  const started=Number(member?.moveStartedAt),duration=Number(member?.moveDurationMs);
  if(!(started>0&&duration>0)||playNow()>=started+duration)return false;
  const matchStart=Date.parse(playSceneRuntime.room?.startedAt||'')||0;
  // Once a person owns a Seat, old wander data must never move them away from
  // the selected template during Ván Mẫu / Phân Vai / Phát Vai or previews.
  // The seating step can animate an explicitly requested Seat change, and a
  // battle can still show movement that genuinely started after match start.
  if(Number(member?.seatId||0)>0){
    if(playSceneState.step==='battle')return !!matchStart&&started>matchStart;
    return playSceneState.step==='seats'&&Number(member?.moveTargetSeatId||0)>0;
  }
  return !(playSceneState.step==='battle'&&matchStart&&started<=matchStart);
}
function battleRoomDisplayPosition(point){
  // All stages now use precisely the Worker/Player Web seat coordinates.
  return point;
}
// Visual-only suspended candidate; do not change seat IDs or the room's layout.
function playGallowsHangingCandidateId(){
  const g=playSceneRuntime.gallows;
  if(playSceneState.step!=='battle'||playSceneState.phase!=='day'||g?.hanging?.active!==true)return '';
  const id=String(g.hanging.candidateId||'');
  return (g.eligible||[]).includes(id)?id:'';
}
function syncPlayGallowsHanging(){
  const ring=document.getElementById('playPlayerRing');if(!ring)return;
  const accused=playGallowsHangingCandidateId(),fire=accused?villageGallowsPosition():null;
  ring.classList.toggle('has-gallows-hanging',!!accused);
  for(const token of ring.querySelectorAll('[data-play-player-id]')){
    const id=String(token.dataset.playPlayerId||''),active=!!(accused&&fire&&id===accused&&!token.classList.contains('is-dead')&&!token.classList.contains('is-expelled'));
    const was=token.classList.contains('gmww-gallows-hanging');
    if(active){
      if(!was){
        token.dataset.gallowsOriginLeft=token.style.left;
        token.dataset.gallowsOriginTop=token.style.top;
        token.dataset.gallowsOriginDepth=token.style.zIndex;
        token.dataset.gallowsOriginAria=token.getAttribute('aria-label')||'';
      }
      token.classList.add('gmww-gallows-hanging');
      token.style.left=Math.max(10,Math.min(90,Number(fire[0])))+'%';
      token.style.top=Math.max(5,Math.min(90,Number(fire[1])))+'%';
      token.style.zIndex='950';
      token.setAttribute('aria-label',(token.dataset.gallowsOriginAria||id)+' · Đang treo Lên Giàn');
    }else if(was){
      token.classList.remove('gmww-gallows-hanging');
      token.style.left=token.dataset.gallowsOriginLeft||token.style.left;
      token.style.top=token.dataset.gallowsOriginTop||token.style.top;
      token.style.zIndex=token.dataset.gallowsOriginDepth||'10';
      token.setAttribute('aria-label',token.dataset.gallowsOriginAria||id);
      for(const key of ['gallowsOriginLeft','gallowsOriginTop','gallowsOriginDepth','gallowsOriginAria'])delete token.dataset[key];
    }
    // The existing Character rig plays the exact Walk animation while suspended.
    // It never updates Seat/room positions; returning to the Seat restores Idle.
    if(active||was){const member=playVillageMembers().find(m=>String(m.loginId||m.participantId||'')===id);
      if(member)playUpdateCharacterRig(token.querySelector('.play-player-avatar'),member,{hanging:active,effect:playPlayerEffect(id)});
    }
  }
}
function renderPlayPlayers(){
  const ring=document.getElementById('playPlayerRing');if(!ring)return;
  const previewNew=playRoomUiState.editorMode==='new'&&!document.getElementById('playCreateRoomSheet')?.classList.contains('hidden');
  const seating=previewNew||(isLivePlayRoom()&&['room','seats'].includes(playSceneState.step)&&!playSceneRuntime.room?.seatsLocked),members=previewNew?[]:playVillageMembers(),seatCount=previewNew?24:playSeatStats().seatCount,positions=playSeatPositions(seatCount),projectedSeats=globalThis.GMWW_VILLAGE_LAYOUT.projectedSeatIds(members,seatCount),bySeat=new Map((previewNew?[]:members).map(m=>{
    const key=String(m?.participantId||(m?.loginId?'member:'+m.loginId:''));
    const seat=Number(projectedSeats[key]||m?.seatId||0);
    return[seat,m];
  }).filter(([seat])=>seat>=1&&seat<=seatCount)),selectedIds=new Set((playSceneState.selectedMemberIds||[]).map(String));
  // A server heartbeat does not invalidate 30 chibi rigs plus their animated
  // status orbits. Rebuild the layer only when visible gameplay inputs change.
  const domSig=JSON.stringify([
    playPlayerRenderSignature(members).split(':status:')[0],playSceneState.step,playSceneState.phase,
    playSceneState.activePlayerId,(playSceneState.selectedMemberIds||[]).join(','),
    seatCount,previewNew,seating,playSceneState.roomMode,playSceneState.seatMoveMode,
    // A template switch must invalidate the DOM even if seat IDs are unchanged.
    globalThis.GMWW_VILLAGE_LAYOUT.normalizeSeatLayout(playSceneRuntime.room?.seatLayout),
    playSceneRuntime.room?.seatOffset,playSeatOffsetPreview,playGatherSpacing(),
    (playSceneRuntime.assignments?.length?playSceneRuntime.assignments:playSceneState.assignmentsPreview||[])
      .map(a=>[a.loginId,a.roleId,a.roleName,a.artifactId]),
    !!gmwwGmPresenceState?.online,gmwwGmPresenceState?.sessionId||'',
    ring.clientWidth,ring.clientHeight
  ]);
  if(ring.dataset.gmwwPlayerDomSig===domSig&&ring.children.length){
    // Preserve 30 character rigs but always reconcile gameplay state: an expelled
    // player returning in the next night must brighten without being tapped.
    const visual=globalThis.GMWW_STATUS_VISUALS;
    for(const member of members){
      const id=String(member.loginId||member.participantId||'');
      const token=ring.querySelector('[data-play-player-id="'+CSS.escape(id)+'"]');
      if(!token)continue;
      const effect=playPlayerEffect(member.loginId);
      for(const status of ['alive','dead','frozen','expelled'])
        token.classList.toggle('is-'+status,status===effect&&status!=='alive');
      token.dataset.gmwwCurrentEffect=effect;
      playUpdateCharacterRig(token.querySelector('.play-player-avatar'),member,{moving:playSeatMovementActive(member),sitting:false,effect,battleTargetRunning:token.classList.contains('is-gm-target-running'),battleTurnTravel:token.dataset.gmwwFireWalk||'',battleTurnFacing:token.dataset.gmwwFireFacing||''});
      if(!visual)continue;
      const ids=visual.resolveRows(playSceneRuntime.activeEffects,member.loginId,playNow()),sig=ids.join('|');
      if(token.dataset.gmwwStatuses===sig)continue;
      token.dataset.gmwwStatuses=sig;
      token.querySelectorAll(':scope > .gmww-sv-overlay, .play-player-over > .gmww-sv-badges').forEach(n=>n.remove());
      if(ids.length){token.insertAdjacentHTML('beforeend',visual.overlay(ids));const badge=token.querySelector(':scope > .gmww-sv-badges');if(badge)token.querySelector('.play-player-over')?.prepend(badge);}
    }
    syncPlayMovementTicker();
    if(playSceneState.step==='battle')battleMarkPlayers();
    syncPlayGallowsHanging();
    return;
  }
  if(playSceneState.step==='battle')gmwwFireWalkDetach();
  ring.dataset.gmwwPlayerDomSig=domSig;
  ring.innerHTML='';ring.classList.toggle('is-dense',(seating?seatCount:members.length)>16);ring.classList.toggle('is-seating',seating);ring.classList.toggle('is-battle-view',playSceneState.step==='battle');ring.classList.toggle('is-battle-packed',playSceneState.step==='battle'&&members.length>20);
  const make=(m,pos,seatId=null)=>{
    const el=document.createElement('button'),effect=m?playPlayerEffect(m.loginId):'alive',moving=effect!=='dead'&&playSeatMovementActive(m),sitting=playSceneState.step!=='battle'&&effect!=='dead'&&!!m&&playCharacterSitting(m),isOnlinePick=false;
    el.type='button';if(seatId)el.dataset.seatId=String(seatId);if(m)el.dataset.playPlayerId=String(m.loginId||m.participantId||'');
    el.className='play-player-token gmww-sv-stage'+(m&&String(m.loginId)===String(playSceneState.activePlayerId)?' is-active':'')+(m&&selectedIds.has(String(m.loginId))?' is-roster-selected':'')+(effect!=='alive'?' is-'+effect:'')+(!m?' is-empty is-position':'')+(moving?' is-moving':'')+(sitting?' is-sitting':'')+(m&&seatId?' is-seat-occupied':'');
    const mapPoint=moving?playMovementPoint(m,pos,playNow()):pos,pt=playMapDisplay(mapPoint[0],mapPoint[1]);el.style.left=pt[0]+'%';el.style.top=pt[1]+'%';el.style.zIndex=String(10+Math.round(pt[1]));
    const name=m?.displayName||(seatId?('Vị trí '+seatId):'Trong Làng'),initial=(name.trim().charAt(0)||'•').toUpperCase(),effectLabel=effect==='dead'?'ĐÃ CHẾT':effect==='frozen'?'ĐÓNG BĂNG':effect==='expelled'?'BỊ ĐUỔI':null,presenceLabel=m?.online===false?'Offline':'Online';
    const gmAssignments=(playSceneRuntime.assignments||[]).length?playSceneRuntime.assignments:(playSceneState.assignmentsPreview||[]);
    const assignment=m?gmAssignments.find(a=>String(a?.loginId||'')===String(m.loginId||'')):null,roleLabel=assignment?.roleName||assignment?.roleId||'',showRole=!!roleLabel&&PLAY_STEPS.indexOf(playSceneState.step)>=PLAY_STEPS.indexOf('roles');const factionRaw=String(assignment?.faction||assignment?.roleCard?.factionId||(state.cards||[]).find(c=>String(c.id)===String(assignment?.roleId))?.factionId||'').toLowerCase(),roleFaction=factionRaw.includes('wolf')||factionRaw.includes('sói')?'wolf':factionRaw.includes('third')||factionRaw.includes('phe ba')?'third':'village';el.innerHTML=(m?'<div class="play-player-over"><b class="play-name-with-presence"><span class="play-name-text">'+playEsc(name)+'</span><span class="play-presence-dot" data-online="'+(m.online===false?'false':'true')+'" aria-hidden="true"></span></b>'+(showRole?'<span class="play-player-role" data-faction="'+roleFaction+'">'+playEsc(roleLabel)+'</span>':'')+'</div>':'')+'<div class="play-player-avatar">'+(m?'<img alt="">':'<img class="play-seat-leaf-art" src="village/seat-leaf.webp?v=320" alt="" aria-hidden="true">')+'</div>'+(m&&assignment?.artifactId&&playSceneState.artifactsEnabled?
      '<span class="play-player-artifact" aria-label="Artifact: '+playEsc(assignment.artifactName||(state.artifacts||[]).find(a=>String(a.id)===String(assignment.artifactId))?.name||'Artifact')+'"><span class="play-player-artifact-text" title="'+playEsc(assignment.artifactName||(state.artifacts||[]).find(a=>String(a.id)===String(assignment.artifactId))?.name||'Artifact')+'">'+playEsc(assignment.artifactName||(state.artifacts||[]).find(a=>String(a.id)===String(assignment.artifactId))?.name||'Artifact')+'</span></span>':'')+(!m?'<b>Vị trí '+seatId+'</b>':'');
    if(m&&globalThis.GMWW_STATUS_VISUALS){
      const statusVisuals=globalThis.GMWW_STATUS_VISUALS.resolveRows(playSceneRuntime.activeEffects,m.loginId,playNow());
      el.dataset.gmwwStatuses=statusVisuals.join('|');
      if(statusVisuals.length){el.insertAdjacentHTML('beforeend',globalThis.GMWW_STATUS_VISUALS.overlay(statusVisuals));const badge=el.querySelector(':scope > .gmww-sv-badges');if(badge)el.querySelector('.play-player-over')?.prepend(badge);}
    }
    el.setAttribute('aria-label',name+(m?' • '+presenceLabel:'')+(effectLabel?' • '+effectLabel:'')+(m&&playPlayerStatuses(m.loginId).length?' • '+playPlayerStatuses(m.loginId).map(x=>x.label).join(', '):''));el.title=name+(m?' • '+presenceLabel:'')+(effectLabel?' • '+effectLabel:'');
    // The foot tag displays exactly two graphemes; horizontal dragging steps through
    // the full Artifact name without moving the parent character or navigating turns.
    const artifactTag=el.querySelector('.play-player-artifact'),
      artifactText=artifactTag?.querySelector('.play-player-artifact-text');
    if(artifactTag&&artifactText){
      const full=artifactText.textContent||'';
      const words=full.trim().split(/\s+/u).filter(Boolean);
      let position=0,gesture=null;
      const show=()=>{artifactText.textContent=words.slice(position,position+2).join(' ')};
      show();
      artifactTag.addEventListener('pointerdown',event=>{
        if(event.pointerType==='mouse'&&event.button!==0)return;
        gesture={id:event.pointerId,x:event.clientX,position};
        artifactTag.setPointerCapture?.(event.pointerId);
        event.stopPropagation();
      });
      artifactTag.addEventListener('pointermove',event=>{
        if(!gesture||gesture.id!==event.pointerId)return;
        const delta=Math.trunc((gesture.x-event.clientX)/24);
        position=Math.max(0,Math.min(Math.max(0,words.length-2),gesture.position+delta));
        show();event.stopPropagation();
      });
      const end=event=>{
        if(!gesture||gesture.id!==event.pointerId)return;
        gesture=null;event.stopPropagation();
      };
      artifactTag.addEventListener('pointerup',end);
      artifactTag.addEventListener('pointercancel',end);
      artifactTag.addEventListener('click',event=>event.stopPropagation());
    }
    if(m){
      const host=el.querySelector('.play-player-avatar'),direction=moving?playWalkDirection(m):'right',frame=moving?playWalkFrame(m,playNow()):1,characterSrc=playCharacterVisualUrl(m,frame,direction),rigMounted=playMountCharacterRig(host,m,{moving,sitting,effect});el.dataset.walkDir=direction;
      if(!rigMounted){const im=host?.querySelector('img');if(im){im.src=characterSrc;im.dataset.walkKey=direction+':'+frame;im.decoding='async';im.onerror=()=>{im.onerror=null;im.replaceWith(Object.assign(document.createElement('span'),{textContent:initial}))}}}
      // A neutral preview does not assign/change the account's fixed character.
      if(!characterSrc)el.classList.add('is-character-preview');
      el.onclick=async()=>{
        if(Date.now()<Number(playSceneRuntime.ignoreSeatClickUntil||0))return;
        if(playSceneState.step==='battle'&&Date.now()<Number(battleState.ignoreSwipeClick||0))return;
        const lid=String(m.loginId||'');
        if(isOnlinePick){
          const ids=new Set((playSceneState.selectedMemberIds||[]).map(String));if(ids.has(lid))ids.delete(lid);else ids.add(lid);playSceneState.selectedMemberIds=[...ids];savePlayScene();renderPlayScene();return
        }
        if(seating&&playSceneState.activePlayerId&&String(playSceneState.activePlayerId)!==lid&&Number(m.seatId||0)>0){
          const selected=selectedPlayPlayer();if(selected&&String(selected.loginId)!==lid){await updateSelectedPlayerSeat({seatId:Number(m.seatId),swap:true});return}
        }
        playSceneState.activePlayerId=lid;savePlayScene();renderPlayScene()
      }
    }else if(seating){
      el.onclick=async()=>openPlaySeatAssignSheet(seatId)
    }
    // A Seat is NEVER draggable by itself: only world-level rigid-ring drag.
    ring.appendChild(el)
  };
  if(seating){
    for(let i=0;i<seatCount;i++){const seatId=i+1,m=bySeat.get(seatId)||null,pos=positions[i]||[50,57];make(m,pos,seatId)}
    // Only overflow participants have no place: never hash-spawn unassigned
    // accounts into a random cluster near buildings or the bridge.
    const waiting=members.filter(m=>!Number(projectedSeats[String(m?.participantId||(m?.loginId?'member:'+m.loginId:''))]||0));
    for(const m of waiting)make(m,playRoamPoint(m.loginId),null)
  }else{
    members.sort((a,b)=>String(a.loginId).localeCompare(String(b.loginId))).forEach((m,i)=>{
      const identity=String(m?.participantId||(m?.loginId?'member:'+m.loginId:'')),sid=Number(projectedSeats[identity]||m?.seatId||0),x=m?.positionX,y=m?.positionY,valid=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
      const pos=sid>=1&&sid<=seatCount?positions[sid-1]:valid(x)&&valid(y)?Object.values(globalThis.GMWW_VILLAGE_LAYOUT.clampPoint(x,y)):playRoamPoint(m.loginId,i,members.length);make(m,sid?battleRoomDisplayPosition(pos,sid,seatCount):pos,sid||null)
    })
  }
  syncPlayMovementTicker();
  // Vẽ lại vòng (realtime/poll) xóa class battle; gắn lại để GM luôn thấy ai đến lượt và mục tiêu đã chọn.
  if(playSceneState.step==='battle')battleMarkPlayers();
  syncPlayGallowsHanging();
}
async function renderPlayCards(){
  const selected=(playSceneRuntime.assignments.length?playSceneRuntime.assignments:(Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[])).find(a=>String(a?.loginId||'')===String(playSceneState.activePlayerId||'')),selectedRoleId=String(selected?.roleId||playSceneState.roleId||'');
  const role=state.cards?.find(x=>String(x.id)===selectedRoleId)||state.cards?.find(x=>String(x.legacyId)===selectedRoleId)||state.cards?.find(x=>String(x.id)===String(playSceneState.roleId))||state.cards?.[0]||null;
  const selectedArtifactId=String(selected?.artifactId||playSceneState.artifactId||''),artifact=state.artifacts?.find(x=>String(x.id)===selectedArtifactId)||state.artifacts?.find(x=>String(x.legacyId)===selectedArtifactId)||null;
  const roleName=document.getElementById('playRoleName'),artifactName=document.getElementById('playArtifactName'),roleImg=document.getElementById('playRoleArtwork'),artifactImg=document.getElementById('playArtifactArtwork');
  const stageIndex=PLAY_STEPS.indexOf(playSceneState.step),roleVisible=stageIndex>=PLAY_STEPS.indexOf('roles');
  if(roleName)roleName.textContent=roleVisible&&(selected?.roleName||role)?(selected?.roleName||role?.name||'Vai Trò'):'Chưa phân Vai Trò';
  if(artifactName)artifactName.textContent=roleVisible&&artifact?(artifact.name||'Artifact'):'Chưa có Artifact';
  if(roleImg){roleImg.style.opacity=roleVisible&&role?'1':'.28';roleImg.src=role?await resolveArtwork('cards',role.id,'thumb'):'default-artwork.webp'}
  const useArtifact=playSceneState.artifactsEnabled!==false&&!!(selected?selected.artifactId:selectedArtifactId);
  const artifactCard=document.getElementById('playArtifactCard'),fan=document.getElementById('playCardFan'),roleCard=document.getElementById('playRoleCard');
  artifactCard?.classList.toggle('hidden',!useArtifact);
  artifactCard?.setAttribute('aria-hidden',String(!useArtifact));
  fan?.classList.toggle('is-role-only',!useArtifact);
  if(!useArtifact){roleCard?.classList.add('is-front');artifactCard?.classList.remove('is-front')}
  if(artifactImg&&useArtifact){artifactImg.style.opacity=roleVisible&&artifact?'1':'.28';artifactImg.src=artifact?await resolveArtwork('artifacts',artifact.id,'thumb'):'default-artwork.webp'}
}
// Optimistic UI: taps update on the next paint, while a single sequential writer
// reconciles the most recent selection with the authoritative room on the server.
async function flushPlayRoomMode(){
  if(playRoomUiState.modeSaving)return;
  playRoomUiState.modeSaving=true;
  try{
    while(playRoomUiState.pendingMode){
      if(!isLivePlayRoom()||!playRoomUiState.selectedCode){playRoomUiState.pendingMode='';break;}
      const target=playRoomUiState.pendingMode,roomCode=String(playSceneState.roomCode);
      const patch={demo:target==='demo',roomMode:target==='online'?'online':'offline'};
      let data;
      try{data=await playRoomApi('/room-settings',{method:'POST',body:JSON.stringify(patch)})}
      catch(err){
        const previous=playSceneRuntime.room||{};
        const completed=!!previous.endedAt&&['lobby','waiting','ended'].includes(String(previous.phase||'').toLowerCase());
        if(err?.code!=='ROOM_MODE_REQUIRES_EMPTY_RESET'||!completed)throw err;
        if(roomCode!==String(playSceneState.roomCode)){playRoomUiState.pendingMode='';break;}
        // Repair pre-fix completed rooms with seats/assignments left behind.
        // Do not reset a running match or a normal occupied lobby.
        const reset=await playRoomApi('/reset',{method:'POST',body:JSON.stringify({
          transactionId:'completed-mode-'+String(previous.lastEndedMatchId||previous.matchId||roomCode),
          expectedResetVersion:Number(previous.resetVersion||0),postGame:false,preserveParticipants:false
        })});
        if(reset?.hardReset!==true||Number(reset?.playersCount||0)!==0||Number(reset?.assignmentsCount||0)!==0)
          throw new Error('Chưa giải phóng xong Seat của ván trước.');
        playSceneRuntime.room=reset.room||previous;playSceneRuntime.players=[];playSceneRuntime.assignments=[];
        if(roomCode!==String(playSceneState.roomCode)){playRoomUiState.pendingMode='';break;}
        playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';
        data=await playRoomApi('/room-settings',{method:'POST',body:JSON.stringify(patch)});
      }
      if(roomCode!==String(playSceneState.roomCode)){playRoomUiState.pendingMode='';break;}
      playSceneRuntime.room=data.room||playSceneRuntime.room;
      playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;
      playSceneState.roomMode=playSceneRuntime.room?.demo===true?'demo':playSceneRuntime.room?.roomMode==='offline'?'offline':'online';
      savePlayScene();rememberPlayRoom(roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
      if(playRoomUiState.pendingMode===target)playRoomUiState.pendingMode='';
    }
  }catch(err){
    // Do not keep an optimistic DEMO badge if isolation checks reject the transition.
    playRoomUiState.pendingMode='';
    playFlashError(err?.message||'Server chưa xác nhận chế độ phòng.');
  }finally{
    playRoomUiState.modeSaving=false;
    renderPlayCreateRoomSheet();
    // A tap received while reconciling should never be discarded.
    if(playRoomUiState.pendingMode)void flushPlayRoomMode();
  }
}
function bindPlayRoomModeButtons(){
  const button=document.getElementById('playRoomModeToggle');if(!button||button.dataset.modeBound==='1')return;
  button.dataset.modeBound='1';
  button.addEventListener('click',()=>{
    if(playSceneRuntime.busy||!isLivePlayRoom()||String(playRoomUiState.selectedCode)!==String(playSceneState.roomCode)||playSceneRuntime.room?.seatsLocked)return;
    const current=playRoomUiState.pendingMode||(playSceneRuntime.room?.demo===true?'demo':playSceneState.roomMode);
    playRoomUiState.pendingMode=nextPlayRoomMode(current,playRoomUiState.modeTouched);
    playRoomUiState.modeTouched=true;
    renderPlayCreateRoomSheet(); // immediate local response, no network wait
    void flushPlayRoomMode();
  });
}
function bindPlaySeatMoveButtons(){document.querySelectorAll('[data-play-seat-move]').forEach(b=>b.onclick=async()=>{const mode=b.dataset.playSeatMove==='walk'?'walk':'instant';playSceneState.seatMoveMode=mode;savePlayScene();if(isLivePlayRoom())await playUpdateRoomSettings({seatMoveMode:mode});else renderPlayScene()})}
async function playUpdateRoomSettings(patch={}){
  if(!isLivePlayRoom())return;playSetBusy(true);
  try{const data=await playRoomApi('/room-settings',{method:'POST',body:JSON.stringify(patch)});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;playSceneState.roomMode=playSceneRuntime.room?.demo===true?'demo':playSceneRuntime.room?.roomMode==='offline'?'offline':'online';playSceneState.seatMoveMode=playSceneRuntime.room?.seatMoveMode==='walk'?'walk':'instant';playSceneState.seatCount=Math.max(1,Math.min(30,Number(playSceneRuntime.room?.seatCount)||playSceneState.seatCount||12));savePlayScene();rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});renderPlayScene();renderPlayCreateRoomSheet();return true}
  catch(err){playFlashError(err.message);return false}finally{playSetBusy(false)}
}
async function playAddSeat(){const {seatCount}=playSeatStats();if(seatCount>=30){playFlashError('Phòng đã đạt tối đa 30 vị trí.');return}await playUpdateRoomSettings({seatCount:seatCount+1})}
function renderPlayContext(){
  const k=document.getElementById('playContextKicker'),t=document.getElementById('playContextTitle'),x=document.getElementById('playContextText'),actions=document.getElementById('playContextActions'),step=PLAY_STEP_COPY[playSceneState.step]||PLAY_STEP_COPY.room;
  const artifactMax=Math.max(0,Math.min(30,Number(playSceneRuntime.artifactCycle?.max??playSceneRuntime.gameConfig?.artifactLimitPerCycle??3)||0));
  if(playSceneState.phase==='night'){
    const runtime=playSceneRuntime.nightRuntime,current=runtime&&!runtime.completed?runtime.queue?.[runtime.cursor]:null,total=runtime?.queue?.length||0,done=Math.min(total,Number(runtime?.cursor||0));
    if(k)k.textContent='ĐÊM '+Math.max(1,playSceneState.night)+(total?' • '+Math.min(done+1,total)+'/'+total:'');
    if(t)t.textContent=current?.label||(runtime?.completed?'Đã hoàn tất các lượt Ban Đêm':'Đang chuẩn bị thứ tự Đêm');
    if(x){
      if(current?.kind==='wolf-introduction')x.textContent='Bầy Sói ơi dậy đi nhìn mặt nhau. Bước này chỉ có ở Đêm 1.';
      else if(current?.kind==='early-artifact')x.textContent='Lượt Artifact gọi sớm. Nếu dùng tại đây, lượt chính của Artifact này sẽ tự bỏ qua.';
      else if(current?.kind==='role')x.textContent='Gọi Vai Trò này thực hiện chức năng. Các người chơi cùng Vai Trò được gom chung một lượt.';
      else if(current?.kind==='artifact-main')x.textContent='Lượt chính của Artifact. Artifact đã dùng ở lượt gọi sớm sẽ không xuất hiện lại.';
      else x.textContent='Toàn bộ thứ tự đêm đang được server giữ và đồng bộ cho GM.';
      const deadline=Date.parse(runtime?.deadlineAt||'')||0;if(deadline>0&&!runtime?.completed){const remain=Math.max(0,Math.ceil((deadline-Date.now())/1000));x.textContent+=(x.textContent?' • ':'')+remain+' giây'}
    }
    if(actions)actions.innerHTML='<button class="play-action-chip active" type="button"><span>☾</span><b>Đêm '+Math.max(1,playSceneState.night)+'</b></button><button class="play-action-chip" type="button"><span>✦</span><b>Artifact '+Math.min(artifactMax,playSceneState.artifactCount)+'/'+artifactMax+'</b></button>';
  }else if(playSceneState.phase==='day'){
    if(k)k.textContent='BAN NGÀY';if(t)t.textContent='Công bố người chết → Thảo luận → Bỏ phiếu';if(x){x.textContent='Chỉ hiện kết quả người chết rồi chuyển sang Ngày. Bỏ phiếu điện tử dùng chung cho hai chế độ Online.';const sec=Math.max(0,Number((playSceneRuntime.gameConfig?.timing||playSceneState.gameTiming||{}).villageDiscussionSec)||0),started=Date.parse(playSceneRuntime.room?.cycleStartedAt||'')||0;if(sec&&started){const remain=Math.max(0,Math.ceil((started+sec*1000-Date.now())/1000));x.textContent+=' • '+remain+' giây'}};
    if(actions)actions.innerHTML='<button class="play-action-chip active" type="button"><span>☀</span><b>Ban Ngày</b></button><button class="play-action-chip" type="button"><span>✓</span><b>Bỏ phiếu</b></button>';
  }else{
    if(k)k.textContent=step.k;if(t)t.textContent=step.t;
    if(x){
      if(isLivePlayRoom()&&(playSceneState.step==='room'||playSceneState.step==='members')){const s=playSeatStats();x.textContent=(playSceneState.roomMode==='offline'?'OFFLINE':'ONLINE')+' • '+s.occupied+'/'+s.seatCount+' ghế có người • '+s.available+' ghế trống.'}
      else if(playSceneState.step==='game')x.textContent=(playSceneRuntime.gameConfig?.name||playSceneState.gameName||'Chưa chọn Ván Mẫu')+' • '+playRolePlanTotal()+'/'+playLiveMembers().length+' Vai Trò.';
      else if(playSceneState.step==='seats'){const st=playSeatStats();x.textContent=st.occupied+'/'+st.seatCount+' vị trí đã có người • '+st.available+' vị trí còn trống'+(playSceneRuntime.room?.seatsLocked?' • ĐÃ KHÓA VỊ TRÍ':'');}
      else if(playSceneState.step==='roles')x.textContent='Đã cấu hình '+playRolePlanTotal()+' Vai Trò. Nhấn PHÂN VAI để chia ngẫu nhiên; chưa gửi xuống Player Web.';
      else if(playSceneState.step==='deal'){const p=playDeliveryProgress();x.textContent=p.success?'ĐÃ PHÁT VAI THÀNH CÔNG '+p.delivered+'/'+p.total+' • Đã xem Vai Trò '+p.viewed+'/'+p.total+'. Nhấn VÀO TRẬN để tiếp tục.':(playSceneState.assignmentsPreview?.length||0)+'/'+playLiveMembers().length+' Thành Viên đã được phân. Nhấn PHÁT VAI để gửi lên Player Web.';}
      else x.textContent=playSceneRuntime.lastError||step.x;
    }
    if(actions){
      if(playSceneState.step==='deal'&&playDeliveryProgress().success){
        const p=playDeliveryProgress();actions.innerHTML='<button class="play-action-chip active" type="button" disabled><span>✓</span><b>Đã phát '+p.delivered+'/'+p.total+' · Đã xem '+p.viewed+'/'+p.total+'</b></button>';
      }else if(playSceneState.step==='deal'&&(playSceneState.assignmentsPreview?.length||0)){
        actions.innerHTML='<button class="play-action-chip" data-play-reroll-role type="button"><span>↻</span><b>Vai Trò</b></button><button class="play-action-chip" data-play-reroll-artifact type="button"><span>✦</span><b>Artifact</b></button><button class="play-action-chip" data-play-cycle-artifact type="button"><span>⇄</span><b>Đổi Artifact</b></button>';
        actions.querySelector('[data-play-reroll-role]')?.addEventListener('click',()=>playBuildAssignments({preserveArtifacts:true}));
        actions.querySelector('[data-play-reroll-artifact]')?.addEventListener('click',playRerollArtifacts);
        actions.querySelector('[data-play-cycle-artifact]')?.addEventListener('click',playCycleActiveArtifact);
      }else if(playSceneState.step==='room'){actions.innerHTML=''}else if(playSceneState.step==='members'){
        const chosen=(playSceneState.selectedMemberIds||[]).length,online=(memberAdminState.members||[]).filter(m=>m?.online).length;
        actions.innerHTML=playSceneState.roomMode==='online'?'<button class="play-action-chip active" disabled><span>●</span><b>'+chosen+' đã chọn / '+online+' Online</b></button>':'<button class="play-action-chip active" data-play-open-roster type="button"><span>☰</span><b>Danh sách Người Chơi</b></button>';
        actions.querySelector('[data-play-open-roster]')?.addEventListener('click',openPlayRosterSheet)
      }else if(playSceneState.step==='game'){
        actions.innerHTML='<button class="play-action-chip active" type="button" disabled><span>▣</span><b>'+playEsc(playSceneState.gameName||'Ván Mẫu')+'</b></button>'
      }else if(playSceneState.step==='seats'){
        const st=playSeatStats(),locked=!!playSceneRuntime.room?.seatsLocked;
        actions.innerHTML='<button class="play-action-chip" data-play-call-members type="button"><span>♧</span><b>GỌI THÀNH VIÊN</b></button><button class="play-action-chip active" data-play-seat-manual type="button"><span>☝</span><b>THỦ CÔNG</b></button><button class="play-action-chip" data-play-random-seats type="button"><span>⚄</span><b>NGẪU NHIÊN</b></button><button class="play-action-chip '+(locked?'active':'')+'" data-play-seat-lock-toggle type="button"><span>'+ (locked?'🔒':'🔓') +'</span><b>'+(locked?'MỞ KHÓA XẾP CHỖ':'CHỐT XẾP CHỖ')+'</b></button><button class="play-action-chip play-seat-total" disabled><span>●</span><b>'+st.occupied+'/'+st.seatCount+'</b></button>';
        actions.querySelector('[data-play-call-members]')?.addEventListener('click',playCallOnlineMembers);
        actions.querySelector('[data-play-random-seats]')?.addEventListener('click',playRandomSeatRemaining);
        actions.querySelector('[data-play-seat-lock-toggle]')?.addEventListener('click',()=>playSetSeatLock(!locked));
        actions.querySelector('[data-play-seat-manual]')?.addEventListener('click',()=>playFlashError('Chạm chiếc lá trên sân rồi chọn người chơi cho vị trí đó.'))
      }else if(playSceneState.step==='roles'){actions.innerHTML='<button class="play-action-chip" data-play-assign-auto type="button"><b>TỰ ĐỘNG</b></button><button class="play-action-chip" data-play-assign-random type="button"><b>NGẪU NHIÊN</b></button>';actions.querySelector('[data-play-assign-auto]')?.addEventListener('click',()=>{try{playBuildAssignments({random:false})}catch(e){playFlashError(e.message)}});actions.querySelector('[data-play-assign-random]')?.addEventListener('click',()=>{try{playBuildAssignments()}catch(e){playFlashError(e.message)}})}else actions.innerHTML='';
    }
  }
  if(actions&&playSceneState.step==='battle'&&playSceneState.activePlayerId){
    const m=playLiveMembers().find(p=>String(p?.loginId||'')===String(playSceneState.activePlayerId)),stateLabel=playPlayerEffect(playSceneState.activePlayerId);
    actions.insertAdjacentHTML('beforeend','<button class="play-action-chip play-state-chip '+(stateLabel==='frozen'?'active':'')+'" data-play-player-state="frozen" type="button"><span>❄</span><b>Đóng băng</b></button><button class="play-action-chip play-state-chip '+(stateLabel==='expelled'?'active':'')+'" data-play-player-state="expelled" type="button"><span>↗</span><b>Đuổi</b></button><button class="play-action-chip play-state-chip '+(stateLabel==='dead'?'active':'')+'" data-play-player-state="dead" type="button"><span>✕</span><b>Chết</b></button><button class="play-action-chip play-state-chip" data-play-player-state="clear_state" type="button"><span>↺</span><b>Gỡ trạng thái</b></button>');
    const activeSts=playPlayerStatuses(playSceneState.activePlayerId),activeIds=new Set(activeSts.map(x=>x.statusId));
    actions.insertAdjacentHTML('beforeend',STATUS_CHIP_IDS.map(id=>'<button class="play-action-chip play-state-chip'+(activeIds.has(id)?' active':'')+'" data-play-player-state="status:'+id+'" type="button"><span>'+STATUS_UI[id].icon+'</span><b>'+STATUS_UI[id].chip+'</b></button>').join(''));
    if(t&&m)t.textContent=m.displayName+' • '+(stateLabel==='alive'?'Đang sống':stateLabel==='frozen'?'Đóng băng':stateLabel==='expelled'?'Bị đuổi':'Đã chết')+(activeSts.length?' • '+activeSts.map(x=>x.label).join(', '):'');
    bindPlayPlayerStateActions()
  }
  if(actions&&isLivePlayRoom()&&playSceneState.activePlayerId&&playSceneState.phase==='lobby'){
    actions.insertAdjacentHTML('beforeend','<button class="play-action-chip" data-play-manage-seat type="button"><span>◌</span><b>Đổi / bỏ vị trí</b></button>');
    actions.querySelector('[data-play-manage-seat]')?.addEventListener('click',openPlaySeatSheet)
  }
}
let playStagePublishQueue=Promise.resolve(),playStagePublishPending=0;
function initPlayGatherSpacing(){
  const output=document.getElementById('playGatherSpacingValue');
  if(output)output.textContent=globalThis.GMWW_VILLAGE_LAYOUT.normalizeSeatSpacing(
    playSeatSpacingPreview??playSceneRuntime.room?.seatSpacing)+'%';
}
// Update seat-anchor CSS only during a pinch; do not remount 6–30 Character rigs.
function playPreviewPinchSeats(){
  const ring=document.getElementById('playPlayerRing');if(!ring)return;
  const positions=playSeatPositions(playSeatStats().seatCount);
  for(const seat of ring.querySelectorAll('[data-seat-id]')){
    const p=positions[Number(seat.dataset.seatId)-1];if(!p)continue;
    const pt=playMapDisplay(p[0],p[1]);
    seat.style.left=pt[0]+'%';seat.style.top=pt[1]+'%';seat.style.zIndex=String(10+Math.round(pt[1]));
  }
  initPlayGatherSpacing();
}
function initPlaySeatOffsetControls(){
  const layout=globalThis.GMWW_VILLAGE_LAYOUT;
  const current=()=>playSeatOffsetPreview??playSceneRuntime.room?.seatOffset;
  const safe=offset=>layout.resolveSeatOffset(playSeatStats().seatCount,
    playSceneRuntime.room?.seatLayout,offset,
    playSeatSpacingPreview??playSceneRuntime.room?.seatSpacing??100);
  const offset=()=>safe(current());
  const adjustable=()=>playSceneState.step==='seats'&&playSceneState.phase==='lobby'&&
    !playSceneRuntime.room?.seatsLocked&&!playSceneRuntime.busy;
  // Drag replaces four direction buttons. Only reset remains beside spacing.
  const reset=document.querySelector('[data-seat-shift="reset"]');
  if(reset){
    reset.disabled=!adjustable();
    if(!reset.dataset.bound){
      reset.dataset.bound='1';
      reset.addEventListener('click',async()=>{
        if(!adjustable())return;
        playSeatOffsetPreview={x:0,y:0};playSeatSpacingPreview=100;
        renderPlayPlayers();
        try{await playUpdateRoomSettings({seatOffset:{x:0,y:0},seatSpacing:100})}
        finally{playSeatOffsetPreview=null;playSeatSpacingPreview=null;renderPlayScene()}
      });
    }
  }
  // Gesture on any Seat or free scene surface translates all anchors together.
  // No per-Seat reordering, swap, or individual position changes.
  const world=document.getElementById('playWorld');if(!world)return;
  world.classList.toggle('is-seat-drag-enabled',adjustable());
  if(world.dataset.seatDragBound)return;
  world.dataset.seatDragBound='1';
  let gesture=null,pinch=null,suppressClick=false,committing=false,previewFrame=0;
  const pointers=new Map();
  const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y)};
  const indicator=document.getElementById('playGatherSpacingValue');
  const preview=()=>{
    if(previewFrame)return;
    previewFrame=requestAnimationFrame(()=>{previewFrame=0;if(pinch)playPreviewPinchSeats()});
  };
  world.addEventListener('pointerdown',event=>{
    if(!adjustable()||committing||(event.button!=null&&event.button!==0)||
      event.target?.closest?.('button:not(.play-player-token), input, select, textarea, a, summary'))return;
    if(pointers.size>=2)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try{world.setPointerCapture(event.pointerId)}catch{}
    if(pointers.size===2){
      pinch={startDistance:Math.max(1,distance()),startSpacing:layout.normalizeSeatSpacing(
        playSceneRuntime.room?.seatSpacing),startOffset:offset()};
      gesture=null;playSeatOffsetPreview=null;
      if(indicator)indicator.hidden=false;
      world.classList.add('is-seat-pinching');
      playSceneRuntime.ignoreSeatClickUntil=Date.now()+650;
      event.preventDefault();return;
    }
    if(pointers.size===1)gesture={id:event.pointerId,x:event.clientX,y:event.clientY,offset:offset(),dragged:false};
  });
  world.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch){
      if(!adjustable()||pointers.size!==2)return;
      const next=layout.normalizeSeatSpacing(pinch.startSpacing*distance()/pinch.startDistance);
      if(next!==playSeatSpacingPreview){
        playSeatSpacingPreview=next;
        playSeatOffsetPreview=layout.resolveSeatOffset(playSeatStats().seatCount,
          playSceneRuntime.room?.seatLayout,pinch.startOffset,next);
        preview();
      }
      event.preventDefault();return;
    }
    if(!gesture||gesture.id!==event.pointerId||!adjustable())return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.dragged&&Math.hypot(dx,dy)<6)return;
    gesture.dragged=true;
    const bounds=world.getBoundingClientRect();
    playSeatOffsetPreview=safe({
      x:gesture.offset.x+dx/Math.max(1,bounds.width)*100,
      y:gesture.offset.y+dy/Math.max(1,bounds.height)*100
    });
    renderPlayPlayers();event.preventDefault();
  },{passive:false});
  const finish=async(event,cancelled)=>{
    if(!pointers.has(event.pointerId))return;
    pointers.delete(event.pointerId);
    try{world.releasePointerCapture(event.pointerId)}catch{}
    if(pinch){
      const initial=pinch,finalValue=layout.normalizeSeatSpacing(
        playSeatSpacingPreview??initial.startSpacing),finalOffset=playSeatOffsetPreview;
      pinch=null;gesture=null;pointers.clear();
      if(previewFrame){cancelAnimationFrame(previewFrame);previewFrame=0;}
      if(indicator)indicator.hidden=true;
      world.classList.remove('is-seat-pinching');
      suppressClick=true;playSceneRuntime.ignoreSeatClickUntil=Date.now()+650;
      if(cancelled||!adjustable()||finalValue===initial.startSpacing){
        playSeatSpacingPreview=null;playSeatOffsetPreview=null;renderPlayPlayers();return;
      }
      committing=true;
      try{await playUpdateRoomSettings({seatSpacing:finalValue,seatOffset:finalOffset||initial.startOffset})}
      finally{committing=false;playSeatSpacingPreview=null;playSeatOffsetPreview=null;renderPlayScene()}
      return;
    }
    if(!gesture||event.pointerId!==gesture.id)return;
    const initial=gesture.offset,moved=gesture.dragged,next=playSeatOffsetPreview;
    gesture=null;
    if(!moved)return;
    suppressClick=true;
    playSceneRuntime.ignoreSeatClickUntil=Date.now()+650;
    if(cancelled||!next||!adjustable()||
       (initial.x===next.x&&initial.y===next.y)){
      playSeatOffsetPreview=null;renderPlayPlayers();return;
    }
    committing=true;
    try{await playUpdateRoomSettings({seatOffset:next})}
    finally{committing=false;playSeatOffsetPreview=null;renderPlayScene()}
  };
  world.addEventListener('pointerup',event=>{void finish(event,false)});
  world.addEventListener('pointercancel',event=>{void finish(event,true)});
  world.addEventListener('click',event=>{
    if(!suppressClick)return;
    suppressClick=false;event.preventDefault();event.stopImmediatePropagation();
  },true);
}
function renderPlayGatherToolbar(){
  const bar=document.getElementById('playGatherToolbar');if(!bar)return;
  renderPlayRoomModeControl();
  const visible=playSceneState.phase==='lobby'&&playSceneState.step==='seats'&&isLivePlayRoom();
  bar.classList.toggle('hidden',!visible);
  if(!visible){closePlaySeatPresetPanel();return}
  initPlayGatherSpacing();initPlaySeatOffsetControls();
  const members=playLiveMembers(),st=playSeatStats(),locked=!!playSceneRuntime.room?.seatsLocked;
  if(locked)closePlaySeatPresetPanel();
  const count=document.getElementById('playGatherCount');
  if(count)count.textContent=members.length+' người • '+st.occupied+'/'+st.seatCount+' vị trí';
  for(const id of ['playGatherCall','playGatherSeatPreset','playGatherRandom','playGatherManual']){
    const el=document.getElementById(id);if(el)el.disabled=locked||playSceneRuntime.busy;
  }
  const confirm=document.getElementById('playGatherConfirm');
  if(confirm){confirm.disabled=!!playSceneRuntime.busy;const b=confirm.querySelector('b');if(b)b.textContent=locked?'MỞ KHÓA':'CHỐT VỊ TRÍ';}
  const disband=document.getElementById('playGatherDisband');if(disband)disband.disabled=!!playSceneRuntime.busy||!members.length;
  bar.classList.remove('is-auto-hidden');bar.dataset.autoHidden='0';
  if(typeof bar.gmwwGatherClampOnscreen==='function')requestAnimationFrame(bar.gmwwGatherClampOnscreen);
}
const PLAY_SEAT_PRESET_NAMES={circle:'HÌNH TRÒN'};
function closePlaySeatPresetPanel(){
  playSeatPresetOpen=false;
  const panel=document.getElementById('playSeatPresetPanel'),trigger=document.getElementById('playGatherSeatPreset');
  if(panel)panel.hidden=true;
  if(trigger)trigger.setAttribute('aria-expanded','false');
}
function renderPlaySeatPresetPanel(){
  const panel=document.getElementById('playSeatPresetPanel'),grid=document.getElementById('playSeatPresetGrid');
  if(!panel||!grid)return;
  if(!playSeatPresetOpen||playSceneState.step!=='seats'||playSceneRuntime.room?.seatsLocked){closePlaySeatPresetPanel();return}
  panel.hidden=false;
  document.getElementById('playGatherSeatPreset')?.setAttribute('aria-expanded','true');
  const layout=globalThis.GMWW_VILLAGE_LAYOUT,selectedCount=Number(playSceneRuntime.room?.seatCount||0);
  const selectedShape=layout.normalizeSeatLayout(playSceneRuntime.room?.seatLayout),members=playLiveMembers();
  const minimum=Math.max(members.length,...members.map(p=>Number(p?.seatId||0)),0);
  // Existing odd-capacity rooms keep 1..N seats; Seat Mẫu offers only 6,8,...30.
  const counts=Array.from(layout.seatTemplateCounts);
  const hint=document.getElementById('playSeatPresetAutoHint');
  if(hint)hint.textContent='Một vòng tròn 360° quanh đống lửa • Seat Mẫu 6, 8, 10…30 • Giữ nguyên Character và Seat ID'+(minimum?' • Hiện có '+members.length+' người':'')+(selectedCount%2?' • Ván '+selectedCount+' người vẫn giữ nguyên':'');
  grid.replaceChildren();
  for(const n of counts){
    const shape=layout.recommendedSeatShape(n),selected=n===selectedCount&&selectedShape===shape;
    const button=document.createElement('button');button.type='button';button.className='play-seat-preset-card';
    button.classList.toggle('selected',selected);button.disabled=playSceneRuntime.busy||n<minimum;
    button.setAttribute('aria-label',n+' người • '+PLAY_SEAT_PRESET_NAMES[shape]+' quanh lửa'+(selected?' • Đang chọn':''));
    button.setAttribute('aria-pressed',String(selected));
    const preview=document.createElement('span');preview.className='play-seat-preset-dots';preview.setAttribute('aria-hidden','true');
    const fire=document.createElement('span');fire.className='play-seat-preset-fire';fire.textContent='🔥';
    fire.style.left=((layout.fire.x-15)/70*100)+'%';
    fire.style.top=((layout.fire.y-30)/64*100)+'%';
    preview.append(fire);
    for(const pos of layout.seatTemplatePositions(n,shape)){
      const dot=document.createElement('i');dot.className='play-seat-preset-dot';
      dot.style.left=Math.max(4,Math.min(96,(pos.x-15)/70*100))+'%';
      dot.style.top=Math.max(4,Math.min(96,(pos.y-30)/64*100))+'%';
      preview.append(dot);
    }
    const label=document.createElement('b');label.textContent=n+' NGƯỜI • '+PLAY_SEAT_PRESET_NAMES[shape];
    button.append(preview,label);button.onclick=()=>{void playApplySeatPreset(n)};
    grid.append(button);
  }
}
function openPlaySeatPresetPanel(){
  if(playSceneRuntime.busy||playSceneRuntime.room?.seatsLocked||playSceneState.step!=='seats'||!isLivePlayRoom())return;
  playSeatPresetOpen=true;renderPlaySeatPresetPanel();
}
async function playApplySeatPreset(count){
  if(!playSeatPresetOpen||playSceneRuntime.busy||!isLivePlayRoom())return;
  const layout=globalThis.GMWW_VILLAGE_LAYOUT;
  if(!Number.isInteger(count)||count<6||count>30||count%2!==0)return;
  const members=playLiveMembers(),maxSeat=Math.max(0,...members.map(m=>Number(m.seatId||0)));
  if(count<members.length||count<maxSeat){playFlashError('Mẫu '+count+' chỗ không đủ cho '+members.length+' người hoặc vị trí đã xếp.');return}
  const shape=layout.recommendedSeatShape(count);
  const ok=await playUpdateRoomSettings({seatCount:count,seatLayout:shape});
  if(ok)closePlaySeatPresetPanel();
}
function playPublishStage(step){
  if(!isLivePlayRoom()||!['room','seats','game','roles','deal','battle'].includes(step))return Promise.resolve(null);
  // Skip duplicate stage POSTs; the Server already acknowledged this stage.
  if(!playStagePublishPending&&playSceneRuntime.room?.gmStage===step)return Promise.resolve({room:playSceneRuntime.room});
  const code=String(playSceneState.roomCode);playStagePublishPending++;
  const write=async()=>{
    try{
      if(code!==String(playSceneState.roomCode))return null;
      const data=await playRoomApi('/stage',{method:'POST',body:JSON.stringify({step})});
      if(data?.room&&code===String(playSceneState.roomCode))playSceneRuntime.room=data.room;
      return data;
    }catch(err){
      if(code===String(playSceneState.roomCode))playFlashError('Không đồng bộ được bước chơi lên Server. '+String(err?.message||''));
      return null;
    }finally{playStagePublishPending--}
  };
  playStagePublishQueue=playStagePublishQueue.then(write,write);
  return playStagePublishQueue;
}
function setPlayStep(step){if(step==='members')step='seats';if(step==='seats'&&playSceneState.step!=='seats')playGatherToolsDismissed=false;if(step==='lobby'&&playSceneState.step!=='lobby'){void playReturnToLobby();return}if(!PLAY_STEPS.includes(step)||step===playSceneState.step)return;if(['game','roles','deal','battle'].includes(step)&&!playSceneRuntime.room?.seatsLocked){playFlashError('Khóa vị trí trước khi chọn ván.');return;}playSceneState.step=step;if(step!=='battle'){playSceneState.phase='lobby';playSceneState.night=0;playSceneState.artifactCount=0}savePlayScene();renderPlayScene();void playPublishStage(step)}
function advancePlaySetup(dir=1){const i=PLAY_STEPS.indexOf(playSceneState.step),next=Math.max(0,Math.min(PLAY_STEPS.length-1,i+dir));setPlayStep(PLAY_STEPS[next])}
async function playSetServerCycle(phase,night){
  const serverPhase=phase==='day'?'morning':'night',n=Math.max(1,Number(night)||1),cycleKey=serverPhase+'-'+n;
  await playRoomApi('/cycle',{method:'POST',body:JSON.stringify({phase:serverPhase,night:n,cycleKey})});await playSyncRoom(true);
}
function syncPlayAutoAdvance(){
  // V2.67: live-room Auto GM is authoritative on the Cloudflare Durable Object.
  // The IPA only renders the server deadline; it never owns the transition timer.
  if(playSceneRuntime.autoTurnTimer){clearTimeout(playSceneRuntime.autoTurnTimer);playSceneRuntime.autoTurnTimer=0}
  playSceneRuntime.autoTurnKey='';
}
async function togglePlayAutoGM(){
  if(playSceneRuntime.busy)return;
  if(demoRunner.running)await demoStop('auto_gm');
  const enabled=!playSceneState.autoGM;
  if(!isLivePlayRoom()){playSceneState.autoGM=enabled;savePlayScene();renderPlayScene();return}
  playSetBusy(true);
  try{
    const data=await playRoomApi('/auto',{method:'POST',body:JSON.stringify({enabled})});
    playSceneRuntime.room=data?.room||playSceneRuntime.room;playSceneState.autoGM=data?.room?.autoGM!==false;savePlayScene();renderPlayScene()
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false)}
}
async function playGatherCallMembers(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){playFlashError('Mở khóa vị trí trước khi gọi người.');return}
  if(playSceneRuntime.room?.demo===true||playSceneState.roomMode==='offline'){await openPlayRosterSheet();return}
  await playCallOnlineMembers();
}
async function playGatherRandomize(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){playFlashError('Mở khóa vị trí trước khi xếp ngẫu nhiên.');return}
  if(!playLiveMembers().length){
    if(playSceneRuntime.room?.demo===true||playSceneState.roomMode==='offline'){await openPlayRosterSheet();return}
    await playCallOnlineMembers();
  }
  if(playLiveMembers().length)await playRandomSeatRemaining();
}
function openPlayDisbandSheet(){
  if(!isLivePlayRoom())return;
  renderPlayDisbandSheet();document.getElementById('playDisbandSheet')?.classList.remove('hidden');
}
function closePlayDisbandSheet(){document.getElementById('playDisbandSheet')?.classList.add('hidden')}
function renderPlayDisbandSheet(){
  const list=document.getElementById('playDisbandList'),all=document.getElementById('playDisbandAll');if(!list)return;
  const members=playLiveMembers();list.innerHTML='';
  for(const p of members){
    const lid=String(p?.loginId||''),row=document.createElement('div');row.className='play-disband-member';
    row.innerHTML='<span><b>'+playEsc(p.displayName||lid)+'</b><small>'+(Number(p.seatId||0)?'Vị trí '+Number(p.seatId):'Chưa có vị trí')+'</small></span><button type="button" class="play-disband-one">MỜI RA</button>';
    row.querySelector('button').onclick=()=>{void playDisbandOne(lid)};list.appendChild(row)
  }
  if(!members.length)list.innerHTML='<div class="member-empty">Phòng hiện không có người chơi.</div>';
  if(all)all.disabled=playSceneRuntime.busy||!members.length;
}
async function playDisbandOne(loginId){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  const p=playLiveMembers().find(m=>String(m?.loginId||'')===String(loginId));if(!p)return;
  if(!confirm('Đưa '+(p.displayName||loginId)+' ra khỏi Phòng và trở về Sảnh chờ?'))return;
  playSetBusy(true);
  try{
    const data=await playRoomApi('/kick',{method:'POST',body:JSON.stringify({participantId:p.participantId||('member:'+loginId)})});
    if(data?.ok!==true)throw new Error('Server chưa xác nhận đưa người chơi ra khỏi phòng.');
    if(String(playSceneState.activePlayerId)===String(loginId))playSceneState.activePlayerId='';
    await playSyncRoom(true);renderPlayDisbandSheet();renderPlayScene();
  }catch(err){playFlashError(err?.message||String(err))}
  finally{playSetBusy(false);renderPlayDisbandSheet()}
}
async function playDisbandAll(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  const members=playLiveMembers();if(!members.length)return;
  if(!confirm('GIẢI TÁN '+members.length+' NGƯỜI CHƠI? Tất cả sẽ về Sảnh chờ. Phòng vẫn được giữ lại.'))return;
  playSetBusy(true);
  try{
    const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:[],replace:true})});
    if(data?.ok!==true||Number(data?.selectedCount)!==0)throw new Error('Server chưa xác nhận giải tán phòng.');
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:[];
    playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';savePlayScene();
    closePlayDisbandSheet();await playSyncRoom(true);renderPlayScene();
  }catch(err){playFlashError(err?.message||String(err))}
  finally{playSetBusy(false)}
}
function playGatherManual(){
  if(!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){playFlashError('Mở khóa vị trí trước khi xếp thủ công.');return}
  openPlaySeatManualSheet();
}
async function playGatherConfirm(){
  if(playSceneRuntime.busy||!isLivePlayRoom())return;
  if(playSceneRuntime.room?.seatsLocked){await playSetSeatLock(false);return}
  if(!playLiveMembers().length){playFlashError('Gọi người chơi vào làng trước khi chốt vị trí.');return}
  await playFinishSeating();
}
async function advancePlayPhase(){
  if(playSceneRuntime.busy)return;
  if(playSceneState.step==='lobby'||playSceneState.step==='room'){await playEnsureGatherRoom();return}
  if(playSceneState.step==='game'){openPlayGameSheet();return}
  if(playSceneState.step==='seats'){await playFinishSeating();return}
  if(playSceneState.step==='roles'){playConfirmAssignments();return}
  if(playSceneState.step==='deal'){if(playDeliveryProgress().success){playSceneState.step='battle';savePlayScene();await advancePlayPhase();return}await playDealRoles();return}
  if(playSceneState.step!=='battle'){advancePlaySetup(1);return}
  const verdict=playSceneRuntime.gallows;
  if(playSceneState.phase==='day'&&verdict?.stage==='resolved'&&!battleState.gallowsVerdictAcknowledged){
    battleRenderGallowsVerdict(verdict,'resolved','day');return;
  }
  playSetBusy(true);
  try{
    let room=playSceneRuntime.room;
    if(!room){const synced=await playSyncRoom(true);room=synced?.room||null}
    const serverPhase=String(playSceneRuntime.room?.phase||room?.phase||'').toLowerCase();
    if(!['running','started','game','playing'].includes(serverPhase)){
      if(!playSceneRuntime.assignments.length)throw new Error('Hãy Phân Vai và Phát Vai trước khi Bắt Đầu Đêm 1.');
      await playRoomApi('/start',{method:'POST',body:JSON.stringify({matchId:playSceneRuntime.room?.matchId||('match-'+Date.now()),matchRevision:Number(playSceneRuntime.room?.matchRevision||0)+1})});
      await playSetServerCycle('night',1);return;
    }
    if(playSceneState.phase==='lobby'){await playSetServerCycle('night',Math.max(1,playSceneState.night||1))}
    else if(playSceneState.phase==='night'){
      const runtime=playSceneRuntime.nightRuntime;
      if(runtime&&!runtime.completed){
        const data=await playRoomApi('/turn',{method:'POST',body:JSON.stringify({action:'next',expectedTurnId:runtime.currentId||''})});playSceneRuntime.nightRuntime=data?.runtime||runtime;await playSyncRoom(true);return
      }
      await playSetServerCycle('day',Math.max(1,playSceneState.night))
    }else{await playSetServerCycle('night',Math.max(1,playSceneState.night)+1)}
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false)}
}


/* Dedicated battle mode: in-match controls use the server's authoritative turn queue. */
/* Isolated Demo playback. All decisions are sampled from currently legal GM
 * choices and submitted through the same server action/turn endpoints. */
const demoRunner={running:false,paused:false,owner:'',speed:1,timer:0,epoch:0,steps:0,roomCode:'',matchId:'',
  completed:new Set(),pending:new Set(),dayDone:new Set(),autoStartedMatch:'',status:'Sẵn sàng — nhấn Chạy Demo',error:''};
// Native only: prevent Auto-Lock during an active foreground DEMO without camera/polling.
let demoScreenAwakeSent=null;
function demoSyncScreenAwake(){
  const enabled=demoRunner.running===true&&playSceneRuntime.room?.demo===true&&
    playSceneRuntime.room?.phase==='running'&&playSceneState.step==='battle'&&
    document.visibilityState!=='hidden';
  if(enabled===demoScreenAwakeSent)return;
  const bridge=window.webkit?.messageHandlers?.gmwwScreen;
  if(!bridge)return;
  try{bridge.postMessage({action:'setDemoAwake',enabled});demoScreenAwakeSent=enabled}
  catch(error){console.warn('GMWW_DEMO_SCREEN_AWAKE',error)}
}
document.addEventListener('visibilitychange',demoSyncScreenAwake);
window.addEventListener('pagehide',()=>{
  try{window.webkit?.messageHandlers?.gmwwScreen?.postMessage({action:'setDemoAwake',enabled:false})}catch(_){}
  demoScreenAwakeSent=null;
});
const demoPick=rows=>rows[Math.floor(Math.random()*rows.length)];
const demoDelay=()=>250;
const demoLeaseBody=(command,extra={})=>({command,owner:demoRunner.owner,speed:demoRunner.speed,...extra});
const GMWW_GM_HAPTIC_KEY='gmww_gm_haptic_v1';
function gmHapticEnabled(){try{return localStorage.getItem(GMWW_GM_HAPTIC_KEY)==='1'}catch{return false}}
function gmHapticAvailable(){return !!window.webkit?.messageHandlers?.gmwwHaptic||typeof navigator.vibrate==='function'}
function setGmHapticEnabled(value){
  if(value&&!gmHapticAvailable()){
    playFlashError('iPhone Safari không hỗ trợ rung từ trang web. Cần IPA GMWW mới có cầu nối gmwwHaptic.');
    return false;
  }
  try{localStorage.setItem(GMWW_GM_HAPTIC_KEY,value?'1':'0')}catch{}
  if(value)gmHapticFeedback(); // instant tactile confirmation that the toggle is functional
  return true;
}
function gmHapticFeedback(){
  if(!gmHapticEnabled())return false;
  try{
    // Only native WKWebView IPA hosts that register gmwwHaptic can vibrate on iOS.
    const bridge=window.webkit?.messageHandlers?.gmwwHaptic;
    if(bridge){bridge.postMessage({event:'action-confirmed'});return true}
    if(typeof navigator.vibrate==='function')return !!navigator.vibrate(60);
  }catch(error){console.warn('GM haptic unavailable',error)}
  return false;
}
function demoConfirmedFeedback(){
  gmHapticFeedback();
  // Gallows nominations and thumb votes may be numerous; no repeated OK cue.
  if(playSceneState.phase==='day'&&['nominating','selecting','voting','closed','resolved']
    .includes(String(playSceneRuntime.gallows?.stage||'')))return;
  if(!playAudioMuted())void battlePlayConfiguredAudio('system','audio_system_confirm','Xác nhận');
}

// Project server progress; polling never chooses or submits gameplay actions.
function demoApplyServerControl(control){
  if(control?.engine!=='server')return;
  const event=control.lastEvent,sameRoom=demoRunner.roomCode===String(playSceneState.roomCode),previous=demoRunner.lastEvent;
  const heard=demoRunner.heardEvents||(demoRunner.heardEvents=new Set());
  // A delayed Server event from the preceding turn/cycle must not interrupt
  // the currently playing voice, particularly at x2/x5.
  const sameCycle=!event?.cycleKey||String(event.cycleKey)===String(playSceneRuntime.room?.cycleKey||'');
  const feedback=!heard.has(event?.id)&&sameRoom&&sameCycle&&demoRunner.observedMatch===String(playSceneRuntime.room?.matchId||'')&&event&&event.id!==previous?.id&&event.status==='accepted';
  demoRunner.observedMatch=String(playSceneRuntime.room?.matchId||'');
  demoRunner.roomCode=String(playSceneState.roomCode);demoRunner.matchId=String(playSceneRuntime.room?.matchId||'');
  demoRunner.running=control.running===true;demoRunner.paused=control.paused===true;demoRunner.speed=Number(control.speed)||1;
  demoRunner.steps=Number(control.steps)||0;demoRunner.error=control.error||'';
  demoRunner.status=control.running?'Đang chạy trên server':control.reason==='winner'?'Đã xác định phe thắng':control.paused?'Đã tạm dừng':'Sẵn sàng — nhấn Chạy Demo';
  if(typeof demoSyncScreenAwake==='function')demoSyncScreenAwake();
  demoRunner.lastEvent=event||null;
  demoRunner.history=Array.isArray(control.history)?control.history:[];
  demoRunner.visual=event?.status==='accepted'&&event.actionId?{matchId:event.matchId,cycleKey:event.cycleKey,turnId:event.turnId,actionId:event.actionId,actorId:event.actorId,targetIds:event.targetIds||[]}:null;
  if(feedback){
    heard.add(event.id);if(heard.size>800)heard.delete(heard.values().next().value);
    if(event.revelation?.message&&event.revelation?.actionId){
      gmHapticFeedback();battlePresentRevelation(event.revelation.actionId,event.revelation);
    }else if(event.audioActionId){gmHapticFeedback();void battlePlayConfiguredAudio('actions',event.audioActionId,event.action)}
    else demoConfirmedFeedback();
  }
  if(control.running&&playSceneState.step==='battle'&&!demoRunner.timer)demoSchedule(750);
}
function demoHoldForGM(){
  if(playSceneRuntime.demoControl?.engine!=='server'||!demoRunner.running)return;
  if(Date.now()-Number(demoRunner.lastHoldAt||0)<1000)return;
  demoRunner.lastHoldAt=Date.now();
  void playRoomApi('/demo',{method:'POST',body:JSON.stringify({command:'hold'})}).catch(()=>{});
}
function demoStopTimer(){if(demoRunner.timer){clearTimeout(demoRunner.timer);demoRunner.timer=0}}
async function demoStop(reason='manual'){
  const active=demoRunner.running,code=demoRunner.roomCode;
  demoRunner.paused=reason==='manual'&&active;
  demoRunner.status=demoRunner.paused?'Đã tạm dừng':reason==='completed'?'Ván Demo đã kết thúc':'Sẵn sàng — nhấn Chạy Demo';
  demoRunner.running=false;demoRunner.epoch++;demoStopTimer();demoSyncScreenAwake();
  if(!active)return;
  if(playSceneRuntime.demoControl?.engine==='server'&&['room_change','exit_play'].includes(reason)){renderPlayBattle();return}
  try{
    if(code===String(playSceneState.roomCode)&&isLivePlayRoom())
      await playRoomApi('/demo',{method:'POST',body:JSON.stringify(demoLeaseBody('stop'))});
  }catch(err){console.warn('Demo release deferred to lease expiry',reason,err)}
  renderPlayBattle();
}
function demoRenderControls(){
  demoSyncScreenAwake();
  initDemoPanel();demoRenderObserver();demoRenderVisual();
  document.getElementById('battleDemoExpand')?.classList.toggle('is-running',demoRunner.running);
  const panel=document.getElementById('battleDemoPanel'),status=document.getElementById('battleDemoStatus');
  if(panel)panel.hidden=!(playSceneRuntime.room?.demo===true&&playSceneState.step==='battle');
  if(status){status.textContent=demoRunner.error||demoRunner.status;status.classList.toggle('is-error',!!demoRunner.error)}
  const enabled=playSceneRuntime.room?.demo===true,button=document.getElementById('battleDemoToggle'),
    wrap=document.getElementById('battleDemoSpeedWrap'),auto=document.getElementById('battleGMAuto'),
    field=document.getElementById('battleDemoSpeed');
  if(button){button.hidden=!enabled;button.dataset.runState=demoRunner.running?'running':'paused';button.title=demoRunner.error||demoRunner.status||'DEMO';button.setAttribute('aria-label',demoRunner.running?'Đang chạy DEMO, chạm để tạm dừng':'Đã tạm dừng DEMO, chạm để tiếp tục');button.setAttribute('aria-pressed',String(demoRunner.running));button.classList.toggle('is-off',!demoRunner.running)}
  const orbit=button?.querySelector('.demo-clockwise-orbit');if(orbit)orbit.textContent=demoRunner.running?'↻':'Ⅱ';
  if(wrap)wrap.hidden=!enabled;
  if(auto)auto.hidden=false;
  if(field){field.dataset.speed=String(demoRunner.speed);field.textContent='×'+String(demoRunner.speed);field.setAttribute('aria-label','Tốc độ DEMO: '+demoRunner.speed+' lần. Chạm để thay đổi.');}
  const matchKey=[playSceneState.roomCode,playSceneRuntime.room?.matchId].join(':');
  // Start once when a DEMO match enters battle; never override the GM's Pause.
  if(playSceneRuntime.demoControl?.engine!=='server'&&enabled&&playSceneState.step==='battle'&&playSceneRuntime.room?.phase==='running'&&
     playSceneRuntime.room?.matchId&&demoRunner.autoStartedMatch!==matchKey&&!demoRunner.running&&!demoRunner.paused){
    demoRunner.autoStartedMatch=matchKey;
    setTimeout(()=>{if(playSceneRuntime.room?.demo===true&&playSceneState.step==='battle'&&
      [playSceneState.roomCode,playSceneRuntime.room?.matchId].join(':')===matchKey)void demoToggle()},0);
  }
}
async function demoToggle(){
  // Start DEMO may call the server before the first role cue. Unlock the iOS
  // AudioContext synchronously on the actual GM tap, not after awaiting HTTP.
  battleUnlockAudioFromGesture();
  if(playSceneRuntime.room?.demo!==true)return;
  if(demoRunner.running){await demoStop();return}
  if(playSceneState.step!=='battle'){playFlashError('Hãy setup và vào trận trước khi chạy Demo.');return}
  const sameMatch=demoRunner.roomCode===String(playSceneState.roomCode)&&
    demoRunner.matchId===String(playSceneRuntime.room?.matchId||'');
  if(!sameMatch){demoRunner.completed.clear();demoRunner.pending.clear();demoRunner.dayDone.clear();demoRunner.steps=0;demoRunner.lastEvent=null;demoRunner.nightPlan=null;demoRunner.visual=null}
  demoRunner.owner='demo-'+(globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));
  demoRunner.roomCode=String(playSceneState.roomCode);
  demoRunner.matchId=String(playSceneRuntime.room?.matchId||'');
  demoRunner.speed=Number(document.getElementById('battleDemoSpeed')?.dataset.speed)||1;
  try{
    if(playSceneRuntime.room?.autoGM!==false){const data=await playRoomApi('/auto',{method:'POST',body:JSON.stringify({enabled:false})});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneState.autoGM=false}
    const status=await playRoomApi('/demo',{method:'POST',body:JSON.stringify({command:'start',speed:demoRunner.speed})});
    if(status?.ok!==true)throw Error(status?.message||status?.error||'Không khởi động được Demo.');
    demoRunner.running=true;demoRunner.paused=false;demoRunner.error='';demoRunner.status='Đang chạy Demo';demoRunner.epoch++;
    if(status.engine==='server'){playSceneRuntime.demoControl=status;demoApplyServerControl(status)}
    renderPlayBattle();demoSchedule(0);
  }catch(err){demoRunner.error='Không chạy được: '+String(err?.message||err);playFlashError('Demo: '+String(err?.message||err));renderPlayBattle()}
}
function demoSchedule(ms=demoDelay()){
  demoStopTimer();
  if(!demoRunner.running)return;
  const epoch=demoRunner.epoch;
  demoRunner.timer=setTimeout(()=>{demoRunner.timer=0;if(demoRunner.running&&epoch===demoRunner.epoch)void demoStep(epoch)},ms);
}
async function demoActionNight(t,epoch){return demoRunNight(t,epoch)}
async function demoExecuteNight(action,actorId,t,signature,epoch){
  const room=playSceneRuntime.room;
      const saveTargets=action.actionId==='action_witch_save'?(playSceneRuntime.nightIntel?.attacked||[]).map(x=>x.to):null;
      const available=playLiveMembers().filter(m=>m?.loginId&&(!saveTargets||saveTargets.includes(m.loginId))&&(!action.noSelf||m.loginId!==actorId)&&battleRules()?.targetAllowed(
        action,m,playPlayerEffect(m.loginId),playSceneRuntime.activeEffects,playSceneState.night));
      const count=Math.max(0,Number(action.targetCount)||0),chosen=[];
      while(chosen.length<count&&available.length){
        const id=demoPick(available).loginId;
        chosen.push(id);available.splice(available.findIndex(x=>x.loginId===id),1);
      }
      if(chosen.length!==count){demoObserve(action.name+' · Không đủ mục tiêu hợp lệ',actorId,[],'skipped');return}
      if(chosen.length===count){
        const seer=['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three',
          'action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check']
          .includes(action.actionId)&&!action.artifactId;
        const transfer=String(action.actionId)==='action_transfer_bite'&&!action.artifactId;
        const direction=transfer?demoPick(['left','right','none']):'';
        const payload={matchId:String(room.matchId||''),cycleKey:String(room.cycleKey||''),turnId:t.id,
          night:Number(playSceneState.night||1),actorId,type:transfer?'effect_notice':action.type,
          actionId:action.actionId,effectId:action.effectIds?.[0]||'',effectName:action.name,
          targetIds:seer||transfer||count===0?[actorId]:chosen,
          clientEventId:'demo-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)),
          ...(action.artifactId?{artifactId:action.artifactId}:{}),
          ...(seer?{revealTargetIds:chosen,message:'GM Demo thực hiện soi xét.'}:{}),
          ...(transfer?{direction,message:'Demo dịch vết cắn '+direction}:{}),
          ...(action.actionId==='action_assassin_mark'?{assassinChoice:demoPick(['👍','👎'])}:{})
        };
        demoFocus(action,actorId,chosen);
        demoObserve(action.name,actorId,seer?chosen:transfer?[]:chosen,'pending');
        demoRunner.pending.add(signature);
        try{
          const result=await playRoomApi('/battle-action',{method:'POST',body:JSON.stringify(payload)});
          if(result?.ok!==true)throw Error(result?.message||result?.error||'Hành động không được server chấp nhận.');
          demoRunner.pending.delete(signature);demoRunner.completed.add(signature);
          demoObserve(action.name+(transfer?' · '+({left:'Trái',right:'Phải',none:'Không dịch'}[direction]||''):''),actorId,seer?chosen:transfer?[]:chosen);
          demoConfirmedFeedback();
          if(result.revelation?.message&&demoRunner.running&&epoch===demoRunner.epoch)
            battlePresentRevelation(action.actionId,result.revelation);
        }catch(err){if(err?.status>=400&&err?.status<500)demoRunner.pending.delete(signature);throw err}
    }
}
async function demoActionDay(epoch){
  const room=playSceneRuntime.room,cycle=String(room.matchId||'')+':'+String(room.cycleKey||'');
  const available=battleActions().filter(a=>!a.unavailable&&!demoRunner.dayDone.has(cycle+':'+a.id)&&a.actorIds?.length);
  if(available.length){
    const a=demoPick(available),actorId=demoPick(a.actorIds),memberIds=playLiveMembers().filter(m=>
      m?.loginId&&(!a.noSelf||m.loginId!==actorId)&&battleRules()?.targetAllowed(
        a,m,playPlayerEffect(m.loginId),playSceneRuntime.activeEffects,playSceneState.night)).map(m=>m.loginId);
    const chosen=[];
    while(chosen.length<a.targetCount&&memberIds.length){
      const id=demoPick(memberIds);chosen.push(id);memberIds.splice(memberIds.indexOf(id),1);
    }
    demoRunner.dayDone.add(cycle+':'+a.id);
    if(chosen.length===a.targetCount&&Math.random()<0.85){
      demoFocus(a,actorId,chosen);demoObserve(a.name,actorId,chosen,'pending');
      const result=await playRoomApi('/day-action',{method:'POST',body:JSON.stringify({
        matchId:room.matchId,cycleKey:room.cycleKey,actorId,
        roleId:a.roleId||'',artifactId:a.artifactId||'',actionId:a.actionId,targetIds:chosen,
        clientEventId:'demo-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2))
      })});
      if(result?.ok!==true)throw Error('Hành động ngày không hợp lệ: '+(result?.message||result?.error||'Server từ chối.'));
      demoObserve(a.name,actorId,chosen);
      demoConfirmedFeedback();
    }
    return;
  }
  // After 50% let day powers act; hold the gallows until the discussion expires.
  const dayClock=playSceneRuntime.demoControl?.clock;
  if(dayClock?.kind==='discussion'&&Number(dayClock.remainingMs)>0)return;
  const g=playSceneRuntime.gallows||{},stage=String(g.stage||'ready'),
    now=Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0),
    eligible=(Array.isArray(g.eligible)?g.eligible:playLiveMembers().map(x=>x.loginId)).filter(id=>id&&playPlayerEffect(id)!=='dead'&&playPlayerEffect(id)!=='expelled');
  const post=async(command,extra={})=>{
    const result=await playRoomApi('/gallows',{method:'POST',body:JSON.stringify({command,source:'demo',...extra})});
    if(result?.ok!==true)throw Error(result?.message||result?.error||'Lên Giàn không hợp lệ.');
    demoObserve(({open:'Mở đề cử',begin:'Lên Giàn',resolve:'Kết quả · '+(extra.outcome==='dead'?'Chết':'Sống')})[command]||command,'',extra.targetId?[extra.targetId]:command==='resolve'&&g.candidateId?[g.candidateId]:[]);
  };
  if(!eligible.length)throw Error('Không còn thành viên đủ điều kiện để bỏ phiếu; GM cần kiểm tra kết quả thắng.');
  if(stage==='ready'){await post('open');return}
  if(stage==='nominating'&&now<Number(g.nominationDeadlineAt||0)){
    const awaiting=eligible.filter(id=>!Object.hasOwn(g.nominations||{},id));
    if(awaiting.length){
      const actor=demoPick(awaiting),target=demoPick(eligible);demoObserve('Đề cử',actor,[target],'pending');
      const result=await playRoomApi('/demo',{method:'POST',body:JSON.stringify(demoLeaseBody('nominate',{
        loginId:actor,targetId:target,matchId:room.matchId,cycleKey:room.cycleKey}))});
      if(result?.ok!==true)throw Error(result?.message||result?.error||'Đề cử không thành công.');
      demoObserve('Đề cử',actor,[target]);
    }
    return;
  }
  if(stage==='selecting'||stage==='nominating'){
    const counts={};for(const id of Object.values(g.nominations||{}))counts[id]=(counts[id]||0)+1;
    const rank=Object.keys(counts).filter(id=>eligible.includes(id)).sort((a,b)=>counts[b]-counts[a]);
    await post('begin',{targetId:rank[0]||demoPick(eligible)});return;
  }
  if(stage==='voting'&&now<Number(g.deadlineAt||0)){
    const awaiting=eligible.filter(id=>id!==g.candidateId&&!Object.hasOwn(g.votes||{},id)&&!(g.blocked||[]).includes(id));
    if(awaiting.length){
      const actor=demoPick(awaiting),choice=demoPick(['👍','👎']);demoObserve('Bỏ phiếu '+choice,actor,[g.candidateId],'pending');
      const result=await playRoomApi('/demo',{method:'POST',body:JSON.stringify(demoLeaseBody('vote',{
        loginId:actor,choice,matchId:room.matchId,cycleKey:room.cycleKey}))});
      if(result?.ok!==true)throw Error(result?.message||result?.error||'Bỏ phiếu không thành công.');
      demoObserve('Bỏ phiếu '+choice,actor,[g.candidateId]);
    }
    return;
  }
  if(stage==='closed'||stage==='voting'){
    const votes=Object.values(g.votes||{}),kill=votes.filter(x=>x==='👎').length>votes.filter(x=>x==='👍').length;
    await post('resolve',{outcome:kill?'dead':'alive'});return;
  }
  if(stage==='resolved'){
    if(demoRunner.running&&epoch===demoRunner.epoch)await playSetServerCycle('night',Math.max(1,Number(playSceneState.night)||1)+1);
    return;
  }
  throw Error('Trạng thái giàn treo chưa được hỗ trợ: '+stage);
}
async function demoStep(epoch){
  if(!demoRunner.running||epoch!==demoRunner.epoch)return;
  if(playSceneRuntime.demoControl?.engine==='server'){
    // A failed refresh only affects this viewer. It must never pause the server.
    await playSyncRoom(true);
    if(demoRunner.running&&String(playSceneState.roomCode)===demoRunner.roomCode)demoSchedule(750);
    return;
  }
  try{
    if(demoRunner.steps>800)throw Error('Đã đạt giới hạn an toàn 800 bước. GM cần kiểm tra ván.');
    const beat=await playRoomApi('/demo',{method:'POST',body:JSON.stringify(demoLeaseBody('heartbeat'))});
    if(beat?.ok!==true)throw Error(beat?.message||beat?.error||'Mất quyền điều khiển Demo.');
    if(playSceneRuntime.busy||battleState.busy||battleState.syncPending||battleState.gallowsBusy||battleState.undoBusy||(typeof battleConfirmAudioGate!=='undefined'&&battleConfirmAudioGate)||battleState.targetSheet||battleState.targets.length){demoSchedule(250);return}
    if(!demoRunner.running||epoch!==demoRunner.epoch)return;
    const beforeSync=Number(playSceneRuntime.syncSerial||0),latest=await playSyncRoom(true);
    if(!latest&&Number(playSceneRuntime.syncSerial)>beforeSync+1){demoSchedule(250);return}
    if(!latest)throw Error('Mất đồng bộ với server; không thể tiếp tục tự chơi.');
    if(!demoRunner.running||epoch!==demoRunner.epoch)return;
    if(playSceneRuntime.busy||battleState.busy||battleState.syncPending||battleState.gallowsBusy||battleState.undoBusy||(typeof battleConfirmAudioGate!=='undefined'&&battleConfirmAudioGate)||battleState.targetSheet||battleState.targets.length){demoSchedule(250);return}
    const room=playSceneRuntime.room;
    demoRunner.status='Đang chạy · '+(playSceneState.phase==='day'?'Ngày ':'Đêm ')+Number(playSceneState.night||1)+' · '+String(battleTurn()?.label||'Lên Giàn');
    demoRenderControls();
    if(room?.demo!==true||String(playSceneState.roomCode)!==demoRunner.roomCode||room?.phase!=='running'){
      await demoStop('room_or_match_changed');return;
    }
    if(playSceneRuntime.winProposal){
      await demoStop('winner_ready');await openPlayCompletionSheet();return;
    }
    const clock=playSceneRuntime.demoControl?.clock;
    if(clock&&clock.kind==='discussion'&&clock.remainingMs>0){
      const halfway=Math.max(0,Number(clock.durationMs||0)/2);
      const cycle=String(room.matchId||'')+':'+String(room.cycleKey||'');
      const actionsPending=playSceneState.phase==='day'&&battleActions().some(a=>
        !a.unavailable&&a.actorIds?.length&&!demoRunner.dayDone.has(cycle+':'+a.id));
      if(clock.remainingMs>halfway||!actionsPending){
        demoSchedule(Math.min(500,Math.max(50,(clock.remainingMs-(actionsPending?halfway:0))/Math.max(1,clock.speed))));return;
      }
    }
    if(playSceneState.phase!=='night')demoRunner.steps++;
    if(playSceneState.phase==='night'){
      const rt=playSceneRuntime.nightRuntime,t=battleTurn();
      if(t)await demoActionNight(t,epoch);
      else if(rt?.completed)await playSetServerCycle('day',Math.max(1,Number(playSceneState.night)||1));
      else throw Error('Không tìm thấy lượt Đêm hợp lệ.');
    }else if(playSceneState.phase==='day')await demoActionDay(epoch);
    else throw Error('Demo chỉ chạy khi đã vào Ngày hoặc Đêm.');
    if(demoRunner.running&&epoch===demoRunner.epoch)demoSchedule(clock?.kind==='night'&&clock.remainingMs>0?Math.min(500,Math.max(50,clock.remainingMs/Math.max(1,clock.speed)/Math.max(1,demoRunner.nightPlan?.ids.length||1))):demoDelay());
  }catch(error){
    if(!demoRunner.running||epoch!==demoRunner.epoch)return;
    if(['STALE_TURN','STALE_BATTLE_ACTION','ARTIFACT_ALREADY_USED','ROLE_NIGHT_ACTION_EXHAUSTED','ACTION_GAME_LIMIT_REACHED','ACTION_NIGHT_LIMIT_REACHED'].includes(error?.code)){await playSyncRoom(true);demoRunner.nightPlan=null;demoSchedule();return}
    const msg=String(error?.message||error);
    demoRunner.error='Đã dừng: '+msg;
    if(demoRunner.lastEvent?.status==='pending')demoRunner.lastEvent.status='uncertain';
    demoRunner.running=false;demoRunner.epoch++;demoStopTimer();demoSyncScreenAwake();
    // Keep an uncertain request blocked; do not blindly retry with a new receipt ID.
    if(!/DEMO_LEASE_OWNED|DEMO_LEASE_EXPIRED/.test(msg))
      try{await playRoomApi('/demo',{method:'POST',body:JSON.stringify(demoLeaseBody('stop'))})}catch{}
    playFlashError('Demo đã dừng: '+msg);
    renderPlayBattle();
  }
}

const battleState={assassinChoice:'',wakeAudioStartedKey:'',wakeAdvanceInFlight:'',dayCountdownCueKey:'',dayTimeupCueKey:'',morningOpen:false,morningDayKey:'',morningAudioKey:'',morningSig:'',gallowsOpen:false,dayActionsOpen:false,dayMenuSig:'',dayClockBusy:false,key:'',actionId:'',targets:[],roster:false,details:false,wolfOpen:false,clockOpen:false,quickType:'',timelineSig:'',actionSig:'',busy:false,syncPending:false,nonce:'',drag:null,targetSheet:false,targetMode:'list',lastTap:null,undoBusy:false,ignoreClick:0,intelShownForKey:'',confirmPosition:null,ignoreConfirmClickUntil:0,impacts:new Map()};
// UI-only skill icon drag: server remains sole action authority. Uses the same
// GM battleConfirm() and existing rollback token as manual target selection.
// GM-only visual preference. Nothing enters the authoritative Room DTO or Player Web.
const GMWW_TURN_MOTION_KEY='GMWW_GM_FIRE_WALK_V2';
function battleMotionOn(){try{return localStorage.getItem(GMWW_TURN_MOTION_KEY)!=='0'}catch{return true}}
function battleMotionSetOn(on){
  try{localStorage.setItem(GMWW_TURN_MOTION_KEY,on?'1':'0')}catch{}
  renderPlayBattle();
}
document.addEventListener('visibilitychange',()=>{
  if(playSceneState.step==='battle')battleMarkPlayers();
});
const BATTLE_ICON_ON_KEY='GMWW_GM_SHOW_ACTION_ICONS_V1';
let battleIconDragging=null;
let battleIconTurnKey='';
const battleIconPositions=new Map(); // UI-only; the Core remains action authority.
function battleIconOn(){try{return localStorage.getItem(BATTLE_ICON_ON_KEY)!=='0'}catch{return true}}
function battleIconSetOn(on){try{localStorage.setItem(BATTLE_ICON_ON_KEY,on?'1':'0')}catch{};battleIconClearDrag();renderPlayBattle()}
function battleIconResolve(action){
 const api=globalThis.GMWWActionIconLibrary;
 if(!api)return [];
 // One approved 3-way Fairy artwork with three independent touch regions.
 if(action.actionId==='action_transfer_bite'&&api.resolve(action.actionId))
  return [{id:'yeu-tinh-three-way',name:'Yêu Tinh',assetId:'51_yeu_tinh_three_way.png',image:'',isFairyTriptych:true}];
 return api.resolveAll?.(action.actionId)?.filter(icon=>!!icon?.assetId||!!icon?.image)||[];
}
function battleIconPositionKey(actionId,iconId){return String(actionId)+'|'+String(iconId)}
// V3.231: start above the fixed footer at the village entrance stairs, not GM fire.
function battleIconScaleRatio(){
 const n=Number(document.documentElement?.style?.getPropertyValue?.('--gmww-action-icon-scale'));
 return Number.isFinite(n)&&n>=.25&&n<=1.5?n:1;
}
function battleIconSize(isFairy=false){
 const w=globalThis.visualViewport?.width||innerWidth,s=battleIconScaleRatio();
 const width=isFairy?Math.min(276*s,Math.max(100,w-22)):92*s;
 return {width,height:isFairy?width/3:92*s};
}
function battleIconSpawnPoint(entry,index,count,isFairy=false){
 const vw=globalThis.visualViewport?.width||innerWidth,s=battleIconScaleRatio();
 const dx=Math.max(100,92*s+8),dy=Math.max(102,92*s+10);
 const columns=Math.min(count===4?2:3,Math.max(1,Math.floor((vw-12)/dx)),Math.max(1,count));
 const row=Math.floor(index/columns),slots=Math.min(columns,count-row*columns),col=index%columns;
 return battleIconClamp(entry.x+(col-(slots-1)/2)*dx,entry.y-row*dy,isFairy);
}
function battleIconClamp(x,y,isFairy=false){
 const vw=globalThis.visualViewport?.width||innerWidth,vh=globalThis.visualViewport?.height||innerHeight;
 const size=battleIconSize(isFairy),px=Math.min(vw/2,Math.max(isFairy?0:52,size.width/2+6));
 const py=Math.min(vh/2,Math.max(isFairy?0:52,size.height/2+6));
 return {x:Math.min(Math.max(px,x),Math.max(px,vw-px)),y:Math.min(Math.max(py,y),Math.max(py,vh-py))};
}
function battleIconEntryPoint(){
 const rail=document.getElementById('battleBottomControls');
 const rect=rail?.getBoundingClientRect?.();
 if(rect&&rect.width>0&&rect.height>0)
  return battleIconClamp(rect.left+rect.width/2,rect.top-60);
 return battleIconClamp((globalThis.visualViewport?.width||innerWidth)/2,(globalThis.visualViewport?.height||innerHeight)-150);
}
function battleIconResetPositions(){
 battleIconPositions.clear();battleIconClearDrag();
 const dock=document.getElementById('battleFireIconDock');if(dock)delete dock.dataset.sig;
}
function battleIconDock(actions,phase){
 const menuToggle=document.getElementById('battleGMActionIcons'),show=battleIconOn();
 if(menuToggle){menuToggle.setAttribute('aria-pressed',String(show));menuToggle.textContent='iCon';menuToggle.setAttribute('aria-label','Icon hành động: '+(show?'Bật':'Tắt'))}
 let dock=document.getElementById('battleFireIconDock');
 if(!dock){dock=document.createElement('div');dock.id='battleFireIconDock';dock.className='battle-fire-icon-dock';
  dock.setAttribute('role','group');dock.setAttribute('aria-label','Icon hành động hiện tại');document.body.appendChild(dock)}
 const eligible=(Array.isArray(actions)?actions:[]).filter(a=>!a.unavailable&&a.actionId)
   .flatMap(a=>battleIconResolve(a).map(icon=>({a,icon})));
 const active=playSceneState.step==='battle'&&show&&eligible.length>0;
 const waiting=!!(battleState.busy||battleState.syncPending);
 const turn=String(playSceneRuntime.room?.matchId||'')+'|'+String(playSceneState.phase||'')+'|'+
   String(playSceneState.night||'')+'|'+String(battleState.key||'');
 if(turn!==battleIconTurnKey){battleIconTurnKey=turn;battleIconResetPositions()}
 dock.hidden=!active;dock.classList.toggle('is-pending',waiting);
 if(!active){battleIconClearDrag();dock.replaceChildren();delete dock.dataset.sig;return}
 const entry=battleIconEntryPoint();
 const key=JSON.stringify(eligible.map(x=>[x.a.id,x.a.targetCount,x.icon.id,x.icon.image||x.icon.assetId]))+
  ':'+turn+':'+battleState.actionId+':'+battleState.targets.length+':'+waiting+':'+battleIconScaleRatio();
 if(battleIconDragging)return;
 if(dock.dataset.sig===key){
  // Unused icons follow the entrance as the bottom menu moves.
  for(const button of dock.querySelectorAll('[data-fire-action]')){
   const position=battleIconPositions.get(battleIconPositionKey(button.dataset.fireAction,button.dataset.fireIcon));
   if(!position){
    const slot=Number(button.dataset.fireIndex)||0;
    const point=battleIconSpawnPoint(entry,slot,eligible.length,button.dataset.fireIcon==='yeu-tinh-three-way');
    button.style.left=point.x+'px';button.style.top=point.y+'px';
   }
  }
  return;
 }
 dock.dataset.sig=key;
 const api=globalThis.GMWWActionIconLibrary;
 dock.innerHTML=eligible.map(({a,icon},i)=>{
  const saved=battleIconPositions.get(battleIconPositionKey(a.id,icon.id));
  const point=saved?battleIconClamp(saved.x,saved.y,!!icon.isFairyTriptych):
    battleIconSpawnPoint(entry,i,eligible.length,!!icon.isFairyTriptych);
  const visual='<img draggable="false" src="'+playEsc(api.image(icon))+'" alt="">';
  return '<button type="button" '+(waiting?'disabled ':'')+'class="battle-fire-icon'+(icon.isFairyTriptych?' is-fairy-triptych':'')+'" '+
   'style="left:'+point.x+'px;top:'+point.y+'px" data-fire-action="'+playEsc(a.id)+
   '" data-fire-icon="'+playEsc(icon.id)+'" data-fire-index="'+i+'" aria-label="'+playEsc(a.name)+
   '" title="'+playEsc(a.name)+'" aria-pressed="'+String(a.id===battleState.actionId)+'">'+
   visual+'</button>';
 }).join('');
}
function battleIconTargetAt(x,y,action){
 const ring=document.getElementById('playPlayerRing');if(!ring||!action)return null;
 let candidate=null,dist=Infinity;
 for(const el of ring.querySelectorAll('[data-play-player-id]')){
  const id=String(el.dataset.playPlayerId||''),m=battleMember(id);
  if(!m||(battleState.actionId===action.id&&battleState.targets.includes(id))||
     !battleRules()?.targetAllowed(action,m,playPlayerEffect(id),playSceneRuntime.activeEffects,playSceneState.night))continue;
  const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const d=Math.hypot(x-cx,y-cy),limit=Math.max(68,Math.min(118,Math.max(r.width,r.height)*1.15));
  if(d<limit&&d<dist){candidate=el;dist=d}
 }
 return candidate;
}
function battleIconClearDrag(){
 const d=battleIconDragging;if(!d)return;
 d.button?.classList.remove('is-dragging','is-sucked');
 d.target?.classList.remove('gmww-battle-icon-snap');
 battleIconDragging=null;
}
function battleIconBind(){
 const dock=document.getElementById('battleFireIconDock');if(!dock||dock.dataset.bound)return;dock.dataset.bound='1';
 dock.addEventListener('pointerdown',e=>{
  const btn=e.target.closest('[data-fire-action]');
  if(!btn||(e.button!==0&&e.pointerType!=='touch')||battleState.busy||battleState.syncPending)return;
  const action=battleActions().find(a=>a.id===btn.dataset.fireAction&&!a.unavailable);
  if(!action)return;
  battleIconClearDrag();
  const rect=btn.getBoundingClientRect();
  battleIconDragging={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,
   baseX:rect.left+rect.width/2,baseY:rect.top+rect.height/2,
   actionId:action.id,iconId:btn.dataset.fireIcon,button:btn,moved:false,target:null,
   fairyDirection:battleIsTransfer(action)?((e.clientX-rect.left)/Math.max(1,rect.width)<.33?'left':
    (e.clientX-rect.left)/Math.max(1,rect.width)>.67?'right':'none'):''};
  try{btn.setPointerCapture(e.pointerId)}catch{}
  e.preventDefault();
 });
 dock.addEventListener('pointermove',e=>{
  const d=battleIconDragging;if(!d||d.pointerId!==e.pointerId)return;
  if(!d.moved&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<7)return;
  d.moved=true;
  d.button.classList.add('is-dragging');
  const a=battleActions().find(x=>x.id===d.actionId&&!x.unavailable);
  const candidate=a&&a.targetCount>0&&!battleIsTransfer(a)?battleIconTargetAt(e.clientX,e.clientY,a):null;
  if(candidate!==d.target){
   d.target?.classList.remove('gmww-battle-icon-snap');
   d.target=candidate;candidate?.classList.add('gmww-battle-icon-snap');
  }
  d.button.classList.toggle('is-sucked',!!candidate);
  const r=candidate?.getBoundingClientRect();
  const point=r?battleIconClamp(r.left+r.width/2,r.top+r.height/2):
   battleIconClamp(d.baseX+e.clientX-d.startX,d.baseY+e.clientY-d.startY,!!(a&&battleIsTransfer(a)));
  d.button.style.left=point.x+'px';d.button.style.top=point.y+'px';
  e.preventDefault();
 });
 const finish=e=>{
  const d=battleIconDragging;if(!d||d.pointerId!==e.pointerId)return;
  const id=d.actionId,moved=d.moved;
  const a=battleActions().find(x=>x.id===id&&!x.unavailable);
  const target=e.type==='pointerup'&&moved&&a?.targetCount>0&&!battleIsTransfer(a)?
   battleIconTargetAt(e.clientX,e.clientY,a):null;
  const point=battleIconClamp(d.baseX+e.clientX-d.startX,d.baseY+e.clientY-d.startY,!!(a&&battleIsTransfer(a)));
  if(e.type==='pointerup'&&moved){
   // For multi-target actions return the icon to its entrance slot for the next drop.
   // For single target/free moving keep the chosen location.
   const key=battleIconPositionKey(id,d.iconId);
   if(a?.targetCount>1&&target)battleIconPositions.delete(key);
   else {
    if(a&&battleIsTransfer(a)){
     const w=globalThis.visualViewport?.width||innerWidth;
     point.x=Math.min(Math.max(140,point.x),Math.max(140,w-140));
    }
    battleIconPositions.set(key,point);
   }
  }else{
   d.button.style.left=d.baseX+'px';d.button.style.top=d.baseY+'px';
  }
  battleIconClearDrag();
  if(e.type!=='pointerup'||battleState.busy||battleState.syncPending||!a)return;
  if(!moved){
   if(!playAudioMuted())void battlePlayConfiguredAudio('actions',a.actionId,a.name);
   if(battleIsTransfer(a)){
    battleClear();battleState.actionId=a.id;battleState.transferDir=d.fairyDirection||'none';
    void battleConfirm(true);return;
   }
   if(a.noTarget||a.targetCount===0){
    if(!confirm('Xác nhận '+a.name+'?'))return;
    battleClear();battleState.actionId=a.id;void battleConfirm(true);return;
   }
   if(a.targetCount>0)battleOpenTargetSheet(a.id,'list');
   return;
  }
  if(!target||!a.targetCount)return;
  const accepted=battlePickTargetWithAudio(String(target.dataset.playPlayerId||''),id);
  if(!accepted)return;
  if(battleState.targets.length===a.targetCount){
   if(a.actionId==='action_assassin_mark'||battleIsTransfer(a))battleOpenTargetSheet(a.id,'list');
   else void battleConfirm(true);
  }
 };
 dock.addEventListener('pointerup',finish);
 dock.addEventListener('pointercancel',finish);
}
// Repaint the current GM turn when the icon catalog becomes available after OTA.
globalThis.addEventListener?.('gmww-action-icons-ready',()=>{
 if(playSceneState.step==='battle')renderPlayBattle();
});
const battleRules=()=>globalThis.GMWW_BATTLE_CONTROLS;
const battleTurn=()=>battleRules()?.currentTurn(playSceneState.phase,playSceneRuntime.nightRuntime)||null;
const battleDayActions=()=>{
  const rows=Array.isArray(playSceneRuntime.assignments)?playSceneRuntime.assignments:[],
    night=Math.max(1,Number(playSceneState.night)||1),
    matchId=String(playSceneRuntime.room?.matchId||''),
    ledger=Array.isArray(playSceneRuntime.dayActionUsage)?playSceneRuntime.dayActionUsage:[],
    usedArtifacts=Array.isArray(playSceneRuntime.artifactCycle?.accepted)?playSceneRuntime.artifactCycle.accepted:[],
    names={'action_stab':'Đâm','action_bear_scan':'Soi nhóm','action_knight_last_strike':'Hiệp Sĩ chọn người chết'};
  const catalog=(kind)=>Array.isArray(state.actions)?state.actions:Array.isArray(state.actions?.[kind])?state.actions[kind]:[];
  const roleActions=[];
  const add=(fn,owner,card,isArtifact)=>{
    if(!fn||fn.passive||!['day','any','both'].includes(String(fn.phase||''))||
      (fn.fromNight!=null&&night<Number(fn.fromNight))||
      (fn.toNight!=null&&night>Number(fn.toNight)))return;
    const actorId=String(owner.loginId||''),roleId=isArtifact?'':String(owner.roleId||''),
      artifactId=isArtifact?String(owner.artifactId||''):'',actionId=String(fn.actionId||fn.id||'');
    if(!actorId||!actionId)return;
    const knight=roleId==='role_knight'&&actionId==='action_knight_last_strike'&&
      playSceneRuntime.gallows?.stage==='resolved'&&playSceneRuntime.gallows?.outcome==='dead'&&
      playSceneRuntime.gallows?.candidateId===actorId;
    const dead=playPlayerEffect(actorId)==='dead',expelled=playPlayerEffect(actorId)==='expelled',
      frozen=playPlayerEffect(actorId)==='frozen';
    const own=ledger.filter(x=>x.actorId===actorId&&x.roleId===roleId&&x.artifactId===artifactId);
    const hits=own.filter(x=>x.actionId===actionId);
    const mode=String(fn.usageMode||'unlimited'),quota=Math.max(1,Number(fn.usageCount)||1);
    let blocked=frozen||expelled||(dead&&!fn.actorMayBeDead&&!knight),
      reason=blocked?'Người thực hiện đã chết hoặc bị khóa hành động.':'';
    if(!isArtifact){
      if(card?.flags?.allowMultipleActions===false&&own.some(x=>Number(x.day)===night)){
        blocked=true;reason='Đã thực hiện một chức năng trong ngày.'}
      if((['onceGame','nGame','custom'].includes(mode)&&hits.length>=quota)||
        (['eachNight','eachDay','nPerNight'].includes(mode)&&hits.filter(x=>Number(x.day)===night).length>=quota)){
        blocked=true;reason='Hết lượt dùng chức năng.'}
      if(actionId==='action_bear_scan'&&hits.some(x=>Number(x.day)===night)){
        blocked=true;reason='Thần Gấu chỉ soi một lần mỗi ngày.'}
    }else if(usedArtifacts.some(x=>String(x.playerId||'')==='member:'+actorId&&String(x.artifactId||'')===artifactId)){
      blocked=true;reason='Artifact đã sử dụng trong ngày.'}
    const definitions=catalog(isArtifact?'artifacts':'role'),
      def=definitions.find(x=>String(x?.id||'')===actionId),
      label=String(def?.name||fn.name||names[actionId]||fn.description||'Hành động').trim();
    const name=/^action[-_]/i.test(label)?'Hành động':label;
    const ownerId=isArtifact?'artifact:'+artifactId:'role:'+roleId;
    roleActions.push({id:'day:'+ownerId+':'+actorId+':'+actionId,
      actionId,roleId,artifactId,name,actorIds:[actorId],
      type:battleRules()?.resolvedType({actionId,name,effectIds:fn.effectIds||[]})||'effect_notice',
      targetCount:fn.noTarget?0:Math.max(0,Math.min(30,Number(fn.targetCount??1)||0)),
      noTarget:!!fn.noTarget,noSelf:fn.noSelf!==false,allowDead:!!fn.allowDead,
      actorMayBeDead:!!fn.actorMayBeDead||knight,
      effectIds:Array.isArray(fn.effectIds)?fn.effectIds:[],unavailable:blocked,
      unavailableReason:reason});
  };
  for(const owner of rows){
    const role=(state.cards||[]).find(x=>String(x.id||'')===String(owner.roleId||''));
    if(role)for(const fn of role.functions||[])add(fn,owner,role,false);
    const artId=String(owner.artifactId||'');
    if(artId){
      const art=(state.artifacts||[]).find(x=>String(x.id||'')===artId);
      if(art){
        const fns=Array.isArray(art.functions)&&art.functions.length?art.functions:art.actions||[];
        for(const fn of fns)add(fn,owner,art,true);
      }
    }
  }
  return roleActions;
};
const battleActions=()=>{
  if(playSceneState.phase==='day')return battleDayActions();
  const turn=battleTurn();
  const actions=battleRules()?.artifactUsed(playSceneRuntime.artifactCycle?.accepted,turn)?[]:
    battleRules()?.actionsForTurn(turn,Math.max(1,Number(playSceneState.night)||1),state,playSceneRuntime.artifactCycle?.accepted)||[];
  const ledger=Array.isArray(playSceneRuntime.battleActionUsage)?playSceneRuntime.battleActionUsage:[],
    night=Math.max(1,Number(playSceneState.night)||1),matchId=String(playSceneRuntime.room?.matchId||'');
  // Per-player limits: another eligible member of the same waking group can
  // still act, even when one wolf/player is frozen, dead or exhausted.
  return actions.map(action=>{
    let unavailableReason='';
    if(turn?.kind==='wolf-pack-bite'){
      const alpha=(playSceneRuntime.assignments||[]).filter(x=>x.roleId==='role_alpha_wolf');
      const expelled=alpha.some(x=>(playSceneRuntime.activeEffects||[]).some(e=>e.type==='expelled'&&
        e.effectActive!==false&&String(e.loginId||'').replace(/^member:/,'')===String(x.loginId||'').replace(/^member:/,'')));
      const alreadyBit=ledger.some(x=>String(x.matchId)===matchId&&Number(x.night)===night&&x.actionId==='action_wolf_bite');
      if(expelled||alreadyBit)return {...action,unavailable:true,actorIds:[],
        unavailableReason:expelled?'Sói Trùm bị đuổi: Bầy Sói không thể Cắn.':'Bầy Sói đã Cắn trong đêm này.'};
    }
    if(action.roleId==='role_old_witch'&&action.actionId==='action_revive'&&
      !playLiveMembers().some(m=>playPlayerEffect(m.loginId)==='dead'&&
        battleRules().oldWitchReviveEligible(action,m,playSceneRuntime.activeEffects,night)))
      return {...action,unavailable:true,unavailableReason:'Không có người chết hợp lệ từ ngày hoặc đêm trước để Hồi Sinh.'};
    if(action.roleId!=='role_old_witch'&&(action.type==='revive'||action.actionId==='action_revive')&&
      !playLiveMembers().some(m=>playPlayerEffect(m.loginId)==='dead'))
      return {...action,unavailable:true,unavailableReason:'Chưa có người chết để hồi sinh.'};
    const actorIds=(action.actorIds||[]).filter(actorId=>{
      if(playPlayerBlocked(actorId)){unavailableReason=playBlockReason(actorId);return false}
      if(action.artifactId)return true; // Artifact use is governed by its existing cycle ledger.
      const owner=turn?.kind==='role-group'?(turn.roles||[]).find(r=>
        (r.loginIds||[]).map(String).includes(String(actorId))&&
        (r.roleId===action.roleId||!(action.roleIds||[]).length||(action.roleIds||[]).includes(r.roleId))):turn;
      const roleId=String(owner?.roleId||action.roleId||''),card=(state.cards||[]).find(r=>String(r.id)===roleId);
      if(roleId==='role_snow_wolf'&&action.actionId==='action_wolf_bite'&&
        (playSceneRuntime.assignments||[]).some(row=>{
          const other=String(row?.roleId||''),login=String(row?.loginId||'').trim().toLowerCase().replace(/^member:/,'');
          const faction=String(row?.roleCard?.factionId||row?.factionId||row?.faction||'').toLowerCase();
          const wolf=other.includes('wolf')||faction==='wolf'||faction.includes('sói')||faction.includes('soi');
          return other!=='role_snow_wolf'&&wolf&&login&&playPlayerEffect(login)!=='dead'&&
            !((playSceneRuntime.activeEffects||[]).some(effect=>String(effect?.loginId||'').trim().toLowerCase().replace(/^member:/,'')===login&&effect?.type==='dead'&&effect?.effectActive!==false));
        })){unavailableReason='Còn Sói khác sống: Sói Tuyết chưa được Cắn.';return false}
      if(!roleId||!card)return true; // Legacy catalog: server still validates.
      const own=ledger.filter(row=>String(row?.matchId)===matchId&&String(row?.actorId)===String(actorId)&&String(row?.roleId)===roleId);
      const onlyOne=card.flags?.allowMultipleActions===false||roleId==='role_old_witch';
      if(onlyOne&&own.some(row=>Number(row.night)===night)){unavailableReason='Đã dùng 1 chức năng trong đêm.';return false}
      const fn=(card.functions||[]).find(item=>String(item.actionId)===String(action.actionId));
      if(fn){
        const mode=String(fn.usageMode||''),quota=Math.max(1,Number(fn.usageCount)||1);
        const hits=own.filter(row=>String(row.actionId)===String(action.actionId)&&
          (['onceGame','nGame','custom'].includes(mode)||Number(row.night)===night)).length;
        if((['onceGame','nGame','custom','eachNight','eachDay','nPerNight'].includes(mode))&&hits>=quota){
          unavailableReason=['onceGame','nGame','custom'].includes(mode)?'Chức năng đã hết lượt trong ván.':'Chức năng đã hết lượt trong đêm.';
          return false
        }
      }else if(roleId==='role_old_witch'&&String(action.actionId)==='action_revive'&&
        own.some(row=>String(row.actionId)==='action_revive')){
        unavailableReason='Hồi Sinh chỉ được sử dụng một lần trong ván.';return false
      }
      return true;
    });
    // Artifact controls show the human-readable action only (never internal action IDs,
    // artifact title or the owner's name). Older catalogs may carry raw action-* identifiers.
    const rawName=String(action.name||'').trim();
    const name=action.artifactId&&/^action[-_][a-z0-9_-]+$/i.test(rawName)
      ?'Hành động':rawName;
    // WITCH-01: keep the last confirmed target unavailable on the next night.
    // Older matches without ledger targets remain protected by the Server check.
    const actor=actorIds[0];
    const consecutiveRole=action.actionId==='action_snow_wolf_freeze'?'role_snow_wolf':
      action.actionId==='action_protect'?'role_guard':
      action.roleId==='role_old_witch'&&action.actionId==='action_exile'?'role_old_witch':'';
    const forbiddenTargets=consecutiveRole&&actor?
      ledger.filter(x=>String(x.matchId)===matchId&&String(x.roleId)===consecutiveRole&&
        String(x.actionId)===String(action.actionId)&&String(x.actorId)===String(actor)&&Number(x.night)===night-1)
        .flatMap(x=>Array.isArray(x.targetIds)?x.targetIds:[]):[];
    return {...action,name,actorIds,forbiddenTargets,unavailable:!!action.unavailable||!actorIds.length,unavailableReason:action.unavailableReason||unavailableReason};
  });
};
const battleAction=()=>battleActions().find(a=>a.id===battleState.actionId);
const battleMember=id=>playLiveMembers().find(m=>String(m.loginId||'')===String(id));
const battleUsed=turn=>!!battleRules()?.artifactUsed(playSceneRuntime.artifactCycle?.accepted,turn);
function battleTickCountdown(){
  battleGallowsTick();
  const clock=document.getElementById('battleCountdown'),root=document.getElementById('playBattleDock');
  if(!clock||!root||root.hidden)return;
  const serverNow=Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0);
  const rt=playSceneRuntime.nightRuntime,phase=playSceneState.phase;
  let seconds=phase==='night'?battleRules()?.remainingSeconds(rt,serverNow):null;
  if(phase==='day'){
    const room=playSceneRuntime.room||{},duration=Number(playSceneRuntime.gameConfig?.timing?.villageDiscussionSec),
      deadline=Date.parse(room.dayDeadlineAt||''),started=Date.parse(room.cycleStartedAt||'');
    const paused=room.autoGM===false?Number(room.dayPausedRemainingMs):NaN;
    if(room.autoGM===false&&room.dayPausedRemainingMs!=null&&Number.isFinite(paused))
      seconds=Math.max(0,Math.ceil(paused/1000));
    else if(Number.isFinite(deadline))seconds=Math.max(0,Math.ceil((deadline-serverNow)/1000));
    else if(Number.isFinite(duration)&&duration>0)
      seconds=Number.isFinite(started)?Math.max(0,Math.ceil(duration-(serverNow-started)/1000)):Math.ceil(duration);
  }
  // Anchor the local countdown to a stable turn identity. A server refresh must
  // never restart the countdown or increase the remaining time.
  const tickKey=[playSceneRuntime.room?.matchId||'',phase,playSceneState.night||0,
    rt?.cursor??'',rt?.currentId||'',phase==='day'?[playSceneRuntime.room?.cycleStartedAt||'',playSceneRuntime.room?.dayDeadlineAt||'',playSceneRuntime.room?.dayPausedRemainingMs??'',playSceneRuntime.room?.autoGM!==false].join('/'):''].join(':');
  const now=performance.now();
  if(battleState.countdownKey!==tickKey){
    battleState.countdownKey=tickKey;
    battleState.countdownBase=Number.isFinite(seconds)?seconds:null;
    battleState.countdownAt=now;
  }else{
    if(phase==='day'&&playSceneRuntime.room?.autoGM===false){
      // Pausing Auto GM must freeze the day clock, not merely disable the server alarm.
      battleState.countdownBase=seconds;battleState.countdownAt=now;
    }else if(Number.isFinite(battleState.countdownBase)){
      const local=Math.max(0,Math.ceil(battleState.countdownBase-(now-battleState.countdownAt)/1000));
      seconds=Number.isFinite(seconds)?Math.min(seconds,local):local;
    }else if(Number.isFinite(seconds)){
      battleState.countdownBase=seconds;
      battleState.countdownAt=now;
    }
  }
  if(phase==='day'&&Number.isFinite(seconds)){
    const demoSpeed=playSceneRuntime.room?.demo===true&&demoRunner.running?
      Math.max(1,Number(demoRunner.speed)||1):1;
    const warningSeconds=Math.max(1,Math.ceil(30/demoSpeed));
    const cueKey=[playSceneRuntime.room?.matchId||'',playSceneState.night,playSceneRuntime.room?.cycleStartedAt||''].join(':');
    if(playSceneRuntime.room?.dayPausedRemainingMs==null&&seconds<=warningSeconds&&seconds>0&&battleState.dayCountdownCueKey!==cueKey){
      battleState.dayCountdownCueKey=cueKey;
      void battlePlayConfiguredAudio('system','audio_system_countdown','Đếm ngược 30 giây cuối');
    }
    if(playSceneRuntime.room?.dayPausedRemainingMs==null&&seconds<=0&&battleState.dayTimeupCueKey!==cueKey){
      battleState.dayTimeupCueKey=cueKey;
      void battlePlayConfiguredAudio('system','audio_system_time_up','Hết giờ');
    }
  }
  // Edge-triggered: returning from campfire happens exactly when the night turn reaches 0.
  // No new timer or rAF; preserves server-clock ownership and works across refetches.
  const expired=phase==='night'&&Number.isFinite(seconds)&&seconds<=0;
  if(battleState.gmwwWalkExpired!==expired){
    battleState.gmwwWalkExpired=expired;battleMarkPlayers();
  }
  const formatted=battleRules()?.formatTime(seconds)||'--:--';
  if(clock.textContent!==formatted)clock.textContent=formatted;
  clock.classList.toggle('is-ending',seconds!==null&&seconds<=10);
  clock.title=seconds===null?'Chưa thiết lập thời gian':rt?.autoAdvance===false&&phase==='night'?'Auto GM tạm dừng: thời gian lượt còn lại':'Đếm ngược theo thời gian cấu hình';
}
async function battleNavigateIndex(index){
  if(battleState.busy||battleState.syncPending||playSceneRuntime.busy||playSceneState.step!=='battle'||playSceneState.phase!=='night')return;
  const rt=playSceneRuntime.nightRuntime,queue=rt?.queue||[];
  if(!Number.isInteger(index)||index<0||index>=queue.length||index===rt.cursor)return;
  if(battleUsed(queue[index])){playFlashError('Artifact này đã dùng ở lượt trước; không thể dùng lại trong đêm.');return}
  battleUnlockAudioFromGesture(); // iOS needs an unlocked audio path before the asynchronous Server turn switch.
  const upcomingCue=battleTurnAudioCue(queue[index]);
  if(upcomingCue){
    const upcomingAudio=battleFindAudio(upcomingCue.kind,upcomingCue.targetId,upcomingCue.name);
    if(upcomingAudio)void battleWarmAudio(upcomingCue.kind,upcomingAudio);
  }
  if(battleState.targets.length&&!confirm('Bỏ mục tiêu chưa xác nhận để chuyển lượt?'))return;
  battleState.busy=true;renderPlayBattle();
  try{
    const targetId=queue[index].id,jump=(targetIndex,expectedTurnId)=>playRoomApi('/turn',{method:'POST',body:JSON.stringify({action:'jump',targetIndex,expectedTurnId,source:'gm-timeline'})});
    let result;
    try{result=await jump(index,rt.currentId||'')}
    catch(err){
      if(err?.code!=='STALE_TURN'||!demoRunner.running)throw err;
      await playSyncRoom(true);
      const fresh=playSceneRuntime.nightRuntime,retryIndex=fresh?.queue?.findIndex(x=>x.id===targetId)??-1;
      if(retryIndex<0||battleUsed(fresh.queue[retryIndex]))throw err;
      result=retryIndex===fresh.cursor?{runtime:fresh}:await jump(retryIndex,fresh.currentId||'');
    }
    playSceneRuntime.nightRuntime=result?.runtime||rt;
    battleClear();await playSyncRoom(true);
  }catch(err){playFlashError('Không thể chuyển lượt: '+String(err?.message||err));await playSyncRoom(true).catch(()=>{})}
  finally{battleState.busy=false;renderPlayBattle()}
}
function battleNavigateRelative(delta){
  const rt=playSceneRuntime.nightRuntime;
  if(playSceneState.phase!=='night'||!rt?.queue?.length)return;
  let index=rt.cursor+delta;
  while(index>=0&&index<rt.queue.length&&battleUsed(rt.queue[index]))index+=delta;
  if(index>=0&&index<rt.queue.length)void battleNavigateIndex(index);
}

const battleVisualType=a=>{const key=String([a?.actionId,a?.name,...(a?.effectIds||[])].join(' ')).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/(bite|can|wolf)/.test(key))return'wolf-bite';
  if(/(freeze|dong bang|frozen)/.test(key))return'frozen';
  if(/(exile|expel|duoi)/.test(key))return'expelled';
  if(/(revive|hoi sinh)/.test(key))return'revive';
  if(/(kill|giet|poison)/.test(key))return'dead';
  if(/(protect|bao ve|shield)/.test(key))return'shield';
  if(/(swap|clone|doi vai|trang guong)/.test(key))return'swap';
  if(/(seer|soi|tien tri|reveal)/.test(key))return'seer';
  return'effect_notice';
};
function battleIsTransfer(a){return !!a&&!a.artifactId&&String(a.actionId||'')==='action_transfer_bite'}
// GM picks the bite direction; OK confirms. No choice means the Fairy does nothing.
function battleRenderTransferPanel(){
 const bar=document.getElementById('battleActionBar');if(!bar)return;
 let panel=document.getElementById('battleTransferPanel');
 if(!panel){panel=document.createElement('div');panel.id='battleTransferPanel';(bar.closest('.battle-action-rail')||bar).insertAdjacentElement('afterend',panel)}
 const a=battleAction(),show=!!a&&battleIsTransfer(a)&&battleState.actionId===a.id&&!a.unavailable&&!battleIconOn();
 const sig=show+':'+battleState.busy+':'+battleState.syncPending;
 if(panel.dataset.sig===sig)return;panel.dataset.sig=sig;panel.hidden=!show;
 if(!show){panel.innerHTML='';return}
 panel.innerHTML='<div class="gmww-transfer-card gmww-fairy-panel" role="group" aria-label="Hướng dịch vết cắn">'+
   '<img draggable="false" src="action-icons/v3/51_yeu_tinh_three_way.webp" alt="">'+
   [['left','Dịch trái'],['none','Không dịch'],['right','Dịch phải']].map(([v,label])=>
     '<button type="button" class="gmww-fairy-hotspot" data-transfer="'+v+'" aria-label="'+label+'" title="'+label+'"></button>').join('')+
   '</div>';
 panel.querySelectorAll('[data-transfer]').forEach(button=>button.addEventListener('click',()=>{
   if(battleState.busy||battleState.syncPending)return;
   if(!playAudioMuted())void battlePlayConfiguredAudio('actions',a.actionId,a.name);
   battleState.transferDir=button.dataset.transfer;void battleConfirm(true);
 }));
}
function battleUpdateActionNavigation(){
  // GMWW mobile: the full-width action rail uses direct swipe; arrows take
  // no space and never appear after render or resize.
  const previous=document.getElementById('battleActionPrevious'),next=document.getElementById('battleActionNext');
  if(previous){previous.hidden=true;previous.disabled=true}
  if(next){next.hidden=true;next.disabled=true}
}
function battleActionGestureMode(dx,dy){
  return Math.abs(dx)>Math.abs(dy)*1.25?'scroll':'drag';
}
function battleNavigateActions(direction){
  const bar=document.getElementById('battleActionBar');if(!bar)return;
  // Arrow navigation and direct drag have distinct touch targets: never turn a drag into a swipe.
  // Move to the next complete action button rather than a hard-to-select page.
  const buttons=[...bar.querySelectorAll('button[data-battle-action]')];
  if(!buttons.length)return;
  const left=bar.scrollLeft;
  const offsets=buttons.map(button=>button.offsetLeft-buttons[0].offsetLeft);
  const destination=direction>0
    ?offsets.find(offset=>offset>left+5)
    :offsets.slice().reverse().find(offset=>offset<left-5);
  bar.scrollTo({left:destination??(direction>0?bar.scrollWidth:0),behavior:'smooth'});
}
let battleConfirmAudioGate=false;
function battleAdvanceConfirmedTurn(){
  const id=battleState.pendingNextTurnId;
  if(!id||battleState.syncPending||battleState.busy||battleConfirmAudioGate||document.getElementById('battleResultPopup')?.hidden===false)return;
  battleState.pendingNextTurnId='';
  // Phù Thủy has two independent once-per-match potions. Keep this turn open
  // after either confirmation; only GM navigation or turn deadline advances it.
  const turn=battleTurn();
  if(playSceneState.phase==='night'&&turn?.id===id&&
     (turn.roleId==='role_witch'||(turn.roles||[]).some(x=>x.roleId==='role_witch')))return;
  if(playSceneState.phase==='night'&&turn?.id===id)battleNavigateRelative(1);
}
function battleCloseResultPopup(){
  const popup=document.getElementById('battleResultPopup');
  if(!popup||popup.hidden)return;
  popup.hidden=true;
  battleAdvanceConfirmedTurn();
}
function battleShowResultPopup(title,message,scanOnly=false){
  const popup=document.getElementById('battleResultPopup');if(!popup)return;
  const headline=document.getElementById('battleResultTitle'),body=document.getElementById('battleResultMessage');
  if(headline){headline.hidden=scanOnly;headline.textContent=String(title||'KẾT QUẢ')}
  if(body)body.textContent=String(message||'');
  popup.classList.toggle('is-wolf-result',String(title||'').includes('VẾT CẮN'));
  popup.classList.toggle('is-scan-result',scanOnly);
  const negative=/bị giết|bị cắn|sói cắn|vết cắn|bị chết|đầu độc|bị đóng băng|bị đuổi|thất bại|không thành công|tử vong|bị phạt/i.test(String(title||'')+' '+String(message||''));
  popup.dataset.resultTone=negative?'negative':'positive';
  popup.hidden=false;popup.dataset.turnKey=battleState.key;
}
/* Morning notices are derived only from committed interactions for this match and night.
   They must never be synthesized from a selected target or a private role card. */
let battleDayAudioQueue=null;
function battleQueueDayAudio(cues){
  if(playSceneState.phase!=='day'||!Array.isArray(cues)||!cues.length)return;
  const key=[playSceneRuntime.room?.matchId||'',playSceneState.night||0,
    playSceneRuntime.room?.cycleStartedAt||'',playSceneRuntime.gallows?.stage||'ready'].join(':');
  if(!battleDayAudioQueue||battleDayAudioQueue.key!==key)
    battleDayAudioQueue={key,items:[],active:false};
  const queue=battleDayAudioQueue;
  queue.items.push(...cues);
  const playNext=()=>{
    if(queue!==battleDayAudioQueue||playSceneState.phase!=='day')return;
    if(queue.active)return;
    const next=queue.items.shift();if(!next)return;
    queue.active=true;
    const [id,label]=next;
    let done=false,watchdog=null;
    const complete=()=>{
      if(done)return;
      done=true;if(watchdog!==null)clearTimeout(watchdog);
      queue.active=false;playNext();
    };
    // At fast DEMO speeds the ballot may advance in 6–15 real seconds.
    // The old 45s per cue caused obsolete morning narration to pile up.
    const speed=playSceneRuntime.room?.demo===true&&demoRunner.running?
      Math.max(1,Number(demoRunner.speed)||1):1;
    watchdog=setTimeout(complete,Math.max(2200,Math.round(15000/speed)));
    const started=id==='__tts__'?battleSpeakCue(label,false,complete):
      battlePlayConfiguredAudio('system',id,label,false,complete);
    void Promise.resolve(started).then(ok=>{if(ok===false)complete()},complete);
  };
  playNext();
}
function battleMorningPlayAudio(){
  const notices=battleMorningRows(),dead=notices.filter(x=>x.kind==='dead').length,queue=[];
  // Guaranteed day-entry event: the server may skip the optional final
  // village-wakeup NIGHT turn, so speak Làng ơi dậy đi HERE on Day transition.
  queue.push(['audio_system_day_wakeup','Làng ơi dậy đi']);
  // When nobody died, omit the whole death-count announcement. An absent
  // number-0 clip could otherwise stall the iPhone queue after the intro.
  if(dead>0){
    queue.push(['audio_system_morning_deaths_intro','Đêm qua làng chúng ta có']);
    queue.push(['audio_system_morning_number_'+dead,String(dead)]);
    queue.push(['audio_system_morning_dead_noun','người chết']);
  }
  for(const row of notices){
    if(row.kind==='expelled')queue.push(['audio_system_morning_expelled','Đêm qua '+row.name+' đã bị đuổi khỏi làng']);
    else if(row.kind==='assassin_mark'||row.kind==='marked')
      queue.push(['audio_system_morning_marked','Đêm qua '+row.name+' đã bị Sát Thủ chọn']);
    else if(row.kind==='dead'&&row.role==='Thiếu Nữ')
      queue.push([/nhà Sói/i.test(row.label)?'audio_system_morning_maiden_wolf':'audio_system_morning_maiden_follow',row.name+' '+row.label]);
    else if(row.kind!=='dead')queue.push(['audio_system_morning_'+row.kind,row.name+' '+row.label]);
  }
  // Responses from Player Web are added by battleMorningShow when confirmed,
  // not duplicated in this initial snapshot.
  battleQueueDayAudio(queue);
}
function battleDivinationSystemAudioCue(actionId,result){
  const action=String(actionId||'');
  if(action==='action_aura_read')return 'audio_system_aura_read';
  if(action==='action_destroyer_scry')return 'audio_system_destroyer_role';
  if(action==='action_find_seer')return result?.found?'audio_system_find_seer_yes':'audio_system_find_seer_no';
  if(action==='action_compare_faction')return result?.same?'audio_system_compare_same':'audio_system_compare_different';
  const prefixes={action_seer:'seer',action_fox_scan:'fox',action_bear_scan:'bear',
    action_scan_three:'piper',action_wolf_seer:'seer',action_rotten_seer:'seer'};
  const prefix=prefixes[action];if(!prefix)return '';
  const yes=!!result?.wolf;
  return prefix==='seer'?(yes?'audio_system_seer_wolf':'audio_system_seer_not_wolf'):
    'audio_system_'+prefix+(yes?'_wolf':'_no_wolf');
}
function battlePresentRevelation(actionId,revelation){
  if(!revelation?.message)return;
  battleShowResultPopup('',String(revelation.message||''),true);
  const cue=battleDivinationSystemAudioCue(actionId,revelation);
  if(actionId==='action_compare_faction'){
    // Spiritualist knows only SAME/DIFFERENT; never play or speak roles.
    if(cue)void battlePlayConfiguredAudio('system',cue,revelation.message);
  }else if(actionId==='action_aura_read'){
    // V1.11: “Người bạn soi là” + the saved NAME-only cut from the role
    // wake-up audio. No full “ơi dậy đi” and no competing speech synthesis.
    const target=revelation?.targets?.[0]||{};
    const roleName=String(target.roleName||revelation.message||'').trim();
    const playName=()=>{if(roleName)void battlePlayConfiguredAudio('cards',target.roleId||'',roleName,false,null,1)};
    if(cue&&battleFindAudio('system',cue,revelation.message))
      void battlePlayConfiguredAudio('system',cue,'Người bạn soi là',false,playName);
    else void battleSpeakCue('Người bạn soi là',false,playName);
  }else if(cue)void battlePlayConfiguredAudio('system',cue,revelation.message);
}
async function battleWakeupToDay(expectedKey){
  if(battleState.wakeAdvanceInFlight||battleState.key!==expectedKey||
     playSceneState.step!=='battle'||playSceneState.phase!=='night'||battleTurn()?.kind!=='village-wakeup')return;
  battleState.wakeAdvanceInFlight=expectedKey;
  try{
    await advancePlayPhase(); // Complete the actual wake-up turn on the Server.
    if(playSceneState.step==='battle'&&playSceneState.phase==='night'&&
       playSceneRuntime.nightRuntime?.completed)await advancePlayPhase(); // Day phase.
  }finally{battleState.wakeAdvanceInFlight=''}
}
function battlePlayWakeupAndAdvance(turn,key){
  if(battleState.wakeAudioStartedKey===key)return;
  battleState.wakeAudioStartedKey=key;
  // Daybreak narration belongs to the authoritative Day phase, never the
  // optional terminal Night turn. This avoids missing or double wake-up cues.
  void battleWakeupToDay(key);
}
// Say Rượu deck lives inside the game page, not document.body.
function battleRenderDrunkDraw(turn){
  let deck=document.getElementById('gmwwGmDrunkDeck');
  const room=playSceneRuntime.room||{};
  const active=playSceneState.step==='battle'&&playSceneState.phase==='night'&&
    Number(playSceneState.night||0)===3&&String(room.phase||'')==='running'&&
    document.getElementById('start')?.classList.contains('active')&&
    turn?.roleId==='role_drunk';
  const draws=active?(playSceneRuntime.drunkDraws||[]).filter(row=>
    row?.status==='pending'&&String(row.matchId||'')===String(room.matchId||'')&&
    (turn.loginIds||[]).map(String).includes(String(row.actorId||''))):[];
  if(!draws.length){if(deck)deck.hidden=true;return}
  const shell=document.getElementById('playShell');if(!shell)return;
  if(!deck){
    const style=document.createElement('style');style.id='gmwwGmDrunkDeckCss';
    style.textContent='#gmwwGmDrunkDeck{position:absolute;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;pointer-events:none;background:transparent}'+
      '#gmwwGmDrunkDeck[hidden]{display:none!important}'+
      '#gmwwGmDrunkDeck .deck-row{max-width:96%;max-height:72dvh;overflow:auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px}'+
      '#gmwwGmDrunkDeck .deck-card{display:block;width:clamp(68px,25vw,145px);aspect-ratio:3/4;border:0;border-radius:9px;object-fit:cover;box-shadow:0 8px 20px #0018;pointer-events:none}';
    document.head.appendChild(style);
    deck=document.createElement('div');deck.id='gmwwGmDrunkDeck';shell.appendChild(deck);
  }
  deck.hidden=false;deck.replaceChildren();
  const cards=document.createElement('div');cards.className='deck-row';
  for(const draw of draws)for(const card of draw.cards||[]){
    const img=document.createElement('img');img.className='deck-card';
    img.src='role-card-back.webp';img.alt='Lá Vai Trò úp';img.draggable=false;
    cards.appendChild(img);
  }
  deck.appendChild(cards);
}
// Nhãn MỤC TIÊU vẫn hiển thị; không mở popup Phù Thủy riêng.
function battleBindResultPopup(){
  const popup=document.getElementById('battleResultPopup');if(!popup||popup.dataset.dragReady)return;
  popup.dataset.dragReady='1';
  const grip=document.getElementById('battleResultGrip');if(!grip)return;
  let drag=null;
  grip.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')||(e.button!==0&&e.pointerType!=='touch'))return;
    const r=popup.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top,id:e.pointerId};
    try{grip.setPointerCapture(e.pointerId)}catch{}e.preventDefault();
  });
  grip.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const left=Math.max(6,Math.min(innerWidth-popup.offsetWidth-6,drag.left+e.clientX-drag.x));
    const top=Math.max(6,Math.min(innerHeight-popup.offsetHeight-6,drag.top+e.clientY-drag.y));
    popup.style.left=left+'px';popup.style.top=top+'px';popup.style.right='auto';popup.style.bottom='auto';popup.style.transform='none';
  });
  const stop=()=>{drag=null};
  for(const handle of [grip,document.getElementById('battleResultMessage')].filter(Boolean)){
    if(handle!==grip){
      handle.addEventListener('pointerdown',e=>{
        if(!popup.classList.contains('is-scan-result')||(e.button!==0&&e.pointerType!=='touch'))return;
        const r=popup.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top,id:e.pointerId};
        try{handle.setPointerCapture(e.pointerId)}catch{}e.preventDefault();
      });
      handle.addEventListener('pointermove',e=>{
        if(!drag||e.pointerId!==drag.id)return;
        const left=Math.max(6,Math.min(innerWidth-popup.offsetWidth-6,drag.left+e.clientX-drag.x));
        const top=Math.max(6,Math.min(innerHeight-popup.offsetHeight-6,drag.top+e.clientY-drag.y));
        popup.style.left=left+'px';popup.style.top=top+'px';popup.style.right='auto';popup.style.bottom='auto';popup.style.transform='none';
      });
    }
    handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
  }
}
/* Magnetic docking: align a dragged panel with the visible top/bottom GM menu.
   Pure geometry from current layout; release farther than 32px detaches again. */
function gmwwMenuSnap(rect,threshold=32){
  if(!rect||!Number.isFinite(rect.top))return null;
  const anchors=['playSetupStrip','playBattleTop','gmTopMenu','battleBottomControls'];
  let best=null;
  for(const id of anchors){
    const bar=document.getElementById(id);
    if(!bar||bar.hidden||!bar.getClientRects?.().length)continue;
    const menu=bar.getBoundingClientRect();
    if(menu.width<90||menu.height<20||menu.bottom<=0||menu.top>=innerHeight)continue;
    const centerDelta=Math.abs((rect.left+rect.right-menu.left-menu.right)/2);
    if(centerDelta>Math.max(menu.width,rect.width)*.55)continue;
    const above=(menu.top+menu.bottom)/2>innerHeight/2;
    const gap=above?Math.abs(rect.bottom-(menu.top-5)):Math.abs(rect.top-(menu.bottom+5));
    if(gap>threshold||best&&best.distance<=gap)continue;
    const width=Math.min(menu.width,innerWidth-16);
    const left=Math.max(8,Math.min(innerWidth-width-8,menu.left+(menu.width-width)/2));
    const rawTop=above?menu.top-5-rect.height:menu.bottom+5;
    const top=Math.max(8,Math.min(Math.max(8,innerHeight-rect.height-8),rawTop));
    best={left,top,width,distance:gap,edge:above?'bottom':'top',anchorId:id};
  }
  return best;
}
/* Battle overlays share viewport-clamped title dragging, without interfering with action buttons. */
function battleBindAuxiliaryDrag(panelId,handleSelector){
  const panel=document.getElementById(panelId),handle=panel?.querySelector(handleSelector);
  if(!panel||!handle||handle.dataset.gmOverlayDragReady)return;
  handle.dataset.gmOverlayDragReady='1';
  let drag=null;
  handle.addEventListener('pointerdown',e=>{
    if(panel.hidden||e.target.closest('button,a,input,select,textarea')||(e.button!==0&&e.pointerType!=='touch'))return;
    const r=panel.getBoundingClientRect();
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:r.left,top:r.top};
    panel.dataset.gmwwUserMoved='1';
    try{handle.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();
  });
  handle.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const p=battleTargetClampPosition(panel.offsetWidth,panel.offsetHeight,drag.left+e.clientX-drag.startX,drag.top+e.clientY-drag.startY);
    for(const [name,value] of Object.entries({left:p.left+'px',top:p.top+'px',right:'auto',bottom:'auto',transform:'none'}))panel.style.setProperty(name,value,'important');
    const preview=gmwwMenuSnap(panel.getBoundingClientRect());
    panel.classList.toggle('gmww-dock-near',!!preview);
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>12)panel.classList.remove('gmww-dock-snapped');
    e.preventDefault();
  });
  const stop=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const snap=e.type==='pointerup'?gmwwMenuSnap(panel.getBoundingClientRect()):null;
    panel.classList.remove('gmww-dock-near');
    if(snap){
      const p=battleTargetClampPosition(snap.width,panel.offsetHeight,snap.left,snap.top);
      panel.style.setProperty('--gmww-dock-width',snap.width+'px');
      panel.style.setProperty('left',p.left+'px','important');
      panel.style.setProperty('top',p.top+'px','important');
      panel.style.setProperty('right','auto','important');
      panel.style.setProperty('bottom','auto','important');
      panel.style.setProperty('transform','none','important');
      panel.classList.add('gmww-dock-snapped');
      panel.dataset.dockEdge=snap.edge;
    }else{panel.classList.remove('gmww-dock-snapped');panel.style.removeProperty('--gmww-dock-width');delete panel.dataset.dockEdge}
    panel.dataset.gmwwDockApplied='1';
    if(e.type==='pointerup')gmwwSaveDock(panel,snap);
    drag=null;try{handle.releasePointerCapture(e.pointerId)}catch{}
  };
  handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
  const keepVisible=()=>{
    if(panel.hidden)return;
    if(panel.classList.contains('gmww-dock-snapped')&&gmwwRestoreDock(panel,true))return;
    if(!panel.style.left)return;
    const r=panel.getBoundingClientRect(),p=battleTargetClampPosition(r.width,r.height,r.left,r.top);
    panel.style.setProperty('left',p.left+'px','important');panel.style.setProperty('top',p.top+'px','important');
  };
  window.addEventListener('resize',keepVisible,{passive:true});
  window.visualViewport?.addEventListener('resize',keepVisible,{passive:true});
}
/* V3.135: draggable affected-character chooser; same clamping for title and confirm-OK drag. */
function battleTargetClampPosition(width,height,left,top,viewportWidth=innerWidth,viewportHeight=innerHeight){
  const gap=6;
  return {left:Math.max(gap,Math.min(Math.max(gap,viewportWidth-width-gap),left)),
    top:Math.max(gap,Math.min(Math.max(gap,viewportHeight-height-gap),top))};
}
function battlePlaceTargetSheet(sheet,left,top){
  const p=battleTargetClampPosition(sheet.offsetWidth,sheet.offsetHeight,left,top);
  sheet.style.setProperty('left',p.left+'px','important');sheet.style.setProperty('top',p.top+'px','important');
  sheet.style.setProperty('right','auto','important');sheet.style.setProperty('bottom','auto','important');
  sheet.style.setProperty('transform','none','important');
  battleState.confirmPosition=p;
}
function battleBindTargetSheetDrag(){
  const sheet=document.getElementById('battleTargetSheet'),grip=document.getElementById('battleTargetGrip');
  if(!sheet||!grip||grip.dataset.dragReady)return;grip.dataset.dragReady='1';
  let drag=null;
  grip.addEventListener('pointerdown',e=>{
    if(sheet.hidden||sheet.classList.contains('is-confirm-only')||e.target.closest('button')||(e.button!==0&&e.pointerType!=='touch'))return;
    const rect=sheet.getBoundingClientRect();
    drag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,left:rect.left,top:rect.top};
    try{grip.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();
  });
  grip.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    battlePlaceTargetSheet(sheet,drag.left+e.clientX-drag.startX,drag.top+e.clientY-drag.startY);
    e.preventDefault();
  });
  const stop=e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;
    drag=null;try{grip.releasePointerCapture(e.pointerId)}catch{}
  };
  grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);
  const keepVisible=()=>{if(!sheet.hidden&&sheet.style.top)battlePlaceTargetSheet(sheet,sheet.getBoundingClientRect().left,sheet.getBoundingClientRect().top)};
  window.addEventListener('resize',keepVisible,{passive:true});
  window.visualViewport?.addEventListener('resize',keepVisible,{passive:true});
}
function battleBindConfirmDrag(){
  const sheet=document.getElementById('battleTargetSheet'),ok=document.getElementById('battleTargetConfirm');
  if(!sheet||!ok||ok.dataset.dragReady)return;ok.dataset.dragReady='1';
  let gesture=null;
  ok.addEventListener('pointerdown',e=>{
    if(!sheet.classList.contains('is-confirm-only')||(e.button!==0&&e.pointerType!=='touch'))return;
    const r=sheet.getBoundingClientRect();
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};
    try{ok.setPointerCapture(e.pointerId)}catch{}
  });
  ok.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;
    if(!gesture.moved)return;
    battlePlaceTargetSheet(sheet,gesture.left+e.clientX-gesture.x,gesture.top+e.clientY-gesture.y);
  });
  const end=()=>{
    if(gesture?.moved)battleState.ignoreConfirmClickUntil=Date.now()+400;
    gesture=null;
  };
  ok.addEventListener('pointerup',end);ok.addEventListener('pointercancel',end);
}
function battleClear(){battleIconClearDrag();battleState.assassinChoice='';battleState.transferDir='';battleState.actionId='';battleState.targets=[];battleState.roster=false;battleState.targetSheet=false;battleState.targetMode='list';battleState.dragAmbiguous=false;battleState.nonce=''}
function battlePickAction(id){if(battleState.busy||battleState.syncPending)return;const a=battleActions().find(a=>a.id===id);if(!a||a.unavailable||(a.noTarget&&!battleIsTransfer(a)))return;if(battleState.actionId!==id){battleClear();battleState.actionId=id}battleState.roster=true;renderPlayBattle()}
function battlePickTarget(id,actionId){
  if(battleState.busy||battleState.syncPending)return;
  const a=battleActions().find(x=>x.id===(actionId||battleState.actionId));if(!a||a.unavailable)return;
  if(battleState.actionId!==a.id){battleClear();battleState.actionId=a.id}
  if(a.actionId==='action_witch_save'){
    const intel=playSceneRuntime.nightIntel;
    const legal=intel?.ok&&!intel.packDisabled?(intel.attacked||[]).some(x=>String(x.to)===String(id)):false;
    if(!legal){playFlashError('Bình Cứu chỉ áp dụng cho người bị Sói Cắn cuối cùng.');return}
  }
  const m=battleMember(id);
  if(!battleRules()?.targetAllowed(a,m,playPlayerEffect(id),playSceneRuntime.activeEffects,playSceneState.night)){playFlashError('Mục tiêu không hợp lệ cho chức năng này.');return}
  id=String(id);const i=battleState.targets.indexOf(id);
  if(i>=0)battleState.targets.splice(i,1);
  else if(battleState.targets.length<a.targetCount)battleState.targets.push(id);
  else if(a.targetCount===1)battleState.targets=[id];
  else{playFlashError('Tối đa '+a.targetCount+' mục tiêu.');return}
  renderPlayBattle()
}
function battlePickTargetWithAudio(id,actionId){
  const action=battleActions().find(a=>a.id===(actionId||battleState.actionId));
  if(!action||!id)return false;
  const target=String(id),already=battleState.targets.includes(target);
  battlePickTarget(target,action.id);
  const selected=!already&&battleState.targets.includes(target);
  if(selected)void battlePlayConfiguredAudio('actions',action.actionId,action.name);
  return selected;
}
// GM-only procession around the campfire. Single GPU transform per trip; no new frame loop.
function gmwwFireWalkDestination(x,y,cx,cy,width,height,used=[]){
  // One SCREEN-SPACE radius for all directions; the old rx/ry ellipse and
  // per-point clamping left the upper actors visibly farther from the fire.
  // Fit the whole circle inside the court instead of clamping single points.
  const edge=Math.min(cx-37,width-cx-37,cy-56,height-cy-56);
  const radius=Math.min(88,Math.max(80,width*.23),Math.max(80,height*.13),edge);
  if(!Number.isFinite(radius)||radius<74)return null; // never place inside flames
  let best=Infinity,chosen=null;
  const sourceAngle=Math.atan2(y-cy,x-cx);
  for(let i=0;i<24;i++){
    const angle=2*Math.PI*i/24;
    const px=cx+Math.cos(angle)*radius,py=cy+Math.sin(angle)*radius;
    const closest=used.reduce((v,p)=>Math.min(v,Math.hypot(px-p.x,py-p.y)),Infinity);
    const delta=Math.atan2(Math.sin(angle-sourceAngle),Math.cos(angle-sourceAngle));
    const score=Math.abs(delta)*42+Math.hypot(px-x,py-y)*.04+(closest<40?1000:0);
    if(score<best){best=score;chosen={x:px,y:py}}
  }
  return chosen;
}
function gmwwFireWalkRig(token,member,phase){
  if(!member)return;
  playUpdateCharacterRig(token.querySelector('.play-player-avatar'),member,{
    effect:playPlayerEffect(member.loginId),battleTurnTravel:phase,
    battleTurnFacing:token.dataset.gmwwFireFacing||'right'
  });
}
function gmwwFireWalkCancel(token,member){
  if(!token)return;
  token.gmwwFireAnimation?.cancel();token.gmwwFireAnimation=null;
  token.dataset.gmwwFireWalk='';delete token.dataset.gmwwFireFacing;
  delete token.dataset.gmwwFireRestFacing;
  delete token.dataset.gmwwFireDx;delete token.dataset.gmwwFireDy;
  delete token.dataset.gmwwFireX;delete token.dataset.gmwwFireY;
  // translate is an independent CSS transform layer; preserve all theme/seat
  // transforms (including immersive -100% anchor and .is-active scale).
  token.style.removeProperty('translate');
  token.style.removeProperty('will-change');
  token.style.removeProperty('z-index');
  token.classList.remove('is-gm-walking-fire');
  if(member)gmwwFireWalkRig(token,member,'');
}
function gmwwFireWalkDetach(){
  document.getElementById('playPlayerRing')?.querySelectorAll('[data-gmww-fire-walk]')?.forEach(el=>gmwwFireWalkCancel(el));
}
function gmwwFireWalkTravel(token,member,phase,dx,dy,ms){
  // The old transform animation fought #start .play-player-token and therefore
  // only flipped the avatar on an iPhone. Animate CSS "translate" instead.
  const current=getComputedStyle(token).translate;
  const from=current&&current!=='none'?current:'0px 0px';
  token.gmwwFireAnimation?.cancel();
  const target=phase==='back'?'0px 0px':
    dx.toFixed(2)+'px '+dy.toFixed(2)+'px';
  token.dataset.gmwwFireWalk=phase;
  token.dataset.gmwwFireFacing=dx<0?'left':'right';
  token.style.zIndex='145';
  token.classList.add('is-gm-walking-fire');
  gmwwFireWalkRig(token,member,phase);
  const finish=()=>{
    if(!token.isConnected||token.dataset.gmwwFireWalk!==phase)return;
    // Set the final actual position before canceling fill:forwards.
    token.style.translate=target;
    token.gmwwFireAnimation?.cancel();token.gmwwFireAnimation=null;
    if(phase==='back')gmwwFireWalkCancel(token,member);
    else{
      token.dataset.gmwwFireWalk='hold';
      token.dataset.gmwwFireFacing=token.dataset.gmwwFireRestFacing||token.dataset.gmwwFireFacing;
      gmwwFireWalkRig(token,member,'hold');
    }
  };
  // iPhone Safari supports WAAPI on individual CSS translate; if another
  // renderer lacks it, update DOM position immediately rather than only face.
  const supported=typeof token.animate==='function'&&
    (typeof CSS==='undefined'||typeof CSS.supports!=='function'||CSS.supports('translate','1px 1px'));
  if(!supported){token.style.translate=target;finish();return}
  const a=token.animate([{translate:from},{translate:target}],{
    duration:ms,easing:phase==='back'?'ease-in':'ease-out',fill:'forwards'
  });
  token.gmwwFireAnimation=a;
  a.finished.then(()=>{if(token.gmwwFireAnimation===a)finish()}).catch(()=>{});
}
function gmwwFireWalkSync(ring,actors,active){
  const tokens=[...ring.querySelectorAll('[data-play-player-id]')];
  const r=ring.getBoundingClientRect();if(!r.width||!r.height)return;
  const f=document.querySelector('#playWorld .play-core-pearl')?.getBoundingClientRect();
  const cx=f?.width?f.left+f.width/2-r.left:r.width*.5;
  const cy=f?.height?f.top+f.height/2-r.top:r.height*.46;
  const used=[];
  // First reserve destinations of already arrived actors so heartbeats cannot cause collisions.
  for(const el of tokens)if(['out','hold'].includes(el.dataset.gmwwFireWalk)&&actors.has(el.dataset.playPlayerId))
    used.push({x:Number(el.dataset.gmwwFireX),y:Number(el.dataset.gmwwFireY)});
  for(const el of tokens){
    const id=String(el.dataset.playPlayerId||''),member=battleMember(id),phase=el.dataset.gmwwFireWalk||'';
    const permitted=active&&actors.has(id)&&member&&!['dead','frozen','expelled'].includes(playPlayerEffect(id));
    if(!permitted){
      if(phase==='back'&&(!member||['dead','frozen','expelled'].includes(playPlayerEffect(id))))gmwwFireWalkCancel(el,member);
      if(phase==='out'||phase==='hold'){
        if(!member||['dead','frozen','expelled'].includes(playPlayerEffect(id))){gmwwFireWalkCancel(el,member);continue}
        const dx=Number(el.dataset.gmwwFireDx)||0,dy=Number(el.dataset.gmwwFireDy)||0;
        gmwwFireWalkTravel(el,member,'back',-dx,-dy,Math.max(350,Math.min(1700,Math.hypot(dx,dy)/.22)));
      }
      continue;
    }
    if(phase==='out'||phase==='hold')continue;
    const x=Number.parseFloat(el.style.left)*r.width/100,y=Number.parseFloat(el.style.top)*r.height/100;
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    const p=gmwwFireWalkDestination(x,y,cx,cy,r.width,r.height,used);if(!p)continue;
    used.push(p);
    const dx=p.x-x,dy=p.y-y,distance=Math.hypot(dx,dy);if(distance<5)continue;
    el.dataset.gmwwFireDx=String(dx);el.dataset.gmwwFireDy=String(dy);
    el.dataset.gmwwFireX=String(p.x);el.dataset.gmwwFireY=String(p.y);
    el.dataset.gmwwFireRestFacing=p.x>cx?'left':'right';
    gmwwFireWalkTravel(el,member,'out',dx,dy,Math.max(440,Math.min(2200,distance/.14)));
  }
}
function battleMarkPlayers(){
  const ring=document.getElementById('playPlayerRing');if(!ring)return;
  if(battleState.impacts.size)battleState.impacts.clear();
  const t=battleTurn(),actorIds=[...(t?.recognitionIds||t?.loginIds||[t?.loginId]).filter(Boolean),...(Array.isArray(t?.roles)?t.roles.flatMap(r=>r?.loginIds||[r?.loginId]).filter(Boolean):[]),...(Array.isArray(t?.actions)?t.actions.map(x=>x.loginId).filter(Boolean):[])];
  // During the day, a chosen action identifies the actor without making all day roles fly.
  const dayActorIds=playSceneState.phase==='day'?(battleAction()?.actorIds||[]):[];
  const actors=new Set([...actorIds,...dayActorIds].map(id=>String(id).replace(/^member:/,''))),now=Date.now();
  const motionOn=playSceneState.step==='battle'&&battleMotionOn()&&document.visibilityState!=='hidden'&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const witchAwake=playSceneState.phase==='night'&&
    (t?.roleId==='role_witch'||(t?.roles||[]).some(row=>row.roleId==='role_witch'));
  const intel=playSceneRuntime.nightIntel;
  const biteTargets=witchAwake&&intel?.ok&&!intel.packDisabled?
    (intel.attacked||[]).map(row=>String(row?.to||'').replace(/^member:/,'')).filter(Boolean):[];
  const chosen=new Set([...(battleState.targets.length?battleState.targets:(demoVisualCurrent()?.targetIds||[])),...biteTargets]);
  ring.querySelectorAll('[data-play-player-id]').forEach(el=>{
    const id=String(el.dataset.playPlayerId||'');
    el.classList.toggle('is-battle-actor',playSceneState.step==='battle'&&playSceneState.phase==='night'&&actors.has(id));
    el.classList.toggle('is-battle-target',playSceneState.step==='battle'&&chosen.has(id));
    const actorOn=el.classList.contains('is-battle-actor'),targetOn=el.classList.contains('is-battle-target'),avatar=el.querySelector('.play-player-avatar');
    const effect=playPlayerEffect(id),canAnimate=motionOn&&!['dead','expelled','frozen'].includes(effect);
    const runTarget=canAnimate&&targetOn&&!actors.has(id);
    el.classList.toggle('is-gm-target-running',runTarget);
    // Update only on state transitions; a heartbeat must not reset animated rigs.
    if(avatar&&el.dataset.gmwwMotionRun!==String(runTarget)){
      el.dataset.gmwwMotionRun=String(runTarget);
      const member=battleMember(id);
      if(member)playUpdateCharacterRig(avatar,member,{effect,battleTargetRunning:runTarget});
    }
    // Battle labels live at the very top of the existing status/name/role stack.
    // Absolute-positioned labels obscured player names on smaller iPhones.
    const labels=el.querySelector('.play-player-over');
    let mark=labels?.querySelector(':scope>.battle-turn-mark')||el.querySelector(':scope>.battle-turn-mark');
    if(actorOn&&labels){
      if(!mark){mark=document.createElement('span');mark.className='battle-turn-mark';mark.setAttribute('aria-hidden','true');mark.textContent='★ ĐẾN LƯỢT'}
      if(labels.firstElementChild!==mark)labels.prepend(mark);
    }else mark?.remove();
    let targetMark=labels?.querySelector(':scope>.battle-target-mark');
    if(targetOn&&labels){
      if(!targetMark){targetMark=document.createElement('span');targetMark.className='battle-target-mark';targetMark.setAttribute('aria-hidden','true');targetMark.textContent='MỤC TIÊU'}
      if(actorOn&&mark?.parentElement===labels)mark.after(targetMark);
      else if(labels.firstElementChild!==targetMark)labels.prepend(targetMark);
    }else targetMark?.remove();
    // GM sees the same public vote above the character as every Player Web client.
    const vote=playSceneState.phase==='day'?playSceneRuntime.gallows?.votes?.[id]:null;
    let voteMark=labels?.querySelector(':scope>.battle-gallows-vote-mark');
    if((vote==='👍'||vote==='👎')&&labels){
      if(!voteMark){voteMark=document.createElement('span');voteMark.className='battle-gallows-vote-mark';voteMark.setAttribute('aria-label','Phiếu Lên Giàn')}
      if(voteMark.textContent!==vote)voteMark.textContent=vote;
      if(labels.firstElementChild!==voteMark)labels.prepend(voteMark);
    }else voteMark?.remove();
    // Server-verified public nominations: ornamental pearl number above each Character.
    const tally=playSceneState.phase==='day'&&['nominating','selecting','voting','closed'].includes(String(playSceneRuntime.gallows?.stage||''))?
      (playSceneRuntime.gallows?.nominationTotals||[]).find(x=>String(x.loginId)===id):null;
    const count=Math.max(0,Math.trunc(Number(tally?.votes)||0));
    let countMark=labels?.querySelector(':scope>.battle-nomination-pearl');
    if(count>0&&labels){
      if(!countMark){countMark=document.createElement('span');countMark.className='battle-nomination-pearl';
        countMark.setAttribute('aria-label','Số phiếu đề cử')}
      countMark.textContent=String(count);
      countMark.title='Được đề cử '+count+' phiếu';
      if(labels.firstElementChild!==countMark)labels.prepend(countMark);
    }else countMark?.remove();
    let orb=avatar?.querySelector(':scope>.battle-orbit');
    if(avatar&&(actorOn||targetOn)){const kind=actorOn?'actor':'target',count=kind==='actor'?6:5;if(!orb){orb=document.createElement('span');orb.className='battle-orbit';orb.setAttribute('aria-hidden','true');avatar.appendChild(orb)}if(orb.dataset.kind!==kind){orb.dataset.kind=kind;orb.replaceChildren(...Array.from({length:count},(_,k)=>{const i=document.createElement('i');i.style.setProperty('--b',(k*360/count).toFixed(1)+'deg');return i}))}}
    else orb?.remove();
    for(const type of ['dead','frozen','expelled','revive','effect_notice','wolf-bite','shield','swap','seer'])el.classList.remove('battle-impact-'+type);
  });
  gmwwFireWalkSync(ring,actors,motionOn&&!battleState.gmwwWalkExpired);
  for(const [id,x] of battleState.impacts)if(x.until<=now)battleState.impacts.delete(id)
}

function battleGallowsTick(){
  const g=playSceneRuntime.gallows,clock=document.getElementById('battleGallowsClock');
  if(!clock||playSceneState.phase!=='day')return;
  const now=Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0);
  const remain=(deadline,duration,running)=>{
    const sec=running?Math.max(0,Math.ceil((Number(deadline||0)-now)/1000)):Math.max(0,Number(duration)||60);
    return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  };
  const stage=String(g?.stage||'ready');
  const nom=['ready','nominating'].includes(stage)?
    remain(g?.nominationDeadlineAt,g?.nominationDurationSec,stage==='nominating'):'00:00';
  const vote=['ready','nominating','selecting','voting'].includes(stage)?
    remain(g?.deadlineAt,g?.voteDurationSec,stage==='voting'):'00:00';
  clock.textContent=stage==='nominating'?nom:stage==='voting'?vote:
    remain(null,stage==='selecting'||stage==='closed'?g?.voteDurationSec:g?.nominationDurationSec,false);
  if(g&&((stage==='nominating'&&now>=Number(g.nominationDeadlineAt||Infinity))||
     (stage==='voting'&&now>=Number(g.deadlineAt||Infinity)))&&!battleState.gallowsClosedShown){
    battleState.gallowsClosedShown=true;battleGallowsRender('day');
  }
}

let battleVerdictTimer=null;
async function battleGallowsAcceptVerdict(expected){
  if(expected!==battleState.gallowsVerdictKey||battleState.gallowsVerdictAcknowledged||
     battleState.gallowsVerdictAckPending)return;
  if(playSceneState.step!=='battle'||playSceneState.phase!=='day')return;
  battleState.gallowsVerdictAckPending=true;
  try{
    const done=await playRoomApi('/gallows',{method:'POST',body:JSON.stringify({command:'acknowledge'})});
    if(done?.ok!==true)throw Error(done?.message||done?.error||'Server chưa xác nhận phán quyết.');
    battleState.gallowsVerdictAcknowledged=true;
    const notice=document.getElementById('battleGallowsVerdict');if(notice)notice.hidden=true;
    if(battleVerdictTimer){clearTimeout(battleVerdictTimer);battleVerdictTimer=null}
    if(playSceneRuntime.winProposal)void openPlayCompletionSheet();
    else void advancePlayPhase();
  }catch(e){playFlashError('Phán quyết Lên Giàn: '+String(e.message||e))}
  finally{battleState.gallowsVerdictAckPending=false}
}
function battleRenderGallowsVerdict(g,stage,phase){
  const notice=document.getElementById('battleGallowsVerdict');
  if(!notice)return;
  if(phase!=='day'||stage!=='resolved'||!['dead','alive','no_lynch'].includes(g?.outcome)){
    notice.hidden=true;return;
  }
  const key=[playSceneRuntime.room?.matchId,playSceneState.night,g.id,g.resolvedAt||g.updatedAt||''].join(':');
  if(battleState.gallowsVerdictKey!==key){
    battleState.gallowsVerdictKey=key;battleState.gallowsVerdictAcknowledged=false;
    if(battleVerdictTimer)clearTimeout(battleVerdictTimer);
    // Timestamp belongs to the Server ballot: reconnect cannot restart 30s.
    const start=Number(g.resolvedAt||Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0));
    const elapsed=Math.max(0,Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0)-start);
    battleVerdictTimer=setTimeout(()=>battleGallowsAcceptVerdict(key),Math.max(0,30000-elapsed));
    const noLynch=g.outcome==='no_lynch';
    const name=noLynch?'Không ai lên giàn':(battleMember(g.candidateId)?.displayName||g.candidateId);
    const cue=g.outcome==='dead'?'audio_system_gallows_result_dead':'audio_system_gallows_result_saved';
    if(noLynch)battleQueueDayAudio([['audio_system_gallows_nomination_result','Hòa phiếu đề cử: hôm nay không ai lên giàn']]);
    else if(g.mode==='auto'){
      const save=Number(g.voteTotals?.save||0),kill=Number(g.voteTotals?.kill||0);
      battleQueueDayAudio([
        ['audio_system_gallows_vote_result','Kết quả bỏ phiếu'],
        ['__tts__','Kết quả phiếu: '+save+' cứu, '+kill+' giết'],
        [cue,name+(g.outcome==='dead'?' chết':' sống')]
      ]);
    }else battleQueueDayAudio([[cue,name+(g.outcome==='dead'?' chết':' sống')]]);
  }
  notice.hidden=!!battleState.gallowsVerdictAcknowledged;
  notice.dataset.outcome=g.outcome;
  const name=g.outcome==='no_lynch'?'Không có người lên giàn':(battleMember(g.candidateId)?.displayName||String(g.candidateId));
  const who=notice.querySelector('[data-verdict-player]'),result=notice.querySelector('[data-verdict-outcome]'),
    votes=notice.querySelector('[data-verdict-votes]');
  if(who)who.textContent=name;
  if(result)result.textContent=g.outcome==='no_lynch'?'HÒA PHIẾU · KHÔNG TREO':g.outcome==='dead'?'ĐÃ CHẾT':'ĐƯỢC SỐNG';
  if(votes)votes.textContent='👍 '+Number(g.voteTotals?.save||0)+' cứu · 👎 '+Number(g.voteTotals?.kill||0)+' giết';
}
function battleGallowsRender(phase){
  const panel=document.getElementById('battleGallowsPanel');if(!panel)return;
  const g=playSceneRuntime.gallows||{stage:'ready',mode:'auto',nominationDurationSec:60,voteDurationSec:60,
    nominations:{},votes:{},blockedNomination:[],blockedVotes:[]};
  const now=Date.now()+Number(playSceneRuntime.serverClockOffsetMs||0),
    stage=g.stage==='nominating'&&now>=Number(g.nominationDeadlineAt||Infinity)?'selecting':
      g.stage==='voting'&&now>=Number(g.deadlineAt||Infinity)?'closed':g.stage||'ready';
  const key=[playSceneRuntime.room?.matchId,playSceneState.night,g.candidateId,stage].join(':');
  // Server DEMO advances ballots without invoking the GM button handlers.
  // Emit open/nomination/vote cues on the authoritative stage once, also in DEMO.
  if(phase==='day'&&['nominating','voting'].includes(stage)){
    const cueKey=[playSceneRuntime.room?.matchId,playSceneState.night,g.id,stage].join(':');
    if(battleState.gallowsStageAudioKey!==cueKey){
      battleState.gallowsStageAudioKey=cueKey;
      battleQueueDayAudio(stage==='nominating'?
        [['audio_system_gallows_day_long','Ngày dài rồi'],
         ['audio_system_gallows_open_nomination','Mở đề cử']]:
        [['audio_system_gallows_open_vote','Mở bỏ phiếu']]);
    }
  }
  if(phase==='day'&&['closed','resolved'].includes(stage)&&battleState.gallowsShowKey!==key){
    battleState.gallowsShowKey=key;battleState.gallowsOpen=true;
  }
  battleRenderGallowsVerdict(g,stage,phase);
  battleRenderFactionStats();
  panel.hidden=phase!=='day'||!battleState.gallowsOpen;
  if(panel.hidden)return;
  const eligibleIds=new Set(Array.isArray(g.eligible)?g.eligible.map(String):[]);
  const members=playLiveMembers().filter(p=>p?.loginId&&(eligibleIds.size?eligibleIds.has(String(p.loginId)):
    playPlayerEffect(p.loginId)!=='dead'&&playPlayerEffect(p.loginId)!=='expelled'));
  const memberName=id=>battleMember(id)?.displayName||String(id||'');
  const mode=g.mode==='gm'?'gm':'auto';
  const nomBans=new Set(g.blockedNomination||[]),voteBans=new Set(g.blockedVotes||g.blocked||[]),
    artifactBans=new Set(g.artifactVoteBans||[]);
  const rosterStats=new Map((g.rosterStats||[]).map(row=>[String(row.id),row]));
  const nomEligible=(g.eligible||members.map(m=>m.loginId)).filter(id=>!nomBans.has(id)).length;
  const voteEligible=Number(g.voteTotals?.eligible??(g.eligible||members.map(m=>m.loginId)).filter(id=>!voteBans.has(id)).length);
  const nominationTallies=Array.isArray(g.nominationTotals)?g.nominationTotals:[],
    nomineeCount=new Map(nominationTallies.map(x=>[String(x.loginId),Number(x.votes)||0]));
  const ordered=[...members].sort((a,b)=>
    Number(rosterStats.get(b.loginId)?.nominations??nomineeCount.get(b.loginId)??0)-
    Number(rosterStats.get(a.loginId)?.nominations??nomineeCount.get(a.loginId)??0)||
    String(a.displayName||a.loginId).localeCompare(String(b.displayName||b.loginId),'vi'));
  const roster=document.getElementById('battleGallowsMembers');
  if(roster){
    const top=roster.scrollTop,left=roster.closest('.gallows-roster-scroll')?.scrollLeft||0;
    roster.innerHTML=ordered.map((m,index)=>{
      const id=playEsc(m.loginId),name=playEsc(m.displayName||m.loginId),
        stats=rosterStats.get(String(m.loginId))||{},
        count=Number(stats.nominations??nomineeCount.get(m.loginId)??0),
        nom=nomBans.has(m.loginId),vote=voteBans.has(m.loginId),
        picked=String(g.candidateId||'')===String(m.loginId);
      return '<div class="battle-gallows-member'+(picked?' is-selected':'')+'" role="listitem">'+
        '<span class="gallows-rank">'+(index+1)+'</span>'+
        '<button type="button" class="gallows-name" data-gallows-pick="'+id+'" '+
        (mode!=='gm'||stage==='resolved'||battleState.gallowsBusy?'disabled ':'')+
        'aria-pressed="'+picked+'" title="GM chọn người lên giàn">'+name+(picked?' ⚖️':'')+'</button>'+
        '<span class="gallows-count">'+count+'/'+nomEligible+'</span>'+
        '<button type="button" data-gallows-kind="nomination" data-gallows-id="'+id+'" aria-label="'+(nom?'Bỏ cấm chọn ':'Cấm chọn ')+name+'" aria-pressed="'+nom+'" '+
        (stage==='resolved'||battleState.gallowsBusy?'disabled ':'')+'>'+(nom?'✓ CẤM':'CẤM')+'</button>'+
        '<button type="button" data-gallows-kind="vote" data-gallows-id="'+id+'" aria-label="'+(vote?'Bỏ cấm vote ':'Cấm vote ')+name+'" aria-pressed="'+vote+'" '+
        (stage==='resolved'||battleState.gallowsBusy||artifactBans.has(m.loginId)?'disabled ':'')+
        ' title="'+(artifactBans.has(m.loginId)?'Artifact cấm Vote':'GM cấm Vote')+'">'+
        (artifactBans.has(m.loginId)?'🎴 CẤM':vote?'✓ CẤM':'CẤM')+'</button></div>';
    }).join('');
    roster.scrollTop=top;const scroll=roster.closest('.gallows-roster-scroll');if(scroll)scroll.scrollLeft=left;
  }
  const countNote=document.getElementById('battleGallowsBansCount');
  if(countNote)countNote.textContent='('+members.length+' người · '+nomBans.size+' cấm chọn · '+voteBans.size+' cấm vote)';
  const modeToggle=document.getElementById('battleGallowsModeToggle'),
    modeSummary=document.getElementById('battleGallowsModeSummary');
  if(modeSummary)modeSummary.textContent=(mode==='auto'?'TỰ ĐỘNG':'THỦ CÔNG')+' ⇄';
  if(modeToggle){modeToggle.dataset.gallowsMode=mode==='auto'?'gm':'auto';
    modeToggle.disabled=battleState.gallowsBusy||stage==='resolved';
    modeToggle.setAttribute('aria-pressed',String(mode==='gm'));
  }
  const automatic=document.getElementById('battleGallowsAutomatic');
  const manual=document.getElementById('battleGallowsManualConclusion');
  if(automatic)automatic.hidden=mode!=='auto';
  if(manual)manual.hidden=mode!=='gm';
  // One configured timer is shared by nomination and vote, each stage has its own deadline.
  const secondsInput=document.getElementById('battleGallowsSeconds');
  const duration=Number((['selecting','voting','closed'].includes(stage)?g.voteDurationSec:g.nominationDurationSec)||60);
  if(secondsInput&&document.activeElement!==secondsInput&&Number(secondsInput.value)!==duration)
    secondsInput.value=String(duration);
  if(secondsInput)secondsInput.disabled=battleState.gallowsBusy||mode!=='auto'||stage!=='ready';
  const select=document.getElementById('battleGallowsCandidate');
  const leaders=nominationTallies.filter(t=>Number(t.votes)>0);
  const unique=leaders.length&&(!leaders[1]||Number(leaders[0].votes)>Number(leaders[1].votes))?String(leaders[0].loginId):'';
  const chooser=document.getElementById('battleGallowsCandidateControl');
  if(chooser)chooser.hidden=mode!=='auto'||stage!=='selecting'||!!unique;
  if(select){
    const prev=select.value||'',topVotes=Number(leaders[0]?.votes||0),
      allowed=topVotes>0?ordered.filter(m=>Number(rosterStats.get(m.loginId)?.nominations??nomineeCount.get(m.loginId)??0)===topVotes):ordered,
      options='<option value="">— Chọn khi hòa / chưa có phiếu —</option>'+
      allowed.map(m=>'<option value="'+playEsc(m.loginId)+'">'+playEsc(m.displayName||m.loginId)+'</option>').join('');
    if(select.innerHTML!==options)select.innerHTML=options;
    select.value=allowed.some(m=>m.loginId===prev)?prev:'';
    select.disabled=battleState.gallowsBusy||stage==='resolved';
  }
  // Counts are Server receipts, updated on every gallows_updated WebSocket event.
  const chosen=Object.keys(g.nominations||{}).filter(id=>!nomBans.has(id)).length;
  const selectedCount=document.getElementById('battleGallowsSelectedCount');
  const votedCount=document.getElementById('battleGallowsVotedCount');
  if(selectedCount)selectedCount.textContent=chosen+'/'+nomEligible;
  if(votedCount)votedCount.textContent=Number(g.voteTotals?.cast||0)+'/'+voteEligible;
  const nominationDetails=document.getElementById('battleGallowsNominations');
  if(nominationDetails)nominationDetails.innerHTML=Object.entries(g.nominations||{})
    .filter(([id])=>!nomBans.has(id))
    .map(([id,target])=>'<div class="battle-gallows-vote"><strong>'+playEsc(memberName(id))+
      '</strong><span>→ '+playEsc(memberName(target))+'</span></div>').join('')||
      '<small>Chưa có đề cử.</small>';
  const stageText=document.getElementById('battleGallowsStage');
  if(stageText)stageText.textContent=stage==='ready'?(mode==='gm'?'Chọn người trên danh sách rồi chốt Sống / Chết.':'Sẵn sàng mở đề cử.') :
    stage==='nominating'?'Đang nhận đề cử từ Player Web.':
    stage==='selecting'?'Đã khóa đề cử; người dẫn đầu duy nhất chờ mở bỏ phiếu.':
    stage==='voting'?'Đang nhận phiếu Cứu / Giết từ Player Web.':
    stage==='closed'?'Đã chốt phiếu; đang chờ Server công bố kết quả.':
    'Kết quả đã được chốt.';
  const info=document.getElementById('battleGallowsInfo');
  if(info){
    const candidate=String(g.candidateId||unique||''),n=Number(rosterStats.get(candidate)?.nominations||nomineeCount.get(candidate)||0),
      v=g.voteTotals||{},yes=Number(v.save||0),no=Number(v.kill||0);
    info.textContent=!candidate?(g.outcome==='no_lynch'?'HÒA PHIẾU ĐỀ CỬ · HÔM NAY KHÔNG AI LÊN GIÀN':'CHƯA CÓ NGƯỜI LÊN GIÀN'):
      '⚖️ '+memberName(candidate)+' · '+n+'/'+nomEligible+' đề cử · 👍 '+yes+'/'+voteEligible+
      ' CỨU · 👎 '+no+'/'+voteEligible+' GIẾT'+
      (stage==='resolved'?' · KẾT LUẬN: '+(g.outcome==='dead'?'CHẾT':'SỐNG'):'');
    info.dataset.resultTone=stage==='resolved'?(g.outcome==='dead'?'negative':'positive'):'neutral';
  }
  const votes=document.getElementById('battleGallowsVotes');
  if(votes){
    const selected=Object.entries(g.votes||{}).filter(([id])=>!voteBans.has(id));
    votes.innerHTML=selected.map(([id,value])=>'<div class="battle-gallows-vote"><strong>'+
      playEsc(memberName(id))+'</strong> '+playEsc(value)+'</div>').join('')||
      '<small>Chưa có phiếu.</small>';
  }
  const result=document.getElementById('battleGallowsResult');
  if(result){
    result.hidden=stage!=='resolved';
    if(!result.hidden){
      result.textContent=g.outcome==='no_lynch'?'Đề cử hòa phiếu · hôm nay không ai lên giàn.':
        memberName(g.candidateId)+(g.outcome==='dead'?' đã bị giết.':' được sống.')+
        ' · 👍 CỨU '+Number(g.voteTotals?.save||0)+' · 👎 GIẾT '+Number(g.voteTotals?.kill||0);
      result.dataset.resultTone=g.outcome==='dead'?'negative':'positive';
      // Final verdict audio is emitted once by battleRenderGallowsVerdict,
      // even when this optional details panel is collapsed.
    }
  }
  for(const button of panel.querySelectorAll('[data-gallows-command]')){
    const command=button.dataset.gallowsCommand;
    const ready=stage==='ready',selecting=stage==='selecting',nominating=stage==='nominating',
      voting=stage==='voting';
    button.disabled=battleState.gallowsBusy||
      (command==='open'&&(!ready||mode!=='auto'))||
      (command==='close_stage'&&(!(nominating||voting)||mode!=='auto'))||
      (command==='begin'&&(!selecting||mode!=='auto'||(!unique&&!select?.value)))||
      (command==='close_vote'&&(!voting||mode!=='auto'))||
      (command==='resolve'&&(mode!=='gm'||stage==='resolved'||!g.candidateId))||
      (command==='restore'&&ready&&!nomBans.size&&!voteBans.size&&!Object.keys(g.nominations||{}).length&&!Object.keys(g.votes||{}).length&&!g.candidateId);
  }
  battleGallowsTick();
}
async function battleGallowsCommand(command,targetId='',outcome='',extras={}){
  if(playSceneState.phase!=='day'||!isLivePlayRoom())return;
  if(battleState.gallowsBusy){
    // Tapping Open while a just-edited input loses focus must not drop the tap.
    if(command!=='set_duration')battleState.gallowsQueuedCommand={command,targetId,outcome,extras};
    return;
  }
  if(command==='resolve'){
    const name=battleMember(targetId)?.displayName||targetId;
    if(!confirm('Xác nhận CHỐT '+(outcome==='dead'?'CHẾT':'SỐNG')+' cho '+name+'?'))return;
  }
  if(command==='restore'&&playSceneRuntime.gallows?.stage==='resolved'&&
     !confirm('Khôi phục kết quả Lên Giàn? Chỉ tác động do Lên Giàn gây ra sẽ được hoàn tác.'))return;
  battleState.gallowsBusy=true;
  // Preserve the focused button through the blur → save → click sequence.
  if(command!=='set_duration')battleGallowsRender('day');
  try{
    const data=await playRoomApi('/gallows',{method:'POST',body:JSON.stringify({command,targetId,outcome,...extras})});
    if(data?.ok!==true)throw Error(data?.error||'Server chưa xác nhận.');
    playSceneRuntime.gallows=data.gallows||null;
    // Only play a cue after the Server confirms the phase transition.
    const cues={
      // Opening and voting cues come from server-confirmed stage observation,
      // shared by GM manual controls and unattended DEMO; never duplicate.
      close_nomination:[['audio_system_gallows_nomination_result','Công bố đề cử']]
    };
    if(cues[command])battleQueueDayAudio(cues[command]);
    if(['resolve','restore','close_vote'].includes(command))gmHapticFeedback();
    battleState.gallowsClosedShown=false;
    await playSyncRoom(true);
  }catch(err){playFlashError('Lên Giàn: '+String(err?.message||err))}
  finally{
    battleState.gallowsBusy=false;
    const queued=battleState.gallowsQueuedCommand;
    battleState.gallowsQueuedCommand=null;
    battleGallowsRender('day');
    if(queued)void battleGallowsCommand(queued.command,queued.targetId,queued.outcome,queued.extras);
  }
}

/* V3.234 — phase-specific night and daytime dock. */
function battleSyncPhaseDock(phase,visible){
  const day=!!visible&&phase==='day',night=!!visible&&phase==='night';
  const shell=document.getElementById('playShell');
  if(shell)shell.dataset.battlePhase=visible?phase:'';
  const slots={playBattleClockFloat:!!visible,battleActionTray:!!visible,
    battleUndoFloat:!!visible,battleDayNoticeFloat:day,battleDayActionFloat:day,
    battleDayGallowsFloat:day,battleFactionStatsFloat:day};
  for(const [id,show] of Object.entries(slots)){
    const el=document.getElementById(id);if(el)el.hidden=!show;
  }
}
function battleSyncGMMenuControls(){
  // V3.238: one visual ON/OFF language, both Setup and Battle.
  // Placement/Exit/End buttons are one-shot commands: do not misrepresent them as persistent switches.
  const on=(id,value,label)=>{const el=document.getElementById(id);if(!el)return;
    el.setAttribute('aria-pressed',String(!!value));el.setAttribute('aria-label',label+': '+(value?'Bật':'Tắt'));
    el.classList.toggle('is-off',!value);
  };
  on('battleGMChromeToggle',!gmwwPlayChromeHidden,'Menu');
  on('battleLabelArtifact',gmLabelVisibility.artifact,'Artifact');
  on('battleLabelRole',gmLabelVisibility.role,'Vai Trò');
  on('battleLabelPlayer',gmLabelVisibility.player,'Người Chơi');
  on('battleShowDead',gmLabelVisibility.dead,'Người Chết');
  on('battleGMActionIcons',battleIconOn(),'iCon');
  on('battleGMTurnMotion',battleMotionOn(),'Đi bộ');
  on('battleGMAudio',!playAudioMuted(),'Audio');
  on('battleGMHaptic',gmHapticEnabled(),'Rung');
  on('battleGMAuto',!!playSceneState.autoGM,'Auto GM');
  for(const [id,label] of [['battleGMChromeToggle','Menu'],['battleGMTurnMotion','Đi bộ'],['battleGMActionIcons','iCon'],['battleShowDead','Người Chết'],['battleGMAudio','Audio'],['battleGMHaptic','Rung'],['battleGMAuto','Auto GM']]){
    const el=document.getElementById(id);if(el)el.textContent=label;
  }
}

/* GM administrative actions: independent of the role turn and action-icon toggle.
 * GM-authorized Room APIs apply every effect; no private chat data enters public state. */
let gmwwGMAdminPointer=null;
function gmwwGMAdminTargetAt(x,y,type){
  const ring=document.getElementById('playPlayerRing');if(!ring)return null;
  const members=new Set(playLiveMembers().filter(p=>p.loginId).map(p=>String(p.loginId)));
  let best=null,distance=Infinity;
  for(const node of ring.querySelectorAll('[data-play-player-id]')){
    const id=String(node.dataset.playPlayerId||''),status=playPlayerEffect(id);
    if(!members.has(id)||(type==='revive'?status!=='dead':type==='dead'?status==='dead':false))continue;
    const rect=node.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const d=Math.hypot(x-cx,y-cy),limit=Math.max(64,Math.min(112,Math.max(rect.width,rect.height)*1.1));
    if(d<limit&&d<distance){best=node;distance=d}
  }
  return best;
}
function gmwwGMAdminMount(){
  const top=document.getElementById('playBattleTop');if(!top)return;
  let bar=document.getElementById('gmwwGMAdminDock');
  if(!bar){
    bar=document.createElement('div');bar.id='gmwwGMAdminDock';
    bar.setAttribute('role','group');bar.setAttribute('aria-label','Hành động riêng của GM');
    bar.innerHTML='<button type="button" data-gm-admin="dead" aria-label="GM Giết" title="GM • Giết"><img src="/assets/action-icons/v3/15_san_giet.webp" alt=""></button>'+
      '<button type="button" data-gm-admin="revive" aria-label="GM Cứu" title="GM • Cứu / Hồi Sinh"><img src="/assets/action-icons/v3/13_hoi_sinh.webp" alt=""></button>'+
      '<button type="button" data-gm-admin="mute-chat" aria-label="GM Cấm chat" title="GM • Cấm / Mở Chat"><img src="/assets/action-icons/v3/39_cam_noi.webp" alt=""></button>'+ 
      '<button type="button" data-gm-admin="open-chat" aria-label="GM Mở Chat" title="GM • Mở Chat">🦩</button>';
    document.body.appendChild(bar);
    for(const button of bar.querySelectorAll('[data-gm-admin]')){
      try{const saved=JSON.parse(localStorage.getItem('gmww-admin-icon-'+button.dataset.gmAdmin)||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)){button.style.left=Math.max(0,Math.min(window.innerWidth-44,saved.x))+'px';button.style.top=Math.max(0,Math.min(window.innerHeight-44,saved.y))+'px'}}catch{}
    }
    bar.addEventListener('pointerdown',event=>{
      const button=event.target.closest('[data-gm-admin]');
      if(!button||button.disabled||(event.button!==0&&event.pointerType!=='touch'))return;
      gmwwGMAdminPointer={button,id:event.pointerId,type:button.dataset.gmAdmin,
        x:event.clientX,y:event.clientY,moved:false,target:null,ghost:null};
      try{button.setPointerCapture(event.pointerId)}catch{}
      event.preventDefault();event.stopPropagation();
    });
    bar.addEventListener('pointermove',event=>{
      const drag=gmwwGMAdminPointer;if(!drag||drag.id!==event.pointerId)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<8)return;
      drag.moved=true;
      if(!drag.ghost){
        drag.ghost=document.createElement('span');drag.ghost.className='gmww-gm-admin-ghost';
        drag.ghost.innerHTML=drag.button.innerHTML;document.body.appendChild(drag.ghost);
      }
      drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';
      const target=gmwwGMAdminTargetAt(event.clientX,event.clientY,drag.type);
      if(!target){drag.button.style.left=Math.max(0,Math.min(window.innerWidth-44,event.clientX-22))+'px';drag.button.style.top=Math.max(0,Math.min(window.innerHeight-44,event.clientY-22))+'px'}
      if(target!==drag.target){drag.target?.classList.remove('gmww-battle-icon-snap');
        drag.target=target;target?.classList.add('gmww-battle-icon-snap')}
      drag.ghost.classList.toggle('is-sucked',!!target);
      event.preventDefault();
    });
    const finish=event=>{
      const drag=gmwwGMAdminPointer;if(!drag||drag.id!==event.pointerId)return;
      const target=event.type==='pointerup'&&drag.moved?gmwwGMAdminTargetAt(event.clientX,event.clientY,drag.type):null;
      drag.target?.classList.remove('gmww-battle-icon-snap');drag.ghost?.remove();
      gmwwGMAdminPointer=null;
      if(event.type==='pointerup'&&!drag.button.disabled){
        if(drag.moved){if(target&&drag.type!=='open-chat')void battleQuickApply(String(target.dataset.playPlayerId||''),drag.type);else{try{localStorage.setItem('gmww-admin-icon-'+drag.type,JSON.stringify({x:parseFloat(drag.button.style.left),y:parseFloat(drag.button.style.top)}))}catch{}}}
        else if(drag.type==='open-chat')document.getElementById('gmwwGMChatLaunch')?.click();
        else battleQuickSelect(drag.type);
      }
      event.preventDefault();event.stopPropagation();
    };
    bar.addEventListener('pointerup',finish);
    bar.addEventListener('pointercancel',finish);
    bar.addEventListener('click',event=>{
      // Keyboard activation has detail=0. Touch/mouse activation is handled on pointerup.
      if(event.detail!==0)return;
      const button=event.target.closest('[data-gm-admin]');
      if(button&&!button.disabled){if(button.dataset.gmAdmin==='open-chat')document.getElementById('gmwwGMChatLaunch')?.click();else battleQuickSelect(button.dataset.gmAdmin)}
    });
  }
  bar.hidden=playSceneState.step!=='battle';
  for(const b of bar.querySelectorAll('[data-gm-admin]')){
    b.disabled=battleState.busy||battleState.syncPending||playSceneRuntime.busy||!isLivePlayRoom();
    b.setAttribute('aria-pressed',String(battleState.quickType===b.dataset.gmAdmin));
  }
}
function renderPlayBattle(){
  demoSyncScreenAwake();gmwwGMChatMount();
  const top=document.getElementById('playBattleTop'),dock=document.getElementById('playBattleDock');if(!top||!dock)return;
  const visible=playSceneState.step==='battle';top.hidden=!visible;dock.hidden=!visible&&!battleState.wolfOpen;
  gmwwGMAdminMount();
  gmwwSetupFreeBattleIcons();
  battleSyncPhaseDock(playSceneState.phase,visible);
  battleSyncGMMenuControls();
  const campfire=document.querySelector('.play-core-pearl');if(campfire)campfire.setAttribute('aria-label','Đống lửa · Mở/đóng Menu GM');
  if(!visible){
    for(const id of ['battleFactionStatsFloat','battleDayNoticeFloat','battleDayGallowsFloat','battleDemoObserver','battleFactionStats']){
      const node=document.getElementById(id);if(node)node.hidden=true;
    }
    document.getElementById('battleFactionStatsToggle')?.setAttribute('aria-pressed','false');
  }
  if(!visible){document.getElementById('battleFireIconDock')?.setAttribute('hidden','');battleIconClearDrag();const picker=document.getElementById('battleTargetSheet');if(picker)picker.hidden=true;const gallows=document.getElementById('battleGallowsPanel');if(gallows)gallows.hidden=true};if(!visible){const morning=document.getElementById('battleMorningReport');if(morning)morning.hidden=true}
  if(!visible){
    battleRenderDrunkDraw(null);
    gmwwFireWalkDetach();
    battleClear();battleState.key='';battleState.details=false;battleState.clockOpen=false;battleState.quickType='';
    const menu=document.getElementById('battleWolfMenu');
    if(menu){menu.hidden=!battleState.wolfOpen;if(!menu.hidden)requestAnimationFrame(()=>gmwwPlaceWolfMenuAtFire(menu));}
    if(typeof setPlayGameChromeHidden==='function')setPlayGameChromeHidden(gmwwPlayChromeHidden);
    return;
  }
  if(typeof setPlayGameChromeHidden==='function')setPlayGameChromeHidden(gmwwPlayChromeHidden);
  if(!battleRules()){document.getElementById('battleActionBar').textContent='Chưa tải được bộ điều khiển.';return}
  const t=battleTurn(),rt=playSceneRuntime.nightRuntime,phase=playSceneState.phase,night=Math.max(1,Number(playSceneState.night)||1);
  // Visibility of all dock controls follows the current battle phase.
  const key=[playSceneRuntime.room?.matchId||'',phase,night,t?.id||rt?.completed||''].join(':');
  if(battleState.key!==key){battleState.gmwwWalkExpired=false;battleCloseResultPopup();battleState.key=key;battleClear();battleState.quickType='';battleState.details=false;battleState.wolfOpen=false;battleState.clockOpen=false;battleState.timelineSig='';battleState.actionSig='';battleState.dayActionsOpen=false;battleState.dayMenuSig='';battleState.gallowsOpen=false;const actionBar=document.getElementById('battleActionBar');if(actionBar)actionBar.scrollLeft=0;}
  battleGallowsRender(phase);
  battleRenderDrunkDraw(t);
  if(phase==='day')battleMorningShow();else{const morning=document.getElementById('battleMorningReport');if(morning)morning.hidden=true}
  // Do not claim a wake-up cue was played during intermediate Server sync, or
  // while the GM is navigating. The first stable role of EVERY night must speak.
  if(t&&phase==='night'&&!battleConfirmAudioGate&&!battleState.busy&&!playSceneRuntime.busy&&
     !battleState.syncPending&&battleState.lastAudioTurnKey!==key&&
     battleState.audioPendingTurnKey!==key){
    if(t.kind==='village-wakeup'){
      battleState.lastAudioTurnKey=key;battlePlayWakeupAndAdvance(t,key);
    }else battleAudioForTurn(t,true);
  }
  const set=(id,s)=>{const e=document.getElementById(id);if(e)e.textContent=String(s)};
  const steps=battleRules().timeline(phase,rt,night,playSceneRuntime.artifactCycle?.accepted),
    // village-wakeup is an internal Server transition, never a selectable action.
    visibleSteps=steps.map((item,index)=>({...item,displayIndex:index})).filter(x=>x.kind!=='village-wakeup'),
    timeline=document.getElementById('battleTimeline'),
    signature=JSON.stringify(visibleSteps.map(x=>[x.id,x.status,x.active,x.displayNumber]));
  const previous=document.getElementById('battleBack');
  if(previous){previous.disabled=phase!=='night'||!rt?.queue?.length||!Number.isInteger(rt.cursor)||rt.cursor<=0||!!rt.completed;previous.title=previous.disabled?'Không có lượt trước trong đêm hiện tại':'Về lượt trước';const label=previous.querySelector('b');if(label)label.textContent='<Đêm '+night}
  if(timeline&&signature!==battleState.timelineSig){battleState.timelineSig=signature;
    timeline.innerHTML=visibleSteps.map((s,i)=>s.kind==='day'?'<span role="listitem" title="'+playEsc(s.label)+'" class="play-battle-step is-'+playEsc(s.status)+'"><b>'+playEsc(s.label)+'</b></span>':'<button type="button" role="listitem" data-battle-index="'+s.displayIndex+'" '+(s.status==='used'?'disabled ':'')+'title="'+playEsc(s.label)+(s.status==='used'?' (đã sử dụng)':'')+'" aria-current="'+(s.active?'step':'false')+'" class="play-battle-step is-'+playEsc(s.status)+(s.active?' is-active':'')+'"><span class="battle-step-num">'+(s.status==='completed'?'✓':(s.displayNumber??i+1))+'</span><b>'+playEsc(s.label)+'</b></button>').join('');
    const active=timeline.querySelector('.is-active');if(active)requestAnimationFrame(()=>{try{active.scrollIntoView({block:'nearest',inline:'center'})}catch{}})
  }
  const allActions=(phase==='day'||(t&&phase==='night'))?battleActions():[];
  const actions=phase==='day'?allActions.filter(a=>!a.unavailable):allActions,
    bar=document.getElementById('battleActionBar');
  const actionTray=document.getElementById('battleActionTray');
   battleIconDock(actions,phase);battleIconBind();
  if(actionTray)actionTray.hidden=phase==='day';
  const dayToggle=document.getElementById('battleDayActionToggle');
  if(dayToggle){dayToggle.disabled=!actions.length;dayToggle.setAttribute('aria-expanded',String(!!actions.length&&battleState.dayActionsOpen));}
  if(phase==='day'&&!actions.length)battleState.dayActionsOpen=false;
  // Dead actors are informational, not actionable. The GM chooses when to continue.
  const actorIds=[...(t?.loginIds||[]),...(t?.roles||[]).flatMap(r=>r.loginIds||[])];
  const deadActors=actorIds.filter(id=>playPlayerEffect(id)==='dead');
  const deadOnly=phase==='night'&&actorIds.length>0&&deadActors.length===actorIds.length;
  if(bar&&deadOnly){
    bar.innerHTML='<div class="battle-dead-actor" role="status">☠️ ĐÃ CHẾT</div>';
    battleState.actionSig='';
  }
  const visualApi=globalThis.GMWW_STATUS_VISUALS;
  const battleActorEffects=actions.map(a=>{
    const actorIds=new Set(a.actorIds||[]);
    if(t?.kind==='role-group'){
      for(const role of (t.roles||[])){
        if(String(role.roleId||'')===String(a.roleId||'')||(a.roleIds||[]).includes(role.roleId)){
          for(const id of (role.loginIds||[]))actorIds.add(id);
        }
      }
    }else for(const id of (t?.loginIds||[]))actorIds.add(id);
    const ids=visualApi?[...new Set([...actorIds].flatMap(id=>visualApi.resolveRows(playSceneRuntime.activeEffects,id,playNow())))]:[];
    return[a.id,ids];
  });
  const sig=(t?.id||phase)+':'+String(battleUsed(t))+':'+JSON.stringify(actions.map(a=>[a.id,a.name,a.targetCount,a.unavailable,a.actorIds,a.unavailableReason]))+':'+JSON.stringify(battleActorEffects);
  if(bar&&!deadOnly&&sig!==battleState.actionSig){battleState.actionSig=sig;
    bar.innerHTML=actions.length?actions.map(a=>'<button type="button" role="listitem" data-battle-kind="'+(a.artifactId?'artifact':'role')+'" data-battle-action="'+playEsc(a.id)+'" '+((battleActorEffects.find(row=>row[0]===a.id)?.[1]||[]).includes('frozen')?'class="is-actor-frozen" ':'')+((phase!=='day'&&a.noTarget&&!battleIsTransfer(a))||a.unavailable?'disabled ':'')+'title="'+playEsc(a.unavailableReason||a.name)+'">'+(a.unavailable&&/Người thực hiện/.test(a.unavailableReason||'')?'<span class="battle-effect-tag">⛔ '+playEsc(a.unavailableReason.replace(/^Người thực hiện /,'').replace(/\.$/,''))+'</span> ':'')+playEsc(a.name)+(!a.artifactId&&a.targetCount>1?'<small class="battle-target-quota"> '+(battleState.actionId===a.id?battleState.targets.length:0)+'/'+a.targetCount+'</small>':'')+(visualApi?(battleActorEffects.find(row=>row[0]===a.id)?.[1]||[]).length?'<span class="gmww-sv-action-preview gmww-sv-stage" aria-hidden="true"><span class="gmww-sv-action-avatar">✦</span>'+visualApi.overlay((battleActorEffects.find(row=>row[0]===a.id)?.[1]||[]))+'</span><span class="gmww-sv-action-tags">'+(battleActorEffects.find(row=>row[0]===a.id)?.[1]||[]).map(id=>visualApi.byId[id]?.icon+' '+playEsc(visualApi.byId[id]?.name||id)).join(' · ')+'</span>':'':'')+'</button>').join(''):'<span class="battle-empty">'+(t?.kind==='wolf-introduction'?(t.recognitionIds||[]).map(id=>battleMember(id)?.displayName||id).join(' · '):phase==='day'?'':battleUsed(t)?'Artifact đã sử dụng trong đêm — không còn hành động.':t?'Không có hành động cấu hình cho lượt này.':'Chạm Tiếp theo để chuyển giai đoạn.')+'</span>';
  }
  const dayMenu=document.getElementById('battleDayActionMenu'),dayList=document.getElementById('battleDayActionList');
  if(dayMenu)dayMenu.hidden=phase!=='day'||!actions.length||!battleState.dayActionsOpen;
  if(dayList&&phase==='day'&&actions.length){
    const menuSig=JSON.stringify(actions.map(a=>[a.id,a.name,a.actorIds,a.targetCount]));
    if(menuSig!==battleState.dayMenuSig){
      battleState.dayMenuSig=menuSig;
      dayList.innerHTML=actions.map(a=>'<button type="button" role="listitem" data-day-action="'+playEsc(a.id)+'"><span>'+playEsc(a.name)+'</span><small>'+
        playEsc((a.artifactId?'Artifact':'Vai Trò')+' · '+(a.actorIds||[]).map(id=>battleMember(id)?.displayName||id).join(', '))+'</small></button>').join('');
    }
  }
  document.getElementById('battleDayNoticeToggle')?.setAttribute('aria-pressed',String(phase==='day'&&battleState.morningOpen));
  document.getElementById('battleDayGallowsToggle')?.setAttribute('aria-pressed',String(phase==='day'&&battleState.gallowsOpen));
  bar?.querySelectorAll('[data-battle-action]').forEach(x=>x.classList.toggle('is-selected',x.dataset.battleAction===battleState.actionId));
  if(bar&&sig!==bar.dataset.navigationSig){bar.dataset.navigationSig=sig;requestAnimationFrame(battleUpdateActionNavigation)}
  battleRenderTransferPanel();
  set('battleActionTrayTitle',phase==='day'?'HÀNH ĐỘNG':'');
  set('battleTurnType',phase==='day'?'BAN NGÀY':phase==='night'?'ĐÊM '+night+' · '+((t?.kind==='early-artifact'||t?.kind==='early-artifact-window')?'ARTIFACT ĐẦU VÁN':['role','role-group'].includes(t?.kind)?'VAI TRÒ':'LƯỢT CHƠI'):'CHUẨN BỊ TRẬN');
  set('battleTurnTitle',phase==='day'?'NGÀY THỨ '+night:(t?battleRules().displayLabel(t,'Lượt chơi'):(rt?.completed?'ĐÃ KẾT THÚC ĐÊM '+night:'BẮT ĐẦU ĐÊM 1')));
  set('battleTurnProgress',phase==='night'?(Math.min((rt?.cursor||0)+1,rt?.queue?.length||1)+'/'+(rt?.queue?.length||1)):phase==='day'?'THẢO LUẬN':'SẴN SÀNG');
  const action=battleAction(),pending=document.getElementById('battlePending'),roster=document.getElementById('battleRoster'),toggle=document.getElementById('battleRosterToggle');
  if(pending){pending.hidden=!action||!battleState.targets.length||battleState.targetSheet;
    set('battlePendingText',action?action.name+' → '+battleState.targets.map(x=>battleMember(x)?.displayName||x).join(', ')+' ('+battleState.targets.length+'/'+action.targetCount+')':'');
    document.getElementById('battleConfirm').disabled=battleState.busy||battleState.syncPending||!action||battleState.targets.length!==action.targetCount||(action.actionId==='action_assassin_mark'&&!['👍','👎'].includes(battleState.assassinChoice));
  }
  if(roster)roster.hidden=!battleState.roster;
  if(toggle){toggle.textContent=battleState.roster?'▴ Ẩn danh sách':'☷ Chọn thủ công';toggle.setAttribute('aria-expanded',String(battleState.roster))}
  if(battleState.roster){
    const quick=battleState.quickType;
    set('battleRosterCount',quick?(quick==='revive'?'Chọn người đã chết để cứu':quick==='mute-chat'?'Chọn người chơi để cấm hoặc mở chat':'Chọn người đang sống để giết'):action?battleState.targets.length+'/'+action.targetCount+' mục tiêu':'Chọn hành động');
    const list=document.getElementById('battleRosterList');
    if(list)list.innerHTML=playLiveMembers().filter(m=>m.loginId).map(m=>{
      const id=String(m.loginId),status=playPlayerEffect(id),selected=battleState.targets.includes(id);
      const witchAllowed=action?.actionId!=='action_witch_save'||
        (playSceneRuntime.nightIntel?.ok&&!playSceneRuntime.nightIntel?.packDisabled&&
        (playSceneRuntime.nightIntel?.attacked||[]).some(x=>String(x?.to)===id));
      const allowed=quick?(quick==='revive'?status==='dead':quick==='mute-chat'?true:status!=='dead'):
        !!action&&witchAllowed&&battleRules().targetAllowed(action,m,status,playSceneRuntime.activeEffects,playSceneState.night);
      return '<button data-battle-member="'+playEsc(id)+'" '+(!allowed?'disabled ':'')+'class="'+(selected?'selected':'')+'"><span>'+(selected?'✓':'○')+'</span><b>'+playEsc(m.displayName||id)+'</b><span>'+(selected?'×':'')+'</span></button>';
    }).join('');
  }
  const picker=document.getElementById('battleTargetSheet'),pickerTitle=document.getElementById('battleTargetTitle'),pickerText=document.getElementById('battleTargetPrompt'),
    candidates=document.getElementById('battleTargetCandidates'),pickerOK=document.getElementById('battleTargetConfirm'),
    act=battleAction(),targetReady=!!act&&battleState.targets.length===act.targetCount;
  if(picker){picker.hidden=!battleState.targetSheet;picker.classList.toggle('is-confirm-only',!!battleState.targetSheet&&targetReady)}
  if(battleState.targetSheet){
    if(pickerTitle)pickerTitle.textContent=act?act.name.toUpperCase():'CHỌN MỤC TIÊU';
    if(pickerText)pickerText.textContent=targetReady?'':battleState.dragAmbiguous?'Hai người đang quá gần nhau. Hãy chạm đúng TÊN mục tiêu để tránh thả nhầm.':battleState.targets.length?'':'Chọn '+(act?.targetCount||1)+' người chơi có thể nhận hành động';
    if(candidates){
      candidates.hidden=targetReady||(battleState.targetMode==='drag'&&act?.targetCount===1);
      candidates.innerHTML=act?playLiveMembers().filter(m=>m.loginId&&battleRules().targetAllowed(act,m,playPlayerEffect(m.loginId),playSceneRuntime.activeEffects,playSceneState.night)).map(m=>
        '<button type="button" data-battle-candidate="'+playEsc(m.loginId)+'" class="'+(battleState.targets.includes(String(m.loginId))?'is-selected':'')+'">'+(battleState.targets.includes(String(m.loginId))?'✓ ':'○ ')+playEsc(m.displayName||m.loginId)+'</button>').join(''):'';
    }
    const assassinChoices=document.getElementById('battleAssassinChoice');
    if(assassinChoices){assassinChoices.hidden=act?.actionId!=='action_assassin_mark';
      assassinChoices.querySelectorAll('[data-assassin-choice]').forEach(btn=>{btn.setAttribute('aria-pressed',String(btn.dataset.assassinChoice===battleState.assassinChoice));btn.classList.toggle('is-selected',btn.dataset.assassinChoice===battleState.assassinChoice)})}
    if(pickerOK){
      // Only the assassin moves OK beside 👍 and 👎; others use the normal footer.
      const assassin=act?.actionId==='action_assassin_mark';
      const destination=assassin?assassinChoices?.querySelector('div'):picker.querySelector('footer');
      if(destination&&pickerOK.parentElement!==destination)destination.appendChild(pickerOK);
      pickerOK.disabled=battleState.busy||battleState.syncPending||!targetReady||(assassin&&!['👍','👎'].includes(battleState.assassinChoice));
    }
  }
  const undo=document.getElementById('battleUndoButton');
  if(undo){undo.disabled=battleState.busy||battleState.syncPending||battleState.undoBusy||!playSceneRuntime.battleUndo?.token;
    undo.title=playSceneRuntime.battleUndo?.token?'Khôi phục: '+playSceneRuntime.battleUndo.label:'Chưa có hành động để khôi phục';}
  const next=document.getElementById('battleAdvance');
  if(next){
    next.disabled=battleState.busy||playSceneRuntime.busy;
    const title=phase==='night'&&rt?.completed?'Làng ơi dậy đi':phase==='day'?'Đêm tiếp theo':phase==='lobby'?'Bắt đầu Đêm 1':'Tiếp tục';
    next.title=title;next.setAttribute('aria-label',title);const label=next.querySelector('b');if(label)label.textContent='Ngày '+night+'>';
  }
  const wolfMenu=document.getElementById('battleWolfMenu');
  if(wolfMenu){
    wolfMenu.hidden=!battleState.wolfOpen;
    if(!wolfMenu.hidden){
      const gameKey=[playSceneRuntime.room?.matchId||'',phase,night].join(':'),
        fireAnchor=villageFirePosition(),
        anchorKey=[gameKey,villageScenePublished.revision,fireAnchor.join(','),innerWidth,innerHeight].join(':');
      if(wolfMenu.dataset.gmwwSceneKey!==gameKey){
        wolfMenu.dataset.gmwwSceneKey=gameKey;
        wolfMenu.dataset.gmwwDockApplied='';wolfMenu.dataset.gmwwFirePlaced='';delete wolfMenu.dataset.gmwwUserMoved;
      }
      // The GM menu belongs to this Day/Night image's calibrated 🔥.
      // A deliberate GM drag overrides automatic placement for this phase.
      if(wolfMenu.dataset.gmwwUserMoved!=='1'&&wolfMenu.dataset.gmwwFirePlaced!==anchorKey){
        if(gmwwPlaceWolfMenuAtFire(wolfMenu))wolfMenu.dataset.gmwwFirePlaced=anchorKey;
      }
    }
  }
  battleSyncLabelVisibility();
  
  const clockMenu=document.getElementById('battleClockPopover'),clockToggle=document.getElementById('battleClockButton');
  if(clockMenu)clockMenu.hidden=!battleState.clockOpen;
  if(clockToggle){clockToggle.setAttribute('aria-expanded',String(battleState.clockOpen));clockToggle.classList.toggle('is-open',battleState.clockOpen)}
  const details=document.getElementById('battleDetails'),info=document.getElementById('battleInfoToggle');
  if(details)details.hidden=!battleState.details;
  if(info){info.setAttribute('aria-expanded',String(battleState.details));info.classList.toggle('is-on',battleState.details)}
  const auto=document.getElementById('battleGMAuto'),audio=document.getElementById('battleGMAudio');
  if(auto){auto.setAttribute('aria-pressed',String(playSceneState.autoGM));auto.setAttribute('aria-label',playSceneState.autoGM?'Auto GM đang bật':'Auto GM đang tắt');auto.title=playSceneState.autoGM?'Auto GM BẬT':'Auto GM TẮT';auto.classList.toggle('is-off',!playSceneState.autoGM)}
  demoRenderControls();
  for(const overlayId of ['battleDemoObserver','battleMorningReport','battleGallowsPanel','battleDetails']){
    const overlay=document.getElementById(overlayId);
    if(overlay&&!overlay.hidden)gmwwRestoreDock(overlay);
  }
  if(audio){audio.textContent='Audio';audio.setAttribute('aria-pressed',String(!playAudioMuted()));audio.setAttribute('aria-label','Audio: '+(!playAudioMuted()?'Bật':'Tắt'));audio.classList.toggle('is-off',playAudioMuted())}
  const haptic=document.getElementById('battleGMHaptic');if(haptic){haptic.textContent='Rung';haptic.setAttribute('aria-pressed',String(gmHapticEnabled()));haptic.setAttribute('aria-label','Rung: '+(gmHapticEnabled()?'Bật':'Tắt'))}
  for(const [id,type] of [['battleQuickRevive','revive'],['battleQuickKill','dead']]){
    const button=document.getElementById(id);if(button){button.setAttribute('aria-pressed',String(battleState.quickType===type));button.classList.toggle('is-selected',battleState.quickType===type);button.disabled=battleState.busy||playSceneRuntime.busy||(type==='revive'&&!playLiveMembers().some(m=>playPlayerEffect(m.loginId)==='dead'))}
  }
  battleMarkPlayers();battleTickCountdown();
}
async function battleConfirmDay(confirmed=false){
  const a=battleAction();
  if(playSceneState.phase!=='day'||playSceneState.step!=='battle'||!isLivePlayRoom()||
     battleState.busy||battleState.syncPending||!a||a.unavailable||
     battleState.targets.length!==a.targetCount)return;
  const matchId=String(playSceneRuntime.room?.matchId||''),cycleKey=String(playSceneRuntime.room?.cycleKey||''),
    expected=[matchId,'day',Math.max(1,Number(playSceneState.night)||1),battleTurn()?.id||playSceneRuntime.nightRuntime?.completed||''].join(':');
  if(battleState.key!==expected){battleClear();renderPlayBattle();playFlashError('Ngày đã thay đổi. Hãy chọn lại hành động.');return}
  if(!confirmed&&!confirm('Xác nhận '+a.name+' lên '+(battleState.targets.map(id=>battleMember(id)?.displayName||id).join(', ')||'không mục tiêu')+'?'))return;
  battleState.busy=true;
  if(!battleState.nonce)battleState.nonce=globalThis.crypto?.randomUUID?.()||String(Date.now());
  const payload={matchId,cycleKey,actorId:a.actorIds[0]||'',roleId:a.roleId||'',
    artifactId:a.artifactId||'',actionId:a.actionId,targetIds:[...battleState.targets],
    clientEventId:battleState.nonce};
  try{
    const response=await playRoomApi('/day-action',{method:'POST',body:JSON.stringify(payload)});
    if(response?.ok!==true)throw Error(response?.message||response?.error||'Server chưa xác nhận hành động ban ngày.');
    battleState.syncPending=true;
    battleClear();
    const refreshed=await playSyncRoom(true);
    if(!refreshed)throw Error('Đã lưu trên Server nhưng chưa đồng bộ, vui lòng tải lại Phòng.');
    battleState.syncPending=false;
    renderPlayBattle();
    // Day actions do not advance the completed night turn.
    const message=String(response.result?.message||'').trim();
    if(message)battleShowResultPopup('',message,true);
    void battlePlayConfiguredAudio('system','audio_system_confirm','Xác nhận');gmHapticFeedback();
  }catch(err){
    playFlashError('Hành động ban ngày: '+String(err?.message||err));
    battleState.syncPending=false;
  }finally{battleState.busy=false;renderPlayBattle()}
}
async function battleConfirm(confirmed=false){
  if(playSceneState.phase==='day'){await battleConfirmDay(confirmed);return}
  const a=battleAction(),t=battleTurn(),transferAct=!!a&&battleIsTransfer(a);
  if(battleState.busy||battleState.syncPending||!a||a.unavailable||!t||
    (!transferAct&&battleState.targets.length!==a.targetCount)||
    (transferAct&&!['left','none','right'].includes(battleState.transferDir)))return;
  if(a.actionId==='action_assassin_mark'&&!['👍','👎'].includes(battleState.assassinChoice)){playFlashError('Sát Thủ phải chọn 👍 hoặc 👎 trước khi xác nhận.');return}
  const expected=[playSceneRuntime.room?.matchId||'',playSceneState.phase,Math.max(1,Number(playSceneState.night)||1),t.id].join(':');
  if(expected!==battleState.key){playFlashError('Lượt đã thay đổi. Hãy chọn lại mục tiêu.');renderPlayBattle();return}
  if(!confirmed&&!confirm('Xác nhận '+a.name+' lên '+battleState.targets.map(id=>battleMember(id)?.displayName||id).join(', ')+'?'))return;
  battleState.busy=true;if(!battleState.nonce)battleState.nonce=globalThis.crypto?.randomUUID?.()||String(Date.now());renderPlayBattle();
  const targets=[...battleState.targets],startedAt=globalThis.performance?.now?.()??Date.now();
  try{
    const seerReveal=['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(a.actionId)&&!a.artifactId;
    const payload={targetIds:(seerReveal||transferAct)?[a.actorIds[0]||'']:targets,type:a.type,turnId:t.id,actionId:a.actionId,actorId:a.actorIds[0]||'',
      ...(a.artifactId?{artifactId:a.artifactId}:{}),...(seerReveal?{revealTargetIds:targets}:{}),effectId:a.effectIds[0]||'',effectName:a.name,
      matchId:playSceneRuntime.room?.matchId||'',cycleKey:playSceneRuntime.room?.cycleKey||'',
      night:Number(playSceneState.night||1),clientEventId:battleState.nonce,
      ...(a.actionId==='action_assassin_mark'?{assassinChoice:battleState.assassinChoice}: {})};
    if(transferAct){payload.type='effect_notice';payload.direction=battleState.transferDir;payload.message='Yêu Tinh chọn '+(battleState.transferDir==='none'?'Không dịch vết cắn':('dịch vết cắn sang '+(battleState.transferDir==='left'?'Trái':'Phải')))+'.'}
    else if(seerReveal)payload.message='GM thực hiện soi xét; kết quả được xác minh trên Server.';
    else if(a.type==='effect_notice')payload.message='GM đã ghi nhận hành động '+a.name+'.';
    // The confirmation cue is tied to the real OK gesture, not the Artifact opening turn.
    battleConfirmAudioGate=true;
    const finishConfirmAudio=()=>{
      if(!battleConfirmAudioGate)return;
      battleConfirmAudioGate=false;
      renderPlayBattle();
      battleAdvanceConfirmedTurn();
    };
    // Do not announce success until the Durable Object accepted the action.
    const result=await playRoomApi('/battle-action',{method:'POST',body:JSON.stringify(payload)});
    if(result?.ok!==true)throw new Error(result?.message||result?.error||'Server chưa xác nhận');
    gmHapticFeedback();
    const ackMs=Math.round((globalThis.performance?.now?.()??Date.now())-startedAt);
    // Confirm only after the Durable Object commits, never after an extra room reload.
    console.info('GMWW battle-confirm timing',{ackMs,serverProcessingMs:result.serverProcessingMs??null,targetCount:targets.length});
    // One canonical status compositor; no duplicate oversized legacy impact pulses.
    if(result.undoToken)playSceneRuntime.battleUndo={token:result.undoToken,label:result.label||a.name,targets,turnId:t.id};
    const revelation=seerReveal?result.revelation:null;
    let confirmationFinished=false;
    const afterConfirmation=()=>{
      if(confirmationFinished)return;
      confirmationFinished=true;
      if(revelation)battlePresentRevelation(a.actionId,revelation);
      finishConfirmAudio();
    };
    void Promise.resolve(battlePlayConfiguredAudio('system','audio_system_confirm','Xác nhận',false,afterConfirmation))
      .then(started=>{if(started===false)afterConfirmation()},afterConfirmation);
    // Advance a confirmed turn after Server sync. Scan results stay visible until GM taps outside.
    battleState.pendingNextTurnId=t.id;
    battleClear();
    battleState.syncPending=true;
    const title=document.getElementById('playPhaseTitle');
    if(title)title.textContent='✓ ĐÃ GHI NHẬN';
    const syncStartedAt=globalThis.performance?.now?.()??Date.now();
    // Prevent another action on stale turn/usage data until the server refresh completes.
    void playSyncRoom(true).then(data=>{
      console.info('GMWW battle-sync timing',{syncMs:Math.round((globalThis.performance?.now?.()??Date.now())-syncStartedAt),ok:!!data});
      if(!data){playFlashError('Đã ghi nhận trên Server nhưng chưa đồng bộ. Vui lòng tải lại Phòng để tiếp tục.');return}
      battleState.syncPending=false;
      renderPlayBattle();
      if(document.getElementById('battleResultPopup')?.hidden!==false)battleAdvanceConfirmedTurn();
    }).catch(err=>{playFlashError('Đã ghi nhận trên Server nhưng đồng bộ bị lỗi: '+String(err?.message||err));});
  }catch(err){battleConfirmAudioGate=false;playFlashError('Không thể xác nhận: '+String(err?.message||err))}
  finally{battleState.busy=false;renderPlayBattle()}
}
function battleToggleDetails(force){
  battleState.details=typeof force==='boolean'?force:!battleState.details;
  if(battleState.details){battleState.wolfOpen=false;battleState.clockOpen=false}
  if(!battleState.details){battleState.roster=false;battleState.quickType=''}
  renderPlayBattle();
}
const GMWW_GM_LABEL_KEY='gmww_gm_label_visibility_v1';
const gmLabelVisibility=(()=>{
  try{const saved=JSON.parse(localStorage.getItem(GMWW_GM_LABEL_KEY)||'{}');
    return {artifact:saved.artifact!==false,role:saved.role!==false,player:saved.player!==false,dead:saved.dead!==false};
  }catch{return {artifact:true,role:true,player:true,dead:true}}
})();
function battleSyncLabelVisibility(){
  const shell=document.getElementById('playShell');
  if(shell){for(const kind of ['artifact','role','player'])shell.classList.toggle('gmww-hide-'+kind+'-label',!gmLabelVisibility[kind]);
    shell.classList.toggle('gmww-hide-dead-players',!gmLabelVisibility.dead);
  }
  const deadToggle=document.getElementById('battleShowDead');
  if(deadToggle){deadToggle.setAttribute('aria-pressed',String(gmLabelVisibility.dead));
    deadToggle.textContent='Người Chết';
    deadToggle.setAttribute('aria-label','Người chơi đã chết: '+(gmLabelVisibility.dead?'Đang hiện':'Đang ẩn'));
    deadToggle.classList.toggle('is-off',!gmLabelVisibility.dead);
  }
  for(const [kind,id,label] of [['artifact','battleLabelArtifact','Artifact'],['role','battleLabelRole','Vai Trò'],['player','battleLabelPlayer','Người Chơi']]){
    const button=document.getElementById(id);if(!button)continue;
    const enabled=gmLabelVisibility[kind];
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-label','Hiển thị tên '+label+': '+(enabled?'Bật':'Tắt'));
    button.classList.toggle('is-off',!enabled);
    button.textContent=label;
  }
}
function battleToggleLabelVisibility(kind){
  if(!Object.prototype.hasOwnProperty.call(gmLabelVisibility,kind))return;
  gmLabelVisibility[kind]=!gmLabelVisibility[kind];
  try{localStorage.setItem(GMWW_GM_LABEL_KEY,JSON.stringify(gmLabelVisibility))}catch{}
  battleSyncLabelVisibility();
}
function battleToggleWolfMenu(){
  // The campfire opens one shared GM menu during setup and gameplay.
  battleState.wolfOpen=!battleState.wolfOpen;
  if(battleState.wolfOpen){battleState.details=false;battleState.roster=false;battleState.quickType='';battleState.clockOpen=false;const menuRow=document.querySelector('#battleWolfMenu .battle-wolf-actions');if(menuRow)menuRow.scrollLeft=0}
  renderPlayBattle();
}
function battleToggleClockPopover(){
  if(playSceneState.step!=='battle')return;
  battleState.clockOpen=!battleState.clockOpen;
  if(battleState.clockOpen){battleState.wolfOpen=false;battleState.details=false;battleState.roster=false;battleState.quickType=''}
  renderPlayBattle();
}
function battleQuickSelect(type){
  if(battleState.busy||playSceneRuntime.busy||playSceneState.step!=='battle'||!isLivePlayRoom())return;
  battleState.quickType=battleState.quickType===type?'':type;
  battleState.actionId='';battleState.targets=[];battleState.nonce='';
  battleState.details=!!battleState.quickType; battleState.roster=!!battleState.quickType; battleState.wolfOpen=false; battleState.clockOpen=false;
  renderPlayBattle();
}
async function battleQuickApply(loginId,overrideType=''){
  const type=overrideType||battleState.quickType;
  if(!['revive','dead','mute-chat'].includes(type)||battleState.busy||!isLivePlayRoom()||
     playSceneState.step!=='battle'||!playLiveMembers().some(p=>String(p.loginId)===String(loginId)))return;
  const status=playPlayerEffect(loginId);
  if((type==='revive'&&status!=='dead')||(type==='dead'&&status==='dead'))return;
  const name=battleMember(loginId)?.displayName||loginId;
  let previouslyMuted=false;
  if(type==='mute-chat'){
    try{
      const data=await playRoomApi('/chat',{method:'GET'});
      previouslyMuted=data?.bans?.[String(loginId).toLowerCase()]===true;
    }catch(err){playFlashError('Không đọc được quyền Chat: '+String(err?.message||err));return}
  }
  const label=type==='revive'?'CỨU / HỒI SINH':type==='dead'?'GIẾT':
    previouslyMuted?'MỞ CHAT':'CẤM CHAT';
  if(!confirm('GM xác nhận '+label+' người chơi '+name+'?'))return;
  battleState.busy=true;renderPlayBattle();
  try{
    if(type==='mute-chat'){
      await playRoomApi('/chat/moderate',{method:'POST',
        body:JSON.stringify({loginId,muted:!previouslyMuted})});
      if(gmwwGMChatOpen)void gmwwGMChatRefresh();
    }else{
      const id=globalThis.crypto?.randomUUID?.()||String(Date.now());
      await playRoomApi('/interaction',{method:'POST',body:JSON.stringify({
        loginId,type,matchId:playSceneRuntime.room?.matchId||'',
        cycleKey:playSceneRuntime.room?.cycleKey||'',night:Number(playSceneState.night||0),
        source:'gm-manual',clientEventId:'gm-quick-'+id
      })});
    }
    gmHapticFeedback();battleState.quickType='';battleState.details=false;battleState.roster=false;
    await playSyncRoom(true);
  }catch(err){playFlashError('Không thể '+label.toLowerCase()+': '+String(err?.message||err))}
  finally{battleState.busy=false;renderPlayBattle()}
}
// V3.96: independent movable timer, local-only position; game state is never modified.
function initBattleFloatingClock(){
  // V3.104: the clock is anchored in the action dock; old draggable coordinates
  // are intentionally ignored, never deleted (no changes to saved game data).
}

function battleOpenTargetSheet(actionId,mode='list',ambiguous=false){
  if(battleState.busy||battleState.syncPending)return;
  const a=battleActions().find(x=>x.id===actionId);
  if(!a||a.unavailable||a.noTarget||!a.targetCount)return;
  if(battleState.actionId!==actionId){battleClear();battleState.actionId=actionId}
  battleState.targetSheet=true;
  battleState.dragAmbiguous=ambiguous;
  battleState.targetMode=mode==='drag'&&a.targetCount===1?'drag':'list';
  battleState.roster=false;battleState.details=false;battleState.wolfOpen=false;
  renderPlayBattle();
}
function battleCloseTargetSheet(){
  battleState.targetSheet=false;battleState.targets=[];battleState.actionId='';
  battleState.nonce='';renderPlayBattle();
}
async function battleUndoLast(){
  const rec=playSceneRuntime.battleUndo;if(!rec?.token||battleState.busy||battleState.syncPending||battleState.undoBusy)return;
  if(!confirm('Khôi phục hành động vừa xác nhận: '+String(rec.label||'Hành động')+'?'))return;
  battleState.undoBusy=true;renderPlayBattle();
  try{
    const d=await playRoomApi('/battle-undo',{method:'POST',body:JSON.stringify({undoToken:rec.token})});
    if(d?.ok!==true)throw new Error(d?.message||d?.error||'Server chưa xác nhận hoàn tác');
    if(playSceneRuntime.room?.demo===true){demoRunner.completed.clear();demoRunner.nightPlan=null;demoRunner.visual=null}
    battleState.impacts.clear();battleClear();battleIconResetPositions();await playSyncRoom(true);
  }catch(err){playFlashError('Không thể khôi phục: '+String(err?.message||err))}
  finally{battleState.undoBusy=false;renderPlayBattle()}
}
function initBattleFloatingUndo(){
  const button=document.getElementById('battleUndoButton');
  if(!button||button.dataset.ready)return;
  button.dataset.ready='1';
  button.addEventListener('click',()=>{void battleUndoLast()});
}

/* Capture iOS/WKWebView touch gestures directly. Pointer-only swipe events
   can be cancelled by browser panning or pointer capture on the village scene. */
function initBattleTimelineScrollNavigation(){
  const timeline=document.getElementById('battleTimeline');if(!timeline||timeline.dataset.scrollNavReady)return;
  timeline.dataset.scrollNavReady='1';
  let armed=false,moved=false,startScroll=0,startX=0,startY=0,gestureDx=0,timer=null;
  const cancel=()=>{armed=false;moved=false;clearTimeout(timer)};
  timeline.gmwwCancelScrollNavigation=cancel;
  const begin=(x,y)=>{
    battleUnlockAudioFromGesture();cancel();
    if(playSceneState.step!=='battle'||playSceneState.phase!=='night')return;
    armed=true;startScroll=timeline.scrollLeft;startX=x;startY=y;gestureDx=0;
  };
  const move=(x,y)=>{
    if(!armed)return;
    const dx=x-startX,dy=y-startY;
    if(Math.abs(dx)>=34&&Math.abs(dx)>Math.abs(dy)*1.1){moved=true;gestureDx=dx}
  };
  const settle=()=>{
    if(!armed||!moved||playSceneState.step!=='battle'||playSceneState.phase!=='night'||
       battleState.busy||battleState.syncPending){cancel();return}
    // Only a genuine finger/drag movement can navigate. scrollIntoView()
    // following a button tap is programmatic and must never change the turn.
    const delta=Math.sign(timeline.scrollLeft-startScroll)||Math.sign(-gestureDx);
    cancel();
    if(delta)battleNavigateRelative(delta);
  };
  const schedule=()=>{if(!armed||!moved)return;clearTimeout(timer);timer=setTimeout(settle,220)};
  timeline.addEventListener('touchstart',e=>{
    const t=e.touches?.[0];if(t)begin(t.clientX,t.clientY);
  },{passive:true});
  timeline.addEventListener('touchmove',e=>{
    const t=e.touches?.[0];if(t)move(t.clientX,t.clientY);
  },{passive:true});
  timeline.addEventListener('touchend',e=>{
    const t=e.changedTouches?.[0];if(t)move(t.clientX,t.clientY);if(moved)schedule();else cancel();
  },{passive:true});
  timeline.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')begin(e.clientX,e.clientY)},{passive:true});
  timeline.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')move(e.clientX,e.clientY)},{passive:true});
  timeline.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'){move(e.clientX,e.clientY);if(moved)schedule();else cancel()}},{passive:true});
  timeline.addEventListener('scroll',schedule,{passive:true});
  timeline.addEventListener('touchcancel',cancel,{passive:true});
}
function initBattleSwipeNavigation(){
  const root=document.getElementById('playShell');if(!root||root.dataset.battleSwipeReady)return;
  root.dataset.battleSwipeReady='1';
  let gesture=null;
  const interactive='button,input,select,textarea,a,[role="button"],[role="dialog"],[contenteditable="true"]';
  const overlays='#playBattleTop,#playBattleDock,#battleBottomControls,#battleWolfMenu,#battleDetails,#battleTargetSheet,.play-gm-sheet';
  const eligible=target=>{
    if(playSceneState.step!=='battle'||playSceneState.phase!=='night'||battleState.busy||playSceneRuntime.busy||
       battleState.drag||battleState.targetSheet||battleState.roster||battleState.details||
       battleState.wolfOpen||battleState.clockOpen)return false;
    if(!target||!root.contains(target)||target.closest?.(overlays)||target.closest?.('.play-player-artifact'))return false;
    // Player tokens are safe swipe starting points during a battle; their taps
    // still select targets, and native horizontal action scrolling is excluded.
    return !target.closest?.(interactive)||!!target.closest?.('#playPlayerRing [data-play-player-id]');
  };
  const begin=(x,y,target,source,id)=>{
    gesture=eligible(target)?{x,y,target,source,id,time:Date.now()}:null;
  };
  const finish=(x,y)=>{
    const start=gesture;gesture=null;
    if(!start||playSceneState.step!=='battle'||playSceneState.phase!=='night'||battleState.busy||playSceneRuntime.busy||battleState.targetSheet||battleState.roster||battleState.details||battleState.wolfOpen||battleState.clockOpen)return;
    const dx=x-start.x,dy=y-start.y,elapsed=Date.now()-start.time;
    const minDistance=Math.max(38,Math.min(58,window.innerWidth*.105));
    if(elapsed<=2200&&Math.abs(dx)>=minDistance&&Math.abs(dx)>Math.abs(dy)*1.12){
      battleState.ignoreSwipeClick=Date.now()+450;
      battleNavigateRelative(dx<0?1:-1);
    }
  };
  root.addEventListener('touchstart',event=>{
    gesture=null;
    if(event.touches.length!==1)return;
    const point=event.touches[0];begin(point.clientX,point.clientY,event.target,'touch',point.identifier);
  },{passive:true,capture:true});
  root.addEventListener('touchmove',event=>{
    if(event.touches.length!==1){gesture=null;return}
    if(gesture?.source==='touch'){
      const p=event.touches[0],dx=p.clientX-gesture.x,dy=p.clientY-gesture.y;
      if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.12)event.preventDefault();
    }
  },{passive:false,capture:true});
  document.addEventListener('touchend',event=>{
    if(!gesture||gesture.source!=='touch')return;
    if(event.touches.length!==0||event.changedTouches.length!==1||
       event.changedTouches[0].identifier!==gesture.id){gesture=null;return}
    const point=event.changedTouches[0];finish(point.clientX,point.clientY);
  },{passive:true,capture:true});
  document.addEventListener('touchcancel',()=>{gesture=null},{passive:true,capture:true});
  root.addEventListener('pointerdown',event=>{
    if(!gesture&&(event.pointerType==='pen'||event.pointerType==='touch'))begin(event.clientX,event.clientY,event.target,'pointer',event.pointerId);
  },{passive:true,capture:true});
  document.addEventListener('pointerup',event=>{
    if(gesture?.source==='pointer'&&gesture.id===event.pointerId)finish(event.clientX,event.clientY);
  },{passive:true,capture:true});
  document.addEventListener('pointercancel',event=>{
    if(gesture?.source==='pointer'&&gesture.id===event.pointerId)gesture=null;
  },{passive:true,capture:true});
}

function battleResolveDropTarget(x,y,nodes,allow=()=>true){
  // A nearby player is never silently preferred over another: ambiguous drops
  // open the named target picker instead of risking A -> B.
  const candidates=Array.from(nodes||[]).filter(el=>el?.dataset?.playPlayerId&&allow(el.dataset.playPlayerId)).map(el=>{
    const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height*.54;
    return {id:el.dataset.playPlayerId,element:el,distance:Math.hypot(cx-x,cy-y)};
  }).filter(v=>v.distance<=72).sort((a,b)=>a.distance-b.distance);
  if(!candidates.length)return {id:'',ambiguous:false};
  if(candidates.length>1&&candidates[1].distance-candidates[0].distance<24)
    return {id:'',ambiguous:true};
  return {id:candidates[0].id,ambiguous:false};
}
function battleDropCandidates(actionId){
  const a=battleActions().find(x=>x.id===actionId),ring=document.getElementById('playPlayerRing');
  if(!a||!ring)return {nodes:[],allowed:()=>false};
  return {nodes:ring.querySelectorAll('[data-play-player-id]'),
    allowed:id=>battleRules().targetAllowed(a,battleMember(id),playPlayerEffect(id),playSceneRuntime.activeEffects,playSceneState.night)};
}
function battleClearDropHighlights(){
  document.querySelectorAll('#playPlayerRing .is-drop-target,#playPlayerRing .is-drop-ambiguous').forEach(el=>el.classList.remove('is-drop-target','is-drop-ambiguous'));
}
async function battleAdjustDayClock(deltaMinutes){
  if(playSceneState.phase!=='day'||battleState.dayClockBusy||!isLivePlayRoom())return;
  const room=playSceneRuntime.room||{};
  battleState.dayClockBusy=true;
  try{
    const data=await playRoomApi('/day-clock',{method:'POST',body:JSON.stringify({
      deltaMinutes,matchId:room.matchId||'',cycleKey:room.cycleKey||''
    })});
    if(data?.ok!==true)throw Error(data?.message||data?.error||'Server chưa xác nhận thay đổi thời gian.');
    if(data.room&&playSceneRuntime.room?.cycleKey===room.cycleKey)
      playSceneRuntime.room=data.room;
    await playSyncRoom(true);battleTickCountdown();
  }catch(err){playFlashError('Đồng hồ Ban Ngày: '+String(err?.message||err))}
  finally{battleState.dayClockBusy=false}
}
function initBattleDayClockSwipe(){
  const button=document.getElementById('battleClockButton');if(!button||button.dataset.daySwipeReady)return;
  button.dataset.daySwipeReady='1';
  let start=null;
  button.addEventListener('pointerdown',event=>{
    if(playSceneState.phase==='day'&&event.isPrimary)start={x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  button.addEventListener('pointerup',event=>{
    if(!start||event.pointerId!==start.id)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
    if(Math.abs(dx)>=28&&Math.abs(dx)>Math.abs(dy)*1.25){
      event.preventDefault();battleUnlockAudioFromGesture();
      void battleAdjustDayClock(dx>0?1:-1);
    }
  });
  button.addEventListener('pointercancel',()=>{start=null});
}
function initBattleControls(){
  const top=document.getElementById('playBattleTop');if(!top||top.dataset.ready)return;top.dataset.ready='1';
  document.getElementById('battleBack')?.addEventListener('click',()=>{battleUnlockAudioFromGesture();battleNavigateRelative(-1)});
  document.getElementById('battleForceEnd')?.addEventListener('click',()=>{void openPlayCompletionSheet()});
  document.getElementById('battleExit')?.addEventListener('click',exitPlayImmersive);
  document.getElementById('battleInfoToggle')?.addEventListener('click',()=>battleToggleDetails());
  initBattleFloatingClock();initBattleDayClockSwipe();initBattleFloatingUndo();battleBindTargetSheetDrag();battleBindConfirmDrag();battleBindResultPopup();
  battleBindAuxiliaryDrag('battleWolfMenu','header');
  battleBindAuxiliaryDrag('battleDemoObserver','header');
  battleBindAuxiliaryDrag('battleMorningReport','header');
  battleBindAuxiliaryDrag('battleFactionStats','header');
  // The first natural touch on the battle view unlocks iOS sound without
  // waiting for GM to swipe the timeline several times.
  document.addEventListener('pointerdown',battleUnlockAudioFromGesture,{once:true,capture:true});
  document.addEventListener('click',battleUnlockAudioFromGesture,{once:true,capture:true});
  document.getElementById('battleMorningAudio')?.addEventListener('click',()=>{battleUnlockAudioFromGesture();battleMorningPlayAudio()});
  document.getElementById('battleGallowsVerdict')?.addEventListener('click',event=>{
    if(event.target.closest('[data-verdict-continue]'))battleGallowsAcceptVerdict(battleState.gallowsVerdictKey);
  });
  document.getElementById('battleFactionStatsToggle')?.addEventListener('click',()=>{
    const panel=document.getElementById('battleFactionStats');
    if(!panel)return;panel.hidden=!panel.hidden;
    document.getElementById('battleFactionStatsToggle')?.setAttribute('aria-pressed',String(!panel.hidden));
    battleRenderFactionStats();
  });
  document.getElementById('battleDayNoticeToggle')?.addEventListener('click',()=>{
    if(playSceneState.phase!=='day')return;
    battleState.morningOpen=!battleState.morningOpen;
    battleState.gallowsOpen=false;battleState.dayActionsOpen=false;renderPlayBattle();
  });
  document.getElementById('battleDayGallowsToggle')?.addEventListener('click',()=>{
    if(playSceneState.phase!=='day')return;
    const opening=!battleState.gallowsOpen;
    battleState.gallowsOpen=opening;
    if(opening)battleUnlockAudioFromGesture(); // Day-long introduction is emitted at the start of the day, once.
    battleState.dayActionsOpen=false;battleState.morningOpen=false;renderPlayBattle();
  });
  document.getElementById('battleDayActionList')?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-day-action]');if(!btn||playSceneState.phase!=='day')return;
    const id=btn.dataset.dayAction;
    battleState.dayActionsOpen=false;
    document.getElementById('battleDayActionMenu').hidden=true;
    document.getElementById('battleDayActionToggle')?.setAttribute('aria-expanded','false');
    const action=battleActions().find(a=>a.id===id&&!a.unavailable);
    if(!action)return;
    battleUnlockAudioFromGesture();
    if(action.artifactId)void battlePlayConfiguredAudio('artifacts',action.artifactId,action.name);
    else if(action.roleId)void battlePlayConfiguredAudio('cards',action.roleId,
      (state.cards||[]).find(r=>r.id===action.roleId)?.name||action.name);
    if(action.noTarget){
      if(!confirm('Xác nhận thực hiện '+action.name+'?'))return;
      battleClear();battleState.actionId=id;void battleConfirmDay(true);
    }else battleOpenTargetSheet(id,'list');
  });
  document.getElementById('battleDayActionToggle')?.addEventListener('click',()=>{
    if(playSceneState.phase!=='day'||!battleActions().some(a=>!a.unavailable))return;
    battleState.dayActionsOpen=!battleState.dayActionsOpen;
    battleState.gallowsOpen=false;battleState.morningOpen=false;renderPlayBattle();
  });
  battleBindAuxiliaryDrag('battleGallowsPanel','header');
  document.getElementById('battleGallowsPanel')?.addEventListener('click',event=>{
    const tab=event.target.closest('[data-gallows-tab]');
    if(tab){battleState.gallowsTab=tab.dataset.gallowsTab;battleGallowsRender('day');return}
    const pick=event.target.closest('[data-gallows-pick]');
    if(pick&&!pick.disabled&&playSceneRuntime.gallows?.mode==='gm'){
      void battleGallowsCommand('hang',String(pick.dataset.gallowsPick||''));return;
    }
    const mode=event.target.closest('[data-gallows-mode]');
    if(mode){void battleGallowsCommand('mode','','',{mode:mode.dataset.gallowsMode});return}
    const block=event.target.closest('[data-gallows-kind]');
    if(block){
      const g=playSceneRuntime.gallows||{},kind=block.dataset.gallowsKind,
        denied=(kind==='nomination'?(g.blockedNomination||[]):(g.blockedVotes||g.blocked||[])).includes(block.dataset.gallowsId);
      void battleGallowsCommand('restriction',block.dataset.gallowsId,'',{kind,banned:!denied});return;
    }
    const choice=event.target.closest('[data-gallows-choice]');
    if(choice){battleState.manualVoteChoice=choice.dataset.gallowsChoice;battleGallowsRender('day');return}
    const manual=event.target.closest('[data-gallows-manual]');
    if(manual){
      const id=document.getElementById('battleGallowsManualMember')?.value||'';
      void battleGallowsCommand('manual_vote',id,'',{choice:manual.dataset.gallowsManual==='undo'?null:battleState.manualVoteChoice});
      return;
    }
    const btn=event.target.closest('[data-gallows-command]');if(!btn||btn.disabled)return;
    const g=playSceneRuntime.gallows||{},tallies=Array.isArray(g.nominationTotals)?g.nominationTotals:[],
      lead=tallies[0]&&(!tallies[1]||Number(tallies[0].votes)>Number(tallies[1].votes))?String(tallies[0].loginId):'',
      selected=document.getElementById('battleGallowsCandidate')?.value||'';
    const stage=String(g.stage||'ready');
    const command=btn.dataset.gallowsCommand==='close_stage'?
      (stage==='nominating'?'close_nomination':'close_vote'):btn.dataset.gallowsCommand;
    void battleGallowsCommand(command,command==='begin'?(lead||selected):String(g.candidateId||''),btn.dataset.outcome||'');
  });
  // Shared duration is saved once, authoritatively, for both stages.
  document.getElementById('battleGallowsSeconds')?.addEventListener('focusout',event=>{
    const input=event.currentTarget,g=playSceneRuntime.gallows||{},value=Number(input.value),
      previous=Number(g.nominationDurationSec)||60;
    if(!Number.isInteger(value)||value<1||value>3600){
      input.value=String(previous);playFlashError('Thời gian từ 1 đến 3600 giây.');return;
    }
    if(value!==previous||value!==Number(g.voteDurationSec||60))
      void battleGallowsCommand('set_duration','','',{kind:'both',seconds:value});
  });
  battleBindAuxiliaryDrag('battleDetails','.play-battle-turn');
  battleBindAuxiliaryDrag('battleDetails','#battleRoster > header');
  // One outside-dismiss handler for all battle overlays. Never cancel a validated Server action.
  document.addEventListener('pointerdown',event=>{
    // The SAME campfire GM menu is available in Setup and Battle.
    // Outside tap dismisses it in either phase, including when chrome is hidden.
    if(document.body.classList.contains('play-immersive')&&playSceneState.step!=='battle'&&
       battleState.wolfOpen&&!event.target.closest?.('#battleWolfMenu,.play-core-pearl')){
      battleState.wolfOpen=false;renderPlayBattle();return;
    }
    if(playSceneState.step!=='battle')return;
    const stats=document.getElementById('battleFactionStats');
    if(stats&&!stats.hidden&&!stats.contains(event.target)&&!event.target.closest?.('#battleFactionStatsToggle')){
      stats.hidden=true;document.getElementById('battleFactionStatsToggle')?.setAttribute('aria-pressed','false');
    }
    const target=event.target,inside=selector=>!!target.closest?.(selector);
    const result=document.getElementById('battleResultPopup');
    if(result&&!result.hidden&&!result.contains(target))battleCloseResultPopup();
    const morning=document.getElementById('battleMorningReport');
    if(morning&&!morning.hidden&&!morning.contains(target)&&!inside('#battleDayNoticeToggle')){
      morning.hidden=true;battleState.morningOpen=false;
      document.getElementById('battleDayNoticeToggle')?.setAttribute('aria-pressed','false');
    }
    if(battleState.gallowsOpen&&!inside('#battleGallowsPanel,#battleDayGallowsToggle')){
      battleState.gallowsOpen=false;document.getElementById('battleGallowsPanel').hidden=true;
      document.getElementById('battleDayGallowsToggle')?.setAttribute('aria-pressed','false');
    }
    if(battleState.dayActionsOpen&&!inside('#battleDayActionMenu,#battleDayActionToggle')){
      battleState.dayActionsOpen=false;document.getElementById('battleDayActionMenu').hidden=true;
    }
    const picker=document.getElementById('battleTargetSheet');
    if(picker&&!picker.hidden&&!picker.contains(target)&&
       !inside('#playPlayerRing .play-player,#playPlayerRing [data-battle-target],#battleActionBar')){
      battleCloseTargetSheet();
    }
    const transfer=document.getElementById('battleTransferPanel');
    if(transfer&&!transfer.hidden&&!transfer.contains(target)&&
       !inside('#battleActionBar,#playPlayerRing .play-player,#playPlayerRing [data-battle-target]')){
      battleClear();renderPlayBattle();
    }
    let changed=false;
    if(battleState.wolfOpen&&!inside('#battleWolfMenu,.play-core-pearl')){
      battleState.wolfOpen=false;changed=true;
    }
    if(battleState.details&&!inside('#battleDetails,#battleInfoToggle')){
      battleState.details=false;battleState.roster=false;changed=true;
    }
    if(battleState.clockOpen&&!inside('#battleClockPopover,#battleClockButton')){
      battleState.clockOpen=false;changed=true;
    }
    if(changed)renderPlayBattle();
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.body.classList.contains('play-immersive')&&
       (battleState.wolfOpen||(playSceneState.step==='battle'&&(battleState.clockOpen||battleState.dayActionsOpen||battleState.gallowsOpen)))){
      battleState.wolfOpen=false;battleState.clockOpen=false;battleState.dayActionsOpen=false;battleState.gallowsOpen=false;renderPlayBattle();
      document.querySelector('.play-core-pearl')?.focus();
    }
  });
  document.getElementById('battleGMFireAnchor')?.addEventListener('click',()=>{battleState.wolfOpen=false;renderPlayBattle();villageCalibrateFire()});
  document.getElementById('battleGMGallowsAnchor')?.addEventListener('click',()=>{battleState.wolfOpen=false;renderPlayBattle();villageCalibrateGallows('day')});
  document.getElementById('battleQuickRevive')?.addEventListener('click',()=>battleQuickSelect('revive'));
  document.getElementById('battleQuickKill')?.addEventListener('click',()=>battleQuickSelect('dead'));
  document.getElementById('battleAdvance')?.addEventListener('click',()=>{battleUnlockAudioFromGesture();if(battleState.targets.length&&!confirm('Bỏ mục tiêu chưa xác nhận và chuyển lượt?'))return;void advancePlayPhase()});
  document.getElementById('battleRosterToggle')?.addEventListener('click',()=>{battleState.roster=!battleState.roster;renderPlayBattle()});
  // One-tap confirmation; change the target by tapping another player before OK.
  document.getElementById('battleConfirm')?.addEventListener('click',()=>{void battleConfirm(true)});
  document.getElementById('battleTargetCancel')?.addEventListener('click',battleCloseTargetSheet);
  document.getElementById('battleAssassinChoice')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-assassin-choice]');if(!button||battleState.busy||battleState.syncPending)return;
    battleState.assassinChoice=button.dataset.assassinChoice;renderPlayBattle();
  });
  document.getElementById('battleTargetConfirm')?.addEventListener('click',()=>{if(Date.now()<battleState.ignoreConfirmClickUntil)return;void battleConfirm(true)});
  document.getElementById('battleTargetCandidates')?.addEventListener('click',e=>{
    const row=e.target.closest('[data-battle-candidate]');if(row&&!row.disabled)battlePickTarget(row.dataset.battleCandidate)
  });
  document.getElementById('battleGMAuto')?.addEventListener('click',()=>{void togglePlayAutoGM()});
  document.getElementById('battleActionBar')?.addEventListener('pointerdown',demoHoldForGM,{capture:true});
  document.getElementById('playPlayerRing')?.addEventListener('pointerdown',demoHoldForGM,{capture:true});
  document.getElementById('battleDemoToggle')?.addEventListener('click',()=>{battleUnlockAudioFromGesture();void demoToggle()});
  document.getElementById('battleDemoSpeed')?.addEventListener('click',event=>{
    const speeds=[1,2,5,10],current=Number(event.currentTarget.dataset.speed||demoRunner.speed||1);
    const selected=speeds[(speeds.indexOf(current)+1)%speeds.length];
    event.currentTarget.dataset.speed=String(selected);event.currentTarget.textContent='×'+selected;
    demoRunner.speed=selected;
    if(demoRunner.running)void playRoomApi('/demo',{method:'POST',body:JSON.stringify({command:'speed',speed:selected})})
      .then(data=>{playSceneRuntime.demoControl=data;demoApplyServerControl(data);renderPlayBattle()})
      .catch(err=>{playFlashError('Tốc độ Demo: '+String(err.message||err));void playSyncRoom(true)});
    renderPlayBattle();
  });
  document.getElementById('battleGMAudio')?.addEventListener('click',()=>{togglePlayAudio();renderPlayBattle()});
  document.getElementById('battleGMActionIcons')?.addEventListener('click',()=>battleIconSetOn(!battleIconOn()));
  document.getElementById('battleGMTurnMotion')?.addEventListener('click',()=>battleMotionSetOn(!battleMotionOn()));
   document.getElementById('battleGMHaptic')?.addEventListener('click',()=>{
    setGmHapticEnabled(!gmHapticEnabled());renderPlayBattle();
  });
  for(const [id,kind] of [['battleLabelArtifact','artifact'],['battleLabelRole','role'],['battleLabelPlayer','player'],['battleShowDead','dead']])
    document.getElementById(id)?.addEventListener('click',()=>battleToggleLabelVisibility(kind));
  battleSyncLabelVisibility();
  document.getElementById('battleTimeline')?.addEventListener('click',e=>{const b=e.target.closest('[data-battle-index]');if(b&&!b.disabled){document.getElementById('battleTimeline')?.gmwwCancelScrollNavigation?.();battleUnlockAudioFromGesture();void battleNavigateIndex(Number(b.dataset.battleIndex))}});
  initBattleSwipeNavigation();initBattleTimelineScrollNavigation();
  window.setInterval(()=>{if(playSceneState.step==='battle')battleTickCountdown()},300);
  document.getElementById('battleAudioReplay')?.addEventListener('click',battleReplayAudio);
  document.getElementById('battleActionPrevious')?.addEventListener('click',()=>battleNavigateActions(-1));
  document.getElementById('battleActionNext')?.addEventListener('click',()=>battleNavigateActions(1));
  document.getElementById('battleActionBar')?.addEventListener('scroll',battleUpdateActionNavigation,{passive:true});
  window.addEventListener('resize',battleUpdateActionNavigation);
  document.getElementById('battleActionBar')?.addEventListener('click',e=>{
    if(Date.now()<battleState.ignoreClick)return;
    const x=e.target.closest('[data-battle-action]');if(!x||x.disabled)return;
    const id=x.dataset.battleAction,now=Date.now(),last=battleState.lastTap;
    if(last?.id===id&&now-last.at<420){
      battleState.lastTap=null;
      if(playSceneState.phase==='day'){
        battleState.dayActionsOpen=true;battleState.gallowsOpen=false;battleState.morningOpen=false;renderPlayBattle();
      }else battleOpenTargetSheet(id,'list');
      return
    }
    battleState.lastTap={id,at:now};
    if(battleState.actionId!==id){battleClear();battleState.actionId=id}
    const audioAction=battleActions().find(action=>action.id===id);
    if(audioAction)void battlePlayConfiguredAudio('actions',audioAction.actionId,audioAction.name);
    renderPlayBattle();
  });
  document.getElementById('battleActionBar')?.addEventListener('dblclick',e=>{
    const x=e.target.closest('[data-battle-action]');if(x&&!x.disabled&&!battleState.targetSheet){
      if(playSceneState.phase==='day'){battleState.dayActionsOpen=true;renderPlayBattle()}
      else battleOpenTargetSheet(x.dataset.battleAction,'list');
    }
  });
  document.getElementById('battleRosterList')?.addEventListener('click',e=>{const x=e.target.closest('[data-battle-member]');if(x&&!x.disabled){if(battleState.quickType)void battleQuickApply(x.dataset.battleMember);else battlePickTarget(x.dataset.battleMember)}});
  document.getElementById('playPlayerRing')?.addEventListener('click',e=>{if(playSceneState.step!=='battle'||!battleAction()||e.target.closest?.('.play-player-artifact')||Date.now()<Number(battleState.ignoreSwipeClick||0))return;const x=e.target.closest('[data-play-player-id]');if(x){e.preventDefault();e.stopPropagation();battlePickTargetWithAudio(x.dataset.playPlayerId);const action=battleAction();if(action&&battleState.targets.length===action.targetCount)battleOpenTargetSheet(battleState.actionId,'drag')}},true);
  document.getElementById('battleActionBar')?.addEventListener('pointerdown',e=>{
    const x=e.target.closest('[data-battle-action]');
    if(x&&!x.disabled){
      const bar=document.getElementById('battleActionBar');
      battleState.drag={id:x.dataset.battleAction,x:e.clientX,y:e.clientY,pointerId:e.pointerId,moved:false,mode:'pending',scrollStart:bar?.scrollLeft||0};
      x.setPointerCapture?.(e.pointerId)
    }
  });
  document.addEventListener('pointermove',e=>{
    const d=battleState.drag;if(!d||d.pointerId!==e.pointerId)return;
    const dx=e.clientX-d.x,dy=e.clientY-d.y;
    if(!d.moved&&Math.hypot(dx,dy)>9){
      d.moved=true;
      // Horizontal swipe browses actions; movement toward the village starts a
      // real target drag. Both gestures start directly on a readable action.
      d.mode=battleActionGestureMode(dx,dy);
    }
    if(!d.moved)return;
    if(d.mode==='scroll'){
      const bar=document.getElementById('battleActionBar');
      if(bar)bar.scrollLeft=d.scrollStart-dx;
      return;
    }
    let ghost=document.getElementById('battleDragGhost');
    if(!ghost){ghost=document.createElement('div');ghost.id='battleDragGhost';ghost.textContent=battleActions().find(a=>a.id===d.id)?.name||'Tác động';document.body.appendChild(ghost)}
    ghost.style.left=e.clientX+'px';ghost.style.top=(e.clientY-34)+'px';
    const {nodes,allowed}=battleDropCandidates(d.id),hit=battleResolveDropTarget(e.clientX,e.clientY,nodes,allowed);
    battleClearDropHighlights();
    if(hit.id)Array.from(nodes).find(n=>n.dataset.playPlayerId===hit.id)?.classList.add('is-drop-target');
    else if(hit.ambiguous)Array.from(nodes).filter(n=>n.getBoundingClientRect().top<e.clientY+75).forEach(n=>n.classList.add('is-drop-ambiguous'));
  },{passive:true});
  document.addEventListener('pointerup',e=>{
    const d=battleState.drag;if(!d||d.pointerId!==e.pointerId)return;
    battleState.drag=null;document.getElementById('battleDragGhost')?.remove();battleClearDropHighlights();
    if(!d.moved)return;
    battleState.ignoreClick=Date.now()+450;
    if(d.mode==='scroll')return;
    const {nodes,allowed}=battleDropCandidates(d.id),hit=battleResolveDropTarget(e.clientX,e.clientY,nodes,allowed);
    if(hit.id)battlePickTargetWithAudio(hit.id,d.id);
    const action=battleActions().find(a=>a.id===d.id);
    // Keep the village unobstructed for 2+/3+ successive drops; show OK at the quota.
    if(!hit.id||hit.ambiguous||!action||action.targetCount===1||
      battleState.targets.length===action.targetCount)battleOpenTargetSheet(d.id,hit.id?'drag':'list',hit.ambiguous);
  },{passive:true});
  document.addEventListener('pointercancel',()=>{battleState.drag=null;document.getElementById('battleDragGhost')?.remove();battleClearDropHighlights()});
}

function renderPlayScene(){
  const shell=document.getElementById('playShell');if(!shell)return;shell.dataset.phase=playSceneState.phase;shell.dataset.step=playSceneState.step;applyGMVillageScene();
  if(playSceneRuntime.setupPopupStep!==playSceneState.step){playSceneRuntime.setupPopupStep=playSceneState.step;playSceneRuntime.setupPopupClosed=false}
  const phase=playSceneState.phase,night=Math.max(0,Number(playSceneState.night)||0),put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
  const artifactMax=Math.max(0,Math.min(30,Number(playSceneRuntime.artifactCycle?.max??playSceneRuntime.gameConfig?.artifactLimitPerCycle??3)||0));
  put('playRoomCode',playSceneState.roomCode||'—');put('playArtifactCount',Math.min(artifactMax,Math.max(0,Number(playSceneState.artifactCount)||0))+'/'+artifactMax);
  const auto=document.getElementById('playAutoGM');if(auto){auto.classList.toggle('is-on',!!playSceneState.autoGM);auto.setAttribute('aria-pressed',String(!!playSceneState.autoGM));auto.setAttribute('aria-label',playSceneState.autoGM?'Auto GM đang bật':'Auto GM đang tắt');auto.title=playSceneState.autoGM?'Auto GM: Bật':'Auto GM: Tắt'}
  applyPlayAudioState();
  if(phase==='night'){const rt=playSceneRuntime.nightRuntime,cur=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;put('playPhaseOrb','☾');put('playPhaseTitle',playVisibleStageLabel());put('playCycleBadge','ĐÊM '+Math.max(1,night));put('playCoreKicker',cur?.kind==='early-artifact'?'ARTIFACT GỌI SỚM':cur?.kind==='artifact-main'?'ARTIFACT':cur?.kind==='role'?'VAI TRÒ':night===1?'MỞ ĐẦU ĐÊM 1':'BAN ĐÊM');put('playCoreTitle',cur?.label||'HOÀN TẤT ĐÊM '+Math.max(1,night));put('playCoreHint',rt?.completed?'Đã xong toàn bộ lượt. Có thể chuyển sang Ban Ngày.':cur?.kind==='wolf-introduction'?'Bầy Sói nhìn mặt nhau trước khi vào lượt chức năng.':'Thực hiện bước hiện tại rồi nhấn Tiếp theo.')}
  else if(phase==='day'){put('playPhaseOrb','☀');put('playPhaseTitle',playVisibleStageLabel());put('playCycleBadge','NGÀY '+Math.max(1,night));put('playCoreKicker','LÀNG ƠI! DẬY ĐI');put('playCoreTitle','BAN NGÀY');put('playCoreHint','Công bố kết quả, thảo luận và bỏ phiếu.')}
  else{const step=PLAY_STEP_COPY[playSceneState.step]||PLAY_STEP_COPY.room;put('playPhaseOrb','◉');put('playPhaseTitle',playVisibleStageLabel());put('playCycleBadge',playVisibleStageLabel().toUpperCase());put('playCoreKicker','GMWW • SÂN CHƠI');put('playCoreTitle',step.k);put('playCoreHint',step.x)}
  document.querySelectorAll('[data-play-step]').forEach(b=>{const cur=PLAY_STEPS.indexOf(playSceneState.step),idx=PLAY_STEPS.indexOf(b.dataset.playStep);b.classList.toggle('active',idx===cur);b.classList.toggle('done',idx<cur);if(idx===cur)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
  const stepStatus=document.getElementById('playPhasePill');if(stepStatus)stepStatus.setAttribute('aria-label','Bước hiện tại '+playVisibleStageLabel()+' · Chạm để tiếp tục');
  const primary=document.getElementById('playPrimaryLabel');
  if(primary){const step=PLAY_STEP_COPY[playSceneState.step]||PLAY_STEP_COPY.room;primary.textContent=playSceneState.step==='deal'&&playDeliveryProgress().success?'VÀO TRẬN':step.t.toUpperCase()}
  const core=document.querySelector('.play-village-core'),fire=villageFirePosition();if(core){core.style.left=fire[0]+'%';core.style.top=fire[1]+'%';}
  renderPlayPlayers();renderPlayCards();renderPlayDeliveryProgress();renderPlayGatherToolbar();renderPlayRoleAssignmentPanel();renderPlayBattle();if(isLivePlayRoom())stopPlayGlobalVillagePoll();else ensurePlayGlobalVillagePoll();syncPlayAutoAdvance();
}

// AUTO VÁN chỉ ghép các roleId/phe có trong Core; không thay gameplay.
function gmAutoRankTemplates(items,n){
  const gap=t=>Math.abs(Math.max(0,Number(t?.playerCount)||0)-n);
  return [...(items||[])].sort((a,b)=>gap(a)-gap(b)||String(a.name||'').localeCompare(String(b.name||''),'vi'));
}
function gmAutoComposeRoles(catalog,players,history=[]){
  const n=Math.trunc(Number(players)||0);
  if(n<3||n>30)throw Error('AUTO VÁN hỗ trợ 3–30 người.');
  const all=new Map((catalog||[]).map(r=>[String(r.id),r]));
  const get=(id,team)=>{const r=all.get(id);return r&&String(r.factionId||r.faction||'').toLowerCase()===team?r:null};
  const wolf=get('role_wolf','wolf'),villager=get('role_villager','village'),seer=get('role_seer','village');
  if(!wolf||!villager||!seer)throw Error('Thiếu Sói Thường, Dân Làng hoặc Tiên Tri trong Thư Viện.');
  const neutrals=['role_destroyer','role_assassin'].map(id=>get(id,'third')).filter(Boolean);
  if(n>=10&&!neutrals.length)throw Error('Thiếu vai Phe Ba theo Core (Sát Thủ/Kẻ Hủy Diệt).');
  const wolfCount=n<=6?1:Math.max(2,Math.round((n-1)/4.5)),thirdCount=n>=10?1:0;
  const specialLimit=n<=4?1:n<=8?2:n<=11?3:n<=15?4:n<=20?5:Math.min(8,Math.floor(n/3));
  const seen=new Set(history.slice(-1)),pick=(arr,salt)=>arr.length?arr[Math.floor((Math.random()+salt*0.61803398875)%1*arr.length)]:null;
  for(let attempt=0;attempt<160;attempt++){
    const counts=new Map(),add=(r,num=1)=>{if(r)counts.set(r.id,(counts.get(r.id)||0)+num)};
    add(wolf);const variants=(n>=12?['role_wolf_seer','role_wolf_cub']:[]).concat(n>=15?['role_alpha_wolf']:[],n>=17?['role_snow_wolf','role_wolf_hunter']:[]).map(id=>get(id,'wolf')).filter(Boolean);
    for(let i=1;i<wolfCount;i++)add(variants.length&&i<=Math.min(2,Math.floor(n/8))?pick(variants,attempt+i*5):wolf);
    if(thirdCount)add(pick(neutrals,attempt+2));
    const villageSlots=n-wolfCount-thirdCount;
    const ids=n<=4?['role_seer','role_guard','role_aura_seer']:n===5?['role_seer','role_guard','role_aura_seer','role_witch','role_hunter']:['role_seer','role_guard','role_witch','role_hunter','role_spiritualist','role_fox','role_aura_seer','role_piper','role_maiden','role_fairy','role_knight','role_bear_god'];
    const available=ids.map(id=>get(id,'village')).filter(Boolean);
    const required=n>=6?[seer]:[];
    if(n>=5){const defense=pick(['role_guard','role_witch'].map(id=>get(id,'village')).filter(Boolean),attempt+3);if(defense&&!required.some(r=>r.id===defense.id))required.push(defense)}
    for(const r of required)add(r);
    const others=available.filter(r=>!counts.has(r.id)),extra=Math.min(Math.max(0,specialLimit-required.length),others.length,villageSlots-required.length-1);
    for(let i=0;i<extra;i++){const r=pick(others,attempt+i+7);add(r);others.splice(others.indexOf(r),1)}
    const chosenVillage=[...counts].reduce((sum,[id,count])=>sum+(String(all.get(id)?.factionId||'')==='village'?count:0),0);
    if(chosenVillage>=villageSlots)continue;
    add(villager,villageSlots-chosenVillage);
    const roles=[...counts].map(([id,count])=>({roleId:id,roleName:String(all.get(id).name||id),factionId:String(all.get(id).factionId),count}));
    const village=roles.filter(r=>r.factionId==='village').reduce((s,r)=>s+r.count,0);
    const signature=roles.map(r=>r.roleId+':'+r.count).sort().join('|');
    if(roles.reduce((s,r)=>s+r.count,0)!==n||village<=wolfCount||seen.has(signature))continue;
    return {roles,signature,counts:{village,wolf:wolfCount,third:thirdCount},small:n<6};
  }
  throw Error('Đã hết đội hình khác nhau với thư viện hiện tại; hãy bổ sung Vai Trò.');
}
function gmAutoShowSummary(text=''){const el=document.getElementById('playGameAutoSummary');if(el){el.hidden=!text;el.textContent=text}}
async function gmAutoPreviewGame(){
  try{
    const n=playLiveMembers().length,history=playSceneRuntime.autoGameHistory||[];
    const deck=gmAutoComposeRoles(state.cards||[],n,history);
    playSceneRuntime.autoGameHistory=[...history,deck.signature].slice(-100);
    const cfg={id:'auto-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
      name:'AUTO '+n+' người • '+playSceneRuntime.autoGameHistory.length,playerCount:n,
      roles:deck.roles.map((r,i)=>({roleId:r.roleId,roleName:r.roleName,description:String((state.cards||[]).find(card=>String(card.id)===String(r.roleId))?.information||''),faction:r.factionId==='wolf'?'Phe Sói':r.factionId==='third'?'Phe Ba':'Phe Dân',count:r.count,order:i+1,actionDurationSec:Number(playSceneState.gameTiming?.defaultActionSec??30)})),
      artifactsEnabled:false,artifacts:[],timing:{...playSceneState.gameTiming},artifactLimitPerCycle:3};
    playSceneRuntime.autoGameConfig=cfg;playSceneRuntime.autoGameRoomCode=String(playSceneState.roomCode||'');
    playSceneState.gameTemplateId='';playSceneState.gameName=cfg.name;
    playSceneState.rolePlan=Object.fromEntries(deck.roles.map(r=>[r.roleId,r.count]));
    playSceneState.roleOrders=Object.fromEntries(deck.roles.map((r,i)=>[r.roleId,i+1]));
    playSceneState.roleDurations={};savePlayScene();
    const sel=document.getElementById('playGameTemplateSelect');
    if(sel){let option=sel.querySelector('option[value="__auto__"]');if(!option){option=document.createElement('option');option.value='__auto__';sel.prepend(option)}option.textContent='✨ '+cfg.name;sel.value='__auto__'}
    gmAutoShowSummary('Dân '+deck.counts.village+' • Sói '+deck.counts.wolf+' • Phe Ba '+deck.counts.third+' | '+deck.roles.filter(r=>r.roleId!=='role_villager').map(r=>r.roleName+(r.count>1?' ×'+r.count:'')).join(', ')+(deck.small?' • Phòng ít người: cân bằng hạn chế.':''));
    await renderPlayGameRoles();renderPlayGameRoleTimings();updatePlayGameRoleCount();
  }catch(e){playFlashError(e?.message||'Không tạo được AUTO VÁN.')}
}

function playFactionLabel(role){const f=String(role?.factionId||role?.faction||'').toLowerCase();if(f==='wolf'||f.includes('sói')||f.includes('soi'))return'Phe Sói';if(f==='third'||f.includes('ba')||f.includes('third'))return'Phe Ba';return'Phe Dân'}
function playRolePlanTotal(){return Object.values(playSceneState.rolePlan||{}).reduce((s,v)=>s+Math.max(0,Number(v)||0),0)}
function playSortedRoles(){
  return [...(state.cards||[])].sort((a,b)=>{
    const pa=prefs.cards?.[a.id]||{},pb=prefs.cards?.[b.id]||{},sa=pa.starred?Number(pa.starOrder||999):9999,sb=pb.starred?Number(pb.starOrder||999):9999;
    return sa-sb||String(a.name||'').localeCompare(String(b.name||''),'vi');
  });
}
function playFavoriteArtifacts(){
  return [...(state.artifacts||[])].filter(a=>prefs.artifacts?.[a.id]?.starred).sort((a,b)=>(Number(prefs.artifacts?.[a.id]?.starOrder||9999)-Number(prefs.artifacts?.[b.id]?.starOrder||9999))||String(a.name||'').localeCompare(String(b.name||''),'vi'));
}
function playRememberMatchArtifacts(){
  if(document.querySelector('.play-game-sheet-card')?.dataset.mode!=='play')return;
  playSceneState.matchArtifactSettings={enabled:!!playSceneState.artifactsEnabled,ids:[...(playSceneState.artifactIds||[])],limit:playSceneState.artifactLimitPerCycle??3,seconds:playSceneState.gameTiming?.artifactActionSec??30,earlySeconds:playSceneState.gameTiming?.earlyArtifactSec??30};
}
function playMatchArtifactConfig(){
  const enabled=!!playSceneState.artifactsEnabled;
  return {artifactsEnabled:enabled,
    artifacts:enabled?playTemplateSelectedArtifacts().map((a,i)=>({artifactId:String(a.id),order:i+1})):[],
    artifactLimitPerCycle:Math.max(0,Math.min(30,Math.trunc(Number(playSceneState.artifactLimitPerCycle??3)||0)))};
}
function updatePlayArtifactToggle(){
  const box=document.getElementById('playArtifactsEnabled'),hint=document.getElementById('playArtifactPoolHint'),pool=playAvailableTemplateArtifacts(),selected=playTemplateSelectedArtifacts();
  if(box){box.checked=!!playSceneState.artifactsEnabled;box.disabled=!pool.length;}
  const actionSec=document.getElementById('playArtifactActionSec');if(actionSec)actionSec.disabled=!playSceneState.artifactsEnabled;
  if(hint)hint.textContent=!pool.length?'Chưa có Artifact ★ trong Thư Viện':selected.length+' / '+pool.length+' Artifact đã chọn cho trận này.';
  const readonly=document.getElementById('playTemplateArtifactSummary');
  if(readonly)readonly.textContent=playSceneState.artifactsEnabled
    ?'Artifact: CÓ sử dụng • '+selected.length+' lá cho trận này • '+(playSceneState.artifactLimitPerCycle??3)+' lá mới mỗi Ngày / Đêm'
    :'Artifact: KHÔNG sử dụng trong trận này';
  const controls=document.getElementById('playMatchArtifactSettings');if(controls)controls.hidden=!playSceneState.artifactsEnabled;
  if(document.querySelector('.play-game-sheet-card')?.dataset.mode==='play')renderPlayArtifactPicker();
}
function playTemplateSelectedRoles(){
  const plan=playSceneState.rolePlan||{},orders=playSceneState.roleOrders||{};
  return playSortedRoles().filter(r=>Number(plan[r.id])>0).sort((a,b)=>(Number(orders[a.id]||999)-Number(orders[b.id]||999))||String(a.name||'').localeCompare(String(b.name||''),'vi'));
}
function playTemplateSetCount(id,value){
  const n=Math.max(0,Math.min(20,Math.trunc(Number(value)||0)));
  playSceneState.rolePlan={...(playSceneState.rolePlan||{})};
  if(n)playSceneState.rolePlan[id]=n;else delete playSceneState.rolePlan[id];
  if(n&&!Number(playSceneState.roleOrders?.[id])){
    playSceneState.roleOrders=playSceneState.roleOrders||{};
    playSceneState.roleOrders[id]=Math.max(0,...Object.values(playSceneState.roleOrders).map(Number).filter(Number.isFinite))+1;
  }
  savePlayScene();void renderPlayGameRoles();updatePlayGameRoleCount();
}
function playTemplateMoveRole(id,delta){
  const selected=playTemplateSelectedRoles(),index=selected.findIndex(r=>String(r.id)===String(id)),next=index+delta;
  if(index<0||next<0||next>=selected.length)return;
  const ordered=selected.slice();[ordered[index],ordered[next]]=[ordered[next],ordered[index]];
  playSceneState.roleOrders=playSceneState.roleOrders||{};
  ordered.forEach((role,i)=>{playSceneState.roleOrders[role.id]=i+1});
  savePlayScene();void renderPlayGameRoles();
}
function playTemplateRenderCatalog(){
  const picker=document.getElementById('playGameRolePicker');if(!picker)return;
  const term=String(document.getElementById('playTemplateRoleSearch')?.value||'').trim().toLocaleLowerCase('vi'),
    faction=document.getElementById('playTemplateRoleFaction')?.value||'all',
    starred=!!document.getElementById('playTemplateOnlyStarred')?.checked;
  const roles=playSortedRoles().filter(r=>(!term||(String(r.name||'')+' '+playFactionLabel(r)).toLocaleLowerCase('vi').includes(term))&&(faction==='all'||playFactionLabel(r)===faction)&&(!starred||!!prefs.cards?.[r.id]?.starred));
  // Enforce horizontal scroll at runtime: legacy IPA stylesheets may override the catalog grid.
  const swipeRules={display:'flex',flexDirection:'row',flexWrap:'nowrap',overflowX:'auto',overflowY:'hidden',maxHeight:'none',gridTemplateColumns:'none',touchAction:'pan-x pan-y',webkitOverflowScrolling:'touch'};
  for(const [key,value] of Object.entries(swipeRules))picker.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');
  picker.replaceChildren();
  for(const role of roles){
    const count=Math.max(0,Number(playSceneState.rolePlan?.[role.id])||0),chosen=count>0;
    const button=document.createElement('button');button.type='button';
    button.className='play-template-card'+(chosen?' is-picked':'');
    button.style.setProperty('flex','0 0 112px','important');
    button.style.setProperty('width','112px','important');
    button.style.setProperty('max-width','112px','important');
    button.setAttribute('aria-pressed',String(chosen));
    button.setAttribute('aria-label',(chosen?'Bỏ chọn ':'Chọn ')+String(role.name||'Vai Trò'));
    button.innerHTML='<span class="play-template-artwork"><img loading="lazy" alt=""><span class="play-template-select-indicator" aria-hidden="true">'+(chosen?'✓':'+')+'</span></span><span class="play-template-card-name">'+playEsc(role.name||'Vai Trò')+'</span>';
    const img=button.querySelector('img');
    void resolveArtwork('cards',role.id,'thumb').then(url=>{if(img.isConnected)img.src=url||'default-artwork.webp'}).catch(()=>{if(img.isConnected)img.src='default-artwork.webp'});
    img.onerror=()=>{img.onerror=null;img.src='default-artwork.webp'};
    button.onclick=()=>playTemplateSetCount(role.id,chosen?0:1);
    picker.appendChild(button);
  }
  if(!roles.length)picker.innerHTML='<p class="play-template-help">Không tìm thấy lá bài. Hãy bỏ chọn bộ lọc ★ hoặc chọn tất cả phe.</p>';
}
async function renderPlayGameRoles(){
  const list=document.getElementById('playGameRoleList');if(!list)return;list.replaceChildren();
  playSceneState.roleOrders=playSceneState.roleOrders||{};
  playTemplateRenderCatalog();
  const roles=playTemplateSelectedRoles();
  for(let i=0;i<roles.length;i++){
    const role=roles[i],count=Math.max(1,Number(playSceneState.rolePlan?.[role.id])||1),
      order=Math.max(1,Math.min(99,Number(playSceneState.roleOrders?.[role.id])||i+1));
    const row=document.createElement('div');row.className='play-template-selected-row';row.dataset.roleId=role.id;
    row.innerHTML='<div class="play-template-role-identity"><img class="play-template-selected-thumb" loading="lazy" alt=""><div class="play-game-role-copy"><b>'+playEsc(role.name||'Vai Trò')+'</b><small>'+playEsc(playFactionLabel(role))+'</small></div></div><div class="play-template-role-values"><label>Số lá<input data-role-count type="number" inputmode="numeric" min="1" max="20" value="'+count+'"></label><label>Thứ tự<input data-role-order type="number" inputmode="numeric" min="1" max="99" value="'+order+'"></label><div class="play-template-arrows"><button type="button" data-move-up aria-label="Đưa lên">↑</button><button type="button" data-move-down aria-label="Đưa xuống">↓</button></div><button type="button" data-role-remove aria-label="Bỏ vai khỏi Ván Mẫu">×</button></div>';
    const img=row.querySelector('img');
    void resolveArtwork('cards',role.id,'thumb').then(url=>{if(img.isConnected)img.src=url||'default-artwork.webp'}).catch(()=>{if(img.isConnected)img.src='default-artwork.webp'});
    img.onerror=()=>{img.onerror=null;img.src='default-artwork.webp'};
    row.querySelector('[data-role-count]').onchange=e=>playTemplateSetCount(role.id,e.target.value);
    row.querySelector('[data-role-order]').onchange=e=>{playSceneState.roleOrders[role.id]=Math.max(1,Math.min(99,Number(e.target.value)||1));savePlayScene();void renderPlayGameRoles()};
    row.querySelector('[data-role-remove]').onclick=()=>playTemplateSetCount(role.id,0);
    row.querySelector('[data-move-up]').onclick=()=>playTemplateMoveRole(role.id,-1);
    row.querySelector('[data-move-down]').onclick=()=>playTemplateMoveRole(role.id,1);
    row.querySelector('[data-move-up]').disabled=i===0;row.querySelector('[data-move-down]').disabled=i===roles.length-1;
    list.appendChild(row);
  }
  if(!roles.length)list.innerHTML='<div class="member-empty">Chưa chọn vai trò. Chạm vào ảnh một Lá Bài phía trên để thêm vào ván.</div>';
  renderPlayGameRoleTimings();
}
function playRoleDurationSec(roleId,defaultSec){
  const values=playSceneState.roleDurations||{};
  const own=Object.prototype.hasOwnProperty.call(values,String(roleId));
  const seconds=own?values[String(roleId)]:defaultSec;
  return Math.max(0,Math.min(3600,Math.trunc(Number(seconds)||0)));
}
function renderPlayGameRoleTimings(){
  const list=document.getElementById('playGameRoleTimingList');if(!list)return;
  list.hidden=false;list.replaceChildren();
  const roles=playTemplateSelectedRoles();
  const defaultSec=Math.max(0,Math.min(3600,Math.trunc(Number(document.getElementById('playDefaultActionSec')?.value??playSceneState.gameTiming?.defaultActionSec??30)||0)));
  for(const role of roles){
    const roleId=String(role.id),custom=Object.prototype.hasOwnProperty.call(playSceneState.roleDurations||{},roleId);
    const row=document.createElement('label');row.className='play-template-role-timing'+(custom?' is-custom':'');
    row.innerHTML='<span>'+playEsc(role.name||'Vai Trò')+' (giây):</span><span class="play-role-time-input"><input type="number" inputmode="numeric" min="0" max="3600" value="'+playRoleDurationSec(roleId,defaultSec)+'" aria-label="Thời gian sử dụng '+playEsc(role.name||'Vai Trò')+' (giây)"></span>';
    row.querySelector('input').onchange=e=>{
      const value=Math.max(0,Math.min(3600,Math.trunc(Number(e.target.value)||0)));
      const customTimes={...(playSceneState.roleDurations||{})};
      if(value===defaultSec)delete customTimes[roleId];else customTimes[roleId]=value;
      playSceneState.roleDurations=customTimes;savePlayScene();renderPlayGameRoleTimings();
    };
    list.appendChild(row);
  }
  if(!roles.length)list.innerHTML='<p class="play-template-help">Hãy chọn một Ván Mẫu để thiết lập thời gian riêng.</p>';
}
function playAvailableTemplateArtifacts(){
  const favorites=playFavoriteArtifacts(),byId=new Map(favorites.map(a=>[String(a.id),a]));
  const library=new Map((state.artifacts||[]).map(a=>[String(a.id),a]));
  for(const id of (playSceneRuntime.templateArtifactPoolIds||[])){
    const card=library.get(String(id));
    if(card&&!byId.has(String(id)))byId.set(String(id),card);
  }
  for(const selected of playTemplateSelectedArtifacts())if(!byId.has(String(selected.id)))byId.set(String(selected.id),selected);
  return [...byId.values()];
}
function playTemplateSelectedArtifacts(){
  // An Artifact saved in a template remains eligible even when it is not starred locally.
  const selectedIds=[...new Set(Array.isArray(playSceneState.artifactIds)?playSceneState.artifactIds.map(String):[])];
  const library=new Map((state.artifacts||[]).map(a=>[String(a.id),a]));
  return selectedIds.map(id=>library.get(id)).filter(Boolean);
}
function renderPlayArtifactPicker(){
  const picker=document.getElementById('playGameArtifactPicker');if(!picker)return;
  picker.replaceChildren();
  const pool=playAvailableTemplateArtifacts(),selected=new Set((playSceneState.artifactIds||[]).map(String));
  picker.hidden=false;
  for(const artifact of pool){
    const active=selected.has(String(artifact.id)),button=document.createElement('button');
    button.type='button';button.className='play-template-card'+(active?' is-picked':'');
    button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',(active?'Bỏ chọn ':'Chọn ')+String(artifact.name||'Artifact'));
    button.innerHTML='<span class="play-template-artwork"><img loading="lazy" alt=""><span class="play-template-select-indicator" aria-hidden="true">'+(active?'✓':'+')+'</span></span><span class="play-template-card-name">'+playEsc(artifact.name||'Artifact')+'</span>';
    const img=button.querySelector('img');
    void resolveArtwork('artifacts',artifact.id,'thumb').then(url=>{if(img.isConnected)img.src=url||'default-artwork.webp'}).catch(()=>{if(img.isConnected)img.src='default-artwork.webp'});
    img.onerror=()=>{img.onerror=null;img.src='default-artwork.webp'};
    button.onclick=()=>{const next=new Set((playSceneState.artifactIds||[]).map(String));if(next.has(String(artifact.id)))next.delete(String(artifact.id));else next.add(String(artifact.id));playSceneState.artifactIds=[...next];playRememberMatchArtifacts();savePlayScene();updatePlayArtifactToggle()};
    picker.appendChild(button);
  }
  if(!pool.length)picker.innerHTML='<p class="play-template-help">Chưa có Artifact ★. Hãy đánh dấu trong Thư Viện trước.</p>';
}

function updatePlayGameRoleCount(){
  const mode=document.querySelector('.play-game-sheet-card')?.dataset.mode||'play',need=playLiveMembers().length,total=playRolePlanTotal(),el=document.getElementById('playGameRoleCount');if(el){el.textContent=total+' lá • '+playTemplateSelectedRoles().length+' vai';el.style.color='#fff1a5'} const review=document.getElementById('playTemplatePlaySummary');if(review)review.textContent=total+' lá cho '+need+' người • '+(total===need?'Đủ số lượng':'Không khớp số người');const summary=document.getElementById('playTemplateTeamSummary');if(summary&&mode==='library'){const roles=playTemplateSelectedRoles(),counts={'Phe Dân':0,'Phe Sói':0,'Phe Ba':0};for(const role of roles)counts[playFactionLabel(role)]+=Number(playSceneState.rolePlan[role.id])||0;summary.innerHTML='<span><b>'+total+'</b>Tổng vai</span><span><b>'+counts['Phe Dân']+'</b>Dân</span><span><b>'+counts['Phe Sói']+'</b>Sói</span><span><b>'+counts['Phe Ba']+'</b>Phe Ba</span>'}
}
async function migrateV109GameTemplates(){
  if(localStorage.getItem('GMWW_V263_TEMPLATE_MIGRATION_DONE')==='1')return;
  const buckets=[];
  for(const key of ['GMWW_V109_GAME_TEMPLATES','GMWW_V1_09_GAME_TEMPLATES','GMWW_V109_STATE','GMWW_V1_09_STATE']){
    try{const raw=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(raw))buckets.push(...raw);else if(raw&&typeof raw==='object'){for(const k of ['gameTemplates','templates','sampleGames','games'])if(Array.isArray(raw[k]))buckets.push(...raw[k])}}catch{}
  }
  for(const item of buckets){
    try{const cfg=item?.compiledConfig||item?.gameConfig||item;if(!cfg||!Array.isArray(cfg.roles)||!cfg.roles.length)continue;const id=String(item?.id||cfg.id||('v109-'+Math.random().toString(36).slice(2,10))),name=String(item?.name||cfg.name||'Ván Mẫu V1.09').slice(0,48);await gmApi('/api/gm/game-templates',{method:'PUT',body:JSON.stringify({id,gameConfig:{...cfg,id,name}})})}catch{}
  }
  localStorage.setItem('GMWW_V263_TEMPLATE_MIGRATION_DONE','1');
}
async function loadPlayGameTemplates(){
  try{await migrateV109GameTemplates();const data=await gmApi('/api/gm/game-templates');playSceneRuntime.gameTemplates=Array.isArray(data?.templates)?data.templates:[]}catch(err){playSceneRuntime.gameTemplates=[];playGameStatus('Không tải được danh sách Ván Mẫu: '+String(err?.message||'Lỗi kết nối'),'error')}
  const sel=document.getElementById('playGameTemplateSelect'),mode=document.querySelector('.play-game-sheet-card')?.dataset.mode||'play';if(sel){const need=playLiveMembers().length,ordered=mode==='play'?gmAutoRankTemplates(playSceneRuntime.gameTemplates,need):playSceneRuntime.gameTemplates;sel.innerHTML=(mode==='library'?'<option value="">Tạo Ván Mẫu mới</option>':'<option value="">Chọn Ván Mẫu</option>')+ordered.map(x=>{const count=Number(x.playerCount||0),badge=mode==='play'?(count===need?' ✓ PHÙ HỢP':' • chênh '+Math.abs(count-need)+' người'):'';return '<option value="'+playEsc(x.id)+'">'+playEsc(x.name)+' • '+count+' người'+badge+'</option>'}).join('');if(mode==='play'&&playSceneRuntime.autoGameConfig?.playerCount===need&&playSceneRuntime.autoGameRoomCode===String(playSceneState.roomCode||''))sel.insertAdjacentHTML('afterbegin','<option value="__auto__">✨ '+playEsc(playSceneRuntime.autoGameConfig.name)+'</option>');sel.value=playSceneState.gameTemplateId||(mode==='play'&&playSceneRuntime.autoGameConfig?.playerCount===need&&playSceneRuntime.autoGameRoomCode===String(playSceneState.roomCode||'')?'__auto__':'')}
  renderGameTemplateLibrary();
}
function readLegacyTemplatesForExport(){
  const out=[];
  for(const key of ['GMWW_V109_GAME_TEMPLATES','GMWW_V1_09_GAME_TEMPLATES','GMWW_V109_STATE','GMWW_V1_09_STATE']){
    let raw=null;try{raw=JSON.parse(localStorage.getItem(key)||'null')}catch{continue}
    const buckets=Array.isArray(raw)?raw:(raw&&typeof raw==='object'?['gameTemplates','templates','sampleGames','games'].flatMap(k=>Array.isArray(raw[k])?raw[k]:[]):[]);
    for(const item of buckets){const cfg=item?.compiledConfig||item?.gameConfig||item;if(!cfg||!Array.isArray(cfg.roles)||!cfg.roles.length)continue;out.push({id:String(item?.id||cfg.id||''),name:String(item?.name||cfg.name||''),roleCount:cfg.roles.length,source:key})}
  }
  return out;
}
async function readIndexedDbForExport(){
  const names=[];
  try{for(const d of (await indexedDB.databases())||[]){if(d?.name&&String(d.name).startsWith('GMWW'))names.push(String(d.name))}}catch{}
  if(!names.length)names.push('GMWW_ASSETS_921','GMWW_THEME_ASSETS_946','GMWW_THEME_UI_987','GMWW_MATCH_CACHE_933','GMWW_AUDIO_LIBRARY','GMWW_V208_THEME_ASSETS');
  const out=[];
  for(const name of names){
    const entry={name,stores:{},error:''};
    try{
      const db=await new Promise((res,rej)=>{const r=indexedDB.open(name);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('không mở được'));r.onupgradeneeded=()=>{try{r.transaction.abort()}catch{}}});
      for(const storeName of Array.from(db.objectStoreNames)){
        const rows=await new Promise((res,rej)=>{const tx=db.transaction(storeName,'readonly');const st=tx.objectStore(storeName);const k=st.getAllKeys(),v=st.getAll();tx.oncomplete=()=>res({keys:k.result,values:v.result});tx.onerror=()=>rej(tx.error||new Error('đọc lỗi'));tx.onabort=()=>rej(tx.error||new Error('đọc bị hủy'))});
        entry.stores[storeName]=rows.keys.map((key,i)=>({key:globalThis.gmwwJsonSafe(key),value:globalThis.gmwwJsonSafe(rows.values[i])}));
      }
      db.close();
    }catch(err){entry.error=String(err?.message||err)}
    out.push(entry);
  }
  return out;
}
// Shows the export inside the app instead of downloading a file: blob downloads
// blank the iPhone WebView, so the user shares or copies the text directly.
function showLocalExportViewer(text,filename,summaryText){
  document.getElementById('gmwwExportOverlay')?.remove();
  const wrap=document.createElement('div');wrap.id='gmwwExportOverlay';
  wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;padding:14px;gap:10px;box-sizing:border-box';
  const head=document.createElement('div');head.style.cssText='color:#fff;font-size:14px;line-height:1.4';
  head.textContent=summaryText+' Nhấn CHIA SẺ hoặc SAO CHÉP để gửi dữ liệu.';
  const area=document.createElement('textarea');area.readOnly=true;area.value=text;
  area.style.cssText='flex:1;width:100%;min-height:0;font:11px/1.35 monospace;background:#111;color:#eee;border:1px solid #444;border-radius:8px;padding:8px;box-sizing:border-box';
  const row=document.createElement('div');row.style.cssText='display:flex;gap:8px';
  const mk=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='flex:1;padding:14px;border-radius:10px;border:0;font-weight:700;font-size:15px';b.onclick=fn;return b};
  const makeFile=()=>new File([text],filename,{type:'application/json'});
  row.append(
    mk('CHIA SẺ',async()=>{
      try{
        const file=makeFile();
        if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:filename});return}
        if(navigator.share){await navigator.share({title:filename,text});return}
        alert('Thiết bị này không hỗ trợ chia sẻ. Hãy dùng SAO CHÉP.');
      }catch(err){if(err?.name!=='AbortError')alert('Không chia sẻ được: '+String(err?.message||err))}
    }),
    mk('SAO CHÉP',async()=>{
      try{await navigator.clipboard.writeText(text);alert('Đã sao chép. Dán vào tin nhắn để gửi.')}
      catch{area.focus();area.select();let ok=false;try{ok=document.execCommand('copy')}catch{}alert(ok?'Đã sao chép.':'Chạm giữ trong ô để chọn tất cả rồi sao chép.')}
    }),
    mk('ĐÓNG',()=>wrap.remove())
  );
  wrap.append(head,area,row);document.body.appendChild(wrap);
}
async function exportLocalGameData(){
  const btn=document.getElementById('exportLocalData'),label=btn?.querySelector('b');
  try{
    if(btn){btn.disabled=true;if(label)label.textContent='ĐANG XUẤT…'}
    const entries=[];
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);entries.push({key,value:localStorage.getItem(key)})}
    const legacyTemplates=readLegacyTemplatesForExport();
    const indexedDB=await readIndexedDbForExport();
    let serverTemplates=[],serverError='';
    try{
      const list=await gmApi('/api/gm/game-templates');
      for(const t of list?.templates||[]){
        const id=String(t?.id||'');if(!id)continue;
        try{const d=await gmApi('/api/gm/game-templates/'+encodeURIComponent(id));serverTemplates.push(d?.template||{id,error:'TEMPLATE_EMPTY'})}
        catch(err){serverTemplates.push({id,error:String(err?.message||err)})}
      }
    }catch(err){serverError='Không đọc được danh sách Ván Mẫu trên server: '+String(err?.message||err)}
    let serverArtifacts=null;
    try{serverArtifacts=await gmApi('/api/gm/artifacts/shared')}catch(err){serverArtifacts={error:String(err?.message||err)}}
    const payload=globalThis.gmwwBuildLocalExport({localStorage:entries,indexedDB,serverTemplates,legacyTemplates,serverArtifacts,serverError,app:'GMWW '+VERSION});
    const s=payload.summary;
    const summaryText='Đã xuất: '+s.localStorageKeys+' khóa local, '+s.indexedDbDatabases+' kho IndexedDB, '+s.legacyTemplatesUnsynced+' Ván Mẫu chưa đồng bộ, '+s.errors+' lỗi.';
    showLocalExportViewer(JSON.stringify(payload,null,2),'gmww-local-export-'+new Date().toISOString().slice(0,10)+'.json',summaryText);
  }catch(err){alert('Xuất dữ liệu thất bại: '+String(err?.message||err))}
  finally{if(btn){btn.disabled=false;if(label)label.textContent='XUẤT DỮ LIỆU CHƯA ĐỒNG BỘ'}}
}
function renderGameTemplateLibrary(){
  const box=document.getElementById('gameTemplateLibraryList');if(!box)return;box.innerHTML='';
  if(!playSceneRuntime.gameTemplates.length){box.innerHTML='<div class="member-empty">Chưa có Ván Mẫu. Nhấn + để tạo trước khi chơi.</div>';return}
  for(const t of playSceneRuntime.gameTemplates){const b=document.createElement('button');b.type='button';b.className='template-library-item';b.innerHTML='<b>'+playEsc(t.name||'Ván Mẫu')+'</b><small>'+Number(t.playerCount||0)+' người • chạm để sửa</small>';b.onclick=()=>openLibraryGameTemplate(String(t.id||''));box.appendChild(b)}
}
async function applyPlayGameTemplate(id){
  const matchMode=document.querySelector?.('.play-game-sheet-card')?.dataset.mode==='play';
  const matchSettings=matchMode?playSceneState.matchArtifactSettings:null;
  id=String(id||'');if(!id){playSceneRuntime.templateArtifactPoolIds=[];playSceneState.gameTemplateId='';playSceneState.rolePlan={};playSceneState.roleDurations={};playSceneState.roleOrders={};await renderPlayGameRoles();updatePlayGameRoleCount();return}
  try{
    const data=id==='__auto__'?{template:{gameConfig:playSceneRuntime.autoGameConfig}}:await gmApi('/api/gm/game-templates/'+encodeURIComponent(id)),cfg=data?.template?.compiledConfig||data?.template?.gameConfig||null;if(!cfg)throw new Error('Ván Mẫu chưa tải được dữ liệu. Vui lòng thử lại.');
    playSceneState.gameTemplateId=id==='__auto__'?'':id;playSceneState.gameName=String(cfg.name||'Ván GMWW');playSceneState.rolePlan={};playSceneState.roleDurations={};playSceneState.roleOrders={};
    for(const r of (cfg.roles||[])){if(r?.roleId){playSceneState.rolePlan[String(r.roleId)]=Math.max(0,Number(r.count)||0);playSceneState.roleOrders[String(r.roleId)]=Math.max(1,Number(r.order)||1);const commonSec=Math.max(0,Math.min(3600,Number(cfg?.timing?.defaultActionSec??30)||0)),individualSec=Math.max(0,Math.min(3600,Number(r.actionDurationSec??commonSec)||0));if(individualSec!==commonSec)playSceneState.roleDurations[String(r.roleId)]=individualSec}}
    const templateArtifactIds=(cfg.artifacts||[]).map(a=>String(a.artifactId||'')).filter(Boolean);
    playSceneRuntime.templateArtifactPoolIds=templateArtifactIds;
    // Saved game configuration must be authoritative. ★ is only the editor's new-template default.
    playSceneState.artifactsEnabled=cfg.artifactsEnabled===true
      ||(cfg.artifactsEnabled!==false&&templateArtifactIds.length>0);
    playSceneState.artifactIds=templateArtifactIds;
    playSceneState.gameTiming={villageDiscussionSec:Math.max(0,Number(cfg?.timing?.villageDiscussionSec??300)||0),gallowsNominationSec:Math.max(1,Number(cfg?.timing?.gallowsNominationSec??60)||60),gallowsVoteSec:Math.max(1,Number(cfg?.timing?.gallowsVoteSec??60)||60),wolfDiscussionSec:Math.max(0,Number(cfg?.timing?.wolfDiscussionSec??30)||0),earlyArtifactSec:30,defaultActionSec:Math.max(0,Number(cfg?.timing?.defaultActionSec??30)||0),artifactActionSec:Math.max(0,Number(cfg?.timing?.artifactActionSec??30)||0),autoAdvance:cfg?.timing?.autoAdvance!==false};playSceneState.artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number(cfg?.artifactLimitPerCycle??3)||0)));savePlayScene();
    if(matchMode){
      const settings=matchSettings||{enabled:playSceneState.artifactsEnabled,ids:templateArtifactIds.length?templateArtifactIds:playFavoriteArtifacts().map(a=>String(a.id)),limit:playSceneState.artifactLimitPerCycle,seconds:playSceneState.gameTiming.artifactActionSec,earlySeconds:30};
      playSceneState.artifactsEnabled=!!settings.enabled;
      playSceneState.artifactIds=[...settings.ids];
      playSceneState.artifactLimitPerCycle=settings.limit;
      playSceneState.gameTiming.artifactActionSec=settings.seconds;
      playSceneState.gameTiming.earlyArtifactSec=settings.earlySeconds;
      playSceneState.matchArtifactSettings={...settings,ids:[...settings.ids]};savePlayScene();
    }
    const name=document.getElementById('playGameName');if(name)name.value=playSceneState.gameName;const v=document.getElementById('playVillageDiscussionSec'),w=document.getElementById('playWolfDiscussionSec'),d=document.getElementById('playDefaultActionSec'),a=document.getElementById('playAutoAdvance');if(v)v.value=playSceneState.gameTiming.villageDiscussionSec;
    const nominationInput=document.getElementById('playGallowsNominationSec'),voteInput=document.getElementById('playGallowsVoteSec');
    if(nominationInput)nominationInput.value=playSceneState.gameTiming.gallowsNominationSec;
    if(voteInput)voteInput.value=playSceneState.gameTiming.gallowsVoteSec;
    if(w)w.value=playSceneState.gameTiming.wolfDiscussionSec;if(d)d.value=playSceneState.gameTiming.defaultActionSec;const artifactSec=document.getElementById('playArtifactActionSec');if(artifactSec)artifactSec.value=playSceneState.gameTiming.artifactActionSec;const earlySec=document.getElementById('playEarlyArtifactSec');if(earlySec)earlySec.value=playSceneState.gameTiming.earlyArtifactSec;if(a)a.checked=playSceneState.gameTiming.autoAdvance;const quota=document.getElementById('playArtifactLimitPerCycle');if(quota)quota.value=String(playSceneState.artifactLimitPerCycle);
    updatePlayArtifactToggle();await renderPlayGameRoles();renderPlayGameRoleTimings();updatePlayGameRoleCount();
  }catch(err){playFlashError(err.message)}
}
async function openPlayGameSheet(){
  const openSeq=++playGameSheetOpenSeq;
  playGameStatus('');
  if(!isLivePlayRoom()){await playCreateRoom();return}if(!playLiveMembers().length){setPlayStep('members');if(playSceneRuntime.room?.demo===true||playSceneState.roomMode==='offline')openPlayRosterSheet();return}
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card');if(!sheet||!card)return;card.dataset.mode='play';const autoArea=document.querySelector('.play-auto-game-area');if(autoArea)autoArea.hidden=false;
  const title=card.querySelector('.sheet-head h3');if(title)title.textContent='Chọn Ván Mẫu';const roomLabel=document.getElementById('playGameRoomLabel');if(roomLabel)roomLabel.textContent='Phòng '+playSceneState.roomCode+' • '+playLiveMembers().length+' Người Chơi';const save=document.getElementById('playGameSave');if(save)save.textContent='CHỌN VÁN';const del=document.getElementById('playGameDelete');if(del)del.hidden=true;
  const back=document.getElementById('playGameTemplateBack');if(back)back.hidden=true;
  for(const detailId of ['playGameTimingDetails','playRoleTimingDetails']){const detail=document.getElementById(detailId);if(detail)detail.open=false}
  // Render the only template sheet AFTER hydration to avoid a flash of stale UI.
  sheet.classList.add('hidden');await loadPlayGameTemplates();
  if(openSeq!==playGameSheetOpenSeq||card.dataset.mode!=='play')return;
  const sel=document.getElementById('playGameTemplateSelect');if(sel){
    sel.onchange=e=>{if(e.target.value!=='__auto__')gmAutoShowSummary('');void applyPlayGameTemplate(e.target.value)};
    if(sel.value!=='__auto__'){const count=playLiveMembers().length,first=gmAutoRankTemplates(playSceneRuntime.gameTemplates,count)[0],selected=playSceneRuntime.gameTemplates.find(t=>String(t.id)===sel.value);if(first&&(!selected||Math.abs(Number(selected.playerCount||0)-count)>Math.abs(Number(first.playerCount||0)-count)))sel.value=String(first.id)}
    // Always rehydrate the SELECTED template rather than reusing another template's stale draft.
    if(sel.value)await applyPlayGameTemplate(sel.value);
  }if(openSeq!==playGameSheetOpenSeq||card.dataset.mode!=='play')return;
  renderPlayGameRoleTimings();updatePlayArtifactToggle();updatePlayGameRoleCount();
  sheet.classList.remove('hidden');gmwwGameSheetSetFloating(true);
}
let playGameSheetOpenSeq=0;
let playGameReturnToSelection=false;
async function openLibraryGameTemplate(id=''){
  ++playGameSheetOpenSeq;
  playGameStatus('');
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card');if(!sheet||!card)return;card.dataset.mode='library';const autoArea=document.querySelector('.play-auto-game-area');if(autoArea)autoArea.hidden=true;gmAutoShowSummary('');const title=card.querySelector('.sheet-head h3');if(title)title.textContent='Thiết kế Ván Mẫu';const label=document.getElementById('playGameRoomLabel');if(label)label.textContent='Thư Viện • lưu trước khi vào Phòng';const save=document.getElementById('playGameSave');if(save)save.textContent='LƯU';const del=document.getElementById('playGameDelete');if(del)del.hidden=!id;
  const back=document.getElementById('playGameTemplateBack');if(back)back.hidden=!playGameReturnToSelection;
  if(!id){playSceneState.gameTemplateId='';playSceneState.gameName='Ván GMWW';playSceneState.rolePlan={};playSceneState.roleDurations={};playSceneState.roleOrders={};playSceneState.artifactsEnabled=playFavoriteArtifacts().length>0;playSceneState.artifactIds=playFavoriteArtifacts().map(a=>String(a.id));playSceneState.artifactLimitPerCycle=3;playSceneState.gameTiming={villageDiscussionSec:300,gallowsNominationSec:60,gallowsVoteSec:60,wolfDiscussionSec:30,earlyArtifactSec:30,defaultActionSec:30,artifactActionSec:30,autoAdvance:true};const v=document.getElementById('playVillageDiscussionSec'),w=document.getElementById('playWolfDiscussionSec'),d=document.getElementById('playDefaultActionSec'),a=document.getElementById('playAutoAdvance'),quota=document.getElementById('playArtifactLimitPerCycle');if(v)v.value=300;
    const nominationInput=document.getElementById('playGallowsNominationSec'),voteInput=document.getElementById('playGallowsVoteSec');
    if(nominationInput)nominationInput.value=10;
    if(voteInput)voteInput.value=10;
    if(w)w.value=30;const earlySec=document.getElementById('playEarlyArtifactSec');if(earlySec)earlySec.value=30;if(d)d.value=30;const artifactSec=document.getElementById('playArtifactActionSec');if(artifactSec)artifactSec.value=30;if(a)a.checked=true;if(quota)quota.value=3}
  gmwwGameSheetSetFloating(false);sheet.classList.remove('hidden');await loadPlayGameTemplates();const sel=document.getElementById('playGameTemplateSelect');if(sel){sel.onchange=e=>{const v=e.target.value;if(v)applyPlayGameTemplate(v);else openLibraryGameTemplate('')};sel.value=id||''}if(id){await applyPlayGameTemplate(id);const del=document.getElementById('playGameDelete');if(del)del.hidden=false}else{document.getElementById('playGameName').value='Ván GMWW';await renderPlayGameRoles();updatePlayGameRoleCount()}
  updatePlayArtifactToggle();
}
function closePlayGameSheet(){++playGameSheetOpenSeq;document.getElementById('playGameSheet')?.classList.add('hidden');gmwwGameSheetSetFloating(false)}
function suggestPlayGameRoles(){
  const mode=document.querySelector('.play-game-sheet-card')?.dataset.mode||'play',need=mode==='library'?Math.max(1,playRolePlanTotal()||12):playLiveMembers().length,roles=playSortedRoles();playSceneState.rolePlan={};for(let i=0;i<need&&i<roles.length;i++)playSceneState.rolePlan[roles[i].id]=(playSceneState.rolePlan[roles[i].id]||0)+1;savePlayScene();renderPlayGameRoles();updatePlayGameRoleCount();
}
async function savePlayGame(){
  if(playSceneRuntime.busy)return;
  playGameStatus('');
  const card=document.querySelector('.play-game-sheet-card'),mode=card?.dataset.mode||'play',clamp=x=>Math.max(0,Math.min(3600,Number(x)||0));
  if(mode==='play'){
    const id=String(document.getElementById('playGameTemplateSelect')?.value||'');
    if(id==='__auto__'&&(!playSceneRuntime.autoGameConfig||playSceneRuntime.autoGameRoomCode!==String(playSceneState.roomCode||''))){playFlashError('Hãy tạo lại AUTO VÁN.');return}
    if(!id){playFlashError('Hãy chọn Ván Mẫu đã lưu trong Thư Viện.');return}
    const total=playRolePlanTotal(),need=playLiveMembers().length;
    if(total!==need){playFlashError('Ván Mẫu có '+total+' lá, nhưng phòng có '+need+' người. Hãy chọn Ván Mẫu phù hợp.');return}
    const timing={
      villageDiscussionSec:clamp(document.getElementById('playVillageDiscussionSec')?.value),
      gallowsNominationSec:Math.max(1,clamp(document.getElementById('playGallowsNominationSec')?.value??10)||10),
      gallowsVoteSec:Math.max(1,clamp(document.getElementById('playGallowsVoteSec')?.value??10)||10),
      wolfDiscussionSec:clamp(document.getElementById('playWolfDiscussionSec')?.value),
      earlyArtifactSec:clamp(document.getElementById('playEarlyArtifactSec')?.value??30),
      defaultActionSec:clamp(document.getElementById('playDefaultActionSec')?.value),
      artifactActionSec:clamp(document.getElementById('playArtifactActionSec')?.value),
      autoAdvance:!!document.getElementById('playAutoAdvance')?.checked
    };
    playSceneState.gameTiming=timing;
    playSetBusy(true);
    const chooseButton=document.getElementById('playGameSave');
    if(chooseButton){chooseButton.disabled=true;chooseButton.textContent='ĐANG NẠP VÁN…'}
    try{
      playGameStatus('Đang xác thực Ván Mẫu và các lá bài…','progress');
      const autoId=id==='__auto__'?String(playSceneRuntime.autoGameConfig.id):id;
      const template=id==='__auto__'?await gmApi('/api/gm/game-templates',{method:'PUT',body:JSON.stringify({id:autoId,gameConfig:playSceneRuntime.autoGameConfig})}):await gmApi('/api/gm/game-templates/'+encodeURIComponent(id));
      const base=template?.template?.compiledConfig||template?.template?.gameConfig;
      if(!base)throw new Error('Không tải được Ván Mẫu.');
      const missingRoles=(base.roles||[]).filter(r=>!(state.cards||[]).some(card=>String(card.id)===String(r.roleId)));
      if(missingRoles.length)throw new Error('Thiếu '+missingRoles.length+' Lá Vai Trò trong Thư Viện. Vui lòng đồng bộ Bộ Bài rồi thử lại.');
      await playEnsureTemplateAssets(autoId,base);
      playGameStatus('Đang chuẩn bị cấu hình và Artwork cho trận…','progress');
      const artifactConfig=playMatchArtifactConfig();
      if(artifactConfig.artifactsEnabled&&!artifactConfig.artifacts.length)
        throw new Error('Hãy chọn ít nhất một Artifact hoặc tắt Artifact cho trận này.');
      const configured={
        ...base,
        roles:(base.roles||[]).map(r=>({...r,actionDurationSec:playRoleDurationSec(r.roleId,timing.defaultActionSec)})),
        timing,...artifactConfig
      };
      // V3.71: register lightweight references to ALL canonical role images.
      // The Server owns the packaged bytes; never transfer images to each room.
      const templateAssets=playTemplateAssetIds(base);
      playGameStatus('Đang liên kết '+templateAssets.length+' lá Vai Trò đã lưu trên Server…','progress');
      const prepared=await playRoomApi('/template-assets',{method:'POST',timeoutMs:20000,
        body:JSON.stringify({templateId:autoId,assetIds:templateAssets})});
      if(prepared?.ready!==true||prepared?.mode!=='reference'||!templateAssets.every(assetId=>prepared.assetIds?.includes(assetId)))
        throw new Error('Artwork Ván Mẫu chưa liên kết xong. Vui lòng kiểm tra kho Vai Trò.');
      playGameStatus('Đang xác thực Artwork và lưu cấu hình phòng…','progress');
      await playPreloadSelectedArtwork(configured);
      const matchId='match-'+Date.now().toString(36);
      const data=await playRoomApi('/config',{method:'POST',body:JSON.stringify({
        gameConfig:configured,matchId,matchRevision:Number(playSceneRuntime.room?.matchRevision||0)+1
      })});
      if(data?.ok!==true)throw new Error('Server chưa xác nhận lưu cấu hình Ván.');
      playSceneRuntime.gameConfig=data.gameConfig||configured;
      playSceneRuntime.room=data.room||playSceneRuntime.room;
      playGameStatus('Đang đồng bộ bước Phân Vai…','progress');
      if(!(await playPublishStage('roles')))throw new Error('Server chưa xác nhận chuyển sang Phân Vai. Hãy thử chọn lại.');
      playSceneState.gameTemplateId=autoId;
      playSceneState.gameName=configured.name||'Ván GMWW';
      playSceneState.matchId=matchId;
      playSceneState.assignmentsPreview=[];
      playSceneState.step='roles';
      savePlayScene();closePlayGameSheet();
      try{playBuildAssignments({random:true})}catch(err){playFlashError(err.message);renderPlayScene()}

    }catch(err){playFlashError(err?.message||'Chưa thể chọn Ván Mẫu. Vui lòng thử lại.')}finally{
      playSetBusy(false);
      if(chooseButton){chooseButton.disabled=false;chooseButton.textContent='CHỌN VÁN'}
    }
    return;
  }
  const total=playRolePlanTotal();if(total<1){playFlashError('Ván Mẫu phải có ít nhất một Lá Bài được chọn.');return}
  const roles=playSortedRoles().filter(r=>Number(playSceneState.rolePlan?.[r.id])>0);
  const chosen=roles.map((r,i)=>({roleId:r.id,roleName:r.name,faction:playFactionLabel(r),
    description:r.information||'',count:Math.max(1,Number(playSceneState.rolePlan[r.id])||1),
    order:Math.max(1,Number(playSceneState.roleOrders?.[r.id])||i+1),
    actionDurationSec:playRoleDurationSec(r.id,playSceneState.gameTiming?.defaultActionSec??30)})).sort((a,b)=>a.order-b.order);
  const gameName=(document.getElementById('playGameName')?.value.trim()||'Ván GMWW').slice(0,48),
    templateId=playSceneState.gameTemplateId||('template-'+Date.now().toString(36));
  if(total>30){playFlashError('Ván Mẫu tối đa 30 người. Hãy giảm số lượng lá.');return}
  const timing={villageDiscussionSec:clamp(document.getElementById('playVillageDiscussionSec')?.value??300),gallowsNominationSec:Math.max(1,clamp(document.getElementById('playGallowsNominationSec')?.value??10)||10),gallowsVoteSec:Math.max(1,clamp(document.getElementById('playGallowsVoteSec')?.value??10)||10),wolfDiscussionSec:clamp(document.getElementById('playWolfDiscussionSec')?.value??30),earlyArtifactSec:clamp(document.getElementById('playEarlyArtifactSec')?.value??30),defaultActionSec:clamp(document.getElementById('playDefaultActionSec')?.value??30),artifactActionSec:clamp(document.getElementById('playArtifactActionSec')?.value??30),autoAdvance:!!document.getElementById('playAutoAdvance')?.checked};
  const artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number(document.getElementById('playArtifactLimitPerCycle')?.value??3)||0)));
  const cfg={id:templateId,name:gameName,playerCount:total,
    roles:chosen.map(r=>({...r,actionDurationSec:playRoleDurationSec(r.roleId,timing.defaultActionSec)})),
    artifactsEnabled:false,artifacts:[],
    timing:{...timing,artifactActionSec:30,earlyArtifactSec:30},artifactLimitPerCycle:3};
  playSceneState.gameTiming=timing;playSceneState.artifactLimitPerCycle=artifactLimitPerCycle;
  playSetBusy(true);
  const saveButton=document.getElementById('playGameSave');
  if(saveButton){saveButton.disabled=true;saveButton.textContent='ĐANG LƯU…'}
  try{
    playGameStatus('Đang lưu cấu hình Ván Mẫu…','progress');
    const cached=await gmApi('/api/gm/game-templates',{method:'PUT',body:JSON.stringify({id:templateId,gameConfig:cfg})});
    // Remember the saved ID immediately: retry must resume the SAME template, never create duplicates.
    playSceneState.gameTemplateId=String(cached?.template?.id||templateId);
    playSceneState.gameName=gameName;savePlayScene();
    playGameStatus('Đang đóng gói artwork Vai Trò; Artifact dùng kho chung của server…','progress');
    await playEnsureTemplateAssets(playSceneState.gameTemplateId,cached?.template?.compiledConfig||cfg);
    const resumeSelection=playGameReturnToSelection;
    playGameReturnToSelection=false;
    closePlayGameSheet();await loadPlayGameTemplates();renderGameTemplateLibrary();
    if(resumeSelection&&playSceneState.step==='game')await openPlayGameSheet();
  }catch(err){
    const raw=String(err?.message||'Không lưu được Ván Mẫu.');
    const stage=String(document.getElementById('playGameStatus')?.textContent||'Lưu Ván Mẫu');
    const hint=/^(?:Load failed|Failed to fetch|Network request failed|NetworkError|The network connection was lost)/i.test(raw)
      ?'Kết nối bị ngắt khi '+stage.toLocaleLowerCase('vi')+'.'
      :raw;
    playFlashError(hint+' Nhấn LƯU để thử lại; cấu hình và danh sách Vai Trò đã chọn được giữ nguyên.');
  }
  finally{playSetBusy(false);if(saveButton){saveButton.disabled=false;saveButton.textContent='LƯU'}}
}
function playRandomInt(max){if(max<=1)return 0;if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(1),limit=Math.floor(0x100000000/max)*max;let n;do{crypto.getRandomValues(a);n=a[0]}while(n>=limit);return n%max}return Math.floor(Math.random()*max)}
function playShuffle(items){const a=items.slice();for(let i=a.length-1;i>0;i--){const j=playRandomInt(i+1),t=a[i];a[i]=a[j];a[j]=t}return a}

/* Step 5: GM-only assignment review. Only Step 6 calls /role-assets or /assignments. */
function playAssignmentDraftStatus(){
  const members=playLiveMembers().filter(m=>m?.loginId),rows=Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[],
    deck=new Map(Object.entries(playSceneState.rolePlan||{}).filter(([,n])=>Number(n)>0).map(([id,n])=>[String(id),Number(n)])),
    counts=new Map(),ids=new Set(members.map(m=>String(m.loginId))),seen=new Set();
  if(!members.length)return{ok:false,message:'Chưa có Người Chơi trong phòng.'};
  if(!playSceneRuntime.room?.seatsLocked)return{ok:false,message:'Hãy chốt vị trí trước khi Phân Vai.'};
  if(playRolePlanTotal()!==members.length)return{ok:false,message:'Ván Mẫu có '+playRolePlanTotal()+' lá, phòng có '+members.length+' người.'};
  if(rows.length!==members.length)return{ok:false,message:'Chưa phân đủ Vai Trò cho '+members.length+' người.'};
  const artifacts=new Set(playTemplateSelectedArtifacts().map(a=>String(a.id)));
  for(const row of rows){
    const login=String(row.loginId||''),role=String(row.roleId||''),artifact=String(row.artifactId||'');
    if(!ids.has(login)||seen.has(login))return{ok:false,message:'Danh sách người nhận Vai Trò không còn khớp phòng.'};
    seen.add(login);counts.set(role,(counts.get(role)||0)+1);
    if(!deck.has(role))return{ok:false,message:'Vai Trò không nằm trong Ván Mẫu đã chọn.'};
    if(playSceneState.artifactsEnabled&&(!artifact||!artifacts.has(artifact)))return{ok:false,message:'Có Artifact chưa được phân hoặc không có trong Ván Mẫu.'};
    if(!playSceneState.artifactsEnabled&&artifact)return{ok:false,message:'Ván Mẫu đang tắt Artifact nhưng kết quả còn Artifact.'};
  }
  for(const [id,n] of deck)if(counts.get(id)!==n)return{ok:false,message:'Số lượng Vai Trò đã phân không đúng cấu hình Ván Mẫu.'};
  return{ok:true,message:'Đã phân đủ '+rows.length+'/'+members.length+' người. Chưa phát bài xuống Player Web.'};
}
function playAssignmentSwapRole(loginId,wantedId){
  const rows=playSceneState.assignmentsPreview||[],index=rows.findIndex(r=>String(r.loginId)===String(loginId));
  if(index<0||!playSceneState.rolePlan?.[wantedId])return;
  if(String(rows[index].roleId)===String(wantedId))return;
  // Swap existing cards instead of duplicating a role: preserve the exact template deck.
  const donor=rows.findIndex((r,i)=>i!==index&&String(r.roleId)===String(wantedId));
  if(donor<0){playFlashError('Không tìm thấy lá Vai Trò để hoán đổi.');return}
  const keys=['roleId','roleName','faction','description'],a={...rows[index]},b={...rows[donor]};
  for(const k of keys){rows[index][k]=b[k];rows[donor][k]=a[k]}
  playSceneState.activePlayerId=String(loginId);
  playSceneState.roleId=String(rows[index].roleId||'');
  playSceneState.artifactId=String(rows[index].artifactId||'');
  savePlayScene();renderPlayScene();
}
// Publish only the public turn call. GM mute never changes Player audio permissions.
let gmwwPublishedAnnouncement='',gmwwPublishingAnnouncement='',gmwwAnnouncementAttempt={key:'',at:0};
async function gmwwPublishAnnouncement(turn){
  const room=playSceneRuntime.room,code=String(playSceneState.roomCode||'');
  if(!code||room?.phase!=='running')return;
  const morning=room.cyclePhase==='morning';
  const key=String(room.matchId)+':'+String(room.cycleKey)+':'+(morning?'wakeup':String(turn?.id||''));
  if(!morning&&!turn?.id||gmwwPublishedAnnouncement===code+key||gmwwPublishingAnnouncement===code+key)return;
  if(gmwwAnnouncementAttempt.key===code+key&&Date.now()-gmwwAnnouncementAttempt.at<5000)return;
  gmwwAnnouncementAttempt={key:code+key,at:Date.now()};gmwwPublishingAnnouncement=code+key;
  try{
    const cue=morning?{kind:'system',targetId:'audio_system_day_wakeup',name:'Làng ơi dậy đi'}:battleTurnAudioCue(turn);
    if(!cue)return;
    const candidates=battleFindAudioCandidates(cue.kind,cue.targetId,cue.name);
    let blob=null;
    for(const row of candidates){
      const src=await battleWarmAudio(cue.kind,row);if(!src)continue;
      const response=await fetch(src);if(!response.ok)continue;
      const candidate=await response.blob();
      if(candidate.size&&candidate.size<=2*1024*1024){blob=candidate;break}
    }
    if(!blob)return;
    const bytes=new Uint8Array(await blob.arrayBuffer());let raw='';
    const signature=(a,b)=>String.fromCharCode(...bytes.slice(a,b));
    const mime=signature(0,3)==='ID3'||bytes[0]===255&&(bytes[1]&224)===224?'audio/mpeg':signature(4,8)==='ftyp'?'audio/mp4':signature(0,4)==='OggS'?'audio/ogg':signature(0,4)==='RIFF'&&signature(8,12)==='WAVE'?'audio/wav':'';
    if(!mime)return;
    for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));
    // Route and key are verified again by the room before storing any bytes.
    await gmApi('/api/gm/rooms/'+encodeURIComponent(code)+'/announcement-audio',{method:'PUT',body:JSON.stringify({key,mime,base64:btoa(raw)}),timeoutMs:30000});
    gmwwPublishedAnnouncement=code+key;
  }catch(error){console.warn('Player recorded announcement pending',String(error?.message||error))}
  finally{if(gmwwPublishingAnnouncement===code+key)gmwwPublishingAnnouncement=''}
}


// Share the approved public call independently of GM local playback/mute.
const gmwwLocalTurnAudio=battleAudioForTurn,gmwwLocalMorningAudio=battleMorningPlayAudio;
battleAudioForTurn=function(turn,auto=false){void gmwwPublishAnnouncement(turn);return gmwwLocalTurnAudio(turn,auto)};
battleMorningPlayAudio=function(){void gmwwPublishAnnouncement(null);return gmwwLocalMorningAudio()};

/* GM Chat monitor: available only with GM-authorized room API. No public history path. */
let gmwwGMChatOpen=false,gmwwGMChatLastRoom='';
// Poll only while GM keeps the Chat monitor open; no idle CPU/network loops.
window.setInterval(()=>{if(gmwwGMChatOpen&&document.visibilityState!=='hidden'&&playSceneState.step==='battle')void gmwwGMChatRefresh()},7000);
function gmwwGMChatMakeMovable(trigger){
  let drag=null;
  trigger.addEventListener('pointerdown',event=>{
    if(event.button!==0&&event.pointerType!=='touch')return;
    const rect=trigger.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
    trigger.setPointerCapture(event.pointerId);
  });
  trigger.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<7)return;
    drag.moved=true;
    trigger.style.left=Math.max(0,Math.min(window.innerWidth-trigger.offsetWidth,drag.left+dx))+'px';
    trigger.style.top=Math.max(0,Math.min(window.innerHeight-trigger.offsetHeight,drag.top+dy))+'px';
    trigger.style.right='auto';
  });
  const finish=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    if(drag.moved){trigger.dataset.dragged='1';try{localStorage.setItem('gmww-gm-chat-icon-position',JSON.stringify({left:trigger.style.left,top:trigger.style.top}))}catch{}}
    drag=null;
  };
  trigger.addEventListener('pointerup',finish);trigger.addEventListener('pointercancel',finish);
  try{const p=JSON.parse(localStorage.getItem('gmww-gm-chat-icon-position')||'null');if(p&&/^\\d+(?:\\.\\d+)?px$/.test(p.left)&&/^\\d+(?:\\.\\d+)?px$/.test(p.top)){trigger.style.left=p.left;trigger.style.top=p.top;trigger.style.right='auto'}}catch{}
}
function gmwwGMChatMount(){
  const active=playSceneState.step==='battle'&&!!playSceneState.roomCode;
  if(!document.getElementById('gmwwGMChatStyle')){
    const st=document.createElement('style');st.id='gmwwGMChatStyle';st.textContent=`
#gmwwGMChatLaunch{position:fixed;right:12px;top:max(65px,calc(env(safe-area-inset-top) + 65px));z-index:99993;width:44px;height:44px;border:0;border-radius:0;background:transparent;color:#fff;font-size:30px;box-shadow:none;text-shadow:0 3px 9px #001a2f;touch-action:none;cursor:grab}
#gmwwGMChatPanel{display:none;position:fixed;z-index:100004;inset:9vh 7px auto 7px;max-width:520px;max-height:76dvh;margin:auto;background:#071826;color:#e5f3ff;border:1px solid #527a87;border-radius:18px;box-shadow:0 20px 55px #000c;flex-direction:column;overflow:hidden;font:12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}
#gmwwGMChatPanel.open{display:flex}#gmwwGMChatPanel header{display:flex;align-items:center;padding:9px;gap:7px;background:#12364b}#gmwwGMChatPanel header strong{flex:1}
#gmwwGMChatPanel header button{background:#1b4e63;border:1px solid #5f879a;border-radius:9px;min-height:34px;color:white;padding:6px 10px}
#gmwwGMChatContent{overflow-y:auto;padding:10px;display:grid;gap:10px}
.gmwwGmChannel{border:1px solid #365c6c;border-radius:10px;padding:9px;display:grid;gap:5px}
.gmwwGmChannel.secret{border-color:#795ca9;background:#251c3c}.gmwwGmChannel h4{font-size:12px;font-weight:800;color:#f0dbff;margin:0}
.gmwwGmChannel p{font-size:12px;margin:0;overflow-wrap:anywhere}
.gmwwGmReply{display:flex;gap:6px;margin-top:6px}.gmwwGmReply input{flex:1;min-width:0;border:1px solid #527a87;border-radius:8px;background:#082f41;color:white;padding:8px}.gmwwGmReply button{background:#116f8c;border:1px solid #6aafb9;border-radius:8px;color:white;padding:6px 10px;font-weight:800}
`;document.head.appendChild(st)
  }
  let trigger=document.getElementById('gmwwGMChatLaunch');
  if(!trigger){
    trigger=document.createElement('button');trigger.id='gmwwGMChatLaunch';trigger.type='button';trigger.textContent='🦩';trigger.title='GM • Mở Chat';trigger.setAttribute('aria-label','GM • Mở Chat');trigger.onclick=()=>{if(trigger.dataset.dragged==='1'){trigger.dataset.dragged='';return}gmwwGMChatOpen=!gmwwGMChatOpen;document.getElementById('gmwwGMChatPanel')?.classList.toggle('open',gmwwGMChatOpen);if(gmwwGMChatOpen)void gmwwGMChatRefresh()};gmwwGMChatMakeMovable(trigger);document.body.appendChild(trigger);
    const panel=document.createElement('section');panel.id='gmwwGMChatPanel';panel.setAttribute('aria-label','GM quản lý Chat');
    panel.innerHTML='<header><strong>GM • Quản lý Chat</strong><button id="gmwwGMChatReload" type="button">↻</button><button id="gmwwGMChatClose" type="button">Đóng</button></header><div id="gmwwGMChatContent"></div>';document.body.appendChild(panel);
    document.getElementById('gmwwGMChatClose').onclick=()=>{gmwwGMChatOpen=false;panel.classList.remove('open')};
    document.getElementById('gmwwGMChatReload').onclick=()=>void gmwwGMChatRefresh();
  }
  trigger.hidden=true;if(!active){gmwwGMChatOpen=false;document.getElementById('gmwwGMChatPanel')?.classList.remove('open')}
  if(active&&gmwwGMChatOpen&&gmwwGMChatLastRoom!==String(playSceneState.roomCode)){
    gmwwGMChatLastRoom=String(playSceneState.roomCode);void gmwwGMChatRefresh();
  }
}
async function gmwwGMChatRefresh(){
  if(!gmwwGMChatOpen||playSceneState.step!=='battle'||!isLivePlayRoom())return;
  try{
    const res=await playRoomApi('/chat',{method:'GET'}),content=document.getElementById('gmwwGMChatContent');
    if(!content)return;content.replaceChildren();
    const channels=(res.channels||[]).filter(x=>x.messages?.length).slice(-25);
    if(!channels.length)content.textContent='Chưa có tin nhắn trong ván.';
    for(const ch of channels){
      const box=document.createElement('div');box.className='gmwwGmChannel'+(String(ch.channel).startsWith('night:')?' secret':'');
      const h=document.createElement('h4');h.textContent=String(ch.channel).startsWith('night:')?'🌙 Chat bí mật • '+String(ch.channel).slice(0,75):'☀️ Chat Làng';box.appendChild(h);
      for(const msg of (ch.messages||[]).slice(-20)){
        const line=document.createElement('p');line.textContent=String(msg.senderName||msg.senderId||'')+': '+String(msg.text||'');box.appendChild(line)
      }
      if(String(ch.channel).startsWith('gm:')){
        const loginId=String(ch.channel).slice(3);
        h.textContent='🔒 Chat riêng GM • '+loginId;
        const form=document.createElement('form');form.className='gmwwGmReply';
        const input=document.createElement('input');input.type='text';input.placeholder='Trả lời riêng cho '+loginId;input.maxLength=280;input.required=true;
        const submit=document.createElement('button');submit.type='submit';submit.textContent='GỬI GM';form.append(input,submit);
        form.addEventListener('submit',async event=>{
          event.preventDefault();const msg=input.value.trim();if(!msg)return;submit.disabled=true;
          try{await playRoomApi('/chat',{method:'POST',body:JSON.stringify({loginId,text:msg})});await gmwwGMChatRefresh()}
          catch(e){input.setCustomValidity('Không thể gửi. '+String(e.message||''));input.reportValidity();input.setCustomValidity('')}
          finally{submit.disabled=false}
        });
        box.appendChild(form);
      }
      content.appendChild(box)
    }
  }catch(error){const el=document.getElementById('gmwwGMChatContent');if(el)el.textContent='Lỗi đồng bộ Chat: '+String(error.message||error)}
}
function playAssignmentSetArtifact(loginId,artifactId){
  if(!playSceneState.artifactsEnabled)return;
  const row=(playSceneState.assignmentsPreview||[]).find(r=>String(r.loginId)===String(loginId));
  const item=playTemplateSelectedArtifacts().find(a=>String(a.id)===String(artifactId));
  if(!row||!item)return;
  row.artifactId=String(item.id);row.artifactName=String(item.name||'Artifact');
  playSceneState.activePlayerId=String(loginId);playSceneState.roleId=String(row.roleId||'');
  playSceneState.artifactId=row.artifactId;savePlayScene();renderPlayScene();
}
function playAssignmentSignature(){
  // Identify exactly which GM-private distribution was explicitly saved.
  return JSON.stringify({roomCode:playSceneState.roomCode||'',matchId:playSceneState.matchId||'',
    rows:(playSceneState.assignmentsPreview||[]).map(r=>[r.loginId,r.roleId,r.artifactId||''])});
}
async function playSaveAssignments(){
  const status=playAssignmentDraftStatus();
  if(!status.ok){playFlashError(status.message);renderPlayRoleAssignmentPanel();return false}
  if(playSceneRuntime.busy)return false;
  // Save only GM-private assignments. Publishing the deal stage must NOT
  // send cards; private delivery is still triggered solely by the Phát Vai step.
  const formerStep=playSceneState.step;
  playSceneRuntime.busy=true;renderPlayRoleAssignmentPanel();
  try{
    const ack=await playPublishStage('deal');
    if(!ack)throw Error('Server chưa xác nhận chuyển sang Phát Vai.');
    playSceneState.assignmentSavedSignature=playAssignmentSignature();
    playSceneRuntime.assignmentPanelDismissed=true;
    playSceneState.step='deal';playSceneState.phase='lobby';
    savePlayScene();renderPlayScene();
    return true;
  }catch(err){
    playSceneState.step=formerStep;
    playSceneRuntime.assignmentPanelDismissed=false;
    playFlashError('Không thể lưu Phân Vai: '+String(err?.message||err));
    renderPlayRoleAssignmentPanel();return false;
  }finally{playSceneRuntime.busy=false;renderPlayRoleAssignmentPanel()}
}
function playConfirmAssignments(){
  const status=playAssignmentDraftStatus();
  if(!status.ok){playFlashError(status.message);renderPlayRoleAssignmentPanel();return false}
  playSceneState.step='deal';playSceneState.phase='lobby';
  savePlayScene();void playPublishStage('deal');renderPlayScene();
  return true;
}
function renderPlayRoleAssignmentPanel(){
  const panel=document.getElementById('playRoleAssignmentPanel');if(!panel)return;
  const visible=playSceneState.phase==='lobby'&&playSceneState.step==='roles'&&isLivePlayRoom()&&!playSceneRuntime.assignmentPanelDismissed;
  panel.classList.toggle('hidden',!visible);panel.hidden=!visible;
  if(!visible)return;
  const members=playLiveMembers().filter(m=>m?.loginId).slice().sort((a,b)=>{
    const aa=Number(a.seatId)||999,bb=Number(b.seatId)||999;
    return aa-bb||String(a.displayName||a.loginId).localeCompare(String(b.displayName||b.loginId),'vi');
  });
  const rows=playSceneState.assignmentsPreview||[],assigned=new Map(rows.map(r=>[String(r.loginId),r])),
    status=playAssignmentDraftStatus(),roleOptions=playTemplateSelectedRoles(),artifactOptions=playTemplateSelectedArtifacts(),
    list=document.getElementById('playAssignmentRows'),count=document.getElementById('playAssignmentCount'),
    notice=document.getElementById('playAssignmentNotice'),confirm=document.getElementById('playAssignmentConfirm');
  if(count)count.textContent=rows.length+' / '+members.length+' người · '+playRolePlanTotal()+' lá Vai Trò';
  if(notice){notice.textContent=status.ok&&playSceneState.assignmentSavedSignature===playAssignmentSignature()
    ?'Đã LƯU Phân Vai trên thiết bị GM. Chưa phát bài xuống Player Web.'
    :status.message;notice.classList.toggle('is-error',!status.ok)}
  if(confirm)confirm.disabled=!status.ok||playSceneRuntime.busy;
  for(const id of ['playAssignmentRandom','playAssignmentInOrder','playAssignmentArtifactShuffle']){
    const button=document.getElementById(id);if(button)button.disabled=playSceneRuntime.busy||!members.length||playRolePlanTotal()!==members.length||(id==='playAssignmentArtifactShuffle'&&(!playSceneState.artifactsEnabled||!rows.length));
  }
  if(!list)return;
  const scrollTop=list.scrollTop;list.replaceChildren();
  for(const member of members){
    const login=String(member.loginId),current=assigned.get(login),seat=Number(member.seatId||0),
      role=roleOptions.find(r=>String(r.id)===String(current?.roleId)),artifact=artifactOptions.find(a=>String(a.id)===String(current?.artifactId));
    const item=document.createElement('article');item.className='play-assignment-member';item.dataset.memberId=login;
    item.innerHTML='<div class="play-assignment-identity"><span class="play-assignment-seat">'+(seat?'#'+seat:'—')+'</span><div class="play-assignment-person"><b>'+playEsc(member.displayName||login)+'</b><small>'+playEsc(login)+'</small></div><span class="play-assignment-presence '+(member.online?'on':'off')+'">'+(member.online?'●':'○')+'</span></div>'+
      '<div class="play-assignment-fields"><label class="play-assignment-control"><img class="play-assignment-thumb role" alt="" loading="lazy"><span><small>VAI TRÒ</small><select data-assign-role aria-label="Đổi Vai Trò của '+playEsc(member.displayName||login)+'"></select></span></label>'+
      '<label class="play-assignment-control"><img class="play-assignment-thumb artifact" alt="" loading="lazy"><span><small>ARTIFACT</small><select data-assign-artifact aria-label="Chọn Artifact của '+playEsc(member.displayName||login)+'"></select></span></label></div>';
    const rs=item.querySelector('[data-assign-role]'),as=item.querySelector('[data-assign-artifact]');
    if(!current)rs.add(new Option('Chưa phân Vai',''));
    for(const r of roleOptions)rs.add(new Option(r.name||'Vai Trò',String(r.id)));
    rs.value=String(current?.roleId||'');rs.disabled=!current||playSceneRuntime.busy;
    rs.onchange=()=>playAssignmentSwapRole(login,rs.value);
    as.add(new Option(playSceneState.artifactsEnabled?'Chưa có Artifact':'Không sử dụng',''));
    if(playSceneState.artifactsEnabled)for(const a of artifactOptions)as.add(new Option(a.name||'Artifact',String(a.id)));
    as.value=String(current?.artifactId||'');as.disabled=!current||!playSceneState.artifactsEnabled||playSceneRuntime.busy;
    as.onchange=()=>playAssignmentSetArtifact(login,as.value);
    const rt=item.querySelector('.play-assignment-thumb.role'),at=item.querySelector('.play-assignment-thumb.artifact');
    if(role)void resolveArtwork('cards',role.id,'thumb').then(url=>{if(rt.isConnected)rt.src=url||'default-artwork.webp'}).catch(()=>{if(rt.isConnected)rt.src='default-artwork.webp'});
    else rt.src='default-artwork.webp';
    if(artifact)void resolveArtwork('artifacts',artifact.id,'thumb').then(url=>{if(at.isConnected)at.src=url||'default-artwork.webp'}).catch(()=>{if(at.isConnected)at.src='default-artwork.webp'});
    else at.src='default-artwork.webp';
    list.appendChild(item);
  }
  if(!members.length)list.innerHTML='<p class="play-assignment-empty">Chưa có người chơi. Quay lại bước Tập hợp để gọi thành viên.</p>';
  list.scrollTop=scrollTop;
}

function playAssignArtifactsToRows(rows,{preserve=false}={}){
  if(!playSceneState.artifactsEnabled)return rows.map(r=>({...r,artifactId:'',artifactName:''}));
  const pool=playTemplateSelectedArtifacts();if(!pool.length)throw new Error('Chưa chọn Artifact nào cho trận này.');
  const old=new Map((playSceneState.assignmentsPreview||[]).map(r=>[String(r.loginId),r])),shuffled=playShuffle(pool);
  return rows.map((r,i)=>{
    const keep=preserve?old.get(String(r.loginId)):null,artifact=keep?.artifactId?(state.artifacts||[]).find(a=>String(a.id)===String(keep.artifactId)):(shuffled[i%shuffled.length]||pool[i%pool.length]);
    return {...r,artifactId:artifact?.id||'',artifactName:artifact?.name||''};
  });
}
function playBuildAssignments(opts={}){
  const members=playLiveMembers(),rolesById=new Map((state.cards||[]).map(r=>[String(r.id),r])),deck=[];
  for(const [roleId,countRaw] of Object.entries(playSceneState.rolePlan||{})){const role=rolesById.get(String(roleId)),count=Math.max(0,Number(countRaw)||0);if(!role)continue;for(let i=0;i<count;i++)deck.push(role)}
  if(deck.length!==members.length)throw new Error('Số Vai Trò không khớp số Thành Viên. Hãy quay lại Chọn Ván.');
  const shuffled=opts.random===false?deck:playShuffle(deck),baseRows=members.map((m,i)=>({loginId:m.loginId,displayName:m.displayName,roleId:shuffled[i].id,roleName:shuffled[i].name,faction:playFactionLabel(shuffled[i]),description:shuffled[i].information||''})),rows=playAssignArtifactsToRows(baseRows,{preserve:opts.preserveArtifacts===true});
  playSceneState.assignmentsPreview=rows;playSceneState.step='roles';if(rows[0]){playSceneState.activePlayerId=rows[0].loginId;playSceneState.roleId=rows[0].roleId;playSceneState.artifactId=rows[0].artifactId||''}savePlayScene();renderPlayScene();return rows;
}
function playRerollArtifacts(){
  if(!playSceneState.artifactsEnabled){playFlashError('Artifact đang tắt trong Ván này.');return}
  const rows=Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[];if(!rows.length)return;
  playSceneState.assignmentsPreview=playAssignArtifactsToRows(rows,{preserve:false});const active=playSceneState.assignmentsPreview.find(r=>String(r.loginId)===String(playSceneState.activePlayerId));playSceneState.artifactId=active?.artifactId||'';savePlayScene();renderPlayScene();
}
function playCycleActiveArtifact(){
  if(!playSceneState.artifactsEnabled){playFlashError('Artifact đang tắt trong Ván này.');return}
  const pool=playFavoriteArtifacts(),rows=playSceneState.assignmentsPreview||[],idx=rows.findIndex(r=>String(r.loginId)===String(playSceneState.activePlayerId));if(idx<0||!pool.length){playFlashError('Hãy chọn Người Chơi trước.');return}
  const current=String(rows[idx].artifactId||''),p=Math.max(-1,pool.findIndex(a=>String(a.id)===current)),next=pool[(p+1)%pool.length];rows[idx]={...rows[idx],artifactId:next.id,artifactName:next.name};playSceneState.assignmentsPreview=rows;playSceneState.artifactId=next.id;savePlayScene();renderPlayScene();
}
function playFunctionRulePayload(fn){
  const out={};
  for(const key of ['phase','usageMode','usageCount','targetCount','noSelf','allowDead','noTarget','passive','fromNight','toNight','cooldownNights','allowConsecutive','targetPreviousCycleOnly','perUserLimit','activation','pushToPlayerWeb','systemRequired','usesPackBite','requiresNoOtherLivingWolf','actorMayBeDead','allowFriendlyFaction','replacesWolfBite','effectIds'])
    if(fn[key]!==undefined)out[key]=fn[key];
  return out;
}
function playRoleCardPayload(role){
  const actions=(role.functions||[]).map(fn=>{const act=(state.actions?.role||[]).find(a=>a.id===fn.actionId);return{id:String(fn.actionId||act?.id||''),name:String(act?.name||fn.description||'Hành Động'),description:String(act?.description||fn.description||''),limits:role.limits||null}});
  return{version:7,name:role.name||'Vai Trò',faction:playFactionLabel(role),information:role.information||'',objective:role.winCondition||'',actions,
    flags:{allowMultipleActions:role.flags?.allowMultipleActions===true,nightImmune:role.flags?.nightImmune===true},
    functions:(role.functions||[]).map(fn=>({...playFunctionRulePayload(fn),id:String(fn.id||fn.actionId||''),actionId:String(fn.actionId||''),
      usageMode:String(fn.usageMode||'eachNight'),usageCount:Math.max(1,Number(fn.usageCount)||1)})),
    limits:role.limits||null,artworkAssetId:'role:'+role.id,artworkId:'role:'+role.id};
}
function playArtifactCardPayload(artifact){
  const actions=(artifact?.functions||[]).map(fn=>{const act=(state.actions?.artifacts||[]).find(a=>a.id===fn.actionId);return{id:String(fn.actionId||act?.id||''),name:String(act?.name||fn.description||'Hành Động'),description:String(act?.description||fn.description||''),limits:artifact?.limits||null,...(fn.targetCount!==undefined?{targetCount:fn.targetCount}:{}),...(typeof fn.noSelf==='boolean'?{noSelf:fn.noSelf}:{}),...(typeof fn.allowDead==='boolean'?{allowDead:fn.allowDead}:{})}});
  return{version:1,name:artifact?.name||'Artifact',information:artifact?.information||'',actions,functions:(artifact?.functions||[]).map(fn=>({...playFunctionRulePayload(fn),id:String(fn.id||fn.actionId||''),actionId:String(fn.actionId||'')})),limits:artifact?.limits||null,singleUse:typeof (artifact?.singleUse??artifact?.artifact?.singleUse)==='boolean'?(artifact.singleUse??artifact.artifact.singleUse):!!(artifact?.functions?.length===1&&artifact.functions[0].usageMode==='onceGame'&&Number(artifact.functions[0].usageCount||1)===1),priorityFirst:artifact?.artifact?.priorityFirst===true,artworkAssetId:'artifact:'+artifact?.id,artworkId:'artifact:'+artifact?.id};
}

async function playBlobDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Không đọc được Artwork'));r.readAsDataURL(blob)})}
async function playVerifiedArtworkData(kind,id){
  // Player uses the same DISPLAY artwork as the GM library (not a cropped thumbnail).
  // Decode first: an HTTP 200 response with invalid bytes is not a valid card.
  let src=await resolveArtwork(kind,id,'display');
  if(!src||String(src).includes('default-artwork.webp'))src=await resolveArtwork(kind,id,'full');
  if(!src||String(src).includes('default-artwork.webp'))throw new Error('Artwork '+id+' chưa có ảnh thật. Hãy cập nhật trong Bộ Bài.');
  // A bundled image can render in WKWebView <img> but fail fetch(file://...) with "Load failed".
  // Only built-in role art may use the same-image CORS proxy; never substitute an unrelated image.
  const original=String(src),builtin=kind==='cards'&&original===String(builtinRoleArtwork(id,'display')||'');
  const nativeScheme=/^(?:file:|capacitor:|ionic:|app:)/i.test(String(location.protocol||''));
  const serverCopy=GMWW_SERVER_BASE+'/api/gm/template-role-artwork/'+encodeURIComponent(String(id));
  const candidates=builtin?(nativeScheme?[serverCopy,original]:[original,serverCopy]):[original];
  let blob=null,lastImageError=null;
  for(const url of [...new Set(candidates)]){
    try{
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const candidate=await response.blob();
      if(!candidate.type.startsWith('image/')||!candidate.size)throw new Error('Dữ liệu trả về không phải ảnh');
      blob=candidate;break;
    }catch(err){lastImageError=err}
  }
  if(!blob)throw new Error('Không đọc được Artwork '+id+' từ bộ ảnh IPA hoặc Server. '+String(lastImageError?.message||'Lỗi kết nối')+'. Kiểm tra kết nối và nhấn LƯU để tiếp tục.');
  let bitmap=null;
  try{
    bitmap=await createImageBitmap(blob);
    if(!bitmap.width||!bitmap.height)throw new Error('Hình không có kích thước');
    const maxBytes=1300000;
    if(blob.size>maxBytes||blob.type==='image/svg+xml'){
      const scale=Math.min(1,1800/bitmap.width,1800/bitmap.height);
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Không thể tối ưu ảnh');
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      let reduced=null;
      for(const quality of [0.88,0.80,0.72,0.63]){
        reduced=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
        if(reduced?.type==='image/webp'&&reduced.size<=maxBytes)break;
      }
      if(!reduced||reduced.size>maxBytes)throw new Error('Ảnh quá lớn để đóng gói');
      blob=reduced;
    }
  }catch(err){throw new Error('Artwork '+id+' không thể kiểm tra/đóng gói: '+String(err?.message||err))}
  finally{bitmap?.close?.()}
  const data=await playBlobDataUrl(blob);
  if(!/^data:image\/(?:webp|png|jpeg);base64,/i.test(data)||data.length>=1900000)throw new Error('Artwork '+id+' không đạt giới hạn gói dữ liệu.');
  return data;
}
async function playRoleArtworkData(role){return playVerifiedArtworkData('cards',role.id)}
async function playArtifactArtworkData(artifact){return playVerifiedArtworkData('artifacts',artifact.id)}
function playTemplateAssetIds(cfg){
  // Only selected Vai Trò belongs to the per-template, revisioned package.
  return [...new Set((cfg?.roles||[]).map(r=>'role:'+String(r.roleId||'')).filter(x=>!x.endsWith(':')))];
}
function playMatchArtifactAssetIds(cfg){
  return [...new Set((cfg?.artifacts||[]).map(a=>'artifact:'+String(a.artifactId||'')).filter(x=>!x.endsWith(':')))];
}
const playSharedArtifactUploads=new Map();
async function playSharedArtifactSignature(artifact){
  // Include the actual Sea-theme artwork bytes, not only card metadata. Otherwise
  // an image-only edit retains the old server signature and never reaches Player Web.
  // Hash local source bytes cheaply; only changed cards are decoded/encoded/uploaded.
  const themeId=state.themes.activeId||'theme-sea',id=String(artifact?.id||'');
  let artworkSha256='';
  if(id&&themeId!=='theme-default'){
    for(const kind of ['display','full']){
      const record=await dbGet(cardBlobKey(themeId,'artifacts',id,kind)).catch(()=>null);
      if(record?.blob&&typeof record.blob.arrayBuffer==='function'){
        const bytes=await record.blob.arrayBuffer();
        const fingerprint=await crypto.subtle.digest('SHA-256',bytes);
        artworkSha256=[...new Uint8Array(fingerprint)].map(x=>x.toString(16).padStart(2,'0')).join('');
        break;
      }
    }
  }
  const data=new TextEncoder().encode(JSON.stringify({card:playArtifactCardPayload(artifact),themeId,artworkSha256}));
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
// Global server-side collection: sync missing/changed cards independently from Ván Mẫu saves.
async function playSyncSharedArtifactLibrary({onlyIds=null,forceIds=[]}={}){
  const library=(state.artifacts||[]).filter(a=>a?.id&&(!onlyIds||onlyIds.map(String).includes(String(a.id))));
  if(!library.length)return{ok:true,synced:0,failed:[]};
  const status=await gmApi('/api/gm/artifacts/shared',{timeoutMs:20000});
  const known=new Map((status?.artifacts||[]).map(x=>[String(x.assetId),x.signature]));
  const forced=new Set(forceIds.map(String)),failed=[];
  let synced=0;
  for(const artifact of library){
    const id=String(artifact.id),assetId='artifact:'+id;
    try{
      const signature=await playSharedArtifactSignature(artifact);
      if(!forced.has(id)&&known.get(assetId)===signature)continue;
      if(!playSharedArtifactUploads.has(id)){
        const pending=(async()=>{
          const imageDataUrl=await playArtifactArtworkData(artifact);
          const payload={assetId,signature,force:forced.has(id),imageDataUrl,package:{roleCard:playArtifactCardPayload(artifact)}};
          const result=await gmApi('/api/gm/artifacts/shared',{method:'PUT',timeoutMs:60000,body:JSON.stringify(payload)});
          if(result?.ok!==true)throw new Error('Server không xác nhận bộ Artifact '+id);
        })();
        playSharedArtifactUploads.set(id,pending);
        void pending.finally(()=>{if(playSharedArtifactUploads.get(id)===pending)playSharedArtifactUploads.delete(id)}).catch(()=>{});
      }
      await playSharedArtifactUploads.get(id);
      synced++;
    }catch(err){failed.push({id,error:String(err?.message||err)})}
  }
  return{ok:failed.length===0,synced,failed};
}
// Gentle, one-card-at-a-time background sync. Never compete with live rooms,
// template creation, role assignment or an inactive tab for decoding resources.
let playSharedArtifactBackgroundTimer=null,playSharedArtifactBackgroundCursor=0;
function playScheduleSharedArtifactLibrarySync(waitMs=30000){
  if(playSharedArtifactBackgroundTimer!==null)return;
  playSharedArtifactBackgroundTimer=setTimeout(async()=>{
    playSharedArtifactBackgroundTimer=null;
    const library=(state.artifacts||[]).filter(a=>a?.id);
    if(playSharedArtifactBackgroundCursor>=library.length)return;
    const sheet=document.getElementById('playGameSheet');
    const active=typeof document.visibilityState==='undefined'||document.visibilityState==='visible';
    if(!active||playSceneRuntime.busy||isLivePlayRoom()||(sheet&&!sheet.classList.contains('hidden'))){
      playScheduleSharedArtifactLibrarySync(30000);return;
    }
    const id=String(library[playSharedArtifactBackgroundCursor++].id);
    try{await playSyncSharedArtifactLibrary({onlyIds:[id]})}catch(_){}
    playScheduleSharedArtifactLibrarySync(30000);
  },Math.max(1000,Number(waitMs)||30000));
}
async function playEnsureSharedArtifactPool(cfg){
  const ids=playMatchArtifactAssetIds(cfg).map(id=>id.slice('artifact:'.length));
  if(!ids.length)return;
  const report=await playSyncSharedArtifactLibrary({onlyIds:ids});
  if(report.failed.length)throw new Error('Không cập nhật được Artifact dùng chung: '+report.failed.map(x=>x.id).join(', ')+'. '+String(report.failed[0]?.error||''));
  const status=await gmApi('/api/gm/artifacts/shared',{timeoutMs:20000});
  const ready=new Set((status?.artifacts||[]).map(x=>String(x.assetId)));
  const missing=ids.filter(id=>!ready.has('artifact:'+id));
  if(missing.length)throw new Error('Bộ Artifact dùng chung chưa sẵn sàng: '+missing.join(', ')+'. '+String(report.failed[0]?.error||'Hãy kiểm tra artwork trong Bộ Bài.'));
}
async function playEnsureSharedArtifactReferencesReady(cfg){
  const ids=playMatchArtifactAssetIds(cfg);
  if(!ids.length)return;
  // Choose Ván Mẫu: verify lightweight metadata only; do not rehash/re-encode prepacked art.
  const status=await gmApi('/api/gm/artifacts/shared',{timeoutMs:20000});
  const ready=new Set((status?.artifacts||[]).map(a=>String(a.assetId)));
  const missing=ids.filter(id=>!ready.has(id));
  if(missing.length){
    // A newly selected or removed Artifact is the only reason to lazily prepare here.
    playGameStatus('Đang bổ sung '+missing.length+' Artifact chưa có trong kho chung…','progress');
    await playEnsureSharedArtifactPool({artifacts:missing.map(id=>({artifactId:id.slice('artifact:'.length)}))});
  }
}
async function playEnsureTemplateAssets(id,cfg){
  const endpoint='/api/gm/game-templates/'+encodeURIComponent(id)+'/assets';
  let status=await gmApi(endpoint+'/status');
  if(status?.ready)return status;
  const missing=new Set(status?.missing||playTemplateAssetIds(cfg));
  let finished=0;
  for(const assetId of missing){
    const rawId=assetId.slice(5),model=(state.cards||[]).find(x=>String(x.id)===rawId);
    if(!model)throw new Error('Thiếu Lá Vai Trò '+assetId+' trong Thư Viện. Không thể đóng gói Ván Mẫu.');
    playGameStatus('Đang đóng gói Vai Trò '+(finished+1)+'/'+missing.size+': '+String(model.name||'Lá Bài'),'progress');
    const pkg={roleId:rawId,roleName:model.name,faction:playFactionLabel(model),description:model.information||'',artworkAssetId:assetId,roleCard:playRoleCardPayload(model)};
    // Canonical role artwork is packaged on the Worker. Native WKWebView must not
    // fetch the bundled file:// image and upload it again for every Ván Mẫu.
    if(builtinRoleArtwork(rawId,'display')){
      const uploaded=await gmApi(endpoint+'/canonical',{method:'POST',timeoutMs:60000,
        body:JSON.stringify({assetId,package:pkg})});
      if(uploaded?.ok!==true||uploaded?.hasImage!==true)
        throw new Error('Server chưa đóng gói được Vai Trò '+model.name+'.');
    }else{
      // Only truly custom artwork must use the device-owned image.
      const imageDataUrl=await playRoleArtworkData(model);
      const uploaded=await gmApi(endpoint,{method:'PUT',timeoutMs:60000,body:JSON.stringify({assetId,imageDataUrl,package:pkg})});
      if(uploaded?.ok!==true||uploaded?.hasImage!==true)throw new Error('Không xác nhận được ảnh '+model.name+'.');
    }
    finished++;
  }
  status=await gmApi(endpoint+'/status');
  if(!status?.ready)throw new Error('Ván Mẫu chưa đóng gói đủ ảnh: '+(status?.missing||[]).join(', '));
  return status;
}
async function playPreloadSelectedArtwork(cfg){
  const roles=playTemplateAssetIds(cfg),artifacts=playMatchArtifactAssetIds(cfg),expected=[...roles,...artifacts];
  const manifest=await playRoomApi('/artwork-manifest',{method:'GET'});
  const existing=new Set(manifest?.assetIds||[]);
  // Roles are always registered in a single metadata-only request at Chọn Ván.
  // Never fetch/re-encode their artwork on the phone a second time.
  const missingRoles=roles.filter(assetId=>!existing.has(assetId));
  if(missingRoles.length)throw new Error('Thiếu tham chiếu ảnh Vai Trò: '+missingRoles.join(', ')+'. Hãy chọn lại Ván Mẫu.');
  // Artifact stays in the server-wide shared catalog and is referenced once
  // per selected pool, with no per-game artwork serialization.
  if(artifacts.length){
    playGameStatus('Đang liên kết '+artifacts.length+' Artifact từ kho chung Server…','progress');
    await playEnsureSharedArtifactReferencesReady(cfg);
    const linked=await playRoomApi('/shared-artifacts',{method:'POST',timeoutMs:20000,
      body:JSON.stringify({assetIds:artifacts})});
    if(linked?.ready!==true||linked?.mode!=='reference'||!artifacts.every(id=>linked.assetIds?.includes(id)))
      throw new Error('Server chưa liên kết đủ bộ Artifact.');
  }
  const verified=await playRoomApi('/artwork-manifest',{method:'GET'});
  if(verified?.mode!=='reference'||!expected.every(id=>verified?.assetIds?.includes(id)))
    throw new Error('Tham chiếu artwork Vai Trò/Artifact chưa đầy đủ. Chưa thể Phân Vai.');
  return verified;
}
async function playDealRoles(){
  if(playDeliveryProgress().success){setPlayStep('battle');return}
  const review=playAssignmentDraftStatus();if(!review.ok){playFlashError(review.message);setPlayStep('roles');return}
  const rows=Array.isArray(playSceneState.assignmentsPreview)?playSceneState.assignmentsPreview:[];
  const uniqueIds=[...new Set(rows.map(r=>String(r.roleId)))],roles=uniqueIds.map(id=>(state.cards||[]).find(r=>String(r.id)===id)).filter(Boolean),artifactIds=[...new Set(rows.map(r=>String(r.artifactId||'')).filter(Boolean))],artifacts=artifactIds.map(id=>(state.artifacts||[]).find(a=>String(a.id)===id)).filter(Boolean);playSetBusy(true);
  try{
    const expected=[...playTemplateAssetIds({roles:roles.map(r=>({roleId:r.id}))}),...artifacts.map(a=>'artifact:'+String(a.id))];
    const manifest=await playRoomApi('/artwork-manifest',{method:'GET'});
    if(!expected.every(id=>manifest?.assetIds?.includes(id)))throw new Error('Artwork chưa sẵn sàng. Vui lòng chọn lại Ván Mẫu để nạp đầy đủ trước khi Phát Vai.');
    const packages=roles.map(role=>({roleId:role.id,roleName:role.name,roleCard:playRoleCardPayload(role)}));
    const pkgById=new Map(packages.map(p=>[String(p.roleId),p]));
    const artifactById=new Map(artifacts.map(a=>[String(a.id),a]));
    const assignments=rows.map(r=>{
      const p=pkgById.get(String(r.roleId))||{},role=(state.cards||[]).find(x=>String(x.id)===String(r.roleId)),artifact=artifactById.get(String(r.artifactId||''))||null;
      // The server already holds the full Artifact package; send a reference only.
      const artifactPayload=artifact?{artifactId:String(artifact.id),artworkAssetId:'artifact:'+artifact.id}:null;
      return{loginId:r.loginId,roleId:r.roleId,roleName:r.roleName,faction:r.faction,description:r.description,artworkAssetId:'role:'+r.roleId,roleCard:p.roleCard||playRoleCardPayload(role||r),...(artifactPayload?{artifact:artifactPayload}:{})};
    });
    const data=await playRoomApi('/assignments',{method:'POST',body:JSON.stringify({assignments,multiAssign:false,matchId:playSceneState.matchId||('match-'+Date.now().toString(36)),matchRevision:Number(playSceneRuntime.room?.matchRevision||1),deliveryVersion:Number(playSceneRuntime.room?.deliveryVersion||0)+1})});
    if(data?.ok!==true||!data?.room?.roleDeliveredAt||!Array.isArray(data.assignments)||data.assignments.length!==assignments.length||data.assignments.some(a=>!a?.deliveredAt))
      throw new Error('Server chưa xác nhận phát đủ Vai Trò. Vui lòng kiểm tra kết nối.');
    playSceneRuntime.assignments=data.assignments;playSceneRuntime.room=data.room;playSceneState.step='deal';
    savePlayScene();await playSyncRoom(true);renderPlayScene();
  }catch(err){playFlashError(err.message)}
  finally{playSetBusy(false)}
}

function selectPlayWinner(faction){
  const value=String(faction||'');playSceneRuntime.selectedWinnerFaction=value;
  document.querySelectorAll('[data-play-winner]').forEach(b=>b.classList.toggle('selected',b.dataset.playWinner===value));
  const confirm=document.getElementById('playEndConfirm');if(confirm)confirm.disabled=!value||playSceneRuntime.busy;
}
function selectedPlayPlayer(){return playLiveMembers().find(p=>String(p?.loginId||'')===String(playSceneState.activePlayerId||''))||null}
let playSeatAssignTarget=0,playSeatCandidateMode='online',playSeatManualOpen=false;
function playSeatCandidateRows(mode=playSeatCandidateMode){
  const seated=new Set(playLiveMembers().filter(p=>Number(p?.seatId||0)>0).map(p=>String(p.loginId||'')));
  return (memberAdminState.members||[]).filter(m=>{
    const id=String(m?.loginId||'');if(!id||seated.has(id))return false;
    if(mode==='offline')return m?.online!==true;
    if(m?.online!==true)return false;
    const other=String(m?.currentRoomCode||'');return !other||other===String(playSceneState.roomCode||'')
  })
}
async function ensureSeatCandidateInRoom(loginId){
  loginId=String(loginId||'');let member=playLiveMembers().find(p=>String(p?.loginId||'')===loginId);if(member)return member;
  const source=memberAdminState.members||[],ids=[...new Set([...playLiveMembers().map(p=>String(p.loginId||'')),loginId])],existing=new Map(playLiveMembers().map(p=>[String(p.loginId),p]));
  const chosen=source.filter(m=>ids.includes(String(m.loginId))).map(m=>({loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:m.gameCharacterId||existing.get(String(m.loginId))?.gameCharacterId||null,seatId:existing.get(String(m.loginId))?.seatId||null}));
  const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:chosen,replace:true})});
  playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;playSceneState.selectedMemberIds=ids;savePlayScene();
  return playLiveMembers().find(p=>String(p?.loginId||'')===loginId)||null
}
async function assignSeatCandidate(loginId){
  if(!playSeatAssignTarget||playSceneRuntime.busy)return;playSetBusy(true);
  try{
    const member=await ensureSeatCandidateInRoom(loginId);if(!member)throw new Error('Không thêm được Thành Viên vào Phòng.');
    const data=await playRoomApi('/seat',{method:'POST',body:JSON.stringify({participantId:member.participantId||('member:'+member.loginId),seatId:playSeatAssignTarget})});
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;playSceneState.activePlayerId=String(member.loginId||'');savePlayScene();closePlaySeatSheet();renderPlayScene()
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function openPlaySeatAssignSheet(seatId){
  playSeatManualOpen=false;playSeatAssignTarget=Math.max(1,Number(seatId)||0);playSeatCandidateMode='online';
  try{if(!memberAdminState.loaded)await loadMembers(false)}catch{}
  renderPlaySeatSheet();document.getElementById('playSeatSheet')?.classList.remove('hidden')
}
function renderPlaySeatSheet(){
  const grid=document.getElementById('playSeatGrid'),label=document.getElementById('playSeatPlayerLabel'),summary=document.getElementById('playSeatSummary'),selected=selectedPlayPlayer(),stats=playSeatStats(),tabs=document.getElementById('playSeatMemberTabs'),manual=document.getElementById('playSeatManualMembers'),sheet=document.getElementById('playSeatSheet');if(!grid)return;
  sheet?.classList.toggle('is-manual',playSeatManualOpen&&!playSeatAssignTarget);
  grid.innerHTML='';
  if(manual){manual.innerHTML='';if(playSeatManualOpen&&!playSeatAssignTarget){
    for(const p of playLiveMembers()){
      const lid=String(p?.loginId||''),b=document.createElement('button');b.type='button';b.className='play-seat-manual-member'+(selected&&String(selected.loginId)===lid?' is-selected':'');
      b.innerHTML='<b>'+playEsc(p.displayName||lid)+'</b><small>'+(Number(p.seatId||0)?'Vị trí '+Number(p.seatId):'CHƯA XẾP')+'</small>';
      b.onclick=()=>{playSceneState.activePlayerId=lid;savePlayScene();renderPlaySeatSheet();renderPlayPlayers()};manual.appendChild(b)
    }
    if(!manual.children.length)manual.innerHTML='<div class="member-empty">Chưa có người chơi. Hãy GỌI NGƯỜI trước.</div>';
  }}
  if(playSeatAssignTarget){
    if(label)label.textContent='Vị trí '+playSeatAssignTarget+' • Chọn Thành Viên';
    const rows=playSeatCandidateRows();if(summary)summary.textContent=(playSeatCandidateMode==='online'?'Đang Online':'Tài khoản Offline')+' • '+rows.length+' có thể chọn';
    tabs?.classList.remove('hidden');tabs?.querySelectorAll('[data-play-seat-member-mode]').forEach(b=>b.classList.toggle('active',b.dataset.playSeatMemberMode===playSeatCandidateMode));
    for(const m of rows){
      const b=document.createElement('button'),initial=(String(m.displayName||m.loginId||'?').trim().charAt(0)||'?').toUpperCase();b.type='button';b.className='play-seat-member-choice';
      b.innerHTML='<img alt=""><div><b>'+playEsc(m.displayName||m.loginId)+'</b><small>'+playEsc(m.loginId)+' • '+(m.online?'ONLINE':'OFFLINE')+'</small></div><span>›</span>';
      const img=b.querySelector('img'),src=playCharacterUrl(m.gameCharacterId);img.src=src||memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{const s=document.createElement('i');s.textContent=initial;img.replaceWith(s)};
      b.onclick=()=>assignSeatCandidate(m.loginId);grid.appendChild(b)
    }
    if(!rows.length)grid.innerHTML='<div class="member-empty">Không có Thành Viên phù hợp.</div>';
    const release=document.getElementById('playSeatRelease');if(release)release.classList.add('hidden');return
  }
  tabs?.classList.add('hidden');if(label)label.textContent=selected?(selected.displayName+' • '+(selected.seatId?'Vị trí '+selected.seatId:'Chưa có vị trí')):'Chọn Người Chơi trên Làng';if(summary)summary.textContent=stats.occupied+'/'+stats.seatCount+' vị trí có người • '+stats.available+' vị trí trống';
  const bySeat=new Map(playLiveMembers().map(p=>[Number(p?.seatId||0),p]));
  for(let seatId=1;seatId<=stats.seatCount;seatId++){
    const occupant=bySeat.get(seatId)||null,b=document.createElement('button');b.type='button';b.className='play-seat-choice'+(occupant?' occupied':'')+(selected&&Number(selected.seatId)===seatId?' current':'');b.innerHTML='<b>VỊ TRÍ '+seatId+'</b><small>'+playEsc(occupant?.displayName||'TRỐNG')+'</small>';b.onclick=()=>moveSelectedPlayerToSeat(seatId,occupant);grid.appendChild(b)
  }
  const release=document.getElementById('playSeatRelease');if(release){release.classList.remove('hidden');release.disabled=!selected?.seatId}
}
async function openPlaySeatSheet(){playSeatManualOpen=false;playSeatAssignTarget=0;if(!selectedPlayPlayer()){playFlashError('Hãy chạm vào một Người Chơi trên Làng trước.');return}renderPlaySeatSheet();document.getElementById('playSeatSheet')?.classList.remove('hidden')}
function openPlaySeatManualSheet(){playSeatAssignTarget=0;playSeatManualOpen=true;renderPlaySeatSheet();document.getElementById('playSeatSheet')?.classList.remove('hidden')}
function closePlaySeatSheet(){playSeatManualOpen=false;playSeatAssignTarget=0;document.getElementById('playSeatSheet')?.classList.remove('is-manual');document.getElementById('playSeatSheet')?.classList.add('hidden')}
async function updateSelectedPlayerSeat(payload){
  const selected=selectedPlayPlayer();if(!selected)return;playSetBusy(true);
  try{const data=await playRoomApi('/seat',{method:'POST',body:JSON.stringify({participantId:selected.participantId||('member:'+selected.loginId),...payload})});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;savePlayScene();renderPlayScene();renderPlaySeatSheet()}
  catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function moveSelectedPlayerToSeat(seatId,occupant){
  const selected=selectedPlayPlayer();if(!selected){playFlashError('Chọn người chơi ở cột DANH SÁCH trước khi chọn vị trí.');return}if(String(occupant?.participantId||'')===String(selected.participantId||''))return;
  if(occupant&&!confirm('Vị trí '+seatId+' đang có '+occupant.displayName+'. Đổi chỗ hai người?'))return;
  await updateSelectedPlayerSeat({seatId,swap:!!occupant})
}
async function releaseSelectedPlayerSeat(){const selected=selectedPlayPlayer();if(!selected?.seatId)return;if(!confirm('Giải phóng Seat '+selected.seatId+' của '+selected.displayName+'?'))return;await updateSelectedPlayerSeat({seatId:null})}
async function playCallOnlineMembers(){
  if(!isLivePlayRoom()||playSceneRuntime.busy)return;
  playSetBusy(true);
  try{
    await playLoadFreshRosterMembers();
    const existing=playLiveMembers(),byId=new Map(existing.map(m=>[String(m.loginId),m]));
    const online=(memberAdminState.members||[]).filter(m=>m?.online===true&&(!m.currentRoomCode||String(m.currentRoomCode)===String(playSceneState.roomCode)));
    const ids=new Set([...byId.keys(),...online.map(m=>String(m.loginId))]);
    if(ids.size>30)throw new Error('Phòng hỗ trợ tối đa 30 thành viên.');
    const source=new Map((memberAdminState.members||[]).map(m=>[String(m.loginId),m]));
    const chosen=[...ids].map(id=>{const m=source.get(id)||byId.get(id);return {loginId:id,displayName:m?.displayName||id,avatarId:m?.avatarId,gameCharacterId:m?.gameCharacterId||byId.get(id)?.gameCharacterId||null,seatId:byId.get(id)?.seatId||null}});
    if(!chosen.length){playFlashError('Chưa có thành viên online trong sảnh chờ.');return}
    const data=await playRoomApi('/participants',{method:'POST',body:JSON.stringify({members:chosen,replace:true})});
    playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;
    playSceneState.selectedMemberIds=[...ids];savePlayScene();renderPlayScene();
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playRandomSeatRemaining(){
  if(!isLivePlayRoom())return;const remaining=playLiveMembers().filter(m=>!Number(m?.seatId||0));if(!remaining.length){playFlashError('Tất cả Người Chơi đã có vị trí.');return}
  playSetBusy(true);
  try{
    const data=await playRoomApi('/seats/randomize-remaining',{method:'POST',body:'{}'});playSceneRuntime.room=data.room||playSceneRuntime.room;playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;savePlayScene();renderPlayScene()
  }catch(err){playFlashError(err.message)}finally{playSetBusy(false)}
}
async function playSetSeatLock(locked=true){
  if(!isLivePlayRoom())return false;
  try{const data=await playRoomApi('/seat-lock',{method:'POST',body:JSON.stringify({locked:locked!==false})});playSceneRuntime.room=data.room||playSceneRuntime.room;renderPlayScene();return !!data.seatsLocked}catch(err){playFlashError(err.message);return false}
}
async function playFinishSeating(){
  const members=playLiveMembers(),missing=members.filter(m=>!Number(m?.seatId||0));if(missing.length){playFlashError('Còn '+missing.length+' Người Chơi chưa có vị trí. Dùng “Phân vị trí còn lại” hoặc chọn từng người.');return}
  const locked=await playSetSeatLock(true);if(locked){playSceneState.step='game';playSceneState.activePlayerId='';savePlayScene();renderPlayScene();void playPublishStage('game')}
}
/* Match completion is shared by ordinary rooms and DEMO. No room is reset until GM chooses. */
const playCompletionState={key:'',dismissed:'',winner:'',completed:false,busy:false,matchId:'',roomCode:'',config:null,templateId:''};
function renderPlayCompletion(){
  const s=playCompletionState,title=document.getElementById('playCompletionTitle'),text=document.getElementById('playCompletionMessage');
  if(title)title.textContent=s.completed&&s.winner?'🏆 '+s.winner.toUpperCase()+' CHIẾN THẮNG':s.winner?'XÁC NHẬN '+s.winner.toUpperCase():'KẾT QUẢ VÁN';
  const ceremony=document.getElementById('playMatchCompletionSheet');
  if(ceremony){ceremony.dataset.victory=String(!!s.completed);ceremony.dataset.faction=String(s.winner||'');}
  const sparkle=ceremony?.querySelector('.gmww-winner-sea-glow');if(sparkle)sparkle.hidden=!s.completed;
  if(text)text.textContent=s.completed?'Ván đã hoàn thành. Chọn bước tiếp theo.':'Xác nhận phe thắng rồi hoàn thành ván.';
  for(const b of document.querySelectorAll('[data-completion-winner]')){b.setAttribute('aria-pressed',String(b.dataset.completionWinner===s.winner));b.disabled=s.completed||s.busy}
  const confirm=document.getElementById('playCompletionConfirm');if(confirm){confirm.hidden=s.completed;confirm.disabled=!s.winner||s.busy}
  const choices=document.getElementById('playCompletionChoices');if(choices)choices.hidden=!s.completed;
  const abort=document.getElementById('playCompletionAbort');if(abort)abort.hidden=s.completed;
  for(const b of document.querySelectorAll('[data-completion-next]'))b.disabled=s.busy;
}
function playCompletionIsCurrentResult(room){
  const phase=String(room?.phase||'').toLowerCase();
  const matchId=String(room?.matchId||''),endedMatchId=String(room?.lastEndedMatchId||'');
  return ['lobby','ended'].includes(phase)&&!!room?.endedAt&&!!room?.winnerFaction&&
    !!matchId&&matchId===endedMatchId&&
    !['game','roles','deal'].includes(String(room?.gmStage||'').toLowerCase());
}
async function openPlayCompletionSheet(){
  if(!isLivePlayRoom())return;
  const currentRoom=playSceneRuntime.room||{};
  if(String(currentRoom.phase||'').toLowerCase()!=='running'&&!playCompletionIsCurrentResult(currentRoom)){
    await openPlayEndSheet();return;
  }
  const room=playSceneRuntime.room||{},s=playCompletionState,key=String(playSceneState.roomCode)+':'+String((room.endedAt?room.lastEndedMatchId:room.matchId)||room.matchId||'');
  if(s.key!==key){
    s.key=key;s.roomCode=String(playSceneState.roomCode);s.matchId=String((room.endedAt?room.lastEndedMatchId:room.matchId)||room.matchId||'');
    s.config=playSceneRuntime.gameConfig;s.templateId=playSceneState.gameTemplateId||'';
    s.winner=String(room.winnerFaction||playSceneRuntime.winProposal?.winnerFaction||'');s.completed=!!room.endedAt&&!!room.winnerFaction;
  }
  if(typeof demoStop==='function'&&demoRunner.running)await demoStop('winner_ready');
  if(!s.completed&&room.autoGM===true&&room.phase==='running'){
    const paused=await playRoomApi('/auto',{method:'POST',body:JSON.stringify({enabled:false})});playSceneRuntime.room=paused.room||room;playSceneState.autoGM=false;
  }
  renderPlayCompletion();document.getElementById('playMatchCompletionSheet')?.classList.remove('hidden');
}
function closePlayCompletionSheet(){playCompletionState.dismissed=playCompletionState.key;document.getElementById('playMatchCompletionSheet')?.classList.add('hidden')}
async function playWatchCompletion(data){
  const room=data?.room;if(!room)return;
  const running=String(room.phase||'').toLowerCase()==='running',completed=playCompletionIsCurrentResult(room);
  // A new match must never inherit the previous match's winner overlay.
  if(!running&&!completed){document.getElementById('playMatchCompletionSheet')?.classList.add('hidden');return}
  // Finished results remain readable on demand, but never pop up on room re-entry.
  if(!running||!data.winProposal)return; // Running GM may still choose a winner manually.
  const key=String(playSceneState.roomCode)+':'+String((room.endedAt?room.lastEndedMatchId:room.matchId)||room.matchId||'');
  if(playCompletionState.key!==key&&playCompletionState.dismissed!==key)
    await openPlayCompletionSheet();
}
async function confirmPlayCompletion(){
  const s=playCompletionState;if(s.busy||s.completed||!s.winner||s.roomCode!==String(playSceneState.roomCode))return;
  s.busy=true;renderPlayCompletion();
  try{
    if(demoRunner.running)await demoStop('winner_ready');
    const data=await playRoomApi('/end',{method:'POST',body:JSON.stringify({matchId:s.matchId,winnerFaction:s.winner,winnerLabel:s.winner})});
    if(data?.ok!==true)throw Error(data?.message||data?.error||'Server chưa xác nhận hoàn thành ván.');
    playSceneRuntime.room=data.room||playSceneRuntime.room;s.completed=true;
    await playSyncRoom(true);renderPlayCompletion();
  }catch(err){playFlashError(err?.message||String(err))}
  finally{s.busy=false;renderPlayCompletion()}
}
async function playCompletionNext(choice){
  const s=playCompletionState;if(!s.completed||s.busy||s.roomCode!==String(playSceneState.roomCode))return;
  if(!['replay','game','room','exit'].includes(choice))return;
  s.busy=true;renderPlayCompletion();
  try{
    if(choice==='room'||choice==='exit'){
      // Leave is a real server-side seat release, not a local screen reset.
      // Match history and the already-recorded winner remain in matchCompletion storage.
      const reset=await playRoomApi('/reset',{method:'POST',body:JSON.stringify({
        transactionId:'completed-leave-'+s.matchId,
        expectedResetVersion:Number(playSceneRuntime.room?.resetVersion||0),
        postGame:false,preserveParticipants:false
      })});
      if(reset?.hardReset!==true||Number(reset?.playersCount||0)!==0||Number(reset?.assignmentsCount||0)!==0)
        throw new Error('Server chưa giải phóng hết người chơi và Seat. Không thể rời ván.');
      playSceneRuntime.room=reset.room||playSceneRuntime.room;
      rememberPlayRoom(playSceneState.roomCode,playSceneState.gmToken,playSceneRuntime.room||{});
      disconnectPlaySocket();playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.step='lobby';playSceneState.phase='lobby';playSceneState.night=0;playSceneState.gameTemplateId='';playSceneState.assignmentsPreview=[];
      // Otherwise playLiveMembers() reconstructs ghost Seat occupants from GM's stale selection.
      playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';playSceneState.matchId='';
      playSceneRuntime.room=null;playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;playSceneRuntime.nightRuntime=null;playSceneRuntime.winProposal=null;
      closePlayCompletionSheet();savePlayScene();renderPlayScene();if(choice==='exit'){exitPlayImmersive({completed:true});return}return;
    }
    const data=await playRoomApi('/reset',{method:'POST',body:JSON.stringify({postGame:true,preserveParticipants:true,expectedResetVersion:Number(playSceneRuntime.room?.resetVersion||0),transactionId:'next-'+s.matchId})});
    if(data?.ok!==true||data.preserveParticipants!==true)throw Error('Server chưa xác nhận chuẩn bị ván tiếp theo.');
    playSceneRuntime.room=data.room;playSceneRuntime.players=data.players||[];playSceneRuntime.assignments=[];playSceneRuntime.nightRuntime=null;playSceneRuntime.activeEffects=[];playSceneRuntime.winProposal=null;playSceneRuntime.dayActionUsage=[];playSceneRuntime.battleActionUsage=[];playSceneRuntime.gallows=null;playSceneRuntime.artifactCycle={count:0,max:Number(s.config?.artifactLimitPerCycle??3),accepted:[]};
    playSceneState.phase='lobby';playSceneState.night=0;playSceneState.assignmentsPreview=[];playSceneState.artifactCount=0;
    if(choice==='replay'){
      if(!s.config)throw Error('Không tìm thấy Ván Mẫu của ván trước.');
      const matchId='match-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36));
      const configured=await playRoomApi('/config',{method:'POST',body:JSON.stringify({gameConfig:s.config,matchId,matchRevision:1})});
      playSceneRuntime.room=configured.room||playSceneRuntime.room;playSceneRuntime.gameConfig=configured.gameConfig||s.config;
      playSceneState.matchId=matchId;playSceneState.gameTemplateId=s.templateId;playSceneState.step='roles';
      await playPublishStage('roles');playBuildAssignments({random:true});
    }else{
      playSceneState.matchId='';playSceneState.gameTemplateId='';playSceneState.rolePlan={};playSceneState.step='game';await playPublishStage('game');
    }
    closePlayCompletionSheet();savePlayScene();renderPlayScene();if(choice==='game')await openPlayGameSheet();
  }catch(err){playFlashError(err?.message||String(err))}
  finally{s.busy=false;renderPlayCompletion()}
}
function initPlayCompletion(){
  const sheet=document.getElementById('playMatchCompletionSheet');if(!sheet||sheet.dataset.bound)return;sheet.dataset.bound='1';
  document.getElementById('playCompletionConfirm')?.addEventListener('click',()=>{void confirmPlayCompletion()});
  document.getElementById('playCompletionClose')?.addEventListener('click',closePlayCompletionSheet);
  document.getElementById('playCompletionAbort')?.addEventListener('click',()=>{closePlayCompletionSheet();void openPlayEndSheet()});
  for(const button of sheet.querySelectorAll('[data-completion-winner]'))button.addEventListener('click',()=>{playCompletionState.winner=button.dataset.completionWinner;renderPlayCompletion()});
  for(const button of sheet.querySelectorAll('[data-completion-next]'))button.addEventListener('click',()=>{void playCompletionNext(button.dataset.completionNext)});
}

async function openPlayEndSheet(){
  // Forced end is available during room setup, seating, role delivery, day or night.
  if(!isLivePlayRoom()){playFlashError('Chưa chọn Phòng để kết thúc ván.');return}
  if(!playSceneRuntime.room)await playSyncRoom(true);
  if(!isLivePlayRoom())return;
  const sheet=document.getElementById('playEndSheet');if(!sheet)return;
  const label=document.getElementById('playEndRoomLabel');
  if(label)label.textContent='Phòng '+playSceneState.roomCode+' • '+(playSceneRuntime.room?.roomName||'GMWW');
  const btn=document.getElementById('playEndConfirm');if(btn)btn.disabled=!!playSceneRuntime.busy;
  sheet.classList.remove('hidden');
}
function closePlayEndSheet(){document.getElementById('playEndSheet')?.classList.add('hidden')}

/* Shared Server GM outside-tap policy: dismiss the topmost visible floating
   sheet, never submit a form, confirm a game action or discard saved data.
   The active navigation pages remain navigable rather than auto-exiting play. */
function gmwwDismissOutsidePointer(event){
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const target=event.target;
  if(!target?.closest)return;
  const sheets=[...document.querySelectorAll('.sheet')].filter(el=>!el.hidden&&!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none');
  if(sheets.length){
    // Respect z-index; for equal layers the last DOM node is topmost.
    const sheet=sheets.map((el,index)=>({el,index,z:Number.parseInt(getComputedStyle(el).zIndex,10)||0}))
      .sort((a,b)=>a.z-b.z||a.index-b.index).at(-1).el;
    if(sheet.querySelector('.sheet-card')?.contains(target))return;
    const close={
      editSheet:()=>closeSheet(),
      playGameSheet:()=>closePlayGameSheet(),
      playMatchCompletionSheet:()=>closePlayCompletionSheet(),
      playEndSheet:()=>closePlayEndSheet(),
      playRosterSheet:()=>closePlayRosterSheet(),
      playSeatSheet:()=>closePlaySeatSheet(),
      playDisbandSheet:()=>closePlayDisbandSheet(),
      memberSheet:()=>closeMemberSheet(),
      playGMSheet:()=>closePlayGMSheet(),
      playCreateRoomSheet:()=>document.getElementById('playCreateRoomClose')?.click()
    }[sheet.id];
    if(!close)return;
    event.preventDefault?.();event.stopImmediatePropagation?.();
    close();
    return;
  }
  // Dynamically mounted GM chat is also a floating panel.
  const chat=document.getElementById('gmwwGMChatPanel');
  if(chat?.classList.contains('open')&&!chat.contains(target)&&
     !target.closest('#gmwwGMChatLaunch,[data-gm-admin="open-chat"]')){
    event.preventDefault?.();event.stopImmediatePropagation?.();
    document.getElementById('gmwwGMChatClose')?.click();
    return;
  }
  const cloudflare=document.getElementById('gmwwCloudflarePanel');
  if(cloudflare&&!cloudflare.hidden&&!cloudflare.contains(target)&&
     !target.closest('#gmwwCloudflareOpen,#gmwwServerTrashOpen')){
    event.preventDefault?.();event.stopImmediatePropagation?.();
    document.getElementById('gmwwCloudflareOpen')?.click();
    return;
  }
  const assignment=document.getElementById('playRoleAssignmentPanel');
  if(assignment&&!assignment.hidden&&!assignment.contains(target)&&
     !target.closest('[data-play-step="roles"]')){
    event.preventDefault?.();event.stopImmediatePropagation?.();
    playSceneRuntime.assignmentPanelDismissed=true;
    renderPlayRoleAssignmentPanel();
    return;
  }
  const preset=document.getElementById('playSeatPresetPanel');
  if(preset&&!preset.hidden&&!preset.contains(target)&&!target.closest('#playGatherSeatPreset')){
    closePlaySeatPresetPanel();return;
  }
  // Front-of-card is a viewer, not an unsaved edit form. A tap in the blank
  // library background closes it; Settings/back-face editing is left intact.
  const editor=document.getElementById('entityEditor');
  if(editor&&!editor.classList.contains('hidden')&&
     document.getElementById('library')?.classList.contains('active')&&
     document.getElementById('entityFront')?.classList.contains('active')&&
     !target.closest('#playerCard,.editor-bar,#bottomNav')&&
     (editor.contains(target)||document.getElementById('library')?.contains(target))){
    closeEntityEditor();
  }
}
function gmwwBindOutsideDismiss(){
  const app=document.getElementById('app');
  if(!app||app.dataset.outsideDismissReady==='1')return;
  app.dataset.outsideDismissReady='1';
  document.addEventListener('pointerdown',gmwwDismissOutsidePointer,true);
}

async function confirmPlayEndGame(){
  if(playSceneRuntime.busy)return;
  if(!isLivePlayRoom()){playFlashError('Chưa chọn Phòng để kết thúc ván.');return}
  playSetBusy(true);const btn=document.getElementById('playEndConfirm');if(btn)btn.disabled=true;
  try{
    // Reuse the server's authenticated hard reset. This does not record a winner.
    const resetVersion=Number(playSceneRuntime.room?.resetVersion||0);
    const data=await playRoomApi('/reset',{method:'POST',body:JSON.stringify({
      transactionId:'forced-end-'+Date.now(),expectedResetVersion:resetVersion,
      forceEnd:true,postGame:false,preserveParticipants:false
    })});
    if(data?.hardReset!==true||Number(data?.playersCount||0)!==0)throw new Error('Server chưa xác nhận kết thúc cưỡng ép và giải phóng toàn bộ người chơi.');
    playSceneRuntime.room=data.room||null;
    playSceneRuntime.players=[];playSceneRuntime.assignments=[];playSceneRuntime.gameConfig=null;
    playSceneRuntime.nightRuntime=null;playSceneRuntime.winProposal=null;
    playSceneRuntime.activeEffects=[];playSceneRuntime.artifactCycle={count:0,max:3};
    playSceneRuntime.selectedWinnerFaction='';
    playSceneState.step='lobby';playSceneState.phase='lobby';playSceneState.night=0;
    disconnectPlaySocket();playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.roomEnabled=false;
    playSceneState.artifactCount=0;playSceneState.assignmentsPreview=[];
    playSceneState.selectedMemberIds=[];playSceneState.activePlayerId='';
    playSceneState.roleId='';playSceneState.artifactId='';
    playSceneState.matchId='';playSceneState.gameName='Ván GMWW';
    playSceneState.gameTemplateId='';playSceneState.rolePlan={};
    playSceneState.roleDurations={};playSceneState.artifactsEnabled=false;
    savePlayScene();closePlayEndSheet();
    renderPlayScene();gmwwSendGmPresence(true);
    playFlashError('Đã kết thúc ván. Trở về Sảnh chờ (bước 1).');
  }catch(err){playFlashError(err.message||'Không thể kết thúc cưỡng ép.')}
  finally{playSetBusy(false);if(btn)btn.disabled=false}
}
function playRosterSelectedIds(){return [...document.querySelectorAll('#playRosterList .play-roster-row.selected')].map(x=>String(x.dataset.loginId||'')).filter(Boolean)}
function updatePlayRosterCount(){const count=playRosterSelectedIds().length,el=document.getElementById('playRosterCount');if(el)el.textContent=count+' đã chọn'}
let playRosterFilterMode='all';
function applyPlayRosterFilter(){
  const list=document.getElementById('playRosterList');if(!list)return;
  document.querySelectorAll('#playRosterFilters [data-play-roster-filter]').forEach(btn=>{
    const active=btn.dataset.playRosterFilter===playRosterFilterMode;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
  });
  const rows=[...list.querySelectorAll('.play-roster-row')];let visible=0;
  rows.forEach(row=>{
    const show=playRosterFilterMode==='all'||row.dataset.presence===playRosterFilterMode;
    row.classList.toggle('hidden',!show);
    if(show)visible++;
  });
  let empty=document.getElementById('playRosterFilterEmpty');
  if(rows.length&&!empty){
    empty=document.createElement('div');empty.id='playRosterFilterEmpty';empty.className='member-empty';
    list.appendChild(empty);
  }
  if(empty){
    empty.textContent=playRosterFilterMode==='online'?'Không có Thành Viên Online.':playRosterFilterMode==='offline'?'Không có Thành Viên Offline.':'Chưa có Thành Viên trong danh bạ.';
    empty.classList.toggle('hidden',visible>0);
  }
}
function setPlayRosterFilter(mode){
  playRosterFilterMode=mode==='online'||mode==='offline'?mode:'all';
  applyPlayRosterFilter();
}
async function playLoadFreshRosterMembers(){
  const data=await gmApi('/api/gm/members');
  if(!Array.isArray(data?.members))throw new Error('Không nhận được danh sách Thành Viên mới nhất.');
  memberAdminState.members=data.members;memberAdminState.loaded=true;
  return data.members;
}
let playRosterPresenceTimer=null;
async function playRefreshRosterPresence(){
  const sheet=document.getElementById('playRosterSheet');
  if(!sheet||sheet.classList.contains('hidden'))return;
  try{
    const members=await playLoadFreshRosterMembers();
    if(sheet.classList.contains('hidden'))return;
    const live=new Map(members.map(m=>[String(m.loginId),m]));
    document.querySelectorAll('#playRosterList .play-roster-row').forEach(row=>{
      const member=live.get(String(row.dataset.loginId||'')),online=member?.online===true;
      const dot=row.querySelector('.play-roster-presence');
      if(!dot)return;
      dot.classList.toggle('is-online',online);dot.classList.toggle('is-offline',!online);
      dot.setAttribute('aria-label',online?'Đang trực tuyến':'Đang ngoại tuyến');
      dot.title=online?'Đang trực tuyến':'Đang ngoại tuyến';
      row.dataset.presence=online?'online':'offline';
    });
    applyPlayRosterFilter();
  }catch(err){console.warn('[GMWW roster presence]',err)}
}
async function openPlayRosterSheet(){
  if(!isLivePlayRoom()){await playCreateRoom();return}
  const sheet=document.getElementById('playRosterSheet'),list=document.getElementById('playRosterList');if(!sheet||!list)return;
  list.innerHTML='<div class="member-empty">Đang đồng bộ trạng thái Thành Viên…</div>';
  let rows;
  try{rows=await playLoadFreshRosterMembers()}
  catch(err){list.innerHTML='<div class="member-empty member-error">'+playEsc(err.message||'Không đồng bộ được trạng thái.')+'</div>';sheet.classList.remove('hidden');return}
  const selected=new Set((playSceneState.selectedMemberIds||[]).map(String));
  document.getElementById('playRosterRoomLabel').textContent='Phòng '+playSceneState.roomCode;list.innerHTML='';
  for(const m of rows){
    const b=document.createElement('button');b.type='button';b.className='play-roster-row'+(selected.has(String(m.loginId))?' selected':'');b.dataset.loginId=String(m.loginId);b.dataset.presence=m.online===true?'online':'offline';
    const initial=(String(m.displayName||m.loginId||'?').trim().charAt(0)||'?').toUpperCase();
    const online=m.online===true,status=online?'Đang trực tuyến':'Đang ngoại tuyến';
    b.innerHTML='<img alt=""><div><b>'+playEsc(m.displayName||m.loginId)+'</b></div><span class="play-roster-presence '+(online?'is-online':'is-offline')+'" role="img" aria-label="'+status+'" title="'+status+'"></span><span class="play-roster-check">✓</span>';
    const img=b.querySelector('img'),characterSrc=playCharacterUrl(m.gameCharacterId);img.src=characterSrc||memberAvatarUrl(m.gameCharacterId||m.avatarId);img.onerror=()=>{if(characterSrc&&img.src!==memberAvatarUrl(m.gameCharacterId||m.avatarId)){img.src=memberAvatarUrl(m.gameCharacterId||m.avatarId);return}const s=document.createElement('span');s.className='play-roster-avatar-fallback';s.textContent=initial;img.replaceWith(s)};
    b.onclick=()=>{b.classList.toggle('selected');updatePlayRosterCount()};list.appendChild(b);
  }
  if(!rows.length)list.innerHTML='<div class="member-empty">Chưa có Thành Viên trong danh bạ.</div>';
  sheet.classList.remove('hidden');updatePlayRosterCount();setPlayRosterFilter('all');
  if(playRosterPresenceTimer)clearInterval(playRosterPresenceTimer);
  playRosterPresenceTimer=setInterval(()=>{if(!document.hidden)void playRefreshRosterPresence()},10000);
}
let playRosterSaving=false;
function playRosterSaveFeedback(message='',isError=false){
  const status=document.getElementById('playRosterSaveStatus');if(!status)return;
  status.textContent=String(message||'');status.hidden=!message;status.dataset.kind=isError?'error':'info';
}
function closePlayRosterSheet(){
  if(playRosterSaving)return;
  if(playRosterPresenceTimer)clearInterval(playRosterPresenceTimer);
  playRosterPresenceTimer=null;
  document.getElementById('playRosterSheet')?.classList.add('hidden');
}
async function savePlayRosterIds(ids){
  // Confirm once against the authoritative room. Do not make the GM wait for a
  // second GET + full-scene render after the server has acknowledged the POST.
  if(playSceneRuntime.busy||playRosterSaving)return;
  ids=[...new Set((ids||[]).map(String).filter(Boolean))];
  if(!ids.length){playRosterSaveFeedback('Hãy chọn ít nhất 1 Người Chơi.',true);playFlashError('Hãy chọn ít nhất 1 Người Chơi.');return}
  const existing=new Map(playLiveMembers().map(p=>[String(p.loginId),p])),source=memberAdminState.members||[],selected=new Set(ids);
  const chosen=source.filter(m=>selected.has(String(m.loginId))).map(m=>({
    loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,
    gameCharacterId:m.gameCharacterId||existing.get(String(m.loginId))?.gameCharacterId||null,
    seatId:existing.get(String(m.loginId))?.seatId||null
  }));
  if(chosen.length!==ids.length){playRosterSaveFeedback('Danh sách đã thay đổi. Hãy mở lại Gọi Người.',true);return}
  if(playSceneState.roomMode==='online'&&playSceneRuntime.room?.demo!==true){
    const offline=source.filter(m=>selected.has(String(m.loginId))&&m.online!==true);
    if(offline.length){playRosterSaveFeedback('Chế độ ONLINE chỉ chọn Người Chơi đang Online.',true);playFlashError('Chế độ ONLINE chỉ chọn Người Chơi đang Online.');return}
  }
  const roomCode=String(playSceneState.roomCode);
  const save=document.getElementById('playRosterSave'),cancel=document.getElementById('playRosterCancel'),selectAll=document.getElementById('playRosterSelectAll'),sheet=document.getElementById('playRosterSheet');
  playRosterSaving=true;playSetBusy(true);
  if(save){save.disabled=true;save.textContent='ĐANG XỬ LÝ…'}
  if(cancel)cancel.disabled=true;if(selectAll)selectAll.disabled=true;
  sheet?.setAttribute('aria-busy','true');
  playRosterSaveFeedback('Đang xác nhận '+ids.length+' thành viên với Server…');
  try{
    const data=await playRoomApi('/participants',{method:'POST',timeoutMs:12000,body:JSON.stringify({members:chosen,replace:true})});
    if(data?.ok!==true||Number(data.selectedCount)!==ids.length)throw new Error('Server chưa xác nhận đủ Thành Viên. Danh sách chưa được chốt.');
    if(roomCode!==String(playSceneState.roomCode))throw new Error('Phòng đã thay đổi. Vui lòng mở lại Gọi Người.');
    playSceneRuntime.room=data.room||playSceneRuntime.room;
    playSceneRuntime.players=Array.isArray(data.players)?data.players:playSceneRuntime.players;
    playSceneState.selectedMemberIds=ids;playSceneState.step='seats';savePlayScene();
    // Release the sheet on POST acknowledgement, not after the much heavier
    // follow-up GET/status-display sync/character redraw.
    playRosterSaving=false;closePlayRosterSheet();
    void playPublishStage('seats');
    renderPlayScene();
    setTimeout(()=>{if(isLivePlayRoom()&&String(playSceneState.roomCode)===roomCode&&!playSceneRuntime.busy)void playSyncRoom(true)},0);
  }catch(err){
    const message=String(err?.message||'Không thể xác nhận. Vui lòng thử lại.');
    playRosterSaveFeedback(message,true);playFlashError(message);
  }finally{
    playRosterSaving=false;playSetBusy(false);
    if(save){save.disabled=false;save.textContent='XÁC NHẬN'}
    if(cancel)cancel.disabled=false;if(selectAll)selectAll.disabled=false;
    sheet?.removeAttribute('aria-busy');
  }
}
async function savePlayRoster(){
  return savePlayRosterIds(playRosterSelectedIds());
}

function playApplyLobbyStage(generation){
  playSceneRuntime.syncSerial++;
  disconnectPlaySocket();
  playSceneState.step='lobby';playSceneState.phase='lobby';playSceneState.night=0;
  playSceneState.roomCode='—';playSceneState.gmToken='';playSceneState.roomEnabled=false;
  playSceneState.lobbyGeneration=Math.max(Number(playSceneState.lobbyGeneration||0),Number(generation||0));
  playSceneState.activePlayerId='';playSceneState.selectedMemberIds=[];playSceneState.assignmentsPreview=[];
  playSceneState.matchId='';playSceneState.artifactCount=0;playSceneState.rolePlan={};playSceneState.gameTemplateId='';
  playSceneRuntime.room=null;playSceneRuntime.players=[];playSceneRuntime.assignments=[];
  playSceneRuntime.gameConfig=null;playSceneRuntime.nightRuntime=null;playSceneRuntime.winProposal=null;
  playSceneRuntime.activeEffects=[];playSceneRuntime.lastError='';
  playRoomUiState.selectedCode='';playRoomUiState.stage='rooms';playRoomUiState.editorMode='';
  savePlayRoomRegistry(playRoomRegistry().map(r=>({...r,enabled:false})));
  document.getElementById('playCreateRoomSheet')?.classList.add('hidden');
  savePlayScene();renderPlayScene();
}
async function playReturnToLobby(){
  if(playSceneRuntime.busy||playSceneState.step==='lobby')return false;
  if(!confirm('Trở về SẢNH CHỜ?\nHệ thống sẽ RESET và TẮT tất cả phòng, kết thúc các ván đang diễn ra và đưa người chơi trên mọi thiết bị về sảnh chờ.\nTài khoản, nhân vật và Ván Mẫu vẫn được giữ nguyên.'))return false;
  if(typeof demoStop==='function')await demoStop('lobby_reset');
  playSetBusy(true);
  try{
    const data=await gmApi('/api/gm/lobby/reset',{method:'POST',body:JSON.stringify({source:'GM_BACK'})});
    if(data?.ok!==true||data?.reset!==true)throw new Error('Server chưa xác nhận reset toàn bộ phòng.');
    playApplyLobbyStage(data.generation);
    gmwwSendGmPresence(true);
    return true;
  }catch(err){playFlashError('Chưa thể về sảnh chờ. '+(err?.message||err));return false}
  finally{playSetBusy(false)}
}
async function backPlayPhase(){
  if(demoRunner.running)return;
  if(playSceneRuntime.busy)return;
  if(playSceneState.phase==='night'&&playSceneRuntime.nightRuntime&&Number(playSceneRuntime.nightRuntime.cursor||0)>0){
    playSetBusy(true);try{const d=await playRoomApi('/turn',{method:'POST',body:JSON.stringify({action:'back'})});playSceneRuntime.nightRuntime=d?.runtime||playSceneRuntime.nightRuntime;await playSyncRoom(true)}catch(err){playFlashError(err.message)}finally{playSetBusy(false)}return
  }
  if(playSceneState.phase!=='lobby'){await playSyncRoom(true);return}
  if(playSceneState.step==='lobby')return;
  if(playSceneState.step==='seats'||playSceneState.step==='room'){await playReturnToLobby();return}
  advancePlaySetup(-1)
}
const PLAY_GAME_CHROME_IDLE_MS=30000;
let playGameChromeIdleTimer=0;
const GMWW_CHROME_MENU_KEY='gmww_play_menu_hidden_v3236';
let gmwwPlayChromeHidden=false;
try{gmwwPlayChromeHidden=localStorage.getItem(GMWW_CHROME_MENU_KEY)==='1'}catch{}
function setPlayGameChromeHidden(hidden){
  const shell=document.getElementById('playShell');
  shell?.classList.toggle('gmww-chrome-hidden',!!hidden);
  for(const id of ['playSetupStrip','gmTopMenu','playBattleTop','battleBottomControls']){
    const menu=document.getElementById(id);if(!menu)continue;
    menu.classList.toggle('is-auto-hidden',!!hidden);menu.dataset.autoHidden=hidden?'1':'0';
  }
  const toggle=document.getElementById('battleGMChromeToggle');
  if(toggle){toggle.setAttribute('aria-pressed',String(!hidden));toggle.textContent='Menu';toggle.title=hidden?'Nhấn để bật hiển thị menu trên và dưới':'Nhấn để tắt hiển thị menu trên và dưới';toggle.setAttribute('aria-label','Menu trên và dưới: '+(hidden?'Tắt':'Bật'))}
}
function gmwwTogglePlayChrome(){
  gmwwPlayChromeHidden=!gmwwPlayChromeHidden;
  try{localStorage.setItem(GMWW_CHROME_MENU_KEY,gmwwPlayChromeHidden?'1':'0')}catch{}
  setPlayGameChromeHidden(gmwwPlayChromeHidden);
}
function clearPlayGameChromeIdle(){
  if(playGameChromeIdleTimer){clearTimeout(playGameChromeIdleTimer);playGameChromeIdleTimer=0}
}
function resetPlayGameChromeIdle(){
  // V3.236: GM's explicit toggle owns visibility. Touching the map must not
  // reveal a deliberately hidden toolbar or auto-hide a deliberately shown one.
  clearPlayGameChromeIdle();
  setPlayGameChromeHidden(gmwwPlayChromeHidden);
}
function initPlayGameChromeAutoHide(){
  const top=document.getElementById('playSetupStrip'),bottom=document.getElementById('gmTopMenu');
  if((top?.dataset.autoHideBound==='1')||(bottom?.dataset.autoHideBound==='1'))return;
  if(top)top.dataset.autoHideBound='1';if(bottom)bottom.dataset.autoHideBound='1';
  const reveal=()=>resetPlayGameChromeIdle();
  document.addEventListener('pointerdown',reveal,{capture:true,passive:true});
  document.addEventListener('touchstart',reveal,{capture:true,passive:true});
  document.addEventListener('keydown',reveal,{capture:true});
  document.addEventListener('wheel',reveal,{capture:true,passive:true});
  let lastMove=0;
  document.addEventListener('mousemove',()=>{const now=Date.now();if(now-lastMove>800){lastMove=now;reveal()}},{capture:true,passive:true});
  top?.addEventListener('focusin',reveal);bottom?.addEventListener('focusin',reveal);document.getElementById('playGatherToolbar')?.addEventListener('focusin',reveal);
}
async function enterPlayImmersive(){
  document.body.classList.add('play-immersive');
  resetPlayGameChromeIdle();
  try{if(!memberAdminState.loaded)await loadMembers(false)}catch{}
  if(isLivePlayRoom())await playSyncRoom(true);else renderPlayScene()
}
function exitPlayImmersive(options){
  if(playSceneRuntime.busy)return;
  if(options?.completed!==true&&!confirm('Thoát về Trang Chủ?\nPhòng, vị trí và ván đang chơi vẫn được giữ nguyên. Thao tác này không kết thúc ván.'))return;
  if(typeof demoStop==='function')void demoStop('exit_play');
  document.body.classList.remove('play-immersive');
  if(typeof clearPlayGameChromeIdle==='function'){clearPlayGameChromeIdle();setPlayGameChromeHidden(false)}
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='home'));
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page==='home'));
  const home=document.getElementById('home');if(home)home.scrollTop=0;
  if(typeof gmwwHomeRefresh==='function')void gmwwHomeRefresh(false)
}
async function openPlayCreateRoomSheet(){const sheet=document.getElementById('playCreateRoomSheet');if(!sheet)return;if(isLivePlayRoom())await playSyncRoom(true);playRoomUiState.stage='rooms';playRoomUiState.selectedCode='';playRoomUiState.editorMode='';playRoomUiState.lastTapCode='';playRoomUiState.lastTapAt=0;const seats=document.getElementById('playCreateRoomSeatCount');if(seats)seats.value=String(playSceneState.seatCount||12);renderPlayCreateRoomSheet();sheet.classList.remove('hidden');bindPlayRoomModeButtons()}
const GMWW_GATHER_DRAG_KEY='GMWW_GATHER_DRAG_OFFSET_V1';
function playGatherBoundCorrection(rect,bounds){
  const shift=(start,end,minimum,maximum)=>{
    if(end-start>maximum-minimum)return minimum-start;
    if(start<minimum)return minimum-start;
    if(end>maximum)return maximum-end;
    return 0;
  };
  return {x:shift(rect.left,rect.right,bounds.left,bounds.right),
          y:shift(rect.top,rect.bottom,bounds.top,bounds.bottom)};
}
function initDraggablePlayGatherToolbar(){
  const bar=document.getElementById('playGatherToolbar'),handle=bar?.querySelector('.play-gather-toolbar-head');
  if(!bar||!handle||bar.dataset.dragBound==='1')return;
  bar.dataset.dragBound='1';
  handle.style.touchAction='none';
  handle.style.cursor='grab';
  let x=0,y=0,drag=null;
  try{
    const saved=JSON.parse(localStorage.getItem(GMWW_GATHER_DRAG_KEY)||'null');
    if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)){
      x=Math.max(-2000,Math.min(2000,saved.x));y=Math.max(-2000,Math.min(2000,saved.y));
    }
  }catch{}
  const apply=()=>{
    bar.style.setProperty('--gmww-gather-drag-x',x+'px');
    bar.style.setProperty('--gmww-gather-drag-y',y+'px');
  };
  const boundaries=()=>{
    const viewport=window.visualViewport;
    const vx=Number(viewport?.offsetLeft||0),vy=Number(viewport?.offsetTop||0);
    const vw=Number(viewport?.width||window.innerWidth),vh=Number(viewport?.height||window.innerHeight);
    const timeline=document.getElementById('playSetupStrip');
    const bottomDock=document.getElementById('gmTopMenu');
    const timelineEnd=timeline&&!timeline.classList.contains('is-auto-hidden')?timeline.getBoundingClientRect().bottom+8:vy+8;
    const dockStart=bottomDock&&!bottomDock.classList.contains('is-auto-hidden')?bottomDock.getBoundingClientRect().top-8:vy+vh-8;
    return {left:vx+7,right:vx+vw-7,top:Math.max(vy+8,timelineEnd),bottom:Math.min(vy+vh-8,dockStart)};
  };
  const clampOnscreen=()=>{
    if(bar.classList.contains('hidden')||!bar.getClientRects().length)return;
    const fix=playGatherBoundCorrection(bar.getBoundingClientRect(),boundaries());
    if(fix.x||fix.y){x+=fix.x;y+=fix.y;apply()}
  };
  bar.gmwwGatherClampOnscreen=clampOnscreen;
  apply();
  const save=()=>{try{localStorage.setItem(GMWW_GATHER_DRAG_KEY,JSON.stringify({x,y}))}catch{}};
  handle.addEventListener('pointerdown',e=>{
    if(bar.classList.contains('hidden')||e.target.closest('button,input,textarea,select,a'))return;
    if(e.pointerType==='mouse'&&e.button!==0)return;
    drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:x,baseY:y};
    bar.classList.add('is-dragging');
    handle.style.cursor='grabbing';
    try{handle.setPointerCapture(e.pointerId)}catch{}
    e.preventDefault();
  });
  handle.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.id)return;
    x=drag.baseX+e.clientX-drag.startX;
    y=drag.baseY+e.clientY-drag.startY;
    apply();clampOnscreen();
    e.preventDefault();
  });
  const end=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    drag=null;bar.classList.remove('is-dragging');handle.style.cursor='grab';
    try{handle.releasePointerCapture(e.pointerId)}catch{}
    clampOnscreen();save();
  };
  handle.addEventListener('pointerup',end);
  handle.addEventListener('pointercancel',end);
  handle.addEventListener('dblclick',e=>{
    if(e.target.closest('button,input,textarea,select,a'))return;
    x=0;y=0;apply();clampOnscreen();save();e.preventDefault();
  });
  handle.addEventListener('keydown',e=>{
    const arrows={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
    const d=arrows[e.key];if(!d)return;
    x+=d[0];y+=d[1];apply();clampOnscreen();save();e.preventDefault();
  });
  window.addEventListener('resize',clampOnscreen,{passive:true});
  window.visualViewport?.addEventListener('resize',clampOnscreen,{passive:true});
  requestAnimationFrame(clampOnscreen);
}
/* V3.266 — Game-template sheet belongs to the bottom GM dock, not an
   always-centered full-screen modal. Saved docking is local to this iPhone;
   the Library editor deliberately remains a normal modal. */
const GMWW_GAME_SHEET_DOCK_KEY='gmww_game_template_dock_v2';
function gmwwGameSheetReadDock(){
  try{const state=JSON.parse(localStorage.getItem(GMWW_GAME_SHEET_DOCK_KEY)||'null');
    return state&&['bottom','free'].includes(state.mode)?state:{mode:'bottom',collapsed:true}}
  catch{return{mode:'bottom',collapsed:true}}
}
function gmwwGameSheetSaveDock(next){
  try{localStorage.setItem(GMWW_GAME_SHEET_DOCK_KEY,JSON.stringify(next))}catch{}
}
function gmwwGameSheetLayout(){
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card');
  if(!card||sheet.classList.contains('hidden')||card.dataset.mode!=='play')return;
  const dock=document.getElementById('gmTopMenu'),top=document.getElementById('playSetupStrip');
  const bar=dock?.getBoundingClientRect(),header=top?.getBoundingClientRect();
  const bottomY=bar?.width>60&&bar.top>0?bar.top-5:innerHeight-85;
  const upperY=Math.max(8,(header?.bottom||70)+8);
  const maxHeight=Math.max(130,Math.min(innerHeight-20,bottomY-upperY));
  const availableWidth=Math.max(100,innerWidth-16),width=Math.min(availableWidth,bar?.width>60?bar.width:availableWidth);
  card.style.setProperty('max-height',maxHeight+'px','important');
  card.style.setProperty('width',width+'px','important');
  const saved=gmwwGameSheetReadDock();
  // The compact panel changes its intrinsic height: measure AFTER hiding body.
  sheet.classList.toggle('gmww-template-compact',saved.collapsed===true);
  const rect=card.getBoundingClientRect();
  const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
  const left=saved.mode==='free'?clamp(Number(saved.x)||8,8,innerWidth-rect.width-8):clamp((bar?.left??8)+((bar?.width??width)-rect.width)/2,8,innerWidth-rect.width-8);
  const upper=8,lower=Math.max(8,innerHeight-rect.height-8);
  const rawTop=saved.mode==='free'?(Number(saved.y)||upperY):bottomY-rect.height;
  const y=clamp(rawTop,upper,lower);
  card.style.setProperty('left',left+'px','important');
  card.style.setProperty('top',y+'px','important');
  card.style.setProperty('right','auto','important');card.style.setProperty('bottom','auto','important');
  card.style.setProperty('transform','none','important');
  card.classList.toggle('gmww-dock-snapped',saved.mode==='bottom');
  card.dataset.dockEdge=saved.mode==='bottom'?'bottom':'';
  const toggle=document.getElementById('playGameDockToggle');
  if(toggle){toggle.textContent=saved.collapsed?'⌃':'⌄';toggle.setAttribute('aria-expanded',String(!saved.collapsed));toggle.setAttribute('aria-label',saved.collapsed?'Mở bảng Chọn Ván Mẫu':'Thu gọn Ván Mẫu vào menu dưới')}
}
function gmwwGameSheetSetFloating(enabled){
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card');if(!sheet||!card)return;
  sheet.classList.toggle('gmww-template-floating',!!enabled);
  if(enabled){gmwwGameSheetLayout();return}
  sheet.classList.remove('gmww-template-compact');card.classList.remove('gmww-dock-snapped','gmww-dock-near');
  for(const k of ['left','top','right','bottom','transform','max-height','width'])card.style.removeProperty(k);
  delete card.dataset.dockEdge;
}
function initPlayGameSheetDock(){
  const sheet=document.getElementById('playGameSheet'),card=sheet?.querySelector('.play-game-sheet-card'),handle=card?.querySelector('.sheet-head');
  if(!sheet||!card||!handle||card.dataset.gameDockReady)return;
  card.dataset.gameDockReady='1';
  handle.style.touchAction='none';handle.style.cursor='grab';
  const toggle=document.getElementById('playGameDockToggle');
  toggle?.addEventListener('click',()=>{
    if(card.dataset.mode!=='play')return;
    const saved=gmwwGameSheetReadDock();saved.mode='bottom';saved.collapsed=!saved.collapsed;
    gmwwGameSheetSaveDock(saved);gmwwGameSheetLayout();
  });
  let drag=null;
  handle.addEventListener('pointerdown',event=>{
    if(card.dataset.mode!=='play'||sheet.classList.contains('hidden')||event.target.closest('button,input,select,textarea,a')||(event.pointerType==='mouse'&&event.button!==0))return;
    const rect=card.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
    try{handle.setPointerCapture(event.pointerId)}catch{}
    event.preventDefault();
  });
  handle.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    drag.moved=true;
    const x=Math.max(8,Math.min(innerWidth-card.offsetWidth-8,drag.left+dx));
    const y=Math.max(8,Math.min(innerHeight-card.offsetHeight-8,drag.top+dy));
    card.style.setProperty('left',x+'px','important');card.style.setProperty('top',y+'px','important');
    card.classList.remove('gmww-dock-snapped');
    const menu=document.getElementById('gmTopMenu')?.getBoundingClientRect();
    card.classList.toggle('gmww-dock-near',!!menu&&Math.abs(card.getBoundingClientRect().bottom-(menu.top-5))<=48);
    event.preventDefault();
  },{passive:false});
  const finish=event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const moved=drag.moved;drag=null;
    try{handle.releasePointerCapture(event.pointerId)}catch{}
    if(!moved)return;
    const menu=document.getElementById('gmTopMenu')?.getBoundingClientRect(),rect=card.getBoundingClientRect();
    const snapped=event.type==='pointerup'&&menu&&Math.abs(rect.bottom-(menu.top-5))<=48;
    const old=gmwwGameSheetReadDock();
    const next=snapped?{mode:'bottom',collapsed:old.collapsed}:{mode:'free',collapsed:old.collapsed,x:Math.round(rect.left),y:Math.round(rect.top)};
    gmwwGameSheetSaveDock(next);card.classList.remove('gmww-dock-near');gmwwGameSheetLayout();
  };
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
  window.addEventListener('resize',()=>gmwwGameSheetLayout(),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>gmwwGameSheetLayout(),{passive:true});
}
function initDraggablePlaySheets(){
  document.querySelectorAll('.sheet .sheet-card').forEach(card=>{
    if(card.closest('#playGameSheet'))return; // Dedicated bottom-dock controller below.
    if(card.dataset.dragBound==='1')return;card.dataset.dragBound='1';
    const handle=card.querySelector('.sheet-head');if(!handle)return;
    handle.style.touchAction='none';handle.style.cursor='grab';
    let active=false,startX=0,startY=0,baseX=0,baseY=0,pid=null;
    handle.addEventListener('pointerdown',e=>{
      if(e.target.closest('button,input,select,textarea')||(e.button!==0&&e.pointerType!=='touch'))return;
      active=true;pid=e.pointerId;startX=e.clientX;startY=e.clientY;
      baseX=Number(card.dataset.dragX||0);baseY=Number(card.dataset.dragY||0);
      handle.setPointerCapture?.(pid);handle.style.cursor='grabbing';e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{
      if(!active||e.pointerId!==pid)return;
      const maxX=Math.max(0,(innerWidth-card.offsetWidth)/2),maxY=Math.max(0,(innerHeight-card.offsetHeight)/2);
      const x=Math.max(-maxX,Math.min(maxX,baseX+e.clientX-startX));
      const y=Math.max(-maxY,Math.min(maxY,baseY+e.clientY-startY));
      card.dataset.dragX=x;card.dataset.dragY=y;card.style.transform='translate('+x+'px,'+y+'px)';
      card.classList.toggle('gmww-dock-near',!!gmwwMenuSnap(card.getBoundingClientRect()));
      if(Math.hypot(e.clientX-startX,e.clientY-startY)>12)card.classList.remove('gmww-dock-snapped');
      e.preventDefault();
    });
    const end=e=>{
      if(!active||e.pointerId!==pid)return;
      active=false;handle.style.cursor='grab';
      const rect=card.getBoundingClientRect(),snap=e.type==='pointerup'?gmwwMenuSnap(rect):null;
      card.classList.remove('gmww-dock-near');
      if(snap){
        const nx=Number(card.dataset.dragX||0)+snap.left-rect.left;
        const ny=Number(card.dataset.dragY||0)+snap.top-rect.top;
        card.dataset.dragX=nx;card.dataset.dragY=ny;
        card.style.setProperty('--gmww-dock-width',snap.width+'px');
        card.style.transform='translate('+nx+'px,'+ny+'px)';
        card.classList.add('gmww-dock-snapped');card.dataset.dockEdge=snap.edge;
      }else{card.classList.remove('gmww-dock-snapped');card.style.removeProperty('--gmww-dock-width');delete card.dataset.dockEdge}
      try{handle.releasePointerCapture?.(pid)}catch{}
    };
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  });
}
async function handlePlayTimelineStep(step){
  if(playSceneRuntime.busy)return;
  const from=PLAY_STEPS.indexOf(playSceneState.step),target=PLAY_STEPS.indexOf(step);
  if(from<0||target<0)return;
  if(target===from){
    if(step==='seats'){playGatherToolsDismissed=false;renderPlayGatherToolbar();return}
    if(step==='game')await openPlayGameSheet();
    return;
  }
  if(target===from+1){await advancePlayPhase();return}
  if(target<from){
    if(step==='lobby'){await playReturnToLobby();return}
    setPlayStep(step);
    if(step==='game')await openPlayGameSheet();
    return;
  }
  playFlashError('Hãy hoàn tất bước hiện tại trước khi chuyển đến bước này.');
}
function initPlayScene(){
  gmwwBindOutsideDismiss();
  initPlayCompletion();
  const shell=document.getElementById('playShell');if(!shell)return;
  initBattleControls();
  initPlayGameChromeAutoHide();
  initDraggablePlaySheets();initPlayGameSheetDock();
  initDraggablePlayGatherToolbar();
  document.getElementById('playAssignmentRandom')?.addEventListener('click',()=>{try{playBuildAssignments({random:true})}catch(err){playFlashError(err.message)}});
  document.getElementById('playAssignmentInOrder')?.addEventListener('click',()=>{try{playBuildAssignments({random:false})}catch(err){playFlashError(err.message)}});
  document.getElementById('playAssignmentArtifactShuffle')?.addEventListener('click',()=>{try{playRerollArtifacts()}catch(err){playFlashError(err.message)}});
  document.getElementById('playAssignmentBack')?.addEventListener('click',()=>{setPlayStep('game');void openPlayGameSheet()});
  document.getElementById('playAssignmentConfirm')?.addEventListener('click',playSaveAssignments);
  document.querySelector('[data-play-step="roles"]')?.addEventListener('click',()=>{playSceneRuntime.assignmentPanelDismissed=false;renderPlayRoleAssignmentPanel()});
  document.getElementById('playGatherCall')?.addEventListener('click',()=>{void playGatherCallMembers()});
  document.getElementById('playGatherSeatPreset')?.addEventListener('click',openPlaySeatPresetPanel);
  document.getElementById('playSeatPresetClose')?.addEventListener('click',closePlaySeatPresetPanel);

  document.getElementById('playGatherRandom')?.addEventListener('click',()=>{void playGatherRandomize()});
  document.getElementById('playGatherManual')?.addEventListener('click',playGatherManual);
  document.getElementById('playGatherDisband')?.addEventListener('click',openPlayDisbandSheet);
  document.getElementById('playGatherConfirm')?.addEventListener('click',()=>{void playGatherConfirm()});
  document.getElementById('playGatherClose')?.addEventListener('click',()=>{playGatherToolsDismissed=false;renderPlayGatherToolbar()});
  document.getElementById('playDisbandClose')?.addEventListener('click',closePlayDisbandSheet);
  document.getElementById('playDisbandAll')?.addEventListener('click',()=>{void playDisbandAll()});
  document.getElementById('playDisbandSheet')?.addEventListener('click',ev=>{if(ev.target===document.getElementById('playDisbandSheet'))closePlayDisbandSheet()});
  document.querySelectorAll('[data-play-step]').forEach(b=>b.addEventListener('click',()=>{void handlePlayTimelineStep(b.dataset.playStep)}));
  document.getElementById('playPhasePill')?.addEventListener('click',()=>{void advancePlayPhase()});
  document.getElementById('playExitVillage')?.addEventListener('click',exitPlayImmersive);
  document.querySelectorAll('.nav[data-page="start"]').forEach(n=>n.addEventListener('click',enterPlayImmersive));
  document.getElementById('playAutoGM')?.addEventListener('click',togglePlayAutoGM);
  document.getElementById('playRefreshServer')?.addEventListener('click',refreshPlayServerRealtime);
  document.getElementById('playAudioTop')?.addEventListener('click',togglePlayAudio);
  document.getElementById('playPrimaryAction')?.addEventListener('click',()=>{void advancePlayPhase()});
  document.getElementById('playEndGame')?.addEventListener('click',()=>{void openPlayCompletionSheet()});
  document.querySelectorAll('[data-play-card]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-play-card]').forEach(x=>x.classList.toggle('is-front',x===b))}));
  document.getElementById('playRoomButton')?.addEventListener('click',openPlayGMSheet);
  document.getElementById('playGMClose')?.addEventListener('click',closePlayGMSheet);
  document.getElementById('playGMSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playGMSheet'))closePlayGMSheet()});
  document.getElementById('playGMKill')?.addEventListener('click',async()=>{if(await applyPlayPlayerState('dead'))closePlayGMSheet()});
  document.getElementById('playGMRevive')?.addEventListener('click',async()=>{if(await applyPlayPlayerState('revive'))closePlayGMSheet()});
  document.getElementById('playRosterClose')?.addEventListener('click',closePlayRosterSheet);document.getElementById('playRosterCancel')?.addEventListener('click',closePlayRosterSheet);
  document.getElementById('playRosterSave')?.addEventListener('click',savePlayRoster);
  document.querySelectorAll('#playRosterFilters [data-play-roster-filter]').forEach(btn=>btn.addEventListener('click',()=>setPlayRosterFilter(btn.dataset.playRosterFilter)));
  document.getElementById('playRosterSelectAll')?.addEventListener('click',()=>{const rows=[...document.querySelectorAll('#playRosterList .play-roster-row')].filter(x=>!x.classList.contains('hidden')),all=rows.length&&rows.every(x=>x.classList.contains('selected'));rows.forEach(x=>x.classList.toggle('selected',!all));updatePlayRosterCount()});
  document.getElementById('playRosterSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playRosterSheet'))closePlayRosterSheet()});
  document.getElementById('playSeatClose')?.addEventListener('click',closePlaySeatSheet);document.getElementById('playSeatCancel')?.addEventListener('click',closePlaySeatSheet);document.getElementById('playSeatRelease')?.addEventListener('click',releaseSelectedPlayerSeat);
  document.querySelectorAll('[data-play-seat-member-mode]').forEach(b=>b.addEventListener('click',()=>{playSeatCandidateMode=b.dataset.playSeatMemberMode==='offline'?'offline':'online';renderPlaySeatSheet()}));
  document.getElementById('playSeatSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playSeatSheet'))closePlaySeatSheet()});
  document.getElementById('playGameClose')?.addEventListener('click',closePlayGameSheet);document.getElementById('playGameCancel')?.addEventListener('click',closePlayGameSheet);
  document.getElementById('playGameSave')?.addEventListener('click',savePlayGame);
  document.getElementById('playGameTemplateAdd')?.addEventListener('click',()=>{playGameReturnToSelection=true;void openLibraryGameTemplate('')});
  document.getElementById('playGameAuto')?.addEventListener('click',()=>{void gmAutoPreviewGame()});
  document.getElementById('playGameTemplateBack')?.addEventListener('click',()=>{playGameReturnToSelection=false;void openPlayGameSheet()});
  document.getElementById('playGameDelete')?.addEventListener('click',async()=>{
    const id=String(playSceneState.gameTemplateId||'');if(!id||document.querySelector('.play-game-sheet-card')?.dataset.mode!=='library')return;
    if(!confirm('Xóa Ván Mẫu đã lưu? Thao tác này không thể hoàn tác.'))return;
    const button=document.getElementById('playGameDelete');if(button)button.disabled=true;
    try{const result=await gmApi('/api/gm/game-templates/'+encodeURIComponent(id),{method:'DELETE'});if(result?.ok!==true)throw new Error('Server chưa xác nhận xóa Ván Mẫu.');playSceneState.gameTemplateId='';closePlayGameSheet();await loadPlayGameTemplates();renderGameTemplateLibrary()}
    catch(err){playFlashError(err?.message||'Không xóa được Ván Mẫu.')}
    finally{if(button)button.disabled=false}
  });
  for(const id of ['playTemplateRoleSearch','playTemplateRoleFaction','playTemplateOnlyStarred'])document.getElementById(id)?.addEventListener(id==='playTemplateRoleSearch'?'input':'change',playTemplateRenderCatalog);
  for(const id of ['playVillageDiscussionSec','playGallowsNominationSec','playGallowsVoteSec','playWolfDiscussionSec','playEarlyArtifactSec','playDefaultActionSec','playArtifactActionSec','playAutoAdvance'])document.getElementById(id)?.addEventListener('change',e=>{
    playSceneState.gameTiming=playSceneState.gameTiming||{};
    const key={playVillageDiscussionSec:'villageDiscussionSec',playGallowsNominationSec:'gallowsNominationSec',playGallowsVoteSec:'gallowsVoteSec',playWolfDiscussionSec:'wolfDiscussionSec',playEarlyArtifactSec:'earlyArtifactSec',playDefaultActionSec:'defaultActionSec',playArtifactActionSec:'artifactActionSec',playAutoAdvance:'autoAdvance'}[id];
    playSceneState.gameTiming[key]=id==='playAutoAdvance'?!!e.currentTarget.checked:id==='playGallowsNominationSec'||id==='playGallowsVoteSec'?Math.max(1,Math.min(3600,Math.trunc(Number(e.currentTarget.value)||10))):Math.max(0,Math.min(3600,Number(e.currentTarget.value)||0));
    playRememberMatchArtifacts();savePlayScene();if(id==='playDefaultActionSec')renderPlayGameRoleTimings();
  });
  document.getElementById('playArtifactsEnabled')?.addEventListener('change',e=>{
    if(document.querySelector('.play-game-sheet-card')?.dataset.mode!=='play')return;
    playSceneState.artifactsEnabled=!!e.currentTarget.checked;
    playRememberMatchArtifacts();savePlayScene();updatePlayArtifactToggle();
  });
  document.getElementById('playArtifactLimitPerCycle')?.addEventListener('change',e=>{const n=Math.max(0,Math.min(30,Math.trunc(Number(e.currentTarget.value)||0)));e.currentTarget.value=String(n);playSceneState.artifactLimitPerCycle=n;playRememberMatchArtifacts();savePlayScene();updatePlayArtifactToggle()});
  document.getElementById('playGameSuggest')?.addEventListener('click',suggestPlayGameRoles);
  document.getElementById('playGameClear')?.addEventListener('click',()=>{playSceneState.rolePlan={};savePlayScene();renderPlayGameRoles();updatePlayGameRoleCount()});
  document.getElementById('playGameSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playGameSheet'))closePlayGameSheet()});
  document.querySelectorAll('[data-play-winner]').forEach(b=>b.addEventListener('click',()=>selectPlayWinner(b.dataset.playWinner)));
  document.getElementById('playUseWinProposal')?.addEventListener('click',()=>selectPlayWinner(playSceneRuntime.winProposal?.winnerFaction||''));
  document.getElementById('playEndConfirm')?.addEventListener('click',confirmPlayEndGame);
  document.getElementById('playEndClose')?.addEventListener('click',closePlayEndSheet);document.getElementById('playEndCancel')?.addEventListener('click',closePlayEndSheet);
  document.getElementById('playEndSheet')?.addEventListener('click',e=>{if(e.target===document.getElementById('playEndSheet'))closePlayEndSheet()});
  document.querySelector('.play-core-pearl')?.addEventListener('click',()=>battleToggleWolfMenu());
  document.getElementById('battleGMChromeToggle')?.addEventListener('click',gmwwTogglePlayChrome);
  document.getElementById('playCreateRoomAdd')?.addEventListener('click',()=>openPlayRoomEditor(true));
  document.getElementById('playCreateRoomSave')?.addEventListener('click',savePlayRoomEditor);
  document.getElementById('playCreateRoomSeatCount')?.addEventListener('change',e=>{playSceneState.seatCount=Math.max(1,Math.min(30,Number(e.target.value)||12));e.target.value=String(playSceneState.seatCount);savePlayScene();if(isLivePlayRoom())playUpdateRoomSettings({seatCount:playSceneState.seatCount})});
  document.getElementById('playCreateRoomEnabled')?.addEventListener('click',playToggleRoomEnabled);document.getElementById('playRoomNextStep')?.addEventListener('click',playCreateRoomNext);
  document.getElementById('playCreateRoomReset')?.addEventListener('click',playResetCreatedRoom);
  document.getElementById('playCreateRoomDelete')?.addEventListener('click',playDeleteCreatedRoom);
  document.getElementById('playCreateRoomClose')?.addEventListener('click',()=>document.getElementById('playCreateRoomSheet')?.classList.add('hidden'));
  document.getElementById('playUserAvatar')?.setAttribute('hidden','');
  document.getElementById('playWorld')?.addEventListener('click',async e=>{if(e.target.closest?.('button,.play-player-token,.play-village-core,.play-hud,.play-world-status'))return;const r=e.currentTarget.getBoundingClientRect(),raw=globalThis.GMWW_VILLAGE_LAYOUT.fromScreen(e.clientX-r.left,e.clientY-r.top,r.width,r.height);if(!globalThis.GMWW_VILLAGE_LAYOUT.inside(raw.x,raw.y))return;const p=selectedPlayPlayer();if(!isLivePlayRoom()||!p)return;if(p&&!p.seatId&&!playSceneRuntime.room?.seatsLocked){try{const d=await playRoomApi('/move',{method:'POST',body:JSON.stringify({participantId:p.participantId,...raw})});playSceneRuntime.players=d.players||playSceneRuntime.players;renderPlayPlayers()}catch(err){playFlashError(err.message)}return}});
  window.addEventListener('resize',renderPlayScene);
  // No bulk Artifact sync at startup: one item per idle window outside active games.
  playScheduleSharedArtifactLibrarySync();
  bindPlayRoomModeButtons();bindPlaySeatMoveButtons();renderPlayScene();document.body.classList.add('play-immersive');document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='start'));if(isLivePlayRoom())setTimeout(()=>playSyncRoom(true),80);
  if(!playSceneRuntime.pollTimer)playSceneRuntime.pollTimer=setInterval(()=>{if(document.getElementById('start')?.classList.contains('active')){if(isLivePlayRoom()){if(!playSceneRuntime.socket||playSceneRuntime.socket.readyState!==WebSocket.OPEN)playSyncRoom(false)}else gmApi('/api/gm/members').then(d=>{memberAdminState.members=d.members||[];renderPlayPlayers()}).catch(()=>{})}},15000);
}
document.querySelectorAll('[data-page="start"]').forEach(el=>el.addEventListener('click',()=>setTimeout(async()=>{try{if(!memberAdminState.loaded)await loadMembers(false)}catch{}if(isLivePlayRoom())await playSyncRoom(true);else renderPlayScene()},40)));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPlayScene,{once:true});else initPlayScene();


/* GMWW: safe batch importer for 44 artwork-only Sea Artifacts.
   ZIP_STORED with artworks/*.webp + manifest.json (SHA-256).
   Card metadata, role assignments and old game snapshots remain untouched. */
(() => {
  'use strict';
  const total=44, limit=25*1024*1024, td=new TextDecoder();
  const el=id=>document.getElementById(id);
  const notice=msg=>{if(el('seaArtifactImportStatus'))el('seaArtifactImportStatus').textContent=msg};
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let rows=null,urls=[];
  function readStoredZip(ab){
    const v=new DataView(ab),out=new Map();let p=0;
    while(p+4<=ab.byteLength&&v.getUint32(p,true)===0x04034b50){
      if(p+30>ab.byteLength)throw Error('ZIP không hợp lệ');
      const flags=v.getUint16(p+6,true),method=v.getUint16(p+8,true),
        compressed=v.getUint32(p+18,true),size=v.getUint32(p+22,true),
        n=v.getUint16(p+26,true),extra=v.getUint16(p+28,true);
      if((flags&9)||method!==0||size!==compressed||size>limit)throw Error('Cần ZIP chuẩn Stored, không mã hóa.');
      const start=p+30+n+extra,end=start+size;
      if(end>ab.byteLength)throw Error('ZIP bị thiếu dữ liệu');
      const name=td.decode(new Uint8Array(ab,p+30,n));
      if(out.has(name)||name.includes('..')||name.startsWith('/'))throw Error('Đường dẫn ảnh không hợp lệ');
      out.set(name,new Uint8Array(ab.slice(start,end)));p=end;
    }
    return out;
  }
  async function sha256(b){
    const d=await crypto.subtle.digest('SHA-256',b);
    return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');
  }
  async function parse(file){
    if(!file||file.size>limit||!file.name.toLowerCase().endsWith('.zip'))throw Error('Chọn ZIP 44 lá đã tối ưu, tối đa 25 MB');
    const files=readStoredZip(await file.arrayBuffer()),raw=files.get('manifest.json');
    if(!raw)throw Error('Thiếu manifest.json');
    const m=JSON.parse(td.decode(raw));
    if(m.themeId!=='theme-sea'||m.imageCount!==total||!Array.isArray(m.items)||m.items.length!==total)throw Error('Không phải bộ 44 Artifact chủ đề Biển');
    const used=new Set(), result=[];
    for(const item of m.items){
      const key='artworks/'+String(item.webp||'');
      if(used.has(key)||!key.endsWith('.webp'))throw Error('Tên ảnh không hợp lệ / trùng');
      used.add(key);
      const b=files.get(key);
      if(!b||b.length<1000||b.length>1300000||await sha256(b)!==item.sha256)throw Error('Lỗi SHA-256: '+item.webp);
      result.push({item,blob:new Blob([b],{type:'image/webp'}),artifactId:''});
    }
    if([...files.keys()].filter(k=>k.startsWith('artworks/')).length!==total)throw Error('Ảnh trong ZIP không đủ 44');
    return result;
  }
  function validation(){
    const ids=(rows||[]).map(x=>x.artifactId);
    return rows&&rows.length===total&&ids.every(Boolean)&&new Set(ids).size===total;
  }
  function preview(){
    const host=el('seaArtifactImportPreview');host.replaceChildren();
    for(const u of urls)URL.revokeObjectURL(u);urls=[];
    const cards=(state.artifacts||[]).filter(a=>a?.id);
    if(cards.length!==total){notice('GM đang có '+cards.length+'/44 Artifact. Hãy đồng bộ danh sách lá trước khi nhập, không tạo lá ảo.');return}
    const chosen=new Set();
    for(const row of rows){
      const candidate=cards.filter(a=>norm(a.name)===norm(row.item.suggestedArtifactName));
      if(candidate.length===1&&!chosen.has(String(candidate[0].id))){
        row.artifactId=String(candidate[0].id);chosen.add(row.artifactId);
      }
      const item=document.createElement('div');item.className='sea-artwork-import-row';
      const img=document.createElement('img');img.alt='Artwork không có bảng tên';img.src=URL.createObjectURL(row.blob);urls.push(img.src);
      const info=document.createElement('div'),caption=document.createElement('small'),hint=document.createElement('small'),select=document.createElement('select');
      caption.textContent=row.item.webp;
      hint.textContent='Gợi ý chưa nghiệm thu: '+String(row.item.suggestedArtifactName||'Chưa có');
      select.setAttribute('aria-label','Chọn lá Artifact ứng với ảnh');
      select.add(new Option('Chọn lá Artifact',''));
      for(const card of cards)select.add(new Option(card.name,String(card.id)));
      select.value=row.artifactId;
      select.onchange=()=>{row.artifactId=select.value;notice(validation()?'Đã ghép đủ 44/44. Kiểm tra hình trước khi nạp.':'Chưa ghép đủ 44 ảnh với 44 Artifact khác nhau.');};
      info.append(caption,select,hint);item.append(img,info);host.append(item);
    }
    notice(validation()?'Đã ghép 44/44 theo gợi ý. KIỂM TRA đối chiếu ảnh với tên lá trước khi nạp.':'Chưa ghép đủ 44 ảnh với 44 Artifact khác nhau.');
  }
  async function perform(){
    if(!validation()){notice('Phải ghép 44 ảnh với 44 lá Artifact khác nhau.');return}
    if(typeof isLivePlayRoom==='function'&&isLivePlayRoom()){notice('Không thể thay artwork khi phòng đang chơi.');return}
    if(!confirm('Nạp 44 ảnh chủ đề Biển sau khi đã kiểm tra ghép đúng lá? Artwork cũ sẽ được sao lưu.'))return;
    const button=el('seaArtifactImportStart');button.disabled=true;
    try{
      state.themes.activeId='theme-sea';saveState();
      let index=0;
      for(const x of rows){
        const id=x.artifactId;
        for(const type of ['display','thumb']){
          const key=cardBlobKey('theme-sea','artifacts',id,type);
          const before=await dbGet(key),backup='sea-artifact-44-backup|'+key;
          if(before?.blob&&!(await dbGet(backup)))await dbPut(backup,before.blob);
          await dbPut(key,type==='display'?x.blob:await thumbBlobFromFile(x.blob));
          const previous=objectUrls.get(key);
          if(previous)URL.revokeObjectURL(previous);
          objectUrls.delete(key);
        }
        notice('Đã cập nhật ảnh trong chủ đề Biển '+(++index)+'/44. Đang chờ đồng bộ server...');
      }
      notice('Đang nạp 44 lá vào kho Artifact dùng chung. Giữ trang mở...');
      const ids=rows.map(x=>x.artifactId);
      const report=await playSyncSharedArtifactLibrary({onlyIds:ids,forceIds:ids});
      const status=await gmApi('/api/gm/artifacts/shared',{timeoutMs:20000});
      const serverSignatures=new Map((status?.artifacts||[]).map(a=>[String(a.assetId),String(a.signature)]));
      const verified=await Promise.all(rows.map(async x=>serverSignatures.get('artifact:'+x.artifactId)===(await playSharedArtifactSignature((state.artifacts||[]).find(a=>String(a.id)===x.artifactId)))));
      if(!report || !Array.isArray(report.failed) || report.failed.length || report.synced!==44 || verified.some(ok=>!ok)){
        notice('Chưa xác minh đủ 44 ảnh trên server. Không xác nhận thành công; giữ lựa chọn để thử lại.');
      }else{
        notice('THÀNH CÔNG: 44/44 ảnh đã được máy chủ xác nhận, Player Web dùng kho Artifact mới.');
        rows=null;
        const pending=el('seaArtifactImportFile');if(pending)pending.value='';
        const previewBox=el('seaArtifactImportPreview');if(previewBox)previewBox.replaceChildren();
        for(const u of urls)URL.revokeObjectURL(u);urls=[];
      }
      await renderTheme();renderEntityGrid('artifacts');
    }catch(e){notice('Có lỗi: '+String(e?.message||e)+'. Ảnh cũ đã được sao lưu.');}
    finally{button.disabled=!rows}
  }
  const picker=el('seaArtifactImportFile'),start=el('seaArtifactImportStart');
  if(!picker||!start)return;
  picker.onchange=async()=>{
    rows=null;start.disabled=true;el('seaArtifactImportPreview').replaceChildren();
    try{notice('Đang kiểm tra 44 ảnh và SHA-256...');rows=await parse(picker.files?.[0]);preview();start.disabled=false}
    catch(e){notice(String(e?.message||e))}
  };
  start.onclick=perform;
  window.GMWWSeaArtifactImporter=Object.freeze({readStoredZip,parse,validation});
})();
window.GMWWRuntimeRecovery?.ready(VERSION);
})();
