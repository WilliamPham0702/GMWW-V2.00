import { createHash } from 'node:crypto';
export const FORMAT = 'GMWW_GR01_BACKUP_V1';

// This format is deliberately JSON-only. Reject storage values that JSON would
// silently corrupt (typed arrays, undefined, NaN, Dates, Maps, sparse arrays).
export function canonical(value) {
 const visited = new Set();
 const visit = (v, depth) => {
  if (depth > 96) throw Error('Backup value exceeds nesting limit');
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') {
   if (!Number.isFinite(v) || Object.is(v, -0)) throw Error('Unsupported number in backup');
   return JSON.stringify(v);
  }
  if (!v || typeof v !== 'object') throw Error('Unsupported value in backup');
  if (visited.has(v)) throw Error('Cyclic or shared reference in backup');
  visited.add(v);
  let result;
  if (Array.isArray(v)) {
   if (Object.keys(v).length !== v.length || Object.keys(v).some(k => !/^(0|[1-9][0-9]*)$/.test(k))) throw Error('Sparse or extended array in backup');
   result = '[' + v.map(item => visit(item, depth + 1)).join(',') + ']';
  } else {
   const proto = Object.getPrototypeOf(v);
   if (proto !== Object.prototype && proto !== null) throw Error('Non-JSON object in backup');
   const keys = Object.keys(v).sort();
   if (Object.getOwnPropertySymbols(v).length) throw Error('Symbol keys unsupported');
   result = '{' + keys.map(k => JSON.stringify(k) + ':' + visit(v[k], depth + 1)).join(',') + '}';
  }
  visited.delete(v);
  return result;
 };
 return visit(value, 0);
}
export function sha256(value) { return createHash('sha256').update(value).digest('hex'); }
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function makeBackup(records, { source = 'isolated-fixture', createdAt = '2026-10-11T00:00:00.000Z' } = {}) {
 if (!Array.isArray(records) || records.length > 100000 ||
     !records.every(x => x && typeof x.key === 'string' && x.key && Object.hasOwn(x, 'value'))) throw Error('Invalid records');
 if (typeof source !== 'string' || !source || !validDate(createdAt)) throw Error('Invalid backup identity');
 const keys = records.map(x => x.key);
 if (new Set(keys).size !== keys.length) throw Error('Duplicate storage key');
 const entries = records.map(({ key, value }) => {
  const frozenValue = structuredClone(value);
  const digest = sha256(canonical(frozenValue));
  return { key, value: frozenValue, sha256: digest };
 }).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
 const payload = { format: FORMAT, source, createdAt, entries };
 return { ...payload, checksum: sha256(canonical(payload)) };
}
export function validateBackup(backup) {
 if (!backup || typeof backup !== 'object' || backup.format !== FORMAT ||
     typeof backup.source !== 'string' || !backup.source ||
     !validDate(backup.createdAt) || !Array.isArray(backup.entries) ||
     backup.entries.length > 100000 ||
     !backup.entries.every(x => x && typeof x.key === 'string' && x.key &&
      typeof x.sha256 === 'string' && x.sha256 === sha256(canonical(x.value)))) throw Error('Invalid backup entries');
 const keys = backup.entries.map(x => x.key);
 if (new Set(keys).size !== keys.length) throw Error('Duplicate storage key');
 const { checksum, ...payload } = backup;
 if (typeof checksum !== 'string' || checksum !== sha256(canonical(payload))) throw Error('Backup checksum mismatch');
 return true;
}
export function restoreToEmptyMap(backup, target, { dryRun = true } = {}) {
 validateBackup(backup);
 if (!(target instanceof Map) || target.size) throw Error('Restore requires an empty isolated Map');
 const restored = new Map(backup.entries.map(x => [x.key, structuredClone(x.value)]));
 if (!dryRun) for (const [key, value] of restored) target.set(key, value);
 return { count: restored.size, dryRun, checksum: backup.checksum };
}
