import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {recoverLegacyRuntimeManifest} from '../src/gmww-runtime-recovery.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const root='https://gmww-v2-00.williampham0702.workers.dev',version='3.62';
const src=new Map(['GMWW.html','app.js','style.css','home-art/home-sea-portal-v354.svg','home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg'].map(x=>[x,readFileSync('server-game/current/'+x)]));
const cfg={requestUrl:root+'/api/update/manifest?current=3.38',version,shellVersion:'3.17',installedVersion:'3.38'};
function mock(block,override={}){return{fetch:async req=>{
 const filename=new URL(req.url).pathname.split('/').slice(4).join('/');
 const bytes=override[filename]||src.get(filename);
 return filename===block||!bytes?new Response('Missing',{status:404}):new Response(bytes);
}};}
test('Rescue OTA installs verified V3.62 app, HTML and CSS on IPA V3.17',async()=>{
 const manifest=await recoverLegacyRuntimeManifest({...cfg,assets:mock()});
 assert.equal(manifest?.releaseType,'runtime');
 assert.equal(manifest.runtimeVersion,'3.62');
 assert.equal(manifest.shellVersion,'3.17');
 assert.equal(manifest.runtime.files.length,7);
 for(const file of manifest.runtime.files){
  assert.ok(file.url.startsWith(root+'/updates/runtime/V3.62/'));
  assert.equal(file.sha256,createHash('sha256').update(src.get(file.path)).digest('hex'));
 }
});
test('Rescue rejects older or future client runtimes',async()=>{
 for(const v of ['3.17','3.37','3.62','unknown']){
  assert.equal(await recoverLegacyRuntimeManifest({...cfg,installedVersion:v,assets:mock()}),null);
 }
 assert.equal(await recoverLegacyRuntimeManifest({...cfg,version:'3.63',assets:mock()}),null);
});
test('Rescue fails closed for absent or invalid files',async()=>{
 assert.equal(await recoverLegacyRuntimeManifest({...cfg,assets:mock('app.js')}),null);
 assert.equal(await recoverLegacyRuntimeManifest({...cfg,assets:mock(null,{'GMWW.html':Buffer.from('<title>GMWW V3.38</title>')})}),null);
});
test('Worker uses rescue if either normal manifest channel is unreadable',()=>{
 const code=readFileSync('src/index.js','utf8');
 assert.match(code,/recoverOlderInstalledRuntime=\(\)=>recoverLegacyRuntimeManifest/);
 assert.match(code,/if\(!res\.ok\)\{\s*if\(!currentNativeShell\)\{const rescue=await recoverOlderInstalledRuntime\(\)/);
 assert.match(code,/if\(validRuntime\(manifest\)\)return j\(\{ok:true,/);
});

test('Rescue OTA also repairs an installed V3.39 runtime',async()=>{
 const m=await recoverLegacyRuntimeManifest({...cfg,installedVersion:'3.39',assets:mock()});
 assert.equal(m?.releaseVersion,'3.62');
 assert.deepEqual(m?.runtime?.files?.map(f=>f.path),['GMWW.html','app.js','style.css','home-art/home-sea-portal-v354.svg','home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg']);
});

test('Rescue OTA upgrades an installed V3.40 runtime with verified files',async()=>{
 const manifest=await recoverLegacyRuntimeManifest({...cfg,installedVersion:'3.40',assets:mock()});
 assert.equal(manifest?.runtimeVersion,'3.62');
 assert.equal(manifest?.runtime?.files?.length,7);
});

test('V3.62 fallback also upgrades a V3.41 runtime',async()=>{const m=await recoverLegacyRuntimeManifest({...cfg,installedVersion:'3.41',assets:mock()});assert.equal(m?.runtimeVersion,'3.62')});

test('V3.62 safely recovers an installed V3.44 Runtime without reinstalling IPA',async()=>{
 const manifest=await recoverLegacyRuntimeManifest({...cfg,installedVersion:'3.44',assets:mock()});
 assert.equal(manifest?.runtimeVersion,'3.62');
 assert.equal(manifest?.shellVersion,'3.17');
 assert.deepEqual(manifest.runtime.files.map(f=>f.path),['GMWW.html','app.js','style.css','home-art/home-sea-portal-v354.svg','home-art/home-sea-cards-v354.svg','home-art/home-sea-members-v354.svg','home-art/home-sea-templates-v354.svg']);
});

test('V3.62 recovers V3.46 installations',async()=>{const m=await recoverLegacyRuntimeManifest({...cfg,installedVersion:'3.46',assets:mock()});assert.equal(m?.releaseVersion,'3.62')});
