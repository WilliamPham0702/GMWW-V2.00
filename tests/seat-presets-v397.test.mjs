import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;
const sizes=[8,10,12,14,16,18,20,24,25,26,27,28,29,30];
const shapes=['circle','diamond','rectangle'];

test('all Seat Mẫu counts from 8 through 30 remain distinct, in bounds and touchable',()=>{
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

test('layouts are distinct and expand the village area compared with the legacy fire rings',()=>{
  for(const size of sizes){
    const rendered=shapes.map(s=>JSON.stringify(layout.positions(size,s).map(p=>[p.x,p.y])));
    assert.equal(new Set(rendered).size,3,'different shapes must not reuse the same geometry for '+size);
    for(const shape of shapes){
      const points=layout.positions(size,shape);
      const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
      const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
      assert.ok(width>30&&height>20,shape+' '+size+' must use the fire-centered courtyard without reaching rooftops');
    }
  }
  assert.equal(layout.positions(12).length,24,'legacy rooms retain legacy slots');
  assert.equal(layout.positions(8,'circle').length,8,'a selected 8-slot layout is not forced to 24');
});

test('GM swipes the Gọi Người action menu, while dot samples stay in a separate closeable panel',()=>{
  const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css'),app=read('server-game/current/app.js');
  const order=['playGatherCall','playGatherSeatPreset','playGatherRandom','playGatherManual','playGatherConfirm','playGatherDisband'];
  let last=-1;for(const id of order){const i=html.indexOf('id="'+id+'"');assert.ok(i>last,id+' menu ordering');last=i}
  for(const id of ['playSeatPresetPanel','playSeatPresetClose','playSeatPresetGrid'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(!html.includes('data-play-seat-shape='),'shape tabs removed in favour of per-count recommendations');
  assert.match(css,/#playGatherToolbar\.play-gather-toolbar \.play-gather-toolbar-actions\{[\s\S]*?overflow-x:auto!important/);
  assert.match(css,/#playSeatPresetPanel\[hidden\]\{display:none!important\}/);
  assert.match(app,/function renderPlaySeatPresetPanel\(\)/);
  assert.match(app,/layout\.seatTemplatePositions\(n,shape\)/);
  assert.match(app,/playUpdateRoomSettings\(\{seatCount:count,seatLayout:shape\}\)/);
  assert.match(app,/function closePlaySeatPresetPanel\(\)/);
});

test('server owns layout revisions and broadcasts them to GM and Player Web without remapping seat IDs',()=>{
  const server=read('src/index.js'),player=read('assets/village/village.mjs'),gm=read('server-game/current/app.js');
  assert.match(server,/seatLayout:normalizeSeatLayout\(m\.seatLayout\)/);
  assert.match(server,/const reflow=seatLayout!==normalizeSeatLayout\(meta\.seatLayout\)/);
  assert.match(server,/const locations=villageLayout\.positions\(requested,seatLayout\)/);
  assert.match(server,/this\.broadcast\(\{type:"room_state",room,players:publicPlayers\}\)/);
  assert.match(server,/if\(meta\.seatsLocked/);
  assert.match(player,/seatLayout=layout\.normalizeSeatLayout\(room\.seatLayout\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout\)/);
  assert.match(gm,/GMWW_VILLAGE_LAYOUT\.positions\(count,preset\)/);
  assert.match(gm,/playSceneRuntime\.room\?\.seatLayout\?1:24/);
});

test('recommended count selects the intended shape, not the last global shape tab',()=>{
  const recommendation={8:'circle',10:'circle',12:'circle',14:'diamond',16:'diamond',
    18:'diamond',20:'rectangle',24:'rectangle',25:'rectangle',26:'rectangle',
    27:'rectangle',28:'rectangle',29:'rectangle',30:'rectangle'};
  for(const [count,shape] of Object.entries(recommendation))
    assert.equal(layout.seatTemplateRecommendedShape(Number(count)),shape,count);
  const app=read('server-game/current/app.js');
  assert.match(app,/const shape=layout\.seatTemplateRecommendedShape\(n\)/);
  assert.match(app,/playApplySeatPreset\(n,shape\)/);
  assert.match(app,/shapeLabel\.textContent='Đề xuất: '/);
  assert.match(app,/const fire=document\.createElement\('i'\)/);
  assert.match(app,/fire\.style\.left='50%';fire\.style\.top='50%'/);
});

test('fire, not lower village at y=61, is the center of every sample and 25–30 templates',()=>{
  const fire=layout.fire;
  assert.equal(fire.x,50);assert.equal(fire.y,49.7);
  for(let count=8;count<=30;count++){
    const shape=layout.seatTemplateRecommendedShape(count);
    const points=layout.seatTemplatePositions(count,shape);
    assert.equal(points.length,count);
    const cx=(Math.max(...points.map(p=>p.x))+Math.min(...points.map(p=>p.x)))/2;
    const cy=(Math.max(...points.map(p=>p.y))+Math.min(...points.map(p=>p.y)))/2;
    assert.ok(Math.abs(cx-fire.x)<2,shape+' '+count+' fire-centered horizontally');
    assert.ok(Math.abs(cy-fire.y)<2,shape+' '+count+' fire-centered vertically');
    for(const p of points){
      assert.ok(layout.inside(p.x,p.y),count+' seat remains in village courtyard');
      assert.ok(Math.hypot((p.x-fire.x)/6,(p.y-fire.y)/3)>1.05,count+' must not overlap campfire');
    }
    const minSpacing=Math.min(...points.flatMap((p,i)=>points.slice(i+1).map(q=>Math.hypot(p.x-q.x,(p.y-q.y)*2))));
    assert.ok(minSpacing>6,shape+' '+count+' tap targets should not cluster');
  }
});
