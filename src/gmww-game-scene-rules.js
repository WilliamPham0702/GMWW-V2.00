// Pure, backwards-compatible rules for the GM 2D scene integration.
// No storage migration and no implicit phase advancement.
export const EARLY_ARTIFACTS = Object.freeze(["Đá Đổi Vai Trò","Tráng Gương","Mắt Tiên Tri"]);
const foldName = value => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d").replace(/[^a-z0-9]+/g," ").trim();
// Only used to migrate older cards that have never stored an explicit flag.
export function defaultPriorityFirst(name){
  return new Set(["da doi vai tro","da hoan doi","doi vai tro","trang guong","mat tien tri"]).has(foldName(name));
}
export function artifactPriorityFirst(artifact){
  const value=artifact?.priorityFirst??artifact?.artifact?.priorityFirst;
  return typeof value==="boolean"?value:defaultPriorityFirst(artifact?.artifactName||artifact?.name);
}
export function buildNightQueue({night,normalTurns=[],artifactOwners=[]}){
  const queue=[];
  if(night===1) queue.push({kind:"wolf-introduction",label:"Bầy Sói ơi dậy đi nhìn mặt nhau"});
  // Every cycle, eligible configured Artifacts act before roles. No unused
  // Artifact is consumed simply by appearing in this opening window.
  for(const owner of artifactOwners){
    if(!owner?.used&&artifactPriorityFirst(owner))queue.push({kind:"early-artifact",name:owner.artifactName||owner.name,artifactId:owner.artifactId,playerId:owner.playerId});
  }
  for(const turn of normalTurns){
    if((turn?.artifactId||turn?.artifactName)&&artifactOwners.some(x=>x.playerId===turn.playerId&&(turn.artifactId?x.artifactId===turn.artifactId:x.artifactName===turn.artifactName)&&x.used))continue;
    queue.push({...turn,kind:turn.kind||"normal"});
  }
  return queue;
}
export function artifactCycleKey(matchId,night){return String(matchId)+":night:"+Math.max(1,Number(night)||1)}
export function reserveArtifactActivation(state,{requestId,playerId,artifactId,cycleKey,eligible,limit=3}){
  // Call only within a single serialized Durable Object transaction/turn.
  if(state?.cycleKey && state.cycleKey!==cycleKey)return {ok:false,error:"CYCLE_MISMATCH",state};
  const previous=Array.isArray(state?.accepted)?state.accepted:[];
  if(previous.some(x=>x.requestId===requestId))return {ok:true,idempotent:true,state};
  if(!eligible)return {ok:false,error:"ARTIFACT_NOT_ELIGIBLE",state};
  if(previous.length>=Math.max(0,Math.min(30,Math.trunc(Number(limit)||0))))return {ok:false,error:"ARTIFACT_CYCLE_LIMIT",state};
  if(previous.some(x=>x.playerId===playerId&&x.artifactId===artifactId))return {ok:false,error:"ARTIFACT_ALREADY_USED",state};
  const next={cycleKey,accepted:[...previous,{requestId,playerId,artifactId}]};
  return {ok:true,count:next.accepted.length,state:next};
}
export function canResumePlayer({phase,rosterIds,playerId}){
  return ["running","role_delivery","lobby"].includes(phase)&&Array.isArray(rosterIds)&&rosterIds.includes(playerId);
}
