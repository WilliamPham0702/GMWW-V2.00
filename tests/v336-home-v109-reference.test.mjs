import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("server-game/current/GMWW.html","utf8");
const css=fs.readFileSync("server-game/current/style.css","utf8");
const app=fs.readFileSync("server-game/current/app.js","utf8");
const start=html.indexOf('<section class="page active" id="home"');
const end=html.indexOf('<section class="page" id="members">',start);
const home=html.slice(start,end);
test("Trang Chủ V3.51 giữ nút Vào Làng, ba thẻ và dữ liệu thật",()=>{
 assert.ok(start>0&&end>start);
 assert.match(home,/gmww-home-rebuild-v350/);
 for(const id of ["gmwwHomeEnterVillage","gmwwHomeOpenRanking","gmwwHomeRefresh","gmwwHomeMemberCount","gmwwHomeOnlineCount","gmwwHomePlaysCount","gmwwHomeLeaderboard","gmwwHomeRecentResult"])assert.equal(home.split('id="'+id+'"').length-1,1,id);
 assert.ok(home.includes("home-fantasy-hero-v337.webp"));
 assert.equal((home.match(/class="gmww-home-tiles-v350(?: [^"]+)?"/g)||[]).length,1);
});
test("Điều hướng Trang Chủ gọi luồng cũ để không làm mất trạng thái chơi",()=>{
  assert.match(home,/data-home-destination="members"/);
  assert.match(home,/data-home-destination="library"/);
  assert.doesNotMatch(home.slice(home.indexOf('class="gmww-home-explore"'),home.indexOf('class="gmww-home-achievements"')), /data-home-destination="settings"/,"Trang Chủ không được chứa liên kết Cài đặt theo yêu cầu mới");
  assert.doesNotMatch(home,/class="gmww-home-top"/,"Trang Chủ không còn hồ sơ trên cùng");
  assert.match(app,/function gmwwHomeNavigate\(target\)/);
  assert.match(app,/if\(nav\)nav\.click\(\)/);
  assert.match(app,/gmwwHomeEnterVillage/);
  assert.match(app,/gmwwHomeAllRecent=!gmwwHomeAllRecent/);
});
test("Thông tin Trang Chủ lấy từ API và không bịa số liệu",()=>{
  assert.match(app,/function gmwwHomeRenderMembers\(rows\)/);
  assert.match(app,/gmApi\('\/api\/gm\/members'\)/);
  assert.match(app,/fetch\(GMWW_SERVER_BASE\+'\/api\/health\?home='/);
  assert.match(app,/Promise\.allSettled/);
  assert.match(app,/Chưa kết nối được dữ liệu thành viên/);
  assert.match(app,/Không tải được lịch sử/);
  assert.match(app,/rows\.filter\(m=>m\?\.online\)/);
  assert.match(app,/memberStats\(m\)\.games/);
});
test("Trang Chủ tuân theo theme Biển trên điện thoại, chỉ bổ sung CSS cho home",()=>{
  assert.match(css,/#home \.gmww-home-hero/);
  assert.match(css,/#home \.gmww-home-shortcuts/);
  assert.match(css,/@media\(max-width:380px\)/);
  assert.match(css,/gmww-village-day-v260\.webp/);
  assert.doesNotMatch(css.slice(css.indexOf('/* GMWW V3.37 — Trang Chủ')),/#start/);
  assert.match(html,/<title>GMWW V3\.55<\/title>/);
});


test("Trang Chủ dùng artwork thật trong thư mục home-art",()=>{
 const images=[...home.matchAll(/src="home-art\/([^"]+\.(?:webp|svg))"/g)].map(m=>m[1]);
 assert.deepEqual(images,["home-fantasy-hero-v337.webp","home-sea-portal-v354.svg","home-sea-cards-v354.svg","home-sea-members-v354.svg","home-sea-templates-v354.svg"]);
 for(const file of images)assert.ok(fs.existsSync("server-game/current/home-art/"+file));
 assert.match(home,/data-home-library-tab="templates"/);
});
test("Trang Chủ mới hiển thị ba thẻ và điều hướng năm mục",()=>{
 const labels=["Bộ Bài","Thành Viên","Ván Mẫu"].filter(label=>home.includes("<b>"+label+"</b>"));
 assert.deepEqual(labels,["Bộ Bài","Thành Viên","Ván Mẫu"]);
 assert.match(html,/id="bottomNav"/);
 assert.ok(html.includes("style.css?v=3.55-theme-home"));
 assert.match(home,/gmww-home-rebuild-v350/);
 for(const n of [3,6,1])assert.ok(!home.includes(">"+n+"</strong>"),"No fabricated counters");
 assert.ok(app.includes("function gmwwHomeRenderExtras(rows,ranking,leader)"));
});
test('Trang Chủ biển: 5 chức năng menu thực, bảng hiệu không chồng lớp và 2D không khung',()=>{const nav=html.slice(html.indexOf('<nav id="bottomNav"'),html.indexOf('</nav>',html.indexOf('<nav id="bottomNav"')));assert.deepEqual([...nav.matchAll(/data-page="([^"]+)"/g)].map(x=>x[1]),['home','members','start','library','settings']);assert.doesNotMatch(nav,/aria-hidden="true"[^>]*data-page="settings"/);assert.match(css,/GMWW V3\.47: edge-to-edge fantasy coast/);assert.doesNotMatch(home,/class="gmww-home-brand"/);});
