import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const setup=readFileSync('server-game/src/30-village-and-setup.part','utf8');
const battle=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const worker=readFileSync('src/index.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const events=readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const between=(source,a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start+1);
  assert.ok(start>=0&&end>start,'Function extraction failed: '+a);
  return source.slice(start,end);
};

test('Demo is one room card inside the room list, never a separate fake member entry',()=>{
  const listStart=html.indexOf('id="playCreatedRoomList"'),card=html.indexOf('id="playDemoRoomChoice"');
  assert.ok(listStart>=0&&card>listStart);
  assert.match(setup,/if\(demoButton\)list\.appendChild\(demoButton\)/);
  assert.match(setup,/renderPlayCreateRoomSheet\(\)/);
  assert.match(events,/playDemoRoomChoice/);
  assert.match(worker,/if\(body\.demo===true&&bearer\(request\)!==GM_SYNC_TOKEN\)/);
});

test('Demo night reads authoritative turn, picks a legal other-player target, confirms then advances once',async()=>{
  const action={id:'role:wolf:bite',actionId:'action_wolf_bite',name:'Cắn',type:'effect_notice',
    effectIds:[],actorIds:['alice'],targetCount:1,noSelf:true};
  const observed=[],calls=[],runner={running:true,epoch:2,pending:new Set(),completed:new Set()};
  const ctx={
    demoRunner:runner,demoObserve:(...args)=>observed.push(args),
    demoPick:items=>items[0],
    battleActions:()=>[action],battleRules:()=>({targetAllowed:()=>true}),
    playLiveMembers:()=>[{loginId:'alice'},{loginId:'bob'}],
    playPlayerEffect:()=> 'alive',
    playSceneRuntime:{room:{matchId:'test-match',cycleKey:'night-1'},activeEffects:[],battleUndo:null},
    playSceneState:{night:1},
    playRoomApi:async(path,opt)=>{calls.push({path,body:JSON.parse(opt.body)});return{ok:true}},
    battleShowResultPopup:()=>{},document:{getElementById:()=>({setAttribute:()=>{}})},
    Math:{random:()=>0.2,floor:Math.floor,max:Math.max,min:Math.min,round:Math.round},
    String,Number,Set,Array,Error
  };
  const src=between(battle,'async function demoActionNight(t,epoch){','async function demoActionDay(epoch){');
  const run=vm.runInNewContext(src+';demoActionNight',ctx);
  await run({id:'role:role_wolf'},2);
  assert.deepEqual(calls.map(x=>x.path),['/battle-action','/turn']);
  assert.deepEqual([...calls[0].body.targetIds],['bob']);
  assert.equal(calls[0].body.turnId,'role:role_wolf');
  assert.equal(calls[1].body.expectedTurnId,'role:role_wolf');
  assert.equal(runner.pending.size,0);
  assert.equal(observed[0][0],'Cắn');assert.equal(observed[0][1],calls[0].body.actorId);assert.deepEqual([...observed[0][2]],calls[0].body.targetIds);assert.equal(observed[0][3],'pending');assert.equal(observed[1][3],undefined);
});

test('Demo uses the actual server cycles, ordered role/Artifact queue, and day ballot commands',()=>{
  assert.match(battle,/battleTurn\(\)/);
  assert.match(battle,/await playSetServerCycle\('day',/);
  assert.match(battle,/await playSetServerCycle\('night',/);
  assert.match(battle,/demoActionNight\(t,epoch\)/);
  assert.match(battle,/demoActionDay\(epoch\)/);
  for(const phase of ['ready','nominating','selecting','voting','closed','resolved'])assert.ok(battle.includes("stage==='"+phase+"'"));
  for(const endpoint of ['/battle-action','/day-action','/gallows','/turn','/cycle'])assert.ok(battle.includes("'"+endpoint+"'"));
  assert.match(battle,/TẠM DỪNG/);
  assert.match(battle,/TIẾP TỤC/);
  assert.match(battle,/reason==='manual'&&active/);
});
