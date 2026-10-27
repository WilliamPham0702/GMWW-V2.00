import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const ids=['settingsRunHealth','settingsOptimizeDO','auditLocalData','clearRuntimeCache','reloadApp','gmwwCloudflareOpen','gmwwServerTrashOpen','opsRunFullAudit','opsCheckRoom','opsCheckRelease','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];
const start=html.indexOf('<div class="settings-operations-tools" id="settingsToolsRail"');
const end=html.indexOf('<section class="settings-notice-panel" id="settingsNoticePanel"',start);
const block=html.slice(start,end);
const controls=[...block.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>|<label\b[^>]*class="ops-auto"[\s\S]*?<\/label>/g)].map(x=>x[0]);
test('16 công cụ có nguyên ID, handler và checkbox giám sát 2 phút',()=>{
 assert.ok(start>0&&end>start);
 assert.equal(controls.length,17);
 assert.equal(ids.length,16);
 for(const id of ids){
  assert.equal(controls.filter(c=>c.includes('id="'+id+'"')).length,1,id);
  assert.ok(app.includes(id+':'),'Settings Notice handler missing: '+id);
 }
 assert.equal(controls.filter(c=>c.includes('id="opsAutoCheck"')).length,1);
 assert.match(html,/id="settingsNoticeList"/);
 assert.match(html,/id="gmwwCloudflarePanel"/);
});
test('iPhone grid has flat 17 direct children, not a nested card grid',()=>{
 assert.equal((block.match(/<div\b/g)||[]).length,1,'one direct grid container');
 assert.equal((block.match(/<\/div>/g)||[]).length,1,'one grid ending');
 assert.doesNotMatch(block,/settings-tool-inner|health-v236-actions|ops-tools/);
 assert.match(block,/id="settingsRunHealth"/);
 assert.match(block,/id="checkPlayerWebNow"/);
});
test('Every box exactly Healthy Check size across 3/2/4 columns with no CSS auto height',()=>{
 const begin=css.indexOf('/* GMWW V3.252');
 assert.ok(begin>0);
 const fix=css.slice(begin);
 assert.match(fix,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(fix,/grid-auto-rows:76px!important/);
 assert.match(fix,/> :is\(button\.settings-action,label\.ops-auto\)/);
 assert.match(fix,/height:76px!important;min-height:76px!important;max-height:76px!important/);
 assert.match(fix,/#gmwwCloudflareOpen > span/);
 assert.match(fix,/font-size:17px!important/);
 assert.match(fix,/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(fix,/repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(html,/style\.css\?v=gmww-v3252-compact-tools/);
});
test('No gameplay/role edits: GM V3.252 version is synchronized in packaged JS',()=>{
 assert.match(app,/const VERSION='3\.252'/);
 assert.match(app,/applyNight02Rules|applyV210Rules/);
});
