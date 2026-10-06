import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seatClaimConflict,movementProgress,movementArrivalReady,movementRemainingMs} from '../src/gmww-seat-movement-rules.js';

const server=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const liveModule=readFileSync(new URL('../src/gmww-members-live.js',import.meta.url),'utf8');
const live=JSON.parse(liveModule.slice(liveModule.indexOf('=')+1,liveModule.lastIndexOf(';')).trim());
const village=readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
const gm=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');

test('two players cannot reserve the same target seat while walking',()=>{
  const players={
    'member:a':{seatId:1,moveTargetSeatId:7,movementStatus:'moving'},
    'member:b':{seatId:2},
    'member:c':{seatId:null}
  };
  assert.equal(seatClaimConflict(players,'member:b',7)?.id,'member:a');
  assert.equal(seatClaimConflict(players,'member:c',2)?.id,'member:b');
  assert.equal(seatClaimConflict(players,'member:a',7),null);
});

test('30 simultaneous seat reservations remain uniquely addressable',()=>{
  const players={};
  for(let i=1;i<=30;i++)players['member:'+i]={moveTargetSeatId:i,movementStatus:'moving'};
  for(let i=1;i<=30;i++){
    assert.equal(seatClaimConflict(players,'challenger',i)?.id,'member:'+i);
  }
});

test('movement can resume after reconnect from server timestamps',()=>{
  const move={moveStartedAt:1000,moveDurationMs:2000};
  assert.equal(movementProgress(move,1000),0);
  assert.equal(movementProgress(move,2000),.5);
  assert.equal(movementProgress(move,3000),1);
  assert.equal(movementArrivalReady(move,2200,.62),false);
  assert.equal(movementArrivalReady(move,2240,.62),true);
  assert.equal(movementRemainingMs(move,2000,.62),240);
});

test('server exposes authenticated movement, arrival and optional seat mode',()=>{
  assert.match(server,/seatMoveMode/);
  assert.match(server,/normalizeSeatMoveMode/);
  assert.match(server,/\/player\/move/);
  assert.match(server,/\/player\/move-complete/);
  assert.match(server,/MOVE_NOT_ARRIVED/);
  assert.match(server,/SEAT_TAKEN/);
  assert.match(server,/movementStatus="moving"/);
  assert.match(server,/villageLayout\.clampPoint/);
});

test('Player Web supports free roaming while seat assignment is GM-only',()=>{
  assert.match(live,/gmww:ground-click/);
  assert.match(live,/startFreeWalk/);
  assert.match(live,/releaseMySeat/);
  assert.match(live,/scheduleMovementCompletion/);
  assert.match(live,/move\/complete/);
  assert.match(live,/seatMoveMode\|\|'instant'/);
  assert.match(live,/ĐỔI VỊ TRÍ/);
});

test('null movement coordinates never become zero-zero movement',()=>{
  assert.match(live,/validCoord=v=>v!==null&&v!==undefined&&v!==''/);
  assert.match(live,/x===null\|\|x===undefined\|\|x===''\|\|y===null/);
  const layout=readFileSync(new URL('../assets/village/village-layout.js',import.meta.url),'utf8');
  assert.match(village,/layout\.interpolate/);
  assert.match(gm,/GMWW_VILLAGE_LAYOUT\.interpolate/);
  assert.match(layout,/v==null\|\|v===''\|\|!Number\.isFinite/);
});

test('village animates chibi and reports arrival to parent',()=>{
  assert.match(village,/movementPosition/);
  assert.match(village,/requestAnimationFrame\(animateMovementFrame\)/);
  assert.match(village,/gmww:move-arrived/);
  assert.doesNotMatch(village,/gmww:seat-click/);
  assert.match(village,/gmww:ground-click/);
  assert.match(village,/moveTargetSeatId/);
  assert.match(village,/layout\.clampPoint/);
  assert.match(village,/class="seat-dot"/);
});

test('GM IPA exposes the movement option and renders moving players',()=>{
  assert.match(gm,/data-play-seat-move="instant"/);
  assert.match(gm,/data-play-seat-move="walk"/);
  assert.match(gm,/playMovementPoint/);
  assert.match(gm,/is-moving/);
  assert.match(gm,/GMWW_VILLAGE_LAYOUT\.clampPoint/);
  assert.match(gm,/play-position-plus/);
  assert.doesNotMatch(gm,/🪑/);
});
