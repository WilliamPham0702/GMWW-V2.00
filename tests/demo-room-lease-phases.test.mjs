import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {serverDemoActive} from '../src/gmww-demo-runner.js';
import {projectDemoClock,nextDemoClock} from '../src/gmww-demo-clock.js';

const worker=readFileSync('src/index.js','utf8'),battle=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const extract=(s,start,end)=>{const a=s.indexOf(start),b=s.indexOf(end,a+1);assert.ok(a>=0&&b>a);return s.slice(a,b)};

function leaseHarness(){
  const meta={demo:true,phase:'running',cyclePhase:'night',matchId:'match1',cycleKey:'night-1'};
  const data=new Map(),room=new (vm.runInNewContext('(class {'+
    extract(worker,'  async demoClockContext(meta){','  async gmAuto(request,body){')+'})',{
    serverDemoActive,projectDemoClock,nextDemoClock,j:(v,status=200)=>Response.json(v,{status}),Response,Date,Number,String,Error,JSON
  }))();
  room.ctx={storage:{get:async key=>data.get(key),put:async(key,value)=>{data.set(key,value)}}};
  room.getNightRuntime=async()=>({queue:[],cursor:0});
  room.gmAuthorized=async()=>({ok:true,meta});room.scheduleRoomAlarm=async()=>{};room.broadcast=()=>{};
  return {room,meta,data,run:async(body)=>{const r=await room.gmDemo({method:'POST'},body);return{status:r.status,...await r.json()}}};
}
test('Server Demo starts only in a running isolated match; every authorized GM can pause/resume',async()=>{
 const h=leaseHarness();h.meta.phase='lobby';assert.equal((await h.run({command:'start'})).error,'DEMO_MATCH_NOT_STARTED');h.meta.phase='running';
 assert.equal((await h.run({command:'start'})).running,true);assert.equal((await h.run({command:'stop'})).running,false);assert.equal((await h.run({command:'start'})).running,true);
 h.meta.demo=false;assert.equal((await h.run({command:'status'})).error,'NOT_DEMO_ROOM');
});
test('Browser cannot nominate or vote on behalf of Demo once server owns execution',async()=>{
 const h=leaseHarness();await h.run({command:'start'});let calls=0;h.room.playerGallows=async()=>{calls++;return Response.json({ok:true})};
 for(const command of ['heartbeat','nominate','vote','finish'])assert.equal((await h.run({command})).error,'DEMO_SERVER_OWNED');assert.equal(calls,0);
 assert.equal((await h.run({command:'start',owner:'demo-abcdefghijklmnop'})).error,'DEMO_RUNTIME_UPDATE_REQUIRED');
 assert.match(worker,/if\(meta\?\.demo===true&&!authorizedDemo\)\{/);
 assert.match(worker,/DEMO_PLAYER_NOT_JOINED/);
});

test('Demo moves completed night into the next day then advances resolved day into the next night',async()=>{
  const fragment=extract(battle,'async function demoStep(epoch){','const battleState=');
  const runner={running:true,epoch:4,steps:0,speed:2,roomCode:'ABCDEF',owner:'demo-abcdefgh1234',timer:0},
    scene={roomCode:'ABCDEF',phase:'night',night:1},runtime={room:{demo:true,phase:'running',matchId:'match1',cycleKey:'night-1'},
      nightRuntime:{completed:true},winProposal:null},calls=[];
  const ctx={
    demoDelay:()=>500,demoRunner:runner,battleState:{targets:[]},playSceneRuntime:runtime,playSceneState:scene,
    demoLeaseBody:command=>({command}),playRoomApi:async()=>({ok:true}),
    playSyncRoom:async()=>({ok:true}),battleTurn:()=>null,
    playSetServerCycle:async(phase,day)=>{calls.push([phase,day])},
    demoActionDay:async()=>calls.push(['day-action']),demoActionNight:async()=>calls.push(['night-action']),
    demoStop:async()=>calls.push(['stop']),demoSchedule:()=>calls.push(['schedule']),
    demoRenderControls:()=>{},demoStopTimer:()=>{},playFlashError:x=>{throw Error(x)},renderPlayBattle:()=>{},
    Math,Number,String,Error,Date
  };
  const step=vm.runInNewContext(fragment+';demoStep',ctx);
  await step(4);
  assert.deepEqual(calls,[['day',1],['schedule']]);
  calls.length=0;scene.phase='day';runtime.room.cycleKey='morning-1';
  ctx.demoActionDay=async()=>{calls.push(['resolved-day']);await ctx.playSetServerCycle('night',2)};
  // Evaluation used the original function binding; call the day handler through the same context.
  vm.runInNewContext('demoActionDay=async()=>{await playSetServerCycle("night",2)}',ctx);
  await step(4);
  assert.deepEqual(calls,[['night',2],['schedule']]);
});
test('Standard Auto GM and Demo cannot own two simultaneous automatic clocks',async()=>{const h=leaseHarness();h.meta.autoGM=true;assert.equal((await h.run({command:'start'})).error,'DEMO_AUTO_GM_ACTIVE');h.meta.autoGM=false;assert.equal((await h.run({command:'start'})).running,true)});
