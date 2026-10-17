// GMWW FAST G3.7 — authoritative public Room DTO and status visibility policy.
// Copied from Worker without changing serialized contract or business rules.
import {normalizeLoginId} from "./gmww-player-identity-rules.js";
import {normalizeRoomMode,normalizeSeatMoveMode,normalizeSeatCount} from "./gmww-room-config-rules.js";
import {normalizeSeatLayout} from "./gmww-village-player-state.js";
export function roomUiStage(m){
  const phase=String(m?.phase||"lobby").toLowerCase();
  if(["running","started","game","playing"].includes(phase))return "battle";
  if(phase==="role_delivery")return "deal";
  const stage=String(m?.gmStage||"room");
  return ["room","seats","game","roles","deal"].includes(stage)?stage:"room";
}
// V3.112 · Trạng thái mở rộng. "exiled/frozen/dead" dùng luồng cũ; các mục dưới đây dùng type "status" + statusId.
export const STATUS_DEFS={wolf_bitten:{label:"Bị sói cắn",icon:"🐺",blocks:false,duration:"morning"},marked:{label:"Bị đánh dấu",icon:"🎯",blocks:false,duration:"morning"},infected:{label:"Bị nhiễm bệnh",icon:"🦠",blocks:false,duration:"permanent"},mute:{label:"Bị câm",icon:"🤐",blocks:false,duration:"permanent"},disabled_permanent:{label:"Mất năng lực vĩnh viễn",icon:"⛔",blocks:true,duration:"permanent"},disabled_2n:{label:"Mất năng lực 2 đêm",icon:"⏳",blocks:true,duration:"nights",nights:2}};
export function activeStatusRows(rows,loginId,matchId){return (Array.isArray(rows)?rows:[]).filter(x=>x?.type==="status"&&x?.effectActive!==false&&normalizeLoginId(x?.loginId)===normalizeLoginId(loginId)&&(!x?.matchId||!matchId||String(x.matchId)===String(matchId)))}
export function statusTagsFor(rows,meta,loginId){const display=meta?.statusDisplay||{};return activeStatusRows(rows,loginId,meta?.matchId).filter(x=>STATUS_DEFS[x.statusId]&&display[x.statusId]===true).map(x=>({statusId:x.statusId,label:STATUS_DEFS[x.statusId].label,icon:STATUS_DEFS[x.statusId].icon}))}
export function publicRoom(m){return{statusDisplay:m.statusDisplay&&typeof m.statusDisplay==="object"?m.statusDisplay:{},gmStage:roomUiStage(m),gmStageRevision:Number(m.gmStageRevision||0),code:m.code,roomName:m.roomName||("Phòng "+m.code),matchId:m.matchId||null,matchRevision:Number(m.matchRevision||0),deliveryVersion:Number(m.deliveryVersion||0),resetVersion:Number(m.resetVersion||0),status:m.status,phase:m.phase||"lobby",locked:!!m.locked,seatsLocked:!!m.seatsLocked,enabled:m.enabled!==false,autoGM:m.autoGM!==false,roomMode:normalizeRoomMode(m.roomMode),seatMoveMode:normalizeSeatMoveMode(m.seatMoveMode),seatCount:normalizeSeatCount(m.seatCount,Number(m.playerCount||0)||12),seatLayout:normalizeSeatLayout(m.seatLayout),gameName:m.gameName||"",playerCount:Number(m.playerCount||0),cycleKey:m.cycleKey||null,cyclePhase:m.cyclePhase||null,cycleNight:Number(m.cycleNight||0),cycleStartedAt:m.cycleStartedAt||null,roleDeliveredAt:m.roleDeliveredAt||null,startedAt:m.startedAt||null,endedAt:m.endedAt||null,winnerFaction:m.winnerFaction||null,winnerLabel:m.winnerLabel||null,resultVersion:Number(m.resultVersion||0),deletedAt:m.deletedAt||null,createdAt:m.createdAt,updatedAt:m.updatedAt}}
