import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ACTIONS,SOURCE15,createMotion,setAction,advance,sampleFrame} from '../prototype/character40/shared-motion.mjs';
import worker from '../src/character40-preview-worker.mjs';
const root=new URL('../prototype/character40/',import.meta.url),catalog=JSON.parse(readFileSync(new URL('catalog.json',root))),characters=catalog.characters;
test('40 consecutive IDs and unique approved sources',()=>{
  assert.equal(characters.length,40);assert.equal(new Set(characters.map(c=>c.sourceSHA256)).size,40);
  characters.forEach((c,i)=>assert.equal(c.id,`character-${String(i+1).padStart(2,'0')}`));
});
test('every original and 48-frame atlas is packaged and hash verified',()=>{
  const hashes=new Set();for(const c of characters){
    for(const [path,key] of [[c.original,'originalSHA256'],[c.atlas,'atlasSHA256']])assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),c[key]);
    hashes.add(c.atlasSHA256);assert.equal(c.frames.length,48);
    for(const [x,y,w,h] of c.frames){assert.ok(w>0&&h>0&&x>=0&&y>=0&&x+w<=c.width&&y+h<=c.height);}
  }assert.equal(hashes.size,40);
});
test('shared actions reuse source15 timing and tie walk/run phase to distance',()=>{
  assert.deepEqual(ACTIONS,['idle','walk','run','turn']);assert.equal(SOURCE15.id,'character-15');
  for(const [action,cycle,stride] of [['walk',610,68],['run',360,100]]){
    const s=createMotion(characters[0]);setAction(s,action);advance(s,cycle/2);assert.equal(s.distance,stride/2);assert.equal(s.x,stride/2);assert.equal(sampleFrame(s),(action==='walk'?16:32)+4);
    advance(s,cycle/2);assert.equal(sampleFrame(s),action==='walk'?16:32);
  }
});
test('left movement uses dedicated frames and negative travel',()=>{const s=createMotion(characters[0],{facing:'left'});setAction(s,'walk');advance(s,100);assert.ok(s.x<0);assert.ok(sampleFrame(s)>=24&&sampleFrame(s)<32);});
test('turn visits eight actual views and completes in 540ms',()=>{const s=createMotion(characters[0]);setAction(s,'turn');const frames=new Set([sampleFrame(s)]);for(let i=0;i<7;i++)frames.add(advance(s,67.5));assert.equal(frames.size,8);advance(s,67.5);assert.equal(s.action,'idle');assert.equal(s.facing,'left');});
test('reject missing motion data, unknown action and invalid time',()=>{assert.throws(()=>createMotion({}));const s=createMotion(characters[0]);assert.throws(()=>setAction(s,'jump'));assert.throws(()=>advance(s,-1));});
test('335 legacy resources including original character15 remain byte identical',()=>{
  const audit=JSON.parse(readFileSync(new URL('../docs/character-migration/2026-10-19-backup-and-compatibility-audit.json',import.meta.url)));
  assert.equal(audit.preservedAssets.length,335);
  for(const file of audit.preservedAssets){const b=readFileSync(new URL('../'+file.path,import.meta.url));assert.equal(createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),file.gitBlobSha,file.path);}
});
test('preview worker is read-only with no live data bindings',async()=>{
  assert.equal((await worker.fetch(new Request('https://example.test/',{method:'POST'}),{})).status,405);
  assert.equal((await worker.fetch(new Request('https://example.test/api/room'),{})).status,404);
  const health=await (await worker.fetch(new Request('https://example.test/api/health'),{})).json();assert.equal(health.liveGameModified,false);
  const config=JSON.parse(readFileSync(new URL('../wrangler.character40-preview.jsonc',import.meta.url)));assert.equal(config.name,'gmww-character40-motion-preview');for(const k of ['durable_objects','kv_namespaces','r2_buckets','d1_databases'])assert.equal(config[k],undefined);
});
