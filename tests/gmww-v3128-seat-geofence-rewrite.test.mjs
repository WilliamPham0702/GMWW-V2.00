import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(path,'utf8');
const ctx={};
vm.runInNewContext(read('assets/village/village-layout.js'),ctx);
const layout=ctx.GMWW_VILLAGE_LAYOUT;
const gm=read('server-game/src/30-village-and-setup.part');
const worker=read('src/index.js');
const web=read('assets/village/village.mjs');

test('V3.128: shared walk boundary strictly excludes sea, roofs, terraces and campfire',()=>{
  for(const [x,y] of [[1,1],[90,24],[9,48],[97,59],[8,90],[90,90],[50,15],[50,64]])
    assert.equal(layout.inside(x,y),false,'invalid area '+x+','+y);
  for(const [x,y] of [[50,39],[29,58],[70,58],[50,75],[50,90]])
    assert.equal(layout.inside(x,y),true,'expected courtyard at '+x+','+y);
  for(let x=-20;x<=120;x+=5)for(let y=-20;y<=120;y+=5){
    const p=layout.clampPoint(x,y);
    assert.ok(layout.inside(p.x,p.y),'clamp must stay on paved ground: '+x+','+y+' => '+JSON.stringify(p));
  }
});

test('V3.128: 8–30 seats form one unique, complete ring around the fire for all shapes',()=>{
  for(let n=8;n<=30;n++){
    for(const kind of ['circle','ellipse','rectangle']){
      const ps=layout.positions(n,kind,null,100),ids=new Set();
      assert.equal(ps.length,n);
      for(const p of ps){
        assert.equal(p.ring,0);
        assert.ok(layout.inside(p.x,p.y),'seat outside village at '+n+' '+kind+' '+JSON.stringify(p));
        ids.add(p.x.toFixed(4)+'/'+p.y.toFixed(4));
      }
      assert.equal(ids.size,n,'overlapping seat anchors '+n+' '+kind);
      const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x)),
        minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));
      assert.ok(minX<45&&maxX>55&&minY<layout.fire.y-8&&maxY>layout.fire.y+8,'not fire-centred '+n+' '+kind);
      assert.ok(ps.every(p=>Math.hypot((p.x-layout.fire.x)/7,(p.y-layout.fire.y)/4.2)>1));
      const perimeterGap=Math.min(...ps.map((p,i)=>{
        const q=ps[(i+1)%n];return Math.hypot(p.x-q.x,(p.y-q.y)*1.78);
      }));
      assert.ok(perimeterGap>2.0,'seat collision '+n+' '+kind+' '+perimeterGap);
    }
  }
});

test('V3.128: spacing and manual offsets remain bounded inside paving',()=>{
  for(const n of [8,10,12,14,16,18,20,22,24,26,28,30]){
    for(const shape of ['circle','ellipse','rectangle']){
      const points=layout.positions(n,shape,{x:10,y:-10},135);
      assert.equal(points.length,n);
      for(const p of points)assert.ok(p.x>=2-1e-8&&p.x<=98+1e-8&&p.y>=2-1e-8&&p.y<=98+1e-8,'invalid shifted seat '+JSON.stringify({n,shape,p}));
      const shrunk=layout.positions(n,shape,{x:-10,y:10},70);
      for(const p of shrunk)assert.ok(p.x>=2-1e-8&&p.x<=98+1e-8&&p.y>=2-1e-8&&p.y<=98+1e-8,'invalid shrunk seat '+JSON.stringify({n,shape,p}));
    }
  }
});

test('V3.128: walking paths stay inside the actual village from roofs, sea and across fire',()=>{
  const endpoints=[[0,0],[95,10],[99,60],[50,64],[50,95],[20,49],[80,59],[30,73],[70,40]];
  for(const rawA of endpoints)for(const rawB of endpoints){
    const a=layout.clampPoint(...rawA),b=layout.clampPoint(...rawB);
    const path=layout.route(a,b);
    assert.ok(path.length>=2);
    for(const waypoint of path)assert.ok(layout.inside(waypoint.x,waypoint.y),'path waypoint outside: '+JSON.stringify(waypoint));
    const movement={movementStatus:'moving',moveFromX:a.x,moveFromY:a.y,moveToX:b.x,moveToY:b.y,
      moveStartedAt:1000,moveDurationMs:1000};
    for(let frame=0;frame<=60;frame++){
      const p=layout.interpolate(movement,1000+frame*1000/60);
      assert.ok(layout.inside(p.x,p.y),'walk off paving from '+JSON.stringify(rawA)+' to '+JSON.stringify(rawB)+' at '+frame+' => '+JSON.stringify(p));
    }
  }
});

test('V3.128: GM provisional seats no longer hash-spawn unassigned accounts',()=>{
  assert.match(gm,/projectedSeatIds\(members,seatCount\)/);
  assert.match(gm,/bySeat=new Map\(\(previewNew\?\[\]:members\)\.map/);
  assert.match(gm,/const seat=Number\(projectedSeats\[key\]\|\|m\?\.seatId\|\|0\)/);
  assert.match(gm,/const waiting=members\.filter\(m=>!Number\(projectedSeats/);
  const rows=['Safari','Chrome','EDGE',...Array.from({length:9},(_,i)=>'GM-'+(i+1))].map((name,i)=>({
    participantId:'member:'+name.toLowerCase(),seatId:i<2?i+1:null
  }));
  const mapped=layout.projectedSeatIds(rows,12);
  assert.equal(Object.keys(mapped).length,12);
  assert.equal(new Set(Object.values(mapped)).size,12);
  for(const r of rows)assert.ok(layout.positions(12)[mapped[r.participantId]-1]);
  assert.match(worker,/p\.positionX=point\.x;p\.positionY=point\.y/);
});

test('V3.128: Player Web renders seated people from shared seat IDs, never fake migration',()=>{
  assert.match(web,/const visualSeats=layout\.projectedSeatIds/);
  assert.match(web,/if\(Number\(p\?\.displaySeatId\|\|p\?\.seatId\|\|0\)>0\)\{/);
  assert.match(web,/visualFallbackMoves\.delete\(id\);\s*return p/);
  assert.match(web,/if\(seat\)return seat/);
  assert.match(web,/displaySeatId\|\|item\?\.seatId/);
  assert.match(web,/village-layout\.js\?v=fire3101/);
  const version=JSON.parse(read('package.json')).version.replace(/\.0$/,'');
  assert.ok(read('server-game/current/GMWW.html').includes('village-layout.js?v='+version+'-pinch-spacing'));
  assert.match(read('assets/village/index.html'),/seat=3131/);
});
