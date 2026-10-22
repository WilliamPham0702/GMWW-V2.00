import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveWolfNight,resolveNightReveal,isNightImmuneTarget} from '../src/gmww-wolf-night-resolution.js';

const players=Object.fromEntries(['seer','wolf','aura','immune'].map((loginId,i)=>
  ['member:'+loginId,{loginId,seatId:i+1}]));
const cards=[
  {loginId:'seer',roleId:'role_seer',faction:'village',roleCard:{flags:{nightImmune:false},functions:[{actionId:'action_seer',description:'Soi phe Sói'}]}},
  {loginId:'wolf',roleId:'role_alpha_wolf',faction:'wolf',roleCard:{functions:[{actionId:'action_wolf_bite'}]}},
  {loginId:'aura',roleId:'role_aura_seer',faction:'village',roleCard:{functions:[{actionId:'action_aura_read'}]}},
  {loginId:'immune',roleId:'role_destroyer',faction:'third',roleCard:{flags:{nightImmune:true},functions:[{actionId:'action_destroyer_scry',description:'Đọc Vai Trò'}]}}
];
const bite=loginId=>({loginId,matchId:'match',night:1,type:'effect_notice',actionId:'action_wolf_bite'});
const resolve=(interactions,assignments=cards)=>resolveWolfNight({interactions,players,assignments,matchId:'match',night:1});

test('V3.181: night immune role is not killed by a direct or transferred Wolf bite',()=>{
  assert.equal(isNightImmuneTarget(cards,'immune'),true);
  assert.deepEqual(resolve([bite('immune')]).victims,[]);
  assert.deepEqual(resolve([bite('immune')]).blocked,['immune']);
  // Transfer from aura to the next clockwise seat reaches immune.
  const shift={loginId:'seer',matchId:'match',night:1,type:'effect_notice',actionId:'action_transfer_bite',direction:'left'};
  assert.deepEqual(resolve([bite('aura'),shift]).victims,[]);
  assert.deepEqual(resolve([bite('aura'),shift]).blocked,['immune']);
  assert.deepEqual(resolve([bite('seer')]).victims,['seer']);
});
test('V3.181: explicit false on private card overrides legacy built-in immunity fallback',()=>{
  assert.equal(isNightImmuneTarget([{loginId:'immune',roleId:'role_destroyer',roleCard:{flags:{nightImmune:false}}}],'immune'),false);
  assert.equal(isNightImmuneTarget([{loginId:'immune',roleId:'role_destroyer'}],'immune'),true);
  assert.equal(isNightImmuneTarget([{loginId:'other',roleId:'role_villager'}],'other'),false);
});
test('V3.181: Seer result and Spiritualist comparison are computed from selected targets',()=>{
  assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['wolf'],assignments:cards}).message,'KHÔNG PHẢI SÓI');
  assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['seer','aura'],assignments:cards}).message,'CÙNG PHE');
  assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['wolf','seer'],assignments:cards}).message,'KHÁC PHE');
  assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['seer'],assignments:cards}),null);
});
test('V3.181: Aura Seer reads target functions and does not leak target role identity',()=>{
  const result=resolveNightReveal({actionId:'action_aura_read',targetIds:['immune'],assignments:cards});
  assert.equal(result.message,'Đọc Vai Trò');
  assert.deepEqual(result.targets,[{loginId:'immune',functions:['Đọc Vai Trò']}]);
  assert.equal(JSON.stringify(result).includes('role_destroyer'),false);
});
test('V3.181: Durable Object reads private cards only for server-side resolution',()=>{
  const source=fs.readFileSync('src/index.js','utf8');
  assert.match(source,/async privateAssignmentsForNight\(assignments\)/);
  assert.match(source,/assignments:await this.privateAssignmentsForNight/);
  assert.match(source,/const divination=DIVINATION_ACTION_IDS\.includes/);
  assert.match(source,/targetIds:revealIds\.filter\(id=>!!players\["member:"\+id\]/);
  assert.match(source,/isNightImmuneTarget\(await this\.privateAssignmentsForNight\(\[row\]\),loginId\)/);
});
test('V3.181: audio catalogue maps Witch and three chained morning phrases',()=>{
  const app=fs.readFileSync('server-game/current/app.js','utf8');
  assert.match(app,/targetId:'role_old_witch',sourceKey:'ROLE:source-18'/);
  for(const id of ['audio_system_morning_deaths_intro','audio_system_morning_dead_noun','audio_system_morning_number_'])
    assert.ok(app.includes(id));
  assert.match(app,/queue\.push\(\['audio_system_morning_number_'\+dead,String\(dead\)\]\)/);
  assert.match(app,/battleSpeechFinish/);
  assert.match(app,/gmwwBundledLegacyAudio\[a\.sourceKey\]/);
  assert.match(app,/const spoken=String\(revelation\.message\|\|''\)/);
});
