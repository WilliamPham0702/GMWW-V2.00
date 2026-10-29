import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const battle=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const compiled=readFileSync('server-game/current/app.js','utf8');
const chat=readFileSync('server-game/src/45-online-chat.part','utf8');
const worker=readFileSync('src/index.js','utf8');
const start=battle.indexOf('async function battleQuickApply(');
const end=battle.indexOf('// V3.96:',start);
assert.ok(start>=0&&end>start,'Find real GM quick action executor');
const executor=battle.slice(start,end);
function harness(bans={}){
  const calls=[],prompts=[],errors=[];
  const env={
    battleState:{busy:false,quickType:'',details:false,roster:false,syncPending:false},
    playSceneRuntime:{room:{matchId:'match-test',cycleKey:'night:2'},busy:false},
    playSceneState:{step:'battle',phase:'night',night:2},
    isLivePlayRoom:()=>true,
    playLiveMembers:()=>[{loginId:'alive'},{loginId:'dead'}],
    playPlayerEffect:id=>id==='dead'?'dead':'alive',
    battleMember:id=>({displayName:id}),
    confirm:message=>{prompts.push(message);return true},
    playRoomApi:async(path,options)=>{
      calls.push({path,options});
      if(path==='/chat')return {bans};
      return {ok:true};
    },
    renderPlayBattle:()=>{},playSyncRoom:async()=>true,
    gmHapticFeedback:()=>{},playFlashError:err=>errors.push(err),
    gmwwGMChatOpen:false
  };
  vm.createContext(env);
  vm.runInContext(executor+'\nglobalThis.applyGM=battleQuickApply',env);
  return {env,calls,prompts,errors};
}
test('GM Giết: works twice in same night, no role turn or quota',async()=>{
  const {env,calls,errors}=harness();
  await env.applyGM('alive','dead');await env.applyGM('alive','dead');
  assert.equal(errors.length,0);
  assert.equal(calls.length,2);
  for(const hit of calls){
    assert.equal(hit.path,'/interaction');
    const data=JSON.parse(hit.options.body);
    assert.equal(data.type,'dead');
    assert.equal(data.source,'gm-manual');
    assert.equal(data.matchId,'match-test');
  }
});
test('GM Cứu: only the dead can be revived via authorized interaction',async()=>{
  const {env,calls}=harness();
  await env.applyGM('alive','revive');
  assert.equal(calls.length,0);
  await env.applyGM('dead','revive');
  assert.equal(calls.length,1);
  assert.equal(JSON.parse(calls[0].options.body).type,'revive');
});
test('GM Cấm chat: reads authoritative ban and toggles with moderation endpoint',async()=>{
  for(const [banned,expected] of [[false,true],[true,false]]){
    const {env,calls,prompts}=harness(banned?{alive:true}:{});
    await env.applyGM('alive','mute-chat');
    assert.deepEqual(calls.map(x=>x.path),['/chat','/chat/moderate']);
    assert.equal(JSON.parse(calls[1].options.body).muted,expected);
    assert.match(prompts[0],banned?/MỞ CHAT/:/CẤM CHAT/);
  }
});
test('Top GM actions persistent, separate from role icon toggle; flamingo opens existing chat',()=>{
  assert.match(battle,/function gmwwGMAdminMount\(\)/);
  assert.match(battle,/gmwwGMAdminMount\(\);/);
  for(const action of ['dead','revive','mute-chat'])assert.ok(battle.includes('data-gm-admin="'+action+'"'));
  assert.match(battle,/bar\.hidden=playSceneState\.step!=='battle'/);
  assert.match(battle,/gmwwGMAdminTargetAt/);
  assert.match(compiled,/function gmwwGMAdminMount\(\)/);
  assert.match(chat,/trigger\.textContent='🦩'/);
  assert.match(compiled,/trigger\.textContent='🦩'/);
  assert.match(worker,/async gmChatModerate\(request,body\)\{\s*const auth=await this\.gmAuthorized\(request\)/);
  assert.match(worker,/this\.broadcast\(\{type:"chat_tick"/);
});
