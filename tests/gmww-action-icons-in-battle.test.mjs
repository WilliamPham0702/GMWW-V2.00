import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const part=fs.readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
const library=fs.readFileSync(new URL('../server-game/current/action-icon-library.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const cut=(start,end)=>{
 const a=part.indexOf(start),b=part.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,start+' function exists');
 return part.slice(a,b);
};
const iconFns=cut("const BATTLE_ICON_ON_KEY='GMWW_GM_SHOW_ACTION_ICONS_V1';", 'const battleRules=');
const runtimeIconFns="const BATTLE_ICON_ON_KEY='GMWW_GM_SHOW_ACTION_ICONS_V1';"+iconFns.slice("const BATTLE_ICON_ON_KEY='GMWW_GM_SHOW_ACTION_ICONS_V1';".length);
test('GM loads approved icon catalog before its battle script in iPhone WKWebView',()=>{
 const i=html.indexOf('<script src="action-icon-library.js');
 const gm=html.indexOf('<script src="app.js');
 assert.ok(i>=0&&gm>i);
 assert.ok(!html.slice(i,html.indexOf('</script>',i)).includes('defer'));
 assert.match(library,/window.GMWWActionIconLibrary=/);
 assert.match(library,/resolveActionIcons\(actionId\)/);
 assert.match(library,/approvedMappings\(clone\(DEFAULT\)\)/);
});
function dockContext(){
 const callbacks={};
 const dock={
  hidden:true, dataset:{}, style:{}, classList:{toggle(name,on){dock.pending=on}},
  innerHTML:'', replaceChildren(){dock.innerHTML=''}, addEventListener(type,handler){callbacks[type]=handler},
  querySelectorAll(){return [dock.btn]},
 };
 const toggle={textContent:'',setAttribute(k,v){toggle[k]=v}};
 const fire={getBoundingClientRect(){return{left:140,top:205,bottom:260,width:60,height:55}}};
 const core={style:{},querySelector(){return fire}};
 const ringTarget={dataset:{playPlayerId:'player-B'},classList:{add(){},remove(){}},getBoundingClientRect(){return{left:142,top:180,width:44,height:44}}};
 const ring={querySelectorAll(){return[ringTarget]}};
 const actions=[{id:'role:seer',actionId:'action_seer',name:'Soi xét',targetCount:1,unavailable:false,actorIds:['player-A']}];
 const ctx={
  document:{querySelector(sel){return sel==='.play-village-core'?core:null},
   getElementById(id){return({battleGMActionIcons:toggle,battleFireIconDock:dock,playPlayerRing:ring})[id]||null},
   createElement(){return{className:'',style:{},setAttribute(){},remove(){}}},body:{appendChild(){}}
  },
  globalThis:{GMWWActionIconLibrary:{resolveAll(id){return id==='action_seer'?[{id:'soi-xet',assetId:'01_soi_xet.png'}]:[]},image(icon){return'action-icons/v3/'+icon.assetId.replace(/\.png$/,'.webp')}},
   visualViewport:{width:375,height:640}}, innerWidth:375,innerHeight:640,
  localStorage:{getItem(){return'1'},setItem(){}},
  playSceneState:{step:'battle',night:1},battleState:{key:'one',actionId:'',targets:[],busy:false,syncPending:false},
  battleActions(){return actions},villageFirePosition(){return[50,45]},
  playEsc:String,playSceneRuntime:{activeEffects:[]},
  battleMember(id){return id==='player-B'?{loginId:id}:null},
  battleRules(){return{targetAllowed(a,m){return !!m&&!a.noTarget}}},
  battleIsTransfer(){return false},battlePickAction(){ctx.sheetOpened++},
  playPlayerEffect(){return'alive'},battlePickTargetWithAudio(){ctx.battleState.targets=['player-B'];return true},
  battleConfirm(){ctx.confirmed++},battleOpenTargetSheet(){ctx.sheetOpened++},
  battleClear(){ctx.battleState.targets=[];ctx.battleState.actionId=''},
  playAudioMuted(){return false},battlePlayConfiguredAudio(){ctx.audioCount=(ctx.audioCount||0)+1;return true},
  confirm(){return true},confirmed:0,sheetOpened:0,renderPlayBattle(){},
  addEventListener(){},Event:function(){},console
 };
 ctx.globalThis.addEventListener=()=>{};
 vm.createContext(ctx);
 vm.runInContext(runtimeIconFns,ctx);
 dock.btn={dataset:{fireAction:'role:seer',fireIcon:'soi-xet'},style:{},classList:{add(){},remove(){},toggle(){}},
  getBoundingClientRect(){return{left:15,top:15,width:44,height:44}},
  querySelector(){return{src:'action-icons/v3/01_soi_xet.webp'}},setPointerCapture(){},closest(){return dock.btn}};
 return{ctx,dock,toggle,actions,callbacks};
}
test('Eligible action stays visible at 🔥 during benign server sync, with buttons disabled',()=>{
 const{ctx,dock,toggle}=dockContext();
 vm.runInContext("battleIconDock(battleActions(),'night')",ctx);
 assert.equal(dock.hidden,false);
 assert.match(dock.innerHTML,/action-icons\/v3\/01_soi_xet\.webp/);
 assert.equal(toggle.textContent,'iCon');
 assert.match(dock.innerHTML,/top:[0-9.]+px/);
 ctx.battleState.syncPending=true;
 vm.runInContext("battleIconDock(battleActions(),'night')",ctx);
 assert.equal(dock.hidden,false,'must not disappear during sync');
 assert.match(dock.innerHTML,/disabled/);
 assert.equal(dock.pending,true);
 ctx.battleState.syncPending=false;
 vm.runInContext("battleIconDock(battleActions(),'night')",ctx);
 assert.ok(!dock.innerHTML.includes('disabled'));
});
test('Pointer drop computes target at actual release position and submits via existing Core confirm',()=>{
 const{ctx,dock,callbacks}=dockContext();
 vm.runInContext("battleIconDock(battleActions(),'night');battleIconBind()",ctx);
 const ev=(type,x,y)=>({type,clientX:x,clientY:y,pointerId:9,pointerType:'touch',button:0,target:{closest(){return dock.btn}},preventDefault(){}});
 callbacks.pointerdown(ev('pointerdown',35,35));
 callbacks.pointermove(ev('pointermove',165,198));
 callbacks.pointerup(ev('pointerup',165,198));
 assert.equal(ctx.confirmed,1);
 assert.equal(ctx.battleState.targets[0],'player-B');
});
test('Cancelled drag never submits a gameplay action',()=>{
 const{ctx,dock,callbacks}=dockContext();
 vm.runInContext("battleIconDock(battleActions(),'night');battleIconBind()",ctx);
 const ev=(type,x,y)=>({type,clientX:x,clientY:y,pointerId:7,pointerType:'touch',button:0,target:{closest(){return dock.btn}},preventDefault(){}});
 callbacks.pointerdown(ev('pointerdown',35,35));
 callbacks.pointermove(ev('pointermove',160,195));
 callbacks.pointercancel(ev('pointercancel',160,195));
 assert.equal(ctx.confirmed,0);
});
test('No-target action requires GM confirmation and retains Core transaction',()=>{
 const{ctx,dock,callbacks,actions}=dockContext();
 actions[0]={id:'artifact:custom',actionId:'artifact_action_custom',name:'Sáng tạo Artifact',targetCount:0,noTarget:true,unavailable:false};
 ctx.globalThis.GMWWActionIconLibrary.resolveAll=()=>[{id:'sang-tao-artifact',assetId:'49_sang_tao_artifact.png'}];
 vm.runInContext("battleIconDock(battleActions(),'night');battleIconBind()",ctx);
 dock.btn.dataset.fireAction='artifact:custom';
 const ev=type=>({type,clientX:35,clientY:35,pointerId:10,pointerType:'touch',button:0,target:{closest(){return dock.btn}},preventDefault(){}});
 callbacks.pointerdown(ev('pointerdown'));callbacks.pointerup(ev('pointerup'));
 assert.equal(ctx.confirmed,1);
});
test('Disabled actions and ICON OFF never expose actionable icon',()=>{
 const{ctx,dock}=dockContext();
 ctx.battleActions()[0].unavailable=true;
 vm.runInContext("battleIconDock(battleActions(),'night')",ctx);
 assert.equal(dock.hidden,true);
 ctx.battleActions()[0].unavailable=false;
 ctx.localStorage.getItem=()=> '0';
 vm.runInContext("battleIconDock(battleActions(),'night')",ctx);
 assert.equal(dock.hidden,true);
});
test('Styling keeps battle icon dock within interactive iPhone layer',()=>{
 assert.match(css,/\.battle-fire-icon-dock\{[^}]*position:fixed/);
 assert.match(css,/#battleFireIconDock\.battle-fire-icon-dock\{[^}]*z-index:50000!important/);
 assert.match(css,/body\.play-immersive #start\.play-page\.active\{[^}]*z-index:1000/);
 assert.match(css,/\.battle-fire-icon-dock\[hidden\]\{display:none\}/);
});

test('Icon Action V2: drag may end anywhere, button stays floating, no Core action',()=>{
 const{ctx,dock,callbacks}=dockContext();
 vm.runInContext("battleIconDock(battleActions(),'night');battleIconBind()",ctx);
 const ev=(type,x,y)=>({type,clientX:x,clientY:y,pointerId:27,pointerType:'touch',button:0,target:{closest(){return dock.btn}},preventDefault(){}});
 callbacks.pointerdown(ev('pointerdown',30,30));
 callbacks.pointermove(ev('pointermove',280,380));
 callbacks.pointerup(ev('pointerup',280,380));
 assert.equal(ctx.confirmed,0);
 assert.equal(ctx.sheetOpened,0);
 assert.equal(dock.btn.style.left,'287px');
 assert.equal(dock.btn.style.top,'387px');
});
test('Yêu Tinh has approved three-way combined image',()=>{
 const{ctx,dock,actions}=dockContext();
 actions[0].actionId='action_transfer_bite';
 ctx.globalThis.GMWWActionIconLibrary.resolve=id=>id==='action_transfer_bite'?{id:'dich-trai',assetId:'11_dich_trai.png'}:null;
 vm.runInContext("battleIconDock(battleActions(),'night')",ctx);
 assert.equal((dock.innerHTML.match(/data-fire-icon=/g)||[]).length,1);
 assert.doesNotMatch(dock.innerHTML,/🔄/);assert.match(dock.innerHTML,/51_yeu_tinh_three_way\.webp/);
});
