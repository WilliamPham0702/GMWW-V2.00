import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const sandbox={};vm.runInNewContext(read('assets/village/village-layout.js'),sandbox);
const layout=sandbox.GMWW_VILLAGE_LAYOUT;
const dist=(a,b)=>Math.hypot(a.x-b.x,1.78*(a.y-b.y));
test('V3.191 ports PR #408: exactly 13 even Seat Mẫu, one 360° circle',()=>{
 assert.deepEqual(Array.from(layout.seatTemplateCounts),Array.from({length:13},(_,i)=>6+i*2));
 assert.deepEqual(Array.from(layout.seatTemplateShapes),['circle']);
 for(let n=6;n<=30;n++){
  assert.equal(layout.recommendedSeatShape(n),'circle');
  const seats=layout.positions(n,'circle');
  assert.equal(seats.length,n);
  assert.equal(new Set(seats.map(p=>p.x.toFixed(4)+','+p.y.toFixed(4))).size,n);
  assert.ok(seats.every(p=>p.ring===0&&layout.inside(p.x,p.y)));
  for(const p of seats){
   assert.ok(Math.hypot((p.x-layout.fire.x)/8.8,(p.y-layout.fire.y)/5.6)>=1,'fire collision');
  }
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
   assert.ok(dist(seats[i],seats[j])>5.2,'overlap '+n+' '+i+' '+j);
 }
});
test('legacy rooms retain Seat IDs and odd room sizes without rewriting assignments',()=>{
 for(const legacy of ['circle','ellipse','diamond','rectangle']){
  assert.equal(layout.normalizeSeatLayout(legacy),'circle');
  assert.deepEqual(layout.positions(17,legacy).map(p=>[p.x,p.y]),layout.positions(17,'circle').map(p=>[p.x,p.y]));
 }
 const rows=[{participantId:'a',seatId:5},{participantId:'b',seatId:2},{participantId:'c',seatId:0}];
 const assigned=layout.projectedSeatIds(rows,17);
 assert.equal(assigned.a,5);assert.equal(assigned.b,2);
 assert.ok(assigned.c>=1&&assigned.c<=17);
});
test('GM and Player Web receive synchronized layout; Character size and scene preserved',()=>{
 const gm=read('server-game/current/app.js'),part=read('server-game/src/30-village-and-setup.part');
 const html=read('server-game/current/GMWW.html'),player=read('assets/village/village.mjs');
 const worker=read('src/index.js');
 const version=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 for(const source of [gm,part]){
  assert.match(source,/const counts=Array\.from\(layout\.seatTemplateCounts\)/);
  assert.match(source,/PLAY_SEAT_PRESET_NAMES=\{circle:'HÌNH TRÒN'\}/);
  assert.match(source,/count<6\|\|count>30\|\|count%2!==0/);
  assert.match(source,/playUpdateRoomSettings\(\{seatCount:count,seatLayout:shape\}\)/);
 }
 assert.ok(html.includes('village-layout.js?v='+version+'-pinch-spacing'));
 assert.ok(player.includes('seat=3195-rigid'));
 assert.match(read('assets/village/index.html'),/seatfix=v3195-rigid/);
 assert.ok(worker.includes('VERSION="V'+version+'"'));
 assert.match(worker,/const locations=villageLayout\.positions\(requested,seatLayout,seatOffset,seatSpacing\)/);
 assert.match(read('server-game/current/style.css'),/body\.play-immersive \.play-player-avatar\{width:56px!important;height:74px!important\}/);
});
test('extreme supported spacing and offsets keep circular seats clear and unique',()=>{
 for(const n of [6,12,18,24,30])for(const [offset,spacing] of [[{x:-10,y:10},70],[{x:10,y:-10},135]]){
  const points=layout.positions(n,'circle',offset,spacing);
  assert.ok(points.every(p=>p.x>=2-1e-8&&p.x<=98+1e-8&&p.y>=2-1e-8&&p.y<=98+1e-8),'map frame');
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
    assert.ok(dist(points[i],points[j])>5,'overlap '+n+' '+spacing+' '+i+' '+j);
 }
});
