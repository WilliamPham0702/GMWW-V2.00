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
test('After creating a room: fast mode choices cycle OFFLINE ONLINE DEMO OFFLINE',()=>{
 const cycle=vm.runInNewContext(code('const PLAY_ROOM_MODE_CYCLE=','function playRoomRegistry(')+';nextPlayRoomMode');
 let mode='offline',selected=false;const modes=[];
 for(let i=0;i<5;i++){mode=cycle(mode,selected);selected=true;modes.push(mode)}
 assert.deepEqual(modes,['offline','online','demo','offline','online']);
 assert.match(setup,/pendingMode=nextPlayRoomMode/);
 assert.match(setup,/void flushPlayRoomMode\(\)/);
});
test('Server changes DEMO through protected room-settings only in an empty lobby',()=>{
 assert.match(worker,/const previousDemo=meta\.demo===true,desiredDemo=/);
 assert.match(worker,/ROOM_MODE_REQUIRES_EMPTY_RESET/);
 assert.match(worker,/meta\.demo=desiredDemo/);
 assert.match(worker,/await syncRoomDirectory\(env,code\)/);
});
