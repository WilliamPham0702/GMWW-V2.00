// Điều khiển phòng của GM: bật/khoá, đuổi, người tham gia, giai đoạn, cài đặt phòng, chỗ ngồi.
import { LOGIN_RE } from "../config.js";
import { GM_OBSERVER_LOGIN_ID } from "../http/gm-observer-api.js";
import { j } from "../http/responses.js";
import { normalizeDisplayName } from "../support/member-records.js";
import { secureShuffle } from "../support/room-access.js";
import { villageLayout } from "../support/village-layout.js";
import { normalizeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { publicRoom, roomUiStage } from "../../gmww-public-room-contract.js";
import { normalizeRoomMode, normalizeSeatCount, normalizeSeatMoveMode, roomModeSwitchBlocked } from "../../gmww-room-config-rules.js";
import { seatClaimConflict } from "../../gmww-seat-movement-rules.js";
import { clearPlayerMovement, enforceUniqueSeatClaims, normalizeSeatId, normalizeSeatLayout, publicPlayer } from "../../gmww-village-player-state.js";

export class RoomGmRoomControlMethods {
  async gmEnabled(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,enabled=body?.enabled!==false,now=new Date().toISOString();
    meta.enabled=enabled;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    const players=(await this.ctx.storage.get("players"))||{},publicPlayers=Object.values(players).map(publicPlayer),room=publicRoom(meta);
    if(!enabled){
      // Evict all existing occupants (including disconnected clients), not only new join attempts.
      // The response retains their identities so the public wrapper can reset member presence.
      this.broadcast({type:"room_disabled",room,players:publicPlayers,serverTime:Date.now()});
      for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_DISABLED")}catch{}
      await this.ctx.storage.put("players",{});
    }else{
      this.broadcast({type:"room_state",room,players:publicPlayers,serverTime:Date.now()});
    }
    return j({ok:true,room,enabled,players:publicPlayers})
  }
  async gmLock(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;meta.locked=false;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);await this.scheduleRoomAlarm(meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,ignored:body?.locked===true,reason:body?.locked===true?"ROOM_LOCK_DISABLED":null,room:publicRoom(meta)})}
  async gmKick(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},requested=String(body?.participantId||""),loginId=normalizeLoginId(body?.loginId),id=requested||(loginId?("member:"+loginId):"");
    const p=players[id];if(!id||!p)return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Không tìm thấy Người Chơi trong Phòng."},404);
    delete players[id];await this.ctx.storage.put("players",players);
    if(p?.loginId){
      const evicted=(await this.ctx.storage.get("evictedMembers"))||[];
      await this.ctx.storage.put("evictedMembers",[...new Set([...evicted,normalizeLoginId(p.loginId)])].slice(-100));const lid=normalizeLoginId(p.loginId);await this.ctx.storage.delete("role:"+lid);await this.ctx.storage.delete("roles:"+lid);await this.ctx.storage.delete("artifact:"+lid);const rows=(await this.ctx.storage.get("assignments"))||[],next=rows.filter(a=>normalizeLoginId(a?.loginId)!==lid);if(next.length!==rows.length)await this.ctx.storage.put("assignments",next)}
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    for(const ws of this.ctx.getWebSockets())try{if(ws.deserializeAttachment()?.participantId===id){ws.send(JSON.stringify({type:"player_kicked",participantId:id,reason:"GM_KICK"}));ws.close(1000,"PLAYER_KICKED")}}catch{}
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});
    return j({ok:true,kicked:true,player:publicPlayer(p),room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});
  }
  async gmParticipants(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"ROSTER_LOCKED_IN_MATCH",message:"Không đổi danh sách Thành Viên khi ván đang chạy."},409);
    const incoming=Array.isArray(body?.members)?body.members:[],replace=body?.replace!==false,now=new Date().toISOString(),players=(await this.ctx.storage.get("players"))||{},wanted=new Map();
    for(const raw of incoming.slice(0,100)){
      const loginId=normalizeLoginId(raw?.loginId);if(!LOGIN_RE.test(loginId)||loginId===GM_OBSERVER_LOGIN_ID)continue;
      wanted.set(loginId,{loginId,displayName:normalizeDisplayName(raw?.displayName||loginId).slice(0,24),avatarId:String(raw?.avatarId||"").slice(0,160),gameCharacterId:normalizeGameCharacterId(raw?.gameCharacterId),seatId:normalizeSeatId(raw?.seatId,meta.seatCount)});
    }
    const removedPlayers=[],disbandAll=replace&&incoming.length===0;
    if(replace){
      for(const [id,p] of Object.entries(players)){
        // Disband removes all participants, including guests, offline and unseated.
        if(!disbandAll&&p?.kind!=="member")continue;
        const lid=normalizeLoginId(p?.loginId);
        if(disbandAll||!wanted.has(lid)){removedPlayers.push(publicPlayer(p));delete players[id]}
      }
    }
    const evicted=new Set((await this.ctx.storage.get("evictedMembers"))||[]);
    const previousDisband=disbandAll?((await this.ctx.storage.get("pendingDisbandLogins"))||[]):[];
    const pendingDisband=new Set(previousDisband.map(normalizeLoginId).filter(Boolean));
    for(const p of removedPlayers)if(p?.loginId){
      const lid=normalizeLoginId(p.loginId);evicted.add(lid);
      if(disbandAll)pendingDisband.add(lid);
    }
    for(const loginId of wanted.keys()){evicted.delete(loginId);pendingDisband.delete(loginId)}
    if(disbandAll)await this.ctx.storage.put("pendingDisbandLogins",[...pendingDisband].slice(-100));
    await this.ctx.storage.put("evictedMembers",[...evicted].slice(-100));
    if(disbandAll){
      for(const p of removedPlayers)if(p?.loginId){
        const lid=normalizeLoginId(p.loginId);
        for(const prefix of ["role:","roles:","artifact:"])await this.ctx.storage.delete(prefix+lid);
      }
    }
    for(const m of wanted.values()){
      const id="member:"+m.loginId,old=players[id]||{};
      const merged={...old,...m};
      players[id]={...old,participantId:id,kind:"member",loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId||old.avatarId||"",gameCharacterId:m.gameCharacterId||old.gameCharacterId||null,seatId:m.seatId||old.seatId||null,ready:true,reservedByGM:true,joinedAt:old.joinedAt||now,lastSeenAt:old.lastSeenAt||null,lastHeartbeatAt:Number(old.lastHeartbeatAt||0)||null};
    }
    enforceUniqueSeatClaims(players,meta.seatCount);
    // During gathering, adapt the real room capacity to the actual party, never
    // discarding an assigned seat ID. Older rooms remain untouched until GM edits.
    if(replace&&wanted.size>0&&!meta.seatsLocked&&String(meta.gmStage||'')==='seats'){
      const highest=Math.max(0,...Object.values(players).map(p=>Number(p?.seatId||0)||0));
      const nextCount=Math.max(8,Math.min(30,Math.max(Object.keys(players).length,highest)));
      const nextShape=villageLayout.recommendedSeatShape(nextCount);
      if(nextCount!==Number(meta.seatCount)||nextShape!==normalizeSeatLayout(meta.seatLayout)){
        const points=villageLayout.positions(nextCount,nextShape,meta.seatOffset,meta.seatSpacing);
        for(const p of Object.values(players)){
          const seat=normalizeSeatId(p?.seatId,nextCount);
          if(!seat)continue;
          clearPlayerMovement(p);p.positionX=points[seat-1].x;p.positionY=points[seat-1].y;
        }
        meta.seatCount=nextCount;meta.seatLayout=nextShape;
      }
    }
    await this.ctx.storage.put("players",players);
    const selected=new Set(wanted.keys()),assignments=(await this.ctx.storage.get("assignments"))||[],nextAssignments=assignments.filter(a=>selected.has(normalizeLoginId(a?.loginId)));
    if(nextAssignments.length!==assignments.length)await this.ctx.storage.put("assignments",nextAssignments);
    meta.playerCount=wanted.size;meta.locked=false;meta.seatsLocked=false;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);await this.scheduleRoomAlarm(meta);
    const publicPlayers=Object.values(players).map(publicPlayer),room=publicRoom(meta);
    this.broadcast({type:"room_state",room,players:publicPlayers,rosterUpdated:true,disbandAll});
    if(disbandAll){
      this.broadcast({type:"room_disbanded",roomCode:meta.code,reason:"GM_DISBAND",removedCount:removedPlayers.length});
      const removedIds=new Set(removedPlayers.map(p=>String(p.participantId)));
      for(const ws of this.ctx.getWebSockets())try{
        if(removedIds.has(String(ws.deserializeAttachment()?.participantId||"")))ws.close(1000,"ROOM_DISBANDED");
      }catch{}
    }
    return j({ok:true,room,players:publicPlayers,selectedCount:wanted.size,removedPlayers,disbanded:disbandAll,removedCount:removedPlayers.length,reconcileLogins:disbandAll?[...pendingDisband]:[]})
  }
  async gmStage(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,requested=String(body?.step||"").toLowerCase();
    if(!["room","seats","game","roles","deal","battle"].includes(requested))return j({ok:false,error:"INVALID_GM_STAGE"},400);
    if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED"},409);
    const phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase)&&requested!=="battle")return j({ok:false,error:"STAGE_LOCKED_IN_MATCH"},409);
    if(["game","roles","deal","battle"].includes(requested)&&!meta.seatsLocked&&phase!=="role_delivery"&&phase!=="running")return j({ok:false,error:"SEATS_NOT_LOCKED"},409);
    if(roomUiStage(meta)===requested)return j({ok:true,room:publicRoom(meta),unchanged:true});
    meta.gmStage=requested;meta.gmStageRevision=Number(meta.gmStageRevision||0)+1;
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;
    await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),players=(await this.ctx.storage.get("players"))||{};
    this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),serverTime:Date.now(),stageChanged:true});
    return j({ok:true,room});
  }
  async gmRoomSettings(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"ROOM_SETTINGS_LOCKED",message:"Không đổi chế độ hoặc số ghế khi ván đang chạy."},409);
    // Room is created once; GM selects Online / Offline / Demo afterwards.
    // Only an EMPTY lobby can cross the demo isolation boundary.
    const previousDemo=meta.demo===true,desiredDemo=body&&Object.prototype.hasOwnProperty.call(body,"demo")?body.demo===true:previousDemo;
    const demoChanging=desiredDemo!==previousDemo;
    if(demoChanging){
      const assignments=await this.ctx.storage.get("assignments")||[];
      // Gathered/seated players may switch mode in the lobby; only a live match stays isolated.
      if(roomModeSwitchBlocked(meta,assignments)){
        return j({ok:false,error:"ROOM_MODE_REQUIRES_EMPTY_RESET",message:"Không đổi DEMO khi ván đang diễn ra hoặc đã Phân Vai. Kết thúc ván rồi đổi chế độ."},409);
      }
    }
    const roomMode=desiredDemo?"online":body&&Object.prototype.hasOwnProperty.call(body,"roomMode")?normalizeRoomMode(body.roomMode):normalizeRoomMode(meta.roomMode);
    const seatMoveMode=body&&Object.prototype.hasOwnProperty.call(body,"seatMoveMode")?normalizeSeatMoveMode(body.seatMoveMode):normalizeSeatMoveMode(meta.seatMoveMode);
    const requested=body&&Object.prototype.hasOwnProperty.call(body,"seatCount")?normalizeSeatCount(body.seatCount,meta.seatCount):normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12);
    const hasSeatLayout=!!body&&Object.prototype.hasOwnProperty.call(body,"seatLayout"),changedCount=requested!==normalizeSeatCount(meta.seatCount),seatLayout=hasSeatLayout?normalizeSeatLayout(body.seatLayout):changedCount?villageLayout.recommendedSeatShape(requested):normalizeSeatLayout(meta.seatLayout);
    const hasSeatOffset=!!body&&Object.prototype.hasOwnProperty.call(body,"seatOffset"),
      seatSpacing=villageLayout.normalizeSeatSpacing(body&&Object.prototype.hasOwnProperty.call(body,"seatSpacing")?body.seatSpacing:meta.seatSpacing),
      seatOffset=villageLayout.resolveSeatOffset(requested,seatLayout,hasSeatOffset?body.seatOffset:meta.seatOffset,seatSpacing);
    if(hasSeatOffset&&(!body.seatOffset||!Number.isFinite(Number(body.seatOffset.x))||!Number.isFinite(Number(body.seatOffset.y))))return j({ok:false,error:"INVALID_SEAT_OFFSET"},400);
    if(hasSeatLayout&&String(body.seatLayout||'')!==seatLayout)return j({ok:false,error:"INVALID_SEAT_LAYOUT"},400);
    const maxOccupied=Math.max(0,...Object.values(players).map(p=>Number(p?.seatId||0)||0));
    if(requested<maxOccupied)return j({ok:false,error:"SEAT_COUNT_BELOW_OCCUPIED",message:"Không thể giảm số ghế thấp hơn vị trí đang có người ngồi.",maxOccupied},409);
    if(seatLayout&&requested<Object.keys(players).length)return j({ok:false,error:"SEAT_TEMPLATE_TOO_SMALL",message:"Mẫu Seat ít hơn số người đã vào phòng."},409);
    if(meta.seatsLocked&&(requested!==Number(meta.seatCount)||seatLayout!==normalizeSeatLayout(meta.seatLayout)||JSON.stringify(seatOffset)!==JSON.stringify(villageLayout.normalizeSeatOffset(meta.seatOffset))||seatSpacing!==villageLayout.normalizeSeatSpacing(meta.seatSpacing)))return j({ok:false,error:"SEATS_LOCKED",message:"Mở khóa vị trí trước khi đổi Seat Mẫu."},409);
    const reflow=seatLayout!==normalizeSeatLayout(meta.seatLayout)||requested!==Number(meta.seatCount)||JSON.stringify(seatOffset)!==JSON.stringify(villageLayout.normalizeSeatOffset(meta.seatOffset))||seatSpacing!==villageLayout.normalizeSeatSpacing(meta.seatSpacing);
    if(seatMoveMode==="instant"&&normalizeSeatMoveMode(meta.seatMoveMode)==="walk")for(const p of Object.values(players))clearPlayerMovement(p);
    if(reflow){
      const locations=villageLayout.positions(requested,seatLayout,seatOffset,seatSpacing);
      for(const p of Object.values(players)){
        const seatId=normalizeSeatId(p?.seatId,requested);
        if(!seatId)continue;
        const point=locations[seatId-1];if(!point)continue;
        clearPlayerMovement(p);p.positionX=point.x;p.positionY=point.y;
      }
    }
    meta.roomMode=roomMode;meta.seatMoveMode=seatMoveMode;meta.seatCount=requested;meta.seatLayout=seatLayout;meta.seatOffset=seatOffset;meta.seatSpacing=seatSpacing;
    if(demoChanging){
      meta.demo=desiredDemo;meta.autoGM=desiredDemo?false:true;
      // Retain historical room data; only clear stale demonstration lease/timer.
      for(const key of ["demoLease","demoClock","demoPlan"])await this.ctx.storage.delete(key);
    }
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;
    await this.ctx.storage.put("players",players);await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers});
    return j({ok:true,room,players:publicPlayers})
  }
  async gmSeatLock(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"SEAT_LOCKED_IN_MATCH"},409);
    const seatedPlayers=(await this.ctx.storage.get("players"))||{};
    if(body?.locked!==false&&(!Object.keys(seatedPlayers).length||Object.values(seatedPlayers).some(p=>!normalizeSeatId(p.seatId,meta.seatCount)||p.movementStatus==='moving')))return j({ok:false,error:"SEATING_INCOMPLETE",message:"Mọi người cần vào vị trí trước khi khóa."},409);
    meta.seatsLocked=body?.locked!==false;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const players=(await this.ctx.storage.get("players"))||{},room=publicRoom(meta);this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),seatsLocked:meta.seatsLocked});
    return j({ok:true,room,seatsLocked:meta.seatsLocked})
  }
  async gmSeat(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();
    if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"SEAT_LOCKED_IN_MATCH",message:"Chỉ đổi ghế tại khu chuẩn bị vào trận."},409);
    const players=(await this.ctx.storage.get("players"))||{},loginId=normalizeLoginId(body?.loginId),participantId=String(body?.participantId||(loginId?("member:"+loginId):"")),player=players[participantId];
    if(!participantId||!player)return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Không tìm thấy Người Chơi trong Phòng."},404);
    const hasSeat=body&&Object.prototype.hasOwnProperty.call(body,"seatId"),seatId=hasSeat&&body.seatId!=null?normalizeSeatId(body.seatId,meta.seatCount):null;
    if(hasSeat&&body.seatId!=null&&!seatId)return j({ok:false,error:"INVALID_SEAT",message:"Ghế không tồn tại trong Phòng."},400);
    let displaced=null;
    if(seatId){const conflict=seatClaimConflict(players,participantId,seatId);if(conflict&&Number(conflict.player?.seatId||0)!==seatId)return j({ok:false,error:'SEAT_RESERVED',message:'Vị trí đang có người đi tới.'},409);
      const occupiedEntry=Object.entries(players).find(([id,p])=>id!==participantId&&Number(p?.seatId||0)===seatId);
      if(occupiedEntry){
        const [occupiedId,occupied]=occupiedEntry;
        if(body?.swap===true){const oldSeat=normalizeSeatId(player.seatId,meta.seatCount);occupied.seatId=oldSeat;occupied.ready=occupied.reservedByGM===true;clearPlayerMovement(occupied);players[occupiedId]=occupied;displaced=publicPlayer(occupied)}
        else if(body?.replace===true){occupied.seatId=null;occupied.ready=occupied.reservedByGM===true;clearPlayerMovement(occupied);players[occupiedId]=occupied;displaced=publicPlayer(occupied)}
        else return j({ok:false,error:"SEAT_TAKEN",message:"Ghế "+seatId+" đã có "+String(occupied.displayName||"người khác")+". Chọn đổi chỗ hoặc giải phóng ghế trước.",seatId,occupant:publicPlayer(occupied)},409);
      }
    }
    player.seatId=seatId;player.ready=player.reservedByGM===true;clearPlayerMovement(player);
    if(seatId&&normalizeSeatLayout(meta.seatLayout)){const point=villageLayout.positions(meta.seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[seatId-1];if(point){player.positionX=point.x;player.positionY=point.y}}
    if(displaced&&normalizeSeatLayout(meta.seatLayout)){const record=Object.values(players).find(p=>p.participantId===displaced.participantId);if(record?.seatId){const point=villageLayout.positions(meta.seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[record.seatId-1];if(point){record.positionX=point.x;record.positionY=point.y}}}
    players[participantId]=player;await this.ctx.storage.put("players",players);
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,seatUpdated:participantId});
    return j({ok:true,room,player:publicPlayer(player),displaced,players:publicPlayers})
  }
  async gmRandomizeRemainingSeats(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();
    if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"SEAT_LOCKED_IN_MATCH",message:"Chỉ phân ghế tại khu chuẩn bị vào trận."},409);
    const players=(await this.ctx.storage.get("players"))||{},entries=Object.entries(players),seatCount=normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12),used=new Set();
    for(const [,player] of entries){const seatId=normalizeSeatId(player?.seatId,seatCount);if(seatId)used.add(seatId);if(player?.moveTargetSeatId)used.add(Number(player.moveTargetSeatId))}
    const remaining=entries.filter(([,player])=>!normalizeSeatId(player?.seatId,seatCount)&&!player?.moveTargetSeatId),free=[];
    for(let seatId=1;seatId<=seatCount;seatId++)if(!used.has(seatId))free.push(seatId);
    if(!remaining.length)return j({ok:true,unchanged:true,assigned:[],room:publicRoom(meta),players:entries.map(([,player])=>publicPlayer(player))});
    if(free.length<remaining.length)return j({ok:false,error:"NOT_ENOUGH_FREE_SEATS",message:"Không đủ ghế trống cho Người Chơi còn lại.",remaining:remaining.length,available:free.length},409);
    const shuffledPlayers=secureShuffle(remaining),assigned=[];
    for(let index=0;index<shuffledPlayers.length;index++){
      const [participantId,player]=shuffledPlayers[index],seatId=free[index];
      player.seatId=seatId;player.ready=player.reservedByGM===true;clearPlayerMovement(player);
      if(normalizeSeatLayout(meta.seatLayout)){const point=villageLayout.positions(seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[seatId-1];if(point){player.positionX=point.x;player.positionY=point.y}}
      players[participantId]=player;assigned.push({participantId,seatId});
    }
    await this.ctx.storage.put("players",players);meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,seatsRandomized:true,assigned});
    return j({ok:true,room,players:publicPlayers,assigned})
  }
}
