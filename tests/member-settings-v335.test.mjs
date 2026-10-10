import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("server-game/current/GMWW.html","utf8");
const css=fs.readFileSync("server-game/current/style.css","utf8");
const app=fs.readFileSync("server-game/current/app.js","utf8");
const section=html.slice(html.indexOf('<section class="page" id="members">'),html.indexOf('<section class="page play-page" id="start">'));
const settings=html.slice(html.indexOf('<section class="page" id="settings">'),html.indexOf('  </main>',html.indexOf('<section class="page" id="settings">')));
test("Xếp hạng mặc định thu gọn, mở được và vẫn giữ resetRanking",()=>{
  assert.match(section,/<details class="member-unified-box member-ranking-collapse" id="memberGroupRanking">/);
  assert.doesNotMatch(section,/<details[^>]*id="memberGroupRanking"[^>]*open/);
  assert.match(section,/<summary class="member-unified-heading"/);
  assert.match(css,/#members #memberGroupRanking:not\(\[open\]\) #memberPane-ranking\{display:none!important\}/);
  assert.match(section,/id="resetRanking"/);
});
test("Trạng thái có đèn xanh đỏ và tài khoản cực gọn, vẫn có nút quản trị an toàn",()=>{
  assert.match(app,/status\.textContent=''/);
  assert.match(app,/status\.setAttribute\('aria-label',m\.online\?'Trực tuyến':'Ngoại tuyến'\)/);
  assert.match(css,/#members #memberDirectoryList \.member-status\.online\{/);
  assert.match(css,/#members #memberDirectoryList \.member-status\{/);
  assert.match(css,/min-height:52px!important/);
  assert.match(app,/aria-label="Đặt lại mật khẩu thành viên"/);
  assert.match(app,/aria-label="Xóa thành viên"/);
});
test("Bảo trì gộp Kiểm tra thành khung 02, Công việc 03, Giao diện 04",()=>{
  const groups=["settingsGroupUpdate","settingsGroupErrorReport","settingsGroupHealth","settingsGroupTasks","settingsGroupAppearance"];
  assert.ok(settings.includes('id="quickMaintenanceCard"'));
  assert.ok(settings.includes('id="settingsRunHealth"'));
  let prev=-1;
  for(const [i,id] of groups.entries()){
    const p=settings.indexOf('id="'+id+'"');assert.ok(p>prev,id);prev=p;
    const part=settings.slice(p,settings.indexOf('<div class="settings-unified-box"',p+10)<0?settings.length:settings.indexOf('<div class="settings-unified-box"',p+10));
    assert.match(part,new RegExp('settings-unified-index">0'+(i+1)+'<'));
  }
});
test("Kiểm tra tự động 2 phút cùng hàng với ba thao tác",()=>{
  const ops=settings.slice(settings.indexOf('class="ops-tools"'),settings.indexOf('id="serverHealthCard"'));
  assert.match(ops,/id="opsRunFullAudit"/);
  assert.match(ops,/id="opsCheckRoom"/);
  assert.match(ops,/id="opsCheckRelease"/);
  assert.match(ops,/id="opsAutoCheck"/);
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
});
test("Thanh tiến trình không bịa phần trăm và chỉ 100 khi có xác nhận hoàn thành",()=>{
  for(const id of ["updateProgress","updateProgressFill","updateProgressPercent","updateProgressTitle"])
    assert.match(settings,new RegExp('id="'+id+'"'));
  assert.match(app,/function gmwwSetUpdateProgress/);
  assert.match(app,/onProgress\(event=\{\}\)/);
  assert.match(app,/Number\.isFinite\(percent\)/);
  assert.match(app,/gmwwSetUpdateProgress\('done',100,'Đã tải và cài Runtime'\)/);
  assert.match(app,/gmwwSetUpdateProgress\('done',100,'Máy chủ đã xác nhận đồng bộ Web'\)/);
  assert.doesNotMatch(app,/setInterval\([^\n]*gmwwSetUpdateProgress/);
});
