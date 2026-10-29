import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('assets/village/index.html','utf8');
const js=readFileSync('assets/village/village.mjs','utf8');
const css=readFileSync('assets/village/village.css','utf8');

test('village markup contains only the real scene, never legacy Online setup or fake voice/chat',()=>{
  for(const id of ['gamePanel','mode','size','zoom','discussion','people','role','chatForm','messages','voice','mic','speaker','roster','selection','onlineSupport']){
    assert.doesNotMatch(html,new RegExp('id="'+id+'"'),'obsolete DOM id '+id);
  }
  for(const text of ['Minh:','Lan:','Nhập tin nhắn (bản mô phỏng)','Thảo luận ban ngày','Voice đang mở','Số người','Thu phóng']){
    assert.equal(html.includes(text),false,'old mock copy: '+text);
  }
  assert.match(html,/id="scene"/);
  assert.match(html,/id="players"/);
  assert.match(html,/class="fire"/);
  assert.match(html,/scene-manager\.mjs/);
  assert.match(html,/legacyui=removed-20261029/);
});

test('legacy mock participants and UI handlers cannot be re-created from village JS',()=>{
  assert.doesNotMatch(js,/const sample=names\.map/);
  assert.doesNotMatch(js,/const names=\["Minh"/);
  assert.match(js,/let all=embedded\?\[\]:\(supplied\|\|\[\]\)/);
  assert.match(js,/if\(setupState\.showSeats===false\)return/);
  for(const id of ['size','mode','roster','selectedLabel','chatForm','chatText','messages','mic','speaker','voiceState','onlineSupport']){
    assert.equal(js.includes('getElementById("'+id+'")'),false,'obsolete handler '+id);
  }
  assert.match(js,/function applyExternalState\(payload\)/);
  assert.match(js,/type:"gmww:village-ready"/);
  assert.match(js,/type:[\x27"]gmww:fire-click[\x27"]/);
  assert.match(js,/type:"gmww:move-arrived"/);
  assert.match(js,/createPublicRoomPoller\(/);
  assert.match(js,/function applyPhase\(nextNight\)/);
});

test('standalone scene fills the viewport and Player Web embed stays isolated',()=>{
  assert.match(css,/\.game\{min-height:100dvh;display:block;position:relative/);
  assert.match(css,/\.stage\{position:relative;overflow:hidden;min-height:100dvh/);
  assert.doesNotMatch(css,/\.hud\{position:absolute/);
  assert.match(css,/html\.embedded \.panel\{display:none!important\}/);
  assert.match(css,/html\.embedded \.stage\{position:absolute!important/);
  assert.match(css,/html:not\(\.embedded\) \.stage\{height:100dvh!important;min-height:100dvh!important\}/);
});
