import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/index.js','utf8');
const begin=source.indexOf('  computeWinProposal(meta,assignments,interactions){');
const end=source.indexOf('\n  // Immutable, unbounded action history',begin);
const evaluator=vm.runInNewContext('({'+source.slice(begin,end)+'})',{
 normalizeLoginId:x=>String(x||'').replace(/^member:/,''),
 normalizeWinnerFaction:x=>x==='wolf'?'Phe Sói':x==='third'?'Phe Ba':'Phe Dân'
}).computeWinProposal;
const meta={phase:'running',matchId:'m'};
const role=(loginId,roleId,faction)=>({loginId,roleId,faction});
const death=(loginId)=>({loginId,type:'dead',effectActive:true,matchId:'m'});
test('Sát Thủ wins immediately when all Wolves and Destroyers die, even if Villagers remain',()=>{
 const assignments=[role('a','role_assassin','third'),role('w','role_wolf','wolf'),
  role('d','role_destroyer','third'),role('v','role_villager','village')];
 const result=evaluator(meta,assignments,[death('w'),death('d')]);
 assert.equal(result.winnerLabel,'Sát Thủ');assert.equal(result.winnerFaction,'Phe Ba');
 assert.notEqual(evaluator(meta,assignments,[death('w')])?.winnerLabel,'Sát Thủ');
});
test('Kẻ Hủy Diệt wins only when required targets that exist are all dead',()=>{
 const assignments=[role('d','role_destroyer','third'),role('s','role_seer','village'),
   role('w','role_wolf','wolf')];
 assert.notEqual(evaluator(meta,assignments,[])?.winnerLabel,'Kẻ Hủy Diệt');
 assert.equal(evaluator(meta,assignments,[death('s')]).winnerLabel,'Kẻ Hủy Diệt');
});
