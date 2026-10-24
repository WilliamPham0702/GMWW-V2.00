import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');

test('Cài đặt has dedicated SERVER trash shortcut with review panel',()=>{
  assert.match(html,/id="gmwwServerTrashOpen"[^>]*aria-controls="gmwwCloudflarePanel"/);
  assert.match(html,/DỌN RÁC SERVER/);
  assert.match(html,/id="gmwwCloudflarePanel"/);
  assert.match(html,/id="gmwwCfProtected"/);
  assert.match(html,/id="gmwwCfUnlinked"/);
  assert.match(html,/ỨNG VIÊN CẦN XÁC MINH RỖNG/);
  assert.match(html,/Chưa đối chiếu, PR đang mở, Production, phòng, lịch sử, bản sao lưu/);
});
test('cleanup remains protected by authenticated GitHub Actions',()=>{
  assert.match(html,/actions\/workflows\/cloudflare-maintenance\.yml/);
  assert.match(html,/Run workflow → cleanup/);
  assert.match(html,/id==='gmwwCfCleanup'&&\!window\.confirm/);
  assert.match(html,/window\.location\.assign\(actions\)/);
  assert.doesNotMatch(html,/CLOUDFLARE_API_TOKEN\s*=/);
  assert.doesNotMatch(html,/DELETE_VERIFIED_PREVIEW/);
});
test('the shortcut only opens the read-only Cloudflare report',()=>{
  assert.match(html,/if\(panel\.hidden\)button\.click\(\)/);
  assert.match(html,/panel\.scrollIntoView/);
  assert.match(html,/BÁO CÁO CŨ/);
});
