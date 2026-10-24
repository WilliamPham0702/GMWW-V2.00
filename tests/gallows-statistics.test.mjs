import test from 'node:test';
import assert from 'node:assert/strict';
import { gallowsTally } from '../shared/gallows-statistics.mjs';

test('counts valid nominations once per voter and sorts descending', () => {
 const players=[{id:'a'},{id:'b'},{id:'c',dead:true}];
 const rows=gallowsTally(players,[{voterId:'a',targetId:'b'},{voterId:'a',targetId:'b'},{voterId:'c',targetId:'b'}]);
 assert.equal(rows.length,2);assert.equal(rows[0].id,'b');assert.equal(rows[0].nominations,1);assert.equal(rows[0].nominationPercent,50);
});
test('respects voter bans and excludes dead targets',()=>{
 const players=[{id:'a'},{id:'b'},{id:'c',dead:true}];
 const rows=gallowsTally(players,[{voterId:'a',targetId:'b'}],[{voterId:'a',targetId:'b',choice:'kill'},{voterId:'b',targetId:'c',choice:'save'}],{nominationBans:['a'],voteBans:['a']});
 assert.equal(rows.find(x=>x.id==='b').nominations,0);assert.equal(rows.find(x=>x.id==='b').kill,0);
});
