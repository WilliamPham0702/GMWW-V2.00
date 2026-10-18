import test from "node:test";
import assert from "node:assert/strict";
import { planCleanup, runMaintenance, RETENTION_MS, MAX_DELETIONS } from "../tools/cloudflare-namespace-maintenance.mjs";

const REPO = "WilliamPham0702/GMWW-V2.00";
const now = Date.parse("2026-10-18T00:00:00Z");
function fixtures() {
  const branch = "fix/closed-example";
  return {
    now,
    previews: [{ id: "p1", name: branch, slug: "fix-closed-example" }],
    namespaces: [
      { id: "ns1", name: "gmww-v2-00_fix-closed-example_RoomDurableObject", script: "gmww-v2-00" },
      { id: "production", name: "gmww-v2-00_RoomDurableObject", script: "gmww-v2-00" }
    ],
    pullRequests: [{
      number: 50, state: "closed", closed_at: "2026-10-16T22:00:00Z",
      base: { ref: "main", repo: { full_name: REPO } },
      head: { ref: branch, repo: { full_name: REPO } }, labels: []
    }],
    productionIds: new Set(["production"])
  };
}

test("closed and old enough unique preview is eligible, Production never is", () => {
  const result = planCleanup(fixtures());
  assert.deepEqual(result.eligible, [{
    name: "fix/closed-example", id: "p1", namespaceId: "ns1", prNumber: 50
  }]);
  assert.equal(RETENTION_MS, 24 * 60 * 60 * 1000);
  assert.ok(MAX_DELETIONS > 0 && MAX_DELETIONS <= 10);
});
test("open PR sharing the branch protects the Preview", () => {
  const f = fixtures(); f.pullRequests.push({ ...f.pullRequests[0], state: "open", number: 51 });
  assert.equal(planCleanup(f).eligible.length, 0);
});
test("retain-preview label protects even closed PR", () => {
  const f = fixtures(); f.pullRequests[0].labels = [{ name: "retain-preview" }];
  assert.equal(planCleanup(f).eligible.length, 0);
});
test("24h cooldown protects recently closed PR", () => {
  const f = fixtures(); f.pullRequests[0].closed_at = "2026-10-17T23:00:00Z";
  assert.equal(planCleanup(f).eligible.length, 0);
});
test("unknown PR, fork, and non-main target remain unlinked", () => {
  const f = fixtures(); f.pullRequests = [];
  assert.equal(planCleanup(f).unlinked.length, 1);
  const f2 = fixtures(); f2.pullRequests[0].head.repo.full_name = "other/fork";
  assert.equal(planCleanup(f2).eligible.length, 0);
  const f3 = fixtures(); f3.pullRequests[0].base.ref = "staging";
  assert.equal(planCleanup(f3).eligible.length, 0);
});
test("protects production bindings, foreign namespaces, ambiguous matches", () => {
  const f = fixtures(); f.productionIds.add("ns1");
  assert.equal(planCleanup(f).eligible.length, 0);
  const f2 = fixtures(); f2.namespaces[0].script = "another-worker";
  assert.equal(planCleanup(f2).eligible.length, 0);
  const f3 = fixtures(); f3.namespaces.push({ ...f3.namespaces[0] });
  assert.equal(planCleanup(f3).eligible.length, 0);
});
test("missing Production bindings or malformed inventory fail closed", () => {
  const f = fixtures(); f.productionIds = new Set();
  assert.throws(() => planCleanup(f), /incomplete/i);
  const f2 = fixtures(); f2.previews = null;
  assert.throws(() => planCleanup(f2), /incomplete/i);
});
test("does not treat unmatched 4 independent namespaces as candidates", () => {
  const f = fixtures(); f.namespaces.push(
    { id: "v1", name: "gmww_RoomDurableObject", script: "gmww" },
    { id: "lab", name: "gmww-gr01-backup-lab_Gr01LabDO", script: "gmww-gr01-backup-lab" },
    { id: "staging", name: "gmww-character21-v605-game-staging_RoomDurableObject", script: "gmww-character21-v605-game-staging" }
  );
  assert.equal(planCleanup(f).eligible.length, 1);
});


function createApiMock() {
  let removed = false;
  const calls = [];
  const fixture = fixtures();
  const account = "a".repeat(32);
  const env = {
    GITHUB_REPOSITORY: REPO, GITHUB_TOKEN: "github-test",
    CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: "cloudflare-test",
    GITHUB_RUN_ID: "123"
  };
  const cfRoot = "https://api.cloudflare.com/client/v4/accounts/" + account;
  const ghRoot = "https://api.github.com/repos/" + REPO;
  function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }
  async function request(url, options = {}) {
    const path = new URL(url).pathname;
    calls.push({ url, method: options.method || "GET" });
    if (url.startsWith(cfRoot)) {
      if (path.endsWith("/previews")) return response({
        success: true, result: removed ? [] : fixture.previews,
        result_info: { count: removed ? 0 : 1, total_pages: 1 }
      });
      if (path.endsWith("/durable_objects/namespaces")) return response({
        success: true, result: removed ? fixture.namespaces.slice(1) : fixture.namespaces,
        result_info: { total_pages: 1 }
      });
      if (path.endsWith("/settings")) return response({ success: true,
        result: { bindings: [{ type: "durable_object_namespace", namespace_id: "production" }] }
      });
      if (path.endsWith("/ns1/objects")) return response({
        success: true, result: [], result_info: { count: 0, cursor: "" }
      });
      if (path.endsWith("/previews/p1")) {
        if (options.method === "DELETE") {
          removed = true; return response({ success: true, result: null });
        }
        return response({ success: true, result: fixture.previews[0] });
      }
    }
    if (url.startsWith(ghRoot)) {
      if (path.endsWith("/pulls")) return response(fixture.pullRequests);
      if (path.endsWith("/pulls/50")) return response(fixture.pullRequests[0]);
      if (path.endsWith("/issues/320") && options.method === "PATCH") {
        return response({ number: 320, state: "open" });
      }
    }
    throw Error("Unexpected API path " + url);
  }
  return { env, request, calls, wasRemoved: () => removed };
}

test("scan is read-only, reports counts, and never calls DELETE", async () => {
  const mock = createApiMock();
  const result = await runMaintenance({
    env: { ...mock.env, GMWW_MAINTENANCE_MODE: "scan" },
    request: mock.request, now
  });
  assert.equal(result.namespaceCount, 2);
  assert.equal(result.eligibleCount, 1);
  assert.equal(result.deletedCount, 0);
  assert.equal(mock.wasRemoved(), false);
  assert.equal(mock.calls.filter(x => x.method === "DELETE").length, 0);
});
test("cleanup deletes only exact verified Preview ID and checks Production", async () => {
  const mock = createApiMock();
  const result = await runMaintenance({
    env: { ...mock.env, GMWW_MAINTENANCE_MODE: "cleanup" },
    request: mock.request, now
  });
  assert.equal(result.namespaceCount, 1);
  assert.equal(result.deletedCount, 1);
  assert.equal(result.productionProtected, true);
  const destructiveCalls = mock.calls.filter(x => x.method === "DELETE");
  assert.equal(destructiveCalls.length, 1);
  assert.match(destructiveCalls[0].url, /\/previews\/p1$/);
});
test("invalid repository and missing secrets reject before any API calls", async () => {
  const mock = createApiMock();
  await assert.rejects(() => runMaintenance({
    env: { ...mock.env, GITHUB_REPOSITORY: "other/repo" },
    request: mock.request, now
  }), /identity guard/);
  await assert.rejects(() => runMaintenance({
    env: { ...mock.env, CLOUDFLARE_API_TOKEN: "" },
    request: mock.request, now
  }), /Missing secret/);
  assert.equal(mock.calls.length, 0);
});
