import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const markup=fs.readFileSync(new URL('../assets/characters/v4/index.html',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/characters/v4/manifest.json',import.meta.url),'utf8'));
test('Web-only V4 studio truthfully marks all 20 positions as awaiting artwork',()=>{
 assert.match(markup,/20 Character mới/);
 assert.match(markup,/Nàng Biển/);
 assert.match(markup,/Chàng Biển/);
 assert.match(markup,/id="labCharacter"/);
 assert.match(markup,/v4-portrait/);
 assert.match(markup,/Chưa phát hành Character mới vào trận/);
 assert.ok(markup.includes('Array.from({length:20}'));
 assert.ok(markup.includes("fetch('/api/game-characters/v4'"));
 assert.equal(manifest.characters.length,20);
});
test('New Web-only studio is not imported by live game or IPA',()=>{
 const live=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
 const ipa=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
 assert.ok(!live.includes('/characters/v4/index.html'));
 assert.ok(!ipa.includes('/characters/v4/index.html'));
 assert.ok(!markup.includes('/characters/v253/'));
 assert.ok(!markup.includes('/walk-v263/'));
 assert.ok(!markup.includes('/api/rooms'));
 assert.match(markup,/Character 01 và 02/);
});
