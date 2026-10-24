// Independent staging host: SAME GMWW V2 Core, with OWN Durable Objects namespace.
// No change to production Worker, no cross-Worker service binding.
import core,{RoomDurableObject as GameRoomDurableObject} from './index.js';
import {gallowsSnapshot} from './gmww-gallows-rules.js';
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
  async fetch(request){
    if(new URL(request.url).pathname!=='/arena/public-gallows')return super.fetch(request);
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
    // Never expose Runtime/IPA release/update endpoints from the staging worker.
    if(url.pathname.startsWith('/api/update')||url.pathname.startsWith('/updates/')){
      return new Response('Not available on staging',{status:404,headers:{'cache-control':'no-store'}});
    }
    return core.fetch(request,env,ctx);
  }
};
