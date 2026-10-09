import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("server-game/current/GMWW.html","utf8");
const css=fs.readFileSync("server-game/current/style.css","utf8");
const app=fs.readFileSync("server-game/current/app.js","utf8");
const member=html.split('<section class="page" id="members">')[1]?.split('<section class="page play-page" id="start">')[0]||"";
test("Trang Thành Viên V3.37 giữ đủ ba nhóm và mọi điều khiển",()=>{
  for(const id of ["memberGroupOverview","memberGroupDirectory","memberGroupRanking","memberTotal","memberOnline","memberGames","memberResetRequests","refreshMembers","addMember","memberSearch","memberFilterRow","memberDirectoryList","memberRankingList","resetRanking"])
    assert.equal(member.split('id="'+id+'"').length-1,1,"Thiếu hoặc trùng: "+id);
  assert.doesNotMatch(member,/id="memberTabs"/);
});
test("Thống kê một hàng, bộ lọc một hàng, member gọn và nút đúng cột",()=>{
  assert.match(css,/#members \.member-summary\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
  assert.match(css,/#members \.member-filter-row\{[\s\S]*?grid-template-columns:\.72fr 1\.06fr/);
  assert.match(css,/#members #memberDirectoryList \.member-card\{[\s\S]*?grid-template-columns:47px minmax\(0,1fr\) 88px!important/);
  assert.match(css,/#members #memberDirectoryList \.member-card-actions\{[\s\S]*?grid-column:3!important/);
  assert.ok(app.includes("status.setAttribute('aria-label'"));
  assert.ok(app.includes('aria-label="Đặt lại mật khẩu thành viên"'));
});
test("Bố cục tinh gọn có hỗ trợ điện thoại hẹp và không can thiệp ảnh làng",()=>{
  assert.match(css,/@media\(max-width:380px\)/);
  assert.match(css,/@media\(max-width:330px\)/);
  assert.match(css,/#members \.member-unified-box/);
  assert.doesNotMatch(css.slice(css.indexOf('/* V3.37 — Thành Viên')),/#start/);
  assert.match(html,/<title>GMWW V3\.52<\/title>/);
});
