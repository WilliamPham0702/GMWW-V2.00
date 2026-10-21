import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {serverDemoActive} from '../src/gmww-demo-runner.js';
import {projectDemoClock,nextDemoClock} from '../src/gmww-demo-clock.js';
const worker=fs.readFileSync('src/index.js','utf8');
const fragment=worker.slice(worker.indexOf('  async demoClockContext(meta){'),worker.indexOf('  async gmAuto(request,body){'));
function controlHarness(){
 const rows=new Map([['meta',{demo:true,phase:'running',cyclePhase:'night',cycleNight:1,matchId:'m',cycleKey:'n1',autoGM:false}]]);
 let now=1000;
 class Clock extends Date{static now(){return now}}
 const Room=vm.runInNewContext('(class {'+fragment+'})',{serverDemoActive,projectDemoClock,nextDemoClock,Date:Clock,j:(d,s=200)=>Response.json(d,{status:s}),Response});
 const room=new Room();room.ctx={storage:{get:async k=>structuredClone(rows.get(k)),put:async(k,v)=>rows.set(k,structuredClone(v)),setAlarm:async()=>{}}};room.gmAuthorized=async()=>({ok:true,meta:structuredClone(rows.get('meta'))});room.getNightRuntime=async()=>({queue:[{id:'seer',durationSec:60}],cursor:0});room.scheduleRoomAlarm=async()=>{};room.broadcast=()=>{};
 return {rows,room,advance:ms=>{now+=ms},command:async body=>(await room.gmDemo(new Request('https://room/gm/demo'),body)).json()};
}
test('Server DEMO remains running without a browser heartbeat and can be controlled by another authorized GM',async()=>{
 const h=controlHarness();let s=await h.command({command:'start'});assert.equal(s.engine,'server');assert.equal(s.running,true);
 h.advance(20000);s=await h.command({command:'status'});assert.equal(s.running,true,'viewer absence must not expire runner');assert.equal(s.clock.remainingMs,40000);
 s=await h.command({command:'stop'});assert.equal(s.running,false);h.advance(20000);s=await h.command({command:'start'});assert.equal(s.clock.remainingMs,40000);
});
test('Changing speed preserves configured virtual time instead of restarting a turn',async()=>{
 const h=controlHarness();await h.command({command:'start',speed:1});h.advance(10000);const s=await h.command({command:'speed',speed:5});assert.equal(s.clock.remainingMs,50000);assert.equal(s.clock.speed,5);h.advance(5000);assert.equal((await h.command({command:'status'})).clock.remainingMs,25000);
});
const frontend=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
test('Server viewer confirms each new action once, including first action after an empty initial snapshot',()=>{
 const fragment=frontend.slice(frontend.indexOf('function demoApplyServerControl('),frontend.indexOf('function demoHoldForGM('));
 const runner={roomCode:'',lastEvent:null},ctx={demoRunner:runner,playSceneState:{roomCode:'ABCDEF',step:'seats'},playSceneRuntime:{room:{matchId:'m1'}},demoConfirmedFeedback:()=>{ctx.confirmations++},confirmations:0};
 const apply=vm.runInNewContext(fragment+';demoApplyServerControl',ctx),control={engine:'server',running:true,lastEvent:null};
 apply(control);apply({...control,lastEvent:{id:'first',status:'accepted'}});assert.equal(ctx.confirmations,1);apply({...control,lastEvent:{id:'first',status:'accepted'}});assert.equal(ctx.confirmations,1);
});
test('A failed viewer refresh never sends a pause or gameplay request to the server',async()=>{
 const fragment=frontend.slice(frontend.indexOf('async function demoStep(epoch){'),frontend.indexOf('const battleState='));let scheduled=0;
 const ctx={demoRunner:{running:true,epoch:1,roomCode:'ABCDEF'},playSceneState:{roomCode:'ABCDEF'},playSceneRuntime:{demoControl:{engine:'server'}},playSyncRoom:async()=>null,demoSchedule:()=>{scheduled++},playRoomApi:()=>{throw Error('viewer must not mutate server')}};
 await vm.runInNewContext(fragment+';demoStep(1)',ctx);assert.equal(ctx.demoRunner.running,true);assert.equal(scheduled,1);
});
