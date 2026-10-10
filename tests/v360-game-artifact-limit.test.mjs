import test from "node:test";
import assert from "node:assert/strict";
import {reserveArtifactActivation} from "../src/gmww-game-scene-rules.js";
import {readFileSync} from "node:fs";

const frontend=readFileSync(new URL("../server-game/current/app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../server-game/current/GMWW.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../server-game/current/style.css",import.meta.url),"utf8");
const backend=readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("Artifact quota is enforced for each configured cycle",()=>{
  let state={cycleKey:"game:night:1",accepted:[]};
  for(let i=0;i<2;i++){const r=reserveArtifactActivation(state,{requestId:String(i),playerId:String(i),artifactId:"A",cycleKey:state.cycleKey,eligible:true,limit:2});assert.equal(r.ok,true);state=r.state;}
  assert.equal(reserveArtifactActivation(state,{requestId:"next",playerId:"next",artifactId:"A",cycleKey:state.cycleKey,eligible:true,limit:2}).error,"ARTIFACT_CYCLE_LIMIT");
  assert.equal(reserveArtifactActivation(state,{requestId:"0",playerId:"0",artifactId:"A",cycleKey:state.cycleKey,eligible:true,limit:2}).idempotent,true);
  assert.equal(reserveArtifactActivation({cycleKey:"game:day:1",accepted:[]},{requestId:"x",playerId:"x",artifactId:"A",cycleKey:"game:day:1",eligible:true,limit:0}).error,"ARTIFACT_CYCLE_LIMIT");
});
test("GM game setup supports 300-second discussion and starred swipe-row artifacts",()=>{
  assert.match(html,/id="playVillageDiscussionSec"[^>]+value="300"/);
  assert.match(html,/id="playArtifactLimitPerCycle"/);
  assert.match(frontend,/artifactLimitPerCycle/);
  assert.match(frontend,/playFavoriteArtifacts\(\)\.map\(a=>String\(a\.id\)\)/);
  assert.match(frontend,/playSceneState\.artifactsEnabled=templateArtifactIds\.length>0/);
  assert.match(css,/play-template-artifact-gallery:not\(\[hidden\]\).*?flex-wrap:nowrap/s);
  assert.doesNotMatch(frontend,/roleLabel\|\|'CHƯA PHÂN VAI'/);
  assert.doesNotMatch(frontend,/s\.textContent='CHƯA CHỌN NHÂN VẬT'/);
  assert.match(backend,/reserveArtifactActivation\(cycle,\{requestId,playerId,artifactId,cycleKey,eligible:true,limit:artifactLimitPerCycle\}\)/);
  assert.match(backend,/phase==="day"\|\|phase==="morning"/);
});
