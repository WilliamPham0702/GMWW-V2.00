import {coreCastingKind} from './stage11-core-action-bridge.mjs';
import {ARENA_FAMILIES} from './stage14-dynamic-actions.mjs';
// Arena3D staging only: turn-driven choreography. Never infer turns, roles or victims on Player Web.
// Stage/GM owns secret cues; public players see ONLY approved public status effects.
export const CHOREOGRAPHY_VERSION='gmww.arena.cast.v1';
const ALLOWED=new Set(['shield','heal','inspect','attack','vote']);
const ID=/^[a-z0-9._-]{1,80}$/i;
export const visibleId=id=>String(id||'').startsWith('member:')&&ID.test(String(id).slice(7))?String(id):null;
export function classifyCastingAction(actionId){
  const id=String(actionId||'').toLowerCase();
  const canonical=coreCastingKind(id);
  if(canonical)return canonical;
  if(['action_protect','action_guard','action_guard_protect','action_shield'].includes(id))return 'shield';
  if(['action_witch_save','action_witch_heal','action_revive','action_heal'].includes(id))return 'heal';
  if(['action_prophet','action_prophet_inspect','action_seer','action_inspect','action_theologian','action_aura_prophet'].includes(id))return 'inspect';
  if(['action_wolf_bite','action_witch_kill','action_poison','action_kill','action_hunter_shot'].includes(id))return 'attack';
  return null;
}
export function stageCastingCue({matchId,cycleKey,phase,turnId,actorIds,targetIds=[],kind,createdAt,expiresAt,actionId='',roleId='',visualFamily=''},now=Date.now()){
  const actors=[...new Set((actorIds||[]).map(visibleId).filter(Boolean))].slice(0,30);
  const targets=[...new Set((targetIds||[]).map(visibleId).filter(Boolean))].slice(0,30);
  const start=Number(createdAt),expiry=Number(expiresAt);
  if(!matchId||!cycleKey||phase!=='night'&&phase!=='morning')return null;
  if(!actors.length||!String(turnId||'').trim())return null;
  const active=ALLOWED.has(kind)&&Number.isFinite(start)&&Number.isFinite(expiry)&&
    expiry>now&&start<=now+2000&&expiry-start<=8000;
  return {
    matchId:String(matchId).slice(0,128),cycleKey:String(cycleKey).slice(0,128),
    phase,turnId:String(turnId).slice(0,160),actorIds:actors,
    // Target identifiers are restricted to authorized-GM responses.
    cast:active?{actorId:actors[0],targetIds:targets,kind,startedAt:start,expiresAt:expiry,
      actionId:typeof actionId==='string'?actionId.slice(0,90):'',
      roleId:typeof roleId==='string'?roleId.slice(0,90):'',
      visualFamily:ARENA_FAMILIES.includes(visualFamily)?visualFamily:''}:null
  };
}
export function publicCastingState(room,cue,{authorizedGM=false}={}){
  if(!authorizedGM||!room||!cue||room.matchId!==cue.matchId||room.cycleKey!==cue.cycleKey||
     room.phase!=='running'||room.cyclePhase!==cue.phase)return null;
  return cue;
}
export function choreographyPose(actor,time,{lowMotion=false}={}){
  if(!actor)return {stand:0,casting:0};
  const start=Number(actor.standAt)||0,last=Number(actor.standUntil)||0;
  const standing=time>=start&&time<last;
  const inTime=Math.min(1,Math.max(0,(time-start)/480));
  const outTime=Math.min(1,Math.max(0,(last-time)/560));
  const stand=standing?lowMotion?1:Math.min(inTime,outTime):0;
  const until=Number(actor.castUntil)||0;
  return {stand,casting:standing&&time<until&&time>=Number(actor.castStartedAt||0)?1:0};
}


// Render-only staging movement. The authoritative seat coordinate never changes.
export const WALK_TIMING=Object.freeze({approachMs:850,returnMs:920,standMs:420,seatMs:420});
const clamp01=n=>Math.min(1,Math.max(0,n));
const smooth=n=>{const t=clamp01(n);return t*t*(3-2*t)};
export function approachPoint(seat,{fireX=0,fireZ=1.8,step=1.6,clearance=1.7}={}){
  const x=Number(seat?.x),z=Number(seat?.z);
  if(!Number.isFinite(x)||!Number.isFinite(z))return {x:0,z:0};
  const radius=Math.hypot(x,z);
  if(radius<.01)return {x,z};
  const safeRadius=Math.min(2.6,Math.max(.5,clearance));
  if(Math.hypot(x-fireX,z-fireZ)<=safeRadius)return {x,z};
  const amount=Math.min(1.9,Math.max(.3,step),radius*.42);
  const dest={x:x*(1-amount/radius),z:z*(1-amount/radius)};
  // Use a binary search for the longest inward walk whose entire segment
  // stays outside the campfire. Never modify the authoritative seat position.
  const safe=t=>{
    const endX=x+(dest.x-x)*t,endZ=z+(dest.z-z)*t;
    const sx=x-fireX,sz=z-fireZ,dx=endX-x,dz=endZ-z;
    const nearest=Math.max(0,Math.min(1,-(sx*dx+sz*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(sx+dx*nearest,sz+dz*nearest)>=safeRadius;
  };
  let lo=0,hi=1;
  for(let i=0;i<13;i++){const mid=(lo+hi)*.5;if(safe(mid))lo=mid;else hi=mid}
  return {x:x+(dest.x-x)*lo,z:z+(dest.z-z)*lo};
}
export function travelProgress(travel,now){
  if(!travel)return 0;
  const start=Number(travel.startedAt),duration=Number(travel.duration);
  const from=Number(travel.from),to=Number(travel.to);
  if(![start,duration,from,to].every(Number.isFinite)||duration<=0)return 0;
  return from+(to-from)*smooth((now-start)/duration);
}
export function renderWalkPosition(seat,approach,travel,now){
  const p=clamp01(travelProgress(travel,now));
  return {x:seat.x+(approach.x-seat.x)*p,z:seat.z+(approach.z-seat.z)*p};
}
