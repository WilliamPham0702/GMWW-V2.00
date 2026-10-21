import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const code=(a,b)=>{const start=setup.indexOf(a),end=setup.indexOf(b,start+a.length);assert.ok(start>=0&&end>start);return setup.slice(start,end)};

test('One mode button, no iPhone native dropdown and no separate Demo tile',()=>{
  assert.match(html,/<button id="playRoomModeToggle"/);
  assert.doesNotMatch(html,/<select id="playRoomModeToggle"/);
  assert.doesNotMatch(html,/id="playDemoRoomChoice"/);
  assert.match(setup,/playCreateRoom\(playSceneState\.roomMode==='demo'\)/);
});

test('Taps 1..5 select Offline → Online → Demo → Offline → Online without server writes',()=>{
  const callbacks={},roomModeButton={addEventListener:(type,callback)=>{callbacks[type]=callback}};
  const context={document:{getElementById:id=>id==='playRoomModeToggle'?roomModeButton:null},
    playSceneRuntime:{busy:false,room:null},playRoomUiState:{editorMode:'new',modeTouched:false},
    playSceneState:{roomMode:'offline'},savePlayScene:()=>{},renderPlayCreateRoomSheet:()=>{}};
  vm.createContext(context);
  vm.runInContext(code('const PLAY_ROOM_MODE_CYCLE=','function playRoomRegistry(')+
    code('function bindPlayRoomModeButtons(){','function bindPlaySeatMoveButtons(')+
    ';bindPlayRoomModeButtons()',context);
  const modes=[];for(let i=0;i<5;i++){callbacks.click();modes.push(context.playSceneState.roomMode)}
  assert.deepEqual(modes,['offline','online','demo','offline','online']);
  assert.equal(context.playRoomUiState.modeTouched,true);
  context.playRoomUiState.editorMode='existing';callbacks.click();
  assert.equal(context.playSceneState.roomMode,'online','saved room mode cannot be silently changed to DEMO');
});

test('Mode is chosen before saving a new room, immutable Demo flag only set at creation',()=>{
  assert.match(setup,/if\(!playRoomUiState\.modeTouched\).*Chạm CHẾ ĐỘ/);
  assert.match(setup,/demo:isDemo/);
  assert.match(setup,/roomMode:isDemo\?'online':playSceneState\.roomMode/);
  assert.match(setup,/modeToggle\.disabled=!creating/);
});
