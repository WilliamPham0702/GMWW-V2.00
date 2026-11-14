import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const sandbox={};
vm.runInNewContext(readFileSync(new URL('../assets/village/village-layout.js',import.meta.url),'utf8'),sandbox);
const layout=sandbox.GMWW_VILLAGE_LAYOUT;
const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.78);

test('Quick Play V2 generates exactly N seats around the actual fire for 3–30 players',()=>{
  for(let n=3;n<=30;n++){
    const ps=layout.positions(n,'circle',{x:0,y:0},100);
    assert.equal(ps.length,n,'count '+n);
    assert.equal(new Set(ps.map(p=>p.x.toFixed(5)+','+p.y.toFixed(5))).size,n);
    for(const p of ps)assert.ok(layout.inside(p.x,p.y),'safe courtyard seat n='+n);
    const cx=ps.reduce((a,p)=>a+p.x,0)/n,cy=ps.reduce((a,p)=>a+p.y,0)/n;
    assert.ok(Math.abs(cx-layout.fire.x)<1.5&&Math.abs(cy-layout.fire.y)<1.5,'around campfire n='+n);
    if(n<=15)for(let i=0;i<n;i++)
      assert.ok(dist(ps[i],ps[(i+1)%n])>6,'avatars must not overlap for '+n+' players');
  }
});
test('three players form a triangle and four players form a rectangle about the fire',()=>{
  const t=layout.positions(3);
  assert.equal(t.length,3);
  const edges=t.map((p,i)=>dist(p,t[(i+1)%3]));
  assert.ok(Math.max(...edges)/Math.min(...edges)<1.3,'balanced triangle in projected frame');
  const q=layout.positions(4),left=q.filter(p=>p.x<layout.fire.x),right=q.filter(p=>p.x>layout.fire.x);
  assert.equal(left.length,2);assert.equal(right.length,2);
  const top=q.filter(p=>p.y<layout.fire.y),bottom=q.filter(p=>p.y>layout.fire.y);
  assert.equal(top.length,2);assert.equal(bottom.length,2);
  assert.ok(Math.abs(left[0].x-left[1].x)<2&&Math.abs(right[0].x-right[1].x)<2,'rectangle left/right columns');
  assert.ok(Math.abs(top[0].y-top[1].y)<2&&Math.abs(bottom[0].y-bottom[1].y)<2,'rectangle top/bottom rows');
});
