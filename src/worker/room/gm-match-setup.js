// Dựng ván của GM: phân vai, bắt đầu, cấu hình, đồng hồ ngày.
import { j } from "../http/responses.js";
import { extractRoleImage, validImageDataUrl } from "../support/images.js";
import { villageLayout } from "../support/village-layout.js";
import { shiftDayClock } from "../../gmww-day-clock.js";
import { buildPrivateDeliverySnapshot } from "../../gmww-delivery-snapshot.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { mergePlayerRoleCard, sanitizePlayerArtifactCard, sanitizePlayerRoleCard } from "../../gmww-private-card-contract.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { normalizeSeatCount, sanitizeGameConfig } from "../../gmww-room-config-rules.js";
import { clearPlayerMovement, publicPlayer } from "../../gmww-village-player-state.js";

export class RoomGmMatchSetupMethods {
  async gmAssign(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},rows=Array.isArray(body?.assignments)?body.assignments:[],cfg=(await this.ctx.storage.get("gameConfig"))||null,multiAssign=body?.multiAssign===true;
    if(!rows.length)return j({ok:false,error:"NO_ASSIGNMENTS",message:"Chưa có dữ liệu phân vai."},400);
    const catalog=new Map((Array.isArray(cfg?.roles)?cfg.roles:[]).map(r=>[String(r?.roleId||""),r]));
    const seen=new Set(),clean=[];
    for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
      const row=rows[rowIndex],loginId=normalizeLoginId(row?.loginId),key="member:"+loginId,p=players[key];
      if(!loginId||!p||p.kind!=="member")return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Có Thành Viên chưa ở trong phòng."},400);
      if(!multiAssign&&seen.has(loginId))return j({ok:false,error:"DUPLICATE_PLAYER",message:"Một Thành Viên đang nhận nhiều hơn một Vai Trò. Hãy bật Đa Nhân."},400);
      seen.add(loginId);
      const requestedRoleId=String(row?.roleId||row?.id||row?.role?.id||row?.role?.roleId||"");
      const snap=catalog.get(requestedRoleId)||{},pkg=(await this.ctx.storage.get("roleCatalog:"+requestedRoleId))||{};
      const incomingCard=sanitizePlayerRoleCard(row?.roleCard||row),savedCard=pkg.roleCard||{},merged=mergePlayerRoleCard(savedCard,incomingCard),artworkAssetId=String(row?.artworkAssetId||row?.artworkId||merged.artworkAssetId||merged.artworkId||pkg.artworkAssetId||pkg.artworkId||("role:"+requestedRoleId)).slice(0,180),incomingImage=extractRoleImage(row)||extractRoleImage(row?.role);
      if(incomingImage){await this.ctx.storage.put("artworkAsset:"+artworkAssetId,incomingImage);await this.ctx.storage.put("roleAsset:"+requestedRoleId,incomingImage)}
      const storedImage=(await this.ctx.storage.get("artworkRef:"+artworkAssetId))||(await this.ctx.storage.get("artworkAsset:"+artworkAssetId))||((!pkg.artworkAssetId&&!pkg.artworkId)?await this.ctx.storage.get("roleAsset:"+requestedRoleId):null),roleCard={...merged,artworkAssetId,artworkId:artworkAssetId};
      const roleName=String(roleCard.name||row?.roleName||row?.name||pkg.roleName||snap.roleName||"Vai Trò").slice(0,120);
      const faction=roleCard.faction??row?.faction??row?.factionName??pkg.faction??snap.faction??"";
      const description=String(roleCard.information??row?.description??row?.roleDescription??pkg.description??snap.description??"").slice(0,6000);
      const imageKey=artworkAssetId||requestedRoleId,roleImage="/api/rooms/"+encodeURIComponent(meta.code)+"/role-assets/"+encodeURIComponent(imageKey)+"/image";
      const artifactRaw=(row?.artifact&&typeof row.artifact==="object")?row.artifact:(row?.artifactId?{artifactId:row.artifactId,artifactName:row.artifactName,artifactCard:row.artifactCard,artworkAssetId:row.artifactArtworkAssetId,artworkId:row.artifactArtworkId,image:row.artifactImage}:null);
      let artifact=null;
      if(artifactRaw){
        const artifactId=String(artifactRaw?.artifactId||artifactRaw?.id||artifactRaw?.artifactCard?.id||"").slice(0,120);
        if(artifactId){
          const sharedArtifactCatalog=(await this.ctx.storage.get("roleCatalog:artifact:"+artifactId))||{};
          const artifactCard=sanitizePlayerArtifactCard(artifactRaw?.artifactCard||sharedArtifactCatalog.roleCard||artifactRaw),artifactAssetId=String(artifactRaw?.artworkAssetId||artifactRaw?.artworkId||artifactCard.artworkAssetId||artifactCard.artworkId||("artifact:"+artifactId)).slice(0,180),artifactImageData=extractRoleImage(artifactRaw);
          if(artifactImageData)await this.ctx.storage.put("artworkAsset:"+artifactAssetId,artifactImageData);
          const artifactStoredImage=(await this.ctx.storage.get("artworkRef:"+artifactAssetId))||await this.ctx.storage.get("artworkAsset:"+artifactAssetId),artifactImage="/api/rooms/"+encodeURIComponent(meta.code)+"/role-assets/"+encodeURIComponent(artifactAssetId)+"/image";
          artifact={loginId,matchId:String(body?.matchId||meta.matchId||""),matchRevision:Number(body?.matchRevision||meta.matchRevision||0),artifactId,artifactName:String(artifactCard.name||artifactRaw?.artifactName||artifactRaw?.name||"Artifact").slice(0,120),description:String(artifactCard.information||artifactRaw?.description||"").slice(0,6000),artifactImage,artworkAssetId:artifactAssetId,artworkId:artifactAssetId,artworkAvailable:!!artifactStoredImage,artifactCard:{...artifactCard,artworkAssetId:artifactAssetId,artworkId:artifactAssetId},singleUse:artifactCard.singleUse===true,priorityFirst:artifactCard.priorityFirst===true,deliveredAt:new Date().toISOString(),viewedAt:null,usedAt:null};
        }
      }
      clean.push({assignmentIndex:rowIndex,loginId,displayName:p.displayName,matchId:String(body?.matchId||meta.matchId||""),matchRevision:Number(body?.matchRevision||meta.matchRevision||0),roleId:requestedRoleId,roleName,faction,description,order:Number(row?.order??snap.order??0),roleImage,artworkAssetId,artworkId:artworkAssetId,artworkAvailable:!!storedImage,roleCard,playerCardVersion:Number(row?.playerCardVersion||roleCard.version||7),deliveredAt:new Date().toISOString(),viewedAt:null,artifact});
    }
    const nextPublishedAt=new Date().toISOString(),nextMatchId=String(body?.matchId||meta.matchId||""),nextMatchRevision=Number(body?.matchRevision||meta.matchRevision||0),nextDeliveryVersion=Number(body?.deliveryVersion||meta.deliveryVersion||0);
    for(const prefix of ["role:","roles:","artifact:","artifactUse:"]){const old=await this.ctx.storage.list({prefix});if(old.size)await this.ctx.storage.delete([...old.keys()])}
    const grouped=new Map();for(const row of clean){const a=grouped.get(row.loginId)||[];a.push(row);grouped.set(row.loginId,a)}
    for(const [loginId,list] of grouped){
      await this.ctx.storage.put("roles:"+loginId,list);await this.ctx.storage.put("role:"+loginId,list[0]);
      const artifact=list.find(x=>x?.artifact)?.artifact||null;if(artifact)await this.ctx.storage.put("artifact:"+loginId,artifact);
      // The snapshot contains both private cards in one durable entry, committed before room release.
      await this.ctx.storage.put("deliverySnapshot:"+loginId,buildPrivateDeliverySnapshot({matchId:nextMatchId,matchRevision:nextMatchRevision,deliveryVersion:nextDeliveryVersion,publishedAt:nextPublishedAt,roles:list}));
    }
    const summary=clean.map(({assignmentIndex,loginId,displayName,matchId,matchRevision,roleId,roleName,faction,order,deliveredAt,viewedAt,artifact})=>({assignmentIndex,loginId,displayName,matchId,matchRevision,roleId,roleName,faction,order,deliveredAt,viewedAt,artifactId:artifact?.artifactId||null,artifactName:artifact?.artifactName||null,artifactDeliveredAt:artifact?.deliveredAt||null,artifactViewedAt:artifact?.viewedAt||null,artifactUsedAt:artifact?.usedAt||null,artifactPriorityFirst:artifact?artifact.priorityFirst===true:null,artifactSingleUse:artifact?.singleUse===true}));
    await this.ctx.storage.put("assignments",summary);
    meta.multiAssign=multiAssign;meta.matchId=String(body?.matchId||meta.matchId||"")||null;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.deliveryVersion=nextDeliveryVersion;meta.phase="role_delivery";meta.status="role_delivery";meta.gmStage="deal";meta.roleDeliveredAt=nextPublishedAt;meta.updatedAt=meta.roleDeliveredAt;await this.ctx.storage.put("meta",meta);
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta),assignments:summary,multiAssign});
  }
  async gmStart(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,assignments=(await this.ctx.storage.get("assignments"))||[],
      incomingMatchId=String(body?.matchId||"");
    if(!assignments.length)return j({ok:false,error:"ROLES_NOT_DELIVERED",message:"Hãy phân và phát Vai Trò trước khi bắt đầu."},409);
    if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)
      return j({ok:false,error:"MATCH_MISMATCH",message:"Dữ liệu Phòng thuộc một ván khác. Hãy Phát Vai lại."},409);
    const players=(await this.ctx.storage.get("players"))||{},
      members=Object.values(players).filter(p=>p?.kind==="member"),
      seatCount=normalizeSeatCount(meta.seatCount,members.length||12);
    if(members.length>seatCount)return j({ok:false,error:"SEATING_INCOMPLETE",
      message:"Số người lớn hơn số seat. Vui lòng chọn đủ seat trước khi Vào Trận."},409);
    const projected=villageLayout.projectedSeatIds(members,seatCount),
      anchors=villageLayout.positions(seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing);
    // Revalidate every roster member before changing match state. Preserve all
    // valid seat IDs, repair only absent/duplicate IDs, and terminate stale
    // pre-match wander animations before the first in-match frame is published.
    for(const p of members){
      const key=String(p.participantId||(p.loginId?"member:"+p.loginId:"")),
        seat=projected[key],point=anchors[seat-1];
      if(!seat||!point)return j({ok:false,error:"SEATING_INCOMPLETE",
        message:"Chưa thể xác định vị trí cho tất cả người chơi."},409);
      p.seatId=seat;
      clearPlayerMovement(p,{keepPosition:true});
      p.positionX=point.x;p.positionY=point.y;
    }
    if(incomingMatchId)meta.matchId=incomingMatchId;
    meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);
    meta.deliveryVersion=Number(body?.deliveryVersion||meta.deliveryVersion||0);
    meta.phase="running";meta.status="running";meta.gmStage="battle";
    // V3.305: every real match enters with Auto GM ON (a previous match may have paused it).
    if(meta.demo!==true)meta.autoGM=true;
    meta.locked=false;meta.seatsLocked=true;meta.startedAt=new Date().toISOString();meta.endedAt=null;
    await this.ctx.storage.put("players",players);
    await this.ctx.storage.put("interactions",[]);
    meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=Number(meta.resultVersion||0);
    meta.updatedAt=meta.startedAt;await this.ctx.storage.put("meta",meta);
    if(meta.demo){
      meta.autoGM=false;await this.ctx.storage.put("meta",meta);await this.ctx.storage.delete("demoClock");await this.ctx.storage.delete("demoPlan");
      await this.ctx.storage.put("demoLease",{engine:"server",matchId:String(meta.matchId||""),running:true,speed:1,until:0,owner:"",steps:0,startedAt:Date.now()});
    }
    await this.scheduleRoomAlarm(meta);
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});
    return j({ok:true,room:publicRoom(meta)});
  }
  async gmConfig(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,cfg=sanitizeGameConfig(body?.gameConfig);if(!cfg)return j({ok:false,error:"INVALID_GAME_CONFIG",message:"Ván Mẫu không hợp lệ."},400);await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(body?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(body.cardBackImage));const nextMatchId=String(body?.matchId||"");
    // A finished room can be reused without a destructive reset. Start the next
    // match with a clean live result while keeping matchCompletion:* history.
    if(nextMatchId&&meta.endedAt&&String(meta.lastEndedMatchId||meta.matchId||"")!==nextMatchId){
      meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;
      meta.lastEndedMatchId=null;meta.reopenAt=null;meta.resultVersion=0;
    }
    if(nextMatchId)meta.matchId=nextMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.gameName=cfg.name||meta.gameName||"";meta.playerCount=Number(cfg.playerCount||0);meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);await this.scheduleRoomAlarm(meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta),gameConfig:cfg})}
  async gmDayClock(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.cyclePhase||'').toLowerCase();
    if(String(meta.phase||'').toLowerCase()!=='running'||!['day','morning'].includes(phase))
      return j({ok:false,error:'DAY_PHASE_REQUIRED'},409);
    if(String(body?.matchId||'')!==String(meta.matchId||'')||String(body?.cycleKey||'')!==String(meta.cycleKey||''))
      return j({ok:false,error:'STALE_DAY_CLOCK'},409);
    const cfg=(await this.ctx.storage.get('gameConfig'))||{},updated=shiftDayClock(meta,cfg,body?.deltaMinutes,Date.now());
    if(!updated)return j({ok:false,error:'INVALID_DELTA'},400);
    meta.dayDeadlineAt=updated.dayDeadlineAt;meta.autoPausedRemainingMs=updated.autoPausedRemainingMs;
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;
    await this.ctx.storage.put('meta',meta);
    const room=publicRoom(meta);
    this.broadcast({type:'room_state',room,serverTime:Date.now()});
    await this.scheduleRoomAlarm(meta);
    return j({ok:true,room,remainingSeconds:Math.ceil(updated.remainingMs/1000),serverTime:Date.now()});
  }
}
