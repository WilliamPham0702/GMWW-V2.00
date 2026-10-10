import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');

test('Saved Ván Mẫu includes non-starred Artifact cards and keeps them selectable',()=>{
  const start=app.indexOf('function playFavoriteArtifacts(){');
  const end=app.indexOf('function renderPlayArtifactPicker(){',start);
  assert.ok(start>0&&end>start);
  const state={artifacts:[{id:'art-template',name:'Artifact trong ván'},{id:'art-star',name:'Artifact sao'}]};
  const ctx={state,prefs:{artifacts:{'art-star':{starred:true,starOrder:1}}},playSceneState:{artifactIds:['art-template']},playSceneRuntime:{templateArtifactPoolIds:['art-template']}};
  const api=vm.runInNewContext(app.slice(start,end)+';({playTemplateSelectedArtifacts,playAvailableTemplateArtifacts})',ctx);
  assert.deepEqual(Array.from(api.playTemplateSelectedArtifacts(),x=>x.id),['art-template']);
  assert.deepEqual(Array.from(api.playAvailableTemplateArtifacts(),x=>x.id),['art-star','art-template']);
  ctx.playSceneState.artifactIds=[];
  assert.deepEqual(Array.from(api.playAvailableTemplateArtifacts(),x=>x.id),['art-star','art-template']);
});

test('iPhone Chọn Ván reveals errors and progress in the visible modal',()=>{
  assert.match(html,/id="playGameStatus"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(css,/#playGameSheet \.play-game-status\[data-kind="error"\]/);
  assert.match(app,/if\(!document\.getElementById\('playGameSheet'\)\?\.classList\.contains\('hidden'\)\)playGameStatus\(playSceneRuntime\.lastError,'error'\)/);
  assert.match(app,/if\(playSceneRuntime\.busy\)return;\s*playGameStatus\(''\);\s*const card=/);
  assert.match(app,/chooseButton\.disabled=true;chooseButton\.textContent='ĐANG NẠP VÁN/);
  assert.match(app,/await playPreloadSelectedArtwork\(configured\);[\s\S]*?if\(!\(await playPublishStage\('roles'\)\)\)throw/);
});
