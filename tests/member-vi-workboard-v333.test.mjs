import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {normalizeGmwwTasks} from "../src/gmww-task-board.js";

const html=fs.readFileSync("server-game/current/GMWW.html","utf8");
const css=fs.readFileSync("server-game/current/style.css","utf8");
const app=fs.readFileSync("server-game/current/app.js","utf8");
const start=html.indexOf('<section class="page" id="members">');
const end=html.indexOf('<section class="page play-page" id="start">',start);
const memberHtml=html.slice(start,end);

test("Trang Thành Viên có ba nhóm chức năng như trang Cài Đặt, không có tab",()=>{
  assert.ok(start>=0&&end>start);
  const groups=["memberGroupOverview","memberGroupDirectory","memberGroupRanking"];
  for(const [i,id] of groups.entries()){
    assert.ok(memberHtml.includes('id="'+id+'"'));
    assert.ok(memberHtml.includes('class="member-unified-index">0'+(i+1)+'</span>'));
    if(i)assert.ok(memberHtml.indexOf(groups[i-1])<memberHtml.indexOf(id));
  }
  assert.doesNotMatch(memberHtml,/id="memberTabs"|data-member-tab=/);
  assert.match(css,/#members \.member-unified-box/);
  assert.match(css,/background:var\(--gmww-glass-surface\)/);
});

test("Thành Viên giữ nguyên công cụ và cả danh sách, bảng xếp hạng luôn hiển thị",()=>{
  for(const id of ["memberTotal","memberOnline","memberGames","memberResetRequests","addMember","refreshMembers",
    "memberSearch","memberFilterRow","memberDirectoryList","memberRankingList","resetRanking"])
    assert.equal(memberHtml.split('id="'+id+'"').length-1,1,"Mã điều khiển bị thiếu hoặc trùng: "+id);
  assert.match(memberHtml,/memberPane-directory/);
  assert.match(memberHtml,/memberPane-ranking/);
  assert.match(css,/#members \.member-pane,#members \.member-pane.active\{display:block/);
  assert.match(app,/function switchMemberTab\(tab\)/);
  assert.ok(app.includes('title="Đặt lại mật khẩu"'));
  assert.match(app,/aria-label=\"Đặt lại mật khẩu thành viên\"/);
});

test("Nội dung công việc cũ tiếng Anh hiển thị bằng tiếng Việt",()=>{
  for(const [number,title] of [[50,"P0 — Bảo mật đăng nhập và quyền GM"],[51,"P1 — Trung tâm vận hành"],[52,"P2 — Tối ưu hình ảnh"]]){
    const [task]=normalizeGmwwTasks([{
      number,title,state:"open",labels:[],
      body:"## Work remaining\nCurrent deployment should review existing authentication and performance requirements."
    }]).open;
    assert.match(task.summary,/[à-ỹđ]/i);
    assert.doesNotMatch(task.summary,/Current deployment|Work remaining/);
  }
});

test("Mô tả công việc tiếng Việt từ GitHub được giữ lại nguyên ý",()=>{
  const x=normalizeGmwwTasks([{
    number:98,title:"P1 — Việt hóa công việc",state:"open",
    body:"## Yêu cầu\n- Cần hiển thị đầy đủ công việc bằng tiếng Việt trên trang Cài Đặt."
  }]).open[0];
  assert.match(x.summary,/Cần hiển thị đầy đủ công việc bằng tiếng Việt/);
});
