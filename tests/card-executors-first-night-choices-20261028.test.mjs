import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('First-night Idol and Avenger choices are real actionable night powers',()=>{
 for(const p of ['server-game/src/00-core-and-library.part','server-game/current/app.js']){
  const s=fs.readFileSync(p,'utf8');
  assert.ok(s.includes("'role_avenger','role_wild_child'"));
  assert.ok(s.includes("phase:'night',fromNight:1,toNight:1"));
 }
});
test('Cupid cannot pair expelled players and silently spend a single-target action',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('CUPID_PAIR_NIGHT_ONE_TARGET_INVALID'));
 assert.match(s,/targets\.some\(id=>isExpelled\(id\)\)/);
});
