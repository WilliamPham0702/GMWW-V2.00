import test from 'node:test';import assert from 'node:assert/strict';
import {foolEscapes,foolEscapeRow,foolVoteBans,peaceLoverIds,judgeDoubleActive} from '../src/gmww-gallows-cards.js';
import {gallowsVoteTotals,gallowsAutomaticOutcome} from '../src/gmww-gallows-rules.js';
const M='m1',as=[{loginId:'f',roleId:'role_fool'},{loginId:'p',roleId:'role_peace_lover'},{loginId:'x',roleId:'role_villager'}];
test('Kẻ Ngốc: lần 1 thoát và mất quyền bỏ phiếu, lần 2 chết',()=>{
  assert.equal(foolEscapes({assignments:as,interactions:[],matchId:M,candidateId:'f'}),true);
  assert.equal(foolEscapes({assignments:as,interactions:[],matchId:M,candidateId:'x'}),false);
  const row=foolEscapeRow({matchId:M,night:1,candidateId:'f'});
  assert.equal(foolEscapes({assignments:as,interactions:[row],matchId:M,candidateId:'f'}),false);
  assert.deepEqual(foolVoteBans({interactions:[row],matchId:M}),['f']);
  assert.deepEqual(foolVoteBans({interactions:[{...row,undone:true}],matchId:M}),[]);
});
test('Người Yêu Hòa Bình: phiếu Treo Cổ không tính, phiếu Cứu tính',()=>{
  const ballot={eligible:['p','a','b','c'],candidateId:'c',votes:{p:'👎',a:'👎',b:'👍'},saveOnlyVoters:peaceLoverIds({assignments:as})};
  assert.deepEqual([gallowsVoteTotals(ballot).kill,gallowsVoteTotals(ballot).save],[1,1]);
  assert.equal(gallowsAutomaticOutcome(ballot),'alive');
  assert.equal(gallowsVoteTotals({...ballot,votes:{p:'👍'}}).save,1);
});
test('Thẩm Phán: Phán Quyết Kép chỉ hiệu lực đúng ngày',()=>{
  const row={type:'effect_notice',actionId:'action-judge-double',matchId:M,night:2,effectActive:false};
  assert.equal(judgeDoubleActive({interactions:[row],matchId:M,day:2}),true);
  assert.equal(judgeDoubleActive({interactions:[row],matchId:M,day:3}),false);
  assert.equal(judgeDoubleActive({interactions:[{...row,undone:true}],matchId:M,day:2}),false);
});
