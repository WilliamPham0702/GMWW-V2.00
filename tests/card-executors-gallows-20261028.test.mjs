import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsCast,gallowsManualVote,gallowsVoteTotals,gallowsAutomaticOutcome} from '../src/gmww-gallows-rules.js';
const ballot={matchId:'m',day:1,mode:'auto',stage:'voting',candidateId:'c',
  deadlineAt:9999999999999,eligible:['a','b','c'],votes:{},
  saveOnlyVoters:['a'],crowMarks:['c']};
test('Người Yêu Hòa Bình can SAVE but never KILL on Player Web',()=>{
  assert.equal(gallowsCast(ballot,'a','👎',1).error,'PEACE_LOVER_KILL_VOTE_FORBIDDEN');
  assert.equal(gallowsCast(ballot,'a','👍',1).ok,true);
  assert.equal(gallowsCast(ballot,'b','👎',1).ok,true);
});
test('GM manual voting enforces same peace-lover rule',()=>{
  const manual={...ballot,mode:'gm'};
  assert.equal(gallowsManualVote(manual,'a','👎',1).error,'PEACE_LOVER_KILL_VOTE_FORBIDDEN');
  assert.equal(gallowsManualVote(manual,'a','👍',1).ok,true);
});
test('Con Quạ adds exactly two adverse votes to the matching gallows candidate',()=>{
  assert.deepEqual(gallowsVoteTotals(ballot),{save:0,kill:2,cast:0,eligible:2});
  assert.equal(gallowsAutomaticOutcome(ballot),'dead');
  assert.equal(gallowsVoteTotals({...ballot,candidateId:'b'}).kill,0);
  assert.equal(gallowsVoteTotals({...ballot,crowMarks:['c','c']}).kill,4);
});
test('Server derives Peace Lover and Crow from authoritative match receipts',()=>{
  const server=fs.readFileSync('src/index.js','utf8');
  assert.match(server,/roleId==='role_peace_lover'/);
  assert.match(server,/x.actionId==='action-g7-crow-votes'/);
  assert.match(server,/roleId==="role_crow"&&actionId==="action-g7-crow-votes"/);
});
