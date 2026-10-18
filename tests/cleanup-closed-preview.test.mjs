import test from "node:test";
import assert from "node:assert/strict";
import { selectClosedPreview, emptyNamespace, WORKER } from "../.github/scripts/cleanup-closed-preview.mjs";

const REPO = "WilliamPham0702/GMWW-V2.00";
function context() {
  const event = {
    action: "closed", repository: { full_name: REPO },
    pull_request: {
      number: 55, state: "closed",
      base: { ref: "main", repo: { full_name: REPO } },
      head: { ref: "fix/safe-closed", repo: { full_name: REPO } }
    }
  };
  const livePr = {
    number: 55, state: "closed", labels: [],
    head: { ref: "fix/safe-closed", repo: { full_name: REPO } }
  };
  return {
    event, livePr, openPrs: [],
    previews: [{ id: "preview-1", slug: "fix-safe-closed", name: "fix/safe-closed" }],
    namespaces: [{ id: "test-ns", name: WORKER + "_fix-safe-closed_RoomDurableObject", script: WORKER }],
    productionNamespaceIds: new Set(["prod-ns"])
  };
}

test("closed PR with isolated Preview and namespace selects exact IDs", () => {
  assert.deepEqual(selectClosedPreview(context()), {
    previewId: "preview-1", namespaceId: "test-ns", previewName: "fix/safe-closed"
  });
});
test("rejects non-closed events or reopened PRs", () => {
  const a = context(); a.event.action = "opened";
  assert.equal(selectClosedPreview(a).reason, "NOT_CLOSED_EVENT");
  const b = context(); b.livePr.state = "open";
  assert.equal(selectClosedPreview(b).reason, "PR_STATE_CHANGED");
});
test("rejects untrusted forks and other bases", () => {
  const a = context(); a.event.pull_request.head.repo.full_name = "other/repo";
  assert.equal(selectClosedPreview(a).reason, "NOT_SAME_REPO_MAIN");
  const b = context(); b.event.pull_request.base.ref = "staging";
  assert.equal(selectClosedPreview(b).reason, "NOT_SAME_REPO_MAIN");
});
test("never deletes a branch still having an open PR", () => {
  const a = context();
  a.openPrs = [{ head: { ref: "fix/safe-closed", repo: { full_name: REPO } } }];
  assert.equal(selectClosedPreview(a).reason, "BRANCH_STILL_HAS_OPEN_PR");
});
test("preserve label skips the Preview", () => {
  const a = context(); a.livePr.labels = [{ name: "keep-preview" }];
  assert.equal(selectClosedPreview(a).reason, "RETAIN_LABEL");
});
test("mismatched, ambiguous, or missing Preview skips cleanup", () => {
  const a = context(); a.previews[0].name = "different-branch";
  assert.equal(selectClosedPreview(a).reason, "PREVIEW_NOT_UNIQUE_OR_MISSING");
  const b = context(); b.previews.push({ ...b.previews[0], id: "preview-2" });
  assert.equal(selectClosedPreview(b).reason, "PREVIEW_NOT_UNIQUE_OR_MISSING");
});
test("rejects namespace not owned by exact Worker or bound to production", () => {
  const a = context(); a.namespaces[0].script = "another-worker";
  assert.equal(selectClosedPreview(a).reason, "NAMESPACE_NOT_ISOLATED");
  const b = context(); b.productionNamespaceIds.add("test-ns");
  assert.equal(selectClosedPreview(b).reason, "PRODUCTION_BINDING_GUARD");
  const c = context(); c.productionNamespaceIds.clear();
  assert.equal(selectClosedPreview(c).reason, "PRODUCTION_BINDING_GUARD");
});
test("only empty and completely enumerated Durable Object storage is deletable", () => {
  assert.equal(emptyNamespace({ success: true, result: [], result_info: { count: 0, cursor: "" } }), true);
  assert.equal(emptyNamespace({ success: true, result: [{ hasStoredData: true }], result_info: { count: 1, cursor: "" } }), false);
  assert.equal(emptyNamespace({ success: true, result: [], result_info: { count: 0, cursor: "next" } }), false);
  assert.equal(emptyNamespace({ success: false, result: [], result_info: { count: 0 } }), false);
  assert.equal(emptyNamespace({ success: true, result: null, result_info: { count: 0 } }), false);
});
