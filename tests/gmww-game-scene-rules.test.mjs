import test from "node:test";
import assert from "node:assert/strict";
import {buildNightQueue,reserveArtifactActivation,canResumePlayer} from "../src/gmww-game-scene-rules.js";
test("opening window uses editable Artifact flag, not a hardcoded role list",()=>{
 const names=["Tráng Gương","Đá Hoán Đổi","Mắt Tiên Tri","Bùa Hộ Mệnh"];
 const owners=names.map((artifactName,i)=>({artifactName,playerId:String(i)}));
 const first=buildNightQueue({night:1,artifactOwners:owners,normalTurns:[{kind:"normal",playerId:"other"}]});
 assert.deepEqual(first.map(x=>x.kind),["wolf-introduction","early-artifact","early-artifact","early-artifact","normal"]);
 assert.deepEqual(first.slice(1,4).map(x=>x.name),names.slice(0,3));
 assert.deepEqual(buildNightQueue({night:2,artifactOwners:owners}).map(x=>x.kind),["early-artifact","early-artifact","early-artifact"]);
 const custom=buildNightQueue({night:2,artifactOwners:[{artifactName:"Bùa Hộ Mệnh",playerId:"p",priorityFirst:true},{artifactName:"Tráng Gương",playerId:"q",priorityFirst:false}]});
 assert.deepEqual(custom.map(x=>x.name),["Bùa Hộ Mệnh"]);
});
test("early use skips duplicate main turn; skipped early turn retains main turn",()=>{
 const normalTurns=[{playerId:"1",artifactName:"Tráng Gương"}];
 assert.equal(buildNightQueue({night:1,normalTurns,artifactOwners:[{playerId:"1",artifactName:"Tráng Gương",used:true}]}).length,1);
 assert.equal(buildNightQueue({night:1,normalTurns,artifactOwners:[{playerId:"1",artifactName:"Tráng Gương",used:false}]}).length,3);
});
test("server cycle cap is three, fourth is rejected and retries are idempotent",()=>{
 let state={cycleKey:"match:night:1",accepted:[]};
 for(let i=0;i<3;i++){const r=reserveArtifactActivation(state,{requestId:String(i),playerId:String(i),artifactId:"a",cycleKey:state.cycleKey,eligible:true});assert.equal(r.ok,true);state=r.state}
 assert.equal(reserveArtifactActivation(state,{requestId:"3",playerId:"3",artifactId:"a",cycleKey:state.cycleKey,eligible:true}).error,"ARTIFACT_CYCLE_LIMIT");
 assert.equal(reserveArtifactActivation(state,{requestId:"0",playerId:"0",artifactId:"a",cycleKey:state.cycleKey,eligible:true}).idempotent,true);
});
test("resume requires membership in roster",()=>{
 assert.equal(canResumePlayer({phase:"running",rosterIds:["member:a"],playerId:"member:a"}),true);
 assert.equal(canResumePlayer({phase:"running",rosterIds:["member:a"],playerId:"member:b"}),false);
});
