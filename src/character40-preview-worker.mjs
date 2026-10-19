export default {async fetch(request,env){
  if(!['GET','HEAD'].includes(request.method))return new Response('Read only',{status:405});
  const path=new URL(request.url).pathname;
  if(path==='/api/health')return Response.json({ok:true,mode:'preview-only',catalogCount:40,liveGameModified:false});
  if(path.startsWith('/api/'))return new Response('Not found',{status:404});
  return env.ASSETS.fetch(request);
}};
