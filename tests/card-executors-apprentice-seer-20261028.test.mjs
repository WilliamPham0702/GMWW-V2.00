import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {apprenticeSeersDue} from '../src/gmww-card-night-passives.js';
const roles=[{loginId:'a',roleId:'role_apprentice_seer'},{loginId:'s',roleId:'role_seer'}];
const dead={type:'dead',matchId:'m',loginId:'s',night:1,effectActive:true};
test('Tiên Tri Tập Sự inherits in Night 1 when no Seer was originally cast',()=>{
 assert.deepEqual(apprenticeSeersDue({assignments:roles.slice(0,1),matchId:'m',
  night:1,initialSeerCount:0}),['a']);
});
test('Tiên Tri Tập Sự waits until following Night after final Seer death',()=>{
 assert.deepEqual(apprenticeSeersDue({assignments:roles,interactions:[dead],
  matchId:'m',night:1,initialSeerCount:1}),[]);
 assert.deepEqual(apprenticeSeersDue({assignments:roles,interactions:[dead],
  matchId:'m',night:2,initialSeerCount:1}),['a']);
 assert.deepEqual(apprenticeSeersDue({assignments:roles,matchId:'m',
  night:2,initialSeerCount:1}),[]);
});
test('Server transfers complete canonical Seer ability and private delivery',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const text of ['ruleInitialSeerCount:','apprenticeSeersDue','roleCatalog:"+plan.toRoleId','deliverySnapshot:'])
  assert.ok(s.includes(text));
});
