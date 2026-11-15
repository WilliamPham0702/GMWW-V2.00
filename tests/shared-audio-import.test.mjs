import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validPath,looksMp3,inferredTarget,prepareCatalog,validateCatalog,BASE,TAG,MAX_CLIP} from '../.github/scripts/audio-catalog-core.mjs';
const audio=Buffer.from('49443304000000000000010203','hex');
const other=Buffer.from('49443304000000000000010204','hex');
const sha=createHash('sha256').update(audio).digest('hex');
const mapped=new Map([['audio-map.json',Buffer.from(JSON.stringify({clips:{
  'cards:role_snow_wolf':'wolf.mp3','system:audio_system_countdown':'wolf.mp3'
}}))],['wolf.mp3',audio]]);
test('first release adds mapped targets and deduplicates content-hashed MP3 assets',()=>{
  const out=prepareCatalog(mapped);
  assert.equal(out.added,2);assert.equal(out.newFiles.size,1);
  assert.equal(out.revision,1);
  assert.equal(out.manifest.clips['cards:role_snow_wolf'].file,sha+'.mp3');
  assert.equal(out.manifest.clips['system:audio_system_countdown'].url,BASE+sha+'.mp3');
  validateCatalog(out.manifest);
});
test('later import appends new cue and keeps prior audio pinned',()=>{
  const prev=prepareCatalog(mapped).manifest;
  const next=prepareCatalog(new Map([['actions__role_witch.mp3',other]]),prev);
  assert.equal(next.revision,2);assert.equal(next.added,1);
  assert.deepEqual(next.manifest.clips['cards:role_snow_wolf'],prev.clips['cards:role_snow_wolf']);
  assert.equal(Object.keys(next.manifest.clips).length,3);
});
test('existing target cannot be replaced and duplicate import fails closed',()=>{
  const prev=prepareCatalog(mapped).manifest;
  assert.throws(()=>prepareCatalog(new Map([['cards__role_snow_wolf.mp3',other]]),prev),/EXISTING_TARGET_IMMUTABLE/);
  assert.throws(()=>prepareCatalog(mapped,prev),/NO_NEW_TARGETS/);
});
test('input integrity and audio magic bytes are enforced',()=>{
  assert.equal(looksMp3(audio),true);assert.equal(looksMp3(Buffer.from('random')),false);
  assert.equal(inferredTarget('actions__role_witch.mp3'),'actions:role_witch');
  assert.equal(inferredTarget('hello.mp3'),null);
  assert.throws(()=>prepareCatalog(new Map([['hi.mp3',audio]])),/EXPLICIT_MAPPING_REQUIRED/);
  assert.throws(()=>prepareCatalog(new Map([['cards__wolf.mp3',Buffer.from('garbage')]])),/INVALID_MP3/);
  assert.throws(()=>prepareCatalog(new Map([['cards__wolf.mp3',Buffer.alloc(MAX_CLIP+1,1)]])),/CLIP_TOO_LARGE/);
  assert.throws(()=>prepareCatalog(new Map([
    ['audio-map.json',Buffer.from(JSON.stringify({clips:{'cards:role_snow_wolf':{file:'wolf.mp3',sha256:'f'.repeat(64)}}}))],
    ['wolf.mp3',audio]
  ])),/SOURCE_SHA_MISMATCH/);
});
test('zip traversal, malicious names, URLs, MIME and hashes are rejected',()=>{
  for(const p of ['../../etc/passwd','/root/audio.mp3','audio/../evil.mp3','audio\\evil.mp3','audio/*.mp3'])
    assert.equal(validPath(p),false);
  const prev=prepareCatalog(mapped).manifest;
  assert.throws(()=>validateCatalog({...prev,clips:{'cards:evil':{...prev.clips['cards:role_snow_wolf'],url:'https://evil.invalid/audio.mp3'}}}),/INVALID_CLIP/);
  assert.throws(()=>validateCatalog({...prev,releaseTag:'gmww-audio-v2'}),/INVALID_CATALOG/);
});
test('manual write gate and no Production/Runtime deploy',()=>{
  const source=readFileSync('.github/scripts/import-shared-audio.mjs','utf8');
  const workflow=readFileSync('.github/workflows/gmww-shared-audio-import.yml','utf8');
  assert.match(source,/SOURCE_RELEASE_HAS_ZERO_ASSETS/);
  assert.match(source,/AUDIO_PUBLISH_APPROVED/);
  assert.match(source,/PUBLISH_REQUIRES_MAIN/);
  assert.match(source,/MANIFEST_RESTORE_FAILED/);
  assert.match(source,/SOURCE_MUST_BE_AUDIO_IMPORT_DRAFT/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow,/if: inputs\.action == 'validate'/);
  assert.doesNotMatch(workflow,/wrangler deploy|cloudflare deploy|deploy-production/);
  assert.equal(TAG,'gmww-audio-v1');
});

test('checksum supplement validates the actual ZIP report naming contract',()=>{
 const src=readFileSync('.github/scripts/audio-catalog-core.mjs','utf8');
 assert.match(src,/checksums\.sha256/);
 assert.match(src,/SOURCE_CHECKSUM_MISMATCH/);
 assert.match(src,/missing-audio\.csv/);
 const bad=new Map(mapped);
 bad.set('checksums.sha256',Buffer.from('f'.repeat(64)+'  wolf.mp3\n'));
 assert.throws(()=>prepareCatalog(bad),/SOURCE_CHECKSUM_MISMATCH/);
 const good=new Map(mapped);
 good.set('checksums.sha256',Buffer.from(sha+'  wolf.mp3\n'));
 assert.doesNotThrow(()=>prepareCatalog(good));
});
