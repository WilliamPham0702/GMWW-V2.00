import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const setup=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const between=(source,begin,end)=>{
  const start=source.indexOf(begin),stop=source.indexOf(end,start);
  assert.ok(start>=0&&stop>start,'missing source function '+begin);
  return source.slice(start,stop);
};

test('Auto GM unlocks a persistent audio context synchronously on its starting tap',()=>{
  const fn=between(battle,'async function togglePlayAutoGM(', 'async function playGatherCallMembers(');
  assert.match(fn,/battleUnlockAudioFromGesture\(\);[\s\S]*if\(playSceneRuntime\.busy\)/);
  assert.match(setup,/const battleDecodedAudioCache=new Map\(\)/);
  assert.match(setup,/if\(typeof battleUnlockedAudioContext!=='undefined'&&battleUnlockedAudioContext\)\{\s*if\(await battlePlayWebAudioFallback/);
  assert.match(setup,/ctx\.decodeAudioData\(await response\.arrayBuffer\(\)\)/);
});

test('Auto GM day queue persists through Gallows stage transitions',()=>{
  const fn=between(battle,'function battleQueueDayAudio(', 'function battleMorningPlayAudio(');
  const key=between(fn,'const key=[','].join(\':\');');
  assert.doesNotMatch(key,/gallows\?\.stage/);
  assert.match(battle,/battleQueueDayAudio\(\[\['audio_system_countdown'/);
  assert.match(battle,/battleQueueDayAudio\(\[\['audio_system_time_up'/);
  assert.match(battle,/\['nominating','selecting','voting'\]/);
  assert.match(battle,/stage==='selecting'\?/);
  assert.match(setup,/failedAudioTurnKey=expectedKey/);
});

test('failed role audio retries the SAME cue and does not silently skip later cues',async()=>{
  const fn=between(setup,'function battlePlayTurnAudioSequence(', 'function battleAudioForTurn(');
  const key='match-1:night:1:role-a',timers=[],calls=[],failureBudget={'a':2,'b':1};
  const state={key,audioPendingTurnKey:key,lastAudioTurnKey:''};
  const ctx={
    battleState:state,
    playSceneState:{step:'battle',phase:'night'},
    battlePlayConfiguredAudio:(_kind,id,_label,_show,done)=>{
      calls.push(id);
      if(failureBudget[id]>0){failureBudget[id]--;done();return false}
      queueMicrotask(()=>done());
      return true;
    },
    playAudioMuted:()=>false,
    playFlashError:message=>{throw Error(message)},
    setTimeout:callback=>{timers.push(callback);return 1},
    console,Promise
  };
  vm.createContext(ctx);vm.runInContext(fn,ctx);
  ctx.battlePlayTurnAudioSequence([{kind:'cards',targetId:'a',name:'Vai A'},
    {kind:'cards',targetId:'b',name:'Vai B'}],key,false,true);
  for(let i=0;i<25;i++){
    await Promise.resolve();await Promise.resolve();
    if(timers.length)timers.shift()();
  }
  assert.deepEqual(calls,['a','a','a','b','b']);
  assert.equal(state.lastAudioTurnKey,key);
  assert.equal(state.audioPendingTurnKey,'');
});

test('stale night turns are never retried after Server moved to the next turn',async()=>{
  const fn=between(setup,'function battlePlayTurnAudioSequence(', 'function battleAudioForTurn(');
  const key='match-1:night:1:role-a',timers=[],calls=[];
  const state={key,audioPendingTurnKey:key,lastAudioTurnKey:''};
  const ctx={
    battleState:state,playSceneState:{step:'battle',phase:'night'},
    battlePlayConfiguredAudio:(_kind,id,_label,_show,done)=>{calls.push(id);done();return false},
    playAudioMuted:()=>false,playFlashError:()=>{},
    setTimeout:cb=>{timers.push(cb)},console,Promise
  };
  vm.createContext(ctx);vm.runInContext(fn,ctx);
  ctx.battlePlayTurnAudioSequence([{kind:'cards',targetId:'a',name:'A'}],key,false,true);
  await Promise.resolve();await Promise.resolve();
  state.key='match-1:night:1:role-b';
  for(const callback of timers)callback();
  await Promise.resolve();
  assert.deepEqual(calls,['a']);
  assert.equal(state.audioPendingTurnKey,'');
});

test('periodic safety check never repeats a completed turn and respects mute',()=>{
  const fn=between(battle,'function battleEnsureAutoTurnAudio(', 'function initBattleControls(');
  let calls=0,muted=false;
  const turn={id:'role-a',kind:'role'};
  const key='match-1:night:1:role-a';
  const state={key,lastAudioTurnKey:key,audioPendingTurnKey:'',busy:false,syncPending:false};
  const ctx={
    battleState:state,
    playSceneState:{step:'battle',phase:'night',night:1},
    playSceneRuntime:{room:{matchId:'match-1',autoGM:true},busy:false},
    playAudioMuted:()=>muted,battleTurn:()=>turn,
    battleConfirmAudioGate:false,
    battleAudioForTurn:()=>{calls++}
  };
  vm.createContext(ctx);vm.runInContext(fn,ctx);
  ctx.battleEnsureAutoTurnAudio();assert.equal(calls,0);
  state.lastAudioTurnKey='';
  state.audioPendingTurnKey=key;
  ctx.battleEnsureAutoTurnAudio();assert.equal(calls,0);
  state.audioPendingTurnKey='';
  muted=true;ctx.battleEnsureAutoTurnAudio();assert.equal(calls,0);
  muted=false;ctx.battleEnsureAutoTurnAudio();assert.equal(calls,1);
});
