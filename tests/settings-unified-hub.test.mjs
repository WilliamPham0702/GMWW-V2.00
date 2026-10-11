import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const a=html.indexOf('<section class="page" id="settings">');
const b=html.indexOf('</section>',a);
const settings=html.slice(a,b);
const groups={
  settingsGroupHealth:['settingsRunHealth','quickMaintenanceCard','auditLocalData','clearRuntimeCache','reloadApp','gmwwOpsCenter','opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsAutoCheck','serverHealthCard','checkServerHealth','refreshServerData','openPlayerWeb','systemDiagnosticsCard','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'],
  settingsGroupTasks:['gmwwTasksSummary','gmwwTasksOpenList','gmwwTasksHistory','gmwwTasksDoneList','gmwwTasksReload'],
  settingsGroupUpdate:['updateManagerCard','installRuntimeUpdate','downloadNewIPA','syncPlayerWebUpdate'],
  settingsGroupAppearance:['characterScaleCard','characterScaleChoices']
};

test('Every useful settings control lives in one of four boxes on a single scroll screen',()=>{
  assert.equal(Object.keys(groups).length,4);
  for(const [box,ids] of Object.entries(groups)){
    const start=settings.indexOf('id="'+box+'"');
    assert.ok(start>=0,'group missing '+box);
    const next=settings.indexOf('<div class="settings-unified-box"',start+25);
    const section=settings.slice(start,next>=0?next:settings.length);
    for(const id of ids){
      assert.ok(section.includes('id="'+id+'"'),id+' must be grouped in '+box);
      assert.equal(settings.split('id="'+id+'"').length-1,1,'duplicate DOM id '+id);
    }
  }
  assert.ok(settings.indexOf('settingsGroupUpdate')<settings.indexOf('settingsGroupHealth'),'Update must be first');
  assert.ok(settings.indexOf('settingsGroupHealth')<settings.indexOf('settingsGroupTasks'));
  assert.ok(settings.indexOf('gmwwTasksOpenList')<settings.indexOf('gmwwTasksHistory'));
  assert.doesNotMatch(settings,/role="tablist"|role="tabpanel"|settingsHubTab-|settingsHubNav|data-settings-group=/);
  assert.doesNotMatch(settings,/data-settings-panel=|hidden>[\s\S]*settings-hub-panel/);
});

test('Settings removes redundant explanatory notes while keeping live status and all controls',()=>{
  for(const note of [
    'Tất cả công cụ trên cùng một trang',
    'Server, Player Web, phòng chơi, realtime và tự chẩn đoán được đặt chung một nơi.',
    'Công cụ tích hợp trong game: theo dõi Server, phòng chơi, realtime, dữ liệu và phiên bản.'
  ])assert.ok(!settings.includes(note),'Redundant note remains: '+note);
  assert.ok(settings.includes('id="settingsHubMiniHealth"'));
  const order=['settingsGroupUpdate','settingsGroupHealth','settingsGroupTasks','settingsGroupAppearance'];
  const positions=order.map(id=>settings.indexOf('id="'+id+'"'));
  assert.ok(positions.every(p=>p>=0));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  for(const [i,id] of order.entries()){
    const box=settings.slice(positions[i],i+1<order.length?positions[i+1]:settings.length);
    assert.ok(box.includes('<span class="settings-unified-index">'+(i+1<10?'0':'')+(i+1)+'</span>'),id+' has correct ordinal');
  }
});

test('The broken export-report tool is fully removed and replaced with tracked work history',()=>{
  assert.doesNotMatch(settings,/opsExportReport|opsReportFallback|XUẤT BÁO CÁO/);
  assert.doesNotMatch(app,/function gmwwOpsExport\(|getElementById\('opsExportReport'\)/);
  assert.match(settings,/Công việc &amp; Tiến độ|Công việc & Tiến độ/);
  assert.match(app,/function gmwwTasksRefresh\(/);
  assert.match(app,/function gmwwTaskItem\(/);
  assert.match(app,/\/api\/operations\/tasks/);
});

test('Every original, non-export control remains bound to functional JS',()=>{
  for(const id of [
    'checkServerHealth','refreshServerData','openPlayerWeb','installRuntimeUpdate',
    'downloadNewIPA','syncPlayerWebUpdate','auditLocalData','clearRuntimeCache','reloadApp',
    'runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow','opsRunFullAudit',
    'opsCheckRoom','opsCheckRelease','opsAutoCheck','gmwwTasksReload'
  ])assert.ok(app.includes("getElementById('"+id+"')"),'Missing real handler: '+id);
  for(const size of [75,100,125,150,175,200])
    assert.match(settings,new RegExp('data-character-scale="'+size+'"'));
});

test('Tasks prioritise open work while completed records are collapsed into real history',()=>{
  assert.match(settings,/<details class="gmww-task-history" id="gmwwTasksHistory">/);
  assert.match(settings,/id="gmwwTasksOpenList"/);
  assert.match(settings,/id="gmwwTasksDoneList"/);
  assert.match(app,/task\.state==='doing'\?'ĐANG THỰC HIỆN'/);
  assert.match(app,/task\.state==='completed'\?'HOÀN TẤT'/);
  assert.doesNotMatch(app,/localStorage\.clear\(/);
});

test('Timeline chrome is applied across settings, members and library but leaves 2D game art sharp',()=>{
  assert.match(css,/--gmww-glass-surface:/);
  assert.match(css,/#stage \.page:not\(#start\) \.member-summary>div/);
  assert.match(css,/#stage \.page:not\(#start\) \.role-tile/);
  assert.match(css,/#stage \.page:not\(#start\) \.settings-unified-box/);
  assert.match(css,/#settings \.gmww-task-item/);
  assert.match(css,/#bottomNav\{background:var\(--gmww-glass-surface\)/);
  assert.match(css,/No effect on 2D world artwork/);
  assert.match(css,/filter:none!important;backdrop-filter:none!important/);
});

test('Settings navigation defers expensive operations while permitting an opt-in watcher',()=>{
  assert.doesNotMatch(app,/if\(gmwwOpsAutoEnabled\(\)\)setTimeout\(\(\)=>gmwwOpsRun\(\{kind:'all',silent:true\}\),450\)/);
  assert.match(app,/getElementById\('settingsRunHealth'\)/);
  assert.doesNotMatch(app,/gmwwSettingsHubSelect\(|GMWW_SETTINGS_GROUP_KEY|settingsHubNav/);
});
