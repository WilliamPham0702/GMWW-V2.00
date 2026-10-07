import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../assets/village/village-layout.js');
const layout=globalThis.GMWW_VILLAGE_LAYOUT;
const {villageAutoLife,VILLAGE_AUTO_SIT_MS}=await import('../src/gmww-village-autolife.js');

function timeline(id,anchor=1_000_000){
  const rows=[];
  for(let ms=0;ms<=70_000;ms+=500){
    rows.push({ms,...villageAutoLife({id,now:anchor+ms,anchorAt:anchor,anchorPoint:layout.spawn(id),stagger:false},layout)});
  }
  return rows;
}

test('each character moves, pauses, sits exactly 30 seconds, then moves again',()=>{
  const rows=timeline('member:alpha'),sit=rows.find(x=>x.villageActivity==='sitting');
  assert.ok(rows.some(x=>x.movementStatus==='moving'),'must move');
  assert.ok(rows.some(x=>x.movementStatus==='idle'&&x.villageActivity==='idle'),'must stand at destination before sitting');
  assert.ok(sit,'must sit');
  assert.equal(sit.sitUntil-sit.sitStartedAt,VILLAGE_AUTO_SIT_MS);
  assert.ok(rows.some(x=>x.ms>sit.sitUntil-1_000_000&&x.movementStatus==='moving'),'must move again after sitting');
});

test('different characters roam to different safe points',()=>{
  const a=timeline('member:alpha').find(x=>x.villageActivity==='sitting');
  const b=timeline('member:beta').find(x=>x.villageActivity==='sitting');
  assert.ok(a&&b);
  assert.ok(Math.hypot(a.positionX-b.positionX,a.positionY-b.positionY)>.5,'targets must differ');
  assert.ok(layout.inside(a.positionX,a.positionY));
  assert.ok(layout.inside(b.positionX,b.positionY));
});

test('Player Web sitting is explicit, not permanent because seatId exists',()=>{
  const village=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
  assert.match(village,/function sittingNow[^\n]+villageActivity==="sitting"/);
  assert.doesNotMatch(village,/function sittingNow[^\n]+seatId/);
  assert.match(village,/state=sitting\?"sitting"/);
});

test('actual Player Web renderer handles sitting and visible idle sequence for all 20',()=>{
  const renderer=fs.readFileSync(new URL('../assets/village/character-renderer.mjs',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../assets/village/character-renderer.css',import.meta.url),'utf8');
  assert.match(renderer,/length:20/);
  assert.match(renderer,/['"]sitting['"]/);
  assert.match(renderer,/['"]sit['"]/);
  assert.doesNotMatch(renderer,/&&\s*!sitting\s*\?/);
  assert.match(renderer,/LIVE_IDLE_SLOT_MS=4800/);
  for(const token of ['gmww-rig-stretch-torso','gmww-rig-sit-body'])assert.ok(css.includes(token),token);
});

test('server no longer sends gather motion to the fixed fire point',()=>{
  const worker=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.ok(worker.includes('villageAutoPoint("member:"'));
  assert.ok(worker.includes('villageAutoLife({id'));
  assert.ok(!worker.includes('villageGatherPoint(id,gatherIds)'));
});
