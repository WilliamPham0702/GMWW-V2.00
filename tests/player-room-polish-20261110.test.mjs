import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rooms=fs.readFileSync('src/player-web-src/37-player-rooms.part','utf8');
const village=fs.readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
test('Phòng hub order: Quản lý → Tạo → Vào phòng',()=>{
  const a=rooms.indexOf("'1. QUẢN LÝ PHÒNG'"),b=rooms.indexOf("'2. TẠO PHÒNG'"),c=rooms.indexOf("'3. VÀO PHÒNG'");
  assert.ok(a>0&&b>a&&c>b);
});
test('toast sits below the stage strip',()=>{
  assert.match(village,/getElementById\('gmwwStageStrip'\)[\s\S]*playSetupStrip[\s\S]*stripBottom\+8/);
});
test('strip and dock anchored to visible viewport',()=>{
  assert.match(rooms,/#gmwwStageStrip\{[^}]*--gmww-player-visible-top/);
  assert.match(rooms,/#gmwwOwnerDock\{[^}]*--gmww-player-visible-height/);
});
test('dock pill shows next step',()=>{
  assert.match(rooms,/nxt=ORDER\[idx\+1\],label=/);
});
