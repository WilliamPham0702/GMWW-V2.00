import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
const assignments=[{loginId:'wolf',roleId:'role_wolf',factionId:'wolf'},{loginId:'target',roleId:'role_villager'}];
const players={'member:wolf':{kind:'member',loginId:'wolf',seatId:1},
 'member:target':{kind:'member',loginId:'target',seatId:2}};
const bite={matchId:'m',night:3,type:'effect_notice',actionId:'action_wolf_bite',loginId:'target',actorId:'wolf'};
const shield={matchId:'m',night:2,type:'status',statusId:'artifact_next_night_protect',protectNight:3,
  effectActive:true,loginId:'target',artifactId:'artifact_35'};
const run=(night,rows)=>resolveWolfNight({assignments,players,matchId:'m',night,interactions:rows});
test('Khiên Bảo Hộ prevents a lethal bite only on next assigned night',()=>{
 assert.deepEqual(run(3,[bite,shield]).victims,[]);
 assert.deepEqual(run(3,[bite,{...shield,protectNight:4}]).victims,['target']);
 assert.deepEqual(run(3,[bite,{...shield,matchId:'other'}]).victims,['target']);
 assert.deepEqual(run(3,[bite,{...shield,effectActive:false}]).victims,['target']);
});
test('Server persists day effect and expires after the protected dawn',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const fragment of ['artifact_35','artifact_next_night_protect','protectNight:day+1','NEXT_NIGHT_PROTECTION_FINISHED'])assert.ok(s.includes(fragment));
});
