// GMWW V4.16: source artwork intake only. Does NOT replace live V4.14 skeleton.
// Eight direction slots, 1024x1536 transparent masters, 17-layer rig remains pending.
export const V416_VERSION='4.16-artwork-source-review';
export const V416_CHARACTERS=Object.freeze([
 {id:'character-01',name:'Chàng Biển'},
 {id:'character-02',name:'Nàng Biển'}
]);
export const V416_VIEWS=Object.freeze([
 {id:'front',name:'Trước'},{id:'left',name:'Trái'},
 {id:'right',name:'Phải'},{id:'back',name:'Sau'}
]);
export const V416_SLOTS=Object.freeze(V416_CHARACTERS.flatMap(
 c=>V416_VIEWS.map(d=>Object.freeze({id:c.id+'-'+d.id,characterId:c.id,direction:d.id,label:c.name+' · '+d.name}))
));
export const V416_MIN_SIZE=Object.freeze({width:1024,height:1536});
export function slotForFilename(name){
 const base=String(name||'').split(/[\/\\]/).pop().toLowerCase().replace(/\s+/g,'-');
 const m=base.match(/^(character-0[12])-(front|left|right|back)\.png$/);
 return m?V416_SLOTS.find(s=>s.characterId===m[1]&&s.direction===m[2])||null:null;
}
export function validateDimensions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<V416_MIN_SIZE.width||height<V416_MIN_SIZE.height)
  return {ok:false,error:'RESOLUTION_TOO_SMALL'};
 if(Math.abs(width/height-2/3)>.004)return {ok:false,error:'RATIO_MISMATCH'};
 return {ok:true};
}
export function alphaDiagnostics(imageData){
 const w=imageData?.width,h=imageData?.height,pixels=imageData?.data;
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<2||h<2||pixels?.length!==w*h*4)
  throw Error('INVALID_IMAGE_DATA');
 const corner=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
 let cornersMax=0;
 for(const [x,y] of corner)cornersMax=Math.max(cornersMax,pixels[(y*w+x)*4+3]);
 let transparent=0,opaque=0;
 for(let y=0;y<h;y+=Math.max(1,Math.floor(h/24)))for(let x=0;x<w;x+=Math.max(1,Math.floor(w/24))){
  const a=pixels[(y*w+x)*4+3];
  transparent+=Number(a<32);opaque+=Number(a>200);
 }
 return {hasTransparentCorners:cornersMax<64,cornersMax,hasSolidSubject:opaque>10,
  hasTransparentArea:transparent>10,valid:cornersMax<64&&opaque>10&&transparent>10};
}
export async function inspectArtworkFile(file){
 if(!file||typeof file.arrayBuffer!=='function')throw Error('IMAGE_FILE_REQUIRED');
 const slot=slotForFilename(file.name);
 if(!slot)return {ok:false,code:'UNRECOGNIZED_FILENAME',file:file.name};
 if(file.type&&file.type!=='image/png')return {ok:false,code:'NOT_PNG',slot};
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')throw Error('BROWSER_CANVAS_REQUIRED');
 const bitmap=await createImageBitmap(file);
 try{
  const size=validateDimensions(bitmap.width,bitmap.height);
  if(!size.ok)return {ok:false,code:size.error,slot,size:{width:bitmap.width,height:bitmap.height}};
  const cv=document.createElement('canvas');cv.width=240;cv.height=360;
  const cx=cv.getContext('2d',{willReadFrequently:true});
  if(!cx)throw Error('CANVAS_UNAVAILABLE');
  cx.clearRect(0,0,cv.width,cv.height);cx.drawImage(bitmap,0,0,cv.width,cv.height);
  const alpha=alphaDiagnostics(cx.getImageData(0,0,cv.width,cv.height));
  if(!alpha.valid)return {ok:false,code:'TRANSPARENCY_INVALID',slot,alpha};
  return {ok:true,slot,width:bitmap.width,height:bitmap.height,alpha};
 }finally{bitmap.close?.();}
}
const dbName='GMWW-V416-ARTWORK-DRAFTS';
export function openArtworkDB(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(Error('INDEXEDDB_UNAVAILABLE'));
  const request=indexedDB.open(dbName,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('masters'))db.createObjectStore('masters',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('INDEXEDDB_ERROR'));
 });
}
export async function storeLocalArtwork(slotId,file){
 if(!V416_SLOTS.some(s=>s.id===slotId))throw Error('INVALID_SLOT');
 const db=await openArtworkDB();
 try{
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('masters','readwrite');
   tx.objectStore('masters').put({id:slotId,blob:file,updatedAt:Date.now()});
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('SAVE_FAILED'));tx.onabort=()=>reject(tx.error||Error('SAVE_ABORTED'));
  });
 }finally{db.close();}
}
export async function readLocalArtwork(){
 const db=await openArtworkDB();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction('masters','readonly'),r=tx.objectStore('masters').getAll();
   r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error||Error('LOAD_FAILED'));
  });
 }finally{db.close();}
}
export function draftReviewState(loadedSlots){
 const set=new Set(loadedSlots);
 return {validSlots:V416_SLOTS.filter(s=>set.has(s.id)).length,
  totalSlots:8,allViewsReady:V416_SLOTS.every(s=>set.has(s.id)),
  individualRigLayersReady:false,motionIntegrated:false,ownerApproved:false,
  productionSkinEnabled:false};
}
