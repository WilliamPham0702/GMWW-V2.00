import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');
const runtimeVersion=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
const gm=read('server-game/src/30-village-and-setup.part');
const bundled=read('server-game/current/app.js');
const player=read('assets/village/village.mjs');
const ctx={};
vm.runInNewContext(read('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;

test('V3.129: GM renderer invalidates stale DOM when Seat Mẫu shape changes',()=>{
  for(const source of [gm,bundled]){
    const signature=source.match(/const domSig=JSON\.stringify\(\[([\s\S]*?)\]\);/)?.[1];
    assert.ok(signature,'render signature must exist');
    assert.match(signature,/normalizeSeatLayout\(playSceneRuntime\.room\?\.seatLayout\)/);
    assert.match(signature,/seatCount,previewNew,seating/);
    assert.match(source,/positions=playSeatPositions\(seatCount\)/);
  }
  assert.ok(read('server-game/current/GMWW.html').includes('app.js?v=gmww-v'+runtimeVersion.replace(/\./g,'')+'-pinch-spacing'));
});

test('V3.129: stale motion cannot displace assigned Seats after Tập Hợp',()=>{
  const source=gm.match(/function playSeatMovementActive\(member\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const started=Date.parse('2026-10-17T09:00:00Z'),clock=started+4000;
  const runtime={room:{startedAt:new Date(started).toISOString()}},state={step:'game'};
  const active=Function('playSceneRuntime','playSceneState','playNow',
    source+';return playSeatMovementActive;')(runtime,state,()=>clock);
  const seated={seatId:3,movementStatus:'moving',moveStartedAt:started-1000,moveDurationMs:20000};
  for(const step of ['room','game','roles','deal']){state.step=step;assert.equal(active(seated),false,step)}
  state.step='seats';assert.equal(active(seated),false);
  assert.equal(active({...seated,moveTargetSeatId:5}),true,'only explicit Seat transfer may move');
  state.step='battle';assert.equal(active(seated),false,'no pre-battle drift');
  assert.equal(active({...seated,moveStartedAt:started+1000}),false,'battle motion is frozen for every seated actor');
  assert.equal(active({...seated,seatId:null}),false,'stale unseated battle move is also blocked');
});

test('V3.129: Player Web uses authoritative Seat before stale world or pregame movement',()=>{
  assert.match(player,/function seatedMovementAllowed\(data,now=/);
  assert.match(player,/matchStartedAt>0&&started>matchStartedAt/);
  assert.match(player,/const activeMove=seatedMovementAllowed\(data,now\),pos=activeMove\?layout\.interpolate/);
  assert.match(player,/if\(seatedMovementAllowed\(data,now\)\)return layout\.interpolate/);
  assert.match(player,/matchStartedAt=Date\.parse\(room\.startedAt\|\|""\)\|\|0/);
  assert.match(player,/seatOffset=layout\.normalizeSeatOffset\(room\.seatOffset\)/);
  assert.match(player,/const visualSeats=layout\.projectedSeatIds/);
  assert.match(read('assets/village/index.html'),/seat=3131/);
});

test('V3.129: every selected Seat Mẫu layout has unique fire-centred locations on an iPhone viewport',()=>{
  for(let n=8;n<=30;n++)for(const shape of layout.seatTemplateShapes){
    const points=layout.positions(n,shape),screen=points.map(p=>layout.toScreen(p,390,844));
    assert.equal(points.length,n);
    assert.equal(new Set(points.map(p=>p.x.toFixed(4)+'-'+p.y.toFixed(4))).size,n);
    assert.ok(points.every(p=>layout.inside(p.x,p.y)));
    const halfLeft=points.some(p=>p.x<layout.fire.x-10);
    const halfRight=points.some(p=>p.x>layout.fire.x+10);
    const above=points.some(p=>p.y<layout.fire.y-7);
    const below=points.some(p=>p.y>layout.fire.y+7);
    assert.ok(halfLeft&&halfRight&&above&&below,'fire is not visually central '+n+' '+shape);
    assert.ok(screen.every(p=>p.x>0&&p.x<100&&p.y>0&&p.y<100),'Seat off screen '+n+' '+shape);
    const ids=layout.projectedSeatIds(Array.from({length:n},(_,i)=>({
      participantId:'member:gm-'+i,seatId:i<2?[2,7][i]:null
    })),n);
    assert.equal(Object.keys(ids).length,n);
    assert.equal(new Set(Object.values(ids)).size,n);
    assert.equal(ids['member:gm-0'],2);
    assert.equal(ids['member:gm-1'],7);
  }
});
