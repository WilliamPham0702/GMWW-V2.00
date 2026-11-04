import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildBackupExport, decodeBackupValue, encodeBackupValue, handleBackupExportInDo,
  handleBackupExportRoute, parseBackupExportRequest, BACKUP_EXPORT_DO_PATH, BACKUP_EXPORT_ROUTE
} from '../src/gmww-backup-export.js';
import { openBackupChunk } from '../infra/cloudflare-standby/production-backup-envelope.mjs';

const KEY = Buffer.alloc(32, 7).toString('base64url');
const TOKEN = 'x'.repeat(40);
const OBJ = 'a'.repeat(64);
const REQ = { objectId: OBJ, backupId: 'b'.repeat(32), sourceSha: 'c'.repeat(40), chunkStart: 0, chunkLimit: 8 };
const authorize = async (req, secret) => req.headers.get('authorization') === 'Bearer ' + secret;

function sampleEntries(extra = {}) {
  return new Map(Object.entries({
    meta: { phase: 'lobby', matchRevision: 3, code: 'ROOM1' },
    players: { p1: { loginId: 'an', seat: 2 } },
    'member:an': { loginId: 'an', history: [{ matchId: 'm1', result: 'win' }], joined: new Date('2026-11-01T00:00:00Z') },
    'chat:1': new Map([['k', new Set([1, 2])]]),
    blob: new Uint8Array([1, 2, 3]),
    'session:abc': { loginId: 'an', expiresAt: 1 },
    'security-rate': { n: 1 },
    ...extra
  }));
}

async function openAll(chunks) {
  const parts = [];
  for (const c of chunks) parts.push((await openBackupChunk(c, KEY)).plaintext);
  return JSON.parse(Buffer.concat(parts.map(p => Buffer.from(p))).toString('utf8'));
}

test('typed values roundtrip', () => {
  const v = { d: new Date('2026-01-01T00:00:00Z'), u: new Uint8Array([9]), m: new Map([[1, 'x']]), s: new Set(['y']), n: NaN, $t: 'clash' };
  const back = decodeBackupValue(JSON.parse(JSON.stringify(encodeBackupValue(v))));
  assert.equal(back.d.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.deepEqual([...back.u], [9]);
  assert.equal(back.m.get(1), 'x');
  assert.ok(back.s.has('y'));
  assert.ok(Number.isNaN(back.n));
  assert.equal(back.$t, 'clash');
  assert.throws(() => encodeBackupValue(new (class X {})()), /BACKUP_VALUE_UNSUPPORTED/);
});

test('export seals all rows, excludes sessions/rate-limit, roundtrips via envelope', async () => {
  const out = await buildBackupExport({ entries: sampleEntries(), meta: { phase: 'lobby', matchRevision: 3 }, connectedSockets: 0, bookmark: 'bm1', request: REQ, archiveKey: KEY });
  assert.equal(out.manifest.keyCount, 5);
  assert.equal(out.manifest.excludedCount, 2);
  assert.equal(out.manifest.revision, 3);
  assert.equal(out.nextChunk, null);
  assert.notEqual(out.manifest.objectDigest, OBJ);
  const doc = await openAll(out.chunks);
  const keys = doc.rows.map(r => r[0]);
  assert.ok(!keys.some(k => k.startsWith('session:') || k === 'security-rate'));
  const member = decodeBackupValue(doc.rows.find(r => r[0] === 'member:an')[1]);
  assert.equal(member.history[0].matchId, 'm1');
  assert.ok(member.joined instanceof Date);
  assert.ok(!JSON.stringify(out).includes('ROOM1'), 'plaintext must not leak');
});

test('large object paginates with stable manifest; wrong key fails', async () => {
  const big = { big: 'z'.repeat(200000) };
  const p1 = await buildBackupExport({ entries: sampleEntries(big), meta: {}, connectedSockets: 0, bookmark: 'bm', request: { ...REQ, chunkLimit: 2 }, archiveKey: KEY });
  assert.equal(p1.chunks.length, 2);
  assert.equal(p1.nextChunk, 2);
  const p2 = await buildBackupExport({ entries: sampleEntries(big), meta: {}, connectedSockets: 0, bookmark: 'bm', request: { ...REQ, chunkStart: 2, chunkLimit: 8 }, archiveKey: KEY });
  assert.deepEqual(p1.manifest, p2.manifest);
  const doc = await openAll([...p1.chunks, ...p2.chunks]);
  assert.equal(decodeBackupValue(doc.rows.find(r => r[0] === 'big')[1]).length, 200000);
  await assert.rejects(openBackupChunk(p1.chunks[0], Buffer.alloc(32, 8).toString('base64url')), /BACKUP_AUTHENTICATION_FAILED/);
});

test('refuses active match or open sockets', async () => {
  for (const [meta, sockets] of [[{ phase: 'running' }, 0], [{ status: 'role_delivery' }, 0], [{ phase: 'lobby' }, 1]])
    await assert.rejects(buildBackupExport({ entries: sampleEntries(), meta, connectedSockets: sockets, bookmark: '', request: REQ, archiveKey: KEY }), /BACKUP_ROOM_NOT_QUIESCENT/);
});

test('request validation fails closed', () => {
  assert.throws(() => parseBackupExportRequest({ ...REQ, objectId: 'ROOM1' }), /INVALID/);
  assert.throws(() => parseBackupExportRequest({ ...REQ, chunkLimit: 99 }), /INVALID/);
  assert.throws(() => parseBackupExportRequest({ ...REQ, sourceSha: 'abc' }), /INVALID/);
});

function fakeCtx(entries, sockets = 0) {
  let writes = 0;
  const storage = {
    list: async () => entries, getCurrentBookmark: async () => 'bm',
    put: async () => { writes++; }, delete: async () => { writes++; }
  };
  return { ctx: { storage, getWebSockets: () => new Array(sockets), blockConcurrencyWhile: fn => fn() }, writes: () => writes };
}
const post = (path, token, body = REQ) => new Request('https://w.test' + path, { method: 'POST', headers: { authorization: token ? 'Bearer ' + token : '' }, body: JSON.stringify(body) });

test('DO handler: 404 without secrets or wrong token, read-only when authorized', async () => {
  const { ctx, writes } = fakeCtx(sampleEntries());
  const env = { GMWW_BACKUP_EXPORT_TOKEN: TOKEN, GMWW_A_B_ARCHIVE_KEY: KEY };
  assert.equal((await handleBackupExportInDo(ctx, {}, post(BACKUP_EXPORT_DO_PATH, TOKEN), authorize)).status, 404);
  assert.equal((await handleBackupExportInDo(ctx, env, post(BACKUP_EXPORT_DO_PATH, 'wrong'), authorize)).status, 404);
  assert.equal((await handleBackupExportInDo(ctx, { GMWW_BACKUP_EXPORT_TOKEN: TOKEN }, post(BACKUP_EXPORT_DO_PATH, TOKEN), authorize)).status, 404);
  const ok = await handleBackupExportInDo(ctx, env, post(BACKUP_EXPORT_DO_PATH, TOKEN), authorize);
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).manifest.keyCount, 5);
  assert.equal(writes(), 0);
  const busy = fakeCtx(sampleEntries(), 2);
  assert.equal((await handleBackupExportInDo(busy.ctx, env, post(BACKUP_EXPORT_DO_PATH, TOKEN), authorize)).status, 409);
});

test('Worker route: 404 when unconfigured, forwards by hex id when authorized', async () => {
  let forwarded = null;
  const ROOMS = { idFromString: id => ({ id }), get: id => ({ fetch: async r => { forwarded = { id, path: new URL(r.url).pathname }; return new Response('{}'); } }) };
  assert.equal((await handleBackupExportRoute(post(BACKUP_EXPORT_ROUTE, TOKEN), { ROOMS }, authorize)).status, 404);
  const env = { ROOMS, GMWW_BACKUP_EXPORT_TOKEN: TOKEN, GMWW_A_B_ARCHIVE_KEY: KEY };
  assert.equal((await handleBackupExportRoute(post(BACKUP_EXPORT_ROUTE, TOKEN, { ...REQ, objectId: 'x' }), env, authorize)).status, 400);
  assert.equal((await handleBackupExportRoute(post(BACKUP_EXPORT_ROUTE, TOKEN), env, authorize)).status, 200);
  assert.deepEqual(forwarded, { id: { id: OBJ }, path: BACKUP_EXPORT_DO_PATH });
});

test('Worker wiring present and fail-closed', () => {
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  assert.match(src, /if\(path===BACKUP_EXPORT_DO_PATH\)return handleBackupExportInDo\(/);
  assert.match(src, /if\(url\.pathname===BACKUP_EXPORT_ROUTE\)return handleBackupExportRoute\(/);
  assert.doesNotMatch(readFileSync(new URL('../src/gmww-backup-export.js', import.meta.url), 'utf8'), /storage\.(put|delete|deleteAll)\(/);
});
