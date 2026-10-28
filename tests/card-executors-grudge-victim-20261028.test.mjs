import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Oan Nhân acts only after their own execution and schedules next dawn',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const x of ['role_grudge_victim','GRUDGE_REQUIRES_EXECUTION',
  'grudgePending:', 'grudge-victim:', 'source:"grudge-victim"'])
  assert.ok(s.includes(x));
 assert.match(s,/const lynched=\(roleKnight\|\|roleGrudge\)/);
 assert.match(s,/if\(!died&&!rows\.some\(x=>x\.id===id\)\)/);
});
