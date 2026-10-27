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
