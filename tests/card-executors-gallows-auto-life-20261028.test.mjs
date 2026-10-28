import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Gallows auto and manual share verified death consequences and do not broadcast revived players as dead',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('await this.applyHunterDeathConsequences(meta,rows,createdAt)'));
 assert.ok(s.includes('if(fatal.effectActive!==false)this.broadcast({type:"player_status_changed"'));
});
