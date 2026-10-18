import { page } from "./page.mjs";
import { classifyPreview, emptyStorage, PROD_WORKER } from "./policy.mjs";
const REPO="WilliamPham0702/GMWW-V2.00";
const ACCOUNT_LIMIT=100;
const JSON_HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer","x-frame-options":"DENY"};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:JSON_HEADERS})}
function failure(msg,status=503){return json({error:msg},status)}
const path=(s)=>encodeURIComponent(s);
export async function keyMatches(provided,expected){
  if(typeof expected!=="string"||expected.length<32||typeof provided!=="string"||provided.length<32)return false;
  const enc=new TextEncoder();
  const [a,b]=await Promise.all([crypto.subtle.digest("SHA-256",enc.encode(provided)),crypto.subtle.digest("SHA-256",enc.encode(expected))]);
  const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;
  for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
async function authorize(request,env){
  const value=request.headers.get("authorization")||"";
  if(!value.startsWith("Bearer "))return false;
  return keyMatches(value.slice(7),env.ADMIN_DASHBOARD_KEY);
}
function required(env){
  return typeof env?.CLOUDFLARE_ACCOUNT_ID==="string"&&/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID)
    &&typeof env?.CF_MANAGEMENT_API_TOKEN==="string"&&env.CF_MANAGEMENT_API_TOKEN.length>=20
    &&typeof env?.ADMIN_DASHBOARD_KEY==="string"&&env.ADMIN_DASHBOARD_KEY.length>=32
    &&env.AUDIT&&typeof env.AUDIT.put==="function"&&typeof env.AUDIT.list==="function";
}
function cf(env,request=fetch){
  const prefix="https://api.cloudflare.com/client/v4/accounts/"+env.CLOUDFLARE_ACCOUNT_ID;
  return async (endpoint,method="GET")=>{
    if(!endpoint.startsWith("/")||endpoint.includes(".."))throw Error("Invalid Cloudflare endpoint");
    const r=await request(prefix+endpoint,{method,headers:{authorization:"Bearer "+env.CF_MANAGEMENT_API_TOKEN,accept:"application/json"}});
    const body=await r.json();
    if(!r.ok||!body?.success)throw Error("Cloudflare API verification failed: HTTP "+r.status);
    return body;
  };
}
async function github(request=fetch,env={}){
  const prs=[];
  for(let n=1;n<=10;n++){
    const r=await request("https://api.github.com/repos/"+REPO+"/pulls?state=all&per_page=100&page="+n,{
      headers:{accept:"application/vnd.github+json","user-agent":"GMWW-Cloudflare-Admin/1.0",
        ...(env.GITHUB_API_TOKEN?{authorization:"Bearer "+env.GITHUB_API_TOKEN}:{})}});
    if(!r.ok)throw Error("GitHub PR inventory incomplete: HTTP "+r.status);
    const rows=await r.json();if(!Array.isArray(rows))throw Error("Invalid PR response");
    prs.push(...rows);if(rows.length<100)return prs;
  }
  throw Error("GitHub pagination safety bound exceeded");
}
async function pages(api,prefix,maxPages=10){
  const items=[];
  for(let i=1;i<=maxPages;i++){
    const r=await api(prefix+(prefix.includes("?")?"&":"?")+"page="+i+"&per_page=100");
    if(!Array.isArray(r.result)||!r.result_info)throw Error("Incomplete Cloudflare listing");
    items.push(...r.result);
    if(i>=Number(r.result_info.total_pages||1))return{items,count:r.result_info.total_count??items.length};
  }
  throw Error("Cloudflare pagination safety bound exceeded");
}
export async function inventory(env,request=fetch){
  const api=cf(env,request);
  const [previews,namespaces,settings,prs]=await Promise.all([
    pages(api,"/workers/workers/"+PROD_WORKER+"/previews"),
    pages(api,"/workers/durable_objects/namespaces"),
    api("/workers/scripts/"+PROD_WORKER+"/settings"),github(request,env)]);
  const ids=new Set((settings.result?.bindings||[]).filter(x=>x.type==="durable_object_namespace")
    .map(x=>x.namespace_id).filter(Boolean));
  if(!ids.size)throw Error("Cannot verify production Durable Object bindings");
  const openPrs=prs.filter(x=>x.state==="open");
  const classifications=previews.items.map(x=>classifyPreview(x,prs,openPrs,namespaces.items,ids));
  const candidates=classifications.filter(x=>x.reason==="CANDIDATE");
  return {api,previews,namespaces,ids,candidates,
    protectedCount:previews.items.length-candidates.length,productionVerified:true};
}
export async function verifiedCandidates(inv,limit=30){
  if(inv.candidates.length>limit)throw Error("Too many candidates: explicit smaller cleanup batch required");
  const eligible=[];
  for(const x of inv.candidates){
    const status=await inv.api("/workers/durable_objects/namespaces/"+x.namespaceId+"/objects?limit=1000");
    if(emptyStorage(status))eligible.push(x);
  }
  return eligible;
}
async function audit(env,{action,status,preview="",pr=null,detail=""}){
  // Audit before deletion; refuse destructive actions when persistent audit cannot be written.
  const record={at:new Date().toISOString(),action,status,preview,pr,detail};
  const key="audit:"+String(Date.now()).padStart(13,"0")+":"+crypto.randomUUID();
  await env.AUDIT.put(key,JSON.stringify(record),{expirationTtl:90*86400});
}
async function deletion(env,inv,selected,actor,request=fetch){
  if(!selected||!inv.candidates.some(x=>x.previewId===selected.previewId))throw Error("Preview not eligible");
  // Re-fetch exact resource just before DELETE; protect against expired ID and data creation.
  const previews=await inv.api("/workers/workers/"+PROD_WORKER+"/previews/"+selected.previewId);
  if(previews.result?.id!==selected.previewId||previews.result.name!==selected.preview)throw Error("Preview changed");
  const nsList=await inv.api("/workers/durable_objects/namespaces/"+selected.namespaceId+"/objects?limit=1000");
  if(!emptyStorage(nsList))throw Error("Preview has data or cannot be proven empty");
  const settings=await inv.api("/workers/scripts/"+PROD_WORKER+"/settings");
  const active=(settings.result?.bindings||[]).filter(x=>x.type==="durable_object_namespace").map(x=>x.namespace_id);
  if(!active.length||active.includes(selected.namespaceId))throw Error("Production binding guard blocked deletion");
  await audit(env,{action:actor,status:"STARTED",preview:selected.preview,pr:selected.pr});
  await inv.api("/workers/workers/"+PROD_WORKER+"/previews/"+selected.previewId,"DELETE");
  const [afterPreview,afterNs,afterSettings]=await Promise.all([
    pages(inv.api,"/workers/workers/"+PROD_WORKER+"/previews"),
    pages(inv.api,"/workers/durable_objects/namespaces"),
    inv.api("/workers/scripts/"+PROD_WORKER+"/settings")]);
  if(afterPreview.items.some(x=>x.id===selected.previewId)||afterNs.items.some(x=>x.id===selected.namespaceId)||
    !(afterSettings.result?.bindings||[]).some(x=>active.includes(x.namespace_id)))
    throw Error("Post-delete verification failed");
  await audit(env,{action:actor,status:"SUCCESS",preview:selected.preview,pr:selected.pr});
  return{preview:selected.preview,namespaceRemoved:true};
}
async function logs(env){
  const listing=await env.AUDIT.list({prefix:"audit:",limit:100});
  const keys=listing.keys||[];
  const last=keys.slice().sort((a,b)=>b.name.localeCompare(a.name)).slice(0,40);
  const items=[];
  for(const key of last){const v=await env.AUDIT.get(key.name,"json");if(v)items.push(v)}
  return items;
}
async function handler(request,env){
  const pathname=new URL(request.url).pathname;
  if(pathname==="/"&&request.method==="GET")
    return new Response(page,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store",
      "content-security-policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "x-frame-options":"DENY","x-content-type-options":"nosniff"}});
  if(pathname==="/health")return json({service:"GMWW Cloudflare Administration",status:"online",authenticated:false});
  if(pathname==="/api/public-status"&&request.method==="GET"){
    // Only mirror an already-public, aggregate GitHub Actions maintenance status.
    const u="https://api.github.com/repos/WilliamPham0702/GMWW-V2.00/issues/320";
    const r=await fetch(u,{headers:{accept:"application/vnd.github+json","user-agent":"GMWW-Cloudflare-Admin/1.0"}});
    if(!r.ok)return failure("Không đọc được trạng thái bảo trì GitHub",503);
    const issue=await r.json();
    const match=String(issue.body||"").match(/<!-- GMWW_CF_STATUS_START -->\\s*(\\{[^\\n]*\\})\\s*<!-- GMWW_CF_STATUS_END -->/);
    if(!match)return failure("Chưa có báo cáo bảo trì được xác minh",503);
    const raw=JSON.parse(match[1]);
    const num=k=>Number.isSafeInteger(raw[k])&&raw[k]>=0?raw[k]:null;
    if(raw.schema!==1||num("namespaceCount")===null||num("previewCount")===null||raw.productionProtected!==true)
      return failure("Báo cáo bảo trì chưa đạt điều kiện xác minh",503);
    return json({namespaceCount:num("namespaceCount"),previewCount:num("previewCount"),
      eligibleCount:num("eligibleCount"),protectedCount:num("protectedCount"),unlinkedCount:num("unlinkedCount"),
      deletedCount:num("deletedCount"),updatedAt:String(raw.updatedAt||"").slice(0,32),
      mode:String(raw.mode||"").slice(0,24),productionProtected:true,
      reportUrl:"https://github.com/WilliamPham0702/GMWW-V2.00/issues/320",
      actionsUrl:"https://github.com/WilliamPham0702/GMWW-V2.00/actions/workflows/cloudflare-maintenance.yml"});
  }
  if(!pathname.startsWith("/api/"))return failure("Not found",404);
  if(!required(env))return failure("Backend chưa có secret quản trị hoặc audit storage",503);
  if(!await authorize(request,env))return failure("Không được phép: chỉ dành cho quản trị viên",401);
  if(pathname==="/api/logs"&&request.method==="GET")return json({items:await logs(env)});
  if(pathname==="/api/overview"&&request.method==="GET"){
    const i=await inventory(env);return json({namespaces:i.namespaces.count,limit:ACCOUNT_LIMIT,
      previews:i.previews.count,candidateCount:i.candidates.length,protectedCount:i.protectedCount,productionVerified:i.productionVerified});
  }
  if(pathname==="/api/scan"&&request.method==="POST"){
    const i=await inventory(env);
    const eligible=await verifiedCandidates(i);
    return json({eligible:eligible.map(x=>({preview:x.preview,previewId:x.previewId,pr:x.pr})),protectedCount:i.previews.count-eligible.length});
  }
  if(pathname==="/api/cleanup"&&request.method==="POST"){
    const b=await request.json().catch(()=>null);
    if(b?.confirm!=="DELETE_VERIFIED_PREVIEW"||typeof b.previewId!=="string"||!/^[a-f0-9]{32}$/.test(b.previewId))
      return failure("Yêu cầu dọn dẹp không hợp lệ",400);
    const i=await inventory(env);const target=i.candidates.find(x=>x.previewId===b.previewId);
    if(!target)return failure("Preview không đủ điều kiện dọn dẹp",409);
    const done=await deletion(env,i,target,"MANUAL");
    return json({ok:true,message:"Đã xoá Preview "+done.preview+" và xác minh namespace được giải phóng"});
  }
  return failure("Not found",404);
}
export default{
  async fetch(request,env){
    try{return await handler(request,env)}
    catch(e){console.error("ADMIN_CLEANUP_ERROR",e?.message);return failure("Không thể xác minh hoặc xử lý yêu cầu; không xoá thêm tài nguyên",503)}
  },
  async scheduled(controller,env,ctx){
    if(!required(env)){console.warn("ADMIN_AUTO_DISABLED_MISSING_SECRET");return}
    try{
      const i=await inventory(env);
      const ready=await verifiedCandidates(i);
      for(const x of ready.slice(0,5)){
        try{await deletion(env,i,x,"SCHEDULED")}catch(e){console.warn("ADMIN_AUTO_SKIPPED",x.preview,e?.message)}
      }
    }catch(e){console.warn("ADMIN_AUTO_ABORTED",e?.message)}
  }
};
