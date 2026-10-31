// Independent staging host: SAME GMWW V2 Core, with OWN Durable Objects namespace.
// No change to production Worker, no cross-Worker service binding.
import core,{RoomDurableObject as GameRoomDurableObject} from './index.js';
import {gallowsSnapshot} from './gmww-gallows-rules.js';
import {projectGmOnlyVisuals,redactStagingPublicBroadcast} from './arena3d-visual-effect-policy.mjs';
import {stageCastingCue,classifyCastingAction} from '../assets/village/arena-3d/casting-choreography.mjs';
import {stageAuthorizedRoleId,verifiedPrivateCard,familyForConfirmedAction,artifactVisualSnapshot,shouldRevokeVisualAfterUndo} from '../assets/village/arena-3d/stage14-dynamic-actions.mjs';
import {privateTurnActionOptions} from '../assets/village/arena-3d/stage29-gm-actions.mjs';
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
  async gmAssign(request,body){
    const response=await super.gmAssign(request,body);
    if(!response?.ok)return response;
    const ack=await response.clone().json().catch(()=>null);
    if(ack?.ok!==true)return response;
    const meta=await this.ctx.storage.get('meta');
    const matchId=String(meta?.matchId||'');
    if(!matchId)return response;
    // Core already checked bearer rights, roster/role assignments and saved private cards.
    // Keep only a visual family per real Artifact action in this staging DO.
    const roles=Array.isArray(body?.assignments)?body.assignments:[],owned=Object.create(null);
    for(const row of roles.slice(0,30)){
      const login=String(row?.loginId||'');
      if(/^[a-z0-9._-]{1,80}$/i.test(login)&&(row?.artifact||row?.artifactId))
        owned[login]=await this.ctx.storage.get('artifact:'+login);
    }
    const visual=artifactVisualSnapshot(roles,owned,{matchId});
    await this.ctx.storage.put('arena:artifact-vfx:'+matchId,visual);
    return response;
  }
  async gmEnd(request,body){
    // Capture the previous match BEFORE Core resets the room on completion.
    const previous=await this.ctx.storage.get('meta');
    const response=await super.gmEnd(request,body);
    if(response?.ok){
      const ack=await response.clone().json().catch(()=>null);
      if(ack?.ok===true){
        const matchId=String(previous?.matchId||ack?.matchId||body?.matchId||'');
        if(matchId){await this.ctx.storage.delete('arena:artifact-vfx:'+matchId);
          await this.ctx.storage.delete('arena:lastCast:'+matchId)}
      }
    }
    return response;
  }
  async captureAuthorizedCast(response,body,phase,roleId=''){
    if(!response?.ok)return response;
    const result=await response.clone().json().catch(()=>null);
    if(result?.ok!==true||result?.idempotent===true)return response;
    const meta=await this.ctx.storage.get('meta');
    if(meta?.phase!=='running'||meta.cyclePhase!==phase||!meta.matchId||!meta.cycleKey)return response;
    const actorId=String(body?.actorId||'');
    const targets=Array.isArray(body?.targetIds)?body.targetIds:[];
    const actionId=String(body?.actionId||'');
    const artifactId=String(body?.artifactId||'');
    if(!/^[a-z0-9._-]{1,80}$/i.test(actorId))return response;
    // Read only this actor's already-delivered private cards after Core confirms.
    const roles=await this.ctx.storage.get('roles:'+actorId)||[];
    const legacy=roles.length?null:await this.ctx.storage.get('role:'+actorId);
    const artifact=artifactId?await this.ctx.storage.get('artifact:'+actorId):null;
    const verifiedRole=artifactId?'':phase==='morning'?String(body?.roleId||''):roleId;
    const card=verifiedPrivateCard({actorId,roleId:verifiedRole,artifactId,
      roles:Array.isArray(roles)&&roles.length?roles:[legacy].filter(Boolean),artifact,matchId:meta.matchId});
    const staged=artifactId?await this.ctx.storage.get('arena:artifact-vfx:'+String(meta.matchId)):null;
    const family=artifactId?staged?.[actorId+':'+artifactId+':'+actionId]:'';
    const visual=familyForConfirmedAction({actionId,type:body?.type,card,
      effectId:body?.effectId,stagingFamily:family});
    if(!visual)return response; // Never infer secret cues from unconfigured custom IDs.
    const now=Date.now();
    await this.ctx.storage.put('arena:lastCast:'+meta.matchId,{
      matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),phase,
      turnId:phase==='night'?String(body?.turnId||''):'day:'+String(body?.clientEventId||'').slice(0,90),
      actorIds:['member:'+actorId],targetIds:targets.filter(id=>/^[a-z0-9._-]{1,80}$/i.test(String(id))).map(id=>'member:'+id),
      kind:visual.kind,actionId:visual.actionId,roleId:verifiedRole,
      visualFamily:visual.family,
      undoToken:typeof result.undoToken==='string'?result.undoToken:'',
      createdAt:now,expiresAt:now+4500
    });
    return response;
  }
  async gmBattleAction(request,body){
    // Capture Core-authored role before its action advances the night queue.
    const meta=await this.ctx.storage.get('meta');
    const control=meta?.phase==='running'&&meta.cyclePhase==='night'
      ?await this.gmNightControls(meta).catch(()=>null):null;
    const roleId=stageAuthorizedRoleId(control,String(body?.actorId||''));
    const response=await super.gmBattleAction(request,body);
    return this.captureAuthorizedCast(response,body,'night',roleId);
  }
  async gmDayAction(request,body){
    const response=await super.gmDayAction(request,body);
    return this.captureAuthorizedCast(response,body,'morning');
  }
  async gmBattleUndo(request,body){
    // Core owns the undo decision. Only retract the private animation AFTER Core accepts it.
    const response=await super.gmBattleUndo(request,body);
    if(!response?.ok)return response;
    const ack=await response.clone().json().catch(()=>null);
    if(ack?.ok!==true)return response;
    const meta=await this.ctx.storage.get('meta');
    if(!meta?.matchId||!meta?.cycleKey)return response;
    const key='arena:lastCast:'+String(meta.matchId);
    const saved=await this.ctx.storage.get(key);
    if(shouldRevokeVisualAfterUndo(saved,{matchId:meta.matchId,
      cycleKey:meta.cycleKey,undoToken:body?.undoToken}))
      await this.ctx.storage.delete(key);
    return response;
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
    // This function is reached only through the bearer-protected GM-only
    // /arena/gm-visuals path. Never include availableActions in public WS.
    const activeTurnActors=actors.map(id=>'member:'+id);
    const roleAssignments=roles.length?roles:[{roleId:String(step.roleId||''),
      actorIds:activeTurnActors}];
    const availableActions=[];
    for(const assigned of roleAssignments){
      const roleId=String(assigned.roleId||'');
      for(const memberId of (assigned.actorIds||[]).slice(0,30)){
        const loginId=String(memberId).replace(/^member:/,'');
        if(!actors.includes(loginId))continue;
        const delivered=await this.ctx.storage.get('roles:'+loginId)||[];
        const legacy=delivered.length?null:await this.ctx.storage.get('role:'+loginId);
        const card=verifiedPrivateCard({actorId:loginId,roleId,
          roles:Array.isArray(delivered)&&delivered.length?delivered:[legacy].filter(Boolean),
          matchId:meta.matchId});
        const owned=await this.ctx.storage.get('artifact:'+loginId);
        const artifactId=String(owned?.artifactId||'');
        const items=privateTurnActionOptions({
          actorId:loginId,roleId,artifactId,card,
          artifactCard:owned?.matchId===meta.matchId?owned.artifactCard:null,
          turnActorIds:activeTurnActors,matchOk:Boolean(card||owned?.matchId===meta.matchId)});
        availableActions.push(...items);
      }
    }
    return {complete:false,turnId:String(step.id||'').slice(0,160),
      availableActions:availableActions.slice(0,90),
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
      // A confirmed cast outlives the queue cursor (GM may advance immediately).
      // This cue stays in GM-only response, matches exact match/cycle and expires quickly.
      if(saved?.phase==='night'&&String(saved.matchId)===String(meta.matchId)&&
         String(saved.cycleKey)===String(meta.cycleKey)&&saved.expiresAt>now){
        const live=stageCastingCue(saved,now);
        if(live?.cast)return live;
      }
      const rt=await this.getNightRuntime(meta,Math.max(1,Number(meta.cycleNight)||1),false);
      const step=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;
      if(!step)return null;
      const logins=[...(Array.isArray(step.loginIds)?step.loginIds:[step.loginId]),
        ...((step.kind==='role-group'&&Array.isArray(step.roles))?step.roles.flatMap(r=>r.loginIds||[r.loginId]):[])];
      const actorIds=[...new Set(logins.filter(id=>typeof id==='string'&&/^[a-z0-9._-]{1,80}$/i.test(id)).map(id=>'member:'+id))];
      if(!actorIds.length)return null; // introduction/wakeup without an actual actor
      const current=String(step.id||'');
      return stageCastingCue({matchId:meta.matchId,cycleKey:meta.cycleKey,
        phase:'night',turnId:current,actorIds},now);
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
    // Dedicated GĐ32 IPA test channel. An isolated GitHub QA prerelease
    // stores bytes; STAGING serves a stable download URL without modifying
    // the official Production /api/update or Tải IPA channel.
    if(url.pathname.startsWith('/api/arena-staging/ipa')){
      const releaseTag='arena3d-qa-20261025-gd32-r1';
      const prefix='https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/'+releaseTag+'/';
      const ipa='GMWW-Arena3D-QA-GD32-20261025.ipa';
      if(request.method!=='GET')return new Response('Method not allowed',{status:405});
      if(url.pathname==='/api/arena-staging/ipa/metadata'){
        return Response.json({ok:true,channel:'arena3d-qa-staging-only',
          version:'0.32.0',bundleId:'com.gmww.v2.arena3d.qa',
          sourceWorker:'gmww-arena3d-stage14-staging',
          signing:'unsigned-needs-iOS-sideload-signing',
          officialRelease:false,productionModified:false,
          download:'/api/arena-staging/ipa',
          sha256:'/api/arena-staging/ipa/sha256',
          notes:'/village/arena-3d/ipa.html'},
          {headers:{'cache-control':'no-store'}});
      }
      const file=url.pathname==='/api/arena-staging/ipa'?ipa:
        url.pathname==='/api/arena-staging/ipa/sha256'?ipa+'.sha256':null;
      if(!file)return new Response('Not found',{status:404});
      return Response.redirect(prefix+file,302);
    }
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
