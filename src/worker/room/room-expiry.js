// Hạn dùng của phòng.
import { ROOM_IDLE_TTL } from "../config.js";
import { playerRoomEmptyDue } from "../../gmww-player-room-policy.js";

export class RoomExpiryMethods {
  roomExpiryDue(meta){
    const times=[meta?.lastUsedAt,meta?.updatedAt,meta?.createdAt].map(x=>Date.parse(x||"")).filter(Number.isFinite),last=times.length?Math.max(...times):Date.now();
    const idleDue=last+ROOM_IDLE_TTL,emptyDue=playerRoomEmptyDue(meta);
    return emptyDue===null?idleDue:Math.min(idleDue,emptyDue)
  }
}
