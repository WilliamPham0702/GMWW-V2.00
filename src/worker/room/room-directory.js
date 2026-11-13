// Danh bạ phòng.
import { ROOM_DIRECTORY_LEASE, ROOM_IDLE_TTL } from "../config.js";
import { j } from "../http/responses.js";
import { normalizeRoomName } from "../support/member-records.js";
import { isValidRoomCode, normalizeRoomCode } from "../support/room-access.js";
import { shouldSkipDirectoryHeartbeat } from "../../gmww-do-write-optimizer.js";
import { normalizeRoomMode, normalizeSeatCount, normalizeSeatMoveMode } from "../../gmww-room-config-rules.js";

export class RoomDirectoryMethods {
  async roomDirectoryUpsert(body){
    const code=normalizeRoomCode(body?.code);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
    const key="roomdir:"+code,old=await this.ctx.storage.get(key),incomingResetVersion=Math.max(0,Number(body?.resetVersion||0)),oldResetVersion=Math.max(0,Number(old?.resetVersion||0));
    if(old&&incomingResetVersion<oldResetVersion)return j({ok:true,staleIgnored:true,room:old});
    const rec={code,roomName:normalizeRoomName(body?.roomName)||("Phòng "+code),gameName:String(body?.gameName||"").slice(0,120),phase:String(body?.phase||"lobby"),status:String(body?.status||"waiting"),locked:!!body?.locked,enabled:body?.enabled!==false,demo:body?.demo===true,roomMode:normalizeRoomMode(body?.roomMode||old?.roomMode),seatMoveMode:normalizeSeatMoveMode(body?.seatMoveMode||old?.seatMoveMode),seatCount:normalizeSeatCount(body?.seatCount,old?.seatCount||12),playerCount:Math.max(0,Number(body?.playerCount||0)),joinedCount:Math.max(0,Number(body?.joinedCount||0)),resetVersion:incomingResetVersion,createdAt:body?.createdAt||old?.createdAt||new Date().toISOString(),updatedAt:body?.updatedAt||new Date().toISOString(),leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE,...((body?.playerRoom===true||old?.playerRoom===true)?{playerRoom:true}:{})};
    if(shouldSkipDirectoryHeartbeat(old,rec,Date.now())){
      this.gmwwWriteSkipped('roomDirectory');
      return j({ok:true,room:old,unchanged:true});
    }
    await this.ctx.storage.put(key,rec);return j({ok:true,room:rec});
  }
  async roomDirectoryList(url){
    const includeEnded=String(url?.searchParams?.get("includeEnded")||"")==="1",includeDisabled=String(url?.searchParams?.get("includeDisabled")||"")==="1",rows=await this.ctx.storage.list({prefix:"roomdir:"}),rooms=[],nowMs=Date.now();
    for(const [key,r] of rows){const phase=String(r?.phase||"").toLowerCase(),last=Date.parse(r?.updatedAt||r?.createdAt||"");if(phase==="deleted"||(Number.isFinite(last)&&nowMs-last>=ROOM_IDLE_TTL)){await this.ctx.storage.delete(key);await this.ctx.storage.delete("playerroom:"+key.slice(8));continue}if(!includeDisabled&&r?.enabled===false)continue;if(!includeEnded){if(phase==="ended")continue;const lease=Number(r?.leaseUntil||0),activeDemo=r?.demo===true&&phase==="running"&&r?.enabled!==false;if(!activeDemo&&((lease&&nowMs>lease)||(!lease&&Number.isFinite(last)&&nowMs-last>ROOM_DIRECTORY_LEASE)))continue}rooms.push(r)}
    rooms.sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));return j({ok:true,count:rooms.length,rooms,ttlHours:72,leaseSeconds:Math.floor(ROOM_DIRECTORY_LEASE/1000)});
  }
  async roomDirectoryDelete(body){const code=normalizeRoomCode(body?.code);if(isValidRoomCode(code)){await this.ctx.storage.delete("roomdir:"+code);await this.ctx.storage.delete("playerroom:"+code)}return j({ok:true,deleted:true,code})}
}
