import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectVerifiedRuntimeV360Delta} from '../src/gmww-ota-delta.js';
const app=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const worker=readFileSync('src/index.js','utf8');

test('Chọn Ván uses shared defaults and allows per-role overrides',()=>{
  const sheet=html.slice(html.indexOf('<div class="play-template-play-review">'),html.indexOf('<div class="sheet hidden" id="playEndSheet">'));
  assert.match(sheet,/id="playVillageDiscussionSec"[^>]*value="300"/);
  assert.match(sheet,/id="playDefaultActionSec"[^>]*value="30"/);
  // Artifact settings belong to the reusable Ván Mẫu editor, not Chọn Ván.
  assert.match(html,/id="playArtifactActionSec"[^>]*value="30"/);
  assert.match(html,/id="playArtifactsEnabled"/);
  assert.match(sheet,/THỜI GIAN RIÊNG TỪNG VAI/);
  assert.match(css,/#playGameSheet \.play-game-sheet-card\[data-mode="play"\] \.play-timing-grid\{display:grid!important/);
  assert.match(app,/roles:\(base\.roles\|\|\[\]\)\.map\(r=>\(\{\.\.\.r,actionDurationSec:playRoleDurationSec\(r\.roleId,timing\.defaultActionSec\)\}\)\)/);
});
test('Server accepts separate Artifact duration and uses it for early/main turns',()=>{
  assert.match(worker,/artifactActionSec:clampSec\(v\?\.timing\?\.artifactActionSec\?\?30\)/);
  const night=worker.slice(worker.indexOf('async buildNightRuntime('),worker.indexOf('async artifactUsedInNight('));
  assert.ok(night.includes('artifactActionSec'));
  assert.match(night,/kind:"early-artifact"[\s\S]*?durationSec:artifactActionSec/);
  assert.match(night,/kind:"artifact-main"[\s\S]*?durationSec:artifactActionSec/);
  assert.match(night,/kind:"role"[\s\S]*?durationSec:roleDuration/);
});
test('Incremental V3.59 to V3.60 OTA is safe and fail-closed',()=>{
  const paths=['GMWW.html','app.js','style.css'];const base='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.60/';
  const m=()=>({releaseVersion:'3.60',runtimeVersion:'3.60',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:base+path,sha256:'a'.repeat(64)}))}});
  const result=selectVerifiedRuntimeV360Delta(m(),'3.59');assert.equal(result.upgradeMode,'verified-overlay');assert.deepEqual(result.runtime.files.map(x=>x.path),paths);
  for(const mut of [x=>{x.delete=['data']},x=>{x.runtime.files[1].sha256='wrong'},x=>{x.runtime.files.pop()},x=>{x.releaseVersion='3.59'}]){const x=m();mut(x);assert.equal(selectVerifiedRuntimeV360Delta(x,'3.59'),null)}
  assert.equal(selectVerifiedRuntimeV360Delta(m(),'3.58'),null);
});
