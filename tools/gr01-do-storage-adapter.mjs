import {makeBackup,validateBackup} from './gr01-backup-core.mjs';
const STAGING='gr01-isolated-staging';
function guard(environment){if(environment!==STAGING)throw Error('Only isolated staging allowed')}
function storageGuard(storage){if(!storage||typeof storage.list!=='function'||typeof storage.put!=='function'||typeof storage.get!=='function')throw Error('Invalid DO storage interface')}
export async function exportDoStorage(storage,{environment,instanceId}={}){
 guard(environment);storageGuard(storage);if(!instanceId)throw Error('Missing instance identity');
 const snapshot=await storage.list();if(!(snapshot instanceof Map))throw Error('Storage list must return Map');
 return makeBackup([...snapshot].map(([key,value])=>({key,value})),{source:STAGING+':'+instanceId,createdAt:new Date().toISOString()});
}
export async function restoreDoStorage(backup,storage,{environment,dryRun=true}={}){
 guard(environment);storageGuard(storage);validateBackup(backup);
 if(!backup.source.startsWith(STAGING+':'))throw Error('Untrusted snapshot source');
 const existing=await storage.list();if(!(existing instanceof Map)||existing.size)throw Error('Restore target must be empty');
 if(dryRun)return {count:backup.entries.length,dryRun:true};
 // An adapter to test Durable Object Storage semantics; real cloud rollback requires
 // isolated instance-level restore validation and an approved consistency protocol.
 for(const {key,value} of backup.entries)await storage.put(key,structuredClone(value));
 const actual=await storage.list();
 if(actual.size!==backup.entries.length)throw Error('Post-restore count mismatch');
 const actualBackup=makeBackup([...actual].map(([key,value])=>({key,value})),{source:backup.source,createdAt:backup.createdAt});
 if(actualBackup.checksum!==backup.checksum)throw Error('Post-restore checksum mismatch');
 return {count:actual.size,dryRun:false,verified:true};
}
