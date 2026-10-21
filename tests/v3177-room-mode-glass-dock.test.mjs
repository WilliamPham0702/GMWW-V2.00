import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const setup=read('server-game/src/30-village-and-setup.part');
const battle=read('server-game/src/40-battle-and-timeline.part');
const events=read('server-game/src/50-roles-and-artifacts.part');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const extract=(source,a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+1);assert.ok(start>=0&&end>start,a);return source.slice(start,end)};

test('Mode tap repaints immediately, with no second concurrent server write',async()=>{
  const handlers={},writes=[],renders=[],button={dataset:{},addEventListener:(k,fn)=>handlers[k]=fn};
  let resolveWrite=()=>{};
  const runtime={busy:false,room:{demo:false,roomMode:'offline',phase:'lobby'},players:[]};
  const ui={selectedCode:'AAA111',modeTouched:false,modeSaving:false,pendingMode:''};
  const state={roomMode:'offline',roomCode:'AAA111',gmToken:'gm'};
  const context={document:{getElementById:id=>id==='playRoomModeToggle'?button:null},
    playSceneRuntime:runtime,playRoomUiState:ui,playSceneState:state,
    isLivePlayRoom:()=>true,playRoomApi:async(path,opts)=>new Promise(resolve=>{writes.push(JSON.parse(opts.body));resolveWrite=resolve}),
    savePlayScene:()=>{},rememberPlayRoom:()=>{},
    renderPlayCreateRoomSheet:()=>renders.push(ui.pendingMode),playFlashError:e=>{throw Error(e)}};
  vm.createContext(context);
  vm.runInContext(extract(setup,'const PLAY_ROOM_MODE_CYCLE=','function playRoomRegistry(')+
    extract(setup,'async function flushPlayRoomMode(){','function bindPlaySeatMoveButtons(')+
    ';bindPlayRoomModeButtons()',context);
  assert.equal(handlers.click(),undefined);
  assert.equal(ui.pendingMode,'offline');assert.equal(renders[0],'offline');
  handlers.click();handlers.click();
  assert.equal(ui.pendingMode,'demo');
  assert.equal(writes.length,1,'no overlapping writes');
  resolveWrite({room:{demo:false,roomMode:'offline',phase:'lobby'},players:[]});
  await new Promise(r=>setImmediate(r));
  assert.equal(writes.length,2);
  assert.equal(writes[1].demo,true);
  resolveWrite({room:{demo:true,roomMode:'offline',phase:'lobby'},players:[]});
  await new Promise(r=>setImmediate(r));
  assert.equal(ui.modeSaving,false);assert.equal(ui.pendingMode,'');
  assert.equal(runtime.room.demo,true);
});
test('Demo has a clockwise running ring, static pause and independent speed tile',()=>{
  assert.match(html,/id="battleDemoToggle"[^>]*><span class="demo-clockwise-orbit"/);
  assert.match(html,/<button id="battleDemoSpeed"[^>]*data-speed="1"/);
  assert.doesNotMatch(html,/<select id="battleDemoSpeed"/);
  assert.match(css,/@keyframes gmww-clockwise-run/);
  assert.match(css,/#battleDemoToggle\[data-run-state="paused"\]/);
  assert.match(battle,/const speeds=\[1,2,5,10\]/);
});
test('Lab has been removed, and +New links saved-template editor and return',()=>{
  assert.doesNotMatch(html,/data-lib="lab"|id="lib-lab"|gmww-lab-script|gmwwLabRun/);
  assert.match(html,/<button class="libtab active" data-lib="cards"/);
  assert.match(html,/id="playGameTemplateAdd"/);
  assert.match(html,/id="playGameTemplateBack"/);
  assert.match(events,/playGameReturnToSelection=true;void openLibraryGameTemplate/);
  assert.match(battle,/if\(resumeSelection&&playSceneState.step==='game'\)await openPlayGameSheet/);
});
test('Glass panels and universal horizontal rail do not cover the village art',()=>{
  assert.match(css,/--gmww-rail-width:min\(680px,calc\(100vw - 24px\)\)/);
  assert.match(css,/background:rgba\(7,34,52,.70\)!important/);
  assert.match(css,/body.play-immersive #start #playBattleTop/);
  assert.match(css,/gmww-dock-snapped/);
});
test('Magnet snaps at both menu edges, detaches outside threshold',()=>{
  const top={left:12,right:400,top:80,bottom:130,width:388,height:50};
  const bottom={left:12,right:400,top:700,bottom:752,width:388,height:52};
  const context={innerWidth:412,innerHeight:844,Math,Number,document:{
    getElementById:id=>id==='playSetupStrip'?{hidden:false,getClientRects:()=>[top],getBoundingClientRect:()=>top}:
      id==='gmTopMenu'?{hidden:false,getClientRects:()=>[bottom],getBoundingClientRect:()=>bottom}:null
  }};
  const snap=vm.runInNewContext(extract(battle,'function gmwwMenuSnap(','/* Battle overlays share')+';gmwwMenuSnap',context);
  const nearTop=snap({left:12,right:400,top:137,bottom:300,width:388,height:163});
  assert.equal(nearTop.edge,'top');assert.equal(nearTop.left,12);
  const nearBottom=snap({left:12,right:400,top:500,bottom:694,width:388,height:194});
  assert.equal(nearBottom.edge,'bottom');
  assert.equal(snap({left:12,right:400,top:320,bottom:460,width:388,height:140}),null);
});
