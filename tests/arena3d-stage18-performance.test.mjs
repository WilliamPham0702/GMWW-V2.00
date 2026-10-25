import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arenaTargetFrameHz,ARENA_STAGE18_VERSION} from '../assets/village/arena-3d/render-optimization.mjs';

test('GĐ18: idle mobile renders fewer frames; active spell/camera remains smooth',()=>{
 assert.equal(ARENA_STAGE18_VERSION,'gmww.arena.mobile-frame-pacing.18');
 for(const active of [false,true]){
  for(const interacting of [false,true]){
   assert.equal(arenaTargetFrameHz({visible:false,active,interacting}),0);
  }
 }
 assert.equal(arenaTargetFrameHz(),12);
 assert.equal(arenaTargetFrameHz({active:true}),30);
 assert.equal(arenaTargetFrameHz({interacting:true}),30);
 assert.equal(arenaTargetFrameHz({lowPower:true}),8);
 assert.equal(arenaTargetFrameHz({lowPower:true,active:true}),20);
 assert.equal(arenaTargetFrameHz({lowPower:true,interacting:true}),20);
 assert.equal(arenaTargetFrameHz({reducedMotion:true}),10);
 assert.equal(arenaTargetFrameHz({reducedMotion:true,active:true}),20);
 assert.equal(arenaTargetFrameHz({lowPower:true,reducedMotion:true,active:true}),20);
});

test('GĐ18: idle pacing does not throttle WebSocket and private GM update network',()=>{
 const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const painting=live.slice(live.indexOf('function loop(now){'));
 assert.match(live,/arenaTargetFrameHz\(\{visible:!document\.hidden/);
 assert.match(live,/active:field\.hasActiveMotion\(now\)/);
 assert.match(live,/interacting:trackedPointers\.size>0/);
 assert.match(painting,/if\(!webglLost&&frameHz>0&&now-lastPaint>=1000\/frameHz\)/);
 assert.match(painting,/render\.render\(scene,camera\);frames\+\+/);
 assert.match(live,/setInterval\(\(\)=>\{if\(!document\.hidden&&gmToken\)/);
 assert.ok(live.indexOf('connectStagingRoom(')<live.indexOf('function loop(now){'));
 assert.match(live,/if\(nextSignature!==sceneSignature\)/);
 assert.doesNotMatch(live,/localStorage|sessionStorage/);
});

test('GĐ18: low-power removes cosmetic instanced meshes, preserving heads and gameplay',()=>{
 const src=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 assert.match(src,/const ECO_DETAIL_PARTS=new Set\(/);
 assert.match(src,/part\.mesh\.visible=!next\|\|!ECO_DETAIL_PARTS\.has\(part\.name\)/);
 assert.match(src,/if\(!part\.mesh\.visible\)continue/);
 assert.match(src,/function hasActiveMotion\(/);
 assert.match(src,/if\(activeBeam&&time<activeBeam\.until\)return true/);
 assert.match(src,/actor\.walk\|\|actor\.gestureEnd>time\|\|actor\.castUntil>time/);
 assert.match(src,/headMesh=meshes\.find\(p=>p\.name==='head'\)/);
 const eco=src.match(/const ECO_DETAIL_PARTS=new Set\(\[([\s\S]*?)\]\)/)?.[1]||'';
 for(const corePart of ['head','eyeL','eyeR','armL','armR','tunic','skirt','shoeL','shoeR']){
  assert.doesNotMatch(eco,new RegExp("'"+corePart+"'"),corePart+' must remain visible/pickable');
 }
 const village=readFileSync('assets/village/arena-3d/coastal-village.mjs','utf8');
 assert.match(village,/if\(night===desired\)return/);
});
