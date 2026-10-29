import {armDoubleGallows,nextDoubleGallows} from "./gmww-double-gallows.js";
import {serverDemoActive,nextServerDemoDue,runServerDemo,stopServerDemo,demoPlayerActions,playerOfferedActions} from "./gmww-demo-runner.js";
import {chatPolicy,chatNormalizeText} from "./gmww-online-chat-policy.js";
import {hunterLinkedDeaths} from "./gmww-hunter-death-rules.js";
import {resolveLinkedDeaths} from "./gmww-linked-death-rules.js";
import {resolveElderBell} from "./gmww-elder-bell-rules.js";
import {resolvePassiveWolfBite,wolfCubBiteQuota,oldManAgeVictims,cursedConversionsDue,apprenticeSeersDue,bigfootWolfDue,factionRoleTransitionsDue,activePackAtNight} from "./gmww-card-night-passives.js";
import {resolveDayArtifactInspection} from "./gmww-day-artifact-inspection.js";
import {validateUnrevealedArtifactDestroy} from "./gmww-artifact-destruction.js";
import {planArtifactRoleSwap} from "./gmww-artifact-role-swap.js";
import {validateArtifactSteal,eligibleArtifactReplacements,applyArtifactStealSummary,artifactForNewOwner} from "./gmww-artifact-steal.js";
import {projectDemoClock,nextDemoClock} from "./gmww-demo-clock.js";
import {character40Catalog,character40Image} from "./gmww-character40-catalog.js";
import { pruneInteractions } from "./gmww-interaction-retention.js";
import {dayClockRemainingMs,shiftDayClock} from "./gmww-day-clock.js";
import {gallowsSnapshot,gallowsNominate,gallowsBegin,gallowsCast,gallowsBan,gallowsResolve,gallowsOpen,gallowsDurationSec,gallowsSetRestriction,gallowsSetMode,gallowsManualVote,gallowsManualResolve,gallowsSelectCandidate,gallowsMode,gallowsNominationTotals,gallowsAutomaticNominee,gallowsAutomaticOutcome,gallowsBlockedNomination,gallowsBlockedVotes,gallowsSetDuration,gallowsCloseNomination,resolveFoolGallows} from "./gmww-gallows-rules.js";
import {STATUS_DEFS,STATUS_VISUAL_IDS,activeStatusRows,confirmedNightStatusVisuals,statusTagsFor,roomUiStage,publicRoom} from "./gmww-public-room-contract.js";
import {GAME_CHARACTER_COUNT,normalizeLoginId,normalizeGameCharacterId,activeGameCharacterId,normalizeCharacterScale} from "./gmww-player-identity-rules.js";
import {ROOM_PLAYER_TTL,normalizeVillageCoord,currentMovementPosition,clearPlayerMovement,normalizeSeatLayout,normalizeSeatId,firstFreeSeat,enforceUniqueSeatClaims,playerSetupComplete,roomPlayerPresence,villagePresence,publicPlayer} from "./gmww-village-player-state.js";
import { sanitizeGameConfig, normalizeRoomMode, normalizeSeatMoveMode, normalizeSeatCount } from "./gmww-room-config-rules.js";
import { sanitizePlayerRoleCard, mergePlayerRoleCard, privateRole, sanitizePlayerArtifactCard, privateArtifact } from "./gmww-private-card-contract.js";
import { isBattleActorBlocked } from "./gmww-battle-actor-eligibility.js";
import { expireCycleEffects } from "./gmww-cycle-effect-expiry.js";
import { resolveWolfNight, readNightAssignments, isNightImmune, resolveNightReveal, canSnowWolfBite, resolveMaidenNight, resolveStrongmanWolfBite } from "./gmww-wolf-night-resolution.js";
import { wolfPackMembers, shouldWakeWolfPack, privateWolfRecognition, privateRoleGroupRecognition } from "./gmww-wolf-recognition.js";
import {releaseCatalog} from "./gmww-release-catalog.js";
import {releaseBases} from "./gmww-release-bases.js";
import {selectBuildVerifiedManifest,selectCatalogDelta} from "./gmww-release-catalog-policy.js";
import "../assets/village/village-layout.js";
const villageLayout=globalThis.GMWW_VILLAGE_LAYOUT;
import { DurableObject } from "cloudflare:workers";
import { shouldSkipMemberHeartbeat, shouldSkipMemberSessionTouch, shouldSkipGmHeartbeat, shouldSkipDirectoryHeartbeat, GMWW_WRITE_OPTIMIZER_VERSION } from "./gmww-do-write-optimizer.js";
import { authorizedPitr } from "./gr01-pitr-auth.js";
import { combineConfiguredTurns, groupConfiguredRoleTurns, jumpTarget } from "./gmww-night-turn-rules.js";
import { resolveRoleActionPolicy, checkBattleRoleActionUsage, appendBattleRoleActionUsage } from "./gmww-battle-action-policy.js";
import { oldWitchActionCheck } from "./gmww-old-witch-rules.js";
import { isWolfRole,packMembers,alphaPackState,previousNightTargets,arrangeNightRoles } from "./gmww-pack-night-rules.js";
import { partitionNightSpecialRoles,witchSaveTargetAllowed } from "./gmww-witch-drunk-clone-rules.js";
import { inheritedRolePlans } from "./gmww-role-inheritance-rules.js";
import {drunkDeadCards,drunkDeckView,isPassiveInformationAction} from "./gmww-drunk-draw-rules.js";
import { gmwwMembersPage } from "./gmww-members-page.js";
import { gmwwMembersLiveScript } from "./gmww-members-live.js";
import { patchPrivatePlayerCards } from "./gmww-player-private-card-patch.js";
import { buildPrivateDeliveryManifest, validPrivateDeliveryAcknowledgment } from "./gmww-delivery-manifest.js";
import { buildPrivateDeliverySnapshot, currentPrivateDeliverySnapshot, privateDeliveryRoles, privateDeliveryArtifact } from "./gmww-delivery-snapshot.js";
import { GMWW_MEMBER_AVATARS, GMWW_MEMBER_AVATAR_IDS } from "./gmww-avatars.js";
import { defaultPriorityFirst, artifactCycleKey, reserveArtifactActivation } from "./gmww-game-scene-rules.js";
import { seatClaimConflict, movementArrivalReady, movementRemainingMs } from "./gmww-seat-movement-rules.js";
import { villageAutoLife, villageAutoPoint, VILLAGE_AUTO_SIT_MS } from "./gmww-village-autolife.js";
import { CHARACTER_ENGINE_VERSION, CHARACTER_MASTER, createCharacterManifest, characterStateFromPlayer } from "./gmww-character-engine.js";
import { characterV4Status } from "./gmww-character-v4.js";
import { PUBLIC_ENTRY_LIMITS, publicEntryPolicy, stepPublicEntryWindow } from "./gmww-security-admission.js";
import { recoverLegacyRuntimeManifest } from "./gmww-runtime-recovery.js";
import { isRuntimePackageReady } from "./gmww-update-readiness.js";
import { gmwwManifestNotesForInstalled } from "./gmww-update-release-notes.js";
import { selectLegacyV350RuntimeDelta, selectVerifiedRuntimeV352Delta, selectVerifiedRuntimeV353Delta, selectVerifiedRuntimeV354Delta, selectVerifiedRuntimeV358Delta, selectVerifiedRuntimeV359Delta, selectVerifiedRuntimeV360Delta, selectVerifiedRuntimeV361Delta, selectVerifiedRuntimeV362Delta, selectVerifiedRuntimeV363Delta, selectVerifiedRuntimeV364Delta, selectVerifiedRuntimeV365Delta, selectVerifiedRuntimeV366Delta, selectVerifiedRuntimeV367Delta, selectVerifiedRuntimeV368Delta, selectVerifiedRuntimeV369Delta, selectVerifiedRuntimeV370Delta, selectVerifiedRuntimeV371Delta, selectVerifiedRuntimeV372Delta, selectVerifiedRuntimeV373Delta, selectVerifiedRuntimeV375Delta, selectVerifiedRuntimeV376Delta, selectVerifiedRuntimeV377Delta, selectVerifiedRuntimeV378Delta, selectVerifiedRuntimeV381Delta, selectVerifiedRuntimeV382Delta, selectVerifiedRuntimeV383Delta, selectVerifiedRuntimeV385Delta, selectVerifiedRuntimeV386Delta, selectVerifiedRuntimeV387Delta, selectVerifiedRuntimeV388Delta, selectVerifiedRuntimeV389Delta, selectVerifiedRuntimeV390Delta, selectVerifiedRuntimeV391Delta, selectVerifiedRuntimeV392Delta, selectVerifiedRuntimeV393Delta, selectVerifiedRuntimeV394Delta, selectVerifiedRuntimeV395Delta, selectVerifiedRuntimeV396Delta, selectVerifiedRuntimeV397Delta, selectVerifiedRuntimeV398Delta, selectVerifiedRuntimeV399Delta, selectVerifiedRuntimeV3100Delta, selectVerifiedRuntimeV3101Delta, selectVerifiedRuntimeV3103Delta, selectVerifiedRuntimeV3104Delta } from "./gmww-ota-delta.js";

const PROJECT="GMWW-V2.00",VERSION="V3.273",NATIVE_SHELL_VERSION="3.264",UPDATE_CHANNEL_REV="runtime-3273-player-online-village",ROOM_IDLE_TTL=72*60*60*1000,ROOM_RESULT_REOPEN_DELAY=10000,ROOM_DIRECTORY_LEASE=180*1000,ROOM_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",ROOM_CODE_LENGTH=6;
const LOGIN_RE=/^[A-Za-z0-9._]{4,20}$/,SESSION_TTL=30*24*60*60*1000,PBKDF2_ITERATIONS=100000,MEMBER_STORE_NAME="__GMWW_MEMBERS__",PRESENCE_TTL=90000;
const GM_SYNC_TOKEN="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";
const GM_PRESENCE_TTL=75000;
function publicGmPresence(rec,online=true){
  if(!online)return{online:false,sessionId:"",sessionStartedAt:0,lastSeenAt:0,roomCode:""};
  const num=k=>Number.isFinite(Number(rec?.[k]))?Number(rec[k]):null;
  const roomCode=normalizeRoomCode(rec?.roomCode||"");return{online:true,sessionId:String(rec?.sessionId||""),sessionStartedAt:Math.max(0,Number(rec?.sessionStartedAt||rec?.lastSeenAt||0)),lastSeenAt:Math.max(0,Number(rec?.lastSeenAt||0)),roomCode:isValidRoomCode(roomCode)?roomCode:"",moveFromX:num("moveFromX"),moveFromY:num("moveFromY"),moveToX:num("moveToX"),moveToY:num("moveToY"),moveStartedAt:Math.max(0,Number(rec?.moveStartedAt||0)),moveDurationMs:Math.max(0,Number(rec?.moveDurationMs||0)),manualUntil:Math.max(0,Number(rec?.manualUntil||0))};
}

export class RoomDurableObject extends DurableObject {
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
    // GR01 recovery marker: internal DO stub requests only, read-only.
    // No Production restore route exists here; unconfigured credentials fail closed.
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
    if((path==="/global-settings/village-scene"&&request.method==="PUT")||(path==="/global-settings/village-scene/rollback"&&request.method==="POST")||(path==="/global-settings/village-scene/reset"&&request.method==="POST"))return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    if(request.method==='POST'&&['/player/setup','/player/move','/player/move-complete','/player/seat-swap','/gm/start','/gm/assign','/gm/config','/gm/enabled','/gm/delete','/gm/role-assets','/gm/move','/gm/seat','/gm/room-settings','/gm/seat-lock','/gm/stage','/gm/seats/randomize-remaining','/gm/cycle','/gm/turn','/gm/auto','/gm/end','/gm/reset','/members/record-result','/gm/interaction','/gm/battle-action','/gm/day-action','/gm/day-clock','/gm/demo','/gm/battle-undo','/gm/gallows','/player/gallows','/player/artifact-activate','/player/interaction/respond','/player/demo-action','/player/action','/join','/leave','/gm/participants','/gm/kick','/heartbeat','/player/state','/player/delivery-received','/player/chat/send','/gm/chat/moderate'].includes(path))return this.ctx.blockConcurrencyWhile(async()=>{
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
      await this.ctx.storage.setAlarm(result.next.startedAt+policy.windowMs+1000);
    }
    return j({ok:result.allowed,retryAfterSeconds:result.retryAfterSeconds},result.allowed?200:429);
  }
  async handleFetch(request){
    const url=new URL(request.url);
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
    if(url.pathname==="/members/admin-reset-ranking"&&request.method==="POST")return this.memberResetRanking(request);
    if(url.pathname==="/members/admin-clear-history"&&request.method==="DELETE")return this.memberClearHistory(request);
    if(url.pathname==="/members/delete"&&request.method==="DELETE")return this.memberDelete(request,await safeJson(request));
    if(url.pathname==="/admin/reset-939"&&request.method==="GET")return this.adminReset939Status(request);
    if(url.pathname==="/admin/reset-939"&&request.method==="POST")return this.adminReset939Mark(request,await safeJson(request));
    if(url.pathname==="/directory/rooms/upsert"&&request.method==="POST")return this.roomDirectoryUpsert(await safeJson(request));
    if(url.pathname==="/directory/rooms/list"&&request.method==="GET")return this.roomDirectoryList(url);
    if(url.pathname==="/directory/rooms/delete"&&request.method==="POST")return this.roomDirectoryDelete(await safeJson(request));
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
    if(url.pathname==="/global-settings/gm-move"&&request.method==="POST")return this.globalGmMovePut(await safeJson(request));
    if(url.pathname==="/init"&&request.method==="POST"){
      if(await this.ctx.storage.get("meta"))return j({ok:false,error:"ROOM_EXISTS"},409);
      const b=await safeJson(request),now=new Date().toISOString(),gmToken=randomToken(32),cfg=sanitizeGameConfig(b?.gameConfig),roomName=normalizeRoomName(b?.roomName)||String(cfg?.name||"Làng Asahi"),roomMode=normalizeRoomMode(b?.roomMode),seatMoveMode=normalizeSeatMoveMode(b?.seatMoveMode),seatCount=normalizeSeatCount(b?.seatCount,Number(cfg?.playerCount||0)||12),enabled=b&&Object.prototype.hasOwnProperty.call(b,"enabled")?b.enabled!==false:true,meta={code:normalizeRoomCode(b?.code||""),roomName,status:"waiting",phase:"lobby",locked:false,seatsLocked:false,gmStage:"room",gmStageRevision:0,enabled,autoGM:b?.demo===true?false:true,demo:b?.demo===true,roomMode,seatMoveMode,seatCount,seatLayout:villageLayout.recommendedSeatShape(seatCount),gameName:cfg?.name||"",playerCount:Number(cfg?.playerCount||0),createdAt:now,updatedAt:now,lastUsedAt:now,startedAt:null,roleDeliveredAt:null,gmTokenHash:await sha256(gmToken)};
      await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);if(cfg)await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(b?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(b.cardBackImage));return j({ok:true,room:publicRoom(meta),gmToken},201);
    }
    if(url.pathname==="/state"&&request.method==="GET")return this.publicState();
    if(url.pathname==="/player/chat"&&request.method==="POST")return this.playerChatRead(await safeJson(request));
    if(url.pathname==="/player/chat/send"&&request.method==="POST")return this.playerChatSend(await safeJson(request));
    if(url.pathname==="/gm/chat"&&request.method==="GET")return this.gmChatRead(request);
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
    if(url.pathname==="/player/delivery-received"&&request.method==="POST")return this.playerDeliveryReceived(await safeJson(request));
    if(url.pathname==="/player/role-viewed"&&request.method==="POST")return this.playerRoleViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-viewed"&&request.method==="POST")return this.playerArtifactViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-activate"&&request.method==="POST")return this.playerArtifactActivate(await safeJson(request));
    if(url.pathname==="/player/interaction/respond"&&request.method==="POST")return this.playerInteractionRespond(await safeJson(request));
    if(url.pathname==="/player/gallows"&&request.method==="POST")return this.playerGallows(await safeJson(request));
    if(url.pathname==="/player/demo-action"&&request.method==="POST")return this.playerDemoAction(await safeJson(request));
    if(url.pathname==="/player/action"&&request.method==="POST")return this.playerPhaseAction(await safeJson(request),true);
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
  async customAvatarCatalog(){
    const rows=await this.ctx.storage.list({prefix:"customAvatar:"}),avatars=[];
    for(const v of rows.values()){
      if(!v||typeof v!=="object"||!v.id)continue;
      avatars.push({id:String(v.id),name:String(v.name||v.id),digest:String(v.digest||""),priority:Number(v.priority||0),source:String(v.source||"role-card"),updatedAt:v.updatedAt||null});
    }
    avatars.sort((a,b)=>(Number(b.priority||0)-Number(a.priority||0))||String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))||String(a.name||"").localeCompare(String(b.name||""),"vi"));
    return j({ok:true,count:avatars.length,avatars});
  }
  async customAvatarUpsert(body){
    const id=String(body?.id||"").trim(),name=String(body?.name||id).trim().slice(0,120),img=String(body?.img||""),digest=String(body?.digest||"").trim().slice(0,128),priority=Math.max(-100000,Math.min(100000,Number(body?.priority||0))),source=String(body?.source||"role-card").slice(0,60);
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return j({ok:false,error:"INVALID_AVATAR_ID"},400);
    if(!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(img)||img.length>110000)return j({ok:false,error:"INVALID_AVATAR_IMAGE",message:"Avatar phải là WEBP/PNG/JPEG và không vượt quá giới hạn Kho Avatar."},400);
    const old=await this.ctx.storage.get("customAvatar:"+id);
    if(old&&digest&&String(old.digest||"")===digest){
      return j({ok:true,unchanged:true,avatar:{id,name:String(old.name||name),digest,priority:Number(old.priority||priority),source:String(old.source||source),updatedAt:old.updatedAt||null}});
    }
    const rec={id,name,img,digest,priority,source,updatedAt:new Date().toISOString()};
    await this.ctx.storage.put("customAvatar:"+id,rec);
    return j({ok:true,avatar:{id,name,digest,priority,source,updatedAt:rec.updatedAt}});
  }
  async customAvatarImage(id){
    id=String(id||"").trim();
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return new Response("Not found",{status:404});
    const a=await this.ctx.storage.get("customAvatar:"+id);if(!a?.img)return new Response("Not found",{status:404});
    const m=String(a.img).match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/);if(!m)return new Response("Invalid asset",{status:500});
    const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"public, max-age=3600","x-content-type-options":"nosniff"}});
  }
  async validMemberAvatar(id){
    id=String(id||"").trim();if(normalizeGameCharacterId(id))return true;if(GMWW_MEMBER_AVATAR_IDS.has(id))return true;
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return false;
    return !!(await this.ctx.storage.get("customAvatar:"+id));
  }
  async memberRegister(body){
    const loginId=normalizeLoginId(body?.loginId),displayName=normalizeDisplayName(body?.displayName),gameCharacterId=normalizeGameCharacterId(body?.gameCharacterId),charIndex=Math.max(0,Number(String(gameCharacterId||"").slice(-2))-1),fallbackAvatar=GMWW_MEMBER_AVATARS[charIndex%GMWW_MEMBER_AVATARS.length],avatarId=String(body?.avatarId||fallbackAvatar?.id||"");
    if(!LOGIN_RE.test(loginId))return j({ok:false,error:"INVALID_LOGIN_ID",message:"Tên đăng nhập phải có 4–20 ký tự, không dấu/không khoảng trắng và chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."},400);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên Hiển Thị phải có từ 2 đến 24 ký tự."},400);
    if(!gameCharacterId)return j({ok:false,error:"INVALID_GAME_CHARACTER",message:"Vui lòng chọn Nhân Vật game khi tạo tài khoản."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Không thể tạo ảnh tương thích cho Nhân Vật đã chọn."},400);
    const key="member:"+loginId;if(await this.ctx.storage.get(key))return j({ok:false,error:"LOGIN_ID_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const rows=await this.ctx.storage.list({prefix:"member:"}),displayKey=displayName.toLocaleLowerCase("vi-VN");
    if([...rows.values()].some(x=>normalizeDisplayName(x?.displayName).toLocaleLowerCase("vi-VN")===displayKey))return j({ok:false,error:"DISPLAY_NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const now=new Date().toISOString(),member={loginId,displayName,avatarId,gameCharacterId,lobbyMotionEnabled:true,passwordConfigured:false,passwordRequired:false,source:"WEB",createdAt:now,updatedAt:now,presenceAt:Date.now(),lastSeenAt:now,currentRoomCode:null,ready:false,stats:{wins:0,losses:0},history:[]};
    try{await this.ctx.storage.put(key,member)}catch(e){console.error("GMWW_MEMBER_STORE_FAILED",e);return j({ok:false,error:"MEMBER_STORE_FAILED",message:"Không thể lưu dữ liệu thành viên."},500)}
    let session;try{session=await this.newSession(member)}catch(e){console.error("GMWW_MEMBER_SESSION_FAILED",e);return j({ok:false,error:"MEMBER_SESSION_FAILED",message:"Đã lưu thành viên nhưng không thể tạo phiên đăng nhập."},500)}
    return j({ok:true,member:publicMember(member),...session},201);
  }
  async memberLogin(body){
    const loginId=normalizeLoginId(body?.loginId),member=await this.ctx.storage.get("member:"+loginId);
    if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND",message:"Tên đăng nhập này chưa có tài khoản."},404);
    disableMemberPassword(member);member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();member.updatedAt=member.updatedAt||member.lastSeenAt;await this.ctx.storage.put("member:"+loginId,member);
    return j({ok:true,member:publicMember(member),...(await this.newSession(member))});
  }
  async memberChangePassword(request,body){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);
    const skey="session:"+await sha256(token),ses=await this.ctx.storage.get(skey);if(!ses||ses.expiresAt<=Date.now())return j({ok:false,error:"SESSION_EXPIRED"},401);
    const member=await this.ctx.storage.get("member:"+ses.loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);
    const currentPassword=String(body?.currentPassword||""),newPassword=String(body?.newPassword||"");
    if(!(await verifyPassword(currentPassword,member)))return j({ok:false,error:"INVALID_CURRENT_PASSWORD",message:"Mật khẩu hiện tại không đúng."},400);
    if(newPassword.length<4||newPassword.length>128)return j({ok:false,error:"INVALID_PASSWORD",message:"Mật khẩu mới phải có ít nhất 4 ký tự."},400);
    const salt=crypto.getRandomValues(new Uint8Array(16));member.passwordSalt=bytesToBase64(salt);member.passwordHash=await derivePasswordHash(newPassword,salt);member.passwordAlgorithm="PBKDF2-SHA256";member.passwordIterations=PBKDF2_ITERATIONS;member.passwordConfigured=true;member.passwordRequired=true;member.updatedAt=new Date().toISOString();await this.ctx.storage.put("member:"+member.loginId,member);return j({ok:true});
  }
  async memberRequestPasswordReset(body){
    const loginId=normalizeLoginId(body?.loginId),now=new Date().toISOString();
    if(LOGIN_RE.test(loginId)){const member=await this.ctx.storage.get("member:"+loginId);if(member){member.resetRequestedAt=now;await this.ctx.storage.put("member:"+loginId,member)}}
    return j({ok:true,message:"RESET_REQUEST_ACCEPTED"});
  }
  async memberAdminCreate(request,body){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const loginId=normalizeLoginId(body?.loginId),displayName=normalizeDisplayName(body?.displayName),gameCharacterId=normalizeGameCharacterId(body?.gameCharacterId||body?.avatarId),avatarId=gameCharacterId||String(body?.avatarId||"avatar-cut-001");
    if(!LOGIN_RE.test(loginId))return j({ok:false,error:"INVALID_LOGIN_ID",message:"Tên đăng nhập phải có 4–20 ký tự, không dấu/không khoảng trắng và chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."},400);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên Hiển Thị phải có từ 2 đến 24 ký tự."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Avatar không hợp lệ."},400);
    const key="member:"+loginId;if(await this.ctx.storage.get(key))return j({ok:false,error:"NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const rows=await this.ctx.storage.list({prefix:"member:"}),displayKey=displayName.toLocaleLowerCase("vi-VN");
    if([...rows.values()].some(x=>normalizeDisplayName(x?.displayName).toLocaleLowerCase("vi-VN")===displayKey))return j({ok:false,error:"NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const now=new Date().toISOString(),member={loginId,displayName,avatarId,gameCharacterId:gameCharacterId||null,passwordConfigured:false,passwordRequired:false,source:"GM",createdAt:now,updatedAt:now,presenceAt:0,lastSeenAt:null,currentRoomCode:null,ready:false,stats:{wins:0,losses:0},history:[]};
    await this.ctx.storage.put(key,member);
    return j({ok:true,member:publicMember(member)},201)
  }
  async memberAdminEdit(request,body){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const loginId=normalizeLoginId(body?.loginId),displayName=normalizeDisplayName(body?.displayName),requestedCharacter=normalizeGameCharacterId(body?.gameCharacterId||body?.avatarId),member=await this.ctx.storage.get("member:"+loginId),avatarId=requestedCharacter||String(body?.avatarId||member?.avatarId||"");
    if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND",message:"Không tìm thấy Thành Viên."},404);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên Hiển Thị phải có từ 2 đến 24 ký tự."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Avatar không hợp lệ."},400);
    const rows=await this.ctx.storage.list({prefix:"member:"}),displayKey=displayName.toLocaleLowerCase("vi-VN");
    if([...rows.values()].some(x=>normalizeLoginId(x?.loginId)!==loginId&&normalizeDisplayName(x?.displayName).toLocaleLowerCase("vi-VN")===displayKey))return j({ok:false,error:"NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    if(body&&Object.prototype.hasOwnProperty.call(body,"gameCharacterId")&&!requestedCharacter)return j({ok:false,error:"INVALID_GAME_CHARACTER",message:"Nhân Vật game không hợp lệ."},400);
    member.displayName=displayName;member.avatarId=avatarId;if(requestedCharacter)member.gameCharacterId=requestedCharacter;disableMemberPassword(member);member.updatedAt=new Date().toISOString();
    await this.ctx.storage.put("member:"+loginId,member);
    return j({ok:true,member:publicMember(member)})
  }
  async memberAdminResetPassword(request,body){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const loginId=normalizeLoginId(body?.loginId),newPassword="0000",member=await this.ctx.storage.get("member:"+loginId);
    if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND",message:"Không tìm thấy tài khoản."},404);
    if(newPassword.length<4||newPassword.length>128)return j({ok:false,error:"INVALID_PASSWORD",message:"Mật khẩu tạm thời không hợp lệ."},400);
    const salt=crypto.getRandomValues(new Uint8Array(16));member.passwordSalt=bytesToBase64(salt);member.passwordHash=await derivePasswordHash(newPassword,salt);member.passwordAlgorithm="PBKDF2-SHA256";member.passwordIterations=PBKDF2_ITERATIONS;member.passwordConfigured=true;member.passwordRequired=true;member.resetRequestedAt=null;member.passwordResetAt=new Date().toISOString();member.updatedAt=member.passwordResetAt;await this.ctx.storage.put("member:"+loginId,member);
    const sessions=await this.ctx.storage.list({prefix:"session:"}),kill=[];for(const [k,v] of sessions)if(normalizeLoginId(v?.loginId)===loginId)kill.push(k);if(kill.length)await this.ctx.storage.delete(kill);
    return j({ok:true,member:directoryMember(member)});
  }
  async memberUpdateProfile(request,body){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);
    const skey="session:"+await sha256(token),ses=await this.ctx.storage.get(skey);if(!ses||ses.expiresAt<=Date.now())return j({ok:false,error:"SESSION_EXPIRED"},401);
    const member=await this.ctx.storage.get("member:"+ses.loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);
    const hasDisplay=body&&Object.prototype.hasOwnProperty.call(body,"displayName"),hasAvatar=body&&Object.prototype.hasOwnProperty.call(body,"avatarId"),hasCharacter=body&&Object.prototype.hasOwnProperty.call(body,"gameCharacterId"),hasLobbyMotion=body&&Object.prototype.hasOwnProperty.call(body,"lobbyMotionEnabled"),displayName=hasDisplay?normalizeDisplayName(body.displayName):member.displayName,avatarId=hasAvatar?String(body.avatarId||""):member.avatarId,requestedCharacter=hasCharacter?normalizeGameCharacterId(body.gameCharacterId):normalizeGameCharacterId(member.gameCharacterId);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên hiển thị phải có từ 2 đến 24 ký tự."},400);
    if(hasAvatar&&!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Avatar tương thích không hợp lệ."},400);
    if(hasCharacter&&!requestedCharacter)return j({ok:false,error:"INVALID_GAME_CHARACTER",message:"Nhân Vật game không hợp lệ."},400);
    member.displayName=displayName;member.avatarId=avatarId;if(requestedCharacter)member.gameCharacterId=requestedCharacter;if(hasLobbyMotion)member.lobbyMotionEnabled=body.lobbyMotionEnabled!==false;disableMemberPassword(member);member.updatedAt=new Date().toISOString();member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();
    await this.ctx.storage.put("member:"+member.loginId,member);return j({ok:true,member:publicMember(member)});
  }
  async memberSession(request){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);const key="session:"+await sha256(token),ses=await this.ctx.storage.get(key);
    if(!ses||ses.expiresAt<=Date.now()){if(ses)await this.ctx.storage.delete(key);return j({ok:false,error:"SESSION_EXPIRED"},401)}
    const member=await this.ctx.storage.get("member:"+ses.loginId);if(!member)return j({ok:false,error:"UNAUTHORIZED"},401);
    const needsLegacyCleanup=!!(member.passwordHash||member.passwordSalt||member.passwordRequired);
    disableMemberPassword(member);
    const now=Date.now();
    if(!needsLegacyCleanup&&shouldSkipMemberSessionTouch(member,now))this.gmwwWriteSkipped('memberSession');
    else{
      member.presenceAt=now;member.lastSeenAt=new Date(now).toISOString();
      await this.ctx.storage.put("member:"+ses.loginId,member);
    }
    return j({ok:true,member:publicMember(member),expiresAt:ses.expiresAt});
  }
  async memberPresence(request,body){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);const key="session:"+await sha256(token),ses=await this.ctx.storage.get(key);
    if(!ses||ses.expiresAt<=Date.now())return j({ok:false,error:"SESSION_EXPIRED"},401);
    return this.memberPresenceInternal({loginId:ses.loginId,roomCode:body?.roomCode??null,ready:!!body?.ready,preserveGmCall:true});
  }
  async memberPresenceInternal(body){
    const loginId=normalizeLoginId(body?.loginId),member=await this.ctx.storage.get("member:"+loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);
    const previousPresence={...member};
    // On GM disband retries, do not evict someone who has since joined another room.
    const expected=body?.expectedRoomCode?normalizeRoomCode(body.expectedRoomCode):null;
    if(expected&&!body?.roomCode&&member.currentRoomCode&&normalizeRoomCode(member.currentRoomCode)!==expected){
      return j({ok:true,skippedDifferentRoom:true,member:directoryMember(member)});
    }
    const requestedRoomCode=body?.roomCode?normalizeRoomCode(body.roomCode):null,calledRoomCode=normalizeRoomCode(member.gmCalledRoomCode||"");
    // The GM call must survive Player Web lobby presence heartbeats and reconnects.
    const keepGmCall=body?.preserveGmCall===true&&!requestedRoomCode&&isValidRoomCode(calledRoomCode)&&calledRoomCode===normalizeRoomCode(member.currentRoomCode||"");
    if(body?.calledByGM===true&&isValidRoomCode(requestedRoomCode))member.gmCalledRoomCode=requestedRoomCode;
    else if(!keepGmCall&&(!requestedRoomCode||(calledRoomCode&&calledRoomCode!==requestedRoomCode)))member.gmCalledRoomCode=null;
    member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();
    member.currentRoomCode=keepGmCall?calledRoomCode:requestedRoomCode;
    member.ready=keepGmCall?true:!!body?.ready;
    if(shouldSkipMemberHeartbeat(previousPresence,member,member.presenceAt)){
      this.gmwwWriteSkipped('memberHeartbeat');
      return j({ok:true,member:directoryMember({...member,presenceAt:previousPresence.presenceAt,lastSeenAt:previousPresence.lastSeenAt})});
    }
    await this.ctx.storage.put("member:"+loginId,member);return j({ok:true,member:directoryMember(member)});
  }
  async memberRecordResult(body){
    const loginId=normalizeLoginId(body?.loginId),matchId=String(body?.matchId||""),member=await this.ctx.storage.get("member:"+loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);if(!matchId)return j({ok:false,error:"MATCH_ID_REQUIRED"},400);
    const history=Array.isArray(member.history)?member.history:[];if(history.some(x=>String(x?.matchId||"")===matchId))return j({ok:true,duplicate:true,member:publicMember(member)});
    const result=body?.result==="win"?"win":"loss",stats=member.stats&&typeof member.stats==="object"?member.stats:{wins:0,losses:0};stats.wins=Number(stats.wins||0)+(result==="win"?1:0);stats.losses=Number(stats.losses||0)+(result==="loss"?1:0);member.stats=stats;
    member.history=[{matchId,result,roomCode:String(body?.roomCode||""),roomName:String(body?.roomName||""),gameName:String(body?.gameName||""),roleName:String(body?.roleName||""),faction:String(body?.faction||""),winnerFaction:String(body?.winnerFaction||""),playedAt:body?.playedAt||new Date().toISOString()},...history].slice(0,50);member.updatedAt=new Date().toISOString();await this.ctx.storage.put("member:"+loginId,member);return j({ok:true,member:publicMember(member)});
  }
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
  async gameTemplateList(){
    const rows=await this.ctx.storage.list({prefix:"gameTemplate:"}),templates=[...rows.values()].filter(Boolean).map(x=>({id:x.id,name:x.name,playerCount:Number(x.playerCount||0),updatedAt:x.updatedAt||null,preloadedAt:x.preloadedAt||null,revision:Number(x.revision||1)})).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
    return j({ok:true,count:templates.length,templates});
  }
  async gameTemplateGet(id){
    id=String(id||"").trim().slice(0,120);if(!id)return j({ok:false,error:"INVALID_TEMPLATE_ID"},400);
    const rec=await this.ctx.storage.get("gameTemplate:"+id);if(!rec)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    return j({ok:true,template:rec});
  }
  async gameTemplateDelete(id){
    id=String(id||"").trim().slice(0,120);
    if(!id||id.includes("/")||id.includes(".."))return j({ok:false,error:"INVALID_TEMPLATE_ID"},400);
    const key="gameTemplate:"+id,existing=await this.ctx.storage.get(key);
    if(!existing)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    await this.ctx.storage.delete(key);
    const savedAssets=typeof this.ctx.storage.list==='function'?await this.ctx.storage.list({prefix:"gameTemplateAsset:"+id+":"}):new Map();
    if(savedAssets.size)await this.ctx.storage.delete([...savedAssets.keys()]);
    return j({ok:true,deleted:true,id});
  }

  async gameTemplateUpsert(body){
    const cfg=sanitizeGameConfig(body?.gameConfig||body?.template||body);if(!cfg)return j({ok:false,error:"INVALID_GAME_CONFIG"},400);
    const id=String(body?.id||cfg.id||("template-"+Date.now().toString(36))).trim().slice(0,120),now=new Date().toISOString(),key="gameTemplate:"+id,old=await this.ctx.storage.get(key);
    const compiledConfig={...cfg,id};
    // A retry with identical configuration must preserve partially uploaded artwork packages.
    // Only an actual configuration change invalidates its previous per-revision packages.
    const unchanged=!!old?.compiledConfig&&JSON.stringify(old.compiledConfig)===JSON.stringify(compiledConfig);
    const revision=unchanged?Math.max(1,Number(old.revision||1)):Math.max(1,Number(old?.revision||0)+1);
    const rec={id,name:String(cfg.name||"Ván Mẫu").slice(0,120),playerCount:Number(cfg.playerCount||0),revision,updatedAt:now,preloadedAt:unchanged?(old.preloadedAt||now):now,compiledConfig,source:"GM_IPA"};
    await this.ctx.storage.put(key,rec);
    return j({ok:true,template:rec});
  }
  // Artifact artwork is a reusable server-wide catalog, never part of a template revision.
  async sharedArtifactStatus(){
    const rows=await this.ctx.storage.list({prefix:"sharedArtifactMeta:"});
    return j({ok:true,artifacts:[...rows.values()].filter(x=>x?.assetId).map(x=>({assetId:x.assetId,signature:x.signature,updatedAt:x.updatedAt,package:x.package}))});
  }
  async sharedArtifactPut(body){
    const assetId=String(body?.assetId||"").slice(0,180),signature=String(body?.signature||"");
    if(!/^artifact:[A-Za-z0-9._:-]{1,120}$/.test(assetId))return j({ok:false,error:"INVALID_ARTIFACT_ID"},400);
    if(!/^[0-9a-f]{64}$/.test(signature))return j({ok:false,error:"INVALID_ARTIFACT_SIGNATURE"},400);
    const metaKey="sharedArtifactMeta:"+assetId,existing=await this.ctx.storage.get(metaKey);
    const currentData=existing?.signature?await this.ctx.storage.get("sharedArtifactData:"+assetId):null;
    if(body?.force!==true&&existing?.signature===signature&&validImageDataUrl(currentData))
      return j({ok:true,assetId,cached:true});
    if(!validImageDataUrl(body?.imageDataUrl))return j({ok:false,error:"INVALID_ARTIFACT_ARTWORK"},400);
    // Backfill the OLD signature before overwriting a V3.70 artifact. Previously
    // saved matches refer to that version; newly edited cards must not change it.
    if(existing?.signature&&existing.signature!==signature&&validImageDataUrl(currentData)){
      const oldKey="sharedArtifactDataVersion:"+assetId+":"+existing.signature;
      if(!await this.ctx.storage.get(oldKey))await this.ctx.storage.put(oldKey,currentData);
    }
    const card=sanitizePlayerArtifactCard(body?.package?.roleCard||{}),saved={
      assetId,signature,updatedAt:new Date().toISOString(),
      package:{roleId:assetId,roleName:String(card.name||"Artifact"),artworkAssetId:assetId,
        roleCard:card}
    };
    await this.ctx.storage.put("sharedArtifactData:"+assetId,String(body.imageDataUrl));
    // Immutable per-signature reference: an ongoing match keeps its artwork
    // even when the global Artifact card is edited for a later match.
    await this.ctx.storage.put("sharedArtifactDataVersion:"+assetId+":"+signature,String(body.imageDataUrl));
    await this.ctx.storage.put(metaKey,saved);
    return j({ok:true,assetId,cached:false});
  }
  async sharedArtifactGet(rawId){
    const assetId=String(rawId||""),meta=await this.ctx.storage.get("sharedArtifactMeta:"+assetId),
      imageDataUrl=await this.ctx.storage.get("sharedArtifactData:"+assetId);
    if(!meta||!validImageDataUrl(imageDataUrl))return j({ok:false,error:"SHARED_ARTIFACT_MISSING",assetId},404);
    return j({ok:true,assetId,package:{...meta.package,imageDataUrl}});
  }
  async sharedArtifactImage(rawId,rawSignature){
    const id=String(rawId||""),signature=String(rawSignature||"");
    if(!/^artifact:[A-Za-z0-9._:-]{1,120}$/.test(id)||!/^[0-9a-f]{64}$/.test(signature))return new Response("Invalid artwork reference",{status:400});
    const current=await this.ctx.storage.get("sharedArtifactMeta:"+id);
    const snapshot=await this.ctx.storage.get("sharedArtifactDataVersion:"+id+":"+signature);
    const data=snapshot||(current?.signature===signature?await this.ctx.storage.get("sharedArtifactData:"+id):null);
    return gmwwStoredArtworkResponse(data);
  }
  // A Ván Mẫu only packages its role cards. Artifact selections remain configuration references.
  async gameTemplateAssetsStatus(rawId){
    const id=String(rawId||"").slice(0,120),rec=await this.ctx.storage.get("gameTemplate:"+id);
    if(!rec)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    const cfg=rec.compiledConfig||{},assets=[...new Set((cfg.roles||[]).map(r=>"role:"+String(r.roleId||"")).filter(x=>!x.endsWith(":")))],missing=[],packages={};
    for(const assetId of assets){
      const key="gameTemplateAssetMeta:"+id+":"+assetId;
      let row=await this.ctx.storage.get(key);
      if(!row||Number(row.revision)!==Number(rec.revision)){
        // One-time migration of V3.70 packages. Subsequent selections read
        // metadata only, never megabytes of Base64 artwork per role.
        const saved=await this.ctx.storage.get("gameTemplateAsset:"+id+":"+assetId);
        if(saved&&Number(saved.revision)===Number(rec.revision)&&validImageDataUrl(saved.imageDataUrl)){
          row={revision:saved.revision,package:saved.package,verified:true};
          if(typeof this.ctx.storage.put==="function")await this.ctx.storage.put(key,row);
        }
      }
      if(!row||Number(row.revision)!==Number(rec.revision)||row.verified!==true)missing.push(assetId);
      else packages[assetId]=row.package||null;
    }
    return j({ok:true,id,revision:rec.revision,ready:assets.length>0&&missing.length===0,total:assets.length,missing,assets,packages});
  }
  async gameTemplateAssetPut(body){
    const id=String(body?.id||"").slice(0,120),assetId=String(body?.assetId||"").slice(0,180),rec=await this.ctx.storage.get("gameTemplate:"+id);
    if(!rec)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    const cfg=rec.compiledConfig||{},expected=new Set((cfg.roles||[]).map(r=>"role:"+String(r.roleId||"")));
    if(!expected.has(assetId))return j({ok:false,error:"ASSET_NOT_IN_TEMPLATE"},400);
    if(!validImageDataUrl(body?.imageDataUrl))return j({ok:false,error:"ARTWORK_NOT_READY",message:"Artwork chưa được tải và tối ưu để lưu Ván Mẫu."},400);
    const pkg=body?.package||{},roleId=assetId.startsWith("artifact:")?assetId:assetId.slice(5);
    // A V3.70 template has only the mutable current package. Preserve that
    // previous revision on its FIRST edit, never on every room selection.
    const currentKey="gameTemplateAsset:"+id+":"+assetId;
    const previous=await this.ctx.storage.get(currentKey);
    if(previous&&Number(previous.revision)!==Number(rec.revision)&&validImageDataUrl(previous.imageDataUrl)){
      const oldKey="gameTemplateAssetRevision:"+id+":"+assetId+":"+previous.revision;
      if(!await this.ctx.storage.get(oldKey))await this.ctx.storage.put(oldKey,previous);
    }
    const saved={revision:rec.revision,imageDataUrl:body.imageDataUrl,package:{roleId,roleName:String(pkg.roleName||"").slice(0,120),artworkAssetId:assetId,roleCard:sanitizePlayerRoleCard(pkg.roleCard||{}),faction:String(pkg.faction||"").slice(0,120),description:String(pkg.description||"").slice(0,6000)},updatedAt:new Date().toISOString()};
    await this.ctx.storage.put(currentKey,saved);
    // Keep an immutable-per-revision copy for a match referencing an older
    // version of this template. Do not copy it into each room.
    await this.ctx.storage.put("gameTemplateAssetRevision:"+id+":"+assetId+":"+rec.revision,saved);
    await this.ctx.storage.put("gameTemplateAssetMeta:"+id+":"+assetId,{revision:rec.revision,verified:true,package:saved.package});
    return j({ok:true,id,assetId,revision:rec.revision,hasImage:true});
  }
  async gameTemplateAssetGet(rawId,rawAsset){
    const id=String(rawId||"").slice(0,120),assetId=String(rawAsset||"").slice(0,180),rec=await this.ctx.storage.get("gameTemplate:"+id),saved=await this.ctx.storage.get("gameTemplateAsset:"+id+":"+assetId);
    if(!rec||!saved||Number(saved.revision)!==Number(rec.revision)||!validImageDataUrl(saved.imageDataUrl))return j({ok:false,error:"TEMPLATE_ARTWORK_MISSING"},404);
    return j({ok:true,id,assetId,package:{...saved.package,imageDataUrl:saved.imageDataUrl}});
  }
  async gameTemplateAssetImage(rawId,rawAsset,rawRevision){
    const id=String(rawId||"").slice(0,120),assetId=String(rawAsset||"").slice(0,180),revision=Number(rawRevision);
    if(!id||!/^role:[A-Za-z0-9._:-]{1,120}$/.test(assetId)||!Number.isSafeInteger(revision)||revision<1)return new Response("Invalid template artwork reference",{status:400});
    const snapshot=await this.ctx.storage.get("gameTemplateAssetRevision:"+id+":"+assetId+":"+revision);
    const rec=await this.ctx.storage.get("gameTemplate:"+id);
    const saved=snapshot||(Number(rec?.revision)===revision?await this.ctx.storage.get("gameTemplateAsset:"+id+":"+assetId):null);
    if(!saved||Number(saved.revision)!==revision)return new Response("Template artwork revision missing",{status:404,headers:{"cache-control":"no-store"}});
    return gmwwStoredArtworkResponse(saved.imageDataUrl);
  }
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
  async sceneNormalizeRecord(raw){
    const record=raw&&typeof raw==="object"?raw:{revision:0};
    const revision=Math.max(0,Math.trunc(Number(record.revision)||0));
    const output={revision,fireAnchors:record.fireAnchors||{},gallowsAnchors:record.gallowsAnchors||{},dayRevision:Math.max(0,Number(record.dayRevision)||0),nightRevision:Math.max(0,Number(record.nightRevision)||0),updatedAt:record.updatedAt||null};
    for(const key of ["day","night"]){
      if(validImageDataUrl(record[key])&&revision>0){
        await this.ctx.storage.put("globalSetting:villageSceneImage:"+revision+":"+key,record[key]);
        output[key+"Revision"]=revision;
      }
    }
    return output;
  }
  scenePublicRecord(rec){
    const revision=Math.max(0,Number(rec?.revision)||0);
    const imageRevision=key=>Math.max(0,Number(rec?.[key+"Revision"])||(validImageDataUrl(rec?.[key])?revision:0));
    const day=imageRevision("day"),night=imageRevision("night");
    return {revision,updatedAt:rec?.updatedAt||null,fireAnchors:rec?.fireAnchors||{},gallowsAnchors:rec?.gallowsAnchors||{},
      day:day?"/api/village-scene/image/day?revision="+day:null,
      night:night?"/api/village-scene/image/night?revision="+night:null};
  }
  async sceneSettingsGet(){
    const current=await this.ctx.storage.get("globalSetting:villageScene");
    const history=(await this.ctx.storage.get("globalSetting:villageSceneHistory"))||[];
    return j({ok:true,scene:this.scenePublicRecord(current),
      history:history.map(row=>({revision:Number(row?.revision)||0,updatedAt:row?.updatedAt||null}))});
  }
  async sceneSettingsImage(key,rawRevision){
    const revision=Number(rawRevision);
    if(!["day","night"].includes(key)||!Number.isSafeInteger(revision)||revision<1)return new Response("Invalid scene reference",{status:400});
    let image=await this.ctx.storage.get("globalSetting:villageSceneImage:"+revision+":"+key);
    // Read old stored scenes without changing existing user data.
    if(!image){
      const current=await this.ctx.storage.get("globalSetting:villageScene");
      const history=(await this.ctx.storage.get("globalSetting:villageSceneHistory"))||[];
      const legacy=[current,...history].find(row=>Number(row?.revision)===revision&&validImageDataUrl(row?.[key]));
      image=legacy?.[key];
    }
    return gmwwStoredArtworkResponse(image);
  }
  async scenePruneImages(keepRevision=0){
    const prefix="globalSetting:villageSceneImage:";
    const keep=keepRevision>0?new Set(["day","night"].map(key=>prefix+keepRevision+":"+key)):new Set();
    const all=await this.ctx.storage.list({prefix});
    const stale=[...all.keys()].filter(key=>!keep.has(key));
    if(stale.length)await this.ctx.storage.delete(stale);
    await this.ctx.storage.delete("globalSetting:villageSceneHistory");
  }
  async sceneSettingsPut(body){
    // Reset via the same proven authenticated PUT endpoint as Apply on iOS WebKit.
    if(body?.resetToDefault===true){
      if(body.day||body.night)return j({ok:false,error:"RESET_AND_IMAGE_CONFLICT"},400);
      return this.sceneSettingsReset();
    }
    const isImage=v=>v==null||(typeof v==="string"&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)&&v.length<=1800000);
    if(!body||(!body.day&&!body.night&&!body.fireAnchors&&!body.gallowsAnchors)||!isImage(body.day)||!isImage(body.night))return j({ok:false,error:"INVALID_SCENE_IMAGE"},400);
    if(body.fireAnchors&&(!Object.keys(body.fireAnchors).length||Object.entries(body.fireAnchors).some(([key,p])=>!["day","night"].includes(key)||!p||![p.x,p.y].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100))))return j({ok:false,error:"INVALID_FIRE_ANCHOR"},400);
    if(body.gallowsAnchors&&(!Object.keys(body.gallowsAnchors).length||Object.entries(body.gallowsAnchors).some(([key,p])=>!["day","night"].includes(key)||!p||![p.x,p.y].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100))))return j({ok:false,error:"INVALID_GALLOWS_ANCHOR"},400);
    const previousRaw=(await this.ctx.storage.get("globalSetting:villageScene"))||{revision:0};
    if(body.expectedRevision!=null&&Number(body.expectedRevision)!==Number(previousRaw.revision))return j({ok:false,error:"SCENE_CHANGED",message:"Hình nền đã thay đổi. Hãy chọn lại vị trí đống lửa."},409);
    const previous=await this.sceneNormalizeRecord(previousRaw);
    const revision=previous.revision+1;
    if((body.fireAnchors||body.gallowsAnchors)&&!body.day&&!body.night){
      // Landmark edits are metadata-only: never re-upload images, reset players,
      // or invalidate the locally cached Day/Night bitmap.
      const next={...previous,revision,updatedAt:new Date().toISOString(),
        fireAnchors:{...previous.fireAnchors,...body.fireAnchors},
        gallowsAnchors:{...previous.gallowsAnchors,...body.gallowsAnchors}};
      await this.ctx.storage.put("globalSetting:villageScene",next);
      return j({ok:true,scene:this.scenePublicRecord(next)});
    }
    const next={revision,updatedAt:new Date().toISOString(),dayRevision:0,nightRevision:0,fireAnchors:{...previous.fireAnchors},gallowsAnchors:{...previous.gallowsAnchors}};
    for(const key of ["day","night"]){
      if(body[key]){delete next.fireAnchors[key];delete next.gallowsAnchors[key];}
      if(body.fireAnchors?.[key])next.fireAnchors[key]={x:body.fireAnchors[key].x,y:body.fireAnchors[key].y};
       if(body.gallowsAnchors?.[key])next.gallowsAnchors[key]={x:body.gallowsAnchors[key].x,y:body.gallowsAnchors[key].y};
      let image=body[key];
      // A single replacement leaves the other currently applied image intact.
      if(!image){
        const oldRevision=Number(previous[key+"Revision"])||0;
        if(oldRevision)image=await this.ctx.storage.get("globalSetting:villageSceneImage:"+oldRevision+":"+key);
        if(!image&&validImageDataUrl(previousRaw[key]))image=previousRaw[key];
        if(oldRevision&&!image)return j({ok:false,error:"CURRENT_SCENE_IMAGE_MISSING_"+key.toUpperCase()},409);
      }
      if(image){
        await this.ctx.storage.put("globalSetting:villageSceneImage:"+revision+":"+key,image);
        next[key+"Revision"]=revision;
      }
    }
    await this.ctx.storage.put("globalSetting:villageScene",next);
    // Commit metadata first; obsolete versions are removed only after new images are active.
    try{await this.scenePruneImages(revision)}catch(error){console.warn("village scene prune deferred",String(error))}
    return j({ok:true,scene:this.scenePublicRecord(next)});
  }
  async sceneSettingsReset(){
    const current=(await this.ctx.storage.get("globalSetting:villageScene"))||{revision:0};
    const next={revision:Math.max(0,Number(current.revision)||0)+1,updatedAt:new Date().toISOString(),dayRevision:0,nightRevision:0};
    await this.ctx.storage.put("globalSetting:villageScene",next);
    try{await this.scenePruneImages()}catch(error){console.warn("village scene reset prune deferred",String(error))}
    return j({ok:true,scene:this.scenePublicRecord(next)});
  }
  // Backward-compatible legacy route: older clients cannot undo an Apply after
  // history is cleared, and must upgrade to use explicit Reset to default.
  async sceneSettingsRollback(){
    return j({ok:false,error:"USE_RESET_TO_DEFAULT"},409);
  }

  async globalUiSettingsGet(){
    const rec=await this.ctx.storage.get("globalSetting:ui"),raw=Number(rec?.characterScale),characterScale=normalizeCharacterScale(raw,100);
    const actionIconScale=[25,50,75,100,125,150].includes(Number(rec?.actionIconScale))?Number(rec.actionIconScale):100;
    return j({ok:true,characterScale,actionIconScale,backgroundDim:0,updatedAt:rec?.updatedAt||null});
  }
  async globalUiSettingsPut(body){
    const hasCharacter=Object.prototype.hasOwnProperty.call(body||{},"characterScale"),
      hasIcon=Object.prototype.hasOwnProperty.call(body||{},"actionIconScale");
    if(!hasCharacter&&!hasIcon)return j({ok:false,error:"INVALID_UI_SETTINGS"},400);
    if(hasCharacter&&!Number.isFinite(Number(body.characterScale)))return j({ok:false,error:"INVALID_CHARACTER_SCALE"},400);
    if(hasIcon&&![25,50,75,100,125,150].includes(Number(body.actionIconScale)))
      return j({ok:false,error:"INVALID_ACTION_ICON_SCALE"},400);
    const prior=await this.ctx.storage.get("globalSetting:ui")||{},
      characterScale=hasCharacter?normalizeCharacterScale(Number(body.characterScale),100):normalizeCharacterScale(Number(prior.characterScale),100),
      actionIconScale=hasIcon?Number(body.actionIconScale):([25,50,75,100,125,150].includes(Number(prior.actionIconScale))?Number(prior.actionIconScale):100),
      rec={...prior,characterScale,actionIconScale,backgroundDim:0,updatedAt:new Date().toISOString()};
    await this.ctx.storage.put("globalSetting:ui",rec);await this.ctx.storage.delete("globalSetting:webVeil");return j({ok:true,...rec});
  }
  async globalWebSyncGet(){
    const old=await this.ctx.storage.get("globalSetting:webSync");
    if(String(old?.version||"")!==VERSION){
      const rec={generation:Math.max(0,Number(old?.generation||0))+1,version:VERSION,source:"SERVER_DEPLOY",updatedAt:new Date().toISOString()};
      await this.ctx.storage.put("globalSetting:webSync",rec);
      return j({ok:true,...rec});
    }
    return j({ok:true,generation:Math.max(0,Number(old?.generation||0)),version:VERSION,updatedAt:old?.updatedAt||null,source:old?.source||null});
  }
  async globalWebSyncBump(body){
    const old=await this.ctx.storage.get("globalSetting:webSync"),rec={
      generation:Math.max(0,Number(old?.generation||0))+1,
      version:String(body?.version||VERSION),
      source:String(body?.source||"GM_APP").slice(0,40),
      updatedAt:new Date().toISOString()
    };
    await this.ctx.storage.put("globalSetting:webSync",rec);return j({ok:true,...rec});
  }

  async globalLobbyResetBump(body){
    const old=await this.ctx.storage.get("globalSetting:lobbyReset");
    const rec={generation:Math.max(0,Number(old?.generation||0))+1,updatedAt:new Date().toISOString(),source:String(body?.source||"GM_LOBBY").slice(0,40)};
    await this.ctx.storage.put("globalSetting:lobbyReset",rec);
    return j({ok:true,...rec});
  }
  async globalGmPresenceGet(){
    const rec=await this.ctx.storage.get("globalSetting:gmPresence"),now=Date.now(),lastSeenAt=Math.max(0,Number(rec?.lastSeenAt||0));
    const online=rec?.online===true&&lastSeenAt>0&&(now-lastSeenAt)<=GM_PRESENCE_TTL;
    return j({ok:true,gm:publicGmPresence(rec,online)});
  }
  async globalGmPresencePut(body){
    const old=await this.ctx.storage.get("globalSetting:gmPresence"),now=Date.now(),online=body?.online!==false,hasRoomCode=!!body&&Object.prototype.hasOwnProperty.call(body,"roomCode"),requestedRoomCode=hasRoomCode?normalizeRoomCode(body?.roomCode):"",roomCode=hasRoomCode&&isValidRoomCode(requestedRoomCode)?requestedRoomCode:"";
    if(shouldSkipGmHeartbeat(old,online,hasRoomCode,roomCode,now)){
      this.gmwwWriteSkipped('gmHeartbeat');
      return j({ok:true,gm:publicGmPresence(old,true),lobbyGeneration:Number((await this.ctx.storage.get("globalSetting:lobbyReset"))?.generation||0)});
    }
    if(!online){
      const rec={...(old||{}),online:false,roomCode:hasRoomCode?roomCode:String(old?.roomCode||""),lastSeenAt:now,updatedAt:new Date(now).toISOString()};
      await this.ctx.storage.put("globalSetting:gmPresence",rec);
      return j({ok:true,gm:publicGmPresence(rec,false),lobbyGeneration:Number((await this.ctx.storage.get("globalSetting:lobbyReset"))?.generation||0)});
    }
    const expired=old?.online!==true||!Number(old?.lastSeenAt)||now-Number(old.lastSeenAt)>GM_PRESENCE_TTL;
    const rec=expired?{online:true,sessionId:randomToken(12),sessionStartedAt:now,lastSeenAt:now,updatedAt:new Date(now).toISOString(),roomCode:hasRoomCode?roomCode:"",moveFromX:null,moveFromY:null,moveToX:null,moveToY:null,moveStartedAt:0,moveDurationMs:0,manualUntil:0}:{...old,online:true,...(hasRoomCode?{roomCode}:{}),lastSeenAt:now,updatedAt:new Date(now).toISOString()};
    await this.ctx.storage.put("globalSetting:gmPresence",rec);
    return j({ok:true,gm:publicGmPresence(rec,true),lobbyGeneration:Number((await this.ctx.storage.get("globalSetting:lobbyReset"))?.generation||0)});
  }
  async globalGmMovePut(body){
    const old=await this.ctx.storage.get("globalSetting:gmPresence"),now=Date.now(),expired=old?.online!==true||!Number(old?.lastSeenAt)||now-Number(old.lastSeenAt)>GM_PRESENCE_TTL,hasRoomCode=!!body&&Object.prototype.hasOwnProperty.call(body,"roomCode"),requestedRoomCode=hasRoomCode?normalizeRoomCode(body?.roomCode):"",roomCode=hasRoomCode?(isValidRoomCode(requestedRoomCode)?requestedRoomCode:""):String(old?.roomCode||"");
    const sessionId=expired?randomToken(12):String(old?.sessionId||randomToken(12)),sessionStartedAt=expired?now:Math.max(0,Number(old?.sessionStartedAt||now));
    const from=villageLayout.clampPoint(body?.fromX,body?.fromY),to=villageLayout.clampPoint(body?.x,body?.y),distance=Math.hypot(to.x-from.x,(to.y-from.y)*2),duration=Math.max(450,Math.min(4200,Math.trunc(distance*48||650)));
    const rec={...(expired?{}:(old||{})),online:true,sessionId,sessionStartedAt,lastSeenAt:now,updatedAt:new Date(now).toISOString(),roomCode,moveFromX:from.x,moveFromY:from.y,moveToX:to.x,moveToY:to.y,moveStartedAt:now,moveDurationMs:duration,manualUntil:now+duration+15000};
    await this.ctx.storage.put("globalSetting:gmPresence",rec);
    return j({ok:true,gm:publicGmPresence(rec,true),durationMs:duration});
  }

  async globalAssetGet(key,contentType){
    const bytes=await this.ctx.storage.get(key);
    if(!bytes)return new Response("ASSET_NOT_FOUND",{status:404,headers:{"cache-control":"no-store"}});
    const body=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    return new Response(body,{headers:{"content-type":contentType,"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}});
  }
  async globalAssetPut(request,key,contentType,maxBytes=125000){
    const ab=await request.arrayBuffer();
    if(!ab.byteLength||ab.byteLength>maxBytes)return j({ok:false,error:"ASSET_SIZE_INVALID",size:ab.byteLength,maxBytes},413);
    const bytes=new Uint8Array(ab);await this.ctx.storage.put(key,bytes);
    return j({ok:true,key,contentType,size:bytes.byteLength});
  }

  async roomDirectoryUpsert(body){
    const code=normalizeRoomCode(body?.code);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
    const key="roomdir:"+code,old=await this.ctx.storage.get(key),incomingResetVersion=Math.max(0,Number(body?.resetVersion||0)),oldResetVersion=Math.max(0,Number(old?.resetVersion||0));
    if(old&&incomingResetVersion<oldResetVersion)return j({ok:true,staleIgnored:true,room:old});
    const rec={code,roomName:normalizeRoomName(body?.roomName)||("Phòng "+code),gameName:String(body?.gameName||"").slice(0,120),phase:String(body?.phase||"lobby"),status:String(body?.status||"waiting"),locked:!!body?.locked,enabled:body?.enabled!==false,demo:body?.demo===true,roomMode:normalizeRoomMode(body?.roomMode||old?.roomMode),seatMoveMode:normalizeSeatMoveMode(body?.seatMoveMode||old?.seatMoveMode),seatCount:normalizeSeatCount(body?.seatCount,old?.seatCount||12),playerCount:Math.max(0,Number(body?.playerCount||0)),joinedCount:Math.max(0,Number(body?.joinedCount||0)),resetVersion:incomingResetVersion,createdAt:body?.createdAt||old?.createdAt||new Date().toISOString(),updatedAt:body?.updatedAt||new Date().toISOString(),leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE};
    if(shouldSkipDirectoryHeartbeat(old,rec,Date.now())){
      this.gmwwWriteSkipped('roomDirectory');
      return j({ok:true,room:old,unchanged:true});
    }
    await this.ctx.storage.put(key,rec);return j({ok:true,room:rec});
  }
  async roomDirectoryList(url){
    const includeEnded=String(url?.searchParams?.get("includeEnded")||"")==="1",includeDisabled=String(url?.searchParams?.get("includeDisabled")||"")==="1",rows=await this.ctx.storage.list({prefix:"roomdir:"}),rooms=[],nowMs=Date.now();
    for(const [key,r] of rows){const phase=String(r?.phase||"").toLowerCase(),last=Date.parse(r?.updatedAt||r?.createdAt||"");if(phase==="deleted"||(Number.isFinite(last)&&nowMs-last>=ROOM_IDLE_TTL)){await this.ctx.storage.delete(key);continue}if(!includeDisabled&&r?.enabled===false)continue;if(!includeEnded){if(phase==="ended")continue;const lease=Number(r?.leaseUntil||0),activeDemo=r?.demo===true&&phase==="running"&&r?.enabled!==false;if(!activeDemo&&((lease&&nowMs>lease)||(!lease&&Number.isFinite(last)&&nowMs-last>ROOM_DIRECTORY_LEASE)))continue}rooms.push(r)}
    rooms.sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));return j({ok:true,count:rooms.length,rooms,ttlHours:72,leaseSeconds:Math.floor(ROOM_DIRECTORY_LEASE/1000)});
  }
  async roomDirectoryDelete(body){const code=normalizeRoomCode(body?.code);if(isValidRoomCode(code))await this.ctx.storage.delete("roomdir:"+code);return j({ok:true,deleted:true,code})}

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
  async publicState(){const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(String(meta.phase||"").toLowerCase()==="deleted")return j({ok:false,error:"ROOM_NOT_FOUND"},404);let players=(await this.ctx.storage.get("players"))||{};const pruned=await this.pruneOfflinePlayers(meta,players);players=pruned.players;const interactions=(await this.ctx.storage.get("interactions"))||[],frozenLogins=activeFrozenLoginIds(interactions,meta,Date.now());return j({ok:true,room:publicRoom(meta),players:Object.values(players).map(p=>({...publicPlayer(p),frozen:meta?.statusDisplay?.frozen===false?false:frozenLogins.has(normalizeLoginId(p?.loginId)),statusTags:statusTagsFor(interactions,meta,p?.loginId,players)})),connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})}
  async gmAuthorized(request){const meta=await this.ctx.storage.get("meta");if(!meta)return{ok:false,response:j({ok:false,error:"ROOM_NOT_FOUND"},404)};const token=bearer(request);if(!token)return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};if(token!==GM_SYNC_TOKEN&&await sha256(token)!==meta.gmTokenHash)return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};
    if(meta.demo&&request.method==="POST"&&/^\/gm\/(?:battle-action|day-action|day-clock|gallows|turn|cycle|end)$/.test(new URL(request.url).pathname)){
      const lease=await this.ctx.storage.get("demoLease");
      if(lease?.engine!=="server"&&lease?.running&&Number(lease.until)>Date.now()&&request.headers.get("x-gmww-demo-owner")!==lease.owner)
        return{ok:false,response:j({ok:false,error:"DEMO_LEASE_OWNED",message:"Phòng Demo đang được điều khiển ở một phiên GM khác."},409)};
    }
    return{ok:true,meta,admin:token===GM_SYNC_TOKEN}}
  computeWinProposal(meta,assignments,interactions){
    if(String(meta?.phase||"").toLowerCase()!=="running")return null;
    if((Array.isArray(interactions)?interactions:[]).some(x=>
      x?.type==="artifact_win"&&x.artifactId==="artifact_26"&&
      x.effectActive!==false&&String(x.matchId||"")===String(meta.matchId||"")))
      return {winnerFaction:"Phe Dân",winnerLabel:"Phe Dân",
        reason:"Quả Cầu Phán Đoán xác nhận đúng hai Sói.",confidence:"artifact-rule"};
    const dead=new Set((Array.isArray(interactions)?interactions:[]).filter(x=>String(x?.type||"")==="dead"&&x?.effectActive!==false&&(!x?.matchId||!meta?.matchId||String(x.matchId)===String(meta.matchId))).map(x=>normalizeLoginId(x?.loginId)).filter(Boolean)),byPlayer=new Map();
    for(const a of Array.isArray(assignments)?assignments:[]){const lid=normalizeLoginId(a?.loginId);if(!lid||dead.has(lid))continue;const row=byPlayer.get(lid)||{loginId:lid,factions:new Set()};row.factions.add(normalizeWinnerFaction(a?.faction||""));byPlayer.set(lid,row)}
    const alive=[...byPlayer.values()];if(!alive.length)return null;
    const wolves=alive.filter(p=>p.factions.has("Phe Sói")).length,third=alive.filter(p=>p.factions.has("Phe Ba")).length,others=alive.length-wolves;
    const original=Array.isArray(assignments)?assignments:[],
      livingRole=role=>original.some(a=>a.roleId===role&&
        !dead.has(normalizeLoginId(a.loginId))),
      livingAny=roles=>original.some(a=>roles.includes(a.roleId)&&
        !dead.has(normalizeLoginId(a.loginId)));
    // Independent third-faction wins outrank default "no Wolves => Village".
    // Sát Thủ only wins if alive and ALL Wolves and Destroyers have died.
    if(livingRole("role_assassin")&&wolves===0&&!livingRole("role_destroyer"))
      return {winnerFaction:"Phe Ba",winnerLabel:"Sát Thủ",
        reason:"Toàn bộ Sói và Kẻ Hủy Diệt đã chết; Sát Thủ còn sống.",
        confidence:"special-role"};
    // Kẻ Hủy Diệt has its own victim checklist, not general Wolf parity.
    const destroyerTargets=["role_seer","role_witch","role_hunter","role_guard","role_assassin"];
    if(livingRole("role_destroyer")&&!livingAny(destroyerTargets))
      return {winnerFaction:"Phe Ba",winnerLabel:"Kẻ Hủy Diệt",
        reason:"Các Vai Trò bắt buộc phải chết của Kẻ Hủy Diệt không còn sống.",
        confidence:"special-role"};
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
  // One-shot death-triggered Artifacts: revive the OWNER, never change their
  // Role. The match-scoped use receipt survives reconnect and prevents a
  // second resurrection. Run before Hunter death-link propagation.
  async applyAutomaticArtifactRevive(meta,rows,now=new Date().toISOString()){
    const matchId=String(meta.matchId||""),assignments=await this.ctx.storage.get("assignments")||[];
    const saved=[];
    for(const row of assignments){
      const artifactId=String(row.artifactId||"");
      if(!["artifact_30","artifact_33"].includes(artifactId))continue;
      const loginId=normalizeLoginId(row.loginId),key="artifactUse:"+loginId+":"+artifactId;
      if(await this.ctx.storage.get(key))continue;
      const owned=await this.ctx.storage.get("artifact:"+loginId);
      if(!owned||String(owned.artifactId)!==artifactId||
        owned.removedFromMatch===true||owned.matchId&&String(owned.matchId)!==matchId)continue;
      const deaths=rows.filter(x=>x.type==="dead"&&x.effectActive!==false&&
        String(x.matchId||"")===matchId&&normalizeLoginId(x.loginId)===loginId);
      if(!deaths.length)continue;
      for(const death of deaths){
        death.effectActive=false;death.expiredAt=now;
        death.expiredReason="AUTOMATIC_ARTIFACT_REVIVAL";
        if(death.id)await this.ctx.storage.put(this.actionLogKey(death),death);
      }
      const event={id:"artifact-revival:"+matchId+":"+artifactId+":"+loginId,
        type:"revive",loginId,matchId,night:Number(meta.cycleNight||1),
        cycleKey:String(meta.cycleKey||""),artifactId,
        actionId:"artifact_auto_revive",effectActive:true,
        createdAt:now,source:"artifact-life-engine",
        message:artifactId==="artifact_30"?
          "Trượng Luân Hồi hồi sinh chủ với chính Vai Trò trước khi chết.":
          "Quyền Trượng Phục Sinh đã tự hồi sinh chủ."};
      if(!rows.some(x=>x.id===event.id)){
        rows.push(event);await this.ctx.storage.put(this.actionLogKey(event),event);
      }
      await this.ctx.storage.put(key,{requestId:event.id,matchId,usedAt:now,artifactId,actorId:loginId});
      owned.usedAt=now;await this.ctx.storage.put("artifact:"+loginId,owned);
      saved.push(loginId);
      this.broadcast({type:"player_revived",loginId,reason:"ARTIFACT_REVIVAL",
        artifactId,serverTime:Date.now()});
    }
    return saved;
  }
  async applyHunterDeathConsequences(meta,rows,now=new Date().toISOString()){
    await this.applyAutomaticArtifactRevive(meta,rows,now);
    const assignments=(await this.ctx.storage.get("assignments"))||[];
    const history=await this.villageHistoryForMatch(meta,rows);
    const linked=hunterLinkedDeaths({assignments,interactions:history,
      matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0)});
    for(const outcome of linked){
      if(rows.some(r=>String(r.id||"")===outcome.id))continue;
      const death={...outcome,createdAt:now,night:Math.max(1,Number(outcome.night)||Number(meta.cycleNight)||1)};
      rows.push(death);await this.ctx.storage.put(this.actionLogKey(death),death);
      this.broadcast({type:"player_status_changed",loginId:death.loginId,
        statusId:"dead",active:true,serverTime:Date.now()});
    }
    // Cupid, Sect and Cult relationships form a finite death graph;
    // process it after other fatal effects and before persisting/broadcast.
    const chain=resolveLinkedDeaths({assignments,interactions:rows,
      matchId:String(meta.matchId||""),night:Number(meta.cycleNight||1)});
    for(const consequence of chain){
      if(rows.some(x=>x.id===consequence.id))continue;
      const hit={...consequence,cycleKey:String(meta.cycleKey||""),createdAt:now};
      rows.push(hit);await this.ctx.storage.put(this.actionLogKey(hit),hit);
      this.broadcast({type:"player_status_changed",loginId:hit.loginId,
        statusId:"dead",active:true,serverTime:Date.now()});
    }
    if(linked.length||chain.length)await this.applyAutomaticArtifactRevive(meta,rows,now);
    return [...linked,...chain];
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
  // A ballot is scoped to one exact match and morning; old games never leak votes.
  async gallowsState(meta){
    const key="gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||"");
    const stored=await this.ctx.storage.get(key);
    // New Gallows ballots own both timers; pre-match game templates no longer set them.
    const nominationDurationSec=60,voteDurationSec=60;
    const ballot=stored&&stored.matchId===String(meta.matchId||"")&&stored.cycleKey===String(meta.cycleKey||"")?stored:{
      id:"gallows-"+crypto.randomUUID(),matchId:String(meta.matchId||""),cycleKey:String(meta.cycleKey||""),
      day:Number(meta.cycleNight||0),stage:"ready",candidateId:null,
      nominationDurationSec,voteDurationSec,
      nominations:{},votes:{},blocked:[],blockedNomination:[],blockedVotes:[],mode:"auto",eligible:[],outcome:null};
    const players=await this.ctx.storage.get("players")||{};
    const interactions=await this.ctx.storage.get("interactions")||[];
    const assignments=await this.ctx.storage.get("assignments")||[];
    // Peace Lover and Vòng Hoa Hòa Bình are passive, so both restrict
    // votes while the wearer remains an eligible current-match owner.
    const saveOnlyVoters=assignments.filter(x=>x.roleId==='role_peace_lover'||
      x.artifactId==='artifact_44').map(x=>normalizeLoginId(x.loginId));
    const doubleVoteVoters=assignments.filter(x=>x.artifactId==='artifact_21')
      .map(x=>normalizeLoginId(x.loginId));
    const forcedKillVoters=assignments.filter(x=>x.artifactId==='artifact_08')
      .map(x=>normalizeLoginId(x.loginId));
    const crowActors=new Set(assignments.filter(x=>x.roleId==='role_crow')
      .map(x=>normalizeLoginId(x.loginId)));
    const crowMarks=interactions.filter(x=>x.actionId==='action-g7-crow-votes'&&
      x.type==='effect_notice'&&x.undone!==true&&x.noEffect!==true&&
      String(x.matchId||'')===String(meta.matchId||'')&&
      Number(x.night)===Number(meta.cycleNight)&&
      crowActors.has(normalizeLoginId(x.actorId)))
      .map(x=>normalizeLoginId(x.loginId));
    const aliveNow=Object.values(players).filter(p=>p?.kind==="member"&&normalizeLoginId(p?.loginId))
      .map(p=>normalizeLoginId(p.loginId)).filter(loginId=>!interactions.some(row=>
        normalizeLoginId(row?.loginId)===loginId&&row?.effectActive!==false&&
        (!row?.matchId||String(row.matchId)===String(meta.matchId))&&
        ["dead","expelled"].includes(String(row.type))));
    // An Artifact's vote ban is server-enforced and cannot be removed via GM toggle.
    // Restrict to this calendar/game day; previous nights never leak into new voting.
    const foolVoteBans=[...new Set(interactions.filter(row=>
      row?.effectActive!==false&&row?.actionId==='action-fool-escape'&&
      String(row?.matchId||'')===String(meta.matchId||''))
      .map(row=>normalizeLoginId(row.loginId)).filter(Boolean))];
    const artifactVoteBans=[...new Set(interactions.filter(row=>row?.effectActive!==false&&
      row?.artifactId&&String(row?.type)==='status'&&String(row?.statusId)==='vote_ban'&&
      (!row.matchId||String(row.matchId)===String(meta.matchId))&&
      Number(row.night)===Number(meta.cycleNight)).map(row=>normalizeLoginId(row.loginId)).filter(Boolean))];
    // Freeze historical voter eligibility after resolution; the accused never
    // has a valid Save/Kill vote, including in older persisted ballots.
    const eligible=ballot.stage==="resolved"&&Array.isArray(ballot.eligible)&&ballot.eligible.length?
      ballot.eligible:aliveNow;
    const voteNow=Object.values(players).filter(p=>p?.kind==="member"&&normalizeLoginId(p.loginId)).map(p=>normalizeLoginId(p.loginId)).filter(id=>
      aliveNow.includes(id)||assignments.some(a=>normalizeLoginId(a.loginId)===id&&a.artifactId==='artifact_43')&&
      !interactions.some(x=>normalizeLoginId(x.loginId)===id&&x.type==='expelled'&&x.effectActive!==false&&(!x.matchId||String(x.matchId)===String(meta.matchId))));
    const voteEligible=ballot.stage==='resolved'&&Array.isArray(ballot.voteEligible)?ballot.voteEligible:[...new Set(voteNow)];
    let current={...ballot,eligible,voteEligible,saveOnlyVoters,doubleVoteVoters,forcedKillVoters,crowMarks,foolVoteBans,mode:gallowsMode(ballot),blockedNomination:gallowsBlockedNomination(ballot),blockedVotes:ballot.blockedVotes||[],artifactVoteBans,nominationDurationSec:ballot.nominationDurationSec??nominationDurationSec,voteDurationSec:ballot.voteDurationSec??voteDurationSec};
    // The room's Durable Object is authoritative. Real auto mode advances when
    // any GM or Player polls state; demos retain their scripted GM-driven clock.
    const now=Date.now();
    if(!meta.demo&&String(meta.phase)==="running"&&String(meta.cyclePhase)==="morning"&&current.mode==="auto"){
      let changed=false;
      if(current.stage==="nominating"&&now>=Number(current.nominationDeadlineAt||Infinity)){
        const closed=gallowsCloseNomination(current,now);
        if(closed.ok){current=closed.value;changed=true}
      }
      if(current.stage==="voting"&&now>=Number(current.deadlineAt||Infinity)){
        const proposed=gallowsAutomaticOutcome(current),
          fool=resolveFoolGallows({candidateId:current.candidateId,outcome:proposed,
            assignments,interactions,matchId:String(meta.matchId)});
        const decision=fool.outcome,done=gallowsResolve(current,decision,now);
        if(done.ok){
          current=done.value;changed=true;
          if(fool.escaped){
            const id="fool-escape:"+String(meta.matchId)+":"+current.candidateId;
            if(!interactions.some(x=>x.id===id)){
              const event={id,type:"status",statusId:"fool_vote_ban",
                loginId:current.candidateId,actionId:"action-fool-escape",
                matchId:String(meta.matchId),night:Number(meta.cycleNight),
                cycleKey:String(meta.cycleKey),effectActive:true,source:"gallows",
                createdAt:new Date(now).toISOString(),
                message:"Kẻ Ngốc sống sót lần treo đầu nhưng mất quyền bỏ phiếu."};
              interactions.push(event);
              await this.ctx.storage.put(this.actionLogKey(event),event);
              await this.ctx.storage.put("interactions",pruneInteractions(interactions));
            }
          }
          if(decision==="dead"){
            const rows=await this.ctx.storage.get("interactions")||[],loginId=current.candidateId;
            if(!rows.some(row=>normalizeLoginId(row.loginId)===loginId&&row.effectActive!==false&&
                String(row.type)==="dead"&&(!row.matchId||String(row.matchId)===String(meta.matchId)))){
              const createdAt=new Date(now).toISOString(),fatal={id:"ix-"+crypto.randomUUID(),
                type:"dead",loginId,matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),
                night:Number(meta.cycleNight),source:"gallows",gallowsId:current.id,effectActive:true,
                message:"Người chơi đã bị hành quyết theo kết quả bỏ phiếu tự động.",createdAt};
              rows.push(fatal);
              await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+fatal.id,fatal);
              // Automatic and manual Gallows MUST run the same artifact
              // resurrection, hunter-link, and death-chain adjudication.
              await this.applyHunterDeathConsequences(meta,rows,createdAt);
              await this.ctx.storage.put("interactions",pruneInteractions(rows));
              if(fatal.effectActive!==false)this.broadcast({type:"player_status_changed",
                loginId,statusId:"dead",active:true,serverTime:now});
            }
          }
        }
      }
      if(changed){await this.ctx.storage.put(key,current);
        this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:gallowsSnapshot(current,meta,now),serverTime:now})}
    }
    return {key,ballot:current,eligible};
  }
  async gmGallows(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta;
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="morning")
      return j({ok:false,error:"GALLOWS_DAY_ONLY"},409);
    const {key,ballot,eligible}=await this.gallowsState(meta),command=String(body?.command||"");
    const target=normalizeLoginId(body?.targetId||body?.loginId);
    const now=Date.now();
    if(command==="acknowledge"){
      if(body?.ballotId&&String(body.ballotId)!==ballot.id){
        if(String(body.ballotId)===String(ballot.previousBallotId||""))
          return j({ok:true,idempotent:true,gallows:gallowsSnapshot(ballot,meta,now)});
        return j({ok:false,error:"GALLOWS_VERDICT_CHANGED"},409);
      }
      if(ballot.stage==="resolved"&&ballot.extraRoundPending){
        const next=nextDoubleGallows(ballot,"gallows-"+crypto.randomUUID(),now);
        if(next){
          await this.ctx.storage.put(key+":archive:"+ballot.id,{...ballot,acknowledgedAt:now});
          await this.ctx.storage.put(key,next);
          if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
          const current=(await this.gallowsState(meta)).ballot;
          this.broadcast({type:"gallows_updated",gallows:gallowsSnapshot(current,meta,now),serverTime:now});
          await this.scheduleRoomAlarm(meta);
          return j({ok:true,extraRound:true,gallows:gallowsSnapshot(current,meta,now)});
        }
      }
      if(ballot.stage!=="resolved")return j({ok:false,error:"GALLOWS_VERDICT_NOT_READY"},409);
      const updated={...ballot,acknowledgedAt:now,updatedAt:now};
      await this.ctx.storage.put(key,updated);
      this.broadcast({type:"gallows_updated",gallows:gallowsSnapshot(updated,meta,now),serverTime:now});
      return j({ok:true,gallows:gallowsSnapshot(updated,meta,now)});
    }
    if(meta.demo&&body?.source==="demo"&&["open","begin","resolve"].includes(command)){
      const c=await this.ctx.storage.get("demoClock");if(c&&projectDemoClock(c,now).remainingMs>0)return j({ok:false,error:"DEMO_TIMER_RUNNING"},409);
    }
    let result;
    if(command==="set_duration"){
      result=gallowsSetDuration(ballot,String(body?.kind||""),body?.seconds,now);
    }else if(command==="close_nomination"){
      result=gallowsCloseNomination(ballot,now);
    }else if(command==="open"){
      result=gallowsOpen(ballot,now);
    }else if(command==="begin"){
      if(!eligible.includes(target))return j({ok:false,error:"INVALID_GALLOWS_CANDIDATE"},400);
      result=gallowsBegin(ballot,target,now);
    }else if(command==="hang"){
      if(!eligible.includes(target))return j({ok:false,error:"INVALID_GALLOWS_CANDIDATE"},400);
      result=gallowsSelectCandidate(ballot,target,now);
    }else if(command==="ban"){
      result=gallowsBan(ballot,target,now);
    }else if(command==="restriction"){
      result=gallowsSetRestriction(ballot,target,String(body?.kind||""),body?.banned===true,now);
    }else if(command==="mode"){
      result=gallowsSetMode(ballot,String(body?.mode||""),now);
    }else if(command==="manual_vote"){
      result=gallowsManualVote(ballot,target,body?.choice===null?null:String(body?.choice||""),now);
    }else if(command==="resolve"||command==="close_vote"){
      // GM manual verdict: no nomination clock, no public ballot, no waiting.
      // In automatic mode only the existing authorized DEMO driver may resolve.
      if(command==='close_vote'&&(gallowsMode(ballot)!=='auto'||!['voting','closed'].includes(ballot.stage)))
        return j({ok:false,error:'VOTING_NOT_OPEN'},409);
      if(command==='resolve'&&gallowsMode(ballot)==='auto'&&!(meta.demo&&body?.source==='demo'))
        return j({ok:false,error:'AUTO_VERDICT_SERVER_ONLY'},403);
      result=command==='close_vote'?
        gallowsResolve({...ballot,stage:'closed',deadlineAt:now},gallowsAutomaticOutcome(ballot),now):
        gallowsMode(ballot)==='gm'?
          gallowsManualResolve(ballot,target,String(body?.outcome||''),now):
          gallowsResolve(ballot,String(body?.outcome||''),now);
      if(result.ok&&result.value.outcome==="dead"){
        const currentRows=await this.ctx.storage.get("interactions")||[],
          assigned=await this.ctx.storage.get("assignments")||[],
          fool=resolveFoolGallows({candidateId:result.value.candidateId,outcome:"dead",
            assignments:assigned,interactions:currentRows,matchId:String(meta.matchId)});
        result.value={...result.value,outcome:fool.outcome};
        if(fool.escaped){
          const loginId=result.value.candidateId,id="fool-escape:"+String(meta.matchId)+":"+loginId;
          result.value={...result.value,outcome:"alive"};
          if(!currentRows.some(x=>x.id===id)){
            const event={id,type:"status",statusId:"fool_vote_ban",loginId,
              actionId:"action-fool-escape",matchId:String(meta.matchId),
              night:Number(meta.cycleNight),cycleKey:String(meta.cycleKey),
              effectActive:true,createdAt:new Date(now).toISOString(),source:"gallows",
              message:"Kẻ Ngốc lần đầu lên giàn được tha nhưng mất quyền bỏ phiếu."};
            currentRows.push(event);await this.ctx.storage.put(this.actionLogKey(event),event);
            await this.ctx.storage.put("interactions",pruneInteractions(currentRows));
          }
        }
      }
      if(result.ok&&result.value.outcome==="dead"){
        const rows=await this.ctx.storage.get("interactions")||[],loginId=result.value.candidateId;
        if(!rows.some(x=>normalizeLoginId(x.loginId)===loginId&&x.effectActive!==false&&
           String(x.type)==="dead"&&(!x.matchId||String(x.matchId)===String(meta.matchId)))){
          const createdAt=new Date(now).toISOString(),fatal={id:"ix-"+crypto.randomUUID(),
            type:"dead",loginId,matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),
            night:Number(meta.cycleNight),source:"gallows",gallowsId:ballot.id,effectActive:true,
            message:"Người chơi đã bị hành quyết trên giàn.",createdAt};
          rows.push(fatal);
          await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+fatal.id,fatal);
          if(typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,createdAt);
          await this.ctx.storage.put("interactions",pruneInteractions(rows));
          if(fatal.effectActive!==false)this.broadcast({type:"player_status_changed",
            loginId,statusId:"dead",active:true,serverTime:now});
        }
      }
    }else if(command==="restore"){
      // Undo only the gallows-owned consequence; never erase deaths from other roles.
      const rows=await this.ctx.storage.get("interactions")||[];
      const owned=rows.filter(x=>x.gallowsId===ballot.id&&String(x.type)==="dead"&&x.effectActive!==false);
      for(const row of owned){row.effectActive=false;row.expiredAt=new Date(now).toISOString();row.expiredReason="GM_GALLOWS_RESTORE"}
      if(owned.length){
        for(const followup of rows){
          if(followup.source!=="hunter-death-engine"||!owned.some(x=>x.id===followup.causeDeathId))continue;
          followup.effectActive=false;followup.expiredAt=new Date(now).toISOString();
          followup.expiredReason="GM_GALLOWS_RESTORE";
        }
        await this.ctx.storage.put("interactions",pruneInteractions(rows));
        this.broadcast({type:"player_revived",loginId:ballot.candidateId,serverTime:now})}
      result={ok:true,value:{...ballot,id:"gallows-"+crypto.randomUUID(),stage:"ready",
        nominationDeadlineAt:null,nominationStartedAt:null,
        candidateId:null,deadlineAt:null,startedAt:null,nominations:{},votes:{},
        outcome:null,resolvedAt:null,updatedAt:now}};
    }else return j({ok:false,error:"INVALID_GALLOWS_COMMAND"},400);
    if(!result.ok)return j({ok:false,error:result.error},409);
    await this.ctx.storage.put(key,result.value);
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    const publicBallot=gallowsSnapshot(meta.demo?await this.ctx.storage.get(key):result.value,meta,now);
    this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:publicBallot,serverTime:now});
    return j({ok:true,gallows:publicBallot,serverTime:now});
  }
  // Member session is verified at the public route; loginId cannot be forged by Player Web.
  // The SAME GM action handlers enforce target legality, role limits, use ledger and receipts.
  async playerDemoAction(body){return this.playerPhaseAction(body,false)}
  async playerPhaseAction(body,online=false){
    const meta=await this.ctx.storage.get("meta"),loginId=normalizeLoginId(body?.loginId);
    if(online?(meta?.demo===true||meta?.phase!=="running"||String(meta?.roomMode||"").toLowerCase()!=="online"):(meta?.demo!==true||meta?.phase!=="running"))
      return j({ok:false,error:online?"ONLINE_ACTION_NOT_RUNNING":"DEMO_ACTION_NOT_RUNNING"},409);
    const players=await this.ctx.storage.get("players")||{};
    if(!loginId||!players["member:"+loginId]||(!online&&players["member:"+loginId]?.humanControlled!==true))
      return j({ok:false,error:online?"ONLINE_PLAYER_NOT_JOINED":"DEMO_PLAYER_NOT_JOINED"},403);
    if(String(body?.matchId||"")!==String(meta.matchId||"")||
      String(body?.cycleKey||"")!==String(meta.cycleKey||""))
      return j({ok:false,error:"DEMO_ACTION_STALE"},409);
    const actions=online?await playerOfferedActions(this,meta,loginId):await demoPlayerActions(this,meta,loginId),
      action=actions.find(a=>a.key===String(body?.actionKey||""));
    if(!action)return j({ok:false,error:"DEMO_ACTION_ALREADY_USED_OR_NOT_YOUR_TURN"},409);
    const targets=Array.isArray(body?.targetIds)?body.targetIds.map(normalizeLoginId):[];
    if(targets.length!==action.targetCount||new Set(targets).size!==targets.length||
      targets.some(id=>!id||!players["member:"+id]||(action.noSelf&&id===loginId)))
      return j({ok:false,error:"DEMO_TARGET_INVALID"},400);
    const request=this.demoInternalRequest(),token=(online?"human-online-":"human-demo-")+crypto.randomUUID();
    let response;
    if(meta.cyclePhase==="morning"){
      response=await this.gmDayAction(request,{matchId:meta.matchId,cycleKey:meta.cycleKey,
        actorId:loginId,roleId:action.roleId,artifactId:action.artifactId,
        actionId:action.actionId,targetIds:targets,clientEventId:token});
    }else if(meta.cyclePhase==="night"){
      const runtime=await this.getNightRuntime(meta,meta.cycleNight,false),
        turn=runtime?.queue?.[runtime.cursor];
      if(!turn||runtime.completed)return j({ok:false,error:"DEMO_TURN_ENDED"},409);
      const seer=!action.artifactId&&['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(action.actionId),
        transfer=!action.artifactId&&action.actionId==="action_transfer_bite",
        assassin=action.actionId==="action_assassin_mark",
        direction=String(body?.direction||""),choice=String(body?.assassinChoice||"");
      if(transfer&&!["left","none","right"].includes(direction))return j({ok:false,error:"DEMO_DIRECTION_REQUIRED"},400);
      if(assassin&&!["👍","👎"].includes(choice))return j({ok:false,error:"DEMO_ASSASSIN_CHOICE_REQUIRED"},400);
      response=await this.gmBattleAction(request,{matchId:meta.matchId,cycleKey:meta.cycleKey,
        turnId:turn.id,night:meta.cycleNight,actorId:loginId,artifactId:action.artifactId,
        actionId:action.actionId,type:action.type,effectId:"",effectName:action.name,
        targetIds:seer||transfer||action.noTarget?[loginId]:targets,
        ...(seer?{revealTargetIds:targets}:{}),...(transfer?{direction}:{}),
        ...(assassin?{assassinChoice:choice}:{}),clientEventId:token,source:online?"online-human":"demo-human"});
    }else return j({ok:false,error:"DEMO_PHASE_INVALID"},409);
    if(!response.ok)return response;
    const result=await response.json();
    // Never forward the GM undo ledger, wolf pack internals or private assignments.
    return j({ok:true,actionId:action.actionId,actorId:loginId,
      ...(result.revelation?{revelation:result.revelation}:{}),
      ...(meta.cyclePhase==="morning"&&result.result?{result:result.result}: {})});
  }
  async playerGallows(body,authorizedDemo=false){
    const meta=await this.ctx.storage.get("meta"),loginId=normalizeLoginId(body?.loginId);
    if(meta?.demo===true&&!authorizedDemo){
      const actor=(await this.ctx.storage.get("players")||{})["member:"+loginId];
      if(actor?.humanControlled!==true)return j({ok:false,error:"DEMO_PLAYER_NOT_JOINED"},403);
    }
    if(!meta||String(meta.phase)!=="running"||String(meta.cyclePhase)!=="morning")
      return j({ok:false,error:"GALLOWS_DAY_ONLY"},409);
    const {key,ballot,eligible}=await this.gallowsState(meta),command=String(body?.command||"");
    const permitted=command==='vote'?(ballot.voteEligible||eligible):eligible;
    if(!loginId||!permitted.includes(loginId))return j({ok:false,error:"VOTER_NOT_ELIGIBLE"},403);
    if(gallowsMode(ballot)==="gm")return j({ok:false,error:"GM_MANUAL_MODE"},403);
    const now=Date.now();
    let result;
    if(command==="nominate"){
      const target=normalizeLoginId(body?.targetId);
      if(!eligible.includes(target))return j({ok:false,error:"INVALID_GALLOWS_CANDIDATE"},400);
      if(gallowsBlockedNomination(ballot).includes(loginId))return j({ok:false,error:"NOMINATION_BANNED"},403);
      result=gallowsNominate(ballot,loginId,target,now);
    }else if(command==="vote"){
      if(gallowsBlockedVotes(ballot).includes(loginId))return j({ok:false,error:"VOTER_BANNED"},403);
      result=gallowsCast(ballot,loginId,String(body?.choice||""),now);
    }
    else return j({ok:false,error:"INVALID_GALLOWS_COMMAND"},400);
    if(!result.ok)return j({ok:false,error:result.error},409);
    await this.ctx.storage.put(key,result.value);
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    const publicBallot=gallowsSnapshot(meta.demo?await this.ctx.storage.get(key):result.value,meta,now);
    this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:publicBallot,serverTime:now});
    return j({ok:true,gallows:publicBallot,serverTime:now});
  }
  async gmState(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const {meta}=auth;let players=(await this.ctx.storage.get("players"))||{};const pruned=await this.pruneOfflinePlayers(meta,players);players=pruned.players;
    const interactions=(await this.ctx.storage.get("interactions"))||[],effectTypes=new Set(["frozen","expelled","dead","assassin_mark","status"]),activeEffects=[...interactions.filter(x=>effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())&&(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId))),...confirmedNightStatusVisuals(interactions,meta,players)].slice(-100),interactionResponses=interactions.filter(x=>x?.status==="responded").slice(-100),artifactCycleKeyValue=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKeyValue))||{cycleKey:artifactCycleKeyValue,accepted:[]};
    const battleActionUsage=(await this.ctx.storage.get("battleRoleUsage:"+String(meta.matchId||"")))||[];
    const lastBattleAction=await this.ctx.storage.get("battleLastAction:"+String(meta.matchId||""));
    const battleUndo=lastBattleAction&&!lastBattleAction.undone&&lastBattleAction.cycleKey===String(meta.cycleKey||"")&&String(meta.cyclePhase||"").toLowerCase()==="night"?{token:lastBattleAction.token,label:lastBattleAction.label,targets:lastBattleAction.targetIds,turnId:lastBattleAction.turnId}:null;
    const assignments=(await this.ctx.storage.get("assignments"))||[],nightRuntime=String(meta.cyclePhase||"").toLowerCase()==="night"&&Number(meta.cycleNight||0)>0?await this.getNightRuntime(meta,Number(meta.cycleNight),true):null,winProposal=this.computeWinProposal(meta,assignments,interactions);
    const nightIntel=String(meta.cyclePhase||"")==="night"?resolveWolfNight({interactions,players,assignments:await readNightAssignments(this.ctx.storage,meta.matchId),matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0)}):null;
    const drunkDraws=[];
    if(Number(meta.cycleNight)===3&&String(meta.cyclePhase)==='night'){
      const entries=await this.ctx.storage.list({prefix:'drunkDeck:'+String(meta.matchId)+':3:'});
      for(const deck of entries.values())drunkDraws.push(drunkDeckView(deck,true));
    }
    const demoLease=meta.demo?await this.ctx.storage.get("demoLease"):null;
    const storedDemoClock=meta.demo?await this.ctx.storage.get("demoClock"):null,
      demoClock=storedDemoClock?projectDemoClock(storedDemoClock,Date.now()):null;
    if(meta.demo&&meta.autoGM!==true&&nightRuntime&&demoClock?.kind==="night"){
      nightRuntime.deadlineAt=demoClock.deadlineAt?new Date(demoClock.deadlineAt).toISOString():null;
      nightRuntime.autoPausedRemainingMs=demoClock.running?0:demoClock.remainingMs/demoClock.speed;
    }
    return j({ok:true,demoControl:meta.demo?{engine:demoLease?.engine||"server",paused:demoLease?.reason==="paused",reason:demoLease?.reason||"",error:demoLease?.error||"",steps:Number(demoLease?.steps||0),lastEvent:demoLease?.lastEvent||null,history:(Array.isArray(demoLease?.history)?demoLease.history:[]).filter(event=>String(event?.matchId||'')===String(meta.matchId||'')),running:serverDemoActive(meta,demoLease),speed:Math.max(1,Number(demoLease?.speed)||1),until:Number(demoLease?.until)||0,clock:demoClock}:null,serverTime:Date.now(),room:publicRoom(meta),players:Object.values(players).map(publicPlayer),gameConfig:(await this.ctx.storage.get("gameConfig"))||null,assignments,interactions:interactions.slice(-100),
      // Unlike the 100-row rules buffer, the immutable actionLog archive
      // includes older nights and nonpersistent effects (effect_notice, healed...).
      // Never derive the village bulletin from only the short-lived rules buffer.
      villageHistory:await this.villageHistoryForMatch(meta,interactions),
      interactionResponses,activeEffects,drunkDraws,artifactCycle:{cycleKey:artifactCycleKeyValue,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:Math.max(0,Math.min(30,Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3))),accepted:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.slice(-30):[]},nightRuntime,battleUndo,battleActionUsage,nightIntel,winProposal,dayActionUsage:await this.ctx.storage.get("dayRoleUsage:"+String(meta.matchId||""))||[],gallows:String(meta.cyclePhase)==="morning"?gallowsSnapshot((await this.gallowsState(meta)).ballot,meta):null,connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})
  }
  async gmRoleAssets(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,rows=Array.isArray(body?.roles)?body.roles:[];
    if(!rows.length)return j({ok:false,error:"NO_ROLE_PACKAGES",message:"Chưa có gói dữ liệu Vai Trò."},400);
    const stored=[];
    for(const raw of rows){
      const roleId=String(raw?.roleId||raw?.id||"").slice(0,120);if(!roleId)continue;
      const roleCard=roleId.startsWith("artifact:")?sanitizePlayerArtifactCard(raw?.roleCard||raw):sanitizePlayerRoleCard(raw?.roleCard||raw),artworkAssetId=String(raw?.artworkAssetId||raw?.artworkId||roleCard.artworkAssetId||roleCard.artworkId||("role:"+roleId)).slice(0,180),roleImage=extractRoleImage(raw);
      if(roleImage){await this.ctx.storage.put("artworkAsset:"+artworkAssetId,roleImage);await this.ctx.storage.put("roleAsset:"+roleId,roleImage)}
      const normalizedCard={...roleCard,artworkAssetId,artworkId:artworkAssetId};
      await this.ctx.storage.put("roleCatalog:"+roleId,{roleId,roleName:normalizedCard.name||String(raw?.roleName||raw?.name||"Vai Trò"),faction:normalizedCard.faction??raw?.faction??"",description:normalizedCard.information??raw?.description??"",artworkAssetId,artworkId:artworkAssetId,roleCard:normalizedCard,updatedAt:new Date().toISOString()});
      stored.push({roleId,hasImage:!!roleImage,artworkAssetId,roleName:normalizedCard.name||String(raw?.roleName||raw?.name||"Vai Trò")});
    }
    meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
    return j({ok:true,count:stored.length,roles:stored});
  }
  async gmArtworkRefs(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const kind=String(body?.kind||""),refs=Array.isArray(body?.refs)?body.refs:[];
    if(!["template","artifact"].includes(kind)||!refs.length||refs.length>(kind==="artifact"?100:30))return j({ok:false,error:"INVALID_ARTWORK_REFERENCES",message:"Một ván cho phép tối đa 100 Artifact hoặc 30 Vai Trò."},400);
    const clean=[],seen=new Set();
    for(const raw of refs){
      const assetId=String(raw?.assetId||""),roleId=String(raw?.roleId||"");
      if(!/^(role|artifact):[A-Za-z0-9._:-]{1,120}$/.test(assetId)||!roleId||seen.has(assetId)||assetId!==((kind==="template"?"role:":"artifact:")+roleId))return j({ok:false,error:"INVALID_ARTWORK_REFERENCE",assetId},400);
      const reference=kind==="template"?{kind,assetId,templateId:String(raw?.templateId||""),revision:Number(raw?.revision)}:{kind,assetId,signature:String(raw?.signature||"")};
      if(kind==="template"&&(!reference.templateId||!Number.isSafeInteger(reference.revision)||reference.revision<1))return j({ok:false,error:"INVALID_TEMPLATE_REFERENCE"},400);
      if(kind==="artifact"&&!/^[0-9a-f]{64}$/.test(reference.signature))return j({ok:false,error:"INVALID_ARTIFACT_REFERENCE"},400);
      seen.add(assetId);clean.push({assetId,roleId,reference,raw});
    }
    // New clients link a complete template in one atomic logical batch.
    // Legacy V3.70 clients submit one role per request: merge only when the
    // template ID and revision match, without retaining an earlier match.
    if(kind==="template"){
      const scope=clean[0].reference.templateId+"@"+clean[0].reference.revision;
      if(clean.some(x=>x.reference.templateId+"@"+x.reference.revision!==scope))
        return j({ok:false,error:"MIXED_TEMPLATE_REVISIONS"},400);
      const merge=body?.merge===true&&(await this.ctx.storage.get("gmArtworkTemplateScope"))===scope;
      if(!merge){
        const prior=await this.ctx.storage.list({prefix:"artworkRef:"});
        if(prior.size)await this.ctx.storage.delete([...prior.keys()]);
      }
      const active=merge?(await this.ctx.storage.get("gmArtworkActiveIds"))||[]:[];
      await this.ctx.storage.put("gmArtworkTemplateScope",scope);
      await this.ctx.storage.put("gmArtworkActiveIds",[...new Set([...active,...clean.map(x=>x.assetId)])]);
    }else{
      const prior=(await this.ctx.storage.get("gmArtworkActiveIds"))||[];
      await this.ctx.storage.put("gmArtworkActiveIds",[...new Set([...prior,...clean.map(x=>x.assetId)])]);
    }
    // Group the metadata writes. 44 Artifact used to require 88 sequential
    // Durable Object writes per game; each 50-card chunk now uses one batch.
    for(let offset=0;offset<clean.length;offset+=50){
      const records={};
      for(const item of clean.slice(offset,offset+50)){
        const {assetId,roleId,reference,raw}=item;
        const roleCard=kind==="artifact"?sanitizePlayerArtifactCard(raw.roleCard||{}):sanitizePlayerRoleCard(raw.roleCard||{});
        records["artworkRef:"+assetId]=reference;
        records["roleCatalog:"+(kind==="artifact"?assetId:roleId)]={roleId:kind==="artifact"?assetId:roleId,roleName:String(roleCard.name||raw.roleName||""),faction:roleCard.faction||raw.faction||"",description:roleCard.information||raw.description||"",artworkAssetId:assetId,artworkId:assetId,roleCard,updatedAt:new Date().toISOString()};
      }
      await this.ctx.storage.put(records);
    }
    return j({ok:true,ready:true,mode:"reference",count:clean.length,assetIds:clean.map(x=>x.assetId)});
  }
  async gmArtworkManifest(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const active=await this.ctx.storage.get("gmArtworkActiveIds");
    if(Array.isArray(active))return j({ok:true,count:active.length,assetIds:active,mode:"reference"});
    const rows=await this.ctx.storage.list({prefix:"artworkAsset:"}),assetIds=[...rows.keys()].map(k=>String(k).slice("artworkAsset:".length));
    return j({ok:true,count:assetIds.length,assetIds,mode:"legacy"});
  }
  async roleAssetImage(roleId){
    // Artwork is preloaded privately during setup but MUST remain unavailable to Player Web until Phát Vai.
    const meta=await this.ctx.storage.get('meta');
    if(!['role_delivery','running','started','game','playing'].includes(String(meta?.phase||'').toLowerCase()))return new Response('Artwork is not released',{status:404,headers:{'cache-control':'no-store'}});
    const rid=String(roleId||"");
    const active=await this.ctx.storage.get("gmArtworkActiveIds");
    if(Array.isArray(active)&&!active.includes(rid))return new Response("Artwork not assigned to this match",{status:404,headers:{"cache-control":"no-store"}});
    const ref=await this.ctx.storage.get("artworkRef:"+rid);
    if(ref){
      const p=new URLSearchParams({assetId:rid});
      let endpoint="";
      if(ref.kind==="template"){p.set("id",ref.templateId);p.set("revision",String(ref.revision));endpoint="/game-templates/assets/image"}
      else if(ref.kind==="artifact"){p.set("signature",ref.signature);endpoint="/artifacts/shared/image"}
      else return new Response("Invalid artwork reference",{status:404});
      try{
        const store=this.env.ROOMS.get(this.env.ROOMS.idFromName(MEMBER_STORE_NAME));
        const asset=await store.fetch("https://member.internal"+endpoint+"?"+p);
        if(!asset.ok)return new Response("Referenced artwork unavailable",{status:asset.status===400?400:404,headers:{"cache-control":"no-store","x-gmww-artwork-state":"missing"}});
        return new Response(asset.body,{status:200,headers:{"content-type":asset.headers.get("content-type")||"image/webp","cache-control":"private, max-age=3600","x-content-type-options":"nosniff","x-gmww-artwork-asset":rid}});
      }catch{return new Response("Artwork reference temporarily unavailable",{status:503,headers:{"cache-control":"no-store"}})}
    }
    if(Array.isArray(active))return new Response("Referenced artwork missing",{status:404,headers:{"cache-control":"no-store"}});
    const direct=await this.ctx.storage.get("artworkAsset:"+rid);
    const pkg=(await this.ctx.storage.get("roleCatalog:"+rid))||{},assetId=String(pkg.artworkAssetId||pkg.artworkId||rid||("role:"+rid));
    const primary=direct||await this.ctx.storage.get("artworkAsset:"+assetId),legacy=await this.ctx.storage.get("roleAsset:"+rid),src=primary||legacy;
    if(!src)return new Response("Role artwork not found",{status:404,headers:{"cache-control":"no-store","x-gmww-artwork-state":"missing"}});
    if(/^https:\/\//i.test(src))return Response.redirect(src,302);
    const m=String(src).match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/i);if(!m)return new Response("Invalid role artwork",{status:500});
    try{const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"private, max-age=3600","x-content-type-options":"nosniff","x-gmww-artwork-asset":assetId}})}catch{return new Response("Invalid role artwork",{status:500})}
  }
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
  async demoClockContext(meta){
    const cfg=await this.ctx.storage.get("gameConfig")||{},prefix=String(meta.matchId||"")+":"+String(meta.cycleKey||"");
    if(meta.cyclePhase==="night"){
      const rt=await this.getNightRuntime(meta,Math.max(1,Number(meta.cycleNight)||1),false),turn=rt?.queue?.[rt.cursor];
      return {key:prefix+":"+String(turn?.id||"done"),kind:"night",durationMs:Math.max(0,Number(turn?.durationSec)||0)*1000};
    }
    const key="gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""),ballot=await this.ctx.storage.get(key)||{stage:"ready"},stage=String(ballot.stage||"ready"),
      seconds=stage==="ready"?cfg.timing?.villageDiscussionSec:stage==="nominating"?ballot.nominationDurationSec:stage==="voting"?ballot.voteDurationSec:0;
    return {key:prefix+":"+String(ballot.id||"day")+":"+stage,kind:stage==="ready"?"discussion":stage,durationMs:Math.max(0,Number(seconds)||0)*1000};
  }
  async syncDemoClock(meta,lease){
    if(meta.demo!==true||meta.autoGM===true)return null;
    const now=Date.now(),context=await this.demoClockContext(meta),previous=await this.ctx.storage.get("demoClock"),clock=nextDemoClock(previous,context,lease,now);
    await this.ctx.storage.put("demoClock",clock);
    if(meta.cyclePhase==="morning"){
      if(clock.kind==="discussion"){meta.dayDeadlineAt=clock.deadlineAt?new Date(clock.deadlineAt).toISOString():null;meta.autoPausedRemainingMs=clock.running?null:clock.remainingMs/clock.speed;await this.ctx.storage.put("meta",meta)}
      const key="gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""),ballot=await this.ctx.storage.get(key);
      if(ballot&&["nominating","voting"].includes(clock.kind)){
        const field=clock.kind==="nominating"?"nominationDeadlineAt":"deadlineAt";
        ballot[field]=clock.deadlineAt;await this.ctx.storage.put(key,ballot);
      }
    }
    return clock;
  }
  demoInternalRequest(){return new Request("https://room.internal/gm/demo-server",{method:"POST",headers:{authorization:"Bearer "+GM_SYNC_TOKEN}})}
  async gmDemo(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;
    if(meta.demo!==true)return j({ok:false,error:"NOT_DEMO_ROOM"},403);
    const command=String(body?.command||"status"),previous=await this.ctx.storage.get("demoLease")||{},now=Date.now(),
      speed=[1,2,5,10].includes(Number(body?.speed))?Number(body.speed):Math.max(1,Number(previous.speed)||1);
    if(!["status","start","stop","speed","hold","release"].includes(command))return j({ok:false,error:"DEMO_SERVER_OWNED",message:"Demo chạy trên server. Hãy cập nhật Runtime để điều khiển."},409);
    if(command==="start"&&body?.owner)return j({ok:false,error:"DEMO_RUNTIME_UPDATE_REQUIRED",message:"Hãy cập nhật Runtime để dùng Demo chạy trên server."},409);
    if(command==="start"){
      if(meta.autoGM===true)return j({ok:false,error:"DEMO_AUTO_GM_ACTIVE"},409);
      if(meta.phase!=="running")return j({ok:false,error:"DEMO_MATCH_NOT_STARTED"},409);
    }
    const same=previous.engine==="server"&&previous.matchId===String(meta.matchId||"");
    let lease=same?{...previous}:{engine:"server",matchId:String(meta.matchId||""),running:false,speed,steps:0,startedAt:now,until:0,owner:""};
    if(command==="stop")lease={...lease,running:false,reason:"paused",holdUntil:0};
    if(command==="start")lease={...lease,running:true,reason:"",error:"",holdUntil:0};
    if(command==="hold"&&lease.running)lease.holdUntil=now+10000;
    if(command==="release")lease.holdUntil=0;
    if(command!=="status"){
      lease.speed=speed;await this.syncDemoClock(meta,lease);await this.ctx.storage.put("demoLease",lease);await this.scheduleRoomAlarm(meta);
      this.broadcast({type:"demo_control",running:lease.running,serverTime:now});
    }
    const stored=await this.ctx.storage.get("demoClock"),clock=stored?projectDemoClock(stored,now):null;
    return j({ok:true,engine:"server",running:serverDemoActive(meta,lease),paused:lease.reason==="paused",speed:lease.speed,clock,reason:lease.reason||"",error:lease.error||"",steps:Number(lease.steps||0),lastEvent:lease.lastEvent||null,history:(Array.isArray(lease.history)?lease.history:[]).filter(event=>String(event?.matchId||'')===String(meta.matchId||'')&&String(event?.cycleKey||'')===String(meta.cycleKey||''))});
  }

  async gmAuto(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    if(body?.enabled!==false&&auth.meta.demo){const lease=await this.ctx.storage.get("demoLease");if(lease?.engine==="server")await stopServerDemo(this,auth.meta,lease,"auto_gm")}
    const meta=auth.meta,enabled=body?.enabled!==false,wasEnabled=meta.autoGM!==false,nowMs=Date.now(),now=new Date(nowMs).toISOString(),phase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(0,Number(meta.cycleNight||0)),runtimeKey=night>0?this.nightRuntimeKey(meta,night):"",runtime=phase==="night"&&night>0?await this.getNightRuntime(meta,night,false):null;
    if(wasEnabled&&!enabled){
      if(runtime&&!runtime.completed){
        const deadline=Date.parse(runtime.deadlineAt||""),active=runtime.queue?.[runtime.cursor],fallback=active&&Number(active.durationSec)>0?Number(active.durationSec)*1000:0;
        runtime.autoPausedRemainingMs=Number.isFinite(deadline)?Math.max(0,deadline-nowMs):fallback;runtime.deadlineAt=null;runtime.autoAdvance=false;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)
      }else if(phase==="morning"||phase==="day"){
        const cfg=(await this.ctx.storage.get("gameConfig"))||{};
        meta.autoPausedRemainingMs=dayClockRemainingMs(meta,cfg,nowMs)
      }
    }else if(!wasEnabled&&enabled){
      if(runtime&&!runtime.completed){
        const active=runtime.queue?.[runtime.cursor],fallback=active&&Number(active.durationSec)>0?Number(active.durationSec)*1000:0,stored=Number(runtime.autoPausedRemainingMs),remaining=Number.isFinite(stored)?Math.max(0,stored):fallback;
        runtime.deadlineAt=remaining>0?new Date(nowMs+Math.max(100,remaining)).toISOString():null;runtime.autoPausedRemainingMs=0;runtime.autoAdvance=true;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)
      }else if(phase==="morning"||phase==="day"){
        const cfg=(await this.ctx.storage.get("gameConfig"))||{},remaining=dayClockRemainingMs(meta,cfg,nowMs);
        meta.dayDeadlineAt=new Date(nowMs+remaining).toISOString();meta.autoPausedRemainingMs=null
      }
    }
    meta.autoGM=enabled;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    if(runtime){runtime.autoAdvance=enabled;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)}
    await this.scheduleRoomAlarm(meta);
    const players=(await this.ctx.storage.get("players"))||{},room=publicRoom(meta);
    this.broadcast({type:"auto_gm",enabled,room,players:Object.values(players).map(publicPlayer),nightRuntime:runtime||null,at:now,serverTime:Date.now()});
    this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),serverTime:Date.now()});
    return j({ok:true,autoGM:enabled,room,nightRuntime:runtime||null})
  }
  async gmEnabled(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,enabled=body?.enabled!==false,now=new Date().toISOString();
    meta.enabled=enabled;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    const players=(await this.ctx.storage.get("players"))||{},publicPlayers=Object.values(players).map(publicPlayer),room=publicRoom(meta);
    if(!enabled){
      // Evict all existing occupants (including disconnected clients), not only new join attempts.
      // The response retains their identities so the public wrapper can reset member presence.
      this.broadcast({type:"room_disabled",room,players:publicPlayers,serverTime:Date.now()});
      for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_DISABLED")}catch{}
      await this.ctx.storage.put("players",{});
    }else{
      this.broadcast({type:"room_state",room,players:publicPlayers,serverTime:Date.now()});
    }
    return j({ok:true,room,enabled,players:publicPlayers})
  }
  async gmLock(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;meta.locked=false;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,ignored:body?.locked===true,reason:body?.locked===true?"ROOM_LOCK_DISABLED":null,room:publicRoom(meta)})}
  async gmKick(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},requested=String(body?.participantId||""),loginId=normalizeLoginId(body?.loginId),id=requested||(loginId?("member:"+loginId):"");
    const p=players[id];if(!id||!p)return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Không tìm thấy Người Chơi trong Phòng."},404);
    delete players[id];await this.ctx.storage.put("players",players);
    if(p?.loginId){
      const evicted=(await this.ctx.storage.get("evictedMembers"))||[];
      await this.ctx.storage.put("evictedMembers",[...new Set([...evicted,normalizeLoginId(p.loginId)])].slice(-100));const lid=normalizeLoginId(p.loginId);await this.ctx.storage.delete("role:"+lid);await this.ctx.storage.delete("roles:"+lid);await this.ctx.storage.delete("artifact:"+lid);const rows=(await this.ctx.storage.get("assignments"))||[],next=rows.filter(a=>normalizeLoginId(a?.loginId)!==lid);if(next.length!==rows.length)await this.ctx.storage.put("assignments",next)}
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    for(const ws of this.ctx.getWebSockets())try{if(ws.deserializeAttachment()?.participantId===id){ws.send(JSON.stringify({type:"player_kicked",participantId:id,reason:"GM_KICK"}));ws.close(1000,"PLAYER_KICKED")}}catch{}
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});
    return j({ok:true,kicked:true,player:publicPlayer(p),room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});
  }
  async gmParticipants(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"ROSTER_LOCKED_IN_MATCH",message:"Không đổi danh sách Thành Viên khi ván đang chạy."},409);
    const incoming=Array.isArray(body?.members)?body.members:[],replace=body?.replace!==false,now=new Date().toISOString(),players=(await this.ctx.storage.get("players"))||{},wanted=new Map();
    for(const raw of incoming.slice(0,100)){
      const loginId=normalizeLoginId(raw?.loginId);if(!LOGIN_RE.test(loginId))continue;
      wanted.set(loginId,{loginId,displayName:normalizeDisplayName(raw?.displayName||loginId).slice(0,24),avatarId:String(raw?.avatarId||"").slice(0,160),gameCharacterId:normalizeGameCharacterId(raw?.gameCharacterId),seatId:normalizeSeatId(raw?.seatId,meta.seatCount)});
    }
    const removedPlayers=[],disbandAll=replace&&incoming.length===0;
    if(replace){
      for(const [id,p] of Object.entries(players)){
        // Disband removes all participants, including guests, offline and unseated.
        if(!disbandAll&&p?.kind!=="member")continue;
        const lid=normalizeLoginId(p?.loginId);
        if(disbandAll||!wanted.has(lid)){removedPlayers.push(publicPlayer(p));delete players[id]}
      }
    }
    const evicted=new Set((await this.ctx.storage.get("evictedMembers"))||[]);
    const previousDisband=disbandAll?((await this.ctx.storage.get("pendingDisbandLogins"))||[]):[];
    const pendingDisband=new Set(previousDisband.map(normalizeLoginId).filter(Boolean));
    for(const p of removedPlayers)if(p?.loginId){
      const lid=normalizeLoginId(p.loginId);evicted.add(lid);
      if(disbandAll)pendingDisband.add(lid);
    }
    for(const loginId of wanted.keys()){evicted.delete(loginId);pendingDisband.delete(loginId)}
    if(disbandAll)await this.ctx.storage.put("pendingDisbandLogins",[...pendingDisband].slice(-100));
    await this.ctx.storage.put("evictedMembers",[...evicted].slice(-100));
    if(disbandAll){
      for(const p of removedPlayers)if(p?.loginId){
        const lid=normalizeLoginId(p.loginId);
        for(const prefix of ["role:","roles:","artifact:"])await this.ctx.storage.delete(prefix+lid);
      }
    }
    for(const m of wanted.values()){
      const id="member:"+m.loginId,old=players[id]||{};
      const merged={...old,...m};
      players[id]={...old,participantId:id,kind:"member",loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId||old.avatarId||"",gameCharacterId:m.gameCharacterId||old.gameCharacterId||null,seatId:m.seatId||old.seatId||null,ready:true,reservedByGM:true,joinedAt:old.joinedAt||now,lastSeenAt:old.lastSeenAt||null,lastHeartbeatAt:Number(old.lastHeartbeatAt||0)||null};
    }
    enforceUniqueSeatClaims(players,meta.seatCount);
    // During gathering, adapt the real room capacity to the actual party, never
    // discarding an assigned seat ID. Older rooms remain untouched until GM edits.
    if(replace&&wanted.size>0&&!meta.seatsLocked&&String(meta.gmStage||'')==='seats'){
      const highest=Math.max(0,...Object.values(players).map(p=>Number(p?.seatId||0)||0));
      const nextCount=Math.max(8,Math.min(30,Math.max(Object.keys(players).length,highest)));
      const nextShape=villageLayout.recommendedSeatShape(nextCount);
      if(nextCount!==Number(meta.seatCount)||nextShape!==normalizeSeatLayout(meta.seatLayout)){
        const points=villageLayout.positions(nextCount,nextShape,meta.seatOffset,meta.seatSpacing);
        for(const p of Object.values(players)){
          const seat=normalizeSeatId(p?.seatId,nextCount);
          if(!seat)continue;
          clearPlayerMovement(p);p.positionX=points[seat-1].x;p.positionY=points[seat-1].y;
        }
        meta.seatCount=nextCount;meta.seatLayout=nextShape;
      }
    }
    await this.ctx.storage.put("players",players);
    const selected=new Set(wanted.keys()),assignments=(await this.ctx.storage.get("assignments"))||[],nextAssignments=assignments.filter(a=>selected.has(normalizeLoginId(a?.loginId)));
    if(nextAssignments.length!==assignments.length)await this.ctx.storage.put("assignments",nextAssignments);
    meta.playerCount=wanted.size;meta.locked=false;meta.seatsLocked=false;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}
    const publicPlayers=Object.values(players).map(publicPlayer),room=publicRoom(meta);
    this.broadcast({type:"room_state",room,players:publicPlayers,rosterUpdated:true,disbandAll});
    if(disbandAll){
      this.broadcast({type:"room_disbanded",roomCode:meta.code,reason:"GM_DISBAND",removedCount:removedPlayers.length});
      const removedIds=new Set(removedPlayers.map(p=>String(p.participantId)));
      for(const ws of this.ctx.getWebSockets())try{
        if(removedIds.has(String(ws.deserializeAttachment()?.participantId||"")))ws.close(1000,"ROOM_DISBANDED");
      }catch{}
    }
    return j({ok:true,room,players:publicPlayers,selectedCount:wanted.size,removedPlayers,disbanded:disbandAll,removedCount:removedPlayers.length,reconcileLogins:disbandAll?[...pendingDisband]:[]})
  }
  async gmStage(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,requested=String(body?.step||"").toLowerCase();
    if(!["room","seats","game","roles","deal","battle"].includes(requested))return j({ok:false,error:"INVALID_GM_STAGE"},400);
    if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED"},409);
    const phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase)&&requested!=="battle")return j({ok:false,error:"STAGE_LOCKED_IN_MATCH"},409);
    if(["game","roles","deal","battle"].includes(requested)&&!meta.seatsLocked&&phase!=="role_delivery"&&phase!=="running")return j({ok:false,error:"SEATS_NOT_LOCKED"},409);
    if(roomUiStage(meta)===requested)return j({ok:true,room:publicRoom(meta),unchanged:true});
    meta.gmStage=requested;meta.gmStageRevision=Number(meta.gmStageRevision||0)+1;
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;
    await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),players=(await this.ctx.storage.get("players"))||{};
    this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),serverTime:Date.now(),stageChanged:true});
    return j({ok:true,room});
  }
  async gmRoomSettings(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"ROOM_SETTINGS_LOCKED",message:"Không đổi chế độ hoặc số ghế khi ván đang chạy."},409);
    // Room is created once; GM selects Online / Offline / Demo afterwards.
    // Only an EMPTY lobby can cross the demo isolation boundary.
    const previousDemo=meta.demo===true,desiredDemo=body&&Object.prototype.hasOwnProperty.call(body,"demo")?body.demo===true:previousDemo;
    const demoChanging=desiredDemo!==previousDemo;
    if(demoChanging){
      const assignments=await this.ctx.storage.get("assignments")||[];
      const locked=meta.seatsLocked===true||meta.locked===true;
      if(locked||Object.keys(players).length||assignments.length||meta.startedAt||meta.roleDeliveredAt){
        return j({ok:false,error:"ROOM_MODE_REQUIRES_EMPTY_RESET",message:"Để đổi sang hoặc rời DEMO, hãy dùng phòng trống hoặc RESET phòng trước. Dữ liệu người chơi hiện tại được giữ nguyên."},409);
      }
    }
    const roomMode=desiredDemo?"offline":body&&Object.prototype.hasOwnProperty.call(body,"roomMode")?normalizeRoomMode(body.roomMode):normalizeRoomMode(meta.roomMode);
    const seatMoveMode=body&&Object.prototype.hasOwnProperty.call(body,"seatMoveMode")?normalizeSeatMoveMode(body.seatMoveMode):normalizeSeatMoveMode(meta.seatMoveMode);
    const requested=body&&Object.prototype.hasOwnProperty.call(body,"seatCount")?normalizeSeatCount(body.seatCount,meta.seatCount):normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12);
    const hasSeatLayout=!!body&&Object.prototype.hasOwnProperty.call(body,"seatLayout"),changedCount=requested!==normalizeSeatCount(meta.seatCount),seatLayout=hasSeatLayout?normalizeSeatLayout(body.seatLayout):changedCount?villageLayout.recommendedSeatShape(requested):normalizeSeatLayout(meta.seatLayout);
    const hasSeatOffset=!!body&&Object.prototype.hasOwnProperty.call(body,"seatOffset"),
      seatSpacing=villageLayout.normalizeSeatSpacing(body&&Object.prototype.hasOwnProperty.call(body,"seatSpacing")?body.seatSpacing:meta.seatSpacing),
      seatOffset=villageLayout.resolveSeatOffset(requested,seatLayout,hasSeatOffset?body.seatOffset:meta.seatOffset,seatSpacing);
    if(hasSeatOffset&&(!body.seatOffset||!Number.isFinite(Number(body.seatOffset.x))||!Number.isFinite(Number(body.seatOffset.y))))return j({ok:false,error:"INVALID_SEAT_OFFSET"},400);
    if(hasSeatLayout&&String(body.seatLayout||'')!==seatLayout)return j({ok:false,error:"INVALID_SEAT_LAYOUT"},400);
    const maxOccupied=Math.max(0,...Object.values(players).map(p=>Number(p?.seatId||0)||0));
    if(requested<maxOccupied)return j({ok:false,error:"SEAT_COUNT_BELOW_OCCUPIED",message:"Không thể giảm số ghế thấp hơn vị trí đang có người ngồi.",maxOccupied},409);
    if(seatLayout&&requested<Object.keys(players).length)return j({ok:false,error:"SEAT_TEMPLATE_TOO_SMALL",message:"Mẫu Seat ít hơn số người đã vào phòng."},409);
    if(meta.seatsLocked&&(requested!==Number(meta.seatCount)||seatLayout!==normalizeSeatLayout(meta.seatLayout)||JSON.stringify(seatOffset)!==JSON.stringify(villageLayout.normalizeSeatOffset(meta.seatOffset))||seatSpacing!==villageLayout.normalizeSeatSpacing(meta.seatSpacing)))return j({ok:false,error:"SEATS_LOCKED",message:"Mở khóa vị trí trước khi đổi Seat Mẫu."},409);
    const reflow=seatLayout!==normalizeSeatLayout(meta.seatLayout)||requested!==Number(meta.seatCount)||JSON.stringify(seatOffset)!==JSON.stringify(villageLayout.normalizeSeatOffset(meta.seatOffset))||seatSpacing!==villageLayout.normalizeSeatSpacing(meta.seatSpacing);
    if(seatMoveMode==="instant"&&normalizeSeatMoveMode(meta.seatMoveMode)==="walk")for(const p of Object.values(players))clearPlayerMovement(p);
    if(reflow){
      const locations=villageLayout.positions(requested,seatLayout,seatOffset,seatSpacing);
      for(const p of Object.values(players)){
        const seatId=normalizeSeatId(p?.seatId,requested);
        if(!seatId)continue;
        const point=locations[seatId-1];if(!point)continue;
        clearPlayerMovement(p);p.positionX=point.x;p.positionY=point.y;
      }
    }
    meta.roomMode=roomMode;meta.seatMoveMode=seatMoveMode;meta.seatCount=requested;meta.seatLayout=seatLayout;meta.seatOffset=seatOffset;meta.seatSpacing=seatSpacing;
    if(demoChanging){
      meta.demo=desiredDemo;meta.autoGM=desiredDemo?false:true;
      // Retain historical room data; only clear stale demonstration lease/timer.
      await this.ctx.storage.delete("demoLease");await this.ctx.storage.delete("demoClock");
    }
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;
    await this.ctx.storage.put("players",players);await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers});
    return j({ok:true,room,players:publicPlayers})
  }
  async gmSeatLock(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"SEAT_LOCKED_IN_MATCH"},409);
    const seatedPlayers=(await this.ctx.storage.get("players"))||{};
    if(body?.locked!==false&&(!Object.keys(seatedPlayers).length||Object.values(seatedPlayers).some(p=>!normalizeSeatId(p.seatId,meta.seatCount)||p.movementStatus==='moving')))return j({ok:false,error:"SEATING_INCOMPLETE",message:"Mọi người cần vào vị trí trước khi khóa."},409);
    meta.seatsLocked=body?.locked!==false;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const players=(await this.ctx.storage.get("players"))||{},room=publicRoom(meta);this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),seatsLocked:meta.seatsLocked});
    return j({ok:true,room,seatsLocked:meta.seatsLocked})
  }
  async gmSeat(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();
    if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"SEAT_LOCKED_IN_MATCH",message:"Chỉ đổi ghế tại khu chuẩn bị vào trận."},409);
    const players=(await this.ctx.storage.get("players"))||{},loginId=normalizeLoginId(body?.loginId),participantId=String(body?.participantId||(loginId?("member:"+loginId):"")),player=players[participantId];
    if(!participantId||!player)return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Không tìm thấy Người Chơi trong Phòng."},404);
    const hasSeat=body&&Object.prototype.hasOwnProperty.call(body,"seatId"),seatId=hasSeat&&body.seatId!=null?normalizeSeatId(body.seatId,meta.seatCount):null;
    if(hasSeat&&body.seatId!=null&&!seatId)return j({ok:false,error:"INVALID_SEAT",message:"Ghế không tồn tại trong Phòng."},400);
    let displaced=null;
    if(seatId){const conflict=seatClaimConflict(players,participantId,seatId);if(conflict&&Number(conflict.player?.seatId||0)!==seatId)return j({ok:false,error:'SEAT_RESERVED',message:'Vị trí đang có người đi tới.'},409);
      const occupiedEntry=Object.entries(players).find(([id,p])=>id!==participantId&&Number(p?.seatId||0)===seatId);
      if(occupiedEntry){
        const [occupiedId,occupied]=occupiedEntry;
        if(body?.swap===true){const oldSeat=normalizeSeatId(player.seatId,meta.seatCount);occupied.seatId=oldSeat;occupied.ready=occupied.reservedByGM===true;clearPlayerMovement(occupied);players[occupiedId]=occupied;displaced=publicPlayer(occupied)}
        else if(body?.replace===true){occupied.seatId=null;occupied.ready=occupied.reservedByGM===true;clearPlayerMovement(occupied);players[occupiedId]=occupied;displaced=publicPlayer(occupied)}
        else return j({ok:false,error:"SEAT_TAKEN",message:"Ghế "+seatId+" đã có "+String(occupied.displayName||"người khác")+". Chọn đổi chỗ hoặc giải phóng ghế trước.",seatId,occupant:publicPlayer(occupied)},409);
      }
    }
    player.seatId=seatId;player.ready=player.reservedByGM===true;clearPlayerMovement(player);
    if(seatId&&normalizeSeatLayout(meta.seatLayout)){const point=villageLayout.positions(meta.seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[seatId-1];if(point){player.positionX=point.x;player.positionY=point.y}}
    if(displaced&&normalizeSeatLayout(meta.seatLayout)){const record=Object.values(players).find(p=>p.participantId===displaced.participantId);if(record?.seatId){const point=villageLayout.positions(meta.seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[record.seatId-1];if(point){record.positionX=point.x;record.positionY=point.y}}}
    players[participantId]=player;await this.ctx.storage.put("players",players);
    meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,seatUpdated:participantId});
    return j({ok:true,room,player:publicPlayer(player),displaced,players:publicPlayers})
  }
  async gmRandomizeRemainingSeats(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,phase=String(meta.phase||"lobby").toLowerCase();
    if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"SEAT_LOCKED_IN_MATCH",message:"Chỉ phân ghế tại khu chuẩn bị vào trận."},409);
    const players=(await this.ctx.storage.get("players"))||{},entries=Object.entries(players),seatCount=normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12),used=new Set();
    for(const [,player] of entries){const seatId=normalizeSeatId(player?.seatId,seatCount);if(seatId)used.add(seatId);if(player?.moveTargetSeatId)used.add(Number(player.moveTargetSeatId))}
    const remaining=entries.filter(([,player])=>!normalizeSeatId(player?.seatId,seatCount)&&!player?.moveTargetSeatId),free=[];
    for(let seatId=1;seatId<=seatCount;seatId++)if(!used.has(seatId))free.push(seatId);
    if(!remaining.length)return j({ok:true,unchanged:true,assigned:[],room:publicRoom(meta),players:entries.map(([,player])=>publicPlayer(player))});
    if(free.length<remaining.length)return j({ok:false,error:"NOT_ENOUGH_FREE_SEATS",message:"Không đủ ghế trống cho Người Chơi còn lại.",remaining:remaining.length,available:free.length},409);
    const shuffledPlayers=secureShuffle(remaining),assigned=[];
    for(let index=0;index<shuffledPlayers.length;index++){
      const [participantId,player]=shuffledPlayers[index],seatId=free[index];
      player.seatId=seatId;player.ready=player.reservedByGM===true;clearPlayerMovement(player);
      if(normalizeSeatLayout(meta.seatLayout)){const point=villageLayout.positions(seatCount,meta.seatLayout,meta.seatOffset,meta.seatSpacing)[seatId-1];if(point){player.positionX=point.x;player.positionY=point.y}}
      players[participantId]=player;assigned.push({participantId,seatId});
    }
    await this.ctx.storage.put("players",players);meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,seatsRandomized:true,assigned});
    return j({ok:true,room,players:publicPlayers,assigned})
  }
  roomExpiryDue(meta){
    const times=[meta?.lastUsedAt,meta?.updatedAt,meta?.createdAt].map(x=>Date.parse(x||"")).filter(Number.isFinite),last=times.length?Math.max(...times):Date.now();
    return last+ROOM_IDLE_TTL
  }
  nightRuntimeKey(meta,night){return "nightRuntime:"+String(meta?.matchId||"match")+":"+Math.max(1,Number(night)||1)}
  async getNightRuntime(meta,night,create=false){
    const key=this.nightRuntimeKey(meta,night);let runtime=await this.ctx.storage.get(key);
    if(!runtime&&create)runtime=await this.buildNightRuntime(meta,night);
    return runtime||null
  }
  // Called only while constructing a new authoritative Night. Converted roles
  // keep each owner's membership, seat, artifact and player identity unchanged.
  async applyNightRoleInheritance(meta,night,assignments,{drunkChoice=null}={}){
    const n=Math.max(1,Number(night)||1),matchId=String(meta?.matchId||'');
    if(!matchId||n<2)return {assignments,drunkNotices:[]};
    const key='roleInheritanceNight:'+matchId+':'+n;
    const past=await this.ctx.storage.get(key);
    if(past&&!drunkChoice)return {assignments:(await this.ctx.storage.get('assignments'))||assignments,
      drunkNotices:Array.isArray(past.drunkNotices)?past.drunkNotices:[]};
    const events=await this.ctx.storage.get('interactions')||[];
    let plans=inheritedRolePlans({assignments,interactions:events,matchId,night:n,drunkChoice});
    if(drunkChoice)plans=plans.filter(x=>x.kind==='drunk'&&x.actorId===normalizeLoginId(drunkChoice.actorId));
    if(!plans.length)return {assignments,drunkNotices:[],applied:0};
    let updated=assignments.map(x=>({...x})),drunkNotices=[],applied=0;
    const changed=new Map(),publishedAt=new Date().toISOString();
    for(const plan of plans){
      const original=updated.find(x=>normalizeLoginId(x.loginId)===plan.actorId&&
        x.roleId===plan.fromRoleId);
      if(!original)continue;
      const stored=await this.ctx.storage.get('roles:'+plan.actorId)||[];
      const owned=Array.isArray(stored)?stored:[];
      const own=owned.find(x=>String(x.roleId)===plan.fromRoleId&&
        Number(x.assignmentIndex)===Number(original.assignmentIndex));
      if(!own)continue;
      const source=plan.sourceId?updated.find(x=>normalizeLoginId(x.loginId)===plan.sourceId&&
        x.roleId===plan.sourceRoleId):null;
      const sourceRoles=source?await this.ctx.storage.get('roles:'+plan.sourceId)||[]:[];
      let donor=Array.isArray(sourceRoles)?sourceRoles.find(x=>
        x.roleId===plan.sourceRoleId&&Number(x.assignmentIndex)===Number(source?.assignmentIndex)):null;
      if(plan.sourceId&&!donor)continue;
      if(!plan.sourceId){
        const pkg=await this.ctx.storage.get('roleCatalog:role_villager')||{};
        donor={...own,roleId:'role_villager',roleName:'Dân Làng',faction:'village',
          description:'Không có chức năng đặc biệt.',roleImage:pkg.roleImage||own.roleImage,
          artworkAssetId:pkg.artworkAssetId||own.artworkAssetId,
          artworkId:pkg.artworkAssetId||own.artworkId,
          roleCard:pkg.roleCard||{name:'Dân Làng',faction:'village',
            information:'Không có chức năng đặc biệt.',functions:[],
            flags:{allowMultipleActions:false,nightImmune:false}}};
      }
      const converted={...donor,loginId:plan.actorId,displayName:own.displayName,
        assignmentIndex:own.assignmentIndex,matchId,matchRevision:own.matchRevision,
        artifact:own.artifact||null,deliveredAt:publishedAt,viewedAt:null,
        inheritedFromRoleId:plan.fromRoleId,inheritedFromLoginId:plan.sourceId||null};
      const nextRoles=owned.map(x=>x===own?converted:x);
      changed.set(plan.actorId,nextRoles);
      const index=updated.findIndex(x=>x.assignmentIndex===original.assignmentIndex&&
        normalizeLoginId(x.loginId)===plan.actorId);
      if(index<0)continue;
      updated[index]={...original,roleId:converted.roleId,roleName:converted.roleName,
        faction:converted.faction,deliveredAt:publishedAt,viewedAt:null,
        inheritedFromRoleId:plan.fromRoleId};
      applied++;
      if(plan.kind==='drunk')drunkNotices.push({id:'drunk-reveal:'+plan.actorId,
        kind:'drunk-draw',roleId:'role_drunk',loginIds:[plan.actorId],
        playerIds:['member:'+plan.actorId],label:'Say Rượu · Bốc Vai Trò',
        drawResult:converted.roleName,order:-2,status:'pending'});
    }
    if(applied){
      await this.ctx.storage.put('assignments',updated);
      for(const [actorId,roles] of changed){
        await this.ctx.storage.put('roles:'+actorId,roles);
        await this.ctx.storage.put('role:'+actorId,roles[0]);
      }
      meta.deliveryVersion=Math.max(1,Number(meta.deliveryVersion)||1)+1;
      meta.roleDeliveredAt=publishedAt;
      meta.updatedAt=publishedAt;
      for(const row of updated){
        const id=normalizeLoginId(row.loginId);
        if(!id)continue;
        const roles=changed.get(id)||await this.ctx.storage.get('roles:'+id)||[];
        if(!Array.isArray(roles)||!roles.length)continue;
        await this.ctx.storage.put('deliverySnapshot:'+id,
          buildPrivateDeliverySnapshot({matchId,matchRevision:Number(meta.matchRevision||0),
            deliveryVersion:meta.deliveryVersion,publishedAt,roles}));
      }
      await this.ctx.storage.put('meta',meta);
      this.broadcast({type:'room_state',room:publicRoom(meta),serverTime:Date.now()});
    }
    if(!drunkChoice)await this.ctx.storage.put(key,{drunkNotices,applied});
    return {assignments:updated,drunkNotices,applied};
  }
  async applyCursedRoleConversions(meta,night,assignments){
    // Resolve both automatic successor Roles at a stable night boundary.
    // Never overwrite a living Seer, and never expose the donor's private card.
    const matchId=String(meta.matchId||""),events=await this.ctx.storage.get("interactions")||[],
      initialSeerCount=await this.ctx.storage.get("ruleInitialSeerCount:"+matchId),
      targets=[
        ...cursedConversionsDue({assignments,interactions:events,matchId,night})
          .map(loginId=>({loginId,fromRoleId:"role_cursed",toRoleId:"role_wolf",
            faction:"wolf",fallbackName:"Sói Thường"})),
        ...apprenticeSeersDue({assignments,interactions:events,matchId,night,
          initialSeerCount})
          .map(loginId=>({loginId,fromRoleId:"role_apprentice_seer",toRoleId:"role_seer",
            faction:"village",fallbackName:"Tiên Tri"})),
        ...bigfootWolfDue({assignments,interactions:events,matchId,night})
          .map(loginId=>({loginId,fromRoleId:"role_bigfoot",toRoleId:"role_wolf",
            faction:"wolf",fallbackName:"Sói Thường"}))
      ];
    if(!targets.length)return {assignments,converted:[]};
    let result=assignments.map(x=>({...x})),converted=[],publishedAt=new Date().toISOString();
    for(const plan of targets){
      const canonical=await this.ctx.storage.get("roleCatalog:"+plan.toRoleId);
      if(!canonical?.roleCard?.functions?.length)continue; // never invent abilities
      const loginId=plan.loginId,index=result.findIndex(x=>
        normalizeLoginId(x.loginId)===loginId&&x.roleId===plan.fromRoleId);
      if(index<0)continue;
      const prior=await this.ctx.storage.get("roles:"+loginId)||[];
      if(!Array.isArray(prior)||!prior.length)continue;
      const own=prior.find(x=>x.roleId===plan.fromRoleId&&
        Number(x.assignmentIndex)===Number(result[index].assignmentIndex));
      if(!own)continue;
      const updated={...own,roleId:plan.toRoleId,
        roleName:String(canonical.roleName||plan.fallbackName),
        faction:plan.faction,roleCard:canonical.roleCard,
        roleImage:canonical.roleImage||own.roleImage,
        artworkAssetId:canonical.artworkAssetId||own.artworkAssetId,
        artworkId:canonical.artworkAssetId||own.artworkId,
        deliveredAt:publishedAt,viewedAt:null,inheritedFromRoleId:plan.fromRoleId};
      const roles=prior.map(x=>x===own?updated:x);
      result[index]={...result[index],roleId:plan.toRoleId,roleName:updated.roleName,
        faction:plan.faction,deliveredAt:publishedAt,viewedAt:null,
        inheritedFromRoleId:plan.fromRoleId};
      await this.ctx.storage.put("roles:"+loginId,roles);
      await this.ctx.storage.put("role:"+loginId,roles[0]);
      converted.push({loginId,roles});
    }
    if(converted.length){
      await this.ctx.storage.put("assignments",result);
      meta.deliveryVersion=Math.max(1,Number(meta.deliveryVersion)||1)+1;
      meta.roleDeliveredAt=publishedAt;meta.updatedAt=publishedAt;
      for(const {loginId,roles} of converted)
        await this.ctx.storage.put("deliverySnapshot:"+loginId,buildPrivateDeliverySnapshot({
          matchId,matchRevision:Number(meta.matchRevision||0),
          deliveryVersion:meta.deliveryVersion,publishedAt,roles}));
      await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),serverTime:Date.now()});
    }
    return {assignments:result,converted:converted.map(x=>x.loginId)};
  }
  async applyNightFactionTransitions(meta,night,assignments){
    const matchId=String(meta.matchId||""),events=await this.ctx.storage.get("interactions")||[],
      plans=factionRoleTransitionsDue({assignments,interactions:events,matchId,night});
    if(!plans.length)return assignments;
    const updated=assignments.map(x=>({...x})),publishedAt=new Date().toISOString();
    let applied=0;
    for(const plan of plans){
      const index=updated.findIndex(x=>normalizeLoginId(x.loginId)===plan.loginId);
      if(index<0)continue;
      const prior=await this.ctx.storage.get("roles:"+plan.loginId)||[];
      if(!Array.isArray(prior)||!prior.length)continue;
      const matchRole=prior.find(x=>String(x.roleId)===String(updated[index].roleId));
      if(!matchRole)continue;
      const converted={...matchRole,faction:plan.toFaction,
        roleCard:{...matchRole.roleCard,factionId:plan.toFaction},
        deliveredAt:publishedAt,viewedAt:null};
      const roles=prior.map(x=>x===matchRole?converted:x);
      updated[index]={...updated[index],faction:plan.toFaction,
        deliveredAt:publishedAt,viewedAt:null};
      await this.ctx.storage.put("roles:"+plan.loginId,roles);
      await this.ctx.storage.put("role:"+plan.loginId,roles[0]);
      plan.roles=roles;applied++;
    }
    if(applied){
      await this.ctx.storage.put("assignments",updated);
      meta.deliveryVersion=Math.max(1,Number(meta.deliveryVersion)||1)+1;
      meta.roleDeliveredAt=publishedAt;meta.updatedAt=publishedAt;
      for(const plan of plans)if(plan.roles)
        await this.ctx.storage.put("deliverySnapshot:"+plan.loginId,
          buildPrivateDeliverySnapshot({matchId,matchRevision:Number(meta.matchRevision||0),
            deliveryVersion:meta.deliveryVersion,publishedAt,roles:plan.roles}));
      await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),serverTime:Date.now()});
    }
    return updated;
  }
  async buildNightRuntime(meta,night){
    let assignments=(await this.ctx.storage.get("assignments"))||[];
    const cfg=(await this.ctx.storage.get("gameConfig"))||{},now=new Date().toISOString(),n=Math.max(1,Number(night)||1),queue=[],timing=cfg?.timing||{},defaultActionSec=Math.max(0,Number(timing.defaultActionSec??45)||0),wolfDiscussionSec=Math.max(0,Number(timing.wolfDiscussionSec??30)||0),earlyArtifactSec=30,artifactActionSec=Math.max(0,Number(timing.artifactActionSec??30)||0),roleDuration=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>[String(r?.roleId||""),Math.max(0,Number(r?.actionDurationSec??defaultActionSec)||0)]));
    const converted=await this.applyCursedRoleConversions(meta,n,assignments);
    assignments=await this.applyNightFactionTransitions(meta,n,converted.assignments);
    const inheritance=await this.applyNightRoleInheritance(meta,n,assignments);
    assignments=inheritance.assignments;
    // ART-01: explicit match disable wins; legacy matches with assigned Artifacts remain compatible.
    const artifactMode=cfg.artifactsEnabled===true||(cfg.artifactsEnabled!==false&&assignments.some(a=>a?.artifactId));
    const artifactRows=[];
    for(const [index,a] of assignments.entries()){
      if(!artifactMode||!a?.artifactId)continue;
      const loginId=normalizeLoginId(a.loginId),assigned=await this.ctx.storage.get("artifact:"+loginId);
      const singleUse=a.artifactSingleUse===true||assigned?.singleUse===true;
      if(assigned?.removedFromMatch===true)continue;
      if(singleUse&&await this.ctx.storage.get("artifactUse:"+loginId+":"+String(a.artifactId)))continue;
      const priorityFirst=typeof a.artifactPriorityFirst==="boolean"?a.artifactPriorityFirst:typeof assigned?.priorityFirst==="boolean"?assigned.priorityFirst:defaultPriorityFirst(a.artifactName);
      artifactRows.push({...a,_index:index,_priorityFirst:priorityFirst});
    }
    // ART-01: Night 1 always opens the Artifact stage when the match enabled it;
    // later nights only open while an eligible, unconsumed priority Artifact remains.
    const priorityOwners=artifactRows.filter(a=>a._priorityFirst);
    if(artifactMode&&(n===1||priorityOwners.length>0))
      queue.push({id:"early-artifact-window",kind:"early-artifact-window",label:"Artifact đầu ván",durationSec:earlyArtifactSec,status:"pending",actions:priorityOwners.map(row=>({artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId)}))});
    // WOLF-01: one waking turn only when at least two living wolves can meet.
    // A newly converted member wakes the pack again on the next night only.
    const wolfMembers=activePackAtNight({assignments,
      interactions:await this.ctx.storage.get("interactions")||[],matchId:meta.matchId,night:n});
    const previousNight=n>1?await this.getNightRuntime(meta,n-1,false):null;
    const previousIds=Array.isArray(previousNight?.wolfPackIds)?previousNight.wolfPackIds:wolfMembers.map(a=>a.loginId);
    if(shouldWakeWolfPack(n,wolfMembers,previousIds))queue.push({
      id:"wolf-introduction",kind:"wolf-introduction",label:"Bầy sói ơi dậy đi",
      recognitionIds:wolfMembers.map(a=>a.loginId),durationSec:wolfDiscussionSec,status:"pending"});
    const roleOrder=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map((r,i)=>[String(r?.roleId||""),Number(r?.order||i+1)])),groups=new Map();
    for(const a of assignments){const rid=String(a?.roleId||"");if(!rid||rid==="role_villager")continue; // Ordinary villagers never have a night wake-up turn; their Artifacts are scheduled separately.
      const lid=normalizeLoginId(a?.loginId),drunkInheritedWolf=rid==="role_snow_wolf"&&a.inheritedFromRoleId==="role_drunk";
      const groupId=drunkInheritedWolf?rid+":drunk:"+lid:rid;
      let g=groups.get(groupId);
      if(!g){g={id:"role:"+groupId,kind:"role",label:String(a?.roleName||"Vai Trò"),roleId:rid,
        drunkInheritedWolf,order:Number(roleOrder.get(rid)??a?.order??9999),
        loginIds:[],playerIds:[],durationSec:roleDuration.get(rid)??defaultActionSec,status:"pending"};
        groups.set(groupId,g)}
      if(lid&&!g.loginIds.includes(lid)){g.loginIds.push(lid);g.playerIds.push("member:"+lid)}}
    const roleTurns=[...groups.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,"vi"));
    const artifactOrder=new Map((Array.isArray(cfg.artifacts)?cfg.artifacts:[]).map((a,i)=>[String(a?.artifactId||""),Number(a?.order||i+1)]));
    artifactRows.sort((a,b)=>(artifactOrder.get(String(a.artifactId))??9999)-(artifactOrder.get(String(b.artifactId))??9999)||a._index-b._index);
    // Attach owned Artifacts to their role's action box. Legacy unmatched owners
    // retain a standalone turn so their Artifact is never silently lost.
    const attachedArtifacts=new Set();
    for(const role of roleTurns){
      role.artifacts=artifactRows.filter(row=>role.loginIds.includes(normalizeLoginId(row.loginId))).map(row=>{
        const loginId=normalizeLoginId(row.loginId);
        attachedArtifacts.add(String(row.artifactId)+":"+loginId);
        return {artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId,playerId:"member:"+loginId,priorityFirst:row._priorityFirst===true};
      });
    }
    const artifactTurns=artifactRows.filter(row=>!attachedArtifacts.has(String(row.artifactId)+":"+normalizeLoginId(row.loginId))).map(row=>({id:"artifact:"+String(row.artifactId)+":"+normalizeLoginId(row.loginId),kind:"artifact-main",label:String(row.artifactName||"Artifact"),artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId),order:artifactOrder.get(String(row.artifactId))??9999,skipIfEarlyUsed:row._priorityFirst===true,durationSec:artifactActionSec,status:"pending"}));
    // WITCH-01: every Old Witch owner wakes immediately after the optional Wolf
    // recognition, regardless of the configured order or ties with other roles.
    // Drunk draws exactly at Night 3, before Old Witch, without changing ART-01/WOLF-01.
    // Clone selects its target only on Night 1. Regular Witch wakes AFTER Fairy.
    const specials=partitionNightSpecialRoles(roleTurns,n);
    if(n===3&&specials.drunk){
      const interactions=await this.ctx.storage.get('interactions')||[];
      for(const loginId of specials.drunk.loginIds||[]){
        const actorId=normalizeLoginId(loginId),deckKey='drunkDeck:'+String(meta.matchId)+':3:'+actorId;
        let deck=await this.ctx.storage.get(deckKey);
        if(!deck){
          const candidates=drunkDeadCards({assignments,interactions,matchId:meta.matchId,night:n});
          const cards=candidates.map(c=>({...c,id:'card-'+crypto.randomUUID()}));
          for(let i=cards.length-1;i>0;i--){
            const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
            [cards[i],cards[j]]=[cards[j],cards[i]];
          }
          deck={matchId:String(meta.matchId),night:n,actorId,turnId:specials.drunk.id,
            cards,selectedId:null};
          await this.ctx.storage.put(deckKey,deck);
        }
      }
    }
    queue.push(...inheritance.drunkNotices.map(row=>({...row,durationSec:defaultActionSec})));
    if(specials.drunk)queue.push(specials.drunk);
    if(specials.oldWitch)queue.push(specials.oldWitch);
    // NIGHT-02: Snow Wolf → Guard → shared Pack Bite → other Wolf powers → Fairy → Witch.
    const arranged=arrangeNightRoles(specials.remaining,artifactTurns);
    queue.push(...arranged.fixed);
    const packInteractions=await this.ctx.storage.get("interactions")||[];
    const eligiblePack=activePackAtNight({assignments,interactions:packInteractions,matchId:meta.matchId,night:n});
    if(eligiblePack.length){
      const snowCanBite=canSnowWolfBite({assignments,interactions:packInteractions,matchId:meta.matchId});
      const packOwners=eligiblePack.filter(x=>x.roleId!=="role_snow_wolf"||snowCanBite);
      const biteQuota=wolfCubBiteQuota({assignments,interactions:packInteractions,matchId:meta.matchId,night:n});
      queue.push({id:"wolf-pack-bite",kind:"wolf-pack-bite",label:"Bầy Sói Cắn",
        targetCount:biteQuota,
        // Every living Wolf wakes; Snow Wolf observes but cannot submit Bite
        // while another wolf survives.
        loginIds:eligiblePack.map(x=>normalizeLoginId(x.loginId)),playerIds:eligiblePack.map(x=>"member:"+normalizeLoginId(x.loginId)),
        biteActorIds:packOwners.map(x=>normalizeLoginId(x.loginId)),
        roles:eligiblePack.map(x=>({roleId:String(x.roleId),loginIds:[normalizeLoginId(x.loginId)]})),
        order:-1,durationSec:defaultActionSec,status:"pending"});
    }
    // Data-driven: only Wolfs with a configured non-Bite power need a second
    // private wake-up. A Wolf with only the shared Bite never wakes twice.
    const privateAssignments=await readNightAssignments(this.ctx.storage,meta.matchId);
    const distinctWolf=arranged.wolves.filter(row=>row.artifacts?.length||
      privateAssignments.filter(a=>String(a.roleId||"")===String(row.roleId||"")).some(a=>
        (Array.isArray(a.roleCard?.functions)?a.roleCard.functions:[]).some(fn=>
          fn&&!fn.passive&&String(fn.actionId||fn.id||"")!=="action_wolf_bite"&&
          (!fn.phase||["night","any"].includes(fn.phase))&&
          (!fn.fromNight||Number(fn.fromNight)<=n)&&(!fn.toNight||Number(fn.toNight)>=n))));
    queue.push(...groupConfiguredRoleTurns(distinctWolf));
    if(arranged.fairy)queue.push(arranged.fairy);
    if(specials.witch)queue.push(specials.witch);
    queue.push(...combineConfiguredTurns(groupConfiguredRoleTurns(arranged.rest),arranged.artifactTurns));
    queue.push({id:"village-wakeup",kind:"village-wakeup",label:"Làng ơi dậy đi",durationSec:0,status:"pending"});
    const first=queue[0]||null;if(first)first.startedAt=now;
    const firstDurationMs=first&&Number(first.durationSec)>0?Number(first.durationSec)*1000:0,autoEnabled=meta?.autoGM!==false;
    const runtime={matchId:String(meta?.matchId||""),night:n,wolfPackIds:wolfMembers.map(a=>a.loginId),queue,cursor:0,completed:queue.length===0,currentId:first?.id||null,autoAdvance:autoEnabled,startedAt:now,deadlineAt:autoEnabled&&firstDurationMs>0?new Date(Date.parse(now)+firstDurationMs).toISOString():null,autoPausedRemainingMs:!autoEnabled&&firstDurationMs>0?firstDurationMs:0,createdAt:now,updatedAt:now};
    await this.ctx.storage.put(this.nightRuntimeKey(meta,n),runtime);return runtime
  }
  async artifactUsedInNight(meta,step){
    if(!step?.artifactId||!step?.playerId)return false;
    const key=currentArtifactCycleKey(meta),cycle=(await this.ctx.storage.get("artifactCycle:"+key))||{accepted:[]};
    return (Array.isArray(cycle.accepted)?cycle.accepted:[]).some(x=>String(x?.artifactId||"")===String(step.artifactId)&&String(x?.playerId||("member:"+normalizeLoginId(x?.loginId)))===String(step.playerId))
  }
  async markGmArtifactTurnUsed(meta,step,targetLoginId,actionNonce="",confirmation={}){
    if(!step)return null;
    const nonce=String(actionNonce||"").trim().slice(0,100);
    const owned=await this.ctx.storage.get("artifact:"+normalizeLoginId(step.loginId));
    if(!owned||String(owned.artifactId)!==String(step.artifactId))return j({ok:false,error:"INVALID_ARTIFACT_OWNER"},403);
    if(owned.removedFromMatch===true)return j({ok:false,error:"ARTIFACT_REMOVED_FROM_MATCH"},409);
    const configuredFunction=(owned.artifactCard?.functions||[]).find(a=>String(a.actionId||a.id)===String(confirmation.actionId||""));
    const legacyAction=(owned.artifactCard?.actions||[]).find(a=>String(a.id)===String(confirmation.actionId||""));
    const configuredAction=configuredFunction?{...legacyAction,...configuredFunction}:legacyAction;
    if(!configuredAction)return j({ok:false,error:"INVALID_ARTIFACT_ACTION"},400);
    if(configuredAction.passive===true||(configuredAction.phase&&!["night","any","both"].includes(configuredAction.phase)))return j({ok:false,error:"ARTIFACT_ACTION_WRONG_PHASE"},409);
    if((configuredAction.fromNight!=null&&Number(meta.cycleNight)<Number(configuredAction.fromNight))||(configuredAction.toNight!=null&&Number(meta.cycleNight)>Number(configuredAction.toNight)))return j({ok:false,error:"ARTIFACT_OUTSIDE_NIGHT_WINDOW"},409);
    const targets=Array.isArray(confirmation.targetIds)?confirmation.targetIds.map(normalizeLoginId):[normalizeLoginId(targetLoginId)];
    if(!targets.length||targets.length>30||new Set(targets).size!==targets.length||!targets.includes(normalizeLoginId(targetLoginId)))return j({ok:false,error:"INVALID_ARTIFACT_TARGETS"},400);
    // Enforce explicit per-action limits on the server, not just the GM UI.
    // Older Artifact cards without targetCount retain their existing behavior.
    if(configuredAction.targetCount!==undefined&&configuredAction.targetCount!==null){
      const count=Number(configuredAction.targetCount);
      const noTarget=configuredAction.noTarget===true&&count===0&&targets.length===1&&targets[0]===normalizeLoginId(step.loginId);
      if(!noTarget&&(!Number.isInteger(count)||count<1||count>30||targets.length!==count))
        return j({ok:false,error:"INVALID_ARTIFACT_TARGET_COUNT"},400);
    }
    if(!configuredAction.noTarget&&configuredAction.noSelf!==false&&targets.includes(normalizeLoginId(step.loginId)))
      return j({ok:false,error:"ARTIFACT_SELF_TARGET_FORBIDDEN"},403);
    const players=(await this.ctx.storage.get("players"))||{};
    if(targets.some(id=>!players["member:"+id]))return j({ok:false,error:"INVALID_ARTIFACT_TARGET"},400);
    const binding={actionId:String(confirmation.actionId||""),type:String(confirmation.type||""),targetIds:targets.slice().sort()};
    const requestId="gm:"+String(meta.matchId||"match")+":"+String(step.id)+(nonce?":"+nonce:"");
    const key=currentArtifactCycleKey(meta),cycle=(await this.ctx.storage.get("artifactCycle:"+key))||{accepted:[]};
    const existing=(Array.isArray(cycle.accepted)?cycle.accepted:[]).find(x=>String(x.artifactId||"")===String(step.artifactId)&&String(x.playerId||"")===String(step.playerId));
    // A single confirmed action can select several targets. Its second target
    // must not consume the same Artifact twice; a DIFFERENT action is refused.
    if(existing){
      const sameConfirmation=nonce&&String(existing.requestId||"")===requestId&&JSON.stringify(existing.gmConfirmation)===JSON.stringify(binding);
      return sameConfirmation?null:j({ok:false,error:"ARTIFACT_ALREADY_USED",message:"Artifact đã dùng trong đêm này."},409);
    }
    const activation=await this.playerArtifactActivate({loginId:normalizeLoginId(step.loginId),requestId,targetId:"member:"+normalizeLoginId(targetLoginId),gmConfirmation:binding});
    return activation.ok?null:activation;
  }
  async advanceNightRuntime(meta,action="next",source="gm",targetIndex=null){
    const night=Math.max(1,Number(meta.cycleNight||1)),runtime=await this.getNightRuntime(meta,night,true),now=new Date().toISOString();
    if(action==="jump"){
      const step=jumpTarget(runtime.queue,targetIndex);
      if(step&&targetIndex!==runtime.cursor){
        if(targetIndex>runtime.cursor){
          for(let i=runtime.cursor;i<targetIndex;i++){
            const skipped=runtime.queue[i];if(skipped&&skipped.status==="pending"){skipped.status="skipped";skipped.skippedReason="GM_NAVIGATION";skipped.completedAt=now}
          }
        }
        runtime.cursor=targetIndex;runtime.completed=false;runtime.currentId=step.id;
        if(step.status!=="pending"){step.status="pending";delete step.skippedReason;delete step.completedAt}
      }else if(step){return runtime}
    }
    else if(action==="back"){if(runtime.cursor>0){runtime.cursor--;while(runtime.cursor>0&&runtime.queue[runtime.cursor]?.status==="skipped")runtime.cursor--;const step=runtime.queue[runtime.cursor];if(step&&step.status==="completed")step.status="pending";runtime.completed=false;runtime.currentId=step?.id||null}}
    else{
      const current=runtime.queue[runtime.cursor];
      if(current&&current.status!=="skipped"){if(current.kind==="early-artifact"){const used=await this.artifactUsedInNight(meta,current);current.status="completed";current.result=used?"used":"skipped";current.completedAt=now}else{current.status="completed";current.completedAt=now}}
      runtime.cursor=Math.min(runtime.queue.length,runtime.cursor+1);
      while(runtime.cursor<runtime.queue.length){const next=runtime.queue[runtime.cursor];if(next?.kind==="artifact-main"&&await this.artifactUsedInNight(meta,next)){next.status="skipped";next.skippedReason="EARLY_ARTIFACT_USED";next.completedAt=now;runtime.cursor++;continue}break}
      runtime.completed=runtime.cursor>=runtime.queue.length;runtime.currentId=runtime.completed?null:(runtime.queue[runtime.cursor]?.id||null)
    }
    const active=runtime.completed?null:runtime.queue[runtime.cursor];if(active){active.startedAt=now;const durationMs=Number(active.durationSec)>0?Number(active.durationSec)*1000:0;if(meta.autoGM===false){runtime.deadlineAt=null;runtime.autoPausedRemainingMs=durationMs}else{runtime.deadlineAt=durationMs>0?new Date(Date.parse(now)+durationMs).toISOString():null;runtime.autoPausedRemainingMs=0}}else{runtime.deadlineAt=null;runtime.autoPausedRemainingMs=0}
    runtime.autoAdvance=meta.autoGM!==false;runtime.updatedAt=now;await this.ctx.storage.put(this.nightRuntimeKey(meta,night),runtime);meta.currentNightTurnId=runtime.currentId;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    this.broadcast({type:"night_turn",night,runtime,source,room:publicRoom(meta),serverTime:Date.now()});return runtime
  }
  async applyCycle(meta,phase,night,cycleKey,source="gm"){
    const now=new Date().toISOString(),p=phase==="day"?"morning":String(phase||"").toLowerCase(),n=Math.max(0,Number(night)||0),key=String(cycleKey||((p&&n)?(p+"-"+n):("cycle-"+Date.now()))).slice(0,160);
    // Hold the adjudicated vote for 30 actual seconds or until explicit GM
    // acknowledgment, including if Auto GM reaches the end of Day early.
    if(p==="night"&&String(meta.cyclePhase||"")==="morning"&&n===Number(meta.cycleNight||0)+1&&!meta.demo){
      const ballot=await this.ctx.storage.get("gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""));
      const at=Number(ballot?.resolvedAt||0);
      if(ballot?.extraRoundPending||Number(ballot?.round)===2&&ballot.stage!=="resolved")
        return {ok:false,error:"DOUBLE_GALLOWS_PENDING",message:"Phải hoàn tất phiên Lên Giàn thứ hai trước khi sang Đêm."};
      if(ballot?.stage==="resolved"&&at>0&&!ballot.acknowledgedAt&&Date.now()<at+30000)
        return {ok:false,error:"GALLOWS_VERDICT_PENDING",message:"Đang công bố kết quả Lên Giàn; GM xác nhận hoặc chờ đủ 30 giây."};
    }
    if(p==="night"&&meta.demo&&String(meta.cyclePhase)==="morning"){
      const ballot=await this.ctx.storage.get("gallows:"+String(meta.matchId)+":"+String(meta.cycleKey));
      if(ballot?.extraRoundPending||Number(ballot?.round)===2&&ballot.stage!=="resolved")
        return {ok:false,error:"DOUBLE_GALLOWS_PENDING"};
    }
    // Replayed completion must not restart day timers or expire effects twice.
    if(meta.cycleKey===key&&meta.cyclePhase===p&&Number(meta.cycleNight)===n)
      return{ok:true,idempotent:true,cycleKey:key,phase:p,night:n,expired:[],matchId:String(meta.matchId||""),nightRuntime:p==="night"?await this.getNightRuntime(meta,n,false):null,room:publicRoom(meta)};
    // Fix the initial Wolf count before any role conversion; never recalculate.
    if(p==="night"&&n===1&&meta.matchId){
      const baselineKey="ruleInitialWolfCount:"+String(meta.matchId);
      if(await this.ctx.storage.get(baselineKey)===undefined){
        const initial=(await this.ctx.storage.get("assignments"))||[];
        await this.ctx.storage.put(baselineKey,initial.filter(isWolfRole).length);
        await this.ctx.storage.put("ruleInitialSeerCount:"+String(meta.matchId),
          initial.filter(a=>a.roleId==="role_seer").length);
      }
    }
    meta.cycleKey=key;if(p)meta.cyclePhase=p;if(n)meta.cycleNight=n;meta.autoPausedRemainingMs=null;meta.dayDeadlineAt=null;
    if(p==='morning'){const cfg=(await this.ctx.storage.get('gameConfig'))||{},ms=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0)*1000;meta.dayDeadlineAt=ms>0?new Date(Date.parse(now)+ms).toISOString():null;if(meta.autoGM===false&&!meta.demo)meta.autoPausedRemainingMs=ms}
    meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    const rows=(await this.ctx.storage.get("interactions"))||[];
    const expired=expireCycleEffects(rows,{phase:p,night:n,cycleKey:key,matchId:meta.matchId,statusDefs:STATUS_DEFS,now});
    if(p==="night")for(const old of rows){
      if(old.type!=="status"||old.statusId!=="mute"||
        old.artifactId!=="artifact_22"||old.effectActive===false||
        String(old.matchId||"")!==String(meta.matchId)||Number(old.night)>=n)continue;
      old.effectActive=false;old.expiredAt=now;old.expiredReason="MUTE_DAY_FINISHED";
      if(old.id)await this.ctx.storage.put(this.actionLogKey(old),old);
    }
    if(p==="night")for(const old of rows){
      if(old.type!=="expelled"||!['black-woman','artifact-elder-stick'].includes(old.source)||
        String(old.matchId||"")!==String(meta.matchId)||old.effectActive===false||
        Number(old.night)>=n)continue;
      old.effectActive=false;old.expiredAt=now;old.expiredReason="RETURNED_TO_VILLAGE";
      if(old.id)await this.ctx.storage.put(this.actionLogKey(old),old);
    }

    // Rung Chuông Già Làng suppresses EVERY death effect of the same night,
    // regardless of source. The bell's own second-life cost is not suppressed.
    const elderBell=p==="morning"&&n>0?resolveElderBell({
      assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,
      matchId:String(meta.matchId||""),night:n}):{blocked:false,spends:[]};
    if(elderBell.blocked)for(const row of rows){
      if(String(row.matchId||"")!==String(meta.matchId||"")||Number(row.night)!==n)continue;
      if(row.type!=="dead"&&row.pendingDeath!==true)continue;
      if(row.source==="elder-bell-engine")continue;
      row.effectActive=false;row.pendingDeath=false;row.expiredAt=now;
      row.expiredReason="ELDER_BELL_PREVENTED_DEATH";
      if(row.id)await this.ctx.storage.put(this.actionLogKey(row),row);
    }
    // Night powers record intent; only dawn activates lethal outcomes. Keep the
    // original receipt so undo, usage and retry handling remain transactional.
    if(p==="morning"&&n>0&&!elderBell.blocked)for(const row of rows){
      if(row.pendingDeath!==true||String(row.matchId)!==String(meta.matchId)||Number(row.night)!==n)continue;
      // Hơi Thở Lão Già is marked in cycle N and becomes lethal after
      // NIGHT N+1. Resolve exactly once; respect existing night immunity,
      // exile and death so this Artifact never bypasses normal protection.
      if(row.deferredArtifact==="artifact_07"){
        const id=normalizeLoginId(row.loginId),
          excluded=rows.some(x=>x!==row&&normalizeLoginId(x.loginId)===id&&
            (!x.matchId||String(x.matchId)===String(meta.matchId))&&
            x.effectActive!==false&&["dead","expelled"].includes(String(x.type))),
          immune=isNightImmune(await readNightAssignments(this.ctx.storage,meta.matchId),id);
        if(excluded||immune){
          row.pendingDeath=false;row.effectActive=false;row.resolvedAt=now;
          row.expiredReason=immune?"NIGHT_IMMUNE":"ALREADY_DEAD_OR_EXPELLED";
          await this.ctx.storage.put("actionLog:"+String(Date.parse(row.createdAt)).padStart(13,"0")+":"+row.id,row);
          continue;
        }
      }
      row.pendingDeath=false;row.type="dead";row.effectActive=true;row.resolvedAt=now;
      row.message="Bạn đã chết vì "+(row.effectName||"tác động ban đêm")+".";
      await this.ctx.storage.put("actionLog:"+String(Date.parse(row.createdAt)).padStart(13,"0")+":"+row.id,row);
    }
    // Người Loan Tin: publish the ROLE NAME captured at action time, not
    // whatever the target may have transformed into by the following dawn.
    if(p==="morning"&&n>0)for(const noticed of rows){
      if(noticed.type!=="effect_notice"||noticed.actionId!=="action-news-role"||
        String(noticed.matchId||"")!==String(meta.matchId)||Number(noticed.night)!==n||
        noticed.undone===true||!noticed.snapshotRoleName)continue;
      const id="news-role:"+String(meta.matchId)+":"+n+":"+noticed.id;
      if(rows.some(x=>x.id===id))continue;
      const event={id,type:"effect_notice",effectActive:true,
        actionId:"action-news-role-announce",loginId:noticed.loginId,
        matchId:String(meta.matchId),night:n,cycleKey:key,
        snapshotRoleName:noticed.snapshotRoleName,snapshotRoleId:noticed.snapshotRoleId,
        source:"news-bearer",createdAt:now,
        message:"Người Loan Tin công bố Vai Trò: "+noticed.snapshotRoleName+"."};
      rows.push(event);await this.ctx.storage.put(this.actionLogKey(event),event);
      this.broadcast({type:"role_revealed",loginId:noticed.loginId,
        roleId:noticed.snapshotRoleId,roleName:noticed.snapshotRoleName,
        matchId:String(meta.matchId),serverTime:Date.now()});
    }
    // Bà Da Đen: the person leaves only during the following DAY, never
    // retrospectively during the Night that selected them.
    if(p==="morning"&&n>0)for(const noticed of rows){
      if(noticed.type!=="effect_notice"||noticed.actionId!=="action-black-woman-leave"||
        String(noticed.matchId||"")!==String(meta.matchId)||Number(noticed.night)!==n||
        noticed.undone===true||noticed.noEffect===true)continue;
      const id="black-woman-exile:"+String(meta.matchId)+":"+n+":"+noticed.loginId;
      if(rows.some(x=>x.id===id))continue;
      const event={id,type:"expelled",effectActive:true,loginId:noticed.loginId,
        actionId:"action-black-woman-leave",matchId:String(meta.matchId),
        night:n,cycleKey:key,source:"black-woman",createdAt:now,
        message:"Người chơi rời làng trong ngày theo Bà Da Đen."};
      rows.push(event);await this.ctx.storage.put(this.actionLogKey(event),event);
    }
    // At dawn resolve confirmed wolf-bite/Guard/Fairy notices in the SAME match
    // and night. Guards block final, potentially transferred bite destinations.
    // An absent bite or a malformed seating ring never manufactures a death.
    const wolfResolutionRaw=p==="morning"&&n>0&&!elderBell.blocked?
      resolveWolfNight({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:rows,players:(await this.ctx.storage.get("players"))||{},
        matchId:String(meta.matchId||""),night:n}):null;
    const strongman=wolfResolutionRaw?.ok?resolveStrongmanWolfBite({
      wolfResolution:wolfResolutionRaw,assignments:await readNightAssignments(this.ctx.storage,meta.matchId),
      interactions:rows,matchId:String(meta.matchId||""),night:n}):null;
    const afterStrongman=strongman?{...wolfResolutionRaw,...strongman}:wolfResolutionRaw;
    const passive=afterStrongman?.ok?resolvePassiveWolfBite({
      resolution:afterStrongman,assignments:await readNightAssignments(this.ctx.storage,meta.matchId),
      interactions:rows,matchId:String(meta.matchId||"")}):null;
    const wolfResolution=passive?{...afterStrongman,victims:passive.victims,
      cursed:passive.cursed,stoneAbsorbed:passive.stoneAbsorbed}:afterStrongman;
    for(const [actionId,people,msg] of [
      ["action_cursed_bite",passive?.cursed||[],"Kẻ Bị Nguyền sẽ chuyển sang Sói ở đêm kế tiếp."],
      ["action_stone_wolf_life",passive?.stoneAbsorbed||[],"Sói Đá đã tiêu hao lớp Da Đá để sống sót."]
    ])for(const loginId of people){
      const id="passive:"+String(meta.matchId)+":"+actionId+":"+loginId;
      if(rows.some(x=>String(x.id)===id))continue;
      const hit={id,type:"effect_notice",loginId,matchId:String(meta.matchId),
        night:n,cycleKey:key,effectActive:true,actionId,source:"rule-passive-engine",
        message:msg,createdAt:now};
      rows.push(hit);await this.ctx.storage.put(this.actionLogKey(hit),hit);
    }
    // Record the one-time survival and public role announcement durably.
    if(strongman)for(const loginId of strongman.absorbed){
      const id="strongman-bite:"+String(meta.matchId)+":"+loginId;
      if(rows.some(row=>String(row.id)===id))continue;
      const reveal={id,type:"effect_notice",loginId,matchId:String(meta.matchId),
        night:n,cycleKey:key,effectActive:true,roleId:"role_strongman",
        actionId:"action_strongman_bite",source:"strongman-passive-engine",
        message:"Lực Sỹ đã công khai vai trò và sống sót qua một lần Sói Cắn.",
        createdAt:now};
      rows.push(reveal);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,reveal);
      this.broadcast({type:"role_revealed",loginId,roleId:"role_strongman",
        roleName:"Lực Sỹ",matchId:String(meta.matchId),serverTime:Date.now()});
    }
    if(wolfResolution?.ok)for(const loginId of wolfResolution.victims){
      const id="wolf-bite:"+String(meta.matchId)+":"+n+":"+loginId;
      if(rows.some(row=>String(row?.id||"")===id))continue;
      rows.push({id,clientEventId:id,type:"dead",loginId,matchId:String(meta.matchId||""),
        night:n,cycleKey:key,effectActive:true,actionId:"action_wolf_bite",
        effectId:"effect_wolf_bite",effectName:"Sói Cắn",message:"Bạn đã chết vì Sói Cắn.",
        createdAt:now,source:"wolf-night-engine",status:"pending",response:null});
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,rows[rows.length-1]);
    }
    // Resolve Maiden only at dawn after all confirmed night attacks and wolf deaths.
    // Retain the same idempotent death event contract used by wolf-night-engine.
    if(p==="morning"&&n>0&&!elderBell.blocked){
      const maidenVictims=resolveMaidenNight({assignments:(await this.ctx.storage.get("assignments"))||[],
        interactions:rows,matchId:String(meta.matchId||""),night:n});
      for(const loginId of maidenVictims){
        const visit=rows.find(row=>String(row?.actionId||"")==="action_visit_house"&&
          normalizeLoginId(row?.actorId)===normalizeLoginId(loginId)&&
          String(row?.matchId||"")===String(meta.matchId||"")&&Number(row?.night)===n);
        const targetId=normalizeLoginId(visit?.loginId);
        const assigned=(await this.ctx.storage.get("assignments"))||[];
        const visited=assigned.find(row=>normalizeLoginId(row?.loginId)===targetId);
        const faction=String(visited?.roleCard?.factionId||visited?.factionId||visited?.faction||"").toLowerCase();
        const visitingWolf=String(visited?.roleId||"").includes("wolf")||faction==="wolf"||faction.includes("sói")||faction.includes("soi");
        const maidenReason=visitingWolf?"Thiếu Nữ chết vì đến thăm nhà Sói.":"Thiếu Nữ chết vì người được thăm đã chết trong đêm.";
        const id="maiden-visit:"+String(meta.matchId)+":"+n+":"+loginId;
        if(rows.some(row=>String(row?.id||"")===id))continue;
        rows.push({id,clientEventId:id,type:"dead",loginId,matchId:String(meta.matchId||""),
          night:n,cycleKey:key,effectActive:true,actionId:"action_visit_house",
          effectId:"effect_visit_house",effectName:"Thăm Nhà",message:maidenReason,
          createdAt:now,source:"maiden-night-engine",status:"pending",response:null});
        await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,rows[rows.length-1]);
      }
    }
    // Queue from a lynched Knight becomes a real death only on the next dawn.
    if(p==="morning"&&n>0&&!elderBell.blocked){
      const pending=await this.ctx.storage.list({prefix:"knightPending:"+String(meta.matchId||"")+":"+n+":"});
      for(const [storageKey,action] of pending.entries()){
        const loginId=normalizeLoginId(action?.targetId);
        if(!loginId||String(action?.matchId||"")!==String(meta.matchId||""))continue;
        const id="knight-strike:"+String(meta.matchId)+":"+n+":"+loginId;
        if(!rows.some(x=>String(x.id)===id)&&
          !rows.some(x=>String(x.type)==="dead"&&x.effectActive!==false&&
            normalizeLoginId(x.loginId)===loginId&&(!x.matchId||String(x.matchId)===String(meta.matchId)))){
          const consequence={id,type:"dead",loginId,matchId:String(meta.matchId),
            night:n,cycleKey:key,effectActive:true,source:"knight-day-action",
            actionId:"action_knight_last_strike",message:"Hiệp Sĩ đã chọn người này từ ngày trước.",
            createdAt:now};
          rows.push(consequence);
          await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,consequence);
        }
        await this.ctx.storage.delete(storageKey);
      }
    }
    // Each used bell spends one of Già Làng's two lives; the second use
    // creates a deterministic fatal event. It cannot revive attacks it blocked.
    for(const spend of elderBell.spends){
      if(!spend.exhausted)continue;
      const id="elder-bell:"+String(meta.matchId)+":"+spend.actorId;
      if(rows.some(row=>String(row.id)===id))continue;
      const fatal={id,type:"dead",loginId:spend.actorId,matchId:String(meta.matchId),
        night:n,cycleKey:key,effectActive:true,source:"elder-bell-engine",
        actionId:"18",roleId:"role_elder",message:"Già Làng đã Rung Chuông lần thứ hai và hết mạng.",
        createdAt:now};
      rows.push(fatal);await this.ctx.storage.put(this.actionLogKey(fatal),fatal);
      this.broadcast({type:"player_status_changed",loginId:spend.actorId,
        statusId:"dead",active:true,serverTime:Date.now()});
    }
    // End protection only AFTER resolving the protected night.
    if(p==="morning")for(const shield of rows){
      if(shield.type!=="status"||shield.statusId!=="artifact_next_night_protect"||
        shield.effectActive===false||String(shield.matchId||"")!==String(meta.matchId||"")||
        Number(shield.protectNight)!==n)continue;
      shield.effectActive=false;shield.expiredAt=now;shield.expiredReason="NEXT_NIGHT_PROTECTION_FINISHED";
      if(shield.id)await this.ctx.storage.put(this.actionLogKey(shield),shield);
    }
    // Ông Già's age is anchored to initial Wolf headcount, not changing
    // factions. Resurrection never restarts his age timer.
    if(p==="morning"&&n>0&&!elderBell.blocked){
      const wolves=await this.ctx.storage.get("ruleInitialWolfCount:"+String(meta.matchId));
      const due=oldManAgeVictims({assignments:await this.ctx.storage.get("assignments")||[],
        interactions:rows,matchId:String(meta.matchId),night:n,initialWolfCount:wolves});
      for(const loginId of due){
        const id="old-man-age:"+String(meta.matchId)+":"+loginId;
        if(rows.some(x=>x.id===id))continue;
        const fatal={id,type:"dead",loginId,matchId:String(meta.matchId),night:n,
          cycleKey:key,effectActive:true,source:"old-man-age-engine",
          actionId:"action-old-man-lifespan",message:"Ông Già đã qua đời vì tuổi già.",
          createdAt:now};
        rows.push(fatal);await this.ctx.storage.put(this.actionLogKey(fatal),fatal);
      }
    }
    if(p==="morning"&&n>0&&!elderBell.blocked){
      const pending=await this.ctx.storage.list({prefix:"grudgePending:"+String(meta.matchId)+":"+n+":"});
      for(const [storageKey,action] of pending.entries()){
        const loginId=normalizeLoginId(action.targetId);
        if(!loginId||String(action.matchId||"")!==String(meta.matchId))continue;
        const id="grudge-victim:"+String(meta.matchId)+":"+n+":"+loginId;
        const died=rows.some(x=>x.type==="dead"&&x.effectActive!==false&&
          normalizeLoginId(x.loginId)===loginId&&
          String(x.matchId||"")===String(meta.matchId));
        if(!died&&!rows.some(x=>x.id===id)){
          const fatal={id,type:"dead",loginId,matchId:String(meta.matchId),
            night:n,cycleKey:key,effectActive:true,source:"grudge-victim",
            actionId:"action-grudge-designate",actorId:action.actorId,
            createdAt:now,message:"Oan Nhân đã chọn người này chết vào sáng hôm sau."};
          rows.push(fatal);await this.ctx.storage.put(this.actionLogKey(fatal),fatal);
        }
        await this.ctx.storage.delete(storageKey);
      }
    }
    if(p==="morning"&&typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,now);
    await this.ctx.storage.put("interactions",pruneInteractions(rows));
    const nightRuntime=p==="night"&&n>0?await this.getNightRuntime(meta,n,true):null;
    if(nightRuntime){meta.currentNightTurnId=nightRuntime.currentId;meta.updatedAt=now;await this.ctx.storage.put("meta",meta)}
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    const room=publicRoom(meta);this.broadcast({type:"room_cycle",cycleKey:key,phase:p,night:n,matchId:String(meta.matchId||""),expired,nightRuntime,room,source,serverTime:Date.now()});
    this.broadcast({type:"room_state",room,players:Object.values((await this.ctx.storage.get("players"))||{}).map(publicPlayer),serverTime:Date.now()});
    await this.scheduleRoomAlarm(meta);
    return{ok:true,cycleKey:key,phase:p,night:n,expired,wolfResolution,matchId:String(meta.matchId||""),nightRuntime,room}
  }
  async autoAdvanceDue(meta){
    if(!meta||String(meta.phase||"").toLowerCase()!=="running"||meta.autoGM===false)return 0;
    const cyclePhase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(1,Number(meta.cycleNight||1));
    if(cyclePhase==="night"){const runtime=await this.getNightRuntime(meta,night,true);if(!runtime)return 0;if(runtime.completed)return Date.now();if(runtime.queue?.[runtime.cursor]?.kind==="village-wakeup")return Date.now();const due=Date.parse(runtime.deadlineAt||"");return Number.isFinite(due)?due:0}
    if(cyclePhase==="morning"||cyclePhase==="day"){
      const deadline=Date.parse(meta.dayDeadlineAt||'');
      const cfg=(await this.ctx.storage.get("gameConfig"))||{},sec=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0),
        started=Date.parse(meta.cycleStartedAt||"");
      const due=Number.isFinite(deadline)?deadline:sec&&Number.isFinite(started)?started+sec*1000:0;
      if(meta.demo)return due;
      const ballot=await this.ctx.storage.get("gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""));
      const at=Number(ballot?.resolvedAt||0);
      if(ballot?.extraRoundPending||Number(ballot?.round)===2){
        if(ballot.stage==="ready")return Number(ballot.round)===2?Date.now():due;
        if(ballot.stage==="nominating")return Number(ballot.nominationDeadlineAt)||due;
        if(ballot.stage==="selecting")return Date.now();
        if(ballot.stage==="voting")return Number(ballot.deadlineAt)||due;
      }
      return ballot?.stage==="resolved"&&!ballot.acknowledgedAt&&at>0?Math.max(due,at+30000):due;
    }
    return 0
  }
  async scheduleRoomAlarm(meta=null){
    meta=meta||await this.ctx.storage.get("meta");if(!meta||String(meta.phase||"").toLowerCase()==="deleted")return 0;
    const expiryDue=this.roomExpiryDue(meta),autoDue=await this.autoAdvanceDue(meta),demoDue=meta.demo?await nextServerDemoDue(this,meta):0,due=Math.min(expiryDue,autoDue||Infinity,demoDue||Infinity),next=Math.max(Date.now()+25,due);
    try{await this.ctx.storage.setAlarm(next)}catch(error){if(meta.demo)throw error}
    return next
  }
  async runAutoAdvanceIfDue(meta){
    if(!meta||String(meta.phase||"").toLowerCase()!=="running"||meta.autoGM===false)return false;
    const due=await this.autoAdvanceDue(meta);if(!due||due>Date.now()+25)return false;
    const phase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(1,Number(meta.cycleNight||1));
    if(phase==="night"){const runtime=await this.getNightRuntime(meta,night,true);if(runtime&&!runtime.completed)await this.advanceNightRuntime(meta,"next","auto");const fresh=await this.ctx.storage.get("meta"),after=await this.getNightRuntime(fresh,night,true);if(after?.completed)await this.applyCycle(fresh,"morning",night,"morning-"+night,"auto");else await this.scheduleRoomAlarm(fresh);return true}
    if(phase==="morning"||phase==="day"){
      const stored=await this.ctx.storage.get("gallows:"+String(meta.matchId)+":"+String(meta.cycleKey));
      if(stored?.extraRoundPending||Number(stored?.round)===2){
        const {ballot}=await this.gallowsState(meta),request=this.demoInternalRequest();
        if(ballot.stage==="resolved"&&ballot.extraRoundPending){
          await this.gmGallows(request,{command:"acknowledge",ballotId:ballot.id});
        }else if(ballot.stage==="ready")await this.gmGallows(request,{command:"open"});
        else if(ballot.stage==="selecting"&&ballot.candidateId)await this.gmGallows(request,{command:"begin",targetId:ballot.candidateId});
        else if(ballot.stage==="resolved")await this.applyCycle(meta,"night",night+1,"night-"+(night+1),"auto");
        await this.scheduleRoomAlarm();return true;
      }
      await this.applyCycle(meta,"night",night+1,"night-"+(night+1),"auto");return true;
    }
    return false
  }
  async gmTurn(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;
    if(String(meta.phase||"").toLowerCase()!=="running"||String(meta.cyclePhase||"").toLowerCase()!=="night")return j({ok:false,error:"NOT_NIGHT_TURN",message:"Chỉ chuyển lượt khi đang ở Ban Đêm."},409);
    const night=Math.max(1,Number(meta.cycleNight||1)),action=String(body?.action||"next").toLowerCase(),source=String(body?.source||"gm").slice(0,40);
    if(!["next","back","jump"].includes(action))return j({ok:false,error:"INVALID_TURN_ACTION"},400);
    const before=await this.getNightRuntime(meta,night,true);
    if(body?.expectedTurnId!==undefined&&String(body.expectedTurnId)!==String(before?.currentId||""))
      return j({ok:false,error:"STALE_TURN",message:"Lượt đã thay đổi trên server. Hãy đồng bộ lại."},409);
    let targetIndex=null;
    if(action==="jump"){
      if(!Number.isInteger(body?.targetIndex))return j({ok:false,error:"INVALID_TURN_INDEX"},400);
      targetIndex=body.targetIndex;
      const target=jumpTarget(before?.queue,targetIndex);
      if(!target)return j({ok:false,error:"INVALID_TURN_INDEX"},400);
      if((target.kind==="artifact-main"||target.kind==="early-artifact")&&await this.artifactUsedInNight(meta,target))
        return j({ok:false,error:"ARTIFACT_ALREADY_USED",message:"Artifact này đã sử dụng trong đêm, không thể thực hiện lần nữa."},409);
    }
    if(meta.demo&&source==="demo"){const c=await this.ctx.storage.get("demoClock");if(c&&projectDemoClock(c,Date.now()).remainingMs>0)return j({ok:false,error:"DEMO_TIMER_RUNNING"},409)}
    const runtime=await this.advanceNightRuntime(meta,action,source,targetIndex);
    // Manual GM navigation must resolve morning just like the automatic timer.
    const morning=action==="next"&&runtime.completed?await this.applyCycle(meta,"morning",night,"morning-"+night,source):null;
    if(!morning)await this.scheduleRoomAlarm(meta);
    return j({ok:true,night,runtime,morning,autoGM:meta.autoGM!==false})
  }
  async gmCycle(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,rawPhase=String(body?.phase||body?.period||"").trim().toLowerCase(),phase=rawPhase==="day"?"morning":rawPhase,night=Math.max(0,Number(body?.night??body?.nightIndex??body?.roundIndex??0)||0),cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??((phase&&night)?(phase+"-"+night):("cycle-"+Date.now()))).slice(0,160);
    return j(await this.applyCycle(meta,phase,night,cycleKey,String(body?.source||"gm").slice(0,40)))
  }

  /* V3.148: server-authoritative day powers. No night turn is forged to
   * bypass the phase gate. Every function must be explicitly tagged day/any. */
  async gmDayAction(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,matchId=String(meta.matchId||""),cycleKey=String(meta.cycleKey||""),
      day=Math.max(1,Number(meta.cycleNight)||1),actorId=normalizeLoginId(body?.actorId),
      roleId=String(body?.roleId||""),artifactId=String(body?.artifactId||""),
      actionId=String(body?.actionId||""),token=String(body?.clientEventId||"").slice(0,120),
      targets=Array.isArray(body?.targetIds)?body.targetIds.map(normalizeLoginId):[];
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="morning"||
      String(body?.matchId||"")!==matchId||String(body?.cycleKey||"")!==cycleKey)
      return j({ok:false,error:"DAY_PHASE_CHANGED"},409);
    if(!token||!actorId||!actionId||(!roleId&&!artifactId)||targets.length>30||
      targets.some(x=>!x)||new Set(targets).size!==targets.length)
      return j({ok:false,error:"INVALID_DAY_ACTION"},400);
    const receiptKey="dayActionReceipt:"+matchId+":"+token,
      fingerprint=JSON.stringify([cycleKey,actorId,roleId,artifactId,actionId,targets]),
      previous=await this.ctx.storage.get(receiptKey);
    if(previous)return previous.fingerprint===fingerprint?
      j({...previous.result,idempotent:true}):j({ok:false,error:"REQUEST_ID_CONFLICT"},409);
    const members=await this.ctx.storage.get("players")||{},
      assignments=await this.ctx.storage.get("assignments")||[],
      interactions=await this.ctx.storage.get("interactions")||[],
      sameMatch=x=>!x?.matchId||String(x.matchId)===matchId,
      affected=(id,kind)=>interactions.some(x=>normalizeLoginId(x?.loginId)===id&&
        sameMatch(x)&&x.effectActive!==false&&String(x.type)===kind);
    if(!members["member:"+actorId]||targets.some(id=>!members["member:"+id]))
      return j({ok:false,error:"DAY_PLAYER_NOT_IN_ROOM"},400);
    let card=null,fn=null,owned=null;
    if(artifactId){
      owned=await this.ctx.storage.get("artifact:"+actorId);
      if(!owned||String(owned.artifactId)!==artifactId||
        (owned.matchId&&String(owned.matchId)!==matchId))
        return j({ok:false,error:"DAY_ARTIFACT_NOT_OWNED"},403);
      if(owned.removedFromMatch===true)
        return j({ok:false,error:"ARTIFACT_REMOVED_FROM_MATCH"},409);
      card=owned.artifactCard||{};
      const fns=Array.isArray(card.functions)&&card.functions.length?card.functions:card.actions||[];
      fn=fns.find(x=>String(x?.actionId||x?.id)===actionId);
      if(fn){const legacy=(card.actions||[]).find(x=>String(x?.actionId||x?.id)===actionId);fn={...legacy,...fn}}
    }else{
      owned=assignments.find(x=>normalizeLoginId(x.loginId)===actorId&&String(x.roleId)===roleId);
      if(!owned)return j({ok:false,error:"DAY_ROLE_NOT_OWNED"},403);
      const stored=await this.ctx.storage.get("roles:"+actorId)||[],
        privateRoles=Array.isArray(stored)&&stored.length?stored:[await this.ctx.storage.get("role:"+actorId)].filter(Boolean);
      const privateRow=privateRoles.find(x=>String(x.roleId)===roleId&&
        (!x.matchId||String(x.matchId)===matchId));
      card=privateRow?.roleCard||owned.roleCard||{};
      fn=(card.functions||[]).find(x=>String(x?.actionId||x?.id)===actionId);
    }
    if(!fn||!["day","any","both"].includes(String(fn.phase||""))||fn.passive===true||
      (fn.fromNight!=null&&Number(fn.fromNight)>day)||
      (fn.toNight!=null&&Number(fn.toNight)<day))
      return j({ok:false,error:"DAY_ACTION_NOT_CONFIGURED"},403);
    const count=fn.noTarget===true?0:Math.max(0,Math.min(30,Math.trunc(Number(fn.targetCount??1)||0)));
    if(targets.length!==count)return j({ok:false,error:"DAY_TARGET_COUNT_INVALID",expected:count},400);
    if(fn.noSelf!==false&&targets.includes(actorId))
      return j({ok:false,error:"DAY_SELF_TARGET_FORBIDDEN"},403);
    const roleKnight=!artifactId&&roleId==="role_knight"&&actionId==="action_knight_last_strike";
    const roleGrudge=!artifactId&&roleId==="role_grudge_victim"&&actionId==="action-grudge-designate";
    const gallows=(roleKnight||roleGrudge)?(await this.gallowsState(meta)).ballot:null;
    const lynched=(roleKnight||roleGrudge)&&gallows?.stage==="resolved"&&
      gallows.outcome==="dead"&&gallows.candidateId===actorId;
    if((roleKnight||roleGrudge)&&!lynched)
      return j({ok:false,error:roleGrudge?"GRUDGE_REQUIRES_EXECUTION":"KNIGHT_REQUIRES_LYNCH"},409);
    if((affected(actorId,"dead")&&!fn.actorMayBeDead&&!lynched)||
      affected(actorId,"expelled")||affected(actorId,"frozen")||
      interactions.some(x=>normalizeLoginId(x?.loginId)===actorId&&sameMatch(x)&&
        x?.effectActive!==false&&x?.type==="status"&&STATUS_DEFS[x.statusId]?.blocks===true))
      return j({ok:false,error:"DAY_ACTOR_BLOCKED"},409);
    // Expelled players remain targetable, but every effect on them is inert.
    if(targets.some(x=>!affected(x,"expelled")&&fn.allowDead!==true&&affected(x,"dead")&&
      !String(actionId).toLowerCase().includes("revive")))
      return j({ok:false,error:"DAY_TARGET_NOT_ELIGIBLE"},409);
    // Validate resurrection before reserving a day-artifact activation.
    if(artifactId&&/revive|hoi_sinh/.test([actionId,...(Array.isArray(fn.effectIds)?fn.effectIds:[])].join(" ").toLowerCase())&&
      !targets.some(id=>!affected(id,"expelled")&&affected(id,"dead")))
      return j({ok:false,error:"DAY_REVIVE_TARGET_NOT_DEAD",message:"Chưa có người chết hợp lệ để hồi sinh."},409);
    const usageKey="dayRoleUsage:"+matchId,
      priorUsage=await this.ctx.storage.get(usageKey)||[],
      own=priorUsage.filter(x=>x.actorId===actorId&&x.roleId===roleId&&x.artifactId===artifactId),
      used=own.filter(x=>x.actionId===actionId),
      mode=String(fn.usageMode||"unlimited"),usageCount=Math.max(1,Math.min(100,Number(fn.usageCount)||1));
    if(!artifactId){
      if(card.flags?.allowMultipleActions===false&&own.some(x=>x.day===day))
        return j({ok:false,error:"DAY_ROLE_LIMIT_PER_DAY"},409);
      if((["onceGame","nGame","custom"].includes(mode)&&used.length>=usageCount)||
        (["eachNight","eachDay","nPerNight"].includes(mode)&&used.filter(x=>x.day===day).length>=usageCount))
        return j({ok:false,error:"DAY_ROLE_QUOTA_REACHED"},409);
      if(actionId==="action_bear_scan"&&own.some(x=>x.actionId===actionId&&x.day===day))
        return j({ok:false,error:"BEAR_SCAN_ALREADY_USED_TODAY"},409);
    }
    const artifactCycleKey=currentArtifactCycleKey(meta),
      useKey="artifactUse:"+actorId+":"+artifactId;
    let artifactReservation=null;
    if(artifactId){
      if(owned.singleUse===true&&await this.ctx.storage.get(useKey))
        return j({ok:false,error:"DAY_ARTIFACT_SINGLE_USE_EXHAUSTED"},409);
      const ckey="artifactCycle:"+artifactCycleKey,
        cstate=await this.ctx.storage.get(ckey)||{cycleKey:artifactCycleKey,accepted:[]},
        limit=Math.max(0,Math.min(30,Math.trunc(Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)||0)));
      artifactReservation=reserveArtifactActivation(cstate,{requestId:token,playerId:"member:"+actorId,
        artifactId,cycleKey:artifactCycleKey,eligible:true,limit});
      if(!artifactReservation.ok)return j({ok:false,error:artifactReservation.error},409);
    }
    const time=new Date().toISOString(),changes=[],kind=artifactId?"artifact":"role",
      effectiveTargets=targets.filter(id=>!affected(id,"expelled"));
    let message="",deadVictims=[],result=null;
    const isWolf=x=>{const f=gameLabelKey(x?.faction||x?.factionId||"");
      return f.includes("soi")||f==="wolf"||f==="wolves"};
    const isThird=x=>{const f=gameLabelKey(x?.faction||x?.factionId||"");
      return f.includes("phe ba")||f.includes("phe thu")||f==="third"};
    if(actionId==="action-judge-double"&&((!artifactId&&roleId==="role_judge")||artifactId==="artifact_41")){
      const state=await this.gallowsState(meta),armed=armDoubleGallows(state.ballot,{actorId,roleId,artifactId});
      if(!armed.ok)return j({ok:false,error:armed.error},409);
      changes.push({kind:"double_gallows",key:state.key,value:armed.value});
      message="Đã kích hoạt Phán Quyết Kép: hôm nay có hai phiên Lên Giàn.";
      result={message,extraRoundPending:true};
    }else if(targets.length&&effectiveTargets.length===0){
      message="Mục tiêu đã bị đuổi khỏi làng; hành động không có tác dụng.";
      result={message,noEffect:true};
    }else if(!artifactId&&actionId==="action_stab"&&roleId==="role_thug"){
      const chosen=assignments.filter(x=>normalizeLoginId(x.loginId)===effectiveTargets[0]);
      const correctlyStabbed=chosen.some(x=>isWolf(x)||isThird(x));
      deadVictims=[correctlyStabbed?effectiveTargets[0]:actorId];
      message=correctlyStabbed?"Du Côn đâm đúng Sói/Phe Ba.":"Du Côn đâm nhầm Dân Làng và bị chết.";
      result={message,correctlyStabbed};
    }else if(!artifactId&&(
      roleId==="role_cavalier"&&actionId==="action-knight-stab"||
      roleId==="role_prince"&&actionId==="action-g7-prince-stab")){
      // Reveal ONLY the acting role; the selected target's actual role remains
      // private. The kill rule uses the target's CURRENT Server-side faction.
      const selected=assignments.find(x=>normalizeLoginId(x.loginId)===effectiveTargets[0]);
      const hit=!!selected&&(isWolf(selected)||(roleId==="role_prince"&&isThird(selected)));
      if(!selected)return j({ok:false,error:"DAY_STAB_TARGET_NOT_ASSIGNED"},409);
      deadVictims=[hit?effectiveTargets[0]:actorId];
      message=(roleId==="role_cavalier"?"Kỵ Sỹ":"Hoàng Tử")+
        (hit?" đã Đâm đúng Phe và hạ mục tiêu.":" đã Đâm sai Phe và phải chết.");
      result={message,correctlyStabbed:hit,revealedActorRole:roleId};
    }else if(!artifactId&&actionId==="action_bear_scan"&&["role_bear","role_bear_god"].includes(roleId)){
      const hasWolf=effectiveTargets.some(id=>assignments.some(x=>normalizeLoginId(x.loginId)===id&&isWolf(x)));
      message=hasWolf?"CÓ SÓI":"KHÔNG CÓ SÓI";
      result={message,hasWolf};
    }else if(roleGrudge){
      const pendingKey="grudgePending:"+matchId+":"+(day+1)+":"+effectiveTargets[0];
      if(await this.ctx.storage.get(pendingKey))
        return j({ok:false,error:"GRUDGE_TARGET_ALREADY_QUEUED"},409);
      changes.push({kind:"knight_pending",key:pendingKey,value:{matchId,actorId,
        targetId:effectiveTargets[0],createdAt:time,resolveDay:day+1,kind:"grudge"}});
      message="Oan Nhân đã chọn người sẽ chết vào sáng hôm sau, nếu còn sống.";
      result={message};
    }else if(roleKnight){
      const pendingKey="knightPending:"+matchId+":"+(day+1)+":"+effectiveTargets[0];
      if(await this.ctx.storage.get(pendingKey))
        return j({ok:false,error:"KNIGHT_TARGET_ALREADY_QUEUED"},409);
      changes.push({kind:"knight_pending",key:pendingKey,value:{matchId,actorId,
        targetId:effectiveTargets[0],createdAt:time,resolveDay:day+1}});
      message="Hiệp Sĩ đã chọn mục tiêu. Hiệu lực vào sáng ngày tiếp theo.";
      result={message};
    }else if(artifactId==="artifact_14"&&actionId==="action-black-woman-leave"){
      for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,
        type:"expelled",source:"artifact-elder-stick"});
      message="Gậy Mụ Già đã buộc người chơi rời làng trong ngày hiện tại.";
      result={message};
    }else if(artifactId==="artifact_22"&&actionId==="artifact_action_silence"){
      for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,
        type:"status",statusId:"mute"});
      message="Mặt Nạ Câm Lặng đã áp dụng Câm trong ngày này.";
      result={message};
    }else if(artifactId==="artifact_38"&&actionId==="action_witch_kill"){
      deadVictims=effectiveTargets;
      message="Thương Cuồng Nộ đã gây chết và công khai chủ Artifact.";
      result={message,artifactOwnerPublic:true};
    }else if(artifactId==="artifact_42"&&actionId==="artifact_action_custom"){
      // Deliberate GM-only Offline ritual; its rule is chosen and resolved by GM.
      // Do not invent random outcomes or claim an automatic kill/revive.
      if(String(meta.roomMode||"offline").toLowerCase()==="online")
        return j({ok:false,error:"VOID_ARTIFACT_OFFLINE_ONLY"},409);
      message="Hư Không Vô Tận: GM nhận quyền điều phối thủ công theo luật đã giao.";
      result={message,manualOnly:true};
    }else if(artifactId==="artifact_26"&&actionId==="artifact_action_judge_two_wolves"){
      const correct=effectiveTargets.length===2&&effectiveTargets.every(id=>
        assignments.some(row=>normalizeLoginId(row.loginId)===id&&isWolf(row)));
      if(correct){
        changes.push({kind:"artifact_win",loginId:actorId});
        message="Quả Cầu Phán Đoán đã soi đúng hai Sói: Phe Dân Làng chiến thắng.";
      }else{
        deadVictims=[actorId];
        message="Quả Cầu Phán Đoán soi sai: người sở hữu phải chết.";
      }
      result={message,correct};
    }else if(artifactId&&['artifact_09','artifact_24','artifact_29','artifact_39'].includes(artifactId)){
      const inspection=resolveDayArtifactInspection({artifactId,actionId,
        targetId:effectiveTargets[0],assignments});
      if(!inspection)return j({ok:false,error:'DAY_ARTIFACT_INSPECTION_INVALID',
        message:'Artifact không có mục tiêu soi hợp lệ hoặc sai chức năng; chưa trừ lượt.'},409);
      message=inspection.message;result=inspection;
    }else if(artifactId==="artifact_17"&&actionId==="artifact_action_steal"){
      // Move the unrevealed Artifact to this owner, issue a *real* replacement
      // from a configured deck, and publish new private deliveries atomically.
      changes.push({kind:"steal_artifact",targetId:effectiveTargets[0]});
      message="Ngọc Ghen Tuông đã chuyển Artifact và cấp lá thay thế.";
      result={message,private:true,artifactTransferred:true};
    }else if(artifactId==="artifact_40"&&actionId==="artifact_action_swap_role"){
      // Change actual role/faction/private cards atomically, not merely a UI label.
      // The client's proposed target must never dictate role or faction data.
      const targetId=effectiveTargets[0];
      if(!targetId||targetId===actorId)
        return j({ok:false,error:"ROLE_SWAP_INVALID_TARGET"},409);
      changes.push({kind:"swap_role",targetId});
      message="Đá Hoán Đổi đã hoán đổi hai Vai Trò.";
      result={message,private:true,roleSwap:true};
    }else if(artifactId){
      const effects=Array.isArray(fn.effectIds)?fn.effectIds.map(String):[];
      if(actionId==='action_revive'||effects.includes('effect_revive')){
        for(const id of effectiveTargets){
          const changed=interactions.filter(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===id&&
            String(x.type)==="dead"&&x.effectActive!==false);
          for(const x of changed){x.effectActive=false;x.expiredAt=time;x.expiredReason="DAY_ARTIFACT_REVIVE"}
          changes.push({kind:"revived",loginId:id});
        }
        message="Artifact hồi sinh đã được ghi nhận.";
      }else if(['action_witch_kill','action_day_kill'].includes(actionId)||effects.includes('effect_kill')){
        deadVictims=effectiveTargets;message="Artifact đã gây tác động Chết.";
      }else if(actionId==='action_exile'||effects.includes('effect_exile')){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,type:"expelled"});
        message="Artifact đã thực hiện Đuổi.";
      }else if(artifactId==="artifact_35"&&actionId==="action_protect"){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,
          type:"status",statusId:"artifact_next_night_protect",protectNight:day+1});
        message="Khiên Bảo Hộ sẽ bảo vệ mục tiêu trong đêm kế tiếp.";
      }else if(artifactId==="artifact_25"&&actionId==="artifact_action_destroy"){
        // A hidden Artifact may be destroyed, never one already revealed or used.
        // Recheck inside the removal transaction to defeat a concurrent flip.
        const id=effectiveTargets[0],target=await this.ctx.storage.get("artifact:"+id),
          assigned=assignments.find(x=>normalizeLoginId(x.loginId)===id),
          valid=validateUnrevealedArtifactDestroy({actorId,targetId:id,
            artifact:target,assignment:assigned,matchId});
        if(!valid.ok)return j({ok:false,error:valid.error,
          message:"Mục tiêu phải có Artifact của người khác chưa được lật hoặc sử dụng; chưa trừ lượt."},409);
        changes.push({kind:"remove_artifact",loginId:id,
          artifactId:valid.artifactId,requireUnviewed:true});
        message="Hắc Ngọc Hủy Diệt đã hủy bí mật một Artifact chưa lật.";
      }else if(artifactId==="artifact_15"&&actionId==="artifact_action_negate"){
        // Only a previously used, truly unlimited Artifact qualifies. Do not
        // confuse a one-time Artifact or merely assigned card with "used".
        const id=effectiveTargets[0],
          targetArtifact=id?await this.ctx.storage.get("artifact:"+id):null,
          summary=assignments.find(x=>normalizeLoginId(x.loginId)===id),
          permanent=targetArtifact?.singleUse===false&&
            Array.isArray(targetArtifact?.artifactCard?.functions)&&
            targetArtifact.artifactCard.functions.some(fn=>
              String(fn?.usageMode)==="unlimited"),
          wasUsed=!!targetArtifact?.usedAt||
            (targetArtifact?.artifactId&&!!(await this.ctx.storage.get(
              "artifactUse:"+id+":"+String(targetArtifact.artifactId))));
        if(!id||!targetArtifact||targetArtifact.removedFromMatch===true||
          (targetArtifact.matchId&&String(targetArtifact.matchId)!==matchId)||
          !summary||String(summary.artifactId||"")!==String(targetArtifact.artifactId||"")||
          !permanent||!wasUsed)
          return j({ok:false,error:"NEGATE_TARGET_NOT_ELIGIBLE",
            message:"Chỉ được loại Artifact dùng mãi mãi đã sử dụng và còn trong ván; chưa trừ lượt."},409);
        changes.push({kind:"remove_artifact",loginId:id,
          artifactId:String(targetArtifact.artifactId)});
        message="Kim Cương Phủ Nhận đã loại khỏi ván Artifact dùng mãi mãi đã sử dụng.";
      }else if(artifactId==="artifact_07"&&actionId==="action-grudge-designate"){
        if(effectiveTargets.some(id=>affected(id,"dead")||
          interactions.some(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===id&&
            x.deferredArtifact==="artifact_07"&&x.pendingDeath===true)))
          return j({ok:false,error:"DAY_GRUDGE_TARGET_INELIGIBLE",
            message:"Mục tiêu đã chết hoặc đã bị đánh dấu; chưa trừ lượt."},409);
        for(const id of effectiveTargets)changes.push({kind:"grudge_schedule",
          loginId:id,type:"effect_notice"});
        message="Hơi Thở Lão Già đã đánh dấu. Tác động chết sẽ xét ở sáng sau đêm kế tiếp.";
      }else if(artifactId==='artifact_06'&&actionId==='artifact_action_disable_function'){
        for(const id of effectiveTargets)changes.push({kind:'status',loginId:id,type:'status',statusId:'disabled_permanent'});
        message='Ấn Dân Làng đã làm mục tiêu mất năng lực đặc biệt đến hết ván.';
      }else if(actionId==='artifact_action_lock_function'){
        // Bình Giấc Mơ: an actual server-side block for two whole day/night
        // cycles, rather than an acknowledgement with no effect.
        if(effectiveTargets.some(id=>interactions.some(x=>sameMatch(x)&&
          normalizeLoginId(x.loginId)===id&&x.type==="status"&&
          x.statusId==="disabled_2n"&&x.effectActive!==false)))
          return j({ok:false,error:"DAY_DREAM_ALREADY_LOCKED",message:"Mục tiêu đang bị khóa chức năng; không tiêu hao lượt."},409);
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,
          type:"status",statusId:"disabled_2n"});
        message="Bình Giấc Mơ đã khóa chức năng mục tiêu trong 2 ngày đêm.";
      }else if(['artifact_action_block_vote','action_block_vote'].includes(actionId)||effects.includes('effect-artifact-block-vote')||
          /cấm\s*(?:bỏ\s*)?phiếu|cấm\s*vote/i.test(String(fn.name||fn.label||''))){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,type:"status",statusId:"vote_ban"});
        message="Artifact đã cấm bỏ phiếu Lên Giàn trong ngày hiện tại.";
      }else if(actionId==='action_snow_wolf_freeze'||effects.includes('effect_snow_wolf_freeze')){
        for(const id of effectiveTargets)changes.push({kind:"status",loginId:id,type:"frozen"});
        message="Artifact đã thực hiện Đóng Băng.";
      }else{
        return j({ok:false,error:"DAY_ARTIFACT_EFFECT_NOT_IMPLEMENTED",message:"Artifact này chưa có xử lý hiệu ứng trên Server; chưa tiêu hao lượt sử dụng."},409);
      }
      result={message};
    }else return j({ok:false,error:"DAY_ROLE_EFFECT_NOT_IMPLEMENTED"},409);
    for(const id of deadVictims)changes.push({kind:"status",loginId:id,type:"dead"});
    for(const effect of changes){
      if(effect.kind==="double_gallows"){
        await this.ctx.storage.put(effect.key,effect.value);
        this.broadcast({type:"gallows_updated",gallows:gallowsSnapshot(effect.value,meta),serverTime:Date.now()});
        continue;
      }
      if(effect.kind==="steal_artifact"){
        const moved=await this.ctx.storage.transaction(async txn=>{
          const current=await txn.get("meta"),rows=await txn.get("assignments")||[],
            actorCard=await txn.get("artifact:"+actorId),
            targetCard=await txn.get("artifact:"+effect.targetId);
          if(!current||String(current.matchId||"")!==matchId||
            String(current.cycleKey||"")!==cycleKey||
            String(current.cyclePhase||"")!=="morning")
            return {ok:false,error:"ARTIFACT_STEAL_PHASE_CHANGED"};
          const valid=validateArtifactSteal({actorId,targetId:effect.targetId,
            actorArtifact:actorCard,targetArtifact:targetCard,assignments:rows,matchId});
          if(!valid.ok)return valid;
          if(await txn.get("artifactUse:"+effect.targetId+":"+targetCard.artifactId))
            return {ok:false,error:"ARTIFACT_STEAL_TARGET_ALREADY_USED"};
          const cfg=await txn.get("gameConfig")||{},configured=Array.isArray(cfg.artifacts)?cfg.artifacts:[],
            catalog=[];
          for(const item of configured){
            const id=String(item?.artifactId||"");
            if(!id)continue;
            const pkg=await txn.get("roleCatalog:artifact:"+id);
            if(pkg?.roleCard?.functions?.length)catalog.push({artifactId:id,package:pkg});
          }
          const eligible=eligibleArtifactReplacements({configured,assignments:rows,catalog}),
            replacementId=eligible[0],pkg=catalog.find(item=>item.artifactId===replacementId)?.package;
          if(!replacementId||!pkg)
            return {ok:false,error:"ARTIFACT_STEAL_NO_REPLACEMENT",
              message:"Không còn Artifact chưa phân phối trong bộ bài đã thiết lập."};
          const assetId=String(pkg.artworkAssetId||pkg.artworkId||
            "artifact:"+replacementId),
            art=await txn.get("artworkRef:"+assetId)||await txn.get("artworkAsset:"+assetId),
            artifactCard=pkg.roleCard;
          const newCard=artifactForNewOwner({
            loginId:effect.targetId,matchId,matchRevision:Number(current.matchRevision||0),
            artifactId:replacementId,artifactName:String(pkg.roleName||artifactCard.name||"Artifact"),
            description:String(artifactCard.information||pkg.description||""),
            artifactImage:"/api/rooms/"+encodeURIComponent(current.code)+
              "/role-assets/"+encodeURIComponent(assetId)+"/image",
            artworkAssetId:assetId,artworkId:assetId,
            artworkAvailable:!!art,artifactCard,singleUse:artifactCard.singleUse===true,
            priorityFirst:artifactCard.priorityFirst===true
          },effect.targetId,time);
          const stolen=artifactForNewOwner(targetCard,actorId,time);
          const actorRoles=await txn.get("roles:"+actorId)||[],
            targetRoles=await txn.get("roles:"+effect.targetId)||[];
          if(actorRoles.length!==1||targetRoles.length!==1||
            String(actorRoles[0]?.roleId)!==String(rows.find(x=>normalizeLoginId(x.loginId)===actorId)?.roleId)||
            String(targetRoles[0]?.roleId)!==String(rows.find(x=>normalizeLoginId(x.loginId)===effect.targetId)?.roleId))
            return {ok:false,error:"ARTIFACT_STEAL_PRIVATE_ROLES_MISSING"};
          const changed=new Map([[actorId,actorRoles.map(row=>({...row,artifact:stolen}))],
            [effect.targetId,targetRoles.map(row=>({...row,artifact:newCard}))]]);
          const updated=applyArtifactStealSummary({assignments:rows,actorId,
            targetId:effect.targetId,stolen,replacement:newCard,now:time}),
            version=Math.max(1,Number(current.deliveryVersion)||1)+1,
            nextMeta={...current,deliveryVersion:version,roleDeliveredAt:time,updatedAt:time};
          await txn.put("artifact:"+actorId,stolen);
          await txn.put("artifact:"+effect.targetId,newCard);
          await txn.put("assignments",updated);
          for(const [id,roles] of changed){
            await txn.put("roles:"+id,roles);
            await txn.put("role:"+id,roles[0]);
          }
          // Update every active delivery when global revision changes, so
          // unaffected Players never fall back to stale legacy snapshots.
          for(const row of updated){
            const id=normalizeLoginId(row.loginId);
            if(!id)continue;
            const roles=changed.get(id)||await txn.get("roles:"+id)||[];
            if(!Array.isArray(roles)||!roles.length)continue;
            await txn.put("deliverySnapshot:"+id,buildPrivateDeliverySnapshot({
              matchId,matchRevision:Number(nextMeta.matchRevision||0),
              deliveryVersion:version,publishedAt:time,roles}));
          }
          await txn.put("meta",nextMeta);
          return {ok:true,room:publicRoom(nextMeta)};
        });
        if(!moved.ok)return j({ok:false,error:moved.error||"ARTIFACT_STEAL_CONFLICT",
          message:moved.message||"Không thể cấp lá mới; Artifact chưa tiêu hao lượt."},409);
        // Never send the stolen Artifact identity over a shared socket.
        this.broadcast({type:"room_state",room:moved.room,serverTime:Date.now()});
        continue;
      }
      if(effect.kind==="swap_role"){
        const swapped=await this.ctx.storage.transaction(async txn=>{
          const current=await txn.get("meta"),rows=await txn.get("assignments")||[];
          if(!current||String(current.matchId||"")!==matchId||
            String(current.cycleKey||"")!==cycleKey||
            String(current.cyclePhase||"")!=="morning")
            return {ok:false,error:"ROLE_SWAP_PHASE_CHANGED"};
          const original=await txn.get("roles:"+actorId)||[],
            recipient=await txn.get("roles:"+effect.targetId)||[];
          const plan=planArtifactRoleSwap({assignments:rows,actorId,
            targetId:effect.targetId,actorRoles:original,targetRoles:recipient,now:time});
          if(!plan.ok)return plan;
          const nextVersion=Math.max(1,Number(current.deliveryVersion)||1)+1,
            nextMeta={...current,deliveryVersion:nextVersion,
              roleDeliveredAt:time,updatedAt:time};
          await txn.put("assignments",plan.assignments);
          for(const [id,roles] of [[actorId,plan.actorRoles],[effect.targetId,plan.targetRoles]]){
            await txn.put("roles:"+id,roles);
            await txn.put("role:"+id,roles[0]);
            await txn.put("deliverySnapshot:"+id,buildPrivateDeliverySnapshot({
              matchId,matchRevision:Number(nextMeta.matchRevision||0),
              deliveryVersion:nextVersion,publishedAt:time,roles}));
          }
          // The new recipients have fresh Role abilities. Keep immutable
          // actionLog history; reset only current-match action-use ledgers.
          for(const key of ["battleRoleUsage:"+matchId,"dayRoleUsage:"+matchId]){
            const usage=await txn.get(key)||[];
            await txn.put(key,(Array.isArray(usage)?usage:[]).filter(row=>
              ![actorId,effect.targetId].includes(normalizeLoginId(row.actorId))));
          }
          await txn.put("meta",nextMeta);
          return {ok:true,room:publicRoom(nextMeta)};
        });
        if(!swapped.ok)return j({ok:false,error:swapped.error||"ROLE_SWAP_CONFLICT",
          message:"Không thể hoán đổi Vai Trò; lượt Artifact chưa bị trừ."},409);
        this.broadcast({type:"room_state",room:swapped.room,
          serverTime:Date.now()});
        continue;
      }
      if(effect.kind==="remove_artifact"){
        const removed=await this.ctx.storage.transaction(async txn=>{
          const target=await txn.get("artifact:"+effect.loginId),
            rows=await txn.get("assignments")||[],
            assigned=rows.find(x=>normalizeLoginId(x.loginId)===effect.loginId);
          if(!target||target.removedFromMatch===true||
            String(target.artifactId||"")!==effect.artifactId||
            (target.matchId&&String(target.matchId)!==matchId)||
            !assigned||String(assigned.artifactId||"")!==effect.artifactId||
            (effect.requireUnviewed&&!validateUnrevealedArtifactDestroy({
              actorId,targetId:effect.loginId,artifact:target,assignment:assigned,matchId
            }).ok))
            return {ok:false};
          target.removedFromMatch=true;target.removedAt=time;
          target.removedByArtifactId=artifactId;
          await txn.put("artifact:"+effect.loginId,target);
          for(const row of rows){
            if(normalizeLoginId(row.loginId)!==effect.loginId||
              String(row.artifactId||"")!==effect.artifactId)continue;
            row.artifactId=null;row.artifactName=null;
            row.artifactUsedAt=null;row.artifactViewedAt=null;
            row.artifactPriorityFirst=null;row.artifactSingleUse=null;
          }
          await txn.put("assignments",rows);
          return {ok:true};
        });
        if(!removed.ok)return j({ok:false,error:effect.requireUnviewed?"DESTROY_TARGET_CHANGED":"NEGATE_TARGET_CHANGED"},409);
        continue;
      }
      if(effect.kind==="knight_pending"){await this.ctx.storage.put(effect.key,effect.value);continue}
      if(effect.kind==="artifact_win"){
        const id="artifact-judgement:"+matchId+":"+token;
        const victory={id,type:"artifact_win",loginId:actorId,matchId,night:day,
          cycleKey,artifactId:"artifact_26",actionId:"artifact_action_judge_two_wolves",
          source:"artifact-judgement",effectActive:true,createdAt:time,
          message:"Phe Dân chiến thắng nhờ Quả Cầu Phán Đoán."};
        interactions.push(victory);await this.ctx.storage.put(this.actionLogKey(victory),victory);
        continue;
      }
      if(effect.kind==="revived")continue;
      // Multiple distinct status IDs may coexist (e.g. Mute and Artifact vote ban).
      const sameStatus=effect.type==="status"&&interactions.some(row=>
        sameMatch(row)&&normalizeLoginId(row.loginId)===effect.loginId&&
        row.effectActive!==false&&row.type==="status"&&row.statusId===effect.statusId&&
        Number(row.night)===day);
      if(effect.type!=="effect_notice"&&(effect.type==="status"?sameStatus:affected(effect.loginId,effect.type)))continue;
      const log={id:"ix-"+crypto.randomUUID(),type:effect.type,
        ...(effect.statusId?{statusId:effect.statusId}:{}),
        ...(effect.protectNight?{protectNight:effect.protectNight}:{}),
        ...(effect.statusId==="disabled_2n"?{activationPhase:"morning"}:{}),
        ...(effect.kind==="grudge_schedule"?{
          pendingDeath:true,deferredArtifact:"artifact_07",scheduledFromNight:day,
          effectName:"Hơi Thở Lão Già"
        }:{}),
        loginId:effect.loginId,matchId,cycleKey,
        night:effect.kind==="grudge_schedule"?day+1:day,actorId,artifactId,roleId,actionId,
        source:effect.source||"day-action",effectActive:effect.type!=="effect_notice",
        message:message||"Hành động Ban ngày",createdAt:time};
      interactions.push(log);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(time)).padStart(13,"0")+":"+log.id,log);
      if(log.effectActive)this.broadcast({type:"player_status_changed",loginId:log.loginId,
        statusId:log.statusId||log.type,active:true,serverTime:Date.now()});
    }
    if(typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,interactions,time);
    await this.ctx.storage.put("interactions",pruneInteractions(interactions));
    if(artifactId==="artifact_38"&&result?.artifactOwnerPublic){
      this.broadcast({type:"artifact_owner_revealed",loginId:actorId,
        artifactId:"artifact_38",artifactName:"Thương Cuồng Nộ",matchId,
        serverTime:Date.now()});
    }
    if(!artifactId&&result?.revealedActorRole){
      const reveal={id:"role-reveal:"+matchId+":"+actorId,type:"role_revealed",
        loginId:actorId,actorId,roleId,matchId,night:day,createdAt:time,
        message:(roleId==="role_cavalier"?"Kỵ Sỹ":"Hoàng Tử")+" đã công khai Vai Trò."};
      await this.ctx.storage.put(this.actionLogKey(reveal),reveal);
      this.broadcast({type:"role_revealed",loginId:actorId,roleId,
        roleName:roleId==="role_cavalier"?"Kỵ Sỹ":"Hoàng Tử",
        matchId,serverTime:Date.now()});
    }
    const audit={id:"ev-"+crypto.randomUUID(),source:"gm",type:"day_action",actorId,
      roleId,artifactId,actionId,matchId,night:day,targetIds:targets,message,createdAt:time};
    await this.ctx.storage.put("actionLog:"+String(Date.parse(time)).padStart(13,"0")+":"+audit.id,audit);
    if(artifactId){
      const ckey="artifactCycle:"+artifactCycleKey;
      await this.ctx.storage.put(ckey,artifactReservation.state);
      await this.ctx.storage.put(useKey,{requestId:token,cycleKey:artifactCycleKey,usedAt:time,artifactId,actorId});
      // Steal replaced the owner card inside the transaction; never restore #17.
      if(artifactId!=="artifact_17"){
        owned.usedAt=time;await this.ctx.storage.put("artifact:"+actorId,owned);
      }
    }else{
      await this.ctx.storage.put(usageKey,[...priorUsage,{matchId,day,actorId,roleId,
        artifactId:"",actionId,requestId:token,createdAt:time}].slice(-1000));
    }
    const payload={ok:true,kind,actionId,actorId,roleId,artifactId,targetIds:targets,
      day,result,serverTime:Date.now()};
    await this.ctx.storage.put(receiptKey,{fingerprint,result:payload});
    this.broadcast({type:"day_action_confirmed",actionId,actorId,targetIds:targets,
      day,serverTime:Date.now()});
    return j(payload);
  }
  /* V3.99: a single GM confirmation is one reversible server operation, including
   * multi-target interactions and the Artifact quota/use ledger. Only the latest
   * committed action in this exact turn and night may be restored. */
  async gmBattleAction(request,body){
    const actionStartedAt=Date.now();
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,matchId=String(meta.matchId||""),cycleKey=String(meta.cycleKey||""),
      token=String(body?.clientEventId||"").trim().slice(0,120),
      turnId=String(body?.turnId||""),actorId=normalizeLoginId(body?.actorId||""),
      artifactId=String(body?.artifactId||"").slice(0,120),
      targets=Array.isArray(body?.targetIds)?body.targetIds.map(normalizeLoginId):[],
      type=String(body?.type||"").trim().toLowerCase(),allowed=new Set(["frozen","expelled","dead","thumb_vote","assassin_mark","effect_notice","revive","clear_state"]);
    if(!token||!turnId||!actorId||!allowed.has(type)||!targets.length||targets.length>30||
      targets.some(id=>!id)||new Set(targets).size!==targets.length)
      return j({ok:false,error:"INVALID_BATTLE_ACTION"},400);
    if(String(body?.actionId||"")==="action_transfer_bite"&&
      (artifactId||type!=="effect_notice"||!["left","none","right"].includes(String(body?.direction||""))||
       targets.length!==1||targets[0]!==actorId))
      return j({ok:false,error:"INVALID_FAIRY_DIRECTION"},400);
    // Assassin marks require a GM-selected secret sign and the correct role.
    const assassinAction=String(body?.actionId||"")==="action_assassin_mark";
    if(assassinAction&&(type!=="assassin_mark"||!["👍","👎"].includes(String(body?.assassinChoice||""))))
      return j({ok:false,error:"INVALID_ASSASSIN_CHOICE",message:"Sát Thủ phải chọn 👍 hoặc 👎."},400);
    if(!assassinAction&&body?.assassinChoice)return j({ok:false,error:"INVALID_ASSASSIN_CHOICE"},400);
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="night"||
      String(body?.matchId||"")!==matchId||String(body?.cycleKey||"")!==cycleKey)
      return j({ok:false,error:"STALE_BATTLE_ACTION"},409);
    const rt=await this.getNightRuntime(meta,Number(meta.cycleNight||1),false);
    const step=rt&&!rt.completed?rt.queue?.[rt.cursor]:null;
    if(!step||String(step.id)!==turnId)return j({ok:false,error:"STALE_TURN"},409);
    const actors=(step.loginIds||[step.loginId]).filter(Boolean).map(normalizeLoginId);
    const owners=step.kind==="role-group"?(step.roles||[]).flatMap(row=>row.artifacts||[]):
      step.kind==="role"?step.artifacts||[]:step.kind==="early-artifact-window"?step.actions||[]:
      step.kind==="artifact-main"?[step]:[];
    if(artifactId){
      if(!owners.some(a=>String(a.artifactId)===artifactId&&normalizeLoginId(a.loginId)===actorId))
        return j({ok:false,error:"INVALID_ARTIFACT_FOR_TURN"},403);
    }else if(!actors.includes(actorId))return j({ok:false,error:"INVALID_ACTOR_FOR_TURN"},403);
    if(step.kind==="wolf-pack-bite"&&targets.length!==Number(step.targetCount||1))
      return j({ok:false,error:"WOLF_PACK_BITE_TARGET_COUNT_INVALID",
        expected:Number(step.targetCount||1)},409);
    if(step.kind==="wolf-pack-bite"&&
      (String(body.actionId)!=="action_wolf_bite"||
        !(step.biteActorIds||[]).map(normalizeLoginId).includes(actorId)))
      return j({ok:false,error:"INVALID_PACK_ACTION"},403);
    const players=await this.ctx.storage.get("players")||{};
    if(targets.some(id=>!players["member:"+id]))return j({ok:false,error:"INVALID_BATTLE_TARGET"},400);
    // Validate all private divination targets BEFORE any usage ledger or game-state write.
    const inspectIds=Array.isArray(body?.revealTargetIds)&&body.revealTargetIds.length?
      body.revealTargetIds.map(normalizeLoginId):(body?.revealTargetId?[normalizeLoginId(body.revealTargetId)]:targets);
    const expectedInspectCount=({action_compare_faction:2,action_bear_scan:2,action_fox_scan:3,action_scan_three:3,'action-vampire-check':3})[String(body?.actionId||'')];
    if(!artifactId&&expectedInspectCount&&(inspectIds.length!==expectedInspectCount||
      new Set(inspectIds).size!==expectedInspectCount||inspectIds.some(id=>!players['member:'+id])))
      return j({ok:false,error:'DIVINATION_TARGET_COUNT',message:'Soi xét phải chọn đủ các mục tiêu khác nhau.'},400);
    const interactions=await this.ctx.storage.get("interactions")||[];
    const isExpelled=id=>interactions.some(row=>
      normalizeLoginId(row?.loginId)===id&&String(row?.type||"")==="expelled"&&
      row?.effectActive!==false&&(!row?.matchId||String(row.matchId)===matchId)&&
      (!row?.expiresAt||Date.parse(row.expiresAt)>Date.now()));
    if(isExpelled(actorId))
      return j({ok:false,error:"ACTOR_EXPELLED",message:"Người thực hiện đã bị đuổi khỏi làng, không thể dùng chức năng."},409);
    if(step.kind==="wolf-pack-bite"){
      const members=await this.ctx.storage.get("assignments")||[];
      const alpha=alphaPackState(members,interactions,matchId,meta.cycleNight);
      if(alpha.expelled)return j({ok:false,error:"PACK_ALPHA_EXPELLED",message:"Sói Trùm bị đuổi khỏi làng, Bầy Sói không thể Cắn."},409);
    }
    if(isBattleActorBlocked(interactions,{actorId,matchId,statusDefs:STATUS_DEFS}))
      return j({ok:false,error:"ACTOR_CANNOT_ACT",message:"Người thực hiện bị đóng băng hoặc đã chết."},409);
    const receiptKey="battleActionReceipt:"+matchId+":"+token;
    const fingerprint=JSON.stringify([turnId,actorId,artifactId,type,targets,String(body?.actionId||""),String(body?.effectId||""),String(body?.direction||""),body?.revealTargetIds||[],String(body?.assassinChoice||"")]);
    const prior=await this.ctx.storage.get(receiptKey);
    if(prior)return prior.fingerprint===fingerprint?j({...prior.result,idempotent:true}):
      j({ok:false,error:"REQUEST_ID_CONFLICT"},409);
    // V3.103 — enforce role-card use limits in the Durable Object, not just UI.
    // Snapshot and undo include this ledger so undo restores function availability.
    const usageKey="battleRoleUsage:"+matchId;
    let currentUsage=(await this.ctx.storage.get(usageKey))||[],roleUse=null;
    if(!artifactId){
      const roleStep=["role-group","wolf-pack-bite"].includes(step.kind)?(step.roles||[]).find(r=>
        (r.loginIds||[]).map(normalizeLoginId).includes(actorId)):step.kind==="role"?step:null;
      if(!roleStep)return j({ok:false,error:"INVALID_ROLE_FOR_TURN"},403);
      const roleId=String(roleStep.roleId||"");
      if(assassinAction&&roleId!=="role_assassin")return j({ok:false,error:"INVALID_ASSASSIN_ROLE"},403);
      const assigned=(await this.ctx.storage.get("assignments"))||[];
      const row=assigned.find(a=>normalizeLoginId(a?.loginId)===actorId&&String(a?.roleId||"")===roleId);
      if(!row)return j({ok:false,error:"INVALID_ROLE_OWNER"},403);
      // assignments is a public summary; limits live in the existing private role records.
      const storedRoles=await this.ctx.storage.get("roles:"+actorId),legacyRole=await this.ctx.storage.get("role:"+actorId);
      const privateRoles=Array.isArray(storedRoles)&&storedRoles.length?storedRoles:(legacyRole?[legacyRole]:[]);
      const deliveredRole=privateRoles.find(r=>String(r?.roleId||"")===roleId&&
        (!r?.matchId||String(r.matchId)===matchId));
      const roleCard=deliveredRole?.roleCard||row.roleCard||{},actionId=String(body?.actionId||"");
      if(roleId==='role_cult'&&actionId==='action-cult-add'&&Number(meta.cycleNight)>5)
        return j({ok:false,error:'CULT_RECRUITMENT_FIRST_FIVE_NIGHTS_ONLY'},409);
      if(roleId==='role_avenger'&&actionId==='action-avenger-target'&&
        (Number(meta.cycleNight)!==1||targets.includes(actorId)))
        return j({ok:false,error:'AVENGER_NIGHT_ONE_TARGET_INVALID'},409);
      if(roleId==='role_cupid'&&actionId==='action-cupid-pair'&&
        (Number(meta.cycleNight||0)!==1||targets.length!==2||
          targets.some(id=>isExpelled(id))))
        return j({ok:false,error:'CUPID_PAIR_NIGHT_ONE_TARGET_INVALID'},409);
      if(roleId==='role_mad_doctor'&&actionId==='action-mad-doctor-cure'&&
        !targets.some(id=>interactions.some(x=>String(x.matchId||'')===matchId&&
          x.type==='status'&&x.statusId==='infected'&&x.effectActive!==false&&
          normalizeLoginId(x.loginId)===id)))
        return j({ok:false,error:'DOCTOR_TARGET_NOT_INFECTED',
          message:'Không có người đang Bị Bệnh để giải độc; chưa trừ Bình Cứu.'},409);
      if(['action-disease-self','action-mad-doctor-cure','action-news-role',
          'action-black-woman-leave'].includes(actionId)&&type!=='effect_notice')
        return j({ok:false,error:'ROLE_SPECIAL_EFFECT_TYPE_INVALID'},409);

      // Server-side special restrictions precede all usage and effect writes.
      if(roleId==='role_elder'&&actionId==='18'){
        if(type!=='effect_notice'||Number(meta.cycleNight||0)>4)
          return j({ok:false,error:'ELDER_BELL_NIGHT_OR_TYPE_INVALID'},409);
        const used=resolveElderBell({assignments:assigned,interactions,
          matchId,night:Math.max(1,Number(meta.cycleNight||1))}).spends;
        const previousBells=new Set(interactions.filter(x=>
          String(x.matchId)===matchId&&x.actionId==='18'&&
          normalizeLoginId(x.actorId)===actorId&&x.undone!==true&&
          x.noEffect!==true&&x.status!=='skipped')
          .map(x=>Number(x.night)));
        if(previousBells.size>=2||used.some(x=>x.actorId===actorId&&x.livesRemaining===0))
          return j({ok:false,error:'ELDER_BELL_LIVES_EXHAUSTED'},409);
      }
      if(roleId==='role_hunter'&&actionId==='action_hunt'){
        const target=assigned.find(a=>normalizeLoginId(a.loginId)===targets[0]);
        const faction=String(target?.factionId||target?.faction||target?.roleCard?.factionId||'').toLowerCase();
        if(faction==='third'||faction.includes('phe ba'))
          return j({ok:false,error:'HUNTER_THIRD_FACTION_FORBIDDEN'},409);
      }
      if(roleId==='role_wolf_hunter'&&actionId==='action_hunter_mark'){
        if(type!=='effect_notice')return j({ok:false,error:'WOLF_HUNTER_MARK_TYPE_INVALID'},409);
        const oldMarks=interactions.filter(x=>String(x.matchId)===matchId&&
          normalizeLoginId(x.actorId)===actorId&&x.actionId==='action_hunter_mark'&&
          x.undone!==true&&x.noEffect!==true&&x.status!=='skipped'&&
          Number(x.night||0)<=Number(meta.cycleNight||1))
          .sort((x,y)=>Number(x.night||0)-Number(y.night||0)||
            String(x.createdAt||'').localeCompare(String(y.createdAt||'')));
        const previousMark=oldMarks.at(-1);
        if((!previousMark&&Number(meta.cycleNight||1)>1)||
          (previousMark&&!interactions.some(x=>String(x.matchId)===matchId&&
            x.type==='dead'&&x.effectActive!==false&&
            normalizeLoginId(x.loginId)===normalizeLoginId(previousMark.loginId)&&
            Number(x.night||0)<Number(meta.cycleNight||1))))
          return j({ok:false,error:'WOLF_HUNTER_REMARK_REQUIRES_PREVIOUS_TARGET_DEATH'},409);
      }
      if(roleId==='role_clone'&&actionId==='action_clone_target'&&
        (Number(meta.cycleNight||0)!==1||targets.includes(actorId)||targets.length!==1))
        return j({ok:false,error:"CLONE_TARGET_NIGHT_ONE_ONLY"},409);
      if(roleId==='role_snow_wolf'&&actionId==='action_wolf_bite'&&
        !canSnowWolfBite({assignments:assigned,interactions,matchId}))
        return j({ok:false,error:"SNOW_WOLF_PACK_ALIVE",message:"Sói Tuyết chỉ được Cắn khi không còn Sói khác sống trong ván."},409);
      const packBite=step.kind==="wolf-pack-bite";
      // Reject forged effect types and invalid frozen/dead targets before the
      // use ledger or interactions are changed. The UI is not an authority.
      const expectedType=packBite?"effect_notice":
        roleId==="role_witch"&&actionId==="action_witch_save"?"effect_notice":
        roleId==="role_witch"&&actionId==="action_witch_kill"?"dead":
        roleId==="role_snow_wolf"&&actionId==="action_snow_wolf_freeze"?"frozen":
        roleId==="role_guard"&&actionId==="action_protect"?"effect_notice":
        roleId==="role_wolf_hunter"&&actionId==="action_hunter_mark"?"effect_notice":
        roleId==="role_hunter"&&actionId==="action_hunt"?"effect_notice":
        roleId==="role_crow"&&actionId==="action-g7-crow-votes"?"effect_notice":
        roleId==="role_elder"&&actionId==="18"?"effect_notice":
        roleId==="role_cupid"&&actionId==="action-cupid-pair"?"effect_notice":
        roleId==="role_sect_leader"&&actionId==="25"?"effect_notice":
        roleId==="role_cult"&&actionId==="action-cult-add"?"effect_notice":
        roleId==="role_avenger"&&actionId==="action-avenger-target"?"effect_notice":
        roleId==="role_fairy"&&actionId==="action_transfer_bite"?"effect_notice":
        ['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(actionId)?"effect_notice":
        roleId==='role_destroyer'&&actionId==='action_destroyer_kill'?'dead':"";
      if(expectedType&&type!==expectedType)
        return j({ok:false,error:"NIGHT_ACTION_TYPE_MISMATCH"},409);
      if(roleId==="role_snow_wolf"&&actionId==="action_snow_wolf_freeze"&&targets.includes(actorId))
        return j({ok:false,error:"SNOW_WOLF_SELF_FREEZE"},409);
      if((roleId==="role_snow_wolf"&&actionId==="action_snow_wolf_freeze"||
          roleId==="role_guard"&&actionId==="action_protect")&&
        targets.some(id=>interactions.some(x=>String(x?.matchId||"")===matchId&&
          normalizeLoginId(x?.loginId)===id&&x?.type==="dead"&&x.effectActive!==false)))
        return j({ok:false,error:"TARGET_ALREADY_DEAD"},409);
      if(roleId==="role_witch"&&actionId==="action_witch_save"){
        const finalBite=resolveWolfNight({assignments:await readNightAssignments(this.ctx.storage,matchId),
          interactions,players,matchId,night:Number(meta.cycleNight||1)});
        if(targets.length!==1||!witchSaveTargetAllowed(finalBite,targets[0]))
          return j({ok:false,error:"WITCH_SAVE_TARGET_INVALID",
            message:"Bình Cứu chỉ dùng được cho người nhận vết Sói Cắn cuối cùng hợp lệ."},409);
      }
      if(!packBite&&actionId==="action_wolf_bite")
        return j({ok:false,error:"PACK_BITE_WRONG_TURN"},403);
      if(packBite&&(!isWolfRole(row)||actionId!=="action_wolf_bite"))
        return j({ok:false,error:"INVALID_PACK_ACTOR"},403);
      if(packBite&&currentUsage.some(x=>String(x?.matchId)===matchId&&Number(x?.night)===Number(meta.cycleNight||1)&&
        x?.actionId==="action_wolf_bite"))
        return j({ok:false,error:"PACK_BITE_ALREADY_USED"},409);
      const policy=packBite?{roleId,actionId,singleActionPerNight:false,usageMode:"eachNight",usageCount:1,knownAction:true}:
        resolveRoleActionPolicy(roleCard,roleId,actionId);
      // Guard & Snow Wolf may not repeat the exact target two consecutive nights.
      if(["action_protect","action_snow_wolf_freeze"].includes(actionId)){
        const correctRole=actionId==="action_protect"?"role_guard":"role_snow_wolf";
        if(roleId===correctRole&&targets.some(x=>previousNightTargets(currentUsage,{
          matchId,roleId,actionId,actorId,night:Number(meta.cycleNight||1)}).includes(x)))
          return j({ok:false,error:"CONSECUTIVE_NIGHT_TARGET_FORBIDDEN"},409);
      }
      if(roleId==="role_old_witch"){
        // GM can submit forged action types or targets; enforce WITCH-01 before
        // taking snapshots, writing interactions, debiting uses or broadcasting.
        const required=actionId==="action_revive"?"revive":actionId==="action_exile"?"expelled":"";
        if(!required||type!==required)return j({ok:false,error:"WITCH_INVALID_ACTION_TYPE"},409);
        const checked=oldWitchActionCheck({actionId,actorId,targetIds:targets,
          matchId,night:Number(meta.cycleNight||1),interactions,players,
          usage:await this.ctx.storage.get("battleRoleUsage:"+matchId)||[]});
        if(!checked.ok)return j({ok:false,error:checked.error,message:checked.message},409);
      }
      // Recover older confirmed battle actions in an already-running match.
      const known=new Set(currentUsage.map(x=>String(x?.eventId||"")).filter(Boolean));
      for(const hit of interactions){
        const event=String(hit?.clientEventId||""),eventId=event.includes(":")?event.slice(0,event.lastIndexOf(":")):"";
        if(!eventId||known.has(eventId)||!String(hit?.actionId||"")||
          normalizeLoginId(hit?.actorId)!==actorId||String(hit?.matchId||"")!==matchId||
          !Number.isFinite(Number(hit?.night))||Number(hit.night)<1)continue;
        currentUsage=appendBattleRoleActionUsage(currentUsage,{matchId,night:hit.night,
          actorId,roleId,actionId:String(hit.actionId),eventId,usedAt:hit.createdAt});
        known.add(eventId);
      }
      const ruleTargets=['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'].includes(actionId)?inspectIds:targets;
      const decision=checkBattleRoleActionUsage(currentUsage,{matchId,
        night:Number(meta.cycleNight||1),actorId,roleId,actionId,targetIds:ruleTargets,policy});
      if(!decision.ok)return j({ok:false,error:decision.error,
        message:decision.message||"Hành động không được phép theo luật vai trò."},409);
      roleUse={matchId,night:Number(meta.cycleNight||1),actorId,roleId,actionId,targetIds:ruleTargets,
        eventId:token,usedAt:new Date().toISOString(),currentUsage};
    }
    const undoKey="battleLastAction:"+matchId,
      artifactKey=artifactId?"artifact:"+actorId:null,
      useKey=artifactId?"artifactUse:"+actorId+":"+artifactId:null,
      cycleUseKey=artifactId?"artifactCycle:"+currentArtifactCycleKey(meta):null;
    // Cupid swaps the faction of both linked players. Include their private
    // deliveries plus room revision in the same authorized Undo snapshot.
    const cupidTargets=roleUse?.roleId==="role_cupid"&&roleUse.actionId==="action-cupid-pair"?
      targets:[],avengerTargets=roleUse?.roleId==="role_avenger"&&roleUse.actionId==="action-avenger-target"?
      [actorId]:[],privateKeys=[...cupidTargets,...avengerTargets].flatMap(id=>[
        "role:"+id,"roles:"+id,"deliverySnapshot:"+id]);
    const keys=["interactions","assignments",...privateKeys,
      ...([(cupidTargets.length||avengerTargets.length)?"meta":null,roleUse?usageKey:null,artifactKey,useKey,cycleUseKey].filter(Boolean))];
    const snapshot=async()=>{const entries=[];for(const key of keys){
      const value=await this.ctx.storage.get(key);
      entries.push({key,exists:value!==undefined&&value!==null,value:value===undefined?null:value});
    }return entries};
    const restore=async entries=>{for(const row of entries){
      if(row.exists)await this.ctx.storage.put(row.key,row.value);
      else await this.ctx.storage.delete(row.key);
    }};
    const before=await snapshot(),results=[];
    // Other players may select expelled targets. The selection consumes the
    // actor's normal action, but never applies gameplay effects to those targets.
    const isFactionCompare=String(body?.actionId||'')==='action_compare_faction';
    // Observation is not a harmful effect: Exile must not suppress faction comparison.
    let actionTargets=targets;
    if(roleUse?.roleId==='role_destroyer'&&body.actionId==='action_destroyer_kill'&&!targets.some(isExpelled)){
      const assigned=await this.ctx.storage.get('assignments')||[];
      const succeeds=targets.every(id=>assigned.some(row=>normalizeLoginId(row.loginId)===id&&['role_seer','role_witch','role_hunter','role_guard','role_assassin'].includes(row.roleId)));
      if(!succeeds)actionTargets=[actorId];
    }
    const effectiveTargets=isFactionCompare?actionTargets:actionTargets.filter(id=>!isExpelled(id));
    for(const id of actionTargets){
      if(isFactionCompare){
        results.push({ok:true,loginId:id,observed:true});continue;
      }
      if(!effectiveTargets.includes(id)){
        results.push({ok:true,loginId:id,noEffect:true,reason:"EXPELLED"});
        continue;
      }
      const action={...body,loginId:id,actorId,clientEventId:token+":"+id,
        actionNonce:token,targetIds:effectiveTargets};
      const response=await this.executeGmInteraction(request,action,auth);
      const data=await response.clone().json().catch(()=>({ok:false,error:"INVALID_RESPONSE"}));
      if(!response.ok||data.ok!==true){
        await restore(before);
        this.broadcast({type:"battle_action_reverted",matchId,turnId,serverTime:Date.now()});
        return j({ok:false,error:"BATTLE_ACTION_ABORTED",detail:data.error||"ACTION_FAILED",
          message:data.message||"Không thể áp dụng đầy đủ hành động; tất cả mục tiêu đã được khôi phục."},response.status>=400?response.status:409);
      }
      results.push(data);
    }
    if(roleUse&&['action-disease-self','action-mad-doctor-cure','action-news-role',
        'action-black-woman-leave'].includes(roleUse.actionId)){
      const updated=await this.ctx.storage.get("interactions")||[];
      const id=effectiveTargets[0],timestamp=new Date().toISOString();
      if(roleUse.actionId==='action-mad-doctor-cure'){
        for(const x of updated)if(String(x.matchId||'')===matchId&&
          x.type==='status'&&x.statusId==='infected'&&
          x.effectActive!==false&&normalizeLoginId(x.loginId)===id){
            x.effectActive=false;x.expiredAt=timestamp;
            x.expiredReason="MAD_DOCTOR_CURED";await this.ctx.storage.put(this.actionLogKey(x),x);
          }
        this.broadcast({type:"player_status_changed",loginId:id,
          statusId:"infected",active:false,serverTime:Date.now()});
      }
      if(roleUse.actionId==='action-disease-self'){
        const stamp="infected:"+matchId+":"+actorId;
        if(!updated.some(x=>x.id===stamp)){
          const disease={id:stamp,type:"status",statusId:"infected",loginId:id,
            matchId,night:Number(meta.cycleNight),cycleKey,roleId:"role_diseased",
            actionId:roleUse.actionId,actorId,effectActive:true,
            createdAt:timestamp,source:"diseased-role",
            message:"Người chơi đã bị nhiễm bệnh."};
          updated.push(disease);await this.ctx.storage.put(this.actionLogKey(disease),disease);
        }
      }
      if(roleUse.actionId==='action-news-role'){
        const targetRole=(await this.ctx.storage.get("assignments")||[])
          .find(x=>normalizeLoginId(x.loginId)===id);
        const confirmed=updated.find(x=>x.clientEventId===token+":"+id&&
          x.actionId===roleUse.actionId&&normalizeLoginId(x.loginId)===id);
        if(confirmed&&targetRole){
          confirmed.snapshotRoleId=String(targetRole.roleId||"");
          confirmed.snapshotRoleName=String(targetRole.roleName||targetRole.roleId||"");
          await this.ctx.storage.put(this.actionLogKey(confirmed),confirmed);
        }
      }
      await this.ctx.storage.put("interactions",pruneInteractions(updated));
    }
    // Cupid: two participants become Phe Ba but keep their own Role and
    // ability package. Their updated private snapshots survive reconnect.
    if(cupidTargets.length===2&&effectiveTargets.length===2){
      const assigned=await this.ctx.storage.get("assignments")||[],
        changed=assigned.map(a=>cupidTargets.includes(normalizeLoginId(a.loginId))?
          {...a,faction:"third",factionId:"third",inheritedFromFaction:"village"}:a);
      const date=new Date().toISOString();
      await this.ctx.storage.put("assignments",changed);
      meta.deliveryVersion=Math.max(1,Number(meta.deliveryVersion)||1)+1;
      meta.roleDeliveredAt=date;meta.updatedAt=date;
      for(const id of cupidTargets){
        const roles=await this.ctx.storage.get("roles:"+id)||[];
        if(!Array.isArray(roles)||!roles.length)continue;
        const converted=roles.map(x=>({...x,faction:"third",
          roleCard:{...x.roleCard,factionId:"third"},viewedAt:null}));
        await this.ctx.storage.put("roles:"+id,converted);
        await this.ctx.storage.put("role:"+id,converted[0]);
        await this.ctx.storage.put("deliverySnapshot:"+id,
          buildPrivateDeliverySnapshot({matchId,matchRevision:Number(meta.matchRevision||0),
            deliveryVersion:meta.deliveryVersion,publishedAt:date,roles:converted}));
      }
      await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),serverTime:Date.now()});
    }
    if(avengerTargets.length===1&&effectiveTargets.length===1){
      const assigned=await this.ctx.storage.get("assignments")||[],
        target=assigned.find(x=>normalizeLoginId(x.loginId)===effectiveTargets[0]);
      if(target){
        const faction=String(target.faction||target.factionId||"village");
        const converted=assigned.map(x=>normalizeLoginId(x.loginId)===actorId?
          {...x,faction,factionId:faction}:x);
        await this.ctx.storage.put("assignments",converted);
        const roles=await this.ctx.storage.get("roles:"+actorId)||[];
        if(Array.isArray(roles)&&roles.length){
          const changed=roles.map(x=>({...x,faction,
            roleCard:{...x.roleCard,factionId:faction},viewedAt:null}));
          await this.ctx.storage.put("roles:"+actorId,changed);
          await this.ctx.storage.put("role:"+actorId,changed[0]);
          meta.deliveryVersion=Math.max(1,Number(meta.deliveryVersion)||1)+1;
          const publishedAt=new Date().toISOString();
          meta.roleDeliveredAt=publishedAt;meta.updatedAt=publishedAt;
          await this.ctx.storage.put("meta",meta);
          await this.ctx.storage.put("deliverySnapshot:"+actorId,
            buildPrivateDeliverySnapshot({matchId,matchRevision:Number(meta.matchRevision||0),
              deliveryVersion:meta.deliveryVersion,publishedAt,roles:changed}));
        }
      }
    }
    if(artifactId==='artifact_06'&&String(body.actionId)==='artifact_action_disable_function'){
      const rows=await this.ctx.storage.get('interactions')||[],time=new Date().toISOString();
      for(const loginId of effectiveTargets){
        const event={id:'artifact-disable:'+matchId+':'+token+':'+loginId,
          type:'status',statusId:'disabled_permanent',loginId,actorId,
          matchId,cycleKey,night:Number(meta.cycleNight),artifactId,
          actionId:'artifact_action_disable_function',effectActive:true,
          source:'artifact-disable-function',createdAt:time,
          message:'Ấn Dân Làng đã làm mục tiêu mất năng lực đặc biệt đến hết ván.'};
        rows.push(event);await this.ctx.storage.put(this.actionLogKey(event),event);
      }
      await this.ctx.storage.put('interactions',pruneInteractions(rows));
    }
    if(roleUse&&['25','action-cult-add'].includes(roleUse.actionId)){
      const rows=await this.ctx.storage.get("interactions")||[],time=new Date().toISOString();
      const statusId=roleUse.actionId==='25'?'sect_member':'disabled_permanent';
      for(const loginId of effectiveTargets){
        const id="member-status:"+matchId+":"+statusId+":"+actorId+":"+loginId;
        if(rows.some(x=>x.id===id))continue;
        const event={id,type:"status",statusId,loginId,matchId,
          night:Number(meta.cycleNight),cycleKey,effectActive:true,actorId,
          roleId:roleUse.roleId,actionId:roleUse.actionId,
          source:"linked-member-engine",createdAt:time,
          message:roleUse.actionId==='25'?
            "Người chơi đã trở thành Giáo Dân.":"Người chơi đã gia nhập Tà Đạo và mất năng lực."};
        rows.push(event);await this.ctx.storage.put(this.actionLogKey(event),event);
      }
      await this.ctx.storage.put("interactions",pruneInteractions(rows));
    }
    if(roleUse)await this.ctx.storage.put(usageKey,appendBattleRoleActionUsage(roleUse.currentUsage,roleUse));
    const after=await snapshot(),undoToken="undo-"+crypto.randomUUID(),
      record={token:undoToken,matchId,cycleKey,night:Number(meta.cycleNight||1),turnId,
        label:String(body?.effectName||body?.actionId||"Hành động").slice(0,120),targetIds:targets,
        before,after,undone:false,createdAt:new Date().toISOString()};
    await this.ctx.storage.put(undoKey,record);
    const revealIds=Array.isArray(body?.revealTargetIds)&&body.revealTargetIds.length?body.revealTargetIds.map(normalizeLoginId):String(body?.revealTargetId||'')?[normalizeLoginId(body.revealTargetId)]:targets;
    const revealActionId=String(body?.actionId||'');
    // Seer must receive "Không phải Sói" for an expelled target, even
    // when their harmful effect is correctly skipped by the action executor.
    const seerExcluded=revealActionId==='action_seer'&&revealIds.some(id=>isExpelled(id));
    const revelation=(effectiveTargets.length||seerExcluded)?resolveNightReveal({actionId:revealActionId,
      targetIds:revealIds.filter(id=>players["member:"+id]&&(isFactionCompare||revealActionId==='action_seer'||!isExpelled(id))),
      expelledIds:revealActionId==='action_seer'?revealIds.filter(isExpelled):[],
      assignments:await readNightAssignments(this.ctx.storage,matchId)}):null;
    const wolfOutcome=effectiveTargets.length&&['action_transfer_bite','action_wolf_bite','action_protect','action_witch_save'].includes(String(body?.actionId||''))?
      resolveWolfNight({assignments:await readNightAssignments(this.ctx.storage,meta.matchId),interactions:(await this.ctx.storage.get("interactions"))||[],players,
        matchId,night:Number(meta.cycleNight||0)}):null;
    const result={ok:true,undoToken,targets,results,turnId,label:record.label,serverProcessingMs:Date.now()-actionStartedAt,
      ...(revelation?{revelation}:{}),...(wolfOutcome?{wolfOutcome}: {})};
    await this.ctx.storage.put(receiptKey,{fingerprint,result});
    this.broadcast(meta.demo===true?{type:"battle_action_confirmed",matchId,serverTime:Date.now()}:
      {type:"battle_action_confirmed",matchId,turnId,targets,serverTime:Date.now()});
    return j(result);
  }
  async gmBattleUndo(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,matchId=String(meta.matchId||""),key="battleLastAction:"+matchId,
      record=await this.ctx.storage.get(key);
    if(!record||String(body?.undoToken||"")!==record.token)return j({ok:false,error:"UNDO_NOT_FOUND"},404);
    if(record.undone)return j({ok:true,idempotent:true,undone:true,turnId:record.turnId});
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="night"||
      String(meta.cycleKey||"")!==record.cycleKey||Number(meta.cycleNight||0)!==record.night||
      String(meta.currentNightTurnId||"")!==record.turnId)
      return j({ok:false,error:"UNDO_STALE_TURN",message:"Chỉ khôi phục hành động vừa xác nhận trong lượt hiện tại."},409);
    for(const row of record.after){
      const current=await this.ctx.storage.get(row.key),exists=current!==undefined&&current!==null;
      if(exists!==row.exists||JSON.stringify(current??null)!==JSON.stringify(row.value??null))
        return j({ok:false,error:"UNDO_STATE_CHANGED",message:"Dữ liệu đã có tương tác mới; không được ghi đè."},409);
    }
    for(const row of record.before){
      if(row.exists)await this.ctx.storage.put(row.key,row.value);
      else await this.ctx.storage.delete(row.key);
    }
    if(meta.demo)await this.ctx.storage.delete("demoPlan");
    record.undone=true;record.undoneAt=new Date().toISOString();await this.ctx.storage.put(key,record);
    const logId="ev-"+crypto.randomUUID();await this.ctx.storage.put("actionLog:"+String(Date.parse(record.undoneAt)).padStart(13,"0")+":"+logId,{id:logId,type:"battle_undo",loginId:String(record.targetIds||""),matchId,actionId:record.label,message:"GM hoàn tác: "+record.label,createdAt:record.undoneAt,source:"gm"});
    this.broadcast({type:"battle_action_undone",matchId,turnId:record.turnId,targets:record.targetIds,
      serverTime:Date.now()});
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values((await this.ctx.storage.get("players"))||{}).map(publicPlayer),serverTime:Date.now()});
    return j({ok:true,undone:true,turnId:record.turnId,targets:record.targetIds});
  }
  async gmInteraction(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const eventId=String(body?.clientEventId||"").slice(0,240);
    if(!eventId||!body?.turnId)return this.executeGmInteraction(request,body);
    const receiptKey="gmInteractionReceipt:"+String(auth.meta.matchId||"")+":"+eventId;
    const fingerprint=JSON.stringify([String(body.turnId),String(body.actionId||""),normalizeLoginId(body.actorId),String(body.artifactId||""),normalizeLoginId(body.loginId),String(body.type||""),String(body.effectId||""),String(body.actionNonce||""),Number(body.night||0),String(body.cycleKey||""),Array.isArray(body.targetIds)?body.targetIds.map(normalizeLoginId).sort():null]);
    const prior=await this.ctx.storage.get(receiptKey);
    if(prior)return prior.fingerprint===fingerprint?j({...prior.result,idempotent:true}):j({ok:false,error:"REQUEST_ID_CONFLICT"},409);
    const response=await this.executeGmInteraction(request,body);
    if(response.ok)await this.ctx.storage.put(receiptKey,{fingerprint,result:await response.clone().json()});
    return response;
  }
  async executeGmInteraction(request,body,verifiedAuth=null){
    // Reuse ONLY the same-request verified authorization from gmBattleAction.
    const auth=verifiedAuth||await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta;
    let gmArtifactStep=null;
    // The battle UI supplies an optional expected turn. Legacy GM manual overrides remain compatible.
    if(body?.turnId){
      if(String(meta.phase||"").toLowerCase()!=="running"||String(meta.cyclePhase||"").toLowerCase()!=="night")
        return j({ok:false,error:"STALE_TURN",message:"Đã kết thúc lượt Ban Đêm."},409);
      const live=await this.getNightRuntime(meta,Number(meta.cycleNight||1),false);
      const step=live&&!live.completed?live.queue?.[live.cursor]:null;
      if(!step||String(step.id)!==String(body.turnId))
        return j({ok:false,error:"STALE_TURN",message:"Lượt chức năng đã thay đổi. Vui lòng chọn lại."},409);
      const claimedActor=normalizeLoginId(body.actorId||"");
      // Only the battle-action endpoint maintains the per-role nightly ledger,
      // limits and atomic Undo; never allow legacy GM interaction to bypass it.
      if(!verifiedAuth&&!body?.artifactId&&
         (step.kind==="wolf-pack-bite"||
          step.kind==="role"&&["role_old_witch","role_snow_wolf","role_guard"].includes(step.roleId)||
          step.kind==="role-group"&&(step.roles||[]).some(r=>["role_old_witch","role_snow_wolf","role_guard"].includes(r.roleId))))
        return j({ok:false,error:"WITCH_USE_BATTLE_ACTION"},409);
      const actors=(step.loginIds||[step.loginId]).filter(Boolean).map(normalizeLoginId);
      const artifactActions=Array.isArray(step.actions)?step.actions:[];
      if(step.kind==="early-artifact-window"||(["role","role-group"].includes(step.kind)&&body.artifactId)){
        const artifactId=String(body.artifactId||"");
        const options=step.kind==="role"?(Array.isArray(step.artifacts)?step.artifacts:[]):step.kind==="role-group"?(step.roles||[]).flatMap(role=>role.artifacts||[]):artifactActions;
        const chosen=options.find(x=>String(x.artifactId)===artifactId&&claimedActor&&normalizeLoginId(x.loginId)===claimedActor);
        if(!chosen)return j({ok:false,error:"INVALID_ARTIFACT_FOR_TURN",message:"Artifact không thuộc lượt hoặc người thực hiện."},403);
        gmArtifactStep={...chosen,id:step.id+":"+chosen.artifactId+":"+chosen.loginId};
      }else{
        if(claimedActor&&actors.length&&!actors.includes(claimedActor))return j({ok:false,error:"INVALID_ACTOR_FOR_TURN"},403);
        if(step.kind==="early-artifact"||step.kind==="artifact-main")gmArtifactStep=step;
      }
    }
    const players=(await this.ctx.storage.get("players"))||{},loginId=normalizeLoginId(body?.loginId),rawType=String(body?.type||"").trim().toLowerCase().replace(/\s+/g,"_"),alias={like_dislike:"thumb_vote","like-dislike":"thumb_vote",likedislike:"thumb_vote",reaction:"thumb_vote",reactions:"thumb_vote",thumbs:"thumb_vote",thumb:"thumb_vote",vote:"thumb_vote","👍👎":"thumb_vote",mark:"assassin_mark",marked:"assassin_mark",mark_choice:"assassin_mark","assassin-mark":"assassin_mark"},type=alias[rawType]||rawType;
    if(type==="status_display_batch"){
      const items=Array.isArray(body?.items)?body.items:[];
      if(!items.length||items.length>STATUS_VISUAL_IDS.size||
        items.some(x=>!STATUS_VISUAL_IDS.has(String(x?.statusId||""))||typeof x?.visible!=="boolean")||
        new Set(items.map(x=>x.statusId)).size!==items.length)return j({ok:false,error:"INVALID_STATUS_BATCH"},400);
      const display={...(meta.statusDisplay&&typeof meta.statusDisplay==="object"?meta.statusDisplay:{})};
      for(const item of items)display[item.statusId]=item.visible;
      meta.statusDisplay=display;meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now()});
      return j({ok:true,statusDisplay:display})
    }
    if(type==="status_display"){
      const statusId=String(body?.statusId||"").trim();if(!STATUS_VISUAL_IDS.has(statusId))return j({ok:false,error:"INVALID_STATUS"},400);
      const display={...(meta.statusDisplay&&typeof meta.statusDisplay==="object"?meta.statusDisplay:{})};display[statusId]=body?.visible===true;meta.statusDisplay=display;meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
      this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now()});return j({ok:true,statusDisplay:display})
    }
    // Hơi Thở Lão Già: do not turn the marker into an immediate death.
    // Only this specific Artifact may schedule the shared grudge Action ID,
    // which is also used by unrelated cards.
    if(String(body?.artifactId||"")==="artifact_07"&&
       String(body?.actionId||"")==="action-grudge-designate"){
      if(!gmArtifactStep||!["effect_notice","dead"].includes(type))
        return j({ok:false,error:"GRUDGE_ARTIFACT_REQUIRES_VALID_TURN"},409);
      if(!loginId||!players["member:"+loginId])
        return j({ok:false,error:"INVALID_GRUDGE_TARGET"},400);
      const rows=(await this.ctx.storage.get("interactions"))||[],
        matchId=String(meta.matchId||""),night=Math.max(1,Number(meta.cycleNight)||1);
      const sameMatch=x=>!x.matchId||String(x.matchId)===matchId;
      if(rows.some(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===loginId&&
        (x.effectActive!==false&&x.type==="dead"||
          x.deferredArtifact==="artifact_07"&&x.pendingDeath===true)))
        return j({ok:false,error:"GRUDGE_TARGET_INELIGIBLE",
          message:"Mục tiêu đã chết hoặc đã bị đánh dấu; chưa trừ lượt."},409);
      const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);
      if(useError)return useError;
      const now=new Date().toISOString(),interaction={
        id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),
        clientEventId:String(body.clientEventId||""),type:"effect_notice",
        loginId,matchId,night:night+1,scheduledFromNight:night,
        cycleKey:String(meta.cycleKey||""),effectActive:false,pendingDeath:true,
        deferredArtifact:"artifact_07",effectName:"Hơi Thở Lão Già",
        actionId:"action-grudge-designate",artifactId:"artifact_07",
        actorId:normalizeLoginId(body.actorId),source:"artifact-night-engine",
        message:"Đã đánh dấu; tác động chết được xét sau đêm kế tiếp.",
        createdAt:now
      };
      rows.push(interaction);
      await this.ctx.storage.put("interactions",pruneInteractions(rows));
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+interaction.id,interaction);
      // The target is never informed of the pending death before resolution.
      return j({ok:true,interaction});
    }
    // Only a validated, currently-owned Artifact turn may create this power
    // block. The GM's generic notice would otherwise appear successful while
    // leaving the target able to act.
    if(String(body?.actionId||"")==="artifact_action_lock_function"){
      if(!gmArtifactStep||type!=="effect_notice")
        return j({ok:false,error:"DREAM_ARTIFACT_REQUIRES_VALID_TURN"},409);
      if(!loginId||!players["member:"+loginId])
        return j({ok:false,error:"INVALID_DREAM_TARGET"},400);
      const rows=(await this.ctx.storage.get("interactions"))||[],
        matchId=String(meta.matchId||""),night=Math.max(1,Number(meta.cycleNight)||1);
      const sameMatch=x=>!x.matchId||String(x.matchId)===matchId;
      if(rows.some(x=>sameMatch(x)&&normalizeLoginId(x.loginId)===loginId&&
        x.effectActive!==false&&(x.type==="dead"||
          (x.type==="status"&&x.statusId==="disabled_2n"))))
        return j({ok:false,error:"DREAM_TARGET_INELIGIBLE",message:"Mục tiêu đã chết hoặc đang bị khóa chức năng."},409);
      const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);
      if(useError)return useError;
      const now=new Date().toISOString(),interaction={
        id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),
        clientEventId:String(body.clientEventId||""),type:"status",
        statusId:"disabled_2n",loginId,matchId,night,cycleKey:String(meta.cycleKey||""),
        activationPhase:"night",effectActive:true,
        actionId:"artifact_action_lock_function",artifactId:String(body.artifactId||""),
        actorId:normalizeLoginId(body.actorId),source:"artifact-night-engine",
        message:"Bình Giấc Mơ khóa chức năng trong 2 ngày đêm.",createdAt:now
      };
      rows.push(interaction);
      await this.ctx.storage.put("interactions",pruneInteractions(rows));
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+interaction.id,interaction);
      this.broadcast({type:"player_status_changed",loginId,statusId:"disabled_2n",
        active:true,serverTime:Date.now()});
      return j({ok:true,interaction});
    }
    if(type==="status"){
      const statusId=String(body?.statusId||"").trim();if(!loginId||!STATUS_DEFS[statusId])return j({ok:false,error:"INVALID_STATUS",message:"Trạng thái không hợp lệ."},400);
      const p=players["member:"+loginId];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
      const rows=(await this.ctx.storage.get("interactions"))||[],now=new Date().toISOString(),night=Math.max(0,Number(meta.cycleNight||0)||0);
      for(const x of rows){if(normalizeLoginId(x?.loginId)===loginId&&x?.type==="status"&&x?.statusId===statusId&&x?.effectActive!==false){x.effectActive=false;x.expiredAt=now;x.expiredReason=body?.active===false?"GM_STATUS_CLEAR":"REPLACED"}}
      if(body?.active===false){await this.ctx.storage.put("interactions",pruneInteractions(rows));const auditId="ev-"+crypto.randomUUID(),audit={id:auditId,type:"status_clear",loginId,matchId:String(meta.matchId||""),createdAt:now,source:"gm",statusId,message:`GM gỡ trạng thái ${statusId}`};await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+auditId,audit);this.broadcast({type:"player_status_changed",loginId,statusId,active:false,at:now});return j({ok:true,loginId,statusId,active:false})}
      const def=STATUS_DEFS[statusId],interaction={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),type:"status",statusId,loginId,matchId:String(meta.matchId||""),night,cycleKey:String(meta.cycleKey||""),duration:def.duration,nights:Number(def.nights||0),effectActive:true,message:def.label,createdAt:now,source:"gm"};
      rows.push(interaction);await this.ctx.storage.put("actionLog:"+String(Date.parse(interaction.createdAt)).padStart(13,"0")+":"+interaction.id,interaction);await this.ctx.storage.put("interactions",pruneInteractions(rows));this.broadcast({type:"player_status_changed",loginId,statusId,active:true,at:now});return j({ok:true,interaction})
    }
    if(type==="revive"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      const p=Object.values(players).find(x=>normalizeLoginId(x?.loginId)===loginId);if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
      const rows=(await this.ctx.storage.get("interactions"))||[],revived=[],now=new Date().toISOString();
      // A living target is not revivable. Do not debit an artifact turn or
      // emit an empty success receipt when no active death exists.
      const deadTarget=rows.some(x=>normalizeLoginId(x?.loginId)===loginId&&
        String(x?.type||"")==="dead"&&x?.effectActive!==false&&
        (!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId)));
      if(!deadTarget)return j({ok:false,error:"TARGET_NOT_DEAD",message:"Chưa có người chết hợp lệ để hồi sinh."},409);
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||String(x?.type||"")!=="dead")continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_REVIVE";revived.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",pruneInteractions(rows));const auditId="ev-"+crypto.randomUUID(),audit={id:auditId,type:"revive",loginId,matchId:String(meta.matchId||""),createdAt:now,source:"gm",message:'GM hồi sinh người chơi'};await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+auditId,audit);const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);
      this.broadcast({type:"player_revived",loginId,revived,at:now,room,players:publicPlayers,serverTime:Date.now()});
      this.broadcast({type:"room_state",room,players:publicPlayers,serverTime:Date.now()});
      return j({ok:true,loginId,revived,room})
    }
    if(type==="clear_state"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
      const rows=(await this.ctx.storage.get("interactions"))||[],cleared=[],now=new Date().toISOString();
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||!["frozen","expelled","dead","assassin_mark","status"].includes(String(x?.type||"")))continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_CLEAR";cleared.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",pruneInteractions(rows));const auditId="ev-"+crypto.randomUUID(),audit={id:auditId,type:"clear_state",loginId,matchId:String(meta.matchId||""),createdAt:now,source:"gm",message:'GM gỡ các trạng thái hiện tại'};await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+auditId,audit);this.broadcast({type:"player_state_cleared",loginId,cleared,at:now});return j({ok:true,loginId,cleared})
    }
    const allowed=new Set(["frozen","expelled","dead","thumb_vote","assassin_mark","effect_notice"]);if(!loginId||!allowed.has(type))return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
    const p=players["member:"+loginId];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
    // Automatic night deaths respect the delivered card. Explicit GM overrides
    // (without a turn) and the Destroyer's self-inflicted backlash remain possible.
    if(type==="dead"&&body?.turnId&&String(meta.cyclePhase)==="night"&&
       !(String(body.actionId)==="action_destroyer_kill"&&normalizeLoginId(body.actorId)===loginId)&&
       isNightImmune(await readNightAssignments(this.ctx.storage,meta.matchId),loginId)){
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
      return j({ok:true,loginId,noEffect:true,reason:"NIGHT_IMMUNE"});
    }
    const defaults={frozen:"Bạn đang bị Đóng Băng.",expelled:"Bạn đã bị Đuổi Khỏi Làng.",dead:"Bạn đã Chết.",thumb_vote:"Hãy chọn dấu phù hợp.",assassin_mark:"Bạn đã bị Đánh Dấu. Hãy chọn 👍 hoặc 👎 để xác định kết quả.",effect_notice:"Bạn đã nhận một Hiệu Ứng."},rawOptions=Array.isArray(body?.options)?body.options.map(x=>String(x||"").slice(0,40)).filter(Boolean).slice(0,4):[],cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??body?.nightIndex??body?.roundIndex??meta.cycleKey??"").slice(0,160),expiresAt=body?.expiresAt?String(body.expiresAt).slice(0,64):null,effectActive=["frozen","expelled","dead","assassin_mark"].includes(type),clientEventId=String(body?.clientEventId||"").slice(0,240),rows=(await this.ctx.storage.get("interactions"))||[];
    if(clientEventId){const existing=rows.find(x=>String(x?.clientEventId||"")===clientEventId&&normalizeLoginId(x?.loginId)===loginId);if(existing)return j({ok:true,interaction:existing,idempotent:true})}
    const now=new Date().toISOString(),choiceType=type==="thumb_vote"||type==="assassin_mark",silentVisualNotice=type==="effect_notice"&&body?.requireAck!==true&&body?.requireResponse!==true,interaction={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),clientEventId,eventId:String(body?.eventId||"").slice(0,240),engineEventType:String(body?.engineEventType||"").slice(0,120),matchId:String(body?.matchId||meta.matchId||""),loginId,type,message:String(body?.message||defaults[type]||"").slice(0,500),effectInstanceId:String(body?.effectInstanceId||"").slice(0,160),effectId:String(body?.effectId||"").slice(0,160),effectName:String(body?.effectName||"").slice(0,180),actionId:String(body?.actionId||"").slice(0,160),direction:String(body?.direction||"").slice(0,10),actorId:String(body?.actorId||"").slice(0,160),playerId:String(body?.playerId||"").slice(0,160),night:Number(body?.night||0),cycleKey,expiresAt,effectActive,emoji:String(body?.emoji||"").slice(0,20),title:String(body?.title||"").slice(0,180),requireAck:!!body?.requireAck,requireResponse:!!body?.requireResponse,responseHandler:String(body?.responseHandler||"").slice(0,120),
      ...(type==="assassin_mark"?{gmChoice:String(body?.assassinChoice||"")}: {}),options:choiceType?(rawOptions.length?rawOptions:["👍","👎"]):["ĐÃ HIỂU"],status:silentVisualNotice?"responded":"pending",source:String(body?.source||"gm").slice(0,80),createdAt:now,response:silentVisualNotice?"AUTO_ACK":null,respondedAt:silentVisualNotice?now:null};
    if(type==="dead"&&body?.turnId&&String(meta.cyclePhase)==="night"){
      interaction.type="effect_notice";interaction.pendingDeath=true;interaction.effectActive=false;
      interaction.night=Number(meta.cycleNight);interaction.message="Tác động gây chết sẽ được giải quyết vào sáng hôm sau.";
    }
    if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId,body?.actionNonce,body);if(useError)return useError}
    rows.push(interaction);await this.ctx.storage.put("actionLog:"+String(Date.parse(interaction.createdAt)).padStart(13,"0")+":"+interaction.id,interaction);
    if(type==="dead"&&!interaction.pendingDeath&&typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,now);
    await this.ctx.storage.put("interactions",pruneInteractions(rows));
    // Sát Thủ is secret at night: never broadcast the GM choice or open the player prompt early.
    // The player receives a sanitized private interaction from playerState only in the morning.
    if(type!=="assassin_mark"&&!interaction.pendingDeath&&!silentVisualNotice){
      // WebSocket participantId is not a verified member session. In DEMO,
      // private actions MUST be obtained through the authenticated /me endpoint.
      if(meta.demo!==true)this.broadcast({type:"player_interaction",interaction});
    }
    return j({ok:true,interaction});
  }
  async playerInteractionRespond(body){
    const loginId=normalizeLoginId(body?.loginId),id=String(body?.interactionId||""),
      response=String(body?.response||"").slice(0,40),
      rows=(await this.ctx.storage.get("interactions"))||[],meta=await this.ctx.storage.get("meta");
    const row=rows.find(x=>String(x?.id)===id&&normalizeLoginId(x?.loginId)===loginId);
    if(!row)return j({ok:false,error:"INTERACTION_NOT_FOUND"},404);
    if(row.status==="responded"){const {gmChoice,...safe}=row;return j({ok:true,interaction:safe,idempotent:true});}
    if(row.matchId&&meta?.matchId&&String(row.matchId)!==String(meta.matchId))
      return j({ok:false,error:"STALE_INTERACTION",message:"Tương tác này thuộc ván cũ."},409);
    const isAssassin=row.type==="assassin_mark";
    if(isAssassin){
      // Choice must never be available at night; the server owns this gate.
      if(String(meta?.phase)!=="running"||String(meta?.cyclePhase)!=="morning"||
         Number(meta?.cycleNight)!==Number(row.night))
        return j({ok:false,error:"ASSASSIN_RESPONSE_NOT_YET_OPEN"},409);
      if(!["👍","👎"].includes(String(row.gmChoice||"")))
        return j({ok:false,error:"ASSASSIN_CHOICE_NOT_RECORDED"},409);
      if(rows.some(x=>normalizeLoginId(x?.loginId)===loginId&&
         ["dead","expelled"].includes(String(x.type))&&x.effectActive!==false&&
         (!x.matchId||String(x.matchId)===String(meta.matchId))))
        return j({ok:false,error:"ASSASSIN_TARGET_NO_LONGER_ELIGIBLE"},409);
    }
    const allowed=Array.isArray(row.options)&&row.options.length?new Set(row.options.map(String)):
      (row.type==="thumb_vote"||isAssassin?new Set(["👍","👎"]):new Set(["ĐÃ HIỂU","OK","✓"]));
    if(!allowed.has(response))return j({ok:false,error:"INVALID_RESPONSE"},400);
    const now=new Date().toISOString(),assassinOutcome=isAssassin?
      (row.gmChoice===response?"survived":"dead"):null;
    row.response=response;row.status="responded";row.respondedAt=now;
    if(isAssassin)row.effectActive=false;row.responseVersion=1;
    if(assassinOutcome==="dead"){
      const fatal={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),
        type:"dead",loginId,matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0),
        cycleKey:String(meta.cycleKey||""),actionId:"action_assassin_mark",
        actorId:String(row.actorId||""),source:"assassin",effectActive:true,
        message:"Sát Thủ: người chơi chọn dấu khác GM.",createdAt:now};
      rows.push(fatal);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+fatal.id,fatal);
    }
    if(assassinOutcome==="dead"&&typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,now);
    await this.ctx.storage.put("interactions",pruneInteractions(rows));
    const logId="ev-"+crypto.randomUUID();
    await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+logId,
      {id:logId,type:"player_response",loginId,matchId:String(meta?.matchId||""),
       message:"Người chơi phản hồi: "+response+(assassinOutcome?" · Kết quả: "+assassinOutcome:""),
       createdAt:now,source:"player"});
    // Never send personal response details on a socket with a spoofable
    // participantId. Player Web retrieves them from the authenticated /me API.
    if(meta.demo!==true)this.broadcast({type:"player_interaction_response",interaction:{...row,gmChoice:undefined},
      assassinOutcome,serverTime:Date.now()});
    if(assassinOutcome==="dead")this.broadcast({type:"player_status_changed",loginId,
      statusId:"dead",active:true,serverTime:Date.now()});
    return j({ok:true,interaction:{...row,gmChoice:undefined},assassinOutcome});
  }
  async gmRename(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,name=normalizeRoomName(body?.roomName);if(!name)return j({ok:false,error:"INVALID_ROOM_NAME",message:"Tên Phòng không hợp lệ."},400);meta.roomName=name;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta)})}
  async gmReset(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,roomWasEnabled=meta.enabled!==false,now=new Date().toISOString(),transactionId=String(body?.transactionId||"").trim().slice(0,160),currentVersion=Number(meta.resetVersion||0),hasExpected=body?.expectedResetVersion!==undefined&&body?.expectedResetVersion!==null,expected=Number(body?.expectedResetVersion||0);
    const softPostGame=body?.postGame===true&&body?.preserveParticipants===true;
    if(softPostGame&&hasExpected&&Number(expected)!==currentVersion&&meta.lastResetTransactionId!==transactionId)return j({ok:false,error:"RESET_VERSION_CONFLICT"},409);
    if(softPostGame&&transactionId&&meta.lastResetTransactionId===transactionId){const players=await this.ctx.storage.get("players")||{};return j({ok:true,reset:true,hardReset:false,idempotent:true,preserveParticipants:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer)})}
    if(softPostGame){
      const players=(await this.ctx.storage.get("players"))||{},nextVersion=currentVersion+1;
      for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.lastSeenAt=now}
      await this.ctx.storage.put("players",players);await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);
      // A new match must not inherit a previous DEMO owner's lease, clock or plan.
      for(const key of ["demoLease","demoClock","demoPlan"])await this.ctx.storage.delete(key);
      for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","drunkDeck:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
      meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.enabled=roomWasEnabled;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastEndedMatchId=null;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.currentNightTurnId=null;meta.dayDeadlineAt=null;meta.lastResetTransactionId=transactionId||("postgame-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
      await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}
      const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer),ack={ok:true,reset:true,hardReset:false,preserveParticipants:true,transactionId:meta.lastResetTransactionId,resetVersion:nextVersion,phase:room.phase,locked:room.locked,playersCount:publicPlayers.length,assignmentsCount:0,room,players:publicPlayers,removedPlayers:[]};
      this.broadcast({type:"room_reset",room,players:publicPlayers,resetVersion:nextVersion,transactionId:ack.transactionId,preserveParticipants:true});
      this.broadcast({type:"room_state",room,players:publicPlayers});
      return j(ack)
    }
    if(transactionId&&meta.lastResetTransactionId===transactionId){
      const players=(await this.ctx.storage.get("players"))||{},assignments=(await this.ctx.storage.get("assignments"))||[],room=publicRoom(meta);
      return j({ok:true,reset:true,hardReset:true,idempotent:true,transactionId,resetVersion:Number(meta.resetVersion||0),phase:room.phase,locked:room.locked,playersCount:Object.keys(players).length,assignmentsCount:assignments.length,room,players:Object.values(players).map(publicPlayer),removedPlayers:[]})
    }
    if(hasExpected&&Number.isFinite(expected)&&expected!==currentVersion){
      return j({ok:false,error:"RESET_VERSION_CONFLICT",message:"Phòng đã thay đổi trước khi RESET. Hãy cập nhật Phòng rồi thử lại.",expectedResetVersion:expected,currentResetVersion:currentVersion,room:publicRoom(meta)},409)
    }
    const oldPlayers=(await this.ctx.storage.get("players"))||{},removedPlayers=Object.values(oldPlayers).map(publicPlayer),nextVersion=currentVersion+1;
    await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);await this.ctx.storage.put("seatSwaps",[]);
    await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");
    // Releasing the room also stops any autonomous DEMO from the previous match.
    for(const key of ["demoLease","demoClock","demoPlan"])await this.ctx.storage.delete(key);
    for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","drunkDeck:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
    meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.seatsLocked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.cycleStartedAt=null;meta.currentNightTurnId=null;meta.autoPausedRemainingMs=null;meta.enabled=roomWasEnabled;meta.gameName="";meta.playerCount=0;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastResetTransactionId=transactionId||("reset-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
    await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}
    const room=publicRoom(meta),ack={ok:true,reset:true,hardReset:true,forcedEnd:body?.forceEnd===true,transactionId:meta.lastResetTransactionId,resetVersion:nextVersion,phase:room.phase,locked:room.locked,playersCount:0,assignmentsCount:0,room,players:[],removedPlayers};
    this.broadcast({type:"room_hard_reset",room,players:[],forcedEnd:ack.forcedEnd,resetVersion:nextVersion,transactionId:ack.transactionId});
    for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_HARD_RESET")}catch{}
    return j(ack)
  }
  async gmEnd(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,incomingMatchId=String(body?.matchId||""),now=new Date().toISOString();if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)return j({ok:false,error:"MATCH_MISMATCH",message:"Không thể kết thúc vì đây không phải ván đang chạy trong Phòng."},409);const completionKey="matchCompletion:"+String(incomingMatchId||meta.matchId||""),completed=await this.ctx.storage.get(completionKey);
    if(completed){for(const key of (await this.ctx.storage.list({prefix:"drunkDeck:"+String(incomingMatchId||meta.matchId||"")+":"})).keys())await this.ctx.storage.delete(key);const requested=normalizeWinnerFaction(body?.winnerFaction||body?.winner||body?.result?.winnerFaction||"");if(requested&&requested!==completed.winnerFaction)return j({ok:false,error:"WINNER_ALREADY_CONFIRMED"},409);return j({...completed,idempotent:true})}
    if(incomingMatchId)meta.matchId=incomingMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);const winnerFaction=normalizeWinnerFaction(body?.winnerFaction||body?.winner||body?.result?.winnerFaction||body?.result?.winner||""),winnerLabel=String(body?.winner||body?.winnerLabel||body?.result?.winner||winnerFaction||"").slice(0,180),endedMatchId=String(meta.matchId||"");meta.endedAt=now;meta.lastEndedMatchId=endedMatchId||null;meta.winnerFaction=winnerFaction||null;meta.winnerLabel=winnerLabel||null;meta.resultVersion=Number(meta.resultVersion||0)+1;meta.reopenAt=now;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){};for(const key of (await this.ctx.storage.list({prefix:"drunkDeck:"+endedMatchId+":"})).keys())await this.ctx.storage.delete(key);const players=(await this.ctx.storage.get("players"))||{};for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.reservedByGM=true}await this.ctx.storage.put("players",players);const rows=(await this.ctx.storage.get("interactions"))||[];for(const x of rows){if(x?.effectActive!==false&&(!x?.matchId||!endedMatchId||String(x.matchId)===endedMatchId))x.effectActive=false}await this.ctx.storage.put("interactions",pruneInteractions(rows));const room=publicRoom(meta),memberResults=[];for(const p of Object.values(players)){if(!p?.loginId)continue;const lid=normalizeLoginId(p.loginId),stored=await this.ctx.storage.get("roles:"+lid),legacy=await this.ctx.storage.get("role:"+lid),rrs=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]),factions=rrs.map(rr=>rr?.roleCard?.faction??rr?.faction??""),result=winnerFaction&&factions.some(f=>normalizeWinnerFaction(f)===winnerFaction)?"win":"loss";memberResults.push({loginId:p.loginId,roleName:rrs.map(rr=>rr?.roleName||rr?.roleCard?.name||"").filter(Boolean).join(" + "),faction:factions.filter(Boolean).join(" + "),result})}this.broadcast({type:"game_result",matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,room});this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),waitingRoom:true});const ack={ok:true,room,matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,memberResults,waitingRoom:true,ready:true};if(endedMatchId)await this.ctx.storage.put(completionKey,ack);return j(ack)}
  async alarm(){return this.ctx.blockConcurrencyWhile(()=>this.roomAlarm())}
  async roomAlarm(){
    try{
      let meta=await this.ctx.storage.get("meta");
      if(!meta){
        const limiter=await this.ctx.storage.get("security-rate");
        if(limiter){
          const expiresAt=Number(limiter.startedAt||0)+Number(limiter.windowMs||60000);
          if(Date.now()>=expiresAt)await this.ctx.storage.delete("security-rate");
          else await this.ctx.storage.setAlarm(expiresAt+1000);
        }
        return;
      }
      if(String(meta.phase||"").toLowerCase()==="deleted")return;
      if(meta.reopenAt){meta.reopenAt=null;await this.ctx.storage.put("meta",meta)}
      if(serverDemoActive(meta,await this.ctx.storage.get("demoLease"))){
        const events=[];this.demoBroadcastBuffer=events;
        try{await this.ctx.storage.transaction(async()=>{events.length=0;await runServerDemo(this,await this.ctx.storage.get("meta"))})}
        finally{this.demoBroadcastBuffer=null}
        for(const event of events)this.broadcast(event);
        return;
      }
      if(await this.runAutoAdvanceIfDue(meta))return;
      meta=await this.ctx.storage.get("meta");const due=this.roomExpiryDue(meta);
      if(Date.now()<due){await this.scheduleRoomAlarm(meta);return}
      const now=new Date().toISOString();meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=now;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_EXPIRED")}catch{}
    }catch(e){
      console.error("GMWW_ROOM_ALARM",e);
      const meta=await this.ctx.storage.get("meta"),lease=await this.ctx.storage.get("demoLease");
      if(serverDemoActive(meta,lease)){
        lease.failures=Number(lease.failures||0)+1;lease.error="Server đang thử lại: "+String(e?.message||e);
        if(lease.failures>=3)await stopServerDemo(this,meta,lease,"error","Demo tạm dừng sau lỗi server: "+String(e?.message||e));
        else await this.ctx.storage.put("demoLease",lease);
        await this.ctx.storage.setAlarm(Date.now()+(lease.failures>=3?ROOM_IDLE_TTL:1000));
      }else try{await this.ctx.storage.setAlarm(Date.now()+60*1000)}catch(_){}
    }
  }
  async gmDelete(request){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{};meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=new Date().toISOString();meta.updatedAt=meta.deletedAt;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}this.broadcast({type:"room_deleted",room:publicRoom(meta)});for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_DELETED")}catch{}return j({ok:true,deleted:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer)})}

  async playerState(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta?.phase||"lobby").toLowerCase(),key="member:"+loginId,member=body?.member&&typeof body.member==="object"?body.member:null;let players=(await this.ctx.storage.get("players"))||{},p=players[key];
    const evicted=(await this.ctx.storage.get("evictedMembers"))||[];
    const canRestore=!!member&&!evicted.includes(loginId)&&normalizeLoginId(member.loginId)===loginId&&normalizeRoomCode(member.currentRoomCode||"")===normalizeRoomCode(meta.code||"")&&!["deleted","closed","archived"].includes(phase);
    if(!p&&canRestore){const now=new Date().toISOString();p={participantId:key,kind:"member",loginId,displayName:normalizeDisplayName(member.displayName||loginId),avatarId:String(member.avatarId||""),gameCharacterId:normalizeGameCharacterId(member.gameCharacterId)||null,seatId:null,ready:false,joinedAt:now,lastSeenAt:now,lastHeartbeatAt:Date.now(),restoredAt:now};players[key]=p;await this.ctx.storage.put("players",players);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),resumed:loginId})}
    if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn chưa ở trong phòng này."},403);
    p.lastSeenAt=new Date().toISOString();p.lastHeartbeatAt=Date.now();if(member){p.displayName=normalizeDisplayName(member.displayName||p.displayName||loginId);p.avatarId=String(member.avatarId||p.avatarId||"");p.gameCharacterId=normalizeGameCharacterId(member.gameCharacterId)||normalizeGameCharacterId(p.gameCharacterId)||null}players[key]=p;await this.ctx.storage.put("players",players);
    const legacyRole=await this.ctx.storage.get("role:"+loginId),storedRoles=await this.ctx.storage.get("roles:"+loginId),legacyRows=Array.isArray(storedRoles)&&storedRoles.length?storedRoles:(legacyRole?[legacyRole]:[]),activeSnapshot=currentPrivateDeliverySnapshot(await this.ctx.storage.get("deliverySnapshot:"+loginId),meta),roleRows=privateDeliveryRoles(activeSnapshot,legacyRows),roles=roleRows.map(privateRole),role=roles[0]||null,cardBackImage=(await this.ctx.storage.get("cardBackImage"))||null,rows=(await this.ctx.storage.get("interactions"))||[],sameMatch=x=>(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId)),interactions=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&x?.status==="pending"&&sameMatch(x)&&
      (x.type!=="assassin_mark"||(String(meta?.cyclePhase||"")==="morning"&&Number(x.night)===Number(meta.cycleNight)&&
       !rows.some(y=>normalizeLoginId(y?.loginId)===loginId&&["expelled","dead"].includes(String(y.type))&&y.effectActive!==false&&sameMatch(y)))))
      .slice(-10).map(({gmChoice,...safe})=>safe),effectTypes=new Set(["frozen","expelled","dead","assassin_mark"]),effectRows=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&sameMatch(x)&&
      (x.type!=="assassin_mark"||String(meta?.cyclePhase||"")==="morning")&&
      (!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())),latest={};for(const x of effectRows)latest[x.type]=x;const effects=Object.values(latest).map(({gmChoice,...safe})=>safe);
    const storedArtifact=await this.ctx.storage.get("artifact:"+loginId),
      // A role assignment also contains the committed artifact. Use it if the
      // legacy standalone Artifact key is absent; do not hide an assigned card.
      attachedArtifact=roleRows.find(r=>r?.artifact&&(!meta.matchId||String(r.matchId||"")===String(meta.matchId)))?.artifact||null,
      currentArtifact=activeSnapshot?privateDeliveryArtifact(activeSnapshot,storedArtifact):(storedArtifact?.removedFromMatch===true?null:storedArtifact&&(!meta.matchId||String(storedArtifact.matchId||"")===String(meta.matchId))?storedArtifact:attachedArtifact),
      artifact=currentArtifact?privateArtifact(currentArtifact):null,artifactCycleKey=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKey))||{accepted:[]};
    const deliveryManifest=buildPrivateDeliveryManifest({roomCode:meta.code,loginId,matchId:meta.matchId,matchRevision:meta.matchRevision,deliveryVersion:meta.deliveryVersion,publishedAt:meta.roleDeliveredAt,assignments:(await this.ctx.storage.get("assignments"))||[],roles:roleRows,artifact:currentArtifact});
    const deliveryAck=(await this.ctx.storage.get("deliveryAck:"+loginId))||null;
    deliveryManifest.receivedAt=deliveryAck?.deliveryId===deliveryManifest.deliveryId?deliveryAck.receivedAt:null;
    const swapRequests=((await this.ctx.storage.get('seatSwaps'))||[]).filter(x=>x.toId===key&&x.status==='pending'&&x.expiresAt>Date.now()).map(x=>({id:x.id,fromName:x.fromName,fromSeat:x.fromSeat,toSeat:x.toSeat,expiresAt:x.expiresAt}));
    // WOLF-01: this authenticated /me response is the ONLY delivery path for
    // pack role labels. Never copy names or faction into public room or websocket.
    const wolfRuntime=String(meta.cyclePhase)==="night"&&Number(meta.cycleNight)>0?
      await this.getNightRuntime(meta,Number(meta.cycleNight),false):null;
    const privateAssignments=(await this.ctx.storage.get("assignments"))||[];
    const wolfRecognition=privateWolfRecognition(meta,wolfRuntime,loginId,
      wolfPackMembers(privateAssignments,rows,meta.matchId))||
      privateRoleGroupRecognition(meta,wolfRuntime,loginId,privateAssignments,rows);
    const turn=wolfRuntime?.queue?.[wolfRuntime.cursor];
    // Mirror the GM's current schedule without sending actor IDs, targets,
    // permissions, or private role assignments to other players.
    const publicTimeline=String(meta.phase)==="running"?
      String(meta.cyclePhase)==="night"&&wolfRuntime?
        {phase:"night",activeIndex:Math.max(0,Number(wolfRuntime.cursor)||0),
          steps:(wolfRuntime.queue||[]).slice(0,150).map((step,index)=>({
            label:String(step?.label||"Lượt Vai Trò").slice(0,110),
            status:index<Number(wolfRuntime.cursor)?"done":index===Number(wolfRuntime.cursor)?"active":"upcoming"
          }))}:
        {phase:String(meta.cyclePhase||"morning"),activeIndex:0,
          steps:[{label:"Làng ơi dậy đi",status:"active"},{label:"Thông cáo Làng",status:"upcoming"},{label:"Lên Giàn",status:"upcoming"}]}
      :null;
    // Public role call only. Never reveal the actor, role owner or hidden target.
    const audioCue=String(meta.phase)==="running"?
      String(meta.cyclePhase)==="night"&&turn?
        {key:String(meta.matchId)+":"+String(meta.cycleKey)+":"+String(turn.id),
          label:String(turn.label||"Đến lượt Vai Trò").slice(0,120)}:
      String(meta.cyclePhase)==="morning"?
        {key:String(meta.matchId)+":"+String(meta.cycleKey)+":wakeup",label:"Làng ơi dậy đi"}:null
      :null;
    const drawn=Number(meta.cycleNight)===3&&String(meta.cyclePhase)==='night'?
      await this.ctx.storage.get('drunkDeck:'+String(meta.matchId)+':3:'+loginId):null;
    const drunkDraw=drawn&&(drawn.selectedId||
      turn?.roleId==='role_drunk'&&(turn.loginIds||[]).map(normalizeLoginId).includes(loginId))?
      drunkDeckView(drawn,false):null;
    const demoActions=meta.demo===true?await demoPlayerActions(this,meta,loginId):[];
    const onlineActions=meta.demo!==true&&String(meta.roomMode||"").toLowerCase()==="online"?await playerOfferedActions(this,meta,loginId):[];
    return j({ok:true,swapRequests,room:publicRoom(meta),player:publicPlayer(p),role,roles,wolfRecognition,audioCue,publicTimeline,drunkDraw,demoActions,onlineActions,artifact,artifactExpected:deliveryManifest.artifactExpected,deliveryManifest,gallows:String(meta.cyclePhase)==="morning"?gallowsSnapshot((await this.gallowsState(meta)).ballot,meta):null,artifactCycle:{cycleKey:artifactCycleKey,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:Math.max(0,Math.min(30,Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)))},multiAssign:!!meta.multiAssign,cardBackImage,interactions,effects,resumed:!!p.restoredAt})
  }
  async playerDrunkDraw(body){
    // One trusted choice per match; Client cannot specify another account's actor.
    return this.ctx.blockConcurrencyWhile(async()=>{
      const meta=await this.ctx.storage.get('meta'),actorId=normalizeLoginId(body?.loginId);
      const matchId=String(meta?.matchId||''),night=Number(meta?.cycleNight||0);
      if(!actorId||String(meta?.phase)!=='running'||String(meta?.cyclePhase)!=='night'||night!==3)
        return j({ok:false,error:'DRUNK_DRAW_NOT_ACTIVE'},409);
      const players=await this.ctx.storage.get('players')||{};
      if(!players['member:'+actorId])return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
      const runtime=await this.getNightRuntime(meta,3,false),turn=runtime?.queue?.[runtime.cursor];
      const key='drunkDeck:'+matchId+':3:'+actorId,deck=await this.ctx.storage.get(key);
      if(deck?.selectedId)return j({ok:false,error:'DRUNK_ALREADY_CHOSEN',draw:drunkDeckView(deck)},409);
      if(turn?.roleId!=='role_drunk'||!(turn.loginIds||[]).map(normalizeLoginId).includes(actorId))
        return j({ok:false,error:'DRUNK_WRONG_TURN'},409);
      const effects=await this.ctx.storage.get('interactions')||[];
      if(isBattleActorBlocked(effects,{actorId,matchId,statusDefs:STATUS_DEFS})||
        effects.some(x=>String(x?.matchId||'')===matchId&&normalizeLoginId(x?.loginId)===actorId&&
          x?.type==='expelled'&&x.effectActive!==false&&(!x.expiresAt||Date.parse(x.expiresAt)>Date.now())))
        return j({ok:false,error:'DRUNK_ACTOR_BLOCKED'},409);
      const chosen=deck?.cards?.find(x=>x.id===String(body?.cardId||''));
      if(!chosen||!deck.cards.length||String(deck.matchId)!==matchId)
        return j({ok:false,error:'DRUNK_CARD_INVALID'},400);
      const assignments=await this.ctx.storage.get('assignments')||[];
      if(!assignments.some(x=>normalizeLoginId(x.loginId)===actorId&&x.roleId==='role_drunk'))
        return j({ok:false,error:'DRUNK_ROLE_NO_LONGER_OWNED'},409);
      const outcome=await this.applyNightRoleInheritance(meta,3,assignments,{
        drunkChoice:{actorId,sourceId:chosen.sourceId}});
      if(outcome.applied!==1)return j({ok:false,error:'DRUNK_ROLE_TRANSFER_FAILED'},409);
      const own=await this.ctx.storage.get('roles:'+actorId)||[];
      const picked=own.find(x=>x.inheritedFromRoleId==='role_drunk');
      const summary=outcome.assignments.find(x=>normalizeLoginId(x.loginId)===actorId);
      if(!picked||!summary)return j({ok:false,error:'DRUNK_ROLE_TRANSFER_INCOMPLETE'},409);
      const pack=runtime.queue.find(x=>x.kind==='wolf-pack-bite');
      const wolf=isWolfRole(summary);
      if(wolf&&pack){
        if(!pack.loginIds.includes(actorId))pack.loginIds.push(actorId);
        if(!pack.playerIds.includes('member:'+actorId))pack.playerIds.push('member:'+actorId);
        if(!pack.roles.some(x=>(x.loginIds||[]).includes(actorId)))
          pack.roles.push({roleId:summary.roleId,loginIds:[actorId]});
        if(summary.roleId!=='role_snow_wolf'&&!pack.biteActorIds.includes(actorId))
          pack.biteActorIds.push(actorId);
      }
      const functions=Array.isArray(picked.roleCard?.functions)?picked.roleCard.functions:[];
      const hasPower=functions.some(fn=>fn&&!fn.passive&&
        fn.actionId!=='action_wolf_bite'&&['night','any',''].includes(String(fn.phase||''))&&
        Number(fn.fromNight||1)<=3&&(fn.toNight==null||Number(fn.toNight)>=3));
      if((!wolf||hasPower)&&summary.roleId!=='role_villager'){
        const newTurn={id:'role:drunk-inherited:'+actorId,kind:'role',
          roleId:summary.roleId,label:summary.roleName||'Vai Trò',
          loginIds:[actorId],playerIds:['member:'+actorId],
          order:99,durationSec:Number(turn.durationSec||45),status:'pending'};
        const at=wolf&&pack?runtime.queue.indexOf(pack)+1:runtime.cursor+1;
        runtime.queue.splice(at,0,newTurn);
      }
      deck.selectedId=chosen.id;deck.selectedRoleName=summary.roleName||chosen.roleName;
      deck.selectedAt=new Date().toISOString();
      await this.ctx.storage.put(key,deck);
      await this.ctx.storage.put(this.nightRuntimeKey(meta,3),runtime);
      this.broadcast({type:'role_progress',matchId,serverTime:Date.now()});
      return j({ok:true,selectedId:deck.selectedId,roleName:deck.selectedRoleName,
        draw:drunkDeckView(deck),deliveryVersion:meta.deliveryVersion});
    });
  }
  async playerDeliveryReceived(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");
    if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const players=(await this.ctx.storage.get("players"))||{},player=players["member:"+loginId];
    if(!loginId||!player||player.kind!=="member")return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},403);
    if(!["role_delivery","running"].includes(String(meta.phase||"").toLowerCase()))return j({ok:false,error:"ROLE_DELIVERY_NOT_STARTED"},409);
    const stored=(await this.ctx.storage.get("roles:"+loginId))||[],legacy=await this.ctx.storage.get("role:"+loginId),legacyRows=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]);
    const snapshot=currentPrivateDeliverySnapshot(await this.ctx.storage.get("deliverySnapshot:"+loginId),meta),roles=privateDeliveryRoles(snapshot,legacyRows);
    const savedArtifact=await this.ctx.storage.get("artifact:"+loginId),artifact=snapshot?privateDeliveryArtifact(snapshot,savedArtifact):(savedArtifact?.removedFromMatch===true?null:savedArtifact||roles.find(row=>row?.artifact)?.artifact||null);
    const assignments=(await this.ctx.storage.get("assignments"))||[];
    const manifest=buildPrivateDeliveryManifest({roomCode:meta.code,loginId,matchId:meta.matchId,matchRevision:meta.matchRevision,deliveryVersion:meta.deliveryVersion,publishedAt:meta.roleDeliveredAt,assignments,roles,artifact});
    if(!validPrivateDeliveryAcknowledgment(manifest,body))return j({ok:false,error:"DELIVERY_RECEIPT_MISMATCH"},409);
    const key="deliveryAck:"+loginId,previous=(await this.ctx.storage.get(key))||null;
    if(previous?.deliveryId===manifest.deliveryId)return j({ok:true,deliveryId:manifest.deliveryId,receivedAt:previous.receivedAt,reused:true});
    const receivedAt=new Date().toISOString();await this.ctx.storage.put(key,{deliveryId:manifest.deliveryId,receivedAt,matchId:manifest.matchId});
    for(const row of assignments)if(normalizeLoginId(row?.loginId)===loginId&&(!meta.matchId||String(row?.matchId||"")===String(meta.matchId)))row.receivedAt=receivedAt;
    await this.ctx.storage.put("assignments",assignments);
    this.broadcast({type:"delivery_progress",loginId,deliveryId:manifest.deliveryId,receivedAt});
    return j({ok:true,deliveryId:manifest.deliveryId,receivedAt});
  }
  async playerRoleViewed(body){
    const loginId=normalizeLoginId(body?.loginId),wantedIndex=Number.isInteger(Number(body?.roleIndex))?Math.max(0,Number(body.roleIndex)):null,wantedRoleId=String(body?.roleId||""),stored=await this.ctx.storage.get("roles:"+loginId),legacy=await this.ctx.storage.get("role:"+loginId),roles=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]);
    if(!roles.length)return j({ok:false,error:"ROLE_NOT_FOUND"},404);
    let index=wantedIndex!==null&&wantedIndex<roles.length?wantedIndex:(wantedRoleId?roles.findIndex(x=>String(x?.roleId||"")===wantedRoleId):0);if(index<0)index=0;
    const role=roles[index];if(!role.viewedAt){role.viewedAt=new Date().toISOString();roles[index]=role;await this.ctx.storage.put("roles:"+loginId,roles);if(index===0)await this.ctx.storage.put("role:"+loginId,role);const rows=(await this.ctx.storage.get("assignments"))||[],r=rows.find(x=>normalizeLoginId(x.loginId)===loginId&&Number(x.assignmentIndex)===Number(role.assignmentIndex));if(r){r.viewedAt=role.viewedAt;await this.ctx.storage.put("assignments",rows)}this.broadcast({type:"role_progress",loginId,roleId:String(role.roleId||""),roleIndex:index,viewedAt:role.viewedAt})}
    return j({ok:true,roleId:String(role.roleId||""),roleIndex:index,viewedAt:role.viewedAt})
  }
  async playerArtifactViewed(body){
    const loginId=normalizeLoginId(body?.loginId),artifact=await this.ctx.storage.get("artifact:"+loginId);
    if(!artifact||artifact.removedFromMatch===true)return j({ok:false,error:"ARTIFACT_NOT_FOUND"},404);
    if(!artifact.viewedAt){
      artifact.viewedAt=new Date().toISOString();await this.ctx.storage.put("artifact:"+loginId,artifact);
      const rows=(await this.ctx.storage.get("assignments"))||[],row=rows.find(x=>normalizeLoginId(x?.loginId)===loginId);
      if(row){row.artifactViewedAt=artifact.viewedAt;await this.ctx.storage.put("assignments",rows)}
      this.broadcast({type:"artifact_progress",loginId,artifactId:String(artifact.artifactId||""),viewedAt:artifact.viewedAt});
    }
    return j({ok:true,artifactId:String(artifact.artifactId||""),viewedAt:artifact.viewedAt})
  }
  async playerArtifactActivate(body){
    const loginId=normalizeLoginId(body?.loginId),requestId=String(body?.requestId||body?.clientEventId||"").trim().slice(0,200),meta=await this.ctx.storage.get("meta");
    if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    if(!["running","started","game","playing"].includes(String(meta.phase||"").toLowerCase()))return j({ok:false,error:"GAME_NOT_RUNNING"},409);
    if(!requestId)return j({ok:false,error:"REQUEST_ID_REQUIRED"},400);
    const cycleKey=currentArtifactCycleKey(meta),now=new Date().toISOString();
    const artifactLimitPerCycle=Math.max(0,Math.min(30,Math.trunc(Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)||0)));
    const result=await this.ctx.storage.transaction(async txn=>{
      const artifact=await txn.get("artifact:"+loginId);
      if(!artifact)return{ok:false,status:404,error:"ARTIFACT_NOT_FOUND"};
      if(artifact.removedFromMatch===true)return{ok:false,status:409,error:"ARTIFACT_REMOVED_FROM_MATCH"};
      const targetId=String(body?.targetId||body?.originalTargetId||"").slice(0,160);if(targetId){const players=(await txn.get("players"))||{};if(!players[targetId])return{ok:false,status:400,error:"INVALID_ARTIFACT_TARGET"}}
      if(meta.matchId&&artifact.matchId&&String(meta.matchId)!==String(artifact.matchId))return{ok:false,status:409,error:"STALE_ARTIFACT"};
      const artifactId=String(artifact.artifactId||""),playerId="member:"+loginId,useKey="artifactUse:"+loginId+":"+artifactId,oldUse=await txn.get(useKey),cycle=(await txn.get("artifactCycle:"+cycleKey))||{cycleKey,accepted:[]};
      if(artifact.singleUse===true&&oldUse&&(String(oldUse.requestId)!==requestId||String(oldUse.cycleKey)!==cycleKey))return{ok:false,status:409,error:"ARTIFACT_ALREADY_USED"};
      const reservation=reserveArtifactActivation(cycle,{requestId,playerId,artifactId,cycleKey,eligible:true,limit:artifactLimitPerCycle});
      const accepted=Array.isArray(reservation?.state?.accepted)?reservation.state.accepted:[];
      if(!reservation.ok){
        const status=reservation.error==="ARTIFACT_NOT_ELIGIBLE"?403:409;
        return{ok:false,status,error:reservation.error,count:accepted.length,max:artifactLimitPerCycle,remaining:Math.max(0,artifactLimitPerCycle-accepted.length)};
      }
      if(reservation.idempotent){
        const prior=accepted.find(x=>String(x?.requestId||"")===requestId&&String(x?.playerId||"")===playerId);
        return{ok:true,idempotent:true,activation:prior||null,count:accepted.length,max:artifactLimitPerCycle,remaining:Math.max(0,artifactLimitPerCycle-accepted.length)};
      }
      const activation={requestId,playerId,loginId,artifactId,artifactName:String(artifact.artifactName||""),matchId:String(meta.matchId||""),cycleKey,night:Math.max(1,Number(meta.cycleNight||1)),phase:String(meta.cyclePhase||""),originalTargetId:String(body?.targetId||body?.originalTargetId||"").slice(0,160),finalTargetId:String(body?.finalTargetId||body?.targetId||"").slice(0,160),status:"accepted",createdAt:now,...(body.gmConfirmation?{gmConfirmation:body.gmConfirmation}:{})};
      const nextAccepted=accepted.slice();nextAccepted[nextAccepted.length-1]=activation;
      const nextCycle={...reservation.state,accepted:nextAccepted,updatedAt:now};
      await txn.put("artifactCycle:"+cycleKey,nextCycle);await txn.put(useKey,{...activation,usedAt:now});
      artifact.usedAt=now;artifact.lastActivation=activation;await txn.put("artifact:"+loginId,artifact);
      return{ok:true,activation,count:nextAccepted.length,max:artifactLimitPerCycle,remaining:Math.max(0,artifactLimitPerCycle-nextAccepted.length)};
    });
    if(!result.ok)return j(result,result.status||409);
    const rows=(await this.ctx.storage.get("assignments"))||[],row=rows.find(x=>normalizeLoginId(x?.loginId)===loginId);if(row){row.artifactUsedAt=result.activation?.createdAt||now;await this.ctx.storage.put("assignments",rows)}
    this.broadcast({type:"artifact_activation",...result,cycleKey});return j(result)
  }
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
  async join(body){
    const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.demo===true&&!body?.member?.loginId)return j({ok:false,error:"DEMO_LOGIN_REQUIRED",message:"Đăng nhập thành viên để tham gia DEMO."},403);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);
    let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;const now=new Date().toISOString(),phase=String(meta.phase||"lobby").toLowerCase(),inProgress=["role_delivery","running","started","game","playing"].includes(phase);let player;
    if(body?.member?.loginId){const m=body.member,key="member:"+m.loginId,evicted=(await this.ctx.storage.get("evictedMembers"))||[];if(evicted.includes(normalizeLoginId(m.loginId))&&!players[key])return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"GM đã mời bạn ra khỏi Phòng. Hãy chờ GM gọi lại."},403);const resumeExisting=normalizeRoomCode(m.currentRoomCode||"")===normalizeRoomCode(meta.code||""),reserved=players[key]?.reservedByGM===true,known=!!players[key]||resumeExisting||reserved;if(meta.enabled===false&&!known)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);if(inProgress&&!known&&meta.demo!==true)return j({ok:false,error:"ROOM_IN_PROGRESS",message:"Ván đang chơi. Chỉ Thành Viên đã tham dự mới có thể vào lại trận."},423);player={...players[key],participantId:key,kind:"member",humanControlled:meta.demo===true||players[key]?.humanControlled===true,loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:normalizeGameCharacterId(m.gameCharacterId)||normalizeGameCharacterId(players[key]?.gameCharacterId)||null,seatId:normalizeSeatId(players[key]?.seatId,meta.seatCount),ready:reserved===true||(players[key]?.ready??m.ready??false),reservedByGM:reserved,joinedAt:players[key]?.joinedAt||now,lastSeenAt:now,lastHeartbeatAt:Date.now(),restoredAt:!players[key]&&resumeExisting?now:players[key]?.restoredAt||null};if(!playerSetupComplete(meta,player)&&!player.reservedByGM)player.ready=false;players[key]=player}
    else{const displayName=normalizeDisplayName(body?.guest?.displayName),avatarId=String(body?.guest?.avatarId||"");if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_GUEST_NAME"},400);if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR"},400);const guestId=String(body?.guest?.guestId||crypto.randomUUID()),key="guest:"+guestId;if(meta.enabled===false&&!players[key])return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);if(inProgress&&!players[key])return j({ok:false,error:"ROOM_IN_PROGRESS",message:"Ván đang chơi. Người ngoài không thể tham gia giữa trận."},423);player={participantId:key,kind:"guest",guestId,displayName,avatarId,gameCharacterId:normalizeGameCharacterId(players[key]?.gameCharacterId)||null,seatId:normalizeSeatId(players[key]?.seatId,meta.seatCount),ready:players[key]?.ready||false,joinedAt:players[key]?.joinedAt||now,lastSeenAt:now,lastHeartbeatAt:Date.now()};if(!playerSetupComplete(meta,player)&&!player.reservedByGM)player.ready=false;players[key]=player}
    if(!normalizeSeatId(player?.seatId,meta.seatCount)&&player?.positionX==null&&player?.movementStatus!=="moving"){
      const portalNow=Date.now(),from={x:50,y:12},to={x:50,y:23};
      player.positionX=from.x;player.positionY=from.y;player.moveId="portal:"+crypto.randomUUID();player.moveFromX=from.x;player.moveFromY=from.y;player.moveToX=to.x;player.moveToY=to.y;player.moveStartedAt=portalNow;player.moveDurationMs=1100;player.moveTargetSeatId=null;player.movementStatus="moving";player.villageActivity="portal_arrival";player.ready=player.reservedByGM===true;players[player.participantId]=player;
    }
    await this.ctx.storage.put("players",players);if(!inProgress)meta.locked=false;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);const publicRoster=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room:publicRoom(meta),players:publicRoster});return j({ok:true,player:publicPlayer(player),players:publicRoster,room:publicRoom(meta),resumed:!!player.restoredAt,setupRequired:!playerSetupComplete(meta,player)});
  }
  async ready(body){const id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},404);if(!!body.ready&&!players[id].reservedByGM&&!playerSetupComplete(meta,players[id]))return j({ok:false,error:"SETUP_REQUIRED",message:"Hãy chọn Nhân Vật và vị trí ngồi trước khi Sẵn Sàng."},409);players[id].ready=players[id].reservedByGM===true||!!body.ready;players[id].lastHeartbeatAt=Date.now();players[id].lastSeenAt=new Date().toISOString();await this.ctx.storage.put("players",players);meta.updatedAt=players[id].lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,player:publicPlayer(players[id])})}
  async heartbeat(body){const id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(!id||!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},404);const now=new Date().toISOString();players[id].lastHeartbeatAt=Date.now();players[id].lastSeenAt=now;if(players[id].reservedByGM===true)players[id].ready=true;else if(body&&Object.prototype.hasOwnProperty.call(body,"ready"))players[id].ready=!!body.ready;await this.ctx.storage.put("players",players);meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}const room=publicRoom(meta);return j({ok:true,player:publicPlayer(players[id]),room})}
  async leave(body){const players=(await this.ctx.storage.get("players"))||{},id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!id||!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn không còn ở trong phòng."},404);delete players[id];await this.ctx.storage.put("players",players);if(meta){meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta)}for(const ws of this.ctx.getWebSockets()){try{if(ws.deserializeAttachment()?.participantId===id)ws.close(1000,"PLAYER_LEFT_ROOM")}catch{}}this.broadcast({type:"room_state",room:meta?publicRoom(meta):null,players:Object.values(players).map(publicPlayer)});return j({ok:true,left:true})}
  // Chat content NEVER enters the public room DTO or broadcast WebSocket.
  // The generic chat_tick only asks each authenticated client to fetch its own channel.
  async chatAccess(loginId){
    const meta=await this.ctx.storage.get("meta"),players=(await this.ctx.storage.get("players"))||{},
      rows=(await this.ctx.storage.get("interactions"))||[],bans=(await this.ctx.storage.get("onlineChatBans:"+String(meta?.matchId||"")))||{};
    const runtime=meta?.cyclePhase==="night"?await this.getNightRuntime(meta,Number(meta.cycleNight||1),false):null;
    const permission=chatPolicy({meta,players,rows,runtime,loginId,bans});
    return{meta,players,permission};
  }
  async playerChatRead(body){
    const loginId=normalizeLoginId(body?.loginId),{meta,permission}=await this.chatAccess(loginId);
    if(!permission.canRead)return j({ok:true,channel:null,messages:[],canSend:false,reason:permission.reason,phase:meta?.cyclePhase||null});
    const key="onlineChat:"+String(meta.matchId)+":"+permission.channel;
    return j({ok:true,channel:permission.channel,scope:permission.scope,
      messages:(await this.ctx.storage.get(key))||[],canSend:permission.canSend,
      reason:permission.reason,phase:meta.cyclePhase,cycleKey:meta.cycleKey});
  }
  async playerChatSend(body){
    const loginId=normalizeLoginId(body?.loginId),content=chatNormalizeText(body?.text);
    if(!content||String(body?.text||'').length>400)return j({ok:false,error:"CHAT_INVALID_TEXT"},400);
    const {meta,players,permission}=await this.chatAccess(loginId);
    if(!permission.canSend)return j({ok:false,error:permission.reason||"CHAT_FORBIDDEN"},403);
    const rateKey="onlineChatRate:"+String(meta.matchId)+":"+loginId,prev=Number(await this.ctx.storage.get(rateKey)||0);
    if(Date.now()-prev<850)return j({ok:false,error:"CHAT_RATE_LIMIT"},429);
    const key="onlineChat:"+String(meta.matchId)+":"+permission.channel,
      messages=(await this.ctx.storage.get(key))||[],now=Date.now(),
      message={id:crypto.randomUUID(),senderId:loginId,
        senderName:String(players["member:"+loginId]?.displayName||loginId).slice(0,42),
        text:content,at:now,scope:permission.scope};
    await this.ctx.storage.put(key,[...messages.slice(-79),message]);
    await this.ctx.storage.put(rateKey,now);
    this.broadcast({type:"chat_tick",serverTime:now});
    return j({ok:true,id:message.id,channel:permission.channel});
  }
  async gmChatRead(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,match=String(meta.matchId||"");
    const records=match?await this.ctx.storage.list({prefix:"onlineChat:"+match+":"}):new Map(),
      channels=[...records.entries()].map(([key,messages])=>({
        channel:key.slice(("onlineChat:"+match+":").length),
        messages:Array.isArray(messages)?messages.slice(-80):[]
      }));
    return j({ok:true,matchId:match,phase:meta.cyclePhase||null,
      bans:(await this.ctx.storage.get("onlineChatBans:"+String(meta?.matchId||"")))||{},channels});
  }
  async gmChatModerate(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const id=normalizeLoginId(body?.loginId),players=(await this.ctx.storage.get("players"))||{};
    if(!id||!players["member:"+id]||typeof body?.muted!=="boolean")return j({ok:false,error:"CHAT_INVALID_MODERATION"},400);
    const bans=(await this.ctx.storage.get("onlineChatBans:"+String(auth.meta.matchId||"")))||{};
    if(body.muted)bans[id]=true;else delete bans[id];
    await this.ctx.storage.put("onlineChatBans:"+String(auth.meta.matchId||""),bans);
    this.broadcast({type:"chat_tick",serverTime:Date.now()});
    return j({ok:true,loginId:id,muted:body.muted});
  }
  async websocket(request,url){if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return new Response("Expected WebSocket upgrade",{status:426});const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);const participantId=url.searchParams.get("participantId")||null;let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(participantId&&!players[participantId])return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},403);const now=new Date().toISOString();if(participantId&&players[participantId]){players[participantId].lastHeartbeatAt=Date.now();players[participantId].lastSeenAt=now;await this.ctx.storage.put("players",players)}const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({participantId,connectedAt:now});const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer),payload={type:"room_state",room,players:publicPlayers,serverTime:Date.now(),presenceChanged:true};server.send(JSON.stringify(payload));this.broadcast(payload);return new Response(null,{status:101,webSocket:client})}
  async webSocketMessage(ws,message){let d;try{d=JSON.parse(typeof message==="string"?message:new TextDecoder().decode(message))}catch{return}if(d?.type!=="ping")return;const participantId=ws.deserializeAttachment()?.participantId||null,meta=await this.ctx.storage.get("meta"),players=(await this.ctx.storage.get("players"))||{},now=new Date().toISOString();if(participantId&&players[participantId]){players[participantId].lastHeartbeatAt=Date.now();players[participantId].lastSeenAt=now;await this.ctx.storage.put("players",players)}try{ws.send(JSON.stringify({type:"pong",at:now,serverTime:Date.now()}))}catch{}}
  async markSocketDisconnected(ws){const participantId=ws?.deserializeAttachment?.()?.participantId||null;if(!participantId){this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length});return}const other=this.ctx.getWebSockets().some(s=>s!==ws&&s.deserializeAttachment?.()?.participantId===participantId);if(other)return;const players=(await this.ctx.storage.get("players"))||{},meta=await this.ctx.storage.get("meta");if(players[participantId]){players[participantId].lastHeartbeatAt=0;players[participantId].lastSeenAt=new Date().toISOString();await this.ctx.storage.put("players",players)}if(meta)this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now(),presenceChanged:true});this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length})}
  async webSocketClose(ws){await this.markSocketDisconnected(ws)} async webSocketError(ws){await this.markSocketDisconnected(ws)} broadcast(payload){
    // WOLF-01 fail closed: public WebSocket events MUST NOT carry queue members,
    // role identities, recognitionIds, or other private GM runtime fields.
    const safe=payload&&['night_turn','room_cycle'].includes(payload.type)?
      Object.fromEntries(Object.entries(payload).filter(([key])=>key!=='runtime'&&key!=='nightRuntime')):payload;
    if(this.demoBroadcastBuffer){this.demoBroadcastBuffer.push(safe);return}
    const e=JSON.stringify(safe);for(const s of this.ctx.getWebSockets())try{s.send(e)}catch{}
  }
}

export default {async fetch(request,env){
  const url=new URL(request.url);if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders()});
  // The Player's village runs inside an iframe at /village/?embed=1.
  // With Cloudflare Assets html_handling=none, /village/ does not resolve to
  // /village/index.html automatically. Forward this exact entry and its static
  // resources through the ASSETS binding, not the generic Player 404 route.
  if((url.pathname==="/village"||url.pathname.startsWith("/village/"))&&
     (request.method==="GET"||request.method==="HEAD")){
    if(!env.ASSETS)return new Response("Village assets unavailable",{status:503,headers:{"cache-control":"no-store"}});
    if(url.pathname==="/village"||url.pathname==="/village/"){
      const entryUrl=new URL(request.url);
      entryUrl.pathname="/village/index.html"; // keep ?embed=1 for the village UI
      const entry=await env.ASSETS.fetch(new Request(entryUrl.toString(),request));
      if(!entry.ok)return new Response("Village entry not ready",{status:503,headers:{"cache-control":"no-store"}});
      const headers=new Headers(entry.headers);
      headers.set("content-type","text/html; charset=UTF-8");
      headers.set("cache-control","no-store");
      return new Response(entry.body,{status:200,headers});
    }
    return env.ASSETS.fetch(request);
  }
  // Serve OTA files through the same ASSETS binding used by manifest readiness.
  // This avoids advertising an asset that a different static/CDN route cannot serve.
  if((url.pathname.startsWith("/updates/runtime/")||url.pathname==="/updates/latest.json")&&
     (request.method==="GET"||request.method==="HEAD")){
    if(!env.ASSETS)return new Response("Runtime assets unavailable",{status:503});
    return env.ASSETS.fetch(request);
  }
  // CORS-safe access to the exact canonical role artwork bundled with the current Runtime.
  // Native WKWebView can display local images but reject fetch(file://) during template packaging.
  const templateRoleArtwork=url.pathname.match(/^\/api\/gm\/template-role-artwork\/([A-Za-z0-9_-]{1,120})$/);
  if(templateRoleArtwork&&request.method==="GET"){
    if(!env.ASSETS)return j({ok:false,error:"RUNTIME_ARTWORK_UNAVAILABLE"},503);
    const assetUrl=new URL("/updates/runtime/"+VERSION+"/assets/role-artwork-v251/original/"+templateRoleArtwork[1]+".webp",request.url);
    try{
      const asset=await env.ASSETS.fetch(new Request(assetUrl.toString(),{method:"GET"}));
      if(!asset.ok)return j({ok:false,error:"ROLE_ARTWORK_NOT_FOUND"},asset.status===404?404:503);
      return new Response(asset.body,{status:200,headers:{...corsHeaders(),"content-type":"image/webp","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
    }catch{return j({ok:false,error:"RUNTIME_ARTWORK_UNAVAILABLE"},503)}
  }
  const admissionPolicy=publicEntryPolicy(request.method,url.pathname);
  if(admissionPolicy){
    const admissionResponse=await applyPublicEntryRateLimit(env,request,admissionPolicy);
    if(admissionResponse)return admissionResponse;
  }
  if(url.pathname==="/gmww-members-live.js"&&request.method==="GET")return new Response(patchPrivatePlayerCards(gmwwMembersLiveScript).replaceAll("__GMWW_WEB_VERSION__",VERSION),{headers:{"content-type":"application/javascript; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0","x-content-type-options":"nosniff"}});
  if(url.pathname==="/api/health"&&request.method==="GET")return j({ok:true,project:PROJECT,service:"GMWW Online",status:"online",version:VERSION,serverVersion:VERSION,webVersion:VERSION,runtimeVersion:VERSION});
  if(url.pathname==="/api/health/deep"&&request.method==="GET"){
    try{
      const ready=await memberStore(env).fetch("https://member.internal/health/storage");
      if(!ready.ok)return j({ok:false,project:PROJECT,status:"degraded",checks:{memberStorage:"unavailable"}},503);
      return j({ok:true,project:PROJECT,status:"ready",version:VERSION,checks:{memberStorage:"ready"}});
    }catch{return j({ok:false,project:PROJECT,status:"degraded",checks:{memberStorage:"unavailable"}},503)}
  }
  if(url.pathname==="/api/character-engine/manifest"&&request.method==="GET")return j({ok:true,engineVersion:CHARACTER_ENGINE_VERSION,master:{...CHARACTER_MASTER,motionSet:["idle","walk","run","turn"]},characters:createCharacterManifest().map(c=>({...c,motions:["idle","walk","run","turn"]}))});
  if(url.pathname==="/api/update/manifest"&&request.method==="GET"){
    const onlyNewNotes=m=>gmwwManifestNotesForInstalled(m,url.searchParams.get("current"));
    // Packaging verifies all bytes before embedding the catalog in this bundle.
    // No mutable storage/cache/subrequest is needed for update discovery.
    const packaged=await selectBuildVerifiedManifest(releaseCatalog,VERSION.replace(/^V/i,""),NATIVE_SHELL_VERSION);
    if(packaged){
      const installed=url.searchParams.get("current")||"";
      const candidate=releaseBases.find(c=>c?.manifest?.releaseVersion===installed);
      const base=candidate?await selectBuildVerifiedManifest(candidate,installed,NATIVE_SHELL_VERSION):null;
      return j({ok:true,...onlyNewNotes(selectCatalogDelta(packaged,base,installed)),checkedAt:new Date().toISOString(),manifestSource:"build-verified"});
    }
    if(!env.ASSETS)return j({ok:false,error:"UPDATE_MANIFEST_UNAVAILABLE"},503);
    try{
      const currentVersion=VERSION.replace(/^V/i,"");
      const currentNativeShell=NATIVE_SHELL_VERSION===currentVersion;
      const validRuntime=m=>String(m?.releaseVersion||"")===currentVersion&&String(m?.releaseType||"")==="runtime"&&String(m?.runtimeVersion||"")===currentVersion&&String(m?.shellVersion||"")===String(NATIVE_SHELL_VERSION)&&Array.isArray(m?.runtime?.files)&&m.runtime.files.length>0;
      const runtimeReady=m=>isRuntimePackageReady({assets:env.ASSETS,requestUrl:request.url,manifest:m,version:currentVersion});
      const recoverOlderInstalledRuntime=async()=>onlyNewNotes(await recoverLegacyRuntimeManifest({assets:env.ASSETS,requestUrl:request.url,version:currentVersion,shellVersion:NATIVE_SHELL_VERSION,installedVersion:url.searchParams.get("current")||""}));
      const readVersionedManifest=async()=>{
        try{
          const u=new URL(request.url);u.pathname="/updates/runtime/V"+currentVersion+"/manifest-"+UPDATE_CHANNEL_REV+".json";u.search="?v="+encodeURIComponent(VERSION)+"&channel="+encodeURIComponent(UPDATE_CHANNEL_REV)+"&ts="+Date.now();
          const rr=await env.ASSETS.fetch(new Request(u.toString(),{method:"GET",headers:{"cache-control":"no-cache"}}));
          if(!rr.ok)return null;const mm=await rr.json();return String(mm?.releaseVersion||"")===currentVersion?mm:null
        }catch{return null}
      };

      // Runtime shells must not depend on latest.json being fresh at every edge.
      // Prefer the immutable, versioned manifest first so an installed older runtime
      // can always discover and install the current runtime release.
      if(!currentNativeShell){
        const versioned=onlyNewNotes(await readVersionedManifest());
        if(validRuntime(versioned)&&await runtimeReady(versioned))return j({ok:true,...(selectVerifiedRuntimeV3104Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV3103Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV3101Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV3100Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV399Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV398Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV397Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV396Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV395Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV394Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV393Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV392Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV391Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV390Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV389Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV388Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV387Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV386Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV385Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV383Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV382Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV381Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV378Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV376Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV373Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV372Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV371Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV370Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV369Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV368Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV363Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV362Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV361Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV360Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV359Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV358Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV354Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV353Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV352Delta(versioned,url.searchParams.get("current"))||selectLegacyV350RuntimeDelta(versioned,url.searchParams.get("current"))||versioned),checkedAt:new Date().toISOString()});
      }

      const manifestUrl=new URL(request.url);manifestUrl.pathname="/updates/latest.json";manifestUrl.search="?v="+encodeURIComponent(VERSION)+"&channel="+encodeURIComponent(UPDATE_CHANNEL_REV)+"&ts="+Date.now();
      const res=await env.ASSETS.fetch(new Request(manifestUrl.toString(),{method:"GET",headers:{"cache-control":"no-cache"}}));
      if(!res.ok){
        if(!currentNativeShell){const rescue=await recoverOlderInstalledRuntime();if(rescue)return j(rescue);}
        return j({ok:false,error:currentNativeShell?"UPDATE_MANIFEST_NOT_FOUND":"RUNTIME_MANIFEST_NOT_READY",releaseVersion:currentVersion,runtimeVersion:currentVersion,shellVersion:NATIVE_SHELL_VERSION},currentNativeShell?404:503);
      }
      const manifest=onlyNewNotes(await res.json());
      const nativeManifest=()=>({
        ...manifest,
        releaseVersion:currentVersion,
        releaseType:"native",
        shellVersion:currentVersion,
        minimumShellVersion:currentVersion,
        runtimeVersion:currentVersion,
        webVersion:currentVersion,
        serverVersion:currentVersion,
        required:false,
        restartRequired:false,
        message:"GMWW V"+currentVersion+" yêu cầu cài IPA mới.",
        runtime:{files:[]},
        ipa:{
          version:currentVersion,
          fileName:"GMWW-V"+currentVersion+".ipa",
          url:"https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v"+currentVersion+"/GMWW-V"+currentVersion+".ipa"
        },
        checkedAt:new Date().toISOString()
      });
      const latestMismatch=String(manifest?.releaseVersion||"")!==currentVersion;
      const latestLostRuntime=!latestMismatch&&String(manifest?.releaseType||"")==="server_only"&&String(manifest?.shellVersion||"")&&String(manifest.shellVersion)!==currentVersion;
      if(!currentNativeShell){
        if(validRuntime(manifest)&&await runtimeReady(manifest))return j({ok:true,...(selectVerifiedRuntimeV3104Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV3103Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV3101Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV3100Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV399Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV398Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV397Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV396Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV395Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV394Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV393Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV392Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV391Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV390Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV389Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV388Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV387Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV386Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV385Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV383Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV382Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV381Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV378Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV376Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV373Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV372Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV371Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV370Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV369Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV368Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV363Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV362Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV361Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV360Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV359Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV358Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV354Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV353Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV352Delta(manifest,url.searchParams.get("current"))||selectLegacyV350RuntimeDelta(manifest,url.searchParams.get("current"))||manifest),checkedAt:new Date().toISOString()});
        const rescue=await recoverOlderInstalledRuntime();if(rescue)return j(rescue);
        return j({ok:false,error:"RUNTIME_MANIFEST_NOT_READY",releaseVersion:currentVersion,runtimeVersion:currentVersion,shellVersion:NATIVE_SHELL_VERSION},503);
      }
      if(latestMismatch||latestLostRuntime){
        const versioned=onlyNewNotes(await readVersionedManifest());
        if(versioned&&String(versioned?.releaseType||"")!=="server_only")return j({ok:true,...versioned,checkedAt:new Date().toISOString()});
        return j({ok:true,...nativeManifest()});
      }
      if(latestMismatch){
        return j({ok:true,...manifest,releaseVersion:currentVersion,releaseType:"server_only",runtimeVersion:currentVersion,webVersion:currentVersion,serverVersion:currentVersion,required:false,restartRequired:false,message:"Server/Player Web đã cập nhật.",checkedAt:new Date().toISOString()});
      }
      return j({ok:true,...manifest,checkedAt:new Date().toISOString()});
    }catch(e){
      console.error("GMWW_UPDATE_MANIFEST",e);
      return j({ok:false,error:"UPDATE_MANIFEST_INVALID"},500);
    }
  }
  if((url.pathname==="/favicon.svg"||url.pathname==="/favicon.ico")&&request.method==="GET")return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#101816" d="M7 7l16 11 9-3 9 3L57 7l-4 23 4 8-9 3-3 11-13 8-13-8-3-11-9-3 4-8L7 7z"/><path fill="#74cdb5" d="M13 14l11 9 8-3 8 3 11-9-3 16 4 5-9 2-2 11-9 6-9-6-2-11-9-2 4-5-3-16z"/><path fill="#101816" d="M17 29l10 2-5 6-6-3zm30 0l-10 2 5 6 6-3zM26 41l6-4 6 4-2 5h-8l-2-5zm2 7h8l-4 6z"/></svg>`,{headers:{"content-type":"image/svg+xml; charset=UTF-8","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
  if((url.pathname==="/gmww-sea-background.png"||url.pathname==="/gmww-sea-background.webp")&&request.method==="GET"){if(!env.ASSETS)return new Response("Background asset unavailable",{status:503});const assetUrl=new URL(request.url);assetUrl.pathname="/backgrounds/gmww-village-day-v260.webp";const asset=await env.ASSETS.fetch(new Request(assetUrl,request));if(!asset.ok)return new Response("Player Web background not found",{status:404});return new Response(asset.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}});}
  if(url.pathname==="/api/assets/victory-audio"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-assets/victory");
  if(url.pathname==="/api/assets/role-card-back"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-assets/card-back");
  if(url.pathname==="/api/ui-settings"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/ui");
  if(url.pathname==="/api/web-sync"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/web-sync");
  if(url.pathname==="/api/gm-presence"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/gm-presence");
  if(url.pathname==="/api/gm/web-sync"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request)||{};
    const rr=await memberStore(env).fetch(new Request("https://member.internal/global-settings/web-sync",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({version:VERSION,source:body?.source||"GM_APP"})}));
    if(!rr.ok)return rr;
    const data=await rr.json();return j({ok:true,...data,version:VERSION,serverVersion:VERSION,webVersion:VERSION});
  }
  if(url.pathname==="/api/gm/storage-optimizer"&&request.method==="GET"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch("https://member.internal/storage-optimizer/stats");
  }
  if(url.pathname==="/api/gm/presence"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request)||{};
    const payload={online:body?.online!==false};if(Object.prototype.hasOwnProperty.call(body,"roomCode"))payload.roomCode=body.roomCode;return memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}));
  }
  if(url.pathname==="/api/gm/move"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request)||{};
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-move",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  }
  if(url.pathname.startsWith("/api/gm/")&&url.pathname!=="/api/gm/presence"&&bearer(request)===GM_SYNC_TOKEN){
    try{await memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:'{"online":true}'}))}catch(_){}
  }
  if(url.pathname==="/api/village-scene"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/village-scene");
  const sceneImagePath=url.pathname.match(/^\/api\/village-scene\/image\/(day|night)$/);
  if(sceneImagePath&&request.method==="GET"){
    const revision=url.searchParams.get("revision")||"";
    const image=await memberStore(env).fetch("https://member.internal/global-settings/village-scene/image/"+sceneImagePath[1]+"?revision="+encodeURIComponent(revision));
    // IPA's file:// WebView must read bytes to persist its local scene pair.
    const response=new Response(image.body,image);
    response.headers.set("access-control-allow-origin","*");
    return response;
  }
  if(url.pathname==="/api/gm/village-scene"&&request.method==="PUT"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/village-scene",{method:"PUT",headers:{"content-type":"application/json"},body:request.body}));
  }
  if(url.pathname==="/api/gm/village-scene/reset"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/village-scene/reset",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
  }
  if(url.pathname==="/api/gm/village-scene/rollback"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch(new Request("https://member.internal/global-settings/village-scene/rollback",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
  }
  if(url.pathname==="/api/gm/ui-settings"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON"},400);return memberStore(env).fetch(new Request("https://member.internal/global-settings/ui",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));}
  if(url.pathname==="/api/gm/assets/victory-audio"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/global-assets/victory",{method:"PUT",headers:{"content-type":"audio/mpeg"},body:request.body}));}
  if(url.pathname==="/api/gm/assets/role-card-back"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/global-assets/card-back",{method:"PUT",headers:{"content-type":"image/webp"},body:request.body}));}
  if(url.pathname==="/api/avatars"&&request.method==="GET"){
    let custom=[];try{const rr=await memberStore(env).fetch("https://member.internal/avatars/catalog");if(rr.ok){const d=await rr.json();custom=Array.isArray(d?.avatars)?d.avatars:[]}}catch(e){console.warn("GMWW_CUSTOM_AVATAR_CATALOG",e)}
    const seen=new Set(custom.map(x=>String(x?.id||"")).filter(Boolean)),builtins=GMWW_MEMBER_AVATARS.filter(x=>!seen.has(String(x.id))).map(({id,name})=>({id,name,imageUrl:`/api/avatars/${encodeURIComponent(id)}/image`,priority:0,source:"builtin"}));
    const dynamic=custom.map(x=>({...x,imageUrl:`/api/avatars/${encodeURIComponent(x.id)}/image`}));
    const avatars=[...dynamic,...builtins];return j({ok:true,source:"GMWW-9.95-card-avatar",count:avatars.length,avatars});
  }
  if(url.pathname==="/api/gm/avatars/upsert"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON"},400);
    return memberStore(env).fetch(new Request("https://member.internal/avatars/upsert",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));
  }
  const avatar=url.pathname.match(/^\/api\/avatars\/([^/]+)\/image$/);if(avatar&&request.method==="GET"){
    const id=decodeURIComponent(avatar[1]);if(normalizeGameCharacterId(id))return gameCharacterImage(env,id,request);if(GMWW_MEMBER_AVATAR_IDS.has(id))return avatarImage(id);
    return memberStore(env).fetch("https://member.internal/avatars/image/"+encodeURIComponent(id));
  }
  if(url.pathname==="/api/members/register"&&request.method==="POST"){const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON",message:"Dữ liệu tạo thành viên không hợp lệ."},400);return memberStore(env).fetch("https://member.internal/members/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
  if(url.pathname==="/api/members/login"&&request.method==="POST"){const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON",message:"Dữ liệu đăng nhập không hợp lệ."},400);return memberStore(env).fetch("https://member.internal/members/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});}
  if(url.pathname==="/api/members/password"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/password",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/members/reset-request"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/reset-request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/members/create"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/admin-create",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/members/edit"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/admin-edit",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/members/reset-password"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/admin-reset",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/members/profile"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/profile",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/members/me"&&request.method==="GET")return memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(url.pathname==="/api/members/logout"&&request.method==="POST")return memberStore(env).fetch(new Request("https://member.internal/members/logout",{method:"POST",headers:request.headers}));
  if(url.pathname==="/api/members/presence"&&request.method==="POST"){
    const body=await safeJson(request)||{},code=normalizeRoomCode(body.roomCode||"");let revoked=false;
    if(isValidRoomCode(code)){
      const authRes=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
      if(!authRes.ok)return authRes;
      const own=await authRes.json().catch(()=>({})),lid=normalizeLoginId(own?.member?.loginId);
      try{
        const res=await roomStub(env,code).fetch("https://room.internal/state");
        if(res.ok){
          const state=await res.json().catch(()=>({}));
          if(Array.isArray(state.players)&&!state.players.some(p=>normalizeLoginId(p?.loginId)===lid)){
            body.roomCode=null;body.ready=false;revoked=true;
          }
        }else if(res.status===404){body.roomCode=null;body.ready=false;revoked=true}
      }catch{}
    }
    const res=await memberStore(env).fetch(new Request("https://member.internal/members/presence",{method:"POST",headers:request.headers,body:JSON.stringify(body)}));
    if(revoked&&res.ok){const data=await res.json().catch(()=>({ok:true}));return j({...data,roomRevoked:true})}
    return res
  }
  if(url.pathname==="/api/gm/reset/939"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return gmReset939(env,request);}
  if(url.pathname==="/api/gm/members"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/members/directory");}
  if(url.pathname==="/api/gm/members/reset-ranking"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/admin-reset-ranking",{method:"POST",headers:request.headers}));}
  if(url.pathname==="/api/gm/members/history"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/admin-clear-history",{method:"DELETE",headers:request.headers}));}
  const gmMemberDelete=url.pathname.match(/^\/api\/gm\/members\/([A-Za-z0-9._]+)$/);if(gmMemberDelete&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/delete",{method:"DELETE",headers:request.headers,body:JSON.stringify({loginId:decodeURIComponent(gmMemberDelete[1])})}));}
  if(url.pathname==="/api/gm/artifacts/shared"&&request.method==="GET"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return memberStore(env).fetch("https://member.internal/artifacts/shared/status");
  }
  if(url.pathname==="/api/gm/artifacts/shared"&&request.method==="PUT"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const body=await safeJson(request);
    return memberStore(env).fetch(new Request("https://member.internal/artifacts/shared",{method:"PUT",
      headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}));
  }
  if(url.pathname==="/api/gm/game-templates"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/game-templates/list");}
  if(url.pathname==="/api/gm/game-templates"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/game-templates/upsert",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})}));}
  const gmTemplateAssetsStatus=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)\/assets\/status$/);
  if(gmTemplateAssetsStatus&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/game-templates/assets/status?id="+encodeURIComponent(decodeURIComponent(gmTemplateAssetsStatus[1])))}
  const gmCanonicalTemplateRole=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)\/assets\/canonical$/);
  if(gmCanonicalTemplateRole&&request.method==="POST")
    return gmPackageCanonicalTemplateRole(env,decodeURIComponent(gmCanonicalTemplateRole[1]),request);
  const gmTemplateAssetPut=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)\/assets$/);
  if(gmTemplateAssetPut&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const id=decodeURIComponent(gmTemplateAssetPut[1]),body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/game-templates/assets",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({...body,id})}))}
  const gmTemplateGet=url.pathname.match(/^\/api\/gm\/game-templates\/([^/]+)$/);if(gmTemplateGet&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const id=decodeURIComponent(gmTemplateGet[1]);return memberStore(env).fetch("https://member.internal/game-templates/get?id="+encodeURIComponent(id));}
  if(gmTemplateGet&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const id=decodeURIComponent(gmTemplateGet[1]);return memberStore(env).fetch(new Request("https://member.internal/game-templates/delete?id="+encodeURIComponent(id),{method:"DELETE"}));}
  if(url.pathname==="/api/gm/lobby/reset"&&request.method==="POST"){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    return gmLobbyResetAll(env,request);
  }
  if(url.pathname==="/api/gm/rooms"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/directory/rooms/list?includeEnded=1&includeDisabled=1");}
  if(url.pathname==="/api/gm/rooms"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return gmRoomsPurge(env,request);}
  if(url.pathname==="/api/village"&&request.method==="GET")return memberStore(env).fetch('https://member.internal/village/state');
  if(url.pathname==="/api/village/move"&&request.method==="POST")return memberStore(env).fetch(new Request('https://member.internal/village/move',{method:'POST',headers:request.headers,body:JSON.stringify(await safeJson(request)||{})}));
  const seatSwapRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/seat-swap$/);if(seatSwapRoute&&request.method==='POST')return playerSeatSwapApi(env,seatSwapRoute[1],request);
  if(url.pathname==="/api/game-characters/v4"&&request.method==="GET")return j(characterV4Status());
  if(url.pathname==="/api/game-characters"&&request.method==="GET")return j({ok:true,count:GAME_CHARACTER_COUNT,frameCount:1,motionFrameCount:48,actionFrameCount:8,motionVersion:"c40-1",characters:gameCharacterCatalog()});
  const gameCharacterFrameRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[1-3][0-9]|4[0-2]))\/frame\/([1-6])$/);if(gameCharacterFrameRoute&&request.method==="GET")return character40Image(env,gameCharacterFrameRoute[1],request);
  const gameCharacterImageRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[1-3][0-9]|4[0-2]))\/image$/);if(gameCharacterImageRoute&&request.method==="GET")return character40Image(env,gameCharacterImageRoute[1],request);
  if(url.pathname==="/api/rooms"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/directory/rooms/list");
  if(url.pathname==="/api/rooms"&&request.method==="POST")return createRoom(env,url,request);
  const room=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);if(room&&request.method==="GET")return publicRoomState(env,room[1],request);
  const joinApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);if(joinApi&&request.method==="POST")return joinRoom(env,joinApi[1],request);
  const readyApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/ready$/);if(readyApi&&request.method==="POST")return readyRoom(env,readyApi[1],request);
  const heartbeatApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/heartbeat$/);if(heartbeatApi&&request.method==="POST")return heartbeatRoom(env,heartbeatApi[1],request);
  const leaveApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/leave$/);if(leaveApi&&request.method==="POST")return leaveRoomApi(env,leaveApi[1],request);
  const drunkDraw=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/drunk\/draw$/);
  if(drunkDraw&&request.method==='POST')return playerDrunkDrawApi(env,drunkDraw[1],request);
  const playerChat=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/chat$/);
  if(playerChat&&(request.method==="GET"||request.method==="POST"))return playerRoomChatApi(env,playerChat[1],request);
  const gmChat=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/chat$/);
  if(gmChat&&request.method==="GET")return roomProxy(env,gmChat[1],"/gm/chat",request);
  const gmChatMute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/chat\/moderate$/);
  if(gmChatMute&&request.method==="POST")return roomProxy(env,gmChatMute[1],"/gm/chat/moderate",request);
  const playerState=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/me$/);if(playerState&&request.method==="GET")return playerPrivateState(env,playerState[1],request);
  const deliveryReceived=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/delivery\/received$/);if(deliveryReceived&&request.method==="POST")return playerDeliveryReceivedApi(env,deliveryReceived[1],request);
  const roleViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role\/viewed$/);if(roleViewed&&request.method==="POST")return playerRoleViewedApi(env,roleViewed[1],request);
  const artifactViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/viewed$/);if(artifactViewed&&request.method==="POST")return playerArtifactViewedApi(env,artifactViewed[1],request);
  const artifactActivate=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/activate$/);if(artifactActivate&&request.method==="POST")return playerArtifactActivateApi(env,artifactActivate[1],request);
  const playerInteraction=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/interaction\/respond$/);if(playerInteraction&&request.method==="POST")return playerInteractionRespondApi(env,playerInteraction[1],request);
  const playerGallowsRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/gallows$/);if(playerGallowsRoute&&request.method==="POST")return playerGallowsApi(env,playerGallowsRoute[1],request);
  const playerDemoRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/demo-action$/);if(playerDemoRoute&&request.method==="POST")return playerDemoActionApi(env,playerDemoRoute[1],request);
  const playerOnlineRoute=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/action$/);if(playerOnlineRoute&&request.method==="POST")return playerOnlineActionApi(env,playerOnlineRoute[1],request);
  const playerSetup=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/setup$/);if(playerSetup&&request.method==="POST")return playerRoomSetupApi(env,playerSetup[1],request);
  const playerMove=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/move$/);if(playerMove&&request.method==="POST")return playerRoomMoveApi(env,playerMove[1],request);
  const playerMoveComplete=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/move\/complete$/);if(playerMoveComplete&&request.method==="POST")return playerRoomMoveCompleteApi(env,playerMoveComplete[1],request);
  const gmState=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)$/);if(gmState&&request.method==="GET")return gmRoomState(env,gmState[1],request);
  const gmPublish=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/publish$/);if(gmPublish&&request.method==="POST")return gmRoomState(env,gmPublish[1],request);
  const gmAssign=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/assignments$/);if(gmAssign&&request.method==="POST")return roomProxy(env,gmAssign[1],"/gm/assign",request);
  const gmStart=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/start$/);if(gmStart&&request.method==="POST")return roomProxy(env,gmStart[1],"/gm/start",request);
  const gmConfig=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/config$/);if(gmConfig&&request.method==="POST")return gmRoomConfig(env,gmConfig[1],request);
  const gmTemplatePreload=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/template-assets$/);
  if(gmTemplatePreload&&request.method==="POST")return gmPreloadTemplateAssets(env,gmTemplatePreload[1],request);
  const gmSharedArtifacts=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/shared-artifacts$/);
  if(gmSharedArtifacts&&request.method==="POST")return gmPreloadSharedArtifacts(env,gmSharedArtifacts[1],request);
  const gmRoleAssets=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/role-assets$/);if(gmRoleAssets&&request.method==="POST")return roomProxy(env,gmRoleAssets[1],"/gm/role-assets",request);
  const gmArtworkManifest=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/artwork-manifest$/);if(gmArtworkManifest&&request.method==="GET")return roomProxy(env,gmArtworkManifest[1],"/gm/artwork-manifest",request);
  const publicRoleAsset=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role-assets\/([^/]+)\/image$/);if(publicRoleAsset&&request.method==="GET"){const c=normalizeRoomCode(publicRoleAsset[1]);if(!isValidRoomCode(c))return new Response("Invalid room code",{status:400});return roomStub(env,c).fetch("https://room.internal/role-assets/"+encodeURIComponent(decodeURIComponent(publicRoleAsset[2]))+"/image")}
  const gmInteraction=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/interaction$/);if(gmInteraction&&request.method==="POST")return roomProxy(env,gmInteraction[1],"/gm/interaction",request);
  const gmBattleAction=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/battle-action$/);if(gmBattleAction&&request.method==="POST")return roomProxy(env,gmBattleAction[1],"/gm/battle-action",request);
  const gmDayActionRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/day-action$/);if(gmDayActionRoute&&request.method==="POST")return roomProxy(env,gmDayActionRoute[1],"/gm/day-action",request);
  const gmDayClockRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/day-clock$/);if(gmDayClockRoute&&request.method==="POST")return roomProxy(env,gmDayClockRoute[1],"/gm/day-clock",request);
  const gmBattleUndo=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/battle-undo$/);if(gmBattleUndo&&request.method==="POST")return roomProxy(env,gmBattleUndo[1],"/gm/battle-undo",request);
  const gmGallowsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/gallows$/);if(gmGallowsRoute&&request.method==="POST")return roomProxy(env,gmGallowsRoute[1],"/gm/gallows",request);
  const gmParticipants=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/participants$/);if(gmParticipants&&request.method==="POST")return gmRoomParticipants(env,gmParticipants[1],request);
  const gmRoomSettingsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/room-settings$/);if(gmRoomSettingsRoute&&request.method==="POST")return gmRoomSettingsApi(env,gmRoomSettingsRoute[1],request);
  const gmStageRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/stage$/);if(gmStageRoute&&request.method==="POST")return roomProxy(env,gmStageRoute[1],"/gm/stage",request);
  const gmSeatRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seat$/);if(gmSeatRoute&&request.method==="POST")return roomProxy(env,gmSeatRoute[1],"/gm/seat",request);
  const gmRandomSeatsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seats\/randomize-remaining$/);if(gmRandomSeatsRoute&&request.method==="POST")return roomProxy(env,gmRandomSeatsRoute[1],"/gm/seats/randomize-remaining",request);
  const gmMoveRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/move$/);if(gmMoveRoute&&request.method==='POST')return roomProxy(env,gmMoveRoute[1],'/gm/move',request);
  const gmSeatLockRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seat-lock$/);if(gmSeatLockRoute&&request.method==="POST")return roomProxy(env,gmSeatLockRoute[1],"/gm/seat-lock",request);
  const gmCycle=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/cycle$/);if(gmCycle&&request.method==="POST")return roomProxy(env,gmCycle[1],"/gm/cycle",request);
  const gmTurn=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/turn$/);if(gmTurn&&request.method==="POST")return roomProxy(env,gmTurn[1],"/gm/turn",request);
  const gmDemo=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/demo$/);if(gmDemo&&request.method==="POST")return roomProxy(env,gmDemo[1],"/gm/demo",request);
  const gmAuto=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/auto$/);if(gmAuto&&request.method==="POST")return roomProxy(env,gmAuto[1],"/gm/auto",request);
  const gmEnabled=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/enabled$/);if(gmEnabled&&request.method==="POST")return gmRoomEnabled(env,gmEnabled[1],request);
  const gmLock=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/lock$/);if(gmLock&&request.method==="POST")return gmRoomLock(env,gmLock[1],request);
  const gmKick=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/kick$/);if(gmKick&&request.method==="POST")return gmRoomKick(env,gmKick[1],request);
  const gmRename=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/rename$/);if(gmRename&&request.method==="POST")return gmRoomRename(env,gmRename[1],request);
  const gmReset=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/reset$/);if(gmReset&&request.method==="POST")return gmRoomReset(env,gmReset[1],request);
  const gmEnd=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/end$/);if(gmEnd&&request.method==="POST")return gmRoomEnd(env,gmEnd[1],request);
  const gmDelete=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/delete$/);if(gmDelete&&request.method==="POST")return gmRoomDelete(env,gmDelete[1],request);
  const gmDeleteDirect=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)$/);if(gmDeleteDirect&&request.method==="DELETE")return gmRoomDelete(env,gmDeleteDirect[1],request);
  const ws=url.pathname.match(/^\/ws\/([A-Za-z0-9]+)$/);if(ws){const c=normalizeRoomCode(ws[1]);if(!isValidRoomCode(c))return new Response("Invalid room code",{status:400});const u=new URL("https://room.internal/websocket");for(const[k,v]of url.searchParams)u.searchParams.set(k,v);return roomStub(env,c).fetch(new Request(u.toString(),{method:request.method,headers:request.headers}))}
  const proto=url.pathname.match(/^\/prototype(?:\/([A-Za-z0-9]+))?$/);if(proto&&request.method==="GET")return playerPage(normalizeRoomCode(proto[1]||""));
  const join=url.pathname.match(/^\/join\/([A-Za-z0-9]+)$/);if(join&&request.method==="GET")return playerPage(normalizeRoomCode(join[1]));
  const shortJoin=url.pathname.match(/^\/([A-Za-z0-9]+)$/);if(shortJoin&&request.method==="GET"){const c=normalizeRoomCode(shortJoin[1]);if(isValidRoomCode(c))return playerPage(c)}
  if(url.pathname==="/"&&request.method==="GET")return playerPage("");return new Response("Không tìm thấy trang",{status:404,headers:{...corsHeaders(),"content-type":"text/plain; charset=UTF-8"}});
}};

function gmwwStoredArtworkResponse(data){
  if(!validImageDataUrl(data))return new Response("Artwork not found",{status:404,headers:{"cache-control":"no-store"}});
  const match=String(data).match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/i);
  if(!match)return new Response("Invalid artwork",{status:404});
  try{
    const bin=atob(match[2]);
    return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":match[1],"cache-control":"no-store","x-content-type-options":"nosniff"}});
  }catch{return new Response("Invalid artwork",{status:404})}
}
async function applyPublicEntryRateLimit(env,request,policy){
  // Cloudflare sets CF-Connecting-IP at the trusted edge. Never trust X-Forwarded-For.
  // Hash before using the identity as a Durable Object name; never store raw addresses.
  const clientAddress=request.headers.get("CF-Connecting-IP")||"local-development";
  const digest=await sha256("public-entry-v1:"+policy.key+":"+clientAddress);
  try{
    const limiter=env.ROOMS.get(env.ROOMS.idFromName("__GMWW_RATE_V1__"+digest));
    const res=await limiter.fetch("https://rate.internal/security/rate-limit",{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key:policy.key})
    });
    if(res.ok)return null;
    if(res.status===429){
      const detail=await res.json().catch(()=>({}));
      const retry=Math.max(1,Math.min(60,Number(detail?.retryAfterSeconds)||60));
      return new Response(JSON.stringify({ok:false,error:"TOO_MANY_REQUESTS",message:"Quá nhiều yêu cầu. Vui lòng thử lại sau."}),{
        status:429,headers:{...corsHeaders(),"content-type":"application/json; charset=UTF-8","cache-control":"no-store","retry-after":String(retry)}
      });
    }
  }catch{}
  return j({ok:false,error:"ADMISSION_UNAVAILABLE",message:"Tạm thời không thể xác nhận yêu cầu. Vui lòng thử lại."},503);
}

async function createRoom(env,url,request){const body=await safeJson(request)||{};if(body.demo===true&&bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"DEMO_GM_ONLY"},403);for(let i=0;i<8;i++){const code=generateRoomCode(),r=await roomStub(env,code).fetch("https://room.internal/init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code,roomName:body.roomName||"",roomMode:body.roomMode||"online",demo:body.demo===true,enabled:Object.prototype.hasOwnProperty.call(body,"enabled")?body.enabled!==false:true,seatMoveMode:body.seatMoveMode||"instant",seatCount:body.seatCount,gameConfig:body.gameConfig||null,cardBackImage:body.cardBackImage||null})});if(r.status===201){const data=await r.json(),p=url.protocol==="https:"?"wss:":"ws:";await syncRoomDirectory(env,code);return j({ok:true,roomCode:code,roomName:data.room?.roomName||normalizeRoomName(body.roomName)||("Phòng "+code),gmToken:data.gmToken,joinUrl:`${url.origin}/${code}`,websocketUrl:`${p}//${url.host}/ws/${code}`},201)}if(r.status!==409)return j({ok:false,error:"ROOM_CREATE_FAILED"},500)}return j({ok:false,error:"ROOM_CODE_EXHAUSTED"},503)}
async function joinRoom(env,raw,request){const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const body=await safeJson(request);if(body?.token){const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:{Authorization:"Bearer "+body.token}}));if(!me.ok)return me;const data=await me.json();const joined=await roomStub(env,code).fetch("https://room.internal/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({member:data.member})});if(joined.ok){await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:data.member.loginId,roomCode:code,ready:false})});await syncRoomDirectory(env,code)}return joined}const joined=await roomStub(env,code).fetch("https://room.internal/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guest:body?.guest})});if(joined.ok)await syncRoomDirectory(env,code);return joined}
async function readyRoom(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/ready",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(res.ok){if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:code,ready:!!body.ready})});await syncRoomDirectory(env,code)}return res}
async function heartbeatRoom(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(res.ok){if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:code,ready:!!body.ready})});await syncRoomDirectory(env,code)}return res}
async function leaveRoomApi(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/leave",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:null,ready:false})});if(res.ok)await syncRoomDirectory(env,code);return res}
async function playerDrunkDrawApi(env,raw,request){
  const code=normalizeRoomCode(raw);
  if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);
  const session=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));
  if(!session.ok)return session;
  const me=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch('https://room.internal/player/drunk/draw',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({loginId:me.member.loginId,cardId:body.cardId})});
}
async function playerRoomChatApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  // The external client controls neither loginId nor channel membership.
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=request.method==="POST"?await safeJson(request)||{}:{};
  const route=request.method==="POST"?"/player/chat/send":"/player/chat";
  return roomStub(env,code).fetch(new Request("https://room.internal"+route,{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({loginId:data.member.loginId,text:body.text})
  }));
}
async function playerPrivateState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),res=await roomStub(env,c).fetch("https://room.internal/player/state",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:data.member.loginId,member:data.member})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function playerRoomSetupApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;
  const data=await me.json(),body=await safeJson(request)||{},res=await roomStub(env,code).fetch("https://room.internal/player/setup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})});
  if(res.ok)await syncRoomDirectory(env,code);return res
}
async function playerRoomMoveApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;
  const data=await me.json(),body=await safeJson(request)||{},res=await roomStub(env,code).fetch("https://room.internal/player/move",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})});
  if(res.ok)await syncRoomDirectory(env,code);return res
}
async function playerRoomMoveCompleteApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;
  const data=await me.json(),body=await safeJson(request)||{},res=await roomStub(env,code).fetch("https://room.internal/player/move-complete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})});
  if(res.ok)await syncRoomDirectory(env,code);return res
}
async function playerDeliveryReceivedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/delivery-received",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerRoleViewedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/role-viewed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerArtifactViewedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/artifact-viewed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerArtifactActivateApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/artifact-activate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerDemoActionApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/demo-action",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
async function playerOnlineActionApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/action",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
async function playerGallowsApi(env,raw,request){
  const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const session=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));
  if(!session.ok)return session;
  const data=await session.json(),body=await safeJson(request)||{};
  return roomStub(env,code).fetch("https://room.internal/player/gallows",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({...body,loginId:data.member.loginId})});
}
async function playerInteractionRespondApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/interaction/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function syncRoomDirectory(env,raw){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return;try{const r=await roomStub(env,c).fetch("https://room.internal/state");if(!r.ok)return;const d=await r.json();await memberStore(env).fetch("https://member.internal/directory/rooms/upsert",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...d.room,code:c,joinedCount:Array.isArray(d.players)?d.players.length:0,leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE})})}catch(e){console.warn("GMWW_ROOM_DIRECTORY_SYNC",e)}}
async function gmReset939(env,request){const statusRes=await memberStore(env).fetch(new Request("https://member.internal/admin/reset-939",{method:"GET",headers:request.headers})),status=await statusRes.json().catch(()=>({}));if(status?.done)return j({ok:true,done:true,already:true,record:status.record||null});const roomsRes=await gmRoomsPurge(env,request),rooms=await roomsRes.clone().json().catch(()=>({}));if(!roomsRes.ok||rooms?.failed)return j({ok:false,error:"ROOM_PURGE_FAILED",rooms},500);const membersRes=await memberStore(env).fetch(new Request("https://member.internal/members/purge",{method:"DELETE",headers:request.headers})),members=await membersRes.clone().json().catch(()=>({}));if(!membersRes.ok)return j({ok:false,error:"MEMBER_PURGE_FAILED",rooms,members},500);const record={roomsDeleted:Number(rooms?.deleted||0),membersDeleted:Number(members?.membersDeleted||0),sessionsDeleted:Number(members?.sessionsDeleted||0)};const markRes=await memberStore(env).fetch(new Request("https://member.internal/admin/reset-939",{method:"POST",headers:{...Object.fromEntries(request.headers),"content-type":"application/json"},body:JSON.stringify(record)}));if(!markRes.ok)return j({ok:false,error:"RESET_MARK_FAILED",rooms,members},500);return j({ok:true,done:true,rooms,members,...record})}
async function gmLobbyResetAll(env,request){
  // Reset all room instances, not member accounts, personal preferences or saved templates.
  // The directory includes disabled and ended rooms so no stale room can retain participants.
  const listing=await memberStore(env).fetch("https://member.internal/directory/rooms/list?includeEnded=1&includeDisabled=1");
  if(!listing.ok)return j({ok:false,error:"LOBBY_ROOM_LIST_FAILED"},502);
  const directory=await listing.json().catch(()=>({rooms:[]})),rooms=Array.isArray(directory?.rooms)?directory.rooms:[],results=[];
  const transactionId="lobby-"+Date.now().toString(36);
  for(const row of rooms){
    const code=normalizeRoomCode(row?.code);if(!isValidRoomCode(code))continue;
    try{
      const resetRequest=new Request("https://room.internal/gm/reset",{method:"POST",headers:request.headers,body:JSON.stringify({forceEnd:true,transactionId:transactionId+"-"+code})});
      const reset=await gmRoomReset(env,code,resetRequest);
      if(reset.status===404){
        await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});
        results.push({code,ok:true,stale:true,playersReturned:0});continue
      }
      if(!reset.ok){results.push({code,ok:false,stage:"reset",status:reset.status});continue}
      const resetBody=await reset.json().catch(()=>({}));
      const disabled=await gmRoomEnabled(env,code,new Request("https://room.internal/gm/enabled",{method:"POST",headers:request.headers,body:'{"enabled":false}'}));
      results.push({code,ok:disabled.ok,stage:disabled.ok?"done":"disable",status:disabled.status,playersReturned:Array.isArray(resetBody.removedPlayers)?resetBody.removedPlayers.length:0});
    }catch(e){results.push({code,ok:false,stage:"exception",error:String(e?.message||e)})}
  }
  const failed=results.filter(r=>!r.ok);
  if(failed.length)return j({ok:false,error:"LOBBY_RESET_PARTIAL",roomsChecked:results.length,failed:failed.length,results},502);
  const markerResponse=await memberStore(env).fetch("https://member.internal/global-settings/lobby-reset",{method:"POST",headers:{"content-type":"application/json"},body:'{"source":"GM_LOBBY"}'});
  if(!markerResponse.ok)return j({ok:false,error:"LOBBY_RESET_MARKER_FAILED",roomsChecked:results.length},502);
  const marker=await markerResponse.json().catch(()=>({}));
  await memberStore(env).fetch("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:'{"online":true,"roomCode":null}'});
  return j({ok:true,reset:true,generation:Number(marker.generation||0),roomsReset:results.filter(r=>!r.stale).length,devicesReturned:results.reduce((n,r)=>n+Number(r.playersReturned||0),0),rooms:results});
}
async function gmRoomsPurge(env,request){const listing=await memberStore(env).fetch("https://member.internal/directory/rooms/list"),data=await listing.json().catch(()=>({rooms:[]})),rooms=Array.isArray(data?.rooms)?data.rooms:[],results=[];for(const r of rooms){const code=normalizeRoomCode(r?.code);if(!isValidRoomCode(code))continue;try{const res=await gmRoomDelete(env,code,request),body=await res.clone().json().catch(()=>({}));if(res.status===404){await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});results.push({code,ok:true,status:404,staleDirectoryRemoved:true});continue}results.push({code,ok:res.ok,status:res.status,error:body?.error||null})}catch(e){results.push({code,ok:false,status:0,error:String(e?.message||e)})}}const failed=results.filter(x=>!x.ok);return j({ok:failed.length===0,purged:failed.length===0,deleted:results.length-failed.length,failed:failed.length,results},failed.length?500:200)}
async function gmRoomParticipants(env,raw,request){
  const code=normalizeRoomCode(raw),body=await safeJson(request);
  const res=await roomStub(env,code).fetch("https://room.internal/gm/participants",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});
  if(!res.ok)return res;
  const data=await res.clone().json().catch(()=>({}));
  if(data?.room?.demo===true){await syncRoomDirectory(env,code);return res}
  const syncPresence=async(loginId,roomCode,ready,expectedRoomCode=null,calledByGM=false)=>{
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId,roomCode,ready,expectedRoomCode,calledByGM})});
        if(response.ok)return true;
      }catch{}
    }
    return false
  };
  const failures=[];
  // Each member's presence record is independent; bounded concurrency avoids
  // a 30-person room waiting for 30 sequential Durable Object round trips.
  const syncBatch=async(rows,roomCode,ready,expectedRoomCode=null,calledByGM=false)=>{
    for(let offset=0;offset<rows.length;offset+=6){
      const results=await Promise.all(rows.slice(offset,offset+6).map(async loginId=>({
        loginId,ok:await syncPresence(loginId,roomCode,ready,expectedRoomCode,calledByGM)
      })));
      for(const result of results)if(!result.ok)failures.push(result.loginId);
    }
  };
  const admitted=[...new Set((Array.isArray(data?.players)?data.players:[]).map(p=>normalizeLoginId(p?.loginId)).filter(Boolean))];
  await syncBatch(admitted,code,true,null,true);
  // Retry both newly removed accounts and incomplete releases from an earlier disband.
  // The storage guard preserves anyone who has already joined a different room.
  const releaseLogins=new Set((Array.isArray(data?.removedPlayers)?data.removedPlayers:[]).map(p=>normalizeLoginId(p?.loginId)).filter(Boolean));
  if(data?.disbanded)for(const loginId of (Array.isArray(data?.reconcileLogins)?data.reconcileLogins:[]))if(normalizeLoginId(loginId))releaseLogins.add(normalizeLoginId(loginId));
  await syncBatch([...releaseLogins],null,false,code);
  await syncRoomDirectory(env,code);
  if(failures.length)return j({ok:false,error:"ROSTER_PRESENCE_PENDING",message:"Phòng đã giải tán, nhưng có tài khoản chưa xác nhận trở về Sảnh chờ.",pendingCount:failures.length,removedCount:Number(data.removedCount||0)},502);
  return res
}
async function gmRoomSettingsApi(env,raw,request){
  const code=normalizeRoomCode(raw);
  if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const response=await roomStub(env,code).fetch(new Request("https://room.internal/gm/room-settings",{method:"POST",headers:request.headers,body:request.body}));
  if(response.ok)await syncRoomDirectory(env,code);
  return response;
}
async function gmRoomConfig(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/config",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomEnabled(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/enabled",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.enabled===false&&data?.room?.demo!==true){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:true})})}catch{}}try{await memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({online:true,roomCode:null})}))}catch{}}await syncRoomDirectory(env,c)}return res}
async function gmRoomLock(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/lock",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomKick(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/kick",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),p=data?.player||{};if(data?.room?.demo!==true&&p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}await syncRoomDirectory(env,c)}return res}
async function gmRoomRename(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/rename",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomReset(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/reset",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.room?.demo===true){await syncRoomDirectory(env,c);return res}if(data?.hardReset===false&&data?.preserveParticipants===true){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:c,ready:true})})}catch{}}}else{for(const p of (Array.isArray(data?.removedPlayers)?data.removedPlayers:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:true})})}catch{}}}await syncRoomDirectory(env,c)}return res}
async function gmRoomEnd(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/end",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),room=data?.room||{};for(const r of (room.demo===true?[]:Array.isArray(data?.memberResults)?data.memberResults:[])){try{await memberStore(env).fetch("https://member.internal/members/record-result",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,matchId:data.matchId||room.matchId,roomCode:c,roomName:room.roomName,gameName:room.gameName,roleName:r.roleName,faction:r.faction,winnerFaction:data.winnerFaction||room.winnerFaction,result:r.result,playedAt:room.endedAt})})}catch(e){console.warn("GMWW_RESULT_RECORD",r?.loginId,e)}try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,roomCode:c,ready:true})})}catch(e){console.warn("GMWW_END_LOBBY_PRESENCE",r?.loginId,e)}}await syncRoomDirectory(env,c)}return res}
async function gmRoomDelete(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);if(bearer(request)!==GM_SYNC_TOKEN){const probe=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(!probe.ok&&probe.status!==404)return probe}let res;try{res=await roomStub(env,c).fetch("https://room.internal/gm/delete",{method:"POST",headers:request.headers})}catch(e){res=null}let data={};if(res)try{data=await res.clone().json()}catch(_){}if(res&&res.status!==404&&!res.ok)return res;const players=data?.room?.demo===true?[]:Array.isArray(data?.players)?data.players:[];for(const p of players){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}}await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:c})});return j({ok:true,deleted:true,alreadyGone:!!(res&&res.status===404),code:c,room:data?.room||null})}

async function gmPreloadSharedArtifacts(env,raw,request){
  if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
  const roomCode=normalizeRoomCode(raw);if(!isValidRoomCode(roomCode))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const body=await safeJson(request),assetIds=[...new Set(Array.isArray(body?.assetIds)?body.assetIds.map(String):[])];
  if(!assetIds.length||assetIds.length>100||!assetIds.every(id=>/^artifact:[A-Za-z0-9._:-]{1,120}$/.test(id)))
    return j({ok:false,error:"INVALID_SHARED_ARTIFACT_SELECTION",message:"Hãy chọn từ 1 đến 100 Artifact hợp lệ."},400);
  // One metadata-only call: no Base64 download/upload for every new room.
  const response=await memberStore(env).fetch("https://member.internal/artifacts/shared/status");
  if(!response.ok)return j({ok:false,error:"SHARED_ARTIFACT_NOT_READY"},424);
  const status=await response.json(),available=new Map((status?.artifacts||[]).map(x=>[String(x.assetId),x]));
  const missing=assetIds.filter(id=>!available.get(id)?.signature||!available.get(id)?.package);
  if(missing.length)return j({ok:false,error:"SHARED_ARTIFACT_NOT_READY",missing},409);
  const refs=assetIds.map(assetId=>({assetId,roleId:assetId.slice(9),signature:available.get(assetId).signature,roleCard:available.get(assetId).package.roleCard}));
  const push=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-refs",{method:"POST",headers:request.headers,body:JSON.stringify({kind:"artifact",refs})}));
  if(!push.ok)return j({ok:false,error:"SHARED_ARTIFACT_REFERENCE_FAILED"},424);
  const check=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-manifest",{headers:request.headers}));
  const manifest=await check.json().catch(()=>null);
  if(!check.ok||!assetIds.every(id=>manifest?.assetIds?.includes(id)))
    return j({ok:false,error:"SHARED_ARTIFACT_VERIFY_FAILED"},424);
  return j({ok:true,ready:true,mode:"reference",assetIds,count:assetIds.length});
}
// Package the exact clean role artwork within the Worker, without fetching a local
// file:// URL or decoding/canvas-encoding high-resolution images in iOS WKWebView.
async function gmPackageCanonicalTemplateRole(env,raw,request){
  if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
  if(!env.ASSETS)return j({ok:false,error:"ROLE_ARTWORK_SOURCE_NOT_READY"},503);
  const id=String(raw||"").slice(0,120),body=await safeJson(request);
  const assetId=String(body?.assetId||"").slice(0,180);
  if(!/^role:[A-Za-z0-9_-]{1,120}$/.test(assetId))return j({ok:false,error:"INVALID_ROLE_ASSET"},400);
  const roleId=assetId.slice(5),statusUrl="https://member.internal/game-templates/assets/status?id="+encodeURIComponent(id);
  const statusResponse=await memberStore(env).fetch(statusUrl);
  if(!statusResponse.ok)return statusResponse;
  const status=await statusResponse.json();
  if(!status?.assets?.includes(assetId))return j({ok:false,error:"ROLE_NOT_IN_TEMPLATE"},400);
  if(!status.missing?.includes(assetId))return j({ok:true,assetId,cached:true,hasImage:true});
  const imageUrl=new URL("/updates/runtime/"+VERSION+"/assets/role-artwork-v251/original/"+roleId+".webp",request.url);
  try{
    const asset=await env.ASSETS.fetch(new Request(imageUrl.toString(),{method:"GET"}));
    if(!asset.ok)return j({ok:false,error:"CANONICAL_ROLE_ARTWORK_MISSING",assetId,message:"Server không tìm thấy artwork gốc của "+roleId},asset.status===404?404:503);
    const mime=String(asset.headers.get("content-type")||"").toLowerCase();
    if(mime&&!mime.includes("image/")&&!mime.includes("octet-stream"))return j({ok:false,error:"INVALID_ROLE_ARTWORK_MIME"},424);
    const bytes=new Uint8Array(await asset.arrayBuffer());
    // The template storage contract accepts up to 1.9 MB of base64 data.
    if(bytes.length<32||bytes.length>1380000||String.fromCharCode(...bytes.slice(0,4))!=="RIFF"
      ||String.fromCharCode(...bytes.slice(8,12))!=="WEBP")
      return j({ok:false,error:"INVALID_ROLE_ARTWORK_BYTES",message:"Artwork "+roleId+" không phải WEBP hợp lệ hoặc quá lớn."},424);
    let binary="";
    for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    const imageDataUrl="data:image/webp;base64,"+btoa(binary);
    if(!validImageDataUrl(imageDataUrl))return j({ok:false,error:"ROLE_ARTWORK_TOO_LARGE"},424);
    const pkg=body?.package||{},save=await memberStore(env).fetch(new Request(
      "https://member.internal/game-templates/assets",{method:"PUT",
      headers:{"content-type":"application/json"},body:JSON.stringify({id,assetId,imageDataUrl,package:pkg})}));
    const saved=await save.json().catch(()=>null);
    if(!save.ok||saved?.ok!==true||saved?.hasImage!==true)
      return j({ok:false,error:"CANONICAL_ROLE_PACKAGE_FAILED",message:saved?.message||saved?.error||"Không thể lưu ảnh Vai Trò."},424);
    return j({ok:true,assetId,hasImage:true,cached:false,source:"canonical_server_artwork"});
  }catch(err){return j({ok:false,error:"ROLE_ARTWORK_SOURCE_UNAVAILABLE",message:"Server không đọc được artwork "+roleId+". Vui lòng thử lại."},503)}
}
async function gmPreloadTemplateAssets(env,raw,request){
  if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
  const roomCode=normalizeRoomCode(raw);if(!isValidRoomCode(roomCode))return j({ok:false,error:"INVALID_ROOM_CODE"},400);
  const body=await safeJson(request),id=String(body?.templateId||"").slice(0,120);
  const statusResponse=await memberStore(env).fetch("https://member.internal/game-templates/assets/status?id="+encodeURIComponent(id));
  if(!statusResponse.ok)return statusResponse;
  const status=await statusResponse.json();
  if(!status.ready)return j({ok:false,error:"TEMPLATE_ASSETS_NOT_READY",missing:status.missing||[],message:"Artwork của Ván Mẫu chưa được đóng gói đầy đủ."},409);
  const requested=Array.isArray(body?.assetIds)?[...new Set(body.assetIds.map(String))]:status.assets;
  if(!requested.length||!requested.every(assetId=>status.assets.includes(assetId)&&status.packages?.[assetId]))
    return j({ok:false,error:"INVALID_TEMPLATE_ASSET_SELECTION"},400);
  const refs=requested.map(assetId=>({assetId,roleId:assetId.slice(5),templateId:id,revision:status.revision,roleCard:status.packages[assetId].roleCard,roleName:status.packages[assetId].roleName,faction:status.packages[assetId].faction,description:status.packages[assetId].description}));
  const push=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-refs",{method:"POST",headers:request.headers,body:JSON.stringify({kind:"template",refs,merge:requested.length===1&&status.assets.length>1})}));
  if(!push.ok)return j({ok:false,error:"ROOM_ARTWORK_REFERENCE_FAILED",message:"Không đăng ký được tham chiếu artwork Vai Trò."},424);
  const verify=await roomStub(env,roomCode).fetch(new Request("https://room.internal/gm/artwork-manifest",{headers:request.headers}));
  const manifest=await verify.json().catch(()=>null);
  if(!verify.ok||!requested.every(assetId=>manifest?.assetIds?.includes(assetId)))
    return j({ok:false,error:"ROOM_ARTWORK_VERIFY_FAILED",message:"Artwork chưa được xác thực đầy đủ trong Phòng."},424);
  return j({ok:true,ready:true,mode:"reference",templateId:id,revision:status.revision,count:requested.length,assetIds:requested});
}
async function roomProxy(env,raw,path,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);return roomStub(env,c).fetch(new Request("https://room.internal"+path,{method:request.method,headers:request.headers,body:request.method==="GET"?undefined:request.body}))}
async function publicRoomState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const res=await roomStub(env,c).fetch("https://room.internal/state");if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const res=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(res.ok)await syncRoomDirectory(env,c);return res}
function playerPage(code){return new Response(gmwwMembersPage(code),{headers:{...corsHeaders(),"content-type":"text/html; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"}})}
function avatarImage(id){const a=GMWW_MEMBER_AVATARS.find(x=>x.id===id);if(!a)return new Response("Not found",{status:404});const m=a.img.match(/^data:(image\/[^;]+);base64,(.+)$/);if(!m)return new Response("Invalid asset",{status:500});const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}
function roomStub(env,c){return env.ROOMS.get(env.ROOMS.idFromName(c))}function memberStore(env){return env.ROOMS.get(env.ROOMS.idFromName(MEMBER_STORE_NAME))}function generateRoomCode(){const b=new Uint8Array(ROOM_CODE_LENGTH);crypto.getRandomValues(b);let c="";for(const x of b)c+=ROOM_ALPHABET[x%ROOM_ALPHABET.length];return c}function secureShuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const limit=Math.floor(0x100000000/(i+1))*(i+1);let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0]}while(n>=limit);const j=n%(i+1),tmp=out[i];out[i]=out[j];out[j]=tmp}return out}function normalizeRoomCode(v){return String(v||"").trim().toUpperCase()}function isValidRoomCode(c){return new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(c)}
function validImageDataUrl(v){return typeof v==="string"&&/^data:image\/(?:webp|png|jpeg);base64,/i.test(v)&&v.length<1900000}
function normalizeRoleImage(v){
  if(typeof v!=="string")return null;let s=v.trim();if(!s)return null;
  if(validImageDataUrl(s))return s;
  if(/^https:\/\/[^\s]+$/i.test(s)&&s.length<4096)return s;
  if(/^[A-Za-z0-9+/=\r\n]+$/.test(s)&&s.replace(/\s/g,"").length>256){const raw=s.replace(/\s/g,"");try{const h=atob(raw.slice(0,64));let mime="";if(h.startsWith("\x89PNG"))mime="image/png";else if(h.startsWith("RIFF")&&h.includes("WEBP"))mime="image/webp";else if(h.charCodeAt(0)===0xff&&h.charCodeAt(1)===0xd8)mime="image/jpeg";if(mime){const d="data:"+mime+";base64,"+raw;return validImageDataUrl(d)?d:null}}catch{}}
  return null
}
function extractRoleImage(obj,depth=0){
  if(depth>5)return null;const direct=normalizeRoleImage(obj);if(direct)return direct;
  if(!obj||typeof obj!=="object")return null;
  const keys=["roleImage","image","imageUrl","imageData","imageDataUrl","artwork","art","cardImage","cardArtwork","avatar","avatarUrl","photo","thumbnail","cover","src","url","data","base64","value"];
  for(const k of keys){if(Object.prototype.hasOwnProperty.call(obj,k)){const hit=extractRoleImage(obj[k],depth+1);if(hit)return hit}}
  for(const [k,v] of Object.entries(obj)){if(/image|art|avatar|photo|cover|thumb|media|asset/i.test(k)){const hit=extractRoleImage(v,depth+1);if(hit)return hit}}
  return null
}
function currentArtifactCycleKey(meta){const n=Math.max(1,Number(meta?.cycleNight||1)),phase=String(meta?.cyclePhase||"").toLowerCase();return phase==="day"||phase==="morning"?String(meta?.matchId||"match")+":day:"+n:artifactCycleKey(meta?.matchId||"match",n)}
function gameLabelKey(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function normalizeWinnerFaction(v){const raw=String(v||"").trim();if(!raw)return"";const n=raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();if(["village","villager","villagers","dan","dan lang"].includes(n))return"Phe Dân";if(["wolf","wolves","soi"].includes(n))return"Phe Sói";if(["third","third faction"].includes(n))return"Phe Ba";if(n.includes("phe dan"))return"Phe Dân";if(n.includes("phe soi"))return"Phe Sói";if(n.includes("phe ba")||n.includes("phe thu 3")||n.includes("phe thu ba"))return"Phe Ba";if(n.includes("phe khac"))return"Phe Khác";return raw.replace(/^[^A-Za-zÀ-ỹ0-9]+/u,"").trim().slice(0,120)}
function disableMemberPassword(m){if(!m||typeof m!=="object")return m;delete m.passwordSalt;delete m.passwordHash;delete m.passwordAlgorithm;delete m.passwordIterations;delete m.resetRequestedAt;delete m.passwordResetAt;m.passwordConfigured=false;m.passwordRequired=false;return m}
function gameCharacterCatalog(){return character40Catalog()}
// Character V4: serve the two user-approved artworks on Player Web without changing IPA files.
async function gameCharacterV4Sprite(env,id,request){
 if(!env.ASSETS||!/^character-0[12]$/.test(String(id)))return null;
 try{
  const atlasUrl=new URL('/characters/v4/approved-two-characters.avif',request.url);
  const image=await env.ASSETS.fetch(new Request(atlasUrl.toString(),{method:'GET'}));
  if(!image.ok)return null;
  const src=new Uint8Array(await image.arrayBuffer());
  if(src.byteLength<3000||src.byteLength>60000)return null;
  let raw='';for(let i=0;i<src.length;i+=2048)raw+=String.fromCharCode(...src.subarray(i,i+2048));
  const base64=btoa(raw);
  const dir=new URL(request.url).searchParams.get('dir')||'front';
  const cols={front:0,left:1,back:2,right:3};
  const x=-100*(cols[dir]??0),y=id==='character-02'?-145:0;
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="145" viewBox="0 0 100 145"><image x="'+x+'" y="'+y+'" width="400" height="290" href="data:image/avif;base64,'+base64+'"/></svg>';
  return new Response(svg,{status:200,headers:{'content-type':'image/svg+xml; charset=utf-8','cache-control':'public, max-age=3600','x-content-type-options':'nosniff','x-gmww-character-v4':'preview'}});
 }catch{return null}
}
async function gameCharacterFrame(env,id,frame,request){const m=String(id||"").match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/),f=Math.max(1,Math.min(6,Number(frame)||1));if(!m)return new Response("Not found",{status:404});const number=Number(m[1]);if(number>GAME_CHARACTER_COUNT){if(env.ASSETS){try{const u=new URL(request.url);u.pathname="/characters/v253/chibi-"+m[1]+".webp";u.search="";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}return new Response("Chibi frame not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}const source=m[1];if(env.ASSETS){try{const u=new URL(request.url),left=u.searchParams.get("dir")==="left";u.pathname=(left?"/characters/walk-v266-left/":"/characters/walk-v263/")+"character-"+source+"/frame-"+String(f).padStart(2,"0")+".webp";u.search="";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}if(number<=2){const preview=await gameCharacterV4Sprite(env,id,request);if(preview)return preview;}return new Response("Walk frame not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}
async function gameCharacterImage(env,id,request){return character40Image(env,id,request)}
async function gameCharacterImageLegacy(env,id,request){const m=String(id||"").match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/);if(!m)return new Response("Not found",{status:404});if(Number(m[1])<=2){const portrait=await gameCharacterV4Sprite(env,id,request);if(portrait)return portrait;}if(Number(m[1])<=20)return gameCharacterFrame(env,id,1,request);if(env.ASSETS){try{const u=new URL(request.url);u.pathname="/characters/v253/chibi-"+m[1]+".webp";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}return new Response("Chibi not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}
function activeFrozenLoginIds(interactions,meta={},now=Date.now()){
  const matchId=String(meta?.matchId||"");
  return new Set((Array.isArray(interactions)?interactions:[])
    .filter(x=>String(x?.type||"")=="frozen"&&x?.effectActive!==false
      &&(!x?.expiresAt||Date.parse(x.expiresAt)>now)
      &&(!x?.matchId||!matchId||String(x.matchId)===matchId))
    .map(x=>normalizeLoginId(x?.loginId)).filter(Boolean));
}
function normalizeDisplayName(v){return titleCaseDisplayName(String(v||"").trim().replace(/\s+/g," "))}function titleCaseDisplayName(v){return String(v||"").split(" ").map(w=>w?w.charAt(0).toLocaleUpperCase("vi-VN")+w.slice(1):w).join(" ")}function randomNumericPassword(n=12){const a=new Uint32Array(n);crypto.getRandomValues(a);return Array.from(a,x=>String(x%10)).join("")}function normalizeRoomName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,40)}function publicMember(m){return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),lobbyMotionEnabled:m.lobbyMotionEnabled!==false,source:m.source,createdAt:m.createdAt,updatedAt:m.updatedAt,currentRoomCode:m.currentRoomCode||null,ready:!!m.ready,stats:m.stats||{wins:0,losses:0},history:Array.isArray(m.history)?m.history:[]}}function directoryMember(m){const presenceAt=Number(m?.presenceAt||0),online=presenceAt>0&&(Date.now()-presenceAt)<=PRESENCE_TTL,stats=m?.stats&&typeof m.stats==="object"?{wins:Number(m.stats.wins||0),losses:Number(m.stats.losses||0)}:{wins:0,losses:0},history=Array.isArray(m?.history)?m.history.slice(0,50).map(x=>({matchId:String(x?.matchId||""),result:x?.result==="win"?"win":"loss",roomCode:String(x?.roomCode||""),roomName:String(x?.roomName||""),gameName:String(x?.gameName||""),roleName:String(x?.roleName||""),faction:String(x?.faction||""),winnerFaction:String(x?.winnerFaction||""),playedAt:x?.playedAt||null})):[];return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),source:m.source||"WEB",createdAt:m.createdAt,updatedAt:m.updatedAt,lastSeenAt:m.lastSeenAt||null,online,currentRoomCode:online?(m.currentRoomCode||null):null,ready:online?!!m.ready:false,resetRequestedAt:m.resetRequestedAt||null,passwordResetAt:m.passwordResetAt||null,stats,history,...villagePresence(m)}}async function derivePasswordHash(password,salt,iterations=PBKDF2_ITERATIONS){const count=Number(iterations);if(!Number.isSafeInteger(count)||count<1)throw new Error("INVALID_PASSWORD_ITERATIONS");const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),{name:"PBKDF2"},false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:count},key,256);return bytesToBase64(new Uint8Array(bits))}async function verifyPassword(password,m){const iterations=Number(m?.passwordIterations)||PBKDF2_ITERATIONS;return timingSafeEqual(await derivePasswordHash(password,base64ToBytes(m.passwordSalt),iterations),m.passwordHash)}async function sha256(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}function randomToken(n){return bytesToBase64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}function bytesToBase64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}function base64ToBytes(v){const s=atob(v);return Uint8Array.from(s,c=>c.charCodeAt(0))}function bearer(r){const h=r.headers.get("Authorization")||"";return h.startsWith("Bearer ")?h.slice(7).trim():""}async function safeJson(r){try{return await r.json()}catch{return null}}function j(data,status=200){return Response.json(data,{status,headers:{...corsHeaders(),"cache-control":"no-store"}})}function corsHeaders(){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,PUT,DELETE,OPTIONS","access-control-allow-headers":"content-type,authorization,x-gmww-demo-owner","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}}

async function playerSeatSwapApi(env,raw,request){const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);const me=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,code).fetch('https://room.internal/player/seat-swap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,loginId:data.member.loginId})})}
