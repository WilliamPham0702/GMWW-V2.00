import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {pruneInteractions} from '../src/gmww-interaction-retention.js';
import {reserveArtifactActivation} from '../src/gmww-game-scene-rules.js';

const gm=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const server=fs.readFileSync('src/index.js','utf8');
const player=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');
const villageCss=fs.readFileSync('assets/village/village.css','utf8');

test('V3.149 GM displays day powers and posts an authenticated day-action with no night turn',async()=>{
  assert.match(gm,/const actions=\(phase==='day'\|\|\(t&&phase==='night'\)\)\?battleActions\(\):\[\]/);
  assert.match(gm,/if\(playSceneState.phase==='day'\)\{await battleConfirmDay\(confirmed\);return\}/);
  const start=gm.indexOf('async function battleConfirmDay(');
  const end=gm.indexOf('async function battleConfirm(',start);
  assert.ok(start>=0&&end>start);
  const apiCalls=[],notices=[],state={busy:false,syncPending:false,nonce:'',targets:['bob'],key:'m1:day:2:true'};
  const ctx={
    battleState:state,playSceneState:{phase:'day',step:'battle',night:2},
    playSceneRuntime:{room:{matchId:'m1',cycleKey:'morning-2'},nightRuntime:{completed:true}},
    battleTurn:()=>null,battleAction:()=>({actionId:'action_stab',roleId:'role_thug',artifactId:'',actorIds:['alice'],name:'Đâm',unavailable:false,targetCount:1}),
    isLivePlayRoom:()=>true,battleMember:id=>({displayName:id}),playFlashError:x=>{throw Error(x)},
    renderPlayBattle:()=>{},battleClear:()=>{state.targets=[];state.nonce='';state.actionId=''},
    playSyncRoom:async()=>true,playRoomApi:async(path,opts)=>{apiCalls.push({path,data:JSON.parse(opts.body)});return {ok:true,result:{message:'Đã thực hiện'}}},
    battleShowResultPopup:(title,message)=>notices.push(message),battlePlayConfiguredAudio:()=>Promise.resolve(),
    confirm:()=>true,Date
  };
  const confirmDay=vm.runInNewContext(gm.slice(start,end)+';battleConfirmDay',ctx);
  await confirmDay(true);
  assert.equal(apiCalls.length,1);
  assert.equal(apiCalls[0].path,'/day-action');
  assert.equal(apiCalls[0].data.actorId,'alice');
  assert.equal(apiCalls[0].data.roleId,'role_thug');
  assert.equal(apiCalls[0].data.cycleKey,'morning-2');
  assert.equal(apiCalls[0].data.turnId,undefined);
  assert.deepEqual(Array.from(apiCalls[0].data.targetIds),['bob']);
  assert.equal(notices[0],'Đã thực hiện');
  assert.equal(state.busy,false);
});

const begin=server.indexOf('  async gmDayAction(request,body){');
const finish=server.indexOf('  /* V3.99:',begin);
assert.ok(begin>=0&&finish>begin);
const Room=vm.runInNewContext('(class { '+server.slice(begin,finish)+' })',{
  Response,crypto:webcrypto,
  j:(v,code=200)=>Response.json(v,{status:code}),
  normalizeLoginId:x=>String(x||'').trim().toLowerCase(),
  gameLabelKey:x=>String(x||'').toLowerCase(),
  currentArtifactCycleKey:m=>String(m.matchId)+':'+String(m.cyclePhase)+':'+String(m.cycleNight),
  reserveArtifactActivation,pruneInteractions
});
const clone=x=>x===undefined?undefined:structuredClone(x);
function dayHarness(){
  const data=new Map(),events=[],room=new Room();
  const storage={get:async k=>clone(data.get(k)),put:async(k,v)=>{data.set(k,clone(v))},delete:async k=>data.delete(k)};
  room.ctx={storage};room.broadcast=x=>events.push(x);
  room.gmAuthorized=async()=>({ok:true,meta:await storage.get('meta')});
  data.set('meta',{phase:'running',cyclePhase:'morning',matchId:'m1',cycleKey:'morning-2',cycleNight:2});
  data.set('players',{ 'member:alice':{loginId:'alice'},'member:bob':{loginId:'bob'},'member:carol':{loginId:'carol'} });
  data.set('gameConfig',{artifactLimitPerCycle:2});
  data.set('assignments',[
    {loginId:'alice',roleId:'role_thug',faction:'village'},
    {loginId:'bob',roleId:'role_wolf',faction:'wolf'},
    {loginId:'carol',roleId:'role_villager',faction:'village'}
  ]);
  return {data,room,events};
}
const result=async response=>({status:response.status,...await response.json()});

test('V3.149 actual Durable Object: day Du Côn one use per game, idempotent retry, no duplicate effects',async()=>{
  const {data,room}=dayHarness();
  data.set('role:alice',{roleId:'role_thug',roleCard:{functions:[{
    actionId:'action_stab',phase:'day',usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:true
  }]}});
  const payload={matchId:'m1',cycleKey:'morning-2',actorId:'alice',roleId:'role_thug',
    actionId:'action_stab',targetIds:['bob'],clientEventId:'one'};
  const first=await result(await room.gmDayAction(null,payload));
  assert.equal(first.ok,true);
  assert.equal((data.get('interactions')||[]).filter(x=>x.type==='dead'&&x.loginId==='bob').length,1);
  assert.equal((await result(await room.gmDayAction(null,payload))).idempotent,true);
  assert.equal((data.get('dayRoleUsage:m1')||[]).length,1);
  assert.equal((await result(await room.gmDayAction(null,{...payload,targetIds:['carol'],clientEventId:'two'}))).error,'DAY_ROLE_QUOTA_REACHED');
  assert.equal((await result(await room.gmDayAction(null,{...payload,clientEventId:'one',targetIds:['alice']}))).error,'REQUEST_ID_CONFLICT');
});

test('V3.149 actual Durable Object: post-death day Artifact consumes capped stock once',async()=>{
  const {data,room}=dayHarness();
  data.set('interactions',[{id:'prior-death',matchId:'m1',type:'dead',loginId:'alice',effectActive:true}]);
  data.set('artifact:alice',{matchId:'m1',artifactId:'stone',artifactCard:{actions:[{
    actionId:'action_day_kill',name:'Trừng phạt',phase:'day',actorMayBeDead:true,
    targetCount:1,noSelf:true,effectIds:['effect_kill']
  }]}});
  const request={matchId:'m1',cycleKey:'morning-2',actorId:'alice',artifactId:'stone',actionId:'action_day_kill',
    clientEventId:'stone-once',targetIds:['bob']};
  const first=await result(await room.gmDayAction(null,request));
  assert.equal(first.ok,true);
  assert.equal((await result(await room.gmDayAction(null,request))).idempotent,true);
  assert.equal((data.get('interactions')||[]).filter(x=>x.type==='dead'&&x.loginId==='bob').length,1);
  assert.equal(data.get('artifactCycle:m1:morning:2').accepted.length,1);
  assert.equal((await result(await room.gmDayAction(null,{...request,clientEventId:'stone-again'}))).ok,false);
});

test('V3.149 live vote display is independent of other effects and restored across GM/Player sync',()=>{
  assert.match(gm,/battle-gallows-vote-mark/);
  assert.match(gm,/playSceneRuntime\.gallows\?\.votes\?\.\[id\]/);
  assert.match(player,/syncGallowsVoteTags\(\);const me=state\.players\.find/);
  assert.match(player,/if\(d\.type==='gallows_updated'\)/);
  assert.match(village,/function syncGallowsVoteBadge\(button,data\)/);
  assert.match(village,/vote!=='👍'&&vote!=='👎'/);
  assert.match(village,/syncGallowsVoteBadge\(button,data\);/);
  assert.match(villageCss,/\.player \.player-over \.gmww-gallows-vote/);
});

test('V3.149 morning audio combines death count 1-5 and narrates additional harmful effects',()=>{
  const start=gm.indexOf('function battleMorningPlayAudio(){');
  const finish=gm.indexOf('function battleMorningShow(){',start);
  assert.ok(start>=0&&finish>start);
  const sequence=[],rows=[{kind:'dead',name:'An',label:'đã chết'},{kind:'dead',name:'Bình',label:'đã chết'},
    {kind:'expelled',name:'Cường',label:'đã bị đuổi khỏi làng'},{kind:'frozen',name:'Dung',label:'đã bị đóng băng'}];
  const ctx={playSceneState:{phase:'day'},battleMorningRows:()=>rows,battlePlayConfiguredAudio:(kind,id,label,err,next)=>{
    sequence.push({kind,id,label});next?.();
  }};
  const play=vm.runInNewContext(gm.slice(start,finish)+';battleMorningPlayAudio',ctx);
  play();
  assert.deepEqual(Array.from(sequence,x=>x.id),[
    'audio_system_morning_deaths_intro','audio_system_morning_number_2','audio_system_morning_dead_noun',
    'audio_system_morning_expelled','audio_system_morning_frozen'
  ]);
  assert.match(sequence.at(-1).label,/Dung đã bị đóng băng/);
  assert.match(gm,/signature=key\+':'\+JSON\.stringify\(rows\)/);
});
