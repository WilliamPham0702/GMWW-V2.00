import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const part=html.slice(html.indexOf('id="settingsGroupUpdate"'),html.indexOf('id="settingsGroupTasks"'));

test('Update notes appear once, as compact bullets without old red-marked paragraph',()=>{
 assert.match(html,/id="updateReleaseNotes"/);
 assert.match(html,/class="update-release-list"/);
 assert.match(app,/gmwwRenderReleaseNotes\(manifest\)/);
 assert.doesNotMatch(app,/'Bản cập nhật: '\+gmwwReleaseNotesText\(manifest\)/);
 assert.match(html,/<small class="update-detail" id="updateDetail" hidden><\/small>/);
 assert.match(app,/det\.hidden=repeated\|\|!detail/);
});

test('All existing operations buttons remain in one horizontal, accessible rail',()=>{
 for(const id of ['auditLocalData','clearRuntimeCache','reloadApp','opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsAutoCheck','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow']){
   assert.equal(part.split('id="'+id+'"').length-1,1,id+' missing or duplicated');
 }
 assert.match(css,/#settings \.settings-operations-tools>.settings-tool-inner,#settings \.settings-operations-tools \.health-v236-actions,#settings \.settings-operations-tools \.ops-tools\{display:contents!important\}/);
 assert.match(css,/3\.35/);
 assert.match(css,/4\.12/);
 assert.match(css,/scroll-snap-type:x proximity/);
 const railIndex=part.indexOf('class="settings-operations-tools"');
 const maintenanceIndex=part.indexOf('id="maintenanceDetail"');
 const resultsIndex=part.indexOf('id="settingsOperationResults"');
 assert.ok(railIndex>=0&&maintenanceIndex>railIndex&&resultsIndex>maintenanceIndex);
 assert.equal(part.split('id="maintenanceDetail"').length-1,1);
});

test('Update buttons remain three aligned actions and versioned OTA is V3.50',()=>{
 for(const id of ['installRuntimeUpdate','downloadNewIPA','syncPlayerWebUpdate'])assert.ok(part.includes('id="'+id+'"'),id);
 assert.match(css,/#settings #updateManagerCard \.update-actions-three\{display:grid!important;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(app,/const VERSION='3\.50'/);
 assert.match(html,/<title>GMWW V3\.50<\/title>/);
 assert.match(worker,/VERSION="V3\.50",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-350"/);
});
