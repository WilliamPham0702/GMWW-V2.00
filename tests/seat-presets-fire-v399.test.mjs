import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),context);
const layout=context.GMWW_VILLAGE_LAYOUT;
const sizes=[8,10,12,14,16,18,20,22,24,25,26,27,28,29,30];
const shapes=['circle','ellipse','rectangle'];

test('GMWW fire-centered auto templates adapt by group size',()=>{
  for(let n=1;n<=30;n++){
    const expected=n<=12?'circle':n<=20?'ellipse':'rectangle';
    assert.equal(layout.recommendedSeatShape(n),expected,'recommended shape for '+n);
  }
  assert.deepEqual(Array.from(layout.seatTemplateCounts),sizes);
  assert.deepEqual(Array.from(layout.seatTemplateShapes),shapes);
});

test('every Seat Mẫu 8–30 stands safely around the actual fire center, even at 30 players',()=>{
  assert.deepEqual({...layout.fire},{x:50,y:49.7});
  for(const size of sizes){
    for(const shape of shapes){
      const players=layout.seatTemplatePositions(size,shape);
      assert.equal(players.length,size,size+' '+shape);
      for(const [i,p] of players.entries()){
        assert.ok(layout.inside(p.x,p.y),size+' '+shape+' seat '+i+' outside village');
        assert.ok(Math.hypot((p.x-layout.fire.x)/6,(p.y-layout.fire.y)/3)>1.25,size+' '+shape+' seat '+i+' collides with fire');
        assert.ok(p.x>=22.5&&p.x<=77.5&&p.y>=35.2&&p.y<=64.5,size+' '+shape+' seat '+i+' away from campfire-centered courtyard');
      }
      const minX=Math.min(...players.map(p=>p.x)),maxX=Math.max(...players.map(p=>p.x));
      const minY=Math.min(...players.map(p=>p.y)),maxY=Math.max(...players.map(p=>p.y));
      assert.ok(minX<layout.fire.x&&maxX>layout.fire.x,size+' '+shape+' horizontal fire anchor');
      assert.ok(minY<layout.fire.y&&maxY>layout.fire.y,size+' '+shape+' vertical fire anchor');
    }
  }
});

test('8–30 seats form exactly ONE continuous perimeter around the fire',()=>{
  for(let n=8;n<=30;n++){
    const shape=layout.recommendedSeatShape(n);
    const points=layout.positions(n,shape);
    assert.equal(points.length,n);
    assert.ok(points.every(p=>p.ring===0),n+' players must never form an inner tier');
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const d=Math.hypot(points[i].x-points[j].x,1.78*(points[i].y-points[j].y));
      assert.ok(d>5.2,n+' players are too close at '+i+'/'+j+': '+d);
    }
    // One perimeter: no player should lie inside the rectangular/oval boundary.
    for(const p of points){
      const dx=Math.abs(p.x-layout.fire.x),dy=Math.abs(p.y-layout.fire.y);
      if(shape==='rectangle')assert.ok(Math.abs(dx-27.5)<.05||Math.abs(dy-13.2)<.05,
        n+' rectangle seat inside outline');
      else{
        const rx=shape==='circle'?22.8:27.4,ry=shape==='circle'?13.1:12.9;
        const radius=Math.hypot(dx/rx,dy/ry);
        assert.ok(Math.abs(radius-1)<.012,n+' oval seat inside outline');
      }
    }
  }
  assert.equal(layout.normalizeSeatLayout('diamond'),'ellipse','V3.101 rooms retain legacy layout compatibility');
  assert.equal(layout.positions(12).length,12,'rooms with 12 seats must draw exactly 12 seat positions');
  assert.ok(layout.positions(12).every(p=>p.ring===0),'legacy fallback also has no inner ring');
});

test('GM shows automatic shape, center fire icon and exact seat capacity; server sync remains authoritative',()=>{
  const app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html');
  const worker=read('src/index.js'),player=read('assets/village/village.mjs');
  assert.match(app,/const shape=layout\.recommendedSeatShape\(n\)/);
  assert.match(app,/layout\.seatTemplatePositions\(n,shape\)/);
  assert.match(app,/const fire=document\.createElement\('span'\)/);
  assert.match(app,/fire\.className='play-seat-preset-fire'/);
  assert.match(app,/const shape=layout\.recommendedSeatShape\(count\)/);
  assert.match(html,/id="playSeatPresetAutoHint"/);
  assert.match(html,/id="playSeatPresetClose"/);
  assert.match(worker,/seatLayout:villageLayout\.recommendedSeatShape\(seatCount\)/);
  assert.match(worker,/changedCount\?villageLayout\.recommendedSeatShape\(requested\)/);
  assert.match(worker,/const locations=villageLayout\.positions\(requested,seatLayout\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout\)/);
});
