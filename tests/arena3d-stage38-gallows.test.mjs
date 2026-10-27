import test from 'node:test';
import assert from 'node:assert/strict';
import {gallowsCandidateActorId,gallowsWorldPose} from '../assets/village/arena-3d/stage38-public-gallows.mjs';

const frame=(extra={})=>({room:{phase:'running',cyclePhase:'morning',
  matchId:'m1',cycleKey:'morning-1',...extra},
 players:[{id:'member:alice'},{id:'member:bob'}]});
test('GĐ38: only public, existing voting candidate can be suspended',()=>{
 const base=frame();
 assert.equal(gallowsCandidateActorId({stage:'voting',candidateId:'alice'},base),'member:alice');
 assert.equal(gallowsCandidateActorId({stage:'resolved',candidateId:'member:bob'},base),'member:bob');
 for(const ballot of [{stage:'nominating',candidateId:'alice'},
  {stage:'voting',candidateId:'mallory'}, {stage:'voting',candidateId:'<script>'},
  {stage:'voting',candidateId:'member:../../admin'}]){
  assert.equal(gallowsCandidateActorId(ballot,base),null);
 }
 assert.equal(gallowsCandidateActorId({stage:'voting',candidateId:'alice'},frame({cyclePhase:'night'})),null);
 assert.equal(gallowsCandidateActorId({stage:'voting',candidateId:'alice'},frame({phase:'lobby'})),null);
 assert.equal(gallowsCandidateActorId({stage:'voting',candidateId:'alice'},null),null);
});
test('GĐ38: actor walks to center then rises without additional mesh',()=>{
 const seat={x:6,z:-4};
 const start=gallowsWorldPose(seat,{progress:0});
 const middle=gallowsWorldPose(seat,{progress:.5});
 const end=gallowsWorldPose(seat,{progress:1,reducedMotion:true});
 assert.deepEqual([start.x,start.z,start.lift],[6,-4,0]);
 assert.ok(middle.x<6&&middle.x>0);
 assert.equal(middle.lift,0);
 assert.equal(end.x,0);assert.equal(end.z,1.35);assert.equal(end.lift,1.32);
 assert.equal(end.suspended,true);
 assert.deepEqual(gallowsWorldPose(seat,{progress:-100}),start);
 assert.deepEqual(gallowsWorldPose(seat,{progress:1,reducedMotion:true}),
  gallowsWorldPose(seat,{progress:100,reducedMotion:true}));
});
test('GĐ38: reduced motion disables hanging bob and uses bounded position',()=>{
 const seat={x:4,z:1};
 const a=gallowsWorldPose(seat,{progress:1,now:1000,reducedMotion:true});
 const b=gallowsWorldPose(seat,{progress:1,now:6000,reducedMotion:true});
 assert.deepEqual(a,b);
 for(const pose of [a,gallowsWorldPose(seat,{progress:.9})]){
  assert.ok(Number.isFinite(pose.x)&&Number.isFinite(pose.z));
  assert.ok(pose.lift>=0&&pose.lift<1.5);
 }
});

test('GĐ38: official public WS ballot is retained on polling and rejects stale cycle packets',async()=>{
 const oldDoc=globalThis.document,oldLoc=globalThis.location;
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 globalThis.location={protocol:'https:',host:'example.test'};
 let cycle='morning-1',phase='morning',ws;
 const seen=[];
 class FakeWs{
  constructor(){ws=this} close(){} onopen=null;onmessage=null;onclose=null;onerror=null;
 }
 const {connectStagingRoom}=await import('../assets/village/arena-3d/room-realtime.mjs');
 try{
  const feed=connectStagingRoom({roomCode:'ROOM5',loadPublicGallows:false,
   WebSocketImpl:FakeWs,onFrame(){},onGallows:b=>seen.push(b),onError:e=>{throw e},
   fetchImpl:async url=>{
    assert.equal(url,'/api/rooms/ROOM5');
    return {ok:true,json:async()=>({room:{code:'ROOM5',phase:'running',
      matchId:'m1',cycleKey:cycle,cyclePhase:phase,seatCount:6},players:[]})};
   }
  });
  try{
   await feed.refresh();
   const msg=(key,stage='voting')=>ws.onmessage({data:JSON.stringify({type:'gallows_updated',
    room:{code:'ROOM5',phase:'running',matchId:'m1',cyclePhase:'morning',cycleKey:key},
    gallows:{stage,candidateId:'alice',voteTotals:{save:1,kill:2}}})});
   msg('morning-0');assert.equal(feed.state.ballot,null,'older-cycle ballot rejected');
   msg('morning-1');assert.equal(feed.state.ballot?.candidateId,'alice');
   await feed.refresh();assert.equal(feed.state.ballot?.candidateId,'alice','poll must not erase WS state');
   phase='night';cycle='night-2';await feed.refresh();
   assert.equal(feed.state.ballot,null,'day ended, old candidate removed');
   msg('morning-1');assert.equal(feed.state.ballot,null,'cannot replay old day into night');
   phase='morning';cycle='morning-2';await feed.refresh();
   msg('morning-2');assert.equal(feed.state.ballot?.stage,'voting');
   ws.onclose();assert.equal(feed.state.ballot,null,'reconnect invalidates stale vote');
   assert.ok(seen.some(x=>x?.candidateId==='alice'));
  }finally{feed.close()}
 }finally{
  if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
  if(oldLoc===undefined)delete globalThis.location;else globalThis.location=oldLoc;
 }
});
test('GĐ38: GM/Player 3D visual projection shares public candidate only',async()=>{
 const {readFileSync}=await import('node:fs');
 const gm=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 const player=readFileSync('assets/village/arena-3d/player.mjs','utf8');
 const field=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 assert.match(gm,/const gallowsId=gallowsCandidateActorId\(x,current\)/);
 assert.match(gm,/field\.setGallowsCandidate\(gallowsId\)/);
 assert.match(player,/setGallowsCandidate\(gallowsCandidateActorId\(publicBallot/);
 assert.match(field,/import \{gallowsWorldPose\} from '\.\/stage38-public-gallows\.mjs'/);
 assert.match(field,/setGallowsCandidate/);
 assert.doesNotMatch(player,/\/api\/gm\//);
 assert.doesNotMatch(player,/gmToken/);
});
