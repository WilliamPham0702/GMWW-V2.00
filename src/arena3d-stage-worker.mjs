// Independent staging host: same GMWW V2 Core, but its OWN Durable Object namespace.
// This wrapper does not change the game engine or Player Web implementation.
import core from './index.js';
export {RoomDurableObject} from './index.js';
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/arena-staging/health'){
      return Response.json({ok:true,service:'gmww-arena3d-core-staging',
        isolated:true,core:'GMWW-V2.00',durableObjects:'staging-only',
        productionModified:false}, {headers:{'cache-control':'no-store'}});
    }
    // No Runtime/IPA update or production release endpoints in staging.
    if(url.pathname.startsWith('/api/update')||url.pathname.startsWith('/updates/')){
      return new Response('Not available on staging',{status:404,headers:{'cache-control':'no-store'}});
    }
    return core.fetch(request,env,ctx);
  }
};
