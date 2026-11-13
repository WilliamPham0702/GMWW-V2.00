// Quản trị thành viên: xoá, đặt lại xếp hạng, xoá lịch sử, dấu reset 939.
import { GM_SYNC_TOKEN } from "../config.js";
import { bearer, j } from "../http/responses.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";

export class RoomMemberAdminMethods {
  async memberDelete(request,body){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const loginId=normalizeLoginId(body?.loginId);if(!loginId)return j({ok:false,error:"INVALID_LOGIN_ID"},400);
    const key="member:"+loginId,member=await this.ctx.storage.get(key),historyDeleted=Array.isArray(member?.history)?member.history.length:0;if(member)await this.ctx.storage.delete(key);
    const sessions=await this.ctx.storage.list({prefix:"session:"});let sessionCount=0;
    for(const [k,v] of sessions){if(normalizeLoginId(v?.loginId)===loginId){await this.ctx.storage.delete(k);sessionCount++}}
    return j({ok:true,deleted:!!member,loginId,sessionsDeleted:sessionCount,historyDeleted});
  }
  async memberResetRanking(request){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const members=await this.ctx.storage.list({prefix:"member:"});let count=0,historyDeleted=0;
    for(const [k,m] of members){historyDeleted+=Array.isArray(m?.history)?m.history.length:0;m.stats={wins:0,losses:0};m.history=[];m.updatedAt=new Date().toISOString();await this.ctx.storage.put(k,m);count++}
    return j({ok:true,reset:true,membersUpdated:count,historyDeleted});
  }
  async memberClearHistory(request){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const members=await this.ctx.storage.list({prefix:"member:"});let count=0,historyDeleted=0;
    for(const [k,m] of members){historyDeleted+=Array.isArray(m?.history)?m.history.length:0;m.history=[];m.updatedAt=new Date().toISOString();await this.ctx.storage.put(k,m);count++}
    return j({ok:true,cleared:true,membersUpdated:count,historyDeleted});
  }
  async adminReset939Status(request){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const record=await this.ctx.storage.get("admin:reset:939");return j({ok:true,done:!!record,record:record||null})}
  async adminReset939Mark(request,body){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const record={done:true,at:new Date().toISOString(),...(body&&typeof body==="object"?body:{})};await this.ctx.storage.put("admin:reset:939",record);return j({ok:true,done:true,record})}
}
