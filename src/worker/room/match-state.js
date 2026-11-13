// Trạng thái ván dùng chung: phiên, trạng thái công khai, quyền GM, đề xuất thắng, nhật ký hành động.
import { GM_SYNC_TOKEN, SESSION_TTL } from "../config.js";
import { bearer, j } from "../http/responses.js";
import { randomToken, sha256 } from "../support/crypto.js";
import { normalizeWinnerFaction } from "../support/game-keys.js";
import { activeFrozenLoginIds } from "../support/member-records.js";
import { orbVillageWin } from "../../gmww-artifact-rules.js";
import { hunterLinkedDeaths } from "../../gmww-hunter-death-rules.js";
import { loverLinkedDeaths } from "../../gmww-lovers-rules.js";
import { groupLinkedDeaths } from "../../gmww-night-cult-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { publicRoom, publicVillageStatusTagsFor } from "../../gmww-public-room-contract.js";
import { publicPlayer } from "../../gmww-village-player-state.js";

export class RoomMatchStateMethods {
  async memberLogout(request){
    const token=bearer(request);if(token){const key="session:"+await sha256(token),ses=await this.ctx.storage.get(key);if(ses){const member=await this.ctx.storage.get("member:"+ses.loginId);if(member){member.presenceAt=0;member.lastSeenAt=new Date().toISOString();member.ready=false;await this.ctx.storage.put("member:"+ses.loginId,member)}}await this.ctx.storage.delete(key)}return j({ok:true})
  }
  async newSession(member){const token=randomToken(32),expiresAt=Date.now()+SESSION_TTL;await this.ctx.storage.put("session:"+await sha256(token),{loginId:member.loginId,expiresAt});return{token,expiresAt}}
  async pruneOfflinePlayers(meta,players){
    // A disconnected player keeps the same fixed seat until explicit Leave,
    // GM release/kick, Hard Reset, or room deletion. Presence is represented
    // by publicPlayer().online instead of deleting the roster entry.
    return{players:players||{},removed:[]};
  }
  async publicState(){const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(String(meta.phase||"").toLowerCase()==="deleted")return j({ok:false,error:"ROOM_NOT_FOUND"},404);let players=(await this.ctx.storage.get("players"))||{};const pruned=await this.pruneOfflinePlayers(meta,players);players=pruned.players;const interactions=(await this.ctx.storage.get("interactions"))||[],frozenLogins=activeFrozenLoginIds(interactions,meta,Date.now());return j({ok:true,room:publicRoom(meta),players:Object.values(players).map(p=>({...publicPlayer(p),frozen:meta?.statusDisplay?.frozen===true&&frozenLogins.has(normalizeLoginId(p?.loginId)),statusTags:publicVillageStatusTagsFor(interactions,meta,p?.loginId,players)})),connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})}
  async gmAuthorized(request){const meta=await this.ctx.storage.get("meta");if(!meta)return{ok:false,response:j({ok:false,error:"ROOM_NOT_FOUND"},404)};const token=bearer(request);if(!token)return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};if(token!==GM_SYNC_TOKEN&&await sha256(token)!==meta.gmTokenHash)return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};
    if(meta.demo&&request.method==="POST"&&/^\/gm\/(?:battle-action|day-action|day-clock|gallows|turn|cycle|end)$/.test(new URL(request.url).pathname)){
      const lease=await this.ctx.storage.get("demoLease");
      if(lease?.engine!=="server"&&lease?.running&&Number(lease.until)>Date.now()&&request.headers.get("x-gmww-demo-owner")!==lease.owner)
        return{ok:false,response:j({ok:false,error:"DEMO_LEASE_OWNED",message:"Phòng Demo đang được điều khiển ở một phiên GM khác."},409)};
    }
    return{ok:true,meta,admin:token===GM_SYNC_TOKEN}}
  computeWinProposal(meta,assignments,interactions){
    if(String(meta?.phase||"").toLowerCase()!=="running")return null;
    const dead=new Set((Array.isArray(interactions)?interactions:[]).filter(x=>String(x?.type||"")==="dead"&&x?.effectActive!==false&&(!x?.matchId||!meta?.matchId||String(x.matchId)===String(meta.matchId))).map(x=>normalizeLoginId(x?.loginId)).filter(Boolean)),byPlayer=new Map();
    for(const a of Array.isArray(assignments)?assignments:[]){const lid=normalizeLoginId(a?.loginId);if(!lid||dead.has(lid))continue;const row=byPlayer.get(lid)||{loginId:lid,factions:new Set()};row.factions.add(normalizeWinnerFaction(a?.faction||""));byPlayer.set(lid,row)}
    if(typeof orbVillageWin==="function"&&orbVillageWin({interactions,matchId:String(meta?.matchId||"")}))return{winnerFaction:"Phe Dân",winnerLabel:"Phe Dân",reason:"Quả Cầu Phán Đoán chỉ ra đúng hai Sói.",confidence:"artifact-rule"};
    const alive=[...byPlayer.values()];if(!alive.length)return null;
    const wolves=alive.filter(p=>p.factions.has("Phe Sói")).length,third=alive.filter(p=>p.factions.has("Phe Ba")).length,others=alive.length-wolves;
    if(alive.length===1&&third===1)return{winnerFaction:"Phe Ba",winnerLabel:"Phe Ba",reason:"Chỉ còn một Người Chơi Phe Ba còn sống.",confidence:"basic-rule"};
    if(wolves===0)return{winnerFaction:"Phe Dân",winnerLabel:"Phe Dân",reason:"Không còn Người Chơi Phe Sói còn sống.",confidence:"basic-rule"};
    if(wolves>=others)return{winnerFaction:"Phe Sói",winnerLabel:"Phe Sói",reason:"Số Người Chơi Phe Sói còn sống đã bằng hoặc nhiều hơn các phe còn lại.",confidence:"basic-rule"};
    return null
  }
  // Immutable, unbounded action history in individual Durable Object entries.
  // Recent interactions remain size-bounded for Rule Engine / fast realtime sync,
  // but the audit archive is NEVER truncated to 100 or removed by a new match.
  actionLogKey(row){
    const when=Date.parse(String(row?.createdAt||"")),ts=Number.isFinite(when)?when:Date.now();
    return "actionLog:"+String(ts).padStart(13,"0")+":"+String(row?.id||"").slice(0,140);
  }
  async applyHunterDeathConsequences(meta,rows,now=new Date().toISOString()){
    const assignments=(await this.ctx.storage.get("assignments"))||[];
    const history=await this.villageHistoryForMatch(meta,rows);
    const mid=String(meta.matchId||""),nightNo=Number(meta.cycleNight||0);
    // Tình nhân (Cupid) -> Thợ Săn -> Tình nhân: chuỗi chết theo cùng lúc, không vòng lặp vô hạn.
    const lovers1=loverLinkedDeaths({interactions:history,matchId:mid,night:nightNo});
    const hunters=hunterLinkedDeaths({assignments,interactions:[...history,...lovers1],matchId:mid,night:nightNo});
    const lovers2=loverLinkedDeaths({interactions:[...history,...lovers1,...hunters],matchId:mid,night:nightNo});
    const linked=[...lovers1,...hunters,...lovers2];
    for(const outcome of linked){
      if(rows.some(r=>String(r.id||"")===outcome.id))continue;
      const death={...outcome,createdAt:now,night:Math.max(1,Number(outcome.night)||Number(meta.cycleNight)||1)};
      rows.push(death);await this.ctx.storage.put(this.actionLogKey(death),death);
      this.broadcast({type:"player_status_changed",loginId:death.loginId,
        statusId:"dead",active:true,serverTime:Date.now()});
    }
    if(typeof groupLinkedDeaths==="function")for(let pass=0;pass<2;pass++){
      const more=groupLinkedDeaths({assignments,interactions:[...history,...rows],matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0),now});
      for(const death of more){
        if(rows.some(r=>String(r.id||"")===death.id))continue;
        rows.push(death);await this.ctx.storage.put(this.actionLogKey(death),death);
        this.broadcast({type:"player_status_changed",loginId:death.loginId,statusId:"dead",active:true,serverTime:Date.now()});
        linked.push(death);
      }
    }
    return linked;
  }
  async villageHistoryForMatch(meta,latest=[]){
    const matchId=String(meta.matchId||"");
    if(!matchId)return [];
    // Read all archived rows for this ROOM and match (not just the latest 100).
    // The log is room-local. Sort once, newest edits of a receipt supersede
    // archived originals so undo/restore never resurrects stale UI effects.
    const stored=await this.ctx.storage.list({prefix:"actionLog:"});
    const byId=new Map();
    for(const row of stored.values()){
      if(!row||String(row.matchId||"")!==matchId||!(Number(row.night)>0)||
         Number(row.night)>Number(meta.cycleNight||0))continue;
      const id=String(row.id||row.clientEventId||"");if(id)byId.set(id,row);
    }
    for(const row of latest){
      if(!row||String(row.matchId||"")!==matchId||!(Number(row.night)>0)||
         Number(row.night)>Number(meta.cycleNight||0))continue;
      const id=String(row.id||row.clientEventId||"");if(id)byId.set(id,row);
    }
    return [...byId.values()].sort((a,b)=>String(a.createdAt||"").localeCompare(String(b.createdAt||"")));
  }
  async gmActionLog(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    // Backfill the currently retained legacy interactions once. Records that were
    // already pruned before this release cannot be reconstructed.
    if(!(await this.ctx.storage.get("actionLogBackfilled"))){
      const legacy=(await this.ctx.storage.get("interactions"))||[];
      for(let i=0;i<legacy.length;i+=100){
        const batch={};
        for(const row of legacy.slice(i,i+100))if(row?.id)batch[this.actionLogKey(row)]=row;
        if(Object.keys(batch).length)await this.ctx.storage.put(batch);
      }
      await this.ctx.storage.put("actionLogBackfilled",true);
    }
    const url=new URL(request.url),before=String(url.searchParams.get("before")||"");
    if(before&&(!/^actionLog:[0-9]{13}:[A-Za-z0-9:_-]{1,140}$/.test(before)))
      return j({ok:false,error:"INVALID_LOG_CURSOR"},400);
    const limit=100,query={prefix:"actionLog:",reverse:true,limit:limit+1};
    if(before)query.end=before;
    const page=await this.ctx.storage.list(query),entries=[...page.entries()],visible=entries.slice(0,limit);
    return j({ok:true,items:visible.map(([,row])=>row),hasMore:entries.length>limit,
      nextCursor:entries.length>limit?visible[visible.length-1]?.[0]||null:null});
  }
}
