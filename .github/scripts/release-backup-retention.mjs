#!/usr/bin/env node
/**
 * GMWW release backup & retention. Only removes old binary release assets.
 * Game data, Git history, tags, release notes, Workers, and IPA source are untouched.
 * Preview is the default. Execution requires --execute from main + GH_TOKEN.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

export const POLICY = Object.freeze({
  latestRuntimeVersions: 5,
  latestIpaVersions: 3,
  minimumAgeDays: 14,
  maxDeletesPerRun: 25,
  protectedTags: ['legacy-assets-v252', 'gmww-v3.17', 'gmww-v3.200'],
});

const ONE_DAY = 86400000;
const SHA_RE = /^sha256:([a-f0-9]{64})$/i;
const ARCHIVE_PREFIX = 'gmww-backup-';
const binarySpecs = [
  { type: 'runtime', re: /^GMWW-Runtime-V(\d+\.\d+)\.gmwwupdate$/ },
  { type: 'ipa', re: /^GMWW-V(\d+\.\d+)\.ipa$/ },
];

function versionCompare(a, b) {
  const aa = a.split('.').map(Number), bb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const d = (aa[i] || 0) - (bb[i] || 0);
    if (d) return d;
  }
  return 0;
}
function dateOf(release) {
  return new Date(release.published_at || release.created_at || 0).getTime();
}
function monthOf(release) {
  return new Date(dateOf(release)).toISOString().slice(0, 7);
}
function classify(release, asset) {
  for (const spec of binarySpecs) {
    const match = spec.re.exec(String(asset.name));
    if (match) return { ...asset, type: spec.type, version: match[1], releaseTag: release.tag_name,
      releaseDate: dateOf(release), month: monthOf(release) };
  }
  return null;
}
function sortNewest(a, b) {
  return versionCompare(b.version, a.version) || b.releaseDate - a.releaseDate ||
    ((a.releaseTag.startsWith('gmww-runtime-') ? -1 : 1) -
     (b.releaseTag.startsWith('gmww-runtime-') ? -1 : 1));
}
export function planRetention(releases, { now = Date.now(), policy = POLICY, referencedTags = [] } = {}) {
  const protectedTags = new Set([...policy.protectedTags, ...referencedTags]);
  const assets = [];
  for (const release of releases) {
    if (release.draft || release.prerelease || release.tag_name.startsWith(ARCHIVE_PREFIX)) continue;
    if (!Number.isFinite(dateOf(release)) || dateOf(release) <= 0) continue;
    for (const asset of release.assets || []) {
      const item = classify(release, asset);
      if (item) assets.push(item);
    }
  }
  const runtime = assets.filter(a => a.type === 'runtime').sort(sortNewest);
  const ipa = assets.filter(a => a.type === 'ipa').sort(sortNewest);
  const keepVersions = new Set();
  for (const [list, count, kind] of [[runtime, policy.latestRuntimeVersions, 'runtime'],
                                    [ipa, policy.latestIpaVersions, 'ipa']]) {
    for (const v of [...new Set(list.map(a => a.version))].slice(0, count)) {
      keepVersions.add(kind + ':' + v);
    }
  }
  const candidates = assets.filter(a =>
    !protectedTags.has(a.releaseTag) &&
    !keepVersions.has(a.type + ':' + a.version) &&
    now - a.releaseDate >= policy.minimumAgeDays * ONE_DAY &&
    SHA_RE.test(String(a.digest || '')) && Number.isInteger(a.id) && a.size > 0
  ).sort((a, b) => a.releaseDate - b.releaseDate);
  // Each calendar month containing a deletion gets one verifiable, full-binary
  // runtime/IPA snapshot, stored in a dedicated GitHub backup Release.
  const monthTypes = new Set(candidates.map(a => a.month + ':' + a.type));
  const backups = [];
  for (const key of monthTypes) {
    const [month, type] = key.split(':');
    const sources = assets.filter(a => a.month === month && a.type === type &&
      SHA_RE.test(String(a.digest || '')) && a.size > 0).sort(sortNewest);
    if (sources[0]) backups.push(sources[0]);
  }
  const backupTypes = new Set(backups.map(a => a.month + ':' + a.type));
  const deletions = candidates.filter(a => backupTypes.has(a.month + ':' + a.type))
    .slice(0, policy.maxDeletesPerRun);
  return { backups, deletions, kept: assets.length - deletions.length,
    potentialBytes: deletions.reduce((sum, a) => sum + a.size, 0),
    protectedTags: [...protectedTags].sort() };
}

function gitReferencedTags() {
  // Only active delivery/configuration source: do not pin every historical doc.
  try {
    const out = execFileSync('git',
      ['grep', '-h', '-o', '-E', 'gmww-(runtime-)?v[0-9]+[.][0-9]+',
        '--', '.github/workflows', '.github/scripts', 'update-system', 'src'],
      { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    return [...new Set(out.match(/gmww-(?:runtime-)?v\d+\.\d+/g) || [])];
  } catch (err) {
    if (err.status === 1) return []; // no references
    throw new Error('Cannot inspect active source references: ' + err.message);
  }
}
function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }).trim();
}
function ghJson(args) { return JSON.parse(gh(args)); }
async function allReleases(repo) {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const batch = ghJson(['api', 'repos/' + repo + '/releases', '-f', 'per_page=100', '-f', 'page=' + page, '--method', 'GET']);
    if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid release list');
    all.push(...batch);
    if (batch.length < 100) return all;
  }
  throw new Error('Release pagination limit reached; refuse pruning');
}
function backupTag(month) { return ARCHIVE_PREFIX + month; }
function getBackupRelease(repo, tag) {
  try { return ghJson(['api', 'repos/' + repo + '/releases/tags/' + tag]); }
  catch (err) {
    if (String(err.stderr || err.message).includes('404')) return null;
    throw err;
  }
}
function sha256(file) {
  const hash = createHash('sha256');
  const data = readFileSync(file);
  hash.update(data);
  return hash.digest('hex');
}
async function downloadVerified(asset, target) {
  if (!asset.browser_download_url?.startsWith('https://github.com/')) throw new Error('Unexpected backup URL');
  const resp = await fetch(asset.browser_download_url, { redirect: 'follow' });
  if (!resp.ok || !resp.body) throw new Error('Source asset download failed: HTTP ' + resp.status);
  await pipeline(resp.body, createWriteStream(target));
  if (statSync(target).size !== asset.size) throw new Error('Source asset size mismatch');
  const calculated = sha256(target);
  if ('sha256:' + calculated !== asset.digest) throw new Error('Source asset SHA-256 mismatch');
}
async function ensureMonthlyBackup(repo, month, snapshots) {
  const tag = backupTag(month);
  let release = getBackupRelease(repo, tag);
  if (!release) {
    gh(['release', 'create', tag, '--repo', repo, '--target', 'main',
      '--title', 'GMWW BACKUP ' + month,
      '--notes', 'Bản sao lưu Runtime/IPA theo tháng. Không chứa dữ liệu người chơi. Giữ để phục hồi thủ công. Không xóa.']);
    release = getBackupRelease(repo, tag);
    if (!release) throw new Error('Cannot verify newly created backup release');
  }
  const temp = mkdtempSync(join(tmpdir(), 'gmww-retention-'));
  try {
    const manifest = [];
    for (const source of snapshots) {
      const name = 'GMWW-Backup-' + source.type + '-' + month + '-V' + source.version +
        (source.type === 'ipa' ? '.ipa' : '.gmwwupdate');
      const existing = (release.assets || []).find(a => a.name === name);
      if (!existing) {
        const path = join(temp, name);
        await downloadVerified(source, path);
        gh(['release', 'upload', tag, path, '--repo', repo]);
        release = getBackupRelease(repo, tag);
      }
      const saved = (release.assets || []).find(a => a.name === name);
      if (!saved || saved.digest !== source.digest || saved.size !== source.size) {
        throw new Error('Backup SHA-256/size is not verified for ' + name);
      }
      manifest.push({ type: source.type, version: source.version,
        assetName: name, sha256: source.digest, size: source.size,
        originalTag: source.releaseTag, originalAssetId: source.id });
    }
    // Immutable dated manifest: preserves the provenance and restore references.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const manifestPath = join(temp, 'backup-manifest-' + stamp + '.json');
    writeFileSync(manifestPath, JSON.stringify({ month, repository: repo,
      createdAt: new Date().toISOString(), files: manifest }, null, 2) + '\n');
    gh(['release', 'upload', tag, manifestPath, '--repo', repo]);
    return manifest;
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
async function main() {
  const execute = process.argv.includes('--execute');
  const repo = process.env.GITHUB_REPOSITORY || 'WilliamPham0702/GMWW-V2.00';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Invalid repository');
  if (execute && process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Deletion is main-only');
  if (execute && process.env.GITHUB_EVENT_NAME === 'pull_request') throw new Error('No PR deletion');
  if (execute && process.env.GMWW_PRUNE_APPROVED !== 'true') throw new Error('Execution gate is disabled');
  const references = gitReferencedTags();
  const before = await allReleases(repo);
  const plan = planRetention(before, { referencedTags: references });
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'preview',
    backups: plan.backups.map(a => ({ version: a.version, type: a.type, month: a.month, tag: a.releaseTag })),
    deletions: plan.deletions.map(a => ({ id: a.id, name: a.name, tag: a.releaseTag, size: a.size })),
    potentialBytes: plan.potentialBytes }, null, 2));
  if (!execute || plan.deletions.length === 0) return;
  for (const month of [...new Set(plan.deletions.map(a => a.month))]) {
    const snapshots = plan.backups.filter(a => a.month === month);
    const required = [...new Set(plan.deletions.filter(a => a.month === month).map(a => a.type))];
    if (!required.every(kind => snapshots.some(s => s.type === kind))) throw new Error('Missing backup type');
    await ensureMonthlyBackup(repo, month, snapshots);
  }
  // Fail closed if any active release changed after the retention plan.
  const current = await allReleases(repo);
  const allowed = new Set(planRetention(current, { referencedTags: references }).deletions.map(a => a.id));
  if (!plan.deletions.every(a => allowed.has(a.id))) {
    throw new Error('Releases changed; re-plan instead of deleting');
  }
  let deletedBytes = 0, deleted = 0;
  for (const item of plan.deletions) {
    const fresh = await allReleases(repo);
    const stillAllowed = planRetention(fresh, { referencedTags: references }).deletions.some(a =>
      a.id === item.id && a.digest === item.digest && a.size === item.size && a.releaseTag === item.releaseTag);
    if (!stillAllowed) throw new Error('Deletion candidate is no longer safe: ' + item.name);
    gh(['api', '--method', 'DELETE', 'repos/' + repo + '/releases/assets/' + item.id]);
    deletedBytes += item.size;
    deleted++;
    console.log('Removed stale asset ' + item.releaseTag + '/' + item.name);
  }
  console.log('Pruned ' + deleted + ' historical binaries; bytes=' + deletedBytes +
    '. Original release metadata, release notes, tags, active assets, and player data are retained.');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
