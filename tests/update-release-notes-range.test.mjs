import test from 'node:test';
import assert from 'node:assert/strict';
import {
 compareGmwwUpdateVersions, gmwwReleaseNotesBetween, gmwwManifestNotesForInstalled
} from '../src/gmww-update-release-notes.js';

const notes = [
 'V3.87: Chỉnh thông báo.',
 'V3.86: Thêm ô nhập yêu cầu trong Báo lỗi tự động.',
 'V3.85: Bỏ AI Support nổi.',
 'V3.84: Nạp Artwork Artifact Biển.',
 'V3.82: Thêm công cụ AI Support.',
 'V3.81: Đèn Online/Offline.'
];

test('compare versions numerically rather than lexicographically', () => {
 assert.equal(compareGmwwUpdateVersions('3.9', '3.86'), -1);
 assert.equal(compareGmwwUpdateVersions('V3.86.0', '3.86'), 0);
 assert.equal(compareGmwwUpdateVersions('3.86', '3.85'), 1);
 assert.equal(compareGmwwUpdateVersions('garbage', '3.86'), null);
});

test('iPhone GM 3.85 to 3.86 shows ONLY the V3.86 change', () => {
 const filtered = gmwwManifestNotesForInstalled({
  releaseVersion: '3.86', releaseType: 'runtime', releaseNotes: notes
 }, '3.85');
 assert.deepEqual(filtered.releaseNotes, [notes[1]]);
});

test('older GM 3.83 to 3.86 sees V3.84, V3.85 and V3.86 (not V3.82)', () => {
 assert.deepEqual(gmwwReleaseNotesBetween(notes, '3.83', '3.86'), notes.slice(1, 4));
});

test('installed release notes persist until another release, even if already installed', () => {
 assert.deepEqual(gmwwReleaseNotesBetween(notes, '3.86', '3.86'), [notes[1]]);
 assert.deepEqual(gmwwReleaseNotesBetween(notes, '3.87', '3.86'), [notes[1]]);
});

test('unversioned or future notes never appear in the upgrade summary', () => {
 const mixed=['V3.86: Tính năng mới.', 'Thông tin lịch sử không có phiên bản', 'V3.101: Bản tương lai', 'V3.85: Cũ', 'V3.86.0：Sửa giao diện'];
 assert.deepEqual(gmwwReleaseNotesBetween(mixed, '3.85', '3.86'), [mixed[0], mixed[4]]);
});

test('unverified installed version retains original manifest (no destructive transformation)', () => {
 const manifest={releaseVersion:'3.86',releaseNotes:notes};
 assert.equal(gmwwManifestNotesForInstalled(manifest, 'unknown'), manifest);
 assert.deepEqual(manifest.releaseNotes, notes);
});

test('does not touch role/artifact/OTA asset data', () => {
 const manifest = {releaseVersion:'3.86', releaseNotes:notes,
  runtime:{files:[{path:'app.js',sha256:'somehash'}]}, delete:[], roleCount:63, artifactCount:44};
 const filtered=gmwwManifestNotesForInstalled(manifest,'3.85');
 assert.equal(filtered.runtime, manifest.runtime);
 assert.equal(filtered.delete,manifest.delete);
 assert.equal(filtered.roleCount,63);
 assert.equal(filtered.artifactCount,44);
});

test('release note filter remains connected to /api/update/manifest route', async () => {
 const fs=await import('node:fs/promises');
 const s=await fs.readFile(new URL('../src/index.js',import.meta.url),'utf8');
 const start=s.indexOf('if(url.pathname==="/api/update/manifest"');
 const end=s.indexOf('if((url.pathname==="/favicon.svg"',start);
 assert.ok(start>0 && end>start);
 const section=s.slice(start,end);
 assert.match(section,/onlyNewNotes=m=>gmwwManifestNotesForInstalled\(m,url\.searchParams\.get\("current"\)\)/);
 assert.match(section,/const versioned=onlyNewNotes\(await readVersionedManifest\(\)\)/);
 assert.match(section,/const manifest=onlyNewNotes\(await res\.json\(\)\)/);
 assert.match(section,/recoverOlderInstalledRuntime=async\(\)=>onlyNewNotes\(/);
 // Keep the existing OTA response and readiness gates untouched.
 assert.match(section,/if\(validRuntime\(versioned\)&&await runtimeReady\(versioned\)\)return j\(\{ok:true/);
});
