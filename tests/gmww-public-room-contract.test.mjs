import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STATUS_DEFS,activeStatusRows,confirmedNightStatusVisuals,statusTagsFor,roomUiStage,publicRoom} from '../src/gmww-public-room-contract.js';

test('G3.7: status policy preserves all permanent and expiring status definitions',()=>{
  assert.deepEqual(Object.keys(STATUS_DEFS),[
    'wolf_bitten','marked','infected','mute','disabled_permanent','disabled_2n'
  ]);
  assert.equal(STATUS_DEFS.disabled_permanent.blocks,true);
  assert.equal(STATUS_DEFS.disabled_permanent.duration,'permanent');
  assert.equal(STATUS_DEFS.disabled_2n.nights,2);
  assert.equal(STATUS_DEFS.wolf_bitten.duration,'morning');
});

test('G3.7: public status tags respect visibility, lifetime, owner and match',()=>{
  const rows=[
    {id:'a',type:'status',loginId:' Alice ',statusId:'marked',effectActive:true,matchId:'match-1'},
    {id:'b',type:'status',loginId:'alice',statusId:'infected',effectActive:true,matchId:'match-1'},
    {id:'c',type:'status',loginId:'alice',statusId:'disabled_permanent',effectActive:false,matchId:'match-1'},
    {id:'d',type:'status',loginId:'alice',statusId:'mute',effectActive:true,matchId:'match-2'},
    {id:'e',type:'status',loginId:'bob',statusId:'marked',effectActive:true,matchId:'match-1'},
    {id:'f',type:'dead',loginId:'alice',statusId:'marked',effectActive:true,matchId:'match-1'}
  ];
  const meta={matchId:'match-1',statusDisplay:{marked:true,infected:false,disabled_permanent:true,mute:true}};
  assert.deepEqual(activeStatusRows(rows,'ALICE','match-1').map(x=>x.id),['a','b']);
  assert.deepEqual(statusTagsFor(rows,meta,'Alice'),[
    {statusId:'marked',label:STATUS_DEFS.marked.label,icon:STATUS_DEFS.marked.icon},
    {statusId:'dead',label:'Đã Chết',icon:'💀'}
  ]);
  assert.deepEqual(statusTagsFor(rows,meta,'bob'),[
    {statusId:'marked',label:STATUS_DEFS.marked.label,icon:STATUS_DEFS.marked.icon}
  ]);
  assert.deepEqual(statusTagsFor(rows,meta,'unknown'),[]);
});

test('G3.7: GM stage follows phase and validates stored state',()=>{
  assert.equal(roomUiStage({phase:'running',gmStage:'room'}),'battle');
  assert.equal(roomUiStage({phase:'role_delivery',gmStage:'room'}),'deal');
  assert.equal(roomUiStage({phase:'lobby',gmStage:'seats'}),'seats');
  assert.equal(roomUiStage({phase:'lobby',gmStage:'unknown'}),'room');
  assert.equal(roomUiStage({}),'room');
});

test('G3.7: public room DTO retains setup, cycle and version contracts without secrets',()=>{
  const input={
    code:'ABCDEF',roomName:'Phòng Kiểm Thử',status:'active',phase:'lobby',gmStage:'seats',
    playerCount:24,seatCount:80,roomMode:' offline ',seatMoveMode:' WALK ',
    statusDisplay:{marked:true},matchId:'m1',matchRevision:7,deliveryVersion:9,resetVersion:2,
    cycleKey:'night-3',cyclePhase:'night',cycleNight:3,
    passwordHash:'private',token:'secret',players:{member:'private'},sessionId:'secret-session'
  };
  const snapshot=structuredClone(input);
  const out=publicRoom(input);
  assert.deepEqual(input,snapshot,'public projection must not modify stored room');
  assert.equal(out.code,'ABCDEF');
  assert.equal(out.gmStage,'seats');
  assert.equal(out.roomMode,'offline');
  assert.equal(out.seatMoveMode,'walk');
  assert.equal(out.seatCount,30);
  assert.equal(out.matchId,'m1');
  assert.equal(out.matchRevision,7);
  assert.equal(out.cycleNight,3);
  assert.equal(out.deliveryVersion,9);
  assert.equal(out.resetVersion,2);
  for(const field of ['passwordHash','token','players','sessionId']){
    assert.equal(Object.hasOwn(out,field),false,'Private field leaked: '+field);
  }
});

test('G3.7: public room defaults remain compatible with old saved metadata',()=>{
  const room=publicRoom({code:'ABCDEF',status:'open',createdAt:'2026-01-01'});
  assert.equal(room.roomName,'Phòng ABCDEF');
  assert.equal(room.phase,'lobby');
  assert.equal(room.gmStage,'room');
  assert.equal(room.seatCount,12);
  assert.equal(room.enabled,true);
  assert.equal(room.autoGM,true);
  assert.equal(room.locked,false);
  assert.equal(room.cycleNight,0);
  assert.deepEqual(room.statusDisplay,{});
});

test('G3.7: public status policy is imported instead of duplicated in Worker',()=>{
  const worker=readFileSync('src/index.js','utf8');
  assert.match(worker,/from "\.\/gmww-public-room-contract\.js"/);
  assert.doesNotMatch(worker,/^const STATUS_DEFS=/m);
  assert.doesNotMatch(worker,/^function publicRoom\(/m);
  assert.match(worker,/publicRoom\(meta\)/);
});

test('V1: legacy status presentation is filtered by owner, match, expiry and GM display privacy',()=>{
  const rows=[
    {type:'dead',loginId:'Alice',matchId:'m1',effectActive:true},
    {type:'frozen',loginId:'Alice',matchId:'m1',effectActive:true},
    {type:'assassin_mark',loginId:'Alice',matchId:'m1',effectActive:true},
    {type:'expelled',loginId:'Bob',matchId:'m1',effectActive:true},
    {type:'dead',loginId:'Alice',matchId:'m2',effectActive:true},
    {type:'dead',loginId:'Alice',matchId:'m1',effectActive:false},
    {type:'dead',loginId:'Alice',matchId:'m1',effectActive:true,expiresAt:'2020-01-01T00:00:00Z'}
  ];
  assert.deepEqual(statusTagsFor(rows,{matchId:'m1',statusDisplay:{}},'alice').map(x=>x.statusId),['dead','frozen']);
  assert.deepEqual(statusTagsFor(rows,{matchId:'m1',statusDisplay:{dead:false,frozen:false,marked:false}},'alice'),[]);
  assert.deepEqual(statusTagsFor(rows,{matchId:'m1',statusDisplay:{marked:true}},'alice').map(x=>x.statusId),['dead','frozen','marked']);
  assert.deepEqual(statusTagsFor(rows,{matchId:'m1',statusDisplay:{}},'bob').map(x=>x.statusId),['expelled']);
});

test('V3.124: a real confirmed Guard action draws shields only during the matching night',()=>{
  const receipt={type:'effect_notice',actionId:'action_protect',loginId:'Alice',
    matchId:'m1',night:2,effectActive:false,clientEventId:'confirmed:alice'};
  const wolf={...receipt,actionId:'action_wolf_bite',loginId:'Bob'};
  const ignored={...receipt,actionId:'action_inspect',loginId:'Carol'};
  const rows=[receipt,wolf,ignored];
  const meta={matchId:'m1',phase:'running',cyclePhase:'night',cycleNight:2,statusDisplay:{}};
  const original=structuredClone(rows);
  assert.deepEqual(confirmedNightStatusVisuals(rows,meta).map(x=>x.statusId),['protected','wolf_bitten']);
  assert.deepEqual(rows,original,'Projection must not write gameplay status to receipts');
  assert.deepEqual(statusTagsFor(rows,meta,'alice'),[],'Private Guard target hidden until explicitly enabled');
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{protected:true}},'alice'),
    [{statusId:'protected',label:'Bảo Vệ',icon:'🛡️'}]);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{wolf_bitten:true}},'bob'),
    [{statusId:'wolf_bitten',label:'Sói Cắn',icon:'🐺'}]);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{protected:true}},'bob'),[]);
  assert.deepEqual(confirmedNightStatusVisuals(rows,{...meta,cycleNight:3}),[]);
  assert.deepEqual(confirmedNightStatusVisuals(rows,{...meta,cyclePhase:'morning'}),[]);
  assert.deepEqual(confirmedNightStatusVisuals(rows,{...meta,matchId:'m2'}),[]);
  assert.deepEqual(confirmedNightStatusVisuals([{...receipt,undone:true}],meta),[]);
  assert.deepEqual(confirmedNightStatusVisuals([{...receipt,expiredAt:'2026-10-17'}],meta),[]);
});
