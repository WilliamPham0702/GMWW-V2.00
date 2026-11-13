// GMWW — dựng file xuất dữ liệu local (chỉ đọc, không gọi mạng).
// Dùng chung cho nút "XUẤT DỮ LIỆU CHƯA ĐỒNG BỘ" trong mục Cập nhật & đồng bộ.
(function(){
'use strict';
function gmwwJsonSafe(v){
  if(typeof Blob!=='undefined'&&v instanceof Blob)return {__blob:true,type:v.type||'',size:v.size};
  if(typeof ArrayBuffer!=='undefined'&&v instanceof ArrayBuffer)return {__binary:true,size:v.byteLength};
  if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView&&ArrayBuffer.isView(v))return {__binary:true,size:v.byteLength,type:(v.constructor&&v.constructor.name)||''};
  if(Array.isArray(v))return v.map(gmwwJsonSafe);
  if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v))o[k]=gmwwJsonSafe(v[k]);return o}
  return v;
}
function gmwwBuildLocalExport(input){
  const inp=input||{};
  const entries=Array.isArray(inp.localStorage)?inp.localStorage:[];
  const databases=Array.isArray(inp.indexedDB)?inp.indexedDB:[];
  const serverTemplates=Array.isArray(inp.serverTemplates)?inp.serverTemplates:[];
  const serverIds=new Set(serverTemplates.map(t=>String(t&&t.id||'')).filter(Boolean));
  const legacy=(Array.isArray(inp.legacyTemplates)?inp.legacyTemplates:[]).map(t=>{
    const id=String(t&&t.id||'');const onServer=!!id&&serverIds.has(id);
    return {id,name:String(t&&t.name||''),roleCount:Number(t&&t.roleCount||0),source:String(t&&t.source||''),
      onServer,status:onServer?'đã có trên server':'CHƯA ĐỒNG BỘ'};
  });
  const unsynced=legacy.filter(r=>!r.onServer);
  const errors=[];
  if(inp.serverError)errors.push(String(inp.serverError));
  for(const d of databases)if(d&&d.error)errors.push('IndexedDB '+d.name+': '+d.error);
  let binaryCount=0;
  (function walk(v){if(v&&typeof v==='object'){if(v.__blob||v.__binary){binaryCount++;return}for(const k of Object.keys(v))walk(v[k])}})(databases);
  return {
    exportedAt:inp.exportedAt||new Date().toISOString(),
    app:String(inp.app||''),
    summary:{
      localStorageKeys:entries.length,
      indexedDbDatabases:databases.length,
      indexedDbBinaryFiles:binaryCount,
      serverTemplates:serverTemplates.length,
      legacyTemplatesOnDevice:legacy.length,
      legacyTemplatesUnsynced:unsynced.length,
      errors:errors.length
    },
    unsyncedTemplates:unsynced,
    legacyTemplates:legacy,
    localStorage:Object.fromEntries(entries.map(e=>[String(e.key),e.value])),
    indexedDB:databases,
    serverTemplates:gmwwJsonSafe(serverTemplates),
    serverArtifacts:gmwwJsonSafe(inp.serverArtifacts===undefined?null:inp.serverArtifacts),
    errors
  };
}
globalThis.gmwwBuildLocalExport=gmwwBuildLocalExport;
globalThis.gmwwJsonSafe=gmwwJsonSafe;
// ---- Chuyển save giữa các máy: xuất / nhập toàn bộ dữ liệu local (localStorage + IndexedDB) ----
// File JSON "gmww-save-v1" giữ nguyên cả dữ liệu nhị phân (base64). Nhập chỉ GHI ĐÈ khóa/bản ghi cùng tên,
// không xóa dữ liệu khác trên máy. Khóa riêng của thiết bị (cập nhật/OTA) không bị xuất hay nhập.
const SAVE_SCHEMA='gmww-save-v1';
const SAVE_SKIP_KEY=/^(GMWW_UPDATE_|GMWW_RUNTIME_|GMWW_OTA_|gmww_update|gmww_runtime|gmww_ota)/i;
const SAVE_FALLBACK_DBS=['GMWW_ASSETS_921','GMWW_THEME_ASSETS_946','GMWW_THEME_UI_987','GMWW_MATCH_CACHE_933','GMWW_AUDIO_LIBRARY','GMWW_V208_THEME_ASSETS'];
function saveB64(u8){let s='';const C=0x8000;for(let i=0;i<u8.length;i+=C)s+=String.fromCharCode.apply(null,u8.subarray(i,i+C));return btoa(s)}
function saveBytes(b64){const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
function saveBlobBytes(blob){if(typeof blob.arrayBuffer==='function')return blob.arrayBuffer().then(b=>new Uint8Array(b));return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(new Uint8Array(r.result));r.onerror=()=>rej(r.error||new Error('Không đọc được tệp nhị phân'));r.readAsArrayBuffer(blob)})}
async function saveEnc(v,st,depth){
  depth=depth||0;if(depth>48)throw new Error('Dữ liệu lồng quá sâu');
  if(v===null||typeof v==='string'||typeof v==='boolean')return v;
  if(typeof v==='number')return Number.isFinite(v)?v:{$t:'num',v:String(v)};
  if(v===undefined)return {$t:'undef'};
  if(typeof v==='bigint')return {$t:'bigint',v:v.toString()};
  if(v instanceof Date)return {$t:'date',v:v.getTime()};
  if(typeof Blob!=='undefined'&&v instanceof Blob){st.binary++;const o={$t:'blob',type:v.type||'',v:saveB64(await saveBlobBytes(v))};if(typeof File!=='undefined'&&v instanceof File){o.name=v.name;o.lastModified=v.lastModified}return o}
  if(v instanceof ArrayBuffer){st.binary++;return {$t:'ab',v:saveB64(new Uint8Array(v))}}
  if(ArrayBuffer.isView(v)){st.binary++;return {$t:'view',c:(v.constructor&&v.constructor.name)||'Uint8Array',v:saveB64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))}}
  if(Array.isArray(v)){const out=[];for(const x of v)out.push(await saveEnc(x,st,depth+1));return out}
  if(v instanceof Map){const out=[];for(const [k,x] of v)out.push([await saveEnc(k,st,depth+1),await saveEnc(x,st,depth+1)]);return {$t:'map',v:out}}
  if(v instanceof Set){const out=[];for(const x of v)out.push(await saveEnc(x,st,depth+1));return {$t:'set',v:out}}
  if(typeof v==='object'){const o={};for(const k of Object.keys(v))o[k]=await saveEnc(v[k],st,depth+1);return Object.prototype.hasOwnProperty.call(o,'$t')?{$t:'obj',v:o}:o}
  return null;
}
function saveDec(v){
  if(v===null||typeof v!=='object')return v;
  if(Array.isArray(v))return v.map(saveDec);
  if(typeof v.$t==='string'){
    switch(v.$t){
      case 'num':return Number(v.v);
      case 'undef':return undefined;
      case 'bigint':return BigInt(v.v);
      case 'date':return new Date(v.v);
      case 'blob':{const b=new Blob([saveBytes(v.v)],{type:v.type||''});if(v.name!==undefined&&typeof File!=='undefined')return new File([b],v.name,{type:v.type||'',lastModified:v.lastModified||Date.now()});return b}
      case 'ab':return saveBytes(v.v).buffer;
      case 'view':{const C=globalThis[v.c];const u=saveBytes(v.v);return (typeof C==='function'&&C!==Uint8Array&&u.byteLength%(C.BYTES_PER_ELEMENT||1)===0)?new C(u.buffer):u}
      case 'map':return new Map(v.v.map(([k,x])=>[saveDec(k),saveDec(x)]));
      case 'set':return new Set(v.v.map(saveDec));
      case 'obj':{const o={};for(const k of Object.keys(v.v))o[k]=saveDec(v.v[k]);return o}
    }
  }
  const o={};for(const k of Object.keys(v))o[k]=saveDec(v[k]);return o;
}
// Mở DB sẵn có mà KHÔNG tạo mới: nếu chưa tồn tại thì hủy nâng cấp và trả null.
function saveOpenExisting(name){
  return new Promise(res=>{
    let missing=false;const r=indexedDB.open(name);
    r.onupgradeneeded=()=>{missing=true;try{r.transaction.abort()}catch(e){}};
    r.onsuccess=()=>res(missing?null:r.result);
    r.onerror=()=>res(null);r.onblocked=()=>res(null);
  });
}
async function saveListDbs(){
  const found=new Map();
  try{for(const d of (await indexedDB.databases())||[]){if(d&&d.name&&String(d.name).startsWith('GMWW'))found.set(String(d.name),Number(d.version)||1)}}catch(e){}
  if(!found.size)for(const n of SAVE_FALLBACK_DBS)found.set(n,0);
  return [...found.keys()];
}
function saveReadStore(db,storeName){
  return new Promise((res,rej)=>{
    const tx=db.transaction(storeName,'readonly'),st=tx.objectStore(storeName);
    const k=st.getAllKeys(),v=st.getAll();
    const meta={name:storeName,keyPath:st.keyPath===undefined?null:st.keyPath,autoIncrement:!!st.autoIncrement,indexes:Array.from(st.indexNames).map(n=>{const i=st.index(n);return {name:n,keyPath:i.keyPath,unique:!!i.unique,multiEntry:!!i.multiEntry}})};
    tx.oncomplete=()=>res({meta,keys:k.result,values:v.result});
    tx.onerror=()=>rej(tx.error||new Error('Đọc kho '+storeName+' lỗi'));
    tx.onabort=()=>rej(tx.error||new Error('Đọc kho '+storeName+' bị hủy'));
  });
}
async function gmwwBuildSaveSnapshot(appLabel){
  const st={binary:0,records:0,errors:[]};
  const ls={};let skipped=0;
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(SAVE_SKIP_KEY.test(k)){skipped++;continue}ls[k]=localStorage.getItem(k)}
  const dbs=[];
  for(const name of await saveListDbs()){
    const db=await saveOpenExisting(name);if(!db)continue;
    const entry={name,version:db.version,stores:[]};
    try{
      for(const storeName of Array.from(db.objectStoreNames)){
        try{
          const rows=await saveReadStore(db,storeName);
          const records=[];
          for(let i=0;i<rows.keys.length;i++){records.push({key:await saveEnc(rows.keys[i],st),value:await saveEnc(rows.values[i],st)});st.records++}
          entry.stores.push({...rows.meta,records});
        }catch(err){st.errors.push(name+'/'+storeName+': '+String(err&&err.message||err))}
      }
    }finally{try{db.close()}catch(e){}}
    dbs.push(entry);
  }
  return {
    schema:SAVE_SCHEMA,
    exportedAt:new Date().toISOString(),
    app:String(appLabel||''),
    summary:{localStorageKeys:Object.keys(ls).length,skippedDeviceKeys:skipped,indexedDbDatabases:dbs.length,indexedDbRecords:st.records,binaryFiles:st.binary,errors:st.errors},
    localStorage:ls,
    indexedDB:dbs
  };
}
function gmwwParseSave(text){
  let snap;
  try{snap=JSON.parse(String(text||''))}catch(e){return {ok:false,error:'File không phải JSON hợp lệ.'}}
  if(!snap||snap.schema!==SAVE_SCHEMA)return {ok:false,error:'Đây không phải file save GMWW (thiếu dấu hiệu '+SAVE_SCHEMA+'). Hãy chọn file tạo bằng nút XUẤT SAVE.'};
  if(!snap.localStorage||typeof snap.localStorage!=='object'||!Array.isArray(snap.indexedDB))return {ok:false,error:'File save thiếu dữ liệu localStorage hoặc IndexedDB.'};
  return {ok:true,snap};
}
function saveApplyLocalStorage(snap,report){
  for(const k of Object.keys(snap.localStorage)){
    if(SAVE_SKIP_KEY.test(k)){if(report)report.localStorageSkipped++;continue}
    try{localStorage.setItem(k,String(snap.localStorage[k]));if(report)report.localStorageWritten++}
    catch(err){if(report)report.errors.push('localStorage '+k+': '+String(err&&err.message||err))}
  }
}
function savePutAll(db,storeName,records){
  return new Promise((res,rej)=>{
    const tx=db.transaction(storeName,'readwrite'),st=tx.objectStore(storeName);
    const inline=st.keyPath!==null&&st.keyPath!==undefined;
    for(const r of records){const val=saveDec(r.value);if(inline)st.put(val);else st.put(val,saveDec(r.key))}
    tx.oncomplete=()=>res(records.length);
    tx.onerror=()=>rej(tx.error||new Error('Ghi kho '+storeName+' lỗi'));
    tx.onabort=()=>rej(tx.error||new Error('Ghi kho '+storeName+' bị hủy'));
  });
}
function saveCreateDb(entry){
  return new Promise((res,rej)=>{
    const r=indexedDB.open(entry.name,Math.max(1,Number(entry.version)||1));
    r.onupgradeneeded=()=>{
      const db=r.result;
      for(const s of entry.stores||[]){
        if(db.objectStoreNames.contains(s.name))continue;
        const st=db.createObjectStore(s.name,s.keyPath!==null&&s.keyPath!==undefined?{keyPath:s.keyPath,autoIncrement:!!s.autoIncrement}:{autoIncrement:!!s.autoIncrement});
        for(const i of s.indexes||[]){try{st.createIndex(i.name,i.keyPath,{unique:!!i.unique,multiEntry:!!i.multiEntry})}catch(e){}}
      }
    };
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('Không tạo được kho '+entry.name));r.onblocked=()=>rej(new Error('Kho '+entry.name+' đang bị khóa'));
  });
}
async function gmwwRestoreSave(snap){
  const report={localStorageWritten:0,localStorageSkipped:0,indexedDbRecords:0,indexedDbDatabases:0,missingStores:[],errors:[]};
  for(const entry of snap.indexedDB){
    if(!entry||!entry.name||!Array.isArray(entry.stores))continue;
    let db=null;
    try{
      db=await saveOpenExisting(String(entry.name));
      if(!db)db=await saveCreateDb(entry);
      report.indexedDbDatabases++;
      for(const s of entry.stores){
        if(!db.objectStoreNames.contains(s.name)){report.missingStores.push(entry.name+'/'+s.name);continue}
        try{report.indexedDbRecords+=await savePutAll(db,s.name,s.records||[])}
        catch(err){report.errors.push(entry.name+'/'+s.name+': '+String(err&&err.message||err))}
      }
    }catch(err){report.errors.push('IndexedDB '+entry.name+': '+String(err&&err.message||err))}
    finally{if(db){try{db.close()}catch(e){}}}
  }
  saveApplyLocalStorage(snap,report);
  return report;
}
globalThis.gmwwBuildSaveSnapshot=gmwwBuildSaveSnapshot;
globalThis.gmwwParseSave=gmwwParseSave;
globalThis.gmwwRestoreSave=gmwwRestoreSave;
globalThis.gmwwReapplySaveLocalStorage=function(snap){saveApplyLocalStorage(snap,null)};
})();
