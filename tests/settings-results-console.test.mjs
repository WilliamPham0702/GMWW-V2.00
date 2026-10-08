import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const start=html.indexOf('<section class="page" id="settings">');
const end=html.indexOf('</section>',start);
const settings=html.slice(start,end);
test('Cài Đặt has no explanatory tools tagline and no redundant group paragraphs',()=>{
  assert.doesNotMatch(settings,/Các công cụ vận hành GMWW|cuộn để xem tất cả/);
  for(const line of settings.split('\n').filter(x=>x.includes('class="settings-unified-heading"'))) assert.doesNotMatch(line,/<p>/);
});
test('The nine operational controls remain buttons or explicit interactive toggle',()=>{
  for(const id of ['opsRunFullAudit','opsCheckRoom','opsCheckRelease','checkServerHealth','refreshServerData','openPlayerWeb','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow'])
    assert.match(settings,new RegExp('<button[^>]+id="'+id+'"'));
  assert.match(settings,/<input id="opsAutoCheck" type="checkbox"/);
});
test('All health and diagnostic outputs share one non-interactive console',()=>{
  const begin=settings.indexOf('id="settingsOperationResults"');
  const end=settings.indexOf('id="settingsGroupTasks"');
  assert.ok(begin>0&&end>begin);
  const panel=settings.slice(begin,end);
  for(const id of ['opsOverall','opsServerState','opsStorageState','opsRealtimeState','opsReleaseState','opsReport','opsAdvice','opsLastChecked','serverHealthDot','serverHealthPill','serverHealthText','healthLatency','healthCheckedAt','diagnosticDot','diagnosticStatus','diagnosticSummary','diagnosticHint','diagnosticList','diagnosticDetail'])
    assert.ok(panel.includes('id="'+id+'"'),'Output belongs to shared console: '+id);
  assert.doesNotMatch(panel,/<button\b|<input\b/);
  for(const id of ['opsRunFullAudit','checkServerHealth','runSystemDiagnostics'])
    assert.ok(settings.indexOf('id="'+id+'"')<begin);
});
test('Read-only outputs render as console rows rather than individual glass buttons',()=>{
  assert.match(settings,/class="settings-operation-console settings-update-console"/);
  assert.match(settings,/class="settings-operation-console settings-task-console"/);
  assert.match(settings,/class="settings-operation-console settings-maintenance-console"/);
  for(const sel of ['.ops-report>div','.ops-status-grid>div','.diagnostic-list>div','.gmww-task-item'])
    assert.ok(css.includes(sel));
  assert.match(css,/V3\.29 — read-only results belong to one operational log/);
  assert.match(css,/\.settings-operation-console \.ops-report>div,[\s\S]*?background:none!important/);
});
