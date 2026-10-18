// Cleanup runs only from a closed same-repository PR event on main.
// Fail closed: if a Preview is not proven isolated, empty, and unused, retain it.
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const WORKER = "gmww-v2-00";
const RETAIN_LABELS = new Set(["keep-preview", "retain-preview"]);

export function selectClosedPreview({ event, livePr, openPrs, previews, namespaces, productionNamespaceIds }) {
  const pr = event?.pull_request;
  const repo = event?.repository?.full_name;
  if (event?.action !== "closed" || !pr || pr.state !== "closed") return { reason: "NOT_CLOSED_EVENT" };
  if (!repo || pr.base?.ref !== "main" || pr.base?.repo?.full_name !== repo ||
      pr.head?.repo?.full_name !== repo) return { reason: "NOT_SAME_REPO_MAIN" };
  if (!livePr || livePr.number !== pr.number || livePr.state !== "closed" ||
      livePr.head?.ref !== pr.head?.ref || livePr.head?.repo?.full_name !== repo)
    return { reason: "PR_STATE_CHANGED" };
  const branch = pr.head.ref;
  if (!branch || ["main", "master"].includes(branch)) return { reason: "INVALID_BRANCH" };
  if ((livePr.labels || []).some(x => RETAIN_LABELS.has(String(x.name || "").toLowerCase())))
    return { reason: "RETAIN_LABEL" };
  if (!Array.isArray(openPrs) || openPrs.some(x =>
      x.head?.ref === branch && x.head?.repo?.full_name === repo))
    return { reason: "BRANCH_STILL_HAS_OPEN_PR" };
  const matching = (previews || []).filter(x => x.name === branch);
  if (matching.length !== 1 || !matching[0].id || !matching[0].slug)
    return { reason: "PREVIEW_NOT_UNIQUE_OR_MISSING" };
  const preview = matching[0];
  const namespaceName = WORKER + "_" + preview.slug + "_RoomDurableObject";
  const related = (namespaces || []).filter(x => x.name === namespaceName && x.script === WORKER);
  if (related.length !== 1 || !related[0].id) return { reason: "NAMESPACE_NOT_ISOLATED" };
  if (!(productionNamespaceIds instanceof Set) || !productionNamespaceIds.size ||
      productionNamespaceIds.has(related[0].id))
    return { reason: "PRODUCTION_BINDING_GUARD" };
  return { previewId: preview.id, namespaceId: related[0].id, previewName: preview.name };
}

export function emptyNamespace(result) {
  return result?.success === true && Array.isArray(result.result) &&
    result.result.length === 0 && !result.result_info?.cursor &&
    (result.result_info?.count === undefined || result.result_info.count === 0);
}

function requiredEnv(env) {
  for (const name of ["GITHUB_EVENT_PATH", "GITHUB_REPOSITORY", "GITHUB_TOKEN",
                       "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"])
    if (!env[name]) throw new Error("Missing required environment variable: " + name);
}

export async function run({ env = process.env, request = fetch } = {}) {
  requiredEnv(env);
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, "utf8"));
  const repo = env.GITHUB_REPOSITORY;
  if (event?.repository?.full_name !== repo) throw new Error("Repository identity mismatch");
  if (event?.action !== "closed" || event?.pull_request?.state !== "closed")
    return { skipped: "NOT_CLOSED_EVENT" };
  if (event.pull_request.base?.ref !== "main" ||
      event.pull_request.head?.repo?.full_name !== repo)
    return { skipped: "NOT_SAME_REPO_MAIN" };

  const github = async path => {
    const r = await request("https://api.github.com/repos/" + repo + path, {
      headers: { authorization: "Bearer " + env.GITHUB_TOKEN,
        accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28" }
    });
    if (!r.ok) throw new Error("GitHub API HTTP " + r.status + " " + path);
    return r.json();
  };
  const base = "https://api.cloudflare.com/client/v4/accounts/" + env.CLOUDFLARE_ACCOUNT_ID;
  const cloudflare = async (path, method = "GET") => {
    const r = await request(base + path, {
      method, headers: { authorization: "Bearer " + env.CLOUDFLARE_API_TOKEN,
        accept: "application/json" }
    });
    const body = await r.json();
    if (!r.ok || !body?.success) throw new Error("Cloudflare API " + method + " HTTP " +
      r.status + " on " + path + ": " + JSON.stringify(body?.errors || []).slice(0, 240));
    return body;
  };

  // Read current PR state, not just a possibly stale closed webhook.
  const livePr = await github("/pulls/" + event.pull_request.number);
  const openPrs = [];
  for (let page = 1; page <= 20; page++) {
    const rows = await github("/pulls?state=open&per_page=100&page=" + page);
    if (!Array.isArray(rows)) throw new Error("Open PR inventory is not an array");
    openPrs.push(...rows);
    if (rows.length < 100) break;
    if (page === 20) throw new Error("Open PR inventory exceeds pagination safety bound");
  }

  async function allPages(path, field) {
    const items = [];
    for (let page = 1; page <= 20; page++) {
      const payload = await cloudflare(path + (path.includes("?") ? "&" : "?") +
        "page=" + page + "&per_page=100");
      if (!Array.isArray(payload.result)) throw new Error("Bad Cloudflare list " + field);
      items.push(...payload.result);
      if (page >= Number(payload.result_info?.total_pages || 1)) return items;
    }
    throw new Error("Cloudflare pagination safety bound");
  }
  const [previews, namespaces, settings] = await Promise.all([
    allPages("/workers/workers/" + WORKER + "/previews", "previews"),
    allPages("/workers/durable_objects/namespaces", "namespaces"),
    cloudflare("/workers/scripts/" + WORKER + "/settings")
  ]);
  const productionNamespaceIds = new Set((settings.result?.bindings || [])
    .filter(x => x.type === "durable_object_namespace").map(x => x.namespace_id).filter(Boolean));
  const target = selectClosedPreview({
    event, livePr, openPrs, previews, namespaces, productionNamespaceIds
  });
  if (!target.previewId) return { skipped: target.reason };
  const objectList = await cloudflare("/workers/durable_objects/namespaces/" +
    target.namespaceId + "/objects?limit=1000");
  if (!emptyNamespace(objectList)) return { skipped: "NAMESPACE_CONTAINS_DATA_OR_UNVERIFIED" };

  // Delete only the exact Preview ID: this also removes its isolated namespace.
  await cloudflare("/workers/workers/" + WORKER + "/previews/" + target.previewId, "DELETE");
  const [afterPreviews, afterNamespaces, afterSettings] = await Promise.all([
    allPages("/workers/workers/" + WORKER + "/previews", "previews"),
    allPages("/workers/durable_objects/namespaces", "namespaces"),
    cloudflare("/workers/scripts/" + WORKER + "/settings")
  ]);
  if (afterPreviews.some(x => x.id === target.previewId) ||
      afterNamespaces.some(x => x.id === target.namespaceId) ||
      !(afterSettings.result?.bindings || []).some(x => x.type === "durable_object_namespace" &&
        productionNamespaceIds.has(x.namespace_id)))
    throw new Error("Post-cleanup verification failed");
  return { deleted: target.previewName, namespaceRemoved: true, productionBindingIntact: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(result => console.log("GMWW Preview cleanup:", JSON.stringify(result)))
    .catch(error => { console.error("GMWW Preview cleanup failed:", error.message); process.exitCode = 1; });
}
