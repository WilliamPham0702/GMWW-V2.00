// Independent staging host: SAME GMWW V2 Core, with OWN Durable Objects namespace.
// No change to production Worker, no cross-Worker service binding.
import core,{RoomDurableObject as GameRoomDurableObject} from './index.js';
import {gallowsSnapshot} from './gmww-gallows-rules.js';
import {projectGmOnlyVisuals,redactStagingPublicBroadcast} from './arena3d-visual-effect-policy.mjs';
import {stageCastingCue,classifyCastingAction} from '../assets/village/arena-3d/casting-choreography.mjs';
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
  async captureAuthorizedCast(response,body,phase){
    if(!response?.ok)return response;
    const result=await response.clone().json().catch(()=>null);
    if(result?.ok!==true||result?.idempotent===true)return response;
    const meta=await this.ctx.storage.get('meta');
    if(meta?.phase!=='running'||meta.cyclePhase!==phase||!meta.matchId||!meta.cycleKey)return response;
    const actorId=String(body?.actorId||'');
    const targets=Array.isArray(body?.targetIds)?body.targetIds:[];
    const kind=classifyCastingAction(body?.actionId);
    if(!/^[a-z0-9._-]{1,80}$/i.test(actorId)||!kind)return response;
    const now=Date.now();
    await this.ctx.storage.put('arena:lastCast:'+meta.matchId,{
      matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),phase,
      turnId:phase==='night'?String(body?.turnId||''):'day:'+String(body?.clientEventId||'').slice(0,90),
      actorIds:['member:'+actorId],targetIds:targets.filter(id=>/^[a-z0-9._-]{1,80}$/i.test(String(id))).map(id=>'member:'+id),
      kind,createdAt:now,expiresAt:now+4500
    });
    return response;
  }
  async gmBattleAction(request,body){
    const response=await super.gmBattleAction(request,body);
    return this.captureAuthorizedCast(response,body,'night');
  }
  async gmDayAction(request,body){
    const response=await super.gmDayAction(request,body);
    return this.captureAuthorizedCast(response,body,'morning');
  }
  async gmNightControls(meta){
    if(meta.phase!=='running'||meta.cyclePhase!=='night')return null;
    const rt=await this.getNightRuntime(meta,Math.max(1,Number(meta.cycleNight)||1),true);
    const step=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;
    if(!step)return {complete:rt?.completed===true,turnId:null,actorIds:[],roleId:null,label:'Kết thúc đêm'};
    const actors=[...new Set([
      ...(Array.isArray(step.loginIds)?step.loginIds:[step.loginId]),
      ...((step.kind==='role-group'&&Array.isArray(step.roles))?step.roles.flatMap(r=>r.loginIds||[]):[])
    ].filter(id=>typeof id==='string'&&/^[a-z0-9._-]{1,80}$/i.test(id)))];
    const roles=step.kind==='role-group'?(step.roles||[]).map(r=>({
      roleId:String(r.roleId||'').slice(0,80),
      label:String(r.label||r.roleId||'').slice(0,80),
      actorIds:(r.loginIds||[]).filter(id=>actors.includes(id)).map(id=>'member:'+id)
    })):[];
    return {complete:false,turnId:String(step.id||'').slice(0,160),
      label:String(step.label||step.kind||'Đến lượt').slice(0,120),
      kind:String(step.kind||'').slice(0,35),
      roleId:String(step.roleId||'').slice(0,80),
      actorIds:actors.map(id=>'member:'+id),roles,
      stepIndex:Math.max(0,Number(rt.cursor)||0),
      totalSteps:Math.max(0,rt.queue?.length||0)};
  }
  async gmCastingState(meta){
    if(meta.phase!=='running')return null;
    const now=Date.now();
    const saved=await this.ctx.storage.get('arena:lastCast:'+String(meta.matchId||''));
    if(meta.cyclePhase==='night'){
      const rt=await this.getNightRuntime(meta,Math.max(1,Number(meta.cycleNight)||1),false);
      const step=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;
      if(!step)return null;
      const logins=[...(Array.isArray(step.loginIds)?step.loginIds:[step.loginId]),
        ...((step.kind==='role-group'&&Array.isArray(step.roles))?step.roles.flatMap(r=>r.loginIds||[r.loginId]):[])];
      const actorIds=[...new Set(logins.filter(id=>typeof id==='string'&&/^[a-z0-9._-]{1,80}$/i.test(id)).map(id=>'member:'+id))];
      if(!actorIds.length)return null; // introduction/wakeup without an actual actor
      const current=String(step.id||'');
      const matched=saved&&saved.turnId===current&&saved.cycleKey===meta.cycleKey&&saved.matchId===meta.matchId&&saved.expiresAt>now;
      return stageCastingCue({
        matchId:meta.matchId,cycleKey:meta.cycleKey,phase:'night',turnId:current,
        actorIds,
        ...(matched?{targetIds:saved.targetIds,kind:saved.kind,createdAt:saved.createdAt,expiresAt:saved.expiresAt}:{})
      },now);
    }
    if(meta.cyclePhase==='morning'&&saved&&saved.phase==='morning'&&saved.matchId===meta.matchId&&
       saved.cycleKey===meta.cycleKey&&saved.expiresAt>now){
      return stageCastingCue(saved,now);
    }
    return null;
  }
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
        effects:projectGmOnlyVisuals(rows,{matchId:meta.matchId,cycleKey:meta.cycleKey}),
        casting:await this.gmCastingState(meta),
        nightControl:await this.gmNightControls(meta)},
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
