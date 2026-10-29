import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync('src/index.js','utf8');
const normalize=vm.runInNewContext(s.match(/function normalizeWinnerFaction\(v\)\{[^\n]+/)[0]+';normalizeWinnerFaction');
const a=s.indexOf('  computeWinProposal('),b=s.indexOf('  // Immutable,',a);
const Room=vm.runInNewContext('(class {'+s.slice(a,b)+'})',{normalizeWinnerFaction:normalize,normalizeLoginId:x=>String(x).toLowerCase()});
test('Canonical faction IDs used by role conversions retain correct win semantics',()=>{
 for(const [factions,winner] of [
  [['wolf','village','village'],null],
  [['wolves','village'],'Phe Sói'],
  [['third'],'Phe Ba'],
  [['village','village'],'Phe Dân'],
  [['Phe Sói','Phe Dân','Phe Dân'],null]
 ]){
  const assignments=factions.map((faction,i)=>({loginId:'p'+i,roleId:'plain',faction}));
  assert.equal(new Room().computeWinProposal({phase:'running',matchId:'m'},assignments,[])?.winnerFaction||null,winner,JSON.stringify(factions));
 }
});
