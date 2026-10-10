import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV383Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const section=(source,from,to)=>{
  const a=source.indexOf(from),b=source.indexOf(to,a);
  assert.ok(a>=0&&b>a,'source fragment not found: '+from);
  return source.slice(a,b);
};
test('Artifact toggle, catalog, time and quota exist only in the Ván Mẫu editor',()=>{
  const editor=section(html,'<div class="play-template-editor-only">','<div class="play-template-play-review">');
  const play=section(html,'<div class="play-template-play-review">','<div class="button-row play-roster-actions">');
  for(const id of ['playArtifactsEnabled','playGameArtifactPicker','playArtifactActionSec','playArtifactLimitPerCycle'])
    assert.match(editor,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(play,/playArtifactsEnabled|playGameArtifactPicker|playArtifactActionSec|playArtifactLimitPerCycle/);
  assert.match(play,/id="playTemplateArtifactSummary"/);
  assert.match(html,/Có sử dụng Artifact trong Ván Mẫu/);
  assert.match(app,/if\(document\.querySelector\('\.play-game-sheet-card'\)\?\.dataset\.mode==='library'\)renderPlayArtifactPicker\(\)/);
});
test('The Worker preserves explicit Artifact on/off and accepts previous templates',()=>{
  const src=section(worker,'function sanitizeGameConfig(v){','function validImageDataUrl(v){');
  const api=vm.runInNewContext(src+';({sanitizeGameConfig})');
  const data={name:'Test',roles:[{roleId:'wolf'}],artifacts:[{artifactId:'mirror',order:1}]};
  const disabled=api.sanitizeGameConfig({...data,artifactsEnabled:false});
  assert.equal(disabled.artifactsEnabled,false);
  assert.equal(disabled.artifacts.length,0);
  const enabled=api.sanitizeGameConfig({...data,artifactsEnabled:true});
  assert.equal(enabled.artifactsEnabled,true);
  assert.equal(enabled.artifacts[0].artifactId,'mirror');
  const legacy=api.sanitizeGameConfig(data);
  assert.equal(legacy.artifactsEnabled,true);
  assert.equal(legacy.artifacts[0].artifactId,'mirror');
  const none=api.sanitizeGameConfig({...data,artifacts:[]});
  assert.equal(none.artifactsEnabled,false);
});
test('Save prepares the reusable Artifact catalog; choose only references stored template',()=>{
  const save=section(app,'async function savePlayGame(){','function playRandomInt(max)');
  const play=section(save,"if(mode==='play'){","const total=playRolePlanTotal();");
  const library=save.slice(save.indexOf('const total=playRolePlanTotal();'));
  assert.match(library,/artifactsEnabled:!!playSceneState\.artifactsEnabled/);
  assert.match(library,/await playEnsureTemplateAssets\(playSceneState\.gameTemplateId/);
  assert.match(library,/await playEnsureSharedArtifactPool\(cfg\)/);
  assert.match(play,/const chosenArtifactRefs=artifactEnabled\?\(base\.artifacts\|\|\[\]\):\[\]/);
  assert.match(play,/artifacts:chosenArtifactRefs\.map\(/);
  assert.doesNotMatch(play,/selectedArtifacts\s*=\s*playTemplateSelectedArtifacts/);
  assert.doesNotMatch(play,/playArtifactArtworkData\(/);
  assert.match(app,/await playEnsureSharedArtifactReferencesReady\(cfg\)/);
});
test('LƯU on Step 5 is GM-private, while the bottom timeline can advance separately',()=>{
  const save=section(app,'function playAssignmentSignature(){','function renderPlayRoleAssignmentPanel(){');
  assert.match(save,/function playSaveAssignments\(\)/);
  assert.match(save,/assignmentSavedSignature=playAssignmentSignature\(\)/);
  const onlySave=section(save,'function playSaveAssignments(){','function playConfirmAssignments(){');
  assert.doesNotMatch(onlySave,/playPublishStage|playRoomApi|\/assignments/);
  assert.match(app,/addEventListener\('click',playSaveAssignments\)/);
  assert.match(app,/if\(playSceneState\.step==='roles'\)\{playConfirmAssignments\(\);return\}/);
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
