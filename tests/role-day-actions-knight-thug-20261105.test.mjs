import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {pruneInteractions} from '../src/gmww-interaction-retention.js';
import {reserveArtifactActivation} from '../src/gmww-game-scene-rules.js';

// Phạm vi: luật hành động ban ngày của Hiệp Sĩ và Du Côn trên Durable Object thật (gmDayAction).
const server=fs.readFileSync('src/index.js','utf8');
const begin=server.indexOf('  async gmDayAction(request,body){');
const finish=server.indexOf('  /* V3.99:',begin);
assert.ok(begin>=0&&finish>begin);
const Room=vm.runInNewContext('(class { '+server.slice(begin,finish)+' })',{
  Response,crypto:webcrypto,
  j:(v,code=200)=>Response.json(v,{status:code}),
  normalizeLoginId:x=>String(x||'').trim().toLowerCase(),
  gameLabelKey:x=>String(x||'').toLowerCase(),
  currentArtifactCycleKey:m=>String(m.matchId)+':'+String(m.cyclePhase)+':'+String(m.cycleNight),
  reserveArtifactActivation,pruneInteractions
});
const clone=x=>x===undefined?undefined:structuredClone(x);
const result=async r=>({status:r.status,...await r.json()});
function harness(roles,ballot){
  const data=new Map(),room=new Room();
  const storage={get:async k=>clone(data.get(k)),put:async(k,v)=>{data.set(k,clone(v))},delete:async k=>data.delete(k)};
  room.ctx={storage};room.broadcast=()=>{};
  room.gmAuthorized=async()=>({ok:true,meta:await storage.get('meta')});
  room.gallowsState=async()=>({ballot});
  data.set('meta',{phase:'running',cyclePhase:'morning',matchId:'m1',cycleKey:'morning-2',cycleNight:2});
  data.set('players',{'member:alice':{loginId:'alice'},'member:bob':{loginId:'bob'},'member:carol':{loginId:'carol'}});
  data.set('gameConfig',{artifactLimitPerCycle:2});
  data.set('assignments',roles.map(([loginId,roleId,faction])=>({loginId,roleId,faction})));
  return {data,room};
}
const dead=(data,id)=>(data.get('interactions')||[]).filter(x=>x.type==='dead'&&x.loginId===id).length;

test('Du Côn đâm nhầm Dân Làng: Du Côn tự chết, mục tiêu sống',async()=>{
  const {data,room}=harness([['alice','role_thug','village'],['bob','role_villager','village'],['carol','role_wolf','wolf']]);
  data.set('role:alice',{roleId:'role_thug',roleCard:{functions:[{actionId:'action_stab',phase:'day',usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:true}]}});
  const r=await result(await room.gmDayAction(null,{matchId:'m1',cycleKey:'morning-2',actorId:'alice',roleId:'role_thug',actionId:'action_stab',targetIds:['bob'],clientEventId:'wrong'}));
  assert.equal(r.ok,true);
  assert.equal(dead(data,'alice'),1);
  assert.equal(dead(data,'bob'),0);
});

test('Du Côn đâm đúng Phe Ba: mục tiêu chết, Du Côn sống',async()=>{
  const {data,room}=harness([['alice','role_thug','village'],['bob','role_assassin','third'],['carol','role_villager','village']]);
  data.set('role:alice',{roleId:'role_thug',roleCard:{functions:[{actionId:'action_stab',phase:'day',usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:true}]}});
  const r=await result(await room.gmDayAction(null,{matchId:'m1',cycleKey:'morning-2',actorId:'alice',roleId:'role_thug',actionId:'action_stab',targetIds:['bob'],clientEventId:'third'}));
  assert.equal(r.ok,true);
  assert.equal(dead(data,'bob'),1);
  assert.equal(dead(data,'alice'),0);
});

const knightFn={actionId:'action_knight_last_strike',phase:'day',usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:true,actorMayBeDead:true};
const knightReq=(extra={})=>({matchId:'m1',cycleKey:'morning-2',actorId:'alice',roleId:'role_knight',actionId:'action_knight_last_strike',targetIds:['bob'],clientEventId:'k1',...extra});
const knightRoles=[['alice','role_knight','village'],['bob','role_wolf','wolf'],['carol','role_villager','village']];

test('Hiệp Sĩ chỉ được dùng khi bị treo cổ: không bị treo thì KNIGHT_REQUIRES_LYNCH',async()=>{
  const {data,room}=harness(knightRoles,{stage:'resolved',outcome:'safe',candidateId:'alice'});
  data.set('role:alice',{roleId:'role_knight',roleCard:{functions:[knightFn]}});
  const r=await result(await room.gmDayAction(null,knightReq()));
  assert.equal(r.status,409);assert.equal(r.error,'KNIGHT_REQUIRES_LYNCH');
});

test('Hiệp Sĩ bị treo cổ chọn mục tiêu: xếp hàng chờ, chưa chết ngay, trùng lặp bị chặn',async()=>{
  const {data,room}=harness(knightRoles,{stage:'resolved',outcome:'dead',candidateId:'alice'});
  data.set('role:alice',{roleId:'role_knight',roleCard:{functions:[knightFn]}});
  const r=await result(await room.gmDayAction(null,knightReq()));
  assert.equal(r.ok,true);
  assert.ok(data.get('knightPending:m1:3:bob'),'có hàng chờ cho sáng ngày 3');
  assert.equal(dead(data,'bob'),0,'chưa chết ngay');
  const again=await result(await room.gmDayAction(null,knightReq({clientEventId:'k2'})));
  assert.equal(again.ok,false);
});
