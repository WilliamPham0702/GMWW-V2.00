import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const library=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
const swift=fs.readFileSync('server-game/GMWW-Server/GameView.swift','utf8');
const slice=(s,from,to)=>{const a=s.indexOf(from),b=s.indexOf(to,a+from.length);assert.ok(a>=0&&b>a,from);return s.slice(a,b)};

test('DEMO observer narrates Role (player) action to Role (player) and disappears during day',()=>{
  const nodes=new Map(['battleDemoObserver','battleDemoTurn','battleDemoEventTurn','battleDemoEvent','battleDemoObserverError'].map(id=>[id,{hidden:false,dataset:{},textContent:''}]));
  const room={demo:true,matchId:'M1'};
  const ctx={document:{getElementById:id=>nodes.get(id)||null},playSceneRuntime:{room,
    assignments:[{loginId:'p1',roleName:'Phù Thuỷ'},{loginId:'p2',roleName:'Sói'}],
    gameConfig:{roles:[]}},playSceneState:{step:'battle',phase:'night'},
    playLiveMembers:()=>[{loginId:'p1',displayName:'An'},{loginId:'p2',displayName:'Bình'}],
    demoRunner:{running:true,paused:false,error:'',lastEvent:null},
    demoTurnDescription:()=> 'Đêm 1',String,Array};
  vm.createContext(ctx);
  vm.runInContext(slice(setup,'function demoActorIdentity(','function demoNightPlanKey('),ctx);
  vm.runInContext("demoObserve('Cứu','p1',['p2'])",ctx);
  assert.match(nodes.get('battleDemoEvent').textContent,/Phù Thuỷ \(An\) đã thực hiện hành động \(Cứu\) đến Sói \(Bình\)/);
  ctx.playSceneState.phase='day';
  vm.runInContext('demoRenderObserver()',ctx);
  assert.equal(nodes.get('battleDemoObserver').hidden,true);
});

test('Village bulletin retains committed actor attribution, red-first sorting and 10-second daybreak auto-hide',()=>{
  const rows=slice(battle,'function battleMorningRows(){','function battleMorningPlayAudio(){');
  const ctx={playSceneRuntime:{room:{matchId:'M1'},villageHistory:[
    {id:'a',type:'saved',loginId:'p2',actorId:'p1',night:1,cyclePhase:'night',matchId:'M1'},
    {id:'b',type:'dead',loginId:'p1',actorId:'p2',night:1,cyclePhase:'night',matchId:'M1'}],
    assignments:[{loginId:'p1',roleName:'Phù Thuỷ'},{loginId:'p2',roleName:'Sói'}]},
    playSceneState:{night:1},battleMember:id=>({displayName:id==='p1'?'An':'Bình'}),String,Number,Array,Set};
  vm.createContext(ctx);vm.runInContext(rows,ctx);
  const found=Array.from(vm.runInContext('battleMorningRows(1,\'night\')',ctx));
  assert.equal(found[0].kind,'dead');
  assert.equal(found[0].actor,'Sói (Bình)');
  assert.equal(found[0].role,'Phù Thuỷ');
  assert.match(battle,/morningAutoHideTimer=setTimeout/);
  assert.match(battle,/},10000\)/);
  assert.match(html,/id="battleVillageHistory"/);
  assert.match(css,/#battleMorningList \.is-critical/);
});

test('Wolf labels are white text on black and result colors are negative red, positive green',()=>{
  assert.match(css,/\.play-player-role\[data-faction="wolf"\]/);
  assert.match(css,/background:#0c111a!important;color:#fff!important/);
  assert.match(css,/\[data-result-tone="negative"\]/);
  assert.match(css,/\[data-result-tone="positive"\]/);
  assert.match(css,/justify-content:safe center!important/);
});

test('Gallows shows verdicts and audio upload slots under System library, not Gallows panel',()=>{
  assert.match(html,/id="battleGallowsResult"/);
  assert.match(battle,/audio_system_gallows_open_vote/);
  assert.match(html,/id="battleGallowsInfo"/);
  assert.doesNotMatch(html,/id="battleGallowsAudioSources"/);
  assert.match(battle,/audio_system_gallows_result_dead/);
  assert.match(battle,/audio_system_gallows_result_saved/);
  for(const id of ['audio_system_gallows_vote_result','audio_system_gallows_result_dead','audio_system_gallows_result_saved'])
    assert.match(library,new RegExp("id:'"+id+"'"));
  assert.match(battle,/battleState\.gallowsAudioKey!==audioKey/);
});

test('iPhone haptics require a native bridge, are self-tested at enable and never claim Safari vibration works',()=>{
  assert.match(battle,/function gmHapticAvailable\(\)/);
  assert.match(battle,/iPhone Safari không hỗ trợ rung/);
  assert.match(battle,/if\(value\)gmHapticFeedback\(\)/);
  assert.match(swift,/name: "gmwwHaptic"/);
  assert.match(swift,/UINotificationFeedbackGenerator/);
  assert.match(swift,/AudioServicesPlaySystemSound\(kSystemSoundID_Vibrate\)/);
});
