import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gallowsBegin,gallowsHangingState,gallowsSelectCandidate,gallowsResolve,
  gallowsSnapshot,gallowsSetMode,gallowsManualResolve} from '../src/gmww-gallows-rules.js';
const metadata={matchId:'m-1',cycleKey:'day-1'};
const ballot=(mode='auto')=>({id:'g-1',matchId:'m-1',cycleKey:'day-1',stage:'selecting',mode,
 eligible:['alice','bob','charlie'],candidateId:null,votes:{},nominations:mode==='auto'?{alice:'bob'}:{},voteDurationSec:10});

test('Automatic execution vote suspends ONLY the selected, living candidate; result releases',()=>{
 const start=gallowsBegin(ballot(),'bob',1000);
 assert.equal(start.ok,true);
 const h=gallowsHangingState(start.value,1001);
 assert.deepEqual(h,{active:true,candidateId:'bob',stage:'voting',startedAt:1000});
 assert.deepEqual(gallowsSnapshot(start.value,metadata,1001).hanging,h);
 assert.equal(gallowsSnapshot(start.value,{matchId:'older',cycleKey:'day-1'},1001),null);
 assert.equal(gallowsHangingState(start.value,11001)?.stage,'closed');
 const outcome=gallowsResolve(start.value,'alive',11001);
 assert.equal(outcome.ok,true);
 assert.equal(gallowsSnapshot(outcome.value,metadata,11002).hanging,null);
});
test('Manual GM selection is authoritative, switchable and visually released after save/kill',()=>{
 const b={...ballot('gm'),stage:'ready'};
 assert.equal(gallowsHangingState(b),null);
 assert.equal(gallowsSelectCandidate(b,'unknown',2000).ok,false);
 const first=gallowsSelectCandidate(b,'alice',2000);
 assert.equal(first.ok,true);assert.equal(first.value.stage,'selecting');
 assert.equal(gallowsSnapshot(first.value,metadata,2001).hanging.candidateId,'alice');
 const repeated=gallowsSelectCandidate(first.value,'alice',2002);
 assert.equal(repeated.idempotent,true);
 const switched=gallowsSelectCandidate(first.value,'bob',2003);
 assert.equal(switched.value.candidateId,'bob');
 assert.equal(switched.value.hangingStartedAt,2003);
 const released=gallowsManualResolve(switched.value,'bob','dead',2004);
 assert.equal(released.ok,true);
 assert.equal(gallowsSnapshot(released.value,metadata,2005).hanging,null);
});
test('No hanging in ready, nomination, resolved, stale target or mode-switch states',()=>{
 const b=ballot();
 for(const stage of ['ready','nominating','resolved']){
   assert.equal(gallowsHangingState({...b,stage,candidateId:'alice'}),null);
 }
 assert.equal(gallowsHangingState({...b,candidateId:'absent'}),null);
 assert.equal(gallowsHangingState({...b,candidateId:'alice',eligible:['bob']}),null);
 assert.equal(gallowsSelectCandidate(b,'alice',2000).error,'GM_MANUAL_MODE_REQUIRED');
 const picked=gallowsSelectCandidate({...b,mode:'gm'},'alice',2000).value;
 assert.equal(gallowsSetMode(picked,'auto',2001).value.candidateId,null);
 assert.equal(gallowsHangingState(gallowsSetMode(picked,'auto',2001).value),null);
});
test('Both UIs position a single Character above their fire without mutating Seat',()=>{
 const rules=fs.readFileSync('src/gmww-gallows-rules.js','utf8'),
   worker=fs.readFileSync('src/index.js','utf8'),
   gm=fs.readFileSync('server-game/current/app.js','utf8'),
   gmCss=fs.readFileSync('server-game/current/gallows-hanging.css','utf8'),
   player=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8'),
   village=fs.readFileSync('assets/village/village.mjs','utf8'),
   villageCss=fs.readFileSync('assets/village/village.css','utf8'),
   live=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 assert.match(rules,/hanging:gallowsHangingState\(ballot,now\)/);
 assert.match(worker,/command==="hang"/);
 assert.match(worker,/this.broadcast\(\{type:"gallows_updated"/);
 assert.match(gm,/function syncPlayGallowsHanging\(/);
 assert.match(gm,/villageGallowsPosition\(\)/);
 assert.match(gm,/battleGallowsCommand\('hang',String\(pick.dataset.gallowsPick/);
 assert.match(gm,/gallowsOriginLeft/);
 assert.match(player,/gallowsHanging:playerView.mode==='battle'/);
 assert.match(live,/gallows_updated/);
 assert.match(village,/function syncGallowsHangingVisual\(/);
 assert.match(village,/screenPoint\(layout.fire\)/);
 assert.match(village,/syncGallowsHangingVisual\(\)/);
 assert.match(gm,/hanging:active/);
 assert.match(gm,/function villageCalibrateGallows/);
 assert.match(gm,/gallowsAnchors/);
 assert.match(gmCss,/gmww-gallows-hanging/);
 assert.match(villageCss,/gmww-gallows-hanging/);
 assert.doesNotMatch(gmCss,/content\s*:|gmww-gm-gallows-struggle/);
 assert.doesNotMatch(villageCss,/gmww-gallows-struggle|\.player\.gmww-gallows-hanging::before|\.player\.gmww-gallows-hanging::after/);
 assert.doesNotMatch(village.slice(village.indexOf('function syncGallowsHangingVisual'),village.indexOf('function render(){')),/seatId\s*=|seatOffset\s*=|setItem\(/);
 assert.doesNotMatch(gm.slice(gm.indexOf('function syncPlayGallowsHanging'),gm.indexOf('function renderPlayPlayers')),/seatId\s*=|seatOffset\s*=|playRoomApi\(/);
});
