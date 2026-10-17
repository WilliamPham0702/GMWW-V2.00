import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {expireCycleEffects} from '../src/gmww-cycle-effect-expiry.js';

const definitions={
  disabled_2n:{duration:'nights',nights:2,blocks:true},
  disabled_permanent:{duration:'permanent',blocks:true},
  marked:{duration:'morning',blocks:false}
};
const row=(type,options={})=>({id:'e',type,night:1,matchId:'m',cycleKey:'night-1',effectActive:true,...options});
const expire=(rows,phase,night,key=phase+'-'+night)=>expireCycleEffects(rows,{
  phase,night,cycleKey:key,matchId:'m',statusDefs:definitions,now:'2026-10-17T00:00:00.000Z'
});
test('freeze ends at morning of same night, death never auto-expires',()=>{
  const rows=[row('frozen',{id:'freeze'}),row('dead',{id:'death'})];
  const expired=expire(rows,'morning',1);
  assert.deepEqual(expired.map(x=>[x.id,x.reason]),[['freeze','MORNING_START']]);
  assert.equal(rows[0].effectActive,false);
  assert.equal(rows[1].effectActive,true);
});
test('freeze heals at next night if morning transition was missed',()=>{
  const rows=[row('frozen')];
  assert.equal(expire(rows,'night',2)[0].reason,'NEXT_NIGHT_SELF_HEAL');
  assert.equal(rows[0].effectActive,false);
});
test('expelled persists until following night',()=>{
  const rows=[row('expelled')];
  assert.deepEqual(expire(rows,'morning',1),[]);
  assert.equal(rows[0].effectActive,true);
  assert.equal(expire(rows,'night',2)[0].reason,'NEXT_NIGHT_START');
});
test('two-night effect remains in second night, expires at third; permanent remains',()=>{
  const rows=[row('status',{id:'temporary',statusId:'disabled_2n'}),row('status',{id:'permanent',statusId:'disabled_permanent'})];
  assert.deepEqual(expire(rows,'night',2),[]);
  assert.deepEqual(expire(rows,'night',3).map(x=>x.id),['temporary']);
  assert.equal(rows[1].effectActive,true);
});
test('morning status expires on the next cycle; other matches do not expire',()=>{
  const rows=[row('status',{statusId:'marked',id:'mark'}),row('frozen',{id:'other',matchId:'other-match'})];
  assert.deepEqual(expire(rows,'morning',1,'night-1'),[]);
  assert.deepEqual(expire(rows,'morning',1).map(x=>x.id),['mark']);
  assert.equal(rows[1].effectActive,true);
});
test('ended states are never expired twice',()=>{
  const rows=[row('frozen',{effectActive:false}),row('status',{statusId:'disabled_2n',effectActive:false})];
  assert.deepEqual(expire(rows,'morning',1),[]);
  assert.deepEqual(expire(rows,'night',3),[]);
});
test('Durable Object uses the shared lifecycle policy before writing interactions',()=>{
  const source=fs.readFileSync('src/index.js','utf8');
  assert.match(source,/import \{ expireCycleEffects \} from "\.\/gmww-cycle-effect-expiry\.js";/);
  assert.match(source,/expireCycleEffects\(rows,\{phase:p,night:n,cycleKey:key,matchId:meta\.matchId,statusDefs:STATUS_DEFS,now\}\)/);
});
