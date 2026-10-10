import "../assets/village/village-layout.js";
const villageLayout=globalThis.GMWW_VILLAGE_LAYOUT;
import { DurableObject } from "cloudflare:workers";
import { combineConfiguredTurns, jumpTarget } from "./gmww-night-turn-rules.js";
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
import { PUBLIC_ENTRY_LIMITS, AI_SUPPORT_REQUEST_LIMIT, publicEntryPolicy, stepPublicEntryWindow } from "./gmww-security-admission.js";
import { fetchGmwwTasks,normalizeGmwwTasks } from "./gmww-task-board.js";
import { GMWW_TASK_SNAPSHOT,GMWW_TASK_SNAPSHOT_GENERATED_AT } from "./gmww-task-snapshot.js";
import { recoverLegacyRuntimeManifest } from "./gmww-runtime-recovery.js";
import { isRuntimePackageReady } from "./gmww-update-readiness.js";
import { aiSupportEnabled,handleAiSupport } from "./gmww-ai-support.js";
import { selectLegacyV350RuntimeDelta, selectVerifiedRuntimeV352Delta, selectVerifiedRuntimeV353Delta, selectVerifiedRuntimeV354Delta, selectVerifiedRuntimeV358Delta, selectVerifiedRuntimeV359Delta, selectVerifiedRuntimeV360Delta, selectVerifiedRuntimeV361Delta, selectVerifiedRuntimeV362Delta, selectVerifiedRuntimeV363Delta, selectVerifiedRuntimeV364Delta, selectVerifiedRuntimeV365Delta, selectVerifiedRuntimeV366Delta, selectVerifiedRuntimeV367Delta, selectVerifiedRuntimeV368Delta, selectVerifiedRuntimeV369Delta, selectVerifiedRuntimeV370Delta, selectVerifiedRuntimeV371Delta, selectVerifiedRuntimeV372Delta, selectVerifiedRuntimeV373Delta, selectVerifiedRuntimeV375Delta, selectVerifiedRuntimeV376Delta, selectVerifiedRuntimeV377Delta, selectVerifiedRuntimeV378Delta, selectVerifiedRuntimeV381Delta, selectVerifiedRuntimeV382Delta, selectVerifiedRuntimeV383Delta } from "./gmww-ota-delta.js";

const PROJECT="GMWW-V2.00",VERSION="V3.84",NATIVE_SHELL_VERSION="3.17",UPDATE_CHANNEL_REV="runtime-384",ROOM_IDLE_TTL=72*60*60*1000,ROOM_RESULT_REOPEN_DELAY=10000,ROOM_DIRECTORY_LEASE=180*1000,ROOM_PLAYER_TTL=70*1000,ROOM_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",ROOM_CODE_LENGTH=6;
const LOGIN_RE=/^[A-Za-z0-9._]{4,20}$/,SESSION_TTL=30*24*60*60*1000,PBKDF2_ITERATIONS=100000,MEMBER_STORE_NAME="__GMWW_MEMBERS__",PRESENCE_TTL=90000;
const GM_SYNC_TOKEN="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";
const GM_PRESENCE_TTL=75000;
function publicGmPresence(rec,online=true){
  if(!online)return{online:false,sessionId:"",sessionStartedAt:0,lastSeenAt:0,roomCode:""};
  const num=k=>Number.isFinite(Number(rec?.[k]))?Number(rec[k]):null;
  const roomCode=normalizeRoomCode(rec?.roomCode||"");return{online:true,sessionId:String(rec?.sessionId||""),sessionStartedAt:Math.max(0,Number(rec?.sessionStartedAt||rec?.lastSeenAt||0)),lastSeenAt:Math.max(0,Number(rec?.lastSeenAt||0)),roomCode:isValidRoomCode(roomCode)?roomCode:"",moveFromX:num("moveFromX"),moveFromY:num("moveFromY"),moveToX:num("moveToX"),moveToY:num("moveToY"),moveStartedAt:Math.max(0,Number(rec?.moveStartedAt||0)),moveDurationMs:Math.max(0,Number(rec?.moveDurationMs||0)),manualUntil:Math.max(0,Number(rec?.manualUntil||0))};
}

export class RoomDurableObject extends DurableObject {
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==="/security/rate-limit"&&request.method==="POST")return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    if(request.method==='POST'&&['/player/setup','/player/move','/player/move-complete','/player/seat-swap','/gm/move','/gm/seat','/gm/seat-lock','/gm/stage','/gm/seats/randomize-remaining','/gm/cycle','/gm/turn','/gm/auto','/join','/leave','/gm/participants','/gm/kick','/heartbeat','/player/state','/player/delivery-received'].includes(path))return this.ctx.blockConcurrencyWhile(()=>this.handleFetch(request));
    return this.handleFetch(request);
  }
  async securityRateLimit(body){
    const policy=[...Object.values(PUBLIC_ENTRY_LIMITS),AI_SUPPORT_REQUEST_LIMIT].find(x=>x.key===String(body?.key||""));
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
      const b=await safeJson(request),now=new Date().toISOString(),gmToken=randomToken(32),cfg=sanitizeGameConfig(b?.gameConfig),roomName=normalizeRoomName(b?.roomName)||String(cfg?.name||"Làng Asahi"),roomMode=normalizeRoomMode(b?.roomMode),seatMoveMode=normalizeSeatMoveMode(b?.seatMoveMode),seatCount=normalizeSeatCount(b?.seatCount,Number(cfg?.playerCount||0)||12),enabled=b&&Object.prototype.hasOwnProperty.call(b,"enabled")?b.enabled!==false:true,meta={code:normalizeRoomCode(b?.code||""),roomName,status:"waiting",phase:"lobby",locked:false,seatsLocked:false,gmStage:"room",gmStageRevision:0,enabled,autoGM:true,roomMode,seatMoveMode,seatCount,gameName:cfg?.name||"",playerCount:Number(cfg?.playerCount||0),createdAt:now,updatedAt:now,lastUsedAt:now,startedAt:null,roleDeliveredAt:null,gmTokenHash:await sha256(gmToken)};
      await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);if(cfg)await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(b?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(b.cardBackImage));return j({ok:true,room:publicRoom(meta),gmToken},201);
    }
    if(url.pathname==="/state"&&request.method==="GET")return this.publicState();
    if(url.pathname==="/gm/state"&&request.method==="GET")return this.gmState(request);
    if(url.pathname==="/gm/assign"&&request.method==="POST")return this.gmAssign(request,await safeJson(request));
    if(url.pathname==="/gm/start"&&request.method==="POST")return this.gmStart(request,await safeJson(request));
    if(url.pathname==="/gm/config"&&request.method==="POST")return this.gmConfig(request,await safeJson(request));
    if(url.pathname==="/gm/role-assets"&&request.method==="POST")return this.gmRoleAssets(request,await safeJson(request));
    if(url.pathname==="/gm/artwork-refs"&&request.method==="POST")return this.gmArtworkRefs(request,await safeJson(request));
    if(url.pathname==="/gm/artwork-manifest"&&request.method==="GET")return this.gmArtworkManifest(request);
    const roleAssetImage=url.pathname.match(/^\/role-assets\/([^/]+)\/image$/);if(roleAssetImage&&request.method==="GET")return this.roleAssetImage(decodeURIComponent(roleAssetImage[1]));
    if(url.pathname==="/gm/interaction"&&request.method==="POST")return this.gmInteraction(request,await safeJson(request));
    if(url.pathname==="/gm/participants"&&request.method==="POST")return this.gmParticipants(request,await safeJson(request));
    if(url.pathname==="/gm/room-settings"&&request.method==="POST")return this.gmRoomSettings(request,await safeJson(request));
    if(url.pathname==="/gm/stage"&&request.method==="POST")return this.gmStage(request,await safeJson(request));
    if(url.pathname==="/gm/seat"&&request.method==="POST")return this.gmSeat(request,await safeJson(request));
    if(url.pathname==="/gm/seats/randomize-remaining"&&request.method==="POST")return this.gmRandomizeRemainingSeats(request);
    if(url.pathname==="/gm/move"&&request.method==='POST'){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const b=await safeJson(request),players=await this.ctx.storage.get('players')||{},p=players[String(b?.participantId||'')];if(!p)return j({ok:false,error:'PLAYER_NOT_FOUND'},404);return this.playerMove({...b,loginId:p.loginId})}
    if(url.pathname==="/gm/seat-lock"&&request.method==="POST")return this.gmSeatLock(request,await safeJson(request));
    if(url.pathname==="/gm/cycle"&&request.method==="POST")return this.gmCycle(request,await safeJson(request));
    if(url.pathname==="/gm/turn"&&request.method==="POST")return this.gmTurn(request,await safeJson(request));
    if(url.pathname==="/gm/auto"&&request.method==="POST")return this.gmAuto(request,await safeJson(request));
    if(url.pathname==="/gm/enabled"&&request.method==="POST")return this.gmEnabled(request,await safeJson(request));
    if(url.pathname==="/gm/lock"&&request.method==="POST")return this.gmLock(request,await safeJson(request));
    if(url.pathname==="/gm/kick"&&request.method==="POST")return this.gmKick(request,await safeJson(request));
    if(url.pathname==="/gm/rename"&&request.method==="POST")return this.gmRename(request,await safeJson(request));
    if(url.pathname==="/gm/reset"&&request.method==="POST")return this.gmReset(request,await safeJson(request));
    if(url.pathname==="/gm/end"&&request.method==="POST")return this.gmEnd(request,await safeJson(request));
    if(url.pathname==="/gm/delete"&&request.method==="POST")return this.gmDelete(request);
    if(url.pathname==="/player/state"&&request.method==="POST")return this.playerState(await safeJson(request));
    if(url.pathname==="/player/delivery-received"&&request.method==="POST")return this.playerDeliveryReceived(await safeJson(request));
    if(url.pathname==="/player/role-viewed"&&request.method==="POST")return this.playerRoleViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-viewed"&&request.method==="POST")return this.playerArtifactViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-activate"&&request.method==="POST")return this.playerArtifactActivate(await safeJson(request));
    if(url.pathname==="/player/interaction/respond"&&request.method==="POST")return this.playerInteractionRespond(await safeJson(request));
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
    disableMemberPassword(member);member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();await this.ctx.storage.put("member:"+ses.loginId,member);
    return j({ok:true,member:publicMember(member),expiresAt:ses.expiresAt});
  }
  async memberPresence(request,body){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);const key="session:"+await sha256(token),ses=await this.ctx.storage.get(key);
    if(!ses||ses.expiresAt<=Date.now())return j({ok:false,error:"SESSION_EXPIRED"},401);
    return this.memberPresenceInternal({loginId:ses.loginId,roomCode:body?.roomCode??null,ready:!!body?.ready,preserveGmCall:true});
  }
  async memberPresenceInternal(body){
    const loginId=normalizeLoginId(body?.loginId),member=await this.ctx.storage.get("member:"+loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);
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
  async globalUiSettingsGet(){
    const rec=await this.ctx.storage.get("globalSetting:ui"),raw=Number(rec?.characterScale),characterScale=normalizeCharacterScale(raw,100);
    return j({ok:true,characterScale,backgroundDim:0,updatedAt:rec?.updatedAt||null});
  }
  async globalUiSettingsPut(body){
    const raw=Number(body?.characterScale);if(!Number.isFinite(raw))return j({ok:false,error:"INVALID_CHARACTER_SCALE"},400);
    const characterScale=normalizeCharacterScale(raw,100),rec={characterScale,backgroundDim:0,updatedAt:new Date().toISOString()};
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
    const rec={code,roomName:normalizeRoomName(body?.roomName)||("Phòng "+code),gameName:String(body?.gameName||"").slice(0,120),phase:String(body?.phase||"lobby"),status:String(body?.status||"waiting"),locked:!!body?.locked,enabled:body?.enabled!==false,roomMode:normalizeRoomMode(body?.roomMode||old?.roomMode),seatMoveMode:normalizeSeatMoveMode(body?.seatMoveMode||old?.seatMoveMode),seatCount:normalizeSeatCount(body?.seatCount,old?.seatCount||12),playerCount:Math.max(0,Number(body?.playerCount||0)),joinedCount:Math.max(0,Number(body?.joinedCount||0)),resetVersion:incomingResetVersion,createdAt:body?.createdAt||old?.createdAt||new Date().toISOString(),updatedAt:body?.updatedAt||new Date().toISOString(),leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE};
    await this.ctx.storage.put(key,rec);return j({ok:true,room:rec});
  }
  async roomDirectoryList(url){
    const includeEnded=String(url?.searchParams?.get("includeEnded")||"")==="1",includeDisabled=String(url?.searchParams?.get("includeDisabled")||"")==="1",rows=await this.ctx.storage.list({prefix:"roomdir:"}),rooms=[],nowMs=Date.now();
    for(const [key,r] of rows){const phase=String(r?.phase||"").toLowerCase(),last=Date.parse(r?.updatedAt||r?.createdAt||"");if(phase==="deleted"||(Number.isFinite(last)&&nowMs-last>=ROOM_IDLE_TTL)){await this.ctx.storage.delete(key);continue}if(!includeDisabled&&r?.enabled===false)continue;if(!includeEnded){if(phase==="ended")continue;const lease=Number(r?.leaseUntil||0);if((lease&&nowMs>lease)||(!lease&&Number.isFinite(last)&&nowMs-last>ROOM_DIRECTORY_LEASE))continue}rooms.push(r)}
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
  async publicState(){const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(String(meta.phase||"").toLowerCase()==="deleted")return j({ok:false,error:"ROOM_NOT_FOUND"},404);let players=(await this.ctx.storage.get("players"))||{};const pruned=await this.pruneOfflinePlayers(meta,players);players=pruned.players;return j({ok:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer),connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})}
  async gmAuthorized(request){const meta=await this.ctx.storage.get("meta");if(!meta)return{ok:false,response:j({ok:false,error:"ROOM_NOT_FOUND"},404)};const token=bearer(request);if(!token)return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};if(token!==GM_SYNC_TOKEN&&await sha256(token)!==meta.gmTokenHash)return{ok:false,response:j({ok:false,error:"UNAUTHORIZED"},401)};return{ok:true,meta,admin:token===GM_SYNC_TOKEN}}
  computeWinProposal(meta,assignments,interactions){
    if(String(meta?.phase||"").toLowerCase()!=="running")return null;
    const dead=new Set((Array.isArray(interactions)?interactions:[]).filter(x=>String(x?.type||"")==="dead"&&x?.effectActive!==false&&(!x?.matchId||!meta?.matchId||String(x.matchId)===String(meta.matchId))).map(x=>normalizeLoginId(x?.loginId)).filter(Boolean)),byPlayer=new Map();
    for(const a of Array.isArray(assignments)?assignments:[]){const lid=normalizeLoginId(a?.loginId);if(!lid||dead.has(lid))continue;const row=byPlayer.get(lid)||{loginId:lid,factions:new Set()};row.factions.add(normalizeWinnerFaction(a?.faction||""));byPlayer.set(lid,row)}
    const alive=[...byPlayer.values()];if(!alive.length)return null;
    const wolves=alive.filter(p=>p.factions.has("Phe Sói")).length,third=alive.filter(p=>p.factions.has("Phe Ba")).length,others=alive.length-wolves;
    if(alive.length===1&&third===1)return{winnerFaction:"Phe Ba",winnerLabel:"Phe Ba",reason:"Chỉ còn một Người Chơi Phe Ba còn sống.",confidence:"basic-rule"};
    if(wolves===0)return{winnerFaction:"Phe Dân",winnerLabel:"Phe Dân",reason:"Không còn Người Chơi Phe Sói còn sống.",confidence:"basic-rule"};
    if(wolves>=others)return{winnerFaction:"Phe Sói",winnerLabel:"Phe Sói",reason:"Số Người Chơi Phe Sói còn sống đã bằng hoặc nhiều hơn các phe còn lại.",confidence:"basic-rule"};
    return null
  }
  async gmState(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const {meta}=auth;let players=(await this.ctx.storage.get("players"))||{};const pruned=await this.pruneOfflinePlayers(meta,players);players=pruned.players;
    const interactions=(await this.ctx.storage.get("interactions"))||[],effectTypes=new Set(["frozen","expelled","dead","assassin_mark"]),activeEffects=interactions.filter(x=>effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())&&(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId))).slice(-100),interactionResponses=interactions.filter(x=>x?.status==="responded").slice(-100),artifactCycleKeyValue=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKeyValue))||{cycleKey:artifactCycleKeyValue,accepted:[]};
    const assignments=(await this.ctx.storage.get("assignments"))||[],nightRuntime=String(meta.cyclePhase||"").toLowerCase()==="night"&&Number(meta.cycleNight||0)>0?await this.getNightRuntime(meta,Number(meta.cycleNight),true):null,winProposal=this.computeWinProposal(meta,assignments,interactions);
    return j({ok:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer),gameConfig:(await this.ctx.storage.get("gameConfig"))||null,assignments,interactions:interactions.slice(-100),interactionResponses,activeEffects,artifactCycle:{cycleKey:artifactCycleKeyValue,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:Math.max(0,Math.min(30,Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3))),accepted:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.slice(-30):[]},nightRuntime,winProposal,connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})
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
    const summary=clean.map(({assignmentIndex,loginId,displayName,matchId,matchRevision,roleId,roleName,order,deliveredAt,viewedAt,artifact})=>({assignmentIndex,loginId,displayName,matchId,matchRevision,roleId,roleName,order,deliveredAt,viewedAt,artifactId:artifact?.artifactId||null,artifactName:artifact?.artifactName||null,artifactDeliveredAt:artifact?.deliveredAt||null,artifactViewedAt:artifact?.viewedAt||null,artifactUsedAt:artifact?.usedAt||null,artifactPriorityFirst:artifact?artifact.priorityFirst===true:null,artifactSingleUse:artifact?.singleUse===true}));
    await this.ctx.storage.put("assignments",summary);
    meta.multiAssign=multiAssign;meta.matchId=String(body?.matchId||meta.matchId||"")||null;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.deliveryVersion=nextDeliveryVersion;meta.phase="role_delivery";meta.status="role_delivery";meta.gmStage="deal";meta.roleDeliveredAt=nextPublishedAt;meta.updatedAt=meta.roleDeliveredAt;await this.ctx.storage.put("meta",meta);
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta),assignments:summary,multiAssign});
  }
  async gmStart(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,assignments=(await this.ctx.storage.get("assignments"))||[],incomingMatchId=String(body?.matchId||"");if(!assignments.length)return j({ok:false,error:"ROLES_NOT_DELIVERED",message:"Hãy phân và phát Vai Trò trước khi bắt đầu."},409);if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)return j({ok:false,error:"MATCH_MISMATCH",message:"Dữ liệu Phòng thuộc một ván khác. Hãy Phát Vai lại."},409);if(incomingMatchId)meta.matchId=incomingMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.deliveryVersion=Number(body?.deliveryVersion||meta.deliveryVersion||0);meta.phase="running";meta.status="running";meta.gmStage="battle";meta.locked=false;meta.startedAt=new Date().toISOString();meta.endedAt=null;await this.ctx.storage.put("interactions",[]);meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=Number(meta.resultVersion||0);meta.updatedAt=meta.startedAt;await this.ctx.storage.put("meta",meta);await this.scheduleRoomAlarm(meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta)})}
  async gmConfig(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,cfg=sanitizeGameConfig(body?.gameConfig);if(!cfg)return j({ok:false,error:"INVALID_GAME_CONFIG",message:"Ván Mẫu không hợp lệ."},400);await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(body?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(body.cardBackImage));if(body?.matchId)meta.matchId=String(body.matchId);meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.gameName=cfg.name||meta.gameName||"";meta.playerCount=Number(cfg.playerCount||0);meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);await this.scheduleRoomAlarm(meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta),gameConfig:cfg})}

  async gmAuto(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,enabled=body?.enabled!==false,wasEnabled=meta.autoGM!==false,nowMs=Date.now(),now=new Date(nowMs).toISOString(),phase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(0,Number(meta.cycleNight||0)),runtimeKey=night>0?this.nightRuntimeKey(meta,night):"",runtime=phase==="night"&&night>0?await this.getNightRuntime(meta,night,false):null;
    if(wasEnabled&&!enabled){
      if(runtime&&!runtime.completed){
        const deadline=Date.parse(runtime.deadlineAt||""),active=runtime.queue?.[runtime.cursor],fallback=active&&Number(active.durationSec)>0?Number(active.durationSec)*1000:0;
        runtime.autoPausedRemainingMs=Number.isFinite(deadline)?Math.max(0,deadline-nowMs):fallback;runtime.deadlineAt=null;runtime.autoAdvance=false;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)
      }else if(phase==="morning"||phase==="day"){
        const cfg=(await this.ctx.storage.get("gameConfig"))||{},totalMs=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0)*1000,started=Date.parse(meta.cycleStartedAt||""),due=Number.isFinite(started)?started+totalMs:NaN;
        meta.autoPausedRemainingMs=totalMs>0?(Number.isFinite(due)?Math.max(0,due-nowMs):totalMs):0
      }
    }else if(!wasEnabled&&enabled){
      if(runtime&&!runtime.completed){
        const active=runtime.queue?.[runtime.cursor],fallback=active&&Number(active.durationSec)>0?Number(active.durationSec)*1000:0,stored=Number(runtime.autoPausedRemainingMs),remaining=Number.isFinite(stored)?Math.max(0,stored):fallback;
        runtime.deadlineAt=remaining>0?new Date(nowMs+Math.max(100,remaining)).toISOString():null;runtime.autoPausedRemainingMs=0;runtime.autoAdvance=true;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)
      }else if(phase==="morning"||phase==="day"){
        const cfg=(await this.ctx.storage.get("gameConfig"))||{},totalMs=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0)*1000,stored=Number(meta.autoPausedRemainingMs),remaining=Number.isFinite(stored)?Math.max(0,Math.min(totalMs,stored)):totalMs;
        if(totalMs>0)meta.cycleStartedAt=new Date(nowMs-Math.max(0,totalMs-remaining)).toISOString();meta.autoPausedRemainingMs=null
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
    const roomMode=body&&Object.prototype.hasOwnProperty.call(body,"roomMode")?normalizeRoomMode(body.roomMode):normalizeRoomMode(meta.roomMode),seatMoveMode=body&&Object.prototype.hasOwnProperty.call(body,"seatMoveMode")?normalizeSeatMoveMode(body.seatMoveMode):normalizeSeatMoveMode(meta.seatMoveMode);
    const requested=body&&Object.prototype.hasOwnProperty.call(body,"seatCount")?normalizeSeatCount(body.seatCount,meta.seatCount):normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12);
    const maxOccupied=Math.max(0,...Object.values(players).map(p=>Number(p?.seatId||0)||0));
    if(requested<maxOccupied)return j({ok:false,error:"SEAT_COUNT_BELOW_OCCUPIED",message:"Không thể giảm số ghế thấp hơn vị trí đang có người ngồi.",maxOccupied},409);
    if(seatMoveMode==="instant"&&normalizeSeatMoveMode(meta.seatMoveMode)==="walk")for(const p of Object.values(players))clearPlayerMovement(p);
    meta.roomMode=roomMode;meta.seatMoveMode=seatMoveMode;meta.seatCount=requested;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("players",players);await this.ctx.storage.put("meta",meta);
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
    player.seatId=seatId;player.ready=player.reservedByGM===true;clearPlayerMovement(player);players[participantId]=player;await this.ctx.storage.put("players",players);
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
      player.seatId=seatId;player.ready=player.reservedByGM===true;clearPlayerMovement(player);players[participantId]=player;assigned.push({participantId,seatId});
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
  async buildNightRuntime(meta,night){
    const assignments=(await this.ctx.storage.get("assignments"))||[],cfg=(await this.ctx.storage.get("gameConfig"))||{},now=new Date().toISOString(),n=Math.max(1,Number(night)||1),queue=[],timing=cfg?.timing||{},defaultActionSec=Math.max(0,Number(timing.defaultActionSec??45)||0),wolfDiscussionSec=Math.max(0,Number(timing.wolfDiscussionSec??60)||0),artifactActionSec=Math.max(0,Number(timing.artifactActionSec??30)||0),roleDuration=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>[String(r?.roleId||""),Math.max(0,Number(r?.actionDurationSec??defaultActionSec)||0)]));
    if(n===1)queue.push({id:"wolf-introduction",kind:"wolf-introduction",label:"Bầy Sói ơi dậy đi nhìn mặt nhau",durationSec:wolfDiscussionSec,status:"pending"});
    const artifactRows=[];
    for(const [index,a] of assignments.entries()){
      if(!a?.artifactId)continue;
      const loginId=normalizeLoginId(a.loginId),assigned=await this.ctx.storage.get("artifact:"+loginId);
      const singleUse=a.artifactSingleUse===true||assigned?.singleUse===true;
      if(singleUse&&await this.ctx.storage.get("artifactUse:"+loginId+":"+String(a.artifactId)))continue;
      const priorityFirst=typeof a.artifactPriorityFirst==="boolean"?a.artifactPriorityFirst:typeof assigned?.priorityFirst==="boolean"?assigned.priorityFirst:defaultPriorityFirst(a.artifactName);
      artifactRows.push({...a,_index:index,_priorityFirst:priorityFirst});
    }
    for(const row of artifactRows.filter(a=>a._priorityFirst))queue.push({id:"early:"+String(row.artifactId)+":"+normalizeLoginId(row.loginId),kind:"early-artifact",label:String(row.artifactName||"Artifact"),artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId),durationSec:artifactActionSec,status:"pending"});
    const roleOrder=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map((r,i)=>[String(r?.roleId||""),Number(r?.order||i+1)])),groups=new Map();
    for(const a of assignments){const rid=String(a?.roleId||"");if(!rid)continue;let g=groups.get(rid);if(!g){g={id:"role:"+rid,kind:"role",label:String(a?.roleName||"Vai Trò"),roleId:rid,order:Number(a?.order||roleOrder.get(rid)||9999),loginIds:[],playerIds:[],durationSec:roleDuration.get(rid)??defaultActionSec,status:"pending"};groups.set(rid,g)}const lid=normalizeLoginId(a?.loginId);if(lid&&!g.loginIds.includes(lid)){g.loginIds.push(lid);g.playerIds.push("member:"+lid)}}
    const roleTurns=[...groups.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,"vi"));
    const artifactOrder=new Map((Array.isArray(cfg.artifacts)?cfg.artifacts:[]).map((a,i)=>[String(a?.artifactId||""),Number(a?.order||i+1)]));
    artifactRows.sort((a,b)=>(artifactOrder.get(String(a.artifactId))??9999)-(artifactOrder.get(String(b.artifactId))??9999)||a._index-b._index);
    const artifactTurns=artifactRows.map(row=>({id:"artifact:"+String(row.artifactId)+":"+normalizeLoginId(row.loginId),kind:"artifact-main",label:String(row.artifactName||"Artifact"),artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId),order:artifactOrder.get(String(row.artifactId))??9999,skipIfEarlyUsed:row._priorityFirst===true,durationSec:artifactActionSec,status:"pending"}));
    queue.push(...combineConfiguredTurns(roleTurns,artifactTurns));
    const first=queue[0]||null;if(first)first.startedAt=now;
    const firstDurationMs=first&&Number(first.durationSec)>0?Number(first.durationSec)*1000:0,autoEnabled=meta?.autoGM!==false;
    const runtime={matchId:String(meta?.matchId||""),night:n,queue,cursor:0,completed:queue.length===0,currentId:first?.id||null,autoAdvance:autoEnabled,startedAt:now,deadlineAt:autoEnabled&&firstDurationMs>0?new Date(Date.parse(now)+firstDurationMs).toISOString():null,autoPausedRemainingMs:!autoEnabled&&firstDurationMs>0?firstDurationMs:0,createdAt:now,updatedAt:now};
    await this.ctx.storage.put(this.nightRuntimeKey(meta,n),runtime);return runtime
  }
  async artifactUsedInNight(meta,step){
    if(!step?.artifactId||!step?.playerId)return false;
    const key=currentArtifactCycleKey(meta),cycle=(await this.ctx.storage.get("artifactCycle:"+key))||{accepted:[]};
    return (Array.isArray(cycle.accepted)?cycle.accepted:[]).some(x=>String(x?.artifactId||"")===String(step.artifactId)&&String(x?.playerId||("member:"+normalizeLoginId(x?.loginId)))===String(step.playerId))
  }
  async markGmArtifactTurnUsed(meta,step,targetLoginId){
    if(!step)return null;
    if(await this.artifactUsedInNight(meta,step))return j({ok:false,error:"ARTIFACT_ALREADY_USED",message:"Artifact đã dùng trong đêm này."},409);
    const activation=await this.playerArtifactActivate({loginId:normalizeLoginId(step.loginId),requestId:"gm:"+String(meta.matchId||"match")+":"+String(step.id),targetId:"member:"+normalizeLoginId(targetLoginId)});
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
    this.broadcast({type:"night_turn",night,runtime,source,room:publicRoom(meta),serverTime:Date.now()});return runtime
  }
  async applyCycle(meta,phase,night,cycleKey,source="gm"){
    const now=new Date().toISOString(),p=phase==="day"?"morning":String(phase||"").toLowerCase(),n=Math.max(0,Number(night)||0),key=String(cycleKey||((p&&n)?(p+"-"+n):("cycle-"+Date.now()))).slice(0,160);
    meta.cycleKey=key;if(p)meta.cyclePhase=p;if(n)meta.cycleNight=n;meta.cycleStartedAt=now;meta.autoPausedRemainingMs=null;meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    const rows=(await this.ctx.storage.get("interactions"))||[],expired=[];
    for(const x of rows){const type=String(x?.type||""),sameMatch=!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId);if(!sameMatch||x?.effectActive===false||!["frozen","expelled"].includes(type))continue;const effectNight=Math.max(0,Number(x?.night||0)||0);let shouldExpire=false,reason="";if(type==="frozen"){if(p==="morning"&&(effectNight===0||n===0||n>=effectNight)){shouldExpire=true;reason="MORNING_START"}else if(p==="night"&&effectNight>0&&n>effectNight){shouldExpire=true;reason="NEXT_NIGHT_SELF_HEAL"}}else if(type==="expelled"){if(p==="night"&&effectNight>0&&n>effectNight){shouldExpire=true;reason="NEXT_NIGHT_START"}else if(p==="night"&&effectNight===0&&x?.cycleKey&&String(x.cycleKey)!==key){shouldExpire=true;reason="NEXT_CYCLE_FALLBACK"}}if(shouldExpire){x.effectActive=false;x.expiredAt=now;x.expiredReason=reason;expired.push({id:x.id,type,loginId:x.loginId,night:effectNight,reason})}}
    await this.ctx.storage.put("interactions",rows.slice(-100));
    const nightRuntime=p==="night"&&n>0?await this.getNightRuntime(meta,n,true):null;
    if(nightRuntime){meta.currentNightTurnId=nightRuntime.currentId;meta.updatedAt=now;await this.ctx.storage.put("meta",meta)}
    const room=publicRoom(meta);this.broadcast({type:"room_cycle",cycleKey:key,phase:p,night:n,matchId:String(meta.matchId||""),expired,nightRuntime,room,source,serverTime:Date.now()});
    this.broadcast({type:"room_state",room,players:Object.values((await this.ctx.storage.get("players"))||{}).map(publicPlayer),serverTime:Date.now()});
    await this.scheduleRoomAlarm(meta);
    return{ok:true,cycleKey:key,phase:p,night:n,expired,matchId:String(meta.matchId||""),nightRuntime,room}
  }
  async autoAdvanceDue(meta){
    if(!meta||String(meta.phase||"").toLowerCase()!=="running"||meta.autoGM===false)return 0;
    const cyclePhase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(1,Number(meta.cycleNight||1));
    if(cyclePhase==="night"){const runtime=await this.getNightRuntime(meta,night,true);if(!runtime)return 0;if(runtime.completed)return Date.now();const due=Date.parse(runtime.deadlineAt||"");return Number.isFinite(due)?due:0}
    if(cyclePhase==="morning"||cyclePhase==="day"){const cfg=(await this.ctx.storage.get("gameConfig"))||{},sec=Math.max(0,Number(cfg?.timing?.villageDiscussionSec)||0),started=Date.parse(meta.cycleStartedAt||"");return sec&&Number.isFinite(started)?started+sec*1000:0}
    return 0
  }
  async scheduleRoomAlarm(meta=null){
    meta=meta||await this.ctx.storage.get("meta");if(!meta||String(meta.phase||"").toLowerCase()==="deleted")return 0;
    const expiryDue=this.roomExpiryDue(meta),autoDue=await this.autoAdvanceDue(meta),due=autoDue>0?Math.min(expiryDue,autoDue):expiryDue,next=Math.max(Date.now()+100,due);
    try{await this.ctx.storage.setAlarm(next)}catch(_){}
    return next
  }
  async runAutoAdvanceIfDue(meta){
    if(!meta||String(meta.phase||"").toLowerCase()!=="running"||meta.autoGM===false)return false;
    const due=await this.autoAdvanceDue(meta);if(!due||due>Date.now()+25)return false;
    const phase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(1,Number(meta.cycleNight||1));
    if(phase==="night"){const runtime=await this.getNightRuntime(meta,night,true);if(runtime&&!runtime.completed)await this.advanceNightRuntime(meta,"next","auto");const fresh=await this.ctx.storage.get("meta"),after=await this.getNightRuntime(fresh,night,true);if(after?.completed)await this.applyCycle(fresh,"morning",night,"morning-"+night,"auto");else await this.scheduleRoomAlarm(fresh);return true}
    if(phase==="morning"||phase==="day"){await this.applyCycle(meta,"night",night+1,"night-"+(night+1),"auto");return true}
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
    const runtime=await this.advanceNightRuntime(meta,action,source,targetIndex);await this.scheduleRoomAlarm(meta);
    return j({ok:true,night,runtime,autoGM:meta.autoGM!==false})
  }
  async gmCycle(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,rawPhase=String(body?.phase||body?.period||"").trim().toLowerCase(),phase=rawPhase==="day"?"morning":rawPhase,night=Math.max(0,Number(body?.night??body?.nightIndex??body?.roundIndex??0)||0),cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??((phase&&night)?(phase+"-"+night):("cycle-"+Date.now()))).slice(0,160);
    return j(await this.applyCycle(meta,phase,night,cycleKey,String(body?.source||"gm").slice(0,40)))
  }
  async gmInteraction(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
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
      const actors=(step.loginIds||[step.loginId]).filter(Boolean).map(normalizeLoginId);
      if(claimedActor&&actors.length&&!actors.includes(claimedActor))
        return j({ok:false,error:"INVALID_ACTOR_FOR_TURN"},403);
      if(step.kind==="early-artifact"||step.kind==="artifact-main")gmArtifactStep=step;
    }
    const players=(await this.ctx.storage.get("players"))||{},loginId=normalizeLoginId(body?.loginId),rawType=String(body?.type||"").trim().toLowerCase().replace(/\s+/g,"_"),alias={like_dislike:"thumb_vote","like-dislike":"thumb_vote",likedislike:"thumb_vote",reaction:"thumb_vote",reactions:"thumb_vote",thumbs:"thumb_vote",thumb:"thumb_vote",vote:"thumb_vote","👍👎":"thumb_vote",mark:"assassin_mark",marked:"assassin_mark",mark_choice:"assassin_mark","assassin-mark":"assassin_mark"},type=alias[rawType]||rawType;
    if(type==="revive"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      const p=Object.values(players).find(x=>normalizeLoginId(x?.loginId)===loginId);if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId);if(useError)return useError}
      const rows=(await this.ctx.storage.get("interactions"))||[],revived=[],now=new Date().toISOString();
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||String(x?.type||"")!=="dead")continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_REVIVE";revived.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",rows.slice(-100));const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);
      this.broadcast({type:"player_revived",loginId,revived,at:now,room,players:publicPlayers,serverTime:Date.now()});
      this.broadcast({type:"room_state",room,players:publicPlayers,serverTime:Date.now()});
      return j({ok:true,loginId,revived,room})
    }
    if(type==="clear_state"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId);if(useError)return useError}
      const rows=(await this.ctx.storage.get("interactions"))||[],cleared=[],now=new Date().toISOString();
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||!["frozen","expelled","dead","assassin_mark"].includes(String(x?.type||"")))continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_CLEAR";cleared.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",rows.slice(-100));this.broadcast({type:"player_state_cleared",loginId,cleared,at:now});return j({ok:true,loginId,cleared})
    }
    const allowed=new Set(["frozen","expelled","dead","thumb_vote","assassin_mark","effect_notice"]);if(!loginId||!allowed.has(type))return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
    const p=players["member:"+loginId];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
    const defaults={frozen:"Bạn đang bị Đóng Băng.",expelled:"Bạn đã bị Đuổi Khỏi Làng.",dead:"Bạn đã Chết.",thumb_vote:"Hãy chọn dấu phù hợp.",assassin_mark:"Bạn đã bị Đánh Dấu. Hãy chọn 👍 hoặc 👎 để xác định kết quả.",effect_notice:"Bạn đã nhận một Hiệu Ứng."},rawOptions=Array.isArray(body?.options)?body.options.map(x=>String(x||"").slice(0,40)).filter(Boolean).slice(0,4):[],cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??body?.nightIndex??body?.roundIndex??meta.cycleKey??"").slice(0,160),expiresAt=body?.expiresAt?String(body.expiresAt).slice(0,64):null,effectActive=["frozen","expelled","dead","assassin_mark"].includes(type),clientEventId=String(body?.clientEventId||"").slice(0,240),rows=(await this.ctx.storage.get("interactions"))||[];
    if(clientEventId){const existing=rows.find(x=>String(x?.clientEventId||"")===clientEventId&&normalizeLoginId(x?.loginId)===loginId);if(existing)return j({ok:true,interaction:existing,idempotent:true})}
    const now=new Date().toISOString(),choiceType=type==="thumb_vote"||type==="assassin_mark",interaction={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),clientEventId,eventId:String(body?.eventId||"").slice(0,240),engineEventType:String(body?.engineEventType||"").slice(0,120),matchId:String(body?.matchId||meta.matchId||""),loginId,type,message:String(body?.message||defaults[type]||"").slice(0,500),effectInstanceId:String(body?.effectInstanceId||"").slice(0,160),effectId:String(body?.effectId||"").slice(0,160),effectName:String(body?.effectName||"").slice(0,180),actionId:String(body?.actionId||"").slice(0,160),actorId:String(body?.actorId||"").slice(0,160),playerId:String(body?.playerId||"").slice(0,160),night:Number(body?.night||0),cycleKey,expiresAt,effectActive,emoji:String(body?.emoji||"").slice(0,20),title:String(body?.title||"").slice(0,180),requireAck:!!body?.requireAck,requireResponse:!!body?.requireResponse,responseHandler:String(body?.responseHandler||"").slice(0,120),options:choiceType?(rawOptions.length?rawOptions:["👍","👎"]):["ĐÃ HIỂU"],status:"pending",source:String(body?.source||"gm").slice(0,80),createdAt:now,response:null,respondedAt:null};
    if(gmArtifactStep){const useError=await this.markGmArtifactTurnUsed(meta,gmArtifactStep,loginId);if(useError)return useError}
    rows.push(interaction);await this.ctx.storage.put("interactions",rows.slice(-100));
    this.broadcast({type:"player_interaction",interaction});return j({ok:true,interaction});
  }
  async playerInteractionRespond(body){
    const loginId=normalizeLoginId(body?.loginId),id=String(body?.interactionId||""),response=String(body?.response||"").slice(0,40),rows=(await this.ctx.storage.get("interactions"))||[],meta=await this.ctx.storage.get("meta");
    const row=rows.find(x=>String(x?.id)===id&&normalizeLoginId(x?.loginId)===loginId);if(!row)return j({ok:false,error:"INTERACTION_NOT_FOUND"},404);
    if(row.status==="responded")return j({ok:true,interaction:row,idempotent:true});
    if(row.matchId&&meta?.matchId&&String(row.matchId)!==String(meta.matchId))return j({ok:false,error:"STALE_INTERACTION",message:"Tương tác này thuộc ván cũ."},409);
    const allowed=Array.isArray(row.options)&&row.options.length?new Set(row.options.map(String)):(row.type==="thumb_vote"||row.type==="assassin_mark"?new Set(["👍","👎"]):new Set(["ĐÃ HIỂU","OK","✓"]));
    if(!allowed.has(response))return j({ok:false,error:"INVALID_RESPONSE"},400);
    row.response=response;row.status="responded";row.respondedAt=new Date().toISOString();if(row.type==="assassin_mark")row.effectActive=false;row.responseVersion=1;await this.ctx.storage.put("interactions",rows.slice(-100));
    this.broadcast({type:"player_interaction_response",interaction:row});return j({ok:true,interaction:row});
  }
  async gmRename(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,name=normalizeRoomName(body?.roomName);if(!name)return j({ok:false,error:"INVALID_ROOM_NAME",message:"Tên Phòng không hợp lệ."},400);meta.roomName=name;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta)})}
  async gmReset(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,roomWasEnabled=meta.enabled!==false,now=new Date().toISOString(),transactionId=String(body?.transactionId||"").trim().slice(0,160),currentVersion=Number(meta.resetVersion||0),hasExpected=body?.expectedResetVersion!==undefined&&body?.expectedResetVersion!==null,expected=Number(body?.expectedResetVersion||0);
    const softPostGame=body?.postGame===true&&body?.preserveParticipants===true;
    if(softPostGame){
      const players=(await this.ctx.storage.get("players"))||{},nextVersion=currentVersion+1;
      for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.lastSeenAt=now}
      await this.ctx.storage.put("players",players);await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);
      for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
      meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.enabled=roomWasEnabled;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastResetTransactionId=transactionId||("postgame-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
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
    for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
    meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.seatsLocked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.cycleStartedAt=null;meta.currentNightTurnId=null;meta.autoPausedRemainingMs=null;meta.enabled=roomWasEnabled;meta.gameName="";meta.playerCount=0;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastResetTransactionId=transactionId||("reset-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
    await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}
    const room=publicRoom(meta),ack={ok:true,reset:true,hardReset:true,forcedEnd:body?.forceEnd===true,transactionId:meta.lastResetTransactionId,resetVersion:nextVersion,phase:room.phase,locked:room.locked,playersCount:0,assignmentsCount:0,room,players:[],removedPlayers};
    this.broadcast({type:"room_hard_reset",room,players:[],forcedEnd:ack.forcedEnd,resetVersion:nextVersion,transactionId:ack.transactionId});
    for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_HARD_RESET")}catch{}
    return j(ack)
  }
  async gmEnd(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,incomingMatchId=String(body?.matchId||""),now=new Date().toISOString();if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)return j({ok:false,error:"MATCH_MISMATCH",message:"Không thể kết thúc vì đây không phải ván đang chạy trong Phòng."},409);if(incomingMatchId)meta.matchId=incomingMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);const winnerFaction=normalizeWinnerFaction(body?.winnerFaction||body?.winner||body?.result?.winnerFaction||body?.result?.winner||""),winnerLabel=String(body?.winner||body?.winnerLabel||body?.result?.winner||winnerFaction||"").slice(0,180),endedMatchId=String(meta.matchId||"");meta.endedAt=now;meta.lastEndedMatchId=endedMatchId||null;meta.winnerFaction=winnerFaction||null;meta.winnerLabel=winnerLabel||null;meta.resultVersion=Number(meta.resultVersion||0)+1;meta.reopenAt=now;meta.phase="lobby";meta.status="waiting";meta.gmStage="seats";meta.locked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){};const players=(await this.ctx.storage.get("players"))||{};for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.reservedByGM=true}await this.ctx.storage.put("players",players);const rows=(await this.ctx.storage.get("interactions"))||[];for(const x of rows){if(x?.effectActive!==false&&(!x?.matchId||!endedMatchId||String(x.matchId)===endedMatchId))x.effectActive=false}await this.ctx.storage.put("interactions",rows.slice(-100));const room=publicRoom(meta),memberResults=[];for(const p of Object.values(players)){if(!p?.loginId)continue;const lid=normalizeLoginId(p.loginId),stored=await this.ctx.storage.get("roles:"+lid),legacy=await this.ctx.storage.get("role:"+lid),rrs=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]),factions=rrs.map(rr=>rr?.roleCard?.faction??rr?.faction??""),result=winnerFaction&&factions.some(f=>normalizeWinnerFaction(f)===winnerFaction)?"win":"loss";memberResults.push({loginId:p.loginId,roleName:rrs.map(rr=>rr?.roleName||rr?.roleCard?.name||"").filter(Boolean).join(" + "),faction:factions.filter(Boolean).join(" + "),result})}this.broadcast({type:"game_result",matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,room});this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),waitingRoom:true});return j({ok:true,room,matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,memberResults,waitingRoom:true,ready:true})}
  async alarm(){
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
      if(await this.runAutoAdvanceIfDue(meta))return;
      meta=await this.ctx.storage.get("meta");const due=this.roomExpiryDue(meta);
      if(Date.now()<due){await this.scheduleRoomAlarm(meta);return}
      const now=new Date().toISOString();meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=now;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_EXPIRED")}catch{}
    }catch(e){console.error("GMWW_ROOM_ALARM",e);try{await this.ctx.storage.setAlarm(Date.now()+60*1000)}catch(_){}}
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
    const legacyRole=await this.ctx.storage.get("role:"+loginId),storedRoles=await this.ctx.storage.get("roles:"+loginId),legacyRows=Array.isArray(storedRoles)&&storedRoles.length?storedRoles:(legacyRole?[legacyRole]:[]),activeSnapshot=currentPrivateDeliverySnapshot(await this.ctx.storage.get("deliverySnapshot:"+loginId),meta),roleRows=privateDeliveryRoles(activeSnapshot,legacyRows),roles=roleRows.map(privateRole),role=roles[0]||null,cardBackImage=(await this.ctx.storage.get("cardBackImage"))||null,rows=(await this.ctx.storage.get("interactions"))||[],sameMatch=x=>(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId)),interactions=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&x?.status==="pending"&&sameMatch(x)).slice(-10),effectTypes=new Set(["frozen","expelled","dead","assassin_mark"]),effectRows=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&sameMatch(x)&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())),latest={};for(const x of effectRows)latest[x.type]=x;const effects=Object.values(latest);
    const storedArtifact=await this.ctx.storage.get("artifact:"+loginId),
      // A role assignment also contains the committed artifact. Use it if the
      // legacy standalone Artifact key is absent; do not hide an assigned card.
      attachedArtifact=roleRows.find(r=>r?.artifact&&(!meta.matchId||String(r.matchId||"")===String(meta.matchId)))?.artifact||null,
      currentArtifact=activeSnapshot?privateDeliveryArtifact(activeSnapshot,storedArtifact):(storedArtifact&&(!meta.matchId||String(storedArtifact.matchId||"")===String(meta.matchId))?storedArtifact:attachedArtifact),
      artifact=currentArtifact?privateArtifact(currentArtifact):null,artifactCycleKey=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKey))||{accepted:[]};
    const deliveryManifest=buildPrivateDeliveryManifest({roomCode:meta.code,loginId,matchId:meta.matchId,matchRevision:meta.matchRevision,deliveryVersion:meta.deliveryVersion,publishedAt:meta.roleDeliveredAt,assignments:(await this.ctx.storage.get("assignments"))||[],roles:roleRows,artifact:currentArtifact});
    const deliveryAck=(await this.ctx.storage.get("deliveryAck:"+loginId))||null;
    deliveryManifest.receivedAt=deliveryAck?.deliveryId===deliveryManifest.deliveryId?deliveryAck.receivedAt:null;
    const swapRequests=((await this.ctx.storage.get('seatSwaps'))||[]).filter(x=>x.toId===key&&x.status==='pending'&&x.expiresAt>Date.now()).map(x=>({id:x.id,fromName:x.fromName,fromSeat:x.fromSeat,toSeat:x.toSeat,expiresAt:x.expiresAt}));
    return j({ok:true,swapRequests,room:publicRoom(meta),player:publicPlayer(p),role,roles,artifact,artifactExpected:deliveryManifest.artifactExpected,deliveryManifest,artifactCycle:{cycleKey:artifactCycleKey,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:Math.max(0,Math.min(30,Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3)))},multiAssign:!!meta.multiAssign,cardBackImage,interactions,effects,resumed:!!p.restoredAt})
  }
  async playerDeliveryReceived(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");
    if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const players=(await this.ctx.storage.get("players"))||{},player=players["member:"+loginId];
    if(!loginId||!player||player.kind!=="member")return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},403);
    if(!["role_delivery","running"].includes(String(meta.phase||"").toLowerCase()))return j({ok:false,error:"ROLE_DELIVERY_NOT_STARTED"},409);
    const stored=(await this.ctx.storage.get("roles:"+loginId))||[],legacy=await this.ctx.storage.get("role:"+loginId),legacyRows=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]);
    const snapshot=currentPrivateDeliverySnapshot(await this.ctx.storage.get("deliverySnapshot:"+loginId),meta),roles=privateDeliveryRoles(snapshot,legacyRows);
    const savedArtifact=await this.ctx.storage.get("artifact:"+loginId),artifact=snapshot?privateDeliveryArtifact(snapshot,savedArtifact):(savedArtifact||roles.find(row=>row?.artifact)?.artifact||null);
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
    if(!artifact)return j({ok:false,error:"ARTIFACT_NOT_FOUND"},404);
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
      const targetId=String(body?.targetId||body?.originalTargetId||"").slice(0,160);if(targetId){const players=(await txn.get("players"))||{};if(!players[targetId])return{ok:false,status:400,error:"INVALID_ARTIFACT_TARGET"}}
      if(meta.matchId&&artifact.matchId&&String(meta.matchId)!==String(artifact.matchId))return{ok:false,status:409,error:"STALE_ARTIFACT"};
      const artifactId=String(artifact.artifactId||""),playerId="member:"+loginId,useKey="artifactUse:"+loginId+":"+artifactId,oldUse=await txn.get(useKey),cycle=(await txn.get("artifactCycle:"+cycleKey))||{cycleKey,accepted:[]};
      if(artifact.singleUse===true&&oldUse)return{ok:false,status:409,error:"ARTIFACT_ALREADY_USED"};
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
      const activation={requestId,playerId,loginId,artifactId,artifactName:String(artifact.artifactName||""),matchId:String(meta.matchId||""),cycleKey,night:Math.max(1,Number(meta.cycleNight||1)),phase:String(meta.cyclePhase||""),originalTargetId:String(body?.targetId||body?.originalTargetId||"").slice(0,160),finalTargetId:String(body?.finalTargetId||body?.targetId||"").slice(0,160),status:"accepted",createdAt:now};
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
        [from.seatId,p.seatId]=[p.seatId,from.seatId];for(const person of [from,p]){clearPlayerMovement(person);const pos=villageLayout.positions(meta.seatCount)[person.seatId-1];person.positionX=pos.x;person.positionY=pos.y;person.ready=person.reservedByGM===true}await this.ctx.storage.put('players',players);
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
    p.gameCharacterId=gameCharacterId;p.seatId=seatId;p.ready=p.reservedByGM===true;clearPlayerMovement(p);if(seatId){const point=villageLayout.positions(seatCount)[seatId-1];p.positionX=point.x;p.positionY=point.y;}p.lastHeartbeatAt=Date.now();p.lastSeenAt=new Date().toISOString();players[id]=p;await this.ctx.storage.put("players",players);
    meta.updatedAt=p.lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,setupUpdated:id});
    return j({ok:true,room,player:publicPlayer(p),players:publicPlayers})
  }
  async playerMove(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta.phase||"lobby").toLowerCase();if(meta.seatsLocked)return j({ok:false,error:"SEATS_LOCKED",message:"Ghế đã được GM khóa."},409);if(!["lobby","waiting","role_delivery"].includes(phase))return j({ok:false,error:"MOVE_LOCKED_IN_MATCH",message:"Không thể di chuyển chỗ ngồi khi ván đang chạy."},409);

    const id="member:"+loginId,players=(await this.ctx.storage.get("players"))||{},p=players[id];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},404);
    if(!normalizeGameCharacterId(p.gameCharacterId))return j({ok:false,error:"ACCOUNT_CHARACTER_REQUIRED"},409);
    const seatCount=normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12),targetSeatId=body?.seatId==null?null:normalizeSeatId(body.seatId,seatCount);
    if(body?.seatId!=null)return j({ok:false,error:"GM_SEAT_ASSIGNMENT_REQUIRED",message:"Ghế chỉ do GM phân phối."},403);
    if(!targetSeatId&&normalizeSeatId(p.seatId,seatCount))return j({ok:false,error:"SEATED_MOVE_REQUIRES_TARGET",message:"Đã ngồi ghế. Hãy chọn ghế mới để đổi chỗ."},409);
    if(targetSeatId){
      if(Number(p.seatId||0)===targetSeatId)return j({ok:true,already:true,room:publicRoom(meta),player:publicPlayer(p),players:Object.values(players).map(publicPlayer)});
      const conflict=seatClaimConflict(players,id,targetSeatId);if(conflict)return j({ok:false,error:"SEAT_TAKEN",message:"Ghế "+targetSeatId+" đã có người chọn.",seatId:targetSeatId,occupant:publicPlayer(conflict.player)},409);
    }
    const now=Date.now(),fallback=villageLayout.spawn(id),from=villageLayout.clampPoint(currentMovementPosition(p,now,fallback.x,fallback.y).x,currentMovementPosition(p,now,fallback.x,fallback.y).y),autoMotionPhase=body?.autoMotionPhase==="gather"?"gather":body?.autoMotionPhase==="roam"?"roam":null,to=targetSeatId?villageLayout.positions(seatCount)[targetSeatId-1]:autoMotionPhase==="gather"?villageAutoPoint(id,Math.floor(now/1000),villageLayout):villageLayout.clampPoint(body?.x,body?.y),distance=Math.hypot(to.x-from.x,to.y-from.y),duration=Math.max(450,Math.min(4200,Math.trunc(Number(body?.durationMs)||distance*42||650))),moveId=String(body?.moveId||crypto.randomUUID()).slice(0,120);
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
    const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);
    let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;const now=new Date().toISOString(),phase=String(meta.phase||"lobby").toLowerCase(),inProgress=["role_delivery","running","started","game","playing"].includes(phase);let player;
    if(body?.member?.loginId){const m=body.member,key="member:"+m.loginId,evicted=(await this.ctx.storage.get("evictedMembers"))||[];if(evicted.includes(normalizeLoginId(m.loginId))&&!players[key])return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"GM đã mời bạn ra khỏi Phòng. Hãy chờ GM gọi lại."},403);const resumeExisting=normalizeRoomCode(m.currentRoomCode||"")===normalizeRoomCode(meta.code||""),reserved=players[key]?.reservedByGM===true,known=!!players[key]||resumeExisting||reserved;if(meta.enabled===false&&!known)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);if(inProgress&&!known)return j({ok:false,error:"ROOM_IN_PROGRESS",message:"Ván đang chơi. Chỉ Thành Viên đã tham dự mới có thể vào lại trận."},423);player={...players[key],participantId:key,kind:"member",loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:normalizeGameCharacterId(m.gameCharacterId)||normalizeGameCharacterId(players[key]?.gameCharacterId)||null,seatId:normalizeSeatId(players[key]?.seatId,meta.seatCount),ready:reserved===true||(players[key]?.ready??m.ready??false),reservedByGM:reserved,joinedAt:players[key]?.joinedAt||now,lastSeenAt:now,lastHeartbeatAt:Date.now(),restoredAt:!players[key]&&resumeExisting?now:players[key]?.restoredAt||null};if(!playerSetupComplete(meta,player)&&!player.reservedByGM)player.ready=false;players[key]=player}
    else{const displayName=normalizeDisplayName(body?.guest?.displayName),avatarId=String(body?.guest?.avatarId||"");if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_GUEST_NAME"},400);if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR"},400);const guestId=String(body?.guest?.guestId||crypto.randomUUID()),key="guest:"+guestId;if(meta.enabled===false&&!players[key])return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);if(inProgress&&!players[key])return j({ok:false,error:"ROOM_IN_PROGRESS",message:"Ván đang chơi. Người ngoài không thể tham gia giữa trận."},423);player={participantId:key,kind:"guest",guestId,displayName,avatarId,gameCharacterId:normalizeGameCharacterId(players[key]?.gameCharacterId)||null,seatId:normalizeSeatId(players[key]?.seatId,meta.seatCount),ready:players[key]?.ready||false,joinedAt:players[key]?.joinedAt||now,lastSeenAt:now,lastHeartbeatAt:Date.now()};if(!playerSetupComplete(meta,player)&&!player.reservedByGM)player.ready=false;players[key]=player}
    if(!normalizeSeatId(player?.seatId,meta.seatCount)&&player?.positionX==null&&player?.movementStatus!=="moving"){
      const portalNow=Date.now(),from={x:50,y:12},to={x:50,y:23};
      player.positionX=from.x;player.positionY=from.y;player.moveId="portal:"+crypto.randomUUID();player.moveFromX=from.x;player.moveFromY=from.y;player.moveToX=to.x;player.moveToY=to.y;player.moveStartedAt=portalNow;player.moveDurationMs=1100;player.moveTargetSeatId=null;player.movementStatus="moving";player.villageActivity="portal_arrival";player.ready=player.reservedByGM===true;players[player.participantId]=player;
    }
    await this.ctx.storage.put("players",players);meta.locked=false;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,player:publicPlayer(player),room:publicRoom(meta),resumed:!!player.restoredAt,setupRequired:!playerSetupComplete(meta,player)});
  }
  async ready(body){const id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},404);if(!!body.ready&&!players[id].reservedByGM&&!playerSetupComplete(meta,players[id]))return j({ok:false,error:"SETUP_REQUIRED",message:"Hãy chọn Nhân Vật và vị trí ngồi trước khi Sẵn Sàng."},409);players[id].ready=players[id].reservedByGM===true||!!body.ready;players[id].lastHeartbeatAt=Date.now();players[id].lastSeenAt=new Date().toISOString();await this.ctx.storage.put("players",players);meta.updatedAt=players[id].lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,player:publicPlayer(players[id])})}
  async heartbeat(body){const id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(!id||!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},404);const now=new Date().toISOString();players[id].lastHeartbeatAt=Date.now();players[id].lastSeenAt=now;if(players[id].reservedByGM===true)players[id].ready=true;else if(body&&Object.prototype.hasOwnProperty.call(body,"ready"))players[id].ready=!!body.ready;await this.ctx.storage.put("players",players);meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,serverTime:Date.now(),presenceChanged:true});return j({ok:true,player:publicPlayer(players[id]),room})}
  async leave(body){const players=(await this.ctx.storage.get("players"))||{},id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!id||!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn không còn ở trong phòng."},404);delete players[id];await this.ctx.storage.put("players",players);if(meta){meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta)}for(const ws of this.ctx.getWebSockets()){try{if(ws.deserializeAttachment()?.participantId===id)ws.close(1000,"PLAYER_LEFT_ROOM")}catch{}}this.broadcast({type:"room_state",room:meta?publicRoom(meta):null,players:Object.values(players).map(publicPlayer)});return j({ok:true,left:true})}
  async websocket(request,url){if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return new Response("Expected WebSocket upgrade",{status:426});const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);if(meta.enabled===false)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt."},423);const participantId=url.searchParams.get("participantId")||null;let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(participantId&&!players[participantId])return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},403);const now=new Date().toISOString();if(participantId&&players[participantId]){players[participantId].lastHeartbeatAt=Date.now();players[participantId].lastSeenAt=now;await this.ctx.storage.put("players",players)}const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({participantId,connectedAt:now});const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer),payload={type:"room_state",room,players:publicPlayers,serverTime:Date.now(),presenceChanged:true};server.send(JSON.stringify(payload));this.broadcast(payload);return new Response(null,{status:101,webSocket:client})}
  async webSocketMessage(ws,message){let d;try{d=JSON.parse(typeof message==="string"?message:new TextDecoder().decode(message))}catch{return}if(d?.type!=="ping")return;const participantId=ws.deserializeAttachment()?.participantId||null,meta=await this.ctx.storage.get("meta"),players=(await this.ctx.storage.get("players"))||{},now=new Date().toISOString();if(participantId&&players[participantId]){players[participantId].lastHeartbeatAt=Date.now();players[participantId].lastSeenAt=now;await this.ctx.storage.put("players",players)}try{ws.send(JSON.stringify({type:"pong",at:now,serverTime:Date.now()}))}catch{}if(meta&&participantId&&players[participantId])this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now(),presenceChanged:true})}
  async markSocketDisconnected(ws){const participantId=ws?.deserializeAttachment?.()?.participantId||null;if(!participantId){this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length});return}const other=this.ctx.getWebSockets().some(s=>s!==ws&&s.deserializeAttachment?.()?.participantId===participantId);if(other)return;const players=(await this.ctx.storage.get("players"))||{},meta=await this.ctx.storage.get("meta");if(players[participantId]){players[participantId].lastHeartbeatAt=0;players[participantId].lastSeenAt=new Date().toISOString();await this.ctx.storage.put("players",players)}if(meta)this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),serverTime:Date.now(),presenceChanged:true});this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length})}
  async webSocketClose(ws){await this.markSocketDisconnected(ws)} async webSocketError(ws){await this.markSocketDisconnected(ws)} broadcast(payload){const e=JSON.stringify(payload);for(const s of this.ctx.getWebSockets())try{s.send(e)}catch{}}
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
  const admissionPolicy=url.pathname==="/api/gm/ai-support/chat"&&request.method==="POST"?AI_SUPPORT_REQUEST_LIMIT:publicEntryPolicy(request.method,url.pathname);
  if(admissionPolicy){
    const admissionResponse=await applyPublicEntryRateLimit(env,request,admissionPolicy);
    if(admissionResponse)return admissionResponse;
  }
  if(url.pathname==="/gmww-members-live.js"&&request.method==="GET")return new Response(patchPrivatePlayerCards(gmwwMembersLiveScript).replaceAll("__GMWW_WEB_VERSION__",VERSION),{headers:{"content-type":"application/javascript; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0","x-content-type-options":"nosniff"}});
  if(url.pathname==="/api/operations/tasks"&&request.method==="GET"){
    try{const work=await fetchGmwwTasks();return j({ok:true,source:"github_public_issues",generatedAt:new Date().toISOString(),...work})}
    catch(error){const backup=normalizeGmwwTasks(GMWW_TASK_SNAPSHOT);return j({ok:true,source:"github_public_snapshot",fallback:true,generatedAt:GMWW_TASK_SNAPSHOT_GENERATED_AT,...backup})}
  }
  // Private GM-only AI Support. OpenAI credentials are Cloudflare secrets.
  if(url.pathname==="/api/gm/ai-support/config"&&request.method==="GET")
    return j({ok:true,configured:aiSupportEnabled(env),provider:'OpenAI',readOnly:true});
  if(url.pathname==="/api/gm/ai-support/chat")
    return handleAiSupport(request,env,{serverVersion:VERSION});
  if(url.pathname==="/api/health"&&request.method==="GET")return j({ok:true,project:PROJECT,service:"GMWW Online",status:"online",version:VERSION,serverVersion:VERSION,webVersion:VERSION,runtimeVersion:VERSION});
  if(url.pathname==="/api/health/deep"&&request.method==="GET"){
    try{
      const ready=await memberStore(env).fetch("https://member.internal/health/storage");
      if(!ready.ok)return j({ok:false,project:PROJECT,status:"degraded",checks:{memberStorage:"unavailable"}},503);
      return j({ok:true,project:PROJECT,status:"ready",version:VERSION,checks:{memberStorage:"ready"}});
    }catch{return j({ok:false,project:PROJECT,status:"degraded",checks:{memberStorage:"unavailable"}},503)}
  }
  if(url.pathname==="/api/character-engine/manifest"&&request.method==="GET")return j({ok:true,engineVersion:CHARACTER_ENGINE_VERSION,master:CHARACTER_MASTER,characters:createCharacterManifest()});
  if(url.pathname==="/api/update/manifest"&&request.method==="GET"){
    if(!env.ASSETS)return j({ok:false,error:"UPDATE_MANIFEST_UNAVAILABLE"},503);
    try{
      const currentVersion=VERSION.replace(/^V/i,"");
      const currentNativeShell=NATIVE_SHELL_VERSION===currentVersion;
      const validRuntime=m=>String(m?.releaseVersion||"")===currentVersion&&String(m?.releaseType||"")==="runtime"&&String(m?.runtimeVersion||"")===currentVersion&&String(m?.shellVersion||"")===String(NATIVE_SHELL_VERSION)&&Array.isArray(m?.runtime?.files)&&m.runtime.files.length>0;
      const runtimeReady=m=>isRuntimePackageReady({assets:env.ASSETS,requestUrl:request.url,manifest:m,version:currentVersion});
      const recoverOlderInstalledRuntime=()=>recoverLegacyRuntimeManifest({assets:env.ASSETS,requestUrl:request.url,version:currentVersion,shellVersion:NATIVE_SHELL_VERSION,installedVersion:url.searchParams.get("current")||""});
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
        const versioned=await readVersionedManifest();
        if(validRuntime(versioned)&&await runtimeReady(versioned))return j({ok:true,...(selectVerifiedRuntimeV383Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV382Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV381Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV378Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV376Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV373Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV372Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV371Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV370Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV369Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV368Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV363Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV362Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV361Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV360Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV359Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV358Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV354Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV353Delta(versioned,url.searchParams.get("current"))||selectVerifiedRuntimeV352Delta(versioned,url.searchParams.get("current"))||selectLegacyV350RuntimeDelta(versioned,url.searchParams.get("current"))||versioned),checkedAt:new Date().toISOString()});
      }

      const manifestUrl=new URL(request.url);manifestUrl.pathname="/updates/latest.json";manifestUrl.search="?v="+encodeURIComponent(VERSION)+"&channel="+encodeURIComponent(UPDATE_CHANNEL_REV)+"&ts="+Date.now();
      const res=await env.ASSETS.fetch(new Request(manifestUrl.toString(),{method:"GET",headers:{"cache-control":"no-cache"}}));
      if(!res.ok){
        if(!currentNativeShell){const rescue=await recoverOlderInstalledRuntime();if(rescue)return j(rescue);}
        return j({ok:false,error:currentNativeShell?"UPDATE_MANIFEST_NOT_FOUND":"RUNTIME_MANIFEST_NOT_READY",releaseVersion:currentVersion,runtimeVersion:currentVersion,shellVersion:NATIVE_SHELL_VERSION},currentNativeShell?404:503);
      }
      const manifest=await res.json();
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
        if(validRuntime(manifest)&&await runtimeReady(manifest))return j({ok:true,...(selectVerifiedRuntimeV383Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV382Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV381Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV378Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV377Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV376Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV375Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV373Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV372Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV371Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV370Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV369Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV368Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV366Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV365Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV364Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV363Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV362Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV361Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV360Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV359Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV358Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV354Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV353Delta(manifest,url.searchParams.get("current"))||selectVerifiedRuntimeV352Delta(manifest,url.searchParams.get("current"))||selectLegacyV350RuntimeDelta(manifest,url.searchParams.get("current"))||manifest),checkedAt:new Date().toISOString()});
        const rescue=await recoverOlderInstalledRuntime();if(rescue)return j(rescue);
        return j({ok:false,error:"RUNTIME_MANIFEST_NOT_READY",releaseVersion:currentVersion,runtimeVersion:currentVersion,shellVersion:NATIVE_SHELL_VERSION},503);
      }
      if(latestMismatch||latestLostRuntime){
        const versioned=await readVersionedManifest();
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
  if(url.pathname==="/api/game-characters"&&request.method==="GET")return j({ok:true,count:GAME_CHARACTER_COUNT,frameCount:6,characters:gameCharacterCatalog()});
  const gameCharacterFrameRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[1-3][0-9]|4[0-2]))\/frame\/([1-6])$/);if(gameCharacterFrameRoute&&request.method==="GET")return gameCharacterFrame(env,gameCharacterFrameRoute[1],Number(gameCharacterFrameRoute[2]),request);
  const gameCharacterImageRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[1-3][0-9]|4[0-2]))\/image$/);if(gameCharacterImageRoute&&request.method==="GET")return gameCharacterImage(env,gameCharacterImageRoute[1],request);
  if(url.pathname==="/api/rooms"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/directory/rooms/list");
  if(url.pathname==="/api/rooms"&&request.method==="POST")return createRoom(env,url,request);
  const room=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);if(room&&request.method==="GET")return publicRoomState(env,room[1],request);
  const joinApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);if(joinApi&&request.method==="POST")return joinRoom(env,joinApi[1],request);
  const readyApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/ready$/);if(readyApi&&request.method==="POST")return readyRoom(env,readyApi[1],request);
  const heartbeatApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/heartbeat$/);if(heartbeatApi&&request.method==="POST")return heartbeatRoom(env,heartbeatApi[1],request);
  const leaveApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/leave$/);if(leaveApi&&request.method==="POST")return leaveRoomApi(env,leaveApi[1],request);
  const playerState=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/me$/);if(playerState&&request.method==="GET")return playerPrivateState(env,playerState[1],request);
  const deliveryReceived=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/delivery\/received$/);if(deliveryReceived&&request.method==="POST")return playerDeliveryReceivedApi(env,deliveryReceived[1],request);
  const roleViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role\/viewed$/);if(roleViewed&&request.method==="POST")return playerRoleViewedApi(env,roleViewed[1],request);
  const artifactViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/viewed$/);if(artifactViewed&&request.method==="POST")return playerArtifactViewedApi(env,artifactViewed[1],request);
  const artifactActivate=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/activate$/);if(artifactActivate&&request.method==="POST")return playerArtifactActivateApi(env,artifactActivate[1],request);
  const playerInteraction=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/interaction\/respond$/);if(playerInteraction&&request.method==="POST")return playerInteractionRespondApi(env,playerInteraction[1],request);
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
  const gmParticipants=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/participants$/);if(gmParticipants&&request.method==="POST")return gmRoomParticipants(env,gmParticipants[1],request);
  const gmRoomSettingsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/room-settings$/);if(gmRoomSettingsRoute&&request.method==="POST")return roomProxy(env,gmRoomSettingsRoute[1],"/gm/room-settings",request);
  const gmStageRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/stage$/);if(gmStageRoute&&request.method==="POST")return roomProxy(env,gmStageRoute[1],"/gm/stage",request);
  const gmSeatRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seat$/);if(gmSeatRoute&&request.method==="POST")return roomProxy(env,gmSeatRoute[1],"/gm/seat",request);
  const gmRandomSeatsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seats\/randomize-remaining$/);if(gmRandomSeatsRoute&&request.method==="POST")return roomProxy(env,gmRandomSeatsRoute[1],"/gm/seats/randomize-remaining",request);
  const gmMoveRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/move$/);if(gmMoveRoute&&request.method==='POST')return roomProxy(env,gmMoveRoute[1],'/gm/move',request);
  const gmSeatLockRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/seat-lock$/);if(gmSeatLockRoute&&request.method==="POST")return roomProxy(env,gmSeatLockRoute[1],"/gm/seat-lock",request);
  const gmCycle=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/cycle$/);if(gmCycle&&request.method==="POST")return roomProxy(env,gmCycle[1],"/gm/cycle",request);
  const gmTurn=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/turn$/);if(gmTurn&&request.method==="POST")return roomProxy(env,gmTurn[1],"/gm/turn",request);
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

async function createRoom(env,url,request){const body=await safeJson(request)||{};for(let i=0;i<8;i++){const code=generateRoomCode(),r=await roomStub(env,code).fetch("https://room.internal/init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code,roomName:body.roomName||"",roomMode:body.roomMode||"online",enabled:Object.prototype.hasOwnProperty.call(body,"enabled")?body.enabled!==false:true,seatMoveMode:body.seatMoveMode||"instant",seatCount:body.seatCount,gameConfig:body.gameConfig||null,cardBackImage:body.cardBackImage||null})});if(r.status===201){const data=await r.json(),p=url.protocol==="https:"?"wss:":"ws:";await syncRoomDirectory(env,code);return j({ok:true,roomCode:code,roomName:data.room?.roomName||normalizeRoomName(body.roomName)||("Phòng "+code),gmToken:data.gmToken,joinUrl:`${url.origin}/${code}`,websocketUrl:`${p}//${url.host}/ws/${code}`},201)}if(r.status!==409)return j({ok:false,error:"ROOM_CREATE_FAILED"},500)}return j({ok:false,error:"ROOM_CODE_EXHAUSTED"},503)}
async function joinRoom(env,raw,request){const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const body=await safeJson(request);if(body?.token){const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:{Authorization:"Bearer "+body.token}}));if(!me.ok)return me;const data=await me.json();const joined=await roomStub(env,code).fetch("https://room.internal/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({member:data.member})});if(joined.ok){await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:data.member.loginId,roomCode:code,ready:false})});await syncRoomDirectory(env,code)}return joined}const joined=await roomStub(env,code).fetch("https://room.internal/join",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guest:body?.guest})});if(joined.ok)await syncRoomDirectory(env,code);return joined}
async function readyRoom(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/ready",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(res.ok){if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:code,ready:!!body.ready})});await syncRoomDirectory(env,code)}return res}
async function heartbeatRoom(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(res.ok){if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:code,ready:!!body.ready})});await syncRoomDirectory(env,code)}return res}
async function leaveRoomApi(env,raw,request){const code=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,code).fetch("https://room.internal/leave",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});if(String(body?.participantId||"").startsWith("member:"))await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:String(body.participantId).slice(7),roomCode:null,ready:false})});if(res.ok)await syncRoomDirectory(env,code);return res}
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
  for(const p of (Array.isArray(data?.players)?data.players:[]))if(p?.loginId&&!await syncPresence(p.loginId,code,true,null,true))failures.push(p.loginId);
  // Retry both newly removed accounts and incomplete releases from an earlier disband.
  // The storage guard preserves anyone who has already joined a different room.
  const releaseLogins=new Set((Array.isArray(data?.removedPlayers)?data.removedPlayers:[]).map(p=>normalizeLoginId(p?.loginId)).filter(Boolean));
  if(data?.disbanded)for(const loginId of (Array.isArray(data?.reconcileLogins)?data.reconcileLogins:[]))if(normalizeLoginId(loginId))releaseLogins.add(normalizeLoginId(loginId));
  for(const loginId of releaseLogins)if(!await syncPresence(loginId,null,false,code))failures.push(loginId);
  await syncRoomDirectory(env,code);
  if(failures.length)return j({ok:false,error:"ROSTER_PRESENCE_PENDING",message:"Phòng đã giải tán, nhưng có tài khoản chưa xác nhận trở về Sảnh chờ.",pendingCount:failures.length,removedCount:Number(data.removedCount||0)},502);
  return res
}
async function gmRoomConfig(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/config",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomEnabled(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/enabled",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.enabled===false){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:true})})}catch{}}try{await memberStore(env).fetch(new Request("https://member.internal/global-settings/gm-presence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({online:true,roomCode:null})}))}catch{}}await syncRoomDirectory(env,c)}return res}
async function gmRoomLock(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/lock",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomKick(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/kick",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),p=data?.player||{};if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}await syncRoomDirectory(env,c)}return res}
async function gmRoomRename(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/rename",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomReset(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/reset",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.hardReset===false&&data?.preserveParticipants===true){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:c,ready:true})})}catch{}}}else{for(const p of (Array.isArray(data?.removedPlayers)?data.removedPlayers:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:true})})}catch{}}}await syncRoomDirectory(env,c)}return res}
async function gmRoomEnd(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/end",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),room=data?.room||{};for(const r of (Array.isArray(data?.memberResults)?data.memberResults:[])){try{await memberStore(env).fetch("https://member.internal/members/record-result",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,matchId:data.matchId||room.matchId,roomCode:c,roomName:room.roomName,gameName:room.gameName,roleName:r.roleName,faction:r.faction,winnerFaction:data.winnerFaction||room.winnerFaction,result:r.result,playedAt:room.endedAt})})}catch(e){console.warn("GMWW_RESULT_RECORD",r?.loginId,e)}try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,roomCode:c,ready:true})})}catch(e){console.warn("GMWW_END_LOBBY_PRESENCE",r?.loginId,e)}}await syncRoomDirectory(env,c)}return res}
async function gmRoomDelete(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);if(bearer(request)!==GM_SYNC_TOKEN){const probe=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(!probe.ok&&probe.status!==404)return probe}let res;try{res=await roomStub(env,c).fetch("https://room.internal/gm/delete",{method:"POST",headers:request.headers})}catch(e){res=null}let data={};if(res)try{data=await res.clone().json()}catch(_){}if(res&&res.status!==404&&!res.ok)return res;const players=Array.isArray(data?.players)?data.players:[];for(const p of players){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}}await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:c})});return j({ok:true,deleted:true,alreadyGone:!!(res&&res.status===404),code:c,room:data?.room||null})}

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
function sanitizeGameConfig(v){
  if(!v||typeof v!=="object")return null;
  const clampSec=x=>Math.max(0,Math.min(3600,Math.trunc(Number(x)||0))),defaultActionSec=clampSec(v?.timing?.defaultActionSec??v?.defaultActionSec??45);
  const roles=Array.isArray(v.roles)?v.roles.slice(0,100).map(r=>{
    const src=(r&&typeof r==="object")?r:{};
    const nested=(src.role&&typeof src.role==="object")?src.role:{};
    const roleId=String(src.roleId||src.id||nested.id||nested.roleId||"").slice(0,120);
    const roleName=String(src.roleName||src.name||nested.name||nested.roleName||"").slice(0,120);
    const faction=String(src.faction||src.factionName||nested.faction||nested.factionName||"").slice(0,120);
    const description=String(src.description||src.roleDescription||nested.description||nested.roleDescription||"").slice(0,6000);
    const actionDurationSec=clampSec(src.actionDurationSec??src.durationSec??defaultActionSec);
    return {roleId,roleName,faction,description,count:Math.max(1,Math.min(20,Number(src.count||1))),order:Number(src.order||0),actionDurationSec};
  }):[];
  const timing={villageDiscussionSec:clampSec(v?.timing?.villageDiscussionSec??v?.villageDiscussionSec??300),wolfDiscussionSec:clampSec(v?.timing?.wolfDiscussionSec??v?.wolfDiscussionSec??60),defaultActionSec,artifactActionSec:clampSec(v?.timing?.artifactActionSec??30),autoAdvance:v?.timing?.autoAdvance!==false};
  return{id:String(v.id||"").slice(0,120),name:String(v.name||"Game Online").slice(0,120),playerCount:Math.max(0,Math.min(100,Number(v.playerCount||0))),roles,artifactsEnabled:v.artifactsEnabled===false?false:(v.artifactsEnabled===true||(Array.isArray(v.artifacts)&&v.artifacts.length>0)),artifacts:v.artifactsEnabled===false?[]:(Array.isArray(v.artifacts)?v.artifacts.slice(0,100).map(a=>({artifactId:String(a?.artifactId||"").slice(0,100),order:Number(a?.order||0)})):[]),artifactLimitPerCycle:Math.max(0,Math.min(30,Math.trunc(Number(v.artifactLimitPerCycle??3)||0))),timing}
}
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
function sanitizePlayerArtifactCard(v){
  const x=(v&&typeof v==="object")?v:{},actions=Array.isArray(x.actions)?x.actions.slice(0,40).map(a=>({id:String(a?.id||"").slice(0,120),name:String(a?.name||"Hành Động").slice(0,160),description:String(a?.description||"").slice(0,3000),limits:a?.limits??null})):[];
  const artworkAssetId=x.artworkAssetId==null?(x.artworkId==null?null:String(x.artworkId).slice(0,180)):String(x.artworkAssetId).slice(0,180);
  return{version:Number(x.version||x.playerCardVersion||1),name:String(x.name||x.artifactName||"Artifact").slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),actions,limits:x.limits??null,singleUse:x.singleUse===true,priorityFirst:typeof (x.priorityFirst??x.artifact?.priorityFirst)==="boolean"?(x.priorityFirst??x.artifact.priorityFirst):defaultPriorityFirst(x.name||x.artifactName),artworkAssetId,artworkId:artworkAssetId}
}
function privateArtifact(a){return{matchId:a.matchId||null,matchRevision:Number(a.matchRevision||0),artifactId:a.artifactId,artifactName:a.artifactName,description:a.description,artifactImage:a.artifactImage||null,artworkAssetId:a.artworkAssetId||a.artworkId||null,artworkId:a.artworkAssetId||a.artworkId||null,artworkAvailable:a.artworkAvailable!==false,artifactCard:a.artifactCard||null,singleUse:a.singleUse===true,deliveredAt:a.deliveredAt||null,viewedAt:a.viewedAt||null,usedAt:a.usedAt||null,lastActivation:a.lastActivation||null}}
function currentArtifactCycleKey(meta){const n=Math.max(1,Number(meta?.cycleNight||1)),phase=String(meta?.cyclePhase||"").toLowerCase();return phase==="day"||phase==="morning"?String(meta?.matchId||"match")+":day:"+n:artifactCycleKey(meta?.matchId||"match",n)}
function gameLabelKey(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function sanitizePlayerRoleCard(v){
  const x=(v&&typeof v==="object")?v:{};
  const actions=Array.isArray(x.actions)?x.actions.slice(0,40).map(a=>({id:String(a?.id||"").slice(0,120),name:String(a?.name||"Hành Động").slice(0,160),description:String(a?.description||"").slice(0,3000),limits:a?.limits??null})):[];
  const artworkAssetId=x.artworkAssetId==null?(x.artworkId==null?null:String(x.artworkId).slice(0,180)):String(x.artworkAssetId).slice(0,180);
  return{version:Number(x.version||x.playerCardVersion||7),name:String(x.name||x.roleName||"").slice(0,120),faction:x.faction==null?null:String(x.faction).slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),objective:x.objective==null?null:String(x.objective).slice(0,3000),actions,limits:x.limits??null,artworkAssetId,artworkId:artworkAssetId}
}
function mergePlayerRoleCard(base,over){
  const b=(base&&typeof base==="object")?base:{},o=(over&&typeof over==="object")?over:{};
  const artworkAssetId=o.artworkAssetId??o.artworkId??b.artworkAssetId??b.artworkId??null;
  return{version:Number(o.version||b.version||7),name:o.name||b.name||"",faction:o.faction??b.faction??null,information:o.information??b.information??null,objective:o.objective??b.objective??null,actions:(Array.isArray(o.actions)&&o.actions.length)?o.actions:(Array.isArray(b.actions)?b.actions:[]),limits:o.limits??b.limits??null,artworkAssetId,artworkId:artworkAssetId}
}
function privateRole(r){return{matchId:r.matchId||null,matchRevision:Number(r.matchRevision||0),roleId:r.roleId,roleName:r.roleName,faction:r.faction,description:r.description,order:r.order,roleImage:r.roleImage||null,artworkAssetId:r.artworkAssetId||r.artworkId||null,artworkId:r.artworkAssetId||r.artworkId||null,artworkAvailable:r.artworkAvailable!==false,playerCardVersion:r.playerCardVersion||7,roleCard:r.roleCard||null,deliveredAt:r.deliveredAt,viewedAt:r.viewedAt||null}}
function normalizeWinnerFaction(v){const raw=String(v||"").trim();if(!raw)return"";const n=raw.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();if(n.includes("phe dan"))return"Phe Dân";if(n.includes("phe soi"))return"Phe Sói";if(n.includes("phe ba")||n.includes("phe thu 3")||n.includes("phe thu ba"))return"Phe Ba";if(n.includes("phe khac"))return"Phe Khác";return raw.replace(/^[^A-Za-zÀ-ỹ0-9]+/u,"").trim().slice(0,120)}
const GAME_CHARACTER_COUNT=20;
function normalizeRoomMode(v){return String(v||"").trim().toLowerCase()==="offline"?"offline":"online"}
function normalizeSeatMoveMode(v){return String(v||"").trim().toLowerCase()==="walk"?"walk":"instant"}
function normalizeVillageCoord(v,fallback=50){const n=Number(v);return Number.isFinite(n)?Math.max(4,Math.min(96,Math.round(n*100)/100)):Math.max(4,Math.min(96,Number(fallback)||50))}
function currentMovementPosition(p,now=Date.now(),fallbackX=50,fallbackY=78){if(p?.movementStatus==='moving'&&p?.moveStartedAt&&p?.moveDurationMs)return villageLayout.interpolate(p,now);return{x:normalizeVillageCoord(p?.positionX,fallbackX),y:normalizeVillageCoord(p?.positionY,fallbackY)}}
function clearPlayerMovement(p,{keepPosition=false}={}){if(!p)return p;if(!keepPosition){const pos=currentMovementPosition(p);p.positionX=pos.x;p.positionY=pos.y}p.moveId=null;p.moveFromX=null;p.moveFromY=null;p.moveToX=null;p.moveToY=null;p.moveStartedAt=null;p.moveDurationMs=null;p.moveTargetSeatId=null;p.movementStatus="idle";p.autoMotionPhase=null;p.villageActivity="idle";p.sitStartedAt=null;p.sitUntil=null;return p}
function normalizeSeatCount(v,fallback=12){const n=Math.trunc(Number(v));return Math.max(1,Math.min(30,Number.isFinite(n)&&n>0?n:(Math.trunc(Number(fallback))||12)))}
function normalizeSeatId(v,seatCount){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>=1&&n<=normalizeSeatCount(seatCount)?n:null}
function normalizeGameCharacterId(v){const id=String(v||"").trim();return /^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(id)?id:""}
function activeGameCharacterId(v,seed=""){const id=normalizeGameCharacterId(v);if(id)return id;const text=String(seed||"");let h=0;for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))>>>0;return"character-"+String((h%GAME_CHARACTER_COUNT)+1).padStart(2,"0")}
const CHARACTER_SCALE_OPTIONS=[75,100,125,150,175,200];
function normalizeCharacterScale(v,fallback=100){const n=Number(v);if(!Number.isFinite(n))return fallback;return CHARACTER_SCALE_OPTIONS.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,CHARACTER_SCALE_OPTIONS[0])}
function disableMemberPassword(m){if(!m||typeof m!=="object")return m;delete m.passwordSalt;delete m.passwordHash;delete m.passwordAlgorithm;delete m.passwordIterations;delete m.resetRequestedAt;delete m.passwordResetAt;m.passwordConfigured=false;m.passwordRequired=false;return m}
function gameCharacterCatalog(){return Array.from({length:GAME_CHARACTER_COUNT},(_,i)=>{const n=String(i+1).padStart(2,"0"),id="character-"+n;return{id,name:"Nhân vật "+n,frameCount:6,imageUrl:"/api/game-characters/"+id+"/frame/1",frameUrl:"/api/game-characters/"+id+"/frame/{frame}"}})}
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
async function gameCharacterImage(env,id,request){const m=String(id||"").match(/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/);if(!m)return new Response("Not found",{status:404});if(Number(m[1])<=2){const portrait=await gameCharacterV4Sprite(env,id,request);if(portrait)return portrait;}if(Number(m[1])<=20)return gameCharacterFrame(env,id,1,request);if(env.ASSETS){try{const u=new URL(request.url);u.pathname="/characters/v253/chibi-"+m[1]+".webp";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}return new Response("Chibi not found",{status:404,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}})}
function firstFreeSeat(players,seatCount,excludeId=""){const used=new Set(Object.entries(players||{}).filter(([id])=>id!==excludeId).map(([,p])=>Number(p?.seatId||0)).filter(n=>n>=1));for(let n=1;n<=normalizeSeatCount(seatCount);n++)if(!used.has(n))return n;return null}
function enforceUniqueSeatClaims(players,seatCount){const claimed=new Set();for(const p of Object.values(players||{})){const seatId=normalizeSeatId(p?.seatId,seatCount);if(!seatId||claimed.has(seatId)){if(p){p.seatId=null;p.ready=p.reservedByGM===true}continue}claimed.add(seatId);p.seatId=seatId}return players}
function playerSetupComplete(meta,p){return !!activeGameCharacterId(p?.gameCharacterId,p?.loginId||p?.participantId)&&!!normalizeSeatId(p?.seatId,meta?.seatCount)}
function normalizeLoginId(v){return String(v||"").trim().toLowerCase()}function normalizeDisplayName(v){return titleCaseDisplayName(String(v||"").trim().replace(/\s+/g," "))}function titleCaseDisplayName(v){return String(v||"").split(" ").map(w=>w?w.charAt(0).toLocaleUpperCase("vi-VN")+w.slice(1):w).join(" ")}function randomNumericPassword(n=12){const a=new Uint32Array(n);crypto.getRandomValues(a);return Array.from(a,x=>String(x%10)).join("")}function normalizeRoomName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,40)}function publicMember(m){return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),lobbyMotionEnabled:m.lobbyMotionEnabled!==false,source:m.source,createdAt:m.createdAt,updatedAt:m.updatedAt,currentRoomCode:m.currentRoomCode||null,ready:!!m.ready,stats:m.stats||{wins:0,losses:0},history:Array.isArray(m.history)?m.history:[]}}function directoryMember(m){const presenceAt=Number(m?.presenceAt||0),online=presenceAt>0&&(Date.now()-presenceAt)<=PRESENCE_TTL,stats=m?.stats&&typeof m.stats==="object"?{wins:Number(m.stats.wins||0),losses:Number(m.stats.losses||0)}:{wins:0,losses:0},history=Array.isArray(m?.history)?m.history.slice(0,50).map(x=>({matchId:String(x?.matchId||""),result:x?.result==="win"?"win":"loss",roomCode:String(x?.roomCode||""),roomName:String(x?.roomName||""),gameName:String(x?.gameName||""),roleName:String(x?.roleName||""),faction:String(x?.faction||""),winnerFaction:String(x?.winnerFaction||""),playedAt:x?.playedAt||null})):[];return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),source:m.source||"WEB",createdAt:m.createdAt,updatedAt:m.updatedAt,lastSeenAt:m.lastSeenAt||null,online,currentRoomCode:online?(m.currentRoomCode||null):null,ready:online?!!m.ready:false,resetRequestedAt:m.resetRequestedAt||null,passwordResetAt:m.passwordResetAt||null,stats,history,...villagePresence(m)}}function roomUiStage(m){
  const phase=String(m?.phase||"lobby").toLowerCase();
  if(["running","started","game","playing"].includes(phase))return "battle";
  if(phase==="role_delivery")return "deal";
  const stage=String(m?.gmStage||"room");
  return ["room","seats","game","roles","deal"].includes(stage)?stage:"room";
}
function publicRoom(m){return{gmStage:roomUiStage(m),gmStageRevision:Number(m.gmStageRevision||0),code:m.code,roomName:m.roomName||("Phòng "+m.code),matchId:m.matchId||null,matchRevision:Number(m.matchRevision||0),deliveryVersion:Number(m.deliveryVersion||0),resetVersion:Number(m.resetVersion||0),status:m.status,phase:m.phase||"lobby",locked:!!m.locked,seatsLocked:!!m.seatsLocked,enabled:m.enabled!==false,autoGM:m.autoGM!==false,roomMode:normalizeRoomMode(m.roomMode),seatMoveMode:normalizeSeatMoveMode(m.seatMoveMode),seatCount:normalizeSeatCount(m.seatCount,Number(m.playerCount||0)||12),gameName:m.gameName||"",playerCount:Number(m.playerCount||0),cycleKey:m.cycleKey||null,cyclePhase:m.cyclePhase||null,cycleNight:Number(m.cycleNight||0),cycleStartedAt:m.cycleStartedAt||null,roleDeliveredAt:m.roleDeliveredAt||null,startedAt:m.startedAt||null,endedAt:m.endedAt||null,winnerFaction:m.winnerFaction||null,winnerLabel:m.winnerLabel||null,resultVersion:Number(m.resultVersion||0),deletedAt:m.deletedAt||null,createdAt:m.createdAt,updatedAt:m.updatedAt}}function publicPlayer(p){
  const now=Date.now(),hb=Number(p?.lastHeartbeatAt||0)||Date.parse(p?.lastSeenAt||"")||0,online=hb>0&&(now-hb)<=ROOM_PLAYER_TTL,view=roomPlayerPresence(p,now);
  return{participantId:p.participantId,kind:p.kind,loginId:p.loginId||null,displayName:p.displayName,avatarId:p.avatarId,gameCharacterId:activeGameCharacterId(p.gameCharacterId,p.loginId||p.participantId),seatId:Number(p.seatId||0)||null,setupComplete:!!activeGameCharacterId(p.gameCharacterId,p.loginId||p.participantId)&&Number(p.seatId||0)>0,positionX:view.positionX==null?null:normalizeVillageCoord(view.positionX),positionY:view.positionY==null?null:normalizeVillageCoord(view.positionY),movementStatus:view.movementStatus==="moving"?"moving":"idle",characterAnimation:characterStateFromPlayer(p),villageActivity:String(view.villageActivity||"idle"),sitStartedAt:Number(view.sitStartedAt||0)||null,sitUntil:Number(view.sitUntil||0)||null,moveId:view.moveId||null,moveFromX:view.moveFromX==null?null:normalizeVillageCoord(view.moveFromX),moveFromY:view.moveFromY==null?null:normalizeVillageCoord(view.moveFromY),moveToX:view.moveToX==null?null:normalizeVillageCoord(view.moveToX),moveToY:view.moveToY==null?null:normalizeVillageCoord(view.moveToY),moveStartedAt:Number(view.moveStartedAt||0)||null,moveDurationMs:Number(view.moveDurationMs||0)||null,moveTargetSeatId:Number(view.moveTargetSeatId||0)||null,online,ready:!!p.ready,reservedByGM:p.reservedByGM===true,joinedAt:p.joinedAt,lastSeenAt:p.lastSeenAt,lastHeartbeatAt:hb||null}
}
async function derivePasswordHash(password,salt,iterations=PBKDF2_ITERATIONS){const count=Number(iterations);if(!Number.isSafeInteger(count)||count<1)throw new Error("INVALID_PASSWORD_ITERATIONS");const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),{name:"PBKDF2"},false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:count},key,256);return bytesToBase64(new Uint8Array(bits))}async function verifyPassword(password,m){const iterations=Number(m?.passwordIterations)||PBKDF2_ITERATIONS;return timingSafeEqual(await derivePasswordHash(password,base64ToBytes(m.passwordSalt),iterations),m.passwordHash)}async function sha256(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}function randomToken(n){return bytesToBase64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}function bytesToBase64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}function base64ToBytes(v){const s=atob(v);return Uint8Array.from(s,c=>c.charCodeAt(0))}function bearer(r){const h=r.headers.get("Authorization")||"";return h.startsWith("Bearer ")?h.slice(7).trim():""}async function safeJson(r){try{return await r.json()}catch{return null}}function j(data,status=200){return Response.json(data,{status,headers:{...corsHeaders(),"cache-control":"no-store"}})}function corsHeaders(){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,PUT,DELETE,OPTIONS","access-control-allow-headers":"content-type,authorization","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}}

function roomPlayerPresence(p,now=Date.now()){
  const id=String(p?.participantId||p?.loginId||"player"),seatId=Number(p?.seatId||0),started=Number(p?.moveStartedAt||0),duration=Math.max(0,Number(p?.moveDurationMs||0)),arrivedAt=started+duration,sitUntil=Number(p?.sitUntil||0),moving=p?.movementStatus==="moving"&&started>0&&duration>0&&now<arrivedAt,currentSit=String(p?.villageActivity||"")==="sitting"&&sitUntil>now,targetSeat=Number(p?.moveTargetSeatId||0);
  if(seatId||moving||currentSit||targetSeat){
    const atDestination=!moving&&started>0&&duration>0,px=atDestination?p?.moveToX:p?.positionX,py=atDestination?p?.moveToY:p?.positionY;
    return{positionX:px,positionY:py,movementStatus:moving?"moving":"idle",villageActivity:moving?String(p?.villageActivity||"moving"):currentSit?"sitting":"idle",sitStartedAt:currentSit?Number(p?.sitStartedAt||0)||null:null,sitUntil:currentSit?sitUntil:null,moveId:moving?p?.moveId||null:null,moveFromX:moving?p?.moveFromX:null,moveFromY:moving?p?.moveFromY:null,moveToX:moving?p?.moveToX:null,moveToY:moving?p?.moveToY:null,moveStartedAt:moving?started:null,moveDurationMs:moving?duration:null,moveTargetSeatId:targetSeat||null};
  }
  const spawn=villageLayout.spawn(id),x=Number.isFinite(Number(p?.moveToX))?Number(p.moveToX):Number.isFinite(Number(p?.positionX))?Number(p.positionX):spawn.x,y=Number.isFinite(Number(p?.moveToY))?Number(p.moveToY):Number.isFinite(Number(p?.positionY))?Number(p.positionY):spawn.y,afterSit=sitUntil>0&&sitUntil<=now,anchorAt=afterSit?sitUntil:(arrivedAt>0?arrivedAt:(Date.parse(p?.joinedAt||"")||Date.parse(p?.lastSeenAt||"")||now));
  return villageAutoLife({id:"room:"+id,now,anchorAt,anchorPoint:{x,y},stagger:!(afterSit||arrivedAt>0)},villageLayout);
}

function villagePresence(m){
  const now=Date.now(),id="member:"+normalizeLoginId(m?.loginId),v=m?.villageMovement;
  if(v){
    const started=Number(v.moveStartedAt||0),duration=Math.max(0,Number(v.moveDurationMs||0)),arrivedAt=started+duration;
    if(started>0&&duration>0&&now<arrivedAt)return{...v,villageActivity:"roaming",sitStartedAt:null,sitUntil:null};
    if(v.autoMotionPhase==="gather"&&arrivedAt>0&&now<arrivedAt+VILLAGE_AUTO_SIT_MS)return{positionX:v.moveToX,positionY:v.moveToY,movementStatus:"idle",villageActivity:"sitting",sitStartedAt:arrivedAt,sitUntil:arrivedAt+VILLAGE_AUTO_SIT_MS,moveId:null,moveStartedAt:null,moveDurationMs:null};
    const fallback=villageLayout.spawn(id),anchorPoint={x:Number.isFinite(Number(v.moveToX))?Number(v.moveToX):fallback.x,y:Number.isFinite(Number(v.moveToY))?Number(v.moveToY):fallback.y},anchorAt=Math.max(1,v.autoMotionPhase==="gather"?arrivedAt+VILLAGE_AUTO_SIT_MS:arrivedAt||started||now);
    return villageAutoLife({id,now,anchorAt,anchorPoint,stagger:false},villageLayout);
  }
  const p=villageLayout.spawn(id),anchorAt=Date.parse(m?.createdAt||"")||Date.parse(m?.updatedAt||"")||now;
  return villageAutoLife({id,now,anchorAt,anchorPoint:p,stagger:true},villageLayout);
}
async function playerSeatSwapApi(env,raw,request){const code=normalizeRoomCode(raw);if(!isValidRoomCode(code))return j({ok:false,error:'INVALID_ROOM_CODE'},400);const me=await memberStore(env).fetch(new Request('https://member.internal/members/session',{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,code).fetch('https://room.internal/player/seat-swap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,loginId:data.member.loginId})})}
