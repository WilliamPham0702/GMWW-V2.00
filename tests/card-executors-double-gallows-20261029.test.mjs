import test from 'node:test';
import assert from 'node:assert/strict';
import {armDoubleGallows,nextDoubleGallows} from '../src/gmww-double-gallows.js';
const ballot={id:'first',matchId:'m',cycleKey:'morning-1',stage:'ready',mode:'auto',nominations:{},votes:{},blockedVotes:['ban'],eligible:['a','b']};
test('Judge or Calamity arms exactly one additional full ballot before first nominations',()=>{
 for(const source of [{roleId:'role_judge',actorId:'a'},{artifactId:'artifact_41',actorId:'a'}]){
  const armed=armDoubleGallows(ballot,source);
  assert.equal(armed.ok,true);assert.equal(armed.value.extraRoundPending,true);
  assert.equal(armDoubleGallows(armed.value,source).error,'DOUBLE_GALLOWS_ALREADY_ARMED');
  assert.equal(armDoubleGallows({...ballot,stage:'nominating'},source).error,'DOUBLE_GALLOWS_TOO_LATE');
  assert.equal(armDoubleGallows({...ballot,round:2},source).error,'DOUBLE_GALLOWS_TOO_LATE');
 }
});
test('Second ballot is independent, retains bans, and cannot start twice or create third round',()=>{
 const first={...armDoubleGallows(ballot,{roleId:'role_judge',actorId:'a'}).value,stage:'resolved',candidateId:'b',outcome:'dead',resolvedAt:15,nominations:{a:'b'},votes:{a:'👎'}};
 const next=nextDoubleGallows(first,'second',20);
 assert.equal(next.stage,'ready');assert.equal(next.round,2);
 assert.equal(next.previousBallotId,'first');assert.equal(next.extraRoundPending,false);
 assert.deepEqual(next.votes,{});assert.deepEqual(next.nominations,{});
 assert.equal(next.candidateId,null);assert.equal(next.outcome,null);
 assert.deepEqual(next.blockedVotes,['ban']);
 assert.equal(nextDoubleGallows(next,'third',30),null);
 assert.equal(nextDoubleGallows({...next,stage:'resolved'},'third',30),null);
 assert.equal(first.outcome,'dead');assert.deepEqual(first.votes,{a:'👎'});
});
