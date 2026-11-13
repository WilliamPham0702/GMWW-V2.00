// Hành động trong trận của GM và hoàn tác.
import { j } from "../http/responses.js";
import { currentArtifactCycleKey } from "../support/game-keys.js";
import { needsStorageArtifact } from "../../gmww-artifact-rules.js";
import { appendBattleRoleActionUsage, checkBattleRoleActionUsage, resolveRoleActionPolicy } from "../../gmww-battle-action-policy.js";
import { isBattleActorBlocked } from "../../gmww-battle-actor-eligibility.js";
import { mirrorLinkKey } from "../../gmww-mirror-rules.js";
import { isCultMember } from "../../gmww-night-cult-rules.js";
import { oldWitchActionCheck } from "../../gmww-old-witch-rules.js";
import { alphaPackState, isWolfRole, previousNightTargets } from "../../gmww-pack-night-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { STATUS_DEFS, publicRoom } from "../../gmww-public-room-contract.js";
import { publicPlayer } from "../../gmww-village-player-state.js";
import { witchSaveTargetAllowed } from "../../gmww-witch-drunk-clone-rules.js";
import { canSnowWolfBite, readNightAssignments, resolveNightReveal, resolveWolfNight } from "../../gmww-wolf-night-resolution.js";

export class RoomBattleActionMethods {
  /* V3.99: a single GM confirmation is one reversible server operation, including
   * multi-target interactions and the Artifact quota/use ledger. Only the latest
   * committed action in this exact turn and night may be restored. */
  async gmBattleAction(request,body){
    const actionStartedAt=Date.now();
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    // Storage-backed Artifacts always act as a night notice; the card's configured type is irrelevant.
    if(body?.artifactId&&typeof needsStorageArtifact==="function"&&needsStorageArtifact(String(body.artifactId))&&String(body?.type||"").toLowerCase()!=="effect_notice")body={...body,type:"effect_notice"};
    const meta=auth.meta,matchId=String(meta.matchId||""),cycleKey=String(meta.cycleKey||""),
      token=String(body?.clientEventId||"").trim().slice(0,120),
      turnId=String(body?.turnId||""),actorId=normalizeLoginId(body?.actorId||""),
      artifactId=String(body?.artifactId||"").slice(0,120),
      targets=Array.isArray(body?.targetIds)?body.targetIds.map(normalizeLoginId):[],
      type=String(body?.type||"").trim().toLowerCase(),allowed=new Set(["frozen","expelled","dead","thumb_vote","assassin_mark","effect_notice","revive","clear_state"]);
    if(!token||!turnId||!actorId||!allowed.has(type)||!targets.length||targets.length>30||
      targets.some(id=>!id)||new Set(targets).size!==targets.length)
      return j({ok:false,error:"INVALID_BATTLE_ACTION"},400);
    if(String(body?.actionId||"")==="action_transfer_bite"&&
      (artifactId||type!=="effect_notice"||!["left","none","right"].includes(String(body?.direction||""))||
       targets.length!==1||targets[0]!==actorId))
      return j({ok:false,error:"INVALID_FAIRY_DIRECTION"},400);
    // Assassin marks require a GM-selected secret sign and the correct role.
    const assassinAction=String(body?.actionId||"")==="action_assassin_mark";
    if(assassinAction&&(type!=="assassin_mark"||!["👍","👎"].includes(String(body?.assassinChoice||""))))
      return j({ok:false,error:"INVALID_ASSASSIN_CHOICE",message:"Sát Thủ phải chọn 👍 hoặc 👎."},400);
    if(!assassinAction&&body?.assassinChoice)return j({ok:false,error:"INVALID_ASSASSIN_CHOICE"},400);
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="night"||
      String(body?.matchId||"")!==matchId||String(body?.cycleKey||"")!==cycleKey)
      return j({ok:false,error:"STALE_BATTLE_ACTION"},409);
    const rt=await this.getNightRuntime(meta,Number(meta.cycleNight||1),false);
    const step=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;
    if(!step||String(step.id)!==turnId)return j({ok:false,error:"STALE_TURN"},409);
    const actors=(step.loginIds||[step.loginId]).filter(Boolean).map(normalizeLoginId);
    const owners=step.kind==="role-group"?(step.roles||[]).flatMap(row=>row.artifacts||[]):
      ["role","wolf-pack-bite"].includes(step.kind)?step.artifacts||[]:step.kind==="early-artifact-window"?step.actions||[]:
      step.kind==="artifact-main"?[step]:[];
    if(artifactId){
      if(!owners.some(a=>String(a.artifactId)===artifactId&&normalizeLoginId(a.loginId)===actorId))
        return j({ok:false,error:"INVALID_ARTIFACT_FOR_TURN"},403);
    }else if(!actors.includes(actorId))return j({ok:false,error:"INVALID_ACTOR_FOR_TURN"},403);
    if(step.kind==="wolf-pack-bite"&&
      (targets.length!==1||String(body.actionId)!=="action_wolf_bite"||
        !(step.biteActorIds||[]).map(normalizeLoginId).includes(actorId)))
      return j({ok:false,error:"INVALID_PACK_ACTION"},403);
    const players=await this.ctx.storage.get("players")||{};
    if(targets.some(id=>!players["member:"+id]))return j({ok:false,error:"INVALID_BATTLE_TARGET"},400);
    // Validate all private divination targets BEFORE any usage ledger or game-state write.
    const inspectIds=Array.isArray(body?.revealTargetIds)&&body.revealTargetIds.length?
      body.revealTargetIds.map(normalizeLoginId):(body?.revealTargetId?[normalizeLoginId(body.revealTargetId)]:targets);
    const expectedInspectCount=({action_compare_faction:2,action_bear_scan:2,action_fox_scan:3,action_scan_three:3,'action-vampire-check':3})[String(body?.actionId||'')];
    if(!artifactId&&expectedInspectCount&&(inspectIds.length!==expectedInspectCount||
      new Set(inspectIds).size!==expectedInspectCount||inspectIds.some(id=>!players['member:'+id])))
      return j({ok:false,error:'DIVINATION_TARGET_COUNT',message:'Soi xét phải chọn đủ các mục tiêu khác nhau.'},400);
    const interactions=await this.ctx.storage.get("interactions")||[];
    const isExpelled=id=>interactions.some(row=>
      normalizeLoginId(row?.loginId)===id&&String(row?.type||"")==="expelled"&&
      row?.effectActive!==false&&(!row?.matchId||String(row.matchId)===matchId)&&
      (!row?.expiresAt||Date.parse(row.expiresAt)>Date.now()));
    if(isExpelled(actorId))
      return j({ok:false,error:"ACTOR_EXPELLED",message:"Người thực hiện đã bị đuổi khỏi làng, không thể dùng chức năng."},409);
    if(step.kind==="wolf-pack-bite"){
      const members=await this.ctx.storage.get("assignments")||[];
      const alpha=alphaPackState(members,interactions,matchId,meta.cycleNight);
      if(alpha.expelled)return j({ok:false,error:"PACK_ALPHA_EXPELLED",message:"Sói Trùm bị đuổi khỏi làng, Bầy Sói không thể Cắn."},409);
    }
    if(isBattleActorBlocked(interactions,{actorId,matchId,statusDefs:STATUS_DEFS}))
      return j({ok:false,error:"ACTOR_CANNOT_ACT",message:"Người thực hiện bị đóng băng hoặc đã chết."},409);
    if(typeof isCultMember==="function"&&isCultMember({assignments:await this.ctx.storage.get("assignments")||[],interactions,matchId,loginId:actorId,night:Number(meta.cycleNight||0)-1}))
      return j({ok:false,error:"ACTOR_CULT_MEMBER",message:"Thành viên Tà Đạo mất chức năng hiện tại."},409);
    const receiptKey="battleActionReceipt:"+matchId+":"+token;
    const fingerprint=JSON.stringify([turnId,actorId,artifactId,type,targets,String(body?.actionId||""),String(body?.effectId||""),String(body?.direction||""),body?.revealTargetIds||[],String(body?.assassinChoice||"")]);
    const prior=await this.ctx.storage.get(receiptKey);
    if(prior)return prior.fingerprint===fingerprint?j({...prior.result,idempotent:true}):
      j({ok:false,error:"REQUEST_ID_CONFLICT"},409);
    // V3.103 — enforce role-card use limits in the Durable Object, not just UI.
    // Snapshot and undo include this ledger so undo restores function availability.
    const usageKey="battleRoleUsage:"+matchId;
    let currentUsage=(await this.ctx.storage.get(usageKey))||[],roleUse=null;
    if(!artifactId){
      const roleStep=["role-group","wolf-pack-bite"].includes(step.kind)?(step.roles||[]).find(r=>
        (r.loginIds||[]).map(normalizeLoginId).includes(actorId)):step.kind==="role"?step:null;
      if(!roleStep)return j({ok:false,error:"INVALID_ROLE_FOR_TURN"},403);
      const roleId=String(roleStep.roleId||"");
      if(assassinAction&&roleId!=="role_assassin")return j({ok:false,error:"INVALID_ASSASSIN_ROLE"},403);
      const assigned=(await this.ctx.storage.get("assignments"))||[];
      let row=assigned.find(a=>normalizeLoginId(a?.loginId)===actorId&&String(a?.roleId||"")===roleId);
      if(roleStep.mirror===true){
        // Tráng Gương turn: the owner acts with the copied role's card, never with their own role.
        const link=await this.ctx.storage.get(mirrorLinkKey(matchId,actorId));
        if(!link||String(link.roleId)!==roleId)return j({ok:false,error:"INVALID_ROLE_OWNER"},403);
        row={loginId:actorId,roleId,roleName:link.roleName,faction:"",roleCard:link.roleCard};
      }
      if(!row)return j({ok:false,error:"INVALID_ROLE_OWNER"},403);
      // assignments is a public summary; limits live in the existing private role records.
      const storedRoles=await this.ctx.storage.get("roles:"+actorId),legacyRole=await this.ctx.storage.get("role:"+actorId);
      const privateRoles=Array.isArray(storedRoles)&&storedRoles.length?storedRoles:(legacyRole?[legacyRole]:[]);
      const deliveredRole=privateRoles.find(r=>String(r?.roleId||"")===roleId&&
        (!r?.matchId||String(r.matchId)===matchId));
      const roleCard=deliveredRole?.roleCard||row.roleCard||{},actionId=String(body?.actionId||"");
      if(roleId==='role_clone'&&actionId==='action_clone_target'&&
        (Number(meta.cycleNight||0)!==1||targets.includes(actorId)||targets.length!==1))
        return j({ok:false,error:"CLONE_TARGET_NIGHT_ONE_ONLY"},409);
      if(roleId==='role_snow_wolf'&&actionId==='action_wolf_bite'&&
        !canSnowWolfBite({assignments:assigned,interactions,matchId}))
        return j({ok:false,error:"SNOW_WOLF_PACK_ALIVE",message:"Sói Tuyết chỉ được Cắn khi không còn Sói khác sống trong ván."},409);
      const packBite=step.kind==="wolf-pack-bite";
      // Reject forged effect types and invalid frozen/dead targets before the
      // use ledger or interactions are changed. The UI is not an authority.
      const expectedType=packBite?"effect_notice":
        roleId==="role_witch"&&actionId==="action_witch_save"?"effect_notice":
        roleId==="role_witch"&&actionId==="action_witch_kill"?"dead":
        roleId==="role_snow_wolf"&&actionId==="action_snow_wolf_freeze"?"frozen":
        roleId==="role_guard"&&actionId==="action_protect"?"effect_notice":
        roleId==="role_fairy"&&actionId==="action_transfer_bite"?"effect_notice":
        ['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(actionId)?"effect_notice":
        roleId==='role_destroyer'&&actionId==='action_destroyer_kill'?'dead':"";
      if(expectedType&&type!==expectedType)
        return j({ok:false,error:"NIGHT_ACTION_TYPE_MISMATCH"},409);
      if(roleId==="role_snow_wolf"&&actionId==="action_snow_wolf_freeze"&&targets.includes(actorId))
        return j({ok:false,error:"SNOW_WOLF_SELF_FREEZE"},409);
      if((roleId==="role_snow_wolf"&&actionId==="action_snow_wolf_freeze"||
          roleId==="role_guard"&&actionId==="action_protect")&&
        targets.some(id=>interactions.some(x=>String(x?.matchId||"")===matchId&&
          normalizeLoginId(x?.loginId)===id&&x?.type==="dead"&&x.effectActive!==false)))
        return j({ok:false,error:"TARGET_ALREADY_DEAD"},409);
      if(roleId==="role_witch"&&actionId==="action_witch_save"){
        const finalBite=resolveWolfNight({assignments:await readNightAssignments(this.ctx.storage,matchId),
          interactions,players,matchId,night:Number(meta.cycleNight||1)});
        if(targets.length!==1||!witchSaveTargetAllowed(finalBite,targets[0]))
          return j({ok:false,error:"WITCH_SAVE_TARGET_INVALID",
            message:"Bình Cứu chỉ dùng được cho người nhận vết Sói Cắn cuối cùng hợp lệ."},409);
      }
      if(!packBite&&actionId==="action_wolf_bite")
        return j({ok:false,error:"PACK_BITE_WRONG_TURN"},403);
      if(packBite&&(!isWolfRole(row)||actionId!=="action_wolf_bite"))
        return j({ok:false,error:"INVALID_PACK_ACTOR"},403);
      if(packBite&&currentUsage.some(x=>String(x?.matchId)===matchId&&Number(x?.night)===Number(meta.cycleNight||1)&&
        x?.actionId==="action_wolf_bite"&&normalizeLoginId(x?.actorId)===actorId))
        return j({ok:false,error:"PACK_BITE_ALREADY_USED"},409);
      const policy=packBite?{roleId,actionId,singleActionPerNight:false,usageMode:"eachNight",usageCount:1,knownAction:true}:
        resolveRoleActionPolicy(roleCard,roleId,actionId);
      // Guard & Snow Wolf may not repeat the exact target two consecutive nights.
      if(["action_protect","action_snow_wolf_freeze"].includes(actionId)){
        const correctRole=actionId==="action_protect"?"role_guard":"role_snow_wolf";
        if(roleId===correctRole&&targets.some(x=>previousNightTargets(currentUsage,{
          matchId,roleId,actionId,actorId,night:Number(meta.cycleNight||1)}).includes(x)))
          return j({ok:false,error:"CONSECUTIVE_NIGHT_TARGET_FORBIDDEN"},409);
      }
      if(roleId==="role_old_witch"){
        // GM can submit forged action types or targets; enforce WITCH-01 before
        // taking snapshots, writing interactions, debiting uses or broadcasting.
        const required=actionId==="action_revive"?"revive":actionId==="action_exile"?"expelled":"";
        if(!required||type!==required)return j({ok:false,error:"WITCH_INVALID_ACTION_TYPE"},409);
        const checked=oldWitchActionCheck({actionId,actorId,targetIds:targets,
          matchId,night:Number(meta.cycleNight||1),interactions,players,
          usage:await this.ctx.storage.get("battleRoleUsage:"+matchId)||[]});
        if(!checked.ok)return j({ok:false,error:checked.error,message:checked.message},409);
      }
      // Recover older confirmed battle actions in an already-running match.
      const known=new Set(currentUsage.map(x=>String(x?.eventId||"")).filter(Boolean));
      for(const hit of interactions){
        const event=String(hit?.clientEventId||""),eventId=event.includes(":")?event.slice(0,event.lastIndexOf(":")):"";
        if(!eventId||known.has(eventId)||!String(hit?.actionId||"")||
          normalizeLoginId(hit?.actorId)!==actorId||String(hit?.matchId||"")!==matchId||
          !Number.isFinite(Number(hit?.night))||Number(hit.night)<1)continue;
        currentUsage=appendBattleRoleActionUsage(currentUsage,{matchId,night:hit.night,
          actorId,roleId,actionId:String(hit.actionId),eventId,usedAt:hit.createdAt});
        known.add(eventId);
      }
      const ruleTargets=['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(actionId)?inspectIds:targets;
      const decision=checkBattleRoleActionUsage(currentUsage,{matchId,
        night:Number(meta.cycleNight||1),actorId,roleId,actionId,targetIds:ruleTargets,policy,
        deadLoginIds:actionId==="action_hunter_mark"?interactions.filter(x=>x?.type==="dead"&&x.effectActive!==false&&
          String(x.matchId||"")===matchId).map(x=>normalizeLoginId(x.loginId)):undefined});
      if(!decision.ok)return j({ok:false,error:decision.error,
        message:decision.message||"Hành động không được phép theo luật vai trò."},409);
      roleUse={matchId,night:Number(meta.cycleNight||1),actorId,roleId,actionId,targetIds:ruleTargets,
        eventId:token,usedAt:new Date().toISOString(),currentUsage};
    }
    const undoKey="battleLastAction:"+matchId,
      artifactKey=artifactId?"artifact:"+actorId:null,
      useKey=artifactId?"artifactUse:"+actorId+":"+artifactId:null,
      cycleUseKey=artifactId?"artifactCycle:"+currentArtifactCycleKey(meta):null;
    const storageKeys=artifactId&&typeof needsStorageArtifact==="function"&&needsStorageArtifact(artifactId)?
      ["artifactIssued:"+matchId,"artifactLinked:"+actorId,mirrorLinkKey(matchId,actorId),this.nightRuntimeKey(meta,Number(meta.cycleNight||1)),...targets.map(id=>"artifact:"+id)]:[];
    const keys=[...new Set(["interactions","assignments",...([roleUse?usageKey:null,artifactKey,useKey,cycleUseKey].filter(Boolean)),...storageKeys])];
    const snapshot=async()=>{const entries=[];for(const key of keys){
      const value=await this.ctx.storage.get(key);
      entries.push({key,exists:value!==undefined&&value!==null,value:value===undefined?null:value});
    }return entries};
    const restore=async entries=>{for(const row of entries){
      if(row.exists)await this.ctx.storage.put(row.key,row.value);
      else await this.ctx.storage.delete(row.key);
    }};
    const before=await snapshot(),results=[];
    // Other players may select expelled targets. The selection consumes the
    // actor's normal action, but never applies gameplay effects to those targets.
    const isFactionCompare=String(body?.actionId||'')==='action_compare_faction';
    // Observation is not a harmful effect: Exile must not suppress faction comparison.
    let actionTargets=targets;
    if(roleUse?.roleId==='role_destroyer'&&body.actionId==='action_destroyer_kill'&&!targets.some(isExpelled)){
      const assigned=await this.ctx.storage.get('assignments')||[];
      const succeeds=targets.every(id=>assigned.some(row=>normalizeLoginId(row.loginId)===id&&['role_seer','role_witch','role_hunter','role_guard','role_assassin'].includes(row.roleId)));
      if(!succeeds)actionTargets=[actorId];
    }
    const effectiveTargets=isFactionCompare?actionTargets:actionTargets.filter(id=>!isExpelled(id));
    for(const id of actionTargets){
      if(isFactionCompare){
        results.push({ok:true,loginId:id,observed:true});continue;
      }
      if(!effectiveTargets.includes(id)){
        results.push({ok:true,loginId:id,noEffect:true,reason:"EXPELLED"});
        continue;
      }
      const action={...body,loginId:id,actorId,clientEventId:token+":"+id,
        actionNonce:token,targetIds:effectiveTargets};
      const response=await this.executeGmInteraction(request,action,auth);
      const data=await response.clone().json().catch(()=>({ok:false,error:"INVALID_RESPONSE"}));
      if(!response.ok||data.ok!==true){
        await restore(before);
        this.broadcast({type:"battle_action_reverted",matchId,turnId,serverTime:Date.now()});
        return j({ok:false,error:"BATTLE_ACTION_ABORTED",detail:data.error||"ACTION_FAILED",
          message:data.message||"Không thể áp dụng đầy đủ hành động; tất cả mục tiêu đã được khôi phục."},response.status>=400?response.status:409);
      }
      results.push(data);
    }
    if(roleUse)await this.ctx.storage.put(usageKey,appendBattleRoleActionUsage(roleUse.currentUsage,roleUse));
    const after=await snapshot(),undoToken="undo-"+crypto.randomUUID(),
      record={token:undoToken,matchId,cycleKey,night:Number(meta.cycleNight||1),turnId,
        label:String(body?.effectName||body?.actionId||"Hành động").slice(0,120),targetIds:targets,
        actorId,source:String(body?.source||"gm"),before,after,undone:false,createdAt:new Date().toISOString()};
    await this.ctx.storage.put(undoKey,record);
    const revealIds=Array.isArray(body?.revealTargetIds)&&body.revealTargetIds.length?body.revealTargetIds.map(normalizeLoginId):String(body?.revealTargetId||'')?[normalizeLoginId(body.revealTargetId)]:targets;
    const revealActionId=String(body?.actionId||'');
    // Seer must receive "Không phải Sói" for an expelled target, even
    // when their harmful effect is correctly skipped by the action executor.
    const seerExcluded=revealActionId==='action_seer'&&revealIds.some(id=>isExpelled(id));
    const revelation=(effectiveTargets.length||seerExcluded)?resolveNightReveal({actionId:revealActionId,
      targetIds:revealIds.filter(id=>players["member:"+id]&&(isFactionCompare||revealActionId==='action_seer'||!isExpelled(id))),
      expelledIds:revealActionId==='action_seer'?revealIds.filter(isExpelled):[],
      assignments:await readNightAssignments(this.ctx.storage,matchId)}):null;
    const wolfOutcome=effectiveTargets.length&&['action_transfer_bite','action_wolf_bite','action_protect','action_witch_save'].includes(String(body?.actionId||''))?
      resolveWolfNight({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:(await this.ctx.storage.get("interactions"))||[],players,
        matchId,night:Number(meta.cycleNight||0)}):null;
    const storageResult=results.find(x=>x?.storageArtifact)?.storageArtifact||null;
    const result={ok:true,undoToken,targets,results,turnId,label:record.label,serverProcessingMs:Date.now()-actionStartedAt,
      ...(storageResult?{revelation:{message:storageResult.message,artifactId:storageResult.artifactId}}:revelation?{revelation}:{}),...(wolfOutcome?{wolfOutcome}: {})};
    await this.ctx.storage.put(receiptKey,{fingerprint,result});
    // Never broadcast a private actor, targets or the undo ledger to member sockets.
    this.broadcast({type:"battle_action_confirmed",matchId,serverTime:Date.now()});
    return j(result);
  }
  async gmBattleUndo(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,matchId=String(meta.matchId||""),key="battleLastAction:"+matchId,
      record=await this.ctx.storage.get(key);
    if(!record||String(body?.undoToken||"")!==record.token)return j({ok:false,error:"UNDO_NOT_FOUND"},404);
    if(record.undone)return j({ok:true,idempotent:true,undone:true,turnId:record.turnId});
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="night"||
      String(meta.cycleKey||"")!==record.cycleKey||Number(meta.cycleNight||0)!==record.night)
      return j({ok:false,error:"UNDO_STALE_TURN",message:"Chỉ khôi phục hành động trong cùng đêm hiện tại."},409);
    // Confirmations may auto-advance the GM timeline before Undo is tapped.
    // Only allow rewind to this exact recorded turn if no later gameplay state
    // has changed. Never roll back a different match/night or another action.
    const runtime=await this.getNightRuntime(meta,Number(meta.cycleNight||1),false);
    const undoIndex=runtime?.queue?.findIndex(step=>String(step?.id||"")===String(record.turnId))??-1;
    if(undoIndex<0||!Number.isInteger(runtime.cursor)||runtime.cursor<undoIndex)
      return j({ok:false,error:"UNDO_STALE_TURN",message:"Lượt đã thay đổi, không thể khôi phục."},409);
    for(const row of record.after){
      const current=await this.ctx.storage.get(row.key),exists=current!==undefined&&current!==null;
      if(exists!==row.exists||JSON.stringify(current??null)!==JSON.stringify(row.value??null))
        return j({ok:false,error:"UNDO_STATE_CHANGED",message:"Dữ liệu đã có tương tác mới; không được ghi đè."},409);
    }
    for(const row of record.before){
      if(row.exists)await this.ctx.storage.put(row.key,row.value);
      else await this.ctx.storage.delete(row.key);
    }
    if(meta.demo)await this.ctx.storage.delete("demoPlan");
    if(runtime.cursor!==undoIndex||runtime.completed||String(meta.currentNightTurnId||"")!==record.turnId)
      await this.advanceNightRuntime(meta,"jump","gm-undo",undoIndex);
    record.undone=true;record.undoneAt=new Date().toISOString();await this.ctx.storage.put(key,record);
    const logId="ev-"+crypto.randomUUID();await this.ctx.storage.put("actionLog:"+String(Date.parse(record.undoneAt)).padStart(13,"0")+":"+logId,{id:logId,type:"battle_undo",loginId:String(record.targetIds||""),matchId,actionId:record.label,message:"GM hoàn tác: "+record.label,createdAt:record.undoneAt,source:"gm"});
    this.broadcast({type:"battle_action_undone",matchId,serverTime:Date.now()});
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values((await this.ctx.storage.get("players"))||{}).map(publicPlayer),serverTime:Date.now()});
    return j({ok:true,undone:true,turnId:record.turnId,targets:record.targetIds});
  }
}
