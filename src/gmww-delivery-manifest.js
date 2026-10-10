// Private player delivery is a versioned snapshot; never publish its contents in public room state.
export const PRIVATE_DELIVERY_SCHEMA_VERSION=1;
const id=value=>String(value??'');
export function buildPrivateDeliveryManifest({roomCode,loginId,matchId,matchRevision=0,deliveryVersion=0,publishedAt='',assignments=[],roles=[],artifact=null}={}){
  const match=id(matchId);
  const assigned=(Array.isArray(assignments)?assignments:[]).filter(row=>id(row?.loginId).trim().toLowerCase()===id(loginId).trim().toLowerCase()&&(!match||!row?.matchId||id(row.matchId)===match));
  const expectedRoleIds=assigned.length?assigned.map(row=>id(row?.roleId)):Array.isArray(roles)?roles.map(row=>id(row?.roleId)):[];
  const artifactId=assigned.map(row=>id(row?.artifactId)).find(Boolean)||id(artifact?.artifactId);
  const presentRoles=Array.isArray(roles)?roles.filter(row=>!match||!row?.matchId||id(row.matchId)===match):[];
  const presentRoleIds=presentRoles.map(row=>id(row?.roleId));
  const rolesComplete=expectedRoleIds.length>0&&expectedRoleIds.length===presentRoleIds.length&&expectedRoleIds.every((roleId,index)=>roleId&&roleId===presentRoleIds[index]);
  const artifactExpected=Boolean(artifactId);
  const artifactComplete=!artifactExpected||Boolean(artifact&&id(artifact.artifactId)===artifactId&&(!match||!artifact.matchId||id(artifact.matchId)===match));
  const deliveryId=[id(roomCode),match,id(matchRevision),id(deliveryVersion),id(publishedAt),id(loginId)].join(':');
  return {schemaVersion:PRIVATE_DELIVERY_SCHEMA_VERSION,deliveryId,matchId:match,matchRevision:Number(matchRevision||0),deliveryVersion:Number(deliveryVersion||0),
    roleCount:expectedRoleIds.length,roleIds:expectedRoleIds,artifactExpected,artifactId:artifactId||null,complete:rolesComplete&&artifactComplete};
}
export function validPrivateDeliveryAcknowledgment(manifest,receipt){
  if(!manifest?.complete||manifest.schemaVersion!==PRIVATE_DELIVERY_SCHEMA_VERSION||!receipt||typeof receipt!=='object')return false;
  const actual=Array.isArray(receipt.roleIds)?receipt.roleIds.map(id):[];
  return id(receipt.deliveryId)===manifest.deliveryId&&actual.length===manifest.roleIds.length&&actual.every((item,index)=>item===manifest.roleIds[index])
    &&id(receipt.artifactId)===id(manifest.artifactId);
}
