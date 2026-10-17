import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;
const sizes=[8,10,12,14,16,18,20,22,24,25,26,27,28,29,30];
const shapes=['circle','ellipse','rectangle'];

test('all 15 Seat Mẫu capacities exist in circle, ellipse and rectangle, without duplicate locations or invalid world points',()=>{
  assert.deepEqual(Array.from(layout.seatTemplateCounts),sizes);
  assert.deepEqual(Array.from(layout.seatTemplateShapes),shapes);
  for(const size of sizes)for(const shape of shapes){
    const points=layout.positions(size,shape);
    assert.equal(points.length,size,shape+' '+size);
    for(const [i,p] of points.entries()){
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y),shape+size+' position '+i);
      assert.ok(layout.inside(p.x,p.y),shape+size+' remains inside the courtyard at seat '+(i+1));
    }
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const d=Math.hypot(points[i].x-points[j].x,(points[i].y-points[j].y)*1.8);
      assert.ok(d>3,shape+' '+size+' has colliding seats '+(i+1)+' / '+(j+1));
    }
  }
});

test('layouts are distinct and form a single outline around the fire',()=>{
  for(const size of sizes){
    const rendered=shapes.map(s=>JSON.stringify(layout.positions(size,s).map(p=>[p.x,p.y])));
    assert.equal(new Set(rendered).size,3,'different shapes must not reuse the same geometry for '+size);
    for(const shape of shapes){
      const points=layout.positions(size,shape);
      const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
      const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
      assert.ok(width>30&&height>25,shape+' '+size+' must use the wider courtyard');
    }
  }
  assert.equal(layout.positions(12).length,24,'legacy rooms retain legacy slot capacity');
  assert.ok(layout.positions(12).every(p=>p.ring===0),'legacy fallback has no inner ring');
  assert.equal(layout.positions(8,'circle').length,8,'a selected 8-slot layout is not forced to 24');
});

test('GM swipes the Gọi Người action menu, while dot samples stay in a separate closeable panel',()=>{
  const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css'),app=read('server-game/current/app.js');
  const order=['playGatherCall','playGatherSeatPreset','playGatherRandom','playGatherManual','playGatherConfirm','playGatherDisband'];
  let last=-1;for(const id of order){const i=html.indexOf('id="'+id+'"');assert.ok(i>last,id+' menu ordering');last=i}
  for(const id of ['playSeatPresetPanel','playSeatPresetClose','playSeatPresetGrid'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(html.includes('id="playSeatPresetAutoHint"'));
  assert.ok(!html.includes('data-play-seat-shape="circle"'));
  assert.match(css,/#playGatherToolbar\.play-gather-toolbar \.play-gather-toolbar-actions\{[\s\S]*?overflow-x:auto!important/);
  assert.match(css,/#playSeatPresetPanel\[hidden\]\{display:none!important\}/);
  assert.match(app,/function renderPlaySeatPresetPanel\(\)/);
  assert.match(app,/layout\.seatTemplatePositions\(n,shape\)/);
  assert.match(app,/playUpdateRoomSettings\(\{seatCount:count,seatLayout:shape\}\)/);
  assert.match(app,/function closePlaySeatPresetPanel\(\)/);
});

test('server owns layout revisions and broadcasts them to GM and Player Web without remapping seat IDs',()=>{
  const server=read('src/index.js'),roomContract=read('src/gmww-public-room-contract.js'),player=read('assets/village/village.mjs'),gm=read('server-game/current/app.js');
  assert.match(roomContract,/seatLayout:normalizeSeatLayout\(m\.seatLayout\)/);
  assert.match(server,/const reflow=seatLayout!==normalizeSeatLayout\(meta\.seatLayout\)/);
  assert.match(server,/const locations=villageLayout\.positions\(requested,seatLayout\)/);
  assert.match(server,/this\.broadcast\(\{type:"room_state",room,players:publicPlayers\}\)/);
  assert.match(server,/if\(meta\.seatsLocked/);
  assert.match(player,/seatLayout=layout\.normalizeSeatLayout\(room\.seatLayout\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout\)/);
  assert.match(gm,/layout\.positions\(count,preset\)/);
  assert.match(gm,/playSceneRuntime\.room\?\.seatLayout\?1:24/);
});
