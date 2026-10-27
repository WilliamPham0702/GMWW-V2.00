import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const js=fs.readFileSync('server-game/current/app.js','utf8');
const src=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
const ids=['settingsRunHealth','settingsOptimizeDO','auditLocalData','clearRuntimeCache','reloadApp','gmwwCloudflareOpen','gmwwServerTrashOpen','opsRunFullAudit','opsCheckRoom','opsCheckRelease','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];

test('V3.250 retains all 16 maintenance tool buttons and their event labels',()=>{
 assert.equal(ids.length,16);
 assert.match(html,/16 công cụ/);
 for(const id of ids){
  assert.equal(html.split('id="'+id+'"').length-1,1,id+' button once');
  assert.ok(js.includes(id+':'),id+' notice mapping preserved');
 }
 assert.match(html,/id="settingsNoticeList"/);
 assert.match(html,/id="gmwwCloudflarePanel"/);
 assert.match(js,/function gmwwInitSettingsNoticePanel\(/);
});
test('V3.250 fixes every maintenance box to the same height and reduces Cloudflare icon',()=>{
 assert.match(css,/#settings #settingsToolsRail\.settings-operations-tools\{[\s\S]*?grid-auto-rows:82px!important;/);
 assert.match(css,/#settings #settingsToolsRail :is\(\.settings-action,\.ops-auto\)\{[\s\S]*?height:82px!important;[\s\S]*?min-height:82px!important;[\s\S]*?max-height:82px!important;/);
 assert.match(css,/#settings #settingsToolsRail #gmwwCloudflareOpen>span\{[\s\S]*?font-size:17px!important;/);
 assert.match(html,/style\.css\?v=gmww-v3250-cloudflare-uniform-tools/);
});
test('Runtime V3.250 bundles same application source and preserves functional event handlers',()=>{
 assert.match(js,/const VERSION='3\.250';/);
 assert.match(src,/const VERSION='3\.250';/);
 assert.match(js,/getElementById\('reloadApp'\)/);
 assert.match(js,/getElementById\('settingsOptimizeDO'\)/);
 assert.match(html,/id="gmwwCloudflareOpen"/);
 assert.match(html,/id="gmwwServerTrashOpen"/);
});
