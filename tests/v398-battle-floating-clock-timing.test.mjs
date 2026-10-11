import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV398Delta} from '../src/gmww-ota-delta.js';

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
  for(const id of ['battleInfoToggle','battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
    assert.ok(wolf.includes('id="'+id+'"'),id+' missing from GM wolf');
  assert.equal((html.match(/id="battleGMAuto"/g)||[]).length,1);
  assert.equal((html.match(/id="battleGMAudio"/g)||[]).length,1);
  assert.match(css,/#playBattleClockFloat\.battle-clock-float-v396/);
  assert.match(css,/#playBattleDock\.battle-float-v396/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(app,/function initBattleFloatingClock\(/);
  assert.match(app,/playSceneState\.step==='battle';top\.hidden=!visible;dock\.hidden=!visible;const clockFloat=/);
  assert.match(app,/document\.getElementById\('battleGMAuto'\)\?\.addEventListener\('click'/);
  assert.match(app,/document\.getElementById\('battleGMAudio'\)\?\.addEventListener\('click'/);
});

test('Clock can move freely, stays inside viewport and persists its own position',()=>{
  const src=app.slice(app.indexOf('function initBattleFloatingClock(){'),app.indexOf('function initBattleControls(){'));
  assert.ok(src.startsWith('function initBattleFloatingClock(){'));
  const listeners={};
  const storage=new Map();
  const clock={
    dataset:{},style:{},offsetWidth:78,offsetHeight:58,
    addEventListener:(name,fn)=>{listeners[name]=fn},
    getBoundingClientRect(){return{left:Number.parseFloat(this.style.left)||12,top:Number.parseFloat(this.style.top)||150}},
    setPointerCapture(){}
  };
  const win={innerWidth:390,innerHeight:844,addEventListener(){}};
  const context={document:{getElementById:()=>clock},window:win,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    JSON,Math,Number};
  vm.runInNewContext(src+'\ninitBattleFloatingClock();',context);
  assert.equal(clock.dataset.ready,'1');
  const ev=(x,y)=>({pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
  listeners.pointerdown(ev(20,160));listeners.pointermove(ev(160,260));listeners.pointerup(ev(160,260));
  assert.ok(Number.parseFloat(clock.style.left)>100);
  assert.ok(Number.parseFloat(clock.style.top)>150);
  assert.ok(storage.has('GMWW_BATTLE_CLOCK_POS_V396'));
  listeners.dblclick();
  assert.equal(storage.has('GMWW_BATTLE_CLOCK_POS_V396'),false);
});

test('Chọn Ván configures separate wolf introduction 30s and opening Artifact 60s',()=>{
  for(const id of ['playWolfDiscussionSec','playEarlyArtifactSec'])
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  assert.match(html,/id="playWolfDiscussionSec"[^>]*value="30"/);
  assert.match(html,/id="playEarlyArtifactSec"[^>]*value="60"/);
  assert.match(app,/gameTiming:\{villageDiscussionSec:300,wolfDiscussionSec:30,earlyArtifactSec:60/);
  assert.match(app,/playEarlyArtifactSec:'earlyArtifactSec'/);
  assert.match(app,/earlyArtifactSec:clamp\(document\.getElementById\('playEarlyArtifactSec'\)/);
  assert.match(server,/wolfDiscussionSec:clampSec\(v\?\.timing\?\.wolfDiscussionSec\?\?v\?\.wolfDiscussionSec\?\?30\)/);
  assert.match(server,/earlyArtifactSec:clampSec\(v\?\.timing\?\.earlyArtifactSec\?\?v\?\.earlyArtifactSec\?\?60\)/);
  assert.match(server,/kind:"wolf-introduction",label:"Bầy Sói",durationSec:wolfDiscussionSec/);
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
