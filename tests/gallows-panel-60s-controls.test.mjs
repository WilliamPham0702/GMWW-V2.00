import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  gallowsSetDuration,gallowsCloseNomination,gallowsOpen,gallowsNominate,
  gallowsStage,gallowsCast,gallowsManualResolve,gallowsAutomaticNominee
} from '../src/gmww-gallows-rules.js';

const fixture=()=>({
 id:'test-gallows',matchId:'test-match',cycleKey:'morning1',mode:'auto',stage:'ready',
 eligible:['alice','bob','carol','david'],candidateId:null,
 nominations:{},votes:{},blockedNomination:[],blockedVotes:[],
 nominationDurationSec:60,voteDurationSec:60
});

test('Gallows page: 60-second defaults, save on blur, stage-specific locking',()=>{
 let state=fixture();
 const set=gallowsSetDuration(state,'nomination',35,1000);
 assert.equal(set.ok,true);state=set.value;
 assert.equal(state.nominationDurationSec,35);
 assert.equal(gallowsSetDuration(state,'vote',75,1000).value.voteDurationSec,75);
 assert.equal(gallowsSetDuration(state,'vote',0,1000).error,'INVALID_GALLOWS_DURATION');
 assert.equal(gallowsSetDuration(state,'nomination',3601,1000).value.nominationDurationSec,3600);
 state=gallowsOpen(state,1000).value;
 assert.equal(state.nominationDeadlineAt,36000);
 assert.equal(gallowsSetDuration(state,'nomination',20,2000).error,'GALLOWS_TIMER_LOCKED');
 assert.equal(gallowsSetDuration(state,'vote',40,2000).value.voteDurationSec,40);
});

test('Early chốt đề cử auto-selects sole leader, blocks late nominations and opens vote',()=>{
 let b=gallowsOpen(fixture(),1000).value;
 b=gallowsNominate(b,'alice','bob',2000).value;
 const next=gallowsCloseNomination(b,3000);
 assert.equal(next.ok,true);assert.equal(next.value.stage,'voting');
 assert.equal(next.value.candidateId,'bob');
 assert.equal(next.value.deadlineAt,63000);
 assert.equal(gallowsNominate(next.value,'carol','bob',3001).error,'NOMINATION_CLOSED');
 assert.equal(gallowsStage(next.value,3001),'voting');
 assert.equal(gallowsCast(next.value,'david','👍',3002).ok,true);
});

test('Tied nominations require GM selection; no random candidate and no late submission',()=>{
 let b=gallowsOpen(fixture(),1000).value;
 b=gallowsNominate(b,'alice','bob',1100).value;
 b=gallowsNominate(b,'david','carol',1200).value;
 assert.equal(gallowsAutomaticNominee(b),null);
 const closed=gallowsCloseNomination(b,1300);
 assert.equal(closed.ok,true);assert.equal(closed.value.stage,'selecting');
 assert.equal(gallowsNominate(closed.value,'carol','bob',1400).error,'NOMINATION_CLOSED');
});

test('Markup: max ten list rows with scroll, ranking, two clocks, mode switch and no setup/audio links',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const css=fs.readFileSync('server-game/current/style.css','utf8');
 const gm=fs.readFileSync('server-game/current/app.js','utf8');
 const worker=fs.readFileSync('src/index.js','utf8');
 const audios=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
 for(const id of ['battleGallowsMembers','battleGallowsModeToggle','battleGallowsNominationSeconds',
   'battleGallowsVoteSeconds','battleGallowsInfo','battleGallowsManualConclusion'])
   assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.ok(css.includes('max-height:380px!important'),'ten-row scroller absent');
 assert.match(gm,/ordered=\[\.\.\.members\]\.sort/);
 assert.match(gm,/localeCompare\(String\(b.displayName\|\|b.loginId\),'vi'\)/);
 assert.match(gm,/data-gallows-pick/);
 assert.match(gm,/addEventListener\('focusout'/);
 for(const command of ['close_nomination','close_vote','set_duration'])
   assert.ok(worker.includes(command),'missing server command '+command);
 assert.doesNotMatch(html,/id="playGallowsNominationSec"|id="playGallowsVoteSec"/);
 assert.doesNotMatch(html,/id="battleGallowsAudioSources"|data-gallows-audio-target/);
 for(const id of ['audio_system_gallows_day_long','audio_system_gallows_vote_result',
   'audio_system_gallows_result_dead','audio_system_gallows_result_saved'])
   assert.ok(audios.includes("id:'"+id+"'"),'missing audio upload slot '+id);
});

test('Manual GM outcome remains direct while Auto keeps Player Web authoritative',()=>{
 const b={...fixture(),mode:'gm'};
 const manual=gallowsManualResolve(b,'bob','alive',1000);
 assert.equal(manual.ok,true);assert.equal(manual.value.outcome,'alive');
 assert.equal(gallowsManualResolve(fixture(),'bob','dead',1000).ok,false);
});
