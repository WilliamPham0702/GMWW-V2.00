import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHARACTER_V600_MANIFEST,CHARACTER_V600_ROSTER,CHARACTER_V600_ACTIONS,CHARACTER_V600_DIRECTIONS,CHARACTER_V600_READY,characterV600ById,characterV600LegacyId,characterV600AssetAudit} from '../src/gmww-character-overhaul-v600.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('Exactly 20 standard + 10 muscular, stable 01..30',()=>{
 assert.equal(CHARACTER_V600_ROSTER.length,30);
 assert.equal(new Set(CHARACTER_V600_ROSTER.map(c=>c.id)).size,30);
 assert.deepEqual(CHARACTER_V600_ROSTER.map(c=>c.id),Array.from({length:30},(_,i)=>'character-'+String(i+1).padStart(2,'0')));
 assert.equal(CHARACTER_V600_ROSTER.filter(c=>c.body==='standard').length,20);
 assert.equal(CHARACTER_V600_ROSTER.filter(c=>c.body==='muscular').length,10);
 assert.ok(CHARACTER_V600_ROSTER.every(c=>c.name&&c.motif&&c.artDirection));
});
test('Approved 4 actions, 8 directions, existing skeleton contract',()=>{
 assert.deepEqual(CHARACTER_V600_ACTIONS,['idle','walk','run','result']);
 assert.equal(CHARACTER_V600_DIRECTIONS.length,8);
 assert.equal(CHARACTER_V600_MANIFEST.sourceRig,'V5.10 16 bones - unchanged');
 assert.equal(characterV600ById('character-30')?.body,'muscular');
});
test('Legacy slot remap does not destroy member data or expose obsolete 31..42 slots',()=>{
 assert.equal(characterV600LegacyId('character-01'),'character-01');
 assert.equal(characterV600LegacyId('character-31'),'character-21');
 assert.equal(characterV600LegacyId('character-42'),'character-22');
 assert.equal(characterV600LegacyId('bogus'),null);
});
test('Release is BLOCKED until 30 unique approved avatar and skin assets actually exist',()=>{
 const exists=p=>fs.existsSync(path.join(root,'assets',p.replace(/^\\/characters\\//,'characters/').replace(/^characters\\//,'characters/')));
 const audit=characterV600AssetAudit(exists);
 assert.equal(CHARACTER_V600_READY,false);
 assert.equal(CHARACTER_V600_MANIFEST.readyForMain,false);
 assert.equal(audit.ready,false);
 assert.ok(audit.missing.length>0,'Existing unapproved 42 avatars must NOT be reused to pass release gate');
 assert.equal(audit.characterCount,30);
 assert.ok(CHARACTER_V600_ROSTER.every(c=>c.skinPath.includes('/overhaul-v600/')&&c.avatarPath.includes('/overhaul-v600/')));
});
