import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {selectVerifiedRuntimeV385Delta,selectVerifiedRuntimeV386Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
test('Settings keeps ChatGPT support private with one editable composer and separate send',()=>{
  assert.match(html,/id="settingsGroupErrorReport"/);
  assert.match(html,/id="gmwwReportToChatGPT"/);
  assert.match(html,/id="gmwwReportComposer"/);
  assert.match(html,/id="gmwwSendReport"/);
  assert.doesNotMatch(html,/id="gmwwReportPreview"/);
  assert.match(app,/https:\/\/chatgpt\.com\/\?prompt=/);
  assert.match(app,/encodeURIComponent\(message\)/);
  assert.match(app,/window\.open\(url,'_blank'\)/);
  assert.match(app,/gmwwLastBugDiagnostics/);
  assert.match(app,/runSystemDiagnostics\(\{silent:true\}\)/);
  assert.doesNotMatch(html,/gmww-ai-support\.(?:js|css)/);
  assert.doesNotMatch(worker,/\/api\/gm\/ai-support\/(?:config|chat)/);
  assert.doesNotMatch(worker,/aiSupportEnabled|handleAiSupport|AI_SUPPORT_REQUEST_LIMIT/);
  assert.doesNotMatch(fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8'),
    /copy\('server-game\/current\/gmww-ai-support\./);
});
test('Generated report excludes raw credentials, room details and runtime exception texts',()=>{
  const from=app.indexOf('/* GMWW Settings -> ChatGPT');
  const until=app.indexOf("const runSystemDiagnosticsBtn=document.getElementById('runSystemDiagnostics');",from);
  assert.ok(from>0&&until>from,'Report functions should be self-contained');
  const tokens={
    document:{
      getElementById(id){
        return {
          updateServerVersion:{textContent:'V3.85'},
          updateStatus:{textContent:'ĐANG PHÁT HÀNH'},
          updateDecisionTitle:{textContent:'Server chưa có gói Runtime'}
        }[id]||null
      },
      querySelector:()=>null,
      querySelectorAll:()=>[]
    },
    gmwwShellVersion:()=> '3.17',
    gmwwRuntimeVersion:()=> '3.85',
    gmwwRuntimeErrors:[{kind:'javascript',message:'Bearer extremely-sensitive-token text: ROOM_KEY ABCD23'}],
    navigator:{onLine:true}
  };
  const reporter=vm.runInNewContext(app.slice(from,until)+'\n({build:gmwwBuildBugReport})',tokens);
  const report=reporter.build({
    ok:false,warnings:['sensitive membership data'],
    probes:{
      server:{ok:true,status:200,latency:50,data:{loginId:'PRIVATE_USER'}},
      update:{ok:false,status:503,latency:90,data:{error:'RUNTIME_MANIFEST_NOT_READY',secret:'TOP_SECRET'}},
      player:{ok:false,status:404,latency:20,error:'Room ABCD23 private member'},
      settings:{ok:true,status:200,latency:10}
    }
  });
  assert.match(report,/GMWW_SAFE_ERROR_REPORT_V1/);
  assert.match(report,/RUNTIME_MANIFEST_NOT_READY/);
  assert.match(report,/V3\.85/);
  assert.match(report,/Mô tả lỗi:/);
  for(const secret of ['extremely-sensitive-token','ABCD23','TOP_SECRET','PRIVATE_USER','sensitive membership'])
    assert.ok(!report.includes(secret),'Sensitive field leaked: '+secret);
  const payload=JSON.parse(report.slice(report.indexOf('\n\n')+2));
  assert.equal(payload.checks.update.http,503);
  assert.equal(payload.checks.server.ok,true);
  assert.equal(payload.checks.characters.code,'NOT_CHECKED');
  assert.equal(payload.runtimeErrorCount,1);
});
test('Single editable prompt is initialized, diagnostics stay local, send uses exact edited text',async()=>{
  const form=html.slice(html.indexOf('id="settingsGroupErrorReport"'),html.indexOf('id="settingsGroupHealth"'));
  assert.match(form,/id="gmwwReportComposer"/);
  assert.match(form,/maxlength="16000"/);
  assert.match(form,/id="gmwwReportToChatGPT"/);
  assert.match(form,/id="gmwwSendReport"/);
  assert.doesNotMatch(form,/id="gmwwReportPreview"/);
  const listeners={};
  const control=(name,extra={})=>({disabled:false,...extra,addEventListener(type,fn){listeners[name+':'+type]=fn}});
  const editor=control('editor',{value:'',focus(){},select(){}});
  const info={textContent:''};
  const elements={
    gmwwReportComposer:editor,
    gmwwReportToChatGPT:control('diagnose'),
    gmwwSendReport:control('send'),
    gmwwReportStatus:info,
    updateServerVersion:{textContent:'V3.87'},
    updateStatus:{textContent:'ĐÃ CẬP NHẬT'},
    updateDecisionTitle:{textContent:'GMWW mới nhất'}
  };
  const opened=[];
  let checked=0;
  const context={
    document:{getElementById:id=>elements[id]||null,querySelector:()=>null,querySelectorAll:()=>[]},
    gmwwShellVersion:()=> '3.17',
    gmwwRuntimeVersion:()=> '3.88',
    gmwwRuntimeErrors:[],
    runSystemDiagnostics:async()=>{checked++;return {ok:true,probes:{server:{ok:true,status:200,latency:21}}}},
    navigator:{onLine:true},
    window:{open:(url)=>{opened.push(url);return {opener:null}}},Date
  };
  const from=app.indexOf('/* GMWW Settings -> ChatGPT');
  const until=app.indexOf("const runSystemDiagnosticsBtn=document.getElementById('runSystemDiagnostics');",from);
  vm.runInNewContext(app.slice(from,until),context);
  assert.match(editor.value,/YÊU CẦU CỦA GM/);
  assert.match(editor.value,/không đoán khi chưa có bằng chứng/i);
  assert.equal(opened.length,0);
  editor.value=editor.value.replace('[Viết vấn đề cần khắc phục hoặc tính năng cần bổ sung tại đây.]','Nút phân vai chưa hoạt động.');
  await listeners['diagnose:click']();
  assert.equal(checked,1);
  assert.equal(opened.length,0,'Diagnose must never open ChatGPT');
  assert.match(editor.value,/Nút phân vai chưa hoạt động/);
  assert.match(editor.value,/GMWW_SAFE_ERROR_REPORT_V1/);
  assert.match(editor.value,/"http": 200/); // server probe returned HTTP 200
  assert.equal((editor.value.match(/BẮT ĐẦU BÁO CÁO GMWW TỰ ĐỘNG/g)||[]).length,1);
  editor.value=editor.value.replace('Nút phân vai chưa hoạt động.','Nút phát vai chưa hoạt động.');
  await listeners['diagnose:click']();
  assert.equal(checked,2);
  assert.equal((editor.value.match(/BẮT ĐẦU BÁO CÁO GMWW TỰ ĐỘNG/g)||[]).length,1);
  assert.match(editor.value,/Nút phát vai chưa hoạt động/);
  assert.doesNotMatch(editor.value,/Nút phân vai chưa hoạt động/);
  editor.value+='\\nĐề nghị thêm kiểm thử Safari iPhone.';
  const sent=editor.value;
  listeners['send:click']();
  assert.equal(opened.length,1);
  assert.equal(decodeURIComponent(opened[0].split('?prompt=')[1]),sent);
  assert.match(info.textContent,/nhấn Gửi trong ChatGPT/);
});

test('Runtime V3.87 -> V3.88 OTA is a signed three-file overlay with no data deletion',async()=>{
  const {selectVerifiedRuntimeV388Delta}=await import('../src/gmww-ota-delta.js');
  const paths=['GMWW.html','app.js','style.css'];
  const mk=()=>({
    releaseVersion:'3.88',runtimeVersion:'3.88',shellVersion:'3.17',releaseType:'runtime',delete:[],
    runtime:{files:paths.map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.88/'+path,sha256:'a'.repeat(64)}))}
  });
  const result=selectVerifiedRuntimeV388Delta(mk(),'3.87');
  assert.equal(result?.upgradeMode,'verified-overlay');
  assert.deepEqual(result?.runtime.files.map(f=>f.path),paths);
  assert.deepEqual(result?.delete,[]);
  for(const old of ['3.86','3.85','3.88',''])assert.equal(selectVerifiedRuntimeV388Delta(mk(),old),null);
  const unsafe=mk();unsafe.delete=['localStorage'];assert.equal(selectVerifiedRuntimeV388Delta(unsafe,'3.87'),null);
  assert.match(worker,/selectVerifiedRuntimeV388Delta\(versioned,url\.searchParams\.get\("current"\)\)/);
  assert.match(worker,/selectVerifiedRuntimeV388Delta\(manifest,url\.searchParams\.get\("current"\)\)/);
});

test('Runtime V3.85 releases only SHA-verified app, HTML and CSS for installed V3.84',()=>{
  const paths=['GMWW.html','app.js','style.css'];
  const origin='https://gmww-v2-00.williampham0702.workers.dev';
  const manifest={
    releaseVersion:'3.85',runtimeVersion:'3.85',shellVersion:'3.17',
    releaseType:'runtime',
    runtime:{files:paths.map(path=>({path,url:origin+'/updates/runtime/V3.85/'+path,sha256:'a'.repeat(64)}))},
    delete:[]
  };
  const delta=selectVerifiedRuntimeV385Delta(manifest,'3.84');
  assert.ok(delta);
  assert.deepEqual(delta.runtime.files.map(x=>x.path),paths);
  assert.deepEqual(delta.delete,[]);
  assert.equal(delta.upgradeMode,'verified-overlay');
  assert.equal(selectVerifiedRuntimeV385Delta(manifest,'3.82'),null);
  const modified=JSON.parse(JSON.stringify(manifest));modified.delete=['localStorage'];
  assert.equal(selectVerifiedRuntimeV385Delta(modified,'3.84'),null);
  assert.match(worker,/selectVerifiedRuntimeV385Delta\(versioned,url\.searchParams\.get\("current"\)\)/);
  assert.match(worker,/selectVerifiedRuntimeV385Delta\(manifest,url\.searchParams\.get\("current"\)\)/);
});
test('V3.85 to V3.86 OTA updates only three SHA-pinned GM files, never game data',()=>{
  const names=['GMWW.html','app.js','style.css'];
  const files=()=>names.map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.86/'+path,sha256:'a'.repeat(64)}));
  const manifest=()=>({
    releaseVersion:'3.86',runtimeVersion:'3.86',shellVersion:'3.17',
    releaseType:'runtime',delete:[],runtime:{files:files()}
  });
  const patch=selectVerifiedRuntimeV386Delta(manifest(),'3.85');
  assert.ok(patch);
  assert.equal(patch.upgradeMode,'verified-overlay');
  assert.deepEqual(patch.runtime.files.map(f=>f.path),names);
  assert.deepEqual(patch.delete,[]);
  assert.equal(patch.optimizedFromVersion,'3.85');
  for(const from of ['3.70','3.84','3.86','3.17','']){
    assert.equal(selectVerifiedRuntimeV386Delta(manifest(),from),null);
  }
  for(const mutate of [
    x=>{x.releaseVersion='3.85'},x=>{x.runtimeVersion='3.85'},
    x=>{x.shellVersion='3.86'},x=>{x.delete=['gameData']},
    x=>{x.runtime.files.pop()},x=>{x.runtime.files[0].sha256='invalid'},
    x=>{x.runtime.files[1].url='https://example.com/app.js'},
    x=>{x.runtime.files.push({...x.runtime.files[0]})}
  ]){const x=manifest();mutate(x);assert.equal(selectVerifiedRuntimeV386Delta(x,'3.85'),null)}
  assert.match(worker,/selectVerifiedRuntimeV386Delta\(versioned,url\.searchParams\.get\("current"\)\)\|\|selectVerifiedRuntimeV385Delta/);
  assert.match(worker,/selectVerifiedRuntimeV386Delta\(manifest,url\.searchParams\.get\("current"\)\)\|\|selectVerifiedRuntimeV385Delta/);
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.version,'3.89.0');
});

test('V3.89 version, security and legacy storage remain stable',()=>{
  assert.match(app,/const VERSION='3\.89'/);
  assert.match(html,/<title>GMWW V3\.89<\/title>/);
  assert.match(worker,/VERSION="V3\.89"/);
  assert.match(worker,/UPDATE_CHANNEL_REV="runtime-389"/);
  assert.match(app,/GMWW_V258_STATE/);
  assert.match(app,/GMWW_V258_PREFS/);
  assert.match(worker,/publicEntryPolicy\(request\.method,url\.pathname\)/);
  assert.doesNotMatch(worker,/OPENAI_API_KEY|GMWW_AI_SUPPORT_TOKEN/);
  assert.doesNotMatch(html,/Chat AI Support/);
  for(const path of ['server-game/current/app.js','src/index.js']){
    const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(check.status,0,check.stderr);
  }
});
