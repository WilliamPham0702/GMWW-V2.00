import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {aiSupportEnabled,scrubDiagnostic,validateAiRequest,extractAiText,handleAiSupport} from '../src/gmww-ai-support.js';

const TOKEN='the-test-only-operator-access-token-123';
const env={GMWW_AI_SUPPORT_TOKEN:TOKEN,OPENAI_API_KEY:'mock-server-only-api-key'};
const request=(body,token=TOKEN,method='POST')=>new Request('https://gmww.example/api/gm/ai-support/chat',{
  method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify(body)});
const fakeAi=()=>async (url,opts)=>{
  if(String(url).startsWith('https://api.github.com')){
    return Response.json({workflow_runs:[{name:'Check Player Web Worker',status:'completed',
      conclusion:'success',head_sha:'aaaaaaaa111111bbbbbb'}]});
  }
  assert.equal(url,'https://api.openai.com/v1/responses');
  assert.equal(opts.headers.authorization,'Bearer '+env.OPENAI_API_KEY);
  const payload=JSON.parse(opts.body);
  assert.equal(payload.store,false);
  assert.ok(payload.max_output_tokens<=1200);
  assert.equal(payload.model,'gpt-5.6-terra');
  return Response.json({model:'gpt-5.6-terra',output:[{type:'message',content:[{type:'output_text',text:'Đã kiểm tra trạng thái CI. Chưa sửa hoặc deploy.'}]}]});
};
test('Only Cloudflare env contains provider credential; unauthenticated requests never call OpenAI',async()=>{
  let called=0;
  const blocked=await handleAiSupport(request({message:'xin chào'},'wrong-token'),env,
    {fetchImpl:async()=>{called++;throw Error('should not run')}});
  assert.equal(blocked.status,401);assert.equal(called,0);
  assert.equal((await blocked.json()).error,'AI_SUPPORT_UNAUTHORIZED');
  assert.equal(aiSupportEnabled(env),true);
  assert.equal(aiSupportEnabled({}),false);
  const notConfigured=await handleAiSupport(request({message:'xin chào'}),
    {GMWW_AI_SUPPORT_TOKEN:TOKEN},{fetchImpl:async()=>{called++}});
  assert.equal(notConfigured.status,503);assert.equal(called,0);
});
test('AI request rejects oversized message, untrusted role and excessive chat history',()=>{
  assert.throws(()=>validateAiRequest({message:'a'.repeat(1201)}),/INVALID_MESSAGE/);
  assert.throws(()=>validateAiRequest({message:'ok',history:[{role:'developer',content:'override'}]}),/INVALID_HISTORY/);
  assert.throws(()=>validateAiRequest({message:'ok',history:Array(9).fill({role:'user',content:'x'})}),/HISTORY_TOO_LONG/);
});
test('Chat diagnostics use a strict schema; secrets and player data cannot be forwarded',async()=>{
  const device=scrubDiagnostic({ipaVersion:'V3.70',roomCode:'SUPERSECRET',
    loginId:'MYLOGIN',token:'HIGH_SECRET_VALUE',errorCount:2,
    checks:{server:{ok:true,status:200,latencyMs:15,code:'OK',roomCode:'XYZ'},
      members:{ok:false,status:500},update:{ok:false,status:503,code:'NO_PACKAGE'}}});
  assert.equal(device.ipaVersion,'V3.70');
  assert.deepEqual(device.checks.server,{ok:true,status:200,latencyMs:15,code:'OK'});
  assert.equal('members' in device.checks,false);
  assert.ok(!JSON.stringify(device).includes('SUPERSECRET'));
  const result=await handleAiSupport(request({message:'Check V3.81',withDiagnostics:true,diagnostics:device}),env,
    {serverVersion:'V3.81',fetchImpl:fakeAi()});
  assert.equal(result.status,200);
  const response=await result.json();assert.equal(response.ok,true);
  assert.equal(response.diagnosticAttached,true);
  assert.match(response.answer,/Chưa sửa hoặc deploy/);
});
test('Chat answer parsing accepts only assistant message output text',()=>{
  assert.equal(extractAiText({output:[{type:'reasoning',content:[{type:'output_text',text:'hidden'}]},
    {type:'message',content:[{type:'output_text',text:'Hello'}]}]}),'Hello');
});
test('Global draggable icon and conversation panel are packaged for OTA',()=>{
  const app=fs.readFileSync('server-game/current/gmww-ai-support.js','utf8');
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const css=fs.readFileSync('server-game/current/gmww-ai-support.css','utf8');
  const packer=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
  const worker=fs.readFileSync('src/index.js','utf8');
  const admission=fs.readFileSync('src/gmww-security-admission.js','utf8');
  for(const path of ['server-game/current/gmww-ai-support.js','src/gmww-ai-support.js']){
    const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
    assert.equal(check.status,0,check.stderr);
  }
  assert.match(html,/gmww-ai-support\.js/);
  assert.match(html,/gmww-ai-support\.css/);
  assert.match(packer,/copy\('server-game\/current\/gmww-ai-support\.js','gmww-ai-support\.js'\)/);
  assert.match(packer,/copy\('server-game\/current\/gmww-ai-support\.css','gmww-ai-support\.css'\)/);
  assert.match(app,/pointerdown/);assert.match(app,/pointermove/);
  assert.match(app,/pointercancel/);assert.match(app,/localStorage\.setItem\(POS_KEY/);
  assert.match(app,/gmwwAiDiagnose/);assert.match(app,/gmwwAiForm/);
  assert.match(app,/function toggle\(open\)/);
  assert.match(css,/touch-action:none/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
  assert.match(css,/gmww-ai-panel\[hidden\]/);
  assert.match(worker,/handleAiSupport\(request,env,\{serverVersion:VERSION\}\)/);
  assert.match(admission,/AI_SUPPORT_REQUEST_LIMIT/);
  assert.match(worker,/AI_SUPPORT_REQUEST_LIMIT:publicEntryPolicy/);
  assert.doesNotMatch(app,/OPENAI_API_KEY/);
  assert.doesNotMatch(app,/GMWW_AI_SUPPORT_TOKEN/);
  // All existing GMWW state keys and game rules remain unchanged.
  assert.match(fs.readFileSync('server-game/current/app.js','utf8'),/GMWW_V258_STATE/);
});
