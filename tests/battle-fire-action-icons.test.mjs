import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const part=fs.readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const library=fs.readFileSync(new URL('../server-game/current/action-icon-library.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const start=part.indexOf('function battleIconResolve(action){');
const end=part.indexOf('function battleIconTargetAt(x,y,action){',start);
assert.ok(start>=0&&end>start,'pure icon dock functions must exist');
const logic=part.slice(start,end);

function harness({mapped=true,fallback=false,viewport={width:390,height:844},fireRect={left:170,top:340,right:220,bottom:390,width:50,height:50}}={}){
 const nodes=new Map();
 const fire={getBoundingClientRect(){return fireRect;}};
 const core={querySelector(sel){return sel==='.play-core-pearl'?fire:null;},getBoundingClientRect(){return {left:135,top:300,right:255,bottom:430,width:120,height:130}}};
 const menu={setAttribute(k,v){this[k]=v;},textContent:''};
 const document={
   documentElement:{clientWidth:viewport.width,clientHeight:viewport.height},
   body:{appendChild(x){nodes.set(x.id,x);}},
   getElementById(id){return id==='battleGMActionIcons'?menu:nodes.get(id)||null;},
   querySelector(sel){return sel==='.play-village-core'?core:null;},
   createElement(){return {
     id:'',hidden:true,style:{},dataset:{},innerHTML:'',
     setAttribute(){},replaceChildren(){this.innerHTML='';}
   };}
 };
 const api={resolveAll(id){return mapped&&id==='action_wolf_bite'?[{id:'soi-can',assetId:'05_soi_can.png'}]:[];},
   get(){return fallback?[{id:'danh-dau',assetId:'10_danh_dau.png'}]:[];},
   image(icon){return 'action-icons/sea-v1/'+icon.assetId;}};
 const context=vm.createContext({
   document,window:{visualViewport:{width:viewport.width,height:viewport.height,offsetLeft:0,offsetTop:0}},
   innerHeight:viewport.height,playSceneState:{step:'battle',night:1},
   battleState:{key:'1:night',actionId:'',targets:[],busy:false,syncPending:false,undoBusy:false},
   battleIconDragging:null,battleIconOn:()=>true,battleIconClearDrag(){},
   playEsc:x=>String(x),GMWWActionIconLibrary:api
 });
 vm.runInContext(logic,context);
 return {context,nodes,menu,call:actions=>vm.runInContext('battleIconDock',context)(actions,'night')};
}
const action={id:'turn-1',actionId:'action_wolf_bite',name:'Sói cắn',targetCount:1,unavailable:false};

test('Active mapped role icon appears at the fire, clamped to the visible iPhone viewport',()=>{
 const h=harness();h.call([action]);const dock=h.nodes.get('battleFireIconDock');
 assert.ok(dock&&!dock.hidden,'fire dock must be visible');
 assert.match(dock.innerHTML,/05_soi_can\.png/);
 assert.equal(dock.dataset.actionCount,'1');
 assert.equal(dock.dataset.unmappedCount,'0');
 assert.equal(h.menu.textContent,'ICON: BẬT');
 assert.ok(parseFloat(dock.style.left)>=100&&parseFloat(dock.style.left)<=290);
 assert.ok(parseFloat(dock.style.top)>=80&&parseFloat(dock.style.top)<=744);
});
test('Busy/sync never hides available action icons; disables unsafe interaction instead',()=>{
 const h=harness();h.call([action]);const dock=h.nodes.get('battleFireIconDock');
 h.context.battleState.syncPending=true;
 h.call([action]);assert.equal(dock.hidden,false);
 assert.match(dock.innerHTML,/ disabled/);
 h.context.battleState.syncPending=false;h.context.battleState.busy=true;
 h.call([action]);assert.equal(dock.hidden,false);
});
test('Unmapped action is counted without inventing a mapping; unavailable role is not actionable',()=>{
 const h=harness({mapped:false});h.call([action]);const dock=h.nodes.get('battleFireIconDock');
 assert.equal(dock.hidden,true);assert.equal(dock.dataset.unmappedCount,'1');
 const j=harness();j.call([{...action,unavailable:true}]);
 assert.equal(j.nodes.get('battleFireIconDock').hidden,true);
});
test('New custom action without a dedicated image uses preapproved GM PNG and retains Core action ID',()=>{
 const h=harness({mapped:false,fallback:true});h.call([{...action,actionId:'new_custom_skill'}]);
 const dock=h.nodes.get('battleFireIconDock');
 assert.equal(dock.hidden,false);
 assert.equal(dock.dataset.unmappedCount,'1');
 assert.match(dock.innerHTML,/10_danh_dau\.png/);
 assert.match(dock.innerHTML,/data-fire-action="turn-1"/);
 assert.match(dock.innerHTML,/icon chung/);
});
test('Fire coordinate missing or offscreen never positions the dock below the viewport',()=>{
 const h=harness({viewport:{width:320,height:568},fireRect:{left:0,top:0,right:0,bottom:0,width:0,height:0}});
 h.call([action]);const dock=h.nodes.get('battleFireIconDock');
 assert.ok(parseFloat(dock.style.top)>=80&&parseFloat(dock.style.top)<=468);
 assert.ok(parseFloat(dock.style.left)>0&&parseFloat(dock.style.left)<320);
 const p=vm.runInContext('battleIconDockPoint',h.context);
 const far=p({left:950,top:1800,right:1000,bottom:1900,width:50,height:100},320,568,280);
 assert.ok(far.top<=468&&far.left<=320);
});
test('iPhone release chooses actual drop coordinate, preserves Core confirmation and undo',()=>{
 assert.match(part,/battleIconTargetAt\(e\.clientX,e\.clientY,a\)\|\|d\.target/);
 assert.match(part,/battlePickTargetWithAudio\(String\(target\.dataset\.playPlayerId\|\|''\),id\)/);
 assert.match(part,/void battleConfirm\(true\)/);
 assert.match(part,/function battleUndoLast\(\)/);
 assert.match(part,/gmww:action-icons-changed/);
 assert.match(library,/signalBattleIcons\(\)/);
 assert.match(css,/\.battle-fire-icon-dock\{position:fixed;left:50%;top:50%/);
});
test('Compiled app contains same dock fix as the original GM source module',()=>{
 assert.ok(app.includes(logic));
 assert.ok(!logic.includes('core.style.left='));
});
