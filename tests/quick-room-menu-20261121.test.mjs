import test from 'node:test';
import assert from 'node:assert/strict';
import {playerWebSource} from '../.github/scripts/source-groups.mjs';
const web=playerWebSource('37-player-rooms');
test('Menu trên Chơi nhanh: gọn như menu dưới (62px, tối đa 520px), không nền',()=>{
  assert.match(web,/#quickSetupStrip\{[^}]*max-width:520px;height:62px;margin:0 auto/);
  assert.match(web,/:host\{display:block;box-sizing:border-box;background:transparent/);
  assert.doesNotMatch(web,/:host\{display:block;box-sizing:border-box;background:linear-gradient/);
});
test('Chỉ chủ phòng thấy Ván Mẫu / Bắt Đầu; người vào phòng khác chỉ có Sảnh Chờ · Tạo Phòng',()=>{
  assert.match(web,/const quickSteps=\(\)=>pr\.own&&inOwnRoom\(\)\?QUICK_ORDER:QUICK_ORDER\.slice\(0,2\)/);
  assert.match(web,/b\.hidden=!qsteps\.some\(s=>s\[0\]===b\.dataset\.quickStep\)/);
  assert.match(web,/pr\.view=quickSteps\(\)\.some\(s=>s\[0\]===k\)\?k:'room'/);
  assert.match(web,/if\(!quickSteps\(\)\.some\(x=>x\[0\]===pr\.view\)\)/);
  assert.doesNotMatch(web,/Chủ phòng quản lý thành viên và khóa\/mở phòng/);
});
import {workerSource} from '../.github/scripts/worker-source.mjs';
const worker=workerSource();
test('Tên phòng mặc định "Làng của <người tạo>", nút Sao chép',()=>{
  assert.match(worker,/body\.roomName=normalizeRoomName\("Làng của "\+String\(own\?\.member\?\.displayName\|\|ownerLoginId\)\)/);
  assert.match(web,/btn\('Sao chép',/);assert.doesNotMatch(web,/btn\('Sao chép mã'/);
});
test('Vòng ghế Chơi nhanh lấy đống lửa làm tâm ngay từ sảnh',()=>{
  assert.match(worker,/if\(meta\.quickPlay===true\)\{meta\.seatLayout="circle";meta\.seatSpacing=100;meta\.seatOffset=await this\.quickPlayFireOffset\("day"\)\}/);
  assert.match(worker,/seatOffset:await this\.quickPlayFireOffset\("night"\)/);
});
test('Vào trận: đóng trang thiết lập, chủ phòng chỉ thêm nút Kết thúc ván',()=>{
  assert.match(web,/for\(const key of \['clock','chat','action','end'\]\)/);
  assert.match(web,/end\.hidden=!isOwner/);
  assert.doesNotMatch(web,/btn\(room\.autoGM\?'Tạm dừng':'Tiếp tục'/);
  assert.match(web,/toLowerCase\(\)==='running'\)pr\.open=false;/);
});
test('MOVE_NOT_ACTIVE không hiện mã lỗi thô',()=>{
  const v=playerWebSource('20-village-and-profile');
  assert.match(v,/if\(String\(e\?\.data\?\.error\|\|''\)==='MOVE_NOT_ACTIVE'\)\{try\{await pollRoomState\(\)\}catch\(_\)\{\}syncVillageFrame\(\);return\}/);
});
