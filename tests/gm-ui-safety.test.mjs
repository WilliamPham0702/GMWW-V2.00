import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
function section(first,next){return app.slice(app.indexOf(first),app.indexOf(next,app.indexOf(first)))}
test('top menu owns Exit and End while bottom menu is Back, Info, Continue only',()=>{
  const top=html.slice(html.indexOf('<nav class="gm-top-menu-v293"'),html.indexOf('</nav>',html.indexOf('<nav class="gm-top-menu-v293"')));
  const footer=html.slice(html.indexOf('<footer class="play-control-bar'),html.indexOf('</footer>',html.indexOf('<footer class="play-control-bar')));
  const exit=top.indexOf('id="playExitVillage"'),auto=top.indexOf('id="playAutoGM"'),info=top.indexOf('id="playPhasePill"'),audio=top.indexOf('id="playAudioTop"'),end=top.indexOf('id="playEndGame"');
  assert.ok(exit>=0&&auto>exit&&info>auto&&audio>info&&end>audio);
  assert.equal((html.match(/id="playExitVillage"/g)||[]).length,1);
  assert.equal((html.match(/id="playEndGame"/g)||[]).length,1);
  assert.doesNotMatch(footer,/playExitVillage|playEndGame/);
  assert.match(footer,/id="playBack"/);assert.match(footer,/id="playPrimaryAction"/);assert.match(footer,/id="playNext"/);
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
test('force End modal opens at any phase and requires explicit confirmation',async()=>{
  const code=section('async function openPlayEndSheet()','function closePlayEndSheet()');
  let opened=false,requests=0;
  const ctx={playSceneRuntime:{busy:false,room:{phase:'lobby',roomName:'Test'}},playSceneState:{roomCode:'ABC234'},
    isLivePlayRoom:()=>true,document:{getElementById(id){
      if(id==='playEndSheet')return{classList:{remove(name){opened=name==='hidden'}}};
      return{disabled:false,textContent:''}
    }},playFlashError(){throw Error('unexpected')},playSyncRoom(){requests++}};
  await vm.runInNewContext(code+';openPlayEndSheet()',ctx);
  assert.equal(opened,true);assert.equal(requests,0);
  assert.match(html,/id="playEndConfirm"[^>]*>XÁC NHẬN KẾT THÚC/);
  assert.doesNotMatch(html,/id="playWinnerGrid"/);
});

test('cancel force End closes dialog without calling the server',()=>{
  const code=section('function closePlayEndSheet()','async function confirmPlayEndGame()');
  let hidden=false;
  const ctx={document:{getElementById(){return{classList:{add(c){hidden=c==='hidden'}}}}}};
  vm.runInNewContext(code+';closePlayEndSheet()',ctx);
  assert.equal(hidden,true);
});

test('confirmed force End resets match and clears members without requiring winner or match phase',async()=>{
  const requests=[],room={matchId:'match-1',matchRevision:4,resetVersion:5,phase:'lobby',enabled:true};
  const ctx={playSceneRuntime:{selectedWinnerFaction:'',busy:false,room,players:[{loginId:'a',seatId:9}],assignments:[{roleId:'wolf'}],nightRuntime:{},
     activeEffects:[{type:'frozen'}]},playSceneState:{roomCode:'ABC234',step:'seats',night:4,matchId:'match-1',selectedMemberIds:['a']},
     isLivePlayRoom:()=>true,playSetBusy(on){ctx.playSceneRuntime.busy=on},
     document:{getElementById(){return{disabled:false}}},
     async playRoomApi(path,opts){requests.push({path,body:JSON.parse(opts.body)});return {ok:true,hardReset:true,playersCount:0,room:{...room,phase:'lobby',seatsLocked:false,resetVersion:6}}},
     savePlayScene(){},closePlayEndSheet(){},async playSyncRoom(){},renderPlayScene(){},playFlashError(){}};
  await vm.runInNewContext(section('async function confirmPlayEndGame()','function playRosterSelectedIds()')+';confirmPlayEndGame()',ctx);
  assert.equal(requests.length,1);assert.equal(requests[0].path,'/reset');
  assert.equal(requests[0].body.forceEnd,true);
  assert.equal(requests[0].body.preserveParticipants,false);
  assert.equal(requests[0].body.expectedResetVersion,5);
  assert.equal(ctx.playSceneState.step,'room');
  assert.equal(ctx.playSceneState.night,0);
  assert.equal(ctx.playSceneState.matchId,'');
  assert.equal(ctx.playSceneRuntime.players.length,0);
  assert.equal(ctx.playSceneRuntime.assignments.length,0);
  assert.equal(ctx.playSceneRuntime.activeEffects.length,0);
  assert.equal(ctx.playSceneRuntime.nightRuntime,null);
  assert.equal(ctx.playSceneRuntime.busy,false);
});

test('busy state prevents duplicate forced end requests',async()=>{
  let requests=0;const ctx={playSceneRuntime:{busy:true},isLivePlayRoom:()=>true,playRoomApi(){requests++}};
  await vm.runInNewContext(section('async function confirmPlayEndGame()','function playRosterSelectedIds()')+';confirmPlayEndGame()',ctx);
  assert.equal(requests,0);
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
