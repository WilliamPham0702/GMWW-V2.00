import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("server-game/current/GMWW.html","utf8");
const css=fs.readFileSync("server-game/current/style.css","utf8");
const app=fs.readFileSync("server-game/current/app.js","utf8");
const start=html.indexOf('<section class="page active" id="home"');
const end=html.indexOf('<section class="page" id="members">',start);
const home=html.slice(start,end);
test("Trang Chủ V3 thay placeholder, giữ cấu trúc trải nghiệm V1",()=>{
  assert.ok(start>0&&end>start);
  assert.doesNotMatch(home,/Sẽ xây dựng sau|Quản Trò Ma Sói<\/h1>/);
  for(const id of ["gmwwHomeEnterVillage","gmwwHomeOpenRanking","gmwwHomeRefresh","gmwwHomeServerState","gmwwHomeMemberCount","gmwwHomeOnlineCount","gmwwHomePlaysCount","gmwwHomeLeaderboard","gmwwHomeRecentResult"])
    assert.equal(home.split('id="'+id+'"').length-1,1,id);
  for(const cls of ["gmww-home-hero","gmww-home-entry","gmww-home-explore","gmww-home-achievements","gmww-home-recent"])assert.match(home,new RegExp(cls));
  assert.match(home,/src="home-art\/home-fantasy-hero-v337.webp"/);
});
test("Điều hướng Trang Chủ gọi luồng cũ để không làm mất trạng thái chơi",()=>{
  assert.match(home,/data-home-destination="members"/);
  assert.match(home,/data-home-destination="library"/);
  assert.doesNotMatch(home.slice(home.indexOf('class="gmww-home-explore"'),home.indexOf('class="gmww-home-achievements"')), /data-home-destination="settings"/,"Trang Chủ không được chứa liên kết Cài đặt theo yêu cầu mới");
  assert.match(home,/<b>WilliamPham<\/b>/,"Thương hiệu Trang Chủ phải là WilliamPham");
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
  assert.match(html,/<title>GMWW V3\.42<\/title>/);
});


test("Trang Chủ V3.37 hiển thị artwork thật và tile hình V1",()=>{
 const img=[...new Set([...home.matchAll(/<img[^>]+src="home-art\/([^"]+\.webp)"/g)].map(m=>m[1]))];
 assert.deepEqual(img,["home-fantasy-hero-v337.webp","home-v1-book.webp","home-v1-members.webp","home-v1-action.webp"]);
 assert.match(home,/data-home-library-tab="templates"/);
 assert.match(app,/dataset\.homeLibraryTab/);
 assert.match(css,/#home \.gmww-home-hero-art/);
 assert.match(css,/#home \.gmww-home-play-copy b/);
 const prep=fs.readFileSync(".github/scripts/prepare-update-channel.mjs","utf8");
 assert.match(prep,/copyDir\('server-game\/current\/home-art','home-art'\)/);
 for(const file of img)assert.ok(fs.existsSync("server-game/current/home-art/"+file),"Artwork thiếu: "+file);
});

test("Trang Chủ v3.42 có ba thẻ Khám phá gắn nhãn và menu 5 mục kiểu biển",()=>{
 const labels=[...home.matchAll(/class="gmww-home-tile-label"><b>([^<]+)/g)].map(x=>x[1]);
 assert.deepEqual(labels,["Bộ Bài","Thành Viên","Ván Mẫu"]);
 assert.match(html,/id="bottomNav"/);
 assert.match(css,/Pearl-coast five-action dock/);
 assert.match(css,/body:not\(\.play-immersive\) #bottomNav/);
 assert.match(css,/#home \.gmww-home-art-v337 \.gmww-home-tile-label/);
 assert.match(html,/style\.css\?v=3\.42-settings-tasks-template-1/);
});


test("Trang Chủ V3.42 phản ánh thiết kế đã duyệt, không giả dữ liệu",()=>{
 assert.match(home,/gmww-home-sea-v342/);
 assert.match(home,/gmww-home-profile/);
 assert.match(home,/gmww-home-brand-title">WilliamPham</);
 assert.match(home,/Ma Sói|MA SÓI/);
 assert.match(home,/gmww-home-hero-art/);
 assert.match(home,/gmwwHomeEnterVillage/);
 assert.match(home,/gmwwHomeLeaderWins/);
 assert.match(home,/gmwwHomeRecentRows/);
 assert.match(home,/data-home-library-tab="templates"/);
 assert.match(app,/function gmwwHomeRenderExtras\(rows,ranking,leader\)/);
 assert.match(app,/gmwwHomeRenderExtras\(rows,ranking,leader\)/);
 assert.match(app,/matches\.size\|\|played/);
 assert.match(app,/gmwwHomeAllRecent\?50:3/);
 assert.match(app,/document\.createElement\('button'\)/);
 assert.match(css,/Trang Chủ Phiên Bản Biển/);
 assert.doesNotMatch(home,/>3<\/strong>|>6<\/strong>|>1<\/strong>/,"Không được gán trước chỉ số minh họa");
});
