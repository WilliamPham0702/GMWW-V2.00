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
})();
