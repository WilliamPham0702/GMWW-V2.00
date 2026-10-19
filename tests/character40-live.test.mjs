import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {character40Catalog,character40VisualId,character40Image} from '../src/gmww-character40-catalog.js';
import {normalizeGameCharacterId,activeGameCharacterId} from '../src/gmww-player-identity-rules.js';
const read=p=>fs.readFileSync(p);
test('active catalog replaces all forty IDs including 15; aliases preserve existing account identity',()=>{
 const rows=character40Catalog();assert.equal(rows.length,40);assert.equal(new Set(rows.map(x=>x.id)).size,40);
 assert.equal(rows[14].id,'character-15');assert.ok(rows.every(c=>c.motionVersion==='c40-1'&&c.actions.length===4));
 assert.equal(normalizeGameCharacterId('character-41'),'character-41');assert.equal(activeGameCharacterId('character-42'),'character-42');
 assert.equal(character40VisualId('character-41'),'character-39');assert.equal(character40VisualId('character-42'),'character-40');assert.equal(character40VisualId('character-43'),null);
});
test('all portrait routes serve the accepted art with revalidation and CORS, never old character15',async()=>{
 const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname,{headers:{'content-type':'image/webp'}})}};
 for(let n=1;n<=42;n++){const id='character-'+String(n).padStart(2,'0');const response=await character40Image(env,id,new Request('https://example.test/api/game-characters/'+id+'/image'));
 assert.equal(await response.text(),'/characters/gmww40/originals/'+character40VisualId(id)+'.webp');assert.equal(response.headers.get('access-control-allow-origin'),'*');assert.match(response.headers.get('cache-control'),/must-revalidate/);}
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
