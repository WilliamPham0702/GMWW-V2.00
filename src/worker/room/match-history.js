// Thư viện lịch sử ván.
import { GM_SYNC_TOKEN } from "../config.js";
import { bearer, j } from "../http/responses.js";
import { upsertMatchIndex } from "../../gmww-match-history.js";

export class RoomMatchHistoryMethods {
  // Thư viện: server-wide match history, one record per finished match (public outcomes only).
  async matchRecord(body){
    const id=String(body?.matchId||"").slice(0,80);if(!id)return j({ok:false,error:"MATCH_ID_REQUIRED"},400);
    const record={...body,matchId:id,nights:Array.isArray(body?.nights)?body.nights.slice(0,80):[],players:Array.isArray(body?.players)?body.players.slice(0,80):[],summary:Array.isArray(body?.summary)?body.summary.slice(0,80):[]};
    if(JSON.stringify(record).length>120000)return j({ok:false,error:"MATCH_RECORD_TOO_LARGE"},413);
    const before=(await this.ctx.storage.get("matchIndex"))||[],index=upsertMatchIndex(before,record),kept=new Set(index.map(x=>x.matchId));
    await this.ctx.storage.put("matchLog:"+id,record);await this.ctx.storage.put("matchIndex",index);
    for(const row of before)if(row?.matchId&&!kept.has(row.matchId))await this.ctx.storage.delete("matchLog:"+row.matchId);
    return j({ok:true,matchId:id,total:index.length});
  }
  async matchList(){const index=(await this.ctx.storage.get("matchIndex"))||[];return j({ok:true,matches:index,total:index.length})}
  async matchGet(matchId){const id=String(matchId||"").slice(0,80);if(!id)return j({ok:false,error:"MATCH_ID_REQUIRED"},400);const record=await this.ctx.storage.get("matchLog:"+id);if(!record)return j({ok:false,error:"MATCH_NOT_FOUND"},404);return j({ok:true,match:record})}
  async matchClear(request){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const index=(await this.ctx.storage.get("matchIndex"))||[],keys=await this.ctx.storage.list({prefix:"matchLog:"});let deleted=0;
    for(const k of keys.keys()){await this.ctx.storage.delete(k);deleted++}
    await this.ctx.storage.delete("matchIndex");
    return j({ok:true,cleared:true,matchesDeleted:deleted,indexRows:index.length});
  }
}
