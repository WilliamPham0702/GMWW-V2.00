import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const js=fs.readFileSync('server-game/current/app.js','utf8');
const ids=['settingsRunHealth','settingsOptimizeDO','auditLocalData','clearRuntimeCache','reloadApp','gmwwCloudflareOpen','gmwwServerTrashOpen','opsRunFullAudit','opsCheckRoom','opsCheckRelease','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];
test('V3.251 giữ nguyên 16 công cụ bảo trì và đường xử lý',()=>{
 assert.equal(ids.length,16);
 assert.match(html,/16 công cụ/);
 for(const id of ids){
  assert.equal(html.split('id="'+id+'"').length-1,1,id);
  assert.ok(js.includes(id+':'),'Missing notice mapping: '+id);
 }
 assert.match(html,/id="gmwwCloudflarePanel"/);
 assert.match(html,/id="settingsNoticeList"/);
});
test('Cloudflare và 15 công cụ cùng cao 82px, biểu tượng mây 17px',()=>{
 assert.match(css,/#settings #settingsToolsRail.settings-operations-tools\{[\s\S]*?grid-auto-rows:82px!important;/);
 assert.match(css,/#settings #settingsToolsRail :is\(\.settings-action,\.ops-auto\)\{[\s\S]*?height:82px!important;[\s\S]*?min-height:82px!important;[\s\S]*?max-height:82px!important;/);
 assert.match(css,/#settings #settingsToolsRail #gmwwCloudflareOpen>span\{[\s\S]*?font-size:17px!important;/);
 assert.match(html,/style\.css\?v=gmww-v3251-cloudflare-tiles/);
});
test('Giữ nguyên thiết lập các lá Vai Trò của Runtime V3.250',()=>{
 assert.match(js,/const VERSION='3\.251';/);
 assert.match(js,/applyNight02Rules|applyV210Rules/);
 assert.match(js,/role_old_witch/);
 assert.match(js,/settingsOptimizeDO/);
});
