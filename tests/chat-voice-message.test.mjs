import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VOICE_LIMITS,voiceMime,decodeVoiceMessage,voiceClipMeta,nextVoiceIndex} from '../src/gmww-chat-voice-policy.js';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

const source=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const worker=readFileSync('src/index.js','utf8');
const ogg=Buffer.from('OggS'+String.fromCharCode(0,2,0,0,0,0,0,0,0,0,0,0),'binary').toString('base64');
const webm=Buffer.from([0x1a,0x45,0xdf,0xa3,0x42,0x82,0x84,0x77,0x65,0x62,0x6d]).toString('base64');
const mp4=Buffer.from([0,0,0,20,0x66,0x74,0x79,0x70,0x4d,0x34,0x41,0x20]).toString('base64');

test('voice-note MIME allowlist handles Safari MP4 and browsers with Opus',()=>{
 assert.equal(voiceMime('audio/mp4'),'audio/mp4');
 assert.equal(voiceMime('audio/webm; codecs=opus'),'audio/webm');
 assert.equal(voiceMime('audio/ogg;codecs=opus'),'audio/ogg');
 for(const x of ['audio/wav','application/json','text/html','video/mp4',''])assert.equal(voiceMime(x),'');
});
test('voice-note payload validates compressed signature, length, duration and type',()=>{
 for(const [mime,data] of [['audio/mp4',mp4],['audio/webm',webm],['audio/ogg',ogg]]){
  const x=decodeVoiceMessage({mime,durationMs:1500,data});
  assert.equal(x.mime,voiceMime(mime));assert.equal(x.bytes.length,Buffer.from(data,'base64').length);
 }
 for(const bad of [
  {mime:'audio/mp4',durationMs:1500,data:ogg},
  {mime:'audio/ogg',durationMs:VOICE_LIMITS.durationMs+1,data:ogg},
  {mime:'audio/ogg',durationMs:0,data:ogg},
  {mime:'audio/wav',durationMs:1500,data:ogg},
  {mime:'audio/ogg',durationMs:1500,data:'@@@'},
  {mime:'audio/ogg',durationMs:1500,data:'A'.repeat(VOICE_LIMITS.bytes*2)}
 ]) assert.equal(decodeVoiceMessage(bad),null);
});
test('global room clip index is strictly bounded; expired and oldest entries evicted',()=>{
 const now=100000,index=Array.from({length:VOICE_LIMITS.clipsPerRoom},(_,i)=>({key:'voice'+i,expiresAt:now+100000}));
 const next=nextVoiceIndex(index,{key:'new',expiresAt:now+100000},now);
 assert.equal(next.keep.length,VOICE_LIMITS.clipsPerRoom);
 assert.deepEqual(next.remove,['voice0']);
 const old=nextVoiceIndex([{key:'expired',expiresAt:now-1}],{key:'new',expiresAt:now+1000},now);
 assert.deepEqual(old.remove,['expired']);
 assert.equal(voiceClipMeta({voice:{id:'id',expiresAt:now+1}},now).id,'id');
 assert.equal(voiceClipMeta({voice:{id:'id',expiresAt:now}},now),null);
});
test('Server rechecks authenticated room and current chat rights for send and listen',()=>{
 assert.match(worker,/playerRoomVoiceApi\(env,playerVoiceSend\[1\],request,"send"\)/);
 assert.match(worker,/playerRoomVoiceApi\(env,playerVoiceRead\[1\],request,"get"/);
 assert.match(worker,/members\/session/);
 assert.match(worker,/this\.chatAccess\(loginId,body\?\.channel\)/);
 assert.match(worker,/if\(!permission\.canSend\)/);
 assert.match(worker,/if\(!permission\.canRead\)/);
 assert.match(worker,/rows\.find\(x=>x\.id===id\)/);
 assert.match(worker,/onlineVoiceIndex/);
 assert.match(worker,/this\.broadcast\(\{type:"chat_tick",serverTime:now\}\)/);
 assert.doesNotMatch(worker,/type:"voice_[^"]*"/);
});
test('Player uses native recorder; never puts binary in room_state or public WebSocket',()=>{
 assert.match(source,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(source,/new MediaRecorder\(stream/);
 assert.match(source,/audio\/mp4/);
 assert.match(source,/setTimeout\(\(\)=>\{if\(gmwwVoiceRecording===active/);
 assert.match(source,/gmwwVoiceAbort\(\)/);
 assert.match(source,/\/chat\/voice'/);
 assert.match(source,/gmwwVoicePlay\(item,play/);
 assert.match(source,/fetch\(url,\{headers:auth\(\),cache:'no-store'\}\)/);
 assert.ok(gmwwMembersLiveScript.includes(source),'served Player bundle must include exact updated source');
});
