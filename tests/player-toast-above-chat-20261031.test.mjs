import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

const src=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const chat=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const start=src.indexOf('let toastTimer;'),end=src.indexOf('window.toast=toast;',start);
assert.ok(start>=0&&end>start,'Player Web toast implementation exists');
const code=src.slice(start,end+'window.toast=toast;'.length);

function createToast(menuBottom=124,offsetTop=0){
  const elements=new Map(),menu={bottom:menuBottom,getBoundingClientRect(){return{bottom:this.bottom}}};
  const document={
    getElementById:id=>id==='gmwwPlayerTopMenu'?menu:elements.get(id),
    createElement:()=>({style:{},setAttribute(name,value){this[name]=value}}),
    body:{appendChild(el){elements.set(el.id,el)}},
  };
  const window={visualViewport:{offsetTop}};
  const ctx={window,document,$:selector=>elements.get(selector.slice(1)),clearTimeout(){},setTimeout(){return 1}};
  vm.runInNewContext(code,ctx);
  return {window,menu,elements};
}

test('Player toast appears directly below the measured top timeline on iPhone',()=>{
  const {window,menu,elements}=createToast(124);
  window.toast('Đã nhận thông báo');
  const toast=elements.get('gmwwToast');
  assert.equal(toast.style.top,'134px');
  assert.equal(toast.textContent,'Đã nhận thông báo');
  assert.match(toast.style.cssText,/bottom:auto/);
  assert.match(toast.style.cssText,/pointer-events:none/);
  assert.equal(toast.role,'status');
  menu.bottom=175;
  window.toast('Thông báo tiếp');
  assert.equal(toast.style.top,'185px','tracks menu position after viewport/layout changes');
  assert.equal(elements.size,1,'reuses one toast instead of stacking overlays');
});

test('Hidden top menu and shifted visual viewport retain a visible top fallback',()=>{
  const {window,menu,elements}=createToast(-50,22);
  window.toast('Thử lại');
  assert.equal(elements.get('gmwwToast').style.top,'90px');
  menu.bottom=205;
  window.toast('Thông báo');
  assert.equal(elements.get('gmwwToast').style.top,'215px');
});

test('Served Player bundle includes the fix; Online Chat remains an unchanged bottom dock',()=>{
  assert.ok(gmwwMembersLiveScript.includes('function gmwwToastTop(){'));
  assert.ok(gmwwMembersLiveScript.includes('t.style.top=gmwwToastTop()'));
  assert.ok(!code.includes('bottom:24px'));
  assert.match(chat,/#gmwwOnlineFooter\{position:fixed;z-index:100003/);
  assert.match(chat,/id='gmwwChatText'/);
});
