// Artifact #17 — server-side ownership and replacement-deck guard.
// The rules never generate an Artifact from an absent or unapproved catalog.
const login=x=>String(x??'').trim().toLowerCase().replace(/^member:/,'');
export function validateArtifactSteal({actorId,targetId,actorArtifact,targetArtifact,assignments=[],matchId}={}){
  const invalid=(error='ARTIFACT_STEAL_TARGET_INVALID')=>({ok:false,error});
  const actor=login(actorId),target=login(targetId);
  if(!actor||!target||actor===target)return invalid();
  const source=assignments.filter(a=>login(a.loginId)===actor),
    victim=assignments.filter(a=>login(a.loginId)===target);
  if(source.length!==1||victim.length!==1)return invalid('ARTIFACT_STEAL_SINGLE_ROLE_REQUIRED');
  if(actorArtifact?.artifactId!=='artifact_17'||String(source[0].artifactId||'')!=='artifact_17'||
     actorArtifact.removedFromMatch===true||
     actorArtifact.matchId&&String(actorArtifact.matchId)!==String(matchId||''))
    return invalid('ARTIFACT_STEAL_NOT_OWNED');
  if(!targetArtifact?.artifactId||targetArtifact.removedFromMatch===true||
     targetArtifact.matchId&&String(targetArtifact.matchId)!==String(matchId||'')||
     String(victim[0].artifactId||'')!==String(targetArtifact.artifactId||'')||
     targetArtifact.viewedAt||victim[0].artifactViewedAt||
     targetArtifact.usedAt||victim[0].artifactUsedAt)
    return invalid();
  return {ok:true,actorId:actor,targetId:target,
    stolenArtifactId:String(targetArtifact.artifactId)};
}
export function eligibleArtifactReplacements({configured=[],assignments=[],catalog=[]}={}){
  const active=new Set(assignments.map(row=>String(row.artifactId||'')).filter(Boolean));
  const available=new Set(catalog.map(row=>String(row.artifactId||'')).filter(Boolean));
  return [...new Set(configured.map(x=>String(x?.artifactId||'')).filter(Boolean))]
    .filter(id=>!active.has(id)&&available.has(id)).sort();
}
export function applyArtifactStealSummary({assignments=[],actorId,targetId,stolen,replacement,now}={}){
 const actor=login(actorId),target=login(targetId);
 const summary=(artifact,loginId)=>({artifactId:artifact.artifactId,
   artifactName:artifact.artifactName,artifactDeliveredAt:now,artifactViewedAt:null,
   artifactUsedAt:null,artifactPriorityFirst:artifact.priorityFirst===true,
   artifactSingleUse:artifact.singleUse===true});
 return assignments.map(row=>login(row.loginId)===actor?
   {...row,...summary(stolen,actor),deliveredAt:now}:
   login(row.loginId)===target?
   {...row,...summary(replacement,target),deliveredAt:now}:row);
}
export function artifactForNewOwner(card,newOwner,now){
 return {...card,loginId:login(newOwner),deliveredAt:now,viewedAt:null,usedAt:null,
   lastActivation:null,removedFromMatch:false};
}
