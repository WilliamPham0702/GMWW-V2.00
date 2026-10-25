import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const part=fs.readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
const from="const BATTLE_ICON_ON_KEY='GMWW_GM_SHOW_ACTION_ICONS_V1';";
const to="const battleRules=()=>globalThis.GMWW_BATTLE_CONTROLS;";
const chunk=source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
assert.ok(chunk.includes('function battleIconBind(){'));
assert.ok(part.includes(chunk),'Runtime app must match assembled 40-battle source');

function scenario(action={id:'turn-1',actionId:'action_seer',name:'Soi xét',targetCount:1,unavailable:false}){
 const handlers=new Map(),nodes=new Map(),saved=new Map();
 const battleState={key:'night:1:turn',actionId:'',targets:[],busy:false,syncPending:false,undoBusy:false,transferDir:''};
 const playerNodes=[
  {dataset:{playPlayerId:'p1'},getBoundingClientRect:()=>({left:75,top:155,width:50,height:50}),classList:{add(){},remove(){}}},
  {dataset:{playPlayerId:'p2'},getBoundingClientRect:()=>({left:185,top:155,width:50,height:50}),classList:{add(){},remove(){}}}
 ];
 const fake=(tag='div')=>({
  tagName:tag,id:'',dataset:{},style:{},hidden:false,disabled:false,className:'',attributes:{},
  classList:{add(){},remove(){}},innerHTML:'',_rect:{height:80,width:180,top:0,left:0},
  setAttribute(key,value){this.attributes[key]=value;},
  addEventListener(type,fn){handlers.set(type,fn)},
  getBoundingClientRect(){return this._rect},
  querySelector(){return null},querySelectorAll(){return []},replaceChildren(){this.innerHTML=''},
  remove(){this.removed=true}
 });
 const fire=fake('button');fire._rect={left:345,top:630,width:46,height:56,bottom:686};
 const core=fake('div');core.style={left:'48%',top:'50%'};core.querySelector=x=>x==='.play-core-pearl'?fire:null;
 const dock=fake();dock.getBoundingClientRect=()=>({height:82,width:180});
 const toggle=fake('button');
 const ring=fake('div');ring.querySelectorAll=selector=>selector==='[data-play-player-id]'?playerNodes:[];
 nodes.set('battleFireIconDock',dock);nodes.set('playPlayerRing',ring);
 nodes.set('battleGMActionIcons',toggle);
 const doc={
  body:{appendChild(el){if(el.id)nodes.set(el.id,el)}},
  documentElement:{clientWidth:390,clientHeight:844},
  getElementById:id=>nodes.get(id)||null,
  querySelector:x=>x==='.play-village-core'?core:x==='.play-village-core .play-core-pearl'?fire:null,
  createElement:fake,
  addEventListener(){},
 };
 const rules={targetAllowed:()=>true},calls={confirm:0,undo:0,chosen:[],sheet:0},turnActions=[action];
 const ctx={
  document:doc,window:{innerWidth:390,innerHeight:844},innerWidth:390,innerHeight:844,
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
  globalThis:{innerWidth:390,innerHeight:844,GMWWActionIconLibrary:{
   resolveAll:id=>id===action.actionId?[{id:'soi-xet',assetId:'01_soi_xet.png'}]:[],
   image:icon=>'action-icons/sea-v1/'+icon.assetId
  }},
  playSceneState:{step:'battle',night:1},playSceneRuntime:{activeEffects:[]},battleState,
  battleActions:()=>turnActions,battleMember:id=>({loginId:id}),battleRules:()=>rules,
  playPlayerEffect:()=>'',playEsc:x=>String(x),battleIsTransfer:a=>a.actionId==='action_transfer_bite',
  battlePickAction:id=>{battleState.actionId=id;battleState.targets=[]},
  battlePickTargetWithAudio:(id,actionId)=>{
   if(!battleState.targets.includes(id))battleState.targets.push(id);
   battleState.actionId=actionId;calls.chosen.push(id);return true},
  battleOpenTargetSheet:()=>{calls.sheet++},
  battleClear:()=>{battleState.targets=[];battleState.actionId=''},
  battleConfirm:()=>{calls.confirm++},
  confirm:()=>true,renderPlayBattle:()=>{},
 };
 vm.runInNewContext(chunk+'\nthis.widget={battleIconDock,battleIconBind,battleIconOn,battleIconSetOn,battleIconResolve}',ctx);
 const btn=()=>({dataset:{fireAction:action.id,fireIcon:action.actionId==='action_transfer_bite'?'dich-trai':'soi-xet'},
  disabled:false,setPointerCapture(){},closest:()=>btn.cached}); // caller sets .cached below
 const button=btn();btn.cached=button;
 const emit=(name,point,options={})=>{
  const e={clientX:point.x,clientY:point.y,pointerId:7,pointerType:'touch',button:0,
   target:button,changedTouches:[{identifier:19,clientX:point.x,clientY:point.y}],
   preventDefault(){this.prevented=true},...options};
  const handler=handlers.get(name);assert.ok(handler,name+' listener registered');handler(e);
 };
 ctx.widget.battleIconDock(turnActions,'night');ctx.widget.battleIconBind();
 return {ctx,emit,dock,toggle,core,battleState,actions:turnActions,calls,button,saved,
  playerNodes,handlers};
}
test('Valid mapped icon stays visible during reconnect; controls disable but never vanish',()=>{
 const x=scenario();
 assert.equal(x.dock.hidden,false);
 assert.match(x.dock.innerHTML,/01_soi_xet.png/);
 x.battleState.syncPending=true;x.ctx.widget.battleIconDock(x.actions,'night');
 assert.equal(x.dock.hidden,false);
 assert.match(x.dock.innerHTML,/disabled/);
 x.battleState.syncPending=false;x.ctx.widget.battleIconDock(x.actions,'night');
 assert.doesNotMatch(x.dock.innerHTML,/disabled aria-disabled/);
 assert.equal(x.core.style.left,'48%','Positioning dock must not move the village fire');
 assert.ok(parseFloat(x.dock.style.top)<=844-104-80,'Dock inside iPhone safe viewport');
});
test('One-target pointer drag snaps to a player and confirms exactly once through existing Core',()=>{
 const x=scenario();x.emit('pointerdown',{x:350,y:600});
 x.emit('pointermove',{x:100,y:180});
 x.emit('pointerup',{x:100,y:180});
 assert.deepEqual(x.calls.chosen,['p1']);
 assert.equal(x.calls.confirm,1);
});
test('Touch-only WKWebView fallback drags to the player without a Pointer event',()=>{
 const x=scenario();
 x.emit('touchstart',{x:350,y:600});
 x.emit('touchmove',{x:100,y:180});
 x.emit('touchend',{x:100,y:180});
 assert.deepEqual(x.calls.chosen,['p1']);
 assert.equal(x.calls.confirm,1);
});
test('Pointer + Touch generated for one gesture cannot submit twice',()=>{
 const x=scenario();x.emit('pointerdown',{x:350,y:600});
 x.emit('touchstart',{x:350,y:600});
 x.emit('pointermove',{x:100,y:180});x.emit('pointerup',{x:100,y:180});
 x.emit('touchend',{x:100,y:180});
 assert.equal(x.calls.confirm,1);
});
test('Two-target artifact requires both drops before Core confirmation',()=>{
 const x=scenario({id:'artifact-turn',actionId:'artifact_action_judge_two_wolves',name:'Hai Sói',targetCount:2,unavailable:false});
 x.emit('touchstart',{x:350,y:600});x.emit('touchmove',{x:100,y:180});x.emit('touchend',{x:100,y:180});
 assert.equal(x.calls.confirm,0);
 x.emit('touchstart',{x:350,y:600});x.emit('touchmove',{x:210,y:180});x.emit('touchend',{x:210,y:180});
 assert.deepEqual(x.calls.chosen,['p1','p2']);assert.equal(x.calls.confirm,1);
});
test('No-target artifact can confirm by tap, while canceled drag must not submit',()=>{
 const x=scenario({id:'self-turn',actionId:'artifact_action_custom',name:'Sáng tạo',targetCount:0,noTarget:true,unavailable:false});
 x.emit('pointerdown',{x:350,y:600});x.emit('pointercancel',{x:350,y:600});
 assert.equal(x.calls.confirm,0);
 x.emit('pointerdown',{x:350,y:600});x.emit('pointerup',{x:350,y:600});
 assert.equal(x.calls.confirm,1);
});
test('GM ICON toggle persists and turns off the dock without touching core state',()=>{
 const x=scenario();x.ctx.widget.battleIconSetOn(false);
 x.ctx.widget.battleIconDock(x.actions,'night');
 assert.equal(x.dock.hidden,true);
 assert.equal(x.saved.get('GMWW_GM_SHOW_ACTION_ICONS_V1'),'0');
 x.ctx.widget.battleIconSetOn(true);x.ctx.widget.battleIconDock(x.actions,'night');
 assert.equal(x.dock.hidden,false);
});
test('Missing artwork retains a clearly generic, correctly named active Core action',()=>{
 const x=scenario();const icon=x.ctx.widget.battleIconResolve({actionId:'action_unassigned',name:'Hành động mới'})[0];
 assert.equal(icon.id,'unassigned-action_unassigned');
 assert.match(icon.image,/^data:image\/svg\+xml/);
});
test('Existing server-authorized undo token and role/core validators remain intact',()=>{
 assert.match(source,/playRoomApi\('\/battle-undo'/);
 assert.match(source,/battleRules\(\)\?\.targetAllowed\(action/);
 assert.match(source,/void battleConfirm\(true\)/);
 assert.match(source,/data-fire-action/);
});
