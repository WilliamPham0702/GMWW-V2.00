import { makeBackup, validateBackup } from './gr01-backup-core.mjs';
const STAGING = 'gr01-isolated-staging';
function guard(environment) { if (environment !== STAGING) throw Error('Only isolated staging allowed'); }
function storageGuard(storage) {
 if (!storage || typeof storage.list !== 'function') throw Error('Invalid DO storage interface');
}
export async function exportDoStorage(storage, { environment, instanceId } = {}) {
 guard(environment);
 storageGuard(storage);
 if (typeof instanceId !== 'string' || !instanceId) throw Error('Missing instance identity');
 const before = typeof storage.getCurrentBookmark === 'function' ? await storage.getCurrentBookmark() : null;
 const snapshot = await storage.list();
 if (!(snapshot instanceof Map)) throw Error('Storage list must return Map');
 const after = typeof storage.getCurrentBookmark === 'function' ? await storage.getCurrentBookmark() : null;
 if (before !== after) throw Error('Snapshot changed during export');
 return makeBackup([...snapshot].map(([key, value]) => ({ key, value })), {
  source: STAGING + ':' + instanceId, createdAt: new Date().toISOString()
 });
}
export async function restoreDoStorage(backup, storage, { environment, dryRun = true } = {}) {
 guard(environment);
 storageGuard(storage);
 validateBackup(backup);
 if (!backup.source.startsWith(STAGING + ':')) throw Error('Untrusted snapshot source');
 const existing = await storage.list();
 if (!(existing instanceof Map) || existing.size) throw Error('Restore target must be empty');
 if (dryRun) return { count: backup.entries.length, dryRun: true };
 // Refuse non-atomic restores; partial writes may corrupt the only staging copy.
 if (typeof storage.transaction !== 'function') throw Error('Transactional restore is required');
 await storage.transaction(async tx => {
  const initial = await tx.list();
  if (!(initial instanceof Map) || initial.size) throw Error('Restore target must be empty');
  for (const { key, value } of backup.entries) await tx.put(key, structuredClone(value));
  const actual = await tx.list();
  if (!(actual instanceof Map) || actual.size !== backup.entries.length) throw Error('Post-restore count mismatch');
  const actualBackup = makeBackup([...actual].map(([key, value]) => ({ key, value })), {
   source: backup.source, createdAt: backup.createdAt
  });
  if (actualBackup.checksum !== backup.checksum) throw Error('Post-restore checksum mismatch');
 });
 return { count: backup.entries.length, dryRun: false, verified: true };
}
