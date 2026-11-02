import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=(file)=>fs.readFileSync(file,'utf8');
const worker=source('src/index.js');
const gm=source('server-game/src/45-online-chat.part');
const app=source('server-game/current/app.js');
const player=source('src/player-web-src/35-online-chat.part');
const realtime=source('src/player-web-src/30-rooms-and-realtime.part');
const compiledPlayer=JSON.parse(source('src/gmww-members-live.js').match(/^export const gmwwMembersLiveScript = (.*);\s*$/s)[1]);

test('GM and Player record into a local draft; no request is sent on stop or timeout',()=>{
  for(const [code,marker,send] of [
    [gm,'async function gmwwGMVoiceToggle(){','async function gmwwGMSendVoiceDraft(){'],
    [player,'async function gmwwChatVoiceToggle(){','async function gmwwChatVoicePlay(']
  ]){
    const start=code.indexOf(marker),end=code.indexOf(send,start);
    assert.ok(start>=0&&end>start,'voice recorder must exist');
    const recording=code.slice(start,end);
    assert.match(recording,/new MediaRecorder\(stream/);
    assert.match(recording,/\.getTracks\(\)\.forEach\(t=>t\.stop\(\)\)/,'release microphone after recording');
    assert.doesNotMatch(recording,/method:'POST'/,'stopping should not POST a voice message');
    assert.match(recording,/Draft=\{room,target,blob:new Blob\(/);
    assert.match(recording,/SendAfterStop/,'submit during recording should finish before send');
    assert.match(recording,/setTimeout\(\(\)=>\{if\(recorder.state==='recording'\)recorder.stop\(\)\},30000\)/);
  }
  assert.match(gm,/if\(gmwwGMVoiceRecorder\?\.state==='recording'\|\|gmwwGMVoiceDraft\)\{await gmwwGMSendVoiceDraft\(\);return\}/);
  assert.match(player,/if\(gmwwChatVoiceRecorder\?\.state==='recording'\)\{\s*gmwwChatVoiceSendAfterStop=true;gmwwChatVoiceRecorder.stop\(\);return/);
  assert.match(player,/if\(draft\)\{[\s\S]*?method:'POST'/);
  assert.match(gm,/if\(gmwwGMVoiceDraft===draft\)\{gmwwGMVoiceDraft=null/);
  assert.match(player,/if\(gmwwChatVoiceDraft===draft\)\{gmwwChatVoiceDraft=null/);
  assert.doesNotMatch(gm,/<input type="text" maxlength="280" required placeholder="Gửi tin nhắn/,'empty text cannot block voice submit');
});

test('Night turn countdown comes only from authenticated /me response, honors deadline and pause',()=>{
  const contract=source('src/gmww-public-room-contract.js');
  assert.match(worker,/const publicTimeline=String\(meta.phase\)==="running"/);
  assert.match(worker,/clock:\{deadlineAt:wolfRuntime.deadlineAt\|\|null,startedAt:turn\?\.startedAt/);
  assert.match(worker,/pausedRemainingMs:wolfRuntime.autoAdvance===false/);
  assert.doesNotMatch(contract,/nightTurnDeadlineAt|gmwwTurnClock|clock:\{deadlineAt:/,'public room must not leak private timing details');
  assert.match(realtime,/state\.gmwwTurnClock=d\?\.publicTimeline\?\.phase==='night'/);
  assert.match(player,/room\.cyclePhase==='night'/);
  assert.match(player,/clock\.matchId===room\.matchId&&clock\.cycleKey===room\.cycleKey/);
  assert.match(player,/Math\.max\(0,deadline-serverNow\)/);
  assert.match(player,/pausedRemainingMs!=null/);
  assert.match(player,/dayDeadlineAt/,'retain day countdown');
});

test('Source bundle matches and scripts parse; version remains in sync',()=>{
  assert.ok(app.includes(gm),'GM app must bundle the authored source');
  assert.ok(compiledPlayer.includes(player),'Player bundle must include chat source');
  assert.ok(compiledPlayer.includes(realtime),'Player bundle must include realtime clock source');
  assert.doesNotThrow(()=>new vm.Script(app));
  assert.doesNotThrow(()=>new vm.Script(compiledPlayer));
  const pkg=JSON.parse(source('package.json'));
  assert.equal(pkg.version,'3.292.0');
  assert.match(worker,/VERSION="V3.292"/);
  assert.match(app,/const VERSION='3.292'/);
  assert.match(source('server-game/current/GMWW.html'),/<title>GMWW V3.292<\/title>/);
});
