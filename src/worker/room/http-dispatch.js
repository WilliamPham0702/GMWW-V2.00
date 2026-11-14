// Điểm vào HTTP của phòng: fetch, giới hạn tần suất, bảng định tuyến nội bộ.
import { authorizedPitr } from "../../gr01-pitr-auth.js";
import { ROOM_IDLE_TTL } from "../config.js";
import { j, safeJson } from "../http/responses.js";
import { randomToken, sha256 } from "../support/crypto.js";
import { validImageDataUrl } from "../support/images.js";
import { normalizeRoomName } from "../support/member-records.js";
import { normalizeRoomCode } from "../support/room-access.js";
import { villageLayout } from "../support/village-layout.js";
import { BACKUP_EXPORT_DO_PATH, handleBackupExportInDo } from "../../gmww-backup-export.js";
import { GMWW_WRITE_OPTIMIZER_VERSION } from "../../gmww-do-write-optimizer.js";
import { PLAYER_ROOM_CHECK_MS } from "../../gmww-player-room-policy.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { normalizeRoomMode, normalizeSeatCount, normalizeSeatMoveMode, sanitizeGameConfig } from "../../gmww-room-config-rules.js";
import { PUBLIC_ENTRY_LIMITS, stepPublicEntryWindow } from "../../gmww-security-admission.js";

export class RoomHttpDispatchMethods {
  // In-memory diagnostics only: counting saved writes must NOT create writes.
  gmwwWriteSkipped(kind){
    if(!this._gmwwWriteSavings)this._gmwwWriteSavings={startedAt:new Date().toISOString(),counts:{memberHeartbeat:0,memberSession:0,gmHeartbeat:0,roomDirectory:0}};
    if(Object.prototype.hasOwnProperty.call(this._gmwwWriteSavings.counts,kind))this._gmwwWriteSavings.counts[kind]++;
  }
  gmwwWriteOptimizerStatus(){
    const stats=this._gmwwWriteSavings||{startedAt:null,counts:{memberHeartbeat:0,memberSession:0,gmHeartbeat:0,roomDirectory:0}};
    return {ok:true,enabled:true,policyVersion:GMWW_WRITE_OPTIMIZER_VERSION,
      scope:'member-store-instance',since:stats.startedAt,counts:stats.counts,
      avoidedWrites:Object.values(stats.counts).reduce((sum,value)=>sum+value,0),
      estimateOnly:true,cloudflareBilledRows:null,
      note:'Chỉ thống kê ghi lặp được bỏ qua trong phiên Durable Object hiện tại; không phải tổng rows_written Cloudflare. Không xóa dữ liệu.'};
  }
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==="/gm/announcement"&&request.method==="PUT")return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    // GR01 recovery marker: internal DO stub requests only, read-only.
    // No Production restore route exists here; unconfigured credentials fail closed.
    // #773 read-only encrypted export; 404 unless dedicated backup secrets exist.
    if(path===BACKUP_EXPORT_DO_PATH)return handleBackupExportInDo(this.ctx,this.env,request,authorizedPitr);
    if(path==="/__gr01/pitr/bookmark"){
      if(request.method!=="POST"||!(await authorizedPitr(request,this.env?.GR01_INTERNAL_PITR_TOKEN)))
        return new Response("Not found",{status:404,headers:{"cache-control":"no-store"}});
      try{
        const bookmark=await this.ctx.storage.getCurrentBookmark();
        return j({ok:true,bookmark,databaseSize:this.ctx.storage.sql.databaseSize,readOnly:true,recordedAt:new Date().toISOString()});
      }catch{
        return j({ok:false,error:"PITR_UNAVAILABLE"},503);
      }
    }
    if(path==="/security/rate-limit"&&request.method==="POST")return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    // Serialize GM recovery reads with the authoritative alarm turn transition.
    if(path==="/gm/state"&&request.method==="GET")return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    if((path==="/global-settings/village-scene"&&request.method==="PUT")||(path==="/global-settings/village-scene/rollback"&&request.method==="POST")||(path==="/global-settings/village-scene/reset"&&request.method==="POST"))return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    if(request.method==='POST'&&['/owner/room-lock','/owner/quick-start','/owner/start','/owner/replay','/owner/auto','/player/setup','/player/move','/player/move-complete','/player/seat-swap','/gm/start','/gm/assign','/gm/config','/gm/enabled','/gm/delete','/gm/role-assets','/gm/move','/gm/seat','/gm/room-settings','/gm/seat-lock','/gm/stage','/gm/seats/randomize-remaining','/gm/cycle','/gm/turn','/gm/auto','/gm/end','/gm/reset','/members/record-result','/gm/interaction','/gm/battle-action','/gm/day-action','/gm/day-clock','/gm/demo','/gm/battle-undo','/gm/gallows','/player/gallows','/player/artifact-activate','/player/interaction/respond','/player/demo-action','/player/action','/join','/leave','/gm/participants','/gm/kick','/heartbeat','/player/state','/player/delivery-received','/player/chat/send','/gm/chat','/gm/chat/moderate'].includes(path))return this.ctx.blockConcurrencyWhile(async()=>{
      const response=await this.handleFetch(request),meta=await this.ctx.storage.get("meta");
      if(meta?.demo&&response.ok){
        if(path==="/gm/gallows")await this.ctx.storage.delete("demoPlan");
        const lease=await this.ctx.storage.get("demoLease");
        if(lease?.engine==="server"&&path!=="/gm/demo"&&lease.holdUntil){lease.holdUntil=0;await this.ctx.storage.put("demoLease",lease)}
        await this.scheduleRoomAlarm(meta);
      }
      return response;
    });
    return this.handleFetch(request);
  }
  async securityRateLimit(body){
    const policy=Object.values(PUBLIC_ENTRY_LIMITS).find(x=>x.key===String(body?.key||""));
    if(!policy)return j({ok:false,error:"UNKNOWN_ADMISSION_POLICY"},400);
    const previous=await this.ctx.storage.get("security-rate");
    const result=stepPublicEntryWindow(previous,policy,Date.now());
    if(result.allowed){
      await this.ctx.storage.put("security-rate",result.next);
      // A Durable Object holds one alarm only: admission writes must not postpone Auto GM.
      const meta=await this.ctx.storage.get("meta");
      if(meta&&String(meta.phase||"").toLowerCase()!=="deleted")await this.scheduleRoomAlarm(meta);
      else await this.ctx.storage.setAlarm(result.next.startedAt+policy.windowMs+1000);
    }
    return j({ok:result.allowed,retryAfterSeconds:result.retryAfterSeconds},result.allowed?200:429);
  }
  async handleFetch(request){
    const url=new URL(request.url);
    if(url.pathname==="/gm/announcement"&&request.method==="PUT")return this.gmAnnouncement(request,await safeJson(request));
    if(url.pathname==="/gm/announcement"&&request.method==="GET")return this.gmAnnouncementLibrary(request);
    if(url.pathname==="/player/announcement"&&request.method==="POST")return this.playerAnnouncement(await safeJson(request));
    if(url.pathname==="/security/rate-limit"&&request.method==="POST")return this.securityRateLimit(await safeJson(request));
    if(url.pathname==="/storage-optimizer/stats"&&request.method==="GET")return j(this.gmwwWriteOptimizerStatus());
    if(url.pathname==="/health/storage"&&request.method==="GET"){
      await this.ctx.storage.get("__gmww_health_read_only__");
      return j({ok:true,storage:"reachable"});
    }
    if(url.pathname==="/avatars/catalog"&&request.method==="GET")return this.customAvatarCatalog();
    if(url.pathname==="/avatars/upsert"&&request.method==="POST")return this.customAvatarUpsert(await safeJson(request));
    const customAvatarImagePath=url.pathname.match(/^\/avatars\/image\/(.+)$/);if(customAvatarImagePath&&request.method==="GET")return this.customAvatarImage(decodeURIComponent(customAvatarImagePath[1]));
    if(url.pathname==="/members/register"&&request.method==="POST")return this.memberRegister(await safeJson(request));
    if(url.pathname==="/members/login"&&request.method==="POST")return this.memberLogin(await safeJson(request));
    if(url.pathname==="/members/password"&&request.method==="POST")return this.memberChangePassword(request,await safeJson(request));
    if(url.pathname==="/members/reset-request"&&request.method==="POST")return this.memberRequestPasswordReset(await safeJson(request));
    if(url.pathname==="/members/admin-create"&&request.method==="POST")return this.memberAdminCreate(request,await safeJson(request));
    if(url.pathname==="/members/admin-edit"&&request.method==="POST")return this.memberAdminEdit(request,await safeJson(request));
    if(url.pathname==="/members/admin-reset"&&request.method==="POST")return this.memberAdminResetPassword(request,await safeJson(request));
    if(url.pathname==="/members/profile"&&request.method==="POST")return this.memberUpdateProfile(request,await safeJson(request));
    if(url.pathname==="/members/session"&&request.method==="GET")return this.memberSession(request);
    if(url.pathname==="/members/logout"&&request.method==="POST")return this.memberLogout(request);
    if(url.pathname==="/members/presence"&&request.method==="POST")return this.memberPresence(request,await safeJson(request));
    if(url.pathname==="/members/presence-internal"&&request.method==="POST")return this.memberPresenceInternal(await safeJson(request));
    if(url.pathname==="/members/record-result"&&request.method==="POST")return this.memberRecordResult(await safeJson(request));
    if(url.pathname==="/village/state"&&request.method==="GET")return this.villageState();
    if(url.pathname==="/village/move"&&request.method==="POST")return this.villageMove(request,await safeJson(request));
    if(url.pathname==="/player/seat-swap"&&request.method==="POST")return this.playerSeatSwap(await safeJson(request));
    if(url.pathname==="/members/directory"&&request.method==="GET")return this.memberDirectory();
    if(url.pathname==="/members/top3"&&request.method==="GET")return this.memberTop3();
    if(url.pathname==="/artifacts/shared/status"&&request.method==="GET")return this.sharedArtifactStatus();
    if(url.pathname==="/artifacts/shared"&&request.method==="PUT")return this.sharedArtifactPut(await safeJson(request));
    if(url.pathname==="/artifacts/shared/get"&&request.method==="GET")return this.sharedArtifactGet(url.searchParams.get("assetId"));
    if(url.pathname==="/artifacts/shared/image"&&request.method==="GET")return this.sharedArtifactImage(url.searchParams.get("assetId"),url.searchParams.get("signature"));
    if(url.pathname==="/game-templates/list"&&request.method==="GET")return this.gameTemplateList();
    if(url.pathname==="/game-templates/upsert"&&request.method==="PUT")return this.gameTemplateUpsert(await safeJson(request));
    if(url.pathname==="/game-templates/assets/status"&&request.method==="GET")return this.gameTemplateAssetsStatus(url.searchParams.get("id"));
    if(url.pathname==="/game-templates/assets"&&request.method==="GET")return this.gameTemplateAssetGet(url.searchParams.get("id"),url.searchParams.get("assetId"));
    if(url.pathname==="/game-templates/assets/image"&&request.method==="GET")return this.gameTemplateAssetImage(url.searchParams.get("id"),url.searchParams.get("assetId"),url.searchParams.get("revision"));
    if(url.pathname==="/game-templates/assets"&&request.method==="PUT")return this.gameTemplateAssetPut(await safeJson(request));
    if(url.pathname==="/game-templates/get"&&request.method==="GET")return this.gameTemplateGet(url.searchParams.get("id")||"");
    if(url.pathname==="/game-templates/delete"&&request.method==="DELETE")return this.gameTemplateDelete(url.searchParams.get("id")||"");
    if(url.pathname==="/game-templates/player-save"&&request.method==="PUT")return this.gameTemplatePlayerSave(await safeJson(request));
    if(url.pathname==="/members/admin-reset-ranking"&&request.method==="POST")return this.memberResetRanking(request);
    if(url.pathname==="/members/admin-clear-history"&&request.method==="DELETE")return this.memberClearHistory(request);
    if(url.pathname==="/matches/record"&&request.method==="POST")return this.matchRecord(await safeJson(request));
    if(url.pathname==="/matches/list"&&request.method==="GET")return this.matchList();
    if(url.pathname==="/matches/get"&&request.method==="GET")return this.matchGet(url.searchParams.get("matchId"));
    if(url.pathname==="/matches/clear"&&request.method==="DELETE")return this.matchClear(request);
    if(url.pathname==="/members/delete"&&request.method==="DELETE")return this.memberDelete(request,await safeJson(request));
    if(url.pathname==="/admin/reset-939"&&request.method==="GET")return this.adminReset939Status(request);
    if(url.pathname==="/admin/reset-939"&&request.method==="POST")return this.adminReset939Mark(request,await safeJson(request));
    if(url.pathname==="/directory/rooms/upsert"&&request.method==="POST")return this.roomDirectoryUpsert(await safeJson(request));
    if(url.pathname==="/directory/rooms/list"&&request.method==="GET")return this.roomDirectoryList(url);
    if(url.pathname==="/directory/rooms/delete"&&request.method==="POST")return this.roomDirectoryDelete(await safeJson(request));
    const ownerRoute=url.pathname.match(/^\/owner\/(state|room-lock|quick-start|seat-lock|seats-randomize|kick|room-settings|apply-template|roles-shuffle|start|end|replay|auto|stage|close)$/);if(ownerRoute)return this.ownerAction(ownerRoute[1],request);
    if(url.pathname==="/directory/player-rooms/reserve"&&request.method==="POST")return this.ctx.blockConcurrencyWhile(async()=>this.playerRoomReserve(await safeJson(request)));
    if(url.pathname==="/global-assets/victory"&&request.method==="GET")return this.globalAssetGet("globalAsset:victory","audio/mpeg");
    if(url.pathname==="/global-assets/victory"&&request.method==="PUT")return this.globalAssetPut(request,"globalAsset:victory","audio/mpeg",125000);
    if(url.pathname==="/global-assets/card-back"&&request.method==="GET")return this.globalAssetGet("globalAsset:cardBack","image/webp");
    if(url.pathname==="/global-assets/card-back"&&request.method==="PUT")return this.globalAssetPut(request,"globalAsset:cardBack","image/webp",125000);
    if(url.pathname==="/global-settings/village-scene"&&request.method==="GET")return this.sceneSettingsGet();
    const storedSceneImage=url.pathname.match(/^\/global-settings\/village-scene\/image\/(day|night)$/);
    if(storedSceneImage&&request.method==="GET")return this.sceneSettingsImage(storedSceneImage[1],url.searchParams.get("revision"));
    if(url.pathname==="/global-settings/village-scene"&&request.method==="PUT")return this.sceneSettingsPut(await safeJson(request));
    if(url.pathname==="/global-settings/village-scene/rollback"&&request.method==="POST")return this.sceneSettingsRollback(await safeJson(request));
    if(url.pathname==="/global-settings/village-scene/reset"&&request.method==="POST")return this.sceneSettingsReset();
    if(url.pathname==="/global-settings/ui"&&request.method==="GET")return this.globalUiSettingsGet();
    if(url.pathname==="/global-settings/ui"&&request.method==="PUT")return this.globalUiSettingsPut(await safeJson(request));
    if(url.pathname==="/global-settings/web-sync"&&request.method==="GET")return this.globalWebSyncGet();
    if(url.pathname==="/global-settings/web-sync"&&request.method==="POST")return this.globalWebSyncBump(await safeJson(request));
    if(url.pathname==="/global-settings/gm-presence"&&request.method==="GET")return this.globalGmPresenceGet();
    if(url.pathname==="/global-settings/lobby-reset"&&request.method==="POST")return this.globalLobbyResetBump(await safeJson(request));
    if(url.pathname==="/global-settings/gm-presence"&&request.method==="POST")return this.globalGmPresencePut(await safeJson(request));
    if(url.pathname==="/client-errors"&&request.method==="POST")return this.clientErrorAppend(await safeJson(request));
    if(url.pathname==="/client-errors"&&request.method==="GET")return this.clientErrorList();
    if(url.pathname==="/client-errors"&&request.method==="DELETE"){await this.ctx.storage.delete("clientErrorLog");return j({ok:true,items:[]})}
    if(url.pathname==="/global-settings/gm-push"&&request.method==="GET")return this.globalGmPushGet();
    if(url.pathname==="/global-settings/gm-push"&&request.method==="PUT")return this.globalGmPushPut(await safeJson(request));
    if(url.pathname==="/global-settings/gm-move"&&request.method==="POST")return this.globalGmMovePut(await safeJson(request));
    if(url.pathname==="/init"&&request.method==="POST"){
      if(await this.ctx.storage.get("meta"))return j({ok:false,error:"ROOM_EXISTS"},409);
      const b=await safeJson(request),now=new Date().toISOString(),gmToken=randomToken(32),cfg=sanitizeGameConfig(b?.gameConfig),roomName=normalizeRoomName(b?.roomName)||String(cfg?.name||"Làng Asahi"),roomMode=b?.demo===true?"online":normalizeRoomMode(b?.roomMode),seatMoveMode=normalizeSeatMoveMode(b?.seatMoveMode),seatCount=normalizeSeatCount(b?.seatCount,Number(cfg?.playerCount||0)||12),enabled=b&&Object.prototype.hasOwnProperty.call(b,"enabled")?b.enabled!==false:true,meta={code:normalizeRoomCode(b?.code||""),roomName,status:"waiting",phase:"lobby",locked:false,seatsLocked:false,gmStage:"room",gmStageRevision:0,enabled,autoGM:b?.demo===true?false:true,demo:b?.demo===true,roomMode,seatMoveMode,seatCount,seatLayout:villageLayout.recommendedSeatShape(seatCount),gameName:cfg?.name||"",playerCount:Number(cfg?.playerCount||0),createdAt:now,updatedAt:now,lastUsedAt:now,startedAt:null,roleDeliveredAt:null,gmTokenHash:await sha256(gmToken),...(b?.playerRoom===true?{playerRoom:true,quickPlay:b.quickPlay===true,ownerLoginId:String(b.ownerLoginId||""),ownerTokenHash:String(b.ownerTokenHash||""),emptySince:now}:{})};
      await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+(meta&&meta.playerRoom===true?PLAYER_ROOM_CHECK_MS:ROOM_IDLE_TTL))}catch(_){}await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);if(cfg)await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(b?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(b.cardBackImage));return j({ok:true,room:publicRoom(meta),gmToken},201);
    }
    if(url.pathname==="/state"&&request.method==="GET")return this.publicState();
    if(url.pathname==="/player/chat"&&request.method==="POST")return this.playerChatRead(await safeJson(request));
    if(url.pathname==="/player/chat/send"&&request.method==="POST")return this.playerChatSend(await safeJson(request));
    const playerVoice=url.pathname.match(/^\/player\/chat\/audio\/([a-f0-9-]{36})$/);
    if(playerVoice&&request.method==="POST")return this.chatVoiceRead({loginId:(await safeJson(request))?.loginId},playerVoice[1]);
    const gmVoice=url.pathname.match(/^\/gm\/chat\/audio\/([a-f0-9-]{36})$/);
    if(gmVoice&&request.method==="GET")return this.chatVoiceRead({gm:true,request},gmVoice[1]);
    if(url.pathname==="/gm/chat"&&request.method==="GET")return this.gmChatRead(request);
    if(url.pathname==="/gm/chat"&&request.method==="POST")return this.gmChatSend(request,await safeJson(request));
    if(url.pathname==="/gm/chat/moderate"&&request.method==="POST")return this.gmChatModerate(request,await safeJson(request));
    if(url.pathname==="/gm/state"&&request.method==="GET")return this.gmState(request);
    if(url.pathname==="/gm/action-log"&&request.method==="GET")return this.gmActionLog(request);
    if(url.pathname==="/gm/assign"&&request.method==="POST")return this.gmAssign(request,await safeJson(request));
    if(url.pathname==="/gm/start"&&request.method==="POST")return this.gmStart(request,await safeJson(request));
    if(url.pathname==="/gm/config"&&request.method==="POST")return this.gmConfig(request,await safeJson(request));
    if(url.pathname==="/gm/role-assets"&&request.method==="POST")return this.gmRoleAssets(request,await safeJson(request));
    if(url.pathname==="/gm/artwork-refs"&&request.method==="POST")return this.gmArtworkRefs(request,await safeJson(request));
    if(url.pathname==="/gm/artwork-manifest"&&request.method==="GET")return this.gmArtworkManifest(request);
    const roleAssetImage=url.pathname.match(/^\/role-assets\/([^/]+)\/image$/);if(roleAssetImage&&request.method==="GET")return this.roleAssetImage(decodeURIComponent(roleAssetImage[1]));
    if(url.pathname==="/gm/interaction"&&request.method==="POST")return this.gmInteraction(request,await safeJson(request));
    if(url.pathname==="/gm/battle-action"&&request.method==="POST")return this.gmBattleAction(request,await safeJson(request));
    if(url.pathname==="/gm/day-action"&&request.method==="POST")return this.gmDayAction(request,await safeJson(request));
    if(url.pathname==="/gm/day-clock"&&request.method==="POST")return this.gmDayClock(request,await safeJson(request));
    if(url.pathname==="/gm/battle-undo"&&request.method==="POST")return this.gmBattleUndo(request,await safeJson(request));
    if(url.pathname==="/gm/gallows"&&request.method==="POST")return this.gmGallows(request,await safeJson(request));
    if(url.pathname==="/gm/participants"&&request.method==="POST")return this.gmParticipants(request,await safeJson(request));
    if(url.pathname==="/gm/room-settings"&&request.method==="POST")return this.gmRoomSettings(request,await safeJson(request));
    if(url.pathname==="/gm/stage"&&request.method==="POST")return this.gmStage(request,await safeJson(request));
    if(url.pathname==="/gm/seat"&&request.method==="POST")return this.gmSeat(request,await safeJson(request));
    if(url.pathname==="/gm/seats/randomize-remaining"&&request.method==="POST")return this.gmRandomizeRemainingSeats(request);
    if(url.pathname==="/gm/move"&&request.method==='POST'){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const b=await safeJson(request),players=await this.ctx.storage.get('players')||{},p=players[String(b?.participantId||'')];if(!p)return j({ok:false,error:'PLAYER_NOT_FOUND'},404);return this.playerMove({...b,loginId:p.loginId})}
    if(url.pathname==="/gm/seat-lock"&&request.method==="POST")return this.gmSeatLock(request,await safeJson(request));
    if(url.pathname==="/gm/cycle"&&request.method==="POST")return this.gmCycle(request,await safeJson(request));
    if(url.pathname==="/gm/turn"&&request.method==="POST")return this.gmTurn(request,await safeJson(request));
    if(url.pathname==="/gm/demo"&&request.method==="POST")return this.gmDemo(request,await safeJson(request));
    if(url.pathname==="/gm/auto"&&request.method==="POST")return this.gmAuto(request,await safeJson(request));
    if(url.pathname==="/gm/enabled"&&request.method==="POST")return this.gmEnabled(request,await safeJson(request));
    if(url.pathname==="/gm/lock"&&request.method==="POST")return this.gmLock(request,await safeJson(request));
    if(url.pathname==="/gm/kick"&&request.method==="POST")return this.gmKick(request,await safeJson(request));
    if(url.pathname==="/gm/rename"&&request.method==="POST")return this.gmRename(request,await safeJson(request));
    if(url.pathname==="/gm/reset"&&request.method==="POST")return this.gmReset(request,await safeJson(request));
    if(url.pathname==="/gm/end"&&request.method==="POST")return this.gmEnd(request,await safeJson(request));
    if(url.pathname==="/gm/delete"&&request.method==="POST")return this.gmDelete(request);
    if(url.pathname==="/player/state"&&request.method==="POST")return this.playerState(await safeJson(request));
    if(url.pathname==="/player/drunk/draw"&&request.method==="POST")return this.playerDrunkDraw(await safeJson(request));
    if(url.pathname==="/player/peek/decide"&&request.method==="POST")return this.playerPeekDecide(await safeJson(request));
    if(url.pathname==="/player/ghost/word"&&request.method==="POST")return this.playerGhostWord(await safeJson(request));
    if(url.pathname==="/player/thief/choose"&&request.method==="POST")return this.playerThiefChoose(await safeJson(request));
    if(url.pathname==="/player/delivery-received"&&request.method==="POST")return this.playerDeliveryReceived(await safeJson(request));
    if(url.pathname==="/player/role-viewed"&&request.method==="POST")return this.playerRoleViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-viewed"&&request.method==="POST")return this.playerArtifactViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-activate"&&request.method==="POST")return this.playerArtifactActivate(await safeJson(request));
    if(url.pathname==="/player/interaction/respond"&&request.method==="POST")return this.playerInteractionRespond(await safeJson(request));
    if(url.pathname==="/player/gallows"&&request.method==="POST")return this.playerGallows(await safeJson(request));
    if(url.pathname==="/player/demo-action"&&request.method==="POST")return this.playerDemoAction(await safeJson(request));
    if(url.pathname==="/player/action"&&request.method==="POST")return this.playerPhaseAction(await safeJson(request),true);
    if(url.pathname==="/player/undo-action"&&request.method==="POST")return this.playerPhaseUndo(await safeJson(request));
    if(url.pathname==="/player/setup"&&request.method==="POST")return this.playerSetup(await safeJson(request));
    if(url.pathname==="/player/move"&&request.method==="POST")return this.playerMove(await safeJson(request));
    if(url.pathname==="/player/move-complete"&&request.method==="POST")return this.playerMoveComplete(await safeJson(request));
    if(url.pathname==="/join"&&request.method==="POST")return this.join(await safeJson(request));
    if(url.pathname==="/ready"&&request.method==="POST")return this.ready(await safeJson(request));
    if(url.pathname==="/heartbeat"&&request.method==="POST")return this.heartbeat(await safeJson(request));
    if(url.pathname==="/leave"&&request.method==="POST")return this.leave(await safeJson(request));
    if(url.pathname==="/websocket")return this.websocket(request,url);
    return new Response("Not found",{status:404});
  }
}
