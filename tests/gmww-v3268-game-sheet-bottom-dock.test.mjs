import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const part=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const flow=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const script=part.slice(part.indexOf("const GMWW_GAME_SHEET_DOCK_KEY="),part.indexOf('function initDraggablePlaySheets(){'));
function classes(){const s=new Set();return{add(...items){items.forEach(x=>s.add(x))},remove(...items){items.forEach(x=>s.delete(x))},contains(x){return s.has(x)},toggle(x,on){if(on===undefined)on=!s.has(x);if(on)s.add(x);else s.delete(x);return on}}}
function environment(){
 const saved=new Map(),styleValues=new Map();
 const style={setProperty(k,v){styleValues.set(k,v)},removeProperty(k){styleValues.delete(k)},getPropertyValue(k){return styleValues.get(k)||''}};
 const card={dataset:{mode:'play'},style,classList:classes(),offsetWidth:360,offsetHeight:450,getBoundingClientRect(){const x=Number.parseFloat(style.getPropertyValue('left')||'0'),y=Number.parseFloat(style.getPropertyValue('top')||'0');return {left:x,top:y,right:x+360,bottom:y+450,width:360,height:450}},querySelector(){return handle}};
 const handlers={},handle={addEventListener(type,fn){handlers[type]=fn},setPointerCapture(){},releasePointerCapture(){}};
 const sheet={classList:classes(),querySelector(){return card}};
 const toggle={textContent:'',dataset:{},addEventListener(type,fn){this[type]=fn},setAttribute(key,v){this[key]=v}};
 const nodes={playGameSheet:sheet,playGameDockToggle:toggle,gmTopMenu:{getBoundingClientRect:()=>({left:12,top:760,width:366,height:70})},playSetupStrip:{getBoundingClientRect:()=>({bottom:116})}};
 const events={};const context={innerWidth:390,innerHeight:844,localStorage:{getItem(k){return saved.get(k)||null},setItem(k,v){saved.set(k,v)}},document:{getElementById(k){return nodes[k]||null}},window:{addEventListener(k,f){events[k]=f}},console};context.window.visualViewport={addEventListener(){}};
 vm.runInNewContext(script,context);
 return {ctx:context,card,sheet,toggle,handle,handlers,saved};
}
test('In Step 3: open the game sheet as a transparent floating dock; library stays a modal',()=>{
 assert.match(html,/id="playGameDockToggle"[^>]*aria-expanded="true"/);
 assert.match(css,/#playGameSheet\.gmww-template-floating:not\(\.hidden\)/);
 assert.match(css,/pointer-events:none!important/);
 assert.match(css,/\.gmww-template-floating \.play-game-sheet-card\[data-mode="play"\]/);
 assert.match(flow,/sheet\.classList\.remove\('hidden'\);gmwwGameSheetSetFloating\(true\)/);
 assert.match(flow,/gmwwGameSheetSetFloating\(false\);sheet\.classList\.remove\('hidden'\)/);
 assert.match(flow,/closePlayGameSheet\(\)[^\n]*gmwwGameSheetSetFloating\(false\)/);
});
test('Default is magnetically aligned just above the lower GM menu',()=>{
 const {ctx,card,sheet}=environment();ctx.gmwwGameSheetSetFloating(true);
 assert.ok(sheet.classList.contains('gmww-template-floating'));
 assert.ok(card.classList.contains('gmww-dock-snapped'));
 assert.ok(sheet.classList.contains('gmww-template-compact'),'default should stay tucked above bottom menu');
 assert.equal(card.style.getPropertyValue('left'),'15px');
 assert.equal(card.style.getPropertyValue('top'),'305px');
});
test('Drag state persists locally and restores without server calls',()=>{
 const {ctx,card,saved}=environment();ctx.gmwwGameSheetSetFloating(true);
 ctx.gmwwGameSheetSaveDock({mode:'free',x:29,y:168,collapsed:false});ctx.gmwwGameSheetLayout();
 assert.equal(card.style.getPropertyValue('left'),'22px');assert.equal(card.style.getPropertyValue('top'),'168px');
 assert.ok(saved.has('gmww_game_template_dock_v2'));
 assert.doesNotMatch(script,/playUpdateRoomSettings|playRoomApi|gmApi\(/);
});
test('Compact dock retains header but hides all large content until expanded',()=>{
 const {ctx,sheet,toggle}=environment();ctx.gmwwGameSheetSetFloating(true);
 ctx.gmwwGameSheetSaveDock({mode:'bottom',collapsed:true});ctx.gmwwGameSheetLayout();
 assert.ok(sheet.classList.contains('gmww-template-compact'));
 assert.equal(toggle['aria-expanded'],'false');
 assert.ok(part.includes("handle.style.touchAction='none'"));
 assert.match(css,/\.gmww-template-compact \.play-game-sheet-card\[data-mode="play"\] > :not\(\.sheet-head\)/);
 ctx.gmwwGameSheetSaveDock({mode:'bottom',collapsed:false});ctx.gmwwGameSheetLayout();
 assert.equal(toggle['aria-expanded'],'true');
});
test('Template editor and close remove floating positioning without touching game data',()=>{
 const {ctx,card,sheet}=environment();ctx.gmwwGameSheetSetFloating(true);ctx.gmwwGameSheetSetFloating(false);
 assert.ok(!sheet.classList.contains('gmww-template-floating'));
 assert.ok(!card.classList.contains('gmww-dock-snapped'));
 assert.equal(card.style.getPropertyValue('top'),'');
 assert.equal(card.style.getPropertyValue('left'),'');
});
test('GM bundle stays assembled with dedicated sheet drag handler and recovery',()=>{
 assert.match(part,/initDraggablePlaySheets\(\);initPlayGameSheetDock\(\)/);
 assert.match(part,/if\(card\.closest\('#playGameSheet'\)\)return/);
 assert.match(part,/handle\.addEventListener\('pointermove'/);
 assert.match(part,/Math\.abs\(rect\.bottom-\(menu\.top-5\)\)<=48/);
 assert.ok(app.includes(script.slice(0,70)));
});
