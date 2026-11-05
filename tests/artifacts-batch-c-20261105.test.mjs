import test from 'node:test';import assert from 'node:assert/strict';
import {artifactDayPlan,artifactBiteDawn,plaguePackLost,prismTargetsFor} from '../src/gmww-artifact-rules.js';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
import {effectiveAssignments} from '../src/gmww-wolf-variant-rules.js';
const A=[{loginId:'w',roleId:'role_wolf',faction:'Phe Sói'},{loginId:'v1',roleId:'role_villager',faction:'Phe Dân'},{loginId:'v2',roleId:'role_villager',faction:'Phe Dân'},
  {loginId:'v3',roleId:'role_villager',faction:'Phe Dân',artifactId:'artifact_37'},{loginId:'v4',roleId:'role_villager',faction:'Phe Dân'}];
const bite=(t,n)=>({type:'effect_notice',actionId:'action_wolf_bite',actorId:'w',loginId:t,matchId:'m',night:n});
const players=Object.fromEntries(A.map((a,i)=>['member:'+a.loginId,{loginId:a.loginId,seatId:i+1}]));
test('Lăng Kính: ba người, giới hạn Cắn đêm kế tiếp',()=>{
  assert.equal(artifactDayPlan({artifactId:'artifact_28',actorId:'v1',targets:['v1x','v2'],assignments:A,interactions:[],matchId:'m',day:1}).ok,false);
  const p=artifactDayPlan({artifactId:'artifact_28',actorId:'v1',targets:['v2','v3','v4'],assignments:A,interactions:[],matchId:'m',day:1});
  const row={...p.changes[0].extra,type:'effect_notice',actionId:'artifact-prism-limit',matchId:'m',effectActive:true};
  assert.deepEqual(prismTargetsFor({interactions:[row],matchId:'m',night:2}),['v2','v3','v4']);
  assert.equal(prismTargetsFor({interactions:[row],matchId:'m',night:3}),null);
  assert.deepEqual(resolveWolfNight({assignments:A,interactions:[bite('v1',2)],players,matchId:'m',night:2}).victims,['v1']);
  assert.deepEqual(resolveWolfNight({assignments:A,interactions:[bite('v1',2),row],players,matchId:'m',night:2}).victims,[]);
  assert.deepEqual(resolveWolfNight({assignments:A,interactions:[bite('v2',2),row],players,matchId:'m',night:2}).victims,['v2']);
});
test('Khăn Nguyền Rủa: bị Cắn không chết, từ đêm sau là Sói, chỉ một lần',()=>{
  const r=artifactBiteDawn({assignments:A,interactions:[],matchId:'m',night:2,victims:['v3','v1'],now:'t'});
  assert.deepEqual(r.victims,['v1']);assert.equal(r.rows[0].actionId,'artifact-curse-convert');
  const eff=effectiveAssignments({assignments:A,interactions:r.rows,matchId:'m',night:3});
  assert.equal(String(eff.find(x=>x.loginId==='v3').faction),'wolf');
  assert.equal(String(effectiveAssignments({assignments:A,interactions:r.rows,matchId:'m',night:2}).find(x=>x.loginId==='v3').faction),'Phe Dân');
  assert.deepEqual(artifactBiteDawn({assignments:A,interactions:r.rows,matchId:'m',night:3,victims:['v3'],now:'t'}).victims,['v3']);
});
test('Máu Dịch Bệnh: người nhiễm bị Cắn chết → Sói mất lượt Cắn đêm sau',()=>{
  const inf=artifactDayPlan({artifactId:'artifact_04',actorId:'v1',targets:['v2'],assignments:A,interactions:[],matchId:'m',day:1}).changes[0];
  assert.equal(inf.extra.actionIdOverride,'artifact-plague-infect');
  const rows=[{type:'status',statusId:'infected',actionId:'artifact-plague-infect',loginId:'v2',matchId:'m',effectActive:true}];
  const r=artifactBiteDawn({assignments:A,interactions:rows,matchId:'m',night:2,victims:['v2'],now:'t'});
  assert.deepEqual(r.victims,['v2']);
  assert.equal(plaguePackLost({interactions:r.rows,matchId:'m',night:3}),true);
  const res=resolveWolfNight({assignments:A,interactions:[bite('v1',3),...r.rows],players,matchId:'m',night:3});
  assert.equal(res.packDisabled,true);assert.deepEqual(res.victims,[]);
  assert.deepEqual(resolveWolfNight({assignments:A,interactions:[bite('v1',4),...r.rows],players,matchId:'m',night:4}).victims,['v1']);
});
test('Trượng Luân Hồi / Quyền Trượng: chỉ hồi sinh khi chủ đã chết',()=>{
  const dead=[{type:'dead',loginId:'v1',matchId:'m'}];
  assert.equal(artifactDayPlan({artifactId:'artifact_30',actorId:'v1',targets:[],assignments:A,interactions:[],matchId:'m',day:2}).ok,false);
  assert.deepEqual(artifactDayPlan({artifactId:'artifact_30',actorId:'v1',targets:[],assignments:A,interactions:dead,matchId:'m',day:2}).revive,['v1']);
  assert.deepEqual(artifactDayPlan({artifactId:'artifact_33',actorId:'v1',targets:[],assignments:A,interactions:dead,matchId:'m',day:2}).revive,['v1']);
});
import {swapRolePlans,clawWolfIds,needsStorageArtifact} from '../src/gmww-artifact-rules.js';
test('Đá Hoán Đổi: hai kế hoạch đổi vai đầu đêm kế tiếp, chỉ khi cả hai sống',()=>{
  const B=[{loginId:'a',roleId:'role_seer'},{loginId:'b',roleId:'role_guard'}];
  const p=artifactDayPlan({artifactId:'artifact_40',actorId:'a',targets:['b'],assignments:B,interactions:[],matchId:'m',day:1});
  const row={...p.changes[0].extra,actionId:'artifact-swap-role',actorId:'a',loginId:'b',type:'effect_notice',matchId:'m',night:1,effectActive:true};
  const plans=swapRolePlans({assignments:B,interactions:[row],matchId:'m',night:2});
  assert.equal(plans.length,2);assert.deepEqual(plans.map(x=>[x.actorId,x.sourceRoleId]),[['a','role_guard'],['b','role_seer']]);
  assert.equal(swapRolePlans({assignments:B,interactions:[row],matchId:'m',night:3}).length,0);
  assert.equal(swapRolePlans({assignments:B,interactions:[row,{type:'dead',loginId:'b',matchId:'m'}],matchId:'m',night:2}).length,0);
  assert.equal(artifactDayPlan({artifactId:'artifact_40',actorId:'a',targets:['a'],assignments:B,interactions:[],matchId:'m',day:1}).ok,false);
});
test('Vuốt Sói: sang Phe Sói từ đêm sau, giữ vai gốc',()=>{
  const B=[{loginId:'a',roleId:'role_seer',faction:'Phe Dân',artifactId:'artifact_11'}];
  const rows=[{type:'effect_notice',actionId:'action-lone-wolf-join',actorId:'a',loginId:'a',matchId:'m',night:2}];
  assert.deepEqual(clawWolfIds({assignments:B,interactions:rows,matchId:'m',night:3}),['a']);
  assert.deepEqual(clawWolfIds({assignments:B,interactions:rows,matchId:'m',night:2}),[]);
  const eff=effectiveAssignments({assignments:B,interactions:rows,matchId:'m',night:3})[0];
  assert.equal(eff.roleId,'role_seer');assert.equal(eff.faction,'wolf');
  assert.equal(needsStorageArtifact('artifact_31')&&needsStorageArtifact('artifact_32'),true);
});
