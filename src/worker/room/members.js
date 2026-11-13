// Tài khoản thành viên: đăng ký, đăng nhập, mật khẩu, hồ sơ, phiên, hiện diện.
import { GM_SYNC_TOKEN, LOGIN_RE, PBKDF2_ITERATIONS } from "../config.js";
import { bearer, j } from "../http/responses.js";
import { bytesToBase64, derivePasswordHash, sha256, verifyPassword } from "../support/crypto.js";
import { directoryMember, disableMemberPassword, normalizeDisplayName, publicMember } from "../support/member-records.js";
import { isValidRoomCode, normalizeRoomCode } from "../support/room-access.js";
import { GMWW_MEMBER_AVATARS } from "../../gmww-avatars.js";
import { shouldSkipMemberHeartbeat, shouldSkipMemberSessionTouch } from "../../gmww-do-write-optimizer.js";
import { normalizeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";

export class RoomMemberMethods {
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
    // GM disband release (expected room, no new room) must not refresh presence:
    // otherwise offline accounts removed from the room look online in the lobby.
    const gmRelease=!!expected&&!requestedRoomCode;
    if(!gmRelease){member.presenceAt=Date.now();member.lastSeenAt=new Date().toISOString()}
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
}
