import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {diagnoseRuntimePackage,isRuntimePackageReady} from '../src/gmww-update-readiness.js';

const origin='https://gmww-v2-00.williampham0702.workers.dev';
const essential=['GMWW.html','app.js','style.css','character-renderer.js',
  'character-renderer.css','gm/gm-white-wolf.webp','home-art/home-fantasy-hero-v337.webp',
  'home-art/home-v1-book.webp','home-art/home-v1-members.webp','home-art/home-v1-action.webp'];
const sha=createHash('sha256').update('published').digest('hex');
const makeManifest=()=>({
  releaseVersion:'3.81',runtimeVersion:'3.81',releaseType:'runtime',
  runtime:{files:essential.map(path=>({path,sha256:sha,
    url:origin+'/updates/runtime/V3.81/'+path}))}
});
const mime=path=>path.endsWith('.html')?'text/html':path.endsWith('.js')?'application/javascript':
  path.endsWith('.css')?'text/css':'image/webp';
function mockAssets({absent='',wrongMime='',wrongBytes='',unavailable=''}={}){
  return {fetch:async request=>{
    const path=new URL(request.url).pathname.replace('/updates/runtime/V3.81/','');
    if(path===unavailable)throw Error('unavailable');
    if(path===absent)return new Response('Not found',{status:404});
    return new Response(path===wrongBytes?'tampered':'published',
      {status:200,headers:{'content-type':path===wrongMime?'text/html':mime(path)}});
  }};
}
const probe=(assets,manifest=makeManifest())=>diagnoseRuntimePackage({
  assets,manifest,version:'3.81',requestUrl:origin+'/api/update/manifest?current=3.80'
});
test('OTA diagnostic is ready only when every essential published byte is verified',async()=>{
  assert.deepEqual(await probe(mockAssets()),{ready:true,code:'RUNTIME_READY',asset:null});
  assert.equal(await isRuntimePackageReady({
    assets:mockAssets(),manifest:makeManifest(),version:'3.81',requestUrl:origin
  }),true);
  const cases=[
    [{absent:'app.js'},'PUBLISHED_FILE_UNAVAILABLE','app.js'],
    [{wrongMime:'style.css'},'PUBLISHED_MIME_MISMATCH','style.css'],
    [{wrongBytes:'gm/gm-white-wolf.webp'},'PUBLISHED_SHA256_MISMATCH','gm/gm-white-wolf.webp'],
    [{unavailable:'GMWW.html'},'PUBLISHED_FILE_FETCH_ERROR','GMWW.html']
  ];
  for(const [options,code,asset] of cases){
    const result=await probe(mockAssets(options));
    assert.equal(result.ready,false);
    assert.equal(result.code,code);
    assert.equal(result.asset,asset);
  }
});
test('Unpublished, invalid and wrong-origin packages fail closed',async()=>{
  const missing=makeManifest();missing.runtime.files.shift();
  const duplicate=makeManifest();duplicate.runtime.files.push({...duplicate.runtime.files[0]});
  const badSha=makeManifest();badSha.runtime.files[0].sha256='bad';
  const offsite=makeManifest();offsite.runtime.files[0].url='https://example.net/app.js';
  const wrongVersion=makeManifest();wrongVersion.releaseVersion='3.80';
  for(const [manifest,expected] of [
    [missing,'REQUIRED_FILE_NOT_LISTED'],[duplicate,'REQUIRED_FILE_NOT_LISTED'],
    [badSha,'INVALID_SHA256'],[offsite,'FILE_URL_MISMATCH'],
    [wrongVersion,'MANIFEST_VERSION_MISMATCH']
  ])assert.equal((await probe(mockAssets(),manifest)).code,expected);
});
test('Server provides read-only diagnosis and never blindly announces an unpublished release',()=>{
  const source=fs.readFileSync('src/index.js','utf8');
  assert.match(source,/url\.pathname==="\/api\/update\/diagnostics"/);
  assert.match(source,/diagnoseRuntimePackage\(\{assets:env\.ASSETS/);
  assert.match(source,/RUNTIME_MANIFEST_NOT_PUBLISHED/);
  assert.match(source,/if\(validRuntime\(versioned\)&&await runtimeReady\(versioned\)\)/);
  assert.match(source,/if\(validRuntime\(manifest\)&&await runtimeReady\(manifest\)\)/);
});
test('iPhone report controls are wired and cannot initiate an unavailable Runtime download',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(html,/id="reportGmwwIssue"/);
  assert.match(html,/id="chatgptIssueFallback"/);
  assert.match(app,/x\.disabled=\(x===runtime&&kind!=='runtime'\)/);
  assert.match(app,/gmwwUpdateActionKind!=='runtime'/);
  assert.match(app,/\/api\/update\/diagnostics\?current=/);
  assert.match(app,/gmwwBuildChatGPTIssuePrompt/);
  assert.match(app,/https:\/\/chatgpt\.com\/\?prompt=/);
  assert.match(app,/window\.open\(url,'_blank','noopener,noreferrer'\)/);
  assert.doesNotMatch(app,/summary:gmwwSafeDiagnosticText\(e\.message\)/);
});
test('ChatGPT handoff redacts URLs, emails, credentials and long identifiers',()=>{
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  const start=app.indexOf('function gmwwSafeDiagnosticText(value){');
  const end=app.indexOf('function gmwwBuildChatGPTIssuePrompt(){');
  assert.ok(start>=0&&end>start);
  const clean=vm.runInNewContext(app.slice(start,end)+'\ngmwwSafeDiagnosticText;');
  const scrub=clean('Contact joe@example.com https://example.com/room/SECRET?token=abc Bearer abcdefghijklmnopqrstuvwxyz');
  assert.ok(!scrub.includes('joe@example.com'));
  assert.ok(!scrub.includes('https://example.com'));
  assert.ok(!scrub.includes('abcdefghijklmnopqrstuvwxyz'));
  assert.match(scrub,/\[EMAIL\]/);
  assert.match(scrub,/\[URL\]/);
});
