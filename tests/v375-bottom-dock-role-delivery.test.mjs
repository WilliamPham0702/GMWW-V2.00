import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV376Delta} from '../src/gmww-ota-delta.js';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('GM delivery confirmation is inside existing bottom action and has no floating overlay',()=>{
  assert.match(html,/<button[^>]+id="playPhasePill"[^>]*>[\s\S]*?id="playPhaseTitle"[\s\S]*?id="playPhaseHint"/);
  assert.doesNotMatch(html,/id="playDeliveryStatus"/);
  assert.doesNotMatch(css,/\.play-delivery-status/);
  assert.match(css,/#gmTopMenu\.gm-stage-dock-v330 \.gm-top-info-v293\.is-delivery-confirmed/);
});
test('Delivery counts update inside the bottom action when players open role cards',()=>{
  const start=app.indexOf('function renderPlayDeliveryProgress(){');
  const end=app.indexOf('async function applyPlayPlayerState(type){',start);
  assert.ok(start>=0&&end>start);
  const klass=new Set(),calls=[];
  const dock={classList:{toggle(k,v){if(v)klass.add(k);else klass.delete(k)}},
    setAttribute(k,v){calls.push([k,v]);}};
  const title={textContent:'PHÁT VAI'},hint={textContent:'CHẠM ĐỂ TIẾP'};
  const els={playPhasePill:dock,playPhaseTitle:title,playPhaseHint:hint};
  const state={step:'deal'},progress={total:3,delivered:3,received:3,viewed:0,success:true};
  const ctx={document:{getElementById:id=>els[id]||null},playSceneState:state,playDeliveryProgress:()=>progress};
  const fn=vm.runInNewContext(app.slice(start,end)+';renderPlayDeliveryProgress',ctx);
  fn();
  assert.match(title.textContent,/ĐÃ PHÁT VAI THÀNH CÔNG 3\/3/);
  assert.equal(hint.textContent,'Đã nhận đủ: 3/3 · Đã xem Vai Trò: 0/3 · Vào Trận');
  assert.equal(klass.has('is-delivery-confirmed'),true);
  progress.received=1;fn();assert.match(title.textContent,/CHỜ NHẬN 1\/3/);assert.equal(klass.has('is-delivery-confirmed'),false);
  progress.received=3;fn();assert.equal(klass.has('is-delivery-confirmed'),true);
  progress.viewed=2;fn();assert.match(hint.textContent,/2\/3/);
  progress.viewed=3;fn();assert.match(hint.textContent,/3\/3/);
  state.step='battle';fn();assert.equal(klass.has('is-delivery-confirmed'),false);
  assert.equal(hint.textContent,'CHẠM ĐỂ TIẾP');
  assert.ok(calls.some(([name,value])=>name==='aria-label'&&/Chạm để Vào Trận/.test(value)));
});
test('V3.76 UI update is a signed three-file patch only from V3.75',()=>{
  const paths=['GMWW.html','app.js','style.css'],host='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.76/';
  const m={releaseVersion:'3.76',runtimeVersion:'3.76',shellVersion:'3.17',releaseType:'runtime',delete:[],
    runtime:{files:paths.map(path=>({path,url:host+path,sha256:'c'.repeat(64)}))}};
  const selected=selectVerifiedRuntimeV376Delta(m,'3.75');
  assert.deepEqual(selected.runtime.files.map(x=>x.path),paths);
  assert.equal(selected.delete.length,0);
  assert.equal(selected.upgradeMode,'verified-overlay');
  assert.equal(selectVerifiedRuntimeV376Delta(m,'3.72'),null);
  assert.equal(selectVerifiedRuntimeV376Delta({...m,delete:['artwork']},'3.75'),null);
  assert.equal(selectVerifiedRuntimeV376Delta({...m,runtime:{files:m.runtime.files.slice(1)}},'3.75'),null);
  assert.match(worker,/VERSION="V3\.83",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-383"/);
});
