import test from 'node:test';
import assert from 'node:assert/strict';
import {pruneInteractions, INTERACTION_BYTE_BUDGET, LIVE_EFFECT_TYPES} from '../src/gmww-interaction-retention.js';

const padded=(id,type,active,bytes=2000)=>({id,type,effectActive:active,message:'x'.repeat(bytes)});

test('retention: preserves all rows under byte budget and array identity',()=>{
  const input=[{id:'a'},{id:'b'}];
  assert.equal(pruneInteractions(input),input);
});
test('retention: preserves active marks, frozen and dead through many nights',()=>{
  const rows=[padded('mark','assassin_mark',true),padded('frozen','frozen',true),padded('dead','dead',true)];
  for(let i=0;i<1200;i++)rows.push(padded('history-'+i,'thumb_vote',false));
  const out=pruneInteractions(rows);
  for(const id of ['mark','frozen','dead'])assert.ok(out.some(x=>x.id===id),id);
  assert.equal(out.at(-1).id,'history-1199');
  assert.equal(out.some(x=>x.id==='history-0'),false);
  assert.ok(out.reduce((n,row)=>n+JSON.stringify(row).length,0)<=INTERACTION_BYTE_BUDGET+3000);
});
test('retention: confirmed assassin mark loses protected lifecycle',()=>{
  const rows=[padded('confirmed','assassin_mark',false)];
  for(let i=0;i<1200;i++)rows.push(padded('history-'+i,'thumb_vote',false));
  assert.equal(pruneInteractions(rows).some(x=>x.id==='confirmed'),false);
});
test('retention: protected effects match persisted game contracts',()=>{
  assert.deepEqual([...LIVE_EFFECT_TYPES].sort(),['assassin_mark','dead','expelled','frozen','status']);
});
test('retention: Worker imports pruning module without duplicating implementation',async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync('src/index.js','utf8');
  assert.match(source,/import \{ pruneInteractions \} from "\.\/gmww-interaction-retention\.js";/);
  assert.doesNotMatch(source,/function pruneInteractions\(/);
  assert.match(source,/storage\.put\("interactions",pruneInteractions\(rows\)\)/);
});
