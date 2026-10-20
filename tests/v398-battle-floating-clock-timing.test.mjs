import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV398Delta} from '../src/gmww-ota-delta.js';
import {sanitizeGameConfig} from '../src/gmww-room-config-rules.js';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const server=fs.readFileSync('src/index.js','utf8');

test('V3.98 battle has one draggable clock, no fixed bottom row, wolf owns GM tools',()=>{
  const clockIndex=html.indexOf('id="playBattleClockFloat"'),dockIndex=html.indexOf('id="playBattleDock"');
  const wolfIndex=html.indexOf('id="battleWolfMenu"'),wolfEnd=html.indexOf('id="battleDetails"');
  assert.ok(clockIndex>0&&dockIndex>clockIndex);
  assert.ok(html.slice(clockIndex,dockIndex).includes('id="battleClockButton"'));
  assert.ok(!html.slice(dockIndex,wolfIndex).includes('battle-menu-row-top'));
  const wolf=html.slice(wolfIndex,wolfEnd);
  for(const id of ['battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
    assert.ok(wolf.includes('id="'+id+'"'),id+' missing from GM wolf');
  assert.equal((html.match(/id="battleGMAuto"/g)||[]).length,1);
  assert.equal((html.match(/id="battleGMAudio"/g)||[]).length,1);
  assert.match(css,/#playBattleClockFloat\.battle-clock-float-v396/);
  assert.match(css,/#playBattleDock\.battle-float-v396/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(app,/function initBattleFloatingClock\(/);
  assert.match(app,/playSceneState\.step==='battle';top\.hidden=!visible;dock\.hidden=!visible;/);
  assert.match(app,/const clockFloat=document\.getElementById\('playBattleClockFloat'\)/);
  assert.match(app,/document\.getElementById\('battleGMAuto'\)\?\.addEventListener\('click'/);
  assert.match(app,/document\.getElementById\('battleGMAudio'\)\?\.addEventListener\('click'/);
});

test('V3.104 clock is anchored by the lower control row without clearing earlier saved positions',()=>{
  const clockIndex=html.indexOf('id="playBattleClockFloat"'),rowIndex=html.indexOf('id="battleBottomControls"');
  assert.ok(rowIndex>0&&clockIndex>rowIndex);
  assert.ok(html.indexOf('id="battleActionTray"',clockIndex)>clockIndex);
  assert.ok(html.indexOf('id="battleUndoFloat"',clockIndex)>clockIndex);
  const code=app.slice(app.indexOf('function initBattleFloatingClock(){'),app.indexOf('function battleOpenTargetSheet('));
  assert.doesNotMatch(code,/localStorage\.removeItem|setPointerCapture|pointermove/);
  assert.match(css,/#battleBottomControls\.battle-bottom-controls-v3104/);
  assert.match(css,/flex:0 0 68px!important/);
});

test('Chọn Ván displays 60s while the authoritative opening Artifact countdown remains 30s',()=>{
  for(const id of ['playWolfDiscussionSec','playEarlyArtifactSec'])
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  assert.match(html,/id="playWolfDiscussionSec"[^>]*value="30"/);
  assert.match(html,/id="playEarlyArtifactSec"[^>]*value="60"/);
  assert.match(app,/gameTiming:\{villageDiscussionSec:300,gallowsNominationSec:10,gallowsVoteSec:10,wolfDiscussionSec:30,earlyArtifactSec:60/);
  assert.match(app,/playEarlyArtifactSec:'earlyArtifactSec'/);
  assert.match(app,/earlyArtifactSec:clamp\(document\.getElementById\('playEarlyArtifactSec'\)/);
  const timing=sanitizeGameConfig({}).timing;
  assert.equal(timing.wolfDiscussionSec,30);
  assert.equal(timing.earlyArtifactSec,30);
  const overridden=sanitizeGameConfig({timing:{wolfDiscussionSec:42,earlyArtifactSec:77}}).timing;
  assert.equal(overridden.wolfDiscussionSec,42);
  assert.equal(overridden.earlyArtifactSec,77);
  assert.match(server,/kind:"wolf-introduction",label:"Bầy sói ơi dậy đi",/);
  assert.match(server,/kind:"early-artifact-window",label:"Artifact đầu ván",durationSec:earlyArtifactSec/);
  assert.match(server,/kind:"artifact-main"[\s\S]{0,1200}durationSec:artifactActionSec/);
});

test('V3.97 to V3.98 OTA only installs signed interface files, never deletes game data',()=>{
 const paths=['GMWW.html','app.js','style.css'];
 const sha='a'.repeat(64),origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.98/';
 const manifest=()=>({releaseVersion:'3.98',runtimeVersion:'3.98',shellVersion:'3.17',releaseType:'runtime',delete:[],
   runtime:{files:paths.map(path=>({path,url:origin+path,sha256:sha}))}});
 const patch=selectVerifiedRuntimeV398Delta(manifest(),'3.97');
 assert.deepEqual(patch?.runtime?.files?.map(f=>f.path),paths);
 assert.deepEqual(patch?.delete,[]);
 assert.equal(patch?.optimizedFromVersion,'3.97');
 for(const unsupported of ['3.17','3.94','3.98',''])assert.equal(selectVerifiedRuntimeV398Delta(manifest(),unsupported),null);
 for(const mutate of [
   x=>{x.releaseVersion='3.96'},x=>{x.delete=['gameData']},
   x=>{x.runtime.files[0].sha256='bad'},x=>{x.runtime.files[1].url='https://attacker.invalid/app.js'}
 ]){const x=manifest();mutate(x);assert.equal(selectVerifiedRuntimeV398Delta(x,'3.97'),null)}
});
