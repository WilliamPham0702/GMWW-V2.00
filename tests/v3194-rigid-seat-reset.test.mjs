import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../assets/village/village-layout.js';

const layout=globalThis.GMWW_VILLAGE_LAYOUT;
const near=(a,b,tolerance=1e-7)=>Math.abs(a-b)<=tolerance;
const shifts=[
  {x:0,y:0},{x:1,y:0},{x:-1,y:0},{x:0,y:-1},{x:0,y:1},
  {x:1,y:-12},{x:0,y:-13.4},{x:-24,y:25},{x:30,y:30},
  {x:-30,y:-30},{x:18,y:-23},{x:1.6,y:-9.3}
];

test('V3.194: all 6–30 seats retain identical relative vectors at ANY offset/spacing',()=>{
  for(let n=6;n<=30;n++)for(const spacing of [70,95,100,110,135]){
    const origin=layout.positions(n,'circle',{x:0,y:0},spacing);
    assert.equal(origin.length,n);
    for(const offset of shifts){
      const moved=layout.positions(n,'circle',offset,spacing);
      const effective=layout.resolveSeatOffset(n,'circle',offset,spacing);
      assert.equal(moved.length,n);
      for(let i=0;i<n;i++){
        assert.ok(layout.inside(moved[i].x,moved[i].y),
          'Seat '+(i+1)+' escaped safe courtyard, n='+n+' spacing='+spacing+' offset='+JSON.stringify(offset));
        assert.ok(near(moved[i].x-origin[i].x,effective.x),
          'Seat '+(i+1)+' deviates from rigid X translation for '+n);
        assert.ok(near(moved[i].y-origin[i].y,effective.y),
          'Seat '+(i+1)+' deviates from rigid Y translation for '+n);
        assert.equal(moved[i].ring,origin[i].ring);
        for(let j=0;j<i;j++){
          assert.ok(near(moved[i].x-moved[j].x,origin[i].x-origin[j].x),
            'Seats '+i+' and '+j+' changed horizontal separation');
          assert.ok(near(moved[i].y-moved[j].y,origin[i].y-origin[j].y),
            'Seats '+i+' and '+j+' changed vertical separation');
        }
      }
    }
  }
});

test('V3.194: the screenshot regression (8 seats at 95%, X1/Y-13.4) never sends a single leaf into the fire',()=>{
  const base=layout.positions(8,'circle',{x:0,y:0},95);
  const moved=layout.positions(8,'circle',{x:1,y:-13.4},95);
  const actual=layout.resolveSeatOffset(8,'circle',{x:1,y:-13.4},95);
  assert.equal(base.length,8);
  assert.ok(moved.every(p=>layout.inside(p.x,p.y)),'Every Seat stays on the courtyard, away from the fire');
  assert.ok(moved.every((p,i)=>near(p.x-base[i].x,actual.x)&&near(p.y-base[i].y,actual.y)),
    'Every Seat must get the exact same shift');
  assert.ok(actual.y>-13.4,'The full ring must stop before an individual seat enters the fire');
});

test('V3.194: reset restores the EXACT same geometry as the original 100% layout',()=>{
  for(let n=6;n<=30;n++){
    const original=layout.positions(n,'circle',{x:0,y:0},100);
    const restored=layout.positions(n,'circle',
      layout.resolveSeatOffset(n,'circle',{x:0,y:0},100),100);
    assert.deepEqual(restored,original,'Reset must be deterministic for '+n+' Seats');
  }
});

test('V3.194: arrow and drag are whole-ring commands only; button reset also restores spacing',()=>{
  const source=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const bundled=fs.readFileSync('server-game/current/app.js','utf8');
  for(const code of [source,bundled]){
    assert.match(code,/seatOffset:\{x:0,y:0\},seatSpacing:100/);
    assert.match(code,/layout\.resolveSeatOffset/);
    assert.match(code,/playSeatOffsetPreview,playGatherSpacing\(\)/,
      'Preview offsets must invalidate actor DOM cache during drag');
    assert.match(code,/world\.addEventListener\('pointermove'/);
    assert.match(code,/world\.addEventListener\('pointerup'/);
    assert.doesNotMatch(code,/GM may drag an occupied Seat onto another/);
    assert.doesNotMatch(code,/el\.addEventListener\('pointermove',[\s\S]{0,380}is-seat-dragging/);
  }
  const server=fs.readFileSync('src/index.js','utf8');
  const player=fs.readFileSync('assets/village/village.mjs','utf8');
  assert.match(server,/seatOffset=villageLayout\.resolveSeatOffset/);
  assert.match(player,/seat=3194-rigid/);
});

test('V3.194: no point-specific clampPoint correction in rendering fixed Seats',()=>{
  const s=fs.readFileSync('assets/village/village-layout.js','utf8');
  const section=s.slice(s.indexOf('  function positions('),s.indexOf('  // Presentation/transition repair:'));
  assert.match(section,/return base\.map\(p=>/);
  assert.doesNotMatch(section,/clampPoint\(/);
});
