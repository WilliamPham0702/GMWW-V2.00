import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const compiled=patchPrivatePlayerCards(gmwwMembersLiveScript);

test('V3.194: deployed Player Web remains valid JavaScript with stable realtime controls',()=>{
  assert.doesNotThrow(()=>new vm.Script(compiled));
  assert.match(compiled,/const activeSocket=state\.ws/);
  assert.match(compiled,/if\(state\.ws!==activeSocket\)return/);
  assert.match(compiled,/gmwwReconnectTimer=setTimeout/);
  assert.match(compiled,/gmwwLastRoomBroadcastAt>startedAt/);
  assert.match(compiled,/seq!==gmwwPublicPollSequence/);
});

test('V3.194: joining or restoring a room requests the full public roster',()=>{
  const start=compiled.indexOf('async function gmwwRefreshPublicRoster(');
  const end=compiled.indexOf('async function autoResumeActiveRoom(',start);
  assert.ok(start>=0&&end>start);
  const code=compiled.slice(start,end);
  const state={roomCode:'ABCDEF',participantId:'member:a',players:[{participantId:'member:a'}],room:{phase:'lobby'}};
  const ctx={state,api:async()=>({room:{phase:'role_delivery'},players:[
    {participantId:'member:a'},{participantId:'member:b'},{participantId:'member:c'}]}),
    encodeURIComponent,console,Promise};
  vm.runInNewContext(code+'\nthis.refresh=gmwwRefreshPublicRoster;',ctx);
  return ctx.refresh('ABCDEF','member:a').then(ok=>{
    assert.equal(ok,true);
    assert.equal(state.players.length,3,'never retain a one-person local roster after authoritative snapshot');
    assert.equal(state.room.phase,'role_delivery');
  });
});

test('V3.194: incomplete public snapshot never erases a valid roster',async()=>{
  const start=compiled.indexOf('async function gmwwRefreshPublicRoster(');
  const end=compiled.indexOf('async function autoResumeActiveRoom(',start);
  const state={roomCode:'ABCDEF',participantId:'member:a',players:[{participantId:'member:a'},{participantId:'member:b'}],room:{phase:'running'}};
  const ctx={state,api:async()=>({players:[{participantId:'member:z'}]}),encodeURIComponent,console};
  vm.runInNewContext(compiled.slice(start,end)+'\nthis.refresh=gmwwRefreshPublicRoster;',ctx);
  assert.equal(await ctx.refresh('ABCDEF','member:a'),false);
  assert.equal(state.players.length,2);
});

test('V3.194: private receipt restores current gallows and pending interactions after refresh',()=>{
  const start=compiled.indexOf('async function refreshPrivateRole(force=false){');
  const end=compiled.indexOf('async function ensureRoleGameView(',start);
  const receipt=compiled.slice(start,end);
  assert.match(receipt,/state\.gallows=d\?\.gallows\|\|null;renderGallowsWidget\(\)/);
  assert.match(receipt,/handlePendingInteractions\(d\?\.interactions\)/);
  assert.match(receipt,/syncRoleEffects\(d\?\.effects\)/);
  assert.match(compiled,/if\(d\.type==='gallows_updated'\).*refreshPrivateRole\(true\)/);
});

test('V3.194: heartbeat and websocket ping do not rebroadcast full room to all players',()=>{
  const worker=readFileSync('src/index.js','utf8');
  const heartbeat=worker.slice(worker.indexOf('async heartbeat(body){'),worker.indexOf('async leave(body){'));
  const ping=worker.slice(worker.indexOf('async webSocketMessage(ws,message){'),worker.indexOf('async markSocketDisconnected(ws){'));
  const join=worker.slice(worker.indexOf('async websocket(request,url){'),worker.indexOf('async webSocketMessage(ws,message){'));
  assert.doesNotMatch(heartbeat,/this\.broadcast\(/);
  assert.doesNotMatch(ping,/this\.broadcast\(/);
  assert.match(ping,/type:"pong"/);
  assert.match(join,/type:"room_state"/,'new sockets still receive the authoritative roster');
});
