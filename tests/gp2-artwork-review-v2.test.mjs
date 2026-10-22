import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fixture=JSON.parse(fs.readFileSync('tests/fixtures/gp2-artwork-review-v2.json','utf8'));
const world={width:864,height:1536};
const toPx=seat=>({x:seat.x/100*world.width,y:seat.y/100*world.height});
const actorRect=seat=>{
  const foot=toPx(seat),w=fixture.characterBoundingBoxPx.width,h=fixture.characterBoundingBoxPx.height;
  return {left:foot.x-w/2,right:foot.x+w/2,top:foot.y-h,bottom:foot.y};
};

test('GP2 candidate is NOT approved or bound to the live World layout',()=>{
  assert.equal(fixture.artworkApproved,false);
  assert.equal(fixture.status,'QA_BLOCKED_DO_NOT_DEPLOY');
  assert.equal(fixture.coordinateFrame,'portrait-864x1536');
  const layout=fs.readFileSync('assets/village/village-layout.js','utf8');
  const gm=fs.readFileSync('server-game/current/style.css','utf8');
  const web=fs.readFileSync('assets/village/village-art.css','utf8');
  for(const source of [gm,web]){
    assert.doesNotMatch(source,/gp2-day-candidate|gp2-night-candidate|gp2-art-candidate-v2/);
  }
  assert.match(layout,/const fire=\{x:50,y:64\}/);
  assert.notEqual(fixture.fire.y,64,'candidate bonfire and current PR landmark must not be mistaken for aligned');
});

test('GP2 painted-space candidate has exactly 30 unique seat feet over five spatial depth tiers',()=>{
  const seats=fixture.seatPositions;
  assert.equal(seats.length,30);
  assert.equal(new Set(seats.map(p=>p.seatId)).size,30);
  assert.deepEqual([...new Set(seats.map(p=>p.depth))],[0,1,2,3,4]);
  assert.equal(new Set(seats.map(p=>p.x+','+p.y)).size,30);
  for(const point of seats){
    const safe=fixture.pavedFootprintCandidate;
    assert.ok(point.x>=safe.left&&point.x<=safe.right&&point.y>=safe.top&&point.y<=safe.bottom,
      'actor feet outside provisional flat-ground region: '+point.seatId);
    const fire=fixture.fire;
    const d=((point.x-fire.x)/fire.radiusX)**2+((point.y-fire.y)/fire.radiusY)**2;
    assert.ok(d>=1,'actor feet in fire: '+point.seatId);
  }
});

test('GP2 seat overlays do not collide at original 56×74px character footprint',()=>{
  const seats=fixture.seatPositions;
  for(let i=0;i<seats.length;i++)for(let j=i+1;j<seats.length;j++){
    const a=actorRect(seats[i]),b=actorRect(seats[j]);
    const overlap=a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    assert.equal(overlap,false,'sprite rectangles overlap at '+seats[i].seatId+'/'+seats[j].seatId);
  }
});

test('GP2 scenic object collision remains an explicit unresolved QA gate',()=>{
  assert.ok(fixture.notes.some(note=>note.includes('NOT verified')));
  assert.ok(fixture.notes.some(note=>note.includes('iPhone')));
});
