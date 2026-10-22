import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sanitizeGameConfig,normalizeRoomMode,normalizeSeatMoveMode,normalizeSeatCount} from '../src/gmww-room-config-rules.js';

test('room config: rejects missing values and maintains legacy defaults',()=>{
  assert.equal(sanitizeGameConfig(null),null);
  assert.equal(sanitizeGameConfig(undefined),null);
  assert.equal(sanitizeGameConfig('not-an-object'),null);
  const result=sanitizeGameConfig({});
  assert.equal(result.name,'Game Online');
  assert.equal(result.artifactLimitPerCycle,3);
  assert.deepEqual(result.roles,[]);
  assert.deepEqual(result.artifacts,[]);
  assert.equal(result.artifactsEnabled,false);
  assert.deepEqual(result.timing,{
    villageDiscussionSec:300,gallowsNominationSec:10,gallowsVoteSec:10,wolfDiscussionSec:30,earlyArtifactSec:30,
    defaultActionSec:45,artifactActionSec:30,autoAdvance:true
  });
});

test('room config: preserves role metadata, nested legacy values and timing overrides',()=>{
  const input={
    name:'Night template',
    timing:{defaultActionSec:38,wolfDiscussionSec:41,autoAdvance:false},
    roles:[{role:{id:'seer',name:'Tiên Tri',faction:'village',description:'read'},count:3,order:6},
      {roleId:'wolf',name:'Sói',actionDurationSec:3601,count:99,order:7}]
  };
  const snapshot=structuredClone(input),out=sanitizeGameConfig(input);
  assert.deepEqual(input,snapshot,'normalization must not mutate game templates');
  assert.deepEqual(out.roles[0],{
    roleId:'seer',roleName:'Tiên Tri',faction:'village',description:'read',
    count:3,order:6,actionDurationSec:38
  });
  assert.equal(out.roles[1].actionDurationSec,3600);
  assert.equal(out.roles[1].count,20);
  assert.equal(out.timing.wolfDiscussionSec,41);
  assert.equal(out.timing.autoAdvance,false);
});

test('room config: explicit artifact disable and numeric limits survive serialization',()=>{
  const input={id:'abc',artifactsEnabled:false,artifacts:[{artifactId:'mirror',order:4}],artifactLimitPerCycle:0,roles:[{id:'seer'}]};
  const out=sanitizeGameConfig(input);
  assert.equal(out.id,'abc');
  assert.equal(out.artifactsEnabled,false);
  assert.deepEqual(out.artifacts,[]);
  assert.equal(out.artifactLimitPerCycle,0);
  assert.equal(out.roles[0].roleId,'seer');
  assert.deepEqual(sanitizeGameConfig({artifacts:[{artifactId:'mirror',order:4}]}).artifacts,[{artifactId:'mirror',order:4}]);
  assert.equal(sanitizeGameConfig({artifacts:[{artifactId:'mirror'}]}).artifactsEnabled,true);
  assert.equal(sanitizeGameConfig({artifacts:[],artifactsEnabled:true}).artifactsEnabled,true);
});

test('room config: count and timing caps match saved-room schema',()=>{
  const r=sanitizeGameConfig({playerCount:400,artifactLimitPerCycle:999,roles:[{roleId:'wolf',count:-3}],
    timing:{defaultActionSec:-11,villageDiscussionSec:4000,earlyArtifactSec:9.9}});
  assert.equal(r.playerCount,100);
  assert.equal(r.artifactLimitPerCycle,30);
  assert.equal(r.roles[0].count,1);
  assert.equal(r.timing.defaultActionSec,0);
  assert.equal(r.timing.villageDiscussionSec,3600);
  assert.equal(r.timing.earlyArtifactSec,9);
});

test('room setup: movement/online normalization and one-ring seat limits are unchanged',()=>{
  assert.equal(normalizeRoomMode(' OFFLINE '),'offline');
  assert.equal(normalizeRoomMode('Other'),'online');
  assert.equal(normalizeSeatMoveMode(' WALK '),'walk');
  assert.equal(normalizeSeatMoveMode('other'),'instant');
  assert.equal(normalizeSeatCount(null),12);
  assert.equal(normalizeSeatCount(0,24),24);
  assert.equal(normalizeSeatCount(39),30);
  assert.equal(normalizeSeatCount(3.9),3);
  assert.equal(normalizeSeatCount(1),1);
});

test('room setup: production Worker imports the shared contract exactly once',()=>{
  const source=readFileSync('src/index.js','utf8');
  assert.match(source,/from "\.\/gmww-room-config-rules\.js";/);
  assert.doesNotMatch(source,/function sanitizeGameConfig\(/);
  assert.doesNotMatch(source,/function normalizeSeatCount\(/);
  assert.match(source,/sanitizeGameConfig\(/);
  assert.match(source,/normalizeSeatCount\(/);
});
