import test from 'node:test';
import assert from 'node:assert/strict';
import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
const web=playerWebSource('37-player-rooms'),worker=workerSource();
test('Chơi nhanh: Tạo Phòng / Nhập Mã Phòng Khác / Vào Phòng đúng một hàng, không ghi chú',()=>{
  const a=web.indexOf("btn('TẠO PHÒNG'");
  const b=web.indexOf("inp.placeholder='Nhập Mã Phòng Khác'");
  const c=web.indexOf("btn('VÀO PHÒNG'");
  assert.ok(a>0&&b>a&&c>b);
  assert.doesNotMatch(web,/Nhập mã phòng riêng của bạn bè|TẠO PHÒNG • CHƠI VỚI BẠN BÈ|MÃ \/ LINK \/ THÀNH VIÊN/);
  assert.match(web,/gmww-pr-quick-entry\{display:grid;grid-template-columns:/);
});
test('Bắt đầu xác nhận RUNNING rồi đồng bộ trò chơi cũ, vai và giao diện',()=>{
  const start=web.indexOf("const started=await callOwner('quick-start'");
  const sync=web.indexOf("await pollRoomState()",start);
  const role=web.indexOf("await ensureRoleGameView(5200)",sync);
  const game=web.indexOf("maybeOpenGame()",role);
  const close=web.indexOf("pr.open=false",game);
  assert.ok(start>0&&sync>start&&role>sync&&game>role&&close>game);
  assert.match(web,/started\?\.started!==true/);
  assert.match(web,/gameRunning/);
  assert.match(worker,/await this\.gmStart\(gm,\{matchId\}\)/);
  assert.match(worker,/await this\.applyCycle\(fresh,"night",1,"night-1","auto"\)/);
});
