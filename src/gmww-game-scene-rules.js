// Pure, backwards-compatible rules for the GM 2D scene integration.
// No storage migration and no implicit phase advancement.
export const EARLY_ARTIFACTS = Object.freeze(["Tráng Gương","Đá Hoán Đổi","Mắt Tiên Tri","Bùa Hộ Mệnh"]);
export function buildNightQueue({night,normalTurns=[],artifactOwners=[]}){
  const queue=[];
  if(night===1) queue.push({kind:"wolf-introduction",label:"Bầy Sói ơi dậy đi nhìn mặt nhau"});
  for(const name of EARLY_ARTIFACTS){
    const owners=artifactOwners.filter(x=>x?.artifactName===name&&!x.used);
    for(const owner of owners)queue.push({kind:"early-artifact",name,playerId:owner.playerId});
  }
  for(const turn of normalTurns){
    if(turn?.artifactName && artifactOwners.some(x=>x.playerId===turn.playerId&&x.artifactName===turn.artifactName&&x.used))continue;
    queue.push({...turn,kind:turn.kind||"normal"});
  }
  return queue;
}
export function artifactCycleKey(matchId,night){return String(matchId)+":night:"+Math.max(1,Number(night)||1)}
export function reserveArtifactActivation(state,{requestId,playerId,artifactId,cycleKey,eligible}){
  // Call only within a single serialized Durable Object transaction/turn.
  if(state?.cycleKey && state.cycleKey!==cycleKey)return {ok:false,error:"CYCLE_MISMATCH",state};
  const previous=Array.isArray(state?.accepted)?state.accepted:[];
  if(previous.some(x=>x.requestId===requestId))return {ok:true,idempotent:true,state};
  if(!eligible)return {ok:false,error:"ARTIFACT_NOT_ELIGIBLE",state};
  if(previous.length>=3)return {ok:false,error:"ARTIFACT_CYCLE_LIMIT",state};
  if(previous.some(x=>x.playerId===playerId&&x.artifactId===artifactId))return {ok:false,error:"ARTIFACT_ALREADY_USED",state};
  const next={cycleKey,accepted:[...previous,{requestId,playerId,artifactId}]};
  return {ok:true,count:next.accepted.length,state:next};
}
export function canResumePlayer({phase,rosterIds,playerId}){
  return ["running","role_delivery","lobby"].includes(phase)&&Array.isArray(rosterIds)&&rosterIds.includes(playerId);
}
