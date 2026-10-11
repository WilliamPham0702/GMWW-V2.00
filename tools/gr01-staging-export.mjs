import { makeBackup, validateBackup, restoreToEmptyMap } from './gr01-backup-core.mjs';
const allowed = new Set(['gr01-isolated-staging']);
export function exportStagingSnapshot(storage,{environment,instanceId}={}){
 if(!allowed.has(environment))throw Error('Export denied outside isolated staging');
 if(!(storage instanceof Map)||!instanceId||typeof instanceId!=='string')throw Error('Invalid staging source');
 const records=[...storage.entries()].map(([key,value])=>({key,value:structuredClone(value)}));
 return makeBackup(records,{source:environment+':'+instanceId,createdAt:new Date().toISOString()});
}
export function restoreStagingSnapshot(backup,target,{environment,dryRun=true}={}){
 if(!allowed.has(environment)||!String(backup?.source||'').startsWith(environment+':'))throw Error('Restore denied outside isolated staging');
 validateBackup(backup);
 return restoreToEmptyMap(backup,target,{dryRun});
}
