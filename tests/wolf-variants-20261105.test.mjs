import test from 'node:test';import assert from 'node:assert/strict';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
import {validConversions,effectiveAssignments,cubExtraBite,stoneSkinFilter,fireSpreadDeaths,convertNotices} from '../src/gmww-wolf-variant-rules.js';
const M='m1';
const A=(loginId,roleId,faction)=>({loginId,roleId,faction,roleCard:{factionId:faction}});
const players=Object.fromEntries(['a','b','c','d','e'].map((l,i)=>[l,{loginId:l,seatId:i+1}]));
const bite=(actor,target,night=1)=>({type:'effect_notice',actionId:'action_wolf_bite',actorId:actor,loginId:target,matchId:M,night});
const dead=(l,night)=>({type:'dead',loginId:l,matchId:M,night,effectActive:true});
test('Sói Quỷ: chuyển hóa thay Sói Cắn, đổi phe đêm sau, tối đa 3 lần',()=>{
  const as=[A('a','role_demon_wolf','wolf'),A('b','role_wolf','wolf'),A('c','role_seer','village'),A('d','role_guard','village'),A('e','role_witch','village'),A('f','role_hunter','village')];
  const conv=(t,n)=>({type:'effect_notice',actionId:'action-demon-wolf-convert',actorId:'a',loginId:t,matchId:M,night:n});
  const rows=[bite('b','c',1),conv('c',1)];
  const r=resolveWolfNight({interactions:rows,players,assignments:as,matchId:M,night:1});
  assert.deepEqual(r.victims,[]);assert.deepEqual(r.converted,['c']);
  assert.equal(effectiveAssignments({assignments:as,interactions:rows,matchId:M,night:1}).find(x=>x.loginId==='c').faction,'village');
  assert.equal(effectiveAssignments({assignments:as,interactions:rows,matchId:M,night:2}).find(x=>x.loginId==='c').faction,'wolf');
  assert.equal(convertNotices({assignments:as,interactions:rows,matchId:M,night:2}).length,1);
  assert.equal(convertNotices({assignments:as,interactions:rows,matchId:M,night:3}).length,0);
  const four=[conv('c',1),conv('d',2),conv('e',3),conv('f',4)];
  assert.equal(validConversions({assignments:as,interactions:four,matchId:M,night:4}).length,3);
});
test('Lang Huynh Đệ: chỉ chuyển hóa khi là Sói duy nhất',()=>{
  const as=[A('a','role_wolf_brother','wolf'),A('b','role_wolf','wolf'),A('c','role_seer','village')];
  const row={type:'effect_notice',actionId:'action-wolf-brother-bite',actorId:'a',loginId:'c',matchId:M,night:2};
  assert.equal(validConversions({assignments:as,interactions:[row],matchId:M,night:2}).length,0);
  assert.equal(validConversions({assignments:as,interactions:[dead('b',1),row],matchId:M,night:2}).length,1);
});
test('Sói Con: chết thì đêm sau Cắn hai người, chỉ một đêm',()=>{
  const as=[A('a','role_wolf_cub','wolf'),A('b','role_wolf','wolf'),A('c','role_wolf','wolf'),A('d','x','village'),A('e','y','village')];
  const rows=[dead('a',1),bite('b','d',2),bite('c','e',2)];
  assert.equal(cubExtraBite({assignments:as,interactions:rows,matchId:M,night:2}),true);
  assert.equal(cubExtraBite({assignments:as,interactions:rows,matchId:M,night:3}),false);
  const r=resolveWolfNight({interactions:rows,players,assignments:as,matchId:M,night:2});
  assert.deepEqual([...r.victims].sort(),['d','e']);
  const r1=resolveWolfNight({interactions:[dead('a',1),bite('b','d',3),bite('c','e',3)],players,assignments:as,matchId:M,night:3});
  assert.equal(r1.victims.length,0);
});
test('Sói Lạc Bầy: chưa tham gia đàn Đêm 1–2, Cắn từ Đêm 3',()=>{
  const as=[A('a','role_lone_wolf','wolf'),A('b','role_wolf','wolf'),A('c','x','village'),A('d','y','village')];
  const r1=resolveWolfNight({interactions:[bite('b','c',1),bite('a','d',1)],players,assignments:as,matchId:M,night:1});
  assert.deepEqual(r1.victims,['c']);assert.equal(r1.biteCount,1);
  const r3=resolveWolfNight({interactions:[bite('a','d',3)],players,assignments:as,matchId:M,night:3});
  assert.deepEqual(r3.victims,['d']);
});
test('Sói Lai: từ Đêm 5 thành Phe Dân, không còn Cắn cùng đàn',()=>{
  const as=[A('a','role_hybrid_wolf','wolf'),A('b','role_wolf','wolf'),A('c','x','village'),A('d','y','village')];
  const r4=resolveWolfNight({interactions:[bite('a','c',4)],players,assignments:as,matchId:M,night:4});
  assert.deepEqual(r4.victims,['c']);
  const r5=resolveWolfNight({interactions:[bite('a','c',5)],players,assignments:as,matchId:M,night:5});
  assert.deepEqual(r5.victims,[]);
  assert.equal(effectiveAssignments({assignments:as,interactions:[],matchId:M,night:5})[0].faction,'village');
});
test('Sói Đá: Da Đá chặn đúng 1 lần',()=>{
  const as=[A('a','role_stone_wolf','wolf'),A('c','x','village')];
  const f1=stoneSkinFilter({assignments:as,interactions:[],matchId:M,night:1,victims:['a','c']});
  assert.deepEqual(f1.victims,['c']);assert.equal(f1.rows.length,1);
  const f2=stoneSkinFilter({assignments:as,interactions:f1.rows,matchId:M,night:2,victims:['a']});
  assert.deepEqual(f2.victims,['a']);
});
test('Sói Lửa: Lửa Lan chỉ khi Sói duy nhất; chết sáng 2 ngày sau; hủy nếu hàng xóm đã chết',()=>{
  const as=[A('a','role_fire_wolf','wolf'),A('b','x','village'),A('c','y','village'),A('d','z','village')];
  const fire=(dir)=>({type:'effect_notice',actionId:'action-fire-wolf-bite',actorId:'a',loginId:'c',direction:dir,matchId:M,night:1});
  const r=fireSpreadDeaths({assignments:as,interactions:[fire('left')],players,matchId:M,night:3});
  assert.equal(r[0].loginId,'d');
  assert.equal(fireSpreadDeaths({assignments:as,interactions:[fire('left')],players,matchId:M,night:2}).length,0);
  assert.equal(fireSpreadDeaths({assignments:as,interactions:[fire('left'),dead('d',1)],players,matchId:M,night:3}).length,0);
  const two=[...as,A('e','role_wolf','wolf')];
  assert.equal(fireSpreadDeaths({assignments:two,interactions:[fire('left')],players,matchId:M,night:3}).length,0);
});
