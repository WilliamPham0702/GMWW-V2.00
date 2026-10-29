// Lam Ngọc Định Mệnh (#32): a link never steals or rewrites the donor's Artifact.
// A copied action must come from a real donor-owned Artifact in this match.
// Only the four already-executed inspection actions are currently supported.
const identity=value=>String(value??'').trim().toLowerCase().replace(/^member:/,'');
const SAFE_COPIES=Object.freeze({
 artifact_09:'artifact_action_check_villager',
 artifact_24:'artifact_action_check_third_faction',
 artifact_29:'action_seer',
 artifact_39:'action_destroyer_scry'
});
export function planArtifactLink({actorId,targetId,actorArtifact,donorArtifact,assignments=[],matchId}={}){
 const actor=identity(actorId),donor=identity(targetId);
 if(!actor||!donor||actor===donor)return {ok:false,error:'ARTIFACT_LINK_INVALID_TARGET'};
 const own=assignments.filter(a=>identity(a.loginId)===actor),
       source=assignments.filter(a=>identity(a.loginId)===donor);
 if(own.length!==1||source.length!==1)
   return {ok:false,error:'ARTIFACT_LINK_SINGLE_ROLE_REQUIRED'};
 if(actorArtifact?.artifactId!=='artifact_32'||actorArtifact?.removedFromMatch===true||
   String(own[0].artifactId||'')!=='artifact_32'||
   (actorArtifact.matchId&&String(actorArtifact.matchId)!==String(matchId||'')))
   return {ok:false,error:'ARTIFACT_LINK_NOT_OWNED'};
 if(!donorArtifact?.artifactId||donorArtifact?.removedFromMatch===true||
   String(source[0].artifactId||'')!==String(donorArtifact.artifactId||'')||
   (donorArtifact.matchId&&String(donorArtifact.matchId)!==String(matchId||'')))
   return {ok:false,error:'ARTIFACT_LINK_DONOR_INVALID'};
 const sourceId=String(donorArtifact.artifactId);
 if(!SAFE_COPIES[sourceId])return {ok:false,error:'ARTIFACT_LINK_EXECUTOR_NOT_READY'};
 const fn=(Array.isArray(donorArtifact.artifactCard?.functions)?donorArtifact.artifactCard.functions:[])
   .find(f=>f?.actionId===SAFE_COPIES[sourceId]&&f.passive!==true&&
     ['day','any','both'].includes(f.phase));
 if(!fn)return {ok:false,error:'ARTIFACT_LINK_SOURCE_FUNCTION_INVALID'};
 return {ok:true,link:{actorId:actor,donorId:donor,sourceArtifactId:sourceId,
   actionId:fn.actionId,matchId:String(matchId||'')},
   copiedFunction:{...fn,id:'artifact32:'+String(fn.id||fn.actionId),
     copiedFromArtifactId:sourceId,usageMode:'onceGame',usageCount:1}};
}
export function linkedArtifactAction({link,actorId,actionId,matchId,donorArtifact,donorAssignment}={}){
 if(!link||identity(link.actorId)!==identity(actorId)||
   String(link.matchId||'')!==String(matchId||'')||
   String(link.actionId||'')!==String(actionId||'')||
   SAFE_COPIES[String(link.sourceArtifactId||'')]!==String(actionId||''))
   return {ok:false,error:'ARTIFACT_LINK_ACTION_NOT_ALLOWED'};
 if(!donorArtifact||donorArtifact.removedFromMatch===true||
   String(donorArtifact.artifactId||'')!==String(link.sourceArtifactId)|| 
   String(donorAssignment?.artifactId||'')!==String(link.sourceArtifactId)||
   donorArtifact.matchId&&String(donorArtifact.matchId)!==String(matchId||''))
   return {ok:false,error:'ARTIFACT_LINK_SOURCE_CHANGED'};
 // The source must have been revealed before a linked player activates it.
 if(!donorArtifact.viewedAt&&!donorAssignment?.artifactViewedAt)
   return {ok:false,error:'ARTIFACT_LINK_SOURCE_NOT_REVEALED'};
 return {ok:true,sourceArtifactId:link.sourceArtifactId};
}
