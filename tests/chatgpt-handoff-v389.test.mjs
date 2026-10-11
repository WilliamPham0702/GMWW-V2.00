import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV389Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const start=app.indexOf('/* GMWW Settings -> ChatGPT');
const end=app.indexOf("const runSystemDiagnosticsBtn=document.getElementById('runSystemDiagnostics');",start);
assert.ok(start>0&&end>start);

function boot({native=false,popup='ok',message='Sửa lỗi phân vai & đồng bộ IPA'}={}){
  const listeners={},opened=[],navigated=[];
  const editor={value:message,focus(){this.focused=true}};
  const status={textContent:''};
  const elements={
    gmwwReportComposer:editor,gmwwReportStatus:status,
    gmwwReportToChatGPT:{addEventListener:(type,cb)=>listeners['diag:'+type]=cb},
    gmwwSendReport:{addEventListener:(type,cb)=>listeners['send:'+type]=cb}
  };
  const window={
    location:{assign:url=>navigated.push(url)},
    open(url){opened.push(url);if(popup==='blocked')return null;if(popup==='throw')throw Error('popup failed');return {opener:{}}},
    ...(native?{webkit:{messageHandlers:{gmwwUpdater:{}}}}:{})
  };
  const context={
    document:{getElementById:id=>elements[id]||null,querySelector:()=>null,querySelectorAll:()=>[]},
    gmwwRuntimeVersion:()=> '3.89',gmwwShellVersion:()=> '3.17',
    gmwwRuntimeErrors:[],navigator:{onLine:true},window,Date
  };
  vm.runInNewContext(app.slice(start,end),context);
  return {listeners,opened,navigated,status,editor,window};
}
test('ChatGPT composer removes copy UI and does not claim external message sent',()=>{
  assert.match(html,/id="gmwwReportComposer"/);
  assert.match(html,/id="gmwwSendReport"/);
  assert.match(html,/MỞ CHATGPT/);
  assert.doesNotMatch(html,/SAO CHÉP NỘI DUNG|gmwwCopyReport/);
  assert.doesNotMatch(app.slice(start,end),/gmwwCopyReport|clipboard\.writeText|execCommand\('copy'\)/);
  assert.doesNotMatch(css,/\.gmww-report-copy/);
  assert.match(html,/Tin nhắn chỉ được gửi khi bạn nhấn Gửi trong ChatGPT/);
});
test('iPhone IPA WKWebView uses native-intercepted same-frame navigation',()=>{
  const x=boot({native:true});
  x.listeners['send:click']();
  assert.equal(x.opened.length,0,'WKWebView cannot rely on window.open new window');
  assert.equal(x.navigated.length,1);
  assert.equal(x.navigated[0],'https://chatgpt.com/?prompt='+encodeURIComponent(x.editor.value));
  assert.match(x.status.textContent,/nhấn Gửi trong ChatGPT/);
  assert.doesNotMatch(x.status.textContent,/Đã gửi/);
});
test('Safari opens a new tab, blocked popup falls back to same tab, empty request is rejected',()=>{
  const regular=boot();
  regular.listeners['send:click']();
  assert.equal(regular.opened.length,1);
  assert.equal(regular.navigated.length,0);
  assert.match(regular.status.textContent,/nhấn Gửi trong ChatGPT/);
  const blocked=boot({popup:'blocked'});
  blocked.listeners['send:click']();
  assert.equal(blocked.navigated.length,1);
  assert.equal(decodeURIComponent(blocked.navigated[0].split('?prompt=')[1]),blocked.editor.value);
  const empty=boot({message:'  '});
  empty.editor.value=' ';
  empty.listeners['send:click']();
  assert.equal(empty.opened.length,0);
  assert.equal(empty.navigated.length,0);
  assert.equal(empty.editor.focused,true);
});
test('V3.88 to V3.89 overlay is signed, exact origin and fail closed, no storage changes',()=>{
  const make=()=>({
    releaseVersion:'3.89',runtimeVersion:'3.89',shellVersion:'3.17',releaseType:'runtime',
    delete:[],runtime:{files:['GMWW.html','app.js','style.css'].map(path=>({
      path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.89/'+path,
      sha256:'a'.repeat(64)
    }))}
  });
  const valid=selectVerifiedRuntimeV389Delta(make(),'3.88');
  assert.equal(valid?.upgradeMode,'verified-overlay');
  assert.deepEqual(valid?.delete,[]);
  assert.deepEqual(valid?.runtime.files.map(f=>f.path),['GMWW.html','app.js','style.css']);
  for(const older of ['3.87','3.89','3.17','unknown'])assert.equal(selectVerifiedRuntimeV389Delta(make(),older),null);
  for(const mutate of [
    x=>{x.delete=['gameData']},
    x=>{x.runtime.files[0].sha256='invalid'},
    x=>{x.runtime.files[0].url='https://malicious.example/GMWW.html'},
    x=>{x.runtime.files.push({...x.runtime.files[0]})},
    x=>{x.releaseType='native'}
  ]){const x=make();mutate(x);assert.equal(selectVerifiedRuntimeV389Delta(x,'3.88'),null)}
  const extended=make();extended.runtime.files.push({path:'additional-asset.png',sha256:'a'.repeat(64)});
  assert.equal(selectVerifiedRuntimeV389Delta(extended,'3.88')?.runtime.files.length,3);
  assert.match(worker,/VERSION="V3\.89"/);
  assert.match(worker,/UPDATE_CHANNEL_REV="runtime-390"/);
  for(const payload of ['versioned','manifest'])
    assert.ok(worker.includes('selectVerifiedRuntimeV389Delta('+payload+',url.searchParams.get("current"))'));
});
