import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const plain=x=>JSON.parse(JSON.stringify(x));
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';

// V3.308: kéo lá Vai Trò / Artifact để thực hiện hành động (Player Web Online).
const chat=fs.readFileSync(new URL('../src/player-web-src/35-online-chat.part',import.meta.url),'utf8');
const mini=fs.readFileSync(new URL('../src/player-web-src/20-village-and-profile.part',import.meta.url),'utf8');
const a=chat.indexOf('const gmwwCardLifted=new Set()'),b=chat.indexOf('function gmwwOnlineIconDown(event,action,card){'),
  c=chat.indexOf('// Only authenticated action offers trigger this local effect;');
assert.ok(a>0&&b>a&&c>b,'Thiếu mã kéo lá trong Player Web');
const helperSource=chat.slice(a,b),dragSource=chat.slice(b,c);

function el(){
 const classes=new Set();
 return {style:{},children:[],dataset:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),has:x=>classes.has(x),toggle(){}},
  appendChild(x){this.children.push(x);return x},remove(){this.removed=true},
  querySelector:()=>({currentSrc:'/role/img.webp',src:'/role/img.webp'}),
  getBoundingClientRect:()=>({left:20,top:300,width:39,height:54})};
}
function world({offers,room,witchBites=[],targetAt='',pick=null}){
 const listeners=new Map(),winListeners=new Map(),log=[],boxes=[];
 const doc={
  addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:(t)=>listeners.delete(t),
  createElement:()=>{const n=el();boxes.push(n);return n},
  getElementById:id=>id==='gmwwVillageFrame'?{getBoundingClientRect:()=>({left:0,right:390,top:60,bottom:560})}:null,
  body:{appendChild:n=>{if(n.id==='gmwwOnlinePick')log.push('chooser')}}
 };
 const ctx={document:doc,window:{innerWidth:390,innerHeight:800,addEventListener:(t,f)=>winListeners.set(t,f),removeEventListener:(t)=>winListeners.delete(t)},
  Math,String,Number,Array,Set,state:{member:{loginId:'me'},room:room||{roomMode:'online',phase:'running'},onlineActions:offers,players:[{loginId:'me',displayName:'Tôi'},{loginId:'bob',displayName:'Bob'},{loginId:'amy',displayName:'Amy'}]},
  gmwwOnlinePick:pick,gmwwOnlineWitchBite:{targetIds:witchBites},gmwwPlayerTopMenuTimer:null,clearTimeout,setTimeout:()=>0,
  gmwwChatClosePanel(){},revealPlayerTopMenu(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0},
  gmwwOnlineTargetSnapshot:()=>[],gmwwOnlineTargetAt:()=>targetAt,
  gmwwOnlineTarget:id=>{log.push('target:'+id);ctx.gmwwOnlinePick?.targets.push(id)},gmwwOnlinePickAction:x=>log.push('pickAction:'+x.actionId),
  gmwwOnlineStop:()=>{ctx.gmwwOnlinePick=null;log.push('stop')},
  gmwwOnlinePeople:()=>ctx.state.players.map(p=>({id:p.loginId,name:p.displayName})),
  gmwwOnlinePlayerCenter:()=>({x:200,y:200}),gmwwOnlineFlyGhost:()=>Promise.resolve(),toast:m=>log.push('toast:'+m)};
 vm.createContext(ctx);vm.runInContext(helperSource,ctx);
 const down=vm.runInContext('('+dragSource+')',ctx);
 const node=el();
 return {ctx,log,boxes,listeners,node,down,
  drag:(type,x,y)=>{
    const actions=ctx.gmwwOnlineCardActions(type);
    down({button:0,pointerId:1,clientX:30,clientY:330,currentTarget:node,preventDefault(){},stopPropagation(){}},actions[0],{type,actions});
    listeners.get('pointermove')({pointerId:1,clientX:x,clientY:y,preventDefault(){}});
    listeners.get('pointerup')({type:'pointerup',pointerId:1,clientX:x,clientY:y});
  }};
}
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve()};
const save={key:'n:witch:save',actionId:'action_witch_save',name:'Cứu',targetCount:1,roleId:'role_witch',artifactId:''};
const kill={key:'n:witch:kill',actionId:'action_witch_kill',name:'Hạ độc',targetCount:1,roleId:'role_witch',artifactId:''};
const seer={key:'n:seer',actionId:'action_seer',name:'Soi',targetCount:1,roleId:'role_seer',artifactId:'',noSelf:true};
const noTarget={key:'n:flash',actionId:'action_flash',name:'Kích hoạt',targetCount:0,noTarget:true,roleId:'role_x',artifactId:''};
const artifact={key:'n:art',actionId:'action_art',name:'Dùng Artifact',targetCount:1,roleId:'',artifactId:'art-1'};

test('Lá chỉ nhận hành động của chính nó và chỉ ở phòng Online đang chạy',()=>{
 const w=world({offers:[save,kill,artifact]});
 assert.deepEqual(plain(w.ctx.gmwwOnlineCardActions('role').map(x=>x.key)),['n:witch:save','n:witch:kill']);
 assert.deepEqual(plain(w.ctx.gmwwOnlineCardActions('artifact').map(x=>x.key)),['n:art']);
 for(const room of [{roomMode:'offline',phase:'running'},{roomMode:'online',phase:'lobby'},{roomMode:'online',phase:'running',demo:true}])
  assert.deepEqual(plain(world({offers:[save],room}).ctx.gmwwOnlineCardActions('role')),[],JSON.stringify(room));
});

test('Phù Thủy: thả vào người bị cắn được Cứu + Hạ độc, người khác chỉ Hạ độc, không bao giờ đoán hộ',()=>{
 const w=world({offers:[save,kill],witchBites:['bob']});
 const acts=w.ctx.gmwwOnlineCardActions('role');
 assert.deepEqual(plain(w.ctx.gmwwCardTargetActions(acts,'bob').map(x=>x.actionId)),['action_witch_save','action_witch_kill']);
 assert.deepEqual(plain(w.ctx.gmwwCardTargetActions(acts,'amy').map(x=>x.actionId)),['action_witch_kill']);
 assert.deepEqual(plain(w.ctx.gmwwCardTargetActions([seer],'me')),[],'noSelf bị chặn');
 assert.deepEqual(plain(w.ctx.gmwwCardTargetActions([{...kill,blocked:true}],'bob')),[],'bị Đóng Băng/Đuổi thì không kéo được');
 assert.deepEqual(plain(w.ctx.gmwwCardTargetActions([noTarget,kill],'').map(x=>x.key)),['n:flash'],'thả trống chỉ cho hành động không cần mục tiêu');
});

test('Lá nhiều hành động: thả xong phải chọn Cứu/Hạ độc, chưa chọn thì KHÔNG gửi gì',async()=>{
 const w=world({offers:[save,kill],witchBites:['bob'],targetAt:'bob'});
 w.drag('role',200,200);await flush();
 assert.ok(w.log.includes('chooser'),'hiện bảng chọn hành động');
 assert.ok(!w.log.some(x=>x.startsWith('target:')),'chưa chọn thì chưa gửi mục tiêu');
 const box=w.boxes.find(n=>n.id==='gmwwOnlinePick');
 const labels=box.children[1].children.map(n=>n.textContent);
 assert.deepEqual(labels,['Cứu','Hạ độc']);
 box.children[1].children[1].onclick();            // chọn Hạ độc
 assert.equal(w.ctx.gmwwOnlinePick.action.actionId,'action_witch_kill');
 assert.deepEqual(w.log.filter(x=>x.startsWith('target:')),['target:bob']);
});

test('Lá nhiều hành động: Hủy ở bảng chọn thì lá hiện lại và không gửi gì',async()=>{
 const w=world({offers:[save,kill],witchBites:['bob'],targetAt:'bob'});
 w.drag('role',200,200);await flush();
 const box=w.boxes.find(n=>n.id==='gmwwOnlinePick');
 assert.ok(w.node.classList.has('gmww-online-lifted'),'lá đang ẩn trong lúc chọn');
 box.children[2].onclick();
 assert.ok(!w.node.classList.has('gmww-online-lifted'),'Hủy → lá hiện lại ở chỗ cũ');
 assert.ok(!w.log.some(x=>x.startsWith('target:')));
});

test('Lá chỉ có 1 hành động: thả vào người là gửi luôn như icon, lá ẩn cho tới khi xong',async()=>{
 const w=world({offers:[seer],targetAt:'bob'});
 w.drag('role',200,200);await flush();
 assert.ok(!w.log.includes('chooser'));
 assert.equal(w.ctx.gmwwOnlinePick.action.key,'n:seer');
 assert.deepEqual(w.log.filter(x=>x.startsWith('target:')),['target:bob']);
 assert.ok(w.node.classList.has('gmww-online-lifted'),'đang gửi → lá còn ẩn, gmwwOnlineSubmit sẽ hiện lại');
 assert.equal(w.node.dataset.gmwwMiniMoved,'1','kéo không bị tính là bấm mở lá');
});

test('Artifact kéo ra hành động artifact, không lẫn hành động vai trò',async()=>{
 const w=world({offers:[kill,artifact],targetAt:'amy'});
 w.drag('artifact',200,200);await flush();
 assert.equal(w.ctx.gmwwOnlinePick.action.key,'n:art');
 assert.deepEqual(w.log.filter(x=>x.startsWith('target:')),['target:amy']);
});

test('Thả hụt: lá bay về chỗ cũ, không gửi gì',async()=>{
 const w=world({offers:[kill],targetAt:''});
 w.drag('role',200,700);await flush();                 // ngoài khung làng
 assert.deepEqual(w.log,[]);
 assert.ok(!w.node.classList.has('gmww-online-lifted'));
});

test('Hành động không cần mục tiêu: thả vào khung làng là kích hoạt',async()=>{
 const w=world({offers:[noTarget],targetAt:''});
 w.drag('role',200,300);await flush();
 assert.deepEqual(w.log,['pickAction:action_flash']);
});

test('Chạm (không kéo) vẫn mở lá, không kích hoạt hành động',()=>{
 const w=world({offers:[kill],targetAt:'bob'});
 w.down({button:0,pointerId:1,clientX:30,clientY:330,currentTarget:w.node,preventDefault(){},stopPropagation(){}},kill,{type:'role',actions:[kill]});
 w.listeners.get('pointerup')({type:'pointerup',pointerId:1,clientX:31,clientY:331});
 assert.deepEqual(w.log,[]);
 assert.ok(!w.node.dataset.gmwwMiniMoved,'onclick mở lá vẫn chạy');
});

test('Không có hành động thì lá vẫn chỉ dời chỗ như cũ; có hành động thì chuyển sang kéo hành động',()=>{
 assert.match(mini,/const cardActions=typeof gmwwOnlineCardActions==='function'\?gmwwOnlineCardActions\(type\):\[\];\s*if\(cardActions\.length\)\{gmwwOnlineIconDown\(event,cardActions\[0\],\{type,actions:cardActions\}\);return\}\s*event\.preventDefault\(\);button\.dataset\.gmwwMiniDragging='1';/);
 assert.match(mini,/button\.gmww-online-lifted\{opacity:0!important;pointer-events:none\}/);
});

test('Lá hiện lại sau khi gửi xong hoặc bị từ chối, và Player Web biên dịch được',()=>{
 assert.match(chat,/finally\{state\.onlineBusy=false;gmwwCardRestore\(700\);await refreshPrivateRole\(true\)\}/);
 assert.match(chat,/function gmwwOnlineStop\(\)\{[^}]*if\(!state\.onlineBusy\)gmwwCardRestore\(\)/);
 assert.doesNotThrow(()=>new vm.Script(gmwwMembersLiveScript));
 assert.ok(gmwwMembersLiveScript.includes('gmwwCardChoose'));
});
