import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const scene={};vm.runInNewContext(read('assets/village/village-layout.js'),scene);
const layout=scene.GMWW_VILLAGE_LAYOUT;
const gmSource=read('server-game/src/30-village-and-setup.part');
const worker=read('src/index.js'),web=read('assets/village/village.mjs');
const participants=()=>{
  const examples=['Safari','Chrome','EDGE',...Array.from({length:9},(_,i)=>'GM-'+(i+1))];
  return examples.map((name,i)=>({participantId:'member:'+name.toLowerCase(),
    seatId:i<3?[1,4,8][i]:null,displayName:name,movementStatus:'idle'}));
};
test('V3.127 root regression: missing seats in GM-1..GM-9 cannot clump by account hash',()=>{
  const rows=participants(),before=structuredClone(rows);
  const ids=layout.projectedSeatIds(rows,12);
  assert.equal(Object.keys(ids).length,12);
  assert.equal(new Set(Object.values(ids)).size,12);
  assert.equal(ids['member:safari'],1);
  assert.equal(ids['member:chrome'],4);
  assert.equal(ids['member:edge'],8);
  assert.deepEqual(rows,before,'presentation repair must not mutate actual server Seat IDs');
  const points=layout.positions(12).filter((_,i)=>Object.values(ids).includes(i+1));
  assert.equal(points.length,12);
  assert.ok(Math.min(...points.map(p=>p.x))<35);
  assert.ok(Math.max(...points.map(p=>p.x))>65);
  assert.ok(Math.min(...points.map(p=>p.y))<42);
  assert.ok(Math.max(...points.map(p=>p.y))>56);
  assert.ok(points.every(p=>layout.inside(p.x,p.y)));
  const other=layout.projectedSeatIds([...rows].reverse(),12);
  assert.deepEqual(Object.entries(other).sort(),Object.entries(ids).sort(),
    'room updates in any order must preserve the same visual Seat assignments');
});
test('V3.127 preserves every valid manual seat even in partially occupied 30-seat rooms',()=>{
  const rows=[{participantId:'member:safari',seatId:2},
    {participantId:'member:chrome',seatId:10},
    {participantId:'member:edge',seatId:26},
    {participantId:'member:gm-1',seatId:null},
    {participantId:'member:gm-2',seatId:10}];
  const ids=layout.projectedSeatIds(rows,30);
  assert.equal(ids['member:safari'],2);
  assert.equal(ids['member:chrome'],10);
  assert.equal(ids['member:edge'],26);
  assert.equal(new Set(Object.values(ids)).size,5);
  assert.equal(Object.keys(ids).length,5);
});
test('V3.127 stale pre-battle movement is ignored only after match starts',()=>{
  const functionText=gmSource.match(/function playSeatMovementActive\(member\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(functionText);
  const started=Date.parse('2026-10-17T09:00:00Z'),now=started+5000;
  const scene={room:{startedAt:new Date(started).toISOString()}};
  const state={step:'battle'};
  const projection=Function('playSceneRuntime','playSceneState','playNow',
    functionText+';return playSeatMovementActive;')(scene,state,()=>now);
  assert.equal(projection({movementStatus:'moving',moveStartedAt:started-1000,moveDurationMs:30000}),false);
  assert.equal(projection({movementStatus:'moving',moveStartedAt:started+1000,moveDurationMs:30000}),true);
  assert.equal(projection({movementStatus:'moving',moveStartedAt:started+1000,moveDurationMs:1000}),false);
  state.step='seats';
  assert.equal(projection({movementStatus:'moving',moveStartedAt:started-1000,moveDurationMs:30000}),true);
});
test('V3.127 starts a match with authoritative persisted seats and no inherited wander',()=>{
  const method=worker.slice(worker.indexOf('  async gmStart(request,body){'),
    worker.indexOf('  async gmConfig(request,body){'));
  assert.match(method,/projectedSeatIds\(members,seatCount\)/);
  assert.match(method,/p\.seatId=seat/);
  assert.match(method,/clearPlayerMovement\(p,\{keepPosition:true\}\)/);
  assert.match(method,/p\.positionX=point\.x;p\.positionY=point\.y/);
  assert.ok(method.indexOf('ctx.storage.put("players",players)')<method.indexOf('ctx.storage.put("meta",meta)'));
  assert.match(method,/meta\.seatsLocked=true/);
  assert.match(method,/error:"SEATING_INCOMPLETE"/);
  assert.match(gmSource,/projectedSeatIds\(members,seatCount\)/);
  assert.match(gmSource,/playSeatMovementActive\(m\)/);
  assert.match(web,/projectedSeatIds\(incoming\.filter\(p=>!p\.isGM\),nextCount\)/);
  assert.match(web,/displaySeatId\|\|item\?\.seatId/);
  assert.match(web,/Number\(p\.moveStartedAt\)<=matchStartedAt/);
  assert.match(read('src/gmww-members-live.js'),/startedAt:String\(room\.startedAt\|\|''\)\.slice\(0,64\)/);
});
