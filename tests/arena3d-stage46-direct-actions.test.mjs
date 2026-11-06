// GD46 - kiểm chứng: Player thao tác Core trực tiếp trên nhân vật 3D qua cầu postMessage hẹp.
// Rủi ro của task: (1) rò thông tin riêng ra ngoài iframe Player Web, (2) nhận tin từ nguồn lạ,
// (3) 3D tự quyết kết quả thay Core. Test không đo gameplay; Core vẫn xác thực ở server.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {sanitizeBridgeState,bridgeEventAccepted,targetFromTap,pickHint,outboundCommand,usableActions,
  BRIDGE_STATE,BRIDGE_PICK,BRIDGE_TARGET,BRIDGE_CANCEL} from '../assets/village/arena-3d/stage46-direct-actions.mjs';
import {injectArena3dPlayerEntry,ARENA3D_PLAYER_BRIDGE_ID} from '../src/arena3d-player-entry.mjs';

const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const bridgeSrc=read('assets/village/arena-3d/player-bridge.js');
const playerSrc=read('assets/village/arena-3d/player.mjs');

const base=(extra={})=>({type:BRIDGE_STATE,selfId:'me',busy:false,
  people:[{id:'me',name:'Tôi'},{id:'a1',name:'An'},{id:'b2',name:'Bình'}],
  actions:[{key:'k1',name:'Soi',targetCount:1,noSelf:true,blocked:false}],picking:null,...extra});

test('sanitizeBridgeState chỉ giữ trường tối thiểu và chặn dữ liệu lạ',()=>{
  const dirty=base({token:'SECRET',roleId:'role_seer',faction:'wolf',
    actions:[{key:'k1',name:'Soi',targetCount:99,noSelf:true,roleId:'role_seer',secret:'x',blocked:false},{key:'',name:'rỗng'}],
    people:[{id:'member:a1',name:'An',faction:'wolf',token:'T'},{id:'bad id!',name:'x'}]});
  const s=sanitizeBridgeState(dirty);
  assert.equal(s.actions.length,1);
  assert.equal(s.actions[0].targetCount,5);
  assert.deepEqual(Object.keys(s.actions[0]).sort(),['blocked','key','name','noSelf','targetCount']);
  assert.deepEqual(s.people.map(p=>p.id),['a1']);
  assert.deepEqual(Object.keys(s.people[0]).sort(),['id','name']);
  assert.equal(JSON.stringify(s).includes('SECRET'),false);
  assert.equal(JSON.stringify(s).includes('role_seer'),false);
  assert.equal(sanitizeBridgeState({type:'other'}),null);
  assert.equal(sanitizeBridgeState(null),null);
});

test('targetFromTap tôn trọng noSelf, trùng mục tiêu và danh sách Core',()=>{
  const picking={key:'k1',name:'Soi',need:2,noSelf:true,targets:['a1']};
  const s=sanitizeBridgeState(base({picking}));
  assert.equal(targetFromTap('member:b2',s),'b2');
  assert.equal(targetFromTap('member:me',s),null,'không tự chọn mình khi noSelf');
  assert.equal(targetFromTap('member:a1',s),null,'không chọn trùng');
  assert.equal(targetFromTap('member:ghost',s),null,'ngoài danh sách người chơi');
  assert.equal(targetFromTap('member:b2',sanitizeBridgeState(base())),null,'chưa chọn hành động thì không nhận mục tiêu');
  const self=sanitizeBridgeState(base({picking:{...picking,noSelf:false,targets:[]}}));
  assert.equal(targetFromTap('member:me',self),'me');
});

test('bridgeEventAccepted chỉ nhận đúng iframe cùng origin',()=>{
  const frame={},origin='https://stage.example';
  assert.ok(bridgeEventAccepted({source:frame,origin},{origin,frameWindow:frame}));
  assert.ok(!bridgeEventAccepted({source:{},origin},{origin,frameWindow:frame}));
  assert.ok(!bridgeEventAccepted({source:frame,origin:'https://evil.example'},{origin,frameWindow:frame}));
  assert.ok(!bridgeEventAccepted({source:frame,origin},{origin,frameWindow:null}));
});

test('outboundCommand và pickHint',()=>{
  assert.deepEqual(outboundCommand(BRIDGE_PICK,{key:'k1'}),{type:BRIDGE_PICK,key:'k1'});
  assert.equal(outboundCommand(BRIDGE_PICK,{key:''}),null);
  assert.deepEqual(outboundCommand(BRIDGE_TARGET,{id:'member:a1'}),{type:BRIDGE_TARGET,id:'a1'});
  assert.equal(outboundCommand(BRIDGE_TARGET,{id:'bad id!'}),null);
  assert.deepEqual(outboundCommand(BRIDGE_CANCEL),{type:BRIDGE_CANCEL});
  assert.equal(outboundCommand('x'),null);
  const s=sanitizeBridgeState(base({picking:{key:'k1',name:'Soi',need:2,noSelf:true,targets:['a1']}}));
  assert.match(pickHint(s),/2\/2/);
  assert.equal(usableActions(sanitizeBridgeState(base({actions:[{key:'k',name:'x',blocked:true}]}))).length,0);
});

function runBridge({parentOk=true}={}){
  const posted=[],listeners={},toasts=[],calls=[];
  const parent={postMessage:(m,o)=>posted.push({m,o})};
  const ctx={
    state:{onlineActions:[
      {key:'k1',name:'Soi',targetCount:1,noSelf:true,blocked:false,roleId:'role_seer',cardSecret:'S'},
      {key:'k2',name:'Khóa',targetCount:1,blocked:true}],
      member:{loginId:'me',sessionKey:'PRIVATE-CRED'},onlineBusy:false},
    gmwwOnlinePeople:()=>[{id:'me',name:'Tôi'},{id:'a1',name:'An'}],
    gmwwOnlinePick:null,
    gmwwOnlinePickAction:a=>{calls.push(['pick',a.key]);ctx.gmwwOnlinePick={action:a,targets:[]}},
    gmwwOnlineTarget:id=>calls.push(['target',id]),
    gmwwOnlineStop:()=>{calls.push(['stop']);ctx.gmwwOnlinePick=null},
    toast:t=>toasts.push(t),
    location:{origin:'https://stage.example'},
    setInterval:()=>1,
    JSON,parseInt,isFinite,String,Array,Math
  };
  ctx.window=ctx;ctx.top={};ctx.parent=parentOk?parent:ctx.top;
  ctx.addEventListener=(t,fn)=>{listeners[t]=fn};
  vm.runInNewContext(bridgeSrc,ctx);
  const send=(data,{origin='https://stage.example',source=ctx.parent}={})=>listeners.message({data,origin,source});
  return {ctx,posted,send,calls,toasts};
}

test('script cầu: chỉ xuất bản menu tối thiểu, không rò credential/role',()=>{
  const {posted}=runBridge();
  const state=posted.find(x=>x.m.type===BRIDGE_STATE);
  assert.ok(state,'phải gửi state ngay khi tải');
  assert.equal(state.o,'https://stage.example','targetOrigin phải là origin chính nó');
  const text=JSON.stringify(state.m);
  for(const secret of ['PRIVATE-CRED','role_seer','cardSecret'])assert.equal(text.includes(secret),false,secret);
  assert.equal(state.m.actions.length,2);
  assert.equal(state.m.selfId,'me');
});

test('script cầu: chọn hành động và mục tiêu đi qua luồng Player Web có sẵn',()=>{
  const {send,calls,posted}=runBridge();
  send({type:'gmww3d:pick-action',key:'k1'});
  send({type:'gmww3d:pick-action',key:'k2'}); // bị khóa -> không được gọi
  send({type:'gmww3d:pick-action',key:'khong-co'});
  send({type:'gmww3d:target',id:'member:a1'});
  send({type:'gmww3d:target',id:'bad id!'});
  send({type:'gmww3d:cancel'});
  assert.deepEqual(calls,[['pick','k1'],['target','a1'],['stop']]);
  const picked=posted.map(x=>x.m).find(m=>m.type===BRIDGE_STATE&&m.picking);
  assert.equal(picked.picking.key,'k1');
});

test('script cầu: bỏ qua tin sai origin hoặc sai nguồn',()=>{
  const {send,calls}=runBridge();
  send({type:'gmww3d:pick-action',key:'k1'},{origin:'https://evil.example'});
  send({type:'gmww3d:pick-action',key:'k1'},{source:{}});
  send('chuoi');send(null);
  assert.deepEqual(calls,[]);
});

test('script cầu: không chạy ở trang cấp cao nhất và chuyển tiếp toast',()=>{
  const top=runBridge();
  assert.equal(typeof top.ctx.toast.__gmww3d,'boolean');
  top.ctx.toast('Đã thực hiện');
  assert.ok(top.posted.some(x=>x.m.type==='gmww3d:toast'&&x.m.text==='Đã thực hiện'));
  assert.deepEqual(top.toasts,['Đã thực hiện'],'toast gốc vẫn chạy');
  const ctx={window:null,top:null,location:{origin:'x'},addEventListener(){throw new Error('không được gắn listener')},setInterval(){throw new Error('không được hẹn giờ')}};
  ctx.window=ctx;ctx.top=ctx;
  vm.runInNewContext(bridgeSrc,ctx);
});

test('chèn script cầu cùng Player entry, chỉ một lần, không có credential trong mã cầu',()=>{
  const once=injectArena3dPlayerEntry('<html><body></body></html>');
  assert.equal(once.split('id="'+ARENA3D_PLAYER_BRIDGE_ID+'"').length-1,1);
  assert.match(once,/src="\/village\/arena-3d\/player-bridge\.js" defer/);
  assert.equal(injectArena3dPlayerEntry(once),once);
  const code=bridgeSrc.replace(/\/\/.*$/gm,''); // chỉ quét mã, không quét chú thích
  assert.doesNotMatch(code,/token|password|sessionKey|roleId|faction/i);
});

const actionsSrc=read('assets/village/arena-3d/player-actions.mjs');
test('player.mjs vẫn chỉ-đọc; chỉ player-actions.mjs được nói chuyện với iframe Player Web',()=>{
  assert.doesNotMatch(playerSrc,/postMessage\(/,'player.mjs không được tự gọi postMessage');
  assert.match(playerSrc,/from '\.\/player-actions\.mjs'/);
  assert.match(playerSrc,/directActions\?\.handleTap\(event\)/);
  assert.match(actionsSrc,/bridgeEventAccepted\(event,\{origin:location\.origin,frameWindow:frameWindow\(\)\}\)/);
  assert.match(actionsSrc,/targetFromTap\(field\.pick\(ray\),state\)/);
  assert.match(actionsSrc,/w\.postMessage\(cmd,location\.origin\)/,'targetOrigin phải là origin của trang');
  assert.doesNotMatch(actionsSrc,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|WebSocket/,'không lưu trữ hay gọi mạng');
  const diag=playerSrc.slice(playerSrc.indexOf('window.__GMWW_ARENA_PLAYER_READONLY'));
  assert.doesNotMatch(diag.slice(0,500),/bridgeState|directActions|actions|picking/);
});

test('khung Player Web riêng tư KHÔNG được tải sẵn: chỉ tải khi người chơi chủ động mở',()=>{
  const calls=[...playerSrc.matchAll(/loadPlayerCore\(\)/g)].length;
  assert.equal(calls,2,'một định nghĩa + một lần gọi duy nhất');
  const openIdx=playerSrc.indexOf("$('open-card').onclick");
  const callIdx=playerSrc.lastIndexOf('loadPlayerCore();');
  assert.ok(callIdx>openIdx&&callIdx<playerSrc.indexOf('};',openIdx),'chỉ gọi trong onclick của nút mở lá');
});
