import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isBattleActorBlocked} from '../src/gmww-battle-actor-eligibility.js';

const match='match-01',actor='carol';
const statusDefs={
  disabled_permanent:{blocks:true},
  disabled_2n:{blocks:true},
  infected:{blocks:false},
  mute:{blocks:false}
};
const effect=(type,props={})=>({type,loginId:actor,matchId:match,effectActive:true,...props});
const blocked=rows=>isBattleActorBlocked(rows,{actorId:actor,matchId:match,statusDefs});

test('frozen and dead actors cannot act, expelled actors remain selectable with inert effects',()=>{
  for(const type of ['frozen','dead'])assert.equal(blocked([effect(type)]),true,type);
  assert.equal(blocked([effect('expelled')]),false);
});
test('active disabling status blocks, nonblocking statuses do not',()=>{
  assert.equal(blocked([effect('status',{statusId:'disabled_permanent'})]),true);
  assert.equal(blocked([effect('status',{statusId:'disabled_2n'})]),true);
  assert.equal(blocked([effect('status',{statusId:'infected'})]),false);
  assert.equal(blocked([effect('status',{statusId:'mute'})]),false);
});
test('expired effects, other owners and another match cannot block current actor',()=>{
  assert.equal(blocked([effect('frozen',{effectActive:false})]),false);
  assert.equal(blocked([effect('frozen',{loginId:'alice'})]),false);
  assert.equal(blocked([effect('dead',{matchId:'other-match'})]),false);
  assert.equal(blocked([effect('status',{statusId:'disabled_2n',effectActive:false})]),false);
});
test('legacy matchless active effects still block and expiry is authoritative',()=>{
  assert.equal(blocked([effect('frozen',{matchId:null})]),true);
  assert.equal(blocked([effect('dead',{effectActive:false})]),false);
});
test('actor case-folding and absence of data are backwards compatible',()=>{
  assert.equal(isBattleActorBlocked([effect('frozen',{loginId:'  CaRoL '})],{actorId:'CAROL',matchId:match,statusDefs}),true);
  assert.equal(blocked(null),false);
  assert.equal(blocked([]),false);
});
test('Production Durable Object enforces this shared policy before applying the action',()=>{
  const source=fs.readFileSync('src/index.js','utf8');
  assert.match(source,/import \{ isBattleActorBlocked \} from "\.\/gmww-battle-actor-eligibility\.js";/);
  assert.match(source,/if\(isBattleActorBlocked\(interactions,\{actorId,matchId,statusDefs:STATUS_DEFS\}\)\)/);
  assert.match(source,/ACTOR_CANNOT_ACT/);
});
