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

test('Settings renders five numbered groups and a vertical 14-tool grid',()=>{
 const section=html.slice(html.indexOf('<section class="page" id="settings">'),html.indexOf('</section>',html.indexOf('<section class="page" id="settings">')));
 const ids=['settingsGroupUpdate','settingsGroupErrorReport','settingsGroupHealth','settingsGroupTasks','settingsGroupAppearance'];
 assert.deepEqual([...section.matchAll(/id="(settingsGroup\w+)"/g)].map(m=>m[1]),ids);
 assert.doesNotMatch(section,/id="settingsGroupMaintenance"/);
 for(const control of ['settingsRunHealth','quickMaintenanceCard','gmwwOpsCenter','serverHealthCard','systemDiagnosticsCard','characterScaleChoices'])
   assert.equal(section.split('id="'+control+'"').length-1,1,control);
 assert.match(css,/#settings #settingsToolsRail\.settings-operations-tools\{/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
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

test('Ván Mẫu uses thumbnail toggle selection; Artifact settings live in Ván Mẫu while per-match timing lives in Chọn Ván',()=>{
 const part=html.slice(html.indexOf('id="playGameSheet"'),html.indexOf('id="playEndSheet"'));
 const editor=part.slice(part.indexOf('<div class="play-template-editor-only">'),part.indexOf('<div class="play-template-play-review">'));
 const play=part.slice(part.indexOf('<div class="play-template-play-review">'));
 for(const id of ['playGameRolePicker','playGameRoleList','playGameRoleCount','playTemplateRoleSearch','playTemplateTeamSummary'])assert.ok(editor.includes('id="'+id+'"'),id);
 for(const id of ['playVillageDiscussionSec','playWolfDiscussionSec','playDefaultActionSec','playAutoAdvance','playGameRoleTimingList'])assert.ok(play.includes('id="'+id+'"'),id);
 for(const id of ['playArtifactsEnabled','playArtifactActionSec','playGameArtifactPicker'])assert.ok(editor.includes('id="'+id+'"'),id);
 assert.doesNotMatch(editor,/id="playVillageDiscussionSec"|id="playAutoAdvance"/);
 assert.match(app,/resolveArtwork\('cards',role\.id,'thumb'\)/);
 assert.match(app,/button\.onclick=\(\)=>playTemplateSetCount\(role\.id,chosen\?0:1\)/);
 assert.match(app,/className='play-template-card'/);
 assert.match(app,/function renderPlayGameRoleTimings\(\)/);
 assert.match(app,/function renderPlayArtifactPicker\(\)/);
 assert.match(app,/gameConfig:configured,matchId/);
 assert.match(app,/const cfg=\{id:templateId,name:gameName,playerCount:total,\s*roles:/);
 assert.match(app,/artifacts:selectedArtifacts\.map\(/);
 assert.match(app,/artifactLimitPerCycle/);
 assert.match(html,/id="playVillageDiscussionSec"[^>]*value="300"/);
 for(const field of ['data-role-count','data-role-order','data-role-remove','data-move-up','data-move-down'])assert.ok(app.includes(field),field);
 assert.doesNotMatch(editor,/data-role-duration/);
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
