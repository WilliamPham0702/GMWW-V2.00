import test from 'node:test';
import assert from 'node:assert/strict';
import {gallowsCast,gallowsNominate,gallowsVoteTotals,gallowsSetRestriction,gallowsManualVote,gallowsBlockedVotes,gallowsRosterStats} from '../src/gmww-gallows-rules.js';
const b={stage:'voting',mode:'auto',candidateId:'candidate',eligible:['living','candidate'],voteEligible:['living','candidate','ghost'],deadlineAt:99999,votes:{}};
test('Underworld Ballot grants only voting: a dead holder cannot nominate or be the candidate',()=>{
 assert.equal(gallowsCast(b,'ghost','👍',1).ok,true);
 assert.equal(gallowsCast(b,'other-dead','👍',1).error,'VOTER_NOT_ELIGIBLE');
 assert.equal(gallowsNominate({...b,stage:'nominating'},'ghost','living',1).ok,false);
 const voted=gallowsCast(b,'ghost','👎',1).value;
 assert.deepEqual(gallowsVoteTotals(voted),{save:0,kill:1,cast:1,eligible:2});
 assert.equal(gallowsCast(voted,'ghost','👎',1).idempotent,true);
 assert.equal(gallowsCast(voted,'ghost','👍',1).error,'VOTE_ALREADY_USED');
});
test('Dead eligible voters still obey GM bans and peaceful-vote restrictions',()=>{
 const banned=gallowsSetRestriction(b,'ghost','vote',true,1);
 assert.equal(banned.ok,true);assert.equal(gallowsCast(banned.value,'ghost','👍',1).error,'VOTER_BANNED');
 assert.equal(gallowsCast({...b,saveOnlyVoters:['ghost']},'ghost','👎',1).error,'PEACE_LOVER_KILL_VOTE_FORBIDDEN');
 assert.equal(gallowsManualVote({...b,mode:'gm'},'ghost','👍',1).ok,true);
});
test('Conflicting mandatory SAVE and KILL powers grant no legal vote to UI or DEMO',()=>{
 const conflict={...b,saveOnlyVoters:['living'],forcedKillVoters:['living']};
 assert.ok(gallowsBlockedVotes(conflict).includes('living'));
 assert.equal(gallowsCast(conflict,'living','👍',1).error,'VOTER_BANNED');
 assert.equal(gallowsCast(conflict,'living','👎',1).error,'VOTER_BANNED');
});
test('Dead voting permission does not change nomination percentages or count forged nominations',()=>{
 const stats=gallowsRosterStats({...b,nominations:{living:'candidate',ghost:'candidate'}});
 assert.equal(stats.find(x=>x.id==='candidate').nominations,1);
 assert.equal(stats.find(x=>x.id==='candidate').nominationPercent,50);
 assert.equal(stats.find(x=>x.id==='ghost').nominationBanned,true);
});
