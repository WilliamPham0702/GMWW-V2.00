import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Player Web lobby motion chooses a random point, sits 30 seconds, then continues elsewhere',()=>{
  const live=read('src/gmww-members-live.js'),server=read('src/index.js'),village=read('assets/village/village.mjs');
  assert.ok(live.includes('const LOBBY_MOTION_HOLD_MS=30000'));
  assert.ok(live.includes('function lobbyRandomPoint()'));
  assert.ok(live.includes('function buildLobbyMotionRoute(){return[lobbyRandomPoint()]}'));
  assert.ok(live.includes("state.lobbyMotionPhase='gather'"));
  assert.ok(live.includes("state.lobbyMotionPhase='hold';state.lobbyMotionHoldUntil=Date.now()+LOBBY_MOTION_HOLD_MS"));
  assert.ok(live.includes('resetLobbyMotionPlan()'));
  assert.ok(live.includes('Tự đi ngẫu nhiên trong Làng, dừng lại, ngồi 30 giây rồi đứng dậy đi tới điểm khác.'));
  assert.ok(server.includes('VILLAGE_AUTO_SIT_MS'));
  assert.ok(server.includes('villageAutoPoint("member:"'));
  assert.ok(server.includes('return villageAutoLife({id,now,anchorAt,anchorPoint,stagger:false},villageLayout)'));
  assert.ok(village.includes('villageActivity==="sitting"&&Number(data?.sitUntil||0)>now'));
});

test('Automatic motion stops once the player has a seat and seat walking wins over roaming',()=>{
  const live=read('src/gmww-members-live.js'),server=read('src/index.js');
  assert.ok(live.includes("!Number(p?.seatId||0)"));
  assert.ok(live.includes('function pauseLobbyMotionForSeat()'));
  assert.ok(live.includes('state.lobbySeatWalkPending={seatId:n,x:Number(x),y:Number(y)}'));
  assert.ok(live.includes("if(p?.seatId)resetLobbyMotionPlan()"));
  assert.ok(server.includes('if(!targetSeatId&&normalizeSeatId(p.seatId,seatCount))return j({ok:false,error:"SEATED_MOVE_REQUIRES_TARGET"'));
});

test('Profile exposes a default-on lobby movement switch and persists it per member',()=>{
  const live=read('src/gmww-members-live.js'),server=read('src/index.js');
  assert.ok(live.includes('Di chuyển trong sảnh'));
  assert.ok(live.includes('Tự đi ngẫu nhiên trong Làng, dừng lại, ngồi 30 giây rồi đứng dậy đi tới điểm khác.'));
  assert.ok(live.includes('role=\\\"switch\\\"'));
  assert.ok(live.includes("body:JSON.stringify({lobbyMotionEnabled:enabled})"));
  assert.ok(server.includes('lobbyMotionEnabled:true'));
  assert.ok(server.includes('lobbyMotionEnabled:m.lobbyMotionEnabled!==false'));
  assert.ok(server.includes('if(hasLobbyMotion)member.lobbyMotionEnabled=body.lobbyMotionEnabled!==false'));
});

test('V3.17 runtime metadata stays aligned on the V3.17 native shell',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V3.21"'));
  assert.ok(app.includes("const VERSION='3.21';"));
  assert.ok(html.includes('GMWW V3.21'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 317;'));
  assert.ok(project.includes('MARKETING_VERSION = 3.17;'));
  assert.equal(pkg.version,'3.21.0');
});
