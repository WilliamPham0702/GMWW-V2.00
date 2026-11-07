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

for (const schema of [1,2]) test(`public status mirrors verified aggregate maintenance report schema ${schema}`,async()=>{
 const original=globalThis.fetch;
 try{
  const published={schema,namespaceCount:18,previewCount:17,eligibleCount:0,protectedCount:5,unlinkedCount:12,
   updatedAt:"2026-10-18T14:45:02.705Z",mode:"cleanup",productionProtected:true};
  globalThis.fetch=async()=>new Response(JSON.stringify({body:
   "<!-- GMWW_CF_STATUS_START -->\n"+JSON.stringify(published)+"\n<!-- GMWW_CF_STATUS_END -->"}),{status:200});
  const r=await worker.fetch(new Request("https://admin.test/api/public-status"),{});
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.namespaceCount,18);
  assert.equal(data.productionProtected,true);
  assert.equal(data.reportUrl,"https://github.com/WilliamPham0702/GMWW-V2.00/issues/320");
  assert.equal(Object.hasOwn(data,"accountId"),false);
 }finally{globalThis.fetch=original}
});
test("public status rejects reports without explicit production protection",async()=>{
 const original=globalThis.fetch;
 try{
  const body=JSON.stringify({schema:2,namespaceCount:18,previewCount:17,productionProtected:false});
  globalThis.fetch=async()=>new Response(JSON.stringify({body:"<!-- GMWW_CF_STATUS_START -->\n"+body+"\n<!-- GMWW_CF_STATUS_END -->"}),{status:200});
  const r=await worker.fetch(new Request("https://admin.test/api/public-status"),{});
  assert.equal(r.status,503);
 }finally{globalThis.fetch=original}
});

for(const schema of [0,3]) test(`public status rejects unknown report schema ${schema}`,async()=>{
 const original=globalThis.fetch;
 try{
  const published={schema,namespaceCount:18,previewCount:17,productionProtected:true};
  globalThis.fetch=async()=>new Response(JSON.stringify({body:
   "<!-- GMWW_CF_STATUS_START -->\\n"+JSON.stringify(published)+"\\n<!-- GMWW_CF_STATUS_END -->"}),{status:200});
  const response=await worker.fetch(new Request("https://admin.test/api/public-status"),{});
  assert.equal(response.status,503);
 }finally{globalThis.fetch=original}
});

/* Quota meter (GM Server Settings): aggregate usage only, no secrets. */
import { summarizeUsage, usageStatus } from "../tools/cloudflare-admin/worker.mjs";
test("usage status thresholds: ok <80, warn >=80, over >=100",()=>{
 assert.equal(usageStatus(79.9),"ok");assert.equal(usageStatus(80),"warn");assert.equal(usageStatus(100),"over");
});
test("summarizeUsage computes day percent against free limits and uses the worst metric",()=>{
 const out=summarizeUsage({day:[{sum:{requests:85000,errors:3}}],doDay:[{sum:{requests:10000}}],
  month:[{sum:{requests:900000}}],doMonth:[{sum:{requests:50000}}]},new Date("2026-11-07T03:00:00Z"));
 assert.equal(out.percent.workers,85);assert.equal(out.percent.durableObjects,10);
 assert.equal(out.status,"warn");assert.equal(out.month.workers,900000);
 assert.equal(JSON.stringify(out).includes("token"),false);
});
test("public usage route answers aggregate JSON with CORS and never leaks the token",async()=>{
 const original=globalThis.fetch;let seenAuth="";
 try{
  globalThis.fetch=async(url,init)=>{seenAuth=init.headers.authorization;
   return new Response(JSON.stringify({data:{viewer:{accounts:[{day:[{sum:{requests:100,errors:0}}],doDay:[{sum:{requests:5}}],month:[{sum:{requests:100}}],doMonth:[{sum:{requests:5}}]}]}}}),{status:200})};
  const env={CLOUDFLARE_ACCOUNT_ID:"a".repeat(32),CF_MANAGEMENT_API_TOKEN:"t".repeat(30)};
  const r=await worker.fetch(new Request("https://admin.test/api/public-usage"),env);
  assert.equal(r.status,200);assert.equal(r.headers.get("access-control-allow-origin"),"*");
  const data=await r.json();assert.equal(data.status,"ok");assert.equal(seenAuth,"Bearer "+env.CF_MANAGEMENT_API_TOKEN);
  assert.equal(JSON.stringify(data).includes(env.CF_MANAGEMENT_API_TOKEN),false);
 }finally{globalThis.fetch=original}
});
test("public usage route reports missing permission instead of fake numbers",async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({data:null,errors:[{message:"not authorized"}]}),{status:200});
  const env={CLOUDFLARE_ACCOUNT_ID:"a".repeat(32),CF_MANAGEMENT_API_TOKEN:"t".repeat(30)};
  const r=await worker.fetch(new Request("https://admin.test/api/public-usage"),env);
  assert.equal(r.status,503);assert.match((await r.json()).error,/Account Analytics Read/);
 }finally{globalThis.fetch=original}
});
