// Artifact #40: swap the recipients' Roles and Factions, never their identities
// or Artifacts. This planner is pure so invalid targets cannot mutate a match.
const id=x=>String(x??'').trim().toLowerCase().replace(/^member:/,'');
export function planArtifactRoleSwap({assignments=[],actorId,targetId,actorRoles=[],targetRoles=[],now}={}){
  const actor=id(actorId),target=id(targetId);
  if(!actor||!target||actor===target)return {ok:false,error:'ROLE_SWAP_INVALID_TARGET'};
  const from=assignments.filter(x=>id(x.loginId)===actor),
    to=assignments.filter(x=>id(x.loginId)===target);
  if(from.length!==1||to.length!==1)return {ok:false,error:'ROLE_SWAP_NEEDS_SINGLE_ROLE'};
  const own=actorRoles.find(x=>String(x.roleId)===String(from[0].roleId)&&
    Number(x.assignmentIndex)===Number(from[0].assignmentIndex)),
    other=targetRoles.find(x=>String(x.roleId)===String(to[0].roleId)&&
    Number(x.assignmentIndex)===Number(to[0].assignmentIndex));
  if(!own?.roleCard||!other?.roleCard)return {ok:false,error:'ROLE_SWAP_PRIVATE_CARDS_MISSING'};
  if(!String(own.roleId||'')||!String(other.roleId||''))return {ok:false,error:'ROLE_SWAP_ROLE_MISSING'};
  const copy=(holder,donor)=>({...holder,
    roleId:donor.roleId,roleName:donor.roleName,faction:donor.faction,
    description:donor.description,roleCard:donor.roleCard,roleImage:donor.roleImage,
    artworkAssetId:donor.artworkAssetId,artworkId:donor.artworkId,
    deliveredAt:now,viewedAt:null,inheritedFromRoleId:holder.roleId,
    exchangedFromLoginId:id(donor.loginId)});
  const nextActor=copy(own,other),nextTarget=copy(other,own);
  // Keep the same seat/player/owner/Artifact and assignmentIndex for both.
  const nextAssignments=assignments.map(row=>{
    const lid=id(row.loginId),next=lid===actor?nextActor:lid===target?nextTarget:null;
    return next?{...row,roleId:next.roleId,roleName:next.roleName,
      faction:next.faction,deliveredAt:now,viewedAt:null,
      inheritedFromRoleId:row.roleId}:row;
  });
  return {ok:true,assignments:nextAssignments,
    actorRoles:actorRoles.map(row=>row===own?nextActor:row),
    targetRoles:targetRoles.map(row=>row===other?nextTarget:row),
    actorId:actor,targetId:target};
}
