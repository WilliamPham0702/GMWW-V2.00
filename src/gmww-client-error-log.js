// Central client error log (GM + Player Web). Pure helpers: sanitize, dedupe, cap, throttle.
// Stored as one small DO record, so a crash loop can never grow storage or spend write quota.
export const CLIENT_ERROR_MAX_ITEMS = 40;
export const CLIENT_ERROR_MIN_WRITE_GAP_MS = 5000;
const SOURCES = new Set(["player", "gm"]);
const clean = (value, max) => String(value ?? "")
  .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL]")
  .replace(/\b(?:token|api[_-]?key|password|authorization|bearer)\s*[:=]?\s*[^\s,;&]+/gi, "[ẩn]")
  .replace(/\s+/g, " ").trim().slice(0, max);

export function normalizeClientError(body, now = Date.now()) {
  if (!body || typeof body !== "object") return null;
  const message = clean(body.message, 200);
  if (!message) return null;
  const room = String(body.room ?? "").toUpperCase().match(/^[A-Z0-9]{3,12}$/)?.[0] || "";
  return {
    source: SOURCES.has(body.source) ? body.source : "player",
    kind: clean(body.kind, 20) || "javascript",
    message,
    stack: clean(body.stack, 600),
    page: clean(String(body.page ?? "").split(/[?#]/)[0], 60),
    version: clean(body.version, 24),
    device: clean(body.device, 80),
    room,
    at: new Date(now).toISOString()
  };
}

export const clientErrorFingerprint = (entry) => entry.source + "|" + entry.kind + "|" + entry.message.slice(0, 80);

// Returns {state, changed, reason}. reason: "new" | "duplicate" | "throttled".
export function appendClientError(state, entry, now = Date.now()) {
  const base = state && Array.isArray(state.items) ? state : { items: [], lastWriteAt: 0, dropped: 0 };
  const items = base.items.slice();
  const key = clientErrorFingerprint(entry);
  const hit = items.findIndex((row) => clientErrorFingerprint(row) === key);
  if (hit >= 0) {
    const row = items[hit];
    items[hit] = { ...row, count: (row.count || 1) + 1, lastAt: entry.at };
    return { state: { ...base, items }, changed: true, reason: "duplicate" };
  }
  if (now - (base.lastWriteAt || 0) < CLIENT_ERROR_MIN_WRITE_GAP_MS) {
    return { state: { ...base, dropped: (base.dropped || 0) + 1 }, changed: false, reason: "throttled" };
  }
  items.unshift({ ...entry, count: 1, lastAt: entry.at });
  return { state: { items: items.slice(0, CLIENT_ERROR_MAX_ITEMS), lastWriteAt: now, dropped: base.dropped || 0 }, changed: true, reason: "new" };
}

export function formatClientErrorReport(items, version = "") {
  const lines = ["GMWW lỗi " + (version ? "(" + version + ") " : "") + "— " + items.length + " mục"];
  for (const row of items) {
    lines.push("- [" + row.source + "/" + row.kind + "] x" + (row.count || 1) + " " + row.lastAt + (row.room ? " phòng " + row.room : "") + (row.version ? " v" + row.version : "") + (row.device ? " · " + row.device : ""));
    lines.push("  " + row.message);
    if (row.stack) lines.push("  " + row.stack);
  }
  return lines.join("\n");
}
