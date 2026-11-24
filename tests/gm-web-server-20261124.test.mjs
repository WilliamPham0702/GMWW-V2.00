// GM Server trên web/PWA cho PC + khóa thiết bị trên giao diện GM (V3.328).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GM_WEB_PREFIX,gmWebAssetPath,gmWebHtml,handleGmWebRoute,GM_WEB_MANIFEST,GM_WEB_SERVICE_WORKER} from '../src/worker/http/gm-web.js';
import {corsHeaders} from '../src/worker/http/responses.js';
import {defineWorkerConfig} from '../src/worker/config.js';
defineWorkerConfig({VERSION:'V3.328'});

function fakeAssets(files,{latest}={}){
  const seen=[];
  return {seen,async fetch(req){const p=new URL(req.url).pathname;seen.push(p);
    if(p==='/updates/latest.json')return latest?new Response(JSON.stringify({releaseVersion:latest})):new Response('',{status:404});
    return p in files?new Response(files[p],{headers:{'content-type':'text/plain','cache-control':'public, max-age=31536000'}}):new Response('nf',{status:404})}};
}
const get=(path,env)=>handleGmWebRoute(new Request('https://x.dev'+path),env,new URL('https://x.dev'+path));

test('asset path stays inside the Runtime folder', () => {
  assert.equal(gmWebAssetPath('/gm-server/'),'GMWW.html');
  assert.equal(gmWebAssetPath('/gm-server/app.js'),'app.js');
  assert.equal(gmWebAssetPath('/gm-server/home-art/a.webp'),'home-art/a.webp');
  for(const bad of ['/gm-server/../src/index.js','/gm-server/%2e%2e/x','/gm-server/a//b','/gm-server/a?b','/other/app.js'])assert.equal(gmWebAssetPath(bad),null,bad);
});

test('/gm-server/ serves the published Runtime GMWW.html with PWA head, no long cache', async () => {
  const assets=fakeAssets({'/updates/runtime/V3.328/GMWW.html':'<html><head><title>GMWW</title></head><body></body></html>'});
  const res=await get('/gm-server/',{ASSETS:assets});
  assert.equal(res.status,200);
  const html=await res.text();
  assert.match(html,/rel="manifest" href="\/gm-server\/manifest.webmanifest"/);
  assert.match(html,/serviceWorker/);
  assert.equal(res.headers.get('cache-control'),'no-cache');
  assert.match(res.headers.get('content-type'),/text\/html/);
});

test('falls back to latest.json release when the Worker version folder is absent', async () => {
  const assets=fakeAssets({'/updates/runtime/V3.327/app.js':'ok'},{latest:'3.327'});
  const res=await get('/gm-server/app.js',{ASSETS:assets});
  assert.equal(res.status,200);
  assert.equal(await res.text(),'ok');
});

test('missing package → friendly 503 page, unknown file → 404; redirect bare prefix', async () => {
  const env={ASSETS:fakeAssets({})};
  assert.equal((await get('/gm-server/',env)).status,503);
  assert.equal((await get('/gm-server/nope.js',env)).status,404);
  const r=await get('/gm-server',env);
  assert.equal(r.status,301);
  assert.equal(r.headers.get('location'),'https://x.dev/gm-server/');
});

test('PWA manifest + service worker never cache API calls', async () => {
  assert.equal(GM_WEB_MANIFEST.scope,GM_WEB_PREFIX+'/');
  assert.equal(GM_WEB_MANIFEST.display,'standalone');
  const sw=await get('/gm-server/sw.js',{ASSETS:fakeAssets({})});
  assert.equal(sw.headers.get('service-worker-allowed'),'/gm-server/');
  assert.match(GM_WEB_SERVICE_WORKER,/startsWith\('\/gm-server\/'\)/);
  assert.match(gmWebHtml('<p>no head</p>'),/manifest/);
});

test('router wires /gm-server and the public device-lease API; CORS allows x-gmww-device', () => {
  const router=fs.readFileSync('src/worker/http/router.js','utf8');
  assert.match(router,/handleGmWebRoute\(request,env,url\)/);
  assert.match(router,/device-lease\$\/\);if\(gmDeviceLeaseRoute&&request\.method==="POST"\)return roomProxy\(env,gmDeviceLeaseRoute\[1\],"\/gm\/device-lease",request\)/);
  assert.match(corsHeaders()['access-control-allow-headers'],/x-gmww-device/);
});

test('GM Server sends x-gmww-device on room calls and shows lease chip', () => {
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(app,/'x-gmww-device':gmDeviceId\(\)/);
  assert.match(app,/if\(err\?\.code==='GM_DEVICE_LEASE_OWNED'\)gmDeviceLeaseBlocked\(\)/);
  assert.match(app,/'Giành quyền'/);
  assert.match(app,/gmDeviceLeaseCall\('takeover'\)/);
  assert.match(app,/gmDeviceLeaseCall\('release'/);
  // No unused polling: renewal only while this device holds the lease and the app is visible.
  assert.match(app,/const want=gmDeviceLease\.mine&&document\.visibilityState!=='hidden'/);
});

test('V3.332: lease chip only when ANOTHER device holds control, placed below the top menu; Live seat number is red', () => {
  const app=fs.readFileSync('server-game/current/app.js','utf8'),html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(app,/&&!gmDeviceLease\.mine&&!!gmDeviceLease\.owner;/);
  assert.match(app,/top:calc\(env\(safe-area-inset-top,0px\) \+ 78px\)/);
  assert.match(html,/\.play-seat-number\{[^}]*background:#e3172f;[^}]*border:2px solid #fff/);
});
