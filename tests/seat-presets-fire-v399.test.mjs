import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(read('assets/village/village-layout.js'),context);
const layout=context.GMWW_VILLAGE_LAYOUT;
const sizes=Array.from({length:13},(_,i)=>6+i*2);
const shapes=['circle'];

test('GMWW fire-centered auto templates adapt by group size',()=>{
  for(let n=6;n<=30;n++){
    const expected='circle';
    assert.equal(layout.recommendedSeatShape(n),expected,'recommended shape for '+n);
  }
  assert.deepEqual(Array.from(layout.seatTemplateCounts),sizes);
  assert.deepEqual(Array.from(layout.seatTemplateShapes),shapes);
});

test('GP2 seats use the real bonfire landmark and remain on walkable ground',()=>{
  assert.deepEqual({...layout.fire},{x:50,y:64});
  assert.equal(layout.scene.id,'gp2-25d');
  assert.ok(!layout.inside(layout.fire.x,layout.fire.y),'fire must remain an obstacle');
  for(const size of sizes)for(const shape of shapes){
    const players=layout.seatTemplatePositions(size,shape);
    assert.equal(players.length,size);
    for(const [i,p] of players.entries()){
      assert.ok(layout.inside(p.x,p.y),size+' '+shape+' seat '+i+' outside courtyard');
      assert.ok(Math.hypot((p.x-layout.fire.x)/8.8,(p.y-layout.fire.y)/5.6)>=1,
        'Character must never stand in the fire');
      assert.ok(p.x>=10&&p.x<=92&&p.y>=29&&p.y<=93,'seat outside wide GP2 plaza');
    }
  }
});

test('GP2 uses one circular ring, safe ground and consistent physical perspective',()=>{
 const positions=layout.positions(30,'circle');
 assert.equal(positions.length,30);
 assert.equal(new Set(positions.map(p=>p.x.toFixed(4)+'-'+p.y.toFixed(4))).size,30);
 assert.ok(positions.every(p=>p.ring===0&&layout.inside(p.x,p.y)));
 assert.ok(new Set(positions.map(p=>p.depth)).size>=4);
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
   const a=positions[i],b=positions[j];
   assert.ok(Math.hypot(a.x-b.x,(a.y-b.y)*1.78)>5.2,'overlapping circular seats');
 }
 assert.equal(layout.normalizeSeatLayout('diamond'),'circle');
 assert.equal(layout.normalizeSeatLayout('ellipse'),'circle');
 assert.equal(layout.normalizeSeatLayout('rectangle'),'circle');
});
test('GP2 preserves unique seats with extreme setup offsets and spacing',()=>{
  for(const count of sizes)for(const shape of shapes)
    for(const [offset,spacing] of [[{x:10,y:-10},135],[{x:-10,y:10},70]]){
      const players=layout.positions(count,shape,offset,spacing);
      assert.ok(players.every(p=>p.x>=2-1e-8&&p.x<=98+1e-8&&p.y>=2-1e-8&&p.y<=98+1e-8));
      for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++)
        assert.ok(Math.hypot(players[i].x-players[j].x,(players[i].y-players[j].y)*1.78)>5.0,
          'overlapping extreme seats '+count+'/'+shape+'/'+i+'/'+j);
    }
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
  assert.match(worker,/const locations=villageLayout\.positions\(requested,seatLayout,seatOffset,seatSpacing\)/);
  assert.match(player,/ps=positions\(seatCount,seatLayout,seatOffset,seatSpacing\)/);
});
