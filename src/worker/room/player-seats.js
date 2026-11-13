// Chỗ ngồi và di chuyển của người chơi.
import { j } from "../http/responses.js";
import { villageLayout } from "../support/village-layout.js";
import { normalizeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { normalizeSeatCount } from "../../gmww-room-config-rules.js";
import { movementArrivalReady, movementRemainingMs, seatClaimConflict } from "../../gmww-seat-movement-rules.js";
import { villageAutoPoint } from "../../gmww-village-autolife.js";
import { clearPlayerMovement, currentMovementPosition, normalizeSeatId, normalizeVillageCoord, publicPlayer } from "../../gmww-village-player-state.js";

export class RoomPlayerSeatMethods {
  async playerSeatSwap(body){
    const meta=await this.ctx.storage.get('meta');if(!meta)return j({ok:false,error:'ROOM_NOT_FOUND'},404);
    if(meta.seatsLocked||!['lobby','waiting'].includes(meta.phase||'lobby'))return j({ok:false,error:'SEATS_LOCKED',message:'Vị trí đã khóa.'},409);
    const players=await this.ctx.storage.get('players')||{},id='member:'+normalizeLoginId(body?.loginId),p=players[id];if(!p)return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
    let swaps=await this.ctx.storage.get('seatSwaps')||[];swaps=swaps.filter(x=>x.expiresAt>Date.now()&&x.status==='pending');
    if(body?.action==='request'){
      const targetId=String(body.targetParticipantId||''),other=players[targetId];
      if(!other||targetId===id||!p.seatId||!other.seatId||p.movementStatus==='moving'||other.movementStatus==='moving')return j({ok:false,error:'INVALID_SWAP',message:'Cả hai phải đã chọn vị trí.'},409);
      if(swaps.some(x=>[x.fromId,x.toId].some(v=>v===id||v===targetId)))return j({ok:false,error:'SWAP_PENDING',message:'Đang chờ một yêu cầu đổi vị trí.'},409);
      swaps.push({id:crypto.randomUUID(),fromId:id,toId:targetId,fromName:p.displayName,toName:other.displayName,fromSeat:p.seatId,toSeat:other.seatId,status:'pending',expiresAt:Date.now()+60000});
    }else{
      const item=swaps.find(x=>x.id===String(body.requestId||'')&&x.toId===id);if(!item)return j({ok:false,error:'SWAP_EXPIRED',message:'Yêu cầu đã hết hạn.'},409);
      if(body.action==='accept'){
        const from=players[item.fromId];if(!from||from.seatId!==item.fromSeat||p.seatId!==item.toSeat||from.movementStatus==='moving'||p.movementStatus==='moving')return j({ok:false,error:'SWAP_STALE',message:'Vị trí đã thay đổi. Hãy gửi yêu cầu mới.'},409);
        [from.seatId,p.seatId]=[p.seatId,from.seatId];for(const person of [from,p]){clearPlayerMovement(person);const pos=villageLayout.positions(meta.seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[person.seatId-1];person.positionX=pos.x;person.positionY=pos.y;person.ready=person.reservedByGM===true}await this.ctx.storage.put('players',players);
      }else if(body.action!=='reject')return j({ok:false,error:'INVALID_SWAP_ACTION'},400);
      swaps=swaps.filter(x=>x.id!==item.id);
    }
    await this.ctx.storage.put('seatSwaps',swaps);const room=publicRoom(meta),rows=Object.values(players).map(publicPlayer);this.broadcast({type:'room_state',room,players:rows});return j({ok:true,room,players:rows});
  }
  async playerSetup(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta.phase||"lobby").toLowerCase();if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);if(!["lobby","waiting","role_delivery"].includes(phase))return j({ok:false,error:"SETUP_LOCKED_IN_MATCH",message:"Không thể đổi Nhân Vật hoặc vị trí ngồi khi ván đang chạy."},409);
    const id="member:"+loginId,players=(await this.ctx.storage.get("players"))||{},p=players[id];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},404);
    const gameCharacterId=normalizeGameCharacterId(p.gameCharacterId);if(!gameCharacterId)return j({ok:false,error:"ACCOUNT_CHARACTER_REQUIRED",message:"Tài khoản chưa có Nhân Vật game cố định. Hãy chọn Nhân Vật tại Thông Tin trước."},409);
    const seatCount=normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12),seatId=normalizeSeatId(body?.seatId,seatCount);

    if(body?.seatId!==null)return j({ok:false,error:"GM_SEAT_ASSIGNMENT_REQUIRED",message:"Vị trí do GM xếp. Người chơi không thể tự đăng ký ghế."},403);
    const conflict=seatClaimConflict(players,id,seatId);if(conflict)return j({ok:false,error:"SEAT_TAKEN",message:"Vị trí đã có người chọn."},409);
    p.gameCharacterId=gameCharacterId;p.seatId=seatId;p.ready=p.reservedByGM===true;clearPlayerMovement(p);if(seatId){const point=villageLayout.positions(seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[seatId-1];p.positionX=point.x;p.positionY=point.y;}p.lastHeartbeatAt=Date.now();p.lastSeenAt=new Date().toISOString();players[id]=p;await this.ctx.storage.put("players",players);
    meta.updatedAt=p.lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,setupUpdated:id});
    return j({ok:true,room,player:publicPlayer(p),players:publicPlayers})
  }
  async playerMove(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta.phase||"lobby").toLowerCase();if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);if(!["lobby","waiting"].includes(phase))return j({ok:false,error:"MOVE_LOCKED_IN_MATCH",message:"Đã phát Vai Trò hoặc vào ván: dừng di chuyển tự động để bảo đảm đồng bộ."},409);

    const id="member:"+loginId,players=(await this.ctx.storage.get("players"))||{},p=players[id];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},404);
    if(!normalizeGameCharacterId(p.gameCharacterId))return j({ok:false,error:"ACCOUNT_CHARACTER_REQUIRED"},409);
    const seatCount=normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12),targetSeatId=body?.seatId==null?null:normalizeSeatId(body.seatId,seatCount);
    if(body?.seatId!=null)return j({ok:false,error:"GM_SEAT_ASSIGNMENT_REQUIRED",message:"Ghế chỉ do GM phân phối."},403);
    if(!targetSeatId&&normalizeSeatId(p.seatId,seatCount))return j({ok:false,error:"SEATED_MOVE_REQUIRES_TARGET",message:"Đã ngồi ghế. Hãy chọn ghế mới để đổi chỗ."},409);
    if(targetSeatId){
      if(Number(p.seatId||0)===targetSeatId)return j({ok:true,already:true,room:publicRoom(meta),player:publicPlayer(p),players:Object.values(players).map(publicPlayer)});
      const conflict=seatClaimConflict(players,id,targetSeatId);if(conflict)return j({ok:false,error:"SEAT_TAKEN",message:"Ghế "+targetSeatId+" đã có người chọn.",seatId:targetSeatId,occupant:publicPlayer(conflict.player)},409);
    }
    const now=Date.now(),fallback=villageLayout.spawn(id),from=villageLayout.clampPoint(currentMovementPosition(p,now,fallback.x,fallback.y).x,currentMovementPosition(p,now,fallback.x,fallback.y).y),autoMotionPhase=body?.autoMotionPhase==="gather"?"gather":body?.autoMotionPhase==="roam"?"roam":null,to=targetSeatId?villageLayout.positions(seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[targetSeatId-1]:autoMotionPhase==="gather"?villageAutoPoint(id,Math.floor(now/1000),villageLayout):villageLayout.clampPoint(body?.x,body?.y),distance=Math.hypot(to.x-from.x,to.y-from.y),duration=Math.max(450,Math.min(4200,Math.trunc(Number(body?.durationMs)||distance*42||650))),moveId=String(body?.moveId||crypto.randomUUID()).slice(0,120);
    p.positionX=from.x;p.positionY=from.y;p.moveId=moveId;p.moveFromX=from.x;p.moveFromY=from.y;p.moveToX=to.x;p.moveToY=to.y;p.moveStartedAt=now;p.moveDurationMs=duration;p.moveTargetSeatId=targetSeatId;p.movementStatus="moving";p.autoMotionPhase=autoMotionPhase;p.villageActivity=autoMotionPhase==="gather"?"roaming":autoMotionPhase==="roam"?"roaming":"moving";p.sitStartedAt=null;p.sitUntil=null;p.ready=p.reservedByGM===true;p.lastHeartbeatAt=now;p.lastSeenAt=new Date(now).toISOString();players[id]=p;
    await this.ctx.storage.put("players",players);meta.updatedAt=p.lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"player_move",room,player:publicPlayer(p),players:publicPlayers,serverTime:Date.now()});
    return j({ok:true,room,player:publicPlayer(p),players:publicPlayers,moveId,durationMs:duration})
  }
  async playerMoveComplete(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const id="member:"+loginId,players=(await this.ctx.storage.get("players"))||{},p=players[id];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},404);
    const moveId=String(body?.moveId||"");
    if(!p.moveId||p.movementStatus!=="moving"){if(moveId&&String(p.lastMoveId||"")===moveId)return j({ok:true,idempotent:true,room:publicRoom(meta),player:publicPlayer(p),players:Object.values(players).map(publicPlayer)});return j({ok:false,error:"MOVE_NOT_ACTIVE"},409)}
    if(moveId!==String(p.moveId))return j({ok:false,error:"MOVE_MISMATCH"},409);
    const now=Date.now();if(!movementArrivalReady(p,now,.62))return j({ok:false,error:"MOVE_NOT_ARRIVED",remainingMs:Math.max(1,movementRemainingMs(p,now,.62))},409);
    const targetSeatId=normalizeSeatId(p.moveTargetSeatId,meta.seatCount);
    if(targetSeatId){
      const conflict=seatClaimConflict(players,id,targetSeatId);if(conflict){clearPlayerMovement(p);players[id]=p;await this.ctx.storage.put("players",players);return j({ok:false,error:"SEAT_TAKEN",message:"Ghế đã có người ngồi trước khi bạn tới.",seatId:targetSeatId},409)}
      p.seatId=targetSeatId;
    }
    const completedAutoPhase=p.autoMotionPhase;p.positionX=normalizeVillageCoord(p.moveToX,p.positionX);p.positionY=normalizeVillageCoord(p.moveToY,p.positionY);p.lastMoveId=String(p.moveId);clearPlayerMovement(p,{keepPosition:true});if(completedAutoPhase==="gather"){p.villageActivity="sitting";p.sitStartedAt=now;p.sitUntil=now+30000}p.ready=p.reservedByGM===true;p.lastHeartbeatAt=now;p.lastSeenAt=new Date(now).toISOString();players[id]=p;
    await this.ctx.storage.put("players",players);meta.updatedAt=p.lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"player_move_complete",room,player:publicPlayer(p),players:publicPlayers,seatUpdated:targetSeatId?id:null,serverTime:Date.now()});
    return j({ok:true,room,player:publicPlayer(p),players:publicPlayers,arrived:true,seatId:targetSeatId})
  }
}
