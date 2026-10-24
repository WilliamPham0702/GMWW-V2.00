import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicRendererFrame,rendererCommands} from '../assets/village/dual-renderer-core.mjs';
import {arenaSceneSignature,createArenaAdaptiveQuality} from '../assets/village/arena-3d/render-optimization.mjs';

const room={code:'ARENA5',matchId:'m1',seatCount:6,seatLayout:'circle',cyclePhase:'night'};
const members=[
  {participantId:'member:a',seatId:1,gameCharacterId:'character-01',positionX:35,positionY:40,statusTags:[]},
  {participantId:'member:b',seatId:2,gameCharacterId:'character-02',positionX:65,positionY:40,statusTags:[]}
];
function signature(r=room,p=members){
  const frame=createPublicRendererFrame({room:r,players:p});
  return arenaSceneSignature(frame.room,rendererCommands(frame,'3d').players);
}

test('Stage5: public room polling, phase switch and online/name changes do not rebuild 3D meshes',()=>{
  const a=signature();
  assert.equal(a,signature({...room,cyclePhase:'morning',cycleNight:2},members.map(x=>({...x,online:false,displayName:'Updated'}))));
  assert.equal(a,signature(room,members.map(x=>({...x,privateRole:'wolf',gmToken:'secret'}))));
  assert.doesNotMatch(a,/secret|wolf|gmToken|privateRole/);
});

test('Stage5: seat, layout, appearance, position, status and movement invalidate 3D scene cache',()=>{
  const original=signature();
  const changed=[
    [ {...room,seatLayout:'diamond'},members ],
    [ {...room,matchId:'m2'},members ],
    [ room,members.map((x,i)=>i?{...x,seatId:3}:x) ],
    [ room,members.map((x,i)=>i?{...x,gameCharacterId:'character-07'}:x) ],
    [ room,members.map((x,i)=>i?{...x,positionX:67}:x) ],
    [ room,members.map((x,i)=>i?{...x,movementStatus:'moving'}:x) ],
    [ room,members.map((x,i)=>i?{...x,statusTags:[{statusId:'protected'}]}:x) ]
  ];
  for(const [r,p] of changed)assert.notEqual(signature(r,p),original);
});

test('Stage5: adaptive power drops after persistent lag and recovers without depending on capped render FPS',()=>{
  const q=createArenaAdaptiveQuality({windowSize:4,slowWindows:2,fastWindows:2,cooldownMs:0});
  let now=0;
  q.observe(now);
  for(let i=0;i<8;i++){now+=48;q.observe(now)}
  assert.equal(q.lowPower,true,'two slow windows must trigger battery saving');
  for(let i=0;i<8;i++){now+=16;q.observe(now)}
  assert.equal(q.lowPower,false,'requestAnimationFrame cadence allows restoration even at low power');
  q.observe(now+20000,false);
  assert.equal(q.lowPower,false,'background tab never registers lag');
  q.reset();assert.equal(q.lowPower,false);
});

test('Stage5: live scene uses cache + adaptive quality only on Arena STAGING UI',()=>{
  const js=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const html=readFileSync('assets/village/arena-3d/live.html','utf8');
  assert.match(js,/arenaSceneSignature\(frame\.room,items\)/);
  assert.match(js,/if\(nextSignature!==sceneSignature\)/);
  assert.match(js,/qualityController\.observe\(now,!document\.hidden\)/);
  assert.match(js,/autoQualityEnabled/);
  assert.match(html,/id="quality-auto"/);
  assert.doesNotMatch(js,/localStorage|sessionStorage/);
});
