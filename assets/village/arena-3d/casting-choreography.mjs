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
