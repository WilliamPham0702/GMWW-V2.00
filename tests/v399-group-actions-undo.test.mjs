import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {groupConfiguredRoleTurns,combineConfiguredTurns} from '../src/gmww-night-turn-rules.js';
import {selectVerifiedRuntimeV399Delta} from '../src/gmww-ota-delta.js';
await import('../server-game/current/battle-controls.js');
const controls=globalThis.GMWW_BATTLE_CONTROLS;
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const server=fs.readFileSync('src/index.js','utf8');

test('Sói Thường and Sói Trùm order 6 create ONE waking turn numbered 6',()=>{
 const mirror={artifactId:'mirror',artifactName:'Tráng Gương',loginId:'wolf1',playerId:'member:wolf1'};
 const base=[
  {id:'role:normal',kind:'role',order:6,roleId:'normal',label:'Sói Thường',
   loginIds:['wolf1'],artifacts:[mirror],durationSec:30},
  {id:'role:leader',kind:'role',order:6,roleId:'leader',label:'Sói Trùm',
   loginIds:['wolf2'],artifacts:[],durationSec:50},
  {id:'role:seer',kind:'role',order:7,roleId:'seer',label:'Tiên Tri',
   loginIds:['seer'],artifacts:[],durationSec:30}
 ];
 const scheduled=groupConfiguredRoleTurns(base);
 assert.equal(scheduled.length,2);
 assert.equal(scheduled[0].kind,'role-group');
 assert.equal(scheduled[0].order,6);
 assert.deepEqual(scheduled[0].loginIds,['wolf1','wolf2']);
 assert.deepEqual(scheduled[0].roles.map(r=>r.roleId),['normal','leader']);
 assert.equal(scheduled[0].durationSec,50);
 assert.equal(scheduled[1].order,7);
 const queue=[{kind:'wolf-introduction',id:'intro'},
  {kind:'early-artifact-window',id:'early'},...combineConfiguredTurns(scheduled,[]),
  {kind:'village-wakeup',id:'wake'}];
 const timeline=controls.timeline('night',{queue,cursor:2,completed:false},1,[]);
 assert.equal(timeline.filter(t=>t.displayNumber===3).length,1);
 assert.equal(timeline[2].displayNumber,3);
 assert.equal(timeline[3].displayNumber,4);
});

test('shared wolf bite is listed once, distinct Artifact remains available and tied to its owner',()=>{
 const rows=groupConfiguredRoleTurns([
  {id:'role:normal',kind:'role',order:6,roleId:'normal',label:'Sói Thường',
   loginIds:['wolf1'],artifacts:[{artifactId:'mirror',artifactName:'Tráng Gương',loginId:'wolf1',playerId:'member:wolf1'}]},
  {id:'role:leader',kind:'role',order:6,roleId:'leader',label:'Sói Trùm',loginIds:['wolf2'],artifacts:[]}
 ]);
 const catalog={
  cards:[
   {id:'normal',functions:[{id:'attack',actionId:'wolf-bite',targetCount:1,effectIds:['bite']}]},
   {id:'leader',functions:[{id:'attack',actionId:'wolf-bite',targetCount:1,effectIds:['bite']}]}
  ],
  artifacts:[{id:'mirror',functions:[{id:'copy',actionId:'copy',targetCount:1}]}],
  actions:{role:[{id:'wolf-bite',name:'Sói Cắn'}],artifacts:[{id:'copy',name:'Tráng Gương'}]}
 };
 const actions=controls.actionsForTurn(rows[0],1,catalog,[]);
 assert.equal(actions.length,2);
 assert.equal(actions.filter(a=>a.name==='Sói Cắn').length,1);
 const bite=actions.find(a=>a.name==='Sói Cắn');
 assert.deepEqual(bite.actorIds,['wolf1','wolf2']);
 assert.deepEqual(bite.roleIds,['normal','leader']);
 const artifact=actions.find(a=>a.artifactId==='mirror');
 assert.ok(artifact);assert.deepEqual(artifact.actorIds,['wolf1']);
 assert.equal(controls.actionsForTurn(rows[0],1,catalog,[{artifactId:'mirror',playerId:'member:wolf1'}]).length,1);
});

test('only the bottom ACTION tray holds role & Artifact actions, with two target selection methods',()=>{
 const tray=html.split('id="battleActionTray"')[1]?.split('id="battleUndoFloat"')[0]||'';
 assert.match(tray,/id="battleActionBar"/);
 assert.match(tray,/battle-action-scroll/);
 for(const id of ['battleTargetSheet','battleTargetPrompt','battleTargetCandidates','battleTargetConfirm','battleTargetCancel','battleUndoFloat','battleUndoButton'])
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(css,/overflow-x:auto!important/);
 assert.match(css,/#battleActionTray\.battle-action-tray-v399/);
 assert.match(css,/#battleUndoFloat\.battle-undo-float-v399/);
 assert.match(app,/function battleOpenTargetSheet\(actionId/);
 assert.match(app,/now-last\.at<420/);
 assert.match(app,/getElementById\('battleActionBar'\)\?\.addEventListener\('pointerdown'/);
 assert.match(app,/battleResolveDropTarget\(e\.clientX,e\.clientY,nodes,allowed\)/);
 assert.match(app,/picker\.classList\.toggle\('is-confirm-only'/);
 assert.match(app,/candidates\.hidden=targetReady/);
 assert.match(app,/battleConfirm\(true\)/);
 assert.match(app,/async function battleUndoLast\(/);
 assert.match(server,/async gmBattleAction\(request,body\)/);
 assert.match(server,/async gmBattleUndo\(request,body\)/);
 assert.match(server,/UNDO_STATE_CHANGED/);
 assert.match(server,/ACTOR_CANNOT_ACT/);
});

test('V3.98->V3.99 OTA requires four SHA-pinned files including new battle-controls.js',()=>{
 const paths=['GMWW.html','app.js','style.css','battle-controls.js'];
 const root='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.99/';
 const manifest=()=>({releaseVersion:'3.99',runtimeVersion:'3.99',shellVersion:'3.17',
  releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:root+path,sha256:'c'.repeat(64)}))}});
 const selected=selectVerifiedRuntimeV399Delta(manifest(),'3.98');
 assert.deepEqual(selected.runtime.files.map(row=>row.path),paths);
 assert.deepEqual(selected.delete,[]);
 assert.equal(selected.optimizedFromVersion,'3.98');
 for(const from of ['3.97','3.99','3.94'])assert.equal(selectVerifiedRuntimeV399Delta(manifest(),from),null);
 const broken=manifest();broken.runtime.files=broken.runtime.files.filter(f=>f.path!=='battle-controls.js');
 assert.equal(selectVerifiedRuntimeV399Delta(broken,'3.98'),null);
 const injected=manifest();injected.delete=['save-game'];
 assert.equal(selectVerifiedRuntimeV399Delta(injected,'3.98'),null);
 const malicious=manifest();malicious.runtime.files[3].url='https://evil.invalid/js';
 assert.equal(selectVerifiedRuntimeV399Delta(malicious,'3.98'),null);
});
