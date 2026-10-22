import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const worker=fs.readFileSync('src/index.js','utf8');
const start=worker.indexOf('async function gmRoomParticipants(env,raw,request){');
const end=worker.indexOf('async function gmRoomConfig(',start);
assert.ok(start>=0&&end>start,'GM roster wrapper must be available');
const roster=worker.slice(start,end);

function harness({count=18,failLogin='',disbanded=false}={}){
 const logins=Array.from({length:count},(_,i)=>'guest'+String(i+1));
 const data={players:logins.map(loginId=>({loginId})),removedPlayers:[],disbanded,selectedCount:count};
 let inFlight=0,maxInFlight=0,dirSync=0,attempts=new Map(),completed=0;
 const resp={ok:true,clone:()=>({json:async()=>data})};
 const context={
   normalizeRoomCode:()=> 'ABCDEF',normalizeLoginId:x=>String(x||'').toLowerCase(),
   safeJson:async()=>({members:data.players}),roomStub:()=>({fetch:async()=>resp}),
   memberStore:()=>({fetch:async(url,opts)=>{
     const body=JSON.parse(opts.body),lid=body.loginId;
     attempts.set(lid,(attempts.get(lid)||0)+1);inFlight++;maxInFlight=Math.max(maxInFlight,inFlight);
     await new Promise(resolve=>setTimeout(resolve,1));
     inFlight--;completed++;
     return{ok:lid!==failLogin};
   }}),
   syncRoomDirectory:async()=>{assert.equal(inFlight,0,'must finish all member writes before directory sync');dirSync++},
   j:(body,status=200)=>({status,body}),
   Promise,Set,Map,JSON,Date
 };
 vm.runInNewContext(roster+'\nthis.execute=gmRoomParticipants;',context);
 const run=()=>context.execute({},'ABCDEF',{headers:{}});
 return {run,getStats:()=>({inFlight,maxInFlight,dirSync,completed,attempts})};
}

test('GM roster sync batches independent members up to six at a time and awaits every ACK',async()=>{
 const h=harness({count:18});
 const res=await h.run();
 assert.equal(res.ok,true);
 const x=h.getStats();assert.equal(x.maxInFlight,6);assert.equal(x.dirSync,1);
 assert.equal(x.completed,18);assert.equal(x.attempts.size,18);
});

test('GM roster returns explicit pending state after bounded retries, never false success',async()=>{
 const h=harness({count:8,failLogin:'guest3'});
 const res=await h.run();
 assert.equal(res.status,502);assert.equal(res.body.error,'ROSTER_PRESENCE_PENDING');
 assert.equal(res.body.pendingCount,1);
 const x=h.getStats();assert.equal(x.attempts.get('guest3'),3);
 assert.equal(x.dirSync,1);
});
