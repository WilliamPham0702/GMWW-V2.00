import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const gm=fs.readFileSync('server-game/src/45-online-chat.part','utf8');
const player=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8');
const worker=workerSource();

test('GM and Player use real microphone samples, not decorative bars, without speaker feedback',()=>{
 for(const [s,p,visual] of [[gm,'gmwwGMVoiceMeter','gmwwGMRecording'],[player,'gmwwChatVoiceMeter','gmwwChatRecording']]){
   assert.match(s,new RegExp('function '+p+'Start\\(stream\\)'));
   assert.match(s,new RegExp('function '+p+'Stop\\(\\)'));
   assert.match(s,/createMediaStreamSource\(stream\)/);
   assert.match(s,/createAnalyser\(\)/);
   assert.match(s,/getByteTimeDomainData\(signal\)/);
   assert.match(s,/requestAnimationFrame\(animate\)/);
   assert.match(s,/source\.connect\(analyser\)/);
   assert.doesNotMatch(s,/\.connect\(ctx\.destination\)/);
   assert.match(s,new RegExp(p+'Start\\(stream\\)'));
   assert.match(s,new RegExp(p+'Stop\\(\\)'));
   assert.match(s,new RegExp('#'+visual+' \\.gmww-live-meter'));
   assert.doesNotMatch(s,/▂▄▆▃▇▅▂/);
 }
});

test('Audio codec reduces optional bitrate while keeping iOS compatibility and explicit send flow',()=>{
 for(const [s,p] of [[gm,'gmwwGMVoiceSend'],[player,'gmwwChatVoiceSend']]){
   assert.match(s,/audioBitsPerSecond:40000/);
   assert.match(s,/catch\{recorder=new MediaRecorder\(stream,mime\?\{mimeType:mime\}:undefined\)\}/);
   assert.match(s,/30000\)/);
   assert.match(s,/Đang gửi thoại…/);
   const stop=s.slice(s.indexOf('recorder.onstop=async()=>{'),s.indexOf('recorder.start(500)'));
   assert.doesNotMatch(stop,/await (?:api|playRoomApi)\(/);
   assert.match(stop,new RegExp('if\\(sendRequested&&.*?\\)void '+p+'\\(\\)'));
 }
});

test('Voice chunk writes are concurrent but publish metadata only after all chunks complete',async()=>{
 const start=worker.indexOf('  async chatVoiceStore('),end=worker.indexOf('  async chatVoiceRead(',start);
 assert.ok(start>=0&&end>start);
 const Room=vm.runInNewContext('(class TestRoom{'+worker.slice(start,end)+'})',{crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'},Date});
 const stored=new Map(),events=[];
 let active=0,max=0;
 const room=new Room();
 room.ctx={storage:{
  put:async(k,v)=>{
    active++;max=Math.max(max,active);
    await new Promise(resolve=>setTimeout(resolve,k.endsWith(':meta')?0:3));
    stored.set(k,v);events.push(k);active--;
  }
 }};
 const sound='QUJD'.repeat(51000);
 const msg=await room.chatVoiceStore('match','gm:bob',{mime:'audio/mp4',durationMs:10000,base64:sound});
 assert.equal(msg.kind,'voice');
 assert.ok(max>1,'separate voice chunks should upload in parallel');
 const prefix='onlineChatVoice:match:'+msg.voiceId+':';
 const meta=stored.get(prefix+'meta');
 assert.equal(events.at(-1),prefix+'meta','audio manifest must not publish before all chunks');
 assert.equal(meta.parts,Math.ceil(sound.length/65536));
 assert.equal(Array.from({length:meta.parts},(_,i)=>stored.get(prefix+i)).join(''),sound);
});

test('Chat voice read maintains original order and privacy gates',()=>{
 assert.match(worker,/blocks\.push\(\.\.\.await Promise\.all\(indices\.map\(index=>this\.ctx\.storage\.get\(prefix\+index\)\)\)\)/);
 assert.match(worker,/if\(blocks\.some\(chunk=>typeof chunk!=='string'\)\)/);
 assert.match(worker,/record\.channel==='gm:all'/);
 assert.match(worker,/CHAT_AUDIO_FORBIDDEN/);
});
