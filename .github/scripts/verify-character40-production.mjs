import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const base='https://gmww-v2-00.williampham0702.workers.dev';
const version=JSON.parse(await readFile('package.json','utf8')).version.replace(/\.0$/,'');
const actions=['idle','walk','run','turn'],sha=b=>createHash('sha256').update(b).digest('hex');
async function bytes(path){
 const url=new URL(path,base);assert.equal(url.origin,base);
 for(let attempt=0;attempt<4;attempt++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'cache-control':'no-cache'}});assert.equal(r.status,200,path);return Buffer.from(await r.arrayBuffer());}
  catch(e){if(attempt===3)throw e;await new Promise(r=>setTimeout(r,1000));}
 }
}
const json=async path=>JSON.parse((await bytes(path)).toString());
assert.equal((await json('/api/health?character40-verify='+Date.now())).version,'V'+version);
const catalog=await json('/api/game-characters');assert.equal(catalog.count,40);assert.equal(catalog.characters.length,40);
const manifest=await json('/api/character-engine/manifest');assert.deepEqual(manifest.master.motionSet,actions);
for(const c of manifest.characters)assert.deepEqual(c.motions,actions,c.id);
const published=await json('/api/update/manifest?current=3.153&character40-verify='+Date.now());
assert.equal(published.runtimeVersion,version);
let ota=published;
if(published.releaseType==='native'){
 // A new iOS shell must NOT advertise Runtime OTA to older installs.
 // Verify its separately packaged complete inventory and real edge bytes instead.
 const nativeProject=await readFile('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');
 const nativeShell=nativeProject.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim();
 assert.equal(nativeShell,version,'Native release version must match the actual Xcode project');
 assert.equal(published.shellVersion,version);
 assert.equal(published.minimumShellVersion,version);
 assert.equal(published.ipa?.version,version);
 assert.equal(published.ipa?.fileName,'GMWW-V'+version+'.ipa');
 assert.deepEqual(published.runtime?.files,[],'Native release must not advertise Runtime OTA');
 ota=JSON.parse(await readFile('assets/updates/runtime/V'+version+'/manual-manifest.json','utf8'));
 assert.equal(ota.releaseType,'native');
 assert.equal(ota.releaseVersion,version);
 assert.equal(ota.runtimeVersion,version);
 assert.equal(ota.shellVersion,version);
 assert.equal(ota.minimumShellVersion,version);
 assert.ok(Array.isArray(ota.runtime?.files)&&ota.runtime.files.length>0,'Missing verified manual package inventory');
 const files=ota.runtime.files;
 assert.equal(new Set(files.map(f=>f.path)).size,files.length,'Duplicate manual package entries');
 for(const entry of files){
  assert.match(String(entry.sha256||''),/^[a-f0-9]{64}$/i,'Missing file SHA-256');
  assert.equal(entry.url,new URL('/updates/runtime/V'+version+'/'+entry.path,base).href,'Untrusted manual package URL');
 }
}else{
 assert.equal(published.releaseType,'runtime');
 const nativeProject=await readFile('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');
 const nativeShell=nativeProject.match(/MARKETING_VERSION = ([^;]+);/)?.[1]?.trim();
 assert.ok(nativeShell,'Native version missing');
 assert.equal(published.shellVersion,nativeShell,'Runtime shell must match the unchanged signed IPA');
 assert.equal(published.ipa?.version,nativeShell,'Runtime IPA metadata must stay aligned with native project');
 assert.equal(published.minimumShellVersion,nativeShell,'Never install OTA on unsupported old shell');
}
const accepted=JSON.parse(await readFile('prototype/character40/catalog.json','utf8')).characters;
let index=0;
await Promise.all(Array.from({length:4},async()=>{
 while(index<40){
  const n=index++,c=accepted[n],live=catalog.characters[n];assert.equal(live.id,c.id);assert.deepEqual(live.actions,actions);
  // The public c40-4 profile image route intentionally serves the approved
  // canonical original artwork, not the deploy-time generated portrait.
  // Verify exact source bytes; keep all 40 atlas and Runtime SHA checks below.
  const originalPath='assets/characters/gmww40/'+c.original;
  const originalSha=sha(await readFile(originalPath));
  assert.equal(sha(await bytes(live.imageUrl)),originalSha,c.id+' live profile image must match canonical original');
  assert.equal(sha(await bytes(live.motionAtlas)),c.atlasSHA256,c.id+' live motion atlas');
  // Preserve rigorous SHA guards for both unchanged original artwork and
  // all animation atlases in the separately signed native Runtime inventory.
  for(const [path,expected] of [
    ['characters/gmww40/'+c.original,c.originalSHA256],
    ['characters/gmww40/'+c.atlas,c.atlasSHA256]
  ]) assert.equal(ota.runtime.files.find(f=>f.path===path)?.sha256,expected,c.id+' OTA artwork');

 }
}));
for(const path of ['gmww-shared-motion.js','GMWW.html','app.js']){
 const f=ota.runtime.files.find(f=>f.path===path);assert.ok(f,path+' OTA entry');
 const expected=sha(await readFile('assets/updates/runtime/V'+version+'/'+path));assert.equal(f.sha256,expected,path+' manifest');assert.equal(sha(await bytes(f.url)),expected,path+' actual OTA bytes');
}
const player=(await bytes('/village/character40-renderer.mjs?v=c40-1')).toString();assert.ok(player.includes('characters/gmww40/runtime.js'));assert.ok(!player.includes('character-renderer.mjs'));
// Player Web retains the approved shared renderer; GM iPhone uses a separate
// low-power scheduler since V3.253. Compare each against its own immutable bytes.
const playerBytes=await bytes('/characters/gmww40/runtime.js?v=c40-1');
const localPlayerBytes=await readFile('assets/characters/gmww40/runtime.js');
const gmBytes=await readFile('server-game/current/gmww-shared-motion.js');
assert.equal(sha(playerBytes),sha(localPlayerBytes),'Player Web controller SHA must match deployed, approved web renderer');
assert.notEqual(sha(gmBytes),sha(localPlayerBytes),'GM-only low-power controller must remain isolated from Player Web');
assert.equal(ota.runtime.files.find(f=>f.path==='gmww-shared-motion.js')?.sha256,sha(gmBytes),'GM low-power controller OTA SHA');
assert.equal(ota.runtime.files.find(f=>f.path==='characters/gmww40/runtime.js')?.sha256,sha(localPlayerBytes),'Player controller OTA SHA');
console.log('Production Character40 PASS: 40 portraits + 40 motion atlases SHA-256, Player/GM controllers and HTML/JS verified against '+(published.releaseType==='native'?'V'+version+' manual inventory, Native IPA':'Runtime OTA')+'.');
