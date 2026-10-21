import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8'),battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8'),worker=fs.readFileSync('src/index.js','utf8');
const extract=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
test('IPA cross-origin Demo owner header is accepted by real server CORS policy',()=>{
 const cors=vm.runInNewContext('('+worker.match(/function corsHeaders\(\)\{return\{[^}]+\}\}/)[0]+')')();
 const allowed=cors['access-control-allow-headers'].toLowerCase().split(',').map(s=>s.trim());
 for(const header of ['content-type','authorization','x-gmww-demo-owner'])assert.ok(allowed.includes(header),header+' must pass browser preflight');
});
test('Demo rooms are listed like any other user-created room, with no extra fixed tile',()=>{
 const children=[],list={replaceChildren(){children.length=0},appendChild(x){children.push(x)}};
 const ctx={document:{getElementById:id=>id==='playCreatedRoomList'?list:null,createElement:()=>({})},
  playRoomRegistry:()=>[{roomCode:'A',roomName:'A'},{roomCode:'B',roomName:'B'},{roomCode:'D',roomName:'D',demo:true}],
  playSceneState:{},playRoomUiState:{},playEsc:x=>x,playReadableRoomName:x=>x};
 vm.runInNewContext(extract(setup,'function renderPlayCreatedRooms(){','/* Demo controls')+';renderPlayCreatedRooms()',ctx);
 assert.equal(children.length,3);
 assert.match(children[2].innerHTML,/DEMO/);
 assert.ok(!children.some(x=>x.id==='playDemoRoomChoice'));
});
test('New Demo room uses its own server flag and the normal gather workflow',()=>{
 assert.match(setup,/playCreateRoom\(false\)/);
 assert.match(setup,/demo:false,roomMode:'offline'/);
 assert.match(setup,/playSceneState\.step='seats'/);
});
test('Online Demo GM manually selects existing members through same roster sheet',async()=>{
 let roster=0,online=0;const ctx={playSceneRuntime:{room:{demo:true,seatsLocked:false}},playSceneState:{roomMode:'online'},isLivePlayRoom:()=>true,openPlayRosterSheet:async()=>roster++,playCallOnlineMembers:async()=>online++};
 const fn=vm.runInNewContext(extract(battle,'async function playGatherCallMembers(){','async function playGatherRandomize(){')+';playGatherCallMembers',ctx);
 await fn();assert.equal(roster,1);assert.equal(online,0);
});
test('Choosing sample game preserves selected roster instead of random replacement',()=>{
 const choose=extract(battle,'async function savePlayGame(){','function ');
 assert.doesNotMatch(choose,/demoPopulateExistingMembers/);
 assert.match(choose,/need=playLiveMembers\(\)\.length/);
});
test('Demo controller appears before other GM actions in the campfire menu',()=>{
 const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
 const panel=html.indexOf('id="battleDemoPanel"'),menu=html.indexOf('id="battleWolfMenu"'),actions=html.indexOf('class="battle-wolf-actions"');
 assert.ok(menu>0&&actions>menu&&panel>actions);
 assert.match(html,/id="battleDemoStatus"/);
 assert.match(html,/id="battleDemoToggle"/);
});
test('Demo roster saves only GM-selected snapshots in both modes, without presence writes',async()=>{
 const events=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
 const fnSource=extract(events,'async function savePlayRosterIds(ids){','async function savePlayRoster(');
 for(const mode of ['online','offline']){
  const calls=[],runtime={room:{demo:true},players:[]},scene={roomMode:mode,roomCode:'DEMOAA'},node={disabled:false,classList:{add(){}},setAttribute(){},removeAttribute(){}};
  const ctx={playSceneRuntime:runtime,playSceneState:scene,playRosterSaving:false,playLiveMembers:()=>[],memberAdminState:{members:[{loginId:'a',displayName:'A',online:false},{loginId:'b',displayName:'B',online:true}]},document:{getElementById:()=>node},playSetBusy(){},playRosterSaveFeedback(){},playFlashError:x=>{throw Error(x)},closePlayRosterSheet(){},savePlayScene(){},playPublishStage:async()=>{},renderPlayScene(){},setTimeout(){},playRoomApi:async(path,opts)=>{calls.push({path,body:JSON.parse(opts.body)});return{ok:true,selectedCount:1,room:{demo:true},players:[{loginId:'a'}]}}};
  const save=vm.runInNewContext(fnSource+';savePlayRosterIds',ctx);await save(['a']);assert.equal(calls.length,1);assert.equal(calls[0].path,'/participants');assert.deepEqual(Array.from(calls[0].body.members,m=>m.loginId),['a']);assert.equal(scene.step,'seats');
 }
});
