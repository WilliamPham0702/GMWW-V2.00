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
test('Ván Mẫu: tab Tạo ván + Ván mẫu, Lưu/Xoá, timeline',()=>{
  assert.match(rooms,/'Tạo ván'/);assert.match(rooms,/'Ván mẫu'/);assert.match(rooms,/LƯU VÁN/);assert.match(rooms,/XOÁ VÁN/);
  assert.match(rooms,/'template-save'/);assert.match(rooms,/'template-delete'/);assert.match(rooms,/villageDiscussionSec/);
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
