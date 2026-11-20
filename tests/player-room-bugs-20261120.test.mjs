import test from 'node:test';
import assert from 'node:assert/strict';
import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import {RoomPlayerRoomMethods} from '../src/worker/room/player-rooms.js';
const web=playerWebSource('37-player-rooms');

test('Chơi nhanh: vòng ghế đặt quanh mốc lửa GM đã đánh dấu (ưu tiên ảnh đêm)',async()=>{
  const m=new RoomPlayerRoomMethods(),scene={fireAnchors:{night:{x:50,y:52},day:{x:40,y:60}},night:'/n'};
  m.env={ROOMS:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({ok:true,scene})})}};
  assert.deepEqual(await m.quickPlayFireOffset(),{x:0,y:-12});
  scene.fireAnchors={};assert.deepEqual(await m.quickPlayFireOffset(),{x:0,y:-14},'ảnh riêng chưa đánh dấu → tâm ảnh');
  m.env={ROOMS:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({ok:true,scene:{}})})}};
  assert.deepEqual(await m.quickPlayFireOffset(),{x:0,y:0},'ảnh gốc giữ mốc lửa gốc');
  m.env={};assert.deepEqual(await m.quickPlayFireOffset(),{x:0,y:0});
});
test('Nút giữa ghi tên bước TIẾP THEO và không bị cắt chữ',()=>{
  assert.match(web,/qnext\?\.\[1\]\|\|'Tạo Phòng'\)\.toUpperCase\(\)/);
  assert.match(web,/gm-top-info-copy-v293 b\{white-space:normal!important;overflow:visible!important/);
});
test('Phòng cũ đã lưu bị xoá im lặng; chỉ báo "Phòng đã đóng." khi đang ở trong phòng đó',()=>{
  assert.match(playerWebSource('37-player-rooms'),/say\(inside\?'Phòng đã đóng\.':''\)/);
});
test('Trang rời luôn nằm trong vùng nhìn thấy (visualViewport)',()=>{
  assert.match(web,/vl=Number\(vv\?\.offsetLeft\)\|\|0/);
});
test('Trang Tạo Phòng: 3 ô bằng nhau, nền mờ, chặn phóng chữ của Chrome/Edge',()=>{
  const w=playerWebSource('37-player-rooms');
  assert.match(w,/gmww-pr-quick-entry\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
  assert.match(w,/gmww-pr-panel\{background:linear-gradient\(155deg,rgba\(5,39,58,\.62\)/);
  assert.match(w,/backdrop-filter:blur\(14px\)/);
  assert.match(w,/html\{-webkit-text-size-adjust:100%!important;text-size-adjust:100%!important\}/);
  assert.doesNotMatch(w,/gmww-pr-quick-help','Nhập mã phòng riêng/);
});
