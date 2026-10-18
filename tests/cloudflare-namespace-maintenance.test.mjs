import test from "node:test";
import assert from "node:assert/strict";
import { planCleanup, RETENTION_MS, MAX_DELETIONS } from "../tools/cloudflare-namespace-maintenance.mjs";

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
