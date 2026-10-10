import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';
const source=patchPrivatePlayerCards(gmwwMembersLiveScript);

test('Public role-delivery phase never falsely claims a personal role was received',()=>{
  assert.match(source,/if\(phase==='role_delivery'\)return state\.role\?'PHÒNG CHỜ · ĐÃ NHẬN VAI':'PHÒNG CHỜ · ĐANG NHẬN VAI'/);
  assert.match(source,/const released=!!\(state\.roomCode&&state\.participantId&&playerScenePolicy\(state\.room\)\.rolesReleased\)/);
  assert.match(source,/dock\.hidden=!released/);
  assert.match(source,/label\.textContent=ready\?'VAI TRÒ':'ĐANG NHẬN VAI'/);
  assert.match(source,/gmwwPendingPrivateCardTap=kind;gmwwRecoverPrivateRole\(true\)/);
  assert.match(source,/const ready=privateCardAllowed\(\)/);
  assert.match(source,/if\(!ready\)gmwwRecoverPrivateRole\(\)/);
});
test('Private role retry is restricted to current room, authenticated membership and server release',async()=>{
  const start=source.indexOf('function privateCardAllowed(){');
  const end=source.indexOf('function clearPrivateCardIdle(){',start);
  assert.ok(start>=0&&end>start);
  const state={roomCode:'ABCDEF',participantId:'member:safari',token:'test',room:{phase:'lobby'},role:null};
  let calls=0,draws=0;
  const ctx={state,document:{hidden:false},playerScenePolicy:r=>({rolesReleased:['role_delivery','running'].includes(r.phase)}),
    refreshPrivateRole:async()=>{calls++;},renderPlayerPrivateDock:()=>{draws++;},Date,Promise};
  vm.runInNewContext(source.slice(start,end)+';this.testAPI={allowed:privateCardAllowed,pending:privateCardDeliveryPending,retry:gmwwRecoverPrivateRole}',ctx);
  assert.equal(ctx.testAPI.pending(),false);
  assert.equal(ctx.testAPI.retry(),false);
  state.room.phase='role_delivery';
  assert.equal(ctx.testAPI.pending(),true);
  assert.equal(ctx.testAPI.allowed(),false);
  assert.equal(ctx.testAPI.retry(true),true);
  assert.equal(ctx.testAPI.retry(true),false,'no overlapping private fetch');
  await new Promise(done=>setImmediate(done));
  assert.equal(calls,1);
  assert.equal(draws,1);
  state.role={roleId:'role_wolf',roleCard:{name:'Sói'}};
  assert.equal(ctx.testAPI.pending(),false);
  assert.equal(ctx.testAPI.allowed(),true);
  assert.equal(ctx.testAPI.retry(true),false);
  state.role=null;state.token='';
  assert.equal(ctx.testAPI.retry(true),false,'no unauthenticated request');
});
test('Patched Player Web script remains valid JavaScript and shows card dock after role delivery',()=>{
  assert.doesNotThrow(()=>new vm.Script(source));
  assert.match(source,/function renderPlayerPrivateDock\(\)/);
  assert.match(source,/const ready=privateCardAllowed\(\)/);
  assert.match(source,/if\(!ready\)gmwwRecoverPrivateRole\(\)/);
  assert.match(source,/if\(img\)\{img\.hidden=!back/);
  assert.match(source,/artifact\.hidden=!state\.artifact/);
  assert.match(source,/renderGMWWPlayerCardFace\(kind\)/);
});
