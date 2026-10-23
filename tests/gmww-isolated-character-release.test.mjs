import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Character V5.61 is a separately deployed read-only test Worker.
// Changes to its validation must never force a game Runtime release.
test('isolated Character V5.61 validation belongs to its independent preview workflow',()=>{
  const production=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const preview=readFileSync('.github/workflows/deploy-character-v561-preview.yml','utf8');
  assert.doesNotMatch(production,/V5\.61|v561-lab|skin-v561-original-swatch/,
    'Main Production must not be blocked by the independent Skin lab');
  assert.match(preview,/npx wrangler deploy --config wrangler\.character-v561-preview\.jsonc/);
  assert.match(preview,/shasum -a 256/,'Standalone Character release verifies its own byte integrity');
});

test('main production keeps all game safety and OTA gates',()=>{
  const production=readFileSync('.github/workflows/deploy-production.yml','utf8');
  for(const guard of [
    'Phân loại và chuẩn bị kênh cập nhật GMWW',
    'Kiểm tra tăng phiên bản OTA khi Runtime thay đổi',
    'Xác minh thông tin kết nối Cloudflare',
    'Chặn phát hành phiên bản thấp hơn',
    'Triển khai Worker lên Production',
    'Kiểm tra Production sau triển khai',
    'gmww-production',
    'api/update/manifest',
    'gmww-live-health'
  ])assert.ok(production.includes(guard),'Mandatory Production guard missing: '+guard);
});
