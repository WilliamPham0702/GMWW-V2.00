import test from 'node:test';
import assert from 'node:assert/strict';
import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import {RoomPlayerPhaseMethods} from '../src/worker/room/player-phase.js';
const room=playerWebSource('37-player-rooms');
const actions=playerWebSource('35-online-chat');
const top=playerWebSource('20-village-and-profile');
const worker=workerSource();

test('Quick Play uses existing battle timeline and a visible bottom menu rather than setup pill',()=>{
  assert.match(room,/function ensureQuickBattleDock\(\)/);
  assert.match(room,/battleDock\.hidden=!show\|\|!quick\|\|!gameRunning\|\|pr\.chatOpen/);
  assert.match(room,/dock\.hidden=true;/);
  assert.match(room,/function renderQuickBattleDock\(host,room\)/);
  assert.match(top,/if\(state\.room\?\.quickPlay===true&&String\(state\.room\.phase\|\|''\)\.toLowerCase\(\)==='running'\)return/);
  // 20/11/2026: màn trận Player Web = bố cục Server phía người chơi: [đồng hồ] [ô chat] (+ ô hành động khi có việc).
  assert.match(room,/for\(const key of \['clock','chat','action'\]\)/);
  for(const gm of ['Khôi phục','Điều hành','🔊 Audio']) assert.ok(!room.slice(room.indexOf('function ensureQuickBattleDock'),room.indexOf('function renderChrome')).includes(gm),'không có menu GM: '+gm);
  for(const api of ['renderOnlineActionDock()','renderGallowsWidget()','openChat()']) assert.ok(room.includes(api),api);
  assert.doesNotMatch(room,/callOwner\('gm-turn'/);
});
test('Battle countdown uses matching server match/cycle and pauses without local drift',()=>{
  assert.match(room,/gmwwSharedTimelineKey===\[state\.roomCode,room\.matchId,room\.cycleKey\]\.join/);
  assert.match(room,/clock\.remainingMs/);
  assert.match(room,/gmwwSharedTimelineReceivedAt/);
  assert.match(room,/room\.dayPausedRemainingMs/);
  assert.match(room,/room\.dayDeadlineAt/);
  assert.match(room,/Number\.isFinite\(remain\)/);
});
test('Player Web cannot open a disabled Frozen actor action picker',()=>{
  assert.match(actions,/if\(action\?\.blocked\)\{toast/);
  assert.match(actions,/btn\.disabled=true;btn\.dataset\.blocked='true'/);
  assert.match(actions,/if\(!action\|\|action\.blocked\|\|state\.room\?\.phase!=='running'\)/);
});
test('Server refuses frozen Guard action even if the player bypasses UI',async()=>{
  const m=new RoomPlayerPhaseMethods();
  const matchId='frozen-test',cycleKey='night-1',actor='guard1';
  const data=new Map([
    ['meta',{demo:false,phase:'running',roomMode:'online',cyclePhase:'night',matchId,cycleKey,cycleNight:1}],
    ['players',{'member:guard1':{kind:'member',loginId:actor}}],
    ['interactions',[{type:'frozen',actorId:'snowwolf1',loginId:actor,matchId,night:1,effectActive:true}]]
  ]);
  m.ctx={storage:{get:async k=>data.get(k)}};
  m.gmBattleAction=async()=>{throw new Error('Frozen actor reached live GM action: MUST reject earlier')};
  const response=await m.playerPhaseAction({loginId:actor,matchId,cycleKey,actionKey:'any'},true);
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'ACTOR_CANNOT_ACT');
});
test('Winner and night/day engine are still the original server paths',()=>{
  assert.match(worker,/await this\.playerRoomAutoEnd\(meta\)/);
  assert.match(worker,/await this\.applyCycle\(fresh,"night",1,"night-1","auto"\)/);
  assert.match(worker,/this\.computeWinProposal\(meta/);
});
test('Màn trận Player Web: timeline chỉ số thứ tự, không có nút Đêm/Ngày; chạm dock mở khoá audio',()=>{
  assert.match(room,/unlockGmwwAudio\(\)/);
  assert.match(top,/node\.append\(num\);list\.appendChild\(node\)/);
  assert.doesNotMatch(top,/label\.textContent=String\(step\.label/);
  assert.match(top,/for\(const id of \['battleBack','battleAdvance'\]\)\{const button=root\.querySelector\('#'\+id\);if\(button\)\{button\.hidden=true/);
});

test('Ô hành động mở đề cử / biểu quyết Lên Giàn hiện có, chỉ hiện khi có việc',()=>{
  assert.match(room,/state\.gallowsNominationOpen=true;renderGallowsWidget\(\)/);
  assert.match(room,/gallowsCurrentStage\(\)/);
  assert.match(room,/action\.hidden=!stage/);
});
