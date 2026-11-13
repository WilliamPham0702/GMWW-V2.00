// Hành động ban ngày của GM.
import { j } from "../http/responses.js";
import { currentArtifactCycleKey, gameLabelKey } from "../support/game-keys.js";
import { artifactDayPlan, needsStorageArtifact } from "../../gmww-artifact-rules.js";
import { blackWomanLeaving, dayStabOutcome } from "../../gmww-card-rules-quick.js";
import { reserveArtifactActivation } from "../../gmww-game-scene-rules.js";
import { pruneInteractions } from "../../gmww-interaction-retention.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { STATUS_DEFS } from "../../gmww-public-room-contract.js";
import { ghostCheck } from "../../gmww-swap-info-rules.js";

export class RoomDayActionMethods {
  async gmDayAction(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,matchId=String(meta.matchId||""),cycleKey=String(meta.cycleKey||""),
      day=Math.max(1,Number(meta.cycleNight)||1),actorId=normalizeLoginId(body?.actorId),
      roleId=String(body?.roleId||""),artifactId=String(body?.artifactId||""),
      actionId=String(body?.actionId||""),token=String(body?.clientEventId||"").slice(0,120),
      targets=Array.isArray(body?.targetIds)?body.targetIds.map(normalizeLoginId):[];
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="morning"||
      String(body?.matchId||"")!==matchId||String(body?.cycleKey||"")!==cycleKey)
      return j({ok:false,error:"DAY_PHASE_CHANGED"},409);
    if(!token||!actorId||!actionId||(!roleId&&!artifactId)||targets.length>30||
      targets.some(x=>!x)||new Set(targets).size!==targets.length)
      return j({ok:false,error:"INVALID_DAY_ACTION"},400);
    const receiptKey="dayActionReceipt:"+matchId+":"+token,
      fingerprint=JSON.stringify([cycleKey,actorId,roleId,artifactId,actionId,targets]),
      previous=await this.ctx.storage.get(receiptKey);
    if(previous)return previous.fingerprint===fingerprint?
      j({...previous.result,idempotent:true}):j({ok:false,error:"REQUEST_ID_CONFLICT"},409);
    const members=await this.ctx.storage.get("players")||{},
      assignments=await this.ctx.storage.get("assignments")||[],
      interactions=await this.ctx.storage.get("interactions")||[],
      sameMatch=x=>!x?.matchId||String(x.matchId)===matchId,
      affected=(id,kind)=>interactions.some(x=>normalizeLoginId(x?.loginId)===id&&
        sameMatch(x)&&x.effectActive!==false&&String(x.type)===kind);
    if(!members["member:"+actorId]||targets.some(id=>!members["member:"+id]))
      return j({ok:false,error:"DAY_PLAYER_NOT_IN_ROOM"},400);
    let card=null,fn=null,owned=null,ownedKey="artifact:"+actorId;
    if(artifactId){
      owned=await this.ctx.storage.get("artifact:"+actorId);
      if(!owned||String(owned.artifactId)!==artifactId){
        const linked=await this.ctx.storage.get("artifactLinked:"+actorId);
        if(linked&&String(linked.artifactId)===artifactId&&linked.removedFromMatch!==true){owned=linked;ownedKey="artifactLinked:"+actorId}
      }
      if(!owned||String(owned.artifactId)!==artifactId||
        (owned.matchId&&String(owned.matchId)!==matchId))
        return j({ok:false,error:"DAY_ARTIFACT_NOT_OWNED"},403);
      if(owned.removedFromMatch===true)
        return j({ok:false,error:"ARTIFACT_REMOVED_FROM_MATCH"},409);
      card=owned.artifactCard||{};
      const fns=Array.isArray(card.functions)&&card.functions.length?card.functions:card.actions||[];
      fn=fns.find(x=>String(x?.actionId||x?.id)===actionId);
      if(fn){const legacy=(card.actions||[]).find(x=>String(x?.actionId||x?.id)===actionId);fn={...legacy,...fn}}
    }else{
      owned=assignments.find(x=>normalizeLoginId(x.loginId)===actorId&&String(x.roleId)===roleId);
      if(!owned)return j({ok:false,error:"DAY_ROLE_NOT_OWNED"},403);
      const stored=await this.ctx.storage.get("roles:"+actorId)||[],
        privateRoles=Array.isArray(stored)&&stored.length?stored:[await this.ctx.storage.get("role:"+actorId)].filter(Boolean);
      const privateRow=privateRoles.find(x=>String(x.roleId)===roleId&&
        (!x.matchId||String(x.matchId)===matchId));
      card=privateRow?.roleCard||owned.roleCard||{};
      fn=(card.functions||[]).find(x=>String(x?.actionId||x?.id)===actionId);
    }
    if(!fn||!["day","any","both"].includes(String(fn.phase||""))||fn.passive===true||
      (fn.fromNight!=null&&Number(fn.fromNight)>day)||
      (fn.toNight!=null&&Number(fn.toNight)<day))
      return j({ok:false,error:"DAY_ACTION_NOT_CONFIGURED"},403);
    const ghostAct=!artifactId&&roleId==="role_ghost"&&actionId==="action-ghost-message";
    const count=(fn.noTarget===true||ghostAct||artifactId==="artifact_10")?0:Math.max(0,Math.min(30,Math.trunc(Number(fn.targetCount??1)||0)));
    if(targets.length!==count)return j({ok:false,error:"DAY_TARGET_COUNT_INVALID",expected:count},400);
    if(fn.noSelf!==false&&targets.includes(actorId))
      return j({ok:false,error:"DAY_SELF_TARGET_FORBIDDEN"},403);
    const roleKnight=!artifactId&&roleId==="role_knight"&&actionId==="action_knight_last_strike";
    const gallows=roleKnight?(await this.gallowsState(meta)).ballot:null;
    const lynched=roleKnight&&gallows.stage==="resolved"&&gallows.outcome==="dead"&&
      gallows.candidateId===actorId;
    if(roleKnight&&!lynched)return j({ok:false,error:"KNIGHT_REQUIRES_LYNCH"},409);
    {const leaving=(typeof blackWomanLeaving==="function"?blackWomanLeaving:()=>[])({interactions,matchId,day});
      if(leaving.includes(actorId))return j({ok:false,error:"DAY_ACTOR_LEFT_VILLAGE"},409);
      if(targets.some(id=>leaving.includes(id)))return j({ok:false,error:"DAY_TARGET_LEFT_VILLAGE"},409)}
    if((affected(actorId,"dead")&&!fn.actorMayBeDead&&!lynched&&!ghostAct)||
      affected(actorId,"expelled")||affected(actorId,"frozen")||
      interactions.some(x=>normalizeLoginId(x?.loginId)===actorId&&sameMatch(x)&&
        x?.effectActive!==false&&x?.type==="status"&&STATUS_DEFS[x.statusId]?.blocks===true))
      return j({ok:false,error:"DAY_ACTOR_BLOCKED"},409);
    // Expelled players remain targetable, but every effect on them is inert.
    if(targets.some(x=>!affected(x,"expelled")&&fn.allowDead!==true&&affected(x,"dead")&&
      !String(actionId).toLowerCase().includes("revive")))
      return j({ok:false,error:"DAY_TARGET_NOT_ELIGIBLE"},409);
    // Validate resurrection before reserving a day-artifact activation.
    if(artifactId&&/revive|hoi_sinh/.test([actionId,...(Array.isArray(fn.effectIds)?fn.effectIds:[])].join(" ").toLowerCase())&&
      !targets.some(id=>!affected(id,"expelled")&&affected(id,"dead")))
      return j({ok:false,error:"DAY_REVIVE_TARGET_NOT_DEAD",message:"Chưa có người chết hợp lệ để hồi sinh."},409);
    const usageKey="dayRoleUsage:"+matchId,
      priorUsage=await this.ctx.storage.get(usageKey)||[],
      own=priorUsage.filter(x=>x.actorId===actorId&&x.roleId===roleId&&x.artifactId===artifactId),
      used=own.filter(x=>x.actionId===actionId),
      mode=String(fn.usageMode||"unlimited"),usageCount=Math.max(1,Math.min(100,Number(fn.usageCount)||1));
    if(!artifactId){
      if(card.flags?.allowMultipleActions===false&&own.some(x=>x.day===day))
        return j({ok:false,error:"DAY_ROLE_LIMIT_PER_DAY"},409);
      if((["onceGame","nGame","custom"].includes(mode)&&used.length>=usageCount)||
        (["eachNight","eachDay","nPerNight"].includes(mode)&&used.filter(x=>x.day===day).length>=usageCount))
        return j({ok:false,error:"DAY_ROLE_QUOTA_REACHED"},409);
      if(actionId==="action_bear_scan"&&own.some(x=>x.actionId===actionId&&x.day===day))
        return j({ok:false,error:"BEAR_SCAN_ALREADY_USED_TODAY"},409);
    }
    const artifactCycleKey=currentArtifactCycleKey(meta),
      useKey="artifactUse:"+actorId+":"+artifactId;
    let artifactReservation=null;
    if(artifactId){
      if(owned.singleUse===true&&await this.ctx.storage.get(useKey))
        return j({ok:false,error:"DAY_ARTIFACT_SINGLE_USE_EXHAUSTED"},409);
      const ckey="artifactCycle:"+artifactCycleKey,
        cstate=await this.ctx.storage.get(ckey)||{cycleKey:artifactCycleKey,accepted:[]},
        limit=Math.max(0,Math.min(30,Math.trunc(Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)||0)));
      artifactReservation=reserveArtifactActivation(cstate,{requestId:token,playerId:"member:"+actorId,
        artifactId,cycleKey:artifactCycleKey,eligible:true,limit});
      if(!artifactReservation.ok)return j({ok:false,error:artifactReservation.error},409);
    }
    const time=new Date().toISOString(),changes=[],kind=artifactId?"artifact":"role",
      effectiveTargets=targets.filter(id=>!affected(id,"expelled"));
    let message="",deadVictims=[],result=null,skipOwnedWrite=false;
    const isWolf=x=>{const f=gameLabelKey(x?.faction||x?.factionId||"");
      return f.includes("soi")||f==="wolf"||f==="wolves"};
    const isThird=x=>{const f=gameLabelKey(x?.faction||x?.factionId||"");
      return f.includes("phe ba")||f.includes("phe thu")||f==="third"};
    if(targets.length&&effectiveTargets.length===0){
      message="Mục tiêu đã bị đuổi khỏi làng; hành động không có tác dụng.";
      result={message,noEffect:true};
    }else if(!artifactId&&roleId==="role_judge"&&actionId==="action-judge-double"){
      const g=(await this.gallowsState(meta)).ballot;
      if(!["ready","nominating","selecting"].includes(String(g.stage||"ready")))return j({ok:false,error:"JUDGE_TOO_LATE",message:"Phải kích hoạt trước phiên Treo Cổ đầu tiên."},409);
      changes.push({kind:"judge",type:"effect_notice",loginId:actorId});
      message="Thẩm Phán kích hoạt Phán Quyết Kép: sau phiên đầu sẽ có thêm một phiên Treo Cổ.";result={message};
    }else if(ghostAct){
      const chk=(typeof ghostCheck==="function"?ghostCheck:()=>({ok:false,error:"GHOST_UNAVAILABLE"}))({word:body?.word,actorId,assignments,players:(await this.ctx.storage.get("players"))||{},interactions,matchId,day});
      if(!chk.ok){
        if(chk.violation){
          const vrow={id:"ghost-violation:"+matchId+":"+actorId,type:"effect_notice",loginId:actorId,actorId,matchId,cycleKey,night:day,effectActive:false,
            actionId:"action-ghost-violation",effectName:"Hồn Ma vi phạm",source:"swap-info-engine",createdAt:time,message:"Hồn Ma nhắc tên người chơi, mất quyền gửi thông điệp."};
          if(!interactions.some(x=>x?.id===vrow.id)){interactions.push(vrow);await this.ctx.storage.put("interactions",pruneInteractions(interactions));await this.ctx.storage.put("actionLog:"+String(Date.parse(time)).padStart(13,"0")+":"+vrow.id,vrow)}
        }
        return j({ok:false,error:chk.error},chk.violation?403:409);
      }
      changes.push({kind:"ghost",type:"effect_notice",loginId:actorId,extra:{ghostWord:chk.word,publicReveal:true,revealedRoleId:"role_ghost"}});
      message="Hồn Ma: "+chk.word;result={message,word:chk.word};
    }else if(!artifactId&&actionId==="action_stab"&&roleId==="role_thug"){
      const chosen=assignments.filter(x=>normalizeLoginId(x.loginId)===effectiveTargets[0]);
      const correctlyStabbed=chosen.some(x=>isWolf(x)||isThird(x));
      deadVictims=[correctlyStabbed?effectiveTargets[0]:actorId];
      message=correctlyStabbed?"Du Côn đâm đúng Sói/Phe Ba.":"Du Côn đâm nhầm Dân Làng và bị chết.";
      result={message,correctlyStabbed};
    }else if(!artifactId&&((actionId==="action-knight-stab"&&roleId==="role_cavalier")||(actionId==="action-g7-prince-stab"&&roleId==="role_prince"))){
      const chosen=assignments.find(x=>normalizeLoginId(x.loginId)===effectiveTargets[0]);
      const out=dayStabOutcome({roleId,actorId,target:chosen});
      deadVictims=out.dead;
      message=out.correct?(roleId==="role_prince"?"Hoàng Tử đâm đúng Sói/Phe Ba.":"Kỵ Sỹ đâm đúng Sói."):(roleId==="role_prince"?"Hoàng Tử đâm nhầm Dân Làng và bị chết.":"Kỵ Sỹ đâm nhầm và bị chết.");
      result={message,correctlyStabbed:out.correct,publicRole:roleId};
    }else if(!artifactId&&actionId==="action_bear_scan"&&["role_bear","role_bear_god"].includes(roleId)){
      const hasWolf=effectiveTargets.some(id=>assignments.some(x=>normalizeLoginId(x.loginId)===id&&isWolf(x)));
      message=hasWolf?"CÓ SÓI":"KHÔNG CÓ SÓI";
      result={message,hasWolf};
    }else if(roleKnight){
      const pendingKey="knightPending:"+matchId+":"+(day+1)+":"+effectiveTargets[0];
      if(await this.ctx.storage.get(pendingKey))
        return j({ok:false,error:"KNIGHT_TARGET_ALREADY_QUEUED"},409);
      changes.push({kind:"knight_pending",key:pendingKey,value:{matchId,actorId,
        targetId:effectiveTargets[0],createdAt:time,resolveDay:day+1}});
      message="Hiệp Sĩ đã chọn mục tiêu. Hiệu lực vào sáng ngày tiếp theo.";
      result={message};
    }else if(artifactId){
      const effects=Array.isArray(fn.effectIds)?fn.effectIds.map(String):[];
      let storagePlan=null;
      if(typeof needsStorageArtifact==="function"&&needsStorageArtifact(artifactId)){
        storagePlan=await this.artifactStoragePlan({artifactId,actorId,targetId:effectiveTargets[0]||"",targets:effectiveTargets,meta,matchId,day,assignments,interactions,members,requestFlip:body?.requestFlip===true});
        if(!storagePlan.ok)return j({ok:false,error:storagePlan.error,message:storagePlan.message},409);
      }
      const aplan=storagePlan?{ok:true,changes:storagePlan.changes||[],message:storagePlan.message,result:storagePlan.result||{}}:typeof artifactDayPlan==="function"?artifactDayPlan({designatedId:normalizeLoginId(body?.designatedId),artifactId,actionId,actorId,targets:effectiveTargets,assignments,interactions,matchId,day}):null;
      if(aplan){
        if(!aplan.ok)return j({ok:false,error:aplan.error,message:aplan.message},409);
        if(aplan.needsGallowsBeforeFirst){
          const g=(await this.gallowsState(meta)).ballot;
          if(!["ready","nominating","selecting"].includes(String(g.stage||"ready")))return j({ok:false,error:"JUDGE_TOO_LATE",message:"Phải kích hoạt trước phiên Treo Cổ đầu tiên."},409);
        }
        if(storagePlan?.replacedOwn)skipOwnedWrite=true;
        for(const rid of aplan.revive||[]){
          for(const x of interactions.filter(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===rid&&String(x.type)==="dead"&&x.effectActive!==false)){x.effectActive=false;x.expiredAt=time;x.expiredReason="DAY_ARTIFACT_REVIVE"}
          changes.push({kind:"revived",loginId:rid});
        }
        for(const c of aplan.changes)changes.push(c);
        deadVictims=aplan.kill||[];message=aplan.message;
        result={message,...(aplan.result||{})};
      }else if(actionId==='action_revive'||effects.includes('effect_revive')){
        for(const id of effectiveTargets){
          const changed=interactions.filter(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===id&&
            String(x.type)==="dead"&&x.effectActive!==false);
          for(const x of changed){x.effectActive=false;x.expiredAt=time;x.expiredReason="DAY_ARTIFACT_REVIVE"}
          changes.push({kind:"revived",loginId:id});
        }
        message="Artifact hồi sinh đã được ghi nhận.";
      }else if(['action_witch_kill','action_day_kill'].includes(actionId)||effects.includes('effect_kill')){
        deadVictims=effectiveTargets;message="Artifact đã gây tác động Chết.";
      }else if(actionId==='action_exile'||effects.includes('effect_exile')){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,type:"expelled"});
        message="Artifact đã thực hiện Đuổi.";
      }else if(artifactId==="artifact_15"&&actionId==="artifact_action_negate"){
        // Only a previously used, truly unlimited Artifact qualifies. Do not
        // confuse a one-time Artifact or merely assigned card with "used".
        const id=effectiveTargets[0],
          targetArtifact=id?await this.ctx.storage.get("artifact:"+id):null,
          summary=assignments.find(x=>normalizeLoginId(x.loginId)===id),
          permanent=targetArtifact?.singleUse===false&&
            Array.isArray(targetArtifact?.artifactCard?.functions)&&
            targetArtifact.artifactCard.functions.some(fn=>
              String(fn?.usageMode)==="unlimited"),
          wasUsed=!!targetArtifact?.usedAt||
            (targetArtifact?.artifactId&&!!(await this.ctx.storage.get(
              "artifactUse:"+id+":"+String(targetArtifact.artifactId))));
        if(!id||!targetArtifact||targetArtifact.removedFromMatch===true||
          (targetArtifact.matchId&&String(targetArtifact.matchId)!==matchId)||
          !summary||String(summary.artifactId||"")!==String(targetArtifact.artifactId||"")||
          !permanent||!wasUsed)
          return j({ok:false,error:"NEGATE_TARGET_NOT_ELIGIBLE",
            message:"Chỉ được loại Artifact dùng mãi mãi đã sử dụng và còn trong ván; chưa trừ lượt."},409);
        changes.push({kind:"remove_artifact",loginId:id,
          artifactId:String(targetArtifact.artifactId)});
        message="Kim Cương Phủ Nhận đã loại khỏi ván Artifact dùng mãi mãi đã sử dụng.";
      }else if(artifactId==="artifact_07"&&actionId==="action-grudge-designate"){
        if(effectiveTargets.some(id=>affected(id,"dead")||
          interactions.some(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===id&&
            x.deferredArtifact==="artifact_07"&&x.pendingDeath===true)))
          return j({ok:false,error:"DAY_GRUDGE_TARGET_INELIGIBLE",
            message:"Mục tiêu đã chết hoặc đã bị đánh dấu; chưa trừ lượt."},409);
        for(const id of effectiveTargets)changes.push({kind:"grudge_schedule",
          loginId:id,type:"effect_notice"});
        message="Hơi Thở Lão Già đã đánh dấu. Tác động chết sẽ xét ở sáng sau đêm kế tiếp.";
      }else if(actionId==='artifact_action_lock_function'){
        // Bình Giấc Mơ: an actual server-side block for two whole day/night
        // cycles, rather than an acknowledgement with no effect.
        if(effectiveTargets.some(id=>interactions.some(x=>sameMatch(x)&&
          normalizeLoginId(x.loginId)===id&&x.type==="status"&&
          x.statusId==="disabled_2n"&&x.effectActive!==false)))
          return j({ok:false,error:"DAY_DREAM_ALREADY_LOCKED",message:"Mục tiêu đang bị khóa chức năng; không tiêu hao lượt."},409);
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,
          type:"status",statusId:"disabled_2n"});
        message="Bình Giấc Mơ đã khóa chức năng mục tiêu trong 2 ngày đêm.";
      }else if(['artifact_action_block_vote','action_block_vote'].includes(actionId)||effects.includes('effect-artifact-block-vote')||
          /cấm\s*(?:bỏ\s*)?phiếu|cấm\s*vote/i.test(String(fn.name||fn.label||''))){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,type:"status",statusId:"vote_ban"});
        message="Artifact đã cấm bỏ phiếu Lên Giàn trong ngày hiện tại.";
      }else if(actionId==='action_snow_wolf_freeze'||effects.includes('effect_snow_wolf_freeze')){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,type:"frozen"});
        message="Artifact đã thực hiện Đóng Băng.";
      }else{
        return j({ok:false,error:"DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED",message:"Artifact này chưa có xử lý hiệu ứng trên Server; chưa tiêu hao lượt sử dụng."},409);
      }
      result={message};
    }else return j({ok:false,error:"DAY_ROLE_EFFECT_NOT_IMPLEMENTED"},409);
    for(const id of deadVictims)changes.push({kind:"status",loginId:id,type:"dead"});
    for(const effect of changes){
      if(effect.kind==="remove_artifact"){
        const removed=await this.ctx.storage.transaction(async txn=>{
          const target=await txn.get("artifact:"+effect.loginId),
            rows=await txn.get("assignments")||[],
            assigned=rows.find(x=>normalizeLoginId(x.loginId)===effect.loginId);
          if(!target||target.removedFromMatch===true||
            String(target.artifactId||"")!==effect.artifactId||
            (target.matchId&&String(target.matchId)!==matchId)||
            !assigned||String(assigned.artifactId||"")!==effect.artifactId)
            return {ok:false};
          target.removedFromMatch=true;target.removedAt=time;
          target.removedByArtifactId=artifactId;
          await txn.put("artifact:"+effect.loginId,target);
          for(const row of rows){
            if(normalizeLoginId(row.loginId)!==effect.loginId||
              String(row.artifactId||"")!==effect.artifactId)continue;
            row.artifactId=null;row.artifactName=null;
            row.artifactUsedAt=null;row.artifactViewedAt=null;
            row.artifactPriorityFirst=null;row.artifactSingleUse=null;
          }
          await txn.put("assignments",rows);
          return {ok:true};
        });
        if(!removed.ok)return j({ok:false,error:"NEGATE_TARGET_CHANGED"},409);
        continue;
      }
      if(effect.kind==="knight_pending"){await this.ctx.storage.put(effect.key,effect.value);continue}
      if(effect.kind==="revived")continue;
      // Multiple distinct status IDs may coexist (e.g. Mute and Artifact vote ban).
      const sameStatus=effect.type==="status"&&interactions.some(row=>
        sameMatch(row)&&normalizeLoginId(row.loginId)===effect.loginId&&
        row.effectActive!==false&&row.type==="status"&&row.statusId===effect.statusId&&
        Number(row.night)===day);
      if(effect.type!=="effect_notice"&&(effect.type==="status"?sameStatus:affected(effect.loginId,effect.type)))continue;
      const log={id:"ix-"+crypto.randomUUID(),type:effect.type,
        ...(effect.statusId?{statusId:effect.statusId}:{}),
        ...(effect.statusId==="disabled_2n"?{activationPhase:"morning"}:{}),
        ...(effect.kind==="grudge_schedule"?{
          pendingDeath:true,deferredArtifact:"artifact_07",scheduledFromNight:day,
          effectName:"Hơi Thở Lão Già"
        }:{}),
        ...(effect.extra||{}),
        loginId:effect.loginId,matchId,cycleKey,
        night:effect.kind==="grudge_schedule"?day+1:(effect.extra?.nightOverride||day),actorId,artifactId,roleId,actionId,
        source:"day-action",effectActive:effect.type!=="effect_notice",
        message:message||"Hành động Ban ngày",createdAt:time,
        ...(effect.extra?.forceActive?{effectActive:true}:{}),
        ...(effect.extra?.actionIdOverride?{actionId:effect.extra.actionIdOverride}:{}),
        ...(effect.extra?.rowMessage?{message:effect.extra.rowMessage}:{})};
      interactions.push(log);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(time)).padStart(13,"0")+":"+log.id,log);
      if(log.effectActive)this.broadcast({type:"player_status_changed",loginId:log.loginId,
        statusId:log.statusId||log.type,active:true,serverTime:Date.now()});
    }
    if(typeof this.reviveArtifactSweep==='function')await this.reviveArtifactSweep(meta,interactions,time);
    if(typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,interactions,time);
    await this.ctx.storage.put("interactions",pruneInteractions(interactions));
    const audit={id:"ev-"+crypto.randomUUID(),source:"gm",type:"day_action",actorId,
      roleId,artifactId,actionId,matchId,night:day,targetIds:targets,message,createdAt:time};
    await this.ctx.storage.put("actionLog:"+String(Date.parse(time)).padStart(13,"0")+":"+audit.id,audit);
    if(artifactId){
      const ckey="artifactCycle:"+artifactCycleKey;
      await this.ctx.storage.put(ckey,artifactReservation.state);
      await this.ctx.storage.put(useKey,{requestId:token,cycleKey:artifactCycleKey,usedAt:time,artifactId,actorId});
      if(!skipOwnedWrite){owned.usedAt=time;await this.ctx.storage.put(ownedKey,owned)}
    }else{
      await this.ctx.storage.put(usageKey,[...priorUsage,{matchId,day,actorId,roleId,
        artifactId:"",actionId,requestId:token,createdAt:time}].slice(-1000));
    }
    const payload={ok:true,kind,actionId,actorId,roleId,artifactId,targetIds:targets,
      day,result,serverTime:Date.now()};
    await this.ctx.storage.put(receiptKey,{fingerprint,result:payload});
    // A shared socket only signals a committed action; GM reads targets privately.
    this.broadcast({type:"day_action_confirmed",matchId,day,serverTime:Date.now()});
    return j(payload);
  }
}
