import {assertCurrentRelease} from './release-metadata-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {selectVerifiedRuntimeV385Delta,selectVerifiedRuntimeV386Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('ChatGPT error reporting is absent from both settings UI and runtime handlers',()=>{
  for(const forbidden of ['settingsGroupErrorReport','gmwwReportComposer','gmwwReportToChatGPT',
    'gmwwSendReport','gmwwCopyReport','gmwwReportStatus']){
    assert.ok(!html.includes('id="'+forbidden+'"'),'ChatGPT element remains: '+forbidden);
    assert.ok(!app.includes("getElementById('"+forbidden+"')"),'ChatGPT handler remains: '+forbidden);
  }
  assert.doesNotMatch(html,/Báo lỗi qua ChatGPT|SAO CHÉP NỘI DUNG/);
  assert.doesNotMatch(app,/function gmwwSendReportToChatGPT|function gmwwReportBugToChatGPT|gmwwBuildBugReport|chatgpt\.com\/\?prompt=/);
  assert.doesNotMatch(html,/gmww-ai-support\.(?:js|css)/);
  assert.doesNotMatch(worker,/\/api\/gm\/ai-support\/(?:config|chat)/);
  assert.doesNotMatch(worker,/aiSupportEnabled|handleAiSupport|AI_SUPPORT_REQUEST_LIMIT/);
  assert.doesNotMatch(fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8'),
    /copy\('server-game\/current\/gmww-ai-support\./);
});

test('Removed reporting leaves three orderly settings groups and system maintenance operational',()=>{
  const start=html.indexOf('<section class="page" id="settings">');
  const end=html.indexOf('</section>',start);
  const settings=html.slice(start,end);
  const expected=['settingsGroupUpdate','settingsGroupHealth','settingsGroupAppearance'];
  assert.deepEqual([...settings.matchAll(/id="(settingsGroup\w+)"/g)].map(m=>m[1]),expected);
  for(let i=0;i<expected.length;i++){
    const pos=settings.indexOf('id="'+expected[i]+'"');
    const next=i===expected.length-1?settings.length:settings.indexOf('id="'+expected[i+1]+'"');
    assert.match(settings.slice(pos,next),new RegExp('settings-unified-index">0'+(i+1)+'<'));
  }
  for(const id of ['installRuntimeUpdate','downloadNewIPA','syncPlayerWebUpdate','runSystemDiagnostics',
    'quickRepairSystem','checkPlayerWebNow','settingsRunHealth']){
    assert.match(settings,new RegExp('id="'+id+'"'));
  }
  for(const id of ['installRuntimeUpdate','syncPlayerWebUpdate','runSystemDiagnostics','quickRepairSystem'])
    assert.ok(app.includes("getElementById('"+id+"')"),'Maintenance handler removed: '+id);
  assert.doesNotMatch(app,/localStorage\.clear\(\)|indexedDB\.deleteDatabase\(/);
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
  assertCurrentRelease();
});

test('V3.94 version, security and legacy storage remain stable',()=>{
  assertCurrentRelease();
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
