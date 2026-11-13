// Vòng đời phòng: đổi tên, reset, kết thúc, báo thức, xoá.
import { ROOM_IDLE_TTL } from "../config.js";
import { j } from "../http/responses.js";
import { normalizeWinnerFaction } from "../support/game-keys.js";
import { normalizeRoomName } from "../support/member-records.js";
import { runServerDemo, serverDemoActive, stopServerDemo } from "../../gmww-demo-runner.js";
import { pruneInteractions } from "../../gmww-interaction-retention.js";
import { buildMatchHistory } from "../../gmww-match-history.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { PLAYER_ROOM_CHECK_MS, nextEmptySince, playerRoomOccupied } from "../../gmww-player-room-policy.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { playerSetupComplete, publicPlayer } from "../../gmww-village-player-state.js";
import { readNightAssignments } from "../../gmww-wolf-night-resolution.js";

export class RoomLifecycleMethods {
  async gmRename(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,name=normalizeRoomName(body?.roomName);if(!name)return j({ok:false,error:"INVALID_ROOM_NAME",message:"Tên Phòng không hợp lệ."},400);meta.roomName=name;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);await this.scheduleRoomAlarm(meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta)})}
  async gmReset(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,roomWasEnabled=meta.enabled!==false,now=new Date().toISOString(),transactionId=String(body?.transactionId||"").trim().slice(0,160),currentVersion=Number(meta.resetVersion||0),hasExpected=body?.expectedResetVersion!==undefined&&body?.expectedResetVersion!==null,expected=Number(body?.expectedResetVersion||0);
    const softPostGame=body?.postGame===true&&body?.preserveParticipants===true;
    if(softPostGame&&hasExpected&&Number(expected)!==currentVersion&&meta.lastResetTransactionId!==transactionId)return j({ok:false,error:"RESET_VERSION_CONFLICT"},409);
    if(softPostGame&&transactionId&&meta.lastResetTransactionId===transactionId){const players=await this.ctx.storage.get("players")||{};return j({ok:true,reset:true,hardReset:false,idempotent:true,preserveParticipants:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer)})}
    if(softPostGame){
      await this.chatVoiceClear();
      const players=(await this.ctx.storage.get("players"))||{},nextVersion=currentVersion+1;
      for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.lastSeenAt=now}
      await this.ctx.storage.put("players",players);await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);
      // A new match must not inherit a previous DEMO owner's lease, clock or plan.
      for(const key of ["demoLease","demoClock","demoPlan"])await this.ctx.storage.delete(key);
      for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","drunkDeck:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
      meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.enabled=roomWasEnabled;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastEndedMatchId=null;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.currentNightTurnId=null;meta.dayDeadlineAt=null;meta.lastResetTransactionId=transactionId||("postgame-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
      await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+(meta&&meta.playerRoom===true?PLAYER_ROOM_CHECK_MS:ROOM_IDLE_TTL))}catch(_){}
      const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer),ack={ok:true,reset:true,hardReset:false,preserveParticipants:true,transactionId:meta.lastResetTransactionId,resetVersion:nextVersion,phase:room.phase,locked:room.locked,playersCount:publicPlayers.length,assignmentsCount:0,room,players:publicPlayers,removedPlayers:[]};
      this.broadcast({type:"room_reset",room,players:publicPlayers,resetVersion:nextVersion,transactionId:ack.transactionId,preserveParticipants:true});
      this.broadcast({type:"room_state",room,players:publicPlayers});
      return j(ack)
    }
    if(transactionId&&meta.lastResetTransactionId===transactionId){
      const players=(await this.ctx.storage.get("players"))||{},assignments=(await this.ctx.storage.get("assignments"))||[],room=publicRoom(meta);
      return j({ok:true,reset:true,hardReset:true,idempotent:true,transactionId,resetVersion:Number(meta.resetVersion||0),phase:room.phase,locked:room.locked,playersCount:Object.keys(players).length,assignmentsCount:assignments.length,room,players:Object.values(players).map(publicPlayer),removedPlayers:[]})
    }
    if(hasExpected&&Number.isFinite(expected)&&expected!==currentVersion){
      return j({ok:false,error:"RESET_VERSION_CONFLICT",message:"Phòng đã thay đổi trước khi RESET. Hãy cập nhật Phòng rồi thử lại.",expectedResetVersion:expected,currentResetVersion:currentVersion,room:publicRoom(meta)},409)
    }
    await this.chatVoiceClear();
    const oldPlayers=(await this.ctx.storage.get("players"))||{},removedPlayers=Object.values(oldPlayers).map(publicPlayer),nextVersion=currentVersion+1;
    await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);await this.ctx.storage.put("seatSwaps",[]);
    await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");
    // Releasing the room also stops any autonomous DEMO from the previous match.
    for(const key of ["demoLease","demoClock","demoPlan"])await this.ctx.storage.delete(key);
    for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","drunkDeck:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
    meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.seatsLocked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.cycleStartedAt=null;meta.currentNightTurnId=null;meta.autoPausedRemainingMs=null;meta.enabled=roomWasEnabled;meta.gameName="";meta.playerCount=0;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastResetTransactionId=transactionId||("reset-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
    await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+(meta&&meta.playerRoom===true?PLAYER_ROOM_CHECK_MS:ROOM_IDLE_TTL))}catch(_){}
    const room=publicRoom(meta),ack={ok:true,reset:true,hardReset:true,forcedEnd:body?.forceEnd===true,transactionId:meta.lastResetTransactionId,resetVersion:nextVersion,phase:room.phase,locked:room.locked,playersCount:0,assignmentsCount:0,room,players:[],removedPlayers};
    this.broadcast({type:"room_hard_reset",room,players:[],forcedEnd:ack.forcedEnd,resetVersion:nextVersion,transactionId:ack.transactionId});
    for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_HARD_RESET")}catch{}
    return j(ack)
  }
  async gmEnd(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,incomingMatchId=String(body?.matchId||""),now=new Date().toISOString();if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)return j({ok:false,error:"MATCH_MISMATCH",message:"Không thể kết thúc vì đây không phải ván đang chạy trong Phòng."},409);const completionKey="matchCompletion:"+String(incomingMatchId||meta.matchId||""),completed=await this.ctx.storage.get(completionKey);
    if(completed){await this.chatVoiceClear();for(const key of (await this.ctx.storage.list({prefix:"drunkDeck:"+String(incomingMatchId||meta.matchId||"")+":"})).keys())await this.ctx.storage.delete(key);const requested=normalizeWinnerFaction(body?.winnerFaction||body?.winner||body?.result?.winnerFaction||"");if(requested&&requested!==completed.winnerFaction)return j({ok:false,error:"WINNER_ALREADY_CONFIRMED"},409);return j({...completed,idempotent:true})}
    const endNight=Number(meta.cycleNight||0);if(incomingMatchId)meta.matchId=incomingMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);const winnerFaction=normalizeWinnerFaction(body?.winnerFaction||body?.winner||body?.result?.winnerFaction||body?.result?.winner||""),winnerLabel=String(body?.winner||body?.winnerLabel||body?.result?.winner||winnerFaction||"").slice(0,180),endedMatchId=String(meta.matchId||"");meta.endedAt=now;meta.lastEndedMatchId=endedMatchId||null;meta.winnerFaction=winnerFaction||null;meta.winnerLabel=winnerLabel||null;meta.resultVersion=Number(meta.resultVersion||0)+1;meta.reopenAt=now;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);await this.chatVoiceClear();try{await this.ctx.storage.setAlarm(Date.now()+(meta&&meta.playerRoom===true?PLAYER_ROOM_CHECK_MS:ROOM_IDLE_TTL))}catch(_){};for(const key of (await this.ctx.storage.list({prefix:"drunkDeck:"+endedMatchId+":"})).keys())await this.ctx.storage.delete(key);const players=(await this.ctx.storage.get("players"))||{};for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.reservedByGM=true}await this.ctx.storage.put("players",players);const rows=(await this.ctx.storage.get("interactions"))||[];for(const x of rows){if(x?.effectActive!==false&&(!x?.matchId||!endedMatchId||String(x.matchId)===endedMatchId))x.effectActive=false}await this.ctx.storage.put("interactions",pruneInteractions(rows));let matchHistory=null;try{matchHistory=buildMatchHistory({matchId:endedMatchId,roomCode:meta.code||meta.roomCode||"",roomName:meta.roomName||"",gameName:meta.gameName||"",endedAt:now,winnerFaction,winnerLabel,endNight,players,assignments:await readNightAssignments(this.ctx.storage,endedMatchId),interactions:rows})}catch(e){console.warn("GMWW_MATCH_HISTORY",e)}const room=publicRoom(meta),memberResults=[];for(const p of Object.values(players)){if(!p?.loginId)continue;const lid=normalizeLoginId(p.loginId),stored=await this.ctx.storage.get("roles:"+lid),legacy=await this.ctx.storage.get("role:"+lid),rrs=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]),factions=rrs.map(rr=>rr?.roleCard?.faction??rr?.faction??""),result=winnerFaction&&factions.some(f=>normalizeWinnerFaction(f)===winnerFaction)?"win":"loss";memberResults.push({loginId:p.loginId,roleName:rrs.map(rr=>rr?.roleName||rr?.roleCard?.name||"").filter(Boolean).join(" + "),faction:factions.filter(Boolean).join(" + "),result})}this.broadcast({type:"game_result",matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,room,history:matchHistory?{summary:matchHistory.summary}:null});this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),waitingRoom:true});const ack={ok:true,room,matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,memberResults,matchHistory,waitingRoom:true,ready:true};if(endedMatchId)await this.ctx.storage.put(completionKey,ack);return j(ack)}
  async alarm(){return this.ctx.blockConcurrencyWhile(()=>this.roomAlarm())}
  async roomAlarm(){
    try{
      let meta=await this.ctx.storage.get("meta");
      if(!meta){
        const limiter=await this.ctx.storage.get("security-rate");
        if(limiter){
          const expiresAt=Number(limiter.startedAt||0)+Number(limiter.windowMs||60000);
          if(Date.now()>=expiresAt)await this.ctx.storage.delete("security-rate");
          else await this.ctx.storage.setAlarm(expiresAt+1000);
        }
        return;
      }
      if(String(meta.phase||"").toLowerCase()==="deleted")return;
      if(meta.reopenAt){meta.reopenAt=null;await this.ctx.storage.put("meta",meta)}
      meta=await this.syncPlayerRoomEmpty(meta);const playerExpired=meta.playerRoom===true&&this.roomExpiryDue(meta)<=Date.now();
      if(serverDemoActive(meta,await this.ctx.storage.get("demoLease"))){
        const events=[];this.demoBroadcastBuffer=events;
        try{await this.ctx.storage.transaction(async()=>{events.length=0;await runServerDemo(this,await this.ctx.storage.get("meta"))})}
        finally{this.demoBroadcastBuffer=null}
        for(const event of events)this.broadcast(event);
        return;
      }
      if(!playerExpired){
        if(typeof this.dayCountdownCue==="function"&&await this.dayCountdownCue(meta)){await this.scheduleRoomAlarm(meta);return}
        if(await this.runAutoAdvanceIfDue(meta))return;
      }
      meta=await this.ctx.storage.get("meta");const due=this.roomExpiryDue(meta);
      if(Date.now()<due){await this.scheduleRoomAlarm(meta);return}
      await this.wipeRoom(meta,"ROOM_EXPIRED");
    }catch(e){
      console.error("GMWW_ROOM_ALARM",e);
      const meta=await this.ctx.storage.get("meta"),lease=await this.ctx.storage.get("demoLease");
      if(serverDemoActive(meta,lease)){
        lease.failures=Number(lease.failures||0)+1;lease.error="Server đang thử lại: "+String(e?.message||e);
        if(lease.failures>=3)await stopServerDemo(this,meta,lease,"error","Demo tạm dừng sau lỗi server: "+String(e?.message||e));
        else await this.ctx.storage.put("demoLease",lease);
        await this.ctx.storage.setAlarm(Date.now()+(lease.failures>=3?ROOM_IDLE_TTL:1000));
      }else try{await this.ctx.storage.setAlarm(Date.now()+60*1000)}catch(_){}
    }
  }
  // Player rooms only: track whether anybody is present; the empty clock lives in meta.emptySince.
  async syncPlayerRoomEmpty(meta){
    if(!meta||meta.playerRoom!==true)return meta;
    const next=nextEmptySince(meta,playerRoomOccupied(await this.ctx.storage.get("players"),Date.now()),Date.now());
    if(next!==(meta.emptySince||null)){if(next===null)delete meta.emptySince;else meta.emptySince=next;await this.ctx.storage.put("meta",meta)}
    return meta
  }
  async gmDelete(request){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{};meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=new Date().toISOString();meta.updatedAt=meta.deletedAt;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}this.broadcast({type:"room_deleted",room:publicRoom(meta)});for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_DELETED")}catch{}return j({ok:true,deleted:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer)})}
}
