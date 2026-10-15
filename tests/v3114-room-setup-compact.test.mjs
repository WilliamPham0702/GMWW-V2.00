import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));

test('Create Room removes the selection/edit hint while keeping room and settings controls',()=>{
  assert.match(html,/<div class="play-room-section-title"><b>PHÒNG<\/b><\/div>/);
  assert.doesNotMatch(html,/CHẠM 1 LẦN ĐỂ CHỌN\s*•\s*2 LẦN ĐỂ EDIT/);
  assert.match(html,/id="playRoomModeToggle"/);
  assert.match(html,/id="playCreateRoomEnabled"/);
  assert.match(html,/id="playRoomNextStep"/);
});

test('Create Room controls are compact and centered on desktop and narrow iPhones',()=>{
  assert.match(css,/V3\.114 — compact, centered room setup controls/);
  assert.match(css,/#playCreateRoomSheet \.play-room-control-row\{\s*width:min\(100%,270px\)!important;\s*margin:0 auto!important;/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) 38px!important/);
  assert.match(css,/\.play-room-step-next\{\s*width:38px!important;min-width:38px!important;height:40px!important/);
  assert.match(css,/@media\(max-width:390px\)[\s\S]*width:min\(100%,250px\)!important/);
});

test('Runtime 3.114 and OTA cache-busters stay synchronized',()=>{
  assert.equal(pkg.version,'3.114.0');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.match(app,/const VERSION='3\.114'/);
  assert.match(html,/<title>GMWW V3\.114<\/title>/);
  assert.match(html,/style\.css\?v=3\.114-room-setup/);
  assert.match(html,/app\.js\?v=3\.114-room-setup/);
  assert.match(worker,/VERSION="V3\.114"/);
  assert.match(worker,/UPDATE_CHANNEL_REV="runtime-3114"/);
});
