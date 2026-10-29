// GMWW FAST G3.7 — authoritative public Room DTO and status visibility policy.
// Copied from Worker without changing serialized contract or business rules.
import {normalizeLoginId} from "./gmww-player-identity-rules.js";
import {normalizeRoomMode,normalizeSeatMoveMode,normalizeSeatCount} from "./gmww-room-config-rules.js";
import {normalizeSeatLayout} from "./gmww-village-player-state.js";
import {resolveWolfNight} from "./gmww-wolf-night-resolution.js";
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
// Visual display permission IDs do not define gameplay status, duration, or priority.
export const STATUS_VISUAL_IDS=new Set(["frozen","protected","wolf_bitten","marked","dead","expelled","infected","mute","disabled_permanent","linked","recover","transform","attack","inspect","hunt","visited","disabled_2n"]);
const STATUS_VISUAL_LEGACY={
  frozen:{label:"Đóng Băng",icon:"❄️"},
  expelled:{label:"Bị Đuổi",icon:"🚪"},
  dead:{label:"Đã Chết",icon:"💀"},
  assassin_mark:{label:"Đánh Dấu",icon:"🎯",statusId:"marked"}
};
// Read-only UI projection of confirmed night actions. No gameplay status is written.
// effect_notice receipts intentionally have effectActive=false; that means "no persistent
// rule effect", NOT "unconfirmed". Never publish hidden night targets by default.
export function confirmedNightStatusVisuals(rows,meta,players={}){
  const matchId=String(meta?.matchId||""),night=Number(meta?.cycleNight||0);
  if(!matchId||!Number.isInteger(night)||night<1||
    String(meta?.phase||"").toLowerCase()!=="running"||
    String(meta?.cyclePhase||"").toLowerCase()!=="night")return [];
  const visualActions={action_protect:{statusId:"protected",label:"Bảo Vệ",icon:"🛡️"},
    action_wolf_bite:{statusId:"wolf_bitten",label:"Sói Cắn",icon:"🐺"},
    action_hunt:{statusId:"hunt",label:"Săn",icon:"🏹"},
    action_visit_house:{statusId:"visited",label:"Thăm Nhà",icon:"💋"}};
  const wolf=resolveWolfNight({interactions:rows,players,matchId,night});
  const transferred=new Map(wolf.ok?(wolf.attacked||[]).map(x=>[normalizeLoginId(x.from),normalizeLoginId(x.to)]):[]);
  return (Array.isArray(rows)?rows:[]).filter(x=>
    x?.type==="effect_notice"&&visualActions[String(x?.actionId||"")]&&
    String(x?.matchId||"")===matchId&&Number(x?.night)===night&&
    !!normalizeLoginId(x?.loginId)&&!x?.undone&&!x?.expiredAt)
    .filter(x=>x.actionId!=="action_wolf_bite"||wolf.ok)
    .map(x=>({...x,loginId:x.actionId==="action_wolf_bite"?(transferred.get(normalizeLoginId(x.loginId))||x.loginId):x.loginId,
      type:"status",statusId:visualActions[x.actionId].statusId,
      label:visualActions[x.actionId].label,icon:visualActions[x.actionId].icon,
      effectActive:true,visualOnly:true}));
}
export function statusTagsFor(rows,meta,loginId,players={}){
  const display=meta?.statusDisplay||{},now=Date.now(),matchId=String(meta?.matchId||"");
  const valid=x=>x?.effectActive!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>now);
  const expanded=activeStatusRows(rows,loginId,matchId).filter(x=>valid(x)&&STATUS_DEFS[x.statusId]&&display[x.statusId]===true).map(x=>({statusId:x.statusId,label:STATUS_DEFS[x.statusId].label,icon:STATUS_DEFS[x.statusId].icon}));
  const tags=new Map(expanded.map(x=>[x.statusId,x]));
  // Explicit GM permission is mandatory for private night-action receipts.
  // Do not synthesize visible gameplay status records, alter duration, or leak the actor.
  for(const x of confirmedNightStatusVisuals(rows,meta,players)){
    if(normalizeLoginId(x.loginId)!==normalizeLoginId(loginId)||display[x.statusId]!==true)continue;
    tags.set(x.statusId,{statusId:x.statusId,label:x.label,icon:x.icon});
  }
  for(const row of (Array.isArray(rows)?rows:[])){
    const kind=STATUS_VISUAL_LEGACY[row?.type];if(!kind||!valid(row)||normalizeLoginId(row?.loginId)!==normalizeLoginId(loginId))continue;
    if(row?.matchId&&matchId&&String(row.matchId)!==matchId)continue;
    const statusId=kind.statusId||row.type;
    const canSee=display[statusId]===true;
    if(canSee)tags.set(statusId,{statusId,label:kind.label,icon:kind.icon});
  }
  return [...tags.values()];
}
export function publicRoom(m){return{seatOffset:globalThis.GMWW_VILLAGE_LAYOUT?.normalizeSeatOffset(m.seatOffset)||{x:0,y:0},seatSpacing:globalThis.GMWW_VILLAGE_LAYOUT?.normalizeSeatSpacing(m.seatSpacing)||100,statusDisplay:m.statusDisplay&&typeof m.statusDisplay==="object"?m.statusDisplay:{},gmStage:roomUiStage(m),gmStageRevision:Number(m.gmStageRevision||0),code:m.code,roomName:m.roomName||("Phòng "+m.code),matchId:m.matchId||null,lastEndedMatchId:m.lastEndedMatchId||null,matchRevision:Number(m.matchRevision||0),deliveryVersion:Number(m.deliveryVersion||0),resetVersion:Number(m.resetVersion||0),status:m.status,phase:m.phase||"lobby",locked:!!m.locked,seatsLocked:!!m.seatsLocked,enabled:m.enabled!==false,autoGM:m.autoGM!==false,demo:m.demo===true,roomMode:normalizeRoomMode(m.roomMode),seatMoveMode:normalizeSeatMoveMode(m.seatMoveMode),seatCount:normalizeSeatCount(m.seatCount,Number(m.playerCount||0)||12),seatLayout:normalizeSeatLayout(m.seatLayout),gameName:m.gameName||"",playerCount:Number(m.playerCount||0),cycleKey:m.cycleKey||null,cyclePhase:m.cyclePhase||null,cycleNight:Number(m.cycleNight||0),cycleStartedAt:m.cycleStartedAt||null,dayDeadlineAt:m.dayDeadlineAt||null,dayPausedRemainingMs:m.autoGM===false&&m.autoPausedRemainingMs!=null?Math.max(0,Number(m.autoPausedRemainingMs)||0):null,roleDeliveredAt:m.roleDeliveredAt||null,startedAt:m.startedAt||null,endedAt:m.endedAt||null,winnerFaction:m.winnerFaction||null,winnerLabel:m.winnerLabel||null,resultVersion:Number(m.resultVersion||0),deletedAt:m.deletedAt||null,createdAt:m.createdAt,updatedAt:m.updatedAt}}
