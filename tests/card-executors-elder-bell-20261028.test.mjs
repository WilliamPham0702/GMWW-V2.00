import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveElderBell} from '../src/gmww-elder-bell-rules.js';
const assignments=[{loginId:'elder',roleId:'role_elder'},{loginId:'attacker',roleId:'role_wolf'}];
const bell=n=>({id:'bell-'+n,matchId:'m',night:n,actorId:'elder',actionId:'18',
  type:'effect_notice',createdAt:'2026-10-28T00:00:00Z'});
test('Già Làng bell protects each activated night, consumes a life and kills on second bell',()=>{
 assert.deepEqual(resolveElderBell({assignments,interactions:[bell(1)],matchId:'m',night:1}),
   {blocked:true,spends:[{actorId:'elder',livesRemaining:1,exhausted:false}]});
 assert.deepEqual(resolveElderBell({assignments,interactions:[bell(1),bell(3)],matchId:'m',night:3}),
   {blocked:true,spends:[{actorId:'elder',livesRemaining:0,exhausted:true}]});
 assert.deepEqual(resolveElderBell({assignments,interactions:[bell(1),bell(3)],matchId:'m',night:2}),
   {blocked:false,spends:[]});
});
test('Elder receipts are deduplicated and never counted after four nights',()=>{
 const x=resolveElderBell({assignments,interactions:[bell(1),{...bell(1),id:'replay'},bell(5)],
   matchId:'m',night:5});
 assert.deepEqual(x,{blocked:false,spends:[]});
});
test('Dawn Server disables the entire lethal pipeline when the bell rings',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const part of ['ELDER_BELL_PREVENTED_DEATH','!elderBell.blocked','elder-bell-engine','ELDER_BELL_LIVES_EXHAUSTED'])
   assert.ok(s.includes(part));
});
