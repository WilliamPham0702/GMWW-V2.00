import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const begin=html.indexOf('<section class="page" id="settings">');
const settings=html.slice(begin,html.indexOf('</section>',begin));

test('All 14 maintenance controls remain in the same horizontal rail with explicit arrow navigation',()=>{
  const ids=['settingsRunHealth','auditLocalData','clearRuntimeCache','reloadApp','opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsAutoCheck','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'];
  const rail=settings.slice(settings.indexOf('id="settingsToolsRail"'),settings.indexOf('id="maintenanceDetail"'));
  assert.equal(ids.length,14);
  for(const id of ids)assert.equal(rail.split('id="'+id+'"').length-1,1,id);
  for(const id of ['settingsToolsPrev','settingsToolsNext','settingsToolsHint','settingsToolsRange','settingsToolsScrollFill'])assert.equal(settings.split('id="'+id+'"').length-1,1,id);
  assert.ok(settings.indexOf('id="settingsToolsPrev"')<settings.indexOf('id="settingsToolsRail"'));
  assert.match(css,/scroll-snap-type:x proximity/);
  assert.match(css,/#settings \.settings-operations-tools\{display:flex!important;flex-flow:row nowrap!important/);
  assert.match(css,/#settings \.settings-tools-arrow:disabled/);
  assert.match(css,/#settings #settingsToolsScrollFill/);
});
test('Browser navigation script parses and has click, scroll, resize and visibility handlers',()=>{
 const code=html.match(/<script id="gmww-settings-tools-navigation">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);
 new vm.Script(code);
 for(const s of ['scrollBy','scrollLeft','scrollWidth','clientWidth','getBoundingClientRect','MutationObserver','ResizeObserver'])assert.ok(code.includes(s),s);
 assert.match(code,/previous\.disabled=!moreLeft/);
 assert.match(code,/next\.disabled=!moreRight/);
 assert.match(code,/rail\.addEventListener\('scroll',refresh/);
 assert.match(code,/window\.addEventListener\('resize',refresh/);
});
