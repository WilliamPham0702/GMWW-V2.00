import test from 'node:test';import assert from 'node:assert/strict';
import {elderBell,validBells,sectFollowers,cultActions,cultMembers,cultKillDeaths,groupLinkedDeaths,isCultMember} from '../src/gmww-night-cult-rules.js';
import {effectiveAssignments} from '../src/gmww-wolf-variant-rules.js';
const M='m1',A=(l,r,f='village')=>({loginId:l,roleId:r,faction:f,roleCard:{factionId:f}});
const n=(actionId,actor,target,night)=>({type:'effect_notice',actionId,actorId:actor,loginId:target,matchId:M,night});
const dead=(l,night)=>({type:'dead',loginId:l,matchId:M,night,effectActive:true,id:'d-'+l});
test('Già Làng: Rung Chuông vô hiệu đêm, mất mạng, hết 2 mạng thì chết, chỉ 4 đêm đầu',()=>{
  const as=[A('e','role_elder')];
  assert.equal(elderBell({assignments:as,interactions:[n('18','e','e',1)],matchId:M,night:1}).active,true);
  assert.equal(elderBell({assignments:as,interactions:[n('18','e','e',1)],matchId:M,night:1}).rows.length,0);
  const two=[n('18','e','e',1),n('18','e','e',3)];
  assert.equal(elderBell({assignments:as,interactions:two,matchId:M,night:3}).rows[0].loginId,'e');
  assert.equal(elderBell({assignments:as,interactions:[n('18','e','e',5)],matchId:M,night:5}).active,false);
  assert.equal(validBells({assignments:as,interactions:[n('18','e','e',1),n('18','e','e',2),n('18','e','e',3)],matchId:M}).length,2);
  assert.equal(elderBell({assignments:as,interactions:[n('18','e','e',2)],matchId:M,night:1}).active,false);
});
test('Trưởng Phái: Giáo Dân chết theo, ngược lại thì không',()=>{
  const as=[A('s','role_sect_leader'),A('a','x'),A('b','y')];
  const rows=[n('25','s','a',1),n('25','s','b',2)];
  assert.deepEqual([...sectFollowers({assignments:as,interactions:rows,matchId:M}).get('s')],['a','b']);
  const d=groupLinkedDeaths({assignments:as,interactions:[...rows,dead('s',3)],matchId:M,night:3});
  assert.deepEqual(d.map(x=>x.loginId).sort(),['a','b']);
  assert.equal(groupLinkedDeaths({assignments:as,interactions:[...rows,dead('a',3)],matchId:M,night:3}).length,0);
});
test('Tà Đạo: Thêm 5 đêm đầu, mỗi đêm Thêm hoặc Giết, thành viên Phe Ba mất chức năng, chết theo, Giết sau Đêm 5',()=>{
  const as=[A('c','role_cult','third'),A('a','role_seer'),A('b','role_guard'),A('v','role_villager')];
  const rows=[n('action-cult-add','c','a',1),n('action-cult-kill','c','b',1),n('action-cult-kill','c','v',2),n('action-cult-add','c','b',6)];
  const act=cultActions({assignments:as,interactions:rows,matchId:M});
  assert.deepEqual(act.adds.map(x=>x.target),['a']);assert.deepEqual(act.kills.map(x=>x.target),['v']);
  assert.equal(isCultMember({assignments:as,interactions:rows,matchId:M,loginId:'a'}),true);
  assert.equal(effectiveAssignments({assignments:as,interactions:rows,matchId:M,night:2}).find(x=>x.loginId==='a').faction,'third');
  assert.equal(effectiveAssignments({assignments:as,interactions:rows,matchId:M,night:1}).find(x=>x.loginId==='a').faction,'village');
  assert.equal(cultKillDeaths({assignments:as,interactions:rows,matchId:M,night:2})[0].loginId,'v');
  assert.equal(cultKillDeaths({assignments:as,interactions:rows,matchId:M,night:2,protectedIds:['v']}).length,0);
  const link=groupLinkedDeaths({assignments:as,interactions:[...rows,dead('c',4)],matchId:M,night:4});
  assert.deepEqual(link.map(x=>x.loginId),['a']);
});
