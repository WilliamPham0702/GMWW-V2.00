import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGE9_VERSION,publicGameplaySnapshot,reduceGameplaySync,gallowsVisual,gameplaySceneStatus} from '../assets/village/arena-3d/stage9-gameplay-sync.mjs';
const make=(overrides={},n=12)=>({room:{code:'ARENA',matchId:'match-1',phase:'running',cycleKey:'night-1',cyclePhase:'night',cycleNight:1,...overrides},players:Array.from({length:n},(_,i)=>({id:'member:'+i}))});
test('GĐ9: lobby to game and new match lifecycle',()=>{
 const lobby=publicGameplaySnapshot(make({phase:'lobby',matchId:''}));
 const running=publicGameplaySnapshot(make());
 assert.equal(reduceGameplaySync(lobby,running).reset,true);
 assert.equal(gameplaySceneStatus(running).night,true);
 assert.equal(gameplaySceneStatus(running).label,'Đêm 1');
 assert.equal(reduceGameplaySync(running,publicGameplaySnapshot(make({phase:'lobby'}))).accept,false);
 const newMatch=publicGameplaySnapshot(make({matchId:'match-2',cycleNight:1}));
 assert.equal(reduceGameplaySync(running,newMatch).reset,true);
});
test('GĐ9: duplicate frames do not cause scene resets',()=>{
 const a=publicGameplaySnapshot(make());
 assert.deepEqual(reduceGameplaySync(a,a),{accept:true,reason:'duplicate',reset:false,changed:false});
 assert.equal(reduceGameplaySync(a,publicGameplaySnapshot(make({cycleNight:0}))).accept,false);
 const morning=publicGameplaySnapshot(make({cycleKey:'morning-1',cyclePhase:'morning'}));
 assert.equal(reduceGameplaySync(a,morning).accept,true);
 assert.equal(gameplaySceneStatus(morning).label,'Ngày 1');
});
test('GĐ9: roster is public, capped at 30, deduplicated',()=>{
 const frame=make({},35);
 frame.players.push({id:'member:0'});
 const s=publicGameplaySnapshot(frame);
 assert.equal(s.playerIds.length,30);
 assert.equal(Object.isFrozen(s.playerIds),true);
 assert.equal('gmToken' in s,false);
 assert.equal('roleId' in s,false);
});
test('GĐ9: gallows projection only exposes public counters and candidate',()=>{
 const frame=make({cycleKey:'morning-2',cyclePhase:'morning',cycleNight:2});
 const snapshot=publicGameplaySnapshot(frame,{stage:'voting',candidateId:'member:2',save:5,kill:7,outcome:'death',secretRole:'wolf'});
 assert.deepEqual(gallowsVisual(snapshot),{active:true,candidateId:'member:2',outcome:'death',save:5,kill:7});
 assert.equal(JSON.stringify(snapshot).includes('wolf'),false);
 assert.equal(gallowsVisual(publicGameplaySnapshot(frame)).active,false);
});
test('GĐ9: only isolated 3D scene consumes public gameplay projection',()=>{
 const src=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(src,/reduceGameplaySync\(gameplaySnapshot,nextGameplay\)/);
 assert.match(src,/if\(!decision\.accept\)/);
 assert.match(src,/gmwwStage9=STAGE9_VERSION/);
 assert.match(src,/gallowsVisual\(gameplaySnapshot\)/);
 assert.equal(STAGE9_VERSION,'gmww.arena.gameplay-sync.9');
});
