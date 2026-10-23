import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeLoginId,normalizeGameCharacterId,activeGameCharacterId,normalizeCharacterScale,GAME_CHARACTER_COUNT} from '../src/gmww-player-identity-rules.js';
import {normalizeVillageCoord,currentMovementPosition,clearPlayerMovement,normalizeSeatLayout,normalizeSeatId,firstFreeSeat,enforceUniqueSeatClaims,playerSetupComplete,roomPlayerPresence,villagePresence,publicPlayer,ROOM_PLAYER_TTL} from '../src/gmww-village-player-state.js';

test('G3.6: preserve 42-game-character aliases, seeded legacy choice and body scale',()=>{
  assert.equal(GAME_CHARACTER_COUNT,40);
  assert.equal(normalizeGameCharacterId(' character-42 '),'character-42');
  assert.equal(normalizeGameCharacterId('character-43'),'');
  assert.equal(normalizeGameCharacterId('wolf'),'');
  assert.equal(activeGameCharacterId('character-30'),'character-30');
  assert.equal(activeGameCharacterId('', 'same-member'),activeGameCharacterId(null,'same-member'));
  assert.match(activeGameCharacterId('', 'new-member'),/^character-(?:0[1-9]|1\d|20)$/);
  assert.equal(normalizeCharacterScale(87.5),75);
  assert.equal(normalizeCharacterScale(180),175);
  assert.equal(normalizeCharacterScale('bad',120),120);
  assert.equal(normalizeLoginId('  ALIce.Test  '),'alice.test');
});
test('G3.6: clamp village coordinates, preserve legacy layouts and 30-seat boundary',()=>{
  assert.equal(normalizeVillageCoord(200),96);
  assert.equal(normalizeVillageCoord(-1),4);
  assert.equal(normalizeVillageCoord(undefined,71),71);
  assert.equal(normalizeSeatLayout('diamond'),'circle','legacy diamond rooms render as circles');
  assert.equal(normalizeSeatLayout('ellipse'),'circle','legacy ellipse retains Seat IDs');
  assert.equal(normalizeSeatLayout('rectangle'),'circle','legacy rectangle rooms render as circles');
  assert.equal(normalizeSeatId(30,30),30);
  assert.equal(normalizeSeatId(31,30),null);
  assert.equal(normalizeSeatId('2.9',30),2);
  assert.equal(normalizeSeatId(0,30),null);
});
test('G3.6: resolve duplicate Seats without losing GM reservation semantics',()=>{
  const players={
    a:{seatId:1,ready:true},b:{seatId:1,ready:true,reservedByGM:true},
    c:{seatId:32,ready:true},d:{seatId:3,ready:true}
  };
  assert.equal(firstFreeSeat(players,4),2);
  assert.equal(enforceUniqueSeatClaims(players,4),players);
  assert.equal(players.a.seatId,1);
  assert.equal(players.b.seatId,null);
  assert.equal(players.b.ready,true);
  assert.equal(players.c.ready,false);
  assert.equal(players.d.seatId,3);
  assert.equal(firstFreeSeat(players,4),2);
  assert.equal(playerSetupComplete({seatCount:4},{loginId:'a',seatId:1}),true);
  assert.equal(playerSetupComplete({seatCount:4},{loginId:'a',seatId:null}),false);
});
test('G3.6: clearing movement preserves fixed coordinates and state transitions',()=>{
  const p={positionX:25,positionY:70,moveId:'m1',moveToX:55,moveToY:78,
    moveStartedAt:100,moveDurationMs:1000,movementStatus:'idle',villageActivity:'sitting',sitUntil:500};
  assert.deepEqual(currentMovementPosition(p,200),{x:25,y:70});
  assert.equal(clearPlayerMovement(p,{keepPosition:true}),p);
  assert.equal(p.positionX,25);
  assert.equal(p.movementStatus,'idle');
  assert.equal(p.moveToX,null);
  assert.equal(p.sitUntil,null);
});
test('G3.6: live room projection retains seated, walking and autonomous motion',()=>{
  const seated=roomPlayerPresence({loginId:'alice',seatId:2,positionX:51,positionY:62},5000);
  assert.equal(seated.movementStatus,'idle');
  assert.equal(seated.positionX,51);
  const walking=roomPlayerPresence({loginId:'bob',movementStatus:'moving',
    moveStartedAt:4500,moveDurationMs:1000,moveFromX:40,moveFromY:60,
    moveToX:57,moveToY:70,moveTargetSeatId:3},5000);
  assert.equal(walking.movementStatus,'moving');
  assert.equal(walking.moveTargetSeatId,3);
  const roaming=roomPlayerPresence({loginId:'carol',createdAt:new Date(1000).toISOString()},5000);
  assert.ok(['moving','idle'].includes(roaming.movementStatus));
  const member=villagePresence({loginId:'CAROL',createdAt:new Date(1000).toISOString()});
  assert.ok(['moving','idle'].includes(member.movementStatus));
});
test('G3.6: Player Web payload retains TTL but never exposes private member fields',()=>{
  assert.equal(ROOM_PLAYER_TTL,70000);
  const recent=Date.now();
  const data={participantId:'p1',loginId:'alice',displayName:'Alice',seatId:1,
    gameCharacterId:'character-42',lastHeartbeatAt:recent,ready:true,passwordHash:'secret'};
  const out=publicPlayer(data);
  assert.equal(out.loginId,'alice');
  assert.equal(out.gameCharacterId,'character-42');
  assert.equal(out.online,true);
  assert.equal(out.seatId,1);
  assert.equal(out.ready,true);
  assert.equal(Object.hasOwn(out,'passwordHash'),false);
  assert.equal(publicPlayer({...data,lastHeartbeatAt:recent-ROOM_PLAYER_TTL-1000}).online,false);
});
test('G3.6: Cloudflare Worker imports the production DTO and state functions exactly once',()=>{
  const s=readFileSync('src/index.js','utf8');
  assert.match(s,/from "\.\/gmww-player-identity-rules\.js"/);
  assert.match(s,/from "\.\/gmww-village-player-state\.js"/);
  for(const name of ['normalizeGameCharacterId','normalizeSeatId','clearPlayerMovement',
    'roomPlayerPresence','publicPlayer','villagePresence'])
    assert.doesNotMatch(s,new RegExp('function '+name+'\\('));
  assert.match(readFileSync('src/gmww-village-player-state.js','utf8'),/roomPlayerPresence\(/);
  assert.match(s,/publicPlayer\(/);
});
