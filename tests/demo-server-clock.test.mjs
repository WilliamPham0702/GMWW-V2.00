import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';import {projectDemoClock,nextDemoClock} from '../src/gmww-demo-clock.js';
const source=fs.readFileSync('src/index.js','utf8'),fragment=source.slice(source.indexOf('  async demoClockContext(meta){'),source.indexOf('  async gmDemo(request,body){'));
test('Worker scales configured night/discussion/nomination/vote clocks and preserves paused remainder',async()=>{
 let now=1000;const meta={demo:true,matchId:'m1',cycleKey:'night-1',cyclePhase:'night',cycleNight:1},cfg={timing:{villageDiscussionSec:60}},rows=new Map([['gameConfig',cfg]]);
 class FakeDate extends Date {static now(){return now;}}
 const Room=vm.runInNewContext('(class {'+fragment+'})',{nextDemoClock,projectDemoClock,Date:FakeDate});const room=new Room();room.ctx={storage:{get:async k=>structuredClone(rows.get(k)),put:async(k,v)=>rows.set(k,structuredClone(v))}};room.getNightRuntime=async()=>({queue:[{id:'seer',durationSec:30}],cursor:0});
 const lease=(speed,running=true)=>({running,speed,until:now+15000});let c=await room.syncDemoClock(meta,lease(1));assert.equal(c.remainingMs,30000);
 now=11000;c=await room.syncDemoClock(meta,lease(2));assert.equal(c.remainingMs,20000);assert.equal(c.deadlineAt,21000);
 now=16000;c=await room.syncDemoClock(meta,lease(2,false));assert.equal(c.remainingMs,10000);now=22000;c=await room.syncDemoClock(meta,lease(5));assert.equal(c.deadlineAt,24000);
 meta.cyclePhase='morning';meta.cycleKey='morning-1';c=await room.syncDemoClock(meta,lease(2));assert.equal(c.remainingMs,60000);assert.equal(Date.parse(meta.dayDeadlineAt),52000);
 const key='gallows:m1:morning-1';rows.set(key,{id:'ballot',stage:'nominating',nominationDurationSec:10});c=await room.syncDemoClock(meta,lease(5));assert.equal(rows.get(key).nominationDeadlineAt,24000);
 now=23000;c=await room.syncDemoClock(meta,lease(5,false));assert.equal(c.remainingMs,5000);assert.equal(rows.get(key).nominationDeadlineAt,null);
 now=30000;await room.syncDemoClock(meta,lease(5));assert.equal(rows.get(key).nominationDeadlineAt,31000);
 rows.set(key,{id:'ballot',stage:'voting',voteDurationSec:20});c=await room.syncDemoClock(meta,lease(5));assert.equal(rows.get(key).deadlineAt,34000);assert.deepEqual(rows.get('gameConfig'),cfg);
 const size=rows.size;assert.equal(await room.syncDemoClock({demo:false},lease(1)),null);assert.equal(rows.size,size);
});
