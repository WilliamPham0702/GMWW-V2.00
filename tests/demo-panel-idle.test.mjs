import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8'),block=source.slice(source.indexOf('const demoPanelState='),source.indexOf('function openPlayRoomEditor('));
test('Only human panel interaction resets 30s idle; collapsing never stops Demo',()=>{
 let callback,delay,collapsed=false;const panel={dataset:{},classList:{add:x=>collapsed=x==='is-collapsed',remove:()=>collapsed=false},addEventListener(){}},button={setAttribute(){},addEventListener(){}};
 const ctx={document:{getElementById:id=>id==='battleDemoPanel'?panel:button},setTimeout:(fn,ms)=>{callback=fn;delay=ms;return 1},clearTimeout(){},playSceneRuntime:{room:{demo:true}},playSceneState:{roomCode:'DEMOAA'}};vm.createContext(ctx);vm.runInContext(block+';initDemoPanel()',ctx);assert.equal(delay,30000);callback();assert.equal(collapsed,true);vm.runInContext('demoPanelTouch()',ctx);assert.equal(collapsed,false);assert.equal(delay,30000);
});
