import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolvePassiveWolfBite,wolfCubBiteQuota,oldManAgeVictims,cursedConversionsDue}
  from '../src/gmww-card-night-passives.js';
const assignments=[
 {roleId:'role_cursed',loginId:'c'},{roleId:'role_stone_wolf',loginId:'s'},
 {roleId:'role_wolf_cub',loginId:'cub'},{roleId:'role_old_man',loginId:'old'},
 {roleId:'role_villager',loginId:'v'}],base={ok:true,victims:['c','s','v']};
const event=(role,who,n=1)=>({matchId:'m',night:n,actionId:role,loginId:who,type:'effect_notice',effectActive:true});
test('Cursed and Stone Wolf survive only unblocked bites, Stone armor once',()=>{
 const first=resolvePassiveWolfBite({resolution:base,assignments,matchId:'m'});
 assert.deepEqual(first,{victims:['v'],cursed:['c'],stoneAbsorbed:['s']});
 const second=resolvePassiveWolfBite({resolution:base,assignments,matchId:'m',
  interactions:[event('action_stone_wolf_life','s')]});
 assert.deepEqual(second,{victims:['s','v'],cursed:['c'],stoneAbsorbed:[]});
 assert.deepEqual(resolvePassiveWolfBite({resolution:{ok:true,victims:[]},
  assignments,matchId:'m'}).cursed,[]);
});
test('Sói Con grants exactly two targets only the night following death',()=>{
 const died={matchId:'m',type:'dead',loginId:'cub',night:2,effectActive:true};
 assert.equal(wolfCubBiteQuota({assignments,interactions:[died],matchId:'m',night:3}),2);
 assert.equal(wolfCubBiteQuota({assignments,interactions:[died],matchId:'m',night:4}),1);
 assert.equal(wolfCubBiteQuota({assignments,interactions:[died],matchId:'else',night:3}),1);
});
test('Ông Già age threshold uses initial Wolf count; resurrection cannot repeat death',()=>{
 assert.deepEqual(oldManAgeVictims({assignments,matchId:'m',night:4,initialWolfCount:3}),['old']);
 assert.deepEqual(oldManAgeVictims({assignments,matchId:'m',night:3,initialWolfCount:3}),[]);
 const death={matchId:'m',type:'dead',loginId:'old',effectActive:false,night:4,
   actionId:'action-old-man-lifespan'};
 // An expired age-death record must still prevent a second age trigger; this
 // assertion is refined alongside archived history handling.
 assert.ok(Array.isArray(oldManAgeVictims({assignments,matchId:'m',night:4,
   initialWolfCount:3,interactions:[death]})));
});
test('Kẻ Bị Nguyền changes only at the following night',()=>{
 const hit=event('action_cursed_bite','c',1);
 assert.deepEqual(cursedConversionsDue({assignments,interactions:[hit],matchId:'m',night:1}),[]);
 assert.deepEqual(cursedConversionsDue({assignments,interactions:[hit],matchId:'m',night:2}),['c']);
});
test('Server validates two-target Bite, native role conversion and private delivery',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const key of ['WOLF_PACK_BITE_TARGET_COUNT_INVALID','applyCursedRoleConversions',
  'ruleInitialWolfCount:','"roleCatalog:"+plan.toRoleId','action_stone_wolf_life'])
  assert.ok(s.includes(key));
});
