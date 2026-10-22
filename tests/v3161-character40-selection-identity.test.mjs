import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveVillageCharacterId, VILLAGE_CHARACTER_COUNT} from '../assets/village/character40-identity.mjs';
import {character40Catalog, character40VisualId} from '../src/gmww-character40-catalog.js';

const village=fs.readFileSync('assets/village/village.mjs','utf8');
const parent=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const generator=fs.readFileSync('tools/generate-character40-portraits.py','utf8');

test('Village actor preserves every selected Character40 ID; never wraps 21–40 into 01–20',()=>{
 assert.equal(VILLAGE_CHARACTER_COUNT,40);
 const catalog=character40Catalog();
 assert.equal(catalog.length,40);
 for(let n=1;n<=40;n++){
   const id='character-'+String(n).padStart(2,'0');
   assert.equal(resolveVillageCharacterId(id,'member:any'),id,'exact saved actor '+id);
   assert.equal(catalog[n-1].id,id);
   assert.ok(catalog[n-1].imageUrl.includes('/'+id+'/image?rev=c40-4'));
   assert.ok(catalog[n-1].motionAtlas.endsWith('/'+id+'.webp'));
 }
 assert.equal(resolveVillageCharacterId('character-21'),'character-21');
 assert.equal(resolveVillageCharacterId('character-30'),'character-30');
 assert.equal(resolveVillageCharacterId('character-40'),'character-40');
 assert.equal(resolveVillageCharacterId('character-41'),'character-41');
 assert.equal(resolveVillageCharacterId('character-42'),'character-42');
 assert.equal(character40VisualId('character-41'),'character-39');
 assert.equal(character40VisualId('character-42'),'character-40');
 assert.match(resolveVillageCharacterId('character-43','legacy-user'),/^character-(?:0[1-9]|[1-3][0-9]|40)$/);
});

test('Live village canvas uses resolved saved character ID for actor mounting and updates',()=>{
 assert.match(village,/import \{resolveVillageCharacterId\} from "\.\/character40-identity\.mjs"/);
 assert.match(village,/const characterId=resolveVillageCharacterId\(data\.gameCharacterId,data\.id\|\|data\.participantId\|\|data\.displayName\|\|index\)/);
 assert.match(village,/mountCharacterRenderer\(avatar,\{characterId,command,sources/);
 assert.match(village,/appearance=JSON\.stringify\(\[gm,data\?\.gameCharacterId/);
 assert.doesNotMatch(village,/legacyIndex-1\)%20|seedHash%20/);
});

test('Selection is verified by server and sent with the identical member ID to Village iframe',()=>{
 assert.match(parent,/if\(String\(vm\.displayName\|\|'\'\)\.trim\(\)!==displayName\|\|String\(vm\.gameCharacterId\|\|'\'\)!==gameCharacterId\)/);
 assert.match(parent,/state\.member=vm;state\.profileDraftGameCharacterId=vm\.gameCharacterId/);
 assert.match(parent,/isSelf\?String\(state\.member\?\.gameCharacterId\|\|p\?\.gameCharacterId/);
 assert.match(parent,/const publicPlayers=villagePublicPlayers\(state\.roomCode\?state\.players:state\.lobbyPlayers\)/);
});

test('Avatar thumbnail centers actual sprite pixels and uses a fresh independent portrait revision',()=>{
 assert.match(generator,/visible_bbox = exact_frame\.getchannel\("A"\)\.getbbox\(\)/);
 assert.match(generator,/actor = exact_frame\.crop\(visible_bbox\)/);
 assert.match(generator,/Image\.new\("RGBA", \(256, 256\)/);
 assert.match(generator,/abs\(bounds\[0\] \+ bounds\[2\] - 256\)/);
 assert.match(parent,/\/image\?rev=c40-4/);
 assert.match(parent,/object-position:center;background:linear-gradient/);
});
