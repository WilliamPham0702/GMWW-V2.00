import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsNominationTotals,gallowsAutomaticNominee,gallowsVoteTotals,gallowsAutomaticOutcome,gallowsSnapshot,gallowsNominate,gallowsCast,gallowsSetRestriction,gallowsSetMode} from '../src/gmww-gallows-rules.js';

const eligible=Array.from({length:12},(_,i)=>'player'+String(i+1));
const seed=()=>({id:'g-1',matchId:'m1',cycleKey:'day1',stage:'nominating',mode:'auto',
  eligible,nominations:{},votes:{},candidateId:null,blockedNomination:[],blockedVotes:[],
  nominationDurationSec:30,voteDurationSec:30,deadlineAt:9999999999999});
test('12 players: server tallies accepted nominations and elects unique highest',()=>{
 const g=seed();g.nominations={player1:'player4',player2:'player4',player3:'player7',player5:'player4',
   player6:'player7',player8:'player4'};
 assert.deepEqual(gallowsNominationTotals(g),[{loginId:'player4',votes:4},{loginId:'player7',votes:2}]);
 assert.equal(gallowsAutomaticNominee(g),'player4');
 const snapshot=gallowsSnapshot(g,{matchId:'m1',cycleKey:'day1'});
 assert.equal(snapshot.eligibleCount,12);
 assert.deepEqual(snapshot.nominationTotals,gallowsNominationTotals(g));
 assert.equal(snapshot.eligible.length,12);
});
test('ties and no nomination never silently elect a random candidate',()=>{
 const g=seed();assert.equal(gallowsAutomaticNominee(g),null);
 g.nominations={player1:'player3',player2:'player4'};
 assert.equal(gallowsAutomaticNominee(g),null);
 g.blockedNomination=['player2'];
 assert.equal(gallowsAutomaticNominee(g),'player3');
});
test('nomination is one vote per eligible living member; cannot choose own character',()=>{
 const g=seed();
 assert.equal(gallowsNominate(g,'player1','player1').ok,false);
 assert.equal(gallowsNominate(g,'player1','ghost').ok,false);
 let a=gallowsNominate(g,'player1','player2');assert.equal(a.ok,true);
 assert.equal(gallowsNominate(a.value,'player1','player3').ok,false);
 a=gallowsSetRestriction(a.value,'player1','nomination',true);assert.deepEqual(gallowsNominationTotals(a.value),[]);
});
test('execution voting excludes nominated character, banned or dead members',()=>{
 const g={...seed(),stage:'voting',candidateId:'player4',votes:{
    player1:'👍',player2:'👎',player3:'👎',player4:'👎',player5:'👍',player6:'👎'}};
 g.blockedVotes=['player6'];
 const totals=gallowsVoteTotals(g);
 assert.deepEqual(totals,{save:2,kill:2,cast:4,eligible:10});
 assert.equal(gallowsAutomaticOutcome(g),'alive','tie must save accused');
 assert.equal(gallowsCast(g,'player4','👎').ok,false,'candidate cannot vote on own execution');
 assert.equal(gallowsCast(g,'player6','👎').ok,false,'banned voter');
 g.votes.player7='👎';assert.equal(gallowsAutomaticOutcome(g),'dead');
});
test('GM mode never accepts web votes, and mode switch clears old election receipts',()=>{
 let g=seed();g.nominations={player1:'player3'};
 const mode=gallowsSetMode(g,'gm');assert.equal(mode.ok,true);
 g=mode.value;assert.deepEqual(g.nominations,{});
 assert.equal(gallowsNominate(g,'player2','player3').error,'GM_MANUAL_MODE');
});
test('built Player Web has pirate drag and accessible double-tap listing, GM controls tally and bans',()=>{
 const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 const frame=fs.readFileSync('assets/village/village.mjs','utf8');
 const host=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
 const gm=fs.readFileSync('server-game/current/app.js','utf8');
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 for(const required of ['gmwwPirateNominate','pointermove','gmww:gallows-open-nominations','gmww:gallows-drag-nominate'])assert.ok(frame.includes(required));
 assert.ok(host.includes('gallows-open-nominations'));
 assert.ok(player.includes('gmwwGallowsOpenNomination')&&player.includes('data-gallows-vote="👍"')&&player.includes('data-gallows-vote="👎"'));
 assert.ok(html.indexOf('data-gallows-command="open"')<html.indexOf('id="battleGallowsCandidate"'));
 assert.ok(html.includes('battleGallowsBanDetails'));
 assert.ok(gm.includes('battleGallowsNominationStats')&&gm.includes('gall ows'.replace(' ','')+'AutomaticOutcome'));
});
