import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
function section(first,next){return app.slice(app.indexOf(first),app.indexOf(next,app.indexOf(first)))}
test('timeline at top and five primary actions at bottom keep their original IDs',()=>{
  const timeline=html.slice(html.indexOf('id="playSetupStrip"'),html.indexOf('</section>',html.indexOf('id="playSetupStrip"')));
  const dock=html.slice(html.indexOf('<nav class="gm-top-menu-v293 gm-bottom-menu-v325'),html.indexOf('</nav>',html.indexOf('<nav class="gm-top-menu-v293 gm-bottom-menu-v325')));
  assert.ok(timeline.includes('data-play-step="lobby"'));
  assert.equal((timeline.match(/data-play-step=/g)||[]).length,7);
  assert.ok(html.indexOf('id="playSetupStrip"')<html.indexOf('id="playWorld"'));
  assert.ok(html.indexOf('id="gmTopMenu"')>html.indexOf('id="playWorld"'));
  let last=-1;
  for(const id of ['playExitVillage','playAutoGM','playPhasePill','playAudioTop','playEndGame']){
    const pos=dock.indexOf('id="'+id+'"');assert.ok(pos>last, id+' missing or unordered');last=pos;
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  }
  assert.match(dock,/<button[^>]+id="playPhasePill"[^>]+type="button"/);
  assert.doesNotMatch(html,/play-control-bar-three|id="playBack"|id="playPrimaryAction"|id="playNext"/);
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
     savePlayScene(){},closePlayEndSheet(){},async playSyncRoom(){},disconnectPlaySocket(){},gmwwSendGmPresence(){},renderPlayScene(){},playFlashError(){}};
  await vm.runInNewContext(section('async function confirmPlayEndGame()','function playRosterSelectedIds()')+';confirmPlayEndGame()',ctx);
  assert.equal(requests.length,1);assert.equal(requests[0].path,'/reset');
  assert.equal(requests[0].body.forceEnd,true);
  assert.equal(requests[0].body.preserveParticipants,false);
  assert.equal(requests[0].body.expectedResetVersion,5);
  assert.equal(ctx.playSceneState.step,'lobby');
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
    const points=ctx.playSeatPositions(n),expected=Math.max(24,n);assert.equal(points.length,expected);assert.equal(new Set(points.map(p=>p.map(v=>v.toFixed(2)).join(','))).size,expected);
    for(const [x,y] of points){assert.ok(x>=14&&x<=86);assert.ok(y>=32&&y<=70)}
  }
});
test('V2.64 preserves persistent state/preferences and safely resets stale play room',()=>{
  assert.match(app,/const STATE_KEY='GMWW_V258_STATE'/);
  assert.match(app,/const PREF_KEY='GMWW_V258_PREFS'/);
  assert.match(app,/GMWW_PLAY_SCENE_KEY='GMWW_V264_PLAY_SCENE'/);
  assert.match(app,/GMWW_OLD_PLAY_SCENE_KEYS=\['GMWW_V263_PLAY_SCENE'/);
});
