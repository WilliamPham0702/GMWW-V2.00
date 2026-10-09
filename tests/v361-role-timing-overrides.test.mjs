import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectVerifiedRuntimeV361Delta} from '../src/gmww-ota-delta.js';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const worker=readFileSync('src/index.js','utf8');
test('Chọn Ván restores per-role editable seconds with clear shared-unit label',()=>{
  const panel=html.slice(html.indexOf('<div class="play-template-play-review">'),html.indexOf('<div class="sheet hidden" id="playEndSheet">'));
  assert.match(panel,/Thời gian sử dụng Vai Trò \(giây\):/);
  assert.match(panel,/THỜI GIAN RIÊNG TỪNG VAI/);
  assert.match(panel,/id="playGameRoleTimingList"/);
  assert.doesNotMatch(panel,/id="playGameRoleTimingList" hidden/);
  assert.match(app,/function renderPlayGameRoleTimings\(\)\{/);
  assert.match(app,/row\.querySelector\('input'\)\.onchange=e=>\{/);
  assert.match(css,/#playGameSheet \.play-game-sheet-card\[data-mode="play"\] #playGameRoleTimingList\{display:grid!important/);
});
test('Per-role override is saved into match config and template and correctly read back',()=>{
  assert.match(app,/roles:\(base\.roles\|\|\[\]\)\.map\(r=>\(\{\.\.\.r,actionDurationSec:playRoleDurationSec\(r\.roleId,timing\.defaultActionSec\)\}\)\)/);
  assert.match(app,/roles:chosen\.map\(r=>\(\{\.\.\.r,actionDurationSec:playRoleDurationSec\(r\.roleId,timing\.defaultActionSec\)\}\)\)/);
  assert.match(app,/if\(individualSec!==commonSec\)playSceneState\.roleDurations\[String\(r\.roleId\)\]=individualSec/);
  assert.match(app,/if\(id==='playDefaultActionSec'\)renderPlayGameRoleTimings\(\)/);
  assert.match(worker,/durationSec:roleDuration\.get\(rid\)\?\?defaultActionSec/);
});
test('V3.60 IPA can safely install exactly three V3.61 UI files',()=>{
 const paths=['GMWW.html','app.js','style.css'],root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.61/';
 const manifest=()=>({releaseVersion:'3.61',runtimeVersion:'3.61',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}});
 const x=selectVerifiedRuntimeV361Delta(manifest(),'3.60');
 assert.deepEqual(x.runtime.files.map(y=>y.path),paths);assert.equal(x.upgradeMode,'verified-overlay');assert.deepEqual(x.delete,[]);
 const m=manifest();m.runtime.files[0].sha256='invalid';assert.equal(selectVerifiedRuntimeV361Delta(m,'3.60'),null);
 assert.equal(selectVerifiedRuntimeV361Delta(manifest(),'3.59'),null);
});
