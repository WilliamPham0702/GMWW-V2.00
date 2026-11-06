import test from 'node:test';import assert from 'node:assert/strict';
import {maidSuccession,threeBrothersNotices,ghostCheck,peekDeaths} from '../src/gmww-swap-info-rules.js';
import {effectiveAssignments} from '../src/gmww-wolf-variant-rules.js';
const M='m1';const A=(loginId,roleId,faction='village',displayName=loginId)=>({loginId,roleId,faction,displayName,roleCard:{factionId:faction}});
const dead=(l,night,extra={})=>({type:'dead',loginId:l,matchId:M,night,effectActive:true,...extra});
test('Hầu Gái: kế thừa vai người bị Treo Cổ từ đêm sau, không kế thừa người chết đêm',()=>{
  const as=[A('m','role_maid'),A('h','role_seer'),A('x','role_guard')];
  const rows=[dead('h',1,{gallowsId:'g1'}),{type:'effect_notice',actionId:'action-maid-inherit',actorId:'m',loginId:'m',matchId:M,night:1}];
  assert.equal(maidSuccession({assignments:as,interactions:rows,matchId:M,night:1}).length,0);
  const p=maidSuccession({assignments:as,interactions:rows,matchId:M,night:2});
  assert.equal(p[0].sourceRoleId,'role_seer');assert.equal(p[0].actorId,'m');
  const night=[dead('x',1),rows[1]];
  assert.equal(maidSuccession({assignments:as,interactions:night,matchId:M,night:2}).length,0);
});
test('Ba Anh Em: Đêm 1 biết hai người còn lại',()=>{
  const as=[A('a','role_three_brothers'),A('b','role_three_brothers'),A('c','role_three_brothers'),A('d','x')];
  const n=threeBrothersNotices({assignments:as,matchId:M,night:1});
  assert.equal(n.length,3);assert.deepEqual(n[0].brotherIds,['b','c']);
  assert.equal(threeBrothersNotices({assignments:as,matchId:M,night:2}).length,0);
});
test('Hồn Ma: một từ/ngày, không tên người chơi, chỉ khi đã chết',()=>{
  const as=[A('g','role_ghost','village','Hồn Ma'),A('b','x','village','Nguyễn Văn Bình')];
  const base={assignments:as,matchId:M,day:1,actorId:'g'};
  assert.equal(ghostCheck({...base,word:'Sói',interactions:[]}).error,'GHOST_NOT_DEAD');
  const d=[dead('g',1)];
  assert.equal(ghostCheck({...base,word:'Sói',interactions:d}).ok,true);
  assert.equal(ghostCheck({...base,word:'hai từ',interactions:d}).error,'GHOST_ONE_WORD_ONLY');
  const bad=ghostCheck({...base,word:'Bình',interactions:d});
  assert.equal(bad.error,'GHOST_NAME_FORBIDDEN');assert.equal(bad.violation,true);
  const said=[...d,{type:'effect_notice',actionId:'action-ghost-message',loginId:'g',matchId:M,night:1}];
  assert.equal(ghostCheck({...base,word:'Dân',interactions:said}).error,'GHOST_ALREADY_TODAY');
  assert.equal(ghostCheck({...base,day:2,word:'Dân',interactions:said}).ok,true);
  const muted=[...d,{type:'effect_notice',actionId:'action-ghost-violation',loginId:'g',matchId:M,night:1}];
  assert.equal(ghostCheck({...base,day:2,word:'Dân',interactions:muted}).error,'GHOST_MUTED');
});
test('Cô Bé Ti Hí: mặc định không bị phát hiện; bị Sói phát hiện thì chết',()=>{
  const as=[A('p','role_peeking_girl'),A('w','role_wolf','wolf'),A('v','x')];
  const peek={type:'effect_notice',actionId:'action-peek',actorId:'p',loginId:'p',matchId:M,night:1};
  assert.equal(peekDeaths({assignments:as,interactions:[peek],matchId:M,night:1}).length,0);
  const det={type:'effect_notice',actionId:'action-peek-detect',actorId:'w',loginId:'p',detected:true,matchId:M,night:1};
  assert.equal(peekDeaths({assignments:as,interactions:[peek,det],matchId:M,night:1})[0].loginId,'p');
  const forged={...det,actorId:'v'};
  assert.equal(peekDeaths({assignments:as,interactions:[peek,forged],matchId:M,night:1}).length,0);
  assert.equal(peekDeaths({assignments:as,interactions:[det],matchId:M,night:1}).length,0);
});
test('Con Hoang: Hình Tượng chết thì sang Phe Sói từ đêm sau; Cupid ghép Phe Ba',()=>{
  const as=[A('c','role_wild_child'),A('i','x'),A('a','role_cupid'),A('l1','y'),A('l2','z')];
  const idol={type:'effect_notice',actionId:'action-wild-child-idol',actorId:'c',loginId:'i',matchId:M,night:1};
  const f=(rows,n)=>effectiveAssignments({assignments:as,interactions:rows,matchId:M,night:n}).find(x=>x.loginId==='c').faction;
  assert.equal(f([idol],3),'village');
  assert.equal(f([idol,dead('i',2)],2),'village');
  assert.equal(f([idol,dead('i',2)],3),'wolf');
  const pair=l=>({type:'effect_notice',actionId:'action-cupid-pair',actorId:'a',loginId:l,matchId:M,night:1});
  const eff=effectiveAssignments({assignments:as,interactions:[pair('l1'),pair('l2')],matchId:M,night:2});
  assert.equal(eff.find(x=>x.loginId==='l1').faction,'third');assert.equal(eff.find(x=>x.loginId==='z'),undefined);
});
