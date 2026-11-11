import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rooms=fs.readFileSync('src/player-web-src/37-player-rooms.part','utf8');
const boot=fs.readFileSync('src/player-web-src/00-bootstrap-and-session.part','utf8');
const village=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
test('Quản lý phòng: mã – Sao chép mã – Gửi phòng, rồi Xoá phòng + Tập hợp',()=>{
  const i=rooms.indexOf("'Sao chép mã'"),j=rooms.indexOf("'Gửi phòng'"),k=rooms.indexOf("'Xoá phòng',deleteRoom"),l=rooms.indexOf("'Tập hợp →',async()=>goStep('seats')");
  assert.ok(i>0&&j>i&&k>j&&l>k);
});
test('Tập hợp: kéo cả khối seat, preview qua làng, lưu seatOffset/seatSpacing bởi chủ phòng',()=>{
  assert.match(rooms,/PHÂN BỐ VỊ TRÍ/);assert.match(rooms,/installSeatDrag/);
  assert.match(rooms,/callOwner\('room-settings','POST',\{seatOffset/);
  assert.match(village,/window\.gmwwSeatPreview/);
  assert.match(worker,/"seatMoveMode","seatLayout","seatOffset","seatSpacing"/);
});
test('Ván Mẫu: bỏ Tạo ván rút gọn; Web có editor đầy đủ và nạp mẫu Server',()=>{
  assert.doesNotMatch(rooms,/'Tạo ván'/);assert.match(rooms,/Thiết kế Ván Mẫu/);assert.match(rooms,/Ván Mẫu Server/);
  assert.match(rooms,/ARTIFACT • chọn các lá/);assert.match(rooms,/artifactLimitPerCycle/);assert.match(rooms,/gallowsNominationSec/);
  assert.match(rooms,/roleOrder/);assert.match(rooms,/Tự động chuyển vai khi hết giờ/);
  assert.match(rooms,/save\.textContent='LƯU'/);assert.match(rooms,/template-save/);assert.match(rooms,/template-delete/);
  assert.match(worker,/playerRoomSourceArtifacts/);assert.match(worker,/TEMPLATE_EDIT_FORBIDDEN/);
  assert.match(worker,/gmPreloadSharedArtifacts\(env,code/);assert.match(worker,/artifactsEnabled/);
});
test('Ván Mẫu: editor lấy Vai Trò dự phòng từ mẫu Server và không báo rỗng khi đang tải/lỗi',()=>{
  assert.match(rooms,/catalogStatus:'idle'/);
  assert.match(rooms,/const available=new Map\(\);for\(const t of pr\.templates\)/);
  assert.match(rooms,/if\(Array\.isArray\(r\.roles\)&&r\.roles\.length\)pr\.roles=r\.roles/);
  assert.match(rooms,/Đang tải danh sách vai từ Ván Mẫu Server/);
  assert.match(rooms,/Không tải được danh sách Ván Mẫu Server/);
  assert.match(rooms,/TẢI LẠI DANH SÁCH/);
});
test('Server giữ tối đa 5 Ván Mẫu gần nhất',()=>{
  assert.match(worker,/pruneGameTemplates\(5,id\)/);
  assert.match(worker,/"\/game-templates\/player-save"/);
});
test('menu trên/dưới bám vùng nhìn thấy cả chiều ngang (Chrome iOS)',()=>{
  assert.match(boot,/--gmww-player-visible-width/);assert.match(boot,/--gmww-player-visible-left/);
  assert.match(rooms,/#gmwwOwnerDock\{[^}]*translateY\(-100%\)/);
  assert.match(rooms,/#gmwwStageStrip\{[^}]*--gmww-player-visible-width/);
});
test('menu dưới: bấm Phòng khi đã có phòng thì vào lại luôn, menu trên không mờ mép',()=>{
  assert.match(rooms,/async function rejoinOwn\(\)/);
  assert.match(rooms,/if\(pr\.own&&!owner\(\)\)\{run\(async\(\)=>\{await rejoinOwn\(\)/);
  assert.doesNotMatch(rooms,/mask-image:linear-gradient\(90deg,transparent 0,#000 7%/);
});
test('Tập hợp: chủ phòng kéo/chụm seat trực tiếp trên cảnh làng khi ở bước Tập hợp (không cần mở trang)',()=>{
  assert.match(rooms,/const seatDragOn=\(\)=>!!\(pr\.own&&inOwnRoom\(\)&&stepNow\(\)==='seats'/);
  assert.match(rooms,/back\.hidden=!\(pr\.open\|\|pr\.chatOpen\|\|pr\.holdBack\|\|seatDragOn\(\)\)/);
});
