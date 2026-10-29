import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {character40Catalog,character40VisualId,character40Image,character40StateFromPlayer} from '../src/gmww-character40-catalog.js';
import {normalizeGameCharacterId,activeGameCharacterId} from '../src/gmww-player-identity-rules.js';
import {normalizeRendererCommand} from '../assets/village/character40-renderer.mjs';
const read=p=>fs.readFileSync(p);
function hasWebpAlpha(bytes){
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 for(let offset=12;offset+8<=bytes.length;){
  const type=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),start=offset+8;
  if(type==='VP8X'&&(bytes[start]&0x10))return true;
  if(type==='VP8L'&&(bytes.readUInt32LE(start+1)&0x10000000))return true;
  offset=start+size+(size&1);
 }
 return false;
}
test('all forty shipped portraits contain real alpha transparency, including characters 11–40',()=>{
 for(let n=1;n<=40;n++){
  const id='character-'+String(n).padStart(2,'0');
  assert.ok(hasWebpAlpha(read('assets/characters/gmww40/originals/'+id+'.webp')),id+' must not ship an opaque white rectangle');
 }
});
test('active catalog replaces all forty IDs including 15; aliases preserve existing account identity',()=>{
 const rows=character40Catalog();assert.equal(rows.length,40);assert.equal(new Set(rows.map(x=>x.id)).size,40);
 assert.equal(rows[14].id,'character-15');assert.ok(rows.every(c=>c.motionVersion==='c40-1'&&c.actions.length===4));
 assert.ok(rows.every(c=>c.imageUrl.endsWith('/image?rev=c40-4')),'portrait cache revision must advance independently of the unchanged motion version');
 assert.equal(normalizeGameCharacterId('character-41'),'character-41');assert.equal(activeGameCharacterId('character-42'),'character-42');
 assert.equal(character40VisualId('character-41'),'character-39');assert.equal(character40VisualId('character-42'),'character-40');assert.equal(character40VisualId('character-43'),null);
});
test('public live animation projects readiness and sitting onto Idle, exposing only four actions',()=>{
 for(const p of [{ready:true},{villageActivity:'sitting',sitUntil:Date.now()+10000},{villageActivity:'cheer'},{villageActivity:'stretch'}]){const c=character40StateFromPlayer({gameCharacterId:'character-15',...p});assert.equal(c.motion,'idle');assert.equal(c.state,'idle');}
 const source=read('src/index.js').toString();assert.ok(source.includes('motions:["idle","walk","run","turn"]'));
});
test('stationary death and revival change both production Player command keys without recreating the actor',()=>{
 const scene=read('assets/village/village.mjs').toString();
 const alive=normalizeRendererCommand({characterId:'character-15',state:'idle'}),dead=normalizeRendererCommand({characterId:'character-15',state:'dead'});
 assert.equal(alive.motion,'idle');assert.equal(dead.motion,'idle');assert.equal(dead.paused,true);
 for(const [label,name] of [['commandKey','command'],['signature','semantic']]){const expression=scene.match(new RegExp('const '+label+'=([^;]+);'))?.[1];assert.ok(expression);const key=new Function(name,'return '+expression);assert.notEqual(key(alive),key(dead));assert.equal(key(alive),key(normalizeRendererCommand({characterId:'character-15',state:'idle'})));}
});
test('all portrait routes serve the accepted art with revalidation and CORS, never old character15',async()=>{
 const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname,{headers:{'content-type':'image/webp'}})}};
 for(let n=1;n<=42;n++){const id='character-'+String(n).padStart(2,'0');const response=await character40Image(env,id,new Request('https://example.test/api/game-characters/'+id+'/image'));
 assert.equal(await response.text(),'/characters/gmww40/originals/'+character40VisualId(id)+'.webp');assert.equal(response.headers.get('access-control-allow-origin'),'*');assert.match(response.headers.get('cache-control'),/must-revalidate/);}
});
test('every Player Web character image route resolves to a packaged Production asset',async()=>{
 const env={ASSETS:{fetch:async request=>{const path=new URL(request.url).pathname;return fs.existsSync('assets'+path)?new Response(read('assets'+path),{status:200,headers:{'content-type':'image/webp'}}):new Response('missing',{status:404})}}};
 for(const row of character40Catalog()){
  const response=await character40Image(env,row.id,new Request('https://example.test'+row.imageUrl));
  assert.equal(response.status,200,row.id+' must not render Safari broken-image question mark');
 }
});
test('accepted atlas/original bytes packaged for GM and Web are hash identical to reviewed preview',()=>{
 const catalog=JSON.parse(read('prototype/character40/catalog.json'));
 for(const c of catalog.characters){for(const [file,key] of [[c.original,'originalSHA256'],[c.atlas,'atlasSHA256']])assert.equal(createHash('sha256').update(read('assets/characters/gmww40/'+file)).digest('hex'),c[key]);}
 assert.deepEqual(read('server-game/current/gmww-shared-motion.js'),read('assets/characters/gmww40/runtime.js'));
 for(const c of catalog.characters){const scale=Math.min(250/Math.max(...c.frames.map(f=>f[2])),310/Math.max(...c.frames.map(f=>f[3])));for(const [, ,w,h] of c.frames){assert.ok(w*scale<=250.000001);assert.ok(h*scale<=310.000001);}}
});
test('old source rig, artwork and animations remain restorable byte for byte',()=>{
 const inventory=JSON.parse(read('docs/character-migration/2026-10-19-backup-and-compatibility-audit.json'));
 for(const row of inventory.preservedAssets){const b=read(row.path);assert.equal(createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),row.gitBlobSha,row.path);}
});
test('GM and Web both mount and update the accepted renderer; OTA includes offline motion assets',()=>{
 const gm=read('server-game/current/app.js').toString(),web=read('assets/village/village.mjs').toString(),pack=read('.github/scripts/prepare-update-channel.mjs').toString();
 assert.ok(gm.includes('window.GMWW_SHARED_MOTION'));assert.ok(gm.includes("api.mount(host,{characterId:id"));assert.ok(gm.includes('GMWW_SHARED_MOTION?.update'));
 assert.ok(web.includes('character40-renderer.mjs?v=c40-1'));assert.ok(web.includes('updateCharacterRenderer(avatar,semantic)'));
 assert.ok(pack.includes("copyDir('assets/characters/gmww40','characters/gmww40')"));assert.ok(pack.includes("copy('server-game/current/gmww-shared-motion.js','gmww-shared-motion.js')"));
 assert.ok(read('server-game/current/GMWW.html').toString().includes('gmww-shared-motion.js?v=c40-1'));
});
