// Isolated Arena 3D PREVIEW only. No Durable Objects, game API, or authentication.
const ALLOWED=new Set([
  '/village/arena-3d/index.html',
  '/village/arena-3d/main.mjs',
  '/village/dual-renderer-core.mjs',
  '/characters/v5/vendor/three.module.min.js',
  '/characters/v5/vendor/three.core.min.js'
]);
const safetyHeaders={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Cache-Control':'no-store',
  'X-GMWW-Isolated-Preview':'arena3d-v1'
};
export default {
  async fetch(request,env){
    if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:safetyHeaders});
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return Response.json({
      ok:true,service:'gmww-arena3d-preview',mode:'synthetic-only',
      liveGameModified:false,durableObjects:false,playerWebModified:false
    },{headers:safetyHeaders});
    if(url.pathname==='/'||url.pathname==='/village/arena-3d'){
      return Response.redirect(new URL('/village/arena-3d/',url),302);
    }
    if(url.pathname==='/village/arena-3d/')url.pathname='/village/arena-3d/index.html';
    if(!ALLOWED.has(url.pathname))return new Response('Not found — Arena Preview only',{status:404,headers:safetyHeaders});
    const result=await env.ASSETS.fetch(new Request(url,request));
    const headers=new Headers(result.headers);
    for(const [k,v] of Object.entries(safetyHeaders))headers.set(k,v);
    return new Response(result.body,{status:result.status,headers});
  }
};
