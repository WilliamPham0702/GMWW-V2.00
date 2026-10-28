import test from 'node:test';
import assert from 'node:assert/strict';
import {activePackAtNight} from '../src/gmww-card-night-passives.js';
test('Wolf pack accepts canonical accented Phe Sói assignment',()=>{
 const assignments=[{roleId:'role_wolf',loginId:'w',faction:'Phe Sói'},
 {roleId:'role_villager',loginId:'v',faction:'Phe Dân'},
 {roleId:'role_lone_wolf',loginId:'l',faction:'Phe Sói'}];
 assert.deepEqual(activePackAtNight({assignments,matchId:'m',night:1}).map(x=>x.loginId),['w']);
 assert.deepEqual(activePackAtNight({assignments,matchId:'m',night:3}).map(x=>x.loginId),['w','l']);
});
