// GD47 - GM chạm nhân vật 3D để chọn mục tiêu lượt đêm.
// Rủi ro của task: chạm làm hỏng chọn Seat bình thường ở tab khác, hoặc cho chọn khi Core chưa cấp hành động.
// Test không đo luật game: số mục tiêu/noSelf vẫn do validateGmActionTargets và Core kiểm.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {toggleTargetSelection,createGmDashboard} from '../assets/village/arena-3d/gm-dashboard.mjs';
import {validateGmActionTargets} from '../assets/village/arena-3d/stage29-gm-actions.mjs';

test('toggleTargetSelection: thêm, bỏ, giới hạn 5, bỏ qua id rỗng',()=>{
  assert.deepEqual(toggleTargetSelection([],'member:a'),['member:a']);
  assert.deepEqual(toggleTargetSelection(['member:a'],'member:a'),[]);
  assert.deepEqual(toggleTargetSelection(['a','b','c','d','e'],'f'),['a','b','c','d','e']);
  assert.deepEqual(toggleTargetSelection(['a'],''),['a']);
  assert.deepEqual(toggleTargetSelection(null,'a'),['a']);
});

// DOM tối thiểu có cây phần tử và sự kiện click để bấm tab thật của dashboard.
function makeEl(){
  const e={children:[],dataset:{},listeners:{},_t:'',disabled:false,className:'',
    classList:{add(){}},style:{},setAttribute(){},
    append(...n){e.children.push(...n)},replaceChildren(...n){e.children=n},
    addEventListener(t,fn){e.listeners[t]=fn}};
  Object.defineProperty(e,'textContent',{get:()=>e._t,set:v=>{e._t=String(v)}});
  return e;
}
function setupDashboard(){
  globalThis.document={createElement:makeEl,body:{dataset:{}}};
  const container=makeEl();
  const dash=createGmDashboard({container});
  const find=(node,text)=>{
    if(node._t===text)return node;
    for(const c of node.children||[]){const r=find(c,text);if(r)return r}
    return null;
  };
  const clickTab=label=>{const t=find(container,label);assert.ok(t,'phải có tab '+label);t.listeners.click()};
  return {dash,clickTab};
}
const frame={room:{code:'ROOM5',phase:'running',cyclePhase:'night',seatCount:6},
  players:[{id:'member:a',seatId:1,displayName:'An'},{id:'member:b',seatId:2,displayName:'Bình'},
    {id:'member:c',seatId:3,displayName:'Chi'}]};
const night={turnId:'t1',label:'Soi',stepIndex:0,totalSteps:1,actorIds:['member:a'],
  availableActions:[{actorId:'a',actionId:'action_seer',label:'Soi',targetCount:2,noSelf:true}]};

test('tapTarget chỉ hoạt động ở tab Lượt Đêm khi GM có quyền và Core đã cấp hành động',()=>{
  const {dash,clickTab}=setupDashboard();
  dash.setState(frame);
  clickTab('Lượt Đêm');
  assert.equal(dash.tapTarget('member:b'),false,'chưa có GM');
  dash.setGM(true);
  assert.equal(dash.tapTarget('member:b'),false,'Core chưa cấp hành động');
  dash.setNightControl({...night,availableActions:[]});
  assert.equal(dash.tapTarget('member:b'),false,'danh sách hành động rỗng');
  dash.setNightControl(night);
  clickTab('Phòng');
  assert.equal(dash.tapTarget('member:b'),false,'tab Phòng giữ hành vi chọn Seat cũ');
  assert.equal(dash.targetCount,0);
});

test('tapTarget: bật/tắt mục tiêu, bỏ qua người không có trong phòng, reset khi đổi lượt',()=>{
  const {dash,clickTab}=setupDashboard();
  dash.setState(frame);dash.setGM(true);dash.setNightControl(night);clickTab('Lượt Đêm');
  assert.equal(dash.tapTarget('member:b'),true);
  assert.equal(dash.tapTarget('member:c'),true);
  assert.equal(dash.targetCount,2);
  assert.equal(dash.tapTarget('member:b'),true,'chạm lại để bỏ chọn');
  assert.equal(dash.targetCount,1);
  assert.equal(dash.tapTarget('member:ghost'),false,'người không có trong phòng');
  assert.equal(dash.targetCount,1);
  dash.setNightControl({...night,turnId:'t2'});
  assert.equal(dash.targetCount,0,'đổi lượt thì xóa lựa chọn cũ');
});

test('Core vẫn là nơi xác thực: số mục tiêu và noSelf do validateGmActionTargets quyết định',()=>{
  const action={actorId:'a',actionId:'action_seer',targetCount:2,noSelf:true};
  assert.deepEqual(validateGmActionTargets(action,['member:b','member:c']),['b','c']);
  assert.equal(validateGmActionTargets(action,['member:b']),null,'thiếu mục tiêu');
  assert.equal(validateGmActionTargets(action,['member:a','member:b']),null,'tự chọn mình khi noSelf');
  assert.equal(validateGmActionTargets(action,['member:b','member:b']),null,'trùng mục tiêu');
});

test('live.mjs: chạm 3D đi qua tapTarget trước, không thay đổi đường gửi hành động',()=>{
  const live=fs.readFileSync('assets/village/arena-3d/live.mjs','utf8');
  assert.match(live,/dashboard\.tapTarget\(id\)/);
  assert.match(live,/validateGmActionTargets\(action,targetIds\)/);
  assert.match(live,/gm\('battle-action',body\)/);
  const dash=fs.readFileSync('assets/village/arena-3d/gm-dashboard.mjs','utf8');
  assert.doesNotMatch(dash.slice(dash.indexOf('tapTarget')),/battle-action|fetch\(/,'tapTarget không được gửi hành động');
});
