import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arenaPlayerPixelRatio} from '../assets/village/arena-3d/render-optimization.mjs';
const player=readFileSync('assets/village/arena-3d/player.mjs','utf8');

test('GĐ41–42: responsive framebuffer budget for 6–30 characters on 1x/3x displays',()=>{
 for(const count of [0,6,12,19]){
  assert.equal(arenaPlayerPixelRatio({characters:count,devicePixelRatio:3}),1.1);
 }
 for(const count of [20,24,30]){
  assert.equal(arenaPlayerPixelRatio({characters:count,devicePixelRatio:3}),.85);
  assert.equal(arenaPlayerPixelRatio({characters:count,devicePixelRatio:1}),.85);
 }
 assert.equal(arenaPlayerPixelRatio({characters:6,devicePixelRatio:.75}),.75);
 assert.equal(arenaPlayerPixelRatio({characters:20,devicePixelRatio:.75}),.75);
 assert.equal(arenaPlayerPixelRatio({characters:20,devicePixelRatio:0}),.85);
 assert.equal(arenaPlayerPixelRatio({characters:NaN,devicePixelRatio:3}),1.1);
});

test('GĐ41–42: GPU framebuffer resized only when public roster count crosses a tier',()=>{
 assert.match(player,/const pixelRatio=arenaPlayerPixelRatio\(\{characters:items\.length,devicePixelRatio:window\.devicePixelRatio\}\)/);
 assert.match(player,/if\(pixelRatio!==lastPixelRatio\)/);
 assert.match(player,/renderer\.setPixelRatio\(pixelRatio\)/);
 assert.match(player,/lastSize=''/);
 const frame=player.slice(player.indexOf('function frame(now)'),player.indexOf("canvas.addEventListener('pointerdown'"));
 assert.doesNotMatch(frame,/setPixelRatio/);
});

test('GĐ41–42: public diagnostics and Core isolation; role-card GPU pause retained',()=>{
 assert.match(player,/pixelRatio:renderer\.getPixelRatio\(\)/);
 assert.match(player,/connectStagingRoom\(\{roomCode:code/);
 assert.match(player,/onFrame:drawFrame/);
 assert.match(player,/\$\('player-core'\)\.src='\/join\/'/);
 assert.match(player,/scheduler\.shouldPaint\(now,hz,\{paused\}\)/);
 assert.doesNotMatch(player,/\/api\/gm\//);
});
