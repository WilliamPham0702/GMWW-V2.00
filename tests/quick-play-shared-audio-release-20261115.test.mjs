import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gmSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import {GMWW_SHARED_AUDIO_TAG,GMWW_SHARED_AUDIO_BASE,verifiedSharedAudioCatalog,
  sharedAudioTargetsForCue,readSharedAudioClip} from '../src/worker/support/shared-audio-release.js';
const bytes=Buffer.from('494433030000000000004D41534F49','hex'),sha=createHash('sha256').update(bytes).digest('hex');
const target='cards:role_snow_wolf',filename=sha+'.mp3';
const clip={sha256:sha,mime:'audio/mpeg',size:bytes.length,file:filename,url:GMWW_SHARED_AUDIO_BASE+filename};
const doc={format:'gmww-shared-audio-v1',version:1,releaseTag:GMWW_SHARED_AUDIO_TAG,clips:{[target]:clip,'system:audio_system_countdown':clip}};
const meta={quickPlay:true,quickPlayAudioReleaseTag:GMWW_SHARED_AUDIO_TAG};
test('manifest validates exact pinned GitHub origin, filenames and full SHA-256',()=>{
 const x=verifiedSharedAudioCatalog(doc);
 assert.equal(x.clips[target].sha256,sha);
 for(const c of [
  {...doc,releaseTag:'gmww-audio-v2'},
  {...doc,clips:{[target]:{...clip,url:'https://example.com/evil.mp3'}}},
  {...doc,clips:{[target]:{...clip,sha256:'0'.repeat(64)}}},
  {...doc,clips:{[target]:{...clip,size:5*1024*1024}}},
  {...doc,clips:{'../admin':clip}}
 ])assert.equal(verifiedSharedAudioCatalog(c),null);
});
test('shared audio only applies to a Quick Play room with pinned template release',()=>{
 const catalog=verifiedSharedAudioCatalog(doc);
 assert.equal(sharedAudioTargetsForCue(meta,[target],catalog).length,1);
 assert.equal(sharedAudioTargetsForCue({...meta,quickPlay:false},[target],catalog).length,0);
 assert.equal(sharedAudioTargetsForCue({...meta,quickPlayAudioReleaseTag:'../evil'},[target],catalog).length,0);
 assert.equal(sharedAudioTargetsForCue(meta,['cards:role_guard'],catalog).length,0);
});
test('downloaded MP3 bytes are re-hashed and streamed only for current turn target',async()=>{
 const catalog=verifiedSharedAudioCatalog(doc),fetcher=async url=>{
  assert.equal(url,clip.url);return new Response(bytes,{headers:{'content-type':'audio/mpeg'}});
 };
 const ok=await readSharedAudioClip(meta,[target],sha,fetcher,catalog);
 assert.equal(ok.status,200);assert.equal(ok.headers.get('content-type'),'audio/mpeg');
 assert.deepEqual(Buffer.from(await ok.arrayBuffer()),bytes);
 const blocked=await readSharedAudioClip(meta,['cards:role_guard'],sha,fetcher,catalog);
 assert.equal(blocked.status,404);
 const wrong=await readSharedAudioClip(meta,[target],'0'.repeat(64),fetcher,catalog);
 assert.equal(wrong.status,404);
 const altered=await readSharedAudioClip(meta,[target],sha,async()=>new Response(Buffer.from('49443303000000000000544f4b454e','hex')),catalog);
 assert.equal(altered.status,503);
});
test('existing room-uploaded audio and privacy admission retain precedence',()=>{
 const ann=readFileSync('src/worker/room/announcements.js','utf8');
 assert.match(ann,/if\(lib\[target\]\)return \[/);
 assert.match(ann,/if\(!cue\?\.audio\?\.some\(u=>u\.endsWith\('\?a='\+hash\)\)\)return new Response\(null,\{status:404\}\)/);
 assert.match(ann,/readSharedAudioClip\(meta,live\?\.targets\|\|\[\],hash\.slice\(1\)\)/);
 assert.match(ann,/sharedAudioTargetsForCue\(meta,\['system:audio_system_countdown'\],shared\)/);
 const worker=workerSource();
 assert.match(worker,/members\/session/);
 assert.match(ann,/readSharedAudioClip/);
});
test('template metadata pinned and existing game rules unchanged',()=>{
 const tpl=readFileSync('src/worker/room/game-templates.js','utf8');
 const room=readFileSync('src/worker/room/player-rooms.js','utf8');
 assert.match(tpl,/audioReleaseTag:"gmww-audio-v1"/);
 assert.match(room,/current\.quickPlayAudioReleaseTag=selectedAudioTag==="gmww-audio-v1"/);
 assert.match(room,/await this\.applyCycle\(fresh,"night",1,"night-1","auto"\)/);
 assert.match(room,/computeWinProposal/);
 assert.match(room,/ownerQuickStart/);
});

test('Quick Play daytime system cue resolves published audio while old rooms still require uploads',()=>{
 const ann=readFileSync('src/worker/room/announcements.js','utf8');
 assert.match(ann,/if\(!targets\.some\(t=>lib\[t\]\)\)\{/);
 assert.match(ann,/const shared=meta\?\.quickPlay===true\?await getSharedAudioCatalog\(\):null;/);
 assert.match(ann,/if\(!sharedAudioTargetsForCue\(meta,targets,shared\)\.length\)return j\(\{ok:false,error:'DAY_AUDIO_NOT_UPLOADED'\},409\)/);
 assert.equal(sharedAudioTargetsForCue({...meta,quickPlay:false},['system:audio_system_countdown'],verifiedSharedAudioCatalog(doc)).length,0);
});
