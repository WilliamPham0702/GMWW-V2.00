// Isolated, read-only Character V5.63 whole-3D-skin lab. No Durable Object, game accounts,
// room state, OTA manifest, IPA, KV, or production runtime dependencies.
export default {
 async fetch(request, env){
  if(request.method!=='GET'&&request.method!=='HEAD')
   return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
  const url=new URL(request.url);
  if(url.pathname==='/'){
   url.pathname='/characters/v5/test-skin-v562';
   return Response.redirect(url.toString(),302);
  }
  if(url.pathname==='/api/health'){
   return Response.json({ok:true,project:'GMWW Character V5.63 isolated full-skin lab',mode:'preview-only',liveGameModified:false},
     {headers:{'cache-control':'no-store'}});
  }
  if(!env.ASSETS)return new Response('Preview assets unavailable',{status:503});
  return env.ASSETS.fetch(request);
 }
};
