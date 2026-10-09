import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV353Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const steps=['lobby','room','seats','game','roles','deal','battle'];
const top=Object.fromEntries([...html.matchAll(/data-play-step="([^"]+)"[^>]*><span>\d+<\/span><b>([^<]+)<\/b>/g)].map(match=>[match[1],match[2]]));
const begin=app.indexOf('function playVisibleStageLabel(){');
const end=app.indexOf('function clearStalePlayRoom()',begin);
assert.ok(begin>0&&end>begin,'Shared stage label helper must be present');
const runtime=app.slice(begin,end);
function harness(step,phase='lobby',night=1){
  const title={textContent:'Làng Asahi'},pill={setAttribute(_key,value){this.label=value}};
  const timeline=steps.map(step=>({dataset:{playStep:step},querySelector:()=>({textContent:top[step]})}));
  const state={step,phase,night};
  const ctx={document:{querySelectorAll:()=>timeline,getElementById:id=>({playPhaseTitle:title,playPhasePill:pill}[id]||null)},
    PLAY_STEPS:steps,PLAY_STEP_COPY:Object.fromEntries(steps.map(s=>[s,{t:top[s]}])),playSceneState:state};
  vm.runInNewContext(runtime+'\nglobalThis.applyHeader=renderPlayRealtimeHeader;globalThis.currentLabel=playVisibleStageLabel;',ctx);
  return {title,pill,apply:ctx.applyHeader,current:ctx.currentLabel};
}
test('Every timeline step and the bottom button show the same label on room-state websocket updates',()=>{
  assert.equal(steps.length,7);
  for(const step of steps){const h=harness(step);h.apply();assert.equal(h.title.textContent,top[step]);assert.ok(h.pill.label.includes(top[step]));}
  const h=harness('seats');h.apply();assert.equal(h.title.textContent,'Tập hợp');h.title.textContent='Làng Asahi';h.apply();assert.equal(h.title.textContent,'Tập hợp');
});
test('Day and night labels remain phase-aware',()=>{
 const night=harness('battle','night',2),day=harness('battle','day',2);night.apply();day.apply();
 assert.equal(night.title.textContent,'Đêm 2');assert.equal(day.title.textContent,'Ngày 2');
});
test('All full-scene and realtime updates call the common timeline label source',()=>{
 assert.match(app,/function renderPlayRealtimeHeader\(\)\{[\s\S]*?const label=playVisibleStageLabel\(\)/);
 assert.match(app,/put\('playPhaseTitle',playVisibleStageLabel\(\)\)/);
 assert.doesNotMatch(app,/if\(phase==='lobby'&&title\)title\.textContent=playRoomDisplayName\(\)/);
});
test('IPA V3.17 downloads three changed files from V3.52 or four from V3.51',()=>{
 const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.53/';
 const list=['GMWW.html','app.js','style.css','home-art/home-sea-portal-v352.svg'];
 const manifest={releaseVersion:'3.53',runtimeVersion:'3.53',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:list.map(path=>({path,url:root+path,sha256:'a'.repeat(64)}))}};
 assert.deepEqual(selectVerifiedRuntimeV353Delta(manifest,'3.52').runtime.files.map(f=>f.path),list.slice(0,3));
 assert.deepEqual(selectVerifiedRuntimeV353Delta(manifest,'3.51').runtime.files.map(f=>f.path),list);
 for(const bad of ['3.50','3.53','3.17',''])assert.equal(selectVerifiedRuntimeV353Delta(manifest,bad),null);
 assert.equal(selectVerifiedRuntimeV353Delta({...manifest,delete:['protected']},'3.52'),null);
 assert.equal(selectVerifiedRuntimeV353Delta({...manifest,runtime:{files:manifest.runtime.files.slice(1)}},'3.52'),null);
 assert.equal(selectVerifiedRuntimeV353Delta({...manifest,runtime:{files:[...manifest.runtime.files,manifest.runtime.files[0]]}},'3.52'),null);
});
