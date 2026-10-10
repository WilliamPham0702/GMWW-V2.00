// A per-player private delivery snapshot is published after all assignments are prepared.
// Keep legacy role / Artifact keys for compatibility with active games and view tracking.
export const PRIVATE_DELIVERY_SNAPSHOT_VERSION=1;
const str=value=>String(value??'');
export function buildPrivateDeliverySnapshot({matchId='',matchRevision=0,deliveryVersion=0,publishedAt='',roles=[]}={}){
 const rows=Array.isArray(roles)?roles:[];
 const artifact=rows.find(r=>r?.artifact)?.artifact||null;
 return {schemaVersion:PRIVATE_DELIVERY_SNAPSHOT_VERSION,matchId:str(matchId),matchRevision:Number(matchRevision||0),
   deliveryVersion:Number(deliveryVersion||0),publishedAt:str(publishedAt),roles:rows,artifact};
}
export function currentPrivateDeliverySnapshot(snapshot,meta){
 if(!snapshot||snapshot.schemaVersion!==PRIVATE_DELIVERY_SNAPSHOT_VERSION||!meta)return null;
 if(str(snapshot.matchId)!==str(meta.matchId)||str(snapshot.publishedAt)!==str(meta.roleDeliveredAt))return null;
 if(snapshot.deliveryVersion!==Number(meta.deliveryVersion||0)||snapshot.matchRevision!==Number(meta.matchRevision||0))return null;
 if(!Array.isArray(snapshot.roles)||!snapshot.roles.length)return null;
 return snapshot;
}
export function privateDeliveryRoles(snapshot,legacyRows=[]){
 if(!snapshot)return Array.isArray(legacyRows)?legacyRows:[];
 const legacy=Array.isArray(legacyRows)?legacyRows:[];
 return snapshot.roles.map(row=>{
   const matching=legacy.find(other=>str(other?.matchId)===str(snapshot.matchId)&&
     Number(other?.assignmentIndex)===Number(row?.assignmentIndex)&&str(other?.roleId)===str(row?.roleId));
   return matching?{...row,viewedAt:matching.viewedAt??row.viewedAt}:row;
 });
}
export function privateDeliveryArtifact(snapshot,legacyArtifact){
 if(!snapshot)return legacyArtifact||null;
 const assigned=snapshot.artifact;
 if(!assigned)return null;
 if(legacyArtifact&&str(legacyArtifact.matchId)===str(snapshot.matchId)&&str(legacyArtifact.artifactId)===str(assigned.artifactId)){
   return {...assigned,viewedAt:legacyArtifact.viewedAt??assigned.viewedAt,usedAt:legacyArtifact.usedAt??assigned.usedAt,
     lastActivation:legacyArtifact.lastActivation??assigned.lastActivation};
 }
 return assigned;
}
