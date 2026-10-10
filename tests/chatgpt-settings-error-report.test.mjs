import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {selectVerifiedRuntimeV385Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
test('Settings replaces floating AI Support and has a single-tap ChatGPT report',()=>{
  assert.match(html,/id="settingsGroupErrorReport"/);
  assert.match(html,/id="gmwwReportToChatGPT"/);
  assert.match(html,/id="gmwwReportPreview"/);
  assert.match(html,/id="gmwwOpenChatGPT"/);
  assert.match(app,/https:\/\/chatgpt\.com\/\?prompt=/);
  assert.match(app,/encodeURIComponent\(report\)/);
  assert.match(app,/window\.open\(target,'_blank','noopener,noreferrer'\)/);
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
  assert.match(report,/ChatGPT/);
  for(const secret of ['extremely-sensitive-token','ABCD23','TOP_SECRET','PRIVATE_USER','sensitive membership'])
    assert.ok(!report.includes(secret),'Sensitive field leaked: '+secret);
  const payload=JSON.parse(report.slice(report.indexOf('\n\n')+2));
  assert.equal(payload.checks.update.http,503);
  assert.equal(payload.checks.server.ok,true);
  assert.equal(payload.checks.characters.code,'NOT_CHECKED');
  assert.equal(payload.runtimeErrorCount,1);
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
test('Version, security and legacy storage remain stable',()=>{
  assert.match(app,/const VERSION='3\.85'/);
  assert.match(html,/<title>GMWW V3\.85<\/title>/);
  assert.match(worker,/VERSION="V3\.85"/);
  assert.match(worker,/UPDATE_CHANNEL_REV="runtime-385"/);
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
