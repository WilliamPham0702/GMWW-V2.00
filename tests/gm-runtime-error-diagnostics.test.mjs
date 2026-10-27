import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const part = fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const operations = fs.readFileSync('server-game/src/20-members-and-roster.part','utf8');
const start = part.indexOf('let gmwwDiagnosticBusy=false,gmwwRuntimeErrors=[];');
const end = part.indexOf('\nfunction setDiagnosticState(',start);
assert.ok(start>=0&&end>start,'Runtime diagnostic source marker missing');

function diagnosticHarness(){
  const listeners = new Map();
  const context = {
    Date,WeakMap,console,
    window:{addEventListener(name,fn){listeners.set(name,fn)}},
    document:{getElementById(){return null}}
  };
  vm.createContext(context);
  vm.runInContext(part.slice(start,end)+
    '\nthis.inspectRuntimeIssues=(now)=>gmwwRecentRuntimeIssues(now);'+
    '\nthis.allRuntimeIssues=()=>gmwwRuntimeErrors;',context);
  return {listeners,context,emit(type,event){assert.ok(listeners.has(type),type);listeners.get(type)(event)}};
}

test('Tái hiện cảnh báo giả: image/resource error không có message không được tính là lỗi ứng dụng',()=>{
  const h=diagnosticHarness();
  h.emit('error',{target:{tagName:'IMG'}});
  h.emit('error',{message:'',target:{tagName:'LINK'}});
  assert.equal(h.context.inspectRuntimeIssues().length,0);
});

test('AbortError từ request bị hủy không biến thành lỗi Runtime; script load failure vẫn được ghi nhận',()=>{
  const h=diagnosticHarness();
  h.emit('unhandledrejection',{reason:{name:'AbortError',message:'The operation was aborted'},promise:{}});
  h.emit('error',{target:{tagName:'SCRIPT'}});
  assert.equal(h.context.inspectRuntimeIssues().length,1);
  assert.match(h.context.inspectRuntimeIssues()[0].message,/JavaScript/i);
});

test('Lỗi JavaScript thật hiển thị nguyên nhân đã lọc dữ liệu nhạy cảm, không tạo cảnh báo trùng',()=>{
  const h=diagnosticHarness();
  h.emit('error',{message:'ReferenceError: foo is not defined at https://example.org/api?token=super-secret'});
  h.emit('error',{message:'ReferenceError: foo is not defined at https://example.org/api?token=super-secret'});
  const errors=h.context.inspectRuntimeIssues();
  assert.equal(errors.length,1,'same error must not inflate warning count');
  assert.match(errors[0].message,/ReferenceError/);
  assert.doesNotMatch(errors[0].message,/super-secret|example.org/);
});

test('Promise được xử lý muộn không còn bị tính là lỗi tồn đọng',()=>{
  const h=diagnosticHarness(),promise={};
  h.emit('unhandledrejection',{promise,reason:{message:'Promise delayed handler'}});
  assert.equal(h.context.inspectRuntimeIssues().length,1);
  h.emit('rejectionhandled',{promise});
  assert.equal(h.context.inspectRuntimeIssues().length,0);
});

test('Lỗi cũ hết thời hạn cảnh báo; lỗi thật vẫn được giữ cho chẩn đoán',()=>{
  const h=diagnosticHarness();
  h.emit('error',{message:'TypeError: test undefined'});
  assert.equal(h.context.inspectRuntimeIssues().length,1);
  assert.equal(h.context.inspectRuntimeIssues(Date.now()+16*60*1000).length,0);
  assert.match(part,/gmwwRecentRuntimeIssues\(\)/);
  assert.doesNotMatch(part,/await checkServerHealth\(\);\s*gmwwRuntimeErrors=\[\];/,
    'SỬA NHANH không được xóa bằng chứng lỗi chưa giải quyết');
  assert.match(operations,/gmwwRecentRuntimeIssues\(\)/,
    'Operations Center must use the same live incident classification');
});

test('GM bundle ghép đúng 6 source parts, không ảnh hưởng gameplay/Player/IPA',()=>{
  const pieces=['00-core-and-library.part','10-library-and-settings.part',
    '20-members-and-roster.part','30-village-and-setup.part',
    '40-battle-and-timeline.part','50-roles-and-artifacts.part'];
  const joined=pieces.map(name=>fs.readFileSync('server-game/src/'+name,'utf8')).join('');
  assert.equal(fs.readFileSync('server-game/current/app.js','utf8'),joined);
});
