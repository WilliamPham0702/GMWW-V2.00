import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rooms=playerWebSource('37-player-rooms');
const village=playerWebSource('20-village-and-profile');
test('Phòng hub order: Quản lý → Tạo → Vào phòng',()=>{
  const a=rooms.indexOf("'1. QUẢN LÝ PHÒNG'"),b=rooms.indexOf("'2. TẠO PHÒNG'"),c=rooms.indexOf("'3. VÀO PHÒNG'");
  assert.ok(a>0&&b>a&&c>b);
});
test('toast sits below the stage strip',()=>{
  assert.match(village,/getElementById\('gmwwStageStrip'\)[\s\S]*playSetupStrip[\s\S]*stripBottom\+8/);
  assert.match(village,/getElementById\('gmwwQuickStageStrip'\)[\s\S]*quickSetupStrip[\s\S]*quickBottom\+8/);
});
test('strip and dock anchored to visible viewport',()=>{
  assert.match(rooms,/#gmwwStageStrip\{[^}]*--gmww-player-visible-top/);
  assert.match(rooms,/#gmwwOwnerDock\{[^}]*--gmww-player-visible-height/);
});
test('dock pill shows next step',()=>{
  assert.match(rooms,/nxt=ORDER\[idx\+1\],label=/);
});
