import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const context=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),context);
const layout=context.GMWW_VILLAGE_LAYOUT;
const worker=read('src/index.js'),gm=read('server-game/current/app.js');
const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css');
const player=read('assets/village/village.mjs'),villageCss=read('assets/village/village.css');
const effect=read('assets/status-visuals.js');
test('V3.125 — 8–30 seats never silently fall back to a 24-seat ring',()=>{
  for(let n=8;n<=30;n++){
    const seats=layout.positions(n);
    assert.equal(seats.length,n,'seat count '+n);
    assert.ok(seats.every(p=>p.ring===0),'one perimeter');
    assert.ok(seats.every(p=>layout.inside(p.x,p.y)),'walkable seat '+n);
  }
});
test('V3.125 — all four GM adjustments and spacing use server-persisted room coordinates',()=>{
  assert.deepEqual({...layout.normalizeSeatOffset({x:100,y:-99})},{x:10,y:-10});
  assert.equal(layout.normalizeSeatSpacing(135),135);
  for(const n of [8,12,20,24,30]){
    const seats=layout.positions(n,'', {x:2,y:1},110);
    assert.equal(seats.length,n);
    assert.ok(seats.every(p=>layout.inside(p.x,p.y)));
    assert.ok(layout.positions(n,'',{x:0,y:0},100).some((p,i)=>p.x!==seats[i].x||p.y!==seats[i].y));
  }
  assert.match(worker,/meta\.seatOffset=seatOffset;meta\.seatSpacing=seatSpacing/);
  assert.match(worker,/villageLayout\.positions\(requested,seatLayout,seatOffset,seatSpacing\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout,seatOffset,seatSpacing\)/);
  assert.match(read('src/gmww-members-live.js'),/seatLayout:String\(room.seatLayout\|\|''\),seatOffset:\{x:Number\(room.seatOffset\?\.x\|\|0\),y:Number\(room.seatOffset\?\.y\|\|0\)\},seatSpacing:Number\(room.seatSpacing\|\|100\)/);
  assert.match(gm,/layout\.positions\(count,room\.seatLayout,room\.seatOffset,playGatherSpacing\(\)\*100\)/);
  for(const direction of ['left','right','up','down','reset'])assert.match(html,new RegExp('data-seat-shift="'+direction+'"'));
  assert.match(gm,/playUpdateRoomSettings\(\{seatOffset:next\}\)/);
});
test('V3.125 — fire and forbidden surroundings reject clicks and moving sprites remain legal',()=>{
  assert.equal(layout.inside(layout.fire.x,layout.fire.y),false,'center fire is forbidden');
  assert.equal(layout.inside(5,12),false,'house roofs are forbidden');
  assert.ok(layout.inside(50,75),'courtyard is walkable');
  const source={movementStatus:'moving',moveStartedAt:1000,moveDurationMs:2000,
    moveFromX:24,moveFromY:47,moveToX:75,moveToY:54};
  for(let t=1000;t<=3000;t+=50){
    const point=layout.interpolate(source,t);
    assert.ok(layout.inside(point.x,point.y),'forbidden movement at '+t+': '+JSON.stringify(point));
  }
});
test('V3.125 — Create Room has a single full-width enclosing layout',()=>{
  assert.match(css,/#playCreateRoomSheet>\.play-room-page-card\{[\s\S]*?flex-direction:column!important/);
  assert.match(css,/#playCreateRoomSheet \.play-room-picker-card,[\s\S]*?width:100%!important/);
  assert.match(css,/#playCreateRoomSheet \.play-room-control-row\{[\s\S]*?width:100%!important/);
});
test('V3.125 — one frozen orbit only, Wolf Bite has six 🐺 and no obsolete snow symbols',()=>{
  assert.match(effect,/wolf_bitten:\['🐺'\]/);
  assert.match(gm,/GMWW_STATUS_VISUALS\.overlay\(statusVisuals\)/);
  assert.match(css,/\.is-frozen \.play-player-avatar::before,[\s\S]*?content:none!important/);
  assert.match(villageCss,/\.player\.is-frozen:not\(\.gm\) \.portrait\.game-character::after\{[\s\S]*?content:none!important/);
});
test('V3.125 — idle loops and room heartbeats avoid redundant rendering',()=>{
  assert.match(gm,/const interval=sceneMoving\?33:220/);
  assert.match(gm,/dataset\.gmwwPlayerDomSig===domSig/);
  assert.match(player,/lastExternalRenderSignature/);
  assert.match(player,/if\(nextSig!==lastExternalRenderSignature\)/);
});
