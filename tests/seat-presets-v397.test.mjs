import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ctx=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;
const sizes=[8,10,12,14,16,18,20,22,24,25,26,27,28,29,30];
const shapes=['circle','diamond','rectangle'];

test('all Seat Mẫu choices include every size 25–30 plus earlier sizes',()=>{
  assert.deepEqual(Array.from(layout.seatTemplateCounts),sizes);
  assert.deepEqual(Array.from(layout.seatTemplateShapes),shapes);
  assert.equal(layout.autoSeatShape(8),'circle');
  assert.equal(layout.autoSeatShape(12),'circle');
  assert.equal(layout.autoSeatShape(13),'diamond');
  assert.equal(layout.autoSeatShape(18),'diamond');
  assert.equal(layout.autoSeatShape(19),'rectangle');
  assert.equal(layout.autoSeatShape(30),'rectangle');
});

test('every 8–30 player grouping is truly centered on the campfire in all three shapes',()=>{
  assert.equal(layout.fire.x,50);
  assert.equal(layout.fire.y,49.7);
  for(let n=8;n<=30;n++)for(const shape of shapes){
    const points=layout.positions(n,shape);
    assert.equal(points.length,n,shape+' '+n);
    const cx=points.reduce((a,p)=>a+p.x,0)/n;
    const cy=points.reduce((a,p)=>a+p.y,0)/n;
    assert.ok(Math.abs(cx-layout.fire.x)<.7,shape+' '+n+' X centered on campfire, not a lower ground point');
    assert.ok(Math.abs(cy-layout.fire.y)<.7,shape+' '+n+' Y centered on campfire, not y=61/65');
    for(const [i,p] of points.entries()){
      assert.ok(layout.inside(p.x,p.y),shape+' '+n+' seat '+(i+1)+' is outside walkable village');
      const fireClearance=Math.hypot((p.x-layout.fire.x)/6,(p.y-layout.fire.y)/3);
      assert.ok(fireClearance>1.01,shape+' '+n+' seat '+(i+1)+' collides with fire');
    }
    let closest=Infinity;
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const distance=Math.hypot(points[i].x-points[j].x,(points[i].y-points[j].y)*1.8);
      closest=Math.min(closest,distance);
    }
    assert.ok(closest>5,shape+' '+n+' has piled-up players: '+closest);
  }
});

test('dense 25–30 groups use three separate rings, and existing legacy rooms keep their seats',()=>{
  for(let n=25;n<=30;n++){
    const result=layout.positions(n,layout.autoSeatShape(n));
    assert.deepEqual([...new Set(result.map(p=>p.ring))],[0,1,2]);
    assert.equal(result.length,n);
  }
  for(let n=8;n<=24;n++){
    const p=layout.positions(n,layout.autoSeatShape(n));
    assert.ok(new Set(p.map(x=>x.ring)).size<=2);
  }
  assert.equal(layout.positions(12).length,24,'legacy rooms retain their original positions');
  assert.equal(layout.positions(8,'circle').length,8);
  for(const size of sizes){
    const rendered=shapes.map(s=>JSON.stringify(layout.positions(size,s).map(p=>[p.x,p.y])));
    assert.equal(new Set(rendered).size,3,'distinct shapes produce distinct positions '+size);
  }
});

test('GM menu swipes horizontally; Seat selector presents count-specific dots and a central fire marker',()=>{
  const html=read('server-game/current/GMWW.html'),css=read('server-game/current/style.css'),app=read('server-game/current/app.js');
  const order=['playGatherCall','playGatherSeatPreset','playGatherRandom','playGatherManual','playGatherConfirm','playGatherDisband'];
  let last=-1;for(const id of order){const i=html.indexOf('id="'+id+'"');assert.ok(i>last,id+' menu order');last=i}
  for(const id of ['playSeatPresetPanel','playSeatPresetClose','playSeatPresetGrid'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(!html.includes('data-play-seat-shape="circle"'),'no manual shape selection needed');
  assert.match(css,/#playGatherToolbar\.play-gather-toolbar \.play-gather-toolbar-actions\{[\s\S]*?overflow-x:auto!important/);
  assert.match(css,/#playSeatPresetPanel\[hidden\]\{display:none!important\}/);
  assert.match(css,/\.play-seat-preset-fire/);
  assert.match(app,/function renderPlaySeatPresetPanel\(\)/);
  assert.match(app,/layout\.autoSeatShape\(n\)/);
  assert.match(app,/layout\.seatTemplatePositions\(n,shape\)/);
  assert.match(app,/actualCount>0\?\[actualCount\]/);
  assert.match(app,/playUpdateRoomSettings\(\{seatCount:count,seatLayout:'auto'\}\)/);
  assert.match(app,/function closePlaySeatPresetPanel\(\)/);
});

test('Worker stores selected seat count and auto-shape; GM and Player Web draw the same map positions',()=>{
  const server=read('src/index.js'),player=read('assets/village/village.mjs'),gm=read('server-game/current/app.js');
  assert.match(server,/seatLayout:normalizeSeatLayout\(m\.seatLayout\)/);
  assert.match(server,/const autoLayout=body\?\.seatLayout==='auto'/);
  assert.match(server,/villageLayout\.autoSeatShape\(requested\)/);
  assert.match(server,/const reflow=seatLayout!==normalizeSeatLayout\(meta\.seatLayout\)/);
  assert.match(server,/const locations=villageLayout\.positions\(requested,seatLayout\)/);
  assert.match(server,/this\.broadcast\(\{type:"room_state",room,players:publicPlayers\}\)/);
  assert.match(server,/if\(meta\.seatsLocked/);
  assert.match(player,/seatLayout=layout\.normalizeSeatLayout\(room\.seatLayout\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout\)/);
  assert.match(gm,/GMWW_VILLAGE_LAYOUT\.positions\(count,preset\)/);
});
