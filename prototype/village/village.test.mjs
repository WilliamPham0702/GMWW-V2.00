import assert from "node:assert/strict";
import {positions,safeText,mapPublicPlayers} from "./village.mjs";
for(const n of [1,2,6,12,13,18,24,30]){
  const points=positions(n);
  assert.equal(points.length,n);
  for(const p of points){assert(p.x>=0&&p.x<=100);assert(p.y>=0&&p.y<=100);assert([0,1].includes(p.ring));}
  assert.equal(new Set(points.map(p=>p.x.toFixed(5)+","+p.y.toFixed(5))).size,n);
}
for(const n of [0,-1,31,2.5])assert.throws(()=>positions(n),/COUNT_OUT_OF_RANGE/);
assert.equal(safeText(null),"");assert.equal(safeText("x".repeat(120)).length,80);
console.log("Village geometry and bounds: PASS (1–30 avatars)");

const publicPlayers=mapPublicPlayers({players:[
 {participantId:"a",displayName:"Lan",avatarId:"avatar-cut-001",online:true,secretRole:"wolf"},
 {participantId:"a",displayName:"Duplicate",avatarId:"avatar-cut-002"},
 {participantId:"b",displayName:"Minh",avatarId:"avatar-cut-003",online:false}
]});
assert.equal(publicPlayers.length,2);
assert.deepEqual(publicPlayers.map(p=>p.id),["a","b"]);
assert.equal(publicPlayers[0].avatarId,"avatar-cut-001");
assert.equal(publicPlayers[1].online,false);
assert(!("secretRole" in publicPlayers[0]));
assert.equal(mapPublicPlayers({players:Array.from({length:31},(_,i)=>({participantId:String(i)}))}).length,30);
console.log("Public avatar adapter: PASS (deduplication, privacy, 30 cap)");
