// GMWW FAST G3.6 — authoritative Seat, movement and public Player Web DTO contract.
// Pure helpers and read-only projections lifted unchanged from the production Worker.
import "../assets/village/village-layout.js";
import {normalizeSeatCount} from "./gmww-room-config-rules.js";
import {activeGameCharacterId,normalizeLoginId} from "./gmww-player-identity-rules.js";
import {villageAutoLife,VILLAGE_AUTO_SIT_MS} from "./gmww-village-autolife.js";
import {character40StateFromPlayer as characterStateFromPlayer} from "./gmww-character40-catalog.js";
const villageLayout=globalThis.GMWW_VILLAGE_LAYOUT;
export const ROOM_PLAYER_TTL=70*1000;
export function normalizeVillageCoord(v,fallback=50){const n=Number(v);return Number.isFinite(n)?Math.max(4,Math.min(96,Math.round(n*100)/100)):Math.max(4,Math.min(96,Number(fallback)||50))}
export function currentMovementPosition(p,now=Date.now(),fallbackX=50,fallbackY=78){if(p?.movementStatus==='moving'&&p?.moveStartedAt&&p?.moveDurationMs)return villageLayout.interpolate(p,now);return{x:normalizeVillageCoord(p?.positionX,fallbackX),y:normalizeVillageCoord(p?.positionY,fallbackY)}}
export function clearPlayerMovement(p,{keepPosition=false}={}){if(!p)return p;if(!keepPosition){const pos=currentMovementPosition(p);p.positionX=pos.x;p.positionY=pos.y}p.moveId=null;p.moveFromX=null;p.moveFromY=null;p.moveToX=null;p.moveToY=null;p.moveStartedAt=null;p.moveDurationMs=null;p.moveTargetSeatId=null;p.movementStatus="idle";p.autoMotionPhase=null;p.villageActivity="idle";p.sitStartedAt=null;p.sitUntil=null;return p}
export function normalizeSeatLayout(shape){return villageLayout.normalizeSeatLayout(shape)}
export function normalizeSeatId(v,seatCount){const n=Math.trunc(Number(v));return Number.isFinite(n)&&n>=1&&n<=normalizeSeatCount(seatCount)?n:null}

export function firstFreeSeat(players,seatCount,excludeId=""){const used=new Set(Object.entries(players||{}).filter(([id])=>id!==excludeId).map(([,p])=>Number(p?.seatId||0)).filter(n=>n>=1));for(let n=1;n<=normalizeSeatCount(seatCount);n++)if(!used.has(n))return n;return null}
export function enforceUniqueSeatClaims(players,seatCount){const claimed=new Set();for(const p of Object.values(players||{})){const seatId=normalizeSeatId(p?.seatId,seatCount);if(!seatId||claimed.has(seatId)){if(p){p.seatId=null;p.ready=p.reservedByGM===true}continue}claimed.add(seatId);p.seatId=seatId}return players}
export function playerSetupComplete(meta,p){return !!activeGameCharacterId(p?.gameCharacterId,p?.loginId||p?.participantId)&&!!normalizeSeatId(p?.seatId,meta?.seatCount)}

export function publicPlayer(p){
  const now=Date.now(),hb=Number(p?.lastHeartbeatAt||0)||Date.parse(p?.lastSeenAt||"")||0,online=p?.demoBot===true||(hb>0&&(now-hb)<=ROOM_PLAYER_TTL),view=roomPlayerPresence(p,now);
  return{participantId:p.participantId,kind:p.kind,loginId:p.loginId||null,displayName:p.displayName,avatarId:p.avatarId,gameCharacterId:activeGameCharacterId(p.gameCharacterId,p.loginId||p.participantId),seatId:Number(p.seatId||0)||null,setupComplete:!!activeGameCharacterId(p.gameCharacterId,p.loginId||p.participantId)&&Number(p.seatId||0)>0,positionX:view.positionX==null?null:normalizeVillageCoord(view.positionX),positionY:view.positionY==null?null:normalizeVillageCoord(view.positionY),movementStatus:view.movementStatus==="moving"?"moving":"idle",characterAnimation:characterStateFromPlayer(p),villageActivity:String(view.villageActivity||"idle"),sitStartedAt:Number(view.sitStartedAt||0)||null,sitUntil:Number(view.sitUntil||0)||null,moveId:view.moveId||null,moveFromX:view.moveFromX==null?null:normalizeVillageCoord(view.moveFromX),moveFromY:view.moveFromY==null?null:normalizeVillageCoord(view.moveFromY),moveToX:view.moveToX==null?null:normalizeVillageCoord(view.moveToX),moveToY:view.moveToY==null?null:normalizeVillageCoord(view.moveToY),moveStartedAt:Number(view.moveStartedAt||0)||null,moveDurationMs:Number(view.moveDurationMs||0)||null,moveTargetSeatId:Number(view.moveTargetSeatId||0)||null,online,ready:!!p.ready,reservedByGM:p.reservedByGM===true,joinedAt:p.joinedAt,lastSeenAt:p.lastSeenAt,lastHeartbeatAt:hb||null}
}

export function roomPlayerPresence(p,now=Date.now()){
  const id=String(p?.participantId||p?.loginId||"player"),seatId=Number(p?.seatId||0),started=Number(p?.moveStartedAt||0),duration=Math.max(0,Number(p?.moveDurationMs||0)),arrivedAt=started+duration,sitUntil=Number(p?.sitUntil||0),moving=p?.movementStatus==="moving"&&started>0&&duration>0&&now<arrivedAt,currentSit=String(p?.villageActivity||"")==="sitting"&&sitUntil>now,targetSeat=Number(p?.moveTargetSeatId||0);
  if(seatId||moving||currentSit||targetSeat){
    const atDestination=!moving&&started>0&&duration>0,px=atDestination?p?.moveToX:p?.positionX,py=atDestination?p?.moveToY:p?.positionY;
    return{positionX:px,positionY:py,movementStatus:moving?"moving":"idle",villageActivity:moving?String(p?.villageActivity||"moving"):currentSit?"sitting":"idle",sitStartedAt:currentSit?Number(p?.sitStartedAt||0)||null:null,sitUntil:currentSit?sitUntil:null,moveId:moving?p?.moveId||null:null,moveFromX:moving?p?.moveFromX:null,moveFromY:moving?p?.moveFromY:null,moveToX:moving?p?.moveToX:null,moveToY:moving?p?.moveToY:null,moveStartedAt:moving?started:null,moveDurationMs:moving?duration:null,moveTargetSeatId:targetSeat||null};
  }
  const spawn=villageLayout.spawn(id),x=Number.isFinite(Number(p?.moveToX))?Number(p.moveToX):Number.isFinite(Number(p?.positionX))?Number(p.positionX):spawn.x,y=Number.isFinite(Number(p?.moveToY))?Number(p.moveToY):Number.isFinite(Number(p?.positionY))?Number(p.positionY):spawn.y,afterSit=sitUntil>0&&sitUntil<=now,anchorAt=afterSit?sitUntil:(arrivedAt>0?arrivedAt:(Date.parse(p?.joinedAt||"")||Date.parse(p?.lastSeenAt||"")||now));
  return villageAutoLife({id:"room:"+id,now,anchorAt,anchorPoint:{x,y},stagger:!(afterSit||arrivedAt>0)},villageLayout);
}


export function villagePresence(m){
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

