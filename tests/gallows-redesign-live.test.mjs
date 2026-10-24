import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsRosterStats,gallowsSnapshot,gallowsManualResolve,gallowsSetRestriction} from '../src/gmww-gallows-rules.js';

const ids=Array.from({length:12},(_,i)=>'p'+(i+1));
const ballot=()=>({id:'g-1',matchId:'m-1',cycleKey:'morning-1',stage:'voting',mode:'auto',
  eligible:ids,candidateId:'p3',nominations:{p1:'p3',p2:'p3',p4:'p3',p5:'p6'},
  votes:{p1:'👎',p2:'👍',p4:'👎',p5:'👍'},blockedNomination:[],blockedVotes:[],
  artifactVoteBans:[],outcome:null});

test('roster: all 12 living players, sorted, with number and eligible-voter percentage',()=>{
 const rows=gallowsRosterStats(ballot());
 assert.equal(rows.length,12);
 assert.equal(rows[0].id,'p3');
 assert.equal(rows[0].nominations,3);
 assert.equal(rows[0].nominationPercent,25);
 assert.deepEqual([rows[0].save,rows[0].kill],[2,2]);
 assert.equal(rows.find(x=>x.id==='p6').nominations,1);
 assert.equal(rows.find(x=>x.id==='p8').nominations,0);
});

test('GM bans and Artifact bans exclude receipts and update denominator',()=>{
 const s=ballot();
 s.blockedNomination=['p1','ghost'];s.blockedVotes=['p4'];s.artifactVoteBans=['p5'];
 const rows=gallowsRosterStats(s);
 const target=rows.find(x=>x.id==='p3');
 assert.equal(target.nominations,2);
 assert.equal(target.nominationPercent,Math.round(2/11*10000)/100);
 assert.equal(target.kill,1);
 assert.equal(target.save,1);
 assert.equal(rows.find(x=>x.id==='p5').voteBanned,true);
 const unban=gallowsSetRestriction(s,'p5','vote',false);
 assert.equal(unban.ok,true);
 assert.ok(gallowsSnapshot(unban.value,{matchId:'m-1',cycleKey:'morning-1'}).blockedVotes.includes('p5'));
});

test('invalid voters, dead/unknown nominees, and self-nominations cannot inflate scoreboard',()=>{
 const s=ballot();s.nominations={p1:'p1',outsider:'p3',p2:'ghost',p4:'p3'};
 s.votes={p1:'👎',outsider:'👎',p5:'invalid'};
 const rows=gallowsRosterStats(s);assert.equal(rows.find(x=>x.id==='p3').nominations,1);
 assert.equal(rows.find(x=>x.id==='p3').kill,1);
 assert.equal(rows.find(x=>x.id==='p3').save,0);
});

test('manual conclusion retains server snapshot for same match only',()=>{
 const s={...ballot(),mode:'gm',stage:'ready'};
 const result=gallowsManualResolve(s,'p3','dead',Date.now());
 assert.equal(result.ok,true);
 const snapshot=gallowsSnapshot(result.value,{matchId:'m-1',cycleKey:'morning-1'});
 assert.equal(snapshot.outcome,'dead');
 assert.equal(snapshot.rosterStats.length,12);
 assert.equal(gallowsSnapshot(result.value,{matchId:'another',cycleKey:'morning-1'}),null);
});

test('GM UI shows collapsible auto/manual, all roster counts and matching menu width',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
 const css=fs.readFileSync('server-game/current/style.css','utf8');
 assert.ok(html.includes('id="battleGallowsModeDetails"'));
 assert.ok(html.includes('id="battleGallowsCandidateControl"'));
 assert.ok(gm.includes('g.rosterStats'));
 assert.ok(gm.includes('roster.innerHTML=ordered.map'));
 assert.ok(gm.includes('👍 CỨU '));
 assert.ok(gm.includes('👎 GIẾT '));
 assert.ok(css.includes('width:calc(100vw - 20px)!important'));
 assert.ok(css.includes('#battleGallowsCandidateControl[hidden]'));
});

test('Player Web keeps stage-scoped nomination and vote actions; configured audio upload IDs exist',()=>{
 const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 const server=fs.readFileSync('src/index.js','utf8');
 const audio=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 assert.ok(player.includes("stage==='nominating'"));
 assert.ok(player.includes("stage==='voting'"));
 assert.ok(player.includes("g.mode==='gm'"));
 assert.ok(player.includes("d.type==='gallows_updated'"));
 assert.ok(server.includes('this.broadcast({type:"gallows_updated"'));
 for(const id of ['audio_system_gallows_vote_result','audio_system_gallows_result_dead','audio_system_gallows_result_saved']){
   assert.ok(audio.includes("id:'"+id+"'"));
   assert.ok(html.includes('<code>'+id+'</code>'));
 }
});
