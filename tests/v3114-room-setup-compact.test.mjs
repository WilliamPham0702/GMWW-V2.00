import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const recovery=fs.readFileSync('src/gmww-runtime-recovery.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'));

test('Room picker no longer displays the redundant one-tap/two-tap hint',()=>{
  assert.match(html,/<div class="play-room-section-title"><b>PHÒNG<\/b><\/div>/);
  assert.doesNotMatch(html,/CHẠM 1 LẦN ĐỂ CHỌN|2 LẦN ĐỂ EDIT/);
});

test('Room settings controls remain functional and the setup card is compact',()=>{
  for(const id of ['playRoomModeStep','playRoomModeToggle','playCreateRoomEnabled','playRoomNextStep'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(css,/play-room-section-card\.play-room-step\{\s*padding:7px 9px!important/);
  assert.match(css,/play-room-step \.play-room-control-row #playRoomModeToggle/);
  assert.match(css,/height:38px!important/);
  assert.match(css,/@media\(max-width:390px\)[\s\S]*height:36px!important/);
  assert.match(app,/playSceneState\.roomEnabled===true/);
  assert.match(app,/playSceneState\.roomMode==='online'/);
});

test('Runtime V3.114 source, OTA manifest and native shell versions remain aligned',()=>{
  assert.equal(pkg.version,'3.114.0');
  assert.equal(lock.version,'3.114.0');
  assert.equal(lock.packages[''].version,'3.114.0');
  assert.match(app,/const VERSION='3\.114'/);
  assert.match(html,/<title>GMWW V3\.114<\/title>/);
  assert.match(worker,/VERSION="V3\.114",NATIVE_SHELL_VERSION="3\.110",UPDATE_CHANNEL_REV="runtime-3114"/);
  assert.match(recovery,/'3\.114'\]\.includes\(version\)/);
  assert.equal(manifest.releaseVersion,'3.114');
  assert.equal(manifest.runtimeVersion,'3.114');
  assert.equal(manifest.shellVersion,'3.110');
  assert.equal(manifest.releaseType,'runtime');
  assert.ok(['GMWW.html','app.js','style.css','character-renderer.js','character-renderer.css'].every(p=>manifest.runtime.files.some(f=>f.path===p&&f.url.includes('/updates/runtime/V3.114/'))));
  for(const path of ['GMWW.html','app.js','style.css'])assert.match(manifest.runtime.files.find(f=>f.path===path).sha256,/^[a-f0-9]{64}$/);
});
