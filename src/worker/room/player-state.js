// Trạng thái riêng của từng người chơi.
import { j } from "../http/responses.js";
import { assassinPromptBlocked, currentArtifactCycleKey } from "../support/game-keys.js";
import { normalizeDisplayName } from "../support/member-records.js";
import { normalizeRoomCode } from "../support/room-access.js";
import { buildPrivateDeliveryManifest } from "../../gmww-delivery-manifest.js";
import { currentPrivateDeliverySnapshot, privateDeliveryArtifact, privateDeliveryRoles } from "../../gmww-delivery-snapshot.js";
import { demoPlayerActions, playerOfferedActions } from "../../gmww-demo-runner.js";
import { drunkDeckView } from "../../gmww-drunk-draw-rules.js";
import { gallowsSnapshot } from "../../gmww-gallows-rules.js";
import { playerSafeInteraction } from "../../gmww-online-chat-policy.js";
import { isWolfRole } from "../../gmww-pack-night-rules.js";
import { normalizeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { privateArtifact, privateRole } from "../../gmww-private-card-contract.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { projectPublicTurnClock } from "../../gmww-public-turn-clock.js";
import { ghostCheck, peekPending } from "../../gmww-swap-info-rules.js";
import { thiefDeckView, thiefPool } from "../../gmww-thief-rules.js";
import { publicPlayer } from "../../gmww-village-player-state.js";
import { readNightAssignments, resolveWolfNight } from "../../gmww-wolf-night-resolution.js";
import { privateRoleGroupRecognition, privateWolfRecognition, wolfPackMembers } from "../../gmww-wolf-recognition.js";
import { effectiveAssignments } from "../../gmww-wolf-variant-rules.js";

export class RoomPlayerStateMethods {
  async playerState(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta?.phase||"lobby").toLowerCase(),key="member:"+loginId,member=body?.member&&typeof body.member==="object"?body.member:null;let players=(await this.ctx.storage.get("players"))||{},p=players[key];
    const evicted=(await this.ctx.storage.get("evictedMembers"))||[];
    const canRestore=!!member&&!evicted.includes(loginId)&&normalizeLoginId(member.loginId)===loginId&&normalizeRoomCode(member.currentRoomCode||"")===normalizeRoomCode(meta.code||"")&&!["deleted","closed","archived"].includes(phase);
    if(!p&&canRestore){const now=new Date().toISOString();p={participantId:key,kind:"member",loginId,displayName:normalizeDisplayName(member.displayName||loginId),avatarId:String(member.avatarId||""),gameCharacterId:normalizeGameCharacterId(member.gameCharacterId)||null,seatId:null,ready:false,joinedAt:now,lastSeenAt:now,lastHeartbeatAt:Date.now(),restoredAt:now};players[key]=p;await this.ctx.storage.put("players",players);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),resumed:loginId})}
    if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn chưa ở trong phòng này."},403);
    p.lastSeenAt=new Date().toISOString();p.lastHeartbeatAt=Date.now();if(member){p.displayName=normalizeDisplayName(member.displayName||p.displayName||loginId);p.avatarId=String(member.avatarId||p.avatarId||"");p.gameCharacterId=normalizeGameCharacterId(member.gameCharacterId)||normalizeGameCharacterId(p.gameCharacterId)||null}players[key]=p;await this.ctx.storage.put("players",players);
    const legacyRole=await this.ctx.storage.get("role:"+loginId),storedRoles=await this.ctx.storage.get("roles:"+loginId),legacyRows=Array.isArray(storedRoles)&&storedRoles.length?storedRoles:(legacyRole?[legacyRole]:[]),activeSnapshot=currentPrivateDeliverySnapshot(await this.ctx.storage.get("deliverySnapshot:"+loginId),meta),roleRows=privateDeliveryRoles(activeSnapshot,legacyRows),roles=roleRows.map(privateRole),role=roles[0]||null,cardBackImage=(await this.ctx.storage.get("cardBackImage"))||null,rows=(await this.ctx.storage.get("interactions"))||[],sameMatch=x=>(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId)),interactions=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&x?.status==="pending"&&sameMatch(x)&&
      (x.type!=="assassin_mark"||(String(meta?.cyclePhase||"")==="morning"&&Number(x.night)===Number(meta.cycleNight)&&
       !assassinPromptBlocked(rows,loginId,meta.matchId,x.night))))
      .slice(-10).map(playerSafeInteraction),effectTypes=new Set(["frozen","expelled","dead","assassin_mark"]),effectRows=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&sameMatch(x)&&
      (x.type!=="assassin_mark"||String(meta?.cyclePhase||"")==="morning")&&
      (!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())),latest={};for(const x of effectRows)latest[x.type]=x;const effects=Object.values(latest).map(playerSafeInteraction);
    const storedArtifact=await this.ctx.storage.get("artifact:"+loginId),
      // A role assignment also contains the committed artifact. Use it if the
      // legacy standalone Artifact key is absent; do not hide an assigned card.
      attachedArtifact=roleRows.find(r=>r?.artifact&&(!meta.matchId||String(r.matchId||"")===String(meta.matchId)))?.artifact||null,
      currentArtifact=activeSnapshot?privateDeliveryArtifact(activeSnapshot,storedArtifact):(storedArtifact?.removedFromMatch===true?null:storedArtifact&&(!meta.matchId||String(storedArtifact.matchId||"")===String(meta.matchId))?storedArtifact:attachedArtifact),
      artifact=currentArtifact?privateArtifact(currentArtifact):null,artifactCycleKey=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKey))||{accepted:[]};
    const deliveryManifest=buildPrivateDeliveryManifest({roomCode:meta.code,loginId,matchId:meta.matchId,matchRevision:meta.matchRevision,deliveryVersion:meta.deliveryVersion,publishedAt:meta.roleDeliveredAt,assignments:(await this.ctx.storage.get("assignments"))||[],roles:roleRows,artifact:currentArtifact});
    const deliveryAck=(await this.ctx.storage.get("deliveryAck:"+loginId))||null;
    deliveryManifest.receivedAt=deliveryAck?.deliveryId===deliveryManifest.deliveryId?deliveryAck.receivedAt:null;
    const swapRequests=((await this.ctx.storage.get('seatSwaps'))||[]).filter(x=>x.toId===key&&x.status==='pending'&&x.expiresAt>Date.now()).map(x=>({id:x.id,fromName:x.fromName,fromSeat:x.fromSeat,toSeat:x.toSeat,expiresAt:x.expiresAt}));
    // WOLF-01: this authenticated /me response is the ONLY delivery path for
    // pack role labels. Never copy names or faction into public room or websocket.
    const wolfRuntime=String(meta.cyclePhase)==="night"&&Number(meta.cycleNight)>0?
      await this.getNightRuntime(meta,Number(meta.cycleNight),false):null;
    const privateAssignments=(await this.ctx.storage.get("assignments"))||[];
    const wolfRecognition=privateWolfRecognition(meta,wolfRuntime,loginId,
      wolfPackMembers(privateAssignments,rows,meta.matchId))||
      privateRoleGroupRecognition(meta,wolfRuntime,loginId,privateAssignments,rows);
    const turn=wolfRuntime?.queue?.[wolfRuntime.cursor];
    // Mirror the GM's current schedule without sending actor IDs, targets,
    // permissions, or private role assignments to other players.
    const publicTimeline=String(meta.phase)==="running"?
      String(meta.cyclePhase)==="night"&&wolfRuntime?
        {phase:"night",activeIndex:Math.max(0,Number(wolfRuntime.cursor)||0),
          clock:projectPublicTurnClock(wolfRuntime),
          steps:(wolfRuntime.queue||[]).slice(0,150).map((step,index)=>({
            label:String(step?.label||"Lượt Vai Trò").slice(0,110),
            status:index<Number(wolfRuntime.cursor)?"done":index===Number(wolfRuntime.cursor)?"active":"upcoming"
          }))}:
        {phase:String(meta.cyclePhase||"morning"),activeIndex:0,
          // V3.304: Player top menu in daytime shows only the wake-up step (village notice and gallows boxes removed).
          steps:[{label:"Làng ơi dậy đi",status:"active"}]}
      :null;
    // Public role call only. Never reveal the actor, role owner or hidden target.
    const audioCue=await this.announcementWithAudio(meta,wolfRuntime);
    const drawn=Number(meta.cycleNight)===3&&String(meta.cyclePhase)==='night'?
      await this.ctx.storage.get('drunkDeck:'+String(meta.matchId)+':3:'+loginId):null;
    const drunkDraw=drawn&&(drawn.selectedId||
      turn?.roleId==='role_drunk'&&(turn.loginIds||[]).map(normalizeLoginId).includes(loginId))?
      drunkDeckView(drawn,false):null;
    let peekAlert=null,ghostPrompt=null;
    if(String(meta.cyclePhase)==='night'&&meta.demo!==true){
      const ia=await this.ctx.storage.get('interactions')||[],mid=String(meta.matchId||''),nn=Number(meta.cycleNight||0);
      const eff=effectiveAssignments({assignments:await readNightAssignments(this.ctx.storage,mid),interactions:ia,matchId:mid,night:nn});
      const me=eff.find(a=>normalizeLoginId(a.loginId)===loginId);
      if(me&&isWolfRole(me)&&me.packExcluded!==true&&!ia.some(x=>String(x?.matchId||'')===mid&&x.type==='dead'&&x.effectActive!==false&&normalizeLoginId(x.loginId)===loginId)&&
        peekPending({assignments:eff,interactions:ia,matchId:mid,night:nn}).length)peekAlert={night:nn,matchId:mid};
    }
    if(String(meta.cyclePhase)==='morning'&&meta.demo!==true){
      const ia=await this.ctx.storage.get('interactions')||[],as=await this.ctx.storage.get('assignments')||[];
      const chk=ghostCheck({word:'x',actorId:loginId,assignments:as,players:{},interactions:ia,matchId:String(meta.matchId||''),day:Number(meta.cycleNight||0)});
      if(chk.ok)ghostPrompt={day:Number(meta.cycleNight||0),matchId:String(meta.matchId||'')};
    }
    let thiefDraw=null;
    if(String(meta.cyclePhase)==='night'&&Number(meta.cycleNight)>=3&&turn?.roleId==='role_thief'&&(turn.loginIds||[]).map(normalizeLoginId).includes(loginId)){
      const choice=await this.ctx.storage.get('thiefChoice:'+String(meta.matchId)+':'+loginId);
      thiefDraw=thiefDeckView(thiefPool([...(await this.ctx.storage.list({prefix:'roleCatalog:'})).values()]),choice,{matchId:meta.matchId,night:Number(meta.cycleNight)});
    }
    const demoActions=meta.demo===true?await demoPlayerActions(this,meta,loginId):[];
    const onlineActions=meta.demo!==true&&String(meta.roomMode||"").toLowerCase()==="online"?await playerOfferedActions(this,meta,loginId):[];
    // GM battleMarkPlayers uses this same resolver to illuminate the confirmed
    // Wolf-bite target at the Witch turn. Deliver it privately ONLY to the
    // authenticated Witch actor in this active turn, never over public WS.
    const witchActor=meta.demo!==true&&String(meta.roomMode||"").toLowerCase()==="online"&&
      String(meta.cyclePhase||"")==="night"&&turn&&!wolfRuntime?.completed&&
      privateAssignments.some(a=>normalizeLoginId(a.loginId)===loginId&&a.roleId==="role_witch")&&
      ((turn.roleId==="role_witch"&&(turn.loginIds||[]).map(normalizeLoginId).includes(loginId))||
       (turn.roles||[]).some(r=>r.roleId==="role_witch"&&(r.loginIds||[]).map(normalizeLoginId).includes(loginId)));
    // Once the Witch has spent her save potion this match she is never shown a bite again.
    const witchSaveUsed=witchActor?(await this.ctx.storage.get("battleRoleUsage:"+String(meta.matchId||""))||[]).some(x=>String(x?.matchId||"")===String(meta.matchId||"")&&x?.actionId==="action_witch_save"&&x?.undone!==true):false;
    const witchNightIntel=witchActor&&!witchSaveUsed?resolveWolfNight({
      interactions:rows,players,assignments:await readNightAssignments(this.ctx.storage,meta.matchId),
      matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0)}):null;
    const witchBite=witchActor&&witchNightIntel?.ok?{
      targetIds:witchNightIntel.packDisabled?[]:(witchNightIntel.attacked||[]).map(x=>normalizeLoginId(x.to)).filter(Boolean),
      packDisabled:!!witchNightIntel.packDisabled
    }:null;
    return j({ok:true,thiefDraw,peekAlert,ghostPrompt,swapRequests,room:publicRoom(meta),player:publicPlayer(p),role,roles,wolfRecognition,audioCue,publicTimeline,drunkDraw,demoActions,onlineActions,witchBite,artifact,artifactExpected:deliveryManifest.artifactExpected,deliveryManifest,gallows:String(meta.cyclePhase)==="morning"?gallowsSnapshot((await this.gallowsState(meta)).ballot,meta):null,artifactCycle:{cycleKey:artifactCycleKey,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:Math.max(0,Math.min(30,Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)))},multiAssign:!!meta.multiAssign,cardBackImage,interactions,effects,resumed:!!p.restoredAt})
  }
}
