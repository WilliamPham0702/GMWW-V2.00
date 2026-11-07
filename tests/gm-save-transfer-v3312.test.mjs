// V3.312: XUẤT SAVE / NHẬP SAVE — kiểm chứng đúng rủi ro của task:
// (1) save khứ hồi giữ nguyên dữ liệu local + nhị phân, (2) nhập chỉ ghi đè cùng tên, không xóa dữ liệu khác,
// (3) khóa riêng thiết bị không bị xuất/nhập, (4) file sai bị từ chối, (5) nút nằm trong Cài đặt và đã nối sự kiện.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {indexedDB as fakeIdb, IDBKeyRange} from 'fake-indexeddb';

const code=fs.readFileSync('server-game/current/gmww-local-export.js','utf8');
function device(){
  const store=new Map();
  const localStorage={get length(){return store.size},key:i=>[...store.keys()][i]??null,getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(String(k),String(v))},removeItem:k=>{store.delete(k)}};
  const ctx={indexedDB:fakeIdb,IDBKeyRange,localStorage,Blob,File,Uint8Array,ArrayBuffer,Date,Map,Set,JSON,Object,Array,Number,String,Math,Promise,Error,BigInt,btoa:globalThis.btoa,atob:globalThis.atob,console};
  ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);return ctx;
}
function openDb(ctx,name,version,setup){
  return new Promise((res,rej)=>{const r=ctx.indexedDB.open(name,version);r.onupgradeneeded=()=>setup(r.result);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
}
const tx=(db,s,mode,fn)=>new Promise((res,rej)=>{const t=db.transaction(s,mode);const st=t.objectStore(s);const out=fn(st);t.oncomplete=()=>res(out&&out.result!==undefined?out.result:out);t.onerror=()=>rej(t.error)});
let seq=0;
test('khứ hồi: localStorage + IndexedDB + nhị phân sang máy mới, giữ dữ liệu có sẵn',async()=>{
  const n='GMWW_T_'+(++seq);
  const old=device();
  old.localStorage.setItem('GMWW_V258_STATE','{"roles":[1,2,3]}');
  old.localStorage.setItem('GMWW_UPDATE_NOTIFIED_3.311','1');
  const db=await openDb(old,n,3,d=>{const s=d.createObjectStore('assets',{keyPath:'id'});s.createIndex('byName','name',{unique:false});d.createObjectStore('blobs',{autoIncrement:true})});
  await tx(db,'assets','readwrite',s=>{s.put({id:'a1',name:'Sói',created:new Date(1700000000000),bytes:new Uint8Array([1,2,3,250])})});
  await tx(db,'blobs','readwrite',s=>{s.put(new Blob(['xin chào'],{type:'audio/mpeg'}),'k1')});
  db.close();
  const snap=await old.gmwwBuildSaveSnapshot('GMWW 3.312');
  const parsed=old.gmwwParseSave(JSON.stringify(snap));
  assert.ok(parsed.ok);
  assert.equal(snap.localStorage.GMWW_UPDATE_NOTIFIED_3_311,undefined);
  assert.equal(Object.keys(snap.localStorage).includes('GMWW_UPDATE_NOTIFIED_3.311'),false,'khóa cập nhật riêng thiết bị không được xuất');
  assert.ok(snap.summary.binaryFiles>=2);

  // Máy mới: đã có kho (không cùng nội dung) + một khóa/bản ghi riêng phải còn nguyên sau khi nhập.
  const neu=device();
  neu.localStorage.setItem('gmww_gm_haptic_v1','keep');
  const db2=await openDb(neu,n,3,d=>{d.createObjectStore('assets',{keyPath:'id'}).createIndex('byName','name');d.createObjectStore('blobs',{autoIncrement:true})});
  await tx(db2,'assets','readwrite',s=>{s.put({id:'local-only',name:'Giữ lại'})});db2.close();
  const report=await neu.gmwwRestoreSave(parsed.snap);
  assert.equal(report.errors.length,0,report.errors.join('; '));
  assert.equal(neu.localStorage.getItem('GMWW_V258_STATE'),'{"roles":[1,2,3]}');
  assert.equal(neu.localStorage.getItem('gmww_gm_haptic_v1'),'keep');
  const db3=await openDb(neu,n,3,()=>{});
  const a1=await tx(db3,'assets','readonly',s=>s.get('a1'));
  assert.equal(a1.name,'Sói');assert.equal(a1.created.getTime(),1700000000000);assert.equal([...a1.bytes].join(','),'1,2,3,250');
  assert.ok(await tx(db3,'assets','readonly',s=>s.get('local-only')),'bản ghi riêng của máy mới phải còn');
  const blobs=await tx(db3,'blobs','readonly',s=>s.getAll());
  assert.equal(blobs.length,1);assert.equal(blobs[0].type,'audio/mpeg');assert.equal(await blobs[0].text(),'xin chào');
  db3.close();
});
test('máy mới chưa có kho: tạo lại đúng lược đồ rồi nhập',async()=>{
  const n='GMWW_T_'+(++seq);const old=device();
  const db=await openDb(old,n,2,d=>{d.createObjectStore('s',{keyPath:'id'}).createIndex('i','v',{unique:false})});
  await tx(db,'s','readwrite',s=>{s.put({id:1,v:'x'})});db.close();
  const snap=JSON.parse(JSON.stringify(await old.gmwwBuildSaveSnapshot('t')));
  await new Promise(r=>{const d=old.indexedDB.deleteDatabase(n);d.onsuccess=r;d.onerror=r});
  const rep=await old.gmwwRestoreSave(snap);
  assert.equal(rep.errors.length,0,rep.errors.join('; '));
  const db2=await openDb(old,n,2,()=>{});
  assert.equal((await tx(db2,'s','readonly',s=>s.get(1))).v,'x');
  assert.equal(Array.from(db2.transaction('s').objectStore('s').indexNames).join(','),'i');db2.close();
});
test('file sai bị từ chối, không ghi gì',()=>{
  const d=device();
  assert.equal(d.gmwwParseSave('không phải json').ok,false);
  assert.equal(d.gmwwParseSave(JSON.stringify({schema:'khac'})).ok,false);
  assert.equal(d.gmwwParseSave(JSON.stringify({schema:'gmww-save-v1',localStorage:{}})).ok,false);
  assert.equal(d.localStorage.length,0);
});
test('Cài đặt có nút XUẤT SAVE / NHẬP SAVE đã nối sự kiện và app.js khớp nguồn',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(html,/id="exportSaveData"[\s\S]*?XUẤT SAVE/);assert.match(html,/id="importSaveData"[\s\S]*?NHẬP SAVE/);
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  for(const frag of ["$('#exportSaveData')","$('#importSaveData')",'function exportGmwwSave','function importGmwwSave'])assert.ok(app.includes(frag),frag);
});
