import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {
 GMWW_SHARED_AUDIO_DEFAULT,pinnedAudioReleaseTag,sharedAudioBase,
 validateSharedAudioManifest,fetchSharedAudioManifest,
 audioHashForTarget,sharedClipForCue,fetchVerifiedSharedAudio
} from '../src/worker/support/shared-release-audio.js';

const tag='gmww-audio-v1',target='cards:role_guard';
const bytes=Buffer.from('49443304000000000000415544494f2d544553542d5041594c4f4144','hex');
const sha256=createHash('sha256').update(bytes).digest('hex');
const clip={sha256,mime:'audio/mpeg',size:bytes.length,file:sha256+'.mp3',url:sharedAudioBase(tag)+sha256+'.mp3'};
const manifest={format:'gmww-shared-audio-v1',version:1,releaseTag:tag,clips:{[target]:clip}};

test('one Ván Mẫu retains a pinned audio version, no binary in room',()=>{
 assert.equal(GMWW_SHARED_AUDIO_DEFAULT,tag);
 assert.equal(pinnedAudioReleaseTag('gmww-audio-v12'),'gmww-audio-v12');
 for(const invalid of ['https://evil.invalid/','../latest','gmww-audio-v0','gmww-audio-v99999','main',''])assert.equal(pinnedAudioReleaseTag(invalid),'');
 const templates=fs.readFileSync('src/worker/room/game-templates.js','utf8');
 const rooms=fs.readFileSync('src/worker/room/player-rooms.js','utf8');
 assert.match(templates,/audioReleaseTag:pinnedAudioReleaseTag/);
 assert.match(rooms,/current\.quickPlayAudioReleaseTag=pinnedAudioReleaseTag/);
 assert.doesNotMatch(rooms,/annBlob:/);
});
test('manifest requires exact GitHub release, content hash, media and all URLs',()=>{
 const normalized=validateSharedAudioManifest(manifest,tag);
 assert.ok(normalized);assert.equal(normalized.clips[target].sha256,sha256);
 assert.equal(audioHashForTarget(normalized,target),sha256.slice(0,32));
 assert.equal(sharedClipForCue(normalized,[target],sha256.slice(0,32)).sha256,sha256);
 assert.equal(sharedClipForCue(normalized,['cards:role_snow_wolf'],sha256.slice(0,32)),null);
 for(const corrupt of [
  {...manifest,releaseTag:'gmww-audio-v2'},
  {...manifest,clips:{[target]:{...clip,url:'https://evil.invalid/audio.mp3'}}},
  {...manifest,clips:{[target]:{...clip,mime:'text/html'}}},
  {...manifest,clips:{[target]:{...clip,sha256:'0'.repeat(64)}}},
  {...manifest,clips:{'cards:../secret':clip}}
 ])assert.equal(validateSharedAudioManifest(corrupt,tag),null);
});
test('load manifest only from pinned GitHub host and never from template URL',async()=>{
 const hit=[];
 const fetcher=async url=>{hit.push(url);return new Response(JSON.stringify(manifest),{headers:{'content-type':'application/json'}})};
 const result=await fetchSharedAudioManifest(tag,fetcher);
 assert.ok(result);assert.deepEqual(hit,[sharedAudioBase(tag)+'manifest.json']);
 assert.equal(await fetchSharedAudioManifest('../bad',fetcher),null);assert.equal(hit.length,1);
 assert.equal(await fetchSharedAudioManifest(tag,async()=>new Response('',{status:404})),null);
});
test('MP3 must pass SHA-256 and byte-size check before the Player receives audio',async()=>{
 const observed=[];
 const fetcher=async url=>{observed.push(url);return new Response(bytes,{headers:{'content-type':'audio/mpeg'}})};
 const res=await fetchVerifiedSharedAudio(tag,clip,fetcher);
 assert.equal(res.status,200);assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);
 assert.deepEqual(observed,[clip.url]);
 assert.equal((await fetchVerifiedSharedAudio(tag,clip,async()=>new Response(Buffer.from('spoofed')))).status,404);
 assert.equal((await fetchVerifiedSharedAudio(tag,{...clip,size:clip.size+1},fetcher)).status,404);
 assert.equal((await fetchVerifiedSharedAudio(tag,{...clip,file:'https://evil.invalid'},fetcher)).status,404);
 assert.equal((await fetchVerifiedSharedAudio('../bad',clip,fetcher)).status,404);
});
test('Player announcements keep existing authenticated and live-cue gate',()=>{
 const src=fs.readFileSync('src/worker/room/announcements.js','utf8');
 const player=fs.readFileSync('src/player-web-src/35-online-chat/10-announcement-audio.part','utf8');
 assert.match(src,/if\(!meta\|\|meta\.enabled===false\|\|!players\['member:'/);
 assert.match(src,/if\(!cue\?\.audio\?\.some\(u=>u\.endsWith\('\?a='\+hash\)\)\)/);
 assert.match(src,/sharedClipForCue\(manifest,\(await this\.currentAnnouncement\(meta\)\)\?\.targets,hash\)/);
 assert.match(src,/await this\.sharedReleaseManifest\(meta\)/);
 assert.match(src,/dayCountdownDue\(meta\)/);
 assert.match(player,/gmwwAnnouncementUrls\(pending\)/);
 assert.match(player,/\^\[a-f0-9\]\{32\}\$/);
});
