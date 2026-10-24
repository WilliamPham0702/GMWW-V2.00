// Independent staging host: SAME GMWW V2 Core, with OWN Durable Objects namespace.
// No change to production Worker, no cross-Worker service binding.
import core,{RoomDurableObject as GameRoomDurableObject} from './index.js';
import {gallowsSnapshot} from './gmww-gallows-rules.js';
import {projectGmOnlyVisuals,redactStagingPublicBroadcast} from './arena3d-visual-effect-policy.mjs';
function aggregateGallowsOnly(raw){
  if(!raw)return null;
  return {stage:String(raw.stage||'ready'),mode:String(raw.mode||'auto'),
    candidateId:raw.candidateId||null,
    nominationTotals:Array.isArray(raw.nominationTotals)?raw.nominationTotals.slice(0,30)
      .map(x=>({loginId:String(x.loginId||'').slice(0,60),votes:Math.max(0,Number(x.votes)||0)})):[],
    voteTotals:{save:Math.max(0,Number(raw.voteTotals?.save)||0),
      kill:Math.max(0,Number(raw.voteTotals?.kill)||0),
      cast:Math.max(0,Number(raw.voteTotals?.cast)||0)},
    outcome:raw.outcome||null};
}
export class RoomDurableObject extends GameRoomDurableObject{
  broadcast(payload){return super.broadcast(redactStagingPublicBroadcast(payload))}
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==='/arena/gm-visuals'){
      if(request.method!=='GET')return new Response('Method not allowed',{status:405});
      const auth=await this.gmAuthorized(request);
      if(!auth.ok)return auth.response;
      const meta=auth.meta;
      if(meta.phase!=='running')return Response.json({ok:true,matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),effects:[]},{headers:{'cache-control':'no-store'}});
      const rows=await this.ctx.storage.get('interactions')||[];
      return Response.json({ok:true,matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),
        effects:projectGmOnlyVisuals(rows,{matchId:meta.matchId,cycleKey:meta.cycleKey})},
        {headers:{'cache-control':'no-store'}});
    }
    if(path!=='/arena/public-gallows')return super.fetch(request);
    if(request.method!=='GET')return new Response('Method not allowed',{status:405});
    const meta=await this.ctx.storage.get('meta');
    if(!meta)return Response.json({ok:false,error:'ROOM_NOT_FOUND'},{status:404});
    // A public replay is available only for the current morning in the current match.
    if(meta.phase!=='running'||meta.cyclePhase!=='morning'){
      return Response.json({ok:true,matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),gallows:null},
        {headers:{'cache-control':'no-store'}});
    }
    const key='gallows:'+String(meta.matchId||'')+':'+String(meta.cycleKey||'');
    const ballot=await this.ctx.storage.get(key);
    const snap=gallowsSnapshot(ballot,meta,Date.now());
    return Response.json({ok:true,matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),
      gallows:aggregateGallowsOnly(snap)},{headers:{'cache-control':'no-store'}});
  }
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/arena-staging/health'){
      return Response.json({ok:true,service:'gmww-arena3d-core-staging',
        isolated:true,core:'GMWW-V2.00',durableObjects:'staging-only',
        productionModified:false},{headers:{'cache-control':'no-store'}});
    }
    // Side-effect-free read of ONLY aggregate public ballot data.
    const publicGallows=url.pathname.match(/^\/api\/arena-staging\/rooms\/([A-Za-z0-9]{4,12})\/gallows$/);
    if(publicGallows&&request.method==='GET'){
      const roomCode=publicGallows[1].toUpperCase();
      return env.ROOMS.get(env.ROOMS.idFromName(roomCode)).fetch('https://room.internal/arena/public-gallows');
    }
    // Only Core V2 gmAuthorized may grant temporary secret visual overlays.
    const gmFx=url.pathname.match(/^\/api\/arena-staging\/rooms\/([A-Za-z0-9]{4,12})\/gm-visuals$/);
    if(gmFx&&request.method==='GET'){
      const code=gmFx[1].toUpperCase();
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(
        new Request('https://room.internal/arena/gm-visuals',{
          headers:{authorization:request.headers.get('authorization')||''}
        }));
    }
    // Never expose Runtime/IPA release/update endpoints from the staging worker.
    if(url.pathname.startsWith('/api/update')||url.pathname.startsWith('/updates/')){
      return new Response('Not available on staging',{status:404,headers:{'cache-control':'no-store'}});
    }
    return core.fetch(request,env,ctx);
  }
};
