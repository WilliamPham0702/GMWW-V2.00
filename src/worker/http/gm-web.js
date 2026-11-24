// GM Server trên web (PC/trình duyệt) + PWA.
// Không có bản sao riêng: trang lấy đúng các file Runtime đã phát hành trong /updates/runtime/V<bản>/,
// nên PC và iPhone luôn chạy cùng một GM Server. Mọi lệnh vẫn đi qua API có token như trong IPA.
import { VERSION } from "../config.js";

export const GM_WEB_PREFIX="/gm-server";
const NO_CACHE={"cache-control":"no-cache","x-content-type-options":"nosniff"};

export const GM_WEB_MANIFEST={
  name:"GMWW GM Server",short_name:"GMWW GM",id:GM_WEB_PREFIX+"/",start_url:GM_WEB_PREFIX+"/",scope:GM_WEB_PREFIX+"/",
  display:"standalone",orientation:"any",background_color:"#06121a",theme_color:"#0b2233",lang:"vi",
  icons:[
    {src:"/favicon.svg",sizes:"any",type:"image/svg+xml",purpose:"any"},
    {src:GM_WEB_PREFIX+"/gm/gm-white-wolf.webp",sizes:"512x512",type:"image/webp",purpose:"any"}
  ]
};

// Service worker: luôn lấy mạng trước (GM cần bản mới nhất), chỉ dùng cache khi mất mạng.
// Không bao giờ cache /api/ để lệnh GM và dữ liệu phòng luôn đi thẳng tới server.
export const GM_WEB_SERVICE_WORKER=`const CACHE='gmww-gm-web-v1';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith('${GM_WEB_PREFIX}/'))return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c)).catch(()=>{})}return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('${GM_WEB_PREFIX}/'):undefined)).then(m=>m||new Response('GMWW GM Server: mất kết nối',{status:503}))));
});
`;

const PWA_HEAD=`<link rel="manifest" href="${GM_WEB_PREFIX}/manifest.webmanifest">
<meta name="theme-color" content="#0b2233">
<meta name="apple-mobile-web-app-capable" content="yes">
<script>window.GMWW_GM_WEB=true;if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('${GM_WEB_PREFIX}/sw.js',{scope:'${GM_WEB_PREFIX}/'}).catch(()=>{}));</script>
`;

export function gmWebHtml(html){
  const s=String(html||"");
  return s.includes("</head>")?s.replace("</head>",PWA_HEAD+"</head>"):PWA_HEAD+s;
}

// Đường dẫn file con hợp lệ (không thoát khỏi thư mục Runtime).
export function gmWebAssetPath(pathname){
  if(!pathname.startsWith(GM_WEB_PREFIX+"/"))return null;
  let rest=pathname.slice(GM_WEB_PREFIX.length+1);
  if(rest===""||rest==="index.html")rest="GMWW.html";
  try{rest=decodeURIComponent(rest)}catch{return null}
  if(!/^[A-Za-z0-9._\-/]{1,200}$/.test(rest)||rest.split("/").some(p=>p===""||p==="."||p===".."))return null;
  return rest;
}

async function runtimeVersions(env,request){
  const list=[VERSION.replace(/^V/i,"")];
  try{
    const u=new URL(request.url);u.pathname="/updates/latest.json";u.search="";
    const r=await env.ASSETS.fetch(new Request(u.toString(),{method:"GET"}));
    if(r.ok){const v=String((await r.json())?.releaseVersion||"");if(/^\d+\.\d+$/.test(v)&&!list.includes(v))list.push(v)}
  }catch{}
  return list;
}

export async function handleGmWebRoute(request,env,url){
  if(url.pathname===GM_WEB_PREFIX)return Response.redirect(new URL(GM_WEB_PREFIX+"/",url).toString(),301);
  if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405});
  if(url.pathname===GM_WEB_PREFIX+"/manifest.webmanifest")return new Response(JSON.stringify(GM_WEB_MANIFEST),{headers:{...NO_CACHE,"content-type":"application/manifest+json; charset=UTF-8"}});
  if(url.pathname===GM_WEB_PREFIX+"/sw.js")return new Response(GM_WEB_SERVICE_WORKER,{headers:{...NO_CACHE,"content-type":"application/javascript; charset=UTF-8","service-worker-allowed":GM_WEB_PREFIX+"/"}});
  const file=gmWebAssetPath(url.pathname);
  if(!file)return new Response("Not found",{status:404});
  if(!env.ASSETS)return new Response("GM Server assets unavailable",{status:503,headers:NO_CACHE});
  for(const v of await runtimeVersions(env,request)){
    const u=new URL(request.url);u.pathname="/updates/runtime/V"+v+"/"+file;u.search="";
    const res=await env.ASSETS.fetch(new Request(u.toString(),{method:request.method,headers:file==="GMWW.html"?undefined:request.headers}));
    if(res.status===304)return new Response(null,{status:304,headers:{...Object.fromEntries(res.headers),...NO_CACHE}});
    if(!res.ok)continue;
    const headers=new Headers(res.headers);for(const [k,val] of Object.entries(NO_CACHE))headers.set(k,val);
    if(file==="GMWW.html"){
      headers.set("content-type","text/html; charset=UTF-8");headers.delete("content-length");headers.delete("etag");
      return new Response(request.method==="HEAD"?null:gmWebHtml(await res.text()),{status:200,headers});
    }
    return new Response(res.body,{status:200,headers});
  }
  if(file==="GMWW.html")return new Response("<!doctype html><meta charset=utf-8><title>GMWW GM Server</title><p style='font:16px system-ui;padding:24px'>GM Server chưa sẵn sàng trên web (chưa có gói Runtime đã phát hành). Thử lại sau vài phút.</p>",{status:503,headers:{...NO_CACHE,"content-type":"text/html; charset=UTF-8"}});
  return new Response("Not found",{status:404,headers:NO_CACHE});
}
