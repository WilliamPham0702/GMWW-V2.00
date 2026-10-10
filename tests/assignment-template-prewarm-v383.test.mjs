import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV383Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const block=(start,end)=>{
  const a=app.indexOf(start),b=app.indexOf(end,a);
  assert.ok(a>=0&&b>a,'missing GMWW code block '+start);
  return app.slice(a,b);
};

test('Assignment LƯU is GM-local; bottom navigation alone moves to Phát Vai',()=>{
  const logic=block('function playAssignmentSignature(){','function renderPlayRoleAssignmentPanel(){');
  const saver=logic.slice(0,logic.indexOf('function playConfirmAssignments(){'));
  assert.match(saver,/function playSaveAssignments\(\)/);
  assert.match(saver,/savePlayScene\(\)/);
  assert.doesNotMatch(saver,/playPublishStage|playRoomApi|step='deal'/);
  assert.match(html,/id="playAssignmentConfirm"[^>]*>✓ LƯU<\/button>/);
  assert.match(app,/if\(playSceneState\.step==='roles'\)\{playConfirmAssignments\(\);return\}/);
  assert.match(app,/getElementById\('playAssignmentConfirm'\)\?\.addEventListener\('click',playSaveAssignments\)/);
});

test('Ván Mẫu saving prepackages roles and prepares selected Artifact before choosing the match',()=>{
  const save=block('async function savePlayGame(){','function playRandomInt(max){');
  assert.match(save,/await playEnsureTemplateAssets\(playSceneState\.gameTemplateId,cached\?\.template\?\.compiledConfig\|\|cfg\)/);
  assert.match(save,/await playEnsureSharedArtifactPool\(cfg\)/);
  const choosing=save.slice(save.indexOf("if(mode==='play')"),save.indexOf('const total=playRolePlanTotal();'));
  assert.match(choosing,/await playEnsureTemplateAssets\(id,base\)/);
  assert.doesNotMatch(choosing,/playArtifactArtworkData|playRoleArtworkData/);
  assert.match(choosing,/await playPreloadSelectedArtwork\(configured\)/);
});

test('Choosing a prewarmed template skips expensive Artifact recompression',async()=>{
  const src=block('async function playEnsureSharedArtifactReferencesReady(cfg){','async function playEnsureTemplateAssets(id,cfg){');
  let syncCalls=0,progressCalls=0;
  const known=new Set(['artifact:a','artifact:b']);
  const ctx={
    playMatchArtifactAssetIds:cfg=>cfg.artifacts.map(a=>'artifact:'+a.artifactId),
    gmApi:async()=>({artifacts:[...known].map(assetId=>({assetId}))}),
    playEnsureSharedArtifactPool:async cfg=>{syncCalls++;assert.deepEqual(Array.from(cfg.artifacts,a=>a.artifactId),['c'])},
    playGameStatus:()=>{progressCalls++}
  };
  vm.runInNewContext(src+';this.ensure=playEnsureSharedArtifactReferencesReady',ctx);
  await ctx.ensure({artifacts:[{artifactId:'a'},{artifactId:'b'}]});
  assert.equal(syncCalls,0);
  assert.equal(progressCalls,0);
  await ctx.ensure({artifacts:[{artifactId:'a'},{artifactId:'c'}]});
  assert.equal(syncCalls,1);
  assert.equal(progressCalls,1);
});

test('V3.83 IPA Runtime OTA from V3.82 accepts only two matching hashed files',()=>{
  const base='https://gmww-v2-00.williampham0702.workers.dev';
  const manifest={releaseVersion:'3.83',runtimeVersion:'3.83',shellVersion:'3.17',
    releaseType:'runtime',runtime:{files:['GMWW.html','app.js','style.css'].map(path=>({
      path,url:base+'/updates/runtime/V3.83/'+path,sha256:'a'.repeat(64)
    }))},delete:[]};
  const result=selectVerifiedRuntimeV383Delta(manifest,'3.82');
  assert.ok(result);
  assert.deepEqual(result.runtime.files.map(x=>x.path),['GMWW.html','app.js']);
  assert.deepEqual(result.delete,[]);
  assert.equal(selectVerifiedRuntimeV383Delta(manifest,'3.81'),null);
  const bad=structuredClone(manifest);bad.runtime.files[1].sha256='wrong';
  assert.equal(selectVerifiedRuntimeV383Delta(bad,'3.82'),null);
  const unsafe=structuredClone(manifest);unsafe.delete=['storage'];
  assert.equal(selectVerifiedRuntimeV383Delta(unsafe,'3.82'),null);
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/selectVerifiedRuntimeV383Delta\(manifest,url\.searchParams\.get\("current"\)\)/);
});
