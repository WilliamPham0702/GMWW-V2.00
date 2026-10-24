// Arena3D staging only: turn-driven choreography. Never infer turns, roles or victims on Player Web.
// Stage/GM owns secret cues; public players see ONLY approved public status effects.
export const CHOREOGRAPHY_VERSION='gmww.arena.cast.v1';
const ALLOWED=new Set(['shield','heal','inspect','attack','vote']);
const ID=/^[a-z0-9._-]{1,80}$/i;
export const visibleId=id=>String(id||'').startsWith('member:')&&ID.test(String(id).slice(7))?String(id):null;
export function classifyCastingAction(actionId){
  const id=String(actionId||'').toLowerCase();
  if(['action_protect','action_guard','action_guard_protect','action_shield'].includes(id))return 'shield';
  if(['action_witch_save','action_witch_heal','action_revive','action_heal'].includes(id))return 'heal';
  if(['action_prophet','action_prophet_inspect','action_seer','action_inspect','action_theologian','action_aura_prophet'].includes(id))return 'inspect';
  if(['action_wolf_bite','action_witch_kill','action_poison','action_kill','action_hunter_shot'].includes(id))return 'attack';
  return null;
}
export function stageCastingCue({matchId,cycleKey,phase,turnId,actorIds,targetIds=[],kind,createdAt,expiresAt},now=Date.now()){
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
    cast:active?{actorId:actors[0],targetIds:targets,kind,startedAt:start,expiresAt:expiry}:null
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
  // Ritual space lies inside the seat ring but outside the fire clearance.
  let fraction=Math.max(0,(radius-Math.min(1.9,Math.max(.3,step)))/radius);
  const limit=Math.min(1,Math.max(.5,clearance));
  let candidate={x:x*fraction,z:z*fraction};
  if(Math.hypot(candidate.x-fireX,candidate.z-fireZ)<limit){
    // Fallback retreat towards the original seat: never stand in the fire.
    const dx=x-candidate.x,dz=z-candidate.z;
    const distance=Math.hypot(dx,dz)||1;
    candidate={x:fireX+(candidate.x-fireX)*(limit/Math.max(.001,Math.hypot(candidate.x-fireX,candidate.z-fireZ))),
      z:fireZ+(candidate.z-fireZ)*(limit/Math.max(.001,Math.hypot(candidate.x-fireX,candidate.z-fireZ)))};
    const foot=Math.hypot(candidate.x-x,candidate.z-z);
    if(foot>1.9){const t=1.9/foot;candidate={x:x+(candidate.x-x)*t,z:z+(candidate.z-z)*t}}
    // If the seat itself is inside clearance, no movement can improve the situation.
    if(Math.hypot(x-fireX,z-fireZ)<limit)return {x,z};
    // Avoid walking through the fire; if the path would cross its circle, stay seated.
    const sx=x-fireX,sz=z-fireZ,ex=candidate.x-fireX,ez=candidate.z-fireZ;
    const segX=ex-sx,segZ=ez-sz;
    const t=Math.max(0,Math.min(1,-(sx*segX+sz*segZ)/(segX*segX+segZ*segZ||1)));
    if(Math.hypot(sx+segX*t,sz+segZ*t)<limit)return {x,z};
    void dx;void dz;void distance;
  }
  return {x:candidate.x,z:candidate.z};
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
