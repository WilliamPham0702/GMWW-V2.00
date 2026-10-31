import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arenaTargetFrameHz,createArenaPaintScheduler} from '../assets/village/arena-3d/render-optimization.mjs';

const player=readFileSync('assets/village/arena-3d/player.mjs','utf8');
test('GĐ40: card/hidden/lost context pause GPU rendering but not Core sync',()=>{
 assert.match(player,/const covered=\$\('card'\)\.classList\.contains\('open'\)/);
 assert.match(player,/document\.hidden\|\|covered\|\|contextLost/);
 assert.match(player,/arenaTargetFrameHz\(\{visible:!paused/);
 assert.match(player,/scheduler\.shouldPaint\(now,hz,\{paused\}\)/);
 assert.match(player,/connectStagingRoom\(\{roomCode:code/);
 assert.match(player,/onFrame:drawFrame/);
 assert.doesNotMatch(player,/disconnect\(\)|feed\.close\(\)/);
});
test('GĐ40: resumed camera painting has a fresh budget and no frame catch-up',()=>{
 const schedule=createArenaPaintScheduler();
 assert.equal(arenaTargetFrameHz({visible:false,active:true}),0);
 assert.equal(schedule.shouldPaint(1000,30),true);
 assert.equal(schedule.shouldPaint(1010,30,{paused:true}),false);
 assert.equal(schedule.shouldPaint(1100,0),false);
 assert.equal(schedule.shouldPaint(10000,12),true);
 assert.equal(schedule.shouldPaint(10001,12),false);
 assert.equal(schedule.shouldPaint(10090,12),true);
});
test('GĐ40: anonymous public diagnostics never expose private role/GM auth',()=>{
 assert.match(player,/renderPaused,paintFrames,pixelRatio:renderer\.getPixelRatio\(\),drawCalls/);
 for(const item of [/\/api\/gm\//,/gmToken/,/sessionStorage/,/localStorage/,/Authorization\s*:/]){
  assert.doesNotMatch(player,item);
 }
});
