import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bigfootWolfDue,factionRoleTransitionsDue,activePackAtNight}
  from '../src/gmww-card-night-passives.js';
const death=(loginId,night=1,source='gallows')=>({loginId,night,source,type:'dead',matchId:'m',effectActive:true});
test('Chân To becomes wolf on Night 2 only if first day has no executed player',()=>{
 const a=[{loginId:'b',roleId:'role_bigfoot'}];
 assert.deepEqual(bigfootWolfDue({assignments:a,matchId:'m',night:2}),['b']);
 assert.deepEqual(bigfootWolfDue({assignments:a,matchId:'m',night:2,interactions:[death('someone')]}),[]);
 assert.deepEqual(bigfootWolfDue({assignments:a,matchId:'m',night:3}),[]);
});
test('Con Hoang joins Wolves next night only after marked Idol died',()=>{
 const a=[{loginId:'child',roleId:'role_wild_child',faction:'village'}];
 const marked={matchId:'m',night:1,actorId:'child',loginId:'idol',
   actionId:'action-wild-child-idol',type:'effect_notice'};
 assert.deepEqual(factionRoleTransitionsDue({assignments:a,matchId:'m',night:2,
   interactions:[marked,death('idol')]}).map(x=>x.toFaction),['wolf']);
 assert.deepEqual(factionRoleTransitionsDue({assignments:a,matchId:'m',night:1,
   interactions:[marked,death('idol')]}),[]);
});
test('Sói Lai changes to Village at Night 5, Lone Wolf joins after Night 2',()=>{
 const hybrid={loginId:'h',roleId:'role_hybrid_wolf',faction:'wolf'};
 assert.deepEqual(factionRoleTransitionsDue({assignments:[hybrid],matchId:'m',night:5})
   .map(x=>x.reason),['HYBRID_NIGHT_FIVE']);
 const pack=[{loginId:'l',roleId:'role_lone_wolf',faction:'wolf'},
  {loginId:'w',roleId:'role_wolf',faction:'wolf'}];
 assert.deepEqual(activePackAtNight({assignments:pack,matchId:'m',night:2})
   .map(x=>x.loginId),['w']);
 assert.deepEqual(activePackAtNight({assignments:pack,matchId:'m',night:3})
   .map(x=>x.loginId),['l','w']);
});
test('Lycan waits until night following death of all other wolves',()=>{
 const pack=[{loginId:'l',roleId:'role_lycan',faction:'wolf'},
  {loginId:'w',roleId:'role_wolf',faction:'wolf'}];
 assert.deepEqual(activePackAtNight({assignments:pack,matchId:'m',night:1})
  .map(x=>x.loginId),['w']);
 assert.deepEqual(activePackAtNight({assignments:pack,matchId:'m',night:2,
  interactions:[death('w',1,'wolf')]}).map(x=>x.loginId),['l']);
});
test('Worker builds the pack exclusively from night-specific eligible actors',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('activePackAtNight({assignments'));
 assert.ok(s.includes('applyNightFactionTransitions(meta,n,converted.assignments)'));
});
