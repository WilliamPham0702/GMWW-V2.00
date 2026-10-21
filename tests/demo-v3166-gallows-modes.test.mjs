import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const from=source.indexOf('async function demoActionDay(epoch){');
const to=source.indexOf('async function demoStep(epoch){',from);
assert.ok(from>=0&&to>from,'Demo day handler remains in the battle module');
const handler=source.slice(from,to);

function game(mode='auto'){
  const calls=[],users=['alice','bob','carol'].map(loginId=>({loginId}));
  const runner={running:true,epoch:1,dayDone:new Set(),pending:new Set()};
  const state={room:{demo:true,matchId:'test-match',cycleKey:'morning-1'},activeEffects:[],
    gallows:{stage:'nominating',mode,nominations:{},votes:{},blockedNomination:['alice'],
      blockedVotes:['alice'],candidateId:'bob',nominationDeadlineAt:Number.MAX_SAFE_INTEGER,deadlineAt:Number.MAX_SAFE_INTEGER}};
  const ctx={demoRunner:runner,playSceneRuntime:state,playSceneState:{night:1},demoPick:rows=>rows[0],
    playLiveMembers:()=>users,playPlayerEffect:()=>'',battleActions:()=>[],
    battleRules:()=>({targetAllowed:()=>true}),
    playRoomApi:async(path,opts)=>{const body=JSON.parse(opts.body);calls.push({path,body});return{ok:true}},
    demoLeaseBody:(command,extra)=>({command,...extra}),
    playSetServerCycle:async()=>{throw Error('unexpected cycle')},
    Date,Math,Number,String,Array,Object,Set,Error};
  return {state,runner,calls,ctx,run:vm.runInNewContext(handler+';demoActionDay',ctx)};
}

test('V3.166 Demo follows GM-manual gallows nomination and ballot endpoints',async()=>{
  const g=game('gm');
  await g.run(1);
  assert.equal(g.calls.length,1);
  assert.equal(g.calls[0].path,'/gallows');
  assert.equal(g.calls[0].body.command,'begin');
  g.calls.length=0;g.state.gallows.stage='voting';
  await g.run(1);
  assert.equal(g.calls[0].path,'/gallows');
  assert.equal(g.calls[0].body.command,'manual_vote');
  assert.equal(g.calls[0].body.targetId,'carol');
  assert.equal(g.calls[0].body.choice,'👍');
});

test('V3.166 Demo auto gallows excludes GM-banned nominators and voters',async()=>{
  const g=game('auto');
  await g.run(1);
  assert.equal(g.calls[0].path,'/demo');
  assert.equal(g.calls[0].body.command,'nominate');
  assert.equal(g.calls[0].body.loginId,'bob');
  g.calls.length=0;g.state.gallows.stage='voting';
  await g.run(1);
  assert.equal(g.calls[0].path,'/demo');
  assert.equal(g.calls[0].body.command,'vote');
  assert.equal(g.calls[0].body.loginId,'carol');
});

test('V3.166 Demo only completes day role action after server acknowledgement',async()=>{
  const g=game('auto');
  g.ctx.battleActions=()=>[{id:'role:inspect',actionId:'inspect',actorIds:['alice'],targetCount:1,noSelf:true}];
  // The extracted function captures the mutable VM global used by the gameplay runner.
  vm.runInNewContext("battleActions=()=>[{id:'role:inspect',actionId:'inspect',actorIds:['alice'],targetCount:1,noSelf:true}]",g.ctx);
  await g.run(1);
  assert.equal(g.calls[0].path,'/day-action');
  assert.deepEqual(Array.from(g.calls[0].body.targetIds),['bob']);
  assert.equal(g.runner.dayDone.has('test-match:morning-1:role:inspect'),true);
  assert.equal(g.runner.pending.size,0);
});
