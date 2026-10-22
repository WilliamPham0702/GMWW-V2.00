import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const sandbox={};
vm.runInNewContext(read('assets/village/village-layout.js'),sandbox);
const layout=sandbox.GMWW_VILLAGE_LAYOUT;
const dist=(a,b)=>Math.hypot(a.x-b.x,1.78*(a.y-b.y));

test('seat menu supports every player count 6..30 and true three-shape recommendation',()=>{
 assert.deepEqual(Array.from(layout.seatTemplateCounts),Array.from({length:25},(_,i)=>i+6));
 assert.deepEqual(Array.from(layout.seatTemplateShapes),['circle','diamond','rectangle']);
 for(let n=6;n<=30;n++){
  assert.equal(layout.recommendedSeatShape(n),n<=12?'circle':n<=20?'diamond':'rectangle');
  assert.equal(layout.positions(n).length,n);
 }
 assert.equal(layout.normalizeSeatLayout('ellipse'),'diamond','legacy rooms migrate without Seat ID loss');
 const gm=read('server-game/current/app.js');
 const source=read('server-game/src/30-village-and-setup.part');
 for(const s of [gm,source]){
  assert.match(s,/PLAY_SEAT_PRESET_NAMES=\{circle:'HÌNH TRÒN',diamond:'HÌNH THOI',rectangle:'CHỮ NHẬT'\}/);
  assert.match(s,/const exactCount=Math.max\(6,Math.min\(30,minimum\)\)/);
  assert.match(s,/count<6\|\|count>30/);
  assert.doesNotMatch(s,/Bố trí 2,5D theo tầng/);
 }
});

test('all 6–30 seats follow ONE correct outline and stay clear of fire and scenery',()=>{
 for(let n=6;n<=30;n++)for(const shape of ['circle','diamond','rectangle']){
  const seats=layout.positions(n,shape);
  assert.equal(seats.length,n,`${n} ${shape} seat count`);
  assert.equal(new Set(seats.map(p=>p.x.toFixed(4)+','+p.y.toFixed(4))).size,n);
  assert.ok(seats.every(p=>p.ring===0));
  for(const p of seats){
   assert.ok(layout.inside(p.x,p.y),`${n} ${shape} invalid ground ${p.x},${p.y}`);
   const dx=Math.abs(p.x-layout.fire.x),dy=Math.abs(p.y-layout.fire.y);
   const err=shape==='circle'?Math.abs((dx/31)**2+(dy/18)**2-1):
     shape==='diamond'?Math.abs(dx/32+dy/27-1):
     Math.min(Math.abs(dx-30),Math.abs(dy-27));
   assert.ok(err<0.015,`${n} ${shape} became a grid/off-perimeter (error ${err})`);
  }
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
   assert.ok(dist(seats[i],seats[j])>5.2,`${n} ${shape}: overlapping seats ${i+1}/${j+1}`);
 }
});

test('rectangles prioritize the two long side edges and templates preserve Seat IDs',()=>{
 for(const n of [21,24,27,30]){
  const ps=layout.positions(n,'rectangle');
  const side=ps.filter(p=>Math.abs(Math.abs(p.x-layout.fire.x)-30)<1e-5);
  assert.ok(side.length>=Math.floor(n*.45),`${n} side-long rectangle flattened`);
 }
 const base=layout.positions(14,'diamond');
 assert.equal(layout.positions(14,'ellipse').length,14,'existing ellipse rooms still load');
 const mapping=layout.projectedSeatIds([
  {participantId:'a',seatId:5},{participantId:'b',seatId:2},
  {participantId:'c',seatId:0}
 ],14);
 assert.equal(mapping.a,5);
 assert.equal(mapping.b,2);
 assert.ok(mapping.c>=1&&mapping.c<=14);
 assert.ok(base[mapping.a-1]&&base[mapping.b-1]);
});

test('GM and Player Web load same cache-busted layout and retain native shell',()=>{
 const gm=read('server-game/current/GMWW.html');
 const player=read('assets/village/village.mjs');
 const worker=read('src/index.js');
 const version=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 assert.ok(gm.includes('village-layout.js?v='+version+'-seat-ring-recovery'));
 assert.match(player,/village-layout\.js\?v=fire3101-gp2&seat=3183-perimeter/);
 assert.match(read('assets/village/index.html'),/seatfix=v3183/);
 assert.ok(worker.includes('VERSION="V'+version+'",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-'+version.replaceAll('.','')+'"'));
 assert.match(read('.github/scripts/prepare-update-channel.mjs'),/releaseNotes:\["V3\.183: Khôi phục/);
});
