import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../assets/village/village-layout.js';

const layout=globalThis.GMWW_VILLAGE_LAYOUT;
const close=(a,b)=>Math.abs(a-b)<1e-7;
const frame=p=>p.x>=2-1e-8&&p.x<=98+1e-8&&p.y>=2-1e-8&&p.y<=98+1e-8;

test('Seat drag regression: 8 seats at 135% can continue up past Y -8.4',()=>{
  const original=layout.positions(8,'circle',{x:0,y:0},135);
  const requested={x:-1.3,y:-28.4};
  const actual=layout.resolveSeatOffset(8,'circle',requested,135);
  assert.equal(actual.x,requested.x);
  assert.equal(actual.y,requested.y);
  const moved=layout.positions(8,'circle',requested,135);
  assert.ok(moved.every(frame));
  for(let i=0;i<8;i++){
    assert.ok(close(moved[i].x-original[i].x,actual.x));
    assert.ok(close(moved[i].y-original[i].y,actual.y));
  }
});

test('Any 6–30 Seat formation can be dragged to all four map edges, never split or clipped',()=>{
  for(let count=6;count<=30;count++)for(const spacing of [70,100,135]){
    const origin=layout.positions(count,'circle',{x:0,y:0},spacing);
    for(const [direction,request] of Object.entries({
      left:{x:-100,y:0},right:{x:100,y:0},
      top:{x:0,y:-100},bottom:{x:0,y:100},
      diagonal:{x:100,y:-100}
    })){
      const shift=layout.resolveSeatOffset(count,'circle',request,spacing);
      const moved=layout.positions(count,'circle',request,spacing);
      assert.ok(moved.every(frame),'off-map '+count+' '+spacing+' '+direction);
      for(let i=0;i<count;i++){
        assert.ok(close(moved[i].x-origin[i].x,shift.x),'split X '+count);
        assert.ok(close(moved[i].y-origin[i].y,shift.y),'split Y '+count);
      }
      const xs=moved.map(p=>p.x),ys=moved.map(p=>p.y);
      if(direction==='left')assert.ok(Math.min(...xs)<2.2);
      if(direction==='right')assert.ok(Math.max(...xs)>97.8);
      if(direction==='top')assert.ok(Math.min(...ys)<2.2);
      if(direction==='bottom')assert.ok(Math.max(...ys)>97.8);
    }
  }
});

test('Pinch spacing 50–300%, restore button and one-pointer drag coexist',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const src=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
  const bundled=fs.readFileSync('server-game/current/app.js','utf8');
  assert.doesNotMatch(html,/id="playGatherSpacing" type="range"/);
  assert.match(html,/id="playGatherSpacingValue"/);
  assert.match(html,/data-seat-shift="reset"[^>]*>🔄<\/button>/);
  assert.doesNotMatch(html,/data-seat-shift="(?:left|right|up|down)"/);
  assert.doesNotMatch(html,/id="playSeatOffsetValue"/);
  for(const js of [src,bundled]){
    assert.match(js,/world\.addEventListener\('pointermove'/);
    assert.match(js,/world\.addEventListener\('pointerup'/);
    assert.match(js,/playUpdateRoomSettings\(\{seatOffset:next\}\)/);
    assert.match(js,/seatOffset:\{x:0,y:0\},seatSpacing:100/);
    assert.doesNotMatch(js,/const delta=\{left:/);
  }
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/seatOffset=villageLayout\.resolveSeatOffset/);
  assert.match(fs.readFileSync('assets/village/village.mjs','utf8'),/layout\.normalizeSeatOffset\(room\.seatOffset\)/);
});
