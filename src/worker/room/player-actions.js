// Hành động của người chơi: nhìn trộm, hồn ma, kẻ trộm, say rượu, nhận/xem bài, kích hoạt bảo vật.
import { j } from "../http/responses.js";
import { currentArtifactCycleKey } from "../support/game-keys.js";
import { isBattleActorBlocked } from "../../gmww-battle-actor-eligibility.js";
import { buildPrivateDeliveryManifest, validPrivateDeliveryAcknowledgment } from "../../gmww-delivery-manifest.js";
import { currentPrivateDeliverySnapshot, privateDeliveryArtifact, privateDeliveryRoles } from "../../gmww-delivery-snapshot.js";
import { drunkDeckView } from "../../gmww-drunk-draw-rules.js";
import { reserveArtifactActivation } from "../../gmww-game-scene-rules.js";
import { pruneInteractions } from "../../gmww-interaction-retention.js";
import { isWolfRole } from "../../gmww-pack-night-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { STATUS_DEFS } from "../../gmww-public-room-contract.js";
import { peekDecisionRows } from "../../gmww-swap-info-rules.js";
import { thiefCanChoose, thiefPool } from "../../gmww-thief-rules.js";
import { readNightAssignments } from "../../gmww-wolf-night-resolution.js";
import { effectiveAssignments } from "../../gmww-wolf-variant-rules.js";

export class RoomPlayerActionMethods {
  async playerPeekDecide(body){
    return this.ctx.blockConcurrencyWhile(async()=>{
      const meta=await this.ctx.storage.get('meta'),wolfId=normalizeLoginId(body?.loginId);
      if(!wolfId||String(meta?.phase)!=='running'||String(meta?.cyclePhase)!=='night')return j({ok:false,error:'PEEK_NOT_ACTIVE'},409);
      const players=await this.ctx.storage.get('players')||{};
      if(!players['member:'+wolfId])return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
      const interactions=await this.ctx.storage.get('interactions')||[],matchId=String(meta.matchId||''),night=Number(meta.cycleNight||0);
      const assignments=await readNightAssignments(this.ctx.storage,matchId);
      const now=new Date().toISOString();
      const rows=peekDecisionRows({assignments:effectiveAssignments({assignments,interactions,matchId,night}),interactions,matchId,night,cycleKey:String(meta.cycleKey||''),wolfId,detected:body?.detected===true,now});
      if(!rows.length)return j({ok:false,error:'PEEK_NOTHING_TO_DECIDE'},409);
      for(const row of rows){interactions.push(row);await this.ctx.storage.put(this.actionLogKey(row),row)}
      await this.ctx.storage.put('interactions',pruneInteractions(interactions));
      return j({ok:true,decided:rows.length});
    });
  }
  async playerGhostWord(body){
    const meta=await this.ctx.storage.get('meta'),actorId=normalizeLoginId(body?.loginId);
    if(!actorId||String(meta?.phase)!=='running'||String(meta?.cyclePhase)!=='morning')return j({ok:false,error:'GHOST_NOT_ACTIVE'},409);
    const players=await this.ctx.storage.get('players')||{};
    if(!players['member:'+actorId])return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
    const response=await this.gmDayAction(this.demoInternalRequest(),{matchId:meta.matchId,cycleKey:meta.cycleKey,actorId,roleId:'role_ghost',artifactId:'',
      actionId:'action-ghost-message',targetIds:[],word:String(body?.word||''),clientEventId:'ghost-'+crypto.randomUUID()});
    if(!response.ok)return response;
    return j({ok:true});
  }
  async playerThiefChoose(body){
    return this.ctx.blockConcurrencyWhile(async()=>{
      const meta=await this.ctx.storage.get('meta'),actorId=normalizeLoginId(body?.loginId);
      const matchId=String(meta?.matchId||''),night=Number(meta?.cycleNight||0);
      if(!actorId||String(meta?.phase)!=='running'||String(meta?.cyclePhase)!=='night'||night<3)
        return j({ok:false,error:'THIEF_NOT_ACTIVE'},409);
      const players=await this.ctx.storage.get('players')||{};
      if(!players['member:'+actorId])return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
      const runtime=await this.getNightRuntime(meta,night,false),turn=runtime?.queue?.[runtime.cursor];
      if(turn?.roleId!=='role_thief'||!(turn.loginIds||[]).map(normalizeLoginId).includes(actorId))
        return j({ok:false,error:'THIEF_WRONG_TURN'},409);
      const choiceKey='thiefChoice:'+matchId+':'+actorId,existing=await this.ctx.storage.get(choiceKey);
      const assignments=await this.ctx.storage.get('assignments')||[];
      const can=thiefCanChoose({assignments,actorId,night,existingChoice:existing});
      if(!can.ok)return j({ok:false,error:can.error},409);
      const effects=await this.ctx.storage.get('interactions')||[];
      if(isBattleActorBlocked(effects,{actorId,matchId,statusDefs:STATUS_DEFS})||
        effects.some(x=>String(x?.matchId||'')===matchId&&normalizeLoginId(x?.loginId)===actorId&&x?.type==='expelled'&&x.effectActive!==false))
        return j({ok:false,error:'THIEF_ACTOR_BLOCKED'},409);
      const now=new Date().toISOString();
      if(body?.keep===true||!String(body?.roleId||'')){
        await this.ctx.storage.put(choiceKey,{matchId,actorId,night,kind:'keep',createdAt:now});
        return j({ok:true,kept:true,deliveryVersion:meta.deliveryVersion});
      }
      const roleId=String(body.roleId),pool=thiefPool([...(await this.ctx.storage.list({prefix:'roleCatalog:'})).values()]);
      if(!pool.some(c=>c.roleId===roleId))return j({ok:false,error:'THIEF_ROLE_INVALID'},400);
      const outcome=await this.applyNightRoleInheritance(meta,night,assignments,{thiefChoice:{actorId,roleId}});
      if(outcome.applied!==1)return j({ok:false,error:'THIEF_ROLE_TRANSFER_FAILED'},409);
      await this.ctx.storage.put(choiceKey,{matchId,actorId,night,kind:'change',roleId,createdAt:now});
      const summary=outcome.assignments.find(x=>normalizeLoginId(x.loginId)===actorId);
      const own=await this.ctx.storage.get('roles:'+actorId)||[];
      const picked=own.find(x=>x.inheritedFromRoleId==='role_thief');
      const wolf=summary&&isWolfRole(summary),pack=runtime.queue.find(x=>x.kind==='wolf-pack-bite');
      if(wolf&&pack){
        if(!pack.loginIds.includes(actorId))pack.loginIds.push(actorId);
        if(!pack.playerIds.includes('member:'+actorId))pack.playerIds.push('member:'+actorId);
        if(!pack.roles.some(x=>(x.loginIds||[]).includes(actorId)))pack.roles.push({roleId:summary.roleId,loginIds:[actorId]});
        if(summary.roleId!=='role_snow_wolf'&&!pack.biteActorIds.includes(actorId))pack.biteActorIds.push(actorId);
      }
      const fns=Array.isArray(picked?.roleCard?.functions)?picked.roleCard.functions:[];
      const hasPower=fns.some(fn=>fn&&!fn.passive&&fn.actionId!=='action_wolf_bite'&&['night','any',''].includes(String(fn.phase||''))&&
        Number(fn.fromNight||1)<=night&&(fn.toNight==null||Number(fn.toNight)>=night));
      if(summary&&(!wolf||hasPower)&&summary.roleId!=='role_villager'){
        runtime.queue.splice(runtime.cursor+1,0,{id:'role:thief-inherited:'+actorId,kind:'role',roleId:summary.roleId,label:summary.roleName||'Vai Trò',
          loginIds:[actorId],playerIds:['member:'+actorId],order:99,durationSec:Number(turn.durationSec||45),status:'pending'});
      }
      await this.ctx.storage.put(this.nightRuntimeKey(meta,night),runtime);
      this.broadcast({type:'role_progress',matchId,serverTime:Date.now()});
      return j({ok:true,roleName:summary?.roleName||'',deliveryVersion:meta.deliveryVersion});
    });
  }
  async playerDrunkDraw(body){
    // One trusted choice per match; Client cannot specify another account's actor.
    return this.ctx.blockConcurrencyWhile(async()=>{
      const meta=await this.ctx.storage.get('meta'),actorId=normalizeLoginId(body?.loginId);
      const matchId=String(meta?.matchId||''),night=Number(meta?.cycleNight||0);
      if(!actorId||String(meta?.phase)!=='running'||String(meta?.cyclePhase)!=='night'||night!==3)
        return j({ok:false,error:'DRUNK_DRAW_NOT_ACTIVE'},409);
      const players=await this.ctx.storage.get('players')||{};
      if(!players['member:'+actorId])return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
      const runtime=await this.getNightRuntime(meta,3,false),turn=runtime?.queue?.[runtime.cursor];
      const key='drunkDeck:'+matchId+':3:'+actorId,deck=await this.ctx.storage.get(key);
      if(deck?.selectedId)return j({ok:false,error:'DRUNK_ALREADY_CHOSEN',draw:drunkDeckView(deck)},409);
      if(turn?.roleId!=='role_drunk'||!(turn.loginIds||[]).map(normalizeLoginId).includes(actorId))
        return j({ok:false,error:'DRUNK_WRONG_TURN'},409);
      const effects=await this.ctx.storage.get('interactions')||[];
      if(isBattleActorBlocked(effects,{actorId,matchId,statusDefs:STATUS_DEFS})||
        effects.some(x=>String(x?.matchId||'')===matchId&&normalizeLoginId(x?.loginId)===actorId&&
          x?.type==='expelled'&&x.effectActive!==false&&(!x.expiresAt||Date.parse(x.expiresAt)>Date.now())))
        return j({ok:false,error:'DRUNK_ACTOR_BLOCKED'},409);
      const chosen=deck?.cards?.find(x=>x.id===String(body?.cardId||''));
      if(!chosen||!deck.cards.length||String(deck.matchId)!==matchId)
        return j({ok:false,error:'DRUNK_CARD_INVALID'},400);
      const assignments=await this.ctx.storage.get('assignments')||[];
      if(!assignments.some(x=>normalizeLoginId(x.loginId)===actorId&&x.roleId==='role_drunk'))
        return j({ok:false,error:'DRUNK_ROLE_NO_LONGER_OWNED'},409);
      const outcome=await this.applyNightRoleInheritance(meta,3,assignments,{
        drunkChoice:{actorId,sourceId:chosen.sourceId}});
      if(outcome.applied!==1)return j({ok:false,error:'DRUNK_ROLE_TRANSFER_FAILED'},409);
      const own=await this.ctx.storage.get('roles:'+actorId)||[];
      const picked=own.find(x=>x.inheritedFromRoleId==='role_drunk');
      const summary=outcome.assignments.find(x=>normalizeLoginId(x.loginId)===actorId);
      if(!picked||!summary)return j({ok:false,error:'DRUNK_ROLE_TRANSFER_INCOMPLETE'},409);
      const pack=runtime.queue.find(x=>x.kind==='wolf-pack-bite');
      const wolf=isWolfRole(summary);
      if(wolf&&pack){
        if(!pack.loginIds.includes(actorId))pack.loginIds.push(actorId);
        if(!pack.playerIds.includes('member:'+actorId))pack.playerIds.push('member:'+actorId);
        if(!pack.roles.some(x=>(x.loginIds||[]).includes(actorId)))
          pack.roles.push({roleId:summary.roleId,loginIds:[actorId]});
        if(summary.roleId!=='role_snow_wolf'&&!pack.biteActorIds.includes(actorId))
          pack.biteActorIds.push(actorId);
      }
      const functions=Array.isArray(picked.roleCard?.functions)?picked.roleCard.functions:[];
      const hasPower=functions.some(fn=>fn&&!fn.passive&&
        fn.actionId!=='action_wolf_bite'&&['night','any',''].includes(String(fn.phase||''))&&
        Number(fn.fromNight||1)<=3&&(fn.toNight==null||Number(fn.toNight)>=3));
      if((!wolf||hasPower)&&summary.roleId!=='role_villager'){
        const newTurn={id:'role:drunk-inherited:'+actorId,kind:'role',
          roleId:summary.roleId,label:summary.roleName||'Vai Trò',
          loginIds:[actorId],playerIds:['member:'+actorId],
          order:99,durationSec:Number(turn.durationSec||45),status:'pending'};
        const at=wolf&&pack?runtime.queue.indexOf(pack)+1:runtime.cursor+1;
        runtime.queue.splice(at,0,newTurn);
      }
      deck.selectedId=chosen.id;deck.selectedRoleName=summary.roleName||chosen.roleName;
      deck.selectedAt=new Date().toISOString();
      await this.ctx.storage.put(key,deck);
      await this.ctx.storage.put(this.nightRuntimeKey(meta,3),runtime);
      this.broadcast({type:'role_progress',matchId,serverTime:Date.now()});
      return j({ok:true,selectedId:deck.selectedId,roleName:deck.selectedRoleName,
        draw:drunkDeckView(deck),deliveryVersion:meta.deliveryVersion});
    });
  }
  async playerDeliveryReceived(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");
    if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const players=(await this.ctx.storage.get("players"))||{},player=players["member:"+loginId];
    if(!loginId||!player||player.kind!=="member")return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},403);
    if(!["role_delivery","running"].includes(String(meta.phase||"").toLowerCase()))return j({ok:false,error:"ROLE_DELIVERY_NOT_STARTED"},409);
    const stored=(await this.ctx.storage.get("roles:"+loginId))||[],legacy=await this.ctx.storage.get("role:"+loginId),legacyRows=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]);
    const snapshot=currentPrivateDeliverySnapshot(await this.ctx.storage.get("deliverySnapshot:"+loginId),meta),roles=privateDeliveryRoles(snapshot,legacyRows);
    const savedArtifact=await this.ctx.storage.get("artifact:"+loginId),artifact=snapshot?privateDeliveryArtifact(snapshot,savedArtifact):(savedArtifact?.removedFromMatch===true?null:savedArtifact||roles.find(row=>row?.artifact)?.artifact||null);
    const assignments=(await this.ctx.storage.get("assignments"))||[];
    const manifest=buildPrivateDeliveryManifest({roomCode:meta.code,loginId,matchId:meta.matchId,matchRevision:meta.matchRevision,deliveryVersion:meta.deliveryVersion,publishedAt:meta.roleDeliveredAt,assignments,roles,artifact});
    if(!validPrivateDeliveryAcknowledgment(manifest,body))return j({ok:false,error:"DELIVERY_RECEIPT_MISMATCH"},409);
    const key="deliveryAck:"+loginId,previous=(await this.ctx.storage.get(key))||null;
    if(previous?.deliveryId===manifest.deliveryId)return j({ok:true,deliveryId:manifest.deliveryId,receivedAt:previous.receivedAt,reused:true});
    const receivedAt=new Date().toISOString();await this.ctx.storage.put(key,{deliveryId:manifest.deliveryId,receivedAt,matchId:manifest.matchId});
    for(const row of assignments)if(normalizeLoginId(row?.loginId)===loginId&&(!meta.matchId||String(row?.matchId||"")===String(meta.matchId)))row.receivedAt=receivedAt;
    await this.ctx.storage.put("assignments",assignments);
    this.broadcast({type:"delivery_progress",loginId,deliveryId:manifest.deliveryId,receivedAt});
    return j({ok:true,deliveryId:manifest.deliveryId,receivedAt});
  }
  async playerRoleViewed(body){
    const loginId=normalizeLoginId(body?.loginId),wantedIndex=Number.isInteger(Number(body?.roleIndex))?Math.max(0,Number(body.roleIndex)):null,wantedRoleId=String(body?.roleId||""),stored=await this.ctx.storage.get("roles:"+loginId),legacy=await this.ctx.storage.get("role:"+loginId),roles=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]);
    if(!roles.length)return j({ok:false,error:"ROLE_NOT_FOUND"},404);
    let index=wantedIndex!==null&&wantedIndex<roles.length?wantedIndex:(wantedRoleId?roles.findIndex(x=>String(x?.roleId||"")===wantedRoleId):0);if(index<0)index=0;
    const role=roles[index];if(!role.viewedAt){role.viewedAt=new Date().toISOString();roles[index]=role;await this.ctx.storage.put("roles:"+loginId,roles);if(index===0)await this.ctx.storage.put("role:"+loginId,role);const rows=(await this.ctx.storage.get("assignments"))||[],r=rows.find(x=>normalizeLoginId(x.loginId)===loginId&&Number(x.assignmentIndex)===Number(role.assignmentIndex));if(r){r.viewedAt=role.viewedAt;await this.ctx.storage.put("assignments",rows)}this.broadcast({type:"role_progress",loginId,roleId:String(role.roleId||""),roleIndex:index,viewedAt:role.viewedAt})}
    return j({ok:true,roleId:String(role.roleId||""),roleIndex:index,viewedAt:role.viewedAt})
  }
  async playerArtifactViewed(body){
    const loginId=normalizeLoginId(body?.loginId),artifact=await this.ctx.storage.get("artifact:"+loginId);
    if(!artifact||artifact.removedFromMatch===true)return j({ok:false,error:"ARTIFACT_NOT_FOUND"},404);
    if(!artifact.viewedAt){
      artifact.viewedAt=new Date().toISOString();await this.ctx.storage.put("artifact:"+loginId,artifact);
      const rows=(await this.ctx.storage.get("assignments"))||[],row=rows.find(x=>normalizeLoginId(x?.loginId)===loginId);
      if(row){row.artifactViewedAt=artifact.viewedAt;await this.ctx.storage.put("assignments",rows)}
      this.broadcast({type:"artifact_progress",loginId,artifactId:String(artifact.artifactId||""),viewedAt:artifact.viewedAt});
    }
    return j({ok:true,artifactId:String(artifact.artifactId||""),viewedAt:artifact.viewedAt})
  }
  async playerArtifactActivate(body){
    const loginId=normalizeLoginId(body?.loginId),requestId=String(body?.requestId||body?.clientEventId||"").trim().slice(0,200),meta=await this.ctx.storage.get("meta");
    if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    if(!["running","started","game","playing"].includes(String(meta.phase||"").toLowerCase()))return j({ok:false,error:"GAME_NOT_RUNNING"},409);
    if(!requestId)return j({ok:false,error:"REQUEST_ID_REQUIRED"},400);
    const cycleKey=currentArtifactCycleKey(meta),now=new Date().toISOString();
    const artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)||0)));
    const result=await this.ctx.storage.transaction(async txn=>{
      const artifact=await txn.get("artifact:"+loginId);
      if(!artifact)return{ok:false,status:404,error:"ARTIFACT_NOT_FOUND"};
      if(artifact.removedFromMatch===true)return{ok:false,status:409,error:"ARTIFACT_REMOVED_FROM_MATCH"};
      const targetId=String(body?.targetId||body?.originalTargetId||"").slice(0,160);if(targetId){const players=(await txn.get("players"))||{};if(!players[targetId])return{ok:false,status:400,error:"INVALID_ARTIFACT_TARGET"}}
      if(meta.matchId&&artifact.matchId&&String(meta.matchId)!==String(artifact.matchId))return{ok:false,status:409,error:"STALE_ARTIFACT"};
      const artifactId=String(artifact.artifactId||""),playerId="member:"+loginId,useKey="artifactUse:"+loginId+":"+artifactId,oldUse=await txn.get(useKey),cycle=(await txn.get("artifactCycle:"+cycleKey))||{cycleKey,accepted:[]};
      if(artifact.singleUse===true&&oldUse&&(String(oldUse.requestId)!==requestId||String(oldUse.cycleKey)!==cycleKey))return{ok:false,status:409,error:"ARTIFACT_ALREADY_USED"};
      const reservation=reserveArtifactActivation(cycle,{requestId,playerId,artifactId,cycleKey,eligible:true,limit:artifactLimitPerCycle});
      const accepted=Array.isArray(reservation?.state?.accepted)?reservation.state.accepted:[];
      if(!reservation.ok){
        const status=reservation.error==="ARTIFACT_NOT_ELIGIBLE"?403:409;
        return{ok:false,status,error:reservation.error,count:accepted.length,max:artifactLimitPerCycle,remaining:Math.max(0,artifactLimitPerCycle-accepted.length)};
      }
      if(reservation.idempotent){
        const prior=accepted.find(x=>String(x?.requestId||"")===requestId&&String(x?.playerId||"")===playerId);
        return{ok:true,idempotent:true,activation:prior||null,count:accepted.length,max:artifactLimitPerCycle,remaining:Math.max(0,artifactLimitPerCycle-accepted.length)};
      }
      const activation={requestId,playerId,loginId,artifactId,artifactName:String(artifact.artifactName||""),matchId:String(meta.matchId||""),cycleKey,night:Math.max(1,Number(meta.cycleNight||1)),phase:String(meta.cyclePhase||""),originalTargetId:String(body?.targetId||body?.originalTargetId||"").slice(0,160),finalTargetId:String(body?.finalTargetId||body?.targetId||"").slice(0,160),status:"accepted",createdAt:now,...(body.gmConfirmation?{gmConfirmation:body.gmConfirmation}:{})};
      const nextAccepted=accepted.slice();nextAccepted[nextAccepted.length-1]=activation;
      const nextCycle={...reservation.state,accepted:nextAccepted,updatedAt:now};
      await txn.put("artifactCycle:"+cycleKey,nextCycle);await txn.put(useKey,{...activation,usedAt:now});
      artifact.usedAt=now;artifact.lastActivation=activation;await txn.put("artifact:"+loginId,artifact);
      return{ok:true,activation,count:nextAccepted.length,max:artifactLimitPerCycle,remaining:Math.max(0,artifactLimitPerCycle-nextAccepted.length)};
    });
    if(!result.ok)return j(result,result.status||409);
    const rows=(await this.ctx.storage.get("assignments"))||[],row=rows.find(x=>normalizeLoginId(x?.loginId)===loginId);if(row){row.artifactUsedAt=result.activation?.createdAt||now;await this.ctx.storage.put("assignments",rows)}
    this.broadcast({type:"artifact_activation",...result,cycleKey});return j(result)
  }
}
