import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.72 removes the background-dim control and exposes server character size instead',()=>{
  const html=read('server-game/current/GMWW.html'),app=read('server-game/current/app.js'),css=read('server-game/current/style.css'),server=read('src/index.js');
  assert.ok(html.includes('id="characterScaleRange"'));
  assert.ok(html.includes('Kích thước nhân vật'));
  assert.doesNotMatch(html,/backgroundDimRange|Độ mờ hình nền/);
  assert.ok(app.includes("fetch(GMWW_SERVER_BASE+'/api/gm/ui-settings'"));
  assert.ok(app.includes("characterScale:n"));
  assert.ok(css.includes('--gmww-background-dim:0'));
  assert.ok(css.includes('background:transparent!important'));
  assert.ok(server.includes('async globalUiSettingsGet()'));
  assert.ok(server.includes('async globalUiSettingsPut(body)'));
  assert.ok(server.includes('characterScale'));
  assert.ok(server.includes('backgroundDim:0'));
  assert.doesNotMatch(server,/globalWebVeilGet|globalWebVeilPut|global-settings\/web-veil/);
});

test('Player Web receives the server scale and renders larger 2D characters',()=>{
  const live=read('src/gmww-members-live.js'),village=read('assets/village/village.mjs');
  assert.ok(live.includes("async function loadUiSettings(force=false)"));
  assert.ok(live.includes("api('/api/ui-settings')"));
  assert.ok(live.includes("characterScale:Number(state.characterScale||120)"));
  assert.ok(village.includes('characterScale:120'));
  assert.ok(village.includes('Number(setupState.characterScale||120)/100'));
  assert.ok(village.includes('avatar.style.width='));
  assert.ok(village.includes('avatar.style.height='));
});

test('Player can always find and open character information from the village',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes('id=\\"gmwwVillageProfileButton\\"'));
  assert.ok(live.includes("aria-label=\\"Thông tin nhân vật\\""));
  assert.ok(live.includes('function openVillageProfile()'));
  assert.ok(live.includes('profileButton.onclick=openVillageProfile'));
  assert.ok(live.includes('if(id===selfId)openVillageProfile()'));
});

test('Recovered post-login navigation no longer shows a false error toast',()=>{
  const live=read('src/gmww-members-live.js');
  const start=live.indexOf('async function login()'),end=live.indexOf('window.login=login',start),segment=live.slice(start,end);
  assert.doesNotMatch(segment,/Đã đăng nhập\. Có lỗi khi khôi phục màn hình trước/);
  assert.ok(segment.includes("catch(fallbackError)"));
  assert.ok(segment.includes("Đã đăng nhập nhưng chưa mở được Làng"));
});

test('V2.72 metadata is aligned',()=>{
  const server=read('src/index.js'),app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj'),pkg=JSON.parse(read('package.json'));
  assert.ok(server.includes('VERSION="V2.72"'));
  assert.ok(app.includes("const VERSION='2.72';"));
  assert.ok(html.includes('GMWW V2.72'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 272;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.72;'));
  assert.equal(pkg.version,'2.72.0');
});
