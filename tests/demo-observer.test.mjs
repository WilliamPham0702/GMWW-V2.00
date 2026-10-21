import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
function harness(){const nodes=new Map(),scene={step:'battle',phase:'night',night:2},runtime={room:{demo:true,matchId:'m1'},nightRuntime:{cursor:1,queue:[{id:'wolf'},{id:'seer',label:'Tiên Tri'}]}},runner={running:true,paused:false,lastEvent:null,error:''};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',dataset:{}});return nodes.get(id)};
 const start=setup.indexOf('function demoTurnDescription(');assert.ok(start>=0,'Demo observation must expose the current turn');
 const ctx={document:{getElementById:node},playSceneState:scene,playSceneRuntime:runtime,demoRunner:runner,battleTurn:()=>runtime.nightRuntime?.queue[runtime.nightRuntime.cursor],playLiveMembers:()=>[{loginId:'alice',displayName:'An'},{loginId:'bob',displayName:'Bình'}],Date};vm.createContext(ctx);vm.runInContext(setup.slice(start,setup.indexOf('function openPlayRoomEditor(',start))+';globalThis.api={demoRenderObserver,demoObserve}',ctx);return{ctx,nodes,scene,runtime,runner,...ctx.api};}
test('Observer exposes exact phase/turn and distinguishes in-flight from accepted actions without changing game timing',()=>{const h=harness();h.demoRenderObserver();assert.match(h.nodes.get('battleDemoTurn').textContent,/Đêm 2.*Lượt 2\/2.*Tiên Tri/);h.demoObserve('Soi','alice',['bob'],'pending');assert.match(h.nodes.get('battleDemoEvent').textContent,/Đang thực hiện:.*An.*Soi.*Bình/);h.demoObserve('Soi','alice',['bob'],'accepted');assert.match(h.nodes.get('battleDemoEvent').textContent,/Vai Trò.*An.*đã thực hiện hành động.*Soi.*Vai Trò.*Bình/);h.runtime.nightRuntime.cursor=0;h.demoRenderObserver();assert.match(h.nodes.get('battleDemoEventTurn').textContent,/Lượt 2\/2.*Tiên Tri/);h.runner.paused=true;h.runner.running=false;h.demoRenderObserver();assert.match(h.nodes.get('battleDemoTurn').textContent,/Tạm dừng/);assert.equal(h.nodes.get('battleDemoObserver').hidden,false);h.runtime.room.demo=false;h.demoRenderObserver();assert.equal(h.nodes.get('battleDemoObserver').hidden,true)});
test('Observer hides during day and discards prior-match events on night return',()=>{
 const h=harness();
 h.scene.phase='day';h.scene.night=3;h.runtime.gallows={stage:'voting'};
 h.demoObserve('Bỏ phiếu 👎','alice',['bob'],'accepted');
 assert.equal(h.nodes.get('battleDemoObserver').hidden,true);
 assert.equal(h.runner.lastEvent.action,'Bỏ phiếu 👎');
 h.runtime.room.matchId='m2';h.scene.phase='night';
 h.demoRenderObserver();
 assert.match(h.nodes.get('battleDemoEvent').textContent,/Chưa có hành động/);
});
