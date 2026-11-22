import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerWebSource} from '../.github/scripts/source-groups.mjs';
test('22/11/2026: Web báo "Bạn không được chọn 1 người 2 đêm liên tiếp"',()=>{
  const src=playerWebSource('35-online-chat');
  assert.match(src,/\['CONSECUTIVE_NIGHT_TARGET_FORBIDDEN','WITCH_CONSECUTIVE_EXILE'\]\.includes\(code\)\)return 'Bạn không được chọn 1 người 2 đêm liên tiếp'/);
});
test('22/11/2026: bảng chiến thắng nền mờ + Công bố vai trò',()=>{
  const src=playerWebSource('50-privacy-and-runtime'),sock=playerWebSource('30-rooms-and-realtime');
  assert.match(src,/#resultOverlay \.result-sheet\{background:linear-gradient\(155deg,rgba\(5,39,58,\.62\)/);
  assert.match(src,/CÔNG BỐ VAI TRÒ/);
  assert.match(sock,/d\.history\?\.summary,d\.history\?\.players\)/);
  assert.match(readFileSync('src/worker/room/lifecycle.js','utf8'),/history:matchHistory\?\{summary:matchHistory\.summary,players:matchHistory\.players\}:null/);
});
