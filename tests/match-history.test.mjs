import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildMatchHistory,upsertMatchIndex,MATCH_HISTORY_LIMIT} from '../src/gmww-match-history.js';

const players=[{loginId:'a',displayName:'An'},{loginId:'b',displayName:'Bình'},{loginId:'c',displayName:'Chi'}];
const assignments=[{loginId:'a',roleName:'Sói',roleCard:{faction:'Phe Sói'}},{loginId:'b',roleName:'Tiên Tri',roleCard:{faction:'Phe Dân'}},{loginId:'c',roleCard:{name:'Dân',faction:'Phe Dân'}}];
const interactions=[
  {type:'dead',loginId:'b',matchId:'m1',night:1,effectName:'Sói Cắn'},
  {type:'dead',loginId:'c',matchId:'m1',night:3,effectName:'Treo Cổ'},
  {type:'revive',loginId:'c',matchId:'m1',night:3},
  {type:'status',loginId:'a',matchId:'m1',night:2,effectName:'Soi'},      // private action: must never leak
  {type:'dead',loginId:'a',matchId:'other',night:2,effectName:'Khác'}     // other match: ignored
];

test('summary lists public outcomes per night and a quiet night',()=>{
  const r=buildMatchHistory({matchId:'m1',roomName:'Phòng 1',endedAt:'2026-11-08T10:00:00Z',winnerFaction:'Phe Dân',endNight:3,players,assignments,interactions});
  assert.deepEqual(r.summary,['Đêm 1: Bình chết (Sói Cắn)','Đêm 2: Không có ai chết.','Đêm 3: Chi chết (Treo Cổ) · Chi được hồi sinh']);
  assert.equal(r.playerCount,3);
  assert.equal(r.players.find(p=>p.name==='Bình').alive,false);
  assert.equal(r.players.find(p=>p.name==='Chi').alive,true,'revived player is alive');
  assert.equal(r.players.find(p=>p.name==='Chi').roleName,'Dân');
});

test('private role actions never appear in the public summary',()=>{
  const r=buildMatchHistory({matchId:'m1',endNight:3,players,assignments,interactions});
  assert.doesNotMatch(JSON.stringify(r),/Soi"|Khác/);
});

test('no matchId means no record',()=>assert.equal(buildMatchHistory({players}),null));

test('index is idempotent on matchId, newest first, capped',()=>{
  let idx=[];
  idx=upsertMatchIndex(idx,{matchId:'a',endedAt:'2026-11-01'});
  idx=upsertMatchIndex(idx,{matchId:'b',endedAt:'2026-11-02'});
  idx=upsertMatchIndex(idx,{matchId:'a',endedAt:'2026-11-01'});
  assert.deepEqual(idx.map(x=>x.matchId),['b','a']);
  for(let i=0;i<MATCH_HISTORY_LIMIT+5;i++)idx=upsertMatchIndex(idx,{matchId:'x'+i,endedAt:'2027-01-'+String(i%28+1).padStart(2,'0')});
  assert.equal(idx.length,MATCH_HISTORY_LIMIT);
});

test('worker wires record, list, get and GM-only clear',()=>{
  const src=workerSource();
  for(const route of ['"/matches/record"','"/matches/list"','"/matches/get"','"/matches/clear"','"/api/matches"','"/api/gm/matches"'])assert.ok(src.includes(route),route);
  assert.match(src,/async matchClear\(request\)\{\s*if\(bearer\(request\)!==GM_SYNC_TOKEN\)/,'clear must be GM-token only');
  assert.match(src,/matches\/clear[^;]*;?[\s\S]{0,200}members\/admin-clear-history/,'GM Xoá Lịch Sử also clears the library');
  assert.match(src,/type:"game_result"[^}]*history:matchHistory/,'game_result broadcast carries the night summary');
});
