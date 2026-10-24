#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {isV562IsolatedPreviewAsset} from './character-v562-preview-isolation.mjs';

const productionOrigin = 'https://gmww-v2-00.williampham0702.workers.dev';
const runtimeSourcePatterns = [
  /^server-game\/current\//,
  /^server-game\/shared\//,
  /^server-game\/src\//,
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
    .map(path => String(path || '').trim()).filter(path=>path && !isV562IsolatedPreviewAsset(path));
  // Compare published SHA-256 inventories, not only filenames of the final merge.
  // Several merged PRs may contribute changed Runtime bytes to a single deploy.
  const immutableInventory = manifest => {
    const files = manifest?.runtime?.files;
    if(manifest?.releaseType !== 'runtime' || !Array.isArray(files) || files.length === 0)return null;
    const hashes = new Map();
    for(const file of files){
      if(typeof file?.path !== 'string' || !file.path ||
         !/^[a-f0-9]{64}$/i.test(String(file.sha256||'')) || hashes.has(file.path))return null;
      hashes.set(file.path, file.sha256.toLowerCase());
    }
    return JSON.stringify([...hashes.entries()].sort(([a],[b]) => a.localeCompare(b)));
  };
  const candidateInventory = immutableInventory(candidate);
  const liveInventory = immutableInventory(deployed);
  const cumulativeRuntimeChanged = candidateInventory !== null && liveInventory !== null && candidateInventory !== liveInventory;
  const runtimeChanged = cumulativeRuntimeChanged ||
    changed.some(path => runtimeSourcePatterns.some(pattern => pattern.test(path)));

  if (runtimeChanged) {
    const advance = compareReleaseVersions(candidate.releaseVersion, deployed.releaseVersion);
    // Live health proves Worker identity/version, NOT the integrity of published OTA assets.
    // Never allow a changed candidate at the same releaseVersion on that basis.
    // Only a complete and byte-identical production inventory can be re-published.
    // Release tooling may change Worker metadata without changing any OTA bytes.
    // A healthy manifest with an identical complete file inventory proves that
    // no installed Runtime needs a new version. Actual runtime inputs still bump.
    // A Worker Build may have published these exact immutable bytes before
    // the main-branch deployment workflow starts. Re-deploying byte-identical
    // verified assets is safe; a changed inventory at the same version is not.
    const inventory=m=>{
      const files=m?.runtime?.files;
      if(m?.releaseType!=='runtime'||!Array.isArray(files)||!files.length||(m.delete||[]).length)return null;
      const seen=new Set();
      for(const file of files){
        if(typeof file.path!=='string'||seen.has(file.path)||!/^[a-f0-9]{64}$/.test(file.sha256)||
          file.url!==productionOrigin+'/updates/runtime/V'+m.releaseVersion+'/'+file.path.split('/').map(encodeURIComponent).join('/'))return null;
        seen.add(file.path);
      }
      if(!['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'].every(path=>seen.has(path)))return null;
      return JSON.stringify(files.map(f=>[f.path,f.sha256]).sort((a,b)=>a[0].localeCompare(b[0])));
    };
    const before=inventory(deployed),after=inventory(candidate);
    const identicalPublishedPackage=advance===0&&before!==null&&before===after&&
      candidate.releaseType===deployed.releaseType&&
      candidate.shellVersion===deployed.shellVersion&&
      candidate.minimumShellVersion===deployed.minimumShellVersion&&
      candidate.runtimeVersion===deployed.runtimeVersion;
    if ((advance === null || advance <= 0) && !identicalPublishedPackage) {
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
