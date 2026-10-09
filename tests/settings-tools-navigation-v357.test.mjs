import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const app=readFileSync('server-game/current/app.js','utf8');
const section=html.slice(html.indexOf('<section class="page" id="settings">'),html.indexOf('</section>',html.indexOf('<section class="page" id="settings">')));
const tools=section.slice(section.indexOf('id="settingsToolsRail"'),section.indexOf('id="maintenanceDetail"'));
const ids=['settingsRunHealth','auditLocalData','clearRuntimeCache','reloadApp','opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsAutoCheck','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];
test('All 14 controls are rendered as a full grid and keep their original functional IDs',()=>{
 assert.equal(ids.length,14);
 for(const id of ids)assert.equal(tools.split('id="'+id+'"').length-1,1,id);
 for(const id of ids.filter(i=>i!=='settingsRunHealth'&&i!=='opsAutoCheck'))
    assert.ok(app.includes("getElementById('"+id+"')"),'functional binding: '+id);
 assert.ok(section.includes('id="settingsToolsGridSummary"'));
 assert.ok(section.includes('Cuộn xuống để xem tất cả'));
 assert.match(css,/#settings #settingsToolsRail\.settings-operations-tools\{/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
 assert.match(css,/overflow-x:visible!important/);
 assert.match(css,/scroll-snap-type:none!important/);
});
test('Old horizontal arrows, range readout and inline navigation JavaScript are removed',()=>{
 for(const id of ['settingsToolsPrev','settingsToolsNext','settingsToolsHint','settingsToolsRange','settingsToolsScrollFill'])
   assert.ok(!section.includes('id="'+id+'"'),id+' must not be rendered');
 assert.doesNotMatch(html,/<script id="gmww-settings-tools-navigation"/);
 assert.doesNotMatch(section,/Vuốt ngang|công cụ phía sau/);
 assert.doesNotMatch(css,/\/\* V3\.57: navigation arrows for maintenance rail/);
});
