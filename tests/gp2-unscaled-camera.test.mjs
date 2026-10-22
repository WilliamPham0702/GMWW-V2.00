import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gp2Camera,gp2ActorCollisionPairs,GP2_WORLD_FRAME} from '../assets/village/gp2-world-camera.mjs';

const fixture=JSON.parse(fs.readFileSync('tests/fixtures/gp2-artwork-review-v2.json','utf8'));
const seats=fixture.seatPositions;
function flatViewportCollisions(viewWidth,viewHeight,actorWidth,actorHeight){
  return seats.flatMap((a,i)=>seats.slice(i+1).filter(b=>
    Math.abs(a.x-b.x)*viewWidth/100<actorWidth&&
    Math.abs(a.y-b.y)*viewHeight/100<actorHeight).map(b=>[a.seatId,b.seatId]));
}

test('GP2 candidate proves 390px compressed background cannot preserve Character size',()=>{
  assert.ok(flatViewportCollisions(390,844,50,67).length>0);
  assert.equal(flatViewportCollisions(390,844,50,67).length,67);
  assert.equal(fixture.artworkApproved,false);
});

test('GP2 virtual world has 30 collision-free native-size Character footprints',()=>{
  assert.equal(GP2_WORLD_FRAME.width,864);
  assert.equal(GP2_WORLD_FRAME.height,1536);
  assert.equal(gp2ActorCollisionPairs(seats).length,0);
  assert.equal(gp2ActorCollisionPairs(seats,{actorWidth:56,actorHeight:74}).length,0);
});

test('GP2 camera centers the real candidate fire without rescaling actors',()=>{
  const camera=gp2Camera({viewportWidth:390,viewportHeight:844,focus:fixture.fire});
  const p=camera.toViewport(fixture.fire);
  assert.equal(camera.scale,1);
  assert.ok(Math.abs(p.x-195)<0.01&&Math.abs(p.y-422)<0.01);
  assert.ok(camera.worldWidth>camera.viewportWidth&&camera.worldHeight>camera.viewportHeight);
  for(const seat of seats){
    const v=camera.toViewport(seat),p2=camera.fromViewport(v);
    assert.ok(Math.abs(p2.x-seat.x)<1e-8);
    assert.ok(Math.abs(p2.y-seat.y)<1e-8);
  }
});

test('GP2 pan clamps to the artwork without showing blank margins on iPhone',()=>{
  for(const pan of [{x:-9999,y:-9999},{x:9999,y:9999},{x:0,y:0}]){
    const camera=gp2Camera({viewportWidth:390,viewportHeight:844,focus:fixture.fire,pan});
    assert.ok(camera.left<=0&&camera.left>=390-camera.worldWidth);
    assert.ok(camera.top<=0&&camera.top>=844-camera.worldHeight);
  }
  const desktop=gp2Camera({viewportWidth:1300,viewportHeight:2000});
  assert.ok(desktop.left>0&&desktop.top>0);
  assert.equal(desktop.scale,1);
});

test('GP2 camera is experimental until art, hit-testing, iPhone QA and user approval',()=>{
  const gm=fs.readFileSync('server-game/current/app.js','utf8');
  const web=fs.readFileSync('assets/village/village.mjs','utf8');
  assert.doesNotMatch(gm,/gp2-world-camera\.mjs/);
  assert.doesNotMatch(web,/gp2-world-camera\.mjs/);
  assert.equal(fixture.status,'QA_BLOCKED_DO_NOT_DEPLOY');
});
