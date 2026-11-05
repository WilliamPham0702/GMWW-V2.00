import test from 'node:test';
import assert from 'node:assert/strict';
import {hunterLinkedDeaths,isWolfHunterRole,isHunterRole} from '../src/gmww-hunter-death-rules.js';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';

// Phạm vi: luật Sói Thợ Săn — đánh dấu, chết theo, bảo vệ ban đêm, chọn lại khi mục tiêu đã chết.
const wh={loginId:'a',roleId:'role_wolf_hunter',roleName:'Sói Thợ Săn'};
const mark={id:'mark',type:'effect_notice',matchId:'M',night:1,actorId:'a',loginId:'b',actionId:'action_hunter_mark',effectActive:false,createdAt:'2026-01-01T01:00:00Z'};
const bite={...mark,id:'bite',loginId:'c',actionId:'action_wolf_bite',createdAt:'2026-01-01T02:00:00Z'};
const dayDeath={id:'d1',type:'dead',matchId:'M',night:2,cycleKey:'morning-2',loginId:'a',effectActive:true,createdAt:'2026-01-02T01:00:00Z'};
const nightDeath={...dayDeath,id:'d2',cycleKey:'night-2'};
const protect=(cycleKey,loginId='b')=>({id:'p'+cycleKey,type:'effect_notice',matchId:'M',night:2,cycleKey,actorId:'g',loginId,actionId:'action_protect',effectActive:true});
const run=interactions=>hunterLinkedDeaths({assignments:[wh],interactions,matchId:'M',night:2});

test('nhận diện Sói Thợ Săn, không lẫn với Thợ Săn thường',()=>{
  assert.equal(isWolfHunterRole(wh),true);
  assert.equal(isHunterRole(wh),false);
  assert.equal(isWolfHunterRole({roleId:'role_hunter',roleName:'Thợ Săn'}),false);
});

test('chỉ Đánh Dấu Săn mới tính; Sói Cắn không phải mục tiêu chết theo',()=>{
  assert.deepEqual(run([bite,dayDeath]),[]);
  const r=run([mark,bite,dayDeath]);
  assert.equal(r.length,1);assert.equal(r[0].loginId,'b');
});

test('chưa chết thì chưa kéo theo; chết ban ngày thì mục tiêu chết theo dù có Bảo Vệ',()=>{
  assert.deepEqual(run([mark]),[]);
  assert.equal(run([mark,dayDeath])[0].loginId,'b');
  assert.equal(run([mark,protect('night-2'),dayDeath]).length,1,'Bảo Vệ chỉ có tác dụng ban đêm');
});

test('Sói Thợ Săn chết ban đêm: mục tiêu được Bảo Vệ cùng đêm thì sống, đêm khác thì vẫn chết',()=>{
  assert.deepEqual(run([mark,protect('night-2'),nightDeath]),[]);
  assert.equal(run([mark,protect('night-1'),nightDeath]).length,1);
  assert.equal(run([mark,protect('night-2','c'),nightDeath]).length,1);
});

test('mục tiêu đã chết trước thì không kéo thêm người khác; chọn lại thì mục tiêu mới có hiệu lực',()=>{
  const targetDead={id:'t',type:'dead',matchId:'M',night:1,loginId:'b',effectActive:true};
  assert.deepEqual(run([mark,targetDead,dayDeath]),[]);
  const remark={...mark,id:'re',night:2,loginId:'c',createdAt:'2026-01-02T00:00:00Z'};
  assert.equal(run([mark,targetDead,remark,dayDeath])[0].loginId,'c');
});

const card={functions:[{actionId:'action_hunter_mark',phase:'night',usageMode:'unlimited',targetCount:1,noSelf:true}]};
const policy=resolveRoleActionPolicy(card,'role_wolf_hunter','action_hunter_mark');
const base={matchId:'M',roleId:'role_wolf_hunter',actorId:'a',actionId:'action_hunter_mark',policy};
const prev=[{matchId:'M',night:1,actorId:'a',roleId:'role_wolf_hunter',actionId:'action_hunter_mark',targetIds:['b']}];

test('chọn lần đầu được; chọn lại khi mục tiêu còn sống bị chặn; mục tiêu đã chết thì được chọn lại',()=>{
  assert.equal(checkBattleRoleActionUsage([],{...base,night:1,targetIds:['b'],deadLoginIds:[]}).ok,true);
  assert.equal(checkBattleRoleActionUsage(prev,{...base,night:2,targetIds:['c'],deadLoginIds:[]}).error,'HUNTER_MARK_TARGET_STILL_ALIVE');
  assert.equal(checkBattleRoleActionUsage(prev,{...base,night:2,targetIds:['c'],deadLoginIds:['b']}).ok,true);
});
