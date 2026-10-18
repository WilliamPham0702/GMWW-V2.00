import test from "node:test";
import assert from "node:assert/strict";
import {classifyPreview,emptyStorage} from "../tools/cloudflare-admin/policy.mjs";
import worker,{keyMatches} from "../tools/cloudflare-admin/worker.mjs";
const REPO="WilliamPham0702/GMWW-V2.00",name="fix/old-verified";
function fixture(){
 const now=Date.parse("2026-10-18T16:00:00Z");
 const pr={number:321,state:"closed",closed_at:"2026-10-15T16:00:00Z",
   head:{ref:name,repo:{full_name:REPO}},base:{ref:"main"},labels:[]};
 const preview={id:"a".repeat(32),name,slug:"fix-old-verified",deployed_on:"2026-10-14T15:00:00Z"};
 const namespace={id:"b".repeat(32),name:"gmww-v2-00_fix-old-verified_RoomDurableObject",script:"gmww-v2-00"};
 return{now,pr,preview,namespace,productionIds:new Set(["c".repeat(32)])}
}
function candidate(f){
 return classifyPreview(f.preview,[f.pr],[],[f.namespace],f.productionIds,f.now);
}
test("only an isolated preview of exactly one closed PR is considered",()=>{
 const f=fixture();const a=candidate(f);
 assert.equal(a.reason,"CANDIDATE");assert.equal(a.namespaceId,f.namespace.id);
});
test("retain live PRs, unlabeled stale branches, and unknown PRs",()=>{
 const f=fixture();
 assert.equal(classifyPreview(f.preview,[f.pr],[{head:{ref:name}}],[f.namespace],f.productionIds,f.now).reason,"PR_OPEN");
 assert.equal(classifyPreview(f.preview,[],[],[f.namespace],f.productionIds,f.now).reason,"PR_NOT_UNIQUE_OR_UNLINKED");
 assert.equal(classifyPreview(f.preview,[f.pr,f.pr],[],[f.namespace],f.productionIds,f.now).reason,"PR_NOT_UNIQUE_OR_UNLINKED");
});
test("cooldown, deployment after PR close, and retention labels skip deletion",()=>{
 const f=fixture();f.pr.closed_at="2026-10-18T00:00:00Z";
 assert.equal(candidate(f).reason,"COOLDOWN");
 f.pr.closed_at="2026-10-15T16:00:00Z";f.preview.deployed_on="2026-10-17T00:00:00Z";
 assert.equal(candidate(f).reason,"PREVIEW_CHANGED_AFTER_CLOSE");
 f.preview.deployed_on="2026-10-14T15:00:00Z";f.pr.labels=[{name:"keep-preview"}];
 assert.equal(candidate(f).reason,"RETAIN_LABEL");
});
test("never delete Production or namespace that does not belong to exact Worker",()=>{
 const f=fixture();f.productionIds.add(f.namespace.id);
 assert.equal(candidate(f).reason,"PRODUCTION_PROTECTED");
 f.productionIds=new Set(["c".repeat(32)]);f.namespace.script="gmww";
 assert.equal(candidate(f).reason,"NAMESPACE_NOT_UNIQUE");
 f.namespace.script="gmww-v2-00";f.productionIds=new Set();
 assert.equal(candidate(f).reason,"PRODUCTION_PROTECTED");
});
test("data, errors, cursors, and uncertain counts block deletion",()=>{
 const r={success:true,result:[],result_info:{count:0,cursor:""}};
 assert.equal(emptyStorage(r),true);
 assert.equal(emptyStorage({...r,result:[{hasStoredData:false}],result_info:{count:1}}),false);
 assert.equal(emptyStorage({...r,result_info:{count:0,cursor:"more"}}),false);
 assert.equal(emptyStorage({...r,result_info:{}}),false);
 assert.equal(emptyStorage({...r,success:false}),false);
});
test("admin secret must be strong and authorization compare rejects unset or wrong keys",async()=>{
 const key="a".repeat(48);
 assert.equal(await keyMatches(key,key),true);
 assert.equal(await keyMatches("b".repeat(48),key),false);
 assert.equal(await keyMatches("",key),false);
 assert.equal(await keyMatches(key,undefined),false);
});
test("public health excludes secrets; API fails closed if not configured",async()=>{
 const url="https://gmww-cloudflare-admin.workers.dev";
 const health=await worker.fetch(new Request(url+"/health"),{});
 assert.equal(health.status,200);
 assert.equal((await health.json()).authenticated,false);
 const denied=await worker.fetch(new Request(url+"/api/overview"),{});
 assert.equal(denied.status,503);
 const page=await worker.fetch(new Request(url+"/"),{});
 assert.equal(page.status,200);
 assert.match(await page.text(),/Quản lý Cloudflare|GMWW Cloudflare/);
});
