import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {villageGatherPoint,VILLAGE_FIRE_CENTER} from "../src/gmww-village-gather-rules.js";

test("up to 30 characters receive unique sitting points around the existing fire",()=>{
  for(const count of [1,2,4,8,12,20,30]){
    const ids=Array.from({length:count},(_,i)=>"member:p"+String(i+1).padStart(2,"0"));
    const pts=ids.map(id=>villageGatherPoint(id,ids));
    assert.equal(new Set(pts.map(p=>p.x+","+p.y)).size,count);
    for(const p of pts){
      const dx=p.x-VILLAGE_FIRE_CENTER.x,dy=p.y-VILLAGE_FIRE_CENTER.y;
      assert.ok(Math.hypot(dx,dy)>4,"sitting point must not be the fire center");
      assert.ok(p.x>=4&&p.x<=96&&p.y>=4&&p.y<=96);
    }
  }
});

test("gather positions are deterministic regardless of participant input order",()=>{
  const ids=["member:william","member:an","member:minh","member:linh","member:khoa"];
  const a=villageGatherPoint("member:william",ids);
  const b=villageGatherPoint("member:william",[...ids].reverse());
  assert.deepEqual(a,b);
});

test("server redirects legacy gather motion to per-character random safe points",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/villageAutoPoint\("member:"\+normalizeLoginId\(m\.loginId\),Math\.floor\(now\/1000\),villageLayout\)/);
  assert.match(worker,/autoMotionPhase==="gather"\?villageAutoPoint\(id,Math\.floor\(now\/1000\),villageLayout\)/);
  assert.doesNotMatch(worker,/villageGatherPoint\(id,gatherIds\)/);
});

test("Player Web chooses a fresh random destination instead of a gather ring",()=>{
  const live=fs.readFileSync("src/gmww-members-live.js","utf8");
  assert.match(live,/function lobbyRandomPoint\(\)/);
  assert.match(live,/function buildLobbyMotionRoute\(\)\{return\[lobbyRandomPoint\(\)\]\}/);
  assert.doesNotMatch(live,/function lobbyGatherPointForId/);
});
