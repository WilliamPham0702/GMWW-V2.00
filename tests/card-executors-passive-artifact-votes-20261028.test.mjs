import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsCast,gallowsVoteTotals,gallowsAutomaticOutcome} from '../src/gmww-gallows-rules.js';
const ballot={matchId:'m',mode:'auto',stage:'voting',candidateId:'c',deadlineAt:9999999999999,
  eligible:['a','b','c'],doubleVoteVoters:['a'],saveOnlyVoters:['b'],votes:{}};
test('Ấn Thị Trưởng gives a real voter two SAVE or KILL points, never two voters',()=>{
 const one=gallowsCast(ballot,'a','👍',1).value;
 assert.deepEqual(gallowsVoteTotals(one),{save:2,kill:0,cast:1,eligible:2});
 const two=gallowsCast({...ballot,votes:{}},'a','👎',1).value;
 assert.deepEqual(gallowsVoteTotals(two),{save:0,kill:2,cast:1,eligible:2});
 assert.equal(gallowsAutomaticOutcome({...two,votes:{...two.votes,b:'👍'}}),'dead');
});
test('Vòng Hoa Hòa Bình owner can vote SAVE but never KILL',()=>{
 assert.equal(gallowsCast(ballot,'b','👎',1).error,'PEACE_LOVER_KILL_VOTE_FORBIDDEN');
 assert.equal(gallowsCast(ballot,'b','👍',1).ok,true);
});
test('Server obtains voting permissions from current assignment owners',()=>{
 const source=fs.readFileSync('src/index.js','utf8');
 assert.ok(source.includes("x.artifactId==='artifact_21'"));
 assert.ok(source.includes("x.artifactId==='artifact_44'"));
});
