import assert from "node:assert/strict";
import {positions,safeText} from "./village.mjs";
for(const n of [1,2,6,12,13,18,24,30]){
  const points=positions(n);
  assert.equal(points.length,n);
  for(const p of points){assert(p.x>=0&&p.x<=100);assert(p.y>=0&&p.y<=100);assert([0,1].includes(p.ring));}
  assert.equal(new Set(points.map(p=>p.x.toFixed(5)+","+p.y.toFixed(5))).size,n);
}
for(const n of [0,-1,31,2.5])assert.throws(()=>positions(n),/COUNT_OUT_OF_RANGE/);
assert.equal(safeText(null),"");assert.equal(safeText("x".repeat(120)).length,80);
console.log("Village geometry and bounds: PASS (1–30 avatars)");
