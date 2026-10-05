import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
function section(first,next){return app.slice(app.indexOf(first),app.indexOf(next,app.indexOf(first)))}
test('Exit is immediately before Back, and exists only once',()=>{
  const footer=html.slice(html.indexOf('<footer class="play-control-bar">'),html.indexOf('</footer>',html.indexOf('<footer class="play-control-bar">')));
  assert.ok(footer.indexOf('id="playExitVillage"')<footer.indexOf('id="playBack"'));
  assert.equal((html.match(/id="playExitVillage"/g)||[]).length,1);
});
test('cancel Exit leaves village and local room data untouched',()=>{
  let changes=0;const code=section('function exitPlayImmersive()','function initPlayScene()');
  const ctx={playSceneRuntime:{busy:false},confirm:()=>false,document:{body:{classList:{remove(){changes++}}},querySelectorAll(){changes++;return[]}},localStorage:{setItem(){throw new Error('must not mutate room')}}};
  vm.runInNewContext(code+';exitPlayImmersive()',ctx);assert.equal(changes,0);
});
test('confirmed Exit returns Home without ending/deleting room',()=>{
  let page='',removed=false;
  const ctx={playSceneRuntime:{busy:false},confirm:()=>true,document:{body:{classList:{remove(){removed=true}}},querySelectorAll(s){return s==='.page'?[{id:'home',classList:{toggle(_,active){if(active)page='home'}}}]:[]},getElementById(){return{scrollTop:9}}}};
  vm.runInNewContext(section('function exitPlayImmersive()','function initPlayScene()')+';exitPlayImmersive()',ctx);
  assert.equal(page,'home');assert.equal(removed,true);
});
test('cancel final End confirmation never sends API request or changes busy state',async()=>{
  let calls=0,busy=0;const ctx={playSceneRuntime:{selectedWinnerFaction:'Phe Sói',busy:false},playSceneState:{roomCode:'ABC234'},confirm:()=>false,playSetBusy(){busy++},playRoomApi(){calls++},playFlashError(){throw new Error('not expected')}};
  const result=vm.runInNewContext(section('async function confirmPlayEndGame()','function playRosterSelectedIds()')+';confirmPlayEndGame()',ctx);
  await result;assert.equal(calls,0);assert.equal(busy,0);
});
test('confirmed End sends selected winner once and retains seat data',async()=>{
  const requests=[],room={matchId:'match-1',matchRevision:4},players=[{loginId:'a',seatId:9}];
  const ctx={playSceneRuntime:{selectedWinnerFaction:'Phe Sói',busy:false,room,players},playSceneState:{roomCode:'ABC234'},confirm:()=>true,playSetBusy(on){ctx.playSceneRuntime.busy=on},document:{getElementById(){return{disabled:false}}},async playRoomApi(path,opts){requests.push({path,body:JSON.parse(opts.body)});return{room:{...room,phase:'lobby'}}},savePlayScene(){},closePlayEndSheet(){},async playSyncRoom(){},renderPlayScene(){},playFlashError(){}};
  await vm.runInNewContext(section('async function confirmPlayEndGame()','function playRosterSelectedIds()')+';confirmPlayEndGame()',ctx);
  assert.equal(requests.length,1);assert.equal(requests[0].path,'/end');assert.equal(requests[0].body.winnerFaction,'Phe Sói');assert.equal(ctx.playSceneState.step,'members');assert.equal(players[0].seatId,9);
});
test('fixed seats use stable, distinct positions for every room size',()=>{
  const ctx={};vm.createContext(ctx);vm.runInContext(readFileSync(new URL('../assets/village/village-layout.js',import.meta.url),'utf8'),ctx);vm.runInContext(section('function playSeatPositions(count)','function playEsc(v)'),ctx);
  for(let n=1;n<=30;n++){
    const points=ctx.playSeatPositions(n);assert.equal(points.length,n);assert.equal(new Set(points.map(p=>p.map(v=>v.toFixed(2)).join(','))).size,n);
    for(const [x,y] of points){assert.ok(x>=14&&x<=86);assert.ok(y>=32&&y<=70)}
  }
});
test('V2.64 preserves persistent state/preferences and safely resets stale play room',()=>{
  assert.match(app,/const STATE_KEY='GMWW_V258_STATE'/);
  assert.match(app,/const PREF_KEY='GMWW_V258_PREFS'/);
  assert.match(app,/GMWW_PLAY_SCENE_KEY='GMWW_V264_PLAY_SCENE'/);
  assert.match(app,/GMWW_OLD_PLAY_SCENE_KEYS=\['GMWW_V263_PLAY_SCENE'/);
});
