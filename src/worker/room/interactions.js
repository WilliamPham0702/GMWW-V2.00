// Tương tác GM ↔ người chơi và bảo vật lưu trữ ban đêm.
import { j } from "../http/responses.js";
import { assassinPromptBlocked, currentArtifactCycleKey } from "../support/game-keys.js";
import { needsStorageArtifact } from "../../gmww-artifact-rules.js";
import { pruneInteractions } from "../../gmww-interaction-retention.js";
import { playerSafeInteraction, publicInteractionReceipt } from "../../gmww-online-chat-policy.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { STATUS_DEFS, STATUS_VISUAL_IDS, publicRoom } from "../../gmww-public-room-contract.js";
import { publicPlayer } from "../../gmww-village-player-state.js";
import { isNightImmune, readNightAssignments } from "../../gmww-wolf-night-resolution.js";

export class RoomInteractionMethods {
  async gmInteraction(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const eventId=String(body?.clientEventId||"").slice(0,240);
    if(!eventId||!body?.turnId)return this.executeGmInteraction(request,body);
    const receiptKey="gmInteractionReceipt:"+String(auth.meta.matchId||"")+":"+eventId;
    const fingerprint=JSON.stringify([String(body.turnId),String(body.actionId||""),normalizeLoginId(body.actorId),String(body.artifactId||""),normalizeLoginId(body.loginId),String(body.type||""),String(body.effectId||""),String(body.actionNonce||""),Number(body.night||0),String(body.cycleKey||""),Array.isArray(body.targetIds)?body.targetIds.map(normalizeLoginId).sort():null]);
    const prior=await this.ctx.storage.get(receiptKey);
    if(prior)return prior.fingerprint===fingerprint?j({...prior.result,idempotent:true}):j({ok:false,error:"REQUEST_ID_CONFLICT"},409);
    const response=await this.executeGmInteraction(request,body);
    if(response.ok)await this.ctx.storage.put(receiptKey,{fingerprint,result:await response.clone().json()});
    return response;
  }
  /* Storage-backed Artifacts at NIGHT (01,03,10,16,17,23,25,31,32): same server plan as the Day path.
   * Consumption is taken first, and given back if the plan refuses, so an invalid use never costs a turn. */
  async nightStorageArtifact(meta,body,step,players){
    const matchId=String(meta.matchId||""),night=Math.max(1,Number(meta.cycleNight)||1),actorId=normalizeLoginId(body.actorId),
      artifactId=String(body.artifactId||""),loginId=normalizeLoginId(body.loginId),
      ids=(Array.isArray(body.targetIds)&&body.targetIds.length?body.targetIds:[loginId]).map(normalizeLoginId).filter(Boolean);
    if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!players["member:"+id]))return j({ok:false,error:"INVALID_ARTIFACT_TARGET"},400);
    // gmBattleAction invokes this once per target; the plan runs exactly once, on the first.
    if(loginId!==ids[0])return j({ok:true,secondaryTarget:true});
    const guarded=["artifact:"+actorId,"artifactUse:"+actorId+":"+artifactId,"artifactCycle:"+currentArtifactCycleKey(meta),"assignments","interactions"],saved=[];
    for(const key of guarded)saved.push([key,await this.ctx.storage.get(key)]);
    const giveBack=async()=>{for(const [key,value] of saved){if(value===undefined||value===null)await this.ctx.storage.delete(key);else await this.ctx.storage.put(key,value)}};
    const useError=await this.markGmArtifactTurnUsed(meta,step,ids[0],body.actionNonce,body);
    if(useError)return useError;
    const assignments=(await this.ctx.storage.get("assignments"))||[],interactions=(await this.ctx.storage.get("interactions"))||[];
    let plan;
    try{plan=await this.artifactStoragePlan({artifactId,actorId,targetId:ids[0],targets:ids,meta,matchId,day:night,assignments,interactions,members:players,requestFlip:body.requestFlip===true})}
    catch(error){await giveBack();throw error}
    if(!plan.ok){await giveBack();return j({ok:false,error:plan.error,message:plan.message},409)}
    const now=new Date().toISOString(),rows=interactions;
    for(const change of plan.changes||[]){
      if(change.kind==="remove_artifact"){
        const removed=await this.ctx.storage.transaction(async txn=>{
          const target=await txn.get("artifact:"+change.loginId),all=await txn.get("assignments")||[],
            assigned=all.find(x=>normalizeLoginId(x.loginId)===change.loginId);
          if(!target||target.removedFromMatch===true||String(target.artifactId||"")!==change.artifactId||
            (target.matchId&&String(target.matchId)!==matchId)||!assigned||String(assigned.artifactId||"")!==change.artifactId)return {ok:false};
          target.removedFromMatch=true;target.removedAt=now;target.removedByArtifactId=artifactId;
          await txn.put("artifact:"+change.loginId,target);
          for(const row of all){
            if(normalizeLoginId(row.loginId)!==change.loginId||String(row.artifactId||"")!==change.artifactId)continue;
            row.artifactId=null;row.artifactName=null;row.artifactUsedAt=null;row.artifactViewedAt=null;row.artifactPriorityFirst=null;row.artifactSingleUse=null;
          }
          await txn.put("assignments",all);
          return {ok:true};
        });
        if(!removed.ok){await giveBack();return j({ok:false,error:"NEGATE_TARGET_CHANGED",message:"Artifact của mục tiêu đã thay đổi; chưa trừ lượt."},409)}
        continue;
      }
      if(change.type!=="effect_notice")continue;
      const row={id:"ix-"+crypto.randomUUID(),type:"effect_notice",loginId:change.loginId,matchId,cycleKey:String(meta.cycleKey||""),night,
        actorId,artifactId,actionId:String(body.actionId||""),source:"night-artifact",effectActive:false,status:"pending",
        message:change.extra?.rowMessage||plan.message||"Artifact",createdAt:now};
      rows.push(row);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+row.id,row);
    }
    if(plan.replacedOwn||(plan.changes||[]).length){
      if(plan.replacedOwn)await this.ctx.storage.put("assignments",assignments);
      await this.ctx.storage.put("interactions",pruneInteractions(rows));
    }
    return j({ok:true,storageArtifact:{artifactId,message:plan.message||"",result:plan.result||{}}});
  }
  async executeGmInteraction(request,body,verifiedAuth=null){
    // Reuse ONLY the same-request verified authorization from gmBattleAction.
    const auth=verifiedAuth||await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta;
    let gmArtifactStep=null;
    // The battle UI supplies an optional expected turn. Legacy GM manual overrides remain compatible.
    if(body?.turnId){
      if(String(meta.phase||"").toLowerCase()!=="running"||String(meta.cyclePhase||"").toLowerCase()!=="night")
        return j({ok:false,error:"STALE_TURN",message:"Đã kết thúc lượt Ban Đêm."},409);
      const live=await this.getNightRuntime(meta,Number(meta.cycleNight||1),false);
      const step=live&&!live.completed?live.queue?.[live.cursor]:null;
      if(!step||String(step.id)!==String(body.turnId))
        return j({ok:false,error:"STALE_TURN",message:"Lượt chức năng đã thay đổi. Vui lòng chọn lại."},409);
      const claimedActor=normalizeLoginId(body.actorId||"");
      // Only the battle-action endpoint maintains the per-role nightly ledger,
      // limits and atomic Undo; never allow legacy GM interaction to bypass it.
      if(!verifiedAuth&&!body?.artifactId&&
         (step.kind==="wolf-pack-bite"||
          step.kind==="role"&&["role_old_witch","role_snow_wolf","role_guard"].includes(step.roleId)||
          step.kind==="role-group"&&(step.roles||[]).some(r=>["role_old_witch","role_snow_wolf","role_guard"].includes(r.roleId))))
        return j({ok:false,error:"WITCH_USE_BATTLE_ACTION"},409);
      const actors=(step.loginIds||[step.loginId]).filter(Boolean).map(normalizeLoginId);
      const artifactActions=Array.isArray(step.actions)?step.actions:[];
      if(step.kind==="early-artifact-window"||(["role","role-group","wolf-pack-bite"].includes(step.kind)&&body.artifactId)){
        const artifactId=String(body.artifactId||"");
        const options=["role","wolf-pack-bite"].includes(step.kind)?(Array.isArray(step.artifacts)?step.artifacts:[]):step.kind==="role-group"?(step.roles||[]).flatMap(role=>role.artifacts||[]):artifactActions;
        const chosen=options.find(x=>String(x.artifactId)===artifactId&&claimedActor&&normalizeLoginId(x.loginId)===claimedActor);
        if(!chosen)return j({ok:false,error:"INVALID_ARTIFACT_FOR_TURN",message:"Artifact không thuộc lượt hoặc người thực hiện."},403);
        gmArtifactStep={...chosen,id:step.id+":"+chosen.artifactId+":"+chosen.loginId};
      }else{
        if(claimedActor&&actors.length&&!actors.includes(claimedActor))return j({ok:false,error:"INVALID_ACTOR_FOR_TURN"},403);
        if(step.kind==="early-artifact"||step.kind==="artifact-main")gmArtifactStep=step;
      }
    }
    const players=(await this.ctx.storage.get("players"))||{},loginId=normalizeLoginId(body?.loginId),rawType=String(body?.type||"").trim().toLowerCase().replace(/\s+/g,"_"),alias={like_dislike:"thumb_vote","like-dislike":"thumb_vote",likedislike:"thumb_vote",reaction:"thumb_vote",reactions:"thumb_vote",thumbs:"thumb_vote",thumb:"thumb_vote",vote:"thumb_vote","👍👎":"thumb_vote",mark:"assassin_mark",marked:"assassin_mark",mark_choice:"assassin_mark","assassin-mark":"assassin_mark"},type=alias[rawType]||rawType;
    if(String(body?.artifactId||"")&&gmArtifactStep&&typeof needsStorageArtifact==="function"&&needsStorageArtifact(String(body.artifactId)))
      return this.nightStorageArtifact(meta,body,gmArtifactStep,players);
    if(type==="status_display_batch"){
      const items=Array.isArray(body?.items)?body.items:[];
      if(!items.length||items.length>STATUS_VISUAL_IDS.size||
        items.some(x=>!STATUS_VISUAL_IDS.has(String(x?.statusId||""))||typeof x?.visible!=="boolean")||
        new Set(items.map(x=>x.statusId)).size!==items.length)return j({ok:false,error:"INVALID_STATUS_BATCH"},400);
      const display={...(meta.statusDisplay&&typeof meta.statusDisplay==="object"?meta.statusDisplay:{})};
      for(const item of items)display[item.statusId]=item.visible;
      meta.statusDisplay=display;meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now()});
      return j({ok:true,statusDisplay:display})
    }
    if(type==="status_display"){
      const statusId=String(body?.statusId||"").trim();if(!STATUS_VISUAL_IDS.has(statusId))return j({ok:false,error:"INVALID_STATUS"},400);
      const display={...(meta.statusDisplay&&typeof meta.statusDisplay==="object"?meta.statusDisplay:{})};display[statusId]=body?.visible===true;meta.statusDisplay=display;meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now()});return j({ok:true,statusDisplay:display})
    }
    // Hơi Thở Lão Già: do not turn the marker into an immediate death.
    // Only this specific Artifact may schedule the shared grudge Action ID,
    // which is also used by unrelated cards.
    if(String(body?.artifactId||"")==="artifact_07"&&
       String(body?.actionId||"")==="action-grudge-designate"){
      if(!gmArtifactStep||!["effect_notice","dead"].includes(type))
        return j({ok:false,error:"GRUDGE_ARTIFACT_REQUIRES_VALID_TURN"},409);
      if(!loginId||!players["member:"+loginId])
        return j({ok:false,error:"INVALID_GRUDGE_TARGET"},400);
      const rows=(await this.ctx.storage.get("interactions"))||[],
        matchId=String(meta.matchId||""),night=Math.max(1,Number(meta.cycleNight)||1);
      const sameMatch=x=>!x.matchId||String(x.matchId)===matchId;
      if(rows.some(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===loginId&&
        (x.effectActive!==false&&x.type==="dead"||
          x.deferredArtifact==="artifact_07"&&x.pendingDeath===true)))
        return j({ok:false,error:"GRUDGE_TARGET_INELIGIBLE",
          message:"Mục tiêu đã chết hoặc đã bị đánh dấu; chưa trừ lượt."},409);
      const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);
      if(useError)return useError;
      const now=new Date().toISOString(),interaction={
        id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),
        clientEventId:String(body.clientEventId||""),type:"effect_notice",
        loginId,matchId,night:night+1,scheduledFromNight:night,
        cycleKey:String(meta.cycleKey||""),effectActive:false,pendingDeath:true,
        deferredArtifact:"artifact_07",effectName:"Hơi Thở Lão Già",
        actionId:"action-grudge-designate",artifactId:"artifact_07",
        actorId:normalizeLoginId(body.actorId),source:"artifact-night-engine",
        message:"Đã đánh dấu; tác động chết được xét sau đêm kế tiếp.",
        createdAt:now
      };
      rows.push(interaction);
      await this.ctx.storage.put("interactions",pruneInteractions(rows));
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+interaction.id,interaction);
      // The target is never informed of the pending death before resolution.
      return j({ok:true,interaction});
    }
    // Only a validated, currently-owned Artifact turn may create this power
    // block. The GM's generic notice would otherwise appear successful while
    // leaving the target able to act.
    if(String(body?.actionId||"")==="artifact_action_lock_function"){
      if(!gmArtifactStep||type!=="effect_notice")
        return j({ok:false,error:"DREAM_ARTIFACT_REQUIRES_VALID_TURN"},409);
      if(!loginId||!players["member:"+loginId])
        return j({ok:false,error:"INVALID_DREAM_TARGET"},400);
      const rows=(await this.ctx.storage.get("interactions"))||[],
        matchId=String(meta.matchId||""),night=Math.max(1,Number(meta.cycleNight)||1);
      const sameMatch=x=>!x.matchId||String(x.matchId)===matchId;
      if(rows.some(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===loginId&&
        x.effectActive!==false&&(x.type==="dead"||
          (x.type==="status"&&x.statusId==="disabled_2n"))))
        return j({ok:false,error:"DREAM_TARGET_INELIGIBLE",message:"Mục tiêu đã chết hoặc đang bị khóa chức năng."},409);
      const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);
      if(useError)return useError;
      const now=new Date().toISOString(),interaction={
        id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),
        clientEventId:String(body.clientEventId||""),type:"status",
        statusId:"disabled_2n",loginId,matchId,night,cycleKey:String(meta.cycleKey||""),
        activationPhase:"night",effectActive:true,
        actionId:"artifact_action_lock_function",artifactId:String(body.artifactId||""),
        actorId:normalizeLoginId(body.actorId),source:"artifact-night-engine",
        message:"Bình Giấc Mơ khóa chức năng trong 2 ngày đêm.",createdAt:now
      };
      rows.push(interaction);
      await this.ctx.storage.put("interactions",pruneInteractions(rows));
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+interaction.id,interaction);
      this.broadcast({type:"player_status_changed",loginId,statusId:"disabled_2n",
        active:true,serverTime:Date.now()});
      return j({ok:true,interaction});
    }
    if(type==="status"){
      const statusId=String(body?.statusId||"").trim();if(!loginId||!STATUS_DEFS[statusId])return j({ok:false,error:"INVALID_STATUS",message:"Trạng thái không hợp lệ."},400);
      const p=players["member:"+loginId];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
      const rows=(await this.ctx.storage.get("interactions"))||[],now=new Date().toISOString(),night=Math.max(0,Number(meta.cycleNight||0)||0);
      for(const x of rows){if(normalizeLoginId(x?.loginId)===loginId&&x?.type==="status"&&x?.statusId===statusId&&x?.effectActive!==false){x.effectActive=false;x.expiredAt=now;x.expiredReason=body?.active===false?"GM_STATUS_CLEAR":"REPLACED"}}
      if(body?.active===false){await this.ctx.storage.put("interactions",pruneInteractions(rows));const auditId="ev-"+crypto.randomUUID(),audit={id:auditId,type:"status_clear",loginId,matchId:String(meta.matchId||""),createdAt:now,source:"gm",statusId,message:`GM gỡ trạng thái ${statusId}`};await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+auditId,audit);this.broadcast({type:"player_status_changed",loginId,statusId,active:false,at:now});return j({ok:true,loginId,statusId,active:false})}
      const def=STATUS_DEFS[statusId],interaction={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),type:"status",statusId,loginId,matchId:String(meta.matchId||""),night,cycleKey:String(meta.cycleKey||""),duration:def.duration,nights:Number(def.nights||0),effectActive:true,message:def.label,createdAt:now,source:"gm"};
      rows.push(interaction);await this.ctx.storage.put("actionLog:"+String(Date.parse(interaction.createdAt)).padStart(13,"0")+":"+interaction.id,interaction);await this.ctx.storage.put("interactions",pruneInteractions(rows));this.broadcast({type:"player_status_changed",loginId,statusId,active:true,at:now});return j({ok:true,interaction})
    }
    if(type==="revive"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      const p=Object.values(players).find(x=>normalizeLoginId(x?.loginId)===loginId);if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
      const rows=(await this.ctx.storage.get("interactions"))||[],revived=[],now=new Date().toISOString();
      // A living target is not revivable. Do not debit an artifact turn or
      // emit an empty success receipt when no active death exists.
      const deadTarget=rows.some(x=>normalizeLoginId(x?.loginId)===loginId&&
        String(x?.type||"")==="dead"&&x?.effectActive!==false&&
        (!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId)));
      if(!deadTarget)return j({ok:false,error:"TARGET_NOT_DEAD",message:"Chưa có người chết hợp lệ để hồi sinh."},409);
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||String(x?.type||"")!=="dead")continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_REVIVE";revived.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",pruneInteractions(rows));const auditId="ev-"+crypto.randomUUID(),audit={id:auditId,type:"revive",loginId,matchId:String(meta.matchId||""),createdAt:now,source:"gm",message:'GM hồi sinh người chơi'};await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+auditId,audit);const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);
      this.broadcast({type:"player_revived",loginId,revived,at:now,room,players:publicPlayers,serverTime:Date.now()});
      this.broadcast({type:"room_state",room,players:publicPlayers,serverTime:Date.now()});
      return j({ok:true,loginId,revived,room})
    }
    if(type==="clear_state"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
      const rows=(await this.ctx.storage.get("interactions"))||[],cleared=[],now=new Date().toISOString();
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||!["frozen","expelled","dead","assassin_mark","status"].includes(String(x?.type||"")))continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_CLEAR";cleared.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",pruneInteractions(rows));const auditId="ev-"+crypto.randomUUID(),audit={id:auditId,type:"clear_state",loginId,matchId:String(meta.matchId||""),createdAt:now,source:"gm",message:'GM gỡ các trạng thái hiện tại'};await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+auditId,audit);this.broadcast({type:"player_state_cleared",loginId,cleared,at:now});return j({ok:true,loginId,cleared})
    }
    const allowed=new Set(["frozen","expelled","dead","thumb_vote","assassin_mark","effect_notice"]);if(!loginId||!allowed.has(type))return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
    const p=players["member:"+loginId];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
    // Automatic night deaths respect the delivered card. Explicit GM overrides
    // (without a turn) and the Destroyer's self-inflicted backlash remain possible.
    if(type==="dead"&&body?.turnId&&String(meta.cyclePhase)==="night"&&
       !(String(body.actionId)==="action_destroyer_kill"&&normalizeLoginId(body.actorId)===loginId)&&
       isNightImmune(await readNightAssignments(this.ctx.storage,meta.matchId),loginId)){
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
      return j({ok:true,loginId,noEffect:true,reason:"NIGHT_IMMUNE"});
    }
    const defaults={frozen:"Bạn đang bị Đóng Băng.",expelled:"Bạn đã bị Đuổi Khỏi Làng.",dead:"Bạn đã Chết.",thumb_vote:"Hãy chọn dấu phù hợp.",assassin_mark:"Bạn đã bị Đánh Dấu. Hãy chọn 👍 hoặc 👎 để xác định kết quả.",effect_notice:"Bạn đã nhận một Hiệu Ứng."},rawOptions=Array.isArray(body?.options)?body.options.map(x=>String(x||"").slice(0,40)).filter(Boolean).slice(0,4):[],cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??body?.nightIndex??body?.roundIndex??meta.cycleKey??"").slice(0,160),expiresAt=body?.expiresAt?String(body.expiresAt).slice(0,64):null,effectActive=["frozen","expelled","dead","assassin_mark"].includes(type),clientEventId=String(body?.clientEventId||"").slice(0,240),rows=(await this.ctx.storage.get("interactions"))||[];
    if(clientEventId){const existing=rows.find(x=>String(x?.clientEventId||"")===clientEventId&&normalizeLoginId(x?.loginId)===loginId);if(existing)return j({ok:true,interaction:existing,idempotent:true})}
    const now=new Date().toISOString(),choiceType=type==="thumb_vote"||type==="assassin_mark",silentVisualNotice=type==="effect_notice"&&body?.requireAck!==true&&body?.requireResponse!==true,interaction={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),clientEventId,eventId:String(body?.eventId||"").slice(0,240),engineEventType:String(body?.engineEventType||"").slice(0,120),matchId:String(body?.matchId||meta.matchId||""),loginId,type,message:String(body?.message||defaults[type]||"").slice(0,500),effectInstanceId:String(body?.effectInstanceId||"").slice(0,160),effectId:String(body?.effectId||"").slice(0,160),effectName:String(body?.effectName||"").slice(0,180),actionId:String(body?.actionId||"").slice(0,160),direction:String(body?.direction||"").slice(0,10),actorId:String(body?.actorId||"").slice(0,160),playerId:String(body?.playerId||"").slice(0,160),night:Number(body?.night||0),cycleKey,expiresAt,effectActive,emoji:String(body?.emoji||"").slice(0,20),title:String(body?.title||"").slice(0,180),requireAck:!!body?.requireAck,requireResponse:!!body?.requireResponse,responseHandler:String(body?.responseHandler||"").slice(0,120),
      ...(type==="assassin_mark"?{gmChoice:String(body?.assassinChoice||"")}: {}),options:choiceType?(rawOptions.length?rawOptions:["👍","👎"]):["ĐÃ HIỂU"],status:silentVisualNotice?"responded":"pending",source:String(body?.source||"gm").slice(0,80),createdAt:now,response:silentVisualNotice?"AUTO_ACK":null,respondedAt:silentVisualNotice?now:null};
    if(type==="dead"&&body?.turnId&&String(meta.cyclePhase)==="night"){
      interaction.type="effect_notice";interaction.pendingDeath=true;interaction.effectActive=false;
      interaction.night=Number(meta.cycleNight);interaction.message="Tác động gây chết sẽ được giải quyết vào sáng hôm sau.";
    }
    if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
    rows.push(interaction);await this.ctx.storage.put("actionLog:"+String(Date.parse(interaction.createdAt)).padStart(13,"0")+":"+interaction.id,interaction);
    if(type==="dead"&&!interaction.pendingDeath&&typeof this.reviveArtifactSweep==="function")await this.reviveArtifactSweep(meta,rows,now);
    if(type==="dead"&&!interaction.pendingDeath&&interaction.effectActive!==false&&typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,now);
    await this.ctx.storage.put("interactions",pruneInteractions(rows));
    // Sát Thủ is secret at night: never broadcast the GM choice or open the player prompt early.
    // The player receives a sanitized private interaction from playerState only in the morning.
    if(type!=="assassin_mark"&&!interaction.pendingDeath&&!silentVisualNotice){
      // WebSocket participantId is not a verified member session. In DEMO,
      // private actions MUST be obtained through the authenticated /me endpoint.
      if(meta.demo!==true)this.broadcast({type:"player_interaction",interaction});
    }
    return j({ok:true,interaction});
  }
  async playerInteractionRespond(body){
    const loginId=normalizeLoginId(body?.loginId),id=String(body?.interactionId||""),
      response=String(body?.response||"").slice(0,40),
      rows=(await this.ctx.storage.get("interactions"))||[],meta=await this.ctx.storage.get("meta");
    const row=rows.find(x=>String(x?.id)===id&&normalizeLoginId(x?.loginId)===loginId);
    if(!row)return j({ok:false,error:"INTERACTION_NOT_FOUND"},404);
    if(row.status==="responded")return j({ok:true,interaction:playerSafeInteraction(row),idempotent:true});
    if(row.matchId&&meta?.matchId&&String(row.matchId)!==String(meta.matchId))
      return j({ok:false,error:"STALE_INTERACTION",message:"Tương tác này thuộc ván cũ."},409);
    const isAssassin=row.type==="assassin_mark";
    if(isAssassin){
      // Choice must never be available at night; the server owns this gate.
      if(String(meta?.phase)!=="running"||String(meta?.cyclePhase)!=="morning"||
         Number(meta?.cycleNight)!==Number(row.night))
        return j({ok:false,error:"ASSASSIN_RESPONSE_NOT_YET_OPEN"},409);
      if(!["👍","👎"].includes(String(row.gmChoice||"")))
        return j({ok:false,error:"ASSASSIN_CHOICE_NOT_RECORDED"},409);
      if(assassinPromptBlocked(rows,loginId,meta.matchId,row.night))
        return j({ok:false,error:"ASSASSIN_TARGET_NO_LONGER_ELIGIBLE"},409);
    }
    const allowed=Array.isArray(row.options)&&row.options.length?new Set(row.options.map(String)):
      (row.type==="thumb_vote"||isAssassin?new Set(["👍","👎"]):new Set(["ĐÃ HIỂU","OK","✓"]));
    if(!allowed.has(response))return j({ok:false,error:"INVALID_RESPONSE"},400);
    const now=new Date().toISOString(),assassinOutcome=isAssassin?
      (row.gmChoice===response?"survived":"dead"):null;
    row.response=response;row.status="responded";row.respondedAt=now;
    if(isAssassin)row.effectActive=false;row.responseVersion=1;
    const alreadyDeadSameNight=assassinOutcome==="dead"&&rows.some(x=>normalizeLoginId(x?.loginId)===loginId&&x?.type==="dead"&&x.effectActive!==false&&
      (!x.matchId||String(x.matchId)===String(meta.matchId))&&Number(x.night)===Number(row.night));
    if(assassinOutcome==="dead"&&!alreadyDeadSameNight){
      const fatal={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),
        type:"dead",loginId,matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0),
        cycleKey:String(meta.cycleKey||""),actionId:"action_assassin_mark",
        actorId:String(row.actorId||""),source:"assassin",effectActive:true,
        message:"Sát Thủ: người chơi chọn dấu khác GM.",createdAt:now};
      rows.push(fatal);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+fatal.id,fatal);
    }
    if(assassinOutcome==="dead"&&!alreadyDeadSameNight&&typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,now);
    await this.ctx.storage.put("interactions",pruneInteractions(rows));
    const logId="ev-"+crypto.randomUUID();
    await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+logId,
      {id:logId,type:"player_response",loginId,matchId:String(meta?.matchId||""),
       message:"Người chơi phản hồi: "+response+(assassinOutcome?" · Kết quả: "+assassinOutcome:""),
       createdAt:now,source:"player"});
    // Never send personal response details on a socket with a spoofable
    // participantId. Player Web retrieves them from the authenticated /me API.
    const safeResponse=playerSafeInteraction(row);
    // Socket rooms have unverified listeners: broadcast only the public receipt.
    // In particular, never disclose the Assassin action type or its outcome on WS.
    const socketResponse=publicInteractionReceipt(row);
    if(meta.demo!==true)this.broadcast({type:"player_interaction_response",interaction:socketResponse,
      serverTime:Date.now()});
    if(assassinOutcome==="dead"&&!alreadyDeadSameNight)this.broadcast({type:"player_status_changed",loginId,
      statusId:"dead",active:true,serverTime:Date.now()});
    return j({ok:true,interaction:safeResponse,assassinOutcome});
  }
}
