// Server-side guard for Hắc Ngọc Hủy Diệt (Artifact 25).
// Do not disclose the removed card's identity to the action result or public events.
const login=value=>String(value??'').trim().toLowerCase().replace(/^member:/,'');
export function validateUnrevealedArtifactDestroy({
  actorId,targetId,artifact,assignment,matchId
}={}){
  const invalid={ok:false,error:'DESTROY_TARGET_NOT_UNREVEALED'};
  if(!login(actorId)||!login(targetId)||login(actorId)===login(targetId))return invalid;
  if(!artifact||artifact.removedFromMatch===true||!artifact.artifactId||
    (artifact.matchId&&String(artifact.matchId)!==String(matchId||'')))return invalid;
  if(!assignment||login(assignment.loginId)!==login(targetId)||
    String(assignment.artifactId||'')!==String(artifact.artifactId))return invalid;
  if(artifact.viewedAt||assignment.artifactViewedAt||
    artifact.usedAt||assignment.artifactUsedAt)return invalid;
  return {ok:true,artifactId:String(artifact.artifactId)};
}
