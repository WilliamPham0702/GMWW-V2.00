import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';

const players=Object.fromEntries([['alice',1],['bob',2],['carol',3],['dave',4]].map(([loginId,seatId])=>['member:'+loginId,{loginId,seatId}]));
const action=(actionId,loginId,{night=1,matchId='m1',direction='',actorId='gm'}={})=>
  ({type:'effect_notice',actionId,loginId,night,matchId,direction,actorId,clientEventId:actionId+':'+loginId});
const bite=(id,options)=>action('action_wolf_bite',id,options);
const guard=(id,options)=>action('action_protect',id,options);
const fairy=(direction,options)=>action('action_transfer_bite','carol',{direction,...options});
const resolve=(interactions,more={})=>resolveWolfNight({interactions,players,matchId:'m1',night:1,...more});

test('direct wolf bite kills only the unprotected target',()=>{
  const result=resolve([bite('bob')]);
  assert.equal(result.ok,true);
  assert.deepEqual(result.victims,['bob']);
  assert.equal(result.biteCount,1);
});
test('guard prevents direct wolf bite, not unrelated deaths',()=>{
  const result=resolve([bite('bob'),guard('bob'),{type:'dead',loginId:'alice',matchId:'m1',night:1,effectActive:true}]);
  assert.equal(result.ok,true);
  assert.deepEqual(result.victims,[]);
  assert.deepEqual(result.blocked,['bob']);
});
test('fairy moves bite to adjacent occupied seat BEFORE protection check',()=>{
  const result=resolve([bite('bob'),guard('bob'),fairy('right')]);
  assert.equal(result.ok,true);
  assert.deepEqual(result.victims,['alice']);
  assert.deepEqual(result.transfers,[{from:'bob',to:'alice',direction:'right'}]);
});
test('guard on transferred destination prevents wolf bite',()=>{
  const result=resolve([bite('bob'),fairy('right'),guard('alice')]);
  assert.equal(result.ok,true);
  assert.deepEqual(result.victims,[]);
  assert.deepEqual(result.blocked,['alice']);
});
test('left movement wraps around circle in seated order',()=>{
  const result=resolve([bite('alice'),fairy('left')]);
  assert.deepEqual(result.victims,['bob']);
});
test('fairy can act with no wolf bite without producing a death',()=>{
  const result=resolve([fairy('right'),guard('alice')]);
  assert.equal(result.ok,true);
  assert.equal(result.biteCount,0);
  assert.deepEqual(result.victims,[]);
});
test('ignore old nights and unrelated matches and already ended notices',()=>{
  const result=resolve([bite('bob',{night:2}),bite('carol',{matchId:'m2'}),bite('dave'),guard('dave',{night:3})]);
  assert.deepEqual(result.victims,['dave']);
});
test('do not resolve a second death for player already dead in same match',()=>{
  const result=resolve([bite('bob'),{type:'dead',loginId:'bob',matchId:'m1',night:1,effectActive:true}]);
  assert.deepEqual(result.victims,[]);
});
test('missing or duplicated seated positions must fail closed for transfers',()=>{
  assert.equal(resolve([bite('bob'),fairy('left')],{players:{'member:bob':{loginId:'bob',seatId:2}}}).ok,false);
  const duplicated={...players,'member:alice':{loginId:'alice',seatId:2}};
  assert.equal(resolve([bite('bob'),fairy('right')],{players:duplicated}).ok,false);
});
test('multiple wolf bites never create duplicate victims',()=>{
  const result=resolve([bite('bob'),bite('bob'),bite('carol')]);
  assert.deepEqual(result.victims,['bob','carol']);
});
test('non-notice events cannot masquerade as a wolf action',()=>{
  const result=resolve([{...bite('bob'),type:'thumb_vote'},{...guard('bob'),type:'dead'}]);
  assert.deepEqual(result.victims,[]);
});
