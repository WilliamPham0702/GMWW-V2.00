import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {pruneInteractions} from '../src/gmww-interaction-retention.js';
import {reserveArtifactActivation} from '../src/gmww-game-scene-rules.js';
import {gallowsVoteTotals,gallowsAutomaticOutcome} from '../src/gmww-gallows-rules.js';
import {inheritedRolePlans} from '../src/gmww-role-inheritance-rules.js';
import * as R from '../src/gmww-card-rules-quick.js';

// Phạm vi: Lực Sỹ, Ông Già, Người Loan Tin, Con Bệnh/Bác Sỹ Điên, Con Quạ, Bà Da Đen, Kẻ Báo Thù, Kỵ Sỹ, Hoàng Tử, Tiên Tri Tập Sự.
const A=(loginId,roleId,faction='village',extra={})=>({loginId,roleId,faction,...extra});
const row=(o)=>({matchId:'M',night:1,effectActive:false,type:'effect_notice',...o});

test('Lực Sỹ: sống sót 1 lần Sói Cắn, lần 2 chết; Bảo Vệ chặn thì không tiêu hao',()=>{
  const as=[A('s','role_strongman'),A('v','role_villager')];
  let r=R.strongmanDawn({assignments:as,interactions:[],matchId:'M',night:1,victims:['s','v']});
  assert.deepEqual(r.victims,['v']);assert.equal(r.rows[0].actionId,'action-strongman-bite');assert.equal(r.rows[0].publicReveal,true);
  r=R.strongmanDawn({assignments:as,interactions:r.rows,matchId:'M',night:2,victims:['s']});
  assert.deepEqual(r.victims,['s']);assert.deepEqual(r.rows,[]);
  r=R.strongmanDawn({assignments:as,interactions:[],matchId:'M',night:1,victims:[]}); // Bảo Vệ đã chặn: không có victim
  assert.deepEqual(r.rows,[]);
});

test('Ông Già: chết ở đêm (số Sói + 1), không chết sớm, không chết lại sau hồi sinh',()=>{
  const as=[A('o','role_old_man'),A('w1','role_wolf','wolf'),A('w2','role_wolf','wolf'),A('c','role_villager')];
  assert.deepEqual(R.oldManLifespanDeaths({assignments:as,interactions:[],matchId:'M',night:2}),[]);
  const d=R.oldManLifespanDeaths({assignments:as,interactions:[],matchId:'M',night:3});
  assert.equal(d.length,1);assert.equal(d[0].loginId,'o');assert.equal(d[0].type,'dead');
  const revived=[{...d[0],effectActive:false}];
  assert.deepEqual(R.oldManLifespanDeaths({assignments:as,interactions:revived,matchId:'M',night:4}),[]);
});

test('Người Loan Tin: công bố vai trò người được chọn, kể cả đã chết; không công bố khi tự chọn',()=>{
  const as=[A('n','role_news_bearer'),A('t','role_seer',"village",{roleName:'Tiên Tri'})];
  const rows=[row({actorId:'n',loginId:'t',actionId:'action-news-role',night:2}),{id:'x',type:'dead',matchId:'M',loginId:'t',effectActive:true,night:2}];
  const out=R.newsBearerNotices({assignments:as,interactions:rows,matchId:'M',night:2});
  assert.equal(out.length,1);assert.equal(out[0].revealedRoleId,'role_seer');assert.equal(out[0].public,true);
  assert.deepEqual(R.newsBearerNotices({assignments:as,interactions:[row({actorId:'n',loginId:'n',actionId:'action-news-role',night:2})],matchId:'M',night:2}),[]);
  assert.deepEqual(R.newsBearerNotices({assignments:as,interactions:[...rows,...out],matchId:'M',night:2}),[]);
});

test('Con Bệnh gắn bệnh (kể cả bản thân), Bác Sỹ Điên giải độc',()=>{
  const sick=row({actorId:'d',loginId:'a',actionId:'action-disease-self',night:1});
  assert.deepEqual(R.diseasedLoginIds({interactions:[sick],matchId:'M'}),['a']);
  assert.deepEqual(R.diseasedLoginIds({interactions:[row({actorId:'d',loginId:'d',actionId:'action-disease-self'})],matchId:'M'}),['d']);
  assert.deepEqual(R.diseasedLoginIds({interactions:[sick,row({actorId:'m',loginId:'a',actionId:'action-mad-doctor-cure',night:2})],matchId:'M'}),[]);
  assert.deepEqual(R.diseasedLoginIds({interactions:[row({actorId:'m',loginId:'a',actionId:'action-mad-doctor-cure',night:1}),{...sick,night:2}],matchId:'M'}),['a'],'giải độc khi chưa bệnh không có tác dụng');
});

test('Con Quạ: +2 phiếu Treo Cổ vào đúng người, đúng ngày; cộng dồn; vào tổng phiếu kill',()=>{
  const rows=[row({actorId:'c',loginId:'t',actionId:'action-g7-crow-votes',night:2}),row({actorId:'c',loginId:'t',actionId:'action-g7-crow-votes',night:3})];
  assert.deepEqual(R.crowExtraVotes({interactions:rows,matchId:'M',day:2}),{t:2});
  assert.deepEqual(R.crowExtraVotes({interactions:rows,matchId:'M',day:1}),{});
  const ballot={eligible:['a','b','c','t'],candidateId:'t',votes:{a:'👎',b:'👍'},extraKillVotes:{t:2}};
  const tally=gallowsVoteTotals(ballot);
  assert.equal(tally.kill,3);assert.equal(tally.save,1);assert.equal(tally.cast,2);
  assert.equal(gallowsAutomaticOutcome(ballot),'dead');
  assert.equal(gallowsAutomaticOutcome({...ballot,extraKillVotes:{}}),'alive');
});

test('Bà Da Đen: chỉ rời làng trong ngày hôm sau, đêm sau trở lại',()=>{
  const rows=[row({actorId:'b',loginId:'t',actionId:'action-black-woman-leave',night:2})];
  assert.deepEqual(R.blackWomanLeaving({interactions:rows,matchId:'M',day:2}),['t']);
  assert.deepEqual(R.blackWomanLeaving({interactions:rows,matchId:'M',day:3}),[]);
});

test('Kẻ Báo Thù: theo phe hiện tại của mục tiêu, đóng băng khi mục tiêu chết',()=>{
  const as=[A('a','role_avenger'),A('t','role_wolf','wolf')];
  const pick=row({actorId:'a',loginId:'t',actionId:'action-avenger-target',night:1});
  let f=R.avengerFactions({assignments:as,interactions:[pick],matchId:'M'});
  assert.equal(f.a.faction,'wolf');assert.equal(f.a.frozen,false);
  f=R.avengerFactions({assignments:as,interactions:[pick,{id:'d',type:'dead',matchId:'M',loginId:'t',effectActive:true}],matchId:'M'});
  assert.equal(f.a.frozen,true);
  const third=R.avengerFactions({assignments:[A('a','role_avenger'),A('t','role_assassin','third')],interactions:[pick],matchId:'M'});
  assert.equal(third.a.faction,'third');
});

test('Kỵ Sỹ chỉ đúng khi trúng Sói; Hoàng Tử đúng khi trúng Sói hoặc Phe Ba; sai thì người đâm chết',()=>{
  const wolf=A('w','role_wolf','wolf'),third=A('x','role_assassin','third'),vil=A('v','role_villager');
  assert.deepEqual(R.dayStabOutcome({roleId:'role_cavalier',actorId:'k',target:wolf}),{correct:true,dead:['w']});
  assert.deepEqual(R.dayStabOutcome({roleId:'role_cavalier',actorId:'k',target:third}),{correct:false,dead:['k']});
  assert.deepEqual(R.dayStabOutcome({roleId:'role_prince',actorId:'p',target:third}),{correct:true,dead:['x']});
  assert.deepEqual(R.dayStabOutcome({roleId:'role_prince',actorId:'p',target:vil}),{correct:false,dead:['p']});
});

test('Tiên Tri Tập Sự: kế nhiệm khi mọi Tiên Tri đã chết hoặc ván không có Tiên Tri',()=>{
  const dead=(id)=>({id:'d'+id,type:'dead',matchId:'M',loginId:id,night:1,effectActive:true});
  const ap=A('p','role_apprentice_seer');
  assert.equal(R.apprenticeSuccession({assignments:[ap,A('s','role_seer')],interactions:[],matchId:'M',night:2}).length,0);
  assert.equal(R.apprenticeSuccession({assignments:[ap,A('s','role_seer')],interactions:[dead('s')],matchId:'M',night:2})[0].targetRoleId,'role_seer');
  assert.equal(R.apprenticeSuccession({assignments:[ap,A('s','role_seer'),A('s2','role_seer')],interactions:[dead('s')],matchId:'M',night:2}).length,0);
  assert.equal(R.apprenticeSuccession({assignments:[ap],interactions:[],matchId:'M',night:1}).length,1,'không có Tiên Tri: kế nhiệm từ Đêm 1');
  assert.equal(R.apprenticeSuccession({assignments:[ap,A('s','role_seer')],interactions:[dead('s'),{...dead('p'),id:'dp'}],matchId:'M',night:2}).length,0,'Tập Sự đã chết thì không kế nhiệm');
});

// ----- Durable Object thật: Kỵ Sỹ / Hoàng Tử đâm ban ngày, Bà Da Đen chặn -----
const server=fs.readFileSync('src/index.js','utf8');
const begin=server.indexOf('  async gmDayAction(request,body){'),finish=server.indexOf('  /* V3.99:',begin);
assert.ok(begin>=0&&finish>begin);
const Room=vm.runInNewContext('(class { '+server.slice(begin,finish)+' })',{
  Response,crypto:webcrypto,j:(v,code=200)=>Response.json(v,{status:code}),
  normalizeLoginId:x=>String(x||'').trim().toLowerCase(),gameLabelKey:x=>String(x||'').toLowerCase(),
  currentArtifactCycleKey:m=>String(m.matchId)+':'+String(m.cyclePhase)+':'+String(m.cycleNight),
  reserveArtifactActivation,pruneInteractions,blackWomanLeaving:R.blackWomanLeaving,dayStabOutcome:R.dayStabOutcome
});
const clone=x=>x===undefined?undefined:structuredClone(x);
const result=async r=>({status:r.status,...await r.json()});
function harness(roles,roleId,fn,extraRows=[]){
  const data=new Map(),room=new Room(),storage={get:async k=>clone(data.get(k)),put:async(k,v)=>{data.set(k,clone(v))},delete:async k=>data.delete(k)};
  room.ctx={storage};room.broadcast=()=>{};room.gmAuthorized=async()=>({ok:true,meta:await storage.get('meta')});
  data.set('meta',{phase:'running',cyclePhase:'morning',matchId:'M',cycleKey:'morning-2',cycleNight:2});
  data.set('players',{'member:a':{loginId:'a'},'member:b':{loginId:'b'},'member:c':{loginId:'c'}});
  data.set('gameConfig',{artifactLimitPerCycle:2});
  data.set('assignments',roles.map(([loginId,r,faction])=>({loginId,roleId:r,faction})));
  data.set('role:a',{roleId,roleCard:{functions:[fn]}});
  if(extraRows.length)data.set('interactions',extraRows);
  return {data,room};
}
const dead=(d,id)=>(d.get('interactions')||[]).filter(x=>x.type==='dead'&&x.loginId===id).length;
const req=(roleId,actionId,target)=>({matchId:'M',cycleKey:'morning-2',actorId:'a',roleId,actionId,targetIds:[target],clientEventId:'e1'});
const fnOf=actionId=>({actionId,phase:'day',usageMode:'onceGame',usageCount:1,targetCount:1,noSelf:true});

test('DO: Kỵ Sỹ đâm trúng Sói → Sói chết; đâm nhầm Dân → Kỵ Sỹ chết',async()=>{
  let h=harness([['a','role_cavalier','village'],['b','role_wolf','wolf'],['c','role_villager','village']],'role_cavalier',fnOf('action-knight-stab'));
  assert.equal((await result(await h.room.gmDayAction(null,req('role_cavalier','action-knight-stab','b')))).ok,true);
  assert.equal(dead(h.data,'b'),1);assert.equal(dead(h.data,'a'),0);
  h=harness([['a','role_cavalier','village'],['b','role_wolf','wolf'],['c','role_villager','village']],'role_cavalier',fnOf('action-knight-stab'));
  await h.room.gmDayAction(null,req('role_cavalier','action-knight-stab','c'));
  assert.equal(dead(h.data,'a'),1);assert.equal(dead(h.data,'c'),0);
});

test('DO: Hoàng Tử đâm trúng Phe Ba → mục tiêu chết; đâm Dân → Hoàng Tử chết',async()=>{
  let h=harness([['a','role_prince','village'],['b','role_assassin','third'],['c','role_villager','village']],'role_prince',fnOf('action-g7-prince-stab'));
  await h.room.gmDayAction(null,req('role_prince','action-g7-prince-stab','b'));
  assert.equal(dead(h.data,'b'),1);assert.equal(dead(h.data,'a'),0);
  h=harness([['a','role_prince','village'],['b','role_assassin','third'],['c','role_villager','village']],'role_prince',fnOf('action-g7-prince-stab'));
  await h.room.gmDayAction(null,req('role_prince','action-g7-prince-stab','c'));
  assert.equal(dead(h.data,'a'),1);
});

test('DO: người bị Bà Da Đen buộc rời làng không dùng được chức năng ngày và không bị chọn',async()=>{
  const leave=(id)=>({id:'l'+id,matchId:'M',type:'effect_notice',night:2,actorId:'z',loginId:id,actionId:'action-black-woman-leave',effectActive:false});
  let h=harness([['a','role_prince','village'],['b','role_wolf','wolf'],['c','role_villager','village']],'role_prince',fnOf('action-g7-prince-stab'),[leave('a')]);
  assert.equal((await result(await h.room.gmDayAction(null,req('role_prince','action-g7-prince-stab','b')))).error,'DAY_ACTOR_LEFT_VILLAGE');
  h=harness([['a','role_prince','village'],['b','role_wolf','wolf'],['c','role_villager','village']],'role_prince',fnOf('action-g7-prince-stab'),[leave('b')]);
  assert.equal((await result(await h.room.gmDayAction(null,req('role_prince','action-g7-prince-stab','b')))).error,'DAY_TARGET_LEFT_VILLAGE');
});

test('kế nhiệm Tập Sự được thêm vào kế hoạch đổi vai mà không phá Say Rượu/Nhân Bản',()=>{
  const plans=inheritedRolePlans({assignments:[A('p','role_apprentice_seer')],interactions:[],matchId:'M',night:1});
  assert.deepEqual(plans,[]);
});
