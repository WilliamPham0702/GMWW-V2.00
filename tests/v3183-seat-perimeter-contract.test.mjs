import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const sandbox={};
vm.runInNewContext(read('assets/village/village-layout.js'),sandbox);
const layout=sandbox.GMWW_VILLAGE_LAYOUT;
const dist=(a,b)=>Math.hypot(a.x-b.x,1.78*(a.y-b.y));

test('Seat Mau offers 6,8,...30 while existing odd-size rooms remain playable',()=>{
  assert.deepEqual(Array.from(layout.seatTemplateCounts),Array.from({length:13},(_,i)=>6+2*i));
  assert.deepEqual(Array.from(layout.seatTemplateShapes),['circle']);
  for(let n=6;n<=30;n++){
    assert.equal(layout.recommendedSeatShape(n),'circle');
    assert.equal(layout.positions(n).length,n);
  }
  for(const legacy of ['circle','ellipse','diamond','rectangle'])
    assert.equal(layout.normalizeSeatLayout(legacy),'circle','legacy room shape maps to circle');
  const gm=read('server-game/current/app.js');
  const source=read('server-game/src/30-village-and-setup.part');
  for(const s of [gm,source]){
    assert.match(s,/PLAY_SEAT_PRESET_NAMES=\{circle:'VÒNG TRÒN 360°'\}/);
    assert.match(s,/const counts=layout\.seatTemplateCounts\.filter\(n=>n>=minimum\)/);
    assert.match(s,/count<6\|\|count>30/);
    assert.doesNotMatch(s,/Bố trí 2,5D theo tầng/);
  }
});

test('all 6–30 rooms use fire-centered perspective circular perimeter, safe and unique',()=>{
 for(let n=6;n<=30;n++)for(const shape of ['circle','ellipse','diamond','rectangle']){
  const seats=layout.positions(n,shape);
  assert.equal(seats.length,n);
  assert.equal(new Set(seats.map(p=>p.x.toFixed(4)+','+p.y.toFixed(4))).size,n);
  assert.ok(seats.every(p=>p.ring===0));
  const rx=Math.min(35,22+(n-6)*0.54),ry=rx/1.78;
  for(const p of seats){
   assert.ok(layout.inside(p.x,p.y),n+' '+shape+' invalid ground');
   const dx=p.x-layout.fire.x,dy=p.y-layout.fire.y;
   const err=Math.abs((dx/rx)**2+(dy/ry)**2-1);
   assert.ok(err<0.001,n+' '+shape+' fell off circle (error '+err+')');
  }
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
   assert.ok(dist(seats[i],seats[j])>5.2,n+' '+shape+' overlapping seats '+(i+1)+'/'+(j+1));
 }
});

test('legacy layouts and seat swaps retain all previously assigned Seat IDs',()=>{
 const seats=layout.positions(14,'circle');
 for(const legacy of ['ellipse','diamond','rectangle'])
   assert.deepEqual(layout.positions(14,legacy).map(p=>[p.x,p.y]),seats.map(p=>[p.x,p.y]));
 const mapping=layout.projectedSeatIds([
  {participantId:'a',seatId:5},{participantId:'b',seatId:2},
  {participantId:'c',seatId:0}
 ],14);
 assert.equal(mapping.a,5);
 assert.equal(mapping.b,2);
 assert.ok(mapping.c>=1&&mapping.c<=14);
 assert.ok(seats[mapping.a-1]&&seats[mapping.b-1]);
});

test('offsets and spacing keep 30 seats on walkable village ground',()=>{
 for(const n of [6,8,12,18,24,30]){
  for(const [offset,spacing] of [[{x:10,y:-10},135],[{x:-10,y:10},70]]){
   const ps=layout.positions(n,'circle',offset,spacing);
   assert.ok(ps.every(p=>layout.inside(p.x,p.y)));
   for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
    assert.ok(dist(ps[i],ps[j])>5.2,'collision after spacing '+n+' '+i+'/'+j);
  }
 }
});

test('GM and Player Web use matching shared layout and native shell remains intact',()=>{
 const gm=read('server-game/current/GMWW.html');
 const player=read('assets/village/village.mjs');
 const worker=read('src/index.js');
 const version=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
 assert.match(gm,/village-layout\.js\?v=3\.187-circle360-presets-even/);
 assert.match(player,/village-layout\.js\?v=fire3101-gp2&seat=3187-circle360-presets-even/);
 assert.match(read('assets/village/index.html'),/seatfix=v3183/);
 assert.ok(worker.includes('VERSION="V'+version+'",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-'+version.replaceAll('.','')+'"'));
 assert.match(read('.github/scripts/prepare-update-channel.mjs'),/"V3\.183: Khôi phục/);
});
