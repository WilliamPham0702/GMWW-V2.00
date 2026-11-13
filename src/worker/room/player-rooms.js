// Phòng do người chơi tạo: giữ chỗ, quyền chủ phòng, dựng ván, bắt đầu, kết thúc.
import { GM_SYNC_TOKEN, MEMBER_STORE_NAME, ROOM_DIRECTORY_LEASE } from "../config.js";
import { bearer, j, safeJson } from "../http/responses.js";
import { sha256, timingSafeEqual } from "../support/crypto.js";
import { normalizeRoomName } from "../support/member-records.js";
import { isValidRoomCode, normalizeRoomCode, secureShuffle } from "../support/room-access.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { evaluatePlayerRoomCreate } from "../../gmww-player-room-policy.js";
import { missingRoleCards, ownerDeckView, planPlayerRoomDeal, playerRoomConfigFromTemplate } from "../../gmww-player-room-setup.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { normalizeSeatCount } from "../../gmww-room-config-rules.js";
import { publicPlayer } from "../../gmww-village-player-state.js";

export class RoomPlayerRoomMethods {
  // Atomic check + reserve for a player-created room: one handler, storage-only awaits.
  // The owner login is kept under a private key so the public room list never exposes it.
  async playerRoomReserve(body){
    const code=normalizeRoomCode(body?.code),owner=normalizeLoginId(body?.ownerLoginId);
    if(!isValidRoomCode(code)||!owner)return j({ok:false,error:"INVALID_REQUEST"},400);
    if(await this.ctx.storage.get("roomdir:"+code))return j({ok:false,error:"CODE_TAKEN"},409);
    const dirRows=await this.ctx.storage.list({prefix:"roomdir:"}),ownerRows=await this.ctx.storage.list({prefix:"playerroom:"}),owners=new Map();
    for(const [key,v] of ownerRows)owners.set(key.slice("playerroom:".length),String(v?.ownerLoginId||""));
    const rows=[...dirRows.values()].map(r=>({...r,ownerLoginId:owners.get(r?.code)||""})),verdict=evaluatePlayerRoomCreate(rows,owner,Date.now());
    if(!verdict.ok)return j({ok:false,error:verdict.error,roomCode:verdict.roomCode||null,max:verdict.max||null},verdict.status);
    const now=new Date().toISOString(),rec={code,roomName:normalizeRoomName(body?.roomName)||("Phòng "+code),gameName:"",phase:"lobby",status:"waiting",locked:false,enabled:true,demo:false,roomMode:"online",seatMoveMode:"instant",seatCount:normalizeSeatCount(body?.seatCount,12),playerCount:0,joinedCount:0,resetVersion:0,createdAt:now,updatedAt:now,leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE,playerRoom:true};
    await this.ctx.storage.put("playerroom:"+code,{ownerLoginId:owner,createdAt:now});await this.ctx.storage.put("roomdir:"+code,rec);
    return j({ok:true,room:rec},201);
  }
  // ---- Player-room owner API (set-up only; never exposes roles, assignments or the GM token) ----
  ownerAsGm(request){const h=new Headers(request.headers);h.set("authorization","Bearer "+GM_SYNC_TOKEN);return new Request(request.url,{method:request.method,headers:h})}
  async ownerGate(request){
    const meta=await this.ctx.storage.get("meta");
    if(!meta||String(meta.phase||"").toLowerCase()==="deleted")return{ok:false,response:j({ok:false,error:"ROOM_NOT_FOUND"},404)};
    const token=bearer(request);
    if(meta.playerRoom!==true||!meta.ownerTokenHash||!token||!timingSafeEqual(await sha256(token),String(meta.ownerTokenHash)))return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};
    return{ok:true,meta}
  }
  async ownerAction(action,request){
    if(action==="state"){if(request.method!=="GET")return j({ok:false,error:"METHOD_NOT_ALLOWED"},405);return this.ownerState(request)}
    if(request.method!=="POST")return j({ok:false,error:"METHOD_NOT_ALLOWED"},405);
    const gate=await this.ownerGate(request);if(!gate.ok)return gate.response;
    const meta=gate.meta,body=await safeJson(request)||{},gm=this.ownerAsGm(request);
    if(action==="seat-lock")return this.gmSeatLock(gm,{locked:body.locked!==false});
    if(action==="seats-randomize")return this.gmRandomizeRemainingSeats(gm);
    if(action==="kick"){
      const target=normalizeLoginId(body.loginId);
      if(!target)return j({ok:false,error:"INVALID_REQUEST"},400);
      if(target===normalizeLoginId(meta.ownerLoginId))return j({ok:false,error:"CANNOT_KICK_OWNER"},400);
      return this.gmKick(gm,{loginId:target})
    }
    if(action==="room-settings"){
      const picked={roomMode:"online",demo:false};
      for(const k of ["roomName","seatCount","seatMoveMode","seatLayout","seatOffset","seatSpacing"])if(Object.prototype.hasOwnProperty.call(body,k))picked[k]=body[k];
      return this.gmRoomSettings(gm,picked)
    }
    if(action==="apply-template")return this.ownerApplyTemplate(gm,meta,body);
    if(action==="roles-shuffle")return this.ownerRolesShuffle(gm,meta);
    if(action==="start")return this.ownerStart(gm,meta,body);
    if(action==="end")return this.ownerEnd(gm,meta);
    if(action==="close")return this.ownerClose(meta);
    if(action==="stage"){const step=String(body.step||"").toLowerCase();return["room","seats","game","roles","deal"].includes(step)?this.gmStage(gm,{step}):j({ok:false,error:"INVALID_GM_STAGE"},400)}
    return j({ok:false,error:"NOT_FOUND"},404)
  }
  // Owner deletes their own room (frees their one-room slot). A running match must be ended first.
  async ownerClose(meta){
    if(String(meta.phase||"").toLowerCase()==="running")return j({ok:false,error:"ROOM_RUNNING",message:"Ván đang chơi. Hãy kết thúc ván trước khi xoá phòng."},409);
    await this.wipeRoom(meta,"ROOM_CLOSED");
    return j({ok:true,closed:true,code:meta.code});
  }
  // Wipes a room and detaches it from the directory. Shared by idle expiry and the owner's "Xoá phòng".
  async wipeRoom(meta,reason="ROOM_EXPIRED"){
      await this.chatVoiceClear();
      const now=new Date().toISOString();meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=now;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}for(const ws of this.ctx.getWebSockets())try{ws.close(1000,reason)}catch{}
      if(meta.playerRoom===true){try{await this.env.ROOMS.get(this.env.ROOMS.idFromName(MEMBER_STORE_NAME)).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:meta.code})})}catch(e){console.warn("GMWW_PLAYER_ROOM_DIRECTORY_DELETE",e)}}
  }
  async ownerState(request){
    const gate=await this.ownerGate(request);if(!gate.ok)return gate.response;
    const players=(await this.ctx.storage.get("players"))||{};
    const cfg=await this.ctx.storage.get("gameConfig"),view=ownerDeckView(cfg);
    if(view?.artifactsEnabled)for(const a of view.artifacts){const card=await this.ctx.storage.get('roleCatalog:artifact:'+a.artifactId);a.name=String(card?.roleCard?.name||a.name||a.artifactId)}
    return j({ok:true,room:publicRoom(gate.meta),players:Object.values(players).map(publicPlayer),config:view,dealRound:Number((await this.ctx.storage.get("pendingDeal"))?.round||0),ownerLoginId:gate.meta.ownerLoginId||null})
  }
  // The Worker reads the Ván Mẫu from the member store and passes it here; the owner only names a templateId.
  async ownerApplyTemplate(gm,meta,body){
    const phase=String(meta.phase||"lobby").toLowerCase();
    if(phase!=="lobby")return j({ok:false,error:"ROOM_NOT_IN_LOBBY",message:"Chỉ chọn Ván Mẫu khi ván chưa bắt đầu."},409);
    const cfg=playerRoomConfigFromTemplate(body?.template);if(!cfg)return j({ok:false,error:"INVALID_TEMPLATE"},400);
    const packages=Array.isArray(body?.packages)?body.packages:[],known=new Set(cfg.roles.map(r=>String(r.roleId||"")));
    const rows=packages.filter(x=>known.has(String(x?.roleId||"")));
    const done=await this.gmConfig(gm,{gameConfig:cfg});if(!done.ok)return done;
    if(rows.length){const assets=await this.gmRoleAssets(gm,{roles:rows});if(!assets.ok)return assets}
    return j({ok:true,config:ownerDeckView(await this.ctx.storage.get("gameConfig")),roleCards:rows.length})
  }
  // Player rooms end by themselves: when a winner is clear the match closes through gmEnd (no GM needed).
  async playerRoomAutoEnd(meta){
    if(meta?.playerRoom!==true||String(meta.phase||"").toLowerCase()!=="running")return false;
    const win=this.computeWinProposal(meta,(await this.ctx.storage.get("assignments"))||[],(await this.ctx.storage.get("interactions"))||[]);
    if(!win)return false;
    const gm=new Request("https://player-room.internal/gm/end",{method:"POST",headers:{authorization:"Bearer "+GM_SYNC_TOKEN}});
    const res=await this.gmEnd(gm,{matchId:meta.matchId,winnerFaction:win.winnerFaction,winner:win.winnerLabel});
    return !!res&&res.status<300
  }
  // Owner may end the match early (no winner recorded).
  async ownerEnd(gm,meta){
    if(String(meta.phase||"").toLowerCase()!=="running")return j({ok:false,error:"ROOM_NOT_RUNNING"},409);
    return this.gmEnd(gm,{matchId:meta.matchId})
  }
  // Phân Vai: the server shuffles the deck in secret and keeps the plan in storage (never returned); only the round count is visible.
  async ownerRolesShuffle(gm,meta){
    const phase=String(meta.phase||"lobby").toLowerCase();
    if(phase!=="lobby")return j({ok:false,error:"ROOM_NOT_IN_LOBBY",message:"Ván đã được bắt đầu."},409);
    const cfg=await this.ctx.storage.get("gameConfig");if(!cfg||!Array.isArray(cfg.roles)||!cfg.roles.length)return j({ok:false,error:"TEMPLATE_NOT_SELECTED",message:"Hãy chọn Ván Mẫu trước."},409);
    const players=(await this.ctx.storage.get("players"))||{},members=Object.values(players).filter(p=>p?.kind==="member").sort((a,b)=>Number(a.seatId||0)-Number(b.seatId||0));
    const artifactPool=[];for(const a of Array.isArray(cfg.artifacts)?cfg.artifacts:[]){const id=String(a?.artifactId||'');if(!id)continue;const catalog=await this.ctx.storage.get('roleCatalog:artifact:'+id);if(catalog?.roleCard)artifactPool.push({artifactId:id,name:catalog.roleCard.name,artifactCard:catalog.roleCard})}
    if(cfg.artifactsEnabled===true&&artifactPool.length!==cfg.artifacts.length)return j({ok:false,error:"TEMPLATE_ASSETS_MISSING",message:"Chưa nạp đủ Artifact của Ván Mẫu."},409);
    const plan=planPlayerRoomDeal(cfg.roles,members,secureShuffle,cfg.artifactsEnabled===true?artifactPool:[]);
    if(!plan.ok)return j({ok:false,error:plan.error,need:plan.need??null,have:plan.have??null},409);
    const old=await this.ctx.storage.get("pendingDeal"),round=Number(old?.round||0)+1;
    await this.ctx.storage.put("pendingDeal",{round,rows:plan.rows,members:members.map(m=>String(m.loginId||"")).sort(),roleKey:cfg.roles.map(r=>String(r.roleId||"")+":"+(Number(r.count)||1)).sort().join(","),artifactKey:artifactPool.map(a=>a.artifactId).sort().join(",")});
    return j({ok:true,dealRound:round})
  }
  // Seats must be locked; deals the template's roles at random, starts the match and the first night.
  async ownerStart(gm,meta,body){
    const phase=String(meta.phase||"lobby").toLowerCase();
    if(phase!=="lobby")return j({ok:false,error:"ROOM_NOT_IN_LOBBY",message:"Ván đã được bắt đầu."},409);
    if(meta.seatsLocked!==true)return j({ok:false,error:"SEATS_NOT_LOCKED",message:"Hãy chốt chỗ ngồi trước khi bắt đầu."},409);
    const cfg=await this.ctx.storage.get("gameConfig");if(!cfg||!Array.isArray(cfg.roles)||!cfg.roles.length)return j({ok:false,error:"TEMPLATE_NOT_SELECTED",message:"Hãy chọn Ván Mẫu trước."},409);
    const players=(await this.ctx.storage.get("players"))||{},members=Object.values(players).filter(p=>p?.kind==="member").sort((a,b)=>Number(a.seatId||0)-Number(b.seatId||0));
    const haveCards=new Set();for(const r of cfg.roles){const id=String(r.roleId||"");if(id&&!haveCards.has(id)&&await this.ctx.storage.get("roleCatalog:"+id))haveCards.add(id)}
    const missing=missingRoleCards(cfg.roles,id=>haveCards.has(id));
    if(missing.length)return j({ok:false,error:"TEMPLATE_ASSETS_MISSING",missing},409);
    const artifactPool=[];for(const a of Array.isArray(cfg.artifacts)?cfg.artifacts:[]){const id=String(a?.artifactId||'');if(!id)continue;const catalog=await this.ctx.storage.get('roleCatalog:artifact:'+id);if(catalog?.roleCard)artifactPool.push({artifactId:id,name:catalog.roleCard.name,artifactCard:catalog.roleCard})}
    if(cfg.artifactsEnabled===true&&artifactPool.length!==cfg.artifacts.length)return j({ok:false,error:"TEMPLATE_ASSETS_MISSING",message:"Chưa nạp đủ Artifact của Ván Mẫu."},409);
    let plan=planPlayerRoomDeal(cfg.roles,members,secureShuffle,cfg.artifactsEnabled===true?artifactPool:[]);
    if(!plan.ok)return j({ok:false,error:plan.error,need:plan.need??null,have:plan.have??null},409);
    const pending=await this.ctx.storage.get("pendingDeal");
    if(pending&&Array.isArray(pending.rows)&&pending.members?.join(",")===members.map(m=>String(m.loginId||"")).sort().join(",")&&pending.roleKey===cfg.roles.map(r=>String(r.roleId||"")+":"+(Number(r.count)||1)).sort().join(",")&&pending.artifactKey===artifactPool.map(a=>a.artifactId).sort().join(","))plan={ok:true,rows:pending.rows};
    await this.ctx.storage.delete("pendingDeal");
    const matchId="p"+Date.now().toString(36)+Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>b.toString(16).padStart(2,"0")).join("");
    const assigned=await this.gmAssign(gm,{assignments:plan.rows,matchId,matchRevision:1,deliveryVersion:1});if(!assigned.ok)return assigned;
    const started=await this.gmStart(gm,{matchId});if(!started.ok)return started;
    const fresh=await this.ctx.storage.get("meta");await this.applyCycle(fresh,"night",1,"night-1","auto");
    return j({ok:true,room:publicRoom(await this.ctx.storage.get("meta")),started:true})
  }
}
