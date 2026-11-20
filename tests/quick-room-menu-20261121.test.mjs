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
