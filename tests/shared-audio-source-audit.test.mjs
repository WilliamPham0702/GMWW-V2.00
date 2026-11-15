import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const record=JSON.parse(readFileSync('docs/releases/gmww-audio-source-audit-20261115.json','utf8'));
test('fixed approved audio input evidence uses exact ZIP digest reported by GitHub',()=>{
 assert.equal(record.sourceReleaseId,445512358);
 assert.equal(record.assetId,749540150);
 assert.equal(record.zipName,'gmww-audio-v1-verified.zip');
 assert.equal(record.zipSize,5244418);
 assert.equal(record.zipSha256,'4e95cdc06f35f540cbb5eba299b7cb326092e89888a93c43e59ba07bf495cfe2');
 assert.equal(record.manifestSha256,'df8e1cce93d399752a49cbfa1599ed568d492c80b99ea18163084e7e7be75f89');
 assert.equal(record.checksumsSha256,'9b6a572ca4fad004f09a18fa6b8aade3c38c756992e0d2004fcca91c2a7c07c8');
 assert.equal(record.mp3Files,74);
 assert.equal(record.manifestTargets,133);
 assert.equal(record.missingRows,141);
 assert.equal(record.mp3ChecksumMismatches,0);
 assert.equal(record.ffprobeRecognized,74);
});
