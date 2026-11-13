import {playerWebSource} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {peekPending,peekDecisionRows,peekDeaths} from '../src/gmww-swap-info-rules.js';
import {publicChatNotices} from '../src/gmww-online-chat-policy.js';
import {effectiveAssignments} from '../src/gmww-wolf-variant-rules.js';
import {isWolfRole} from '../src/gmww-pack-night-rules.js';
const M='m1',A=(l,r,f='village')=>({loginId:l,roleId:r,faction:f,roleCard:{factionId:f}});
const as=[A('p','role_peeking_girl'),A('w','role_wolf','wolf'),A('v','x')];
const peek={type:'effect_notice',actionId:'action-peek',actorId:'p',loginId:'p',matchId:M,night:1};
test('Ti Hí: Sói quyết định một lần; phát hiện thì Ti Hí chết, không thì sống',()=>{
  assert.deepEqual(peekPending({assignments:as,interactions:[peek],matchId:M,night:1}),['p']);
  const no=peekDecisionRows({assignments:as,interactions:[peek],matchId:M,night:1,wolfId:'w',detected:false});
  assert.equal(no.length,1);assert.equal(peekDeaths({assignments:as,interactions:[peek,...no],matchId:M,night:1}).length,0);
  assert.equal(peekPending({assignments:as,interactions:[peek,...no],matchId:M,night:1}).length,0);
  assert.equal(peekDecisionRows({assignments:as,interactions:[peek,...no],matchId:M,night:1,wolfId:'w',detected:true}).length,0);
  const yes=peekDecisionRows({assignments:as,interactions:[peek],matchId:M,night:1,wolfId:'w',detected:true});
  assert.equal(peekDeaths({assignments:as,interactions:[peek,...yes],matchId:M,night:1})[0].loginId,'p');
  assert.equal(peekDecisionRows({assignments:as,interactions:[peek],matchId:M,night:1,wolfId:'v',detected:true}).length,0);
});
test('Công bố công khai (Loan Tin, Hồn Ma) đến được Thông cáo Làng',()=>{
  const meta={phase:'running',cyclePhase:'morning',cycleNight:2,matchId:M},players={'member:g':{displayName:'G'},'member:n':{displayName:'N'}};
  const rows=[{id:'a',type:'effect_notice',loginId:'g',matchId:M,night:2,publicReveal:true,effectActive:false,message:'Hồn Ma: Sói',createdAt:'2026-11-05T10:00:00Z'},
    {id:'b',type:'effect_notice',loginId:'n',matchId:M,night:2,publicReveal:true,undone:true,message:'ẩn',createdAt:'2026-11-05T10:00:01Z'},
    {id:'c',type:'effect_notice',loginId:'n',matchId:M,night:2,message:'riêng tư',createdAt:'2026-11-05T10:00:02Z'}];
  const out=publicChatNotices(meta,players,rows).map(x=>x.text);
  assert.deepEqual(out,['Hồn Ma: Sói']);
});
test('Sói được chuyển hóa vào Bầy Sói thấy cảnh báo Ti Hí',()=>{
  const eff=effectiveAssignments({assignments:[A('p','role_peeking_girl'),A('d','role_demon_wolf','wolf'),A('c','x')],
    interactions:[{type:'effect_notice',actionId:'action-demon-wolf-convert',actorId:'d',loginId:'c',matchId:M,night:1}],matchId:M,night:2});
  assert.equal(isWolfRole(eff.find(x=>x.loginId==='c')),true);
});
test('Durable Object: Sói quyết định Ti Hí bằng endpoint Player Web',async()=>{
  const src=workerSource();
  const a=src.indexOf('  async playerPeekDecide(body){'),b=src.indexOf('  async playerGhostWord(body){');
  const data=new Map(),store={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>{data.set(k,structuredClone(v))}};
  const ctx=vm.createContext({normalizeLoginId:x=>String(x||'').trim().toLowerCase(),j:(o,s=200)=>({body:o,status:s}),peekDecisionRows,effectiveAssignments,
    readNightAssignments:async()=>as,pruneInteractions:x=>x,structuredClone,Date,Number,String,Array,Object,JSON});
  vm.runInContext('class R{'+src.slice(a,b)+'};this.R=R;',ctx);
  const room=new ctx.R();room.ctx={storage:store,blockConcurrencyWhile:f=>f()};room.actionLogKey=r=>'log:'+r.id;
  data.set('meta',{phase:'running',cyclePhase:'night',cycleNight:1,matchId:M,cycleKey:'night-1'});
  data.set('players',{'member:w':{},'member:v':{}});data.set('interactions',[peek]);
  assert.equal((await room.playerPeekDecide({loginId:'v',detected:true})).body.error,'PEEK_NOTHING_TO_DECIDE');
  assert.equal((await room.playerPeekDecide({loginId:'w',detected:true})).body.decided,1);
  assert.equal((await room.playerPeekDecide({loginId:'w',detected:false})).body.error,'PEEK_NOTHING_TO_DECIDE');
  assert.equal(data.get('interactions').some(x=>x.actionId==='action-peek-detect'&&x.detected===true),true);
});
test('Player Web: có ô quyết định Ti Hí, nhập chữ Hồn Ma và hướng Lửa Lan',()=>{
  const ui=['30-rooms-and-realtime','35-online-chat'].map(n=>playerWebSource(n)).join('\n');
  assert.match(ui,/gmwwPeekAlert/);assert.match(ui,/\/peek\/decide/);
  assert.match(ui,/gmwwGhostWord/);assert.match(ui,/\/ghost\/word/);
  assert.match(ui,/action-fire-wolf-bite/);
  const srv=workerSource();
  assert.match(srv,/\/player\/peek\/decide/);assert.match(srv,/\/player\/ghost\/word/);
  assert.match(srv,/round:2,stage:"ready"/);
});
