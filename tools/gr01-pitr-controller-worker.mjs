// GR01 isolated PITR bookmark controller. Deploy separately from GMWW Player Web.
// Production routes are ONLY /capture and /verify; no Production restore operation.
// Private KV contains opaque object IDs + Cloudflare PITR bookmarks, not player data.
const json = (data, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
async function equalSecret(a, b) {
 if (typeof a !== 'string' || a.length < 32 || typeof b !== 'string' || !b || b.length > 512) return false;
 const enc = new TextEncoder();
 const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)),
  crypto.subtle.digest('SHA-256', enc.encode(b))]);
 let mismatch = 0; const left = new Uint8Array(x), right = new Uint8Array(y);
 for (let i = 0; i < left.length; ++i) mismatch |= left[i] ^ right[i];
 return mismatch === 0;
}
async function digest(s) {
 const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
 return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const looksLikeId = x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
const manifestKey = id => 'gr01/v1/markers/' + id + '.json';
export default {
 async fetch(request, env) {
  const path = new URL(request.url).pathname;
  if (request.method !== 'POST' || !['/capture', '/verify', '/staging-seed'].includes(path))
   return json({ ok: false, error: 'NOT_FOUND' }, 404);
  const raw = request.headers.get('authorization') || '';
  if (!raw.startsWith('Bearer ') || !(await equalSecret(env.GR01_CONTROLLER_TOKEN, raw.slice(7))))
   return json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (!env.SOURCE || !env.GR01_MARKERS) return json({ ok: false, error: 'STORAGE_UNAVAILABLE' }, 503);
  if (path === '/staging-seed') {
   if (env.GR01_STAGING !== 'true') return json({ ok: false, error: 'NOT_FOUND' }, 404);
   const ids = [];
   for (const i of [1, 2, 3]) {
    const id = env.SOURCE.idFromName('gr01-controller-fixture-' + crypto.randomUUID());
    const stub = env.SOURCE.get(id);
    const response = await stub.fetch('https://isolated/seed', { method: 'POST' });
    if (!response.ok) return json({ ok: false, error: 'SEED_FAILED' }, 503);
    ids.push(id.toString());
   }
   return json({ ok: true, ids });
  }
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'INVALID_JSON' }, 400); }
  if (path === '/capture') {
   const ids = body?.ids;
   if (!Array.isArray(ids) || ids.length < 1 || ids.length > 250 ||
       !ids.every(looksLikeId) || new Set(ids).size !== ids.length)
    return json({ ok: false, error: 'INVALID_INSTANCE_LIST' }, 400);
   const records = [];
   for (const id of ids.sort()) {
    try {
     const stub = env.SOURCE.get(env.SOURCE.idFromString(id));
     const response = await stub.fetch('https://backup.internal/__gr01/pitr/bookmark', {
      method: 'POST', headers: { authorization: 'Bearer ' + env.GR01_INTERNAL_PITR_TOKEN }
     });
     if (!response.ok) return json({ ok: false, error: 'SOURCE_NOT_READY', captured: records.length }, 503);
     const data = await response.json();
     if (!data.ok || typeof data.bookmark !== 'string' || !data.bookmark)
      return json({ ok: false, error: 'BAD_BOOKMARK', captured: records.length }, 503);
     records.push({ objectId: id, bookmark: data.bookmark,
      databaseSize: Number(data.databaseSize) || 0, recordedAt: data.recordedAt || new Date().toISOString() });
    } catch { return json({ ok: false, error: 'SOURCE_UNAVAILABLE', captured: records.length }, 503); }
   }
   const identifier = crypto.randomUUID();
   const payload = { format: 'GMWW_GR01_PITR_MARKERS_V1', id: identifier, createdAt: new Date().toISOString(),
    namespace: String(env.GR01_NAMESPACE_LABEL || 'unlabeled'), records };
   const checksum = await digest(JSON.stringify(payload));
   const backup = { ...payload, sha256: checksum };
   // Complete immutable manifest is committed only after ALL source markers are collected.
   await env.GR01_MARKERS.put(manifestKey(identifier), JSON.stringify(backup));
   return json({ ok: true, backupId: identifier, sourceCount: records.length,
    manifestSha256: checksum, recoveryWindowDays: 30, productionRestoreEnabled: false });
  }
  if (path === '/verify') {
   const id = body?.backupId;
   if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return json({ ok: false, error: 'INVALID_BACKUP_ID' }, 400);
   const rawData = await env.GR01_MARKERS.get(manifestKey(id));
   if (!rawData) return json({ ok: false, error: 'NOT_FOUND' }, 404);
   let data; try { data = JSON.parse(rawData); } catch { return json({ ok: false, error: 'CORRUPT_MANIFEST' }, 500); }
   const { sha256, ...payload } = data;
   const verified = payload.format === 'GMWW_GR01_PITR_MARKERS_V1' &&
    payload.id === id && Array.isArray(payload.records) &&
    payload.records.length > 0 && payload.records.every(x => looksLikeId(x.objectId) && typeof x.bookmark === 'string') &&
    (await digest(JSON.stringify(payload))) === sha256;
   return json({ ok: verified, backupId: id, sourceCount: payload.records?.length || 0,
    manifestSha256: sha256, integrity: verified ? 'VERIFIED' : 'FAILED', productionRestoreEnabled: false }, verified ? 200 : 500);
  }
  return json({ ok: false }, 404);
 }
};
