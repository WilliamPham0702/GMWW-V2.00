import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gallowsOpen,gallowsNominate,gallowsBegin,gallowsCast,gallowsSnapshot,
  gallowsSetRestriction,gallowsSetMode,gallowsManualVote} from '../src/gmww-gallows-rules.js';

const meta={matchId:'match',cycleKey:'day-2'};
const fresh=()=>({id:'g1',...meta,day:2,stage:'ready',nominations:{},votes:{},
  blocked:[],eligible:['alice','bob','carol'],nominationDurationSec:10,voteDurationSec:10});

test('GM can ban selection before or after nominations; voting permissions are separate',()=>{
  const opened=gallowsOpen(fresh(),1000).value;
  const b1=gallowsSetRestriction(opened,'alice','nomination',true,1200).value;
  assert.equal(gallowsNominate(b1,'alice','bob',1300).error,'NOMINATION_BANNED');
  assert.equal(gallowsNominate(b1,'bob','alice',1300).ok,true);
  const unbanned=gallowsSetRestriction(b1,'alice','nomination',false,1350).value;
  const nominated=gallowsNominate(unbanned,'alice','bob',1400).value;
  const lateBan=gallowsSetRestriction(nominated,'alice','nomination',true,1450).value;
  assert.equal(lateBan.nominations.alice,undefined);
  assert.equal(gallowsSnapshot(lateBan,meta,1600).nominations.alice,undefined);
  const voting=gallowsBegin(lateBan,'bob',2000).value;
  const first=gallowsCast(voting,'alice','👍',2100).value;
  const denied=gallowsSetRestriction(first,'alice','vote',true,2200).value;
  assert.equal(denied.votes.alice,undefined);
  assert.equal(gallowsCast(denied,'alice','👎',2500).error,'VOTER_BANNED');
  assert.ok(gallowsCast(denied,'bob','👍',2500).ok);
  assert.equal(gallowsSnapshot(denied,meta,2500).blockedNomination.includes('alice'),true);
  assert.equal(gallowsSnapshot(denied,meta,2500).blockedVotes.includes('alice'),true);
  const restored=gallowsSetRestriction(denied,'alice','vote',false,3000).value;
  assert.equal(restored.votes.alice,undefined,'unbanning cannot restore an invalidated ballot');
});

test('GM manual ballots are atomic, replaceable and restorable; player writes are rejected',()=>{
  const gm=gallowsSetMode(fresh(),'gm',900).value;
  const opened=gallowsOpen(gm,1000).value;
  assert.equal(gallowsNominate(opened,'alice','bob',1200).error,'GM_MANUAL_MODE');
  const voting=gallowsBegin(opened,'bob',2000).value;
  assert.equal(gallowsCast(voting,'alice','👍',2100).error,'GM_MANUAL_MODE');
  const voted=gallowsManualVote(voting,'alice','👍',12000).value;
  assert.equal(gallowsSnapshot(voted,meta,12000).votes.alice,'👍');
  const revised=gallowsManualVote(voted,'alice','👎',12500).value;
  assert.equal(revised.votes.alice,'👎');
  assert.equal(gallowsManualVote(revised,'alice',null,12600).value.votes.alice,undefined);
  const blocked=gallowsSetRestriction(revised,'alice','vote',true,12500).value;
  assert.equal(gallowsManualVote(blocked,'alice','👍',13000).ok,false);
  const automatic=gallowsSetMode(voted,'auto',13000).value;
  assert.deepEqual(automatic.votes,{});
  assert.equal(gallowsManualVote(automatic,'alice','👍',13000).ok,false);
});

test('GM all-impact daily notice, negative-first colors and hidden persistent timeline',()=>{
  const app=readFileSync('server-game/current/app.js','utf8');
  const html=readFileSync('server-game/current/GMWW.html','utf8');
  const css=readFileSync('server-game/current/style.css','utf8');
  const server=readFileSync('src/index.js','utf8');
  const start=app.indexOf('function battleMorningRows(){'),end=app.indexOf('function battleMorningPlayAudio(){',start);
  assert.ok(start>0&&end>start);
  const context={playSceneState:{night:2},playSceneRuntime:{room:{matchId:'match'},villageHistory:[
    {id:'negative',type:'dead',night:2,matchId:'match',loginId:'alice',effectActive:true},
    {id:'positive',type:'protected',night:2,matchId:'match',loginId:'bob',effectActive:true},
    {id:'older',type:'saved',night:1,matchId:'match',loginId:'alice',effectActive:false,expiredReason:'CYCLE_FINISHED'},
    {id:'day',type:'dead',night:1,matchId:'match',loginId:'carol',source:'gallows',effectActive:true},
    {id:'day-power',type:'frozen',night:1,matchId:'match',loginId:'bob',source:'day-action',effectActive:true},
    {id:'unrelated',type:'dead',night:2,matchId:'other',loginId:'bob'}
  ]},battleMember:id=>({displayName:id})};
  const f=vm.runInNewContext(app.slice(start,end)+';battleMorningRows',context);
  assert.deepEqual(Array.from(f(),x=>x.kind),['dead','protected']);
  assert.deepEqual(Array.from(f(1,'night'),x=>x.kind),['saved']);
  assert.deepEqual(Array.from(f(1,'day'),x=>x.kind),['dead','frozen']);
  assert.match(html,/id="battleVillageHistory"/);
  assert.match(html,/<details id="battleVillageHistory">/);
  assert.match(css,/#battleMorningList p\.is-critical/);
  assert.match(server,/villageHistory:interactions\.filter/);
  assert.doesNotMatch(app,/Làng thảo luận và bỏ phiếu\./);
});

test('GM and Player day vote controls surface both bans, one-button nomination and drag-to-nominate',()=>{
  const html=readFileSync('server-game/current/GMWW.html','utf8');
  const gm=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
  const player=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
  const bridge=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
  const village=readFileSync('assets/village/village.mjs','utf8');
  assert.match(html,/data-gallows-mode="gm"/);
  assert.match(html,/id="battleGallowsMembers"/);
  assert.match(html,/id="battleGallowsManual"/);
  assert.match(gm,/command==='restriction'|battleGallowsCommand\('restriction'/);
  assert.match(player,/gmwwGallowsDock/);
  assert.match(player,/gmwwGallowsNominate/);
  assert.match(bridge,/gmww:gallows-drag-nominate/);
  assert.match(village,/gmww:gallows-drag-nominate/);
});
