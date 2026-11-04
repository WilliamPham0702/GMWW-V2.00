import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const members=read('server-game/src/20-members-and-roster.part');
const setup=read('server-game/src/30-village-and-setup.part');
const battle=read('server-game/src/40-battle-and-timeline.part');
const roles=read('server-game/src/50-roles-and-artifacts.part');
function section(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Missing source section: '+start);
  return source.slice(a,b);
}
const progressCode=section(setup,'function playGatherSequenceStatus(){','function renderPlayGatherToolbar(){');
const toolbarCode=section(setup,'function renderPlayGatherToolbar(){','const PLAY_SEAT_PRESET_NAMES=');

test('GM source modules exactly match the shipped app.js',()=>{
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
  assert.equal(parts.map(n=>read('server-game/src/'+n)).join(''),read('server-game/current/app.js'));
});

test('Online Call always opens selectable roster; never enrolls everyone online',async()=>{
  const source=section(roles,'async function playCallOnlineMembers(){','async function playRandomSeatRemaining(){');
  let opened=0,posted=0;
  const context={openPlayRosterSheet:async()=>{opened++;},playRoomApi:async()=>{posted++;}};
  vm.runInNewContext(source+';globalThis.call=playCallOnlineMembers;',context);
  await context.call();
  assert.equal(opened,1);
  assert.equal(posted,0);
  assert.doesNotMatch(source,/\/participants|\.filter\(m=>m\?\.online/);
  const caller=section(battle,'async function playGatherCallMembers(){','async function playGatherRandomize(){');
  assert.match(caller,/await openPlayRosterSheet\(\)/);
  assert.doesNotMatch(caller,/await playCallOnlineMembers\(\)/);
});

test('Gather toolbar unlocks Call → Seat → Random or Manual → Confirm',()=>{
  let count=0,occupied=0;
  const ids=['playGatherCall','playGatherSeatPreset','playGatherRandom','playGatherManual','playGatherConfirm','playGatherDisband'];
  const elements=Object.fromEntries(ids.map(id=>[id,{
    disabled:false,classList:{toggle(){}},setAttribute(){},
    querySelector:()=>({textContent:''})
  }]));
  elements.playGatherCount={textContent:''};
  elements.playGatherToolbar={classList:{toggle(){},remove(){}},dataset:{}};
  const context={
    document:{getElementById:id=>elements[id]||null},
    playSceneState:{step:'seats',phase:'lobby',roomCode:'ABCDEF',gatherSeatPresetRoom:''},
    playSceneRuntime:{room:{seatsLocked:false},busy:false},
    isLivePlayRoom:()=>true,playLiveMembers:()=>Array.from({length:count},(_,i)=>({loginId:String(i)})),
    playSeatStats:()=>({occupied,seatCount:8}),
    renderPlayRoomModeControl(){},closePlaySeatPresetPanel(){},
    initPlayGatherSpacing(){},initPlaySeatOffsetControls(){},
    requestAnimationFrame(){}
  };
  vm.runInNewContext(progressCode+toolbarCode+';globalThis.render=renderPlayGatherToolbar;',context);
  const expect=(values)=>assert.deepEqual(ids.slice(0,5).map(id=>elements[id].disabled),values);
  context.render();expect([false,true,true,true,true]);
  count=3;context.render();expect([false,false,true,true,true]);
  context.playSceneState.gatherSeatPresetRoom='ABCDEF';context.render();expect([false,false,false,false,true]);
  occupied=3;context.render();expect([false,false,false,false,false]);
  context.playSceneRuntime.room.seatsLocked=true;context.render();expect([true,true,true,true,false]);
});

test('Random and Manual placement share the same Seat prerequisite',()=>{
  const random=section(battle,'async function playGatherRandomize(){','function openPlayDisbandSheet(){');
  const manual=section(battle,'function playGatherManual(){','async function playGatherConfirm(){');
  assert.match(random,/!progress\.seatConfigured/);
  assert.match(manual,/!progress\.seatConfigured/);
  assert.doesNotMatch(random,/await playCallOnlineMembers\(\)/);
  const preset=section(setup,'async function playApplySeatPreset(count){','function ');
  assert.match(preset,/if\(ok\)\{playSceneState\.gatherSeatPresetRoom=/);
  assert.match(roles,/if\(rosterChanged\)playSceneState\.gatherSeatPresetRoom=''/);
});
