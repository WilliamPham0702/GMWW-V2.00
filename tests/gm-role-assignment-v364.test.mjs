import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV364Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
function block(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a);
 assert.ok(a>=0&&b>a,'missing app block '+start);
 return app.slice(a,b);
}
const draft=block('function playAssignmentDraftStatus(){','function renderPlayRoleAssignmentPanel(){');
const build=block('function playBuildAssignments(opts={}){','function playRerollArtifacts(){');
function harness(){
 const logs=[],playSceneState={
  step:'roles',phase:'lobby',rolePlan:{seer:1,wolf:1},assignmentsPreview:[
   {loginId:'a',roleId:'seer',roleName:'Tiên Tri',faction:'Phe Dân',description:'Soi'},
   {loginId:'b',roleId:'wolf',roleName:'Sói',faction:'Phe Sói',description:'Cắn'}
  ],artifactsEnabled:false,activePlayerId:'a'
 };
 const playSceneRuntime={room:{seatsLocked:true},busy:false};
 const members=[{kind:'member',loginId:'a',displayName:'A',seatId:2},
                {kind:'member',loginId:'b',displayName:'B',seatId:1}];
 const ctx={playSceneState,playSceneRuntime,playLiveMembers:()=>members,
  playRolePlanTotal:()=>Object.values(playSceneState.rolePlan).reduce((a,b)=>a+b,0),
  playTemplateSelectedArtifacts:()=>[],playFlashError:msg=>logs.push('error:'+msg),
  savePlayScene:()=>logs.push('saved'),renderPlayScene:()=>logs.push('render'),
  renderPlayRoleAssignmentPanel:()=>logs.push('panel'),
  playPublishStage:step=>{logs.push('published:'+step);return Promise.resolve()},
  state:{cards:[{id:'seer',name:'Tiên Tri',information:'Soi'},{id:'wolf',name:'Sói',information:'Cắn'}]},
  playFactionLabel:r=>r.id==='wolf'?'Phe Sói':'Phe Dân',
  playShuffle:arr=>arr.slice().reverse(),
  playAssignArtifactsToRows:rows=>rows,
  Map,Set,Number,String,Object,Array
 };
 vm.runInNewContext(draft+'\n'+build+'\nthis.api={status:playAssignmentDraftStatus,swap:playAssignmentSwapRole,confirm:playConfirmAssignments,save:playSaveAssignments,build:playBuildAssignments};',ctx);
 return{ctx,api:ctx.api,logs,state:playSceneState,members};
}
test('Step 5 is a true GM-only responsive page with preview, control row, and confirmation',()=>{
 for(const id of ['playRoleAssignmentPanel','playAssignmentRows','playAssignmentRandom','playAssignmentInOrder','playAssignmentArtifactShuffle','playAssignmentConfirm','playAssignmentBack'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(css,/#playRoleAssignmentPanel \.play-assignment-rows\{overflow-y:auto/);
 assert.match(css,/#playRoleAssignmentPanel \.play-assignment-fields\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(app,/renderPlayPlayers\(\);renderPlayCards\(\);renderPlayDeliveryProgress\(\);renderPlayGatherToolbar\(\);renderPlayRoleAssignmentPanel\(\)/);
 assert.match(app,/async function savePlayGame\(\)/);
 assert.match(app,/try\{playBuildAssignments\(\{random:true\}\)\}catch\(err\)/);
 assert.match(html,/id="playAssignmentConfirm"[^>]*>✓ LƯU<\/button>/);
 assert.match(app,/resolveArtwork\('cards',role\.id,'thumb'\)/);
 assert.match(app,/resolveArtwork\('artifacts',artifact\.id,'thumb'\)/);
});
test('Random allocation stays at step 5; no role or Artifact payload is sent before GM presses Phát Vai',()=>{
 const h=harness();
 h.api.build({random:true});
 assert.equal(h.state.step,'roles');
 assert.equal(h.state.assignmentsPreview.length,2);
 assert.ok(!h.logs.some(x=>x.startsWith('published:')),'creating the draft must not publish a new stage');
 assert.doesNotMatch(build,/\/assignments|\/role-assets/);
 assert.doesNotMatch(draft,/\/assignments|\/role-assets/);
 assert.match(app,/const review=playAssignmentDraftStatus\(\);if\(!review\.ok\)/);
 assert.match(app,/const data=await playRoomApi\('\/assignments'/);
});
test('Changing a role swaps cards with another member without changing template counts',()=>{
 const h=harness();
 h.api.swap('a','wolf');
 assert.equal(h.state.assignmentsPreview[0].roleId,'wolf');
 assert.equal(h.state.assignmentsPreview[1].roleId,'seer');
 assert.equal(h.api.status().ok,true);
 assert.deepEqual([...h.state.assignmentsPreview].map(r=>r.roleId).sort(),['seer','wolf']);
 assert.ok(h.logs.includes('saved'));
});
test('Validation prevents missing, duplicated, or mismatched roles and rejects unlocked seats',()=>{
 const h=harness();
 assert.equal(h.api.status().ok,true);
 h.state.assignmentsPreview[1].roleId='seer';
 assert.equal(h.api.status().ok,false);
 assert.equal(h.api.confirm(),false);
 assert.equal(h.state.step,'roles');
 assert.equal(h.logs.filter(x=>x==='published:deal').length,0);
 h.state.assignmentsPreview[1].roleId='wolf';
 h.ctx.playSceneRuntime.room.seatsLocked=false;
 assert.equal(h.api.status().ok,false);
 h.ctx.playSceneRuntime.room.seatsLocked=true;
 h.members.push({kind:'member',loginId:'c',displayName:'C',seatId:3});
 assert.equal(h.api.status().ok,false);
});
test('LƯU retains private assignments on step 5; lower navigation advances separately',()=>{
 const h=harness();
 assert.equal(h.api.save(),true);
 assert.equal(h.state.step,'roles');
 assert.ok(h.logs.includes('saved'));
 assert.ok(h.state.assignmentSavedSignature);
 assert.ok(!h.logs.some(x=>x.startsWith('published:')));
 assert.match(app,/addEventListener\('click',playSaveAssignments\)/);
});
test('Only lower GM navigation advances to step 6; release requires separate step-6 action',()=>{
 const h=harness();
 assert.equal(h.api.confirm(),true);
 assert.equal(h.state.step,'deal');
 assert.equal(h.state.phase,'lobby');
 assert.ok(h.logs.includes('published:deal'));
 assert.equal(h.logs.filter(x=>x.startsWith('published:')).length,1);
 assert.match(app,/if\(playSceneState\.step==='roles'\)\{playConfirmAssignments\(\);return\}/);
 assert.match(app,/if\(playSceneState\.step==='deal'\)\{if\(playDeliveryProgress\(\)\.success\)/);
});
test('Role counts are exact and versioned V3.64 OTA only includes the three existing GM UI files',()=>{
 const paths=['GMWW.html','app.js','style.css'],origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.64/';
 const sample=()=>({releaseVersion:'3.64',runtimeVersion:'3.64',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:origin+path,sha256:'a'.repeat(64)}))}});
 for(const from of ['3.60','3.61','3.62','3.63']){
  const m=selectVerifiedRuntimeV364Delta(sample(),from);
  assert.ok(m,'compatible '+from);assert.deepEqual(m.runtime.files.map(f=>f.path),paths);
  assert.deepEqual(m.delete,[]);
 }
 assert.equal(selectVerifiedRuntimeV364Delta(sample(),'3.64'),null);
 const bad=sample();bad.runtime.files[1].sha256='oops';
 assert.equal(selectVerifiedRuntimeV364Delta(bad,'3.63'),null);
 const unsafe=sample();unsafe.delete=['settings.json'];
 assert.equal(selectVerifiedRuntimeV364Delta(unsafe,'3.63'),null);
 assert.match(worker,/VERSION="V3\.85",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-385"/);
 assert.match(html,/<title>GMWW V3\.85<\/title>/);
 assert.match(app,/const VERSION='3\.85'/);
});
