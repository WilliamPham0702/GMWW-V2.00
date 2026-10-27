import test from 'node:test';
import assert from 'node:assert/strict';
import {createArenaGmRefreshGate} from '../assets/village/arena-3d/stage37-gm-refresh-gate.mjs';

const session=(overrides={})=>({room:'ABCDEF',token:'gm-secret',
  matchId:'match-1',cycleKey:'night-1',...overrides});
function clock(){
 let time=0,next=1;const jobs=new Map();
 return {now:()=>time,schedule:(fn,ms)=>{const id=next++;jobs.set(id,{due:time+ms,fn});return id},
  cancel:id=>jobs.delete(id),size:()=>jobs.size,
  advance:ms=>{time+=ms;for(const [id,job] of [...jobs]){
    if(job.due<=time){jobs.delete(id);job.fn()}
  }}};
}
test('GĐ37 limits repetitive Core GM GET while preserving a trailing update',async()=>{
 const c=clock(),gate=createArenaGmRefreshGate({minGapMs:750,...c});
 let calls=0,complete;
 const request=()=>{calls++;return new Promise(resolve=>{complete=resolve})};
 const first=gate.run(session(),request);
 await Promise.resolve();assert.equal(calls,1);
 for(let i=0;i<25;i++)void gate.run(session(),request);
 assert.equal(calls,1);assert.equal(c.size(),1,'only one trailing timer');
 complete(true);await first;
 c.advance(749);await Promise.resolve();assert.equal(calls,1);
 c.advance(1);await Promise.resolve();await Promise.resolve();
 assert.equal(calls,2,'one consolidated follow-up after minimum interval');
 complete(true);gate.reset();
});
test('GĐ37 promptly aborts old GM session on room, token or turn changes',async()=>{
 const c=clock(),gate=createArenaGmRefreshGate({minGapMs:750,...c});
 let oldSignal;
 const first=gate.run(session(),signal=>{oldSignal=signal;return new Promise(resolve=>signal.addEventListener('abort',()=>resolve(false),{once:true}))});
 await Promise.resolve();
 let newer=0;
 const second=gate.run(session({cycleKey:'night-2'}),()=>{newer++;return true});
 assert.equal(oldSignal.aborted,true);
 await first;assert.equal(await second,true);assert.equal(newer,1);
 gate.reset();
});
test('GĐ37 hidden/tab logout reset cancels queued work and rejects invalid sessions',async()=>{
 const c=clock(),gate=createArenaGmRefreshGate({minGapMs:750,...c});
 let count=0;
 await gate.run(session(),()=>{count++;return true});
 await gate.run(session(),()=>{count++;return true});
 assert.equal(c.size(),1);
 gate.reset();assert.equal(c.size(),0);
 c.advance(10000);await Promise.resolve();assert.equal(count,1);
 assert.equal(await gate.run(session({token:''}),()=>{count++;return true}),false);
 assert.equal(count,1);
});
