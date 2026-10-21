import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const html=read('server-game/current/GMWW.html'),
  setup=read('server-game/src/30-village-and-setup.part'),
  battle=read('server-game/src/40-battle-and-timeline.part'),
  swift=read('server-game/GMWW-Server/GameView.swift'),
  bundle=read('server-game/current/app.js');

test('Creating a room exposes Online, Offline and Demo choices without a dedicated Demo tile',()=>{
  for(const mode of ['online','offline','demo'])assert.match(html,new RegExp('option value="'+mode+'"'));
  assert.doesNotMatch(html,/playDemoRoomChoice/);
  assert.match(setup,/playCreateRoom\(playSceneState\.roomMode==='demo'\)/);
  assert.match(setup,/demo:isDemo/);
  assert.match(setup,/room\.demo===true\?'demo'/);
});

test('Demo auto-start is one-shot per match, respects pause and stays inside GM menu',()=>{
  assert.ok(html.indexOf('id="battleWolfMenu"')<html.indexOf('id="battleDemoPanel"'));
  assert.match(battle,/demoRunner\.autoStartedMatch!==matchKey/);
  assert.match(battle,/void demoToggle\(\)/);
  assert.match(battle,/!demoRunner\.paused/);
  assert.match(battle,/demoRunner\.running\?'⏸ TẠM DỪNG'/);
});

test('A Demo action is not scheduled in the first half of the clock',()=>{
  assert.match(setup,/if\(duration>0&&elapsed<halfway\)return/);
  assert.match(setup,/elapsed>=halfway\+\(duration-halfway\)\*plan\.cursor\/total/);
  assert.match(battle,/clock\.remainingMs>halfway\|\|!actionsPending/);
});

test('Confirmed Demo and GM actions have audio and an opt-in native haptic path',()=>{
  assert.match(html,/id="battleGMHaptic"/);
  assert.match(battle,/function demoConfirmedFeedback\(\)/);
  assert.match(battle,/audio_system_confirm/);
  assert.match(battle,/gmHapticFeedback\(\)/);
  assert.match(battle,/GMWW_GM_HAPTIC_KEY/);
  assert.match(swift,/add\(context\.coordinator, name: "gmwwHaptic"\)/);
  assert.match(swift,/message\.frameInfo\.isMainFrame/);
  assert.match(swift,/UIImpactFeedbackGenerator\(style: \.medium\)/);
  assert.match(bundle,/function demoConfirmedFeedback\(\)/);
  assert.match(bundle,/const VERSION='3\.173'/);
});
