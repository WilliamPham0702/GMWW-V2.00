import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../assets/village/village-layout.js';
const layout=globalThis.GMWW_VILLAGE_LAYOUT;
const src=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const built=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const close=(a,b)=>Math.abs(a-b)<1e-7;
test('50 to 300 percent is accepted exactly, normalizes invalid and sub-integer values',()=>{
 for(const [value,want] of [[-2,50],[50,50],[70,70],[100,100],[135,135],[248.8,249],[300,300],[500,300],[NaN,100]])
   assert.equal(layout.normalizeSeatSpacing(value),want);
});
test('300 percent expands true circle radius compared to legacy 135, while 50 contracts it',()=>{
 for(const count of [6,14,30]){
   const seats=(s)=>layout.positions(count,'circle',{x:0,y:0},s);
   const extent=(s)=>Math.max(...seats(s).map(p=>Math.abs(p.x-layout.fire.x)));
   assert.ok(extent(50)<extent(100));
   assert.ok(extent(300)>2.4*extent(100),`missing 300% extent for ${count}`);
   assert.ok(extent(135)>extent(100));
   assert.equal(seats(300).length,count);
 }
});
test('Large circles remain one uninterrupted ring and can pan to both viewport sides',()=>{
 for(const count of [6,14,30])for(const spacing of [50,100,135,200,300]){
   const start=layout.positions(count,'circle',{x:0,y:0},spacing);
   const baseline=layout.resolveSeatOffset(count,'circle',{x:0,y:0},spacing);
   for(const wanted of [{x:-200,y:0},{x:200,y:0},{x:0,y:-200},{x:0,y:200}]){
     const offset=layout.resolveSeatOffset(count,'circle',wanted,spacing);
     const seats=layout.positions(count,'circle',wanted,spacing);
     seats.forEach((p,i)=>{assert.ok(close(p.x-start[i].x,offset.x-baseline.x));assert.ok(close(p.y-start[i].y,offset.y-baseline.y));});
     const displayed=seats.some(p=>p.x>=2&&p.x<=98&&p.y>=2&&p.y<=98);
     assert.ok(displayed,`${count} ${spacing} ${JSON.stringify(wanted)}`);
   }
 }
});
test('pinch updates CSS anchors, does not replace characters, commits once after finger release',()=>{
 assert.doesNotMatch(html,/id="playGatherSpacing" type="range"/);
 assert.match(html,/id="playGatherSpacingValue" class="play-pinch-indicator"/);
 assert.match(html,/data-seat-shift="reset"/);
 assert.match(css,/#playWorld\.is-seat-drag-enabled\{touch-action:none/);
 for(const content of [src,built]){
   assert.match(content,/pointers\.size===2/);
   assert.match(content,/pinch\.startSpacing\*distance\(\)\/pinch.startDistance/);
   assert.match(content,/requestAnimationFrame\(\(\)=>\{previewFrame=0;if\(pinch\)playPreviewPinchSeats\(\)/);
   assert.match(content,/seat\.style\.left=pt\[0\]\+'%'/);
   assert.match(content,/playUpdateRoomSettings\(\{seatSpacing:finalValue,seatOffset:finalOffset/);
   assert.match(content,/playUpdateRoomSettings\(\{seatOffset:next\}\)/);
   assert.match(content,/seatOffset:\{x:0,y:0\},seatSpacing:100/);
   assert.match(content,/world\.addEventListener\('pointercancel'/);
 }
});
