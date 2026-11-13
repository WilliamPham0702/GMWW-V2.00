import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeClientError, appendClientError, formatClientErrorReport, CLIENT_ERROR_MAX_ITEMS } from "../src/gmww-client-error-log.js";

const NOW = Date.parse("2026-11-07T03:00:00Z");
test("normalize hides urls and secrets, rejects empty messages, bounds fields", () => {
  const e = normalizeClientError({ message: "fetch https://x.test/a?token=abc failed password=hunter2", stack: "s".repeat(5000), room: "ab12", source: "gm" }, NOW);
  assert.equal(e.source, "gm"); assert.equal(e.room, "AB12");
  assert.ok(!/x\.test|hunter2/.test(e.message)); assert.ok(e.stack.length <= 600);
  assert.equal(normalizeClientError({ message: "  " }, NOW), null); assert.equal(normalizeClientError(null, NOW), null);
  assert.equal(normalizeClientError({ message: "m", source: "evil" }, NOW).source, "player");
});
test("duplicates only bump a counter (no new row) and never throttle", () => {
  let s = appendClientError(null, normalizeClientError({ message: "boom" }, NOW), NOW).state;
  const r = appendClientError(s, normalizeClientError({ message: "boom" }, NOW + 1), NOW + 1);
  assert.equal(r.reason, "duplicate"); assert.equal(r.state.items.length, 1); assert.equal(r.state.items[0].count, 2);
});
test("new different errors inside the write gap are dropped and counted, then accepted later", () => {
  let s = appendClientError(null, normalizeClientError({ message: "a" }, NOW), NOW).state;
  const t = appendClientError(s, normalizeClientError({ message: "b" }, NOW + 100), NOW + 100);
  assert.equal(t.reason, "throttled"); assert.equal(t.changed, false); assert.equal(t.state.dropped, 1);
  const ok = appendClientError(t.state, normalizeClientError({ message: "b" }, NOW + 6000), NOW + 6000);
  assert.equal(ok.reason, "new"); assert.equal(ok.state.items[0].message, "b");
});
test("list is capped and newest first", () => {
  let s = null;
  for (let i = 0; i < CLIENT_ERROR_MAX_ITEMS + 10; i++) s = appendClientError(s, normalizeClientError({ message: "e" + i }, NOW + i * 6000), NOW + i * 6000).state;
  assert.equal(s.items.length, CLIENT_ERROR_MAX_ITEMS); assert.equal(s.items[0].message, "e" + (CLIENT_ERROR_MAX_ITEMS + 9));
});
test("report text is paste-ready and includes room/version", () => {
  const s = appendClientError(null, normalizeClientError({ message: "bad", room: "ROOM1", version: "3.310", device: "iPhone" }, NOW), NOW).state;
  const text = formatClientErrorReport(s.items, "V3.310");
  assert.match(text, /phòng ROOM1/); assert.match(text, /v3\.310/); assert.match(text, /bad/);
});

import fs from "node:fs";
import vm from "node:vm";
const src = workerSource();
const a = src.indexOf('  if(url.pathname==="/api/client-error"&&request.method==="POST"){');
const b = src.indexOf('  if(url.pathname==="/api/gm/storage-optimizer"', a);
assert.ok(a > 0 && b > a, "client-error routes must exist");
const route = vm.runInNewContext("(async(request,env)=>{const url=new URL(request.url);" + src.slice(a, b) + "return null;})", {
  URL, Request, Response, JSON,
  j: (d, status = 200) => new Response(JSON.stringify(d), { status }),
  bearer: (r) => (r.headers.get("authorization") || "").replace(/^Bearer /, ""),
  GM_SYNC_TOKEN: "gm-secret",
  memberStore: (env) => ({ fetch: (req) => { env.calls.push([req.method, new URL(req.url).pathname]); return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })); } })
});
test("POST /api/client-error forwards small JSON to the member store, rejects bad/oversize bodies", async () => {
  const env = { calls: [] };
  const ok = await route(new Request("https://w.test/api/client-error", { method: "POST", body: JSON.stringify({ message: "x" }) }), env);
  assert.equal(ok.status, 200); assert.deepEqual(env.calls, [["POST", "/client-errors"]]);
  assert.equal((await route(new Request("https://w.test/api/client-error", { method: "POST", body: "not json" }), env)).status, 400);
  assert.equal((await route(new Request("https://w.test/api/client-error", { method: "POST", body: "x".repeat(3001) }), env)).status, 413);
  assert.equal(env.calls.length, 1);
});
test("GM reads/clears the error log only with the GM token", async () => {
  const env = { calls: [] };
  assert.equal((await route(new Request("https://w.test/api/gm/client-errors"), env)).status, 401);
  assert.equal((await route(new Request("https://w.test/api/gm/client-errors", { method: "DELETE", headers: { authorization: "Bearer wrong" } }), env)).status, 401);
  assert.equal(env.calls.length, 0);
  const r = await route(new Request("https://w.test/api/gm/client-errors", { headers: { authorization: "Bearer gm-secret" } }), env);
  assert.equal(r.status, 200); assert.deepEqual(env.calls, [["GET", "/client-errors"]]);
});
