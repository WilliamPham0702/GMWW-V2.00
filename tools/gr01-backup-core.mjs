import { createHash } from 'node:crypto';
export const FORMAT='GMWW_GR01_BACKUP_V1';
export function sha256(value){return createHash('sha256').update(value).digest('hex')}
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value)}
export function makeBackup(records,{source='isolated-fixture',createdAt='2026-10-11T00:00:00.000Z'}={}){
 if(!Array.isArray(records)||!records.every(x=>x&&typeof x.key==='string'&&x.key&&Object.hasOwn(x,'value')))throw Error('Invalid records');
 const keys=records.map(x=>x.key);if(new Set(keys).size!==keys.length)throw Error('Duplicate storage key');
 const entries=records.map(({key,value})=>({key,value,sha256:sha256(canonical(value))})).sort((a,b)=>a.key.localeCompare(b.key));
 const payload={format:FORMAT,source,createdAt,entries};
 return {...payload,checksum:sha256(canonical(payload))};
}
export function validateBackup(backup){
 if(!backup||backup.format!==FORMAT||!Array.isArray(backup.entries)||!backup.entries.every(x=>x&&typeof x.key==='string'&&x.key&&Object.hasOwn(x,'value')&&x.sha256===sha256(canonical(x.value))))throw Error('Invalid backup entries');
 const keys=backup.entries.map(x=>x.key);if(new Set(keys).size!==keys.length)throw Error('Duplicate storage key');
 const {checksum,...payload}=backup;if(checksum!==sha256(canonical(payload)))throw Error('Backup checksum mismatch');
 return true;
}
export function restoreToEmptyMap(backup,target,{dryRun=true}={}){
 validateBackup(backup);if(!(target instanceof Map)||target.size)throw Error('Restore requires an empty isolated Map');
 const restored=new Map(backup.entries.map(x=>[x.key,structuredClone(x.value)]));
 if(!dryRun)for(const [key,value] of restored)target.set(key,value);
 return {count:restored.size,dryRun,checksum:backup.checksum};
}
