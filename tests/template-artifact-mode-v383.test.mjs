import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sanitizeGameConfig} from '../src/gmww-room-config-rules.js';
import {selectVerifiedRuntimeV383Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const section=(source,from,to)=>{
  const a=source.indexOf(from),b=source.indexOf(to,a);
  assert.ok(a>=0&&b>a,'source fragment not found: '+from);
  return source.slice(a,b);
};
test('All Artifact setup is per match on Chọn Ván',()=>{
  const editor=section(html,'<div class="play-template-editor-only">','<div class="play-template-play-review">');
  const play=section(html,'<div class="play-template-play-review">','<div class="button-row play-roster-actions">');
  for(const id of ['playGameArtifactPicker','playArtifactActionSec','playArtifactLimitPerCycle'])
    assert.match(play,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(editor,/id="playArtifactsEnabled"/);
  assert.match(play,/id="playArtifactsEnabled"/);
  assert.doesNotMatch(editor,/id="playGameArtifactPicker"|id="playArtifactActionSec"|id="playArtifactLimitPerCycle"/);
  assert.match(play,/id="playTemplateArtifactSummary"/);
  assert.match(app,/if\(document\.querySelector\('\.play-game-sheet-card'\)\?\.dataset\.mode==='play'\)renderPlayArtifactPicker\(\)/);
  assert.match(play,/id="playGameTimingDetails"/);
  assert.match(play,/id="playRoleTimingDetails"/);
});
test('The Worker preserves explicit Artifact on/off and accepts previous templates',()=>{

  const data={name:'Test',roles:[{roleId:'wolf'}],artifacts:[{artifactId:'mirror',order:1}]};
  const disabled=sanitizeGameConfig({...data,artifactsEnabled:false});
  assert.equal(disabled.artifactsEnabled,false);
  assert.equal(disabled.artifacts.length,0);
  const enabled=sanitizeGameConfig({...data,artifactsEnabled:true});
  assert.equal(enabled.artifactsEnabled,true);
  assert.equal(enabled.artifacts[0].artifactId,'mirror');
  const legacy=sanitizeGameConfig(data);
  assert.equal(legacy.artifactsEnabled,true);
  assert.equal(legacy.artifacts[0].artifactId,'mirror');
  const none=sanitizeGameConfig({...data,artifacts:[]});
  assert.equal(none.artifactsEnabled,false);
});
test('Template save is role-only; match selection uses its own Artifact configuration',()=>{
  const save=section(app,'async function savePlayGame(){','function playRandomInt(max)');
  const play=section(save,"if(mode==='play'){","const total=playRolePlanTotal();");
  const library=save.slice(save.indexOf('const total=playRolePlanTotal();'));
  assert.match(library,/artifactsEnabled:false,artifacts:\[\]/);
  assert.match(library,/await playEnsureTemplateAssets\(playSceneState\.gameTemplateId/);
  assert.doesNotMatch(library,/await playEnsureSharedArtifactPool\(cfg\)/);
  assert.match(play,/const artifactConfig=playMatchArtifactConfig\(\)/);
  assert.match(play,/timing,\.\.\.artifactConfig/);
  assert.doesNotMatch(play,/selectedArtifacts\s*=\s*playTemplateSelectedArtifacts/);
  assert.doesNotMatch(play,/playArtifactArtworkData\(/);
  assert.match(app,/await playEnsureSharedArtifactReferencesReady\(cfg\)/);
});
test('LƯU on Step 5 sends only stage transition, never private cards before Phát Vai',()=>{
  const save=section(app,'function playAssignmentSignature(){','function renderPlayRoleAssignmentPanel(){');
  assert.match(save,/async function playSaveAssignments\(\)/);
  assert.match(save,/assignmentSavedSignature=playAssignmentSignature\(\)/);
  const onlySave=section(save,'async function playSaveAssignments(){','function playConfirmAssignments(){');
  assert.match(onlySave,/await playPublishStage\('deal'\)/);
  assert.doesNotMatch(onlySave,/playRoomApi\('\/assignments'/);
  assert.match(app,/addEventListener\('click',playSaveAssignments\)/);
  assert.match(html,/id="playAssignmentConfirm"[^>]*>✓ LƯU<\/button>/);
});

test('V3.83 OTA is integrity-verified and never deletes existing files',()=>{
  const files=['GMWW.html','app.js'],root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.83/';
  const manifest={releaseVersion:'3.83',runtimeVersion:'3.83',shellVersion:'3.17',releaseType:'runtime',
    delete:[],runtime:{files:files.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}};
  const patch=selectVerifiedRuntimeV383Delta(manifest,'3.82');
  assert.ok(patch);
  assert.deepEqual(patch.runtime.files.map(x=>x.path),files);
  assert.deepEqual(patch.delete,[]);
  assert.equal(selectVerifiedRuntimeV383Delta(manifest,'3.81'),null);
  manifest.runtime.files[1].sha256='invalid';
  assert.equal(selectVerifiedRuntimeV383Delta(manifest,'3.82'),null);
});
