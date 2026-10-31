import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHAT_VOICE_MAX_BYTES,CHAT_VOICE_TTL_MS,CHAT_VOICE_MAX_CLIPS_PER_ROOM,
  decodeChatVoice,pruneChatVoiceIndex,validChatVoiceId} from '../src/gmww-chat-voice.js';

const mp4=Buffer.concat([Buffer.from([0,0,0,20]),Buffer.from('ftypisom0000')]).toString('base64');
const webm=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]),Buffer.from('webm-clip-data')]).toString('base64');
test('iPhone AAC/MP4 and Chrome WebM voice clips are accepted',()=>{
  assert.deepEqual(decodeChatVoice({base64:mp4,mime:'audio/mp4; codecs=mp4a.40.2',durationMs:1500}),
    {mime:'audio/mp4',base64:mp4,bytes:16,durationMs:1500});
  assert.equal(decodeChatVoice({base64:webm,mime:'audio/webm',durationMs:1200})?.mime,'audio/webm');
});
test('reject wrong media signatures, forged MIME, overlength, invalid base64 and oversize clips',()=>{
  assert.equal(decodeChatVoice({base64:mp4,mime:'text/html',durationMs:1500}),null);
  assert.equal(decodeChatVoice({base64:mp4,mime:'audio/webm',durationMs:1500}),null);
  assert.equal(decodeChatVoice({base64:mp4,mime:'audio/mp4',durationMs:21000}),null);
  assert.equal(decodeChatVoice({base64:'not valid',mime:'audio/mp4',durationMs:1200}),null);
  assert.equal(decodeChatVoice({base64:Buffer.concat([Buffer.from([0,0,0,20]),Buffer.from('ftyp'),Buffer.alloc(CHAT_VOICE_MAX_BYTES)]).toString('base64'),mime:'audio/mp4',durationMs:1200}),null);
  assert.equal(decodeChatVoice({base64:mp4,mime:'audio/mp4',durationMs:1}),null);
});
test('voice retention bounds the number of clips per room and removes expired entries',()=>{
  const now=1750000000000,old={key:'expired',at:now-CHAT_VOICE_TTL_MS-1};
  const rows=[old,...Array.from({length:CHAT_VOICE_MAX_CLIPS_PER_ROOM+2},(_,i)=>({key:'k'+i,at:now-1000+i}))];
  const x=pruneChatVoiceIndex(rows,now);
  assert.equal(x.keep.length,CHAT_VOICE_MAX_CLIPS_PER_ROOM);
  assert.deepEqual(x.toDelete,['expired','k0','k1']);
});
test('audio access is only via authenticated per-channel endpoints; WebSocket contains no voice bytes',()=>{
  const worker=fs.readFileSync('src/index.js','utf8');
  const player=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8');
  const gm=fs.readFileSync('server-game/src/45-online-chat.part','utf8');
  assert.match(worker,/playerRoomChatVoiceApi\(env,playerVoice\[1\],request\)/);
  assert.match(worker,/memberStore\(env\)\.fetch\(new Request\("https:\/\/member\.internal\/members\/session"/);
  assert.match(worker,/async playerChatVoiceRead\(body\)[\s\S]*?if\(!permission\.canRead/);
  assert.match(worker,/async gmChatVoiceRead\(request\)[\s\S]*?this\.gmAuthorized\(request\)/);
  assert.match(worker,/clip\.channel!==channel/);
  assert.match(worker,/this\.broadcast\(\{type:"chat_tick",serverTime:now\}\)/);
  assert.match(player,/gmwwChatVoiceToggle/);
  assert.match(player,/gmwwChatVoiceCancel/);
  assert.match(player,/gmwwChatVoicePlay/);
  assert.match(gm,/gmwwGMChatRecordVoice/);
  assert.match(gm,/gmwwGMChatPlayVoice/);
  assert.equal(validChatVoiceId('12345678-1234-1234-1234-1234567890ab'),true);
  assert.equal(validChatVoiceId('../other-channel'),false);
});
