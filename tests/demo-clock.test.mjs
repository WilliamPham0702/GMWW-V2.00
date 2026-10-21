import test from 'node:test';import assert from 'node:assert/strict';import {projectDemoClock,nextDemoClock} from '../src/gmww-demo-clock.js';
const context={key:'match:night-1:seer',kind:'night',durationMs:30000};
test('Demo 1x/2x/5x uses exact configured duration and scales without resetting spent time',()=>{
 for(const speed of [1,2,5,10]){const c=nextDemoClock(null,context,{running:true,speed,until:100000},1000);assert.equal(c.remainingMs,30000);assert.equal(projectDemoClock(c,1000+30000/speed-1).remainingMs,speed);assert.equal(projectDemoClock(c,1000+30000/speed).remainingMs,0)}
 let c=nextDemoClock(null,context,{running:true,speed:1,until:100000},1000);c=nextDemoClock(c,context,{running:true,speed:5,until:100000},11000);assert.equal(c.remainingMs,20000);assert.equal(projectDemoClock(c,15000).remainingMs,0);
});
test('Pause freezes remainder, resume preserves it, lease expiry cannot keep spending time',()=>{
 let c=nextDemoClock(null,context,{running:true,speed:2,until:16000},1000);c=nextDemoClock(c,context,{running:false,speed:2,until:0},6000);assert.equal(c.remainingMs,20000);assert.equal(projectDemoClock(c,90000).remainingMs,20000);c=nextDemoClock(c,context,{running:true,speed:1,until:110000},90000);assert.equal(projectDemoClock(c,100000).remainingMs,10000);
 const expired=nextDemoClock(null,{...context,durationMs:60000},{running:true,speed:1,until:16000},1000);assert.equal(projectDemoClock(expired,40000).remainingMs,45000);assert.equal(projectDemoClock(expired,40000).running,false);
});
test('Changing turn initializes that turn only and zero-duration system turns do not wait',()=>{
 let c=nextDemoClock(null,context,{running:true,speed:1,until:100000},1000);c=nextDemoClock(c,{key:'match:night-1:witch',kind:'night',durationMs:45000},{running:true,speed:2,until:100000},11000);assert.equal(c.remainingMs,45000);assert.equal(c.key,'match:night-1:witch');assert.equal(nextDemoClock(c,{key:'wake',kind:'night',durationMs:0},{running:true,speed:1,until:100000},12000).remainingMs,0);
});
