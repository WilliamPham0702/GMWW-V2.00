// GM-only information effects for day Artifact cards.
// The Server resolves against current match assignments, never accepts a
// caller-supplied faction or role claim, and never broadcasts the private answer.
const clean=x=>String(x??'').trim().toLowerCase().replace(/^member:/,'');
const inspectedActions=Object.freeze({
  artifact_09:'artifact_action_check_villager',
  artifact_24:'artifact_action_check_third_faction',
  artifact_29:'action_seer',
  artifact_39:'action_destroyer_scry'
});
export function resolveDayArtifactInspection({artifactId,actionId,targetId,assignments=[]}={}){
  if(inspectedActions[artifactId]!==actionId||!clean(targetId))return null;
  const assigned=(Array.isArray(assignments)?assignments:[]).find(x=>clean(x.loginId)===clean(targetId));
  if(!assigned)return null;
  const faction=String(assigned.factionId||assigned.faction||assigned.roleCard?.factionId||'')
    .toLowerCase(),roleId=String(assigned.roleId||''),
    wolf=faction==='wolf'||faction==='wolves'||faction.includes('sói')||faction.includes('soi')||
      /^role_(?:wolf|snow_wolf|alpha_wolf|lycan)/.test(roleId),
    third=faction==='third'||faction.includes('phe ba')||faction.includes('phe thứ'),
    roleName=String(assigned.roleName||assigned.roleCard?.name||roleId);
  if(artifactId==='artifact_39')
    return {kind:'role',roleId,roleName,message:roleName,private:true};
  const truth=artifactId==='artifact_09'?roleId==='role_villager':
    artifactId==='artifact_24'?third:wolf;
  return {kind:artifactId==='artifact_09'?'villager':artifactId==='artifact_24'?'third-faction':'wolf',
    confirmed:truth,message:truth?'ĐÚNG':'KHÔNG ĐÚNG',private:true};
}
