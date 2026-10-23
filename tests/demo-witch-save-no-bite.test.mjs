import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
import {targetsFor} from '../src/gmww-demo-runner.js';

const meta={matchId:'demo-witch-regression',cycleNight:1};
const players=Object.fromEntries([
 ['witch',1],['alice',2],['bob',3]
].map(([loginId,seatId])=>['member:'+loginId,{loginId,seatId}]));
const event=(actionId,loginId,direction='')=>({
 matchId:meta.matchId,night:meta.cycleNight,
 type:'effect_notice',actionId,loginId,direction
});
const ctx=(rows,roster=players)=>({rows,players:roster});
const save={actionId:'action_witch_save',artifactId:'',actorIds:['witch'],
 type:'effect_notice',noSelf:true,targetCount:1};

test('Witch DEMO save does not crash or pick an arbitrary player when wolves did not bite',()=>{
 const rows=[];
 assert.deepEqual(resolveWolfNight({interactions:rows,players,matchId:meta.matchId,night:1}).attacked,[]);
 assert.equal(targetsFor(save,'witch',ctx(rows),meta),null);
});

test('Fairy transfers without a prior bite do not stop the DEMO at the Witch turn',()=>{
 const rows=[event('action_transfer_bite','alice','right')];
 const result=resolveWolfNight({interactions:rows,players,matchId:meta.matchId,night:1});
 assert.equal(result.ok,true);
 assert.deepEqual(result.attacked,[]);
 assert.equal(targetsFor(save,'witch',ctx(rows),meta),null);
});

test('Missing seat order for a transferred bite fails closed without a map crash',()=>{
 const rows=[event('action_wolf_bite','alice'),event('action_transfer_bite','bob','left')];
 const roster={'member:witch':{loginId:'witch'},'member:alice':{loginId:'alice'}};
 const result=resolveWolfNight({interactions:rows,players:roster,matchId:meta.matchId,night:1});
 assert.equal(result.ok,false);
 assert.deepEqual(result.attacked,[]);
 assert.equal(targetsFor(save,'witch',ctx(rows,roster),meta),null);
});

test('Witch DEMO still saves the real bitten player and can perform other powers',()=>{
 const bitten=[event('action_wolf_bite','alice')];
 assert.deepEqual(targetsFor(save,'witch',ctx(bitten),meta),['alice']);
 const withoutBite=ctx([]);
 const kill={...save,actionId:'action_witch_kill',type:'dead'};
 const target=targetsFor(kill,'witch',withoutBite,meta);
 assert.equal(target.length,1);
 assert.ok(['alice','bob'].includes(target[0]));
});

test('Invalid wolf-night context preserves an array-shaped attacked contract',()=>{
 const result=resolveWolfNight({interactions:[],players,matchId:'',night:1});
 assert.equal(result.ok,false);
 assert.deepEqual(result.attacked,[]);
});

test('Guard prioritizes self when self is a legal target',()=>{
 const guard={actionId:'action_protect',type:'effect_notice',noSelf:false,targetCount:1};
 for(let i=0;i<20;i++)assert.deepEqual(targetsFor(guard,'witch',ctx([]),meta),['witch']);
});
