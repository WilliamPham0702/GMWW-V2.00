// GMWW Cloudflare namespace maintenance. Privileged execution is confined to GitHub Actions.
// The GMWW Worker/player/browser never receives any Cloudflare credentials.
import { writeFile } from "node:fs/promises";
import { emptyNamespace } from "../.github/scripts/cleanup-closed-preview.mjs";

export const WORKER = "gmww-v2-00";
export const STATUS_ISSUE = 320;
export const RETENTION_MS = 24 * 60 * 60 * 1000;
export const MAX_DELETIONS = 10;
const REPO = "WilliamPham0702/GMWW-V2.00";
const RETAIN_LABELS = new Set(["keep-preview", "retain-preview"]);

function withPage(path, page, perPage) {
  return path + (path.includes("?") ? "&" : "?") +
    "page=" + page + "&per_page=" + perPage;
}

export function planCleanup({ previews, namespaces, pullRequests, productionIds, now }) {
  if (!Array.isArray(previews) || !Array.isArray(namespaces) ||
      !Array.isArray(pullRequests) || !(productionIds instanceof Set) ||
      productionIds.size === 0 || !Number.isFinite(now)) {
    throw new Error("Inventory or production binding is incomplete");
  }
  const namespaceByName = new Map();
  for (const ns of namespaces) {
    const group = namespaceByName.get(ns.name) || [];
    group.push(ns);
    namespaceByName.set(ns.name, group);
  }
  const byBranch = new Map();
  for (const pr of pullRequests) {
    const branch = pr?.head?.ref;
    if (!branch || pr?.base?.ref !== "main" ||
        pr?.base?.repo?.full_name !== REPO ||
        pr?.head?.repo?.full_name !== REPO) continue;
    const list = byBranch.get(branch) || [];
    list.push(pr);
    byBranch.set(branch, list);
  }
  const eligible = [], protectedPreviews = [], unlinked = [];
  for (const preview of previews) {
    const name = String(preview?.name || "");
    if (!name || name === "main" || name === "master") {
      protectedPreviews.push({ name, reason: "INVALID_NAME" }); continue;
    }
    const prs = byBranch.get(name) || [];
    if (!prs.length) {
      unlinked.push({ name, reason: "NO_MATCHING_PR" }); continue;
    }
    if (prs.some(pr => pr.state !== "closed" ||
        (pr.labels || []).some(label =>
          RETAIN_LABELS.has(String(label.name || "").toLowerCase())))) {
      protectedPreviews.push({ name, reason: "OPEN_OR_RETAINED_PR" }); continue;
    }
    const newestClosed = Math.max(...prs.map(pr => Date.parse(pr.closed_at || "")));
    if (!Number.isFinite(newestClosed) || now - newestClosed < RETENTION_MS) {
      protectedPreviews.push({ name, reason: "COOLDOWN" }); continue;
    }
    const namespaceName = WORKER + "_" + preview.slug + "_RoomDurableObject";
    const matches = namespaceByName.get(namespaceName) || [];
    if (matches.length !== 1 || matches[0].script !== WORKER ||
        !matches[0].id || !preview.id || productionIds.has(matches[0].id)) {
      protectedPreviews.push({ name, reason: "NAMESPACE_GUARD" }); continue;
    }
    eligible.push({
      name, id: preview.id, namespaceId: matches[0].id,
      prNumber: prs[0].number
    });
  }
  return { eligible, protectedPreviews, unlinked };
}


export function auditUnlinkedPreviews({ previews, namespaces, pullRequests, branches, productionIds, now, unlinked }) {
  if (![previews, namespaces, pullRequests, unlinked].every(Array.isArray) ||
      !(productionIds instanceof Set) || !Number.isFinite(now))
    throw new Error("Audit inventory is incomplete");
  const branchNames = Array.isArray(branches)
    ? new Set(branches.map(x => x?.name).filter(Boolean)) : null;
  return unlinked.map(item => {
    const preview = previews.find(x => x.name === item.name);
    const name = String(item.name || "");
    const relatedPrs = pullRequests.filter(pr =>
      pr?.head?.ref === name && pr?.head?.repo?.full_name === REPO);
    const hasOpenPr = relatedPrs.some(pr => pr.state === "open");
    const matches = preview?.slug ? namespaces.filter(ns =>
      ns.name === WORKER + "_" + preview.slug + "_RoomDurableObject" &&
      ns.script === WORKER && ns.id) : [];
    const namespaceId = matches.length === 1 ? matches[0].id : null;
    const created = Date.parse(preview?.created_on || "");
    let reason;
    if (hasOpenPr) reason = "OPEN_PR_OUTSIDE_MAIN_POLICY";
    else if (relatedPrs.length) reason = "PR_OUTSIDE_MAIN_POLICY";
    else if (!branchNames) reason = "BRANCH_INDEX_UNAVAILABLE";
    else if (branchNames.has(name)) reason = "BRANCH_EXISTS_NO_PR";
    else if (/^(backup|wip)\//i.test(name)) reason = "BACKUP_OR_WIP_NO_PR";
    else if (Number.isFinite(created) && now - created < 7 * RETENTION_MS)
      reason = "RECENT_NO_BRANCH_OR_PR";
    else reason = "NO_BRANCH_OR_PR_UNVERIFIED";
    return {
      name, reason, branchExists: branchNames ? branchNames.has(name) : null,
      matchingPrNumbers: relatedPrs.map(pr => pr.number).filter(Number.isFinite),
      createdAt: Number.isFinite(created) ? new Date(created).toISOString() : null,
      namespaceStatus: namespaceId
        ? productionIds.has(namespaceId) ? "PRODUCTION_BINDING_PROTECTED" : "ISOLATED_MATCH"
        : "NO_UNIQUE_NAMESPACE_MATCH",
      storageStatus: "NOT_CHECKED", latestDeploymentAt: null,
      deploymentStatus: "NOT_CHECKED", action: "RETAIN_FOR_REVIEW",
      namespaceId
    };
  });
}

export async function runMaintenance({
  env = process.env, request = fetch, now = Date.now()
} = {}) {
  const mode = String(env.GMWW_MAINTENANCE_MODE || "scan");
  if (!["scan", "cleanup"].includes(mode)) throw new Error("Unknown maintenance mode");
  for (const key of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID",
                     "GITHUB_TOKEN", "GITHUB_REPOSITORY"]) {
    if (!env[key]) throw new Error("Missing secret or environment: " + key);
  }
  if (env.GITHUB_REPOSITORY !== REPO ||
      !/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)) {
    throw new Error("Account/repository identity guard failed");
  }
  const cfBase = "https://api.cloudflare.com/client/v4/accounts/" + env.CLOUDFLARE_ACCOUNT_ID;
  const ghBase = "https://api.github.com/repos/" + REPO;
  async function api(url, headers, method = "GET", body) {
    const response = await request(url, {
      method, headers: { accept: "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!response.ok) throw new Error("HTTP " + response.status +
      " " + method + " " + new URL(url).pathname);
    const data = await response.json();
    if (url.startsWith(cfBase) && data?.success !== true)
      throw new Error("Cloudflare rejected " + method + " " + new URL(url).pathname);
    return data;
  }
  const cf = (path, method) => api(cfBase + path,
    { authorization: "Bearer " + env.CLOUDFLARE_API_TOKEN }, method);
  const gh = (path, method, body) => api(ghBase + path,
    { authorization: "Bearer " + env.GITHUB_TOKEN,
      "x-github-api-version": "2022-11-28",
      ...(body === undefined ? {} : { "content-type": "application/json" }) },
    method, body);
  async function listAll(path, provider, pageSize) {
    const rows = [];
    for (let p = 1; p <= 20; p++) {
      const data = await provider(withPage(path, p, pageSize));
      const values = Array.isArray(data) ? data : data?.result;
      if (!Array.isArray(values)) throw new Error("Incomplete inventory for " + path);
      rows.push(...values);
      const info = data?.result_info;
      if (info && Number.isFinite(Number(info.total_pages))) {
        if (p >= Number(info.total_pages)) return rows;
      } else if (values.length < pageSize) return rows;
    }
    throw new Error("Pagination guard reached for " + path);
  }
  const [previews, namespaces, pullRequests, settings] = await Promise.all([
    listAll("/workers/workers/" + WORKER + "/previews", cf, 100),
    listAll("/workers/durable_objects/namespaces", cf, 100),
    listAll("/pulls?state=all&sort=updated&direction=desc", gh, 100),
    cf("/workers/scripts/" + WORKER + "/settings")
  ]);
  // Branch inventory is supplementary evidence, not permission to delete.
  let branches = null;
  try {
    branches = await listAll("/branches", gh, 100);
  } catch (error) {
    console.warn("GMWW branch audit unavailable:", error.message);
  }
  const productionIds = new Set((settings?.result?.bindings || [])
    .filter(x => x.type === "durable_object_namespace")
    .map(x => x.namespace_id).filter(Boolean));
  const plan = planCleanup({
    previews, namespaces, pullRequests, productionIds, now
  });

  const audit = auditUnlinkedPreviews({
    previews, namespaces, pullRequests, branches, productionIds, now,
    unlinked: plan.unlinked
  });
  let auditFailures = branches === null ? 1 : 0;
  for (let offset = 0; offset < audit.length; offset += 4) {
    await Promise.all(audit.slice(offset, offset + 4).map(async entry => {
      const preview = previews.find(x => x.name === entry.name);
      try {
        const [detail, deployments] = await Promise.all([
          cf("/workers/workers/" + WORKER + "/previews/" + encodeURIComponent(preview.id)),
          cf("/workers/workers/" + WORKER + "/previews/" +
            encodeURIComponent(preview.id) + "/deployments?page=1&per_page=10")
        ]);
        if (detail?.result?.id !== preview.id || !Array.isArray(deployments?.result))
          throw new Error("Preview/deployment metadata incomplete");
        const times = [detail.result.deployed_on,
          ...deployments.result.map(x => x.created_on)]
          .map(x => Date.parse(x || "")).filter(Number.isFinite);
        entry.latestDeploymentAt = times.length
          ? new Date(Math.max(...times)).toISOString() : null;
        entry.deploymentStatus = "VERIFIED";
      } catch (error) {
        entry.deploymentStatus = "UNVERIFIED_API_ERROR";
        auditFailures++;
        console.warn("Preview deployment audit incomplete:", entry.name, error.message);
      }
      if (entry.namespaceStatus !== "ISOLATED_MATCH") return;
      try {
        const objects = await cf("/workers/durable_objects/namespaces/" +
          entry.namespaceId + "/objects?limit=1000");
        entry.storageStatus = emptyNamespace(objects)
          ? "EMPTY_CONFIRMED" : "NONEMPTY_OR_UNVERIFIED";
      } catch (error) {
        entry.storageStatus = "UNVERIFIED_API_ERROR";
        auditFailures++;
        console.warn("Preview storage audit incomplete:", entry.name, error.message);
      }
    }));
  }
  const auditReasons = {};
  for (const entry of audit)
    auditReasons[entry.reason] = (auditReasons[entry.reason] || 0) + 1;
  const checked = [], deleted = [], skipped = [];
  let cleanupAttempts = 0;
  for (const target of plan.eligible) {
    // Scan everything without mutation. Clean at most ten per maintenance run.
    if (mode === "cleanup" && cleanupAttempts >= MAX_DELETIONS) {
      skipped.push({ name: target.name, reason: "BATCH_LIMIT" }); continue;
    }
    if (mode === "cleanup") cleanupAttempts++;
    try {
      const objectPath = "/workers/durable_objects/namespaces/" +
        target.namespaceId + "/objects?limit=1000";
      const objects = await cf(objectPath);
      if (!emptyNamespace(objects)) {
        skipped.push({ name: target.name, reason: "STORAGE_NOT_EMPTY_OR_UNVERIFIED" });
        continue;
      }
      checked.push(target.name);
      if (mode !== "cleanup") continue;
      // Revalidate current GitHub and Cloudflare state immediately before destruction.
      const [livePr, livePreview, liveSettings, again] = await Promise.all([
        gh("/pulls/" + target.prNumber),
        cf("/workers/workers/" + WORKER + "/previews/" + target.id),
        cf("/workers/scripts/" + WORKER + "/settings"),
        cf(objectPath)
      ]);
      const currentBindings = new Set((liveSettings?.result?.bindings || [])
        .filter(x => x.type === "durable_object_namespace")
        .map(x => x.namespace_id).filter(Boolean));
      if (livePr?.state !== "closed" || livePr?.head?.ref !== target.name ||
          livePr?.head?.repo?.full_name !== REPO ||
          (livePr.labels || []).some(x => RETAIN_LABELS.has(String(x.name).toLowerCase())) ||
          Date.parse(livePr.closed_at || "") > now - RETENTION_MS ||
          livePreview?.result?.id !== target.id ||
          livePreview?.result?.name !== target.name ||
          !currentBindings.size || currentBindings.has(target.namespaceId) ||
          !emptyNamespace(again)) {
        skipped.push({ name: target.name, reason: "REVALIDATION_FAILED" });
        continue;
      }
      await cf("/workers/workers/" + WORKER + "/previews/" + target.id, "DELETE");
      const [remainingPreviews, remainingNamespaces] = await Promise.all([
        listAll("/workers/workers/" + WORKER + "/previews", cf, 100),
        listAll("/workers/durable_objects/namespaces", cf, 100)
      ]);
      if (remainingPreviews.some(x => x.id === target.id) ||
          remainingNamespaces.some(x => x.id === target.namespaceId)) {
        throw new Error("Deletion could not be independently verified");
      }
      deleted.push(target.name);
    } catch (error) {
      skipped.push({ name: target.name, reason: "API_OR_VERIFICATION_ERROR" });
      console.error("GMWW maintenance candidate skipped:", target.name, error.message);
    }
  }
  const [afterPreviews, afterNamespaces, afterSettings] = await Promise.all([
    listAll("/workers/workers/" + WORKER + "/previews", cf, 100),
    listAll("/workers/durable_objects/namespaces", cf, 100),
    cf("/workers/scripts/" + WORKER + "/settings")
  ]);
  if (!(afterSettings?.result?.bindings || []).some(x =>
    x.type === "durable_object_namespace" &&
    productionIds.has(x.namespace_id))) throw new Error("Production binding changed");

  const status = {
    schema: 2, state: skipped.length || auditFailures ? "partial" : "success",
    updatedAt: new Date(now).toISOString(), mode,
    namespaceCount: afterNamespaces.length,
    previewCount: afterPreviews.length,
    eligibleCount: plan.eligible.length,
    checkedCount: checked.length,
    deletedCount: deleted.length,
    protectedCount: plan.protectedPreviews.length,
    unlinkedCount: plan.unlinked.length,
    auditInspectedCount: audit.length, auditFailures, auditReasons,
    skippedCount: skipped.length,
    productionProtected: true,
    runUrl: "https://github.com/" + REPO + "/actions/runs/" +
      String(env.GITHUB_RUN_ID || "")
  };
  // Only publish aggregated information; no token, account ID, players or room details.

  const auditReasonLabels = {
    OPEN_PR_OUTSIDE_MAIN_POLICY: "PR vẫn mở nhưng không thuộc quy tắc nhánh main",
    PR_OUTSIDE_MAIN_POLICY: "Có lịch sử PR nhưng không thuộc quy tắc nhánh main",
    BRANCH_INDEX_UNAVAILABLE: "Không lấy được danh sách nhánh GitHub",
    BRANCH_EXISTS_NO_PR: "Nhánh GitHub còn tồn tại nhưng không tìm thấy PR",
    BACKUP_OR_WIP_NO_PR: "Bản dự phòng / đang phát triển, chưa có PR đối chiếu",
    RECENT_NO_BRANCH_OR_PR: "Preview mới, chưa tìm thấy nhánh hoặc PR",
    NO_BRANCH_OR_PR_UNVERIFIED: "Không tìm thấy nhánh và PR; cần xác minh thủ công"
  };
  const auditDetails = audit.length ? audit.map(entry => {
    const safeName = entry.name.replace(/[^A-Za-z0-9_.\/-]/g, "_");
    const branch = entry.branchExists === null ? "chưa thể kiểm tra" :
      entry.branchExists ? "còn tồn tại" : "không tìm thấy";
    return "- **" + safeName + "**: " +
      (auditReasonLabels[entry.reason] || entry.reason) +
      "; nhánh: " + branch +
      "; PR: " + (entry.matchingPrNumbers.join(", ") || "chưa tìm thấy") +
      "; namespace: " + entry.namespaceStatus +
      "; lưu trữ: " + entry.storageStatus +
      "; deployment: " + entry.deploymentStatus +
      (entry.latestDeploymentAt ? " (" + entry.latestDeploymentAt + ")" : "") +
      "; **quyết định: GIỮ LẠI**";
  }).join("\n") : "Không có Preview chưa đối chiếu.";
  const markerStart = "<!-- GMWW_CF_STATUS_START -->";
  const markerEnd = "<!-- GMWW_CF_STATUS_END -->";
  const body = "# GMWW Cloudflare Maintenance\n\n" +
    "Thông tin tổng hợp, cập nhật qua GitHub Actions có xác thực. " +
    "Không chứa dữ liệu game hoặc thông tin bí mật.\n\n" +
    markerStart + "\n" + JSON.stringify(status) + "\n" + markerEnd + "\n\n" +
    "### Chi tiết Preview chưa đối chiếu (chỉ kiểm toán, không tự xóa)\n\n" +
    auditDetails + "\n\n" +
    "Nhật ký chi tiết: [GitHub Actions](" +
    "https://github.com/" + REPO + "/actions/workflows/cloudflare-maintenance.yml).\n";
  await gh("/issues/" + STATUS_ISSUE, "PATCH", { body });
  if (env.GITHUB_STEP_SUMMARY) {
    const summary = "## GMWW Cloudflare Maintenance\n" +
      "- Chế độ: " + mode + "\n" +
      "- Namespace: " + status.namespaceCount +
      " | Preview: " + status.previewCount + "\n" +
      "- Đủ điều kiện: " + plan.eligible.length +
      " | Đã xoá: " + deleted.length + "\n" +
      "- Giữ lại (bảo vệ): " + plan.protectedPreviews.length +
      " | Chưa đối chiếu: " + plan.unlinked.length +
      " | Bỏ qua: " + skipped.length + "\n" +
      "- Đã kiểm toán từng Preview: " + audit.length +
      " | Lỗi xác minh API: " + auditFailures + "\n" +
      "- Nhóm chưa đối chiếu: " + JSON.stringify(auditReasons) + "\n" +
      "- Production: không thay đổi binding\n";
    await writeFile(env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
  }
  console.log("GMWW maintenance result:", JSON.stringify(status));
  if (skipped.length) console.log("Skip summary:", JSON.stringify(skipped));
  return status;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  runMaintenance().catch(error => {
    console.error("GMWW maintenance aborted:", error.message);
    process.exitCode = 1;
  });
}
