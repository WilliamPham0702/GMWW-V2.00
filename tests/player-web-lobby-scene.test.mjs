import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const raw=fs.readFileSync('src/gmww-members-live.js','utf8');
const live=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,''));
const scene=fs.readFileSync('assets/village/village.mjs','utf8');
const css=fs.readFileSync('assets/village/village.css','utf8');
const html=fs.readFileSync('assets/village/index.html','utf8');

test('Player changes visual mode only on real server match start, never GM wizard advances',()=>{
  const start=live.indexOf('function playerScenePolicy(room={})');
  const end=live.indexOf('function playerTopMenuStatus()',start);
  assert.ok(start>=0&&end>start);
  const context={};
  vm.runInNewContext(live.slice(start,end)+'\nthis.policy=playerScenePolicy',context);
  for(const step of ['room','seats','game','roles','deal','battle']){
    const state=context.policy({phase:'lobby',gmStage:step});
    assert.equal(state.mode,'lobby',step);
    assert.equal(state.rolesReleased,false,step);
  }
  assert.equal(context.policy({phase:'role_delivery',gmStage:'deal'}).mode,'lobby');
  assert.equal(context.policy({phase:'role_delivery'}).rolesReleased,true);
  assert.equal(context.policy({phase:'running',gmStage:'battle'}).mode,'battle');
  assert.equal(context.policy({phase:'started'}).mode,'battle');
});
test('Character seating, swaps and motion are still sent to same iframe, and 3.58 dedupe remains',()=>{
  assert.match(live,/villagePublicPlayers\(state\.roomCode\?state\.players:state\.lobbyPlayers\)/);
  assert.match(live,/seatId:Number\(p\?\.seatId\|\|0\)\|\|null,positionX/);
  assert.match(live,/movementStatus:p\?\.movementStatus==='moving'\?'moving':'idle'/);
  assert.match(live,/moveTargetSeatId:Number\(p\?\.moveTargetSeatId\|\|0\)\|\|null/);
  assert.match(live,/gmwwVillageLastFrame===iframe\.contentWindow&&gmwwVillageLastSignature===signature/);
  assert.match(live,/iframe\.contentWindow\.postMessage\(payload,location\.origin\)/);
  assert.match(scene,/reconcileVillageChildren\(players,desiredPlayers\)/);
  assert.match(scene,/mountedPlayerNodes=new Map/);
});
test('Pregame role is private and only available after actual role delivery',()=>{
  assert.match(live,/playerScenePolicy\(state\.room\)\.rolesReleased\?'role':'village'/); // guard verified below
  assert.match(live,/pane=pane==='role'&&state\.role&&playerScenePolicy\(state\.room\)\.rolesReleased\?'role':'village'/);
  assert.match(live,/const roleInLobby=pane==='role'&&playerScenePolicy\(state\.room\)\.mode==='lobby'/);
  assert.match(live,/gmww_role_modal_seen_/);
  assert.match(live,/roleBtn\.hidden=!\(policy\.phase==='role_delivery'&&hasRole\)/);
  assert.match(live,/roleName:playerScenePolicy\(state\.room\)\.rolesReleased\?roleName:''/);
});
test('Lobby HUD is absent before start; only game shows day/night controls',()=>{
  assert.match(live,/room:\{playerSceneMode:playerView\.mode,code:/);
  assert.match(live,/phase:playerView\.mode==='battle'\?cyclePhase\.slice\(0,20\):'lobby'/);
  assert.match(live,/#game\[data-gmww-player-scene="lobby"\] #gmwwGameViewTabs\{display:none!important\}/);
  assert.match(scene,/classList\.toggle\("player-prep",room\.playerSceneMode==="lobby"\)/);
  assert.match(css,/html\.embedded body\.player-prep \.hud\{display:none!important\}/);
  assert.match(html,/village\.mjs\?v=prep303/);
  assert.match(live,/iframe\.src='\/village\/\?embed=1&v=303'/);
});

test('Simplified player lobby uses existing info boxes, hides unoccupied leaves and extra exit buttons',()=>{
 assert.match(live,/bar\.hidden=true/);
 assert.match(live,/d\.querySelector\('\.seat'\)\.hidden=true/);
 assert.match(live,/d\.querySelector\('\.leave'\)\.hidden=true/);
 assert.match(live,/showSeats:!!state\.roomCode&&room\.enabled!==false&&!publicPlayers\.some\(p=>Number\(p\.seatId\|\|0\)>0\)/);
 assert.match(live,/if\(!confirm\('Thoát Player Web và rời phòng hiện tại\?'\)\)return/);
});

test('Assigned characters remain on the village when all empty seat leaves are hidden',()=>{
  const start=scene.indexOf('function render(){'),end=scene.indexOf('function animateMovementFrame(',start);
  assert.ok(start>=0&&end>start,'village render section must exist');
  const render=scene.slice(start,end);
  assert.match(render,/ps\.forEach\(\(p,i\)=>\{/,'iterate occupied and empty slots regardless of leaf visibility');
  assert.match(render,/if\(!data\)\{\s*if\(setupState\.showSeats===false\)return;/,'skip only empty slot markers');
  assert.match(render,/const pos=movementPosition\(data,p\),button=stablePlayerNode\(data,pos,seatId,i\);desiredPlayers\.push\(button\)/,'seated player characters must be retained');
  assert.doesNotMatch(render,/setupState\.showSeats===false\?\[\]:ps/,'seat visibility must never gate character rendering');
  assert.match(render,/for\(const data of unseated\)/,'unseated characters and GM still render');
});
