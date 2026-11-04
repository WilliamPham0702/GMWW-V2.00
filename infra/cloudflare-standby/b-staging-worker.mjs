import {handleBStage3,Stage3SyntheticState} from './b-stage3-e2e.mjs';
export {Stage3SyntheticState};
/**
 * GMWW Cloudflare B Stage 3: publicly readable SYNTHETIC health-only Worker.
 * No GMWW Production imports, credentials, Durable Objects, players, or failover.
 */
const STAGING_HOST=/^gmww-b-staging-synthetic\.[a-z0-9-]+\.workers\.dev$/;
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gmww-environment':'b-staging-synthetic'};
function reply(body,status){return new Response(JSON.stringify(body),{status,headers});}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(!STAGING_HOST.test(url.hostname))return reply({ok:false,error:'STAGING_HOST_REQUIRED'},403);
    if(url.pathname.startsWith('/qa/'))return handleBStage3(request,env);
    if(request.method==='GET'&&url.pathname==='/health')
      return reply({ok:true,environment:'cloudflare-b',mode:'synthetic-only',
        productionSwitchAllowed:false,productionDataConnected:false,
        loginSessionVerified:false,websocketVerified:false},200);
    return reply({ok:false,error:'SYNTHETIC_HEALTH_ONLY',
      message:'No login, real game, storage or failover on this staging Worker.'},404);
  }
};
