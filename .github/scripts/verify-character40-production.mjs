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
const ota=await json('/api/update/manifest?current=3.153&character40-verify='+Date.now());
const worker=await readFile('src/index.js','utf8');
const shell=worker.match(/NATIVE_SHELL_VERSION="([0-9.]+)"/)?.[1];
assert.ok(shell,'Worker shell version must be declared');
assert.equal(ota.releaseVersion,version);
assert.equal(ota.runtimeVersion,version);
assert.equal(ota.shellVersion,shell);
const isNative=ota.releaseType==='native';
assert.ok(isNative||ota.releaseType==='runtime','Unexpected production release type');
if(isNative){
  assert.equal(shell,version,'Native release shell must match the release');
  assert.equal(ota.ipa?.version,version,'Native release must advertise its new IPA');
  assert.equal(ota.ipa?.fileName,'GMWW-V'+version+'.ipa');
  assert.equal(ota.runtime?.files?.length,0,'Native release must not falsely advertise runtime OTA');
} else {
  assert.ok(ota.runtime?.files?.length>0,'Runtime release must include OTA files');
}
// Native releases deliberately advertise an empty OTA list. Inspect the separately
// SHA-256 verified manual Runtime inventory produced from the SAME deployed bytes.
const inventory=isNative
  ? JSON.parse(await readFile('assets/updates/runtime/V'+version+'/manual-manifest.json','utf8'))
  : ota;
assert.equal(inventory.releaseVersion,version);
assert.equal(inventory.runtimeVersion,version);
assert.equal(inventory.shellVersion,shell);
assert.ok(inventory.runtime?.files?.length>0,'Verified runtime inventory missing');
const accepted=JSON.parse(await readFile('prototype/character40/catalog.json','utf8')).characters;
let index=0;
await Promise.all(Array.from({length:4},async()=>{
 while(index<40){
  const n=index++,c=accepted[n],live=catalog.characters[n];assert.equal(live.id,c.id);assert.deepEqual(live.actions,actions);
  // Player profile portraits intentionally use the SAME accepted atlas Idle
  // frame as the village. Their lossless thumbnails are generated at deploy
  // time, after OTA packaging; they are server-only and not part of IPA OTA.
  const portraitPath='assets/characters/gmww40/portraits/'+c.id+'.webp';
  const generatedPortraitSha=sha(await readFile(portraitPath));
  assert.equal(sha(await bytes(live.imageUrl)),generatedPortraitSha,c.id+' live portrait must match actual atlas frame');
  assert.equal(sha(await bytes(live.motionAtlas)),c.atlasSHA256,c.id+' live motion atlas');
  // Preserve rigorous SHA guards for both unchanged original artwork and
  // all animation atlases in the separately signed native Runtime inventory.
  for(const [path,expected] of [
    ['characters/gmww40/'+c.original,c.originalSHA256],
    ['characters/gmww40/'+c.atlas,c.atlasSHA256]
  ]) assert.equal(inventory.runtime.files.find(f=>f.path===path)?.sha256,expected,c.id+' OTA artwork');

 }
}));
for(const path of ['gmww-shared-motion.js','GMWW.html','app.js']){
 const f=inventory.runtime.files.find(f=>f.path===path);assert.ok(f,path+' OTA entry');
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
assert.equal(inventory.runtime.files.find(f=>f.path==='gmww-shared-motion.js')?.sha256,sha(gmBytes),'GM low-power controller OTA SHA');
assert.equal(inventory.runtime.files.find(f=>f.path==='characters/gmww40/runtime.js')?.sha256,sha(localPlayerBytes),'Player controller OTA SHA');
console.log('Production Character40 PASS: 40 portraits + 40 motion atlases SHA-256; four actions only; GM low-power and Player Web controllers verified independently; '+(isNative?'native manual inventory':'OTA inventory')+' HTML/JS/controller SHA verified; shell '+shell+'.');
