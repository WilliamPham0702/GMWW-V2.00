import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync('src/player-web-src/35-online-chat.part','utf8');
function extract(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Missing Player Web implementation: '+start);
 return source.slice(a,b);
}
const hitSource=extract('function gmwwOnlineTargetAt(x,y){','function gmwwOnlinePickAction(action){');
const dragSource=extract('function gmwwOnlineIconDown(event,action){','// Only authenticated action offers trigger this local effect;');

test('iPhone drag hit-testing maps screen pixels into a scaled iframe and prefers actual avatar',()=>{
 const player={dataset:{playerId:'member:wolf2'},getBoundingClientRect:()=>({left:500,top:250,width:90,height:100})};
 const frame={
  clientWidth:1000,clientHeight:750,contentWindow:{innerWidth:1000,innerHeight:750},
  getBoundingClientRect:()=>({left:100,top:50,width:400,height:300}),
  contentDocument:{elementFromPoint:(x,y)=>x===545&&y===300?{closest:()=>player}:null,
   querySelectorAll:()=>[player]}
 };
 const fn=vm.runInNewContext('('+hitSource+')',{document:{getElementById:()=>frame},gmwwOnlinePeople:()=>[{id:'wolf2'}],Set,Math,String,Number});
 assert.equal(fn(318,170),'wolf2','exact touch is accepted even through iframe scaling');
 assert.equal(fn(320,174),'wolf2','nearby touch is accepted when a decorative overlay intercepts it');
 assert.equal(fn(100,50),'','unrelated background touch is rejected');
});

test('drag keeps a single pointer across the document, chooses player and cleans up',()=>{
 const listeners=new Map(),windowListeners=new Map(),selected=[],position=new Map(),ghosts=[];
 const document={
  addEventListener:(t,fn)=>listeners.set(t,fn),
  removeEventListener:(t,fn)=>{if(listeners.get(t)===fn)listeners.delete(t)},
  createElement:()=>({style:{},remove(){ghosts.push('removed')}}),
  body:{appendChild:()=>ghosts.push('added')}
 };
 const win={innerWidth:390,innerHeight:800,addEventListener:(t,fn)=>windowListeners.set(t,fn),
  removeEventListener:(t,fn)=>{if(windowListeners.get(t)===fn)windowListeners.delete(t)}};
 let captures=0,releases=0;
 const node={style:{},getBoundingClientRect:()=>({left:90,top:320,width:70,height:70}),
  setPointerCapture:()=>captures++,releasePointerCapture:()=>releases++};
 const context={document,window:win,Math,String,Number,
  state:{member:{loginId:'wolf1'}},gmwwOnlinePick:null,gmwwOnlineIconPositions:position,
  gmwwPlayerTopMenuTimer:null,clearTimeout:()=>{},
  gmwwChatClosePanel:()=>{},revealPlayerTopMenu:()=>{},
  gmwwOnlineTargetAt:()=> 'wolf2',gmwwOnlineTarget:(id)=>selected.push(id),
  gmwwOnlinePickAction:()=>selected.push('picker'),toast:()=>{}
 };
 const down=vm.runInNewContext('('+dragSource+')',context);
 const initial={button:0,pointerId:7,clientX:110,clientY:340,currentTarget:node,
  preventDefault(){},stopPropagation(){}};
 const action={key:'wolf-bite',iconUrl:'/action-icons/v3/05_soi_can.webp'};
 down(initial,action);
 assert.equal(captures,1);
 assert.ok(listeners.has('pointermove'));
 listeners.get('pointermove')({pointerId:9,clientX:320,clientY:170,preventDefault(){}});
 assert.equal(ghosts.length,0,'unrelated pointer must not steal drag');
 listeners.get('pointermove')({pointerId:7,clientX:320,clientY:170,preventDefault(){}});
 assert.ok(ghosts.includes('added'));
 listeners.get('pointerup')({type:'pointerup',pointerId:7,clientX:320,clientY:170});
 assert.deepEqual(selected,['wolf2']);
 assert.equal(releases,1);
 assert.equal(listeners.size,0);
 assert.equal(windowListeners.size,0);
 assert.ok(ghosts.includes('removed'));
 assert.equal(context.gmwwOnlinePick.action.key,'wolf-bite');
});

test('cancel/blur never performs a drop and self-target is forbidden',()=>{
 for(const mode of ['cancel','self']){
  const listeners=new Map(),selected=[],doc={
   addEventListener:(t,fn)=>listeners.set(t,fn),removeEventListener:(t)=>listeners.delete(t),
   createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}
  };
  const winListeners=new Map(),win={innerWidth:390,innerHeight:800,addEventListener:(t,fn)=>winListeners.set(t,fn),removeEventListener:(t)=>winListeners.delete(t)};
  const node={style:{},getBoundingClientRect:()=>({left:90,top:320,width:70,height:70}),setPointerCapture(){},releasePointerCapture(){}};
  const context={document:doc,window:win,Math,String,Number,state:{member:{loginId:'wolf1'}},gmwwOnlinePick:null,gmwwOnlineIconPositions:new Map(),
   gmwwPlayerTopMenuTimer:null,clearTimeout(){},gmwwChatClosePanel(){},revealPlayerTopMenu(){},gmwwOnlineTargetAt:()=> 'wolf1',
   gmwwOnlineTarget:(id)=>selected.push(id),gmwwOnlinePickAction:()=>selected.push('picker'),toast(){}};
  const down=vm.runInNewContext('('+dragSource+')',context);
  down({button:0,pointerId:2,clientX:100,clientY:330,currentTarget:node,preventDefault(){},stopPropagation(){}},{key:'guard',noSelf:true});
  listeners.get('pointermove')({pointerId:2,clientX:200,clientY:170,preventDefault(){}});
  if(mode==='cancel')winListeners.get('blur')();
  else listeners.get('pointerup')({pointerId:2,type:'pointerup',clientX:200,clientY:170});
  assert.deepEqual(selected,[],'no unauthorized target or click');
  assert.equal(listeners.size,0);
 }
});

test('render signature invalidates when a Server-blocked action changes without a new key',()=>{
 assert.match(source,/a\.blocked,a\.blockedReason,a\.targetCount,a\.noSelf/);
 assert.match(source,/document\.addEventListener\('pointerup',end,true\)/);
 assert.match(source,/node\.setPointerCapture\?\.\(event\.pointerId\)/);
});
