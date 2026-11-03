/**
 * Issue #773 — B-only archive safety policy.
 * No network, no Cloudflare access, no Production data, no secrets embedded.
 */
const HEX32=/^[a-f0-9]{32}$/;
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
export function archiveIds(backupId,objectDigest){
  if(!HEX32.test(backupId)||!HEX64.test(objectDigest))throw Error('BACKUP_ARCHIVE_INVALID_IDS');
  return backupId+':'+objectDigest;
}
export function compareArchiveSecret(value,configured){
  if(typeof configured!=='string'||configured.length<32||configured.length>256||
     /[^\x21-\x7e]/.test(configured)||
     typeof value!=='string'||value.length>256)return false;
  let different=value.length^configured.length;
  for(let i=0;i<configured.length;i++)
    different|=configured.charCodeAt(i)^(value.charCodeAt(i)||0);
  return different===0;
}
export function archiveSourceAllowed(meta,pinnedSha){
  return typeof pinnedSha==='string'&&HEX40.test(pinnedSha)&&
    meta?.sourceSha===pinnedSha&&meta?.quiescent===true&&meta?.connectedSockets===0;
}
export function archiveScope(meta){
  archiveIds(meta.backupId,meta.objectDigest);
  if(!Number.isSafeInteger(meta.count)||meta.count<1||meta.count>1024||
     !Number.isSafeInteger(meta.revision)||meta.revision<0||!HEX40.test(meta.sourceSha)||
     meta.quiescent!==true||meta.connectedSockets!==0)
    throw Error('BACKUP_ARCHIVE_INVALID_SCOPE');
  return {
    backupId:meta.backupId,objectDigest:meta.objectDigest,sourceSha:meta.sourceSha,
    revision:meta.revision,count:meta.count
  };
}
export function archiveWriteDecision(scope,previousScope,previousChunk,incoming){
  if(previousScope&&JSON.stringify(previousScope)!==JSON.stringify(scope))
    return 'SCOPE_CONFLICT';
  if(previousChunk){
    return JSON.stringify(previousChunk)===JSON.stringify(incoming)?'UNCHANGED':'IMMUTABLE_CONFLICT';
  }
  return 'STORE';
}
