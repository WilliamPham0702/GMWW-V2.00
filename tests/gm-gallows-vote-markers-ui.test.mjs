import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync('server-game/current/app.js','utf8');
const part=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const gmCss=css.slice(css.lastIndexOf('/* GMWW 27-10: Phiếu đề cử'));

test('Phù Thủy: không mở bảng Vết Cắn, vẫn có dữ liệu Intel và nhãn MỤC TIÊU',()=>{
  assert.ok(!app.includes('🐺 VẾT CẮN · PHÙ THỦY'));
  assert.ok(!part.includes('battleShowWitchIntel('));
  assert.ok(!app.includes('battleWolfOutcomeText('));
  assert.match(part,/const witchAwake=/);
  assert.match(part,/const intel=playSceneRuntime\.nightIntel;/);
  assert.match(part,/battle-target-mark/);
  assert.match(app,/function battleShowResultPopup\(/,'các kết quả hành động khác vẫn dùng popup');
});

test('Số phiếu đề cử lấy từ Server và đứng trên nhân vật',()=>{
  assert.match(part,/gallows\?\.nominationTotals/);
  assert.match(part,/tally\?\.votes/);
  assert.match(part,/countMark\.textContent=String\(count\)/);
  assert.match(part,/count>0&&labels/);
});

test('Chữ đỏ nảy như bóng, không thêm animation JS hoặc box',()=>{
  assert.ok(gmCss.startsWith('/* GMWW 27-10:'));
  assert.match(gmCss,/\.battle-nomination-pearl\{/);
  assert.match(gmCss,/color:#ff3045!important/);
  assert.match(gmCss,/animation:gmwwNominationVoteBounce 1\.85s/);
  assert.match(gmCss,/@keyframes gmwwNominationVoteBounce/);
  assert.match(gmCss,/transform:translateY\(-10px\)/);
  assert.match(gmCss,/\.battle-gallows-vote-mark\{/);
  assert.match(gmCss,/background:transparent!important/);
  assert.match(gmCss,/border:0!important/);
  assert.match(gmCss,/box-shadow:none!important/);
});

test('Tôn trọng giảm hiệu ứng và giữ bundle trùng nguồn bảy module',()=>{
  assert.match(gmCss,/html\[data-gmww-perf-reduced="true"\]/);
  assert.match(gmCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(gmCss,/animation:none!important/);
  const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','45-online-chat','50-roles-and-artifacts']
    .map(name=>readFileSync('server-game/src/'+name+'.part','utf8')).join('');
  assert.equal(app,parts,'app.js phải dựng đúng từ nguồn module');
});
