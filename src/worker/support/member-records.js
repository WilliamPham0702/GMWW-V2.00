// Chuẩn hoá và hiển thị bản ghi thành viên.
import { PRESENCE_TTL } from "../config.js";
import { activeGameCharacterId, normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { villagePresence } from "../../gmww-village-player-state.js";

export function disableMemberPassword(m){if(!m||typeof m!=="object")return m;delete m.passwordSalt;delete m.passwordHash;delete m.passwordAlgorithm;delete m.passwordIterations;delete m.resetRequestedAt;delete m.passwordResetAt;m.passwordConfigured=false;m.passwordRequired=false;return m}
export function activeFrozenLoginIds(interactions,meta={},now=Date.now()){
  const matchId=String(meta?.matchId||"");
  return new Set((Array.isArray(interactions)?interactions:[])
    .filter(x=>String(x?.type||"")=="frozen"&&x?.effectActive!==false
      &&(!x?.expiresAt||Date.parse(x.expiresAt)>now)
      &&(!x?.matchId||!matchId||String(x.matchId)===matchId))
    .map(x=>normalizeLoginId(x?.loginId)).filter(Boolean));
}
export function normalizeDisplayName(v){return titleCaseDisplayName(String(v||"").trim().replace(/\s+/g," "))}
export function titleCaseDisplayName(v){return String(v||"").split(" ").map(w=>w?w.charAt(0).toLocaleUpperCase("vi-VN")+w.slice(1):w).join(" ")}
export function randomNumericPassword(n=12){const a=new Uint32Array(n);crypto.getRandomValues(a);return Array.from(a,x=>String(x%10)).join("")}
export function normalizeRoomName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,40)}
export function publicMember(m){return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),lobbyMotionEnabled:m.lobbyMotionEnabled!==false,source:m.source,createdAt:m.createdAt,updatedAt:m.updatedAt,currentRoomCode:m.currentRoomCode||null,ready:!!m.ready,stats:m.stats||{wins:0,losses:0},history:Array.isArray(m.history)?m.history:[]}}
export function directoryMember(m){const presenceAt=Number(m?.presenceAt||0),online=presenceAt>0&&(Date.now()-presenceAt)<=PRESENCE_TTL,stats=m?.stats&&typeof m.stats==="object"?{wins:Number(m.stats.wins||0),losses:Number(m.stats.losses||0)}:{wins:0,losses:0},history=Array.isArray(m?.history)?m.history.slice(0,50).map(x=>({matchId:String(x?.matchId||""),result:x?.result==="win"?"win":"loss",roomCode:String(x?.roomCode||""),roomName:String(x?.roomName||""),gameName:String(x?.gameName||""),roleName:String(x?.roleName||""),faction:String(x?.faction||""),winnerFaction:String(x?.winnerFaction||""),playedAt:x?.playedAt||null})):[];return{loginId:m.loginId,displayName:m.displayName,avatarId:m.avatarId,gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),source:m.source||"WEB",createdAt:m.createdAt,updatedAt:m.updatedAt,lastSeenAt:m.lastSeenAt||null,online,currentRoomCode:online?(m.currentRoomCode||null):null,ready:online?!!m.ready:false,resetRequestedAt:m.resetRequestedAt||null,passwordResetAt:m.passwordResetAt||null,stats,history,...villagePresence(m)}}
