import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const sandbox={};
vm.runInNewContext(read('assets/village/village-layout.js'),sandbox);
const layout=sandbox.GMWW_VILLAGE_LAYOUT;
const distance=(a,b)=>Math.hypot(a.x-b.x,1.78*(a.y-b.y));
const sizes=Array.from({length:13},(_,i)=>6+i*2);

test('Seat Mau offers only 6,8,...,30 places; existing odd-size rooms still work',()=>{
 assert.deepEqual(Array.from(layout.seatTemplateCounts),sizes);
 assert.deepEqual(Array.from(layout.seatTemplateShapes),['circle']);
 for(let n=6;n<=30;n++){
  assert.equal(layout.recommendedSeatShape(n),'circle');
  assert.equal(layout.positions(n).length,n);
 }
 for(const prior of ['ellipse','diamond','rectangle'])
  assert.equal(layout.normalizeSeatLayout(prior),'circle','legacy layout '+prior+' renders as circle');
 const gm=read('server-game/current/app.js'),source=read('server-game/src/30-village-and-setup.part');
 for(const s of [gm,source]){
  assert.match(s,/PLAY_SEAT_PRESET_NAMES=\{circle:'VÒNG TRÒN 360°'\}/);
  assert.match(s,/const counts=layout\.seatTemplateCounts\.filter\(n=>n>=minimum\)/);
  assert.match(s,/count<6\|\|count>30/);
  assert.doesNotMatch(s,/Bố trí 2,5D theo tầng/);
 }
});

test('every 6..30 seat ring is one closed circle in perspective and avoids fire',()=>{
 for(let n=6;n<=30;n++){
  const seats=layout.positions(n,'circle');
  assert.equal(seats.length,n);
  assert.equal(new Set(seats.map(p=>p.x.toFixed(5)+','+p.y.toFixed(5))).size,n);
  assert.ok(seats.every(p=>p.ring===0&&layout.inside(p.x,p.y)));
  const radiusX=Math.min(35,22+(n-6)*0.54),radiusY=radiusX/1.78;
  for(const p of seats){
   const dx=p.x-layout.fire.x,dy=p.y-layout.fire.y;
   const radialError=Math.abs((dx/radiusX)**2+(dy/radiusY)**2-1);
   assert.ok(radialError<0.0015,'seat '+n+' left perspective circle: '+radialError);
  }
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
   assert.ok(distance(seats[i],seats[j])>5.2,'seat overlap '+n+' '+i+'/'+j);
  for(const legacy of ['ellipse','diamond','rectangle'])
   assert.deepEqual(layout.positions(n,legacy).map(p=>[p.x,p.y]),seats.map(p=>[p.x,p.y]));
 }
});

test('old seat assignments remain stable after a circular reflow',()=>{
 const saved=[{participantId:'a',seatId:5},{participantId:'b',seatId:2},{participantId:'c',seatId:0}];
 const mapping=layout.projectedSeatIds(saved,14);
 assert.equal(mapping.a,5);
 assert.equal(mapping.b,2);
 assert.ok(mapping.c>=1&&mapping.c<=14);
 const previous=layout.positions(14,'diamond');
 const next=layout.positions(14,'circle');
 for(const p of saved.filter(x=>x.seatId))assert.deepEqual(previous[p.seatId-1],next[p.seatId-1]);
});

test('GM, Player Web and Worker load same shared Seat layout without stale cache',()=>{
 const gm=read('server-game/current/GMWW.html'),player=read('assets/village/village.mjs');
 const index=read('assets/village/index.html'),worker=read('src/index.js');
 assert.match(gm,/village-layout\.js\?v=3\.187-circle360-ci-fix/);
 assert.match(player,/village-layout\.js\?v=fire3101-gp2&seat=3187-circle360-ci-fix/);
 assert.match(index,/seatfix=v3187-circle360-ci-fix/);
 assert.match(worker,/villageLayout\.positions/);
 assert.match(read('server-game/src/30-village-and-setup.part'),/seatTemplateCounts/);
});
