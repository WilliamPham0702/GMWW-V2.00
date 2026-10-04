// Public appearance is independent of secret roles and factions.
export const CHARACTER_IDS=Object.freeze(Array.from({length:42},(_,i)=>`chibi-${String(i+1).padStart(2,'0')}`));
export function validCharacterId(id){return CHARACTER_IDS.includes(id)}
export function interactionScreen({phase='lobby',alive=true,blocked=false,turn=null}={}){
  if(!alive)return 'spectator';
  if(phase==='lobby'||phase==='role_delivery')return 'waiting';
  if(phase==='vote')return 'vote';
  if(phase==='day'||phase==='morning')return 'discussion';
  if(phase==='night')return blocked||!turn?'sleep':turn.kind==='wolf-introduction'?'wolf-introduction':'action';
  return 'waiting';
}
export function validateTargetSubmission({request,session,turn,players=[],matchId,cycleKey,now=Date.now()}){
  if(!session?.playerId)return {ok:false,error:'UNAUTHENTICATED'};
  if(!turn||turn.closed)return {ok:false,error:'TURN_CLOSED'};
  if(request?.matchId!==matchId||request?.cycleKey!==cycleKey||request?.turnId!==turn.id)return {ok:false,error:'STALE_TURN'};
  if(!turn.actorIds?.includes(session.playerId))return {ok:false,error:'NOT_YOUR_TURN'};
  if(turn.deadline&&now>=turn.deadline)return {ok:false,error:'TURN_EXPIRED'};
  if(!request?.requestId)return {ok:false,error:'REQUEST_ID_REQUIRED'};
  const targets=Array.isArray(request.targetIds)?request.targetIds:[];
  if(new Set(targets).size!==targets.length)return {ok:false,error:'DUPLICATE_TARGET'};
  if(targets.length<(turn.minTargets??1)||targets.length>(turn.maxTargets??1))return {ok:false,error:'TARGET_COUNT'};
  const eligible=new Set(turn.eligibleTargetIds||[]);
  for(const id of targets)if(!eligible.has(id)||!players.some(p=>p.id===id))return {ok:false,error:'INVALID_TARGET'};
  return {ok:true,actorId:session.playerId,targetIds:targets.slice(),requestId:request.requestId};
}
