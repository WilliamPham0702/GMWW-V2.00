// Same-origin gateway. The production Worker and Durable Objects remain authoritative.
const WORKER_ORIGIN='https://gmww-v2-00.williampham0702.workers.dev';
export default {async fetch(request,env){
  if(!env.GMWW_SERVER||typeof env.GMWW_SERVER.fetch!=='function')
    return new Response('Không thể kết nối Game Ma Sói.',{status:503,headers:{'cache-control':'no-store'}});
  try {
    // Pass the original Request unchanged: URL, body, cookies, auth and WebSocket Upgrade.
    const response=await env.GMWW_SERVER.fetch(request);
    const location=response.headers.get('location');
    if(response.status>=300&&response.status<400&&location){
      const target=new URL(location,request.url);
      if(target.origin===WORKER_ORIGIN){
        const publicUrl=new URL(request.url);
        publicUrl.pathname=target.pathname;publicUrl.search=target.search;publicUrl.hash=target.hash;
        const headers=new Headers(response.headers);headers.set('location',publicUrl.toString());
        return new Response(response.body,{status:response.status,headers});
      }
    }
    return response;
  } catch {
    return new Response('Máy chủ tạm thời không khả dụng.',{status:502,headers:{'cache-control':'no-store'}});
  }
}};
