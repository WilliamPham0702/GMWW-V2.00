import {gmSource,playerWebSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gm=gmSource('45-online-chat');
const player=playerWebSource('35-online-chat');
test('GM and Player stage voice recording until explicit send',()=>{
 for(const [source,recorder,send,draft] of [[gm,'gmwwGMVoiceRecorder','gmwwGMVoiceSend','gmwwGMVoiceDraft'],[player,'gmwwChatVoiceRecorder','gmwwChatVoiceSend','gmwwChatVoiceDraft']]){
  assert.match(source,new RegExp('const sendRequested=.*VoicePendingSend'));
  assert.match(source,new RegExp(draft+'=\\{room,target,voice:'));
  assert.match(source,new RegExp('if\\(sendRequested&&'+draft+'\\)void '+send+'\\(\\)'));
  assert.match(source,new RegExp('if\\('+recorder+'\\?\\.state===\\x27recording\\x27\\)\\{.*?\.stop\\(\\);return\\}', 's'));
  assert.match(source,/setTimeout\(\(\)=>\{if\(recorder.state==='recording'\)recorder.stop\(\)\},30000\)/);
  const voiceBlock=source.slice(source.indexOf('async function '+send),source.indexOf('async function ',source.indexOf('async function '+send)+10));
  assert.match(voiceBlock,/method:'POST'/);
  assert.match(source,/Đã ghi • nhấn ↑ để gửi/);
 }
});
test('mic is parked between recordings, released when document hidden and on pagehide',()=>{
 for(const [source,prefix] of [[gm,'gmwwGMMic'],[player,'gmwwChatMic']]){
  assert.match(source,new RegExp('async function '+prefix+'Acquire'));
  assert.match(source,new RegExp(prefix+'Stream\\?\\.getAudioTracks'));
  assert.match(source,/track.enabled=false/);
  assert.match(source,new RegExp('setTimeout\\('+prefix+'Release,120000\\)'));
  assert.match(source,new RegExp("window.addEventListener\\('pagehide',"+prefix+"Release\\)"));
 }
});
test('no direct upload in MediaRecorder onstop before user asks to send',()=>{
 for(const source of [gm,player]){
  const section=source.slice(source.indexOf('recorder.onstop=async()=>{'),source.indexOf('recorder.start(500)'));
  assert.doesNotMatch(section,/await (?:api|playRoomApi)\(/);
  assert.match(section,/if\(sendRequested&&/);
 }
});
