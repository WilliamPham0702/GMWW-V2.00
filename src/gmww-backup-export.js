/**
 * Issue #773 / Stage 4C: read-only encrypted export of one Room Durable Object on A.
 * - Fail-closed: the route answers 404 unless BOTH dedicated Cloudflare Secrets exist
 *   (GMWW_BACKUP_EXPORT_TOKEN for auth, GMWW_A_B_ARCHIVE_KEY for AES-256-GCM).
 * - Independent of the legacy GM admin key (PR #774); never accepts GM/session tokens.
 * - Never writes storage. Plaintext never leaves A: every chunk is sealed with the
 *   shared envelope before it is returned. Active sessions/rate-limit state are excluded.
 * - Refuses non-quiescent rooms (open WebSockets or a match in progress).
 */
import { sealBackupChunk } from '../infra/cloudflare-standby/production-backup-envelope.mjs';

export const BACKUP_EXPORT_SCHEMA = 'gmww-a-do-export-v1';
export const BACKUP_EXPORT_ROUTE = '/api/backup/a-export';
export const BACKUP_EXPORT_DO_PATH = '/__gmww/backup/export';
export const BACKUP_EXCLUDED_PREFIXES = Object.freeze(['session:', 'security-rate', '__gmww_health_read_only__']);
const ACTIVE_PHASES = new Set(['running', 'role_delivery']);
const CHUNK_BYTES = 65536;
const MAX_CHUNKS = 1024;
const MAX_PAGE = 8;
const HEX64 = /^[a-f0-9]{64}$/;
const HEX40 = /^[a-f0-9]{40}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const encoder = new TextEncoder();

/** Type-tagged, deterministic serialization. Unsupported types fail closed. */
export function encodeBackupValue(value, depth = 0) {
  if (depth > 64) throw Error('BACKUP_VALUE_TOO_DEEP');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    return { $t: 'num', v: String(value) };
  }
  if (value === undefined) return { $t: 'undef' };
  if (typeof value === 'bigint') return { $t: 'bigint', v: value.toString() };
  if (Array.isArray(value)) return value.map(v => encodeBackupValue(v, depth + 1));
  if (value instanceof Date) return { $t: 'date', v: Number.isNaN(value.getTime()) ? null : value.toISOString() };
  if (value instanceof Uint8Array) return { $t: 'u8', v: bytesToB64(value) };
  if (value instanceof ArrayBuffer) return { $t: 'ab', v: bytesToB64(new Uint8Array(value)) };
  if (value instanceof Map) return { $t: 'map', v: [...value].map(([k, v]) => [encodeBackupValue(k, depth + 1), encodeBackupValue(v, depth + 1)]) };
  if (value instanceof Set) return { $t: 'set', v: [...value].map(v => encodeBackupValue(v, depth + 1)) };
  if (typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = encodeBackupValue(value[key], depth + 1);
    if (Object.hasOwn(out, '$t')) return { $t: 'obj', v: out };
    return out;
  }
  throw Error('BACKUP_VALUE_UNSUPPORTED');
}

export function decodeBackupValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(decodeBackupValue);
  if (typeof value.$t === 'string') {
    switch (value.$t) {
      case 'num': return Number(value.v);
      case 'undef': return undefined;
      case 'bigint': return BigInt(value.v);
      case 'date': return new Date(value.v === null ? NaN : value.v);
      case 'u8': return b64ToBytes(value.v);
      case 'ab': return b64ToBytes(value.v).buffer;
      case 'map': return new Map(value.v.map(([k, v]) => [decodeBackupValue(k), decodeBackupValue(v)]));
      case 'set': return new Set(value.v.map(decodeBackupValue));
      case 'obj': return Object.fromEntries(Object.entries(value.v).map(([k, v]) => [k, decodeBackupValue(v)]));
      default: throw Error('BACKUP_VALUE_TAG_UNKNOWN');
    }
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeBackupValue(v)]));
}

export function isExcludedBackupKey(key) {
  return BACKUP_EXCLUDED_PREFIXES.some(prefix => key === prefix || key.startsWith(prefix));
}

export function backupExportConfigured(env) {
  return typeof env?.GMWW_BACKUP_EXPORT_TOKEN === 'string' && env.GMWW_BACKUP_EXPORT_TOKEN.length >= 32 &&
    typeof env?.GMWW_A_B_ARCHIVE_KEY === 'string' && env.GMWW_A_B_ARCHIVE_KEY.length === 43;
}

export function parseBackupExportRequest(body) {
  const objectId = String(body?.objectId || '');
  const backupId = String(body?.backupId || '');
  const sourceSha = String(body?.sourceSha || '');
  const chunkStart = Number(body?.chunkStart ?? 0);
  const chunkLimit = Number(body?.chunkLimit ?? MAX_PAGE);
  if (!HEX64.test(objectId) || !HEX32.test(backupId) || !HEX40.test(sourceSha) ||
      !Number.isSafeInteger(chunkStart) || chunkStart < 0 || chunkStart >= MAX_CHUNKS ||
      !Number.isSafeInteger(chunkLimit) || chunkLimit < 1 || chunkLimit > MAX_PAGE)
    throw Error('BACKUP_EXPORT_REQUEST_INVALID');
  return { objectId, backupId, sourceSha, chunkStart, chunkLimit };
}

/**
 * Pure export core (unit-testable). `entries` = Map from storage.list().
 * Returns a page of sealed chunks plus a manifest that is identical on every page
 * while the storage bookmark is unchanged (callers must compare bookmarks).
 */
export async function buildBackupExport({ entries, meta, connectedSockets, bookmark, request, archiveKey }) {
  const phase = String(meta?.phase || meta?.status || '').toLowerCase();
  if (connectedSockets !== 0 || ACTIVE_PHASES.has(phase)) throw Error('BACKUP_ROOM_NOT_QUIESCENT');
  const rows = [];
  let excluded = 0;
  for (const key of [...entries.keys()].sort()) {
    if (isExcludedBackupKey(key)) { excluded++; continue; }
    rows.push([key, encodeBackupValue(entries.get(key))]);
  }
  const plaintext = encoder.encode(JSON.stringify({ schema: BACKUP_EXPORT_SCHEMA, rows }));
  const count = Math.max(1, Math.ceil(plaintext.length / CHUNK_BYTES));
  if (count > MAX_CHUNKS) throw Error('BACKUP_OBJECT_TOO_LARGE');
  const objectDigest = await sha256Hex(encoder.encode(request.objectId));
  const revision = Math.max(0, Math.trunc(Number(meta?.matchRevision) || 0));
  const chunks = [];
  const end = Math.min(count, request.chunkStart + request.chunkLimit);
  for (let index = request.chunkStart; index < end; index++) {
    const slice = plaintext.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    chunks.push(await sealBackupChunk(slice, {
      backupId: request.backupId, objectDigest, sourceSha: request.sourceSha,
      revision, index, count, quiescent: true, connectedSockets: 0
    }, archiveKey));
  }
  return {
    ok: true,
    manifest: {
      schema: BACKUP_EXPORT_SCHEMA, backupId: request.backupId, objectDigest,
      sourceSha: request.sourceSha, revision, bookmark: String(bookmark || ''),
      keyCount: rows.length, excludedCount: excluded, plaintextBytes: plaintext.length, chunkCount: count
    },
    chunkStart: request.chunkStart,
    nextChunk: end < count ? end : null,
    chunks
  };
}

/** Called inside RoomDurableObject (read-only). */
export async function handleBackupExportInDo(ctx, env, request, authorize) {
  const notFound = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST' || !backupExportConfigured(env) ||
      !(await authorize(request, env.GMWW_BACKUP_EXPORT_TOKEN))) return notFound();
  try {
    const parsed = parseBackupExportRequest(await request.json());
    const result = await ctx.blockConcurrencyWhile(async () => {
      const bookmark = await ctx.storage.getCurrentBookmark().catch(() => '');
      const entries = await ctx.storage.list();
      return buildBackupExport({
        entries, meta: entries.get('meta'), connectedSockets: ctx.getWebSockets().length,
        bookmark, request: parsed, archiveKey: env.GMWW_A_B_ARCHIVE_KEY
      });
    });
    return json(result, 200);
  } catch (error) {
    const code = /^BACKUP_[A-Z_]+$/.test(error?.message) ? error.message : 'BACKUP_EXPORT_FAILED';
    return json({ ok: false, error: code }, code === 'BACKUP_ROOM_NOT_QUIESCENT' ? 409 : 400);
  }
}

/** Worker-level route: authenticates, then forwards to the DO addressed by its hex id. */
export async function handleBackupExportRoute(request, env, authorize) {
  const notFound = () => new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  if (request.method !== 'POST' || !env?.ROOMS || !backupExportConfigured(env) ||
      !(await authorize(request, env.GMWW_BACKUP_EXPORT_TOKEN))) return notFound();
  const raw = await request.text();
  let parsed;
  try { parsed = parseBackupExportRequest(JSON.parse(raw)); }
  catch { return json({ ok: false, error: 'BACKUP_EXPORT_REQUEST_INVALID' }, 400); }
  let stub;
  try { stub = env.ROOMS.get(env.ROOMS.idFromString(parsed.objectId)); }
  catch { return json({ ok: false, error: 'BACKUP_OBJECT_ID_INVALID' }, 400); }
  return stub.fetch(new Request('https://room.internal' + BACKUP_EXPORT_DO_PATH, {
    method: 'POST',
    headers: { authorization: request.headers.get('authorization') || '', 'content-type': 'application/json' },
    body: raw
  }));
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
async function sha256Hex(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
function bytesToB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function b64ToBytes(b64) {
  const raw = atob(String(b64));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
