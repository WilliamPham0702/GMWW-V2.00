// Keep the installed release notes visible until a newer version replaces them.
// Older installations still receive the relevant intervening release notes.
const versionPattern = /^V?(\d+\.\d+(?:\.\d+)?)$/i;
const notePattern = /^\s*V?(\d+\.\d+(?:\.\d+)?)\s*[:：\-–—]\s*\S/i;

export function compareGmwwUpdateVersions(a, b) {
 const left = String(a ?? '').trim().match(versionPattern);
 const right = String(b ?? '').trim().match(versionPattern);
 if (!left || !right) return null;
 const partsA = left[1].split('.').map(Number), partsB = right[1].split('.').map(Number);
 for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
  const diff = (partsA[i] || 0) - (partsB[i] || 0);
  if (diff) return diff < 0 ? -1 : 1;
 }
 return 0;
}

export function gmwwReleaseNotesBetween(notes, installed, latest) {
 if (!Array.isArray(notes) || compareGmwwUpdateVersions(latest, installed) === null) return [];
 const comparison = compareGmwwUpdateVersions(latest, installed);
 return notes.filter(note => {
  if (typeof note !== 'string') return false;
  const match = note.match(notePattern);
  if (!match) return false; // Cannot prove an unversioned note is a new change.
  return compareGmwwUpdateVersions(match[1], latest) <= 0 &&
    (comparison > 0 ? compareGmwwUpdateVersions(match[1], installed) > 0 : compareGmwwUpdateVersions(match[1], latest) === 0);
 }).map(note => note.trim());
}

export function gmwwManifestNotesForInstalled(manifest, installed) {
 if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.releaseNotes)) return manifest;
 const latest = String(manifest.releaseVersion || manifest.runtimeVersion || '');
 if (compareGmwwUpdateVersions(latest, installed) === null) return manifest; // No verified current version.
 return { ...manifest, releaseNotes: gmwwReleaseNotesBetween(manifest.releaseNotes, installed, latest) };
}
