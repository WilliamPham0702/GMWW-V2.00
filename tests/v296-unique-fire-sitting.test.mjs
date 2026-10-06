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

test("server overrides gather targets for both public village and room movement",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/villageGatherPoint\("member:"\+normalizeLoginId\(m\.loginId\),ids\)/);
  assert.match(worker,/autoMotionPhase==="gather"\?villageGatherPoint\(id,gatherIds\)/);
});

test("Player Web predicts the same per-player gather ring instead of one shared point",()=>{
  const live=fs.readFileSync("src/gmww-members-live.js","utf8");
  assert.match(live,/function lobbyGatherPointForId\(id,ids\)/);
  assert.match(live,/return lobbyGatherPointForId\(own,ids\)/);
});
