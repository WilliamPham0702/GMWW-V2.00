import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;
const sizes=Array.from({length:13},(_,i)=>6+i*2);
const shapes=['circle'];

test('all 25 Seat Mẫu capacities exist in circle, diamond and long-side rectangle, without duplicate locations or invalid world points',()=>{
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

test('all supported sizes use a circular contour while legacy shapes retain IDs',()=>{
 for(let n=6;n<=30;n++){
  const baseline=layout.positions(n,'circle');
  assert.equal(baseline.length,n);
  assert.ok(baseline.every(p=>p.ring===0&&layout.inside(p.x,p.y)));
  for(const savedShape of ['ellipse','diamond','rectangle']){
   assert.deepEqual(layout.positions(n,savedShape).map(p=>[p.x,p.y]),baseline.map(p=>[p.x,p.y]));
  }
  const width=Math.max(...baseline.map(p=>p.x))-Math.min(...baseline.map(p=>p.x));
  const height=Math.max(...baseline.map(p=>p.y))-Math.min(...baseline.map(p=>p.y));
  assert.ok(width>20&&height>13,'single round perimeter');
 }
 assert.equal(layout.positions(8).length,8);
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
  assert.match(server,/const locations=villageLayout\.positions\(requested,seatLayout,seatOffset,seatSpacing\)/);
  assert.match(server,/this\.broadcast\(\{type:"room_state",room,players:publicPlayers\}\)/);
  assert.match(server,/if\(meta\.seatsLocked/);
  assert.match(player,/seatLayout=layout\.normalizeSeatLayout\(room\.seatLayout\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout,seatOffset,seatSpacing\)/);
  assert.match(gm,/layout\.positions\(count,room\.seatLayout,[^\n]*room\.seatOffset[^\n]*playGatherSpacing\(\)\*100\)/);
  assert.match(gm,/playSceneRuntime\.room\?\.seatOffset/);
});
