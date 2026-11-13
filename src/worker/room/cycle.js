// Chu kỳ ngày/đêm: áp dụng kết quả, tự chuyển, báo thức, lượt GM.
import { j } from "../http/responses.js";
import { artifactBiteDawn, coinDeaths } from "../../gmww-artifact-rules.js";
import { seerShareNotices } from "../../gmww-artifact-seer.js";
import { newsBearerNotices, oldManLifespanDeaths, strongmanDawn } from "../../gmww-card-rules-quick.js";
import { expireCycleEffects } from "../../gmww-cycle-effect-expiry.js";
import { projectDemoClock } from "../../gmww-demo-clock.js";
import { nextServerDemoDue } from "../../gmww-demo-runner.js";
import { AUTO_GALLOWS_LOCK_PAUSE_MS, autoGallowsDue, gallowsAutomaticNominee, gallowsBegin, gallowsCloseNomination, gallowsMode, gallowsOpen, gallowsSnapshot } from "../../gmww-gallows-rules.js";
import { pruneInteractions } from "../../gmww-interaction-retention.js";
import { cultKillDeaths, elderBell } from "../../gmww-night-cult-rules.js";
import { jumpTarget } from "../../gmww-night-turn-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { PLAYER_ROOM_CHECK_MS } from "../../gmww-player-room-policy.js";
import { STATUS_DEFS, publicRoom } from "../../gmww-public-room-contract.js";
import { peekDeaths, threeBrothersNotices } from "../../gmww-swap-info-rules.js";
import { publicPlayer } from "../../gmww-village-player-state.js";
import { isNightImmune, readNightAssignments, resolveMaidenNight, resolveWolfNight } from "../../gmww-wolf-night-resolution.js";
import { convertNotices, fireSpreadDeaths, stoneSkinFilter } from "../../gmww-wolf-variant-rules.js";

export class RoomCycleMethods {
  async applyCycle(meta,phase,night,cycleKey,source="gm"){
    const now=new Date().toISOString(),p=phase==="day"?"morning":String(phase||"").toLowerCase(),n=Math.max(0,Number(night)||0),key=String(cycleKey||((p&&n)?(p+"-"+n):("cycle-"+Date.now()))).slice(0,160);
    // Hold the adjudicated vote for 30 actual seconds or until explicit GM
    // acknowledgment, including if Auto GM reaches the end of Day early.
    if(p==="night"&&String(meta.cyclePhase||"")==="morning"&&n===Number(meta.cycleNight||0)+1&&!meta.demo){
      const ballot=await this.ctx.storage.get("gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""));
      const at=Number(ballot?.resolvedAt||0);
      if(ballot?.stage==="resolved"&&at>0&&!ballot.acknowledgedAt&&Date.now()<at+30000)
        return {ok:false,error:"GALLOWS_VERDICT_PENDING",message:"Đang công bố kết quả Lên Giàn; GM xác nhận hoặc chờ đủ 30 giây."};
    }
    // Replayed completion must not restart day timers or expire effects twice.
    if(meta.cycleKey===key&&meta.cyclePhase===p&&Number(meta.cycleNight)===n)
      return{ok:true,idempotent:true,cycleKey:key,phase:p,night:n,expired:[],matchId:String(meta.matchId||""),nightRuntime:p==="night"?await this.getNightRuntime(meta,n,false):null,room:publicRoom(meta)};
    meta.cycleKey=key;if(p)meta.cyclePhase=p;if(n)meta.cycleNight=n;meta.cycleStartedAt=now;meta.autoPausedRemainingMs=null;meta.dayDeadlineAt=null;
    if(p==='morning'){const cfg=(await this.ctx.storage.get('gameConfig'))||{},ms=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0)*1000;meta.dayDeadlineAt=ms>0?new Date(Date.parse(now)+ms).toISOString():null;if(meta.autoGM===false&&!meta.demo)meta.autoPausedRemainingMs=ms}
    meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    const rows=(await this.ctx.storage.get("interactions"))||[];
    const expired=expireCycleEffects(rows,{phase:p,night:n,cycleKey:key,matchId:meta.matchId,statusDefs:STATUS_DEFS,now});
    // Night powers record intent; only dawn activates lethal outcomes. Keep the
    // original receipt so undo, usage and retry handling remain transactional.
    const bell=p==="morning"&&n>0&&typeof elderBell==="function"?elderBell({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now}):{active:false,rows:[]};
    if(p==="morning"&&n>0)for(const row of rows){
      if(bell.active&&row.pendingDeath===true&&String(row.matchId)===String(meta.matchId)&&Number(row.night)===n){row.pendingDeath=false;row.effectActive=false;row.resolvedAt=now;row.expiredReason="ELDER_BELL";continue}
      if(row.pendingDeath!==true||String(row.matchId)!==String(meta.matchId)||Number(row.night)!==n)continue;
      // Hơi Thở Lão Già is marked in cycle N and becomes lethal after
      // NIGHT N+1. Resolve exactly once; respect existing night immunity,
      // exile and death so this Artifact never bypasses normal protection.
      if(row.deferredArtifact==="artifact_07"){
        const id=normalizeLoginId(row.loginId),
          excluded=rows.some(x=>x!==row&&normalizeLoginId(x.loginId)===id&&
            (!x.matchId||String(x.matchId)===String(meta.matchId))&&
            x.effectActive!==false&&["dead","expelled"].includes(String(x.type))),
          immune=isNightImmune(await readNightAssignments(this.ctx.storage,meta.matchId),id);
        if(excluded||immune){
          row.pendingDeath=false;row.effectActive=false;row.resolvedAt=now;
          row.expiredReason=immune?"NIGHT_IMMUNE":"ALREADY_DEAD_OR_EXPELLED";
          await this.ctx.storage.put("actionLog:"+String(Date.parse(row.createdAt)).padStart(13,"0")+":"+row.id,row);
          continue;
        }
      }
      row.pendingDeath=false;row.type="dead";row.effectActive=true;row.resolvedAt=now;
      row.message="Bạn đã chết vì "+(row.effectName||"tác động ban đêm")+".";
      await this.ctx.storage.put("actionLog:"+String(Date.parse(row.createdAt)).padStart(13,"0")+":"+row.id,row);
    }
    // At dawn resolve confirmed wolf-bite/Guard/Fairy notices in the SAME match
    // and night. Guards block final, potentially transferred bite destinations.
    // An absent bite or a malformed seating ring never manufactures a death.
    const wolfResolution=p==="morning"&&n>0?
      resolveWolfNight({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:rows,players:(await this.ctx.storage.get("players"))||{},
        matchId:String(meta.matchId||""),night:n}):null;
    // Lực Sỹ chịu được 1 lần Sói Cắn có thể gây chết (Bảo Vệ chặn thì không tiêu hao).
    let dawnVictims=wolfResolution?.ok&&!bell.active?wolfResolution.victims:[];
    if(wolfResolution?.ok){
      const sm=(typeof strongmanDawn==="function"?strongmanDawn:a=>({victims:a.victims,rows:[]}))({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,victims:dawnVictims,now});
      dawnVictims=sm.victims;
      for(const row of sm.rows){if(rows.some(x=>String(x?.id||"")===row.id))continue;rows.push(row);await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+row.id,row)}
    }
    // Da Đá (Sói Đá) chặn 1 lần tác động chết từ Sói Cắn; Lửa Lan chết sáng 2 ngày sau; thông báo riêng đêm chuyển phe.
    if(wolfResolution?.ok){
      const st=(typeof stoneSkinFilter==="function"?stoneSkinFilter:a=>({victims:a.victims,rows:[]}))({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,victims:dawnVictims,now});
      dawnVictims=st.victims;
      for(const row of st.rows){if(rows.some(x=>String(x?.id||"")===row.id))continue;rows.push(row);await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+row.id,row)}
    }
    if(wolfResolution?.ok&&typeof artifactBiteDawn==="function"){
      const ab=artifactBiteDawn({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,victims:dawnVictims,now});
      dawnVictims=ab.victims;
      for(const row of ab.rows){if(rows.some(x=>String(x?.id||"")===row.id))continue;rows.push(row);await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+row.id,row)}
    }
    if((p==="morning"||p==="night")&&n>0){
      const wv=p==="morning"?[...(typeof fireSpreadDeaths==="function"?fireSpreadDeaths:()=>[])({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,players:(await this.ctx.storage.get("players"))||{},matchId:String(meta.matchId||""),night:n,cycleKey:key,now}),
          ...(typeof coinDeaths==="function"?coinDeaths:()=>[])({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now}),
          ...(typeof seerShareNotices==="function"?seerShareNotices:()=>[])({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now}),
          ...(bell.active||typeof peekDeaths!=="function"?()=>[]:peekDeaths)({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now})]:
        [...(typeof convertNotices==="function"?convertNotices:()=>[])({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now}),
          ...(typeof threeBrothersNotices==="function"?threeBrothersNotices:()=>[])({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now})];
      for(const row of wv){if(rows.some(x=>String(x?.id||"")===row.id))continue;rows.push(row);await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+row.id,row)}
    }
    if(wolfResolution?.ok)for(const loginId of dawnVictims){
      const id="wolf-bite:"+String(meta.matchId)+":"+n+":"+loginId;
      if(rows.some(row=>String(row?.id||"")===id))continue;
      rows.push({id,clientEventId:id,type:"dead",loginId,matchId:String(meta.matchId||""),
        night:n,cycleKey:key,effectActive:true,actionId:"action_wolf_bite",
        effectId:"effect_wolf_bite",effectName:"Sói Cắn",message:"Bạn đã chết vì Sói Cắn.",
        createdAt:now,source:"wolf-night-engine",status:"pending",response:null});
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,rows[rows.length-1]);
    }
    // Resolve Maiden only at dawn after all confirmed night attacks and wolf deaths.
    // Retain the same idempotent death event contract used by wolf-night-engine.
    if(p==="morning"&&n>0){
      const maidenVictims=bell.active?[]:resolveMaidenNight({assignments:(await this.ctx.storage.get("assignments"))||[],
        interactions:rows,matchId:String(meta.matchId||""),night:n});
      for(const loginId of maidenVictims){
        const visit=rows.find(row=>String(row?.actionId||"")==="action_visit_house"&&
          normalizeLoginId(row?.actorId)===normalizeLoginId(loginId)&&
          String(row?.matchId||"")===String(meta.matchId||"")&&Number(row?.night)===n);
        const targetId=normalizeLoginId(visit?.loginId);
        const assigned=(await this.ctx.storage.get("assignments"))||[];
        const visited=assigned.find(row=>normalizeLoginId(row?.loginId)===targetId);
        const faction=String(visited?.roleCard?.factionId||visited?.factionId||visited?.faction||"").toLowerCase();
        const visitingWolf=String(visited?.roleId||"").includes("wolf")||faction==="wolf"||faction.includes("sói")||faction.includes("soi");
        const maidenReason=visitingWolf?"Thiếu Nữ chết vì đến thăm nhà Sói.":"Thiếu Nữ chết vì người được thăm đã chết trong đêm.";
        const id="maiden-visit:"+String(meta.matchId)+":"+n+":"+loginId;
        if(rows.some(row=>String(row?.id||"")===id))continue;
        rows.push({id,clientEventId:id,type:"dead",loginId,matchId:String(meta.matchId||""),
          night:n,cycleKey:key,effectActive:true,actionId:"action_visit_house",
          effectId:"effect_visit_house",effectName:"Thăm Nhà",message:maidenReason,
          createdAt:now,source:"maiden-night-engine",status:"pending",response:null});
        await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,rows[rows.length-1]);
      }
    }
    // Ông Già (tuổi thọ) và Người Loan Tin (công bố vai trò) xử lý sau mọi tác động đêm.
    if(p==="morning"&&n>0){
      const assignedNow=(await this.ctx.storage.get("assignments"))||[];
      const guardIds=rows.filter(x=>String(x?.matchId||"")===String(meta.matchId||"")&&Number(x?.night)===n&&x?.type==="effect_notice"&&x.undone!==true&&["action_protect","action_witch_save"].includes(x.actionId)).map(x=>normalizeLoginId(x.loginId)),
        immuneIds=assignedNow.filter(a=>a?.roleCard?.flags?.nightImmune===true).map(a=>normalizeLoginId(a.loginId));
      const cultRows=bell.active||typeof cultKillDeaths!=="function"?[]:cultKillDeaths({assignments:assignedNow,interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now,protectedIds:[...guardIds,...immuneIds]});
      const extra=[...bell.rows,...cultRows,...(typeof oldManLifespanDeaths==="function"?oldManLifespanDeaths:()=>[])({assignments:assignedNow,interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now}),
        ...(typeof newsBearerNotices==="function"?newsBearerNotices:()=>[])({assignments:assignedNow,interactions:rows,matchId:String(meta.matchId||""),night:n,cycleKey:key,now})];
      for(const row of extra){if(rows.some(x=>String(x?.id||"")===row.id))continue;rows.push(row);await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+row.id,row)}
    }
    // Queue from a lynched Knight becomes a real death only on the next dawn.
    if(p==="morning"&&n>0){
      const pending=await this.ctx.storage.list({prefix:"knightPending:"+String(meta.matchId||"")+":"+n+":"});
      for(const [storageKey,action] of pending.entries()){
        const loginId=normalizeLoginId(action?.targetId);
        if(!loginId||String(action?.matchId||"")!==String(meta.matchId||""))continue;
        const id="knight-strike:"+String(meta.matchId)+":"+n+":"+loginId;
        if(!rows.some(x=>String(x.id)===id)&&
          !rows.some(x=>String(x.type)==="dead"&&x.effectActive!==false&&
            normalizeLoginId(x.loginId)===loginId&&(!x.matchId||String(x.matchId)===String(meta.matchId)))){
          const consequence={id,type:"dead",loginId,matchId:String(meta.matchId),
            night:n,cycleKey:key,effectActive:true,source:"knight-day-action",
            actionId:"action_knight_last_strike",message:"Hiệp Sĩ đã chọn người này từ ngày trước.",
            createdAt:now};
          rows.push(consequence);
          await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,consequence);
        }
        await this.ctx.storage.delete(storageKey);
      }
    }
    if(n>0&&typeof this.reviveArtifactSweep==="function")await this.reviveArtifactSweep(meta,rows,now);
    if(p==="morning"&&typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,now);
    await this.ctx.storage.put("interactions",pruneInteractions(rows));
    const nightRuntime=p==="night"&&n>0?await this.getNightRuntime(meta,n,true):null;
    if(nightRuntime){meta.currentNightTurnId=nightRuntime.currentId;meta.updatedAt=now;await this.ctx.storage.put("meta",meta)}
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    const room=publicRoom(meta);this.broadcast({type:"room_cycle",cycleKey:key,phase:p,night:n,matchId:String(meta.matchId||""),expired,nightRuntime,room,source,serverTime:Date.now()});
    this.broadcast({type:"room_state",room,players:Object.values((await this.ctx.storage.get("players"))||{}).map(publicPlayer),serverTime:Date.now()});
    await this.scheduleRoomAlarm(meta);
    return{ok:true,cycleKey:key,phase:p,night:n,expired,wolfResolution,matchId:String(meta.matchId||""),nightRuntime,room}
  }
  async autoAdvanceDue(meta){
    if(!meta||String(meta.phase||"").toLowerCase()!=="running"||meta.autoGM===false)return 0;
    const cyclePhase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(1,Number(meta.cycleNight||1));
    if(cyclePhase==="night"){
      const runtime=await this.getNightRuntime(meta,night,true);
      if(!runtime)return 0;
      if(runtime.completed)return Date.now();
      const active=runtime.queue?.[runtime.cursor];
      if(!active||active.kind==="village-wakeup")return Date.now();
      const deadline=Date.parse(runtime.deadlineAt||"");
      if(Number.isFinite(deadline))return deadline;
      // Reconstruct a missing deadline from the original Server turn start.
      // Zero-duration turns advance immediately only while Auto GM is enabled.
      const started=Date.parse(active.startedAt||runtime.startedAt||"");
      const seconds=Math.max(0,Number(active.durationSec)||0);
      return Number.isFinite(started)?started+seconds*1000:Date.now();
    }
    if(cyclePhase==="morning"||cyclePhase==="day"){
      const deadline=Date.parse(meta.dayDeadlineAt||'');
      const cfg=(await this.ctx.storage.get("gameConfig"))||{},sec=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0),
        started=Date.parse(meta.cycleStartedAt||"");
      const due=Number.isFinite(deadline)?deadline:sec&&Number.isFinite(started)?started+sec*1000:0;
      if(meta.demo)return due;
      const ballot=await this.ctx.storage.get("gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""));
      return autoGallowsDue(ballot,meta,due,Date.now());
    }
    return 0
  }
  async scheduleRoomAlarm(meta=null){
    meta=meta||await this.ctx.storage.get("meta");if(!meta||String(meta.phase||"").toLowerCase()==="deleted")return 0;
    const expiryDue=this.roomExpiryDue(meta),autoDue=await this.autoAdvanceDue(meta),demoDue=meta.demo?await nextServerDemoDue(this,meta):0,countdownDue=typeof this.dayCountdownDue==="function"?await this.dayCountdownDue(meta):0,presenceDue=meta.playerRoom===true?Date.now()+PLAYER_ROOM_CHECK_MS:0,due=Math.min(expiryDue,autoDue||Infinity,demoDue||Infinity,countdownDue||Infinity,presenceDue||Infinity),next=Math.max(Date.now()+25,due);
    try{await this.ctx.storage.setAlarm(next)}catch(error){console.error("GMWW_ROOM_ALARM_SCHEDULE",error);if(meta.demo)throw error}
    return next
  }
  async runAutoAdvanceIfDue(meta){
    if(!meta||String(meta.phase||"").toLowerCase()!=="running"||meta.autoGM===false)return false;
    if(meta.playerRoom===true&&await this.playerRoomAutoEnd(meta))return true;
    const due=await this.autoAdvanceDue(meta);if(!due||due>Date.now()+25)return false;
    const phase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(1,Number(meta.cycleNight||1));
    if(phase==="night"){const runtime=await this.getNightRuntime(meta,night,true);if(runtime&&!runtime.completed)await this.advanceNightRuntime(meta,"next","auto");const fresh=await this.ctx.storage.get("meta"),after=await this.getNightRuntime(fresh,night,true);if(after?.completed)await this.applyCycle(fresh,"morning",night,"morning-"+night,"auto");else await this.scheduleRoomAlarm(fresh);return true}
    if(phase==="morning"||phase==="day"){
      // V3.305: discussion end opens the Gallows (nominate → lock → vote → verdict); night only after the verdict.
      if(!meta.demo&&typeof this.autoGallowsStep==="function"&&await this.autoGallowsStep(meta)!=="night"){await this.scheduleRoomAlarm(await this.ctx.storage.get("meta")||meta);return true}
      await this.applyCycle(meta,"night",night+1,"night-"+(night+1),"auto");return true}
    return false
  }
  async autoGallowsStep(meta){
    const {key,ballot}=await this.gallowsState(meta),now=Date.now(),stage=String(ballot.stage||"ready");
    if(stage==="resolved")return Number(ballot.acknowledgedAt||0)>0||now>=Number(ballot.resolvedAt||0)+30000?"night":"wait";
    if(gallowsMode(ballot)!=="auto")return "wait";
    let result=null;
    if(stage==="ready")result=gallowsOpen(ballot,now);
    else if(stage==="selecting"&&now>=Number(ballot.hangingStartedAt||0)+AUTO_GALLOWS_LOCK_PAUSE_MS){
      const target=ballot.candidateId||gallowsAutomaticNominee(ballot);
      result=target?gallowsBegin(ballot,target,now):gallowsCloseNomination(ballot,now);
    }
    if(!result?.ok)return "wait";
    await this.ctx.storage.put(key,result.value);
    this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:gallowsSnapshot(result.value,meta,now),serverTime:now});
    return "gallows";
  }
  async gmTurn(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;
    if(String(meta.phase||"").toLowerCase()!=="running"||String(meta.cyclePhase||"").toLowerCase()!=="night")return j({ok:false,error:"NOT_NIGHT_TURN",message:"Chỉ chuyển lượt khi đang ở Ban Đêm."},409);
    const night=Math.max(1,Number(meta.cycleNight||1)),action=String(body?.action||"next").toLowerCase(),source=String(body?.source||"gm").slice(0,40);
    if(!["next","back","jump"].includes(action))return j({ok:false,error:"INVALID_TURN_ACTION"},400);
    const before=await this.getNightRuntime(meta,night,true);
    if(body?.expectedTurnId!==undefined&&String(body.expectedTurnId)!==String(before?.currentId||""))
      return j({ok:false,error:"STALE_TURN",message:"Lượt đã thay đổi trên server. Hãy đồng bộ lại."},409);
    let targetIndex=null;
    if(action==="jump"){
      if(!Number.isInteger(body?.targetIndex))return j({ok:false,error:"INVALID_TURN_INDEX"},400);
      targetIndex=body.targetIndex;
      const target=jumpTarget(before?.queue,targetIndex);
      if(!target)return j({ok:false,error:"INVALID_TURN_INDEX"},400);
      if((target.kind==="artifact-main"||target.kind==="early-artifact")&&await this.artifactUsedInNight(meta,target))
        return j({ok:false,error:"ARTIFACT_ALREADY_USED",message:"Artifact này đã sử dụng trong đêm, không thể thực hiện lần nữa."},409);
    }
    if(meta.demo&&source==="demo"){const c=await this.ctx.storage.get("demoClock");if(c&&projectDemoClock(c,Date.now()).remainingMs>0)return j({ok:false,error:"DEMO_TIMER_RUNNING"},409)}
    const runtime=await this.advanceNightRuntime(meta,action,source,targetIndex);
    // Manual GM navigation must resolve morning just like the automatic timer.
    const morning=action==="next"&&runtime.completed?await this.applyCycle(meta,"morning",night,"morning-"+night,source):null;
    if(!morning)await this.scheduleRoomAlarm(meta);
    return j({ok:true,night,runtime,morning,autoGM:meta.autoGM!==false})
  }
  async gmCycle(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,rawPhase=String(body?.phase||body?.period||"").trim().toLowerCase(),phase=rawPhase==="day"?"morning":rawPhase,night=Math.max(0,Number(body?.night??body?.nightIndex??body?.roundIndex??0)||0),cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??((phase&&night)?(phase+"-"+night):("cycle-"+Date.now()))).slice(0,160);
    return j(await this.applyCycle(meta,phase,night,cycleKey,String(body?.source||"gm").slice(0,40)))
  }
}
