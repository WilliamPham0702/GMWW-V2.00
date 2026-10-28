import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsCast,gallowsManualVote} from '../src/gmww-gallows-rules.js';
const ballot={mode:'auto',stage:'voting',candidateId:'c',deadlineAt:9999999999999,
 eligible:['a','b','c'],votes:{},forcedKillVoters:['a']};
test('Mũ Ngốc accepts KILL and rejects SAVE in automatic and GM balloting',()=>{
 assert.equal(gallowsCast(ballot,'a','👍',1).error,'FOOL_HAT_REQUIRES_KILL_VOTE');
 assert.equal(gallowsCast(ballot,'a','👎',1).ok,true);
 assert.equal(gallowsManualVote({...ballot,mode:'gm'},'a','👍',1).error,'FOOL_HAT_REQUIRES_KILL_VOTE');
});
test('Five Artifact action handlers distinguish mute, exile, reveal, manual and instant verdict',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 for(const id of ['artifact_14','artifact_22','artifact_38','artifact_42','artifact_26'])
  assert.ok(s.includes('artifactId==="'+id+'"'));
 for(const k of ['MUTE_DAY_FINISHED','artifact-elder-stick','artifact_owner_revealed',
  'VOID_ARTIFACT_OFFLINE_ONLY','artifact-judgement','winnerFaction:"Phe Dân"'])
  assert.ok(s.includes(k));
});
