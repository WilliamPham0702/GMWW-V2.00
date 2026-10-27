import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGE9_VERSION,publicMatchKey,publicMatchView,createMatchSyncGate,publicMatchStatus} from '../assets/village/arena-3d/stage9-match-sync.mjs';
const make=(revision=1,phase='running',count=12)=>({
 revision,room:{code:'TEST',matchId:'m1',cycleKey:'n1',phase,cyclePhase:'night',cycleNight:2},
 players:Array.from({length:count},(_,i)=>({participantId:'p'+i,seatId:i+1,online:i%2===0,alive:i!==0}))
});
test('GĐ9 Core projection: 6–30 players, day/night, alive and online',()=>{
 for(const n of [6,12,20,30]){
  const view=publicMatchView(make(1,'running',n));
  assert.equal(view.players,n);
  assert.equal(view.alive,n-1);
  assert.equal(view.online,Math.ceil(n/2));
  assert.match(publicMatchStatus(view),/Đêm 2/);
  assert.equal(view.key,'TEST:m1:n1');
 }
});
test('GĐ9 WS replay: drop older revision and identical duplicate',()=>{
 const gate=createMatchSyncGate();
 assert.equal(gate.accept(make(2),{source:'realtime'}).accepted,true);
 assert.equal(gate.accept(make(2),{source:'realtime'}).reason,'duplicate');
 assert.equal(gate.accept(make(1),{source:'realtime'}).reason,'stale-revision');
 assert.equal(gate.accept(make(3,'ended'),{source:'realtime'}).accepted,true);
 assert.equal(gate.accept(make(2),{source:'snapshot'}).reason,'stale-revision');
});
test('GĐ9 reconnect: stale HTTP snapshot cannot overwrite newer WS',()=>{
 const gate=createMatchSyncGate();
 gate.accept({...make(1),revision:undefined},{source:'realtime',now:10000});
 const stale={...make(1,'lobby'),revision:undefined};
 assert.equal(gate.accept(stale,{source:'snapshot',now:12000}).reason,'snapshot-grace');
 assert.equal(gate.accept(stale,{source:'snapshot',now:17000}).accepted,true);
 gate.reset();assert.equal(gate.accept(make(1),{source:'snapshot'}).accepted,true);
});
test('GĐ9 new match/cycle and privacy: never project hidden roles',()=>{
 const frame=make(1);
 frame.players[0].roleId='wolf';frame.players[0].secretFaction='wolf';
 const view=publicMatchView(frame);
 assert.equal(JSON.stringify(view).includes('wolf'),false);
 assert.equal(publicMatchKey({...frame,room:{...frame.room,cycleKey:'n2'}}),'TEST:m1:n2');
 assert.equal(STAGE9_VERSION,'gmww.arena.full-match-sync.9');
 const src=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(src,/matchSync\.accept\(frame,\{source:'realtime'\}\)/);
 assert.match(src,/gmwwStage9=STAGE9_VERSION/);
 assert.match(src,/if\(result\.accepted\)drawFrame\(frame\)/);
});
