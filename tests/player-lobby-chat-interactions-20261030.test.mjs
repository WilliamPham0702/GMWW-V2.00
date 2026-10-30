import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {chatPolicy,publicChatNotices,chatStorageScope} from '../src/gmww-online-chat-policy.js';
const read=p=>fs.readFileSync(p,'utf8');
const chat=read('src/player-web-src/35-online-chat.part');
const players={'member:a':{loginId:'a'},'member:b':{loginId:'b'}};
test('joined players can chat before seats and through role delivery, outsiders cannot',()=>{
 for(const phase of ['lobby','waiting','role_delivery']){
 const args={meta:{phase},players,loginId:'a',rows:[]};
 assert.equal(chatPolicy(args).canSend,true,phase);
 assert.equal(chatPolicy({...args,loginId:'outsider'}).canRead,false);
 assert.equal(chatPolicy({...args,bans:{a:true}}).canSend,false);
 }
});
test('icon drop resolves transformed iframe coordinates to actual player',()=>{
 const code=chat.slice(chat.indexOf('function gmwwOnlineTargetAt('),chat.indexOf('function gmwwOnlinePickAction('));
 const node={dataset:{playerId:'member:b'},getBoundingClientRect:()=>({left:100,top:100,width:40,height:80}),classList:{add(){},remove(){}}};
 const frame={clientWidth:400,clientHeight:800,contentWindow:{innerWidth:400,innerHeight:800},getBoundingClientRect:()=>({left:20,top:30,width:200,height:400}),contentDocument:{querySelectorAll:()=>[node]}};
 const context={document:{getElementById:()=>frame},gmwwOnlinePeople:()=>[{id:'b'}]};
 vm.runInNewContext(code+';globalThis.hit=gmwwOnlineTargetAt(80,100)',context);
 assert.equal(context.hit,'b');
});

test('notices expose only GM-approved active negative statuses, never actor or positive effects',()=>{
 const meta={phase:'running',matchId:'M',statusDisplay:{dead:true,protected:true}};
 const rows=[{type:'dead',loginId:'a',matchId:'M',actorId:'secret'},
 {type:'status',statusId:'protected',loginId:'a',matchId:'M'},
 {type:'expelled',loginId:'b',matchId:'M'},
 {type:'dead',loginId:'b',matchId:'old'}];
 const notices=publicChatNotices(meta,players,rows);
 assert.equal(notices.length,1);assert.equal(notices[0].system,true);
 assert.ok(!JSON.stringify(notices).includes('secret'));
 assert.deepEqual(publicChatNotices({...meta,statusDisplay:{}},players,rows),[]);
 assert.deepEqual(publicChatNotices({...meta,enabled:false},players,rows),[]);
 assert.deepEqual(publicChatNotices({...meta,phase:'lobby'},players,rows),[]);
 assert.notEqual(chatStorageScope({phase:'lobby',resetVersion:1}),chatStorageScope({phase:'lobby',resetVersion:2}));
});
test('cancelling an icon drag restores idle timer and never dispatches action',()=>{
 const code=chat.slice(chat.indexOf('function gmwwOnlineIconDown('),chat.indexOf('function renderOnlineActionDock('));
 const events={},node={addEventListener:(k,v)=>events[k]=v,removeEventListener(){},setPointerCapture(){}};
 let revealed=0,submitted=0;
 const context={clearTimeout(){},gmwwPlayerTopMenuTimer:1,gmwwChatClosePanel(){},revealPlayerTopMenu(){revealed++},gmwwOnlineTarget(){submitted++}};
 vm.runInNewContext(code,context);
 context.gmwwOnlineIconDown({currentTarget:node,clientX:0,clientY:0,preventDefault(){},stopPropagation(){}},{key:'act'});
 events.pointercancel({type:'pointercancel'});assert.equal(revealed,1);assert.equal(submitted,0);
});

test('room polling does not postpone the 30-second menu timeout; activity restores it',()=>{
 const village=read('src/player-web-src/20-village-and-profile.part');
 const code=village.slice(village.indexOf('function hidePlayerTopMenu('),village.indexOf('function ensureVillageHud('));
 const classes=new Set(),menu={querySelector:()=>null,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
 let timer,scheduled=0,closed=0;
 const context={state:{member:{}},$:id=>id==='#gmwwPlayerTopMenu'?menu:id==='#gmwwPlayerTopMenuStyle'?{}:null,
  document:{getElementById:()=>null,documentElement:{dataset:{gmwwPlayerTopMenuActivity:'1'}}},
  updatePlayerTopMenu(){},renderPlayerTimeline(){},gmwwChatClosePanel(){closed++},clearTimeout(){},setTimeout(fn,ms){assert.equal(ms,30000);timer=fn;return ++scheduled}};
 vm.runInNewContext('let gmwwPlayerTopMenuTimer=null,gmwwPlayerTopMenuLastActivity=0;'+code,context);
 for(let i=0;i<20;i++)context.ensurePlayerTopMenu();
 assert.equal(scheduled,1);timer();assert.ok(classes.has('is-idle-hidden'));assert.equal(closed,1);
 context.ensurePlayerTopMenu();assert.equal(scheduled,1);
 context.revealPlayerTopMenu(true);assert.equal(scheduled,2);assert.ok(!classes.has('is-idle-hidden'));
});
test('mini cards default below entry, halve width, move under avatar with chat, and restore saved position',()=>{
 const village=read('src/player-web-src/20-village-and-profile.part');
 const code=village.slice(village.indexOf('function gmwwMiniPosition('),village.indexOf('function gmwwMiniDrag('));
 const button={dataset:{},style:{}};
 const context={gmwwChatOpen:false,gmwwMiniPositions:()=>({}),window:{innerWidth:400,innerHeight:800},document:{
 getElementById:()=>({getBoundingClientRect:()=>({left:0,top:0,width:400,height:800})}),querySelector:()=>({getBoundingClientRect:()=>({right:390,bottom:60})})}};
 vm.runInNewContext(code,context);context.gmwwMiniPosition(button,'role');
 assert.equal(button.style.top,'184px');assert.equal(button.style.left,'159px');
 context.gmwwChatOpen=true;context.gmwwMiniPosition(button,'role');assert.equal(button.style.top,'65px');
 context.gmwwChatOpen=false;context.gmwwMiniPositions=()=>({role:{x:120,y:300}});context.gmwwMiniPosition(button,'role');assert.equal(button.style.top,'300px');
});
