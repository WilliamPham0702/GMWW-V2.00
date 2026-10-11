// Show update notes only for releases newer than an installed GM Runtime.
// The immutable release manifest still retains full history for old clients.
// This helper only narrows the HTTP response when ?current= is provided.
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
 if (compareGmwwUpdateVersions(latest, installed) <= 0) return [];
 return notes.filter(note => {
  if (typeof note !== 'string') return false;
  const match = note.match(notePattern);
  if (!match) return false; // Cannot prove an unversioned note is a new change.
  return compareGmwwUpdateVersions(match[1], installed) > 0 &&
   compareGmwwUpdateVersions(match[1], latest) <= 0;
 }).map(note => note.trim());
}

export function gmwwManifestNotesForInstalled(manifest, installed) {
 if (!manifest || typeof manifest !== 'object' || !Array.isArray(manifest.releaseNotes)) return manifest;
 const latest = String(manifest.releaseVersion || manifest.runtimeVersion || '');
 if (compareGmwwUpdateVersions(latest, installed) === null) return manifest; // No verified current version.
 return { ...manifest, releaseNotes: gmwwReleaseNotesBetween(manifest.releaseNotes, installed, latest) };
}
