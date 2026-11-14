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
  for(const label of ['Hành động','Chat','Khôi phục','Thông cáo','Lên Giàn','Điều hành']) assert.ok(room.includes(label),label);
  // The old client/server handlers are reused; no second match engine.
  for(const api of ['renderOnlineActionDock()','renderGallowsWidget()','gmwwOnlineRestore()','openChat()']) assert.ok(room.includes(api),api);
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
test('Audio button unlocks the existing player announcement player; does not fake clips',()=>{
  assert.match(room,/unlockGmwwAudio\(\)/);
  assert.match(room,/gmwwPlayAnnouncement\(\)/);
  assert.match(room,/Phòng chưa có clip audio GM/);
});

test('Nút Lên Giàn thực sự mở đề cử và biểu quyết hiện có',()=>{
  assert.match(room,/state\.gallowsNominationOpen=true;renderGallowsWidget\(\)/);
  assert.match(room,/document\.getElementById\('gmwwGallowsPlayer'\)\?\.hidden/);
  assert.match(room,/document\.getElementById\('gmwwGallowsDock'\)\?\.hidden/);
  assert.match(room,/gallowsCurrentStage\(\)/);
});
