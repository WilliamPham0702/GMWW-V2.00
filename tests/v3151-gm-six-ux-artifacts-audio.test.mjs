import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const roles=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const controls=fs.readFileSync('server-game/current/battle-controls.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('V3.152 LƯU Phân Vai commits GM deal stage before closing draft and never deals card content',()=>{
  const start=roles.indexOf('async function playSaveAssignments(){');
  const end=roles.indexOf('function playConfirmAssignments(){',start);
  assert.ok(start>=0&&end>start);
  const body=roles.slice(start,end);
  assert.match(body,/await playPublishStage\('deal'\)/);
  assert.ok(body.indexOf("await playPublishStage('deal')")<body.indexOf("playSceneState.step='deal'"));
  assert.doesNotMatch(body,/role-assets|\/assignments|playDistribute|deliverCard/);
  assert.match(body,/if\(!ack\)throw Error/);
  assert.match(body,/renderPlayScene\(\)/);
});

test('V3.152 GM artifact is a text label under its own character, not leaked to Player Web',()=>{
  assert.match(setup,/play-player-artifact/);
  assert.match(setup,/assignment\?\.artifactId&&playSceneState\.artifactsEnabled/);
  assert.doesNotMatch(setup,/resolveArtwork\('artifacts',id,'thumb'\)/);
  assert.match(css,/\.play-player-token \.play-player-artifact\{/);
  assert.match(css,/top:calc\(100% \+ 2px\)/);
});

test('V3.152 turn/target pulse persists for GM and respects reduced motion',()=>{
  assert.match(css,/@keyframes gmwwBattleBadgePulse/);
  assert.match(css,/\.battle-turn-mark,[\s\S]*\.battle-target-mark\{/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(gm,/className='battle-turn-mark'/);
  assert.match(gm,/className='battle-target-mark'/);
});

test('V3.152 real Artifact action names are resolved from owned Artifact actions, never numbered placeholders',()=>{
  const context=vm.createContext({});
  vm.runInContext(controls,context);
  const engine=context.GMWW_BATTLE_CONTROLS;
  const catalog={
    cards:[{id:'seer',name:'Tiên Tri',functions:[{actionId:'scan',name:'Soi',targetCount:1}]}],
    artifacts:[
      {id:'mirror',name:'Tráng Gương',functions:[{id:'mirror_shift',actionId:'mirror_shift',targetCount:1,phase:'night'}],
       actions:[{id:'mirror_shift',name:'Chuyển vết cắn',description:'Đổi đích tấn công'}]},
      {id:'stone',name:'Đá Đổi Vai Trò',functions:[],actions:[{id:'swap',name:'Đổi Vai Trò',targetCount:2}]},
      {id:'day',name:'Lời Nguyền',functions:[{id:'curse',phase:'day',targetCount:1}],actions:[{id:'curse',name:'Nguyền rủa'}]}
    ],
    actions:[{id:'scan',name:'Soi'}]
  };
  const owner=(artifactId,loginId)=>({artifactId,loginId,playerId:'member:'+loginId});
  const role={kind:'role',roleId:'seer',loginIds:['alice'],artifacts:[owner('mirror','alice'),owner('stone','alice'),owner('day','alice')]};
  const actions=engine.actionsForTurn(role,1,catalog);
  assert.deepEqual(Array.from(actions.filter(x=>!x.unavailable),x=>x.name),['Soi','Chuyển vết cắn','Đổi Vai Trò']);
  assert.equal(actions.find(x=>x.artifactId==='day').unavailable,true);
  assert.match(actions.find(x=>x.artifactId==='day').unavailableReason,/ban ngày/);
  const early=engine.actionsForTurn({kind:'early-artifact-window',actions:[owner('mirror','alice')]},1,catalog);
  assert.equal(early[0].name,'Chuyển vết cắn');
  assert.doesNotMatch(early[0].name,/Hành động 1/);
  assert.match(gm,/unavailable:!!action\.unavailable\|\|!actorIds\.length/);
});

test('V3.152 audio confirmation gate does not change a night turn or trigger next role cue before onended',()=>{
  const start=gm.indexOf('async function battleConfirm(confirmed=false){');
  const end=gm.indexOf('function battleToggleDetails(',start);
  const body=gm.slice(start,end);
  assert.match(body,/battleConfirmAudioGate=true/);
  assert.match(body,/battlePlayConfiguredAudio\('system','audio_system_confirm','Xác nhận',false,finishConfirmAudio\)/);
  assert.match(body,/if\(started===false\)finishConfirmAudio\(\)/);
  assert.match(body,/battleConfirmAudioGate=false/);
  assert.match(gm,/if\(!id\|\|battleState\.syncPending\|\|battleState\.busy\|\|battleConfirmAudioGate/);
  assert.match(gm,/if\(battleState\.lastAudioTurnKey!==key&&!battleConfirmAudioGate\)/);
  assert.ok(body.indexOf('battleConfirmAudioGate=true')<body.indexOf("await playRoomApi('/battle-action'"));
});

test('V3.152 GM packaged Runtime and prior IPA shell remain stable',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
 '30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(parts.map(name=>fs.readFileSync('server-game/src/'+name,'utf8')).join(''),fs.readFileSync('server-game/current/app.js','utf8'));
 const worker=fs.readFileSync('src/index.js','utf8');
 const version=JSON.parse(fs.readFileSync('package.json','utf8')).version.replace(/\.0$/,'');
 assert.ok(worker.includes('VERSION="V'+version+'",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="runtime-'+version.replaceAll('.','')+'"'));
});

test('V3.152 artifact action count and drag touch behavior are bounded',()=>{
  assert.match(controls,/isArt\?eligible\.slice\(0,1\):eligible/);
  assert.match(css,/#battleActionBar>button\[data-battle-action\]\{[\s\S]*?touch-action:none!important/);
  assert.match(setup,/playEsc\(assignment\.artifactName/);
});
