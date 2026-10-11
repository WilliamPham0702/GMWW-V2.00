// GR01 ONLY. Deploy as gmww-gr01-backup-lab with a separate SQLite DO class.
// This Worker never binds GMWW's ROOMS namespace or reads Production data.
const json = (v, status = 200) => Response.json(v, { status });
const canonical = v => JSON.stringify(v, (key, value) => value && !Array.isArray(value) && typeof value === 'object'
 ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value);
async function digest(v) {
 const bytes = new TextEncoder().encode(canonical(v));
 const hash = await crypto.subtle.digest('SHA-256', bytes);
 return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const fixture = () => ({
 meta: { room: 'GR01 ONLY', phase: 'night', round: 2 },
 players: Array.from({ length: 30 }, (_, i) => ({ id: 'fixture-' + i, seat: i, online: i % 2 === 0 })),
 roles: Array.from({ length: 63 }, (_, i) => ({ id: 'role-' + i, side: i % 3 })),
 artifacts: Array.from({ length: 44 }, (_, i) => ({ id: 'artifact-' + i, uses: 2 })),
 gameTemplate: { name: 'GR01 TEST', duration: 300, useArtifacts: true },
 artifactUse: { 'fixture-2': 1 }
});
export class Gr01LabDO {
 constructor(state, env) { this.state = state; this.env = env; }
 async fetch(request) {
  const u = new URL(request.url), storage = this.state.storage;
  if (request.method !== 'POST') return json({ ok: false }, 405);
  if (u.pathname === '/seed') {
   if ((await storage.list()).size) return json({ ok: false, error: 'not-empty' }, 409);
   const f = fixture();
   await storage.transaction(async tx => { for (const [k, v] of Object.entries(f)) await tx.put(k, v); });
   return json({ ok: true, count: Object.keys(f).length });
  }
  if (u.pathname === '/snapshot') {
   const entries = [...(await storage.list())].map(([key, value]) => ({ key, value })).sort((a, b) => a.key < b.key ? -1 : 1);
   return json({ ok: true, entries });
  }
  if (u.pathname === '/restore') {
   const { entries } = await request.json();
   if (!Array.isArray(entries) || entries.length !== 6 ||
       new Set(entries.map(x => x.key)).size !== entries.length) return json({ ok: false, error: 'bad-snapshot' }, 400);
   try {
    await storage.transaction(async tx => {
     if ((await tx.list()).size) throw Error('not-empty');
     for (const { key, value } of entries) await tx.put(key, value);
    });
    return json({ ok: true });
   } catch (e) { return json({ ok: false, error: String(e) }, 409); }
  }
  if (u.pathname === '/mutate') {
   await storage.put('meta', { room: 'GR01 MUTATED', phase: 'ended' });
   return json({ ok: true });
  }
  if (u.pathname === '/bookmark') return json({ ok: true, bookmark: await storage.getCurrentBookmark() });
  if (u.pathname === '/restore-pitr') {
   const { bookmark } = await request.json();
   await storage.onNextSessionRestoreBookmark(bookmark);
   this.state.abort();
   return json({ ok: true });
  }
  return json({ ok: false }, 404);
 }
}
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/run' || request.method !== 'POST') return json({ ok: false }, 404);
  const nonce = crypto.randomUUID();
  const id = label => env.LAB.get(env.LAB.idFromName('gr01-' + label + '-' + nonce));
  const source = id('source'), target = id('target');
  const send = (stub, path, body) => stub.fetch('https://isolated' + path, {
   method: 'POST', headers: { 'content-type': 'application/json' },
   body: JSON.stringify(body || {})
  });
  try {
   const seed = await (await send(source, '/seed')).json();
   const before = await (await send(source, '/snapshot')).json();
   const checksum = await digest(before.entries);
   const dryRun = before.entries.length === 6;
   const restore = await (await send(target, '/restore', before)).json();
   const after = await (await send(target, '/snapshot')).json();
   const roundTrip = checksum === await digest(after.entries);
   const overwritten = await send(target, '/restore', before);
   const blockedOverwrite = overwritten.status === 409;
   const bookmarkResponse = await (await send(source, '/bookmark')).json();
   let pitrRestored = false, pitrSupported = Boolean(bookmarkResponse.bookmark), pitrError = null;
   if (pitrSupported) {
    await send(source, '/mutate');
    try {
     const operation = await send(source, '/restore-pitr', { bookmark: bookmarkResponse.bookmark });
     pitrError = 'schedule status ' + operation.status + ': ' + (await operation.text()).slice(0, 240);
    } catch (e) { pitrError = 'scheduled fetch interrupted: ' + String(e).slice(0, 180); }
    for (let i = 0; i < 24; ++i) {
     try {
      const currentResponse = await send(source, '/snapshot');
      const current = await currentResponse.json();
      if (checksum === await digest(current.entries)) { pitrRestored = true; break; }
      if (i === 23) pitrError = (pitrError || '') + '; final phase=' + String(current.entries.find(x => x.key === 'meta')?.value?.phase);
     } catch (e) { if (i === 23) pitrError = (pitrError || '') + '; probe error=' + String(e).slice(0, 150); }
     await new Promise(resolve => setTimeout(resolve, 600));
    }
   } else pitrError = 'PITR bookmark unavailable';
   const checks = { seed: seed.ok === true, snapshot: dryRun, restore: restore.ok === true, checksum: roundTrip, overwriteBlocked: blockedOverwrite, pitrSupported, pitrRestored };
   return json({
    ok: Object.values(checks).every(Boolean), checks, keyCount: after.entries.length,
    playerFixtures: 30, roleFixtures: 63, artifactFixtures: 44,
    sourceDigest: checksum, pitrError, environment: 'isolated-cloudflare-sqlite-do',
    productionTouched: false
   });
  } catch (error) { return json({ ok: false, error: String(error), productionTouched: false }, 500); }
 }
};
