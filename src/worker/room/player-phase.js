// Hành động theo pha của người chơi: demo, hành động, hoàn tác, bỏ phiếu treo cổ.
import { j } from "../http/responses.js";
import { demoPlayerActions, playerOfferedActions } from "../../gmww-demo-runner.js";
import { gallowsBlockedNomination, gallowsBlockedVotes, gallowsCast, gallowsMode, gallowsNominate, gallowsSnapshot } from "../../gmww-gallows-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { publicRoom } from "../../gmww-public-room-contract.js";

export class RoomPlayerPhaseMethods {
  // Member session is verified at the public route; loginId cannot be forged by Player Web.
  // The SAME GM action handlers enforce target legality, role limits, use ledger and receipts.
  async playerDemoAction(body){return this.playerPhaseAction(body,false)}
  async playerPhaseAction(body,online=false){
    const meta=await this.ctx.storage.get("meta"),loginId=normalizeLoginId(body?.loginId);
    if(online?(meta?.demo===true||meta?.phase!=="running"||String(meta?.roomMode||"").toLowerCase()!=="online"):(meta?.demo!==true||meta?.phase!=="running"))
      return j({ok:false,error:online?"ONLINE_ACTION_NOT_RUNNING":"DEMO_ACTION_NOT_RUNNING"},409);
    const players=await this.ctx.storage.get("players")||{};
    if(!loginId||!players["member:"+loginId]||(!online&&players["member:"+loginId]?.humanControlled!==true))
      return j({ok:false,error:online?"ONLINE_PLAYER_NOT_JOINED":"DEMO_PLAYER_NOT_JOINED"},403);
    if(String(body?.matchId||"")!==String(meta.matchId||"")||
      String(body?.cycleKey||"")!==String(meta.cycleKey||""))
      return j({ok:false,error:"DEMO_ACTION_STALE"},409);
    // Private action offers remain visible while Frozen/Expelled, but execution is blocked on Server.
    if(online){
      const effects=await this.ctx.storage.get('interactions')||[];
      const blocked=effects.some(x=>normalizeLoginId(x?.loginId)===loginId&&x?.effectActive!==false&&
        (!x?.matchId||String(x.matchId)===String(meta.matchId))&&
        (!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())&&
        (x.type==='dead'||x.type==='expelled'||(x.type==='frozen'&&meta.cyclePhase==='night')));
      if(blocked)return j({ok:false,error:'ACTOR_CANNOT_ACT',message:'Đã thấy hành động, nhưng bạn đang chịu hiệu ứng và không được thực hiện lượt này.'},409);
    }
    const actions=online?await playerOfferedActions(this,meta,loginId):await demoPlayerActions(this,meta,loginId),
      action=actions.find(a=>a.key===String(body?.actionKey||""));
    if(!action)return j({ok:false,error:"DEMO_ACTION_ALREADY_USED_OR_NOT_YOUR_TURN"},409);
    const targets=Array.isArray(body?.targetIds)?body.targetIds.map(normalizeLoginId):[];
    if(targets.length!==action.targetCount||new Set(targets).size!==targets.length||
      targets.some(id=>!id||!players["member:"+id]||(action.noSelf&&id===loginId)))
      return j({ok:false,error:"DEMO_TARGET_INVALID"},400);
    const request=this.demoInternalRequest(),token=(online?"human-online-":"human-demo-")+crypto.randomUUID();
    let response;
    if(meta.cyclePhase==="morning"){
      response=await this.gmDayAction(request,{matchId:meta.matchId,cycleKey:meta.cycleKey,
        actorId:loginId,roleId:action.roleId,artifactId:action.artifactId,
        actionId:action.actionId,targetIds:targets,clientEventId:token});
    }else if(meta.cyclePhase==="night"){
      const runtime=await this.getNightRuntime(meta,meta.cycleNight,false),
        turn=runtime?.queue?.[runtime.cursor];
      if(!turn||runtime.completed)return j({ok:false,error:"DEMO_TURN_ENDED"},409);
      const seer=!action.artifactId&&['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(action.actionId),
        transfer=!action.artifactId&&action.actionId==="action_transfer_bite",
        assassin=action.actionId==="action_assassin_mark",
        direction=String(body?.direction||""),choice=String(body?.assassinChoice||"");
      if(transfer&&!["left","none","right"].includes(direction))return j({ok:false,error:"DEMO_DIRECTION_REQUIRED"},400);
      const fire=!action.artifactId&&action.actionId==="action-fire-wolf-bite";
      if(fire&&!["left","right"].includes(direction))return j({ok:false,error:"DEMO_DIRECTION_REQUIRED"},400);
      if(assassin&&!["👍","👎"].includes(choice))return j({ok:false,error:"DEMO_ASSASSIN_CHOICE_REQUIRED"},400);
      response=await this.gmBattleAction(request,{matchId:meta.matchId,cycleKey:meta.cycleKey,
        turnId:turn.id,night:meta.cycleNight,actorId:loginId,artifactId:action.artifactId,
        actionId:action.actionId,type:action.type,effectId:"",effectName:action.name,
        targetIds:seer||transfer||action.noTarget?[loginId]:targets,
        ...(seer?{revealTargetIds:targets}:{}),...(transfer||fire?{direction}:{}),
        ...(assassin?{assassinChoice:choice}:{}),clientEventId:token,source:online?"online-human":"demo-human"});
    }else return j({ok:false,error:"DEMO_PHASE_INVALID"},409);
    if(!response.ok)return response;
    const result=await response.json();
    // Never forward the GM undo ledger, wolf pack internals or private assignments.
    return j({ok:true,actionId:action.actionId,actorId:loginId,
      ...(result.revelation?{revelation:result.revelation}:{}),
      ...(meta.cyclePhase==="morning"&&result.result?{result:result.result}: {})});
  }
  // Authenticated member may undo ONLY their latest Online night action.
  // The existing GM snapshot guard refuses all intervening changes.
  async playerPhaseUndo(body){
    const meta=await this.ctx.storage.get("meta"),actorId=normalizeLoginId(body?.loginId);
    if(!actorId||meta?.phase!=="running"||meta?.demo===true||
      String(meta?.roomMode||"").toLowerCase()!=="online"||meta?.cyclePhase!=="night"||
      String(body?.matchId||"")!==String(meta.matchId||"")||
      String(body?.cycleKey||"")!==String(meta.cycleKey||""))
      return j({ok:false,error:"ONLINE_UNDO_STALE"},409);
    const players=await this.ctx.storage.get("players")||{};
    if(!players["member:"+actorId])return j({ok:false,error:"ONLINE_PLAYER_NOT_JOINED"},403);
    const record=await this.ctx.storage.get("battleLastAction:"+String(meta.matchId||""));
    if(!record||record.undone||normalizeLoginId(record.actorId)!==actorId||
      record.source!=="online-human")
      return j({ok:false,error:"ONLINE_UNDO_NOT_OWNER",message:"Chỉ khôi phục được hành động gần nhất của chính bạn."},409);
    const result=await this.gmBattleUndo(this.demoInternalRequest(),{undoToken:record.token});
    if(!result.ok)return result;
    return j({ok:true,undone:true});
  }
  async playerGallows(body,authorizedDemo=false){
    const meta=await this.ctx.storage.get("meta"),loginId=normalizeLoginId(body?.loginId);
    if(meta?.demo===true&&!authorizedDemo){
      const actor=(await this.ctx.storage.get("players")||{})["member:"+loginId];
      if(actor?.humanControlled!==true)return j({ok:false,error:"DEMO_PLAYER_NOT_JOINED"},403);
    }
    if(!meta||String(meta.phase)!=="running"||String(meta.cyclePhase)!=="morning")
      return j({ok:false,error:"GALLOWS_DAY_ONLY"},409);
    const {key,ballot,eligible}=await this.gallowsState(meta);
    if(!loginId||(!eligible.includes(loginId)&&!(String(body?.command||"")==="vote"&&(ballot.deadVoters||[]).includes(loginId))))return j({ok:false,error:"VOTER_NOT_ELIGIBLE"},403);
    if(gallowsMode(ballot)==="gm")return j({ok:false,error:"GM_MANUAL_MODE"},403);
    const command=String(body?.command||""),now=Date.now();
    let result;
    if(command==="nominate"){
      const target=normalizeLoginId(body?.targetId);
      if(!eligible.includes(target))return j({ok:false,error:"INVALID_GALLOWS_CANDIDATE"},400);
      if(gallowsBlockedNomination(ballot).includes(loginId))return j({ok:false,error:"NOMINATION_BANNED"},403);
      result=gallowsNominate(ballot,loginId,target,now);
    }else if(command==="vote"){
      if(gallowsBlockedVotes(ballot).includes(loginId))return j({ok:false,error:"VOTER_BANNED"},403);
      result=gallowsCast(ballot,loginId,String(body?.choice||""),now);
    }
    else return j({ok:false,error:"INVALID_GALLOWS_COMMAND"},400);
    if(!result.ok)return j({ok:false,error:result.error},409);
    await this.ctx.storage.put(key,result.value);
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    const publicBallot=gallowsSnapshot(meta.demo?await this.ctx.storage.get(key):result.value,meta,now);
    this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:publicBallot,serverTime:now});
    return j({ok:true,gallows:publicBallot,serverTime:now});
  }
}
