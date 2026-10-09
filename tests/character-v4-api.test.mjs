import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {characterV4Status,characterV4Catalog,CHARACTER_V4_ACTIONS,CHARACTER_V4_DIRECTIONS} from '../src/gmww-character-v4.js';
test('V4 preview API yields exactly 20 new character slots, none falsely approved',()=>{
 const obj=characterV4Status();
 assert.equal(obj.ok,true);
 assert.equal(obj.webOnly,true);
 assert.equal(obj.ipaDeployed,false);
 assert.equal(obj.characters.length,20);
 assert.equal(obj.approvedCount,0);
 assert.equal(obj.previewCount,2);
 assert.ok(obj.characters.every(c=>!c.approved));
 assert.ok(obj.characters.slice(0,2).every(c=>c.status==='preview-artwork'&&c.hasArtwork));
 assert.ok(obj.characters.slice(2).every(c=>c.status==='awaiting-artwork'&&!c.hasArtwork));
 assert.equal(new Set(obj.characters.map(c=>c.id)).size,20);
});
test('V4 preview retains approved direction and action contracts',()=>{
 const obj=characterV4Status();
 assert.deepEqual(obj.actions,CHARACTER_V4_ACTIONS);
 assert.deepEqual(obj.directions,CHARACTER_V4_DIRECTIONS);
 assert.equal(obj.actions.length,9);
 for(const c of characterV4Catalog())assert.deepEqual(Object.keys(c.views),['front','left','right','back']);
});
test('V4 preview has explicit separate API route and never replaces live character endpoint',()=>{
 const src=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 assert.ok(src.includes('if(url.pathname==="/api/game-characters/v4"&&request.method==="GET")'));
 assert.ok(src.includes('return j(characterV4Status())'));
 assert.ok(src.includes('if(url.pathname==="/api/game-characters"&&request.method==="GET")'));
 assert.ok(src.includes('gameCharacterCatalog()'));
});
