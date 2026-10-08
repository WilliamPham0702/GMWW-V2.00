import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GMWW_TASK_SNAPSHOT} from '../src/gmww-task-snapshot.js';
import {normalizeGmwwTasks} from '../src/gmww-task-board.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('Settings renders exactly four numbered groups and one horizontal Health tools rail',()=>{
 const section=html.slice(html.indexOf('<section class="page" id="settings">'),html.indexOf('</section>',html.indexOf('<section class="page" id="settings">')));
 const ids=['settingsGroupUpdate','settingsGroupHealth','settingsGroupTasks','settingsGroupAppearance'];
 assert.deepEqual([...section.matchAll(/id="(settingsGroup\w+)"/g)].map(m=>m[1]),ids);
 assert.doesNotMatch(section,/id="settingsGroupMaintenance"/);
 for(const control of ['settingsRunHealth','quickMaintenanceCard','gmwwOpsCenter','serverHealthCard','systemDiagnosticsCard','characterScaleChoices'])
   assert.equal(section.split('id="'+control+'"').length-1,1,control);
 assert.match(css,/#settings \.settings-operations-tools\{display:flex!important;flex-flow:row nowrap!important;overflow-x:auto!important/);
 assert.match(css,/#settings #characterScaleChoices\{display:flex!important;flex-wrap:nowrap!important/);
});

test('Opening Settings does not trigger long health, GitHub or operations calls',()=>{
 const trigger=app.slice(app.indexOf('document.querySelectorAll(\'[data-page="settings"]\')'),app.indexOf('window.addEventListener(\'online\''));
 assert.doesNotMatch(trigger,/checkServerHealth\(|gmwwOpsRun\(|gmwwTasksRefresh\(/);
 assert.match(app,/getElementById\('settingsRunHealth'\)/);
 assert.match(app,/localStorage\.getItem\(GMWW_OPS_AUTO_KEY\)==='1'/);
});

test('Workboard fallback is a real recorded public issue snapshot',()=>{
 const data=normalizeGmwwTasks(GMWW_TASK_SNAPSHOT);
 assert.ok(data.open.length>0);
 assert.ok(data.history.length>0);
 assert.ok(data.open.every(t=>/^https:\/\/github\.com\/WilliamPham0702\/GMWW-V2\.00\/issues\/\d+$/.test(t.url)));
 assert.match(worker,/github_public_snapshot/);
 assert.match(worker,/fallback:true/);
 assert.match(app,/data\.fallback\?'BẢN DỰ PHÒNG/);
});

test('Game template editing restores V1.09-style roles, timings, artifacts and deletion',()=>{
 const part=html.slice(html.indexOf('id="playGameSheet"'),html.indexOf('id="playEndSheet"'));
 for(const id of ['playGameRoleList','playGameRolePicker','playGameDelete','playTemplateRoleSearch','playVillageDiscussionSec','playWolfDiscussionSec','playDefaultActionSec','playAutoAdvance','playArtifactsEnabled'])assert.ok(part.includes('id="'+id+'"'),id);
 for(const field of ['data-role-count','data-role-order','data-role-duration','data-role-remove','data-move-up','data-move-down'])assert.ok(app.includes(field),field);
 assert.match(app,/function playTemplateRenderCatalog\(\)/);
 assert.match(app,/function playTemplateMoveRole\(id,delta\)/);
 assert.match(app,/playSceneState\.gameTiming=\{/);
 assert.match(app,/playFavoriteArtifacts\(\)\.map/);
 assert.doesNotMatch(app,/playSceneState\.artifactsEnabled=false;\s*playSceneState\.gameTiming=\{villageDiscussionSec:180,wolfDiscussionSec:60,defaultActionSec:30,autoAdvance:true\};\s*const cfg=/);
});

test('Authenticated template deletion removes only the requested stored template',async()=>{
 const begin=worker.indexOf('  async gameTemplateDelete(id){'),end=worker.indexOf('  async gameTemplateUpsert(body){',begin);
 assert.ok(begin>=0&&end>begin);
 const fn=vm.runInNewContext('({'+worker.slice(begin,end)+'}).gameTemplateDelete',{j:(data,status=200)=>({status,...data}),Number,String});
 const records=new Map([['gameTemplate:unit-a',{id:'unit-a'}],['gameTemplate:unit-b',{id:'unit-b'}]]);
 const actor={ctx:{storage:{get:async k=>records.get(k),delete:async k=>records.delete(k)}}};
 const response=await fn.call(actor,'unit-a');
 assert.equal(response.ok,true);
 assert.equal(records.has('gameTemplate:unit-a'),false);
 assert.equal(records.has('gameTemplate:unit-b'),true);
 assert.match(worker,/gmTemplateGet&&request\.method==="DELETE"\)\{if\(bearer\(request\)!==GM_SYNC_TOKEN\)/);
});

test('Forced end returns GM to the first lobby stage and publishes OTA release notes',()=>{
 const end=app.slice(app.indexOf('async function confirmPlayEndGame(){'),app.indexOf('function playRosterSelectedIds()'));
 assert.match(end,/playSceneState\.step='lobby'/);
 assert.match(end,/disconnectPlaySocket\(\)/);
 assert.match(app,/gmwwReleaseNotesText\(manifest\)/);
 assert.match(html,/id="updateReleaseNotes"/);
 const prep=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
 assert.match(prep,/releaseNotes:/);
});
