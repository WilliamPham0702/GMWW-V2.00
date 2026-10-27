import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const setup=readFileSync('server-game/src/30-village-and-setup.part','utf8');
const worker=readFileSync('src/index.js','utf8');
const between=(source,a,b)=>{
  const start=source.indexOf(a),end=source.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,'Expected isolated function '+a);
  return source.slice(start,end);
};

test('Completed game: Room/Exit releases server seats before clearing the iPhone state',async()=>{
  const calls=[],errors=[],state={step:'battle',phase:'day',roomCode:'ABCDEF',gmToken:'token',selectedMemberIds:['alice'],activePlayerId:'alice',matchId:'match-1'};
  const runtime={room:{resetVersion:3,demo:true},players:[{seatId:4}],assignments:[{loginId:'a'}]};
  const completion={completed:true,busy:false,roomCode:'ABCDEF',matchId:'match-1'};
  const ctx={playCompletionState:completion,playSceneState:state,playSceneRuntime:runtime,
    renderPlayCompletion:()=>{},playRoomApi:async(path,opt)=>{
      calls.push(['api',path,JSON.parse(opt.body)]);
      return {hardReset:true,playersCount:0,assignmentsCount:0,room:{code:'ABCDEF',demo:true,resetVersion:4}};
    },rememberPlayRoom:(...args)=>calls.push(['registry',...args]),
    disconnectPlaySocket:()=>calls.push(['disconnect']),
    closePlayCompletionSheet:()=>{},savePlayScene:()=>{},renderPlayScene:()=>{},
    openPlayCreateRoomSheet:async()=>calls.push(['room-picker']),
    openPlayRoomEditor:()=>{},exitPlayImmersive:()=>{},
    playFlashError:msg=>errors.push(msg)
  };
  const fn=vm.runInNewContext('('+between(app,'async function playCompletionNext(choice){','function initPlayCompletion()')+')',ctx);
  await fn('room');
  assert.equal(errors.length,0);
  assert.equal(calls[0][1],'/reset');
  assert.equal(calls[0][2].preserveParticipants,false);
  assert.equal(calls[0][2].postGame,false);
  assert.equal(calls[0][2].expectedResetVersion,3);
  assert.ok(calls.findIndex(x=>x[0]==='disconnect')>0);
  assert.equal(state.roomCode,'—');
  assert.deepEqual(Array.from(state.selectedMemberIds),[]);
  assert.equal(state.activePlayerId,'');
  assert.equal(state.matchId,'');
  assert.equal(runtime.players.length,0);
  assert.equal(runtime.assignments.length,0);
  assert.ok(calls.some(x=>x[0]==='room-picker'));
});

test('Completed game: failed seat release must not fake a completed exit',async()=>{
  const calls=[],errors=[],scene={roomCode:'ABCDEF'},state={room:{resetVersion:1}};
  const completion={completed:true,busy:false,roomCode:'ABCDEF',matchId:'match-2'};
  const fn=vm.runInNewContext('('+between(app,'async function playCompletionNext(choice){','function initPlayCompletion()')+')',{
    playCompletionState:completion,playSceneState:scene,playSceneRuntime:state,
    renderPlayCompletion:()=>{},playRoomApi:async()=>({hardReset:false,playersCount:1,assignmentsCount:1}),
    disconnectPlaySocket:()=>calls.push('disconnect'),playFlashError:x=>errors.push(x)
  });
  await fn('exit');
  assert.equal(calls.length,0);
  assert.equal(scene.roomCode,'ABCDEF');
  assert.equal(errors.length,1);
});

test('Old finished DEMO room: changing mode repairs remaining seats once, never resets an active match',async()=>{
  const calls=[],errors=[],ui={pendingMode:'offline',modeSaving:false,selectedCode:'ABCDEF'};
  const scene={roomCode:'ABCDEF',gmToken:'token',roomMode:'demo',selectedMemberIds:['alice'],activePlayerId:'alice'};
  const runtime={room:{phase:'lobby',endedAt:'2026-10-26T12:00:00Z',lastEndedMatchId:'m1',resetVersion:2,demo:true},
    players:[{seatId:4}],assignments:[{loginId:'alice'}]};
  const fn=vm.runInNewContext(between(setup,'async function flushPlayRoomMode(){','function bindPlayRoomModeButtons()')+';flushPlayRoomMode',{
    playRoomUiState:ui,playSceneState:scene,playSceneRuntime:runtime,
    isLivePlayRoom:()=>true,playRoomApi:async(path,options)=>{
      calls.push([path,JSON.parse(options.body)]);
      if(path==='/room-settings'&&calls.length===1){const e=new Error('Not empty');e.code='ROOM_MODE_REQUIRES_EMPTY_RESET';throw e}
      if(path==='/reset')return {hardReset:true,playersCount:0,assignmentsCount:0,room:{phase:'lobby',demo:true,resetVersion:3}};
      return {room:{phase:'lobby',demo:false,roomMode:'offline'}};
    },savePlayScene:()=>{},rememberPlayRoom:()=>{},renderPlayCreateRoomSheet:()=>{},playFlashError:e=>errors.push(e)
  });
  await fn();
  assert.deepEqual(calls.map(x=>x[0]),['/room-settings','/reset','/room-settings']);
  assert.equal(calls[1][1].preserveParticipants,false);
  assert.equal(scene.roomMode,'offline');
  assert.deepEqual(Array.from(scene.selectedMemberIds),[]);
  assert.equal(scene.activePlayerId,'');
  assert.equal(runtime.players.length,0);
  assert.equal(errors.length,0);
  assert.equal(ui.pendingMode,'');
});

test('Hard room reset clears DEMO lease, clock and plan but keeps completed match history',async()=>{
  const fragment=between(worker,'  async gmReset(request,body){','  async gmEnd(request,body){');
  const methods=vm.runInNewContext('({'+fragment+'})',{
    j:(value,status=200)=>({...value,httpStatus:status}),publicRoom:x=>({...x}),
    publicPlayer:x=>({...x}),ROOM_IDLE_TTL:3600000
  });
  const meta={code:'ABCDEF',phase:'lobby',status:'waiting',demo:true,enabled:true,
    seatsLocked:true,locked:true,resetVersion:2};
  const records=new Map([['meta',meta],['players',{'member:alice':{loginId:'alice',seatId:4}}],
    ['assignments',[{loginId:'alice'}]],['interactions',[]],
    ['demoLease',{running:true}],['demoClock',{running:true}],['demoPlan',{step:3}],
    ['matchCompletion:m1',{matchId:'m1',winnerFaction:'Phe Dân'}]]);
  const instance={...methods,ctx:{storage:{
    get:async k=>records.get(k),put:async(k,v)=>records.set(k,v),delete:async k=>records.delete(k),
    list:async({prefix})=>new Map([...records].filter(([k])=>k.startsWith(prefix))),
    setAlarm:async()=>{}
  },getWebSockets:()=>[]},gmAuthorized:async()=>({ok:true,meta}),broadcast:()=>{}};
  const result=await instance.gmReset({}, {forceEnd:true,postGame:false,preserveParticipants:false});
  assert.equal(result.hardReset,true);
  for(const k of ['demoLease','demoClock','demoPlan'])assert.equal(records.has(k),false,k);
  assert.equal(records.get('matchCompletion:m1').winnerFaction,'Phe Dân');
  assert.equal(records.get('meta').demo,true,'mode remains selectable after reset');
  assert.equal(records.get('meta').seatsLocked,false);
  assert.equal(records.get('assignments').length,0);
});

test('Packaged GM app matches the six canonical source modules byte-for-byte',()=>{
  const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster',
    '30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts']
    .map(x=>readFileSync('server-game/src/'+x+'.part'));
  assert.deepEqual(readFileSync('server-game/current/app.js'),Buffer.concat(parts));
});
