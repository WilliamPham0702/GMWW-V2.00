import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

test('V3.119 Create Room picker removes the redundant helper hint',()=>{
  assert.match(html,/<div class="play-room-section-title"><b>PHÒNG<\/b><\/div>/);
  assert.doesNotMatch(html,/CHẠM 1 LẦN ĐỂ CHỌN|2 LẦN ĐỂ EDIT/);
});

test('Create Room layout constrains the picker and reduces unused horizontal space',()=>{
  assert.match(css,/#playCreateRoomSheet \.play-room-picker-card\{[\s\S]*?width:max-content!important;[\s\S]*?max-width:100%!important/);
  assert.match(css,/#playCreateRoomSheet \.play-room-strip\{[\s\S]*?max-width:100%!important/);
  assert.match(css,/@media\(max-width:390px\)[\s\S]*?play-room-picker-card\{padding:7px!important\}/);
});

test('Online, enabled, and next-step controls remain present and compact',()=>{
  for(const id of ['playRoomModeStep','playRoomModeToggle','playCreateRoomEnabled','playRoomNextStep'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(css,/#playCreateRoomSheet \.play-room-control-row\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\) 34px!important/);
  assert.match(css,/#playCreateRoomSheet \.play-room-control-row>button\{[\s\S]*?min-height:34px!important/);
  assert.match(app,/playCreateRoomNext/);
  assert.match(app,/playToggleRoomEnabled/);
});

test('Room layout fix advances to OTA V3.121 without a version downgrade',()=>{
  assert.equal(pkg.version,'3.121.0');
  assert.match(html,/<title>GMWW V3\.121<\/title>/);
  assert.match(html,/app\.js\?v=3\.121-orbit&status=1/);
});
