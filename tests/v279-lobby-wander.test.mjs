import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.94 lobby motion cycles around village then sits cross-legged at campfire for 30 seconds',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes('const LOBBY_MOTION_HOLD_MS=30000'));
  assert.ok(live.includes('function buildLobbyMotionRoute()'));
  assert.ok(live.includes('function lobbyGatherPoint()'));
  assert.ok(live.includes("state.lobbyMotionPhase='gather'"));
  assert.ok(live.includes("state.lobbyMotionPhase='hold';state.lobbyMotionHoldUntil=Date.now()+LOBBY_MOTION_HOLD_MS"));
  assert.ok(live.includes('resetLobbyMotionPlan()'));
  assert.ok(live.includes("autoMotionPhase:state.lobbyMotionPhase==='gather'?'gather':'roam'"));
  const server=read('src/index.js'),village=read('assets/village/village.mjs');
  assert.ok(server.includes("villageActivity:sitting?'sitting':'idle'"));
  assert.ok(server.includes('sitUntil:sitting?arrivedAt+30000:null'));
  assert.ok(village.includes('GMWW_SEATED_CHARACTER01_URL'));
  assert.ok(village.includes('character-02'));
  assert.ok(village.includes('seated-v296/character-02/front.webp'));
  assert.doesNotMatch(village,/NGỒI XẾP BẰNG •/);
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
  assert.ok(live.includes('Tự đi quanh Làng, về đống lửa ngồi xếp bằng 30 giây rồi đứng dậy đi tiếp.'));
  assert.ok(live.includes('role=\\\"switch\\\"'));
  assert.ok(live.includes("body:JSON.stringify({lobbyMotionEnabled:enabled})"));
  assert.ok(server.includes('lobbyMotionEnabled:true'));
  assert.ok(server.includes('lobbyMotionEnabled:m.lobbyMotionEnabled!==false'));
  assert.ok(server.includes('if(hasLobbyMotion)member.lobbyMotionEnabled=body.lobbyMotionEnabled!==false'));
});

test('V2.87 runtime metadata stays aligned on the V2.96 native shell',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V3.00"'));
  assert.ok(app.includes("const VERSION='3.00';"));
  assert.ok(html.includes('GMWW V3.00'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 296;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.96;'));
  assert.equal(pkg.version,'3.00.0');
});
