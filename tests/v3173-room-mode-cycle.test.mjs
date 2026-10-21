import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const code=(a,b)=>{const start=setup.indexOf(a),end=setup.indexOf(b,start+a.length);assert.ok(start>=0&&end>start,a);return setup.slice(start,end)};
test('One shared room, room mode button exists only after creation',()=>{
 assert.match(html,/<button id="playRoomModeToggle"/);
 assert.doesNotMatch(html,/<select id="playRoomModeToggle"/);
 assert.doesNotMatch(html,/id="playDemoRoomChoice"/);
 assert.match(setup,/const ok=await playCreateRoom\(false\)/);
 assert.match(setup,/demo:false,roomMode:'offline'/);
 assert.match(setup,/modeToggle\.disabled=!roomReady/);
});
test('After creating a room: taps 1..5 give OFFLINE ONLINE DEMO OFFLINE ONLINE',async()=>{
 const callbacks={},button={dataset:{},addEventListener:(type,cb)=>callbacks[type]=cb};
 const context={document:{getElementById:id=>id==='playRoomModeToggle'?button:null},
  playSceneRuntime:{busy:false,room:{demo:false,phase:'lobby'}},
  playRoomUiState:{editorMode:'',selectedCode:'ABC123',modeTouched:false},
  playSceneState:{roomMode:'offline'},isLivePlayRoom:()=>true,
  playUpdateRoomSettings:async patch=>{context.lastPatch=patch;context.playSceneRuntime.room.demo=patch.demo;context.playSceneState.roomMode=patch.demo?'demo':patch.roomMode;return true},
  renderPlayCreateRoomSheet:()=>{}};
 vm.createContext(context);
 vm.runInContext(code('const PLAY_ROOM_MODE_CYCLE=','function playRoomRegistry(')+code('function bindPlayRoomModeButtons(){','function bindPlaySeatMoveButtons(')+';bindPlayRoomModeButtons();bindPlayRoomModeButtons()',context);
 const modes=[];
 for(let i=0;i<5;i++){await callbacks.click();modes.push(context.playSceneState.roomMode)}
 assert.deepEqual(modes,['offline','online','demo','offline','online']);
 assert.equal(context.playRoomUiState.modeTouched,true);
 assert.equal(context.lastPatch.demo,false);
 context.playSceneRuntime.busy=true;await callbacks.click();assert.equal(context.playSceneState.roomMode,'online');
});
test('Server changes DEMO through protected room-settings only in an empty lobby',()=>{
 assert.match(worker,/const previousDemo=meta\.demo===true,desiredDemo=/);
 assert.match(worker,/ROOM_MODE_REQUIRES_EMPTY_RESET/);
 assert.match(worker,/meta\.demo=desiredDemo/);
 assert.match(worker,/await syncRoomDirectory\(env,code\)/);
});
