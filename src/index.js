import { DurableObject } from "cloudflare:workers";
import { gmwwMembersPage } from "./gmww-members-page.js";
import { gmwwMembersLiveScript } from "./gmww-members-live.js";
import { GMWW_MEMBER_AVATARS, GMWW_MEMBER_AVATAR_IDS } from "./gmww-avatars.js";
import { EARLY_ARTIFACTS, artifactCycleKey, reserveArtifactActivation } from "./gmww-game-scene-rules.js";

const PROJECT="GMWW-V2.00",VERSION="V2.52",ROOM_IDLE_TTL=72*60*60*1000,ROOM_RESULT_REOPEN_DELAY=10000,ROOM_DIRECTORY_LEASE=180*1000,ROOM_PLAYER_TTL=5*60*1000,ROOM_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",ROOM_CODE_LENGTH=6;
const LOGIN_RE=/^[A-Za-z0-9._]{4,20}$/,SESSION_TTL=30*24*60*60*1000,PBKDF2_ITERATIONS=100000,MEMBER_STORE_NAME="__GMWW_MEMBERS__",PRESENCE_TTL=90000;
const GM_SYNC_TOKEN="6AQz7J2llbfh6xRaamkzYAxuBA2Ik33mENTRQtOFqr8";

export class RoomDurableObject extends DurableObject {
  async fetch(request){
    const url=new URL(request.url);
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
    if(url.pathname==="/members/directory"&&request.method==="GET")return this.memberDirectory();
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
    if(url.pathname==="/global-settings/web-veil"&&request.method==="GET")return this.globalWebVeilGet();
    if(url.pathname==="/global-settings/web-veil"&&request.method==="PUT")return this.globalWebVeilPut(await safeJson(request));
    if(url.pathname==="/init"&&request.method==="POST"){
      if(await this.ctx.storage.get("meta"))return j({ok:false,error:"ROOM_EXISTS"},409);
      const b=await safeJson(request),now=new Date().toISOString(),gmToken=randomToken(32),cfg=sanitizeGameConfig(b?.gameConfig),roomName=normalizeRoomName(b?.roomName)||String(cfg?.name||"Phòng Online"),roomMode=normalizeRoomMode(b?.roomMode),seatCount=normalizeSeatCount(b?.seatCount,Number(cfg?.playerCount||0)||12),meta={code:normalizeRoomCode(b?.code||""),roomName,status:"waiting",phase:"lobby",locked:false,enabled:true,roomMode,seatCount,gameName:cfg?.name||"",playerCount:Number(cfg?.playerCount||0),createdAt:now,updatedAt:now,lastUsedAt:now,startedAt:null,roleDeliveredAt:null,gmTokenHash:await sha256(gmToken)};
      await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);if(cfg)await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(b?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(b.cardBackImage));return j({ok:true,room:publicRoom(meta),gmToken},201);
    }
    if(url.pathname==="/state"&&request.method==="GET")return this.publicState();
    if(url.pathname==="/gm/state"&&request.method==="GET")return this.gmState(request);
    if(url.pathname==="/gm/assign"&&request.method==="POST")return this.gmAssign(request,await safeJson(request));
    if(url.pathname==="/gm/start"&&request.method==="POST")return this.gmStart(request,await safeJson(request));
    if(url.pathname==="/gm/config"&&request.method==="POST")return this.gmConfig(request,await safeJson(request));
    if(url.pathname==="/gm/role-assets"&&request.method==="POST")return this.gmRoleAssets(request,await safeJson(request));
    if(url.pathname==="/gm/artwork-manifest"&&request.method==="GET")return this.gmArtworkManifest(request);
    const roleAssetImage=url.pathname.match(/^\/role-assets\/([^/]+)\/image$/);if(roleAssetImage&&request.method==="GET")return this.roleAssetImage(decodeURIComponent(roleAssetImage[1]));
    if(url.pathname==="/gm/interaction"&&request.method==="POST")return this.gmInteraction(request,await safeJson(request));
    if(url.pathname==="/gm/participants"&&request.method==="POST")return this.gmParticipants(request,await safeJson(request));
    if(url.pathname==="/gm/room-settings"&&request.method==="POST")return this.gmRoomSettings(request,await safeJson(request));
    if(url.pathname==="/gm/cycle"&&request.method==="POST")return this.gmCycle(request,await safeJson(request));
    if(url.pathname==="/gm/turn"&&request.method==="POST")return this.gmTurn(request,await safeJson(request));
    if(url.pathname==="/gm/enabled"&&request.method==="POST")return this.gmEnabled(request,await safeJson(request));
    if(url.pathname==="/gm/lock"&&request.method==="POST")return this.gmLock(request,await safeJson(request));
    if(url.pathname==="/gm/kick"&&request.method==="POST")return this.gmKick(request,await safeJson(request));
    if(url.pathname==="/gm/rename"&&request.method==="POST")return this.gmRename(request,await safeJson(request));
    if(url.pathname==="/gm/reset"&&request.method==="POST")return this.gmReset(request,await safeJson(request));
    if(url.pathname==="/gm/end"&&request.method==="POST")return this.gmEnd(request,await safeJson(request));
    if(url.pathname==="/gm/delete"&&request.method==="POST")return this.gmDelete(request);
    if(url.pathname==="/player/state"&&request.method==="POST")return this.playerState(await safeJson(request));
    if(url.pathname==="/player/role-viewed"&&request.method==="POST")return this.playerRoleViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-viewed"&&request.method==="POST")return this.playerArtifactViewed(await safeJson(request));
    if(url.pathname==="/player/artifact-activate"&&request.method==="POST")return this.playerArtifactActivate(await safeJson(request));
    if(url.pathname==="/player/interaction/respond"&&request.method==="POST")return this.playerInteractionRespond(await safeJson(request));
    if(url.pathname==="/player/setup"&&request.method==="POST")return this.playerSetup(await safeJson(request));
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
    id=String(id||"").trim();if(GMWW_MEMBER_AVATAR_IDS.has(id))return true;
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return false;
    return !!(await this.ctx.storage.get("customAvatar:"+id));
  }
  async memberRegister(body){
    const loginId=normalizeLoginId(body?.loginId),displayName=normalizeDisplayName(body?.displayName),avatarId=String(body?.avatarId||""),requestedPassword=String(body?.password||"");
    if(!LOGIN_RE.test(loginId))return j({ok:false,error:"INVALID_LOGIN_ID",message:"Tên đăng nhập phải có 4–20 ký tự, không dấu/không khoảng trắng và chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."},400);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên Hiển Thị phải có từ 2 đến 24 ký tự."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Vui lòng chọn Avatar từ Kho Avatar GMWW."},400);
    if(requestedPassword&&(requestedPassword.length<4||requestedPassword.length>128))return j({ok:false,error:"INVALID_PASSWORD",message:"Mật khẩu phải có ít nhất 4 ký tự."},400);
    const key="member:"+loginId;if(await this.ctx.storage.get(key))return j({ok:false,error:"LOGIN_ID_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const rows=await this.ctx.storage.list({prefix:"member:"}),displayKey=displayName.toLocaleLowerCase("vi-VN");
    if([...rows.values()].some(x=>normalizeDisplayName(x?.displayName).toLocaleLowerCase("vi-VN")===displayKey))return j({ok:false,error:"DISPLAY_NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const password=requestedPassword||randomNumericPassword(12),salt=crypto.getRandomValues(new Uint8Array(16)),now=new Date().toISOString();let passwordHash;
    try{passwordHash=await derivePasswordHash(password,salt)}catch(e){console.error("GMWW_MEMBER_HASH_FAILED",e);return j({ok:false,error:"MEMBER_HASH_FAILED",message:"Không thể xử lý mật khẩu thành viên."},500)}
    const member={loginId,displayName,avatarId,passwordSalt:bytesToBase64(salt),passwordHash,passwordAlgorithm:"PBKDF2-SHA256",passwordIterations:PBKDF2_ITERATIONS,passwordConfigured:!!requestedPassword,passwordRequired:!!requestedPassword,source:"WEB",createdAt:now,updatedAt:now,presenceAt:Date.now(),lastSeenAt:now,currentRoomCode:null,ready:false};
    try{await this.ctx.storage.put(key,member)}catch(e){console.error("GMWW_MEMBER_STORE_FAILED",e);return j({ok:false,error:"MEMBER_STORE_FAILED",message:"Không thể lưu dữ liệu thành viên."},500)}
    let session;try{session=await this.newSession(member)}catch(e){console.error("GMWW_MEMBER_SESSION_FAILED",e);return j({ok:false,error:"MEMBER_SESSION_FAILED",message:"Đã lưu thành viên nhưng không thể tạo phiên đăng nhập."},500)}
    return j({ok:true,member:publicMember(member),...session},201);
  }
  async memberLogin(body){
    const loginId=normalizeLoginId(body?.loginId),password=String(body?.password||""),member=await this.ctx.storage.get("member:"+loginId);
    if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND",message:"Tên đăng nhập này chưa có tài khoản."},404);
    if(member.passwordRequired===true&&!password)return j({ok:false,error:"PASSWORD_REQUIRED",message:"Tài khoản này có mật khẩu. Vui lòng nhập mật khẩu."},401);
    if(member.passwordRequired===true&&!(await verifyPassword(password,member)))return j({ok:false,error:"INVALID_PASSWORD",message:"Mật khẩu không đúng."},401);
    member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();await this.ctx.storage.put("member:"+loginId,member);
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
    const loginId=normalizeLoginId(body?.loginId),displayName=normalizeDisplayName(body?.displayName),avatarId=String(body?.avatarId||"avatar-cut-001"),requestedPassword=String(body?.password||"");
    if(!LOGIN_RE.test(loginId))return j({ok:false,error:"INVALID_LOGIN_ID",message:"Tên đăng nhập phải có 4–20 ký tự, không dấu/không khoảng trắng và chỉ gồm chữ, số, dấu chấm hoặc gạch dưới."},400);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên Hiển Thị phải có từ 2 đến 24 ký tự."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Avatar không hợp lệ."},400);
    if(requestedPassword&&(requestedPassword.length<4||requestedPassword.length>128))return j({ok:false,error:"INVALID_PASSWORD",message:"Mật khẩu phải có ít nhất 4 ký tự."},400);
    const key="member:"+loginId;if(await this.ctx.storage.get(key))return j({ok:false,error:"NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const rows=await this.ctx.storage.list({prefix:"member:"}),displayKey=displayName.toLocaleLowerCase("vi-VN");
    if([...rows.values()].some(x=>normalizeDisplayName(x?.displayName).toLocaleLowerCase("vi-VN")===displayKey))return j({ok:false,error:"NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    const password=requestedPassword||randomNumericPassword(12),salt=crypto.getRandomValues(new Uint8Array(16)),now=new Date().toISOString();
    const member={loginId,displayName,avatarId,passwordSalt:bytesToBase64(salt),passwordHash:await derivePasswordHash(password,salt),passwordAlgorithm:"PBKDF2-SHA256",passwordIterations:PBKDF2_ITERATIONS,passwordConfigured:!!requestedPassword,passwordRequired:!!requestedPassword,source:"GM",createdAt:now,updatedAt:now,presenceAt:0,lastSeenAt:null,currentRoomCode:null,ready:false,resetRequestedAt:null,passwordResetAt:null,stats:{wins:0,losses:0},history:[]};
    await this.ctx.storage.put(key,member);
    return j({ok:true,member:publicMember(member)},201)
  }
  async memberAdminEdit(request,body){
    if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);
    const loginId=normalizeLoginId(body?.loginId),displayName=normalizeDisplayName(body?.displayName),avatarId=String(body?.avatarId||""),member=await this.ctx.storage.get("member:"+loginId);
    if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND",message:"Không tìm thấy Thành Viên."},404);
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên Hiển Thị phải có từ 2 đến 24 ký tự."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Avatar không hợp lệ."},400);
    const rows=await this.ctx.storage.list({prefix:"member:"}),displayKey=displayName.toLocaleLowerCase("vi-VN");
    if([...rows.values()].some(x=>normalizeLoginId(x?.loginId)!==loginId&&normalizeDisplayName(x?.displayName).toLocaleLowerCase("vi-VN")===displayKey))return j({ok:false,error:"NAME_TAKEN",message:"Tên bạn chọn đã trùng, vui lòng chọn tên khác."},409);
    member.displayName=displayName;member.avatarId=avatarId;member.updatedAt=new Date().toISOString();
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
    const displayName=normalizeDisplayName(body?.displayName),avatarId=String(body?.avatarId||"");
    if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_DISPLAY_NAME",message:"Tên hiển thị phải có từ 2 đến 24 ký tự."},400);
    if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR",message:"Vui lòng chọn Avatar từ Kho Avatar GMWW."},400);
    member.displayName=displayName;member.avatarId=avatarId;member.updatedAt=new Date().toISOString();member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();
    await this.ctx.storage.put("member:"+member.loginId,member);return j({ok:true,member:publicMember(member)});
  }
  async memberSession(request){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);const key="session:"+await sha256(token),ses=await this.ctx.storage.get(key);
    if(!ses||ses.expiresAt<=Date.now()){if(ses)await this.ctx.storage.delete(key);return j({ok:false,error:"SESSION_EXPIRED"},401)}
    const member=await this.ctx.storage.get("member:"+ses.loginId);if(!member)return j({ok:false,error:"UNAUTHORIZED"},401);
    member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();await this.ctx.storage.put("member:"+ses.loginId,member);
    return j({ok:true,member:publicMember(member),expiresAt:ses.expiresAt});
  }
  async memberPresence(request,body){
    const token=bearer(request);if(!token)return j({ok:false,error:"UNAUTHORIZED"},401);const key="session:"+await sha256(token),ses=await this.ctx.storage.get(key);
    if(!ses||ses.expiresAt<=Date.now())return j({ok:false,error:"SESSION_EXPIRED"},401);
    return this.memberPresenceInternal({loginId:ses.loginId,roomCode:body?.roomCode??null,ready:!!body?.ready});
  }
  async memberPresenceInternal(body){
    const loginId=normalizeLoginId(body?.loginId),member=await this.ctx.storage.get("member:"+loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);
    member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString();member.currentRoomCode=body?.roomCode?normalizeRoomCode(body.roomCode):null;member.ready=!!body?.ready;
    await this.ctx.storage.put("member:"+loginId,member);return j({ok:true,member:directoryMember(member)});
  }
  async memberRecordResult(body){
    const loginId=normalizeLoginId(body?.loginId),matchId=String(body?.matchId||""),member=await this.ctx.storage.get("member:"+loginId);if(!member)return j({ok:false,error:"MEMBER_NOT_FOUND"},404);if(!matchId)return j({ok:false,error:"MATCH_ID_REQUIRED"},400);
    const history=Array.isArray(member.history)?member.history:[];if(history.some(x=>String(x?.matchId||"")===matchId))return j({ok:true,duplicate:true,member:publicMember(member)});
    const result=body?.result==="win"?"win":"loss",stats=member.stats&&typeof member.stats==="object"?member.stats:{wins:0,losses:0};stats.wins=Number(stats.wins||0)+(result==="win"?1:0);stats.losses=Number(stats.losses||0)+(result==="loss"?1:0);member.stats=stats;
    member.history=[{matchId,result,roomCode:String(body?.roomCode||""),roomName:String(body?.roomName||""),gameName:String(body?.gameName||""),roleName:String(body?.roleName||""),faction:String(body?.faction||""),winnerFaction:String(body?.winnerFaction||""),playedAt:body?.playedAt||new Date().toISOString()},...history].slice(0,50);member.updatedAt=new Date().toISOString();await this.ctx.storage.put("member:"+loginId,member);return j({ok:true,member:publicMember(member)});
  }
  async memberDirectory(){
    const rows=await this.ctx.storage.list({prefix:"member:"}),members=[...rows.values()].map(directoryMember).sort((a,b)=>String(a.displayName||a.loginId).localeCompare(String(b.displayName||b.loginId),"vi"));
    return j({ok:true,count:members.length,serverTime:Date.now(),members});
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
  async globalWebVeilGet(){
    const rec=await this.ctx.storage.get("globalSetting:webVeil"),raw=Number(rec?.level),level=Number.isFinite(raw)?Math.max(0,Math.min(100,Math.round(raw))):50;
    return j({ok:true,level,updatedAt:rec?.updatedAt||null});
  }
  async globalWebVeilPut(body){
    const raw=Number(body?.level);if(!Number.isFinite(raw))return j({ok:false,error:"INVALID_LEVEL"},400);
    const level=Math.max(0,Math.min(100,Math.round(raw))),rec={level,updatedAt:new Date().toISOString()};
    await this.ctx.storage.put("globalSetting:webVeil",rec);return j({ok:true,...rec});
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
    const rec={code,roomName:normalizeRoomName(body?.roomName)||("Phòng "+code),gameName:String(body?.gameName||"").slice(0,120),phase:String(body?.phase||"lobby"),status:String(body?.status||"waiting"),locked:!!body?.locked,enabled:body?.enabled!==false,playerCount:Math.max(0,Number(body?.playerCount||0)),joinedCount:Math.max(0,Number(body?.joinedCount||0)),resetVersion:incomingResetVersion,createdAt:body?.createdAt||old?.createdAt||new Date().toISOString(),updatedAt:body?.updatedAt||new Date().toISOString(),leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE};
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
    const phase=String(meta?.phase||"lobby").toLowerCase(),running=["running","started","game","playing"].includes(phase);
    if(meta?.locked&&!["ended","deleted","closed","archived"].includes(phase))return{players:players||{},removed:[]};
    if(!["lobby","waiting","role_delivery","running","started","game","playing"].includes(phase))return{players:players||{},removed:[]};
    const nowMs=Date.now(),removed=[];
    for(const [id,p] of Object.entries(players||{})){
      if(p?.reservedByGM===true)continue;
      const hb=Number(p?.lastHeartbeatAt||0)||Date.parse(p?.lastSeenAt||p?.joinedAt||"")||0;
      if(hb>0&&nowMs-hb<=ROOM_PLAYER_TTL)continue;
      removed.push({...publicPlayer(p),participantId:id});
      delete players[id];
      if(!running&&p?.loginId){const lid=normalizeLoginId(p.loginId);await this.ctx.storage.delete("role:"+lid);await this.ctx.storage.delete("roles:"+lid)}
      for(const ws of this.ctx.getWebSockets())try{if(ws.deserializeAttachment()?.participantId===id)ws.close(1000,"PLAYER_OFFLINE_KICKED")}catch{}
    }
    if(!removed.length)return{players,removed};
    await this.ctx.storage.put("players",players);
    if(!running){const removedLogins=new Set(removed.map(p=>normalizeLoginId(p?.loginId)).filter(Boolean)),assignments=(await this.ctx.storage.get("assignments"))||[],nextAssignments=assignments.filter(a=>!removedLogins.has(normalizeLoginId(a?.loginId)));if(nextAssignments.length!==assignments.length)await this.ctx.storage.put("assignments",nextAssignments)}
    const now=new Date().toISOString();meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),kicked:removed.map(p=>p.participantId),reason:"OFFLINE_TIMEOUT"});
    return{players,removed};
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
    return j({ok:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer),gameConfig:(await this.ctx.storage.get("gameConfig"))||null,assignments,interactions:interactions.slice(-100),interactionResponses,activeEffects,artifactCycle:{cycleKey:artifactCycleKeyValue,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:3,accepted:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.slice(-3):[]},nightRuntime,winProposal,connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})
  }
  async gmRoleAssets(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,rows=Array.isArray(body?.roles)?body.roles:[];
    if(!rows.length)return j({ok:false,error:"NO_ROLE_PACKAGES",message:"Chưa có gói dữ liệu Vai Trò."},400);
    const stored=[];
    for(const raw of rows){
      const roleId=String(raw?.roleId||raw?.id||"").slice(0,120);if(!roleId)continue;
      const roleCard=sanitizePlayerRoleCard(raw),artworkAssetId=String(raw?.artworkAssetId||raw?.artworkId||roleCard.artworkAssetId||roleCard.artworkId||("role:"+roleId)).slice(0,180),roleImage=extractRoleImage(raw);
      if(roleImage){await this.ctx.storage.put("artworkAsset:"+artworkAssetId,roleImage);await this.ctx.storage.put("roleAsset:"+roleId,roleImage)}
      const normalizedCard={...roleCard,artworkAssetId,artworkId:artworkAssetId};
      await this.ctx.storage.put("roleCatalog:"+roleId,{roleId,roleName:normalizedCard.name||String(raw?.roleName||raw?.name||"Vai Trò"),faction:normalizedCard.faction??raw?.faction??"",description:normalizedCard.information??raw?.description??"",artworkAssetId,artworkId:artworkAssetId,roleCard:normalizedCard,updatedAt:new Date().toISOString()});
      stored.push({roleId,hasImage:!!roleImage,artworkAssetId,roleName:normalizedCard.name||String(raw?.roleName||raw?.name||"Vai Trò")});
    }
    meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
    return j({ok:true,count:stored.length,roles:stored});
  }
  async gmArtworkManifest(request){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const rows=await this.ctx.storage.list({prefix:"artworkAsset:"}),assetIds=[...rows.keys()].map(k=>String(k).slice("artworkAsset:".length));return j({ok:true,count:assetIds.length,assetIds})}
  async roleAssetImage(roleId){
    const rid=String(roleId||"");
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
      const storedImage=(await this.ctx.storage.get("artworkAsset:"+artworkAssetId))||((!pkg.artworkAssetId&&!pkg.artworkId)?await this.ctx.storage.get("roleAsset:"+requestedRoleId):null),roleCard={...merged,artworkAssetId,artworkId:artworkAssetId};
      const roleName=String(roleCard.name||row?.roleName||row?.name||pkg.roleName||snap.roleName||"Vai Trò").slice(0,120);
      const faction=roleCard.faction??row?.faction??row?.factionName??pkg.faction??snap.faction??"";
      const description=String(roleCard.information??row?.description??row?.roleDescription??pkg.description??snap.description??"").slice(0,6000);
      const imageKey=artworkAssetId||requestedRoleId,roleImage="/api/rooms/"+encodeURIComponent(meta.code)+"/role-assets/"+encodeURIComponent(imageKey)+"/image";
      const artifactRaw=(row?.artifact&&typeof row.artifact==="object")?row.artifact:(row?.artifactId?{artifactId:row.artifactId,artifactName:row.artifactName,artifactCard:row.artifactCard,artworkAssetId:row.artifactArtworkAssetId,artworkId:row.artifactArtworkId,image:row.artifactImage}:null);
      let artifact=null;
      if(artifactRaw){
        const artifactId=String(artifactRaw?.artifactId||artifactRaw?.id||artifactRaw?.artifactCard?.id||"").slice(0,120);
        if(artifactId){
          const artifactCard=sanitizePlayerArtifactCard(artifactRaw?.artifactCard||artifactRaw),artifactAssetId=String(artifactRaw?.artworkAssetId||artifactRaw?.artworkId||artifactCard.artworkAssetId||artifactCard.artworkId||("artifact:"+artifactId)).slice(0,180),artifactImageData=extractRoleImage(artifactRaw);
          if(artifactImageData)await this.ctx.storage.put("artworkAsset:"+artifactAssetId,artifactImageData);
          const artifactStoredImage=await this.ctx.storage.get("artworkAsset:"+artifactAssetId),artifactImage="/api/rooms/"+encodeURIComponent(meta.code)+"/role-assets/"+encodeURIComponent(artifactAssetId)+"/image";
          artifact={loginId,matchId:String(body?.matchId||meta.matchId||""),matchRevision:Number(body?.matchRevision||meta.matchRevision||0),artifactId,artifactName:String(artifactCard.name||artifactRaw?.artifactName||artifactRaw?.name||"Artifact").slice(0,120),description:String(artifactCard.information||artifactRaw?.description||"").slice(0,6000),artifactImage,artworkAssetId:artifactAssetId,artworkId:artifactAssetId,artworkAvailable:!!artifactStoredImage,artifactCard:{...artifactCard,artworkAssetId:artifactAssetId,artworkId:artifactAssetId},singleUse:artifactCard.singleUse===true,deliveredAt:new Date().toISOString(),viewedAt:null,usedAt:null};
        }
      }
      clean.push({assignmentIndex:rowIndex,loginId,displayName:p.displayName,matchId:String(body?.matchId||meta.matchId||""),matchRevision:Number(body?.matchRevision||meta.matchRevision||0),roleId:requestedRoleId,roleName,faction,description,order:Number(row?.order??snap.order??0),roleImage,artworkAssetId,artworkId:artworkAssetId,artworkAvailable:!!storedImage,roleCard,playerCardVersion:Number(row?.playerCardVersion||roleCard.version||7),deliveredAt:new Date().toISOString(),viewedAt:null,artifact});
    }
    for(const prefix of ["role:","roles:","artifact:","artifactUse:"]){const old=await this.ctx.storage.list({prefix});if(old.size)await this.ctx.storage.delete([...old.keys()])}
    const grouped=new Map();for(const row of clean){const a=grouped.get(row.loginId)||[];a.push(row);grouped.set(row.loginId,a)}
    for(const [loginId,list] of grouped){await this.ctx.storage.put("roles:"+loginId,list);await this.ctx.storage.put("role:"+loginId,list[0]);const artifact=list.find(x=>x?.artifact)?.artifact||null;if(artifact)await this.ctx.storage.put("artifact:"+loginId,artifact)}
    const summary=clean.map(({assignmentIndex,loginId,displayName,matchId,matchRevision,roleId,roleName,order,deliveredAt,viewedAt,artifact})=>({assignmentIndex,loginId,displayName,matchId,matchRevision,roleId,roleName,order,deliveredAt,viewedAt,artifactId:artifact?.artifactId||null,artifactName:artifact?.artifactName||null,artifactDeliveredAt:artifact?.deliveredAt||null,artifactViewedAt:artifact?.viewedAt||null,artifactUsedAt:artifact?.usedAt||null}));
    await this.ctx.storage.put("assignments",summary);
    meta.multiAssign=multiAssign;meta.matchId=String(body?.matchId||meta.matchId||"")||null;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.deliveryVersion=Number(body?.deliveryVersion||meta.deliveryVersion||0);meta.phase="role_delivery";meta.status="role_delivery";meta.roleDeliveredAt=new Date().toISOString();meta.updatedAt=meta.roleDeliveredAt;await this.ctx.storage.put("meta",meta);
    this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta),assignments:summary,multiAssign});
  }
  async gmStart(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,assignments=(await this.ctx.storage.get("assignments"))||[],incomingMatchId=String(body?.matchId||"");if(!assignments.length)return j({ok:false,error:"ROLES_NOT_DELIVERED",message:"Hãy phân và phát Vai Trò trước khi bắt đầu."},409);if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)return j({ok:false,error:"MATCH_MISMATCH",message:"Dữ liệu Phòng thuộc một ván khác. Hãy Phát Vai lại."},409);if(incomingMatchId)meta.matchId=incomingMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.deliveryVersion=Number(body?.deliveryVersion||meta.deliveryVersion||0);meta.phase="running";meta.status="running";meta.locked=false;meta.startedAt=new Date().toISOString();meta.endedAt=null;await this.ctx.storage.put("interactions",[]);meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=Number(meta.resultVersion||0);meta.updatedAt=meta.startedAt;await this.ctx.storage.put("meta",meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta)})}
  async gmConfig(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,cfg=sanitizeGameConfig(body?.gameConfig);if(!cfg)return j({ok:false,error:"INVALID_GAME_CONFIG",message:"Ván Mẫu không hợp lệ."},400);await this.ctx.storage.put("gameConfig",cfg);if(validImageDataUrl(body?.cardBackImage))await this.ctx.storage.put("cardBackImage",String(body.cardBackImage));if(body?.matchId)meta.matchId=String(body.matchId);meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);meta.gameName=cfg.name||meta.gameName||"";meta.playerCount=Number(cfg.playerCount||0);meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,room:publicRoom(meta),gameConfig:cfg})}

  async gmEnabled(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,enabled=body?.enabled!==false,now=new Date().toISOString();
    meta.enabled=enabled;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    const players=(await this.ctx.storage.get("players"))||{},room=publicRoom(meta);
    this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer)});
    return j({ok:true,room,enabled})
  }
  async gmLock(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;meta.locked=false;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}const players=(await this.ctx.storage.get("players"))||{};this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,ignored:body?.locked===true,reason:body?.locked===true?"ROOM_LOCK_DISABLED":null,room:publicRoom(meta)})}
  async gmKick(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},requested=String(body?.participantId||""),loginId=normalizeLoginId(body?.loginId),id=requested||(loginId?("member:"+loginId):"");
    const p=players[id];if(!id||!p)return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Không tìm thấy Người Chơi trong Phòng."},404);
    delete players[id];await this.ctx.storage.put("players",players);
    if(p?.loginId){const lid=normalizeLoginId(p.loginId);await this.ctx.storage.delete("role:"+lid);await this.ctx.storage.delete("roles:"+lid);await this.ctx.storage.delete("artifact:"+lid);const rows=(await this.ctx.storage.get("assignments"))||[],next=rows.filter(a=>normalizeLoginId(a?.loginId)!==lid);if(next.length!==rows.length)await this.ctx.storage.put("assignments",next)}
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
    const removedPlayers=[];
    if(replace){
      for(const [id,p] of Object.entries(players)){
        if(p?.kind!=="member")continue;
        const lid=normalizeLoginId(p?.loginId);
        if(!wanted.has(lid)){removedPlayers.push(publicPlayer(p));delete players[id]}
      }
    }
    for(const m of wanted.values()){
      const id="member:"+m.loginId,old=players[id]||{};
      players[id]={...old,participantId:id,kind:"member",loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId||old.avatarId||"",gameCharacterId:m.gameCharacterId||old.gameCharacterId||null,seatId:m.seatId||old.seatId||null,ready:playerSetupComplete(meta,{...old,...m})?true:false,reservedByGM:true,joinedAt:old.joinedAt||now,lastSeenAt:old.lastSeenAt||null,lastHeartbeatAt:Number(old.lastHeartbeatAt||0)||null};
    }
    await this.ctx.storage.put("players",players);
    const selected=new Set(wanted.keys()),assignments=(await this.ctx.storage.get("assignments"))||[],nextAssignments=assignments.filter(a=>selected.has(normalizeLoginId(a?.loginId)));
    if(nextAssignments.length!==assignments.length)await this.ctx.storage.put("assignments",nextAssignments);
    meta.playerCount=wanted.size;meta.locked=false;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}
    const publicPlayers=Object.values(players).map(publicPlayer),room=publicRoom(meta);this.broadcast({type:"room_state",room,players:publicPlayers,rosterUpdated:true});
    return j({ok:true,room,players:publicPlayers,selectedCount:wanted.size,removedPlayers})
  }
  async gmRoomSettings(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},phase=String(meta.phase||"lobby").toLowerCase();
    if(["running","started","game","playing"].includes(phase))return j({ok:false,error:"ROOM_SETTINGS_LOCKED",message:"Không đổi chế độ hoặc số ghế khi ván đang chạy."},409);
    const roomMode=body&&Object.prototype.hasOwnProperty.call(body,"roomMode")?normalizeRoomMode(body.roomMode):normalizeRoomMode(meta.roomMode);
    const requested=body&&Object.prototype.hasOwnProperty.call(body,"seatCount")?normalizeSeatCount(body.seatCount,meta.seatCount):normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12);
    const maxOccupied=Math.max(0,...Object.values(players).map(p=>Number(p?.seatId||0)||0));
    if(requested<maxOccupied)return j({ok:false,error:"SEAT_COUNT_BELOW_OCCUPIED",message:"Không thể giảm số ghế thấp hơn vị trí đang có người ngồi.",maxOccupied},409);
    meta.roomMode=roomMode;meta.seatCount=requested;meta.updatedAt=new Date().toISOString();meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers});
    return j({ok:true,room,players:publicPlayers})
  }
  nightRuntimeKey(meta,night){return "nightRuntime:"+String(meta?.matchId||"match")+":"+Math.max(1,Number(night)||1)}
  async getNightRuntime(meta,night,create=false){
    const key=this.nightRuntimeKey(meta,night);let runtime=await this.ctx.storage.get(key);
    if(!runtime&&create)runtime=await this.buildNightRuntime(meta,night);
    return runtime||null
  }
  async buildNightRuntime(meta,night){
    const assignments=(await this.ctx.storage.get("assignments"))||[],cfg=(await this.ctx.storage.get("gameConfig"))||{},now=new Date().toISOString(),n=Math.max(1,Number(night)||1),queue=[];
    if(n===1)queue.push({id:"wolf-introduction",kind:"wolf-introduction",label:"Bầy Sói ơi dậy đi nhìn mặt nhau",status:"pending"});
    const artifactRows=assignments.filter(a=>a?.artifactId).map((a,index)=>({...a,_index:index,_nameKey:gameLabelKey(a.artifactName)}));
    if(n===1){
      for(const artifactName of EARLY_ARTIFACTS){
        const key=gameLabelKey(artifactName);
        for(const row of artifactRows.filter(a=>a._nameKey===key))queue.push({id:"early:"+String(row.artifactId)+":"+normalizeLoginId(row.loginId),kind:"early-artifact",label:String(row.artifactName||artifactName),artifactId:String(row.artifactId),artifactName:String(row.artifactName||artifactName),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId),status:"pending"});
      }
    }
    const roleOrder=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map((r,i)=>[String(r?.roleId||""),Number(r?.order||i+1)])),groups=new Map();
    for(const a of assignments){
      const rid=String(a?.roleId||"");if(!rid)continue;let g=groups.get(rid);
      if(!g){g={id:"role:"+rid,kind:"role",label:String(a?.roleName||"Vai Trò"),roleId:rid,order:Number(a?.order||roleOrder.get(rid)||9999),loginIds:[],playerIds:[],status:"pending"};groups.set(rid,g)}
      const lid=normalizeLoginId(a?.loginId);if(lid&&!g.loginIds.includes(lid)){g.loginIds.push(lid);g.playerIds.push("member:"+lid)}
    }
    for(const g of [...groups.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,"vi")))queue.push(g);
    const artifactOrder=new Map((Array.isArray(cfg.artifacts)?cfg.artifacts:[]).map((a,i)=>[String(a?.artifactId||""),Number(a?.order||i+1)]));
    artifactRows.sort((a,b)=>(artifactOrder.get(String(a.artifactId))??9999)-(artifactOrder.get(String(b.artifactId))??9999)||a._index-b._index);
    for(const row of artifactRows)queue.push({id:"artifact:"+String(row.artifactId)+":"+normalizeLoginId(row.loginId),kind:"artifact-main",label:String(row.artifactName||"Artifact"),artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId),skipIfEarlyUsed:n===1&&EARLY_ARTIFACTS.some(x=>gameLabelKey(x)===row._nameKey),status:"pending"});
    const runtime={matchId:String(meta?.matchId||""),night:n,queue,cursor:0,completed:queue.length===0,currentId:queue[0]?.id||null,createdAt:now,updatedAt:now};
    await this.ctx.storage.put(this.nightRuntimeKey(meta,n),runtime);return runtime
  }
  async artifactUsedInNight(meta,step){
    if(!step?.artifactId||!step?.playerId)return false;
    const key=currentArtifactCycleKey(meta),cycle=(await this.ctx.storage.get("artifactCycle:"+key))||{accepted:[]};
    return (Array.isArray(cycle.accepted)?cycle.accepted:[]).some(x=>String(x?.artifactId||"")===String(step.artifactId)&&String(x?.playerId||("member:"+normalizeLoginId(x?.loginId)))===String(step.playerId))
  }
  async gmTurn(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;
    if(String(meta.phase||"").toLowerCase()!=="running"||String(meta.cyclePhase||"").toLowerCase()!=="night")return j({ok:false,error:"NOT_NIGHT_TURN",message:"Chỉ chuyển lượt khi đang ở Ban Đêm."},409);
    const night=Math.max(1,Number(meta.cycleNight||1)),runtime=await this.getNightRuntime(meta,night,true),action=String(body?.action||"next").toLowerCase(),now=new Date().toISOString();
    if(action==="back"){
      if(runtime.cursor>0){runtime.cursor--;while(runtime.cursor>0&&runtime.queue[runtime.cursor]?.status==="skipped")runtime.cursor--;const step=runtime.queue[runtime.cursor];if(step&&step.status==="completed")step.status="pending";runtime.completed=false;runtime.currentId=step?.id||null}
    }else{
      const current=runtime.queue[runtime.cursor];
      if(current&&current.status!=="skipped"){
        if(current.kind==="early-artifact"){const used=await this.artifactUsedInNight(meta,current);current.status="completed";current.result=used?"used":"skipped";current.completedAt=now}
        else{current.status="completed";current.completedAt=now}
      }
      runtime.cursor=Math.min(runtime.queue.length,runtime.cursor+1);
      while(runtime.cursor<runtime.queue.length){
        const next=runtime.queue[runtime.cursor];
        if(next?.kind==="artifact-main"&&next.skipIfEarlyUsed&&await this.artifactUsedInNight(meta,next)){next.status="skipped";next.skippedReason="EARLY_ARTIFACT_USED";next.completedAt=now;runtime.cursor++;continue}
        break
      }
      runtime.completed=runtime.cursor>=runtime.queue.length;runtime.currentId=runtime.completed?null:(runtime.queue[runtime.cursor]?.id||null)
    }
    runtime.updatedAt=now;await this.ctx.storage.put(this.nightRuntimeKey(meta,night),runtime);meta.currentNightTurnId=runtime.currentId;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);
    this.broadcast({type:"night_turn",night,runtime});return j({ok:true,night,runtime})
  }
  async gmCycle(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,now=new Date().toISOString(),rawPhase=String(body?.phase||body?.period||"").trim().toLowerCase(),phase=rawPhase==="day"?"morning":rawPhase,night=Math.max(0,Number(body?.night??body?.nightIndex??body?.roundIndex??0)||0),cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??((phase&&night)?(phase+"-"+night):("cycle-"+Date.now()))).slice(0,160);
    meta.cycleKey=cycleKey;if(phase)meta.cyclePhase=phase;if(night)meta.cycleNight=night;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);
    const rows=(await this.ctx.storage.get("interactions"))||[],expired=[];
    for(const x of rows){
      const type=String(x?.type||""),sameMatch=!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId);if(!sameMatch||x?.effectActive===false||!["frozen","expelled"].includes(type))continue;
      const effectNight=Math.max(0,Number(x?.night||0)||0);let shouldExpire=false,reason="";
      if(type==="frozen"){
        if(phase==="morning"&&(effectNight===0||night===0||night>=effectNight)){shouldExpire=true;reason="MORNING_START"}
        else if(phase==="night"&&effectNight>0&&night>effectNight){shouldExpire=true;reason="NEXT_NIGHT_SELF_HEAL"}
      }else if(type==="expelled"){
        if(phase==="night"&&effectNight>0&&night>effectNight){shouldExpire=true;reason="NEXT_NIGHT_START"}
        else if(phase==="night"&&effectNight===0&&x?.cycleKey&&String(x.cycleKey)!==cycleKey){shouldExpire=true;reason="NEXT_CYCLE_FALLBACK"}
      }
      if(shouldExpire){x.effectActive=false;x.expiredAt=now;x.expiredReason=reason;expired.push({id:x.id,type,loginId:x.loginId,night:effectNight,reason})}
    }
    await this.ctx.storage.put("interactions",rows.slice(-100));const nightRuntime=phase==="night"&&night>0?await this.getNightRuntime(meta,night,true):null;this.broadcast({type:"room_cycle",cycleKey,phase,night,matchId:String(meta.matchId||""),expired,nightRuntime});return j({ok:true,cycleKey,phase,night,expired,matchId:String(meta.matchId||""),nightRuntime})
  }
  async gmInteraction(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{},loginId=normalizeLoginId(body?.loginId),rawType=String(body?.type||"").trim().toLowerCase().replace(/\s+/g,"_"),alias={like_dislike:"thumb_vote","like-dislike":"thumb_vote",likedislike:"thumb_vote",reaction:"thumb_vote",reactions:"thumb_vote",thumbs:"thumb_vote",thumb:"thumb_vote",vote:"thumb_vote","👍👎":"thumb_vote",mark:"assassin_mark",marked:"assassin_mark",mark_choice:"assassin_mark","assassin-mark":"assassin_mark"},type=alias[rawType]||rawType;
    if(type==="clear_state"){
      if(!loginId)return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
      const rows=(await this.ctx.storage.get("interactions"))||[],cleared=[],now=new Date().toISOString();
      for(const x of rows){if(normalizeLoginId(x?.loginId)!==loginId||x?.effectActive===false||!["frozen","expelled","dead","assassin_mark"].includes(String(x?.type||"")))continue;if(x?.matchId&&meta.matchId&&String(x.matchId)!==String(meta.matchId))continue;x.effectActive=false;x.expiredAt=now;x.expiredReason="GM_CLEAR";cleared.push({id:x.id,type:x.type})}
      await this.ctx.storage.put("interactions",rows.slice(-100));this.broadcast({type:"player_state_cleared",loginId,cleared,at:now});return j({ok:true,loginId,cleared})
    }
    const allowed=new Set(["frozen","expelled","dead","thumb_vote","assassin_mark","effect_notice"]);if(!loginId||!allowed.has(type))return j({ok:false,error:"INVALID_INTERACTION",receivedType:rawType},400);
    const p=players["member:"+loginId];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Người Chơi không còn trong Phòng."},404);
    const defaults={frozen:"Bạn đang bị Đóng Băng.",expelled:"Bạn đã bị Đuổi Khỏi Làng.",dead:"Bạn đã Chết.",thumb_vote:"Hãy chọn dấu phù hợp.",assassin_mark:"Bạn đã bị Đánh Dấu. Hãy chọn 👍 hoặc 👎 để xác định kết quả.",effect_notice:"Bạn đã nhận một Hiệu Ứng."},rawOptions=Array.isArray(body?.options)?body.options.map(x=>String(x||"").slice(0,40)).filter(Boolean).slice(0,4):[],cycleKey=String(body?.cycleKey??body?.roundKey??body?.nightKey??body?.nightIndex??body?.roundIndex??meta.cycleKey??"").slice(0,160),expiresAt=body?.expiresAt?String(body.expiresAt).slice(0,64):null,effectActive=["frozen","expelled","dead","assassin_mark"].includes(type),clientEventId=String(body?.clientEventId||"").slice(0,240),rows=(await this.ctx.storage.get("interactions"))||[];
    if(clientEventId){const existing=rows.find(x=>String(x?.clientEventId||"")===clientEventId&&normalizeLoginId(x?.loginId)===loginId);if(existing)return j({ok:true,interaction:existing,idempotent:true})}
    const now=new Date().toISOString(),choiceType=type==="thumb_vote"||type==="assassin_mark",interaction={id:"ix-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8),clientEventId,eventId:String(body?.eventId||"").slice(0,240),engineEventType:String(body?.engineEventType||"").slice(0,120),matchId:String(body?.matchId||meta.matchId||""),loginId,type,message:String(body?.message||defaults[type]||"").slice(0,500),effectInstanceId:String(body?.effectInstanceId||"").slice(0,160),effectId:String(body?.effectId||"").slice(0,160),effectName:String(body?.effectName||"").slice(0,180),actionId:String(body?.actionId||"").slice(0,160),actorId:String(body?.actorId||"").slice(0,160),playerId:String(body?.playerId||"").slice(0,160),night:Number(body?.night||0),cycleKey,expiresAt,effectActive,emoji:String(body?.emoji||"").slice(0,20),title:String(body?.title||"").slice(0,180),requireAck:!!body?.requireAck,requireResponse:!!body?.requireResponse,responseHandler:String(body?.responseHandler||"").slice(0,120),options:choiceType?(rawOptions.length?rawOptions:["👍","👎"]):["ĐÃ HIỂU"],status:"pending",source:String(body?.source||"gm").slice(0,80),createdAt:now,response:null,respondedAt:null};
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
    const meta=auth.meta,now=new Date().toISOString(),transactionId=String(body?.transactionId||"").trim().slice(0,160),currentVersion=Number(meta.resetVersion||0),hasExpected=body?.expectedResetVersion!==undefined&&body?.expectedResetVersion!==null,expected=Number(body?.expectedResetVersion||0);
    const softPostGame=body?.postGame===true&&body?.preserveParticipants===true;
    if(softPostGame){
      const players=(await this.ctx.storage.get("players"))||{},nextVersion=currentVersion+1;
      for(const p of Object.values(players)){p.ready=true;p.lastHeartbeatAt=Date.now();p.lastSeenAt=now}
      await this.ctx.storage.put("players",players);await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);
      for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
      meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.locked=false;meta.enabled=true;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastResetTransactionId=transactionId||("postgame-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
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
    await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.put("interactions",[]);
    await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");
    for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}
    meta.matchId=null;meta.matchRevision=0;meta.deliveryVersion=0;meta.multiAssign=false;meta.phase="lobby";meta.status="waiting";meta.locked=false;meta.enabled=true;meta.gameName="";meta.playerCount=0;meta.startedAt=null;meta.roleDeliveredAt=null;meta.endedAt=null;meta.winnerFaction=null;meta.winnerLabel=null;meta.resultVersion=0;meta.reopenAt=null;meta.deletedAt=null;meta.resetVersion=nextVersion;meta.lastResetTransactionId=transactionId||("reset-"+nextVersion);meta.updatedAt=now;meta.lastUsedAt=now;
    await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}
    const room=publicRoom(meta),ack={ok:true,reset:true,hardReset:true,transactionId:meta.lastResetTransactionId,resetVersion:nextVersion,phase:room.phase,locked:room.locked,playersCount:0,assignmentsCount:0,room,players:[],removedPlayers};
    this.broadcast({type:"room_hard_reset",room,players:[],resetVersion:nextVersion,transactionId:ack.transactionId});
    for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_HARD_RESET")}catch{}
    return j(ack)
  }
  async gmEnd(request,body){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,incomingMatchId=String(body?.matchId||""),now=new Date().toISOString();if(meta.matchId&&incomingMatchId&&String(meta.matchId)!==incomingMatchId)return j({ok:false,error:"MATCH_MISMATCH",message:"Không thể kết thúc vì đây không phải ván đang chạy trong Phòng."},409);if(incomingMatchId)meta.matchId=incomingMatchId;meta.matchRevision=Number(body?.matchRevision||meta.matchRevision||0);const winnerFaction=normalizeWinnerFaction(body?.winnerFaction||body?.winner||body?.result?.winnerFaction||body?.result?.winner||""),winnerLabel=String(body?.winner||body?.winnerLabel||body?.result?.winner||winnerFaction||"").slice(0,180),endedMatchId=String(meta.matchId||"");meta.endedAt=now;meta.lastEndedMatchId=endedMatchId||null;meta.winnerFaction=winnerFaction||null;meta.winnerLabel=winnerLabel||null;meta.resultVersion=Number(meta.resultVersion||0)+1;meta.reopenAt=now;meta.phase="lobby";meta.status="waiting";meta.locked=false;meta.cycleKey=null;meta.cyclePhase=null;meta.cycleNight=0;meta.currentNightTurnId=null;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){};const players=(await this.ctx.storage.get("players"))||{};for(const p of Object.values(players)){p.ready=playerSetupComplete(meta,p);p.reservedByGM=true}await this.ctx.storage.put("players",players);const rows=(await this.ctx.storage.get("interactions"))||[];for(const x of rows){if(x?.effectActive!==false&&(!x?.matchId||!endedMatchId||String(x.matchId)===endedMatchId))x.effectActive=false}await this.ctx.storage.put("interactions",rows.slice(-100));const room=publicRoom(meta),memberResults=[];for(const p of Object.values(players)){if(!p?.loginId)continue;const lid=normalizeLoginId(p.loginId),stored=await this.ctx.storage.get("roles:"+lid),legacy=await this.ctx.storage.get("role:"+lid),rrs=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]),factions=rrs.map(rr=>rr?.roleCard?.faction??rr?.faction??""),result=winnerFaction&&factions.some(f=>normalizeWinnerFaction(f)===winnerFaction)?"win":"loss";memberResults.push({loginId:p.loginId,roleName:rrs.map(rr=>rr?.roleName||rr?.roleCard?.name||"").filter(Boolean).join(" + "),faction:factions.filter(Boolean).join(" + "),result})}this.broadcast({type:"game_result",matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,room});this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),waitingRoom:true});return j({ok:true,room,matchId:endedMatchId,winnerFaction:room.winnerFaction,winnerLabel:room.winnerLabel,memberResults,waitingRoom:true,ready:true})}
  async alarm(){try{const meta=await this.ctx.storage.get("meta");if(!meta)return;let phase=String(meta.phase||"").toLowerCase();if(phase==="deleted")return;meta.reopenAt=null;await this.ctx.storage.put("meta",meta);phase=String(meta.phase||"").toLowerCase();const times=[meta.lastUsedAt,meta.updatedAt,meta.createdAt].map(x=>Date.parse(x||"")).filter(Number.isFinite),last=times.length?Math.max(...times):Date.now(),due=last+ROOM_IDLE_TTL;if(Date.now()<due){await this.ctx.storage.setAlarm(due);return}const now=new Date().toISOString();meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=now;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_EXPIRED")}catch{}}catch(e){console.error("GMWW_ROOM_EXPIRY",e);try{await this.ctx.storage.setAlarm(Date.now()+60*60*1000)}catch(_){}}}
  async gmDelete(request){const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta,players=(await this.ctx.storage.get("players"))||{};meta.phase="deleted";meta.status="deleted";meta.locked=true;meta.deletedAt=new Date().toISOString();meta.updatedAt=meta.deletedAt;await this.ctx.storage.put("meta",meta);await this.ctx.storage.put("players",{});await this.ctx.storage.put("assignments",[]);await this.ctx.storage.delete("gameConfig");await this.ctx.storage.delete("cardBackImage");for(const prefix of ["role:","roles:","artifact:","artifactUse:","artifactCycle:","nightRuntime:","roleAsset:","roleCatalog:","artworkAsset:"]){const rows=await this.ctx.storage.list({prefix});for(const k of rows.keys())await this.ctx.storage.delete(k)}this.broadcast({type:"room_deleted",room:publicRoom(meta)});for(const ws of this.ctx.getWebSockets())try{ws.close(1000,"ROOM_DELETED")}catch{}return j({ok:true,deleted:true,room:publicRoom(meta),players:Object.values(players).map(publicPlayer)})}

  async playerState(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta?.phase||"lobby").toLowerCase(),key="member:"+loginId,member=body?.member&&typeof body.member==="object"?body.member:null;let players=(await this.ctx.storage.get("players"))||{},p=players[key];
    const canRestore=!!member&&normalizeLoginId(member.loginId)===loginId&&normalizeRoomCode(member.currentRoomCode||"")===normalizeRoomCode(meta.code||"")&&!["deleted","closed","archived"].includes(phase);
    if(!p&&canRestore){const now=new Date().toISOString();p={participantId:key,kind:"member",loginId,displayName:normalizeDisplayName(member.displayName||loginId),avatarId:String(member.avatarId||""),gameCharacterId:null,seatId:normalizeRoomMode(meta.roomMode)==="online"?firstFreeSeat(players,meta.seatCount,key):null,ready:false,joinedAt:now,lastSeenAt:now,lastHeartbeatAt:Date.now(),restoredAt:now};players[key]=p;await this.ctx.storage.put("players",players);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer),resumed:loginId})}
    if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn chưa ở trong phòng này."},403);
    p.lastSeenAt=new Date().toISOString();p.lastHeartbeatAt=Date.now();if(member){p.displayName=normalizeDisplayName(member.displayName||p.displayName||loginId);p.avatarId=String(member.avatarId||p.avatarId||"")}players[key]=p;await this.ctx.storage.put("players",players);
    const legacyRole=await this.ctx.storage.get("role:"+loginId),storedRoles=await this.ctx.storage.get("roles:"+loginId),roleRows=Array.isArray(storedRoles)&&storedRoles.length?storedRoles:(legacyRole?[legacyRole]:[]),roles=roleRows.map(privateRole),role=roles[0]||null,cardBackImage=(await this.ctx.storage.get("cardBackImage"))||null,rows=(await this.ctx.storage.get("interactions"))||[],sameMatch=x=>(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId)),interactions=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&x?.status==="pending"&&sameMatch(x)).slice(-10),effectTypes=new Set(["frozen","expelled","dead","assassin_mark"]),effectRows=rows.filter(x=>normalizeLoginId(x?.loginId)===loginId&&effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&sameMatch(x)&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())),latest={};for(const x of effectRows)latest[x.type]=x;const effects=Object.values(latest);
    const storedArtifact=await this.ctx.storage.get("artifact:"+loginId),artifact=storedArtifact?privateArtifact(storedArtifact):null,artifactCycleKey=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKey))||{accepted:[]};
    return j({ok:true,room:publicRoom(meta),player:publicPlayer(p),role,roles,artifact,artifactCycle:{cycleKey:artifactCycleKey,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:3},multiAssign:!!meta.multiAssign,cardBackImage,interactions,effects,resumed:!!p.restoredAt})
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
    const result=await this.ctx.storage.transaction(async txn=>{
      const artifact=await txn.get("artifact:"+loginId);
      if(!artifact)return{ok:false,status:404,error:"ARTIFACT_NOT_FOUND"};
      const targetId=String(body?.targetId||body?.originalTargetId||"").slice(0,160);if(targetId){const players=(await txn.get("players"))||{};if(!players[targetId])return{ok:false,status:400,error:"INVALID_ARTIFACT_TARGET"}}
      if(meta.matchId&&artifact.matchId&&String(meta.matchId)!==String(artifact.matchId))return{ok:false,status:409,error:"STALE_ARTIFACT"};
      const artifactId=String(artifact.artifactId||""),playerId="member:"+loginId,useKey="artifactUse:"+loginId+":"+artifactId,oldUse=await txn.get(useKey),cycle=(await txn.get("artifactCycle:"+cycleKey))||{cycleKey,accepted:[]};
      if(artifact.singleUse===true&&oldUse)return{ok:false,status:409,error:"ARTIFACT_ALREADY_USED"};
      const reservation=reserveArtifactActivation(cycle,{requestId,playerId,artifactId,cycleKey,eligible:true});
      const accepted=Array.isArray(reservation?.state?.accepted)?reservation.state.accepted:[];
      if(!reservation.ok){
        const status=reservation.error==="ARTIFACT_NOT_ELIGIBLE"?403:409;
        return{ok:false,status,error:reservation.error,count:accepted.length,max:3,remaining:Math.max(0,3-accepted.length)};
      }
      if(reservation.idempotent){
        const prior=accepted.find(x=>String(x?.requestId||"")===requestId&&String(x?.playerId||"")===playerId);
        return{ok:true,idempotent:true,activation:prior||null,count:accepted.length,max:3,remaining:Math.max(0,3-accepted.length)};
      }
      const activation={requestId,playerId,loginId,artifactId,artifactName:String(artifact.artifactName||""),matchId:String(meta.matchId||""),cycleKey,night:Math.max(1,Number(meta.cycleNight||1)),phase:String(meta.cyclePhase||""),originalTargetId:String(body?.targetId||body?.originalTargetId||"").slice(0,160),finalTargetId:String(body?.finalTargetId||body?.targetId||"").slice(0,160),status:"accepted",createdAt:now};
      const nextAccepted=accepted.slice();nextAccepted[nextAccepted.length-1]=activation;
      const nextCycle={...reservation.state,accepted:nextAccepted,updatedAt:now};
      await txn.put("artifactCycle:"+cycleKey,nextCycle);await txn.put(useKey,{...activation,usedAt:now});
      artifact.usedAt=now;artifact.lastActivation=activation;await txn.put("artifact:"+loginId,artifact);
      return{ok:true,activation,count:nextAccepted.length,max:3,remaining:Math.max(0,3-nextAccepted.length)};
    });
    if(!result.ok)return j(result,result.status||409);
    const rows=(await this.ctx.storage.get("assignments"))||[],row=rows.find(x=>normalizeLoginId(x?.loginId)===loginId);if(row){row.artifactUsedAt=result.activation?.createdAt||now;await this.ctx.storage.put("assignments",rows)}
    this.broadcast({type:"artifact_activation",...result,cycleKey});return j(result)
  }
  async playerSetup(body){
    const loginId=normalizeLoginId(body?.loginId),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    const phase=String(meta.phase||"lobby").toLowerCase();if(!["lobby","waiting","role_delivery"].includes(phase))return j({ok:false,error:"SETUP_LOCKED_IN_MATCH",message:"Không thể đổi Nhân Vật hoặc vị trí ngồi khi ván đang chạy."},409);
    const id="member:"+loginId,players=(await this.ctx.storage.get("players"))||{},p=players[id];if(!p)return j({ok:false,error:"PLAYER_NOT_IN_ROOM"},404);
    const gameCharacterId=normalizeGameCharacterId(body?.gameCharacterId);if(!gameCharacterId)return j({ok:false,error:"INVALID_GAME_CHARACTER",message:"Hãy chọn Nhân Vật trong bộ nhân vật của game."},400);
    for(const [otherId,other] of Object.entries(players))if(otherId!==id&&normalizeGameCharacterId(other?.gameCharacterId)===gameCharacterId)return j({ok:false,error:"CHARACTER_TAKEN",message:"Nhân Vật này đã có người chọn. Hãy chọn Nhân Vật khác."},409);
    const seatCount=normalizeSeatCount(meta.seatCount,Number(meta.playerCount||0)||12),mode=normalizeRoomMode(meta.roomMode);let seatId=normalizeSeatId(body?.seatId,seatCount);
    if(mode==="offline"&&!seatId)return j({ok:false,error:"SEAT_REQUIRED",message:"Phòng Offline bắt buộc chọn đúng vị trí đang ngồi."},400);
    if(!seatId)seatId=firstFreeSeat(players,seatCount,id);
    if(!seatId)return j({ok:false,error:"ROOM_SEATS_FULL",message:"Phòng đã hết ghế. Hãy nhờ GM tăng số slot."},409);
    for(const [otherId,other] of Object.entries(players))if(otherId!==id&&Number(other?.seatId||0)===seatId)return j({ok:false,error:"SEAT_TAKEN",message:"Ghế "+seatId+" đã có người ngồi. Hãy chọn ghế khác.",seatId},409);
    p.gameCharacterId=gameCharacterId;p.seatId=seatId;p.ready=false;p.lastHeartbeatAt=Date.now();p.lastSeenAt=new Date().toISOString();players[id]=p;await this.ctx.storage.put("players",players);
    meta.updatedAt=p.lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);
    const room=publicRoom(meta),publicPlayers=Object.values(players).map(publicPlayer);this.broadcast({type:"room_state",room,players:publicPlayers,setupUpdated:id});
    return j({ok:true,room,player:publicPlayer(p),players:publicPlayers})
  }
  async join(body){
    const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);
    let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;const now=new Date().toISOString(),phase=String(meta.phase||"lobby").toLowerCase(),inProgress=["role_delivery","running","started","game","playing"].includes(phase);let player;
    if(body?.member?.loginId){const m=body.member,key="member:"+m.loginId,resumeExisting=normalizeRoomCode(m.currentRoomCode||"")===normalizeRoomCode(meta.code||""),reserved=players[key]?.reservedByGM===true,known=!!players[key]||resumeExisting||reserved;if(meta.enabled===false&&!known)return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);if(inProgress&&!known)return j({ok:false,error:"ROOM_IN_PROGRESS",message:"Ván đang chơi. Chỉ Thành Viên đã tham dự mới có thể vào lại trận."},423);player={participantId:key,kind:"member",loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:normalizeGameCharacterId(players[key]?.gameCharacterId)||null,seatId:normalizeSeatId(players[key]?.seatId,meta.seatCount),ready:players[key]?.ready??m.ready??false,reservedByGM:reserved,joinedAt:players[key]?.joinedAt||now,lastSeenAt:now,lastHeartbeatAt:Date.now(),restoredAt:!players[key]&&resumeExisting?now:players[key]?.restoredAt||null};if(!player.seatId&&normalizeRoomMode(meta.roomMode)==="online")player.seatId=firstFreeSeat(players,meta.seatCount,key);if(!playerSetupComplete(meta,player))player.ready=false;players[key]=player}
    else{const displayName=normalizeDisplayName(body?.guest?.displayName),avatarId=String(body?.guest?.avatarId||"");if(displayName.length<2||displayName.length>24)return j({ok:false,error:"INVALID_GUEST_NAME"},400);if(!(await this.validMemberAvatar(avatarId)))return j({ok:false,error:"INVALID_AVATAR"},400);const guestId=String(body?.guest?.guestId||crypto.randomUUID()),key="guest:"+guestId;if(meta.enabled===false&&!players[key])return j({ok:false,error:"ROOM_DISABLED",message:"Phòng đang Tắt. Hãy chờ Quản Trò Bật Phòng."},423);if(inProgress&&!players[key])return j({ok:false,error:"ROOM_IN_PROGRESS",message:"Ván đang chơi. Người ngoài không thể tham gia giữa trận."},423);player={participantId:key,kind:"guest",guestId,displayName,avatarId,gameCharacterId:normalizeGameCharacterId(players[key]?.gameCharacterId)||null,seatId:normalizeSeatId(players[key]?.seatId,meta.seatCount),ready:players[key]?.ready||false,joinedAt:players[key]?.joinedAt||now,lastSeenAt:now,lastHeartbeatAt:Date.now()};if(!player.seatId&&normalizeRoomMode(meta.roomMode)==="online")player.seatId=firstFreeSeat(players,meta.seatCount,key);if(!playerSetupComplete(meta,player))player.ready=false;players[key]=player}
    await this.ctx.storage.put("players",players);meta.locked=false;meta.updatedAt=now;await this.ctx.storage.put("meta",meta);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,player:publicPlayer(player),room:publicRoom(meta),resumed:!!player.restoredAt,setupRequired:!playerSetupComplete(meta,player)});
  }
  async ready(body){const id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},404);if(!!body.ready&&!playerSetupComplete(meta,players[id]))return j({ok:false,error:"SETUP_REQUIRED",message:"Hãy chọn Nhân Vật và vị trí ngồi trước khi Sẵn Sàng."},409);players[id].ready=!!body.ready;players[id].lastHeartbeatAt=Date.now();players[id].lastSeenAt=new Date().toISOString();await this.ctx.storage.put("players",players);meta.updatedAt=players[id].lastSeenAt;meta.lastUsedAt=meta.updatedAt;await this.ctx.storage.put("meta",meta);this.broadcast({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)});return j({ok:true,player:publicPlayer(players[id])})}
  async heartbeat(body){const id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(!id||!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},404);const now=new Date().toISOString();players[id].lastHeartbeatAt=Date.now();players[id].lastSeenAt=now;if(body&&Object.prototype.hasOwnProperty.call(body,"ready"))players[id].ready=!!body.ready;await this.ctx.storage.put("players",players);meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);try{await this.ctx.storage.setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}return j({ok:true,player:publicPlayer(players[id]),room:publicRoom(meta)})}
  async leave(body){const players=(await this.ctx.storage.get("players"))||{},id=String(body?.participantId||""),meta=await this.ctx.storage.get("meta");if(!id||!players[id])return j({ok:false,error:"PLAYER_NOT_FOUND",message:"Bạn không còn ở trong phòng."},404);if(meta?.locked&&String(meta?.phase||"").toLowerCase()!=="ended")return j({ok:false,error:"ROOM_STICKY_LOCKED",message:"Phòng đã khóa. Chỉ GM có thể Kick hoặc Mở Phòng trước khi bạn rời đi."},423);delete players[id];await this.ctx.storage.put("players",players);if(meta){meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta)}for(const ws of this.ctx.getWebSockets()){try{if(ws.deserializeAttachment()?.participantId===id)ws.close(1000,"PLAYER_LEFT_ROOM")}catch{}}this.broadcast({type:"room_state",room:meta?publicRoom(meta):null,players:Object.values(players).map(publicPlayer)});return j({ok:true,left:true})}
  async websocket(request,url){if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return new Response("Expected WebSocket upgrade",{status:426});const meta=await this.ctx.storage.get("meta");if(!meta)return j({ok:false,error:"ROOM_NOT_FOUND"},404);const participantId=url.searchParams.get("participantId")||null;let players=(await this.ctx.storage.get("players"))||{};players=(await this.pruneOfflinePlayers(meta,players)).players;if(participantId&&!players[participantId])return j({ok:false,error:"PLAYER_NOT_IN_ROOM",message:"Bạn đã rời Phòng do mất kết nối quá lâu. Hãy tham gia lại."},403);const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({participantId,connectedAt:new Date().toISOString()});server.send(JSON.stringify({type:"room_state",room:publicRoom(meta),players:Object.values(players).map(publicPlayer)}));return new Response(null,{status:101,webSocket:client})}
  webSocketMessage(ws,message){let d;try{d=JSON.parse(typeof message==="string"?message:new TextDecoder().decode(message))}catch{return}if(d?.type==="ping")ws.send(JSON.stringify({type:"pong",at:new Date().toISOString()}))}
  webSocketClose(){this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length})} webSocketError(){this.broadcast({type:"presence",connections:this.ctx.getWebSockets().length})} broadcast(payload){const e=JSON.stringify(payload);for(const s of this.ctx.getWebSockets())try{s.send(e)}catch{}}
}

export default {async fetch(request,env){
  const url=new URL(request.url);if(request.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders()});
  if(url.pathname==="/gmww-members-live.js"&&request.method==="GET")return new Response(gmwwMembersLiveScript,{headers:{"content-type":"application/javascript; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0","x-content-type-options":"nosniff"}});
  if(url.pathname==="/api/health"&&request.method==="GET")return j({ok:true,project:PROJECT,service:"GMWW Online",status:"online",version:VERSION});
  if((url.pathname==="/favicon.svg"||url.pathname==="/favicon.ico")&&request.method==="GET")return new Response(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#101816" d="M7 7l16 11 9-3 9 3L57 7l-4 23 4 8-9 3-3 11-13 8-13-8-3-11-9-3 4-8L7 7z"/><path fill="#74cdb5" d="M13 14l11 9 8-3 8 3 11-9-3 16 4 5-9 2-2 11-9 6-9-6-2-11-9-2 4-5-3-16z"/><path fill="#101816" d="M17 29l10 2-5 6-6-3zm30 0l-10 2 5 6 6-3zM26 41l6-4 6 4-2 5h-8l-2-5zm2 7h8l-4 6z"/></svg>`,{headers:{"content-type":"image/svg+xml; charset=UTF-8","cache-control":"public, max-age=86400","x-content-type-options":"nosniff"}});
  if((url.pathname==="/gmww-sea-background.png"||url.pathname==="/gmww-sea-background.webp")&&request.method==="GET"){if(!env.ASSETS)return new Response("Background asset unavailable",{status:503});const assetUrl=new URL(request.url);assetUrl.pathname="/backgrounds/3C059A11-E8F3-48E8-89A9-EE9AE2336FAF.webp";const asset=await env.ASSETS.fetch(new Request(assetUrl,request));if(!asset.ok)return new Response("Player Web background not found",{status:404});return new Response(asset.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}});}
  if(url.pathname==="/api/assets/victory-audio"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-assets/victory");
  if(url.pathname==="/api/assets/role-card-back"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-assets/card-back");
  if(url.pathname==="/api/ui-settings"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/global-settings/web-veil");
  if(url.pathname==="/api/gm/ui-settings"&&request.method==="PUT"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);const body=await safeJson(request);if(!body)return j({ok:false,error:"INVALID_JSON"},400);return memberStore(env).fetch(new Request("https://member.internal/global-settings/web-veil",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)}));}
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
    const id=decodeURIComponent(avatar[1]);if(GMWW_MEMBER_AVATAR_IDS.has(id))return avatarImage(id);
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
  if(url.pathname==="/api/members/presence"&&request.method==="POST"){const body=await safeJson(request);return memberStore(env).fetch(new Request("https://member.internal/members/presence",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})}));}
  if(url.pathname==="/api/gm/reset/939"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return gmReset939(env,request);}
  if(url.pathname==="/api/gm/members"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/members/directory");}
  if(url.pathname==="/api/gm/members/reset-ranking"&&request.method==="POST"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/admin-reset-ranking",{method:"POST",headers:request.headers}));}
  if(url.pathname==="/api/gm/members/history"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/admin-clear-history",{method:"DELETE",headers:request.headers}));}
  const gmMemberDelete=url.pathname.match(/^\/api\/gm\/members\/([A-Za-z0-9._]+)$/);if(gmMemberDelete&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch(new Request("https://member.internal/members/delete",{method:"DELETE",headers:request.headers,body:JSON.stringify({loginId:decodeURIComponent(gmMemberDelete[1])})}));}
  if(url.pathname==="/api/gm/rooms"&&request.method==="GET"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return memberStore(env).fetch("https://member.internal/directory/rooms/list?includeEnded=1&includeDisabled=1");}
  if(url.pathname==="/api/gm/rooms"&&request.method==="DELETE"){if(bearer(request)!==GM_SYNC_TOKEN)return j({ok:false,error:"UNAUTHORIZED"},401);return gmRoomsPurge(env,request);}
  if(url.pathname==="/api/game-characters"&&request.method==="GET")return j({ok:true,count:GAME_CHARACTER_COUNT,characters:gameCharacterCatalog()});
  const gameCharacterImageRoute=url.pathname.match(/^\/api\/game-characters\/(character-(?:0[1-9]|[12][0-9]|30))\/image$/);if(gameCharacterImageRoute&&request.method==="GET")return gameCharacterImage(env,gameCharacterImageRoute[1],request);
  if(url.pathname==="/api/rooms"&&request.method==="GET")return memberStore(env).fetch("https://member.internal/directory/rooms/list");
  if(url.pathname==="/api/rooms"&&request.method==="POST")return createRoom(env,url,request);
  const room=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)$/);if(room&&request.method==="GET")return publicRoomState(env,room[1],request);
  const joinApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/join$/);if(joinApi&&request.method==="POST")return joinRoom(env,joinApi[1],request);
  const readyApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/ready$/);if(readyApi&&request.method==="POST")return readyRoom(env,readyApi[1],request);
  const heartbeatApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/heartbeat$/);if(heartbeatApi&&request.method==="POST")return heartbeatRoom(env,heartbeatApi[1],request);
  const leaveApi=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/leave$/);if(leaveApi&&request.method==="POST")return leaveRoomApi(env,leaveApi[1],request);
  const playerState=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/me$/);if(playerState&&request.method==="GET")return playerPrivateState(env,playerState[1],request);
  const roleViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role\/viewed$/);if(roleViewed&&request.method==="POST")return playerRoleViewedApi(env,roleViewed[1],request);
  const artifactViewed=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/viewed$/);if(artifactViewed&&request.method==="POST")return playerArtifactViewedApi(env,artifactViewed[1],request);
  const artifactActivate=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/artifact\/activate$/);if(artifactActivate&&request.method==="POST")return playerArtifactActivateApi(env,artifactActivate[1],request);
  const playerInteraction=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/interaction\/respond$/);if(playerInteraction&&request.method==="POST")return playerInteractionRespondApi(env,playerInteraction[1],request);
  const playerSetup=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/setup$/);if(playerSetup&&request.method==="POST")return playerRoomSetupApi(env,playerSetup[1],request);
  const gmState=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)$/);if(gmState&&request.method==="GET")return gmRoomState(env,gmState[1],request);
  const gmPublish=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/publish$/);if(gmPublish&&request.method==="POST")return gmRoomState(env,gmPublish[1],request);
  const gmAssign=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/assignments$/);if(gmAssign&&request.method==="POST")return roomProxy(env,gmAssign[1],"/gm/assign",request);
  const gmStart=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/start$/);if(gmStart&&request.method==="POST")return roomProxy(env,gmStart[1],"/gm/start",request);
  const gmConfig=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/config$/);if(gmConfig&&request.method==="POST")return gmRoomConfig(env,gmConfig[1],request);
  const gmRoleAssets=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/role-assets$/);if(gmRoleAssets&&request.method==="POST")return roomProxy(env,gmRoleAssets[1],"/gm/role-assets",request);
  const gmArtworkManifest=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/artwork-manifest$/);if(gmArtworkManifest&&request.method==="GET")return roomProxy(env,gmArtworkManifest[1],"/gm/artwork-manifest",request);
  const publicRoleAsset=url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9]+)\/role-assets\/([^/]+)\/image$/);if(publicRoleAsset&&request.method==="GET"){const c=normalizeRoomCode(publicRoleAsset[1]);if(!isValidRoomCode(c))return new Response("Invalid room code",{status:400});return roomStub(env,c).fetch("https://room.internal/role-assets/"+encodeURIComponent(decodeURIComponent(publicRoleAsset[2]))+"/image")}
  const gmInteraction=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/interaction$/);if(gmInteraction&&request.method==="POST")return roomProxy(env,gmInteraction[1],"/gm/interaction",request);
  const gmParticipants=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/participants$/);if(gmParticipants&&request.method==="POST")return gmRoomParticipants(env,gmParticipants[1],request);
  const gmRoomSettingsRoute=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/room-settings$/);if(gmRoomSettingsRoute&&request.method==="POST")return roomProxy(env,gmRoomSettingsRoute[1],"/gm/room-settings",request);
  const gmCycle=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/cycle$/);if(gmCycle&&request.method==="POST")return roomProxy(env,gmCycle[1],"/gm/cycle",request);
  const gmTurn=url.pathname.match(/^\/api\/gm\/rooms\/([A-Za-z0-9]+)\/turn$/);if(gmTurn&&request.method==="POST")return roomProxy(env,gmTurn[1],"/gm/turn",request);
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

async function createRoom(env,url,request){const body=await safeJson(request)||{};for(let i=0;i<8;i++){const code=generateRoomCode(),r=await roomStub(env,code).fetch("https://room.internal/init",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code,roomName:body.roomName||"",roomMode:body.roomMode||"online",seatCount:body.seatCount,gameConfig:body.gameConfig||null,cardBackImage:body.cardBackImage||null})});if(r.status===201){const data=await r.json(),p=url.protocol==="https:"?"wss:":"ws:";await syncRoomDirectory(env,code);return j({ok:true,roomCode:code,roomName:data.room?.roomName||normalizeRoomName(body.roomName)||("Phòng "+code),gmToken:data.gmToken,joinUrl:`${url.origin}/${code}`,websocketUrl:`${p}//${url.host}/ws/${code}`},201)}if(r.status!==409)return j({ok:false,error:"ROOM_CREATE_FAILED"},500)}return j({ok:false,error:"ROOM_CODE_EXHAUSTED"},503)}
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
async function playerRoleViewedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/role-viewed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerArtifactViewedApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/artifact-viewed",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerArtifactActivateApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/artifact-activate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function playerInteractionRespondApi(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const me=await memberStore(env).fetch(new Request("https://member.internal/members/session",{headers:request.headers}));if(!me.ok)return me;const data=await me.json(),body=await safeJson(request)||{};return roomStub(env,c).fetch("https://room.internal/player/interaction/respond",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...body,loginId:data.member.loginId})})}
async function syncRoomDirectory(env,raw){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return;try{const r=await roomStub(env,c).fetch("https://room.internal/state");if(!r.ok)return;const d=await r.json();await memberStore(env).fetch("https://member.internal/directory/rooms/upsert",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...d.room,code:c,joinedCount:Array.isArray(d.players)?d.players.length:0,leaseUntil:Date.now()+ROOM_DIRECTORY_LEASE})})}catch(e){console.warn("GMWW_ROOM_DIRECTORY_SYNC",e)}}
async function gmReset939(env,request){const statusRes=await memberStore(env).fetch(new Request("https://member.internal/admin/reset-939",{method:"GET",headers:request.headers})),status=await statusRes.json().catch(()=>({}));if(status?.done)return j({ok:true,done:true,already:true,record:status.record||null});const roomsRes=await gmRoomsPurge(env,request),rooms=await roomsRes.clone().json().catch(()=>({}));if(!roomsRes.ok||rooms?.failed)return j({ok:false,error:"ROOM_PURGE_FAILED",rooms},500);const membersRes=await memberStore(env).fetch(new Request("https://member.internal/members/purge",{method:"DELETE",headers:request.headers})),members=await membersRes.clone().json().catch(()=>({}));if(!membersRes.ok)return j({ok:false,error:"MEMBER_PURGE_FAILED",rooms,members},500);const record={roomsDeleted:Number(rooms?.deleted||0),membersDeleted:Number(members?.membersDeleted||0),sessionsDeleted:Number(members?.sessionsDeleted||0)};const markRes=await memberStore(env).fetch(new Request("https://member.internal/admin/reset-939",{method:"POST",headers:{...Object.fromEntries(request.headers),"content-type":"application/json"},body:JSON.stringify(record)}));if(!markRes.ok)return j({ok:false,error:"RESET_MARK_FAILED",rooms,members},500);return j({ok:true,done:true,rooms,members,...record})}
async function gmRoomsPurge(env,request){const listing=await memberStore(env).fetch("https://member.internal/directory/rooms/list"),data=await listing.json().catch(()=>({rooms:[]})),rooms=Array.isArray(data?.rooms)?data.rooms:[],results=[];for(const r of rooms){const code=normalizeRoomCode(r?.code);if(!isValidRoomCode(code))continue;try{const res=await gmRoomDelete(env,code,request),body=await res.clone().json().catch(()=>({}));if(res.status===404){await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code})});results.push({code,ok:true,status:404,staleDirectoryRemoved:true});continue}results.push({code,ok:res.ok,status:res.status,error:body?.error||null})}catch(e){results.push({code,ok:false,status:0,error:String(e?.message||e)})}}const failed=results.filter(x=>!x.ok);return j({ok:failed.length===0,purged:failed.length===0,deleted:results.length-failed.length,failed:failed.length,results},failed.length?500:200)}
async function gmRoomParticipants(env,raw,request){
  const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/participants",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});
  if(res.ok){
    const data=await res.clone().json().catch(()=>({}));
    for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:c,ready:true})})}catch{}}
    for(const p of (Array.isArray(data?.removedPlayers)?data.removedPlayers:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}}
    await syncRoomDirectory(env,c);
  }
  return res
}
async function gmRoomConfig(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/config",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomEnabled(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/enabled",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomLock(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/lock",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomKick(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/kick",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),p=data?.player||{};if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}await syncRoomDirectory(env,c)}return res}
async function gmRoomRename(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/rename",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomReset(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/reset",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({}));if(data?.hardReset===false&&data?.preserveParticipants===true){for(const p of (Array.isArray(data?.players)?data.players:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:c,ready:true})})}catch{}}}else{for(const p of (Array.isArray(data?.removedPlayers)?data.removedPlayers:[])){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}}}await syncRoomDirectory(env,c)}return res}
async function gmRoomEnd(env,raw,request){const c=normalizeRoomCode(raw),body=await safeJson(request),res=await roomStub(env,c).fetch("https://room.internal/gm/end",{method:"POST",headers:request.headers,body:JSON.stringify(body||{})});if(res.ok){const data=await res.clone().json().catch(()=>({})),room=data?.room||{};for(const r of (Array.isArray(data?.memberResults)?data.memberResults:[])){try{await memberStore(env).fetch("https://member.internal/members/record-result",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,matchId:data.matchId||room.matchId,roomCode:c,roomName:room.roomName,gameName:room.gameName,roleName:r.roleName,faction:r.faction,winnerFaction:data.winnerFaction||room.winnerFaction,result:r.result,playedAt:room.endedAt})})}catch(e){console.warn("GMWW_RESULT_RECORD",r?.loginId,e)}try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:r.loginId,roomCode:c,ready:true})})}catch(e){console.warn("GMWW_END_LOBBY_PRESENCE",r?.loginId,e)}}await syncRoomDirectory(env,c)}return res}
async function gmRoomDelete(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);if(bearer(request)!==GM_SYNC_TOKEN){const probe=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(!probe.ok&&probe.status!==404)return probe}let res;try{res=await roomStub(env,c).fetch("https://room.internal/gm/delete",{method:"POST",headers:request.headers})}catch(e){res=null}let data={};if(res)try{data=await res.clone().json()}catch(_){}if(res&&res.status!==404&&!res.ok)return res;const players=Array.isArray(data?.players)?data.players:[];for(const p of players){if(p?.loginId)try{await memberStore(env).fetch("https://member.internal/members/presence-internal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({loginId:p.loginId,roomCode:null,ready:false})})}catch{}}await memberStore(env).fetch("https://member.internal/directory/rooms/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:c})});return j({ok:true,deleted:true,alreadyGone:!!(res&&res.status===404),code:c,room:data?.room||null})}
async function roomProxy(env,raw,path,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);return roomStub(env,c).fetch(new Request("https://room.internal"+path,{method:request.method,headers:request.headers,body:request.method==="GET"?undefined:request.body}))}
async function publicRoomState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const res=await roomStub(env,c).fetch("https://room.internal/state");if(res.ok)await syncRoomDirectory(env,c);return res}
async function gmRoomState(env,raw,request){const c=normalizeRoomCode(raw);if(!isValidRoomCode(c))return j({ok:false,error:"INVALID_ROOM_CODE"},400);const res=await roomStub(env,c).fetch(new Request("https://room.internal/gm/state",{method:"GET",headers:request.headers}));if(res.ok)await syncRoomDirectory(env,c);return res}
function playerPage(code){return new Response(gmwwMembersPage(code),{headers:{...corsHeaders(),"content-type":"text/html; charset=UTF-8","cache-control":"no-store, no-cache, must-revalidate","pragma":"no-cache","expires":"0"}})}
function avatarImage(id){const a=GMWW_MEMBER_AVATARS.find(x=>x.id===id);if(!a)return new Response("Not found",{status:404});const m=a.img.match(/^data:(image\/[^;]+);base64,(.+)$/);if(!m)return new Response("Invalid asset",{status:500});const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}
function roomStub(env,c){return env.ROOMS.get(env.ROOMS.idFromName(c))}function memberStore(env){return env.ROOMS.get(env.ROOMS.idFromName(MEMBER_STORE_NAME))}function generateRoomCode(){const b=new Uint8Array(ROOM_CODE_LENGTH);crypto.getRandomValues(b);let c="";for(const x of b)c+=ROOM_ALPHABET[x%ROOM_ALPHABET.length];return c}function normalizeRoomCode(v){return String(v||"").trim().toUpperCase()}function isValidRoomCode(c){return new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(c)}
function sanitizeGameConfig(v){
  if(!v||typeof v!=="object")return null;
  const roles=Array.isArray(v.roles)?v.roles.slice(0,100).map(r=>{
    const src=(r&&typeof r==="object")?r:{};
    const nested=(src.role&&typeof src.role==="object")?src.role:{};
    const roleId=String(src.roleId||src.id||nested.id||nested.roleId||"").slice(0,120);
    const roleName=String(src.roleName||src.name||nested.name||nested.roleName||"").slice(0,120);
    const faction=String(src.faction||src.factionName||nested.faction||nested.factionName||"").slice(0,120);
    const description=String(src.description||src.roleDescription||nested.description||nested.roleDescription||"").slice(0,6000);
    return {roleId,roleName,faction,description,count:Math.max(1,Math.min(20,Number(src.count||1))),order:Number(src.order||0)};
  }):[];
  return{id:String(v.id||"").slice(0,120),name:String(v.name||"Game Online").slice(0,120),playerCount:Math.max(0,Math.min(100,Number(v.playerCount||0))),roles,artifacts:Array.isArray(v.artifacts)?v.artifacts.slice(0,100).map(a=>({artifactId:String(a?.artifactId||"").slice(0,100),order:Number(a?.order||0)})):[]}
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
  return{version:Number(x.version||x.playerCardVersion||1),name:String(x.name||x.artifactName||"Artifact").slice(0,120),information:x.information==null?(x.description==null?null:String(x.description).slice(0,6000)):String(x.information).slice(0,6000),actions,limits:x.limits??null,singleUse:x.singleUse===true,artworkAssetId,artworkId:artworkAssetId}
}
function privateArtifact(a){return{matchId:a.matchId||null,matchRevision:Number(a.matchRevision||0),artifactId:a.artifactId,artifactName:a.artifactName,description:a.description,artifactImage:a.artifactImage||null,artworkAssetId:a.artworkAssetId||a.artworkId||null,artworkId:a.artworkAssetId||a.artworkId||null,artworkAvailable:a.artworkAvailable!==false,artifactCard:a.artifactCard||null,singleUse:a.singleUse===true,deliveredAt:a.deliveredAt||null,viewedAt:a.viewedAt||null,usedAt:a.usedAt||null,lastActivation:a.lastActivation||null}}
function currentArtifactCycleKey(meta){return artifactCycleKey(meta?.matchId||"match",Math.max(1,Number(meta?.cycleNight||1)))}
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
const GAME_CHARACTER_COUNT=30;
function normalizeRoomMode(v){return String(v||"").trim().toLowerCase()==="offline"?"offline":"online"}
function normalizeSeatCount(v,fallback=12){const n=Math.trunc(Number(v));return Math.max(1,Math.min(30,Number.isFinite(n)&&n>0?n:(Math.trunc(Number(fallback))||12)))}
function normalizeSeatId(v,seatCount){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>=1&&n<=normalizeSeatCount(seatCount)?n:null}
function normalizeGameCharacterId(v){const id=String(v||"").trim();return /^character-(?:0[1-9]|[12][0-9]|30)$/.test(id)?id:""}
function gameCharacterCatalog(){return Array.from({length:GAME_CHARACTER_COUNT},(_,i)=>{const n=String(i+1).padStart(2,"0"),fallback=GMWW_MEMBER_AVATARS[i%GMWW_MEMBER_AVATARS.length];return{id:"character-"+n,name:"Nhân vật "+n,imageUrl:"/api/game-characters/character-"+n+"/image",fallbackAvatarId:fallback?.id||null}})}
async function gameCharacterImage(env,id,request){const m=String(id||"").match(/^character-(0[1-9]|[12][0-9]|30)$/);if(!m)return new Response("Not found",{status:404});if(env.ASSETS){try{const u=new URL(request.url);u.pathname="/village/characters/"+id+".webp";const a=await env.ASSETS.fetch(new Request(u.toString(),request));if(a.ok)return new Response(a.body,{status:200,headers:{"content-type":"image/webp","cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}})}catch{}}const index=Number(m[1])-1,fallback=GMWW_MEMBER_AVATARS[index%GMWW_MEMBER_AVATARS.length];return fallback?avatarImage(fallback.id):new Response("Not found",{status:404})}
function firstFreeSeat(players,seatCount,excludeId=""){const used=new Set(Object.entries(players||{}).filter(([id])=>id!==excludeId).map(([,p])=>Number(p?.seatId||0)).filter(n=>n>=1));for(let n=1;n<=normalizeSeatCount(seatCount);n++)if(!used.has(n))return n;return null}
function playerSetupComplete(meta,p){return !!normalizeGameCharacterId(p?.gameCharacterId)&&!!normalizeSeatId(p?.seatId,meta?.seatCount)}
function normalizeLoginId(v){return String(v||"").trim().toLowerCase()}function normalizeDisplayName(v){return titleCaseDisplayName(String(v||"").trim().replace(/\s+/g," "))}function titleCaseDisplayName(v){return String(v||"").split(" ").map(w=>w?w.charAt(0).toLocaleUpperCase("vi-VN")+w.slice(1):w).join(" ")}function randomNumericPassword(n=12){const a=new Uint32Array(n);crypto.getRandomValues(a);return Array.from(a,x=>String(x%10)).join("")}function normalizeRoomName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,40)}function publicMember(m){return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,source:m.source,createdAt:m.createdAt,updatedAt:m.updatedAt,currentRoomCode:m.currentRoomCode||null,ready:!!m.ready,stats:m.stats||{wins:0,losses:0},history:Array.isArray(m.history)?m.history:[]}}function directoryMember(m){const presenceAt=Number(m?.presenceAt||0),online=presenceAt>0&&(Date.now()-presenceAt)<=PRESENCE_TTL,stats=m?.stats&&typeof m.stats==="object"?{wins:Number(m.stats.wins||0),losses:Number(m.stats.losses||0)}:{wins:0,losses:0},history=Array.isArray(m?.history)?m.history.slice(0,50).map(x=>({matchId:String(x?.matchId||""),result:x?.result==="win"?"win":"loss",roomCode:String(x?.roomCode||""),roomName:String(x?.roomName||""),gameName:String(x?.gameName||""),roleName:String(x?.roleName||""),faction:String(x?.faction||""),winnerFaction:String(x?.winnerFaction||""),playedAt:x?.playedAt||null})):[];return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,source:m.source||"WEB",createdAt:m.createdAt,updatedAt:m.updatedAt,lastSeenAt:m.lastSeenAt||null,online,currentRoomCode:online?(m.currentRoomCode||null):null,ready:online?!!m.ready:false,resetRequestedAt:m.resetRequestedAt||null,passwordResetAt:m.passwordResetAt||null,stats,history}}function publicRoom(m){return{code:m.code,roomName:m.roomName||("Phòng "+m.code),matchId:m.matchId||null,matchRevision:Number(m.matchRevision||0),deliveryVersion:Number(m.deliveryVersion||0),resetVersion:Number(m.resetVersion||0),status:m.status,phase:m.phase||"lobby",locked:!!m.locked,enabled:m.enabled!==false,roomMode:normalizeRoomMode(m.roomMode),seatCount:normalizeSeatCount(m.seatCount,Number(m.playerCount||0)||12),gameName:m.gameName||"",playerCount:Number(m.playerCount||0),cycleKey:m.cycleKey||null,cyclePhase:m.cyclePhase||null,cycleNight:Number(m.cycleNight||0),roleDeliveredAt:m.roleDeliveredAt||null,startedAt:m.startedAt||null,endedAt:m.endedAt||null,winnerFaction:m.winnerFaction||null,winnerLabel:m.winnerLabel||null,resultVersion:Number(m.resultVersion||0),deletedAt:m.deletedAt||null,createdAt:m.createdAt,updatedAt:m.updatedAt}}function publicPlayer(p){const hb=Number(p?.lastHeartbeatAt||0)||Date.parse(p?.lastSeenAt||"")||0,online=hb>0&&(Date.now()-hb)<=ROOM_PLAYER_TTL;return{participantId:p.participantId,kind:p.kind,loginId:p.loginId||null,displayName:p.displayName,avatarId:p.avatarId,gameCharacterId:normalizeGameCharacterId(p.gameCharacterId)||null,seatId:Number(p.seatId||0)||null,setupComplete:!!normalizeGameCharacterId(p.gameCharacterId)&&Number(p.seatId||0)>0,online,ready:!!p.ready,reservedByGM:p.reservedByGM===true,joinedAt:p.joinedAt,lastSeenAt:p.lastSeenAt,lastHeartbeatAt:hb||null}}
async function derivePasswordHash(password,salt,iterations=PBKDF2_ITERATIONS){const count=Number(iterations);if(!Number.isSafeInteger(count)||count<1)throw new Error("INVALID_PASSWORD_ITERATIONS");const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),{name:"PBKDF2"},false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:count},key,256);return bytesToBase64(new Uint8Array(bits))}async function verifyPassword(password,m){const iterations=Number(m?.passwordIterations)||PBKDF2_ITERATIONS;return timingSafeEqual(await derivePasswordHash(password,base64ToBytes(m.passwordSalt),iterations),m.passwordHash)}async function sha256(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}function randomToken(n){return bytesToBase64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}function bytesToBase64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}function base64ToBytes(v){const s=atob(v);return Uint8Array.from(s,c=>c.charCodeAt(0))}function bearer(r){const h=r.headers.get("Authorization")||"";return h.startsWith("Bearer ")?h.slice(7).trim():""}async function safeJson(r){try{return await r.json()}catch{return null}}function j(data,status=200){return Response.json(data,{status,headers:{...corsHeaders(),"cache-control":"no-store"}})}function corsHeaders(){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,PUT,DELETE,OPTIONS","access-control-allow-headers":"content-type,authorization","x-content-type-options":"nosniff","referrer-policy":"no-referrer"}}
