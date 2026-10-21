import test from 'node:test';
import assert from 'node:assert/strict';
import {runServerDemo,serverDemoActive} from '../src/gmww-demo-runner.js';
import {projectDemoClock,nextDemoClock} from '../src/gmww-demo-clock.js';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('src/index.js','utf8');
const Room=vm.runInNewContext('(class {'+source.slice(source.indexOf('  async demoClockContext(meta){'),source.indexOf('  async gmAuto(request,body){'))+'})',{projectDemoClock,nextDemoClock,serverDemoActive,j:(x,s=200)=>Response.json(x,{status:s}),Date,Request});
test('Server winner stops autonomous execution and waits for explicit GM completion',async()=>{
 const room=new Room(),meta={demo:true,phase:'running',cyclePhase:'night',matchId:'m1',cycleKey:'night-1',autoGM:false},lease={engine:'server',matchId:'m1',running:true,startedAt:Date.now(),steps:1,speed:1};
 const rows=new Map([['demoLease',lease]]),events=[];room.ctx={storage:{get:async k=>structuredClone(rows.get(k)),put:async(k,v)=>rows.set(k,structuredClone(v))}};
 room.broadcast=e=>events.push(e);room.scheduleRoomAlarm=async()=>{};room.getNightRuntime=async()=>({queue:[],cursor:0});
 room.computeWinProposal=()=>({winnerFaction:'Phe Dân',winnerLabel:'Phe Dân'});let ended=0;room.gmEnd=async()=>{ended++};
 await runServerDemo(room,meta);assert.equal(rows.get('demoLease').running,false);assert.equal(rows.get('demoLease').reason,'winner');assert.equal(meta.phase,'running');assert.equal(ended,0);assert.equal(events[0].type,'demo_winner');
 await runServerDemo(room,meta);assert.equal(events.length,1,'duplicate alarm cannot duplicate winner');
});
