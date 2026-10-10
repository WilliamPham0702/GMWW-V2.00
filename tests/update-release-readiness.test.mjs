import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isRuntimePackageReady} from '../src/gmww-update-readiness.js';

const base='https://gmww-v2-00.williampham0702.workers.dev';
const hash=createHash('sha256').update('published').digest('hex');
const paths=['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css','gm/gm-white-wolf.webp','home-art/home-fantasy-hero-v337.webp','home-art/home-v1-book.webp','home-art/home-v1-members.webp','home-art/home-v1-action.webp'];
const manifest=()=>({
  releaseVersion:'3.62',runtimeVersion:'3.62',releaseType:'runtime',
  runtime:{files:paths.map(path=>({path,url:base+'/updates/runtime/V3.62/'+path,sha256:hash}))}
});
const contentType=path=>path==='GMWW.html'?'text/html':path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'image/webp';
function assets({missing='',wrongMime='',throwFor=''}={}){
  return {fetch:async request=>{
    const path=new URL(request.url).pathname.replace('/updates/runtime/V3.62/','');
    if(path===throwFor)throw Error('edge unavailable');
    if(path===missing)return new Response('Not Found',{status:404});
    return new Response('published',{status:200,headers:{'content-type':path===wrongMime?'text/html':contentType(path)}});
  }};
}
const ready=(asset,release=manifest())=>isRuntimePackageReady({
  assets:asset,manifest:release,version:'3.62',requestUrl:base+'/api/update/manifest'
});
test('OTA is advertised only after all three essential immutable assets are readable',async()=>{
  assert.equal(await ready(assets()),true);
  assert.equal(await ready(assets({missing:'app.js'})),false);
  assert.equal(await ready(assets({throwFor:'style.css'})),false);
  assert.equal(await ready(assets({missing:'home-art/home-v1-book.webp'})),false);
});
test('HTML fallback for an unpublished JS or CSS is not a ready runtime',async()=>{
  assert.equal(await ready(assets({wrongMime:'app.js'})),false);
  assert.equal(await ready(assets({wrongMime:'style.css'})),false);
});
test('Untrusted, incomplete, duplicated or wrong-version manifests fail closed',async()=>{
  const duplicate=manifest();duplicate.runtime.files.push({...duplicate.runtime.files[0]});
  const wrongHash=manifest();wrongHash.runtime.files[0].sha256='not-a-hash';
  const wrongUrl=manifest();wrongUrl.runtime.files[0].url=base+'/updates/runtime/V3.61/GMWW.html';
  const missing=manifest();missing.runtime.files.pop();
  const wrongVersion=manifest();wrongVersion.releaseVersion='3.61';
  const wrongBytes=manifest();wrongBytes.runtime.files[1].sha256='b'.repeat(64);
  for(const m of [duplicate,wrongHash,wrongUrl,missing,wrongVersion,wrongBytes])
    assert.equal(await ready(assets(),m),false);
});
test('Production Worker gates both latest and versioned Runtime manifest on asset readiness',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/if\(validRuntime\(versioned\)&&await runtimeReady\(versioned\)\)/);
  assert.match(worker,/if\(validRuntime\(manifest\)&&await runtimeReady\(manifest\)\)/);
  assert.match(worker,/RUNTIME_MANIFEST_NOT_READY/);
});
test('IPA distinguishes not-yet-published update from a real failure without announcing it',()=>{
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(app,/error\.code=String\(body\?\.error\|\|''\)/);
  assert.match(app,/setUpdateAction\('pending'\)/);
  assert.match(app,/ĐANG PHÁT HÀNH/);
  assert.match(app,/gmwwUpdateManifest=null/);
});

test('Runtime downloads are served by the same Cloudflare ASSETS binding as readiness checks',()=>{
  const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
  assert.ok(config.assets.run_worker_first.includes('/updates/runtime/*'));
  assert.ok(config.assets.run_worker_first.includes('/updates/latest.json'));
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/url\.pathname\.startsWith\("\/updates\/runtime\/"\)/);
  assert.match(worker,/return env\.ASSETS\.fetch\(request\)/);
});
