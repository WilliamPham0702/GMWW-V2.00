import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 gallowsManualResolve,gallowsSetMode,gallowsSetRestriction,gallowsBlockedVotes,
 gallowsVoteTotals,gallowsNominationTotals,gallowsSnapshot,gallowsCast
} from '../src/gmww-gallows-rules.js';

const ids=['p1','p2','p3','p4','p5','p6'];
const seed=(mode='gm')=>({
 id:'g-test',matchId:'m1',cycleKey:'day1',day:1,stage:'ready',mode,
 eligible:ids,blockedNomination:[],blockedVotes:[],artifactVoteBans:[],
 nominations:{},votes:{},candidateId:null,outcome:null,
 nominationDurationSec:30,voteDurationSec:45
});

test('GM manual selects living candidate and resolves immediately without clock or web ballots',()=>{
 const at=Date.now();
 const result=gallowsManualResolve(seed(),'p3','dead',at);
 assert.equal(result.ok,true);
 const value=result.value;
 assert.equal(value.stage,'resolved');
 assert.equal(value.candidateId,'p3');
 assert.equal(value.outcome,'dead');
 assert.equal(value.resolvedAt,at);
 assert.equal(value.deadlineAt,null);
 assert.deepEqual(value.votes,{});
 assert.equal(gallowsManualResolve(value,'p4','alive',at).error,'GALLOWS_ALREADY_RESOLVED');
 const snapshot=gallowsSnapshot(value,{matchId:'m1',cycleKey:'day1'});
 assert.equal(snapshot.outcome,'dead');
});

test('GM manual prevents invalid candidate, invalid verdict, and auto-mode overrides',()=>{
 assert.equal(gallowsManualResolve(seed('auto'),'p3','dead').error,'GM_MANUAL_MODE_REQUIRED');
 assert.equal(gallowsManualResolve(seed(),'ghost','dead').error,'INVALID_GALLOWS_CANDIDATE');
 assert.equal(gallowsManualResolve(seed(),'p3','unknown').error,'INVALID_GALLOWS_OUTCOME');
 assert.equal(gallowsManualResolve(seed(),'p3','alive').value.outcome,'alive');
});

test('mode switch clears active countdown, prior nominations, ballots and candidate',()=>{
 const s={...seed('auto'),stage:'voting',candidateId:'p2',nominationDeadlineAt:5000,deadlineAt:9000,
  nominations:{p1:'p2'},votes:{p1:'👎'}};
 const switched=gallowsSetMode(s,'gm',200);
 assert.equal(switched.ok,true);
 assert.equal(switched.value.stage,'ready');
 assert.equal(switched.value.candidateId,null);
 assert.equal(switched.value.deadlineAt,null);
 assert.equal(switched.value.nominationDeadlineAt,null);
 assert.deepEqual(switched.value.nominations,{});
 assert.deepEqual(switched.value.votes,{});
});

test('artifact vote bans cannot be removed by GM, and server never counts those votes',()=>{
 const s={...seed('auto'),stage:'voting',deadlineAt:Date.now()+60000,
  artifactVoteBans:['p2'],blockedVotes:['p3'],votes:{p2:'👎',p3:'👎',p4:'👍'}};
 assert.deepEqual(gallowsBlockedVotes(s),['p3','p2']);
 const unban=gallowsSetRestriction(s,'p2','vote',false);
 assert.equal(unban.ok,true);
 assert.equal(unban.value.blockedVotes.includes('p2'),false);
 assert.equal(gallowsBlockedVotes(unban.value).includes('p2'),true);
 assert.equal(gallowsCast(unban.value,'p2','👎').error,'VOTER_BANNED');
 assert.deepEqual(gallowsVoteTotals(unban.value),{save:1,kill:0,cast:1,eligible:4});
 const snapshot=gallowsSnapshot(unban.value,{matchId:'m1',cycleKey:'day1'});
 assert.deepEqual(snapshot.artifactVoteBans,['p2']);
 assert.equal(snapshot.blockedVotes.includes('p2'),true);
});

test('same-day GM UI includes separate auto/manual stages and percentage tally',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const gm=fs.readFileSync('server-game/current/app.js','utf8');
 const css=fs.readFileSync('server-game/current/style.css','utf8');
 const backend=fs.readFileSync('src/index.js','utf8');
 assert.ok(html.includes('id="battleGallowsAutomatic"'));
 assert.ok(html.includes('id="battleGallowsMembers"'));
 assert.ok(gm.includes('nomEligible'));
 assert.ok(gm.includes('gallows-count'));
 assert.ok(gm.includes('Chọn người trên danh sách'));
 assert.ok(gm.includes('artifactBans.has(m.loginId)'));
 assert.ok(gm.includes("if(manual)manual.hidden=mode!=='gm'"));
 assert.ok(css.includes('#battleGallowsAutomatic[hidden]'));
 assert.ok(backend.includes("gallowsManualResolve(ballot,target"));
 assert.ok(backend.includes('artifactVoteBans'));
 assert.ok(backend.includes('statusId:"vote_ban"'));
});
