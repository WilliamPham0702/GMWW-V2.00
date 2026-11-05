import test from 'node:test';
import assert from 'node:assert/strict';
import {loverPairs,loverLinkedDeaths} from '../src/gmww-lovers-rules.js';
import {hunterLinkedDeaths} from '../src/gmww-hunter-death-rules.js';

// Phạm vi: Cupid — ghép đôi và chết theo cùng lúc (luật chốt 05/11/2026).
const pair=(a,b,extra={})=>[a,b].map((x,i)=>({id:'p'+i,type:'effect_notice',matchId:'M',night:1,actorId:'cupid',loginId:x,actionId:'action-cupid-pair',effectActive:false,...extra}));
const dead=(loginId,id='d1')=>({id,type:'dead',matchId:'M',night:2,cycleKey:'night-2',loginId,effectActive:true});
const run=rows=>loverLinkedDeaths({interactions:rows,matchId:'M',night:2});

test('đủ 2 người mới thành cặp; Cupid có thể tự chọn mình',()=>{
  assert.deepEqual(loverPairs({interactions:pair('a','b'),matchId:'M'}),[['a','b']]);
  assert.deepEqual(loverPairs({interactions:pair('cupid','b'),matchId:'M'}),[['cupid','b']]);
  assert.deepEqual(loverPairs({interactions:pair('a','b').slice(0,1),matchId:'M'}),[]);
  assert.deepEqual(loverPairs({interactions:pair('a','b',{matchId:'OTHER'}),matchId:'M'}),[]);
  assert.deepEqual(loverPairs({interactions:pair('a','b',{noEffect:true}),matchId:'M'}),[]);
});

test('một người chết thì người kia chết cùng lúc, đúng hai chiều',()=>{
  let r=run([...pair('a','b'),dead('a')]);
  assert.equal(r.length,1);assert.equal(r[0].loginId,'b');assert.equal(r[0].cycleKey,'night-2');
  r=run([...pair('a','b'),dead('b')]);
  assert.equal(r[0].loginId,'a');
});

test('không chết lại: đã chết cả hai hoặc đã có bản ghi liên kết thì không thêm',()=>{
  assert.deepEqual(run([...pair('a','b'),dead('a'),dead('b','d2')]),[]);
  const first=run([...pair('a','b'),dead('a')]);
  assert.deepEqual(run([...pair('a','b'),dead('a'),...first]),[]);
});

test('không ghép thì không liên kết; hồi sinh (effectActive false) thì không kéo theo',()=>{
  assert.deepEqual(run([dead('a')]),[]);
  assert.deepEqual(run([...pair('a','b'),{...dead('a'),effectActive:false}]),[]);
});

test('chuỗi: Thợ Săn là tình nhân chết → mục tiêu săn chết, rồi tình nhân của mục tiêu chết theo',()=>{
  const hunter={loginId:'h',roleId:'role_hunter',roleName:'Thợ Săn'};
  const mark={id:'m',type:'effect_notice',matchId:'M',night:1,actorId:'h',loginId:'t',actionId:'action_hunt',effectActive:false,createdAt:'2026-01-01T01:00:00Z'};
  const base=[...pair('h','x'),...pair('t','y').map(r=>({...r,id:r.id+'t',actorId:'cupid2'})),mark,dead('h')];
  const l1=run(base);
  assert.deepEqual(l1.map(r=>r.loginId),['x']);
  const hs=hunterLinkedDeaths({assignments:[hunter],interactions:[...base,...l1],matchId:'M',night:2});
  assert.deepEqual(hs.map(r=>r.loginId),['t']);
  const l2=run([...base,...l1,...hs]);
  assert.deepEqual(l2.map(r=>r.loginId),['y']);
});
