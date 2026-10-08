import test from 'node:test';
import assert from 'node:assert/strict';
import {V4_ACTIONS,V4_DIRECTIONS,TURN_DURATION_MS,headingTransition,startV4Action,sampleV4Action,createV4StageController} from '../assets/characters/v4/action-lab.mjs';

test('exactly 9 approved actions and 4 real facing IDs',()=>{
 assert.deepEqual(V4_ACTIONS,['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
 assert.deepEqual(V4_DIRECTIONS,['front','left','right','back']);
});
test('each movement turns toward direction BEFORE ANY world displacement',()=>{
 const vectors={front:[0,1],left:[-1,0],right:[1,0],back:[0,-1]};
 for(const dir of V4_DIRECTIONS){
  for(const kind of ['walk','run']){
   const cmd=startV4Action({actionId:kind,facing:dir==='front'?'left':'front',targetFacing:dir,startAt:100,position:{x:.5,y:.5}});
   assert.equal(cmd.turnMs,TURN_DURATION_MS);
   const t=sampleV4Action(cmd,250);
   assert.equal(t.phase,'turn');
   assert.equal(t.pose.headTiltDeg,0);
   assert.deepEqual(t.position,{x:.5,y:.5});
   const middle=sampleV4Action(cmd,100+TURN_DURATION_MS+(cmd.durationMs-TURN_DURATION_MS)*.5);
   assert.equal(middle.phase,'move');
   assert.equal(middle.facing,dir);
   assert.ok(Math.abs(middle.position.x-.5)<.001||Math.sign(middle.position.x-.5)===vectors[dir][0]);
   assert.ok(Math.abs(middle.position.y-.5)<.001||Math.sign(middle.position.y-.5)===vectors[dir][1]);
  }
 }
});
test('front/back/left/right heading interpolates rather than teleport',()=>{
 assert.equal(headingTransition('front','right',0),0);
 assert.equal(headingTransition('front','right',1),90);
 assert.ok(headingTransition('front','back',.3)>0);
 assert.throws(()=>headingTransition('down','right',.5),/INVALID_FACING/);
});
test('head stays upright during all nine action motions incl. victory and defeat',()=>{
 for(const actionId of V4_ACTIONS)for(const result of ['win','lose']){
  const cmd=startV4Action({actionId,result});
  for(const t of [0,80,300,850,1250,2800])assert.equal(sampleV4Action(cmd,t).pose.headTiltDeg,0);
 }
});
test('sit transitions are smoothly reversible and crossed-leg sit stays down',()=>{
 const down=startV4Action({actionId:'sit-down',fromSeated:false});
 const mid=sampleV4Action(down,down.durationMs*.5);
 assert.ok(mid.pose.sit>0&&mid.pose.sit<1);
 assert.equal(sampleV4Action(down,down.durationMs).pose.sit,1);
 const up=startV4Action({actionId:'stand-up',fromSeated:true});
 assert.ok(sampleV4Action(up,up.durationMs*.5).pose.sit>0);
 assert.equal(sampleV4Action(up,up.durationMs).pose.sit,0);
 const sit=startV4Action({actionId:'sit'});
 assert.equal(sampleV4Action(sit,0).pose.sit,1);
});
test('isolated controller supports repeated movement and 30 actors without global state',()=>{
 const actors=Array.from({length:30},(_,i)=>createV4StageController({x:.2+(i%6)*.12,y:.18+Math.floor(i/6)*.12}));
 actors.forEach((a,i)=>a.start(i%2===0?'walk':'run',100,{targetFacing:V4_DIRECTIONS[i%4]}));
 const states=actors.map(x=>x.sample(350));
 assert.equal(states.length,30);
 assert.ok(states.every(x=>x.position.x>=.08&&x.position.x<=.92&&x.position.y>=.08&&x.position.y<=.92));
 assert.ok(states.every(x=>x.pose.headTiltDeg===0));
});
test('unapproved actions are rejected by rig lab',()=>{
 assert.throws(()=>startV4Action({actionId:'attack'}),/INVALID_ACTION/);
 assert.throws(()=>startV4Action({actionId:'walk',targetFacing:'north'}),/INVALID_FACING/);
 assert.throws(()=>startV4Action({actionId:'result',result:'tie'}),/INVALID_RESULT/);
});
