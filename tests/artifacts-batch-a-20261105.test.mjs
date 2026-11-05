import test from 'node:test';import assert from 'node:assert/strict';
import {artifactDayPlan,gallowsArtifactFlags,princeCloakActive,orbVillageWin,lastHangedRole} from '../src/gmww-artifact-rules.js';
import {gallowsVoteTotals,gallowsCast,gallowsManualVote} from '../src/gmww-gallows-rules.js';
const A=[
 {loginId:'a',roleId:'role_villager',roleName:'Dân Làng',faction:'Phe Dân',artifactId:'artifact_08'},
 {loginId:'b',roleId:'role_wolf',roleName:'Sói Thường',faction:'Phe Sói',artifactId:'artifact_21'},
 {loginId:'c',roleId:'role_wolf',roleName:'Sói Thường',faction:'Phe Sói'},
 {loginId:'d',roleId:'role_seer',roleName:'Tiên Tri',faction:'Phe Dân',artifactId:'artifact_44'},
 {loginId:'e',roleId:'role_destroyer',roleName:'Kẻ Huỷ Diệt',faction:'Phe Ba',artifactId:'artifact_43'},
 {loginId:'f',roleId:'role_villager',roleName:'Dân Làng',faction:'Phe Dân',artifactId:'artifact_12'}];
const plan=(artifactId,targets,extra={})=>artifactDayPlan({artifactId,actionId:'x',actorId:'a',targets,assignments:A,interactions:[],matchId:'m',day:2,...extra});
test('cờ Treo Cổ theo Artifact',()=>{
  const f=gallowsArtifactFlags({assignments:A,interactions:[{type:'dead',loginId:'e',matchId:'m'}],matchId:'m'});
  assert.deepEqual(f.forcedKill,['a']);assert.deepEqual(f.doubleVoters,['b']);assert.deepEqual(f.saveOnly,['d']);
  assert.deepEqual(f.deadVoters,['e']);assert.equal(princeCloakActive({assignments:A,candidateId:'f'}),true);
  assert.equal(princeCloakActive({assignments:A,candidateId:'c'}),false);
});
test('phiếu: Mũ Ngốc ép GIẾT, Thị Trưởng x2, Hòa Bình chỉ CỨU, Âm Giới phiếu người chết',()=>{
  const ballot={candidateId:'x',eligible:['a','b','c','d'],deadVoters:['e'],forcedKillVoters:['a'],doubleVoters:['b'],saveOnlyVoters:['d'],
    votes:{a:'👍',b:'👍',c:'👎',d:'👎',e:'👎'}};
  const t=gallowsVoteTotals(ballot);
  assert.equal(t.save,2);assert.equal(t.kill,3);   // a→kill(1)+c(1)+e(1); b save x2; d👎 bị bỏ
  assert.equal(gallowsCast({stage:'voting',deadlineAt:9e15,candidateId:'x',eligible:['a'],forcedKillVoters:['a']},'a','👍').value.votes.a,'👎');
  assert.equal(gallowsCast({stage:'voting',deadlineAt:9e15,candidateId:'x',eligible:['a'],deadVoters:['e']},'e','👎').ok,true);
  assert.equal(gallowsCast({stage:'voting',deadlineAt:9e15,candidateId:'x',eligible:['a']},'e','👎').error,'VOTER_NOT_ELIGIBLE');
  assert.equal(gallowsManualVote({mode:'gm',stage:'voting',deadlineAt:9e15,candidateId:'x',eligible:['a'],forcedKillVoters:['a']},'a','👍').value.votes.a,'👎');
});
test('hành động ban ngày: soi/kiểm tra',()=>{
  assert.equal(plan('artifact_29',['b']).result.wolf,true);assert.equal(plan('artifact_29',['d']).result.wolf,false);
  assert.equal(plan('artifact_24',['e']).result.third,true);
  assert.equal(plan('artifact_09',['a']).result.isVillager,true);assert.equal(plan('artifact_09',['d']).result.isVillager,false);
  assert.equal(plan('artifact_39',['d']).result.role,'Tiên Tri');
});
test('trạng thái: câm, quay mặt, mất năng lực, rời làng',()=>{
  assert.equal(plan('artifact_22',['b']).changes[0].statusId,'mute');
  assert.equal(plan('artifact_36',['b']).changes[0].statusId,'turn_away');
  assert.equal(plan('artifact_06',['b']).changes[0].statusId,'disabled_permanent');
  assert.equal(plan('artifact_14',['b']).changes[0].extra.actionIdOverride,'action-black-woman-leave');
});
test('Quả Cầu: đúng → Dân thắng, sai → chủ chết',()=>{
  const ok=plan('artifact_26',['b','c']);assert.equal(ok.result.correct,true);
  assert.equal(orbVillageWin({interactions:[{actionId:'artifact-orb-village-win',matchId:'m',effectActive:true}],matchId:'m'}),true);
  const bad=plan('artifact_26',['b','d']);assert.deepEqual(bad.kill,['a']);
});
test('Thương Cuồng Nộ công khai vai chủ; Khăn Hồn Ma chữ cái đầu',()=>{
  const p=plan('artifact_38',['b']);assert.deepEqual(p.kill,['b']);assert.equal(p.changes[0].extra.publicReveal,true);
  assert.equal(plan('artifact_34',[]).ok,false);
  const rows=[{type:'dead',loginId:'d',matchId:'m',source:'gallows',night:1}];
  assert.equal(plan('artifact_34',[],{interactions:rows}).result.letter,'T');
  assert.equal(lastHangedRole({assignments:A,interactions:rows,matchId:'m',day:2}).role,'Tiên Tri');
});
test('Mặt Dây Chuyền: gửi riêng vai thật của chủ',()=>{
  const p=plan('artifact_27',['b']);assert.equal(p.changes[0].extra.privateReveal,true);assert.equal(p.changes[0].loginId,'b');
});
test('Bùa Tai Ương = Phán Quyết Kép',()=>{
  const p=plan('artifact_41',[]);assert.equal(p.changes[0].extra.actionIdOverride,'action-judge-double');assert.equal(p.needsGallowsBeforeFirst,true);
});
