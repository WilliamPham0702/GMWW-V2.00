// Làng chung: vị trí, danh bạ thành viên, Top 3.
import { PRESENCE_TTL } from "../config.js";
import { bearer, j } from "../http/responses.js";
import { sha256 } from "../support/crypto.js";
import { directoryMember } from "../support/member-records.js";
import { villageLayout } from "../support/village-layout.js";
import { activeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { villageAutoPoint } from "../../gmww-village-autolife.js";
import { villagePresence } from "../../gmww-village-player-state.js";

export class RoomVillageMethods {
  async villageState(){
    const rows=await this.ctx.storage.list({prefix:"member:"});
    const players=[...rows.values()].filter(m=>Date.now()-Number(m.presenceAt||0)<=PRESENCE_TTL&&!m.currentRoomCode).map(m=>({participantId:"member:"+m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),online:true,...villagePresence(m)})).slice(0,30);
    return j({ok:true,players,serverTime:Date.now()});
  }
  async villageMove(request,body){
    const token=bearer(request),ses=token?await this.ctx.storage.get("session:"+await sha256(token)):null;
    if(!ses||ses.expiresAt<=Date.now())return j({ok:false,error:"UNAUTHORIZED"},401);
    const key="member:"+ses.loginId,m=await this.ctx.storage.get(key);if(!m)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);
    if(m.currentRoomCode)return j({ok:false,error:"MOVE_IN_ROOM",message:"Hãy di chuyển trong Phòng đang tham gia."},409);
    const old=villagePresence(m),from=old.movementStatus==='moving'?villageLayout.interpolate(old):villageLayout.clampPoint(old.positionX,old.positionY),now=Date.now(),autoMotionPhase=body?.autoMotionPhase==="gather"?"gather":body?.autoMotionPhase==="roam"?"roam":null;
    let to=villageLayout.clampPoint(body?.x,body?.y);if(autoMotionPhase==="gather")to=villageAutoPoint("member:"+normalizeLoginId(m.loginId),Math.floor(now/1000),villageLayout);
    m.villageMovement={positionX:from.x,positionY:from.y,moveFromX:from.x,moveFromY:from.y,moveToX:to.x,moveToY:to.y,moveStartedAt:now,moveDurationMs:Math.max(450,Math.min(4200,Math.hypot(to.x-from.x,(to.y-from.y)*2)*48)),moveId:crypto.randomUUID(),movementStatus:'moving',autoMotionPhase};m.presenceAt=now;await this.ctx.storage.put(key,m);return this.villageState();
  }
  async memberDirectory(){
    const rows=await this.ctx.storage.list({prefix:"member:"}),members=[...rows.values()].map(directoryMember).sort((a,b)=>String(a.displayName||a.loginId).localeCompare(String(b.displayName||b.loginId),"vi"));
    return j({ok:true,count:members.length,serverTime:Date.now(),members});
  }
  async memberTop3(){
    // Top 3 cho màn setup của Player Web: cùng thứ tự với GM (nhiều ván trước, rồi tỷ lệ thắng, rồi tên); chỉ trả tên, Character, thắng/thua.
    const rows=await this.ctx.storage.list({prefix:"member:"});
    const top=[...rows.values()].map(m=>{const st=m?.stats||{},w=Math.max(0,Number(st.wins||0)),l=Math.max(0,Number(st.losses||0));return{displayName:String(m?.displayName||m?.loginId||"Thành viên"),gameCharacterId:activeGameCharacterId(m?.gameCharacterId,m?.loginId),wins:w,losses:l,games:w+l}})
      .filter(x=>x.games>0)
      .sort((a,b)=>b.games-a.games||b.wins*a.games-a.wins*b.games||a.displayName.localeCompare(b.displayName,"vi"))
      .slice(0,3).map((x,i)=>({rank:i+1,displayName:x.displayName,gameCharacterId:x.gameCharacterId,wins:x.wins,losses:x.losses,games:x.games,rate:Math.round(100*x.wins/x.games)}));
    return j({ok:true,top});
  }
}
