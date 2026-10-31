import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const library=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));

test('dawn cue plays before the number of night deaths; Ngày dài only on open selection',()=>{
  const dawn=between(battle,'function battleMorningPlayAudio(', 'function battleDivinationSystemAudioCue(');
  assert.match(dawn,/audio_system_day_wakeup/);
  assert.match(dawn,/audio_system_morning_deaths_intro/);
  assert.match(dawn,/audio_system_morning_number_/);
  assert.doesNotMatch(dawn,/audio_system_gallows_day_long/);
  const gallows=between(battle,'async function battleGallowsCommand(', '/\\* V3.234');
  const stage=between(battle,'function battleGallowsRender(', 'async function battleGallowsCommand(');
  assert.match(stage,/audio_system_gallows_day_long/);
  assert.doesNotMatch(gallows,/open:\[\['audio_system_gallows_day_long','Ngày dài rồi'/);
  assert.doesNotMatch(gallows,/battlePlayConfiguredAudio\('system',cues\[command\],''\)/);
});

test('30s and 0s cues work in manually controlled days; a paused clock cannot announce',()=>{
  const tick=between(battle,'function battleTickCountdown(', 'async function battleNavigateIndex(');
  assert.match(tick,/dayPausedRemainingMs==null&&seconds<=warningSeconds&&seconds>0/);
  assert.match(tick,/dayPausedRemainingMs==null&&seconds<=0/);
  assert.doesNotMatch(tick,/autoGM!==false\|\|playSceneRuntime\.room\?\.demo===true/);
});

test('Player Web verdict is queued once and will not interrupt dawn',()=>{
  const show=between(source,'function battleMorningShow(', 'function battleRenderFactionStats(');
  assert.match(show,/morningVerdictsHeard/);
  assert.match(show,/battleQueueDayAudio\(\[\[cue,row\.name/);
  const dawn=between(battle,'function battleMorningPlayAudio(', 'function battleDivinationSystemAudioCue(');
  assert.doesNotMatch(dawn,/assassin_correct|assassin_wrong/);
});

test('server-confirmed vote announces tally before alive/dead verdict',()=>{
  const vote=between(battle,'function battleRenderGallowsVerdict(', 'function battleGallowsRender(');
  assert.match(vote,/audio_system_gallows_vote_result/);
  assert.match(vote,/\['__tts__','Kết quả phiếu: '/);
  assert.match(vote,/\[cue,name\+\(g\.outcome==='dead'/);
  assert.match(vote,/battleQueueDayAudio/);
});

test('day narration is serialized and an outdated decoded role sound cannot restart',()=>{
  const q=between(battle,'let battleDayAudioQueue=null;', 'function battleMorningPlayAudio(');
  assert.match(q,/if\(queue\.active\)return/);
  assert.match(q,/battlePlayConfiguredAudio\('system',id,label,false,complete\)/);
  assert.match(q,/if\(done\)return/);
  const decoded=between(source,'async function battlePlayWebAudioFallback(', 'async function battlePlayConfiguredAudio(');
  assert.match(decoded,/requestId!==battleAudioRequestId\)\{onFinished\?\.\(\);return true\}/);
});

test('library audit works on all three categories, not the current tab after a delayed read',()=>{
  const audit=between(library,'async function renderAudio(', 'async function playAudioItem(');
  assert.match(audit,/const kind=audioKind/);
  assert.match(audit,/if\(kind!==audioKind\)return/);
  assert.match(audit,/state\.actions\?\.role/);
  assert.match(audit,/KHÔNG kiểm tra tệp thực có tồn tại/);
});

test('audio replay still resolves Old Witch audio by canonical role and V1 source',()=>{
  const ctx={state:{audio:{cards:[{id:'a',targetId:'role_old_witch',sourceKey:'ROLE:source-18',name:'Phù Thuỷ Già'}]}},window:{GMWW_V1_AUDIO:{'ROLE:source-18':{base64:'abc'}}},gmwwBundledLegacyAudio:{}};
  vm.runInNewContext(between(source,'function battleFindAudio(', 'async function battleWarmAudio(')+';globalThis.find=battleFindAudio',ctx);
  assert.equal(ctx.find('cards','source-18','Phù Thuỷ Già').targetId,'role_old_witch');
});

test('GM generated app remains the exact seven-part bundle',()=>{
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
  assert.equal(fs.readFileSync('server-game/current/app.js','utf8'),parts.map(p=>fs.readFileSync('server-game/src/'+p,'utf8')).join(''));
});

test('serial day queue waits until previous narration ends before starting Player Web outcome',()=>{
  const s=between(battle,'let battleDayAudioQueue=null;', 'function battleMorningPlayAudio(');
  const heard=[],finishes=[];
  const ctx={
    playSceneState:{phase:'day',night:1},
    playSceneRuntime:{room:{matchId:'match1',cycleStartedAt:'2026-10-27T12:00:00.000Z'}},
    battlePlayConfiguredAudio:(_kind,id,_text,_error,finished)=>{heard.push(id);finishes.push(finished);return Promise.resolve(true)},
    battleSpeakCue:()=>true,setTimeout:()=>1,clearTimeout:()=>{}
  };
  vm.createContext(ctx);vm.runInContext(s+';globalThis.enqueue=battleQueueDayAudio',ctx);
  ctx.enqueue([['audio_system_day_wakeup','Làng ơi dậy đi'],['audio_system_morning_number_1','1']]);
  ctx.enqueue([['audio_system_assassin_correct','Đúng']]);
  assert.deepEqual(heard,['audio_system_day_wakeup']);
  finishes.shift()();
  assert.deepEqual(heard,['audio_system_day_wakeup','audio_system_morning_number_1']);
  finishes.shift()();
  assert.deepEqual(heard,['audio_system_day_wakeup','audio_system_morning_number_1','audio_system_assassin_correct']);
});

test('countdown triggers in manual mode and does not duplicate on refresh',()=>{
  const s=between(battle,'function battleTickCountdown(', 'async function battleNavigateIndex(');
  const start=Date.now(),heard=[];
  const clock={textContent:'',classList:{toggle(){}},title:''};
  const ctx={
    battleGallowsTick(){},
    battleMarkPlayers(){},
    document:{getElementById:id=>id==='battleCountdown'?clock:id==='playBattleDock'?{hidden:false}:null},
    playSceneState:{phase:'day',night:1},
    playSceneRuntime:{room:{matchId:'m1',cycleStartedAt:new Date(start).toISOString(),autoGM:false,dayDeadlineAt:new Date(start+26000).toISOString()},nightRuntime:null,serverClockOffsetMs:0,gameConfig:{timing:{villageDiscussionSec:90}}},
    performance:{now:()=>0},Date,
    battleRules:()=>({formatTime:x=>String(x)}),
    battleState:{countdownKey:'',dayCountdownCueKey:'',dayTimeupCueKey:''},
    battlePlayConfiguredAudio:(_kind,id)=>{heard.push(id);return true}
  };
  vm.createContext(ctx);vm.runInContext(s+';globalThis.tick=battleTickCountdown',ctx);
  ctx.tick();ctx.tick();
  assert.deepEqual(heard,['audio_system_countdown']);
  ctx.playSceneRuntime.room.dayPausedRemainingMs=0;
  ctx.playSceneRuntime.room.dayDeadlineAt=new Date(start-1000).toISOString();
  ctx.tick();
  assert.deepEqual(heard,['audio_system_countdown'],'paused time-up must be silent');
  ctx.playSceneRuntime.room.dayPausedRemainingMs=null;
  ctx.tick();
  assert.deepEqual(heard,['audio_system_countdown','audio_system_time_up']);
});


test('morning death narration skips fragments at zero deaths and keeps other notices',()=>{
  const body=between(battle,'function battleMorningPlayAudio(', 'function battleDivinationSystemAudioCue(');
  function cues(rows){
    const calls=[];
    const ctx={battleMorningRows:()=>rows,battleQueueDayAudio:items=>calls.push(...items)};
    vm.createContext(ctx);
    vm.runInContext(body+';globalThis.play=battleMorningPlayAudio',ctx);
    ctx.play();
    return calls.map(([id])=>id);
  }
  const intro='audio_system_morning_deaths_intro';
  const noun='audio_system_morning_dead_noun';
  const numbers=ids=>ids.filter(id=>id.startsWith('audio_system_morning_number_'));
  const none=cues([]);
  assert.deepEqual(none,['audio_system_day_wakeup']);
  assert.equal(none.includes(intro),false);
  assert.equal(none.includes(noun),false);
  assert.deepEqual(numbers(none),[]);
  const status=cues([{kind:'expelled',name:'An',label:'Bị đuổi'},
                     {kind:'protected',name:'Bình',label:'được bảo vệ'}]);
  assert.deepEqual(status,['audio_system_day_wakeup','audio_system_morning_expelled','audio_system_morning_protected']);
  assert.deepEqual(numbers(status),[]);
  const saved=cues([{kind:'saved',name:'An',label:'được cứu'}]);
  assert.deepEqual(saved,['audio_system_day_wakeup','audio_system_morning_saved']);
  const one=cues([{kind:'dead',name:'An',role:'Dân Làng',label:'đã chết'}]);
  assert.deepEqual(one,['audio_system_day_wakeup',intro,'audio_system_morning_number_1',noun]);
  const two=cues([{kind:'dead',name:'An',role:'Dân Làng',label:'đã chết'},
                  {kind:'dead',name:'Bình',role:'Thiếu Nữ',label:'chết vì thăm nhà Sói'}]);
  assert.deepEqual(two,['audio_system_day_wakeup',intro,'audio_system_morning_number_2',noun,'audio_system_morning_maiden_wolf']);
  assert.deepEqual(numbers(two),['audio_system_morning_number_2']);
});
