#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const productionOrigin = 'https://gmww-v2-00.williampham0702.workers.dev';
const runtimeSourcePatterns = [
  /^server-game\/current\//,
  /^server-game\/shared\//,
  /^assets\/backgrounds\//,
  /^assets\/characters\//,
  /^assets\/village\//,
  /^update-system\//,
  /^\.github\/scripts\/prepare-update-channel\.mjs$/
];

export function compareReleaseVersions(a, b) {
  const parse = value => {
    const match = String(value ?? '').trim().replace(/^V/i, '').match(/^(\d+\.\d+(?:\.\d+)?)$/);
    return match ? match[1].split('.').map(Number) : null;
  };
  const left = parse(a), right = parse(b);
  if (!left || !right) return null;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff) return diff < 0 ? -1 : 1;
  }
  return 0;
}

export function verifyOtaVersionAdvance(candidate, deployed, changedFiles = []) {
  if (!candidate || !deployed ||
      compareReleaseVersions(candidate.releaseVersion, candidate.releaseVersion) === null ||
      compareReleaseVersions(deployed.releaseVersion, deployed.releaseVersion) === null) {
    throw new Error('Candidate or Production manifest has an invalid releaseVersion.');
  }

  const changed = (Array.isArray(changedFiles) ? changedFiles : [])
    .map(path => String(path || '').trim()).filter(Boolean);
  const runtimeChanged = changed.some(path => runtimeSourcePatterns.some(pattern => pattern.test(path)));

  if (runtimeChanged) {
    const advance = compareReleaseVersions(candidate.releaseVersion, deployed.releaseVersion);
    // A live Worker health fallback is NOT proof that the OTA manifest or its
    // immutable assets were published. Permit a same-version repair deployment
    // only when the production manifest is unavailable and the health endpoint
    // verifies the exact candidate Runtime version. All other checks remain.
    const sameVersionManifestRepair =
      advance === 0 &&
      deployed.source === 'verified-live-health-fallback' &&
      candidate.releaseType === 'runtime' &&
      String(candidate.runtimeVersion || '') === String(candidate.releaseVersion || '');
    if ((advance === null || advance <= 0) && !sameVersionManifestRepair) {
      throw new Error(
        'Runtime source changed but candidate releaseVersion ' + candidate.releaseVersion +
        ' does not advance beyond Production ' + deployed.releaseVersion +
        '. Increase the Runtime version before publishing OTA.'
      );
    }
  }

  if (candidate.releaseType === 'runtime') {
    if (String(candidate.runtimeVersion || '') !== String(candidate.releaseVersion || '') ||
        String(candidate.shellVersion || '') === String(candidate.releaseVersion || '')) {
      throw new Error('Runtime manifest release/runtime/shell versions are inconsistent.');
    }
    const files = candidate.runtime?.files;
    if (!Array.isArray(files) || files.length === 0) throw new Error('Runtime manifest has no files.');
    const paths = new Set();
    for (const file of files) {
      const path = String(file?.path || '');
      if (!path || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..')) {
        throw new Error('Unsafe Runtime manifest path: ' + path);
      }
      if (paths.has(path)) throw new Error('Duplicate Runtime manifest path: ' + path);
      paths.add(path);
      if (!/^[a-f0-9]{64}$/i.test(String(file?.sha256 || ''))) {
        throw new Error('Missing or invalid SHA-256 for Runtime asset: ' + path);
      }
      const expectedPath = '/updates/runtime/V' + candidate.releaseVersion + '/' +
        path.split('/').map(encodeURIComponent).join('/');
      let actual;
      try { actual = new URL(String(file?.url || '')); } catch { throw new Error('Invalid Runtime URL: ' + path); }
      if (actual.protocol !== 'https:' || actual.origin !== productionOrigin || actual.pathname !== expectedPath) {
        throw new Error('Runtime asset URL does not match release path: ' + path);
      }
    }
    for (const required of ['GMWW.html', 'app.js', 'style.css', 'character-renderer.js', 'character-renderer.css']) {
      if (!paths.has(required)) throw new Error('Runtime manifest missing required file: ' + required);
    }
  }
  return {runtimeChanged, candidateVersion:String(candidate.releaseVersion), deployedVersion:String(deployed.releaseVersion)};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [candidatePath, deployedPath, changedPath] = process.argv.slice(2);
  if (!candidatePath || !deployedPath || !changedPath) {
    throw new Error('Usage: verify-ota-version-advance.mjs <candidate-manifest> <production-manifest> <changed-files>');
  }
  const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
  const changed = fs.readFileSync(changedPath, 'utf8').split(/\r?\n/);
  const result = verifyOtaVersionAdvance(candidate, deployed, changed);
  console.log('OTA version advance guard PASS', JSON.stringify(result));
}
