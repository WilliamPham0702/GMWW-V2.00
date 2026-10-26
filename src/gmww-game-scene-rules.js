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
export function buildNightQueue({night,normalTurns=[],artifactOwners=[],artifactsEnabled}){
  const queue=[],n=Math.max(1,Number(night)||1);
  const enabled=artifactsEnabled===true||(artifactsEnabled!==false&&artifactOwners.length>0);
  // ART-01: Night 1 starts with the Artifact stage, before Wolf recognition.
  // Nights 2+ skip it as soon as no usable priority Artifact remains.
  const earlyActions=enabled?artifactOwners.filter(owner=>!owner?.used&&artifactPriorityFirst(owner)).map(owner=>({kind:"early-artifact",name:owner.artifactName||owner.name,artifactId:owner.artifactId,playerId:owner.playerId})):[];
  if(enabled&&(n===1||earlyActions.length>0))
    queue.push({kind:"early-artifact-window",label:"Artifact đầu ván",actions:earlyActions});
  if(n===1)queue.push({kind:"wolf-introduction",label:"Bầy Sói"});
  for(const turn of normalTurns){
    if((turn?.artifactId||turn?.artifactName)&&(!enabled||artifactOwners.some(x=>x.playerId===turn.playerId&&(turn.artifactId?x.artifactId===turn.artifactId:x.artifactName===turn.artifactName)&&x.used)))continue;
    queue.push({...turn,kind:turn.kind||"normal"});
  }
  queue.push({kind:"village-wakeup",label:"Làng ơi dậy đi"});
  return queue;
}
export function artifactCycleKey(matchId,night){return String(matchId)+":night:"+Math.max(1,Number(night)||1)}
export function reserveArtifactActivation(state,{requestId,playerId,artifactId,cycleKey,eligible,limit=3}){
  // Call only within a single serialized Durable Object transaction/turn.
  if(state?.cycleKey && state.cycleKey!==cycleKey)return {ok:false,error:"CYCLE_MISMATCH",state};
  const previous=Array.isArray(state?.accepted)?state.accepted:[];
  const retry=previous.find(x=>x.requestId===requestId);
  if(retry)return retry.playerId===playerId&&retry.artifactId===artifactId?{ok:true,idempotent:true,state}:{ok:false,error:"REQUEST_ID_CONFLICT",state};
  if(!eligible)return {ok:false,error:"ARTIFACT_NOT_ELIGIBLE",state};
  if(previous.length>=Math.max(0,Math.min(30,Math.trunc(Number(limit)||0))))return {ok:false,error:"ARTIFACT_CYCLE_LIMIT",state};
  if(previous.some(x=>x.playerId===playerId&&x.artifactId===artifactId))return {ok:false,error:"ARTIFACT_ALREADY_USED",state};
  const next={cycleKey,accepted:[...previous,{requestId,playerId,artifactId}]};
  return {ok:true,count:next.accepted.length,state:next};
}
export function canResumePlayer({phase,rosterIds,playerId}){
  return ["running","role_delivery","lobby"].includes(phase)&&Array.isArray(rosterIds)&&rosterIds.includes(playerId);
}
